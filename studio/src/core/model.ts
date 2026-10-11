export const WORLD = 'world' as const

export type SeatId = string
export type Speaker = typeof WORLD | SeatId

export interface Seat {
  id: SeatId
  name: string
  color: string
}

export interface Group {
  id: string
  label: string
}

export interface Place {
  id: string
  label: string
  marks: number
  seenBy: 'all' | SeatId[]
  ends?: string
  group?: string
  x: number
  y: number
}

export interface Verb {
  id: string
  label: string
  by: Speaker
  priority: number
  weight: number
  group?: string
  x: number
  y: number
}

export type ArcKind = 'take' | 'give' | 'need' | 'unless'

export interface Arc {
  kind: ArcKind
  place: string
  verb: string
  count: number
}

export interface Net {
  title: string
  seats: Seat[]
  groups: Group[]
  places: Place[]
  verbs: Verb[]
  arcs: Arc[]
}

export type Marking = Record<string, number>

export const ARC_KINDS: readonly ArcKind[] = ['take', 'give', 'need', 'unless']

export const emptyNet = (): Net => ({ title: 'Untitled', seats: [], groups: [], places: [], verbs: [], arcs: [] })

export const initialMarking = (net: Net): Marking =>
  Object.fromEntries(net.places.map((p) => [p.id, p.marks]))

export const isIdent = (s: string) => /^[a-z][a-z0-9_]*$/.test(s)
