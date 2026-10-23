// PROTOTYPE. The contract every candidate drawing convention implements, so one harness can measure them all.
import type { Net } from '../../../studio/src/core/model'
export type { Net }

export interface Pt { x: number; y: number }
/** A drawn node: its center and its extent. Shape is free; the box is what the harness measures. */
export interface Box { x: number; y: number; w: number; h: number }

export interface Layout {
  /** Every state and verb id that appears in the drawing. A design may draw a node more than once; list each copy as `id#n`. */
  nodes: Record<string, Box>
  /** Every arc, keyed `${kind}|${state}|${verb}`, as the polyline it is drawn along, state end first. */
  arcs: Record<string, Pt[]>
}

export interface Drawing { svg: string; width: number; height: number; layout: Layout }

export type Criterion =
  | 'conversation' | 'possibility' | 'actionable' | 'entity' | 'content' | 'contact'
  | 'counts' | 'loop' | 'compare-shape' | 'compare-name' | 'readable' | 'napkin'

/** One thing the convention draws. Ablation removes it and re-runs the blind read; an element whose removal costs no criterion has not earned its place. */
export interface Element { id: string; what: string; purpose: string; serves: Criterion[] }

/** Where the design sits in the design space. Six designs must differ pairwise on at least three axes. */
export interface Axes {
  /** What the horizontal direction means, or "none". */
  x: string
  /** What the vertical direction means, or "none". */
  y: string
  /** What decides where a node sits, in one phrase. */
  placement: string
  /** How a verb is drawn. */
  verb: string
  /** How who speaks is shown. */
  speaker: string
  /** How an entity's states are shown to belong together. */
  entity: string
  /** How arcs are routed. */
  routing: string
  /** What one drawing covers: one net, one entity, one moment, and so on. */
  unit: string
}

export interface Design {
  id: string
  title: string
  /** The governing idea, in two or three sentences. */
  idea: string
  /** The drawing rules a designer would follow by hand on a napkin, in order. The hand-reproduction check gives only these to a fresh reader. */
  rules: string[]
  elements: Element[]
  axes: Axes
  /** Must be a pure function of the net. It must ignore the authored `x`/`y` and `via` in the net. `without` lists element ids to leave out, for ablation. */
  draw(net: Net, opts?: { without?: string[] }): Drawing
}

export const arcKey = (a: { kind: string; state: string; verb: string }) => `${a.kind}|${a.state}|${a.verb}`
