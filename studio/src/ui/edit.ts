import { WORLD, isIdent, type Arc, type ArcKind, type Net, type Place, type Seat, type Verb } from '../core/model'

export type NodeKind = 'place' | 'verb'
export interface NodeRef {
  kind: NodeKind
  id: string
}
export interface ArcRef {
  kind: 'arc'
  place: string
  verb: string
  arcKind: ArcKind
}
export type Selection = NodeRef | ArcRef | { kind: 'group'; id: string } | null

export const sameArc = (a: Arc, r: ArcRef) => a.place === r.place && a.verb === r.verb && a.kind === r.arcKind
export const arcRef = (a: Arc): ArcRef => ({ kind: 'arc', place: a.place, verb: a.verb, arcKind: a.kind })

export const GRID = 10
export const snap = (n: number) => Math.round(n / GRID) * GRID

const takenIds = (net: Net) => new Set([...net.places, ...net.verbs, ...net.seats].map((n) => n.id).concat(WORLD))

export const uniqueId = (taken: Set<string>, prefix: string) => {
  let i = 1
  while (taken.has(`${prefix}_${i}`)) i++
  return `${prefix}_${i}`
}

export const addPlace = (net: Net, x: number, y: number): [Net, string] => {
  const id = uniqueId(takenIds(net), 'place')
  const p: Place = { id, label: `Place ${id.slice(6)}`, marks: 0, seenBy: 'all', x: snap(x), y: snap(y) }
  return [{ ...net, places: [...net.places, p] }, id]
}

export const addVerb = (net: Net, x: number, y: number): [Net, string] => {
  const id = uniqueId(takenIds(net), 'verb')
  const v: Verb = { id, label: `Verb ${id.slice(5)}`, by: net.seats[0]?.id ?? WORLD, priority: 0, weight: 1, x: snap(x), y: snap(y) }
  return [{ ...net, verbs: [...net.verbs, v] }, id]
}

export const moveNodes = (net: Net, origins: Map<string, { x: number; y: number }>, dx: number, dy: number, snapEach: boolean): Net => {
  const at = <T extends { id: string; x: number; y: number }>(n: T): T => {
    const o = origins.get(n.id)
    if (!o) return n
    return snapEach ? { ...n, x: snap(o.x + dx), y: snap(o.y + dy) } : { ...n, x: o.x + snap(dx), y: o.y + snap(dy) }
  }
  return { ...net, places: net.places.map(at), verbs: net.verbs.map(at) }
}

/** Bipartite by construction: a place can only meet a verb. */
export const connect = (net: Net, from: NodeRef, to: NodeRef): [Net, ArcRef] | null => {
  if (from.kind === to.kind) return null
  const arc: Arc =
    from.kind === 'place' ? { kind: 'take', place: from.id, verb: to.id, count: 1 } : { kind: 'give', place: to.id, verb: from.id, count: 1 }
  if (net.arcs.some((a) => a.place === arc.place && a.verb === arc.verb && a.kind === arc.kind)) return null
  return [{ ...net, arcs: [...net.arcs, arc] }, arcRef(arc)]
}

export const deleteSelection = (net: Net, sel: Selection): Net => {
  if (!sel) return net
  switch (sel.kind) {
    case 'place':
      return { ...net, places: net.places.filter((p) => p.id !== sel.id), arcs: net.arcs.filter((a) => a.place !== sel.id) }
    case 'verb':
      return { ...net, verbs: net.verbs.filter((v) => v.id !== sel.id), arcs: net.arcs.filter((a) => a.verb !== sel.id) }
    case 'arc':
      return { ...net, arcs: net.arcs.filter((a) => !sameArc(a, sel)) }
    case 'group':
      return deleteGroup(net, sel.id)
  }
}

export const updatePlace = (net: Net, id: string, patch: Partial<Place>): Net => ({
  ...net,
  places: net.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
})

export const updateVerb = (net: Net, id: string, patch: Partial<Verb>): Net => ({
  ...net,
  verbs: net.verbs.map((v) => (v.id === id ? { ...v, ...patch } : v)),
})

/** Returns null when the change would duplicate an existing arc. */
export const updateArc = (net: Net, ref: ArcRef, patch: Partial<Pick<Arc, 'kind' | 'count'>>): [Net, ArcRef] | null => {
  const old = net.arcs.find((a) => sameArc(a, ref))
  if (!old) return null
  const next = { ...old, ...patch }
  if (next.kind !== old.kind && net.arcs.some((a) => a.place === next.place && a.verb === next.verb && a.kind === next.kind)) return null
  return [{ ...net, arcs: net.arcs.map((a) => (a === old ? next : a)) }, arcRef(next)]
}

export const validateNewId = (net: Net, oldId: string, newId: string): string | undefined => {
  if (newId === oldId) return undefined
  if (!isIdent(newId)) return 'lowercase letters, digits and _ only, starting with a letter'
  if (takenIds(net).has(newId)) return `"${newId}" is already taken`
  return undefined
}

export const renameNode = (net: Net, ref: NodeRef, newId: string): Net => {
  const r = <T extends { id: string }>(n: T) => (n.id === ref.id ? { ...n, id: newId } : n)
  return ref.kind === 'place'
    ? { ...net, places: net.places.map(r), arcs: net.arcs.map((a) => (a.place === ref.id ? { ...a, place: newId } : a)) }
    : { ...net, verbs: net.verbs.map(r), arcs: net.arcs.map((a) => (a.verb === ref.id ? { ...a, verb: newId } : a)) }
}

const SEAT_COLORS = ['#e4572e', '#2e86ab', '#7b2cbf', '#3a9d5d', '#d4a017', '#c2457a', '#4f6d7a']

export const addSeat = (net: Net): Net => {
  const id = uniqueId(takenIds(net), 'seat')
  const color = SEAT_COLORS.find((c) => !net.seats.some((s) => s.color === c)) ?? SEAT_COLORS[net.seats.length % SEAT_COLORS.length]
  return { ...net, seats: [...net.seats, { id, name: `Seat ${id.slice(5)}`, color }] }
}

export const updateSeat = (net: Net, id: string, patch: Partial<Seat>): Net => {
  const newId = patch.id ?? id
  return {
    ...net,
    seats: net.seats.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    verbs: newId === id ? net.verbs : net.verbs.map((v) => (v.by === id ? { ...v, by: newId } : v)),
    places: newId === id ? net.places : net.places.map((p) => (p.seenBy === 'all' ? p : { ...p, seenBy: p.seenBy.map((s) => (s === id ? newId : s)) })),
  }
}

/** A deleted seat's verbs fall to the world rather than vanishing, so no arcs are lost. */
export const deleteSeat = (net: Net, id: string): Net => ({
  ...net,
  seats: net.seats.filter((s) => s.id !== id),
  verbs: net.verbs.map((v) => (v.by === id ? { ...v, by: WORLD } : v)),
  places: net.places.map((p) => (p.seenBy === 'all' ? p : { ...p, seenBy: p.seenBy.filter((s) => s !== id) })),
})

export const addGroup = (net: Net): Net => {
  const id = uniqueId(new Set(net.groups.map((g) => g.id)), 'group')
  return { ...net, groups: [...net.groups, { id, label: `Group ${id.slice(6)}` }] }
}

export const updateGroup = (net: Net, id: string, patch: { id?: string; label?: string }): Net => {
  const newId = patch.id ?? id
  const regroup = <T extends { group?: string }>(n: T) => (n.group === id ? { ...n, group: newId } : n)
  return {
    ...net,
    groups: net.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    places: net.places.map(regroup),
    verbs: net.verbs.map(regroup),
  }
}

export const deleteGroup = (net: Net, id: string): Net => {
  const ungroup = <T extends { group?: string }>(n: T): T => (n.group === id ? { ...n, group: undefined } : n)
  return { ...net, groups: net.groups.filter((g) => g.id !== id), places: net.places.map(ungroup), verbs: net.verbs.map(ungroup) }
}
