import type { Net, NodeId } from '../../engine/net.ts'
import type { Structure } from '../../engine/structure.ts'

export type Frame = 'down' | 'right'
export type FC = { f: number; c: number }
export type Side = -1 | 1

export type Hint =
  | { kind: 'lane' }
  | { kind: 'loop' }
  | { kind: 'around'; side: Side; channel: number; entry: 'before' | 'side'; shift: number }
  | { kind: 'free'; prefer: Side; hook?: boolean }
  | { kind: 'ring'; r: number }
  | { kind: 'petal'; side: Side; d: number }

export type BarDir = 'across' | 'along' | { angle: number }

export type Plan = {
  frame: Frame
  pos: Map<NodeId, FC>
  bar: Map<NodeId, BarDir>
  barSpan: Map<NodeId, number>
  hints: Map<string, Hint>
  labelSide: Map<NodeId, Side>
  labelDir?: Map<NodeId, { x: number; y: number }>
}

export type Graph = {
  net: Net
  s: Structure
  isPlace: (n: NodeId) => boolean
  ins: Map<NodeId, NodeId[]>
  outs: Map<NodeId, NodeId[]>
  nbrs: Map<NodeId, NodeId[]>
  tokens: Map<NodeId, number>
  key: (n: NodeId) => string
  byKey: (a: NodeId, b: NodeId) => number
}

export function buildGraph(net: Net, s: Structure): Graph {
  const P = new Set(net.places.map((p) => p.id))
  const ins = new Map<NodeId, NodeId[]>(), outs = new Map<NodeId, NodeId[]>(), nb = new Map<NodeId, Set<NodeId>>()
  for (const n of [...net.places, ...net.transitions]) { ins.set(n.id, []); outs.set(n.id, []); nb.set(n.id, new Set()) }
  for (const a of net.arcs) {
    outs.get(a.from)!.push(a.to); ins.get(a.to)!.push(a.from)
    nb.get(a.from)!.add(a.to); nb.get(a.to)!.add(a.from)
  }
  const key = (n: NodeId) => s.canon.get(n)!
  const byKey = (a: NodeId, b: NodeId) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)
  const nbrs = new Map([...nb].map(([k, v]) => [k, [...v].sort(byKey)]))
  for (const m of [ins, outs]) for (const [k, v] of m) m.set(k, [...new Set(v)].sort(byKey))
  return { net, s, isPlace: (n) => P.has(n), ins, outs, nbrs, tokens: new Map(net.places.map((p) => [p.id, p.tokens])), key, byKey }
}

export const arcKey = (from: NodeId, to: NodeId) => `${from}>${to}`
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
