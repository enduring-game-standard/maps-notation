import type { NodeId } from '../../engine/net.ts'
import type { Graph } from './model.ts'
import { LABEL_LINE, labelWidth, wrapLabel } from '../../engine/label.ts'

// an unlabeled node shows its id, which must never move anything: every id gets one size
const ID_LABEL = { w: 26, h: LABEL_LINE }

export function labelExtent(g: Graph, n: NodeId): { w: number; h: number } {
  const node = g.net.places.find((p) => p.id === n) ?? g.net.transitions.find((t) => t.id === n)
  if (!node?.label) return ID_LABEL
  const lines = wrapLabel(node.label)
  return { w: labelWidth(lines) + 4, h: lines.length * LABEL_LINE }
}
