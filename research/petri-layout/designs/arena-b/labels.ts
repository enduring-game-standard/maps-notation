import type { Net, NodeId } from '../../engine/net.ts'
import { PLACE_R, type ArcRoute, type LabelSpot, type Pt } from '../../engine/layout.ts'
import { sampleBezier } from '../../engine/geometry.ts'
import { boxOf, overlap, type Nodes } from './common.ts'

type Rect = { x0: number; y0: number; x1: number; y1: number }

function wrap(s: string, w: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const word of s.split(' ')) { if (cur && (cur + ' ' + word).length > w) { lines.push(cur); cur = word } else cur = cur ? cur + ' ' + word : word }
  if (cur) lines.push(cur)
  return lines
}

const DIRS: Pt[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
  { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: -1 }, { x: -1, y: 1 },
]

// R21: a label goes where no arc leaves its node, on the preferred (free) side.
export function placeLabels(net: Net, nodes: Nodes, arcs: ArcRoute[], prefer: Map<NodeId, Pt>): void {
  const pts = arcs.flatMap((a) => sampleBezier(a.path, 14))
  const nodeBoxes = Object.entries(nodes).map(([id, n]) => ({ id, r: boxOf(n, 3) }))
  const taken: Rect[] = []
  const allY = [...Object.values(nodes).flatMap((n) => [n.y - 30, n.y + 30]), ...pts.map((q) => q.y)]
  const yLo = Math.min(...allY), yHi = Math.max(...allY)
  const items = [...net.places.map((p) => ({ id: p.id, text: p.label ?? p.id })), ...net.transitions.map((t) => ({ id: t.id, text: t.label ?? t.id }))]
    .sort((a, b) => nodes[a.id].y - nodes[b.id].y || nodes[a.id].x - nodes[b.id].x)
  for (const it of items) {
    const n = nodes[it.id]
    const lines = wrap(it.text, 16)
    const W = Math.max(...lines.map((l) => l.length)) * 6.6 + 2, H = lines.length * 14
    const pv = prefer.get(it.id) ?? { x: 0, y: -1 }
    const pl = Math.hypot(pv.x, pv.y) || 1
    const order = DIRS.map((d, i) => ({ d, i, s: -(d.x * pv.x + d.y * pv.y) / (pl * Math.hypot(d.x, d.y)) }))
      .sort((a, b) => a.s - b.s || a.i - b.i).map((o) => o.d)
    const hx = n.kind === 'place' ? PLACE_R : Math.abs(Math.cos(n.angle)) * n.length / 2 + 3
    const hy = n.kind === 'place' ? PLACE_R : Math.abs(Math.sin(n.angle)) * n.length / 2 + 3
    let best: { spot: LabelSpot; rect: Rect; score: number } | null = null
    outer: for (const extra of [0, 14, 30, 56, 90]) for (const d of order) {
      const len = Math.hypot(d.x, d.y)
      const ux = d.x / len, uy = d.y / len
      let x: number, anchor: LabelSpot['anchor'], y: number
      if (d.x > 0) { anchor = 'start'; x = n.x + hx + 5 + extra * Math.abs(ux) } else if (d.x < 0) { anchor = 'end'; x = n.x - hx - 5 - extra * Math.abs(ux) } else { anchor = 'middle'; x = n.x }
      if (d.y !== 0) y = n.y + (d.y > 0 ? 1 : -1) * (hy + 4 + H / 2 + extra * Math.abs(uy)); else y = n.y
      if (d.x !== 0 && d.y !== 0) y = n.y + (d.y > 0 ? 1 : -1) * (hy * 0.7 + H / 2)
      const x0 = anchor === 'start' ? x : anchor === 'end' ? x - W : x - W / 2
      const rect = { x0, x1: x0 + W, y0: y - H / 2, y1: y + H / 2 }
      let score = 0
      // the renderer's frame grows only to the label's anchor point plus 10, so a tall label at the edge would be cut
      if (y + H / 2 + 3 > Math.max(yHi, y) + 10 || y - H / 2 - 3 < Math.min(yLo, y) - 10) score += 40
      for (const b of nodeBoxes) if (overlap(rect, b.r)) score += 100
      for (const t of taken) if (overlap(rect, { x0: t.x0 - 2, x1: t.x1 + 2, y0: t.y0 - 2, y1: t.y1 + 2 })) score += 100
      for (const [id, o] of Object.entries(nodes)) {
        if (o.kind !== 'place' || id === it.id) continue
        const w = Math.max(W, 60), xa = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
        if (Math.abs(y - o.y) < PLACE_R + 2 && o.x + PLACE_R + 2 > xa && o.x - PLACE_R - 2 < xa + w) score += 100
      }
      for (const p of pts) if (p.x > rect.x0 - 2 && p.x < rect.x1 + 2 && p.y > rect.y0 - 2 && p.y < rect.y1 + 2) score += 2
      score += extra * 0.4 + order.indexOf(d) * 0.3
      if (!best || score < best.score) best = { spot: { x, y, anchor }, rect, score }
      if (score === 0) break outer
    }
    n.label = best!.spot
    taken.push(best!.rect)
  }
}
