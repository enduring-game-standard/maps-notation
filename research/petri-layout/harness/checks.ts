import type { Net } from '../engine/net.ts'
import { PLACE_R, type Layout, type Pt } from '../engine/layout.ts'
import { sampleBezier } from '../engine/geometry.ts'
import { ruleChecks } from './rules.ts'
import { labelWidth, wrapLabel } from '../engine/label.ts'

export type CheckResult = { failures: string[]; notes: string[] }

export function checkAll(net: Net, lay: Layout, layout: (n: Net) => Layout): CheckResult {
  const failures: string[] = []
  const notes: string[] = []
  const ids = [...net.places.map((p) => p.id), ...net.transitions.map((t) => t.id)]
  for (const id of ids) if (!lay.nodes[id] || !Number.isFinite(lay.nodes[id].x) || !Number.isFinite(lay.nodes[id].y)) failures.push(`node ${id} has no position`)
  if (failures.length) return { failures, notes }

  const want = new Map<string, number>()
  for (const a of net.arcs) want.set(`${a.from}>${a.to}`, (want.get(`${a.from}>${a.to}`) ?? 0) + 1)
  for (const r of lay.arcs) want.set(`${r.from}>${r.to}`, (want.get(`${r.from}>${r.to}`) ?? 0) - 1)
  for (const [k, v] of want) if (v !== 0) failures.push(`arc ${k} drawn ${v > 0 ? 'missing' : 'extra'}`)
  for (const r of lay.arcs) {
    const s = r.path[0], e = r.path[r.path.length - 1]
    if (offNode(s, lay.nodes[r.from]) > 6 || offNode(e, lay.nodes[r.to]) > 6) failures.push(`arc ${r.from}>${r.to} does not start and end at its nodes`)
  }

  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    if (gap(lay.nodes[ids[i]], lay.nodes[ids[j]]) < 4) failures.push(`nodes ${ids[i]} and ${ids[j]} overlap`)
  }

  for (const r of lay.arcs) {
    const pts = sampleBezier(r.path, 24)
    for (const id of ids) {
      if (id === r.from || id === r.to) continue
      const n = lay.nodes[id]
      const hit = n.kind === 'place'
        ? pts.some((p) => dist(p, n) < PLACE_R - 2)
        : pts.some((p) => segDist(p, n.x, n.y, n.angle, n.length) < 2.5)
      if (hit) { failures.push(`arc ${r.from}>${r.to} runs through ${id}`); break }
    }
  }

  const boxes = ids.filter((id) => lay.nodes[id].label).map((id) => ({ id, ...labelBox(net, id, lay.nodes[id].label!) }))
  const inBox = (p: Pt, b: Box) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1
  for (const b of boxes) {
    for (const other of ids) {
      if (other === b.id) continue
      const n = lay.nodes[other]
      const hit = n.kind === 'place'
        ? Math.hypot(Math.max(b.x0 - n.x, 0, n.x - b.x1), Math.max(b.y0 - n.y, 0, n.y - b.y1)) < PLACE_R
        : sampleSeg(n).some((p) => inBox(p, b))
      if (hit) { failures.push(`label of ${b.id} covers ${other}`); break }
    }
    for (const o of boxes) if (o.id > b.id && o.x0 < b.x1 && b.x0 < o.x1 && o.y0 < b.y1 && b.y0 < o.y1) failures.push(`labels of ${b.id} and ${o.id} overlap`)
    for (const r of lay.arcs) {
      if (sampleBezier(r.path, 40).filter((p) => inBox(p, b)).length >= 3) { failures.push(`arc ${r.from}>${r.to} runs through the label of ${b.id}`); break }
    }
  }

  const again = layout(shuffleAndRename(net, 1))
  const back = (id: string) => 'n' + ids.indexOf(id)
  const pic = (l: Layout, name: (id: string) => string) => ids.map((id) => `${name(id)}:${Math.round(l.nodes[id].x)},${Math.round(l.nodes[id].y)}`).sort().join(' ')
  const renamedPic = ids.map((_, i) => `n${i}:${Math.round(again.nodes['n' + i].x)},${Math.round(again.nodes['n' + i].y)}`).sort().join(' ')
  if (pic(lay, back) !== renamedPic) {
    if (isAutomorphicSwap(net, lay, again, ids)) notes.push('identical parts swapped under renaming')
    else failures.push('layout depends on declaration order or ids')
  }
  if (pic(layout(net), (id) => id) !== pic(lay, (id) => id)) failures.push('layout is not deterministic')

  const rules = ruleChecks(net, lay)
  failures.push(...rules.failures)
  notes.push(...rules.notes)
  return { failures, notes }
}

type Node = Layout['nodes'][string]
function gap(a: Node, b: Node): number {
  if (a.kind === 'place' && b.kind === 'place') return dist(a, b) - 2 * PLACE_R
  if (a.kind === 'place' && b.kind === 'transition') return segDist(a, b.x, b.y, b.angle, b.length) - PLACE_R - 1.5
  if (b.kind === 'place' && a.kind === 'transition') return segDist(b, a.x, a.y, a.angle, a.length) - PLACE_R - 1.5
  if (a.kind !== 'transition' || b.kind !== 'transition') return Infinity
  const ends = (n: Node & { kind: 'transition' }) => [-1, 1].map((k) => ({ x: n.x + k * Math.cos(n.angle) * n.length / 2, y: n.y + k * Math.sin(n.angle) * n.length / 2 }))
  if (segmentsCross(ends(a), ends(b))) return 0
  return Math.min(...ends(a).map((e) => segDist(e, b.x, b.y, b.angle, b.length)), ...ends(b).map((e) => segDist(e, a.x, a.y, a.angle, a.length))) - 3
}
function segmentsCross([p, q]: Pt[], [r, s]: Pt[]) {
  const o = (a: Pt, b: Pt, c: Pt) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
  return o(p, q, r) * o(p, q, s) < 0 && o(r, s, p) * o(r, s, q) < 0
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
function segDist(p: Pt, x: number, y: number, ang: number, len: number) {
  const ux = Math.cos(ang), uy = Math.sin(ang)
  const t = Math.max(-len / 2, Math.min(len / 2, (p.x - x) * ux + (p.y - y) * uy))
  return Math.hypot(p.x - (x + ux * t), p.y - (y + uy * t))
}
function offNode(p: Pt, n: Layout['nodes'][string]) {
  return n.kind === 'place' ? Math.abs(dist(p, n) - PLACE_R) : segDist(p, n.x, n.y, n.angle, n.length)
}

type Box = { x0: number; x1: number; y0: number; y1: number }
function labelBox(net: Net, id: string, L: { x: number; y: number; anchor: string }): Box {
  const node = net.places.find((p) => p.id === id) ?? net.transitions.find((t) => t.id === id)!
  const lines = wrapLabel(node.label ?? id)
  const w = labelWidth(lines)
  const x0 = L.anchor === 'start' ? L.x : L.anchor === 'end' ? L.x - w : L.x - w / 2
  const half = (lines.length - 1) * 7
  return { x0: x0 + 1, x1: x0 + w - 1, y0: L.y - half - 5, y1: L.y + half + 6 }
}

function sampleSeg(n: Layout['nodes'][string] & { kind: 'transition' }): Pt[] {
  return Array.from({ length: 9 }, (_, i) => { const t = (i / 8 - 0.5) * n.length; return { x: n.x + Math.cos(n.angle) * t, y: n.y + Math.sin(n.angle) * t } })
}

export function shuffleAndRename(net: Net, seed: number): Net {
  const ids = [...net.places.map((p) => p.id), ...net.transitions.map((t) => t.id)]
  const name = (id: string) => 'n' + ids.indexOf(id)
  let s = seed * 9301 + 49297
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [rnd(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x)
  return {
    name: net.name,
    places: shuffle(net.places.map((p) => ({ ...p, id: name(p.id) }))),
    transitions: shuffle(net.transitions.map((t) => ({ ...t, id: name(t.id) }))),
    arcs: shuffle(net.arcs.map((a) => ({ ...a, from: name(a.from), to: name(a.to) }))),
  }
}

function isAutomorphicSwap(net: Net, lay: Layout, again: Layout, ids: string[]): boolean {
  const at = new Map<string, string>()
  for (const [id, n] of Object.entries(again.nodes)) at.set(`${n.kind}${Math.round(n.x)},${Math.round(n.y)}`, id)
  const phi = new Map<string, string>()
  for (const id of ids) {
    const n = lay.nodes[id]
    const m = at.get(`${n.kind}${Math.round(n.x)},${Math.round(n.y)}`)
    if (!m) return false
    phi.set(id, ids[Number(m.slice(1))])
  }
  if (new Set(phi.values()).size !== ids.length) return false
  const tok = new Map(net.places.map((p) => [p.id, p.tokens]))
  for (const [a, b] of phi) if ((tok.get(a) ?? -1) !== (tok.get(b) ?? -1)) return false
  const key = (a: { from: string; to: string; weight: number; inhibitor: boolean }) => `${a.from}>${a.to}:${a.weight}${a.inhibitor}`
  const arcs = net.arcs.map(key).sort().join(' ')
  const mapped = net.arcs.map((a) => key({ ...a, from: phi.get(a.from)!, to: phi.get(a.to)! })).sort().join(' ')
  return arcs === mapped
}
