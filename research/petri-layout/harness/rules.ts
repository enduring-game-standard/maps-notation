import type { Net, NodeId } from '../engine/net.ts'
import type { Layout, Pt } from '../engine/layout.ts'
import { analyze, laneOrders, laneRing, type Structure } from '../engine/structure.ts'
import { sampleBezier } from '../engine/geometry.ts'

// One assertion per rule in RULES.md, stated on the structure vocabulary. Each failure names its rule.
// A frame says, for one lane, how far along the flow a point is and how far off the lane's line it is.
type Frame = { flow: (p: Pt) => number; off: (p: Pt) => number }

export function ruleChecks(net: Net, lay: Layout, TOL = 2): { failures: string[]; notes: string[] } {
  const failures: string[] = []
  const notes: string[] = []
  const s = analyze(net)
  const ords = laneOrders(net, s)
  const lanes = s.spines.map((sp, i) => ({ sp, ord: ords[i] }))
  const at = (id: NodeId) => lay.nodes[id]
  const onTwoLanes = (t: NodeId) => (s.spineOfTransition.get(t)?.length ?? 0) > 1

  if (isLoneCycle(net, s)) {
    const ids = [...net.places, ...net.transitions].map((n) => n.id)
    const c = { x: avg(ids.map((i) => at(i).x)), y: avg(ids.map((i) => at(i).y)) }
    const ds = ids.map((i) => Math.hypot(at(i).x - c.x, at(i).y - c.y))
    if (Math.max(...ds) - Math.min(...ds) > 0.15 * avg(ds)) failures.push('R15 a lone cycle is not drawn as a ring')
    return { failures, notes }
  }

  // R3 and R5: one flow direction. A ring of identical lanes runs outward from a center; otherwise lanes run down
  // when there are two or more, right when there is one.
  const ring = laneRing(net, s)
  const center = ring ? centroid(lanes.map((l) => at(l.ord.anchor))) : { x: 0, y: 0 }
  const frames = lanes.map(({ ord }) => {
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
  if (ring) notes.push(`ring of ${ring.length} lanes: radial frame`)

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
    // R1: a stage holding one node sits on the lane's line, except a bar the lane shares with another lane (R11);
    // R10: a stage holding several (a choice's branches) is one row
    for (const k of stages) {
      const ns = byStage.get(k)!
      if (ns.length === 1) {
        if (!onTwoLanes(ns[0]) && Math.abs(F.off(at(ns[0]))) > TOL && unbranched(byStage)) { failures.push(`R1 ${name}: ${ns[0]} is off the lane's line`); break }
      } else if (Math.max(...ns.map((n) => F.flow(at(n)))) - Math.min(...ns.map((n) => F.flow(at(n)))) > TOL) {
        failures.push(`R10 ${name}: alternatives at stage ${k} are not on one row`); break
      }
    }
    // R18: a bar on the lane crosses it
    for (const t of sp.transitions) {
      const n = at(t)
      if (n.kind !== 'transition' || onTwoLanes(t) || byStage.get(ord.stage.get(t) ?? -1)?.length !== 1) continue
      const dir = laneDirection(F, n)
      if (Math.abs(Math.cos(n.angle) * dir.x + Math.sin(n.angle) * dir.y) > 0.09) { failures.push(`R18 ${name}: bar ${t} does not cross its lane`); break }
    }
  })

  // R3, C10: lane nodes at one stage are level, across every lane
  const level = new Map<number, { n: NodeId; f: number }[]>()
  lanes.forEach(({ ord }, li) => { for (const [n, k] of ord.stage) level.set(k, [...(level.get(k) ?? []), { n, f: frames[li].flow(at(n)) }]) })
  for (const [k, xs] of [...level].sort((a, b) => a[0] - b[0])) {
    const fs = xs.map((x) => x.f)
    if (Math.max(...fs) - Math.min(...fs) > TOL) { failures.push(`R3 stage ${k} is not level across lanes (${xs.map((x) => x.n).join(' ')})`); break }
  }

  // R4: a place shared by two lanes sits between them, and between its transitions along the flow
  for (const p of net.places) {
    const role = s.placeRole.get(p.id)!
    if (role.kind !== 'shared') continue
    if (role.spines.length === 2) {
      const [i, j] = role.spines
      const si = Math.sign(frames[i].off(at(p.id))), sj = Math.sign(frames[j].off(at(lanes[i].ord.anchor)))
      const between = ring
        ? angleBetween(at(p.id), at(lanes[i].ord.anchor), at(lanes[j].ord.anchor), center)
        : lanes.length >= 2 ? strictly(at(p.id).x, at(lanes[i].ord.anchor).x, at(lanes[j].ord.anchor).x, TOL) : si !== 0 && sj !== 0
      if (!between) failures.push(`R4 shared place ${p.id} is not between its lanes`)
    }
    if (ring) {
      // R5: on a wheel, a shared place sits just inside the bars that take it, outside the anchors
      const r = frames[0].flow(at(p.id))
      const takers = net.arcs.filter((a) => a.from === p.id).map((a) => frames[0].flow(at(a.to)))
      if (!(r < Math.min(...takers) && r > Math.max(...lanes.map((l) => frames[0].flow(at(l.ord.anchor)))))) failures.push(`R5 shared place ${p.id} is not just inside its takers`)
      continue
    }
    const F = frames[role.spines[0]]
    const ts = net.arcs.filter((a) => a.from === p.id || a.to === p.id).map((a) => (a.from === p.id ? a.to : a.from))
    const fs = ts.map((t) => F.flow(at(t)))
    const f = F.flow(at(p.id))
    // a common start (nothing refills it) may sit a row before the bars that take from it
    const before = net.arcs.some((a) => a.to === p.id) ? 30 : 90
    if (f < Math.min(...fs) - TOL - before || f > Math.max(...fs) + TOL + 30) failures.push(`R4 shared place ${p.id} is not between its transitions along the flow`)
  }

  // R7: a return arc runs on one side of its lane, the side away from its shared places when they are all on one side
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

  // R13: self-loop partners sit tight, unless the loop couples two lanes (a lane's state read by another lane's step)
  for (const { place, transition } of s.selfLoops) {
    const role = s.placeRole.get(place)!
    if (role.kind === 'spine' && (s.spineOfTransition.get(transition) ?? []).some((k) => k !== role.spine)) continue
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

function isLoneCycle(net: Net, s: Structure) {
  if (s.spines.length !== 1 || s.spines[0].open) return false
  const sp = s.spines[0]
  return sp.places.length === net.places.length && sp.transitions.length === net.transitions.length
    && sp.places.length >= 2 && sp.transitions.every((t) => s.pre.get(t)!.size === 1 && s.post.get(t)!.size === 1)
}

const centroid = (ps: Pt[]) => ({ x: avg(ps.map((p) => p.x)), y: avg(ps.map((p) => p.y)) })
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
