import type { Net } from '../engine/net.ts'
import { PLACE_R, type Layout, type Pt } from '../engine/layout.ts'
import { sampleBezier } from '../engine/geometry.ts'
import { ruleChecks } from './rules.ts'

export type CheckResult = { failures: string[]; notes: string[] }

// Hygiene and invariance checks every layout must pass, then the rule checks.
export function checkAll(net: Net, lay: Layout, layout: (n: Net) => Layout): CheckResult {
  const failures: string[] = []
  const notes: string[] = []
  const ids = [...net.places.map((p) => p.id), ...net.transitions.map((t) => t.id)]
  for (const id of ids) if (!lay.nodes[id] || !Number.isFinite(lay.nodes[id].x) || !Number.isFinite(lay.nodes[id].y)) failures.push(`node ${id} has no position`)
  if (failures.length) return { failures, notes }

  // every arc drawn, from its source to its target
  const want = new Map<string, number>()
  for (const a of net.arcs) want.set(`${a.from}>${a.to}`, (want.get(`${a.from}>${a.to}`) ?? 0) + 1)
  for (const r of lay.arcs) want.set(`${r.from}>${r.to}`, (want.get(`${r.from}>${r.to}`) ?? 0) - 1)
  for (const [k, v] of want) if (v !== 0) failures.push(`arc ${k} drawn ${v > 0 ? 'missing' : 'extra'}`)
  for (const r of lay.arcs) {
    const s = r.path[0], e = r.path[r.path.length - 1]
    if (offNode(s, lay.nodes[r.from]) > 6 || offNode(e, lay.nodes[r.to]) > 6) failures.push(`arc ${r.from}>${r.to} does not start and end at its nodes`)
  }

  // nodes keep clear of one another: circles by their rims, bars by their segments
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    if (gap(lay.nodes[ids[i]], lay.nodes[ids[j]]) < 4) failures.push(`nodes ${ids[i]} and ${ids[j]} overlap`)
  }

  // an arc never runs through a node it does not touch
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

  // labels clear of nodes
  for (const id of ids) {
    const L = lay.nodes[id].label
    if (!L) continue
    for (const other of ids) {
      if (other === id) continue
      const n = lay.nodes[other]
      if (n.kind === 'place' && Math.abs(L.y - n.y) < PLACE_R && labelSpanHits(L, labelWidth(net, id), n.x, PLACE_R)) { failures.push(`label of ${id} covers ${other}`); break }
    }
  }

  // the same structure gives the same picture: shuffled declaration order and renamed ids change nothing
  const again = layout(shuffleAndRename(net, 1))
  const back = (id: string) => 'n' + ids.indexOf(id)
  const pic = (l: Layout, name: (id: string) => string) => ids.map((id) => `${name(id)}:${Math.round(l.nodes[id].x)},${Math.round(l.nodes[id].y)}`).sort().join(' ')
  const renamedPic = ids.map((id, i) => `n${i}:${Math.round(again.nodes['n' + i].x)},${Math.round(again.nodes['n' + i].y)}`).sort().join(' ')
  if (pic(lay, back) !== renamedPic) {
    // nets with identical parts may swap them; that is fine only if the node at each position plays the same role
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
// distance from a point to a node's outline: a circle's rim, or a bar's segment
function offNode(p: Pt, n: Layout['nodes'][string]) {
  return n.kind === 'place' ? Math.abs(dist(p, n) - PLACE_R) : segDist(p, n.x, n.y, n.angle, n.length)
}

// the renderer wraps labels at 16 characters, 13 px italic serif: about 6.2 px a character
function labelWidth(net: Net, id: string) {
  const node = net.places.find((p) => p.id === id) ?? net.transitions.find((t) => t.id === id)!
  const text = node.label ?? id
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) { if (cur && (cur + ' ' + w).length > 16) { lines.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w }
  if (cur) lines.push(cur)
  return Math.max(...lines.map((l) => l.length)) * 6.2
}

function labelSpanHits(L: { x: number; anchor: string }, w: number, cx: number, r: number) {
  const x0 = L.anchor === 'start' ? L.x : L.anchor === 'end' ? L.x - w : L.x - w / 2
  return cx + r > x0 && cx - r < x0 + w
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
