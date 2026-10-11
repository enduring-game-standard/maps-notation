import { WORLD, type Marking, type Net, type Place, type SeatId, type Speaker, type Verb } from './model'

export interface Compiled {
  net: Net
  inputs: Map<string, { place: string; kind: 'take' | 'need' | 'unless'; count: number }[]>
  outputs: Map<string, { place: string; count: number }[]>
  outcomes: Place[]
}

export const compile = (net: Net): Compiled => {
  const inputs: Compiled['inputs'] = new Map(net.verbs.map((v) => [v.id, []]))
  const outputs: Compiled['outputs'] = new Map(net.verbs.map((v) => [v.id, []]))
  for (const a of net.arcs) {
    if (a.kind === 'give') outputs.get(a.verb)?.push({ place: a.place, count: a.count })
    else inputs.get(a.verb)?.push({ place: a.place, kind: a.kind, count: a.count })
  }
  return { net, inputs, outputs, outcomes: net.places.filter((p) => p.ends !== undefined) }
}

export const isEnabled = (c: Compiled, m: Marking, verb: string): boolean =>
  c.inputs.get(verb)!.every(({ place, kind, count }) =>
    kind === 'unless' ? (m[place] ?? 0) < count : (m[place] ?? 0) >= count,
  )

export const fire = (c: Compiled, m: Marking, verb: string): Marking => {
  const next = { ...m }
  for (const { place, kind, count } of c.inputs.get(verb)!) if (kind === 'take') next[place] = (next[place] ?? 0) - count
  for (const { place, count } of c.outputs.get(verb)!) next[place] = (next[place] ?? 0) + count
  return next
}

/** Every marked outcome place counts, so a shared victory is two outcome places marked at once. */
export const outcomeOf = (c: Compiled, m: Marking): string | undefined => {
  const ends = c.outcomes.filter((p) => (m[p.id] ?? 0) > 0).map((p) => p.ends!)
  return ends.length ? ends.join(' and ') : undefined
}

export interface ChanceBranch {
  verb: Verb
  p: number
}

export type Turn =
  | { kind: 'over'; outcome: string }
  | { kind: 'world'; branches: ChanceBranch[] }
  | { kind: 'seats'; choices: Map<SeatId, Verb[]> }
  | { kind: 'stalled' }

/**
 * The conversation: when the world has something to say it speaks first, highest
 * priority first, ties broken by chance in proportion to weight. Only when the
 * world falls silent do the seats get to choose.
 */
export const whoseTurn = (c: Compiled, m: Marking): Turn => {
  const outcome = outcomeOf(c, m)
  if (outcome !== undefined) return { kind: 'over', outcome }
  const enabled = c.net.verbs.filter((v) => isEnabled(c, m, v.id))
  const world = enabled.filter((v) => v.by === WORLD)
  if (world.length) {
    const top = Math.max(...world.map((v) => v.priority))
    const tier = world.filter((v) => v.priority === top)
    const total = tier.reduce((s, v) => s + v.weight, 0)
    return { kind: 'world', branches: tier.map((verb) => ({ verb, p: verb.weight / total })) }
  }
  const choices = new Map<SeatId, Verb[]>()
  for (const v of enabled) choices.set(v.by, [...(choices.get(v.by) ?? []), v])
  return choices.size ? { kind: 'seats', choices } : { kind: 'stalled' }
}

export interface Utterance {
  speaker: Speaker
  verb: string
  p?: number
}

export const WORLD_LIMIT = 10_000

/** Let the world respond until it falls silent. Returns the settled marking and what was said. */
export const settle = (c: Compiled, m: Marking, rand: () => number = Math.random) => {
  const said: Utterance[] = []
  let turn = whoseTurn(c, m)
  while (turn.kind === 'world') {
    if (said.length >= WORLD_LIMIT) throw new Error(`the world answered ${WORLD_LIMIT} times without falling silent`)
    let r = rand()
    const pick = turn.branches.find((b) => (r -= b.p) < 0) ?? turn.branches[turn.branches.length - 1]
    m = fire(c, m, pick.verb.id)
    said.push({ speaker: WORLD, verb: pick.verb.id, p: turn.branches.length > 1 ? pick.p : undefined })
    turn = whoseTurn(c, m)
  }
  return { marking: m, said, turn }
}

export const canSee = (place: Place, seat: SeatId | undefined) =>
  seat === undefined || place.seenBy === 'all' || place.seenBy.includes(seat)

/**
 * What a seat hears of an utterance. Saying a verb is public, but a verb that touches a place
 * the listener cannot see is heard only as "<speaker> acted", so a covered coin stays covered.
 */
export const heardBy = (c: Compiled, u: Utterance, seat: SeatId | undefined): string | undefined => {
  const byId = new Map(c.net.places.map((p) => [p.id, p]))
  const touched = [...c.inputs.get(u.verb)!.map((a) => a.place), ...c.outputs.get(u.verb)!.map((a) => a.place)]
  return touched.every((p) => canSee(byId.get(p)!, seat)) ? u.verb : undefined
}

export type ReplayResult = { ok: true; marking: Marking; turn: Turn } | { ok: false; at: number; reason: string }

/**
 * Check that a transcript is a legal conversation of this net. A RUNS game conforms to a MAPS
 * design when every transcript it produces replays here.
 */
export const replay = (c: Compiled, transcript: Utterance[], start: Marking): ReplayResult => {
  let m = start
  for (const [i, u] of transcript.entries()) {
    const turn = whoseTurn(c, m)
    const legal =
      turn.kind === 'world' ? turn.branches.some((b) => b.verb.id === u.verb) && u.speaker === WORLD
      : turn.kind === 'seats' ? (turn.choices.get(u.speaker) ?? []).some((v) => v.id === u.verb)
      : false
    if (!legal) return { ok: false, at: i, reason: `${u.speaker} cannot say ${u.verb} when the turn is ${turn.kind}` }
    m = fire(c, m, u.verb)
  }
  return { ok: true, marking: m, turn: whoseTurn(c, m) }
}

