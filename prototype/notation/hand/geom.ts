// A hand-placed MAPS drawing as PR 23's Layout, so its rule checks judge the same geometry that is drawn.
import { readFileSync } from 'node:fs'
import { parse } from '../../../studio/src/core/text'
import { WORLD, type Net as Maps } from '../../../studio/src/core/model'
import { parseNet, type Net } from '../../../../pr23/research/petri-layout/engine/net.ts'
import { PLACE_R, BAR_LEN, type Layout, type Pt, type LabelSpot } from '../../../../pr23/research/petri-layout/engine/layout.ts'
import { LABEL_LINE, labelWidth, wrapLabel } from '../../../../pr23/research/petri-layout/engine/label.ts'

export type P = [number, number]
export type Side = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
/** How an arc is routed: straight, one bend, or through corners rounded off (returns), or through points as one smooth curve. */
export type Route = { bend: number } | { corners: P[] } | { through: P[] }
export interface Spec {
  at: Record<string, P>
  /** bar angle in degrees, 0 = horizontal */
  bar: Record<string, number>
  label: Record<string, Side>
  /** keyed `from>to` in the direction the arc is drawn */
  route?: Record<string, Route>
}

export function load(file: string): { maps: Maps; net: Net } {
  const maps = parse(readFileSync(file, 'utf8'))
  const arcs: { from: string; to: string; weight?: number; inhibitor?: boolean }[] = []
  for (const a of maps.arcs) {
    if (a.kind === 'take') arcs.push({ from: a.state, to: a.verb, weight: a.count })
    if (a.kind === 'give') arcs.push({ from: a.verb, to: a.state, weight: a.count })
    if (a.kind === 'need') arcs.push({ from: a.state, to: a.verb, weight: a.count }, { from: a.verb, to: a.state, weight: a.count })
    if (a.kind === 'unless') arcs.push({ from: a.state, to: a.verb, weight: a.count, inhibitor: true })
  }
  const net = parseNet({
    name: maps.title,
    places: maps.states.map((s) => ({ id: s.id, label: s.ends ?? s.label, tokens: s.marks })),
    transitions: maps.verbs.map((v) => ({ id: v.id, label: v.label })),
    arcs,
  })
  return { maps, net }
}

const v = (p: P): Pt => ({ x: p[0], y: p[1] })
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const line = (a: Pt, b: Pt): Pt[] => [lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), b]
const quad = (a: Pt, c: Pt, b: Pt): Pt[] => [lerp(a, c, 2 / 3), lerp(b, c, 2 / 3), b]

export function toLayout(net: Net, s: Spec): Layout {
  const isPlace = new Set(net.places.map((p) => p.id))
  const nodes: Layout['nodes'] = {}
  for (const p of net.places) nodes[p.id] = { kind: 'place', x: s.at[p.id][0], y: s.at[p.id][1] }
  for (const t of net.transitions) nodes[t.id] = { kind: 'transition', x: s.at[t.id][0], y: s.at[t.id][1], angle: ((s.bar[t.id] ?? 0) * Math.PI) / 180, length: BAR_LEN }
  for (const n of [...net.places, ...net.transitions]) {
    const node = nodes[n.id], side = s.label[n.id] ?? 's'
    const lines = wrapLabel(n.label ?? n.id), h = (lines.length * LABEL_LINE) / 2
    const rx = node.kind === 'place' ? PLACE_R + 5 : Math.abs(Math.cos(node.angle)) * BAR_LEN / 2 + 6
    const ry = node.kind === 'place' ? PLACE_R + 4 : Math.abs(Math.sin(node.angle)) * BAR_LEN / 2 + 5
    const L: LabelSpot = {
      x: node.x + (side.includes('e') ? rx : side.includes('w') ? -rx : 0),
      y: node.y + (side.includes('s') ? ry + h : side.includes('n') ? -ry - h : 0),
      anchor: side.includes('e') ? 'start' : side.includes('w') ? 'end' : 'middle',
    }
    node.label = L
  }
  // where an arc meets a bar: its own point along the bar, ordered as its other end lies (R19)
  const onBar = (id: string, toward: Pt): Pt => {
    const n = nodes[id] as Extract<Layout['nodes'][string], { kind: 'transition' }>
    const ux = Math.cos(n.angle), uy = Math.sin(n.angle)
    const along = (toward.x - n.x) * ux + (toward.y - n.y) * uy
    const k = Math.max(-BAR_LEN / 2 + 4, Math.min(BAR_LEN / 2 - 4, along * 0.12))
    return { x: n.x + ux * k, y: n.y + uy * k }
  }
  const onPlace = (id: string, toward: Pt): Pt => {
    const n = nodes[id], d = Math.hypot(toward.x - n.x, toward.y - n.y) || 1
    return { x: n.x + ((toward.x - n.x) * PLACE_R) / d, y: n.y + ((toward.y - n.y) * PLACE_R) / d }
  }
  const end = (id: string, toward: Pt) => (isPlace.has(id) ? onPlace(id, toward) : onBar(id, toward))
  const arcs: Layout['arcs'] = []
  for (const a of net.arcs) {
    const k = `${a.from}>${a.to}`, back = `${a.to}>${a.from}`
    // a read is drawn once; its give-back shares the read's route, reversed
    const r = s.route?.[k] ?? (s.route?.[back] && isPlace.has(a.to) && net.arcs.some((b) => b.from === a.to && b.to === a.from) ? reverse(s.route[back]) : undefined)
    const A = v(s.at[a.from]), B = v(s.at[a.to])
    let path: Pt[]
    if (r && 'corners' in r) {
      const cs = r.corners.map(v), s0 = end(a.from, cs[0]), e0 = end(a.to, cs[cs.length - 1])
      const pts = [s0, ...cs, e0].filter((q, i, a) => i === 0 || Math.hypot(q.x - a[i - 1].x, q.y - a[i - 1].y) > 1)
      path = [s0]
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i - 1], q = pts[i], n = pts[i + 1]
        const l1 = Math.hypot(q.x - p.x, q.y - p.y), l2 = Math.hypot(n.x - q.x, n.y - q.y), rr = Math.min(26, l1 / 2, l2 / 2)
        const c1 = lerp(q, p, rr / l1), c2 = lerp(q, n, rr / l2)
        path.push(...line(path[path.length - 1], c1), ...quad(c1, q, c2))
      }
      path.push(...line(path[path.length - 1], e0))
    } else if (r && 'through' in r) {
      const cs = r.through.map(v), pts = [end(a.from, cs[0]), ...cs, end(a.to, cs[cs.length - 1])]
      path = [pts[0]]
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i], q1 = pts[i], q2 = pts[i + 1], p3 = pts[i + 2] ?? q2
        path.push({ x: q1.x + (q2.x - p0.x) / 6, y: q1.y + (q2.y - p0.y) / 6 }, { x: q2.x - (p3.x - q1.x) / 6, y: q2.y - (p3.y - q1.y) / 6 }, q2)
      }
    } else {
      const b = r && 'bend' in r ? r.bend : 0, l = Math.hypot(B.x - A.x, B.y - A.y) || 1
      const c: Pt = { x: (A.x + B.x) / 2 - (b * (B.y - A.y)) / l, y: (A.y + B.y) / 2 + (b * (B.x - A.x)) / l }
      const s0 = end(a.from, b ? c : B), e0 = end(a.to, b ? c : A)
      path = b ? [s0, ...quad(s0, c, e0)] : [s0, ...line(s0, e0)]
    }
    arcs.push({ from: a.from, to: a.to, weight: a.weight, inhibitor: a.inhibitor, path })
  }
  return { nodes, arcs }
}

const reverse = (r: Route): Route => ('corners' in r ? { corners: [...r.corners].reverse() } : 'through' in r ? { through: [...r.through].reverse() } : { bend: -r.bend })

const f = (n: number) => n.toFixed(1)
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const pathD = (p: Pt[]) => { let d = `M${f(p[0].x)},${f(p[0].y)}`; for (let i = 1; i + 2 < p.length; i += 3) d += ` C${f(p[i].x)},${f(p[i].y)} ${f(p[i + 1].x)},${f(p[i + 1].y)} ${f(p[i + 2].x)},${f(p[i + 2].y)}`; return d }

/** Peterson's drawing conventions, with the speaker's color on each bar and a read drawn once, dashed. */
export function render(maps: Maps, net: Net, lay: Layout): string {
  const color = (t: string) => { const by = maps.verbs.find((x) => x.id === t)!.by; return by === WORLD ? '#000' : maps.seats.find((x) => x.id === by)!.color }
  const reads = new Set(maps.arcs.filter((a) => a.kind === 'need').map((a) => `${a.verb}>${a.state}`))
  const out: string[] = []
  const all = Object.values(lay.nodes).flatMap((n) => [n.x, n.y]).concat(lay.arcs.flatMap((a) => a.path.flatMap((p) => [p.x, p.y])))
  const xs = all.filter((_, i) => i % 2 === 0), ys = all.filter((_, i) => i % 2 === 1)
  const x0 = Math.min(...xs) - 150, y0 = Math.min(...ys) - 40, W = Math.max(...xs) - x0 + 150, H = Math.max(...ys) - y0 + 50
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(W)} ${f(H)}" width="${f(W)}" height="${f(H)}" font-family="Times New Roman, serif"><rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(H)}" fill="#fff"/>`)
  out.push('<defs><marker id="ah" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,1 L10,5 L0,9 z" fill="#000"/></marker><marker id="rd" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse"><circle cx="5" cy="5" r="4" fill="#555"/></marker></defs>')
  for (const a of lay.arcs) {
    if (reads.has(`${a.from}>${a.to}`)) continue
    const read = net.arcs.some((b) => b.from === a.to && b.to === a.from) && reads.has(`${a.to}>${a.from}`)
    if (read) out.push(`<path d="${pathD(a.path)}" fill="none" stroke="#555" stroke-width="1.2" stroke-dasharray="5 3" marker-end="url(#rd)"/>`)
    else out.push(`<path d="${pathD(a.path)}" fill="none" stroke="#000" stroke-width="1.5"${a.inhibitor ? '' : ' marker-end="url(#ah)"'}/>`)
    if (a.inhibitor) { const e = a.path[a.path.length - 1]; out.push(`<circle cx="${f(e.x)}" cy="${f(e.y)}" r="4" fill="#fff" stroke="#000" stroke-width="1.5"/>`) }
  }
  for (const p of net.places) {
    const n = lay.nodes[p.id]
    out.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${PLACE_R}" fill="#fff" stroke="#000" stroke-width="1.6"/>`)
    const st = maps.states.find((s) => s.id === p.id)!
    if (st.ends) out.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${PLACE_R - 4}" fill="none" stroke="#000" stroke-width="1.4"/>`)
    if (p.tokens === 1) out.push(`<circle cx="${f(n.x)}" cy="${f(n.y)}" r="3.6" fill="#000"/>`)
  }
  for (const t of net.transitions) {
    const n = lay.nodes[t.id]
    if (n.kind !== 'transition') continue
    const dx = (Math.cos(n.angle) * n.length) / 2, dy = (Math.sin(n.angle) * n.length) / 2
    out.push(`<line x1="${f(n.x - dx)}" y1="${f(n.y - dy)}" x2="${f(n.x + dx)}" y2="${f(n.y + dy)}" stroke="${color(t.id)}" stroke-width="4"/>`)
  }
  for (const node of [...net.places, ...net.transitions]) {
    const L = lay.nodes[node.id].label!
    const lines = wrapLabel(node.label ?? node.id)
    const bold = maps.states.find((s) => s.id === node.id)?.ends
    const fill = lay.nodes[node.id].kind === 'transition' ? color(node.id) : '#000'
    lines.forEach((ln, i) => out.push(`<text x="${f(L.x)}" y="${f(L.y + (i - (lines.length - 1) / 2) * LABEL_LINE + 4)}" font-size="13" font-style="italic"${bold ? ' font-weight="bold"' : ''} fill="${fill}" text-anchor="${L.anchor}">${esc(ln)}</text>`))
  }
  out.push('</svg>')
  return out.join('\n')
}

export { labelWidth }
