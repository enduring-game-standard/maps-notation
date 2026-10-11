import { readFileSync } from 'node:fs'
import type { Arc, Net } from '../src/core/model'
import { parse } from '../src/core/text'
import { STATE_R, arcCurve, chanceTies, pointAt, shapesOf, type Pt, type Shape } from '../src/ui/geometry'

type Router = (net: Net, shapes: Map<string, Shape>) => Map<string, Pt[]>

const key = (a: Arc) => `${a.kind}|${a.state}|${a.verb}`
const cable = (a: Arc) => `${a.state}|${a.kind}`

const curves: Router = (net, shapes) =>
  new Map(
    net.arcs.flatMap((a) => {
      const c = arcCurve(a, shapes)
      return c ? [[key(a), Array.from({ length: 25 }, (_, i) => pointAt(c, i / 24))] as [string, Pt[]]] : []
    }),
  )

const inside = (s: Shape, p: Pt) =>
  s.kind === 'circle' ? Math.hypot(p.x - s.x, p.y - s.y) < s.r - 1 : Math.abs(p.x - s.x) < s.w / 2 - 1 && Math.abs(p.y - s.y) < s.h / 2 - 1

const segs = (pts: Pt[]) => pts.slice(1).map((b, i) => [pts[i], b] as const)

const cross = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0
}

const measure = (net: Net, route: Router) => {
  const shapes = shapesOf(net, chanceTies(net))
  const labels: Shape[] = net.states.map((s) => ({ kind: 'rect', x: s.x, y: s.y + STATE_R + 7, w: s.label.length * 5.4, h: 11 }))
  const times: number[] = []
  let routes = route(net, shapes)
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now()
    routes = route(net, shapes)
    times.push(performance.now() - t0)
  }
  const arcs = net.arcs.filter((a) => routes.has(key(a)))
  let intrusions = 0
  let labelHits = 0
  let bends = 0
  let diagonal = 0
  let ink = 0
  const axis = new Map<string, [number, number][]>()
  for (const a of arcs) {
    const pts = routes.get(key(a))!
    const hit = new Set<string>()
    let label = false
    for (const [p, q] of segs(pts)) {
      const len = Math.hypot(q.x - p.x, q.y - p.y)
      for (let t = 0; t <= len; t += 2) {
        const s = { x: p.x + ((q.x - p.x) * t) / (len || 1), y: p.y + ((q.y - p.y) * t) / (len || 1) }
        for (const [id, sh] of shapes) if (inside(sh, s)) hit.add(id)
        if (labels.some((l) => inside(l, s))) label = true
      }
      if (p.x !== q.x && p.y !== q.y) {
        diagonal++
        ink += len
      } else if (len > 0) {
        const k = p.x === q.x ? `v${p.x}` : `h${p.y}`
        const [lo, hi] = p.x === q.x ? [Math.min(p.y, q.y), Math.max(p.y, q.y)] : [Math.min(p.x, q.x), Math.max(p.x, q.x)]
        axis.set(k, [...(axis.get(k) ?? []), [lo, hi]])
      }
    }
    intrusions += hit.size
    if (label) labelHits++
    for (let i = 1; i < pts.length - 1; i++) {
      const d1 = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y }
      const d2 = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y }
      if (Math.abs(d1.x * d2.y - d1.y * d2.x) > 1e-6 * (Math.hypot(d1.x, d1.y) * Math.hypot(d2.x, d2.y))) bends++
    }
  }
  for (const spans of axis.values()) {
    spans.sort((a, b) => a[0] - b[0])
    let [lo, hi] = spans[0]
    for (const [a, b] of spans.slice(1)) {
      if (a > hi) {
        ink += hi - lo
        ;[lo, hi] = [a, b]
      } else hi = Math.max(hi, b)
    }
    ink += hi - lo
  }
  let crossings = 0
  let overlap = 0
  let crowded = 0
  for (let i = 0; i < arcs.length; i++)
    for (let j = i + 1; j < arcs.length; j++) {
      if (cable(arcs[i]) === cable(arcs[j])) continue
      for (const [a, b] of segs(routes.get(key(arcs[i]))!))
        for (const [c, d] of segs(routes.get(key(arcs[j]))!)) {
          if (cross(a, b, c, d)) crossings++
          const h1 = a.y === b.y && a.x !== b.x
          const h2 = c.y === d.y && c.x !== d.x
          const v1 = a.x === b.x && a.y !== b.y
          const v2 = c.x === d.x && c.y !== d.y
          if ((h1 && h2) || (v1 && v2)) {
            const along = h1 ? (p: Pt) => p.x : (p: Pt) => p.y
            const off = h1 ? Math.abs(a.y - c.y) : Math.abs(a.x - c.x)
            const span = Math.min(Math.max(along(a), along(b)), Math.max(along(c), along(d))) - Math.max(Math.min(along(a), along(b)), Math.min(along(c), along(d)))
            if (span > 2 && off < 0.5) overlap += span
            else if (span > 2 && off < 5) crowded += span
          }
        }
    }
  times.sort((a, b) => a - b)
  return {
    arcs: `${arcs.length}/${net.arcs.length}`,
    'node intrusions': intrusions,
    'arcs over a label': labelHits,
    crossings,
    'overlap px (different cables)': Math.round(overlap),
    'crowded px (<5px apart)': Math.round(crowded),
    'ink px': Math.round(ink),
    bends,
    'diagonal segments': diagonal,
    'route ms (median of 5)': +times[2].toFixed(1),
  }
}

const which = process.argv[2] ?? 'route'
const router: Router = which === 'curves' ? curves : (await import('../src/ui/route')).routeArcs
const files = process.argv.slice(3).length ? process.argv.slice(3) : ['tic-tac-toe', 'call-the-coin']
for (const f of files) {
  const net = parse(readFileSync(new URL(`../../examples/${f}.maps`, import.meta.url), 'utf8'))
  console.log(f, which)
  console.table(measure(net, router))
}
