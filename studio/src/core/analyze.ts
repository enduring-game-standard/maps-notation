import { compile, fire, whoseTurn, type Compiled } from './engine'
import { WORLD, initialMarking, type Marking, type Net } from './model'

const key = (c: Compiled, m: Marking) => c.net.places.map((p) => m[p.id] ?? 0).join(',')

export interface Node {
  marking: Marking
  outcome?: string
  stalled?: boolean
  /** seat choice or world chance outcome -> next settled node keys */
  next: { speaker: string; verb: string; to: string[] }[]
}

export interface Analysis {
  nodes: Map<string, Node>
  root: string[]
  complete: boolean
  outcomes: Map<string, number>
  stalls: string[]
  plays: number | 'endless'
  firedVerbs: Set<string>
  deadVerbs: string[]
  maxMarks: Map<string, number>
}

/** Every marking the world can settle into from m, following every chance branch. */
const settleAll = (c: Compiled, m: Marking, fired: Set<string>, budget: { n: number }): Marking[] => {
  const out = new Map<string, Marking>()
  const stack = [m]
  const seen = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    const k = key(c, cur)
    if (seen.has(k)) continue
    seen.add(k)
    if (--budget.n < 0) throw new Error('the world never falls silent')
    const turn = whoseTurn(c, cur)
    if (turn.kind !== 'world') {
      out.set(k, cur)
      continue
    }
    for (const b of turn.branches) {
      fired.add(b.verb.id)
      stack.push(fire(c, cur, b.verb.id))
    }
  }
  return [...out.values()]
}

/** Walk the whole conversation tree. Stops after `limit` positions so unbounded designs still answer. */
export const analyze = (net: Net, limit = 250_000): Analysis => {
  const c = compile(net)
  const fired = new Set<string>()
  const nodes = new Map<string, Node>()
  const budget = { n: limit * 20 }
  const visit = (ms: Marking[]) => ms.map((m) => key(c, m))
  const rootMs = settleAll(c, initialMarking(net), fired, budget)
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
    else if (turn.kind === 'seats')
      for (const [seat, verbs] of turn.choices)
        for (const v of verbs) {
          fired.add(v.id)
          const after = settleAll(c, fire(c, m, v.id), fired, budget)
          node.next.push({ speaker: seat, verb: v.id, to: visit(after) })
          queue.push(...after.filter((a) => !nodes.has(key(c, a))))
        }
  }

  const outcomes = new Map<string, number>()
  const stalls: string[] = []
  const maxMarks = new Map<string, number>()
  for (const [k, n] of nodes) {
    if (n.outcome !== undefined) outcomes.set(n.outcome, (outcomes.get(n.outcome) ?? 0) + 1)
    if (n.stalled) stalls.push(k)
    for (const p of net.places) maxMarks.set(p.id, Math.max(maxMarks.get(p.id) ?? 0, n.marking[p.id] ?? 0))
  }

  return {
    nodes,
    root,
    complete,
    outcomes,
    stalls,
    plays: complete ? countPlays(nodes, root) : 'endless',
    firedVerbs: fired,
    deadVerbs: complete ? net.verbs.filter((v) => !fired.has(v.id)).map((v) => v.id) : [],
    maxMarks,
  }
}

/** Distinct complete plays: sequences of seat choices and chance results that end the game. */
const countPlays = (nodes: Map<string, Node>, root: string[]): number | 'endless' => {
  const memo = new Map<string, number>()
  const onPath = new Set<string>()
  let endless = false
  const go = (k: string): number => {
    if (memo.has(k)) return memo.get(k)!
    if (onPath.has(k)) {
      endless = true
      return 0
    }
    const n = nodes.get(k)!
    if (n.outcome !== undefined || n.stalled) return 1
    onPath.add(k)
    let total = 0
    for (const e of n.next) for (const t of e.to) total += go(t)
    onPath.delete(k)
    memo.set(k, total)
    return total
  }
  const total = root.reduce((s, k) => s + go(k), 0)
  return endless ? 'endless' : total
}

export const speakerName = (net: Net, id: string) => (id === WORLD ? 'the world' : (net.seats.find((s) => s.id === id)?.name ?? id))
