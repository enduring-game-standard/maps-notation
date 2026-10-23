// PROTOTYPE. Measures every candidate drawing convention against the corpus.
// Run from this folder: ../../../../../studio/node_modules/.bin/tsx run.ts [design-id ...]
// Writes out/report.json, out/report.md, out/gallery.html and out/<design>/<score>.svg.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { parse } from '../../../studio/src/core/text'
import type { Net } from '../../../studio/src/core/model'
import { arcKey, type Box, type Design, type Drawing, type Pt } from './contract'

const ROOT = join(import.meta.dirname, '..')
const CORPUS = process.env.CORPUS ?? join(ROOT, 'corpus')
const OUT = process.env.OUT ?? join(import.meta.dirname, 'out')

const SOURCES = process.env.CORPUS ? [process.env.CORPUS] : [join(ROOT, 'corpus'), join(ROOT, 'gen')]
const scores = SOURCES.filter(existsSync).flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith('.maps')).sort()
  .map((f) => ({ name: basename(f, '.maps'), dir, net: parse(readFileSync(join(dir, f), 'utf8')) })))
const shared: { name: string; files: string[]; states: string[]; verbs: string[] }[] =
  existsSync(join(SOURCES[0], 'shared.json')) ? JSON.parse(readFileSync(join(SOURCES[0], 'shared.json'), 'utf8')) : []
const PAIRS = [['duel-first', 'duel-revised'], ['duel-revised', 'duel-held'], ['stamina-souls', 'stamina-hunter'], ['stamina-souls', 'stamina-third']]

let seed = 7
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const clone = (n: Net): Net => JSON.parse(JSON.stringify(n))
const shuffle = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const scrambleLabel = (s: string) => s.replace(/[a-z]/g, () => String.fromCharCode(97 + Math.floor(rand() * 26))).replace(/[A-Z]/g, () => String.fromCharCode(65 + Math.floor(rand() * 26)))

const withPositions = (n: Net, f: () => number) => { const m = clone(n); m.states.forEach((s) => { s.x = f(); s.y = f() }); m.verbs.forEach((v) => { v.x = f(); v.y = f() }); m.arcs.forEach((a) => { a.via = rand() < 0.5 ? [{ x: f(), y: f() }] : undefined }); return m }

/** Rename every state and verb id (and scramble labels to same-length strings). Returns the net and the inverse id map. */
function renamed(n: Net) {
  const m = clone(n), fwd = new Map<string, string>()
  shuffle([...m.states.map((s) => s.id), ...m.verbs.map((v) => v.id)]).forEach((id, i) => fwd.set(id, `n${i}_${Math.floor(rand() * 1e6)}`))
  m.states.forEach((s) => { s.id = fwd.get(s.id)!; s.label = scrambleLabel(s.label); if (s.ends) s.ends = scrambleLabel(s.ends) })
  m.verbs.forEach((v) => { v.id = fwd.get(v.id)!; v.label = scrambleLabel(v.label) })
  m.arcs.forEach((a) => { a.state = fwd.get(a.state)!; a.verb = fwd.get(a.verb)! })
  return { net: m, inv: new Map([...fwd].map(([a, b]) => [b, a])) }
}
const reordered = (n: Net) => { const m = clone(n); m.states = shuffle(m.states); m.verbs = shuffle(m.verbs); m.arcs = shuffle(m.arcs); return m }

const baseId = (k: string) => k.split('#')[0]
const unmapLayout = (d: Drawing, inv: Map<string, string>) => {
  const nodes: Record<string, Box> = {}, arcs: Record<string, Pt[]> = {}
  for (const [k, b] of Object.entries(d.layout.nodes)) { const [id, copy] = k.split('#'); nodes[(inv.get(id) ?? id) + (copy ? '#' + copy : '')] = b }
  for (const [k, p] of Object.entries(d.layout.arcs)) { const [kind, s, v] = k.split('|'); arcs[`${kind}|${inv.get(s) ?? s}|${inv.get(v) ?? v}`] = p }
  return { nodes, arcs }
}
const r1 = (x: number) => Math.round(x * 10) / 10
const geom = (l: Drawing['layout']) => JSON.stringify({
  n: Object.keys(l.nodes).sort().map((k) => [k, r1(l.nodes[k].x), r1(l.nodes[k].y)]),
  a: Object.keys(l.arcs).sort().map((k) => [k, l.arcs[k].map((p) => [r1(p.x), r1(p.y)])]),
})
const geomNoSize = geom

function clutter(d: Drawing) {
  const segs: [string, Pt, Pt][] = []
  for (const [k, pts] of Object.entries(d.layout.arcs)) for (let i = 0; i < pts.length - 1; i++) segs.push([k, pts[i], pts[i + 1]])
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  const ends = (k: string) => { const [, s, v] = k.split('|'); return [s, v] }
  const pairs = new Set<string>()
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const [k1, a, b] = segs[i], [k2, c, e] = segs[j]
    if (k1 === k2 || ends(k1).some((x) => ends(k2).includes(x))) continue
    if (o(a, b, c) * o(a, b, e) < 0 && o(c, e, a) * o(c, e, b) < 0) pairs.add([k1, k2].sort().join(' x '))
  }
  let through = 0
  for (const [k, pts] of Object.entries(d.layout.arcs)) {
    const own = ends(k)
    for (const [id, bx] of Object.entries(d.layout.nodes)) {
      if (own.includes(baseId(id))) continue
      let hit = false
      for (let i = 0; i < pts.length - 1 && !hit; i++) for (let t = 0.02; t < 0.99 && !hit; t += 0.02) {
        const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t, y = pts[i].y + (pts[i + 1].y - pts[i].y) * t
        if (Math.abs(x - bx.x) < bx.w / 2 - 1 && Math.abs(y - bx.y) < bx.h / 2 - 1) hit = true
      }
      if (hit) through++
    }
  }
  let overlaps = 0
  const bs = Object.values(d.layout.nodes)
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++)
    if (Math.abs(bs[i].x - bs[j].x) < (bs[i].w + bs[j].w) / 2 && Math.abs(bs[i].y - bs[j].y) < (bs[i].h + bs[j].h) / 2) overlaps++
  return { crossings: pairs.size, through, overlaps, area: Math.round(d.width * d.height) }
}

function coverage(net: Net, d: Drawing) {
  const ids = [...net.states.map((s) => s.id), ...net.verbs.map((v) => v.id)]
  const drawn = new Set(Object.keys(d.layout.nodes).map(baseId))
  const missingNodes = ids.filter((id) => !drawn.has(id))
  const missingArcs = net.arcs.map(arcKey).filter((k) => !d.layout.arcs[k])
  return { missingNodes, missingArcs }
}

/** Position of each of `ids` relative to their centroid, for comparing one subnet's shape across scores. */
const relShape = (l: Drawing['layout'], ids: string[]) => {
  const ps = ids.map((id) => l.nodes[id] ?? l.nodes[id + '#0']).filter(Boolean)
  if (ps.length !== ids.length) return null
  const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length
  return ids.map((id, i) => ({ id, x: ps[i].x - cx, y: ps[i].y - cy }))
}

const designIds = process.argv.slice(2)
const designDirs = readdirSync(process.env.DESIGNS ?? join(ROOT, 'designs')).filter((d) => existsSync(join(process.env.DESIGNS ?? join(ROOT, 'designs'), d, 'render.ts')))
  .filter((d) => !designIds.length || designIds.includes(d)).sort()

const CRITERIA = ['conversation', 'possibility', 'actionable', 'entity', 'content', 'contact', 'counts', 'loop', 'compare-shape', 'compare-name', 'readable', 'napkin']
const AXES = ['x', 'y', 'placement', 'verb', 'speaker', 'entity', 'routing', 'unit']
function conformance(d: Design) {
  const problems: string[] = []
  if (!d.rules?.length) problems.push('no napkin rules')
  if (d.rules?.length > 12) problems.push(`${d.rules.length} napkin rules; a napkin holds about 12`)
  if (!d.elements?.length) problems.push('no elements declared')
  for (const e of d.elements ?? []) {
    if (!e.purpose?.trim()) problems.push(`element ${e.id} has no purpose`)
    const bad = (e.serves ?? []).filter((c) => !CRITERIA.includes(c))
    if (!e.serves?.length || bad.length) problems.push(`element ${e.id} serves ${bad.length ? 'unknown ' + bad.join(',') : 'nothing'}`)
  }
  for (const a of AXES) if (!(d.axes as any)?.[a]?.trim()) problems.push(`axis ${a} not stated`)
  return problems
}

/** Every number the design carries (arc counts above 1, world weights above 1, starting marks above 1) must appear as text in the SVG. Proxy only: it proves the number is printed, not that a reader finds it. */
function countsShown(net: Net, d: Drawing) {
  const texts = [...d.svg.matchAll(/<text[^>]*>([^<]*)</g)].map((m) => m[1])
  const has = (n: number) => texts.some((t) => new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(t))
  const need = [
    ...net.arcs.filter((a) => a.count > 1).map((a) => ({ what: `${a.kind} ${a.count} ${a.state}->${a.verb}`, n: a.count })),
    ...net.verbs.filter((v) => v.weight > 1).map((v) => ({ what: `weight ${v.weight} on ${v.id}`, n: v.weight })),
    ...net.states.filter((s) => s.marks > 1).map((s) => ({ what: `${s.marks} marks in ${s.id}`, n: s.marks })),
  ]
  const missing = need.filter((x) => !has(x.n)).map((x) => x.what)
  return { needed: need.length, missing }
}

const truthFor = (name: string) => {
  const dir = scores.find((s) => s.name === name)?.dir
  const p = dir && join(dir, 'questions.json')
  if (!p || !existsSync(p)) return undefined
  const q = JSON.parse(readFileSync(p, 'utf8'))
  return q.files?.[name + '.maps']?.truth ?? q.truth?.[name + '.maps']
}

/** Silhouette of the drawing's grouping by entity, from questions.json truth. Near 1: each entity's states sit together, apart from other entities. Near 0 or below: entities are interleaved. */
function entityClustering(name: string, d: Drawing) {
  const ents = truthFor(name)?.entities
  if (!ents || typeof ents !== 'object') return null
  const groups = Object.entries<any>(ents).map(([e, v]) => [e, (Array.isArray(v) ? v : v.states ?? []).filter((s: string) => d.layout.nodes[s] ?? d.layout.nodes[s + '#0'])] as [string, string[]]).filter(([, ss]) => ss.length)
  if (groups.length < 2) return null
  const at = (s: string) => d.layout.nodes[s] ?? d.layout.nodes[s + '#0']
  const dist = (a: string, b: string) => Math.hypot(at(a).x - at(b).x, at(a).y - at(b).y)
  let total = 0, n = 0
  for (const [e, ss] of groups) for (const s of ss) {
    const a = ss.length > 1 ? ss.filter((t) => t !== s).reduce((m, t) => m + dist(s, t), 0) / (ss.length - 1) : 0
    const b = Math.min(...groups.filter(([f]) => f !== e).map(([, ts]) => ts.reduce((m, t) => m + dist(s, t), 0) / ts.length))
    total += (b - a) / Math.max(a, b, 1e-9); n++
  }
  return Math.round((total / n) * 100) / 100
}

/** Spearman rank correlation of node x and of node y between two designs on the same score. Two designs that place nodes in nearly the same order are not radically different. */
function arrangementSimilarity(a: Drawing, b: Drawing) {
  const ids = Object.keys(a.layout.nodes).filter((k) => !k.includes('#') && b.layout.nodes[k])
  if (ids.length < 3) return null
  const rank = (xs: number[]) => { const o = xs.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = new Array(xs.length); o.forEach(([, i], k) => (r[i] = k)); return r }
  const rho = (p: number[], q: number[]) => { const n = p.length, rp = rank(p), rq = rank(q); return 1 - (6 * rp.reduce((s, r, i) => s + (r - rq[i]) ** 2, 0)) / (n * (n * n - 1)) }
  const ax = ids.map((k) => a.layout.nodes[k]), bx = ids.map((k) => b.layout.nodes[k])
  return { x: Math.round(rho(ax.map((p) => p.x), bx.map((p) => p.x)) * 100) / 100, y: Math.round(rho(ax.map((p) => p.y), bx.map((p) => p.y)) * 100) / 100 }
}

const allDrawings = new Map<string, Map<string, Drawing>>()
const report: any = { corpus: scores.map((s) => s.name), designs: {} }
mkdirSync(OUT, { recursive: true })
for (const dir of designDirs) {
  const { design } = (await import(join(process.env.DESIGNS ?? join(ROOT, 'designs'), dir, 'render.ts'))) as { design: Design }
  const WITHOUT = process.env.WITHOUT ? process.env.WITHOUT.split(',') : undefined
  const opts = WITHOUT ? { without: WITHOUT } : undefined
  const R: any = { title: design.title, idea: design.idea, rules: design.rules, elements: design.elements, axes: design.axes, conformance: conformance(design), scores: {}, sameStructure: {}, localDelta: {} }
  allDrawings.set(dir, new Map())
  const drawings = new Map<string, Drawing>()
  const outDir = join(OUT, WITHOUT ? `${dir}~without-${WITHOUT.join('+')}` : dir)
  mkdirSync(outDir, { recursive: true })
  for (const { name, net } of scores) {
    const row: any = {}
    try {
      const d = design.draw(clone(net), opts); drawings.set(name, d); allDrawings.get(dir)!.set(name, d)
      writeFileSync(join(outDir, name + '.svg'), d.svg)
      row.countsShown = countsShown(net, d)
      row.entityClustering = entityClustering(name, d)
      row.coverage = coverage(net, d)
      row.deterministic = geom(design.draw(clone(net), opts).layout) === geom(d.layout)
      row.positionBlind = geom(design.draw(withPositions(net, () => Math.round(rand() * 2000)), opts).layout) === geom(d.layout)
      const rn = renamed(net)
      row.nameBlind = geomNoSize(unmapLayout(design.draw(rn.net, opts), rn.inv)) === geomNoSize(d.layout)
      row.orderBlind = geom(design.draw(reordered(net), opts).layout) === geom(d.layout)
      row.clutter = clutter(d)
    } catch (e: any) { row.error = String(e?.stack ?? e).split('\n').slice(0, 3).join(' | ') }
    R.scores[name] = row
  }
  for (const sub of shared) {
    const ids = [...sub.states, ...sub.verbs]
    const shapes = sub.files.map((f) => drawings.get(f) && relShape(drawings.get(f)!.layout, ids)).filter(Boolean) as { id: string; x: number; y: number }[][]
    let worst = 0
    for (const s of shapes.slice(1)) s.forEach((p, i) => { worst = Math.max(worst, Math.hypot(p.x - shapes[0][i].x, p.y - shapes[0][i].y)) })
    R.sameStructure[sub.name] = shapes.length === sub.files.length ? { maxDeviationPx: Math.round(worst), files: sub.files.length } : { error: 'subnet not drawn in every file' }
  }
  for (const [a, b] of PAIRS) {
    const da = drawings.get(a), db = drawings.get(b)
    if (!da || !db) continue
    const common = Object.keys(da.layout.nodes).filter((k) => db.layout.nodes[k])
    const moved = common.filter((k) => Math.hypot(da.layout.nodes[k].x - db.layout.nodes[k].x, da.layout.nodes[k].y - db.layout.nodes[k].y) > 1)
    const diag = Math.hypot(da.width, da.height)
    const mean = common.reduce((s, k) => s + Math.hypot(da.layout.nodes[k].x - db.layout.nodes[k].x, da.layout.nodes[k].y - db.layout.nodes[k].y), 0) / (common.length || 1)
    R.localDelta[`${a} -> ${b}`] = { common: common.length, moved: moved.length, meanShiftPctOfDiagonal: Math.round((mean / diag) * 1000) / 10 }
  }
  report.designs[dir] = R
}
const ds = [...allDrawings.keys()]
report.diversity = {}
for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
  const A = report.designs[ds[i]].axes ?? {}, B = report.designs[ds[j]].axes ?? {}
  const sims = scores.map(({ name }) => { const a = allDrawings.get(ds[i])!.get(name), b = allDrawings.get(ds[j])!.get(name); return a && b ? arrangementSimilarity(a, b) : null }).filter(Boolean) as { x: number; y: number }[]
  const maxAbs = sims.length ? Math.max(...sims.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y)))) : null
  const meanAbs = sims.length ? Math.round((sims.reduce((m, s) => m + (Math.abs(s.x) + Math.abs(s.y)) / 2, 0) / sims.length) * 100) / 100 : null
  report.diversity[`${ds[i]} vs ${ds[j]}`] = { sameAxes: AXES.filter((k) => A[k] && A[k] === B[k]), meanAbsRankCorrelation: meanAbs, maxAbsRankCorrelation: maxAbs }
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1))

const yes = (b: any) => (b === true ? 'yes' : b === false ? '**no**' : '–')
let md = `# Notation bakeoff report\n\nCorpus: ${scores.map((s) => s.name).join(', ')}\n\n`
for (const [dir, R] of Object.entries<any>(report.designs)) {
  md += `## ${dir}: conformance ${R.conformance.length ? '**' + R.conformance.join('; ') + '**' : 'ok'}\n\n`
  md += `## ${dir}: ${R.title}\n\n${R.idea}\n\n| score | covers all | deterministic | position-blind | name-blind | order-blind | crossings | arcs through nodes | overlaps | numbers printed | entity silhouette |\n|---|---|---|---|---|---|---|---|---|---|---|\n`
  for (const [name, r] of Object.entries<any>(R.scores)) {
    if (r.error) { md += `| ${name} | error: ${r.error.slice(0, 120)} |||||||| \n`; continue }
    const cov = !r.coverage.missingNodes.length && !r.coverage.missingArcs.length
    md += `| ${name} | ${cov ? 'yes' : `**no** (${r.coverage.missingNodes.length} nodes, ${r.coverage.missingArcs.length} arcs)`} | ${yes(r.deterministic)} | ${yes(r.positionBlind)} | ${yes(r.nameBlind)} | ${yes(r.orderBlind)} | ${r.clutter.crossings} | ${r.clutter.through} | ${r.clutter.overlaps} | ${r.countsShown.needed - r.countsShown.missing.length}/${r.countsShown.needed} | ${r.entityClustering ?? '–'} |\n`
  }
  md += `\nSame structure, same shape (max deviation of a shared subnet's relative geometry): ${Object.entries<any>(R.sameStructure).map(([k, v]) => `${k} ${v.error ?? v.maxDeviationPx + 'px'}`).join('; ') || 'no shared subnets'}\n\n`
  md += `Local delta (nodes moved / common nodes, mean shift as % of diagonal): ${Object.entries<any>(R.localDelta).map(([k, v]) => `${k} ${v.moved}/${v.common}, ${v.meanShiftPctOfDiagonal}%`).join('; ')}\n\n`
}
md += `## Diversity\n\nPairs of designs. Same axes lists declared axes with identical wording. Rank correlation near 1 means the two place nodes in the same order.\n\n| pair | same axes | mean abs rank corr | max |\n|---|---|---|---|\n` + Object.entries<any>(report.diversity ?? {}).map(([k, v]) => `| ${k} | ${v.sameAxes.join(', ') || 'none'} | ${v.meanAbsRankCorrelation} | ${v.maxAbsRankCorrelation} |`).join('\n') + '\n'
writeFileSync(join(OUT, 'report.md'), md)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
let html = `<!doctype html><meta charset="utf-8"><title>Notation bakeoff</title><style>body{font:14px system-ui;margin:16px;color:#222}section{margin:0 0 40px}h2{margin:24px 0 4px}.idea{max-width:900px;color:#444}figure{margin:12px 0;border:1px solid #ddd;padding:8px;display:inline-block;vertical-align:top}figcaption{font-size:12px;color:#666}</style>`
html += `<p>Pick a design: ${designDirs.map((d) => `<a href="?d=${d}">${d}</a>`).join(' · ')} · <a href="?">all</a>. Add <code>&amp;s=score</code> for one score.</p>`
for (const dir of designDirs) {
  const R = report.designs[dir]
  html += `<section data-d="${dir}"><h2>${dir}: ${esc(R.title)}</h2><p class="idea">${esc(R.idea)}</p>`
  for (const { name } of scores) if (existsSync(join(OUT, dir, name + '.svg'))) html += `<figure data-s="${name}"><figcaption>${name}</figcaption>${readFileSync(join(OUT, dir, name + '.svg'), 'utf8')}</figure>`
  html += `</section>`
}
html += `<script>const q=new URLSearchParams(location.search);document.querySelectorAll('section').forEach(s=>{if(q.get('d')&&s.dataset.d!==q.get('d'))s.remove()});document.querySelectorAll('figure').forEach(f=>{if(q.get('s')&&f.dataset.s!==q.get('s'))f.remove()})</script>`
writeFileSync(join(OUT, 'gallery.html'), html)
console.log(md)
