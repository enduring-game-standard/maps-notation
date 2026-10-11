import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Arc, Net } from '../core/model'
import { parse, print } from '../core/text'
import { autoRoute, moveNodes, moveSegment } from './edit'
import { chanceTies, shapesOf, type Pt, type Shape } from './geometry'
import { arcKey, cableJunctions, cableKey, priorFor, routeArcs } from './route'

const load = (name: string) => parse(readFileSync(new URL(`../../../examples/${name}.maps`, import.meta.url), 'utf8'))
const route = (net: Net) => {
  const shapes = shapesOf(net, chanceTies(net))
  return { shapes, routes: routeArcs(net, shapes) }
}

const inside = (s: Shape, p: Pt) =>
  s.kind === 'circle' ? Math.hypot(p.x - s.x, p.y - s.y) < s.r - 1 : Math.abs(p.x - s.x) < s.w / 2 - 1 && Math.abs(p.y - s.y) < s.h / 2 - 1

const samples = (pts: Pt[]) =>
  pts.slice(1).flatMap((q, i) => {
    const p = pts[i]
    const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 2))
    return Array.from({ length: n + 1 }, (_, k) => ({ x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n }))
  })

const nodesHit = (net: Net, shapes: Map<string, Shape>, routes: Map<string, Pt[]>) =>
  net.arcs.flatMap((a) => {
    const pts = samples(routes.get(arcKey(a))!)
    return [...shapes].filter(([, s]) => pts.some((p) => inside(s, p))).map(([id]) => `${arcKey(a)} through ${id}`)
  })

const overlaps = (net: Net, routes: Map<string, Pt[]>) => {
  const segs = net.arcs.flatMap((a) => {
    const pts = routes.get(arcKey(a))!
    return pts.slice(1).map((q, i) => ({ cable: cableKey(a), p: pts[i], q }))
  })
  const found: string[] = []
  for (const s of segs)
    for (const t of segs) {
      if (s.cable >= t.cable) continue
      const h = s.p.y === s.q.y && t.p.y === t.q.y && s.p.y === t.p.y
      const v = s.p.x === s.q.x && t.p.x === t.q.x && s.p.x === t.p.x
      if (!h && !v) continue
      const along = h ? (p: Pt) => p.x : (p: Pt) => p.y
      const lo = Math.max(Math.min(along(s.p), along(s.q)), Math.min(along(t.p), along(t.q)))
      const hi = Math.min(Math.max(along(s.p), along(s.q)), Math.max(along(t.p), along(t.q)))
      if (hi - lo > 1) found.push(`${s.cable} on ${t.cable}`)
    }
  return found
}

const passesInOrder = (pts: Pt[], via: Pt[]) => {
  const ss = samples(pts)
  let k = 0
  for (const v of via) {
    while (k < ss.length && Math.hypot(ss[k].x - v.x, ss[k].y - v.y) > 0.5) k++
    if (k === ss.length) return false
  }
  return true
}

describe('routing arcs', () => {
  for (const name of ['tic-tac-toe', 'call-the-coin']) {
    it(`${name}: no arc runs through a node, and every arc starts on its state and ends on its verb`, () => {
      const net = load(name)
      const { shapes, routes } = route(net)
      expect(nodesHit(net, shapes, routes)).toEqual([])
      for (const a of net.arcs) {
        const pts = routes.get(arcKey(a))!
        const s = shapes.get(a.state) as Extract<Shape, { kind: 'circle' }>
        const v = shapes.get(a.verb) as Extract<Shape, { kind: 'rect' }>
        expect(Math.hypot(pts[0].x - s.x, pts[0].y - s.y)).toBeCloseTo(s.r + 2, 0)
        const end = pts[pts.length - 1]
        expect(Math.abs(Math.abs(end.x - v.x) - (v.w / 2 + 2)) < 0.5 || Math.abs(Math.abs(end.y - v.y) - (v.h / 2 + 2)) < 0.5).toBe(true)
      }
    })

    it(`${name}: different cables never run on top of each other`, () => {
      const net = load(name)
      expect(overlaps(net, route(net).routes)).toEqual([])
    })
  }

  it('is deterministic', () => {
    const net = load('tic-tac-toe')
    const once = JSON.stringify([...route(net).routes])
    expect(JSON.stringify([...route(load('tic-tac-toe')).routes])).toBe(once)
  })

  it('arcs leaving one state with one kind share a trunk that branches at junctions', () => {
    const net = load('tic-tac-toe')
    const { routes } = route(net)
    const feeds = net.arcs.filter((a) => a.state === 'x_to_move' && a.kind === 'take').map((a) => routes.get(arcKey(a))!)
    expect(feeds).toHaveLength(9)
    expect(new Set(feeds.map((p) => `${p[0].x},${p[0].y}`)).size).toBe(1)
    const dots = cableJunctions(net, routes).filter((j) => j.arcs.some((k) => k.startsWith('take|x_to_move|')))
    expect(dots.length).toBeGreaterThanOrEqual(2)
  })

  it('an arc with via passes through every via point in order, and other cables stay off it', () => {
    const net = load('call-the-coin')
    const via = [
      { x: 160, y: 60 },
      { x: 300, y: 60 },
    ]
    const arcs: Arc[] = net.arcs.map((a) => (a.kind === 'take' && a.state === 'coin' && a.verb === 'flip_heads' ? { ...a, via } : a))
    const placed = { ...net, arcs }
    const { shapes, routes } = route(placed)
    expect(passesInOrder(routes.get('take|coin|flip_heads')!, via)).toBe(true)
    expect(nodesHit(placed, shapes, routes)).toEqual([])
    expect(overlaps(placed, routes)).toEqual([])
  })

  it('via survives printing and parsing', () => {
    const net = load('call-the-coin')
    const placed = { ...net, arcs: net.arcs.map((a, i) => (i === 0 ? { ...a, via: [{ x: 160, y: 60 }] } : a)) }
    expect(parse(print(placed)).arcs[0].via).toEqual([{ x: 160, y: 60 }])
  })

  it('rerouting after a drag keeps untouched cables in place and still avoids every node', () => {
    const net = load('tic-tac-toe')
    const before = route(net)
    const moved = moveNodes(net, new Map([['x_5', { x: 505, y: 450 }]]), 40, 60, true)
    const shapes = shapesOf(moved, chanceTies(moved))
    const routes = routeArcs(moved, shapes, priorFor({ net, ...before }, moved, shapes))
    expect(nodesHit(moved, shapes, routes)).toEqual([])
    expect(overlaps(moved, routes)).toEqual([])
    expect(routes.get('take|x_to_move|x_marks_1')).toEqual(before.routes.get('take|x_to_move|x_marks_1'))
    expect(routes.get('need|x_5|x_line_456')).not.toEqual(before.routes.get('need|x_5|x_line_456'))
  })
})

describe('placing routes by hand', () => {
  it('dragging a shared trunk moves it for every arc on it, and routing all automatically undoes that', () => {
    const net = load('tic-tac-toe')
    const { shapes, routes } = route(net)
    const ref = { kind: 'arc' as const, state: 'x_to_move', verb: 'x_marks_9', arcKind: 'take' as const }
    const pts = routes.get('take|x_to_move|x_marks_9')!
    const seg = pts.findIndex((p, i) => i > 0 && i + 1 < pts.length - 1 && p.x === pts[i + 1].x)
    expect(seg).toBeGreaterThan(0)
    const x = pts[seg].x
    const [lo, hi] = [Math.min(pts[seg].y, pts[seg + 1].y), Math.max(pts[seg].y, pts[seg + 1].y)]
    const runsAlong = (r: Pt[]) => r.some((p, i) => i + 1 < r.length && p.x === x && r[i + 1].x === x && Math.min(Math.max(p.y, r[i + 1].y), hi) - Math.max(Math.min(p.y, r[i + 1].y), lo) > 1)
    const sharing = net.arcs.filter((a) => a.state === 'x_to_move' && a.kind === 'take' && runsAlong(routes.get(arcKey(a))!))
    expect(sharing.length).toBeGreaterThan(1)

    const dragged = moveSegment(net, routes, shapes, ref, seg, { x: -20, y: 3 })
    const placed = dragged.arcs.filter((a) => a.via)
    expect(placed.map(arcKey).sort()).toEqual(sharing.map(arcKey).sort())
    const after = route(dragged)
    for (const a of placed) {
      expect(passesInOrder(after.routes.get(arcKey(a))!, a.via!)).toBe(true)
      expect(after.routes.get(arcKey(a))!.some((p) => p.x === x - 20)).toBe(true)
    }
    expect(nodesHit(dragged, after.shapes, after.routes)).toEqual([])
    expect(parse(print(dragged)).arcs.filter((a) => a.via)).toHaveLength(placed.length)

    expect(autoRoute(dragged).arcs.some((a) => a.via)).toBe(false)
    expect(autoRoute(dragged, [ref]).arcs.filter((a) => a.via)).toHaveLength(placed.length - 1)
  })
})
