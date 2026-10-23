// PROTOTYPE. Builds a blind-read packet for one design: PNG per net plus questions with no answers, and a separate key for the grader.
// Run: tsx packet.ts <design> <gallery base url> <packet dir> [net ...]   (default nets: a fixed spread across the corpus and generated nets)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const [design, base, dir, ...pick] = process.argv.slice(2)
const ROOT = join(import.meta.dirname, '..')
const NETS = pick.length ? pick : ['duel-first', 'duel-revised', 'stamina-souls', 'stamina-third', 'call-the-coin', 'tic-tac-toe', 'g03', 'g06', 'g09', 'g12']
const SHOT = '/home/wscottsh/repos/egs/maps-notation/.claude/skills/verify/scripts/shot.mjs'
mkdirSync(dir, { recursive: true })
const load = (sub: string) => { const p = join(ROOT, sub, 'questions.json'); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { files: {} } }
const corpus = load('corpus'), gen = load('gen')
const qsFor = (n: string) => { const c = corpus.files[n + '.maps'] ?? gen.files[n + '.maps']; return Array.isArray(c) ? c : c?.questions ?? [] }
let readerMd = `# Blind read\n\nYou see only drawings. Each drawing is one game design in a notation you have not been taught. Answer from the drawings alone; say "can't tell" when you can't. Do not open any file other than the PNGs listed here.\n\n`
const key: any[] = []
for (const n of NETS) {
  const png = join(dir, `${n}.png`)
  const out = execFileSync('node', [SHOT, `${base}/gallery.html?d=${design}&s=${n}`, png, '--selector', 'figure', '--width', '2400', '--height', '1600'], { encoding: 'utf8' })
  if (JSON.parse(out.trim().split('\n').pop()!).errors.length) throw new Error(`render errors on ${n}: ${out}`)
  readerMd += `## ${n}\n\nDrawing: ${png}\n\n`
  for (const q of qsFor(n)) { readerMd += `- **${q.id}.** ${q.question}\n`; key.push({ id: q.id, net: n, criteria: q.criteria ?? [], question: q.question, answer: q.answer }) }
  readerMd += '\n'
}
for (const c of corpus.comparisons ?? []) if (c.files.every((f: string) => NETS.includes(f.replace('.maps', '')))) {
  readerMd += `## Compare ${c.files.join(' and ').replace(/\.maps/g, '')}\n\n- **${c.id}.** ${c.question}\n\n`
  key.push({ id: c.id, net: c.files.join('+'), criteria: c.criteria ?? ['compare-name'], question: c.question, answer: c.answer })
}
writeFileSync(join(dir, 'READER.md'), readerMd)
writeFileSync(join(dir, '..', `${design}.key.json`), JSON.stringify(key, null, 1))
console.log(`${design}: ${NETS.length} drawings, ${key.length} questions -> ${dir}/READER.md (key kept outside the packet)`)
