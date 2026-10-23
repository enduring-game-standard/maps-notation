import type { NodeId } from '../../engine/net.ts'
import { laneOrders } from '../../engine/structure.ts'
import { arcKey, mean, type FC, type Graph, type Hint, type Plan, type Side } from './model.ts'

const HOP = 72 // one arc on the page

// C12, R15: a net with no actors to line up (no lanes, or one cycle with things hung on it) is drawn as its shape.
// Its main cycle is a ring in firing order, the anchor on the left; everything else sits as far from each node as it
// is in the net, so a loop looks like a loop and a hub sits among what it serves (2.9, 4.15, 4.23, 4.27).
export function shapePlan(g: Graph): Plan {
  const { net, s } = g
  const ids = [...net.places, ...net.transitions].map((n) => n.id).sort(g.byKey)
  const ring = s.spines.length === 1 ? laneRing(g) : longestCycle(g, ids)
  const d = hops(g, ids)

  const pos = new Map<NodeId, { x: number; y: number }>()
  const r = Math.max(HOP, (ring.length * HOP) / (2 * Math.PI))
  ring.forEach((n, k) => { const th = Math.PI + (2 * Math.PI * k) / ring.length; pos.set(n, { x: r * Math.cos(th), y: r * Math.sin(th) }) })
  // the rest enters next to what it touches, outside the ring, in a fixed order
  for (let left = ids.filter((n) => !pos.has(n)); left.length;) {
    const n = left.find((m) => g.nbrs.get(m)!.some((x) => pos.has(x))) ?? left[0]
    const near = g.nbrs.get(n)!.filter((x) => pos.has(x)).map((x) => pos.get(x)!)
    const c = near.length ? { x: mean(near.map((p) => p.x)), y: mean(near.map((p) => p.y)) } : { x: 0, y: r + HOP }
    const out = Math.hypot(c.x, c.y) > 1 ? { x: c.x / Math.hypot(c.x, c.y), y: c.y / Math.hypot(c.x, c.y) } : { x: 0, y: 1 }
    const k = [...pos.values()].filter((p) => Math.hypot(p.x - c.x, p.y - c.y) < HOP).length
    pos.set(n, { x: c.x + out.x * HOP * (1 + 0.3 * k), y: c.y + out.y * HOP * (1 + 0.3 * k) })
    left = left.filter((m) => m !== n)
  }

  // stress majorization: page distance follows net distance, near pairs weighted most; the ring stays a regular polygon
  const pinned = new Set(ring)
  for (let it = 0; it < 300; it++) {
    const next = new Map<NodeId, { x: number; y: number }>()
    for (const i of ids) {
      let sx = 0, sy = 0, sw = 0
      const pi = pos.get(i)!
      for (const j of ids) {
        if (i === j || !Number.isFinite(d.get(i)!.get(j)!)) continue
        const want = d.get(i)!.get(j)! * HOP, w = 1 / (want * want)
        const pj = pos.get(j)!
        const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y) || 1e-6
        sx += w * (pj.x + (want * (pi.x - pj.x)) / dist); sy += w * (pj.y + (want * (pi.y - pj.y)) / dist); sw += w
      }
      next.set(i, sw ? { x: sx / sw, y: sy / sw } : pi)
    }
    for (const [i, p] of next) if (!pinned.has(i)) pos.set(i, p)
  }

  // nodes the net cannot tell apart land on one spot; part them, each pair along a fixed direction
  for (let it = 0; it < 60; it++) {
    let moved = false
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      if (pinned.has(ids[i]) && pinned.has(ids[j])) continue
      const a = pos.get(ids[i])!, b = pos.get(ids[j])!
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy)
      // a bar is long: anything beside it keeps a full hop away
      const min = g.isPlace(ids[i]) && g.isPlace(ids[j]) ? HOP * 0.75 : HOP
      if (L >= min) continue
      const ux = L > 1e-3 ? dx / L : Math.cos(j), uy = L > 1e-3 ? dy / L : Math.sin(j)
      const push = (min - L) / 2
      const ka = pinned.has(ids[i]) ? 0 : pinned.has(ids[j]) ? 2 : 1, kb = 2 - ka
      a.x -= ux * push * ka; a.y -= uy * push * ka; b.x += ux * push * kb; b.y += uy * push * kb
      moved = true
    }
    if (!moved) break
  }

  // R2: the anchor (the ring's first node) on the left
  const a = pos.get(ring[0])!, c0 = { x: mean([...pos.values()].map((p) => p.x)), y: mean([...pos.values()].map((p) => p.y)) }
  const turn = Math.PI - Math.atan2(a.y - c0.y, a.x - c0.x)
  const rot = (p: { x: number; y: number }) => ({ x: (p.x - c0.x) * Math.cos(turn) - (p.y - c0.y) * Math.sin(turn), y: (p.x - c0.x) * Math.sin(turn) + (p.y - c0.y) * Math.cos(turn) })
  let place = new Map([...pos].map(([n, p]) => [n, rot(p)]))
  // the ring runs clockwise on the page (y down)
  if (ring.length >= 3 && orientation(ring.map((n) => place.get(n)!)) < 0) place = new Map([...place].map(([n, p]) => [n, { x: p.x, y: -p.y }]))

  const out = new Map<NodeId, FC>([...place].map(([n, p]) => [n, { f: p.x, c: p.y }]))
  const bar: Plan['bar'] = new Map(), hints = new Map<string, Hint>(), labelSide = new Map<NodeId, Side>()
  for (const t of net.transitions) {
    // R18: a bar crosses the way its tokens travel, from its inputs toward its outputs
    const p = place.get(t.id)!
    const ins = g.ins.get(t.id)!.filter((x) => !g.outs.get(t.id)!.includes(x)).map((x) => place.get(x)!)
    const outs = g.outs.get(t.id)!.filter((x) => !g.ins.get(t.id)!.includes(x)).map((x) => place.get(x)!)
    const from = ins.length ? { x: mean(ins.map((q) => q.x)), y: mean(ins.map((q) => q.y)) } : p
    const to = outs.length ? { x: mean(outs.map((q) => q.x)), y: mean(outs.map((q) => q.y)) } : p
    const dir = Math.hypot(to.x - from.x, to.y - from.y) > 1 ? Math.atan2(to.y - from.y, to.x - from.x) : 0
    bar.set(t.id, { angle: dir + Math.PI / 2 })
  }
  for (const n of ids) labelSide.set(n, 1)
  for (const x of net.arcs) {
    const loop = g.outs.get(x.to)!.includes(x.from)
    hints.set(arcKey(x.from, x.to), loop ? { kind: 'loop' } : { kind: 'free', prefer: 1, hook: false })
  }
  // labels go away from the drawing's center
  const labelDir = new Map([...place].map(([n, p]) => { const L = Math.hypot(p.x, p.y); return [n, L > 1 ? { x: p.x / L, y: p.y / L } : { x: 0, y: 1 }] }))
  return { frame: 'right', pos: out, bar, barSpan: new Map(), hints, labelSide, labelDir }
}

function laneRing(g: Graph): NodeId[] {
  const ord = laneOrders(g.net, g.s)[0]
  const P = new Set(g.s.spines[0].places)
  // a bar that only reads a ring place hangs off the ring
  const reads = (t: NodeId) => [...g.s.pre.get(t)!.keys()].filter((p) => P.has(p)).every((p) => g.s.post.get(t)!.has(p))
  return [...ord.stage].filter(([n]) => g.isPlace(n) || !reads(n)).sort((a, b) => a[1] - b[1] || g.byKey(a[0], b[0])).map(([n]) => n)
}

// the longest directed cycle, ignoring self-loops; it starts at its most marked place
function longestCycle(g: Graph, ids: NodeId[]): NodeId[] {
  let best: NodeId[] = []
  let steps = 0
  const path: NodeId[] = [], on = new Set<NodeId>()
  const walk = (start: NodeId, n: NodeId) => {
    if (++steps > 200000) return
    for (const m of g.outs.get(n)!) {
      if (g.outs.get(m)!.includes(n) && g.ins.get(m)!.includes(n) && path.length === 1) continue
      if (m === start && path.length > best.length && path.length > 2) best = path.slice()
      if (on.has(m) || g.byKey(m, start) < 0) continue
      path.push(m); on.add(m); walk(start, m); path.pop(); on.delete(m)
    }
  }
  for (const s of ids) { path.push(s); on.add(s); walk(s, s); path.pop(); on.delete(s) }
  if (!best.length) return ids.filter((n) => g.isPlace(n)).slice(0, 1)
  const k = best.reduce((bi, n, i) => ((g.tokens.get(n) ?? 0) > (g.tokens.get(best[bi]) ?? 0) ? i : bi), 0)
  return [...best.slice(k), ...best.slice(0, k)]
}

function hops(g: Graph, ids: NodeId[]): Map<NodeId, Map<NodeId, number>> {
  const out = new Map<NodeId, Map<NodeId, number>>()
  for (const s of ids) {
    const dist = new Map<NodeId, number>(ids.map((n) => [n, Infinity]))
    dist.set(s, 0)
    const q = [s]
    for (let i = 0; i < q.length; i++) for (const m of g.nbrs.get(q[i])!) if (dist.get(m) === Infinity) { dist.set(m, dist.get(q[i])! + 1); q.push(m) }
    out.set(s, dist)
  }
  return out
}

function orientation(ps: { x: number; y: number }[]) {
  let a = 0
  for (let i = 0; i < ps.length; i++) { const p = ps[i], q = ps[(i + 1) % ps.length]; a += p.x * q.y - q.x * p.y }
  return a
}
