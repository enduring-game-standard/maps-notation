// usage: tsx measure.ts <spec.ts> <out-dir>  (draws the hand spec, runs PR 23's checks on the same geometry)
import { writeFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'
import { load, toLayout, render, type Spec, type Side } from './geom.ts'
import { checkAll } from '../../../../pr23/research/petri-layout/harness/checks.ts'
import { PLACE_R, type Layout } from '../../../../pr23/research/petri-layout/engine/layout.ts'
import { sampleBezier } from '../../../../pr23/research/petri-layout/engine/geometry.ts'
import { labelWidth, wrapLabel } from '../../../../pr23/research/petri-layout/engine/label.ts'

const [specFile, out] = process.argv.slice(2)
const { file, spec } = (await import(resolve(specFile))) as { file: string; spec: Spec }
const { maps, net } = load(file)
const ids = [...net.places.map((p) => p.id), ...net.transitions.map((t) => t.id)]
const text = (id: string) => { const n = net.places.find((p) => p.id === id) ?? net.transitions.find((t) => t.id === id)!; return n.label ?? id }

type Box = { x0: number; x1: number; y0: number; y1: number }
const box = (lay: Layout, id: string): Box => {
  const L = lay.nodes[id].label!, lines = wrapLabel(text(id)), w = labelWidth(lines), half = (lines.length - 1) * 7
  const x0 = L.anchor === 'start' ? L.x : L.anchor === 'end' ? L.x - w : L.x - w / 2
  return { x0: x0 + 1, x1: x0 + w - 1, y0: L.y - half - 5, y1: L.y + half + 6 }
}
const inside = (p: { x: number; y: number }, b: Box) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1
// R21: no label touches another label, a node, or an arc. PR 23's test samples 40 points per arc and misses long legs.
function clash(lay: Layout, id: string): string | undefined {
  const b = box(lay, id)
  for (const a of lay.arcs) if (sampleBezier(a.path, 400).some((p) => inside(p, b))) return `arc ${a.from}>${a.to}`
  for (const o of ids) {
    if (o === id) continue
    const n = lay.nodes[o]
    if (n.kind === 'place' ? Math.hypot(Math.max(b.x0 - n.x, 0, n.x - b.x1), Math.max(b.y0 - n.y, 0, n.y - b.y1)) < PLACE_R
      : [-1, -0.5, 0, 0.5, 1].some((t) => inside({ x: n.x + (Math.cos(n.angle) * t * n.length) / 2, y: n.y + (Math.sin(n.angle) * t * n.length) / 2 }, b))) return `node ${o}`
    const c = box(lay, o)
    if (c.x0 < b.x1 && b.x0 < c.x1 && c.y0 < b.y1 && b.y0 < c.y1) return `label of ${o}`
  }
}

// R21 puts a label on its node's free side: keep the drawn side when it is free, else take the first free one
const sides: Side[] = ['e', 'w', 'n', 's', 'ne', 'nw', 'se', 'sw']
const moved: string[] = []
for (let pass = 0; pass < 3; pass++) for (const id of ids) {
  if (!clash(toLayout(net, spec), id)) continue
  const was = spec.label[id]
  const free = sides.find((s) => { spec.label[id] = s; return !clash(toLayout(net, spec), id) })
  if (!free && pass === 2) console.log(`  no free side for ${id}: ` + sides.map((x) => { spec.label[id] = x; return `${x} ${clash(toLayout(net, spec), id)}` }).join('; '))
  spec.label[id] = free ?? was
  if (free && free !== was) moved.push(`${id}: ${was} -> ${free}`)
}
const lay = toLayout(net, spec)
// a hand drawing has no layout function: the order and determinism checks get the drawing itself, renamed
const same = (n: typeof net): Layout => (n === net ? lay : { nodes: Object.fromEntries(ids.map((id, i) => ['n' + i, lay.nodes[id]])), arcs: [] })
const r = checkAll(net, lay, same)
for (const id of ids) { const c = clash(lay, id); if (c && !r.failures.some((f) => f.includes(`label of ${id}`))) r.failures.push(`R21 the label of ${id} touches ${c}`) }
writeFileSync(`${out}/${basename(specFile, '.ts')}.svg`, render(maps, net, lay))
console.log(`${r.failures.length} failures over ${net.arcs.length} arcs and ${ids.length} nodes`)
for (const f of r.failures) console.log('  ' + f)
for (const n of r.notes) console.log('  note: ' + n)
if (moved.length) console.log('  labels moved to a free side: ' + moved.join(', '))
