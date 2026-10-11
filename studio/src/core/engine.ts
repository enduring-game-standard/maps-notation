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
  for (const { place, kind, count } of c.inputs.get(verb)!) if (kind === 'take') next[place] -= count
  for (const { place, count } of c.outputs.get(verb)!) next[place] = (next[place] ?? 0) + count
  return next
}

export const outcomeOf = (c: Compiled, m: Marking): string | undefined =>
  c.outcomes.find((p) => (m[p.id] ?? 0) > 0)?.ends

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
    return { kind: 'world', branches: tier.map((verb) => ({ verb, p: total ? verb.weight / total : 1 / tier.length })) }
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
    if (said.length >= WORLD_LIMIT) throw new Error('the world never falls silent')
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
