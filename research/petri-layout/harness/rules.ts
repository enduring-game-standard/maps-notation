import type { Net, NodeId } from '../engine/net.ts'
import type { Layout, Pt } from '../engine/layout.ts'
import { analyze, laneOrder, type Structure } from '../engine/structure.ts'
import { sampleBezier } from '../engine/geometry.ts'

// One assertion per rule in RULES.md, stated on the structure vocabulary. Each failure names its rule.
export function ruleChecks(net: Net, lay: Layout, TOL = 2): { failures: string[]; notes: string[] } {
  const failures: string[] = []
  const notes: string[] = []
  const s = analyze(net)
  const lanes = s.spines.map((sp) => ({ sp, ord: laneOrder(net, s, sp) }))
  const at = (id: NodeId) => lay.nodes[id]


  // flow direction: down with two or more lanes, right with one or none (R3)
  const down = lanes.length >= 2
  const flow = (p: Pt) => (down ? p.y : p.x)
  const cross = (p: Pt) => (down ? p.x : p.y)

  const ringNet = isLoneCycle(net, s)
  if (ringNet) {
    const ids = [...net.places, ...net.transitions].map((n) => n.id)
    const c = { x: avg(ids.map((i) => at(i).x)), y: avg(ids.map((i) => at(i).y)) }
    const ds = s.spines[0].places.concat(s.spines[0].transitions).map((i) => Math.hypot(at(i).x - c.x, at(i).y - c.y))
    if (Math.max(...ds) - Math.min(...ds) > 0.15 * avg(ds)) failures.push('R15 a lone cycle is not drawn as a ring')
    return { failures, notes }
  }

  for (const { sp, ord } of lanes) {
    const name = `lane@${ord.anchor}`
    const nodes = [...sp.places, ...sp.transitions].filter((n) => ord.stage.has(n))
    const byStage = new Map<number, NodeId[]>()
    for (const n of nodes) byStage.set(ord.stage.get(n)!, [...(byStage.get(ord.stage.get(n)!) ?? []), n])
    const a = at(ord.anchor)
    // R2: anchor first
    if (nodes.some((n) => n !== ord.anchor && flow(at(n)) < flow(a) - TOL)) failures.push(`R2 ${name}: a node comes before the anchor`)
    // R1, R3: flow advances with stage
    const stages = [...byStage.keys()].sort((x, y) => x - y)
    for (let i = 1; i < stages.length; i++) {
      const prev = Math.max(...byStage.get(stages[i - 1])!.map((n) => flow(at(n))))
      const cur = Math.min(...byStage.get(stages[i])!.map((n) => flow(at(n))))
      if (cur <= prev + TOL) { failures.push(`R3 ${name}: stage ${stages[i]} does not come after stage ${stages[i - 1]}`); break }
    }
    // R1: a stage with one node sits on the lane's line; R10: alternatives share a cross-row
    const unbranched = stages.every((k) => byStage.get(k)!.length === 1)
    if (unbranched) {
      if (nodes.some((n) => Math.abs(cross(at(n)) - cross(a)) > TOL)) failures.push(`R1 ${name}: not one straight line`)
    } else {
      for (const k of stages) {
        const ns = byStage.get(k)!
        if (ns.length > 1 && Math.max(...ns.map((n) => flow(at(n)))) - Math.min(...ns.map((n) => flow(at(n)))) > TOL) {
          failures.push(`R10 ${name}: alternatives at stage ${k} are not on one row`); break
        }
      }
    }
    // R18: bars on the lane cross it
    for (const t of sp.transitions) {
      const n = at(t)
      if (n.kind !== 'transition' || byStage.get(ord.stage.get(t) ?? -1)?.length !== 1) continue
      const want = down ? 0 : Math.PI / 2
      if (Math.abs(Math.sin(n.angle - want)) > 0.09) { failures.push(`R18 ${name}: bar ${t} does not cross its lane`); break }
    }
  }

  // R3: peers of equal length align stage against stage
  for (let i = 0; i < lanes.length; i++) for (let j = i + 1; j < lanes.length; j++) {
    const A = lanes[i], B = lanes[j]
    if (A.ord.stage.size !== B.ord.stage.size || A.sp.open !== B.sp.open) continue
    const firstA = new Map<number, number>(), firstB = new Map<number, number>()
    for (const [n, k] of A.ord.stage) firstA.set(k, flow(at(n)))
    for (const [n, k] of B.ord.stage) firstB.set(k, flow(at(n)))
    for (const [k, v] of firstA) if (firstB.has(k) && Math.abs(firstB.get(k)! - v) > TOL) {
      failures.push(`R3 lanes @${A.ord.anchor} and @${B.ord.anchor}: stage ${k} not level`); break
    }
  }

  // R4: a shared place sits between its lanes, and between its transitions along the flow
  for (const p of net.places) {
    const role = s.placeRole.get(p.id)!
    if (role.kind !== 'shared') continue
    const lineX = role.spines.map((k) => cross(at(lanes[k].ord.anchor)))
    const c = cross(at(p.id))
    if (lineX.length === 2 && !(c > Math.min(...lineX) + TOL && c < Math.max(...lineX) - TOL)) failures.push(`R4 shared place ${p.id} is not between its lanes`)
    const ts = net.arcs.filter((a) => a.from === p.id || a.to === p.id).map((a) => (a.from === p.id ? a.to : a.from))
    const fs = ts.map((t) => flow(at(t)))
    const f = flow(at(p.id))
    if (f < Math.min(...fs) - TOL || f > Math.max(...fs) + TOL) failures.push(`R4 shared place ${p.id} is not between its transitions along the flow`)
  }

  // R7: a return arc runs outside its lane, on the side away from its shared places
  for (const { ord } of lanes) {
    for (const r of ord.returnArcs) {
      const route = lay.arcs.find((a) => a.from === r.from && a.to === r.to)
      if (!route) continue
      const line = cross(at(ord.anchor))
      const sharedSides = net.places.filter((p) => s.placeRole.get(p.id)!.kind === 'shared' && touches(net, p.id, ord))
        .map((p) => Math.sign(cross(at(p.id)) - line)).filter((x) => x !== 0)
      const pts = sampleBezier(route.path, 20).slice(3, -3)
      const side = Math.sign(avg(pts.map((q) => cross(q) - line)))
      if (sharedSides.length && sharedSides.every((x) => x === sharedSides[0]) && side === sharedSides[0]) failures.push(`R7 return into ${ord.anchor} runs on the shared side`)
      if (side !== 0 && pts.some((q) => (cross(q) - line) * side < -TOL - 2)) failures.push(`R7 return into ${ord.anchor} cuts across its lane`)
    }
  }

  // R13: self-loop partners sit tight
  for (const { place, transition } of s.selfLoops) {
    const d = Math.hypot(at(place).x - at(transition).x, at(place).y - at(transition).y)
    if (d > 110) failures.push(`R13 self-loop ${place}/${transition} is ${Math.round(d)} apart`)
  }

  if (lanes.length === 0) notes.push('no lanes: fallback layout, only hygiene and R13 checked')
  return { failures, notes }
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

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
