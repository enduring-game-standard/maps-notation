import type { Net, NodeId } from '../../engine/net.ts'
import type { ArcRoute, Layout, Pt } from '../../engine/layout.ts'
import { attach, straight } from '../../engine/geometry.ts'
import { analyze, laneOrder, type Structure } from '../../engine/structure.ts'
import { G, BAR, Frame, barLength, hitsNode, route, smooth, labelLines, type Nodes } from './common.ts'
import { planLanes, type LaneRec, type Plan, type Pos } from './lanes.ts'
import { layered } from './layered.ts'
import { placeLabels } from './labels.ts'

export function layout(net: Net): Layout {
  const tallest = Math.max(1, ...[...net.places, ...net.transitions].map((n) => labelLines(n.label ?? '')))
  G.step = Math.min(150, 88 + 14 * Math.max(0, tallest - 2))
  if (net.places.length + net.transitions.length === 0) return { nodes: {}, arcs: [] }
  const s = analyze(net)
  if (isLoneCycle(net, s)) return ring(net, s)

  const down = s.spines.length >= 2
  const fr = new Frame(down)
  const plan: Plan = s.spines.length
    ? planLanes(net, s)
    : { lanes: [], pos: new Map(), barLen: new Map(), laneOf: new Map(), leftover: new Set([...net.places, ...net.transitions].map((n) => n.id)), sharedGap: new Map(), barAngle: new Map(), backArcs: new Set(), block: null }

  const pos = new Map<NodeId, Pos>(plan.pos)
  if (plan.leftover.size) {
    const lay = layered(net, s, plan.leftover)
    let shift = 0
    if (pos.size) {
      const cmax = Math.max(...[...pos.values()].map((p) => p.c))
      const cmin = Math.min(...[...lay.pos.values()].map((p) => p.c))
      shift = cmax + 140 - cmin
    }
    for (const [n, p] of lay.pos) pos.set(n, { f: p.f, c: p.c + shift })
    plan.backArcs = lay.back
    const cs = [...lay.pos.values()].map((p) => p.c + shift)
    plan.block = { lo: Math.min(...cs), hi: Math.max(...cs) }
    for (const n of lay.loopBars) plan.barAngle.set(n, fr.barAngle() + Math.PI / 2)
  }
  for (const t of net.transitions) if (!plan.barLen.has(t.id)) plan.barLen.set(t.id, barLength(net.arcs, t.id))

  const nodes: Nodes = {}
  const isPlace = new Set(net.places.map((p) => p.id))
  for (const id of [...net.places, ...net.transitions].map((n) => n.id)) {
    const p = pos.get(id)!
    const xy = fr.pt(p.f, p.c)
    nodes[id] = isPlace.has(id)
      ? { kind: 'place', x: xy.x, y: xy.y }
      : { kind: 'transition', x: xy.x, y: xy.y, angle: plan.barAngle.get(id) ?? fr.barAngle(), length: plan.barLen.get(id)! }
  }

  const arcs = routeArcs(net, fr, plan, nodes)
  placeLabels(net, nodes, arcs, preferredLabelDir(net, fr, plan))
  return { nodes, arcs }
}

// ---------------------------------------------------------------------------------------------------------

const LADDER = [28, 50, 76, 106, 142, 190, 250, 320, 400]

function routeArcs(net: Net, fr: Frame, plan: Plan, nodes: Nodes): ArcRoute[] {
  const crossU: Pt = fr.down ? { x: 1, y: 0 } : { x: 0, y: 1 }
  const sig = (v: number) => (v >= 0 ? 1 : -1)
  const dirCount = new Map<string, number>()
  for (const a of net.arcs) dirCount.set(a.from + '>' + a.to, (dirCount.get(a.from + '>' + a.to) ?? 0) + 1)

  const laneFor = (u: NodeId, v: NodeId): LaneRec | undefined => plan.lanes.find((r) => r.nodes.has(u) && r.nodes.has(v))
  const result: ArcRoute[] = []
  const stageOf = (r: LaneRec, n: NodeId) => r.stage.get(n)!

  const bowRoute = (a: NodeId, b: NodeId, prefer: 1 | -1, firstStraight = true, extraSkip: NodeId[] = []): Pt[] => {
    const A = nodes[a], B = nodes[b]
    const skip = new Set([a, b, ...extraSkip])
    if (firstStraight) {
      const p = route(A, B, [])
      if (!hitsNode(p, nodes, skip)) return p
    }
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1
    let perp: Pt = { x: -dy / L, y: dx / L }
    const along = perp.x * crossU.x + perp.y * crossU.y
    if (Math.abs(along) < 0.3) { const flowSign = fr.down ? sig(perp.y) : sig(perp.x); perp = { x: perp.x * flowSign, y: perp.y * flowSign } } else perp = { x: perp.x * sig(along), y: perp.y * sig(along) }
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
    for (const d of LADDER) for (const sgn of [prefer, -prefer]) {
      const w = { x: mid.x + perp.x * sgn * d, y: mid.y + perp.y * sgn * d }
      const p = route(A, B, [w])
      if (!hitsNode(p, nodes, skip)) return p
    }
    return route(A, B, [])
  }

  // a return or back arc runs around the outside (R7): out past what the lane or block reaches, along, and in from before the target
  const loopAround = (a: NodeId, b: NodeId, sg: 1 | -1, edge: number, clear: number): Pt[] => {
    const S = nodes[a], T = nodes[b]
    const fS = fr.f(S), fT = fr.f(T), cS = fr.c(S), cT = fr.c(T)
    const fm = (fS + fT) / 2
    for (let k = 0; k < 14; k++) {
      const co = edge + sg * (clear + k * 22)
      const via = fr.pt(fS + 0.7 * G.step, cS + (co - cS) * 0.3)
      const s0 = attach(S, via)
      const A = fr.pt(fS + 0.5 * G.step, cS + (co - cS) * 0.62)
      const M = fr.pt(fm, co)
      const e = fr.pt(fT - 0.5 * G.step, cT + (co - cT) * 0.62)
      const E = attach(T, e)
      const path = smooth([s0, A, M, e, E])
      if (!hitsNode(path, nodes, new Set([a, b]), 6)) return path
    }
    return bowRoute(a, b, sg, false)
  }
  const outsideLoop = (r: LaneRec, a: NodeId, b: NodeId): Pt[] => {
    const offS = fr.c(nodes[a]) - r.line
    const sg: 1 | -1 = Math.abs(offS) > 1 && !(offS > 0 ? r.coupled.pos : r.coupled.neg) ? (offS > 0 ? 1 : -1) : r.retSide
    return loopAround(a, b, sg, r.line + sg * (sg > 0 ? r.reach.pos : r.reach.neg), r.clear)
  }

  for (const a of net.arcs) {
    const A = nodes[a.from], B = nodes[a.to]
    let path: Pt[]
    const opposite = (dirCount.get(a.to + '>' + a.from) ?? 0) > 0
    const r = laneFor(a.from, a.to)
    if (opposite) {
      // a loop: two short arcs bowed apart into a lens (R13)
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1
      const mid = { x: (A.x + B.x) / 2 - (dy / L) * 15, y: (A.y + B.y) / 2 + (dx / L) * 15 }
      path = route(A, B, [mid])
    } else if (r) {
      const diff = stageOf(r, a.to) - stageOf(r, a.from)
      if (diff < 0) path = outsideLoop(r, a.from, a.to)
      else if (diff > 1) path = bowRoute(a.from, a.to, -r.retSide as 1 | -1)
      else path = bowRoute(a.from, a.to, r.satSide)
    } else if (plan.backArcs.has(a.from + '>' + a.to) && plan.block) {
      path = loopAround(a.from, a.to, -1, plan.block.lo, 36)
    } else {
      path = bowRoute(a.from, a.to, 1)
    }
    result.push({ from: a.from, to: a.to, weight: a.weight, inhibitor: a.inhibitor, path })
  }
  return result
}

function preferredLabelDir(net: Net, fr: Frame, plan: Plan): Map<NodeId, Pt> {
  const out = new Map<NodeId, Pt>()
  const crossDir = (sg: number): Pt => (fr.down ? { x: sg, y: 0 } : { x: 0, y: sg })
  for (const n of [...net.places, ...net.transitions]) {
    const ls = plan.laneOf.get(n.id)
    let sg: number
    if (ls && ls.length === 1) { const off = ls[0].off.get(n.id) ?? 0; sg = Math.abs(off) > 1 ? Math.sign(off) : ls[0].retSide }
    else if (ls) sg = 1
    else {
      const p = plan.pos.get(n.id)
      const owner = plan.lanes.find((r) => p && Math.abs(r.line - p.c) < 1e-6) // shared places keep default
      sg = owner ? owner.retSide : 1
    }
    out.set(n.id, crossDir(sg))
  }
  return out
}

// ---------------------------------------------------------------------------------------------------------
// R15: a lone cycle is a ring, anchor at the top, reading clockwise.

function isLoneCycle(net: Net, s: Structure) {
  if (s.spines.length !== 1 || s.spines[0].open) return false
  const sp = s.spines[0]
  return sp.places.length === net.places.length && sp.transitions.length === net.transitions.length
    && sp.places.length >= 2 && sp.transitions.every((t) => s.pre.get(t)!.size === 1 && s.post.get(t)!.size === 1)
}

function ring(net: Net, s: Structure): Layout {
  const ord = laneOrder(net, s, s.spines[0])
  const seq = [...ord.stage.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n)
  const n = seq.length
  const R = Math.max(100, 86 / (2 * Math.sin(Math.PI / n)))
  const isPlace = new Set(net.places.map((p) => p.id))
  const nodes: Nodes = {}
  seq.forEach((id, i) => {
    const th = -Math.PI / 2 + (2 * Math.PI * i) / n
    const x = R * Math.cos(th), y = R * Math.sin(th)
    nodes[id] = isPlace.has(id) ? { kind: 'place', x, y } : { kind: 'transition', x, y, angle: th, length: BAR }
  })
  const arcs: ArcRoute[] = net.arcs.map((a) => ({
    from: a.from, to: a.to, weight: a.weight, inhibitor: a.inhibitor,
    path: straight(attach(nodes[a.from], nodes[a.to]), attach(nodes[a.to], nodes[a.from])),
  }))
  const prefer = new Map<NodeId, Pt>()
  seq.forEach((id, i) => { const th = -Math.PI / 2 + (2 * Math.PI * i) / n; prefer.set(id, { x: Math.cos(th), y: Math.sin(th) }) })
  placeLabels(net, nodes, arcs, prefer)
  return { nodes, arcs }
}

