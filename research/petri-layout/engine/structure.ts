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
  shape: Map<NodeId, string> // the same, blind to the marking too
}

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
  const canon = signatures(net, true)
  const shape = signatures(net, false)
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

  const spines = splitCommonStarts(demoteCouplers(chooseCover(candidates, canon, new Set(net.places.filter((p) => p.tokens > 0 && !filled(p.id)).map((p) => p.id))), canon), net, pre, post)
  const spineOfTransition = new Map<NodeId, number[]>()
  spines.forEach((s, i) => s.transitions.forEach((t) => spineOfTransition.set(t, [...(spineOfTransition.get(t) ?? []), i])))

  const placeRole = new Map<NodeId, PlaceRole>()
  spines.forEach((s, i) => s.places.forEach((p) => placeRole.set(p, { kind: 'spine', spine: i })))
  for (const p of net.places) {
    if (placeRole.has(p.id)) continue
    const touching = net.transitions.filter((t) => pre.get(t.id)!.has(p.id) || post.get(t.id)!.has(p.id)
      || net.arcs.some((a) => a.inhibitor && a.from === p.id && a.to === t.id))
    // a transition on no lane (one that starts two lanes from a common start) counts toward the lanes it feeds
    const near = (t: NodeId) => spineOfTransition.get(t) ?? [...post.get(t)!.keys(), ...pre.get(t)!.keys()]
      .flatMap((q) => { const r = placeRole.get(q); return r?.kind === 'spine' ? [r.spine] : [] })
    const sp = [...new Set(touching.flatMap((t) => near(t.id)))].sort((a, b) => a - b)
    placeRole.set(p.id, sp.length >= 2 ? { kind: 'shared', spines: sp } : sp.length === 1 ? { kind: 'side', spine: sp[0] } : { kind: 'free' })
  }

  const selfLoops = net.transitions.flatMap((t) => [...pre.get(t.id)!.keys()]
    .filter((p) => post.get(t.id)!.has(p)).map((p) => ({ place: p, transition: t.id })))

  return { pre, post, spines, placeRole, spineOfTransition, selfLoops, canon, shape }
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
function chooseCover(cands: Spine[], canon: Map<NodeId, string>, starts: Set<NodeId>): Spine[] {
  const key = (s: Spine) => s.places.map((p) => canon.get(p)!).sort().join('|')
  const sorted = cands.slice().sort((a, b) => b.places.length - a.places.length || b.marked - a.marked || cmp(key(a), key(b)))
  let best: Spine[] = []
  let bestScore = [-1, -1, -1, -Infinity, -Infinity]
  const better = (s: number[]) => { for (let i = 0; i < s.length; i++) if (s[i] !== bestScore[i]) return s[i] > bestScore[i]; return false }
  let steps = 0
  const go = (i: number, chosen: Spine[], used: Map<NodeId, number>) => {
    if (++steps > 200000) return
    const shapes = new Set(chosen.map(key)).size
    const score = [used.size, chosen.filter((s) => s.open).length, chosen.filter((s) => s.marked === 1).length, -chosen.length, -shapes]
    if (better(score)) { best = chosen.slice(); bestScore = score }
    for (let k = i; k < sorted.length; k++) {
      const s = sorted[k]
      const overlap = s.places.filter((p) => used.has(p))
      // two lanes may share one place only if it is a start: marked, and never refilled
      if (overlap.length > 1 || (overlap.length === 1 && (!starts.has(overlap[0]) || used.get(overlap[0])! > 1))) continue
      s.places.forEach((p) => used.set(p, (used.get(p) ?? 0) + 1))
      chosen.push(s)
      go(k + 1, chosen, used)
      chosen.pop()
      s.places.forEach((p) => { const n = used.get(p)! - 1; if (n) used.set(p, n); else used.delete(p) })
    }
  }
  go(0, [], new Map())
  return best
}

// A marked place on two lanes is their common start: it leaves both lanes and is drawn between them, and the
// transitions that take from it leave the lanes too (they start both). Each lane keeps the steps that move its own token.
function splitCommonStarts(spines: Spine[], net: Net, pre: Map<NodeId, Map<NodeId, number>>, post: Map<NodeId, Map<NodeId, number>>): Spine[] {
  const count = new Map<NodeId, number>()
  spines.forEach((s) => s.places.forEach((p) => count.set(p, (count.get(p) ?? 0) + 1)))
  const common = new Set([...count].filter(([, n]) => n > 1).map(([p]) => p))
  if (!common.size) return spines
  return spines.map((s) => {
    if (!s.places.some((p) => common.has(p))) return s
    const places = s.places.filter((p) => !common.has(p))
    const P = new Set(places)
    const transitions = s.transitions.filter((t) => {
      const i = [...pre.get(t)!.keys()], o = [...post.get(t)!.keys()]
      if (i.some((p) => common.has(p))) return false
      return i.some((p) => P.has(p)) || o.some((p) => P.has(p))
    })
    const open = places.some((p) => !transitions.some((t) => post.get(t)!.has(p)) || !transitions.some((t) => pre.get(t)!.has(p)))
    return { places, transitions, open, marked: places.reduce((n, p) => n + (net.places.find((q) => q.id === p)!.tokens), 0) }
  })
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
function signatures(net: Net, withTokens: boolean): Map<NodeId, string> {
  const nbr = new Map<NodeId, string[]>()
  const add = (n: NodeId, s: string) => nbr.set(n, [...(nbr.get(n) ?? []), s])
  let sig = new Map<NodeId, string>()
  net.places.forEach((p) => sig.set(p.id, withTokens ? `P${p.tokens}` : 'P'))
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

export type LaneOrder = {
  anchor: NodeId
  stage: Map<NodeId, number>
  returnArcs: { from: NodeId; to: NodeId }[] // close the cycle into the anchor (R7)
  backArcs: { from: NodeId; to: NodeId }[] // jump back to an earlier node other than the anchor (R14)
}

// Cut a lane open at its anchor (R2) and number its nodes by the longest forward path from it, so a choice's branches
// share stages and their merge comes after the longer branch (R10).
export function laneOrder(net: Net, s: Structure, spine: Spine): LaneOrder {
  const P = new Set(spine.places), T = new Set(spine.transitions)
  const tokens = new Map(net.places.map((p) => [p.id, p.tokens]))
  const inLane = (t: NodeId) => [...s.pre.get(t)!.keys()].filter((p) => P.has(p))
  const outLane = (t: NodeId) => [...s.post.get(t)!.keys()].filter((p) => P.has(p))
  const key = (n: NodeId) => s.canon.get(n)!
  const byKey = (a: NodeId, b: NodeId) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)
  const succ = (n: NodeId) => (P.has(n) ? spine.transitions.filter((t) => inLane(t).includes(n)) : outLane(n)).sort(byKey)
  const filledInLane = (p: NodeId) => spine.transitions.some((t) => outLane(t).includes(p))
  const most = (a: NodeId, b: NodeId) => (tokens.get(b) ?? 0) - (tokens.get(a) ?? 0) || byKey(a, b)

  const sourceTs = spine.transitions.filter((t) => inLane(t).length === 0).sort(byKey)
  const sources = spine.places.filter((p) => !filledInLane(p)).sort(most)
  const marked = spine.places.filter((p) => (tokens.get(p) ?? 0) > 0).sort(most)
  // a lane cut off from a common start begins where that start feeds it
  const entered = spine.places.filter((p) => net.transitions.some((t) => !T.has(t.id) && s.post.get(t.id)!.has(p)
    && [...s.pre.get(t.id)!.keys()].some((q) => s.placeRole.get(q)?.kind === 'shared' && (tokens.get(q) ?? 0) > 0))).sort(byKey)
  const choices = spine.places.filter((p) => succ(p).length > 1).sort(byKey)
  // R6: lanes of one shape start at the same role, the one most of them hold their token in
  const sig = (sp: Spine) => [...sp.places, ...sp.transitions].map((x) => s.shape.get(x)!).sort().join('|')
  const peers = s.spines.filter((o) => sig(o) === sig(spine))
  const votes = new Map<string, number>()
  for (const o of peers) for (const p of o.places) if ((tokens.get(p) ?? 0) > 0) votes.set(s.shape.get(p)!, (votes.get(s.shape.get(p)!) ?? 0) + 1)
  const role = [...votes].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0]
  const peerMarked = peers.length > 1 && role ? spine.places.filter((p) => s.shape.get(p) === role).sort(byKey) : []
  const anchor = sourceTs[0] ?? sources[0] ?? peerMarked[0] ?? marked[0] ?? entered[0] ?? choices[0] ?? spine.places.slice().sort(byKey)[0]

  const returnArcs: LaneOrder['returnArcs'] = [], backArcs: LaneOrder['backArcs'] = []
  const back = new Set<string>()
  const state = new Map<NodeId, 1 | 2>()
  const visit = (n: NodeId) => {
    state.set(n, 1)
    for (const m of succ(n)) {
      if (m === anchor) { returnArcs.push({ from: n, to: m }); back.add(n + '>' + m); continue }
      if (state.get(m) === 1) { backArcs.push({ from: n, to: m }); back.add(n + '>' + m); continue }
      if (!state.has(m)) visit(m)
    }
    state.set(n, 2)
  }
  visit(anchor)
  // nodes the anchor cannot reach (a second entry) hang from their own entry
  for (const n of [...sourceTs, ...sources, ...spine.places, ...spine.transitions]) if (!state.has(n)) visit(n)
  const stage = new Map<NodeId, number>()
  const preds = new Map<NodeId, NodeId[]>()
  for (const n of state.keys()) for (const m of succ(n)) if (!back.has(n + '>' + m)) preds.set(m, [...(preds.get(m) ?? []), n])
  const depth = (n: NodeId): number => {
    if (stage.has(n)) return stage.get(n)!
    stage.set(n, 0)
    const d = Math.max(-1, ...(preds.get(n) ?? []).map(depth)) + 1
    stage.set(n, d)
    return d
  }
  for (const n of state.keys()) depth(n)
  return { anchor, stage, returnArcs, backArcs }
}

// R5: three or more lanes of one shape, each sharing places with exactly its two neighbors, form a ring.
// Returns the lanes in ring order, or null.
export function laneRing(net: Net, s: Structure): number[] | null {
  const n = s.spines.length
  if (n < 3) return null
  const sig = (k: number) => [...s.spines[k].places, ...s.spines[k].transitions].map((x) => s.shape.get(x)!).sort().join('|')
  if (new Set(s.spines.map((_, k) => sig(k))).size !== 1) return null
  const nb = new Map<number, Set<number>>()
  for (const p of net.places) {
    const r = s.placeRole.get(p.id)!
    if (r.kind !== 'shared') continue
    if (r.spines.length !== 2) return null
    const [a, b] = r.spines
    nb.set(a, (nb.get(a) ?? new Set()).add(b)); nb.set(b, (nb.get(b) ?? new Set()).add(a))
  }
  if ([...Array(n).keys()].some((k) => nb.get(k)?.size !== 2)) return null
  const order = [0]
  while (order.length < n) {
    const next = [...nb.get(order[order.length - 1])!].find((k) => !order.includes(k))
    if (next === undefined) return null
    order.push(next)
  }
  return nb.get(order[n - 1])!.has(0) ? order : null
}
