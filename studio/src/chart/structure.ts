import { WORLD, type Net } from '../core/model'

/** A set of states that always holds exactly one mark between them: one thing about the world that is always in exactly one way. */
export interface Facet {
  states: string[]
  /** The state that holds the mark at the start. */
  home: string
}

export const fnv = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Weisfeiler-Lehman colors over the design graph. A color sees only what MAPS gives meaning to (marks, outcomes,
 * visibility, speaker kind, priority, weight, arc kind and count), never names, labels, or positions, so two designs
 * that differ only in naming and order get the same colors. `marked` individualizes chosen nodes.
 */
export const wlColors = (net: Net, marked: Map<string, number> = new Map()): Map<string, string> => {
  let color = new Map<string, string>()
  const edges = new Map<string, string[]>()
  const link = (a: string, b: string, tag: string) => {
    edges.set(a, [...(edges.get(a) ?? []), `${tag}>${b}`])
    edges.set(b, [...(edges.get(b) ?? []), `${tag}<${a}`])
  }
  for (const s of net.states)
    color.set(`s:${s.id}`, `state ${s.marks} ${s.ends !== undefined} ${s.seenBy === 'all' ? 'all' : s.seenBy.length}`)
  for (const v of net.verbs) {
    color.set(`v:${v.id}`, v.by === WORLD ? `world ${v.priority} ${v.weight}` : 'seat')
    if (v.by !== WORLD) link(`v:${v.id}`, `p:${v.by}`, 'by')
  }
  for (const p of net.seats) color.set(`p:${p.id}`, 'seat')
  for (const [n, k] of marked) color.set(n, `${color.get(n)} #${k}`)
  for (const a of net.arcs) link(`s:${a.state}`, `v:${a.verb}`, `${a.kind}${a.count}`)
  const classes = (c: Map<string, string>) => new Set(c.values()).size
  for (let r = 0, before = -1; r < 64 && classes(color) !== before; r++) {
    before = classes(color)
    const next = new Map<string, string>()
    for (const [n, c] of color) {
      const around = (edges.get(n) ?? []).map((e) => {
        const at = e.search(/[<>]/)
        return e.slice(0, at + 1) + color.get(e.slice(at + 1))
      })
      next.set(n, fnv(c + '|' + around.sort().join(',')))
    }
    color = next
  }
  return color
}

/**
 * Colors that give every node its own color: refine, then individualize one node of the first tied class and
 * refine again, until no two nodes share a color. The chosen node is arbitrary, but any member of a symmetry
 * class gives the same drawing, so the result is a canonical order that ignores names.
 */
export const canonicalColors = (net: Net): Map<string, string> => {
  const marked = new Map<string, number>()
  for (;;) {
    const color = wlColors(net, marked)
    const byColor = new Map<string, string[]>()
    for (const [n, c] of color) byColor.set(c, [...(byColor.get(c) ?? []), n])
    const tied = [...byColor].filter(([, ns]) => ns.length > 1).sort(([a], [b]) => a.localeCompare(b))[0]
    if (!tied) return color
    marked.set(tied[1].sort()[0], marked.size)
  }
}

/**
 * Every facet of the design: the minimal conservation laws with 0/1 weights whose states hold one mark between them
 * at the start (Farkas's algorithm over the incidence matrix). `need` and `unless` change nothing, so they never
 * break a facet. A state that belongs to no facet is a count.
 */
export const facetsOf = (net: Net): Facet[] => {
  const S = net.states.map((s) => s.id)
  const V = net.verbs.map((v) => v.id)
  const at = new Map(S.map((s, i) => [s, i]))
  const vt = new Map(V.map((v, i) => [v, i]))
  const C = S.map(() => V.map(() => 0))
  for (const a of net.arcs) {
    if (a.kind === 'take') C[at.get(a.state)!][vt.get(a.verb)!] -= a.count
    if (a.kind === 'give') C[at.get(a.state)!][vt.get(a.verb)!] += a.count
  }
  const m0 = net.states.map((s) => s.marks)
  type Row = { y: number[]; c: number[] }
  const value = (r: Row) => r.y.reduce((t, w, i) => t + w * m0[i], 0)
  const fits = (r: Row) => r.y.every((w) => w <= 1) && value(r) <= 1
  let rows: Row[] = S.map((_, i) => ({ y: S.map((_, k) => (k === i ? 1 : 0)), c: [...C[i]] })).filter(fits)
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
  for (let j = 0; j < V.length; j++) {
    const keep = rows.filter((r) => r.c[j] === 0)
    const made: Row[] = []
    for (const p of rows) {
      if (p.c[j] <= 0) continue
      for (const n of rows) {
        if (n.c[j] >= 0) continue
        const a = -n.c[j]
        const b = p.c[j]
        const y = p.y.map((w, k) => a * w + b * n.y[k])
        const c = p.c.map((w, k) => a * w + b * n.c[k])
        const g = [...y, ...c].reduce(gcd, 0) || 1
        const r = { y: y.map((w) => w / g), c: c.map((w) => w / g) }
        if (fits(r)) made.push(r)
      }
    }
    const seen = new Set<string>()
    const all = [...keep, ...made].filter((r) => {
      const k = r.y.join()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    const support = all.map((r) => r.y.map((w) => w > 0))
    rows = all.filter((_, i) =>
      !support.some((o, k) => k !== i && o.every((x, t) => !x || support[i][t]) && o.some((x, t) => x !== support[i][t])),
    )
  }
  return rows
    .filter((r) => value(r) === 1 && r.y.filter((w) => w > 0).length > 1)
    .map((r) => {
      const states = S.filter((_, i) => r.y[i] > 0)
      return { states, home: states.find((s) => m0[at.get(s)!] > 0)! }
    })
}
