import type { Net, NodeId } from '../engine/net.ts'
import type { Layout, Pt } from '../engine/layout.ts'
import { analyze, isLoneCycle, isRingWithTails, laneOrders, laneRing, readsOnly } from '../engine/structure.ts'
import { sampleBezier } from '../engine/geometry.ts'

// how far a node may sit past what it relates to, and the extra row a common start may take above its bars
const NEAR = 30, ROW_ROOM = 60

type Frame = { flow: (p: Pt) => number; off: (p: Pt) => number }

export function ruleChecks(net: Net, lay: Layout, TOL = 2): { failures: string[]; notes: string[] } {
  const failures: string[] = []
  const notes: string[] = []
  const s = analyze(net)
  const ords = laneOrders(net, s)
  const lanes = s.spines.map((sp, i) => ({ sp, ord: ords[i] }))
  const at = (id: NodeId) => lay.nodes[id]
  const onTwoLanes = (t: NodeId) => (s.spineOfTransition.get(t)?.length ?? 0) > 1

  const sp0 = s.spines[0]
  if (isLoneCycle(net, s) || isRingWithTails(s)) {
    const ids = isLoneCycle(net, s) ? [...net.places, ...net.transitions].map((n) => n.id) : [...sp0.places, ...sp0.transitions.filter((t) => !readsOnly(s, t, new Set(sp0.places)))]
    const ps = ids.filter((i) => at(i).kind === 'place'), ts = ids.filter((i) => at(i).kind === 'transition')
    const c = { x: avg(ps.map((i) => at(i).x)), y: avg(ps.map((i) => at(i).y)) }
    const even = (xs: string[]) => { const ds = xs.map((i) => Math.hypot(at(i).x - c.x, at(i).y - c.y)); return Math.max(...ds) - Math.min(...ds) <= 0.15 * avg(ds) }
    if (!even(ps) || !even(ts)) failures.push('R15 a lone cycle is not drawn as a ring')
    return { failures, notes }
  }

  const ring = laneRing(net, s)
  const center = ring ? centroid(lanes.map((l) => at(l.ord.anchor))) : { x: 0, y: 0 }
  const frames = lanes.map(({ ord }) => {
    if (ring?.length === 2) {
      // a ring of two runs its lanes side by side in opposite directions: each lane's own direction is its flow
      const a = at(ord.anchor), z = at([...ord.stage].reduce((m, e) => (e[1] > m[1] ? e : m))[0])
      const L = Math.hypot(z.x - a.x, z.y - a.y) || 1, ux = (z.x - a.x) / L, uy = (z.y - a.y) / L
      return { flow: (p: Pt) => (p.x - a.x) * ux + (p.y - a.y) * uy, off: (p: Pt) => -(p.x - a.x) * uy + (p.y - a.y) * ux } as Frame
    }
    if (ring) {
      const a = at(ord.anchor)
      const ux = (a.x - center.x) / (Math.hypot(a.x - center.x, a.y - center.y) || 1), uy = (a.y - center.y) / (Math.hypot(a.x - center.x, a.y - center.y) || 1)
      return { flow: (p: Pt) => Math.hypot(p.x - center.x, p.y - center.y), off: (p: Pt) => -(p.x - center.x) * uy + (p.y - center.y) * ux } as Frame
    }
    const a = at(ord.anchor)
    return lanes.length >= 2
      ? { flow: (p: Pt) => p.y, off: (p: Pt) => p.x - a.x } as Frame
      : { flow: (p: Pt) => p.x, off: (p: Pt) => p.y - a.y } as Frame
  })
  if (ring) notes.push(`ring of ${ring.length} lanes: ${ring.length === 2 ? 'counterflow' : 'radial'} frame`)

  lanes.forEach(({ sp, ord }, li) => {
    const F = frames[li]
    const name = `lane@${ord.anchor}`
    const nodes = [...sp.places, ...sp.transitions].filter((n) => ord.stage.has(n))
    const byStage = new Map<number, NodeId[]>()
    for (const n of nodes) byStage.set(ord.stage.get(n)!, [...(byStage.get(ord.stage.get(n)!) ?? []), n])
    const a = at(ord.anchor)
    if (nodes.some((n) => n !== ord.anchor && F.flow(at(n)) < F.flow(a) - TOL)) failures.push(`R2 ${name}: a node comes before the anchor`)
    const stages = [...byStage.keys()].sort((x, y) => x - y)
    for (let i = 1; i < stages.length; i++) {
      const prev = Math.max(...byStage.get(stages[i - 1])!.map((n) => F.flow(at(n))))
      const cur = Math.min(...byStage.get(stages[i])!.map((n) => F.flow(at(n))))
      if (cur <= prev + TOL) { failures.push(`R3 ${name}: stage ${stages[i]} does not come after stage ${stages[i - 1]}`); break }
    }
    for (const k of stages) {
      const ns = byStage.get(k)!
      if (ns.length === 1) {
        if (!onTwoLanes(ns[0]) && Math.abs(F.off(at(ns[0]))) > TOL && unbranched(byStage)) { failures.push(`R1 ${name}: ${ns[0]} is off the lane's line`); break }
      } else if (Math.max(...ns.map((n) => F.flow(at(n)))) - Math.min(...ns.map((n) => F.flow(at(n)))) > TOL) {
        failures.push(`R10 ${name}: alternatives at stage ${k} are not on one row`); break
      }
    }
    for (const t of sp.transitions) {
      const n = at(t)
      if (n.kind !== 'transition' || onTwoLanes(t) || byStage.get(ord.stage.get(t) ?? -1)?.length !== 1) continue
      const dir = laneDirection(F, n)
      if (Math.abs(Math.cos(n.angle) * dir.x + Math.sin(n.angle) * dir.y) > 0.09) { failures.push(`R18 ${name}: bar ${t} does not cross its lane`); break }
    }
  })

  const level = new Map<number, { n: NodeId; f: number }[]>()
  lanes.forEach(({ ord }, li) => { for (const [n, k] of ord.stage) level.set(k, [...(level.get(k) ?? []), { n, f: frames[li].flow(at(n)) }]) })
  for (const [k, xs] of [...level].sort((a, b) => a[0] - b[0])) {
    const fs = xs.map((x) => x.f)
    if (Math.max(...fs) - Math.min(...fs) > TOL) { failures.push(`R3 stage ${k} is not level across lanes (${xs.map((x) => x.n).join(' ')})`); break }
  }

  for (const p of net.places) {
    const role = s.placeRole.get(p.id)!
    if (role.kind !== 'shared') continue
    if (role.spines.length === 2) {
      const [i, j] = role.spines
      const si = Math.sign(frames[i].off(at(p.id))), sj = Math.sign(frames[j].off(at(lanes[i].ord.anchor)))
      const between = ring && ring.length > 2
        ? angleBetween(at(p.id), at(lanes[i].ord.anchor), at(lanes[j].ord.anchor), center)
        : lanes.length >= 2 ? strictly(at(p.id).x, at(lanes[i].ord.anchor).x, at(lanes[j].ord.anchor).x, TOL) : si !== 0 && sj !== 0
      if (!between) failures.push(`R4 shared place ${p.id} is not between its lanes`)
    }
    if (ring && ring.length > 2) {
      const r = frames[0].flow(at(p.id))
      const takers = net.arcs.filter((a) => a.from === p.id).map((a) => frames[0].flow(at(a.to)))
      if (!(r < Math.min(...takers) && r > Math.max(...lanes.map((l) => frames[0].flow(at(l.ord.anchor)))))) failures.push(`R5 shared place ${p.id} is not just inside its takers`)
      continue
    }
    const F = frames[role.spines[0]]
    const ts = net.arcs.filter((a) => a.from === p.id || a.to === p.id).map((a) => (a.from === p.id ? a.to : a.from))
    const fs = ts.map((t) => F.flow(at(t)))
    const f = F.flow(at(p.id))
    const before = net.arcs.some((a) => a.to === p.id) ? NEAR : NEAR + ROW_ROOM
    if (f < Math.min(...fs) - TOL - before || f > Math.max(...fs) + TOL + NEAR) failures.push(`R4 shared place ${p.id} is not between its transitions along the flow`)
  }

  lanes.forEach(({ ord }, li) => {
    const F = frames[li]
    for (const r of ord.returnArcs) {
      const route = lay.arcs.find((a) => a.from === r.from && a.to === r.to)
      if (!route) continue
      const sharedSides = net.places.filter((p) => s.placeRole.get(p.id)!.kind === 'shared' && touches(net, p.id, ord))
        .map((p) => Math.sign(F.off(at(p.id)))).filter((x) => x !== 0)
      const pts = sampleBezier(route.path, 20).slice(3, -3)
      const side = Math.sign(avg(pts.map((q) => F.off(q))))
      if (sharedSides.length && sharedSides.every((x) => x === sharedSides[0]) && side === sharedSides[0]) failures.push(`R7 return into ${ord.anchor} runs on the shared side`)
      if (side !== 0 && pts.some((q) => F.off(q) * side < -TOL - 2)) failures.push(`R7 return into ${ord.anchor} cuts across its lane`)
    }
  })

  for (const { place, transition } of s.selfLoops) {
    const role = s.placeRole.get(place)!
    if (role.kind === 'spine' && (s.spineOfTransition.get(transition) ?? []).some((k) => k !== role.spine)) continue
    if (role.kind !== 'spine' && net.arcs.some((a) => (a.from === place && a.to !== transition) || (a.to === place && a.from !== transition))) continue
    const d = Math.hypot(at(place).x - at(transition).x, at(place).y - at(transition).y)
    if (d > 110) failures.push(`R13 self-loop ${place}/${transition} is ${Math.round(d)} apart`)
  }

  if (lanes.length === 0) notes.push('no lanes: fallback layout, only hygiene and R13 checked')
  return { failures, notes }
}

const unbranched = (byStage: Map<number, NodeId[]>) => [...byStage.values()].every((ns) => ns.length === 1)

function laneDirection(F: Frame, p: Pt): Pt {
  const e = 1
  const fx = F.flow({ x: p.x + e, y: p.y }) - F.flow(p), fy = F.flow({ x: p.x, y: p.y + e }) - F.flow(p)
  const L = Math.hypot(fx, fy) || 1
  return { x: fx / L, y: fy / L }
}

function strictly(v: number, a: number, b: number, tol: number) { return v > Math.min(a, b) + tol && v < Math.max(a, b) - tol }

function angleBetween(p: Pt, a: Pt, b: Pt, c: Pt) {
  const ang = (q: Pt) => Math.atan2(q.y - c.y, q.x - c.x)
  const norm = (x: number) => ((x % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
  const da = norm(ang(a) - ang(p)), db = norm(ang(b) - ang(p))
  return da * db < 0 && Math.abs(da) + Math.abs(db) < Math.PI
}

function touches(net: Net, p: NodeId, ord: { stage: Map<NodeId, number> }) {
  return net.arcs.some((a) => (a.from === p && ord.stage.has(a.to)) || (a.to === p && ord.stage.has(a.from)))
}

const centroid = (ps: Pt[]) => ({ x: avg(ps.map((p) => p.x)), y: avg(ps.map((p) => p.y)) })
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
