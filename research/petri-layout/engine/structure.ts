import type { Net, NodeId } from './net.ts'

export type Spine = {
  places: NodeId[]
  transitions: NodeId[]
  open: boolean
  marked: number
}

export type PlaceRole =
  | { kind: 'spine'; spine: number }
  | { kind: 'shared'; spines: number[] }
  | { kind: 'side'; spine: number }
  | { kind: 'free' }

export type Structure = {
  pre: Map<NodeId, Map<NodeId, number>>
  post: Map<NodeId, Map<NodeId, number>>
  spines: Spine[]
  placeRole: Map<NodeId, PlaceRole>
  spineOfTransition: Map<NodeId, number[]>
  selfLoops: { place: NodeId; transition: NodeId }[]
  canon: Map<NodeId, string>
  shape: Map<NodeId, string>
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

  const throughput = net.transitions.map((t) => t.id).filter((t) => pre.get(t)!.size > 0 && post.get(t)!.size > 0)
  const supports = minimalSemiflowSupports(net.places.map((p) => p.id), throughput, pre, post)
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
    if (places.length === 1 && ts.every((t) => pre.get(t)!.has(places[0]) && post.get(t)!.has(places[0]))) continue
    candidates.push({ places, transitions: ts, open, marked: places.reduce((n, p) => n + (tokens.get(p) ?? 0), 0) })
  }

  const spines = splitCommonStarts(demoteCouplers(chooseCover(candidates, canon, new Set(net.places.filter((p) => p.tokens > 0 && !filled(p.id)).map((p) => p.id))), canon, pre, post), net, pre, post)
  const spineOfTransition = new Map<NodeId, number[]>()
  spines.forEach((s, i) => s.transitions.forEach((t) => spineOfTransition.set(t, [...(spineOfTransition.get(t) ?? []), i])))

  const placeRole = new Map<NodeId, PlaceRole>()
  spines.forEach((s, i) => s.places.forEach((p) => placeRole.set(p, { kind: 'spine', spine: i })))
  for (const p of net.places) {
    if (placeRole.has(p.id)) continue
    const touching = net.transitions.filter((t) => pre.get(t.id)!.has(p.id) || post.get(t.id)!.has(p.id)
      || net.arcs.some((a) => a.inhibitor && a.from === p.id && a.to === t.id))
    const near = (t: NodeId) => spineOfTransition.get(t) ?? [...post.get(t)!.keys(), ...pre.get(t)!.keys()]
      .flatMap((q) => { const r = placeRole.get(q); return r?.kind === 'spine' ? [r.spine] : [] })
    const sp = [...new Set(touching.flatMap((t) => near(t.id)))].sort((a, b) => a - b)
    placeRole.set(p.id, sp.length >= 2 ? { kind: 'shared', spines: sp } : sp.length === 1 ? { kind: 'side', spine: sp[0] } : { kind: 'free' })
  }

  const selfLoops = net.transitions.flatMap((t) => [...pre.get(t.id)!.keys()]
    .filter((p) => post.get(t.id)!.has(p)).map((p) => ({ place: p, transition: t.id })))

  return { pre, post, spines, placeRole, spineOfTransition, selfLoops, canon, shape }
}

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

function demoteCouplers(spines: Spine[], canon: Map<NodeId, string>, pre: Map<NodeId, Map<NodeId, number>>, post: Map<NodeId, Map<NodeId, number>>): Spine[] {
  const key = (s: Spine) => s.places.map((p) => canon.get(p)!).sort().join('|')
  const moves = (o: Spine, t: NodeId) => o.places.some((p) => pre.get(t)!.has(p) !== post.get(t)!.has(p))
  let out = spines.slice()
  for (;;) {
    const owns = (s: Spine) => s.transitions.some((t) => !out.some((o) => o !== s && o.transitions.includes(t) && moves(o, t)))
    const idle = out.filter((s) => !owns(s))
    if (idle.length === 0 || out.length === 1) return out
    idle.sort((a, b) => b.marked - a.marked || a.places.length - b.places.length || cmp(key(a), key(b)))
    out = out.filter((s) => s !== idle[0])
  }
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

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
  returnArcs: { from: NodeId; to: NodeId }[]
  backArcs: { from: NodeId; to: NodeId }[]
}

function laneAnchor(net: Net, s: Structure, spine: Spine): NodeId {
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
  const entered = spine.places.filter((p) => net.transitions.some((t) => !T.has(t.id) && s.post.get(t.id)!.has(p)
    && [...s.pre.get(t.id)!.keys()].some((q) => s.placeRole.get(q)?.kind === 'shared' && (tokens.get(q) ?? 0) > 0))).sort(byKey)
  const choices = spine.places.filter((p) => succ(p).length > 1).sort(byKey)
  const sig = (sp: Spine) => [...sp.places, ...sp.transitions].map((x) => s.shape.get(x)!).sort().join('|')
  const peers = s.spines.filter((o) => sig(o) === sig(spine))
  const votes = new Map<string, number>()
  for (const o of peers) for (const p of o.places) if ((tokens.get(p) ?? 0) > 0) votes.set(s.shape.get(p)!, (votes.get(s.shape.get(p)!) ?? 0) + 1)
  const role = [...votes].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0]
  const peerMarked = peers.length > 1 && role ? spine.places.filter((p) => s.shape.get(p) === role).sort(byKey) : []
  return sourceTs[0] ?? sources[0] ?? peerMarked[0] ?? marked[0] ?? entered[0] ?? choices[0] ?? spine.places.slice().sort(byKey)[0]
}

export function laneOrders(net: Net, s: Structure): LaneOrder[] {
  const key = (n: NodeId) => s.canon.get(n)!
  const byKey = (a: NodeId, b: NodeId) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0)
  const P = s.spines.map((sp) => new Set(sp.places))
  const succ = new Map<NodeId, NodeId[]>()
  s.spines.forEach((sp, i) => {
    for (const t of sp.transitions) {
      for (const p of s.pre.get(t)!.keys()) if (P[i].has(p)) succ.set(p, [...(succ.get(p) ?? []), t])
      for (const p of s.post.get(t)!.keys()) if (P[i].has(p) && !s.pre.get(t)!.has(p)) succ.set(t, [...(succ.get(t) ?? []), p])
    }
  })
  const next = (n: NodeId) => [...new Set(succ.get(n) ?? [])].sort(byKey)
  const anchors = s.spines.map((sp) => laneAnchor(net, s, sp))
  const rank = (i: number) => (s.spines[i].open ? 0 : 1)
  const roots = anchors.map((a, i) => ({ a, i })).sort((x, y) => rank(x.i) - rank(y.i) || byKey(x.a, y.a)).map((x) => x.a)
  const cut = new Set<string>()
  const state = new Map<NodeId, 1 | 2>()
  const visit = (n: NodeId) => {
    state.set(n, 1)
    for (const m of next(n)) {
      if (state.get(m) === 1 || anchors.includes(m)) { cut.add(n + '>' + m); continue }
      if (!state.has(m)) visit(m)
    }
    state.set(n, 2)
  }
  for (const r of roots) if (!state.has(r)) visit(r)
  for (const sp of s.spines) for (const n of [...sp.places, ...sp.transitions].sort(byKey)) if (!state.has(n)) visit(n)
  const preds = new Map<NodeId, NodeId[]>()
  for (const n of state.keys()) for (const m of next(n)) if (!cut.has(n + '>' + m)) preds.set(m, [...(preds.get(m) ?? []), n])
  const row = new Map<NodeId, number>()
  const depth = (n: NodeId): number => {
    if (row.has(n)) return row.get(n)!
    row.set(n, 0)
    const d = Math.max(-1, ...(preds.get(n) ?? []).map(depth)) + 1
    row.set(n, d)
    return d
  }
  for (const n of state.keys()) depth(n)

  return s.spines.map((sp, i) => {
    const nodes = [...sp.places, ...sp.transitions]
    const stage = new Map(nodes.map((n) => [n, row.get(n)!]))
    const first = Math.min(...stage.values())
    const anchor = stage.get(anchors[i]) === first ? anchors[i] : nodes.filter((n) => stage.get(n) === first).sort(byKey)[0]
    const mine = new Set(nodes)
    const returnArcs: LaneOrder['returnArcs'] = [], backArcs: LaneOrder['backArcs'] = []
    for (const n of nodes) for (const m of next(n)) {
      if (!mine.has(m) || !cut.has(n + '>' + m) || !laneArc(s, sp, n, m)) continue
      ;(m === anchor ? returnArcs : backArcs).push({ from: n, to: m })
    }
    return { anchor, stage, returnArcs, backArcs }
  })
}

function laneArc(s: Structure, sp: Spine, a: NodeId, b: NodeId) {
  return sp.places.includes(a) ? sp.transitions.includes(b) && s.pre.get(b)!.has(a) : sp.transitions.includes(a) && sp.places.includes(b) && s.post.get(a)!.has(b)
}

export function laneRing(net: Net, s: Structure): number[] | null {
  const n = s.spines.length
  if (n === 2) return handoffPair(net, s)
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

// Two lanes of one shape that hand tokens to each other through places joining different bars (7.13) are a ring of
// two. A pair of places between the same two bars in opposite directions is one buffer's full and empty halves (3.31),
// and a place taken and given back by both is a resource they compete for (3.28): neither is a ring.
function handoffPair(net: Net, s: Structure): number[] | null {
  const sig = (k: number) => [...s.spines[k].places, ...s.spines[k].transitions].map((x) => s.shape.get(x)!).sort().join('|')
  if (sig(0) !== sig(1)) return null
  const shared = net.places.filter((p) => s.placeRole.get(p.id)!.kind === 'shared').map((p) => p.id)
  const ends = (p: NodeId) => {
    const w = net.transitions.filter((t) => s.post.get(t.id)!.has(p) && !s.pre.get(t.id)!.has(p)).map((t) => t.id)
    const r = net.transitions.filter((t) => s.pre.get(t.id)!.has(p) && !s.post.get(t.id)!.has(p)).map((t) => t.id)
    return w.length === 1 && r.length === 1 ? { w: w[0], r: r[0], from: s.spineOfTransition.get(w[0]) ?? [], to: s.spineOfTransition.get(r[0]) ?? [] } : null
  }
  const hs = shared.map(ends)
  if (!hs.length || hs.some((h) => !h || h.from.length !== 1 || h.to.length !== 1 || h.from[0] === h.to[0])) return null
  const ok = hs as { w: NodeId; r: NodeId; from: number[]; to: number[] }[]
  if (!ok.some((h) => h.from[0] === 0) || !ok.some((h) => h.from[0] === 1)) return null
  if (ok.some((h) => ok.some((k) => k !== h && k.w === h.r && k.r === h.w))) return null
  return [0, 1]
}

// t takes from these places only what it puts back: it reads them
export function readsOnly(s: Structure, t: NodeId, places: Set<NodeId>): boolean {
  return [...s.pre.get(t)!.keys()].filter((p) => places.has(p)).every((p) => s.post.get(t)!.has(p))
}

export function isLoneCycle(net: Net, s: Structure): boolean {
  if (s.spines.length !== 1 || s.spines[0].open) return false
  const sp = s.spines[0]
  return sp.places.length === net.places.length && sp.transitions.length === net.transitions.length
    && sp.places.length >= 2 && sp.transitions.every((t) => s.pre.get(t)!.size === 1 && s.post.get(t)!.size === 1)
}

// one unbranched cycle of three or more places, with only tails hung on it
export function isRingWithTails(s: Structure): boolean {
  if (s.spines.length !== 1 || s.spines[0].open || s.spines[0].places.length < 3) return false
  const sp = s.spines[0]
  return !sp.places.some((p) => sp.transitions.filter((t) => s.pre.get(t)!.has(p) && !s.post.get(t)!.has(p)).length > 1)
}
