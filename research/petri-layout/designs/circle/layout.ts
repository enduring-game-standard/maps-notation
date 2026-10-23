import type { Net } from '../../engine/net.ts'
import { BAR_LEN, type Layout } from '../../engine/layout.ts'
import { attach, straight } from '../../engine/geometry.ts'

// Baseline: every node on one circle in declaration order, straight arcs. It is what no rule looks like.
export function layout(net: Net): Layout {
  const ids = [...net.places.map((p) => p.id), ...net.transitions.map((t) => t.id)]
  const R = Math.max(120, ids.length * 18)
  const nodes: Layout['nodes'] = {}
  ids.forEach((id, i) => {
    const a = (2 * Math.PI * i) / ids.length
    const x = R * Math.cos(a), y = R * Math.sin(a)
    nodes[id] = net.places.some((p) => p.id === id)
      ? { kind: 'place', x, y, label: { x: x + 24, y: y - 18, anchor: 'start' } }
      : { kind: 'transition', x, y, angle: Math.PI / 2, length: BAR_LEN, label: { x: x + 8, y: y - 26, anchor: 'start' } }
  })
  const arcs = net.arcs.map((a) => ({ ...a, path: straight(attach(nodes[a.from], nodes[a.to]), attach(nodes[a.to], nodes[a.from])) }))
  return { nodes, arcs }
}
