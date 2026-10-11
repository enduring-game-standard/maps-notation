import { fire, settle, type Compiled, type Turn, type Utterance } from '../core/engine'
import { type Marking, type SeatId } from '../core/model'

/** One turn of the conversation: what was said (a seat's choice, then the world's replies) and where it left things. */
export interface Step {
  said: Utterance[]
  before: Marking
  marking: Marking
  turn: Turn | { kind: 'broken'; message: string }
}

export interface Game {
  steps: Step[]
  at: number
}

const settled = (c: Compiled, before: Marking, said: Utterance[], m: Marking, rand: () => number): Step => {
  try {
    const r = settle(c, m, rand)
    return { said: [...said, ...r.said], before, marking: r.marking, turn: r.turn }
  } catch (e) {
    return { said, before, marking: m, turn: { kind: 'broken', message: (e as Error).message } }
  }
}

export const startGame = (c: Compiled, m: Marking, rand: () => number = Math.random): Game => ({
  steps: [settled(c, m, [], m, rand)],
  at: 0,
})

export const current = (g: Game) => g.steps[g.at]

export const speak = (c: Compiled, g: Game, verb: string, rand: () => number = Math.random): Game => {
  const now = current(g)
  const v = c.net.verbs.find((x) => x.id === verb)
  if (!v || !legalVerbs(now.turn, undefined).has(verb)) return g
  const step = settled(c, now.marking, [{ speaker: v.by, verb }], fire(c, now.marking, verb), rand)
  return { steps: [...g.steps.slice(0, g.at + 1), step], at: g.at + 1 }
}

export const rewind = (g: Game, at: number): Game => ({ ...g, at: Math.max(0, Math.min(g.steps.length - 1, at)) })

/** Verbs the viewer may say now. The designer (undefined) may speak for any seat. */
export const legalVerbs = (turn: Step['turn'], viewer: SeatId | undefined): Set<string> => {
  if (turn.kind !== 'seats') return new Set()
  const out = new Set<string>()
  for (const [seat, verbs] of turn.choices) if (viewer === undefined || viewer === seat) for (const v of verbs) out.add(v.id)
  return out
}

export const waitingVerbs = (turn: Step['turn']): Set<string> => legalVerbs(turn, undefined)

export const randomMove = (turn: Step['turn'], rand: () => number = Math.random): string | undefined => {
  const all = [...legalVerbs(turn, undefined)]
  return all.length ? all[Math.floor(rand() * all.length)] : undefined
}

/** Each utterance replayed as a marking transition, for animating marks along arcs. */
export const transitions = (c: Compiled, step: Step) => {
  let m = step.before
  return step.said.map((u) => {
    const before = m
    m = fire(c, m, u.verb)
    return { verb: u.verb, before, after: m }
  })
}
