import type { Net, NodeId } from '../../engine/net.ts'
import type { Layout } from '../../engine/layout.ts'
import { analyze, laneOrder, type Structure } from '../../engine/structure.ts'
import { arcKey, buildGraph, mean, type FC, type Graph, type Hint, type Plan, type Side } from './model.ts'
import { lanePlan, ROW } from './lanes.ts'
import { draw } from './draw.ts'

export function layout(net: Net): Layout {
  const s = analyze(net)
  const g = buildGraph(net, s)
  if (isLoneCycle(net, s)) return draw(g, ringPlan(g))
  if (s.spines.length) return draw(g, lanePlan(g))
  return draw(g, layeredPlan(g))
}

// R15: a net that is one cycle and nothing else.
function isLoneCycle(net: Net, s: Structure) {
  if (s.spines.length !== 1 || s.spines[0].open) return false
  const sp = s.spines[0]
  return sp.places.length === net.places.length && sp.transitions.length === net.transitions.length
    && sp.places.length >= 2 && sp.transitions.every((t) => s.pre.get(t)!.size === 1 && s.post.get(t)!.size === 1)
}

// R15: a regular ring, anchor at the top, firing order clockwise, bars across the ring.
function ringPlan(g: Graph): Plan {
  const ord = laneOrder(g.net, g.s, g.s.spines[0])
  const seq = [...ord.stage].sort((a, b) => a[1] - b[1]).map(([n]) => n)
  const n = seq.length
  const r = Math.max(70, (n * 62) / (2 * Math.PI))
  const pos = new Map<NodeId, FC>(), bar: Plan['bar'] = new Map(), hints = new Map<string, Hint>(), labelSide = new Map<NodeId, Side>()
  seq.forEach((id, k) => {
    const th = -Math.PI / 2 + (2 * Math.PI * k) / n
    pos.set(id, { f: r * Math.cos(th), c: r * Math.sin(th) })
    if (!g.isPlace(id)) bar.set(id, { angle: th })
    labelSide.set(id, Math.sin(th) >= 0 ? 1 : -1)
  })
  for (const a of g.net.arcs) hints.set(arcKey(a.from, a.to), { kind: 'ring', r })
  return { frame: 'right', pos, bar, barSpan: new Map(), hints, labelSide }
}

// C12: no lane structure. Layers along the flow from the marked places and sources; feedback arcs bow outside;
// each node sits level with what feeds it.
function layeredPlan(g: Graph): Plan {
  const { net } = g
  // R13: a node joined to the rest only by self-loops with one partner sits beside that partner
  const glued = new Map<NodeId, NodeId>()
  for (const n of [...net.places, ...net.transitions].map((x) => x.id).sort(g.byKey)) {
    const nb = g.nbrs.get(n)!
    if (nb.length === 1 && g.ins.get(n)!.includes(nb[0]) && g.outs.get(n)!.includes(nb[0]) && !glued.has(nb[0])) glued.set(n, nb[0])
  }
  const all = [...net.places, ...net.transitions].map((n) => n.id).filter((n) => !glued.has(n)).sort(g.byKey)
  const roots = all.filter((n) => (g.tokens.get(n) ?? 0) > 0 || g.ins.get(n)!.length === 0)
    .sort((a, b) => (g.tokens.get(b) ?? 0) - (g.tokens.get(a) ?? 0) || g.byKey(a, b))
  const state = new Map<NodeId, 1 | 2>()
  // a self-loop's give-back never pushes the place after its own transition (R13)
  const back = new Set<string>(g.s.selfLoops.map((l) => arcKey(l.transition, l.place)))
  const visit = (n: NodeId) => {
    state.set(n, 1)
    for (const m of g.outs.get(n)!) {
      if (back.has(arcKey(n, m))) continue
      if (state.get(m) === 1) back.add(arcKey(n, m))
      else if (!state.has(m)) visit(m)
    }
    state.set(n, 2)
  }
  for (const r of roots) if (!state.has(r)) visit(r)
  for (const n of all) if (!state.has(n)) visit(n)
  const fwdIn = (n: NodeId) => g.ins.get(n)!.filter((m) => !back.has(arcKey(m, n)))
  const layer = new Map<NodeId, number>()
  const depth = (n: NodeId): number => {
    if (layer.has(n)) return layer.get(n)!
    layer.set(n, 0)
    const d = Math.max(-1, ...fwdIn(n).map(depth)) + 1
    layer.set(n, d)
    return d
  }
  all.forEach(depth)
  const layers: NodeId[][] = []
  for (const n of all) (layers[layer.get(n)!] ??= []).push(n)
  const c = new Map<NodeId, number>()
  const resolve = (ns: NodeId[], want: Map<NodeId, number>) => {
    const sorted = ns.slice().sort((a, b) => want.get(a)! - want.get(b)! || g.byKey(a, b))
    const got: number[] = []
    sorted.forEach((n, i) => got.push(i === 0 ? want.get(n)! : Math.max(want.get(n)!, got[i - 1] + 80)))
    const shift = mean(sorted.map((n) => want.get(n)!)) - mean(got)
    sorted.forEach((n, i) => c.set(n, got[i] + shift))
  }
  for (const ns of layers) {
    if (!ns) continue
    const want = new Map(ns.map((n) => { const p = fwdIn(n).filter((m) => c.has(m)); return [n, p.length ? mean(p.map((m) => c.get(m)!)) : 0] }))
    resolve(ns, want)
  }
  // a node fed by nothing sits level with what it feeds
  for (let i = layers.length - 1; i >= 0; i--) {
    const ns = layers[i]
    if (!ns) continue
    const want = new Map(ns.map((n) => {
      if (fwdIn(n).length) return [n, c.get(n)!]
      const s = g.outs.get(n)!.filter((m) => !back.has(arcKey(n, m)) && layer.get(m)! > i)
      return [n, s.length ? mean(s.map((m) => c.get(m)!)) : c.get(n)!]
    }))
    resolve(ns, want)
  }
  const pos = new Map<NodeId, FC>(), bar: Plan['bar'] = new Map(), hints = new Map<string, Hint>(), labelSide = new Map<NodeId, Side>()
  for (const n of all) pos.set(n, { f: layer.get(n)! * ROW * 1.25, c: c.get(n)! })
  for (const [n, host] of glued) {
    const h = pos.get(host)!
    const free = (c: number) => ![...pos.values()].some((p) => Math.abs(p.f - h.f) < 50 && Math.abs(p.c - c) < 50)
    const k = [1, 2, 3].flatMap((i) => [-i, i]).find((i) => free(h.c + i * 64)) ?? -4
    pos.set(n, { f: h.f, c: h.c + k * 64 })
    layer.set(n, layer.get(host)!)
  }
  for (const n of pos.keys()) { labelSide.set(n, 1); if (!g.isPlace(n)) bar.set(n, 'across') }
  for (const a of net.arcs) {
    const k = arcKey(a.from, a.to)
    hints.set(k, g.outs.get(a.to)!.includes(a.from) && Math.abs(layer.get(a.from)! - layer.get(a.to)!) <= 1 ? { kind: 'loop' } : { kind: 'free', prefer: back.has(k) ? 1 : -1 })
  }
  return { frame: 'right', pos, bar, barSpan: new Map(), hints, labelSide }
}
