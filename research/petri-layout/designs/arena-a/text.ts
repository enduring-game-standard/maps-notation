import type { NodeId } from '../../engine/net.ts'
import type { Graph } from './model.ts'

// Labels are measured only for their size. The renderer wraps at 16 characters, 13px italic, 14px lines.
export function labelLines(g: Graph, n: NodeId): string[] {
  const node = g.net.places.find((p) => p.id === n) ?? g.net.transitions.find((t) => t.id === n)
  const text = node?.label ?? n
  const words = text.split(' '), lines: string[] = []
  let cur = ''
  for (const w of words) { if (cur && (cur + ' ' + w).length > 16) { lines.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w }
  if (cur) lines.push(cur)
  return lines
}

// An unlabeled node shows its id; ids are names, so they get a fixed size and never move anything.
export function labelExtent(g: Graph, n: NodeId): { w: number; h: number } {
  const node = g.net.places.find((p) => p.id === n) ?? g.net.transitions.find((t) => t.id === n)
  if (!node?.label) return { w: 26, h: 14 }
  const lines = labelLines(g, n)
  return { w: Math.max(...lines.map((l) => l.length)) * 6.4 + 2, h: lines.length * 14 }
}
