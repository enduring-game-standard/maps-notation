import type { NodeId } from '../../engine/net.ts'
import { PLACE_R, type BarBox, type PlaceBox, type Pt } from '../../engine/layout.ts'
import { attach, sampleBezier, straight } from '../../engine/geometry.ts'

// distance between consecutive stages along the flow; grows with the tallest label so labels beside a stage do not collide
export const G = { step: 88 }
export const BR = 76 // distance between alternatives of a choice
export const BAR = 44 // default bar length
export const MAXBAR = 92 // the longest bar an arc can still reach from its center

// R19: a bar is long enough for the arcs on one side of it, and no longer than an arc can still reach from its center.
export function barLength(arcs: { from: string; to: string }[], t: string): number {
  const ins = arcs.filter((a) => a.to === t).length, outs = arcs.filter((a) => a.from === t).length
  return Math.min(MAXBAR, Math.max(BAR, 14 * Math.max(ins, outs) + 16))
}

export type Node = PlaceBox | BarBox
export type Nodes = Record<NodeId, Node>

export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Frame maps (flow, cross) to the page. Down: flow is y, cross is x. Right: flow is x, cross is y.
export class Frame {
  down: boolean
  constructor(down: boolean) { this.down = down }
  pt(f: number, c: number): Pt { return this.down ? { x: c, y: f } : { x: f, y: c } }
  f(p: Pt) { return this.down ? p.y : p.x }
  c(p: Pt) { return this.down ? p.x : p.y }
  barAngle() { return this.down ? 0 : Math.PI / 2 }
}

// Isotonic regression (pool adjacent violators) on spacing-corrected targets: the closest arrangement to
// the wanted positions that keeps at least `sep` between neighbours. Symmetric, deterministic.
export function spread(base: number[], sep: number): number[] {
  const n = base.length
  const q = base.map((b, i) => b - i * sep)
  const blocks: { sum: number; n: number }[] = []
  for (const v of q) {
    blocks.push({ sum: v, n: 1 })
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2]
      if (a.sum / a.n <= b.sum / b.n) break
      blocks.splice(blocks.length - 2, 2, { sum: a.sum + b.sum, n: a.n + b.n })
    }
  }
  const out: number[] = []
  for (const b of blocks) for (let i = 0; i < b.n; i++) out.push(b.sum / b.n)
  return out.slice(0, n).map((v, i) => v + i * sep)
}

export function halfExtent(n: Node, axisIsBarAxis: boolean): number {
  return n.kind === 'place' ? PLACE_R : axisIsBarAxis ? n.length / 2 : 3
}

// Catmull-Rom through the points, as a chain of cubic Beziers.
export function smooth(pts: Pt[]): Pt[] {
  const out: Pt[] = [pts[0]]
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    out.push({ x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }, p2)
  }
  return out
}

// A route from node a to node b through waypoints, endpoints on the outlines.
export function route(a: Node, b: Node, mids: Pt[]): Pt[] {
  if (mids.length === 0) return straight(attach(a, b), attach(b, a))
  const s = attach(a, mids[0]), e = attach(b, mids[mids.length - 1])
  return smooth([s, ...mids, e])
}

export function hitsNode(path: Pt[], nodes: Nodes, skip: Set<NodeId>, margin = 5): boolean {
  const pts = sampleBezier(path, 20)
  for (const [id, n] of Object.entries(nodes)) {
    if (skip.has(id)) continue
    if (n.kind === 'place') { if (pts.some((p) => Math.hypot(p.x - n.x, p.y - n.y) < PLACE_R + margin)) return true }
    else {
      const ux = Math.cos(n.angle), uy = Math.sin(n.angle)
      for (const p of pts) {
        const t = Math.max(-n.length / 2, Math.min(n.length / 2, (p.x - n.x) * ux + (p.y - n.y) * uy))
        if (Math.hypot(p.x - (n.x + ux * t), p.y - (n.y + uy * t)) < margin + 2) return true
      }
    }
  }
  return false
}

// Does a path run through the body of a rectangle?
export function hitsRect(path: Pt[], r: { x0: number; y0: number; x1: number; y1: number }): boolean {
  return sampleBezier(path, 14).some((p) => p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1)
}

export function boxOf(n: Node, pad = 0) {
  if (n.kind === 'place') return { x0: n.x - PLACE_R - pad, x1: n.x + PLACE_R + pad, y0: n.y - PLACE_R - pad, y1: n.y + PLACE_R + pad }
  const dx = Math.abs(Math.cos(n.angle)) * n.length / 2, dy = Math.abs(Math.sin(n.angle)) * n.length / 2
  return { x0: n.x - dx - 2 - pad, x1: n.x + dx + 2 + pad, y0: n.y - dy - 2 - pad, y1: n.y + dy + 2 + pad }
}

export function overlap(a: { x0: number; y0: number; x1: number; y1: number }, b: { x0: number; y0: number; x1: number; y1: number }) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

// The renderer wraps labels at 16 characters; this is the width of the widest resulting line.
export function labelWidth(text: string): number {
  let widest = 0, cur = ''
  for (const word of text.split(' ')) { if (cur && (cur + ' ' + word).length > 16) { widest = Math.max(widest, cur.length); cur = word } else cur = cur ? cur + ' ' + word : word }
  return Math.max(widest, cur.length) * 6.6
}

export function labelLines(text: string): number {
  let n = 1, cur = ''
  for (const word of text.split(' ')) { if (cur && (cur + ' ' + word).length > 16) { n++; cur = word } else cur = cur ? cur + ' ' + word : word }
  return n
}
