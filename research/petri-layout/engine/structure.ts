import type { Net, NodeId } from './net.ts'

// The vocabulary the placement rules are written in, detected from the net alone.

export type Spine = {
  places: NodeId[]
  transitions: NodeId[]
  open: boolean // runs from the environment (a source) to the environment (a sink) instead of closing on itself
  marked: number
}

export type PlaceRole =
  | { kind: 'spine'; spine: number }
  | { kind: 'shared'; spines: number[] } // its transitions lie on two or more spines
  | { kind: 'side'; spine: number } // its transitions all lie on one spine
  | { kind: 'free' } // touches no spine transition

export type Structure = {
  pre: Map<NodeId, Map<NodeId, number>> // transition -> input place -> weight (inhibitors excluded)
  post: Map<NodeId, Map<NodeId, number>>
  spines: Spine[]
  placeRole: Map<NodeId, PlaceRole>
  spineOfTransition: Map<NodeId, number[]>
  selfLoops: { place: NodeId; transition: NodeId }[]
  canon: Map<NodeId, string> // a name-blind, order-blind structural signature per node
}

const ENV = 'ω'

export function analyze(net: Net): Structure {
  const pre = new Map<NodeId, Map<NodeId, number>>()
  const post = new Map<NodeId, Map<NodeId, number>>()
  for (const t of net.transitions) { pre.set(t.id, new Map()); post.set(t.id, new Map()) }
  const placeIds = new Set(net.places.map((p) => p.id))
  for (const a of net.arcs) {
    if (a.inhibitor) continue
    if (placeIds.has(a.from)) pre.get(a.to)!.set(a.from, (pre.get(a.to)!.get(a.from) ?? 0) + a.weight)
    else post.get(a.from)!.set(a.to, (post.get(a.from)!.get(a.to) ?? 0) + a.weight)
  }
  const canon = signatures(net)
  const tokens = new Map(net.places.map((p) => [p.id, p.tokens]))

  // A transition that only produces or only consumes talks to the environment; it does not have to conserve tokens.
  const balanced = net.transitions.map((t) => t.id).filter((t) => pre.get(t)!.size > 0 && post.get(t)!.size > 0)
  const supports = minimalSemiflowSupports(net.places.map((p) => p.id), balanced, pre, post)
  const filled = (p: NodeId) => net.transitions.some((t) => post.get(t.id)!.has(p))
  const drained = (p: NodeId) => net.transitions.some((t) => pre.get(t.id)!.has(p))

  const candidates: Spine[] = []
  for (const places of supports) {
    const set = new Set(places)
    const ts: NodeId[] = []
    let ok = true
    let open = places.some((p) => !filled(p) || !drained(p))
    for (const t of net.transitions) {
      const i = [...pre.get(t.id)!].filter(([p]) => set.has(p))
      const o = [...post.get(t.id)!].filter(([p]) => set.has(p))
      if (i.length === 0 && o.length === 0) continue
      if (i.length > 1 || o.length > 1 || i.some(([, w]) => w !== 1) || o.some(([, w]) => w !== 1)) { ok = false; break }
      if (i.length === 0 || o.length === 0) open = true
      ts.push(t.id)
    }
    if (!ok) continue
    // a lone place that only its own self-loops touch is a condition beside a spine, not a spine
    if (places.length === 1 && ts.every((t) => pre.get(t)!.has(places[0]) && post.get(t)!.has(places[0]))) continue
    candidates.push({ places, transitions: ts, open, marked: places.reduce((n, p) => n + (tokens.get(p) ?? 0), 0) })
  }

  const spines = demoteCouplers(chooseCover(candidates, canon), canon)
  const spineOfTransition = new Map<NodeId, number[]>()
  spines.forEach((s, i) => s.transitions.forEach((t) => spineOfTransition.set(t, [...(spineOfTransition.get(t) ?? []), i])))

  const placeRole = new Map<NodeId, PlaceRole>()
  spines.forEach((s, i) => s.places.forEach((p) => placeRole.set(p, { kind: 'spine', spine: i })))
  for (const p of net.places) {
    if (placeRole.has(p.id)) continue
    const touching = net.transitions.filter((t) => pre.get(t.id)!.has(p.id) || post.get(t.id)!.has(p.id)
      || net.arcs.some((a) => a.inhibitor && a.from === p.id && a.to === t.id))
    const sp = [...new Set(touching.flatMap((t) => spineOfTransition.get(t.id) ?? []))].sort((a, b) => a - b)
    placeRole.set(p.id, sp.length >= 2 ? { kind: 'shared', spines: sp } : sp.length === 1 ? { kind: 'side', spine: sp[0] } : { kind: 'free' })
  }

  const selfLoops = net.transitions.flatMap((t) => [...pre.get(t.id)!.keys()]
    .filter((p) => post.get(t.id)!.has(p)).map((p) => ({ place: p, transition: t.id })))

  return { pre, post, spines, placeRole, spineOfTransition, selfLoops, canon }
}

// Farkas: minimal supports of nonnegative integer y with yC = 0.
function minimalSemiflowSupports(rows: string[], cols: string[], pre: Map<string, Map<string, number>>, post: Map<string, Map<string, number>>): string[][] {
  type Row = { c: number[]; y: number[] }
  const C = rows.map((r) => cols.map((t) => (post.get(t)!.get(r) ?? 0) - (pre.get(t)!.get(r) ?? 0)))
  let D: Row[] = rows.map((_, i) => ({ c: C[i].slice(), y: rows.map((__, j) => (i === j ? 1 : 0)) }))
  const LIMIT = 4000
  for (let j = 0; j < cols.length; j++) {
    const keep = D.filter((r) => r.c[j] === 0)
    const pos = D.filter((r) => r.c[j] > 0)
    const neg = D.filter((r) => r.c[j] < 0)
    for (const a of pos) for (const b of neg) {
      const fa = -b.c[j], fb = a.c[j]
      const y = a.y.map((v, k) => v * fa + b.y[k] * fb)
      const c = a.c.map((v, k) => v * fa + b.c[k] * fb)
      const g = y.reduce(gcd, 0) || 1
      keep.push({ c: c.map((v) => v / g), y: y.map((v) => v / g) })
    }
    const supp = keep.map((r) => r.y.map((v, k) => (v > 0 ? k : -1)).filter((k) => k >= 0))
    D = keep.filter((_, i) => !supp.some((s, k) => k !== i && s.length < supp[i].length && s.every((x) => supp[i].includes(x)))
      && !supp.some((s, k) => k < i && s.length === supp[i].length && s.every((x) => supp[i].includes(x))))
    if (D.length > LIMIT) D = D.slice(0, LIMIT)
  }
  return D.map((r) => r.y.map((v, k) => (v > 0 ? rows[k] : '')).filter(Boolean))
}

function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }

// Pick the spines: the disjoint set of components that covers the most places, then the fewest spines,
// then the most marked. Ties break on structure only, never on names or order.
function chooseCover(cands: Spine[], canon: Map<NodeId, string>): Spine[] {
  const key = (s: Spine) => s.places.map((p) => canon.get(p)!).sort().join('|')
  const sorted = cands.slice().sort((a, b) => b.places.length - a.places.length || b.marked - a.marked || cmp(key(a), key(b)))
  let best: Spine[] = []
  let bestScore = [-1, -1, -1, -Infinity]
  const better = (s: number[]) => { for (let i = 0; i < s.length; i++) if (s[i] !== bestScore[i]) return s[i] > bestScore[i]; return false }
  let steps = 0
  const go = (i: number, chosen: Spine[], used: Set<NodeId>) => {
    if (++steps > 200000) return
    const covered = chosen.reduce((n, s) => n + s.places.length, 0)
    const score = [covered, chosen.filter((s) => s.open).length, chosen.filter((s) => s.marked === 1).length, -chosen.length]
    if (better(score)) { best = chosen.slice(); bestScore = score }
    for (let k = i; k < sorted.length; k++) {
      const s = sorted[k]
      if (s.places.some((p) => used.has(p))) continue
      s.places.forEach((p) => used.add(p))
      chosen.push(s)
      go(k + 1, chosen, used)
      chosen.pop()
      s.places.forEach((p) => used.delete(p))
    }
  }
  go(0, [], new Set())
  return best
}

// A cycle whose every transition already lies on another spine owns no step of its own: it couples
// spines (a buffer's full/empty pair, a pool) and is drawn as shared places, not as a spine.
function demoteCouplers(spines: Spine[], canon: Map<NodeId, string>): Spine[] {
  const key = (s: Spine) => s.places.map((p) => canon.get(p)!).sort().join('|')
  let out = spines.slice()
  for (;;) {
    const owns = (s: Spine) => s.transitions.some((t) => !out.some((o) => o !== s && o.transitions.includes(t)))
    const idle = out.filter((s) => !owns(s))
    if (idle.length === 0 || out.length === 1) return out
    idle.sort((a, b) => b.marked - a.marked || a.places.length - b.places.length || cmp(key(a), key(b)))
    out = out.filter((s) => s !== idle[0])
  }
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

// Weisfeiler-Lehman refinement over kind, tokens, arc weights and directions.
function signatures(net: Net): Map<NodeId, string> {
  const nbr = new Map<NodeId, string[]>()
  const add = (n: NodeId, s: string) => nbr.set(n, [...(nbr.get(n) ?? []), s])
  let sig = new Map<NodeId, string>()
  net.places.forEach((p) => sig.set(p.id, `P${p.tokens}`))
  net.transitions.forEach((t) => sig.set(t.id, 'T'))
  for (let round = 0; round < 6; round++) {
    nbr.clear()
    for (const a of net.arcs) {
      add(a.from, `>${a.weight}${a.inhibitor ? 'i' : ''}:${sig.get(a.to)}`)
      add(a.to, `<${a.weight}${a.inhibitor ? 'i' : ''}:${sig.get(a.from)}`)
    }
    const next = new Map<NodeId, string>()
    for (const [n, s] of sig) next.set(n, hash(s + '[' + (nbr.get(n) ?? []).sort().join(',') + ']'))
    sig = next
  }
  return sig
}

function hash(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193
  for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619); h2 = Math.imul(h2 + s.charCodeAt(i), 2246822519) }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)
}
