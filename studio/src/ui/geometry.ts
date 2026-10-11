import { WORLD, type Arc, type Net, type State, type Verb } from '../core/model'

export interface Pt {
  x: number
  y: number
}
export type Shape = { kind: 'circle'; x: number; y: number; r: number } | { kind: 'rect'; x: number; y: number; w: number; h: number }

export const STATE_R = 18
export const VERB_H = 22

export const DIE_W = 16

export const dieWidth = (v: Verb, chance: boolean) => (chance ? DIE_W + (v.weight !== 1 ? 6 + String(v.weight).length * 6 : 0) : 0)

export const verbWidth = (v: Verb, chance = false) => Math.max(64, Math.min(180, Math.round(v.label.length * 6.2 + 20))) + dieWidth(v, chance)

export const stateShape = (p: State): Shape => ({ kind: 'circle', x: p.x, y: p.y, r: STATE_R })
export const verbShape = (v: Verb, chance = false): Shape => ({ kind: 'rect', x: v.x, y: v.y, w: verbWidth(v, chance), h: VERB_H })

export const shapesOf = (net: Net, chance: Set<string>) => {
  const m = new Map<string, Shape>()
  for (const p of net.states) m.set(p.id, stateShape(p))
  for (const v of net.verbs) m.set(v.id, verbShape(v, chance.has(v.id)))
  return m
}

/**
 * World verbs drawn with a die: alternative results of one event. They sit at one priority with
 * identical inputs, so whenever one is possible all are, and chance picks. Sharing a single input
 * is not enough: tic-tac-toe's line checks share the judge mark but almost never tie.
 */
export const chanceTies = (net: Net) => {
  const sig = new Map<string, string[]>()
  for (const a of net.arcs) if (a.kind !== 'give') sig.set(a.verb, [...(sig.get(a.verb) ?? []), `${a.kind} ${a.count} ${a.state}`])
  const groups = new Map<string, string[]>()
  for (const v of net.verbs) {
    if (v.by !== WORLD) continue
    const k = `${v.priority}|${(sig.get(v.id) ?? []).sort().join(',')}`
    groups.set(k, [...(groups.get(k) ?? []), v.id])
  }
  const out = new Set<string>()
  for (const ids of groups.values()) if (ids.length > 1) ids.forEach((id) => out.add(id))
  for (const v of net.verbs) if (v.by === WORLD && v.weight !== 1) out.add(v.id)
  return out
}

export const borderPoint = (s: Shape, t: Pt, gap = 2): Pt => {
  const dx = t.x - s.x
  const dy = t.y - s.y
  const len = Math.hypot(dx, dy) || 1
  if (s.kind === 'circle') return { x: s.x + (dx / len) * (s.r + gap), y: s.y + (dy / len) * (s.r + gap) }
  const scale = Math.min((s.w / 2 + gap) / Math.abs(dx || 1e-9), (s.h / 2 + gap) / Math.abs(dy || 1e-9))
  return { x: s.x + dx * scale, y: s.y + dy * scale }
}

export interface Curve {
  start: Pt
  ctrl: Pt
  end: Pt
}

export const curveBetween = (from: Shape, to: Shape, bend: number): Curve => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const ctrl = { x: (from.x + to.x) / 2 - dy * bend, y: (from.y + to.y) / 2 + dx * bend }
  return { start: borderPoint(from, ctrl), ctrl, end: borderPoint(to, ctrl, 3) }
}

export const pointAt = ({ start: s, ctrl: c, end: e }: Curve, t: number): Pt => {
  const u = 1 - t
  return { x: u * u * s.x + 2 * u * t * c.x + t * t * e.x, y: u * u * s.y + 2 * u * t * c.y + t * t * e.y }
}

export const curvePath = ({ start: s, ctrl: c, end: e }: Curve) => `M${s.x},${s.y} Q${c.x},${c.y} ${e.x},${e.y}`

/** Take and give run state-to-verb and verb-to-state, so their bends land on opposite sides; need and unless bend the other way to stay clear of a take. */
const BEND: Record<Arc['kind'], number> = { take: 0.1, give: 0.1, need: -0.12, unless: -0.2 }

export const arcCurve = (arc: Arc, shapes: Map<string, Shape>): Curve | undefined => {
  const p = shapes.get(arc.state)
  const v = shapes.get(arc.verb)
  if (!p || !v) return undefined
  return arc.kind === 'give' ? curveBetween(v, p, BEND.give) : curveBetween(p, v, BEND[arc.kind])
}

export const arrowHead = (c: Curve, size = 8) => {
  const dx = c.end.x - c.ctrl.x
  const dy = c.end.y - c.ctrl.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const bx = c.end.x - ux * size
  const by = c.end.y - uy * size
  const w = size * 0.5
  return `M${c.end.x},${c.end.y} L${bx - uy * w},${by + ux * w} L${bx + uy * w},${by - ux * w} Z`
}

export const endCap = (c: Curve, r: number): Pt => {
  const dx = c.end.x - c.ctrl.x
  const dy = c.end.y - c.ctrl.y
  const len = Math.hypot(dx, dy) || 1
  return { x: c.end.x - (dx / len) * r, y: c.end.y - (dy / len) * r }
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export const shapeBox = (s: Shape): Box =>
  s.kind === 'circle'
    ? { x0: s.x - s.r, y0: s.y - s.r, x1: s.x + s.r, y1: s.y + s.r + 16 }
    : { x0: s.x - s.w / 2, y0: s.y - s.h / 2, x1: s.x + s.w / 2, y1: s.y + s.h / 2 }

export const union = (boxes: Box[]): Box | undefined =>
  boxes.length
    ? boxes.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }))
    : undefined

export const inflate = (b: Box, pad: number): Box => ({ x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad })

export const HULL_PAD = 20

export const groupHulls = (net: Net, shapes: Map<string, Shape>) =>
  net.groups.flatMap((g) => {
    const members = [...net.states, ...net.verbs].filter((n) => n.group === g.id).map((n) => n.id)
    const box = union(members.map((id) => shapeBox(shapes.get(id)!)))
    return box ? [{ group: g, members, box: inflate({ ...box, y0: box.y0 - 14 }, HULL_PAD) }] : []
  })

export const DOTS: Pt[][] = [
  [],
  [{ x: 0, y: 0 }],
  [{ x: -5, y: -5 }, { x: 5, y: 5 }],
  [{ x: -6, y: -6 }, { x: 0, y: 0 }, { x: 6, y: 6 }],
  [{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: -5, y: 5 }, { x: 5, y: 5 }],
  [{ x: -6, y: -6 }, { x: 6, y: -6 }, { x: 0, y: 0 }, { x: -6, y: 6 }, { x: 6, y: 6 }],
]

export const readableOn = (hex: string) => {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.62 ? '#1d2127' : '#ffffff'
}
