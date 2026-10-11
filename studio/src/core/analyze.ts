import { WORLD_LIMIT, compile, fire, whoseTurn, type Compiled } from './engine'
import { WORLD, initialMarking, type Marking, type Net } from './model'

const key = (c: Compiled, m: Marking) => c.net.places.map((p) => m[p.id] ?? 0).join(',')

export interface Node {
  marking: Marking
  outcome?: string
  stalled?: boolean
  /** the world answers forever from here */
  livelock?: boolean
  /** seat choice or world chance outcome -> next settled node keys */
  next: { speaker: string; verb: string; to: string[] }[]
}

export interface Analysis {
  nodes: Map<string, Node>
  root: string[]
  complete: boolean
  outcomes: Map<string, number>
  stalls: string[]
  livelocks: string[]
  /** 'endless' when seats can repeat a position forever; 'unknown' when exploration hit its limit */
  plays: number | 'endless' | 'unknown'
  /** complete plays ending in each outcome; stalled plays are counted under STALLED */
  playsBy: Map<string, number>
  firedVerbs: Set<string>
  deadVerbs: string[]
  maxMarks: Map<string, number>
}

/**
 * Every marking the world can settle into from m, following every chance branch, plus a marking
 * the world can get trapped in: one from which no sequence of world answers ever falls silent.
 */
const settleAll = (c: Compiled, m: Marking, fired: Set<string>): Marking[] => {
  const talking = new Map<string, { m: Marking; next: string[] }>()
  const silent = new Map<string, Marking>()
  const stack = [m]
  while (stack.length) {
    const cur = stack.pop()!
    const k = key(c, cur)
    if (talking.has(k) || silent.has(k)) continue
    if (talking.size >= WORLD_LIMIT) throw new Error(`the world reached ${WORLD_LIMIT} positions answering one move`)
    const turn = whoseTurn(c, cur)
    if (turn.kind !== 'world') {
      silent.set(k, cur)
      continue
    }
    const next: string[] = []
    for (const b of turn.branches) {
      fired.add(b.verb.id)
      const nm = fire(c, cur, b.verb.id)
      next.push(key(c, nm))
      stack.push(nm)
    }
    talking.set(k, { m: cur, next })
  }
  const canStop = new Set(silent.keys())
  for (let grew = true; grew; ) {
    grew = false
    for (const [k, n] of talking)
      if (!canStop.has(k) && n.next.some((x) => canStop.has(x))) {
        canStop.add(k)
        grew = true
      }
  }
  const trapped = [...talking].find(([k]) => !canStop.has(k))?.[1].m
  return trapped ? [...silent.values(), trapped] : [...silent.values()]
}

/** Walk the whole conversation tree. Stops after `limit` positions so unbounded designs still answer. */
export const analyze = (net: Net, limit = 250_000): Analysis => {
  const c = compile(net)
  const fired = new Set<string>()
  const nodes = new Map<string, Node>()
    const visit = (ms: Marking[]) => ms.map((m) => key(c, m))
  const rootMs = settleAll(c, initialMarking(net), fired)
  const queue = [...rootMs]
  const root = visit(rootMs)
  let complete = true
  while (queue.length) {
    const m = queue.pop()!
    const k = key(c, m)
    if (nodes.has(k)) continue
    if (nodes.size >= limit) {
      complete = false
      break
    }
    const turn = whoseTurn(c, m)
    const node: Node = { marking: m, next: [] }
    nodes.set(k, node)
    if (turn.kind === 'over') node.outcome = turn.outcome
    else if (turn.kind === 'stalled') node.stalled = true
    else if (turn.kind === 'world') node.livelock = true
    else if (turn.kind === 'seats')
      for (const [seat, verbs] of turn.choices)
        for (const v of verbs) {
          fired.add(v.id)
          const after = settleAll(c, fire(c, m, v.id), fired)
          node.next.push({ speaker: seat, verb: v.id, to: visit(after) })
          queue.push(...after.filter((a) => !nodes.has(key(c, a))))
        }
  }

  const outcomes = new Map<string, number>()
  const stalls: string[] = []
  const livelocks: string[] = []
  const maxMarks = new Map<string, number>()
  for (const [k, n] of nodes) {
    if (n.outcome !== undefined) outcomes.set(n.outcome, (outcomes.get(n.outcome) ?? 0) + 1)
    if (n.stalled) stalls.push(k)
    if (n.livelock) livelocks.push(k)
    for (const p of net.places) maxMarks.set(p.id, Math.max(maxMarks.get(p.id) ?? 0, n.marking[p.id] ?? 0))
  }

  return {
    nodes,
    root,
    complete,
    outcomes,
    stalls,
    livelocks,
    ...countPlays(nodes, root, complete),
    firedVerbs: fired,
    deadVerbs: complete ? net.verbs.filter((v) => !fired.has(v.id)).map((v) => v.id) : [],
    maxMarks,
  }
}

export const STALLED = 'stalled'
export const LIVELOCK = 'the world never falls silent'

/** Distinct complete plays: sequences of seat choices and chance results that end the game. */
const countPlays = (nodes: Map<string, Node>, root: string[], complete: boolean): Pick<Analysis, 'plays' | 'playsBy'> => {
  if (!complete) return { plays: 'unknown', playsBy: new Map() }
  const memo = new Map<string, Map<string, number>>()
  const onPath = new Set<string>()
  let endless = false
  const add = (into: Map<string, number>, from: Map<string, number>) => {
    for (const [k, v] of from) into.set(k, (into.get(k) ?? 0) + v)
  }
  const go = (k: string): Map<string, number> => {
    if (memo.has(k)) return memo.get(k)!
    if (onPath.has(k)) {
      endless = true
      return new Map()
    }
    const n = nodes.get(k)!
    if (n.outcome !== undefined) return new Map([[n.outcome, 1]])
    if (n.stalled) return new Map([[STALLED, 1]])
    if (n.livelock) return new Map([[LIVELOCK, 1]])
    onPath.add(k)
    const total = new Map<string, number>()
    for (const e of n.next) for (const t of e.to) add(total, go(t))
    onPath.delete(k)
    memo.set(k, total)
    return total
  }
  const playsBy = new Map<string, number>()
  for (const k of root) add(playsBy, go(k))
  if (endless) return { plays: 'endless', playsBy: new Map() }
  return { plays: [...playsBy.values()].reduce((a, b) => a + b, 0), playsBy }
}

export const speakerName = (net: Net, id: string) => (id === WORLD ? 'the world' : (net.seats.find((s) => s.id === id)?.name ?? id))
