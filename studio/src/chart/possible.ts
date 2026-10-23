import type { Marking, Net } from '../core/model'
import { facetsOf } from './structure'

const MANY = 1_000_000

/**
 * The verbs that might ever be said from `start`, tracking each facet's reachable states and each count's range on
 * their own instead of whole positions. That over-approximates play, so a verb missing from the result can never be
 * said; a verb in it may still be impossible when two facets can never line up.
 */
export const possibleVerbs = (net: Net, start: Marking, without: ReadonlySet<string> = new Set()): Set<string> => {
  const facets = facetsOf(net)
  const facetOf = new Map<string, number[]>()
  facets.forEach((f, i) => f.states.forEach((s) => facetOf.set(s, [...(facetOf.get(s) ?? []), i])))
  const reach = new Set(net.states.filter((s) => facetOf.has(s.id) && (start[s.id] ?? 0) > 0).map((s) => s.id))
  const range = new Map(net.states.filter((s) => !facetOf.has(s.id)).map((s) => [s.id, { lo: start[s.id] ?? 0, hi: start[s.id] ?? 0 }]))
  const arcs = new Map(net.verbs.map((v) => [v.id, net.arcs.filter((a) => a.verb === v.id)]))
  const said = new Set<string>()

  const can = (vid: string) =>
    arcs.get(vid)!.every((a) => {
      const r = range.get(a.state)
      if (r) return a.kind === 'unless' ? r.lo < a.count : a.kind === 'give' || r.hi >= a.count
      if (a.kind === 'give') return true
      if (a.kind === 'unless') return facetOf.get(a.state)!.every((fi) => facets[fi].states.some((s) => s !== a.state && reach.has(s)))
      return reach.has(a.state)
    })

  for (let grew = true; grew; ) {
    grew = false
    for (const v of net.verbs) {
      if (without.has(v.id) || !can(v.id)) continue
      if (!said.has(v.id)) {
        said.add(v.id)
        grew = true
      }
      const as = arcs.get(v.id)!
      for (const a of as) {
        const r = range.get(a.state)
        if (!r) {
          if (a.kind === 'give' && !reach.has(a.state)) {
            reach.add(a.state)
            grew = true
          }
          continue
        }
        const cap = as.find((b) => b.state === a.state && b.kind === 'unless')?.count
        const floor = Math.max(...as.filter((b) => b.state === a.state && b.kind !== 'give' && b.kind !== 'unless').map((b) => b.count), 0)
        if (a.kind === 'give') {
          const hi = cap === undefined ? MANY : Math.min(MANY, cap - 1 + a.count)
          if (hi > r.hi) {
            r.hi = hi
            grew = true
          }
        }
        if (a.kind === 'take') {
          const lo = Math.max(0, floor - a.count)
          if (lo < r.lo) {
            r.lo = lo
            grew = true
          }
        }
      }
    }
  }
  return said
}
