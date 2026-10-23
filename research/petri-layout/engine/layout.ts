import type { NodeId } from './net.ts'

export type Pt = { x: number; y: number }

// Arc geometry is a chain of cubic Bezier segments: [start, c1, c2, end, c1, c2, end, ...].
// The start lies on the source node's outline and the end on the target's, so the renderer draws it as given.
export type ArcRoute = { from: NodeId; to: NodeId; weight: number; inhibitor: boolean; path: Pt[] }

export type LabelSpot = { x: number; y: number; anchor: 'start' | 'middle' | 'end' }

export type PlaceBox = { kind: 'place'; x: number; y: number; label?: LabelSpot }
// A bar is a segment of `length` centered on (x, y) at `angle` radians (0 = horizontal).
export type BarBox = { kind: 'transition'; x: number; y: number; angle: number; length: number; label?: LabelSpot }

export type Layout = {
  nodes: Record<NodeId, PlaceBox | BarBox>
  arcs: ArcRoute[]
}

export const PLACE_R = 18
export const BAR_LEN = 40
