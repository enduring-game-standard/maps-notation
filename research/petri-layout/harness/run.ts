import { mkdirSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCorpus } from './corpus.ts'
import { renderSvg } from '../engine/render.ts'
import { checkAll } from './checks.ts'
import type { Net } from '../engine/net.ts'
import type { Layout } from '../engine/layout.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const designs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const only = process.argv.find((a) => a.startsWith('--net='))?.slice(6)
const corpus = loadCorpus(root).filter((e) => !only || e.key === only)
const out = `${root}/${process.env.OUT ?? 'out'}`
mkdirSync(`${out}/figures`, { recursive: true })
const report: Record<string, Record<string, unknown>> = {}
for (const d of designs) {
  const mod = (await import(`${root}/designs/${d}/layout.ts`)) as { layout: (n: Net) => Layout }
  mkdirSync(`${out}/${d}`, { recursive: true })
  report[d] = {}
  for (const e of corpus) {
    let lay: Layout
    try { lay = mod.layout(e.net) } catch (err) { report[d][e.key] = { error: String((err as Error).stack ?? err) }; console.log(`${d} ${e.key} ERROR ${err}`); continue }
    writeFileSync(`${out}/${d}/${e.key}.svg`, renderSvg(e.net, lay))
    report[d][e.key] = checkAll(e.net, lay, mod.layout)
  }
}
for (const e of corpus) if (e.figure && existsSync(`${root}/figures/clips/${e.figure}`)) copyFileSync(`${root}/figures/clips/${e.figure}`, `${out}/figures/${e.figure}`)
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1))
const rows = corpus.map((e) => `<section id="${e.key}"><h2>${e.key} <small>${e.net.name}</small></h2><div class="row">${e.figure ? `<figure><img src="figures/${e.figure}"><figcaption>Peterson</figcaption></figure>` : ''}${designs.map((d) => `<figure><img src="${d}/${e.key}.svg"><figcaption>${d}</figcaption></figure>`).join('')}</div></section>`)
writeFileSync(`${out}/gallery.html`, `<!doctype html><meta charset="utf-8"><title>layouts</title><style>body{font-family:sans-serif;margin:16px}.row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}figure{margin:0;border:1px solid #ccc;padding:6px}img{max-width:560px;max-height:560px}h2{font-size:16px}</style>${rows.join('\n')}`)
for (const d of designs) {
  const r = report[d] as Record<string, { failures?: string[]; error?: string }>
  const bad = Object.entries(r).filter(([, v]) => v.error || (v.failures && v.failures.length))
  console.log(`${d}: ${corpus.length - bad.length}/${corpus.length} nets pass every check`)
  for (const [k, v] of bad) console.log(`  ${k}: ${v.error ? 'ERROR' : v.failures!.join('; ')}`)
}
