import type { Net, NodeId } from '../../engine/net.ts'
import type { Layout } from '../../engine/layout.ts'
import { analyze, isLoneCycle, isRingWithTails, laneOrders, laneRing } from '../../engine/structure.ts'
import { arcKey, buildGraph, type FC, type Graph, type Hint, type Plan, type Side } from './model.ts'
import { lanePlan, ROW } from './lanes.ts'
import { draw } from './draw.ts'
import { shapePlan } from './shape.ts'

export function layout(net: Net): Layout {
  const s = analyze(net)
  const g = buildGraph(net, s)
  if (isLoneCycle(net, s)) return draw(g, ringPlan(g))
  const ring = laneRing(net, s)
  if (ring) return draw(g, spokePlan(g, ring))
  if (s.spines.length && !isRingWithTails(s)) return draw(g, lanePlan(g))
  return draw(g, shapePlan(g))
}

function ringPlan(g: Graph): Plan {
  const ord = laneOrders(g.net, g.s)[0]
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

function spokePlan(g: Graph, ring: number[]): Plan {
  const { net, s } = g
  const ords = laneOrders(net, s)
  const n = ring.length
  const r0 = Math.max(110, 100 / Math.sin(Math.PI / n))
  const step = ROW * 1.25
  const angle = new Map<number, number>()
  ring.forEach((li, k) => angle.set(li, Math.PI / 2 + (2 * Math.PI * k) / n))
  const at = (th: number, r: number): FC => ({ f: r * Math.cos(th), c: r * Math.sin(th) })
  const pos = new Map<NodeId, FC>(), bar: Plan['bar'] = new Map(), hints = new Map<string, Hint>(), labelSide = new Map<NodeId, Side>()
  const spokeOf = new Map<NodeId, number>()
  const labelDir = new Map<NodeId, { x: number; y: number }>()
  for (const li of ring) {
    const th = angle.get(li)!
    for (const [id, k] of ords[li].stage) {
      if (spokeOf.has(id)) continue
      spokeOf.set(id, li)
      pos.set(id, at(th, r0 + k * step))
      if (!g.isPlace(id)) bar.set(id, { angle: th + Math.PI / 2 })
      labelSide.set(id, -1)
      labelDir.set(id, { x: Math.sin(th), y: -Math.cos(th) })
    }
  }
  for (const p of net.places) {
    const role = s.placeRole.get(p.id)!
    if (role.kind !== 'shared') continue
    const [a, b] = role.spines
    let ta = angle.get(a)!, tb = angle.get(b)!
    if (Math.abs(tb - ta) > Math.PI) tb += tb < ta ? 2 * Math.PI : -2 * Math.PI
    const takes = g.outs.get(p.id)!.map((t) => ords[spokeOf.get(t)!].stage.get(t)!)
    pos.set(p.id, at((ta + tb) / 2, r0 + (Math.min(...takes) - 0.5) * step))
    labelSide.set(p.id, 1)
    labelDir.set(p.id, { x: -Math.cos((ta + tb) / 2), y: -Math.sin((ta + tb) / 2) })
  }
  for (const a of net.arcs) {
    const li = spokeOf.get(a.from), lj = spokeOf.get(a.to)
    const k = arcKey(a.from, a.to)
    if (li !== undefined && li === lj && ords[li].returnArcs.some((r) => r.from === a.from && r.to === a.to)) hints.set(k, { kind: 'petal', side: 1, d: 30 })
    else if (li !== undefined && li === lj) hints.set(k, { kind: 'lane' })
    else hints.set(k, { kind: 'free', prefer: 1, hook: false })
  }
  return { frame: 'right', pos, bar, barSpan: new Map(), hints, labelSide, labelDir }
}
