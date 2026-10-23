// PROTOTYPE. The `spines` convention: one straight spine per entity, in the idiom of the dining philosophers Petri figure.
import { arcKey, type Design, type Drawing, type Element, type Net, type Pt } from '../../harness/contract'

type Arc = Net['arcs'][number]
type Verb = Net['verbs'][number]
type State = Net['states'][number]

const HALF = 52 // vertical distance between a state row and the verb row below it
const R = 12 // state radius
const BAR_H = 5
const CHAR = 6.1 // average glyph width at 11px
const LANE = 11 // spacing between nested return sweeps
const GAP = 34 // clear space between neighbouring spines
const WRAP = 20 // characters per label line

const wrap = (s: string, n = WRAP): string[] => {
  const out: string[] = []
  let line = ''
  for (const w of s.split(/\s+/)) {
    if (line && (line + ' ' + w).length > n) { out.push(line); line = w } else line = line ? line + ' ' + w : w
  }
  if (line) out.push(line)
  return out.length ? out : ['']
}
const textW = (lines: string[]) => Math.max(...lines.map((l) => l.length)) * CHAR
const natural = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const f1 = (n: number) => Math.round(n * 10) / 10

/** Structural order of every node: colour refinement over the net, then label, then id. Only the last two see names. */
function canonicalOrder(net: Net): Map<string, number> {
  const seatIx = new Map(net.seats.map((s, i) => [s.id, i]))
  let color = new Map<string, string>()
  for (const s of net.states) color.set(s.id, `s|${s.marks}|${s.ends ? 1 : 0}|${s.seenBy === 'all' ? 'a' : s.seenBy.length}`)
  for (const v of net.verbs) color.set(v.id, `v|${v.by === 'world' ? 'w' : seatIx.get(v.by)}|${v.by === 'world' ? v.priority : 0}|${v.by === 'world' ? v.weight : 0}`)
  const nb = new Map<string, [string, string][]>()
  for (const id of color.keys()) nb.set(id, [])
  for (const a of net.arcs) {
    nb.get(a.state)!.push([`${a.kind}${a.count}>`, a.verb])
    nb.get(a.verb)!.push([`${a.kind}${a.count}<`, a.state])
  }
  let classes = new Set(color.values()).size
  for (let round = 0; round < 40; round++) {
    const raw = new Map<string, string>()
    for (const [id, c] of color) raw.set(id, c + '(' + nb.get(id)!.map(([k, o]) => k + color.get(o)).sort().join(',') + ')')
    const uniq = [...new Set(raw.values())].sort()
    const ix = new Map(uniq.map((u, i) => [u, String(i)]))
    const next = new Map([...raw].map(([id, r]) => [id, ix.get(r)!]))
    const n = uniq.length
    color = next
    if (n === classes) break
    classes = n
  }
  const label = new Map<string, string>([...net.states.map((s) => [s.id, s.label] as const), ...net.verbs.map((v) => [v.id, v.label] as const)])
  const ids = [...color.keys()].sort((a, b) => Number(color.get(a)) - Number(color.get(b)) || natural(label.get(a)!, label.get(b)!) || (a < b ? -1 : a > b ? 1 : 0))
  return new Map(ids.map((id, i) => [id, i]))
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

/** Minimal semi-positive place invariants (Farkas). Each binary one holding one mark is an entity: always in exactly one of its states. */
function invariants(net: Net): number[][] {
  const S = net.states.length, V = net.verbs.length
  const si = new Map(net.states.map((s, i) => [s.id, i])), vi = new Map(net.verbs.map((v, i) => [v.id, i]))
  type Row = { c: number[]; y: number[]; sup: bigint }
  let rows: Row[] = net.states.map((_, i) => ({ c: new Array(V).fill(0), y: net.states.map((_, k) => (k === i ? 1 : 0)), sup: 1n << BigInt(i) }))
  for (const a of net.arcs) {
    if (a.kind === 'take') rows[si.get(a.state)!].c[vi.get(a.verb)!] -= a.count
    if (a.kind === 'give') rows[si.get(a.state)!].c[vi.get(a.verb)!] += a.count
  }
  const minimal = (rs: Row[]) => rs.filter((r, i) => !rs.some((q, j) => j !== i && (q.sup & r.sup) === q.sup && (q.sup !== r.sup || j < i)))
  for (let j = 0; j < V; j++) {
    const keep = rows.filter((r) => r.c[j] === 0)
    const pos = rows.filter((r) => r.c[j] > 0), neg = rows.filter((r) => r.c[j] < 0)
    for (const p of pos) for (const q of neg) {
      const a = -q.c[j], b = p.c[j]
      const y = p.y.map((v, k) => a * v + b * q.y[k])
      const g = y.reduce((m, v) => gcd(m, v), 0) || 1
      keep.push({ c: p.c.map((v, k) => (a * v + b * q.c[k]) / g), y: y.map((v) => v / g), sup: p.sup | q.sup })
    }
    rows = minimal(keep)
    if (rows.length > 3000) return []
  }
  return rows.map((r) => r.y)
}

interface Spine { states: string[]; verbs: string[] }
const lex = (a: number[], b: number[]) => { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]; return a.length - b.length }

/** Entities from invariants; leftover states joined by verbs that move no entity become pseudo-spines; the rest are free. */
function decompose(net: Net, order: Map<string, number>) {
  const marks = new Map(net.states.map((s) => [s.id, s.marks]))
  const cands = invariants(net)
    .filter((y) => y.every((v) => v === 0 || v === 1))
    .map((y) => net.states.filter((_, i) => y[i]).map((s) => s.id).sort((a, b) => order.get(a)! - order.get(b)!))
    .filter((ss) => ss.length >= 2 && ss.reduce((m, s) => m + marks.get(s)!, 0) === 1)
    .sort((a, b) => a.length - b.length || lex(a.map((x) => order.get(x)!), b.map((x) => order.get(x)!)))
  const claimed = new Set<string>()
  const entities: string[][] = []
  for (const c of cands) {
    const rest = c.filter((s) => !claimed.has(s))
    if (rest.length < 2) continue
    rest.forEach((s) => claimed.add(s))
    entities.push(rest)
  }
  const entityOf = new Map<string, number>()
  entities.forEach((e, i) => e.forEach((s) => entityOf.set(s, i)))
  const home = new Map<string, number>()
  for (const v of net.verbs) {
    const moves = entities.map((_, i) => i).filter((i) =>
      net.arcs.some((a) => a.verb === v.id && a.kind === 'take' && entityOf.get(a.state) === i) &&
      net.arcs.some((a) => a.verb === v.id && a.kind === 'give' && entityOf.get(a.state) === i))
    moves.sort((a, b) => entities[a].length - entities[b].length || a - b)
    if (moves.length) home.set(v.id, moves[0])
  }
  const spines: Spine[] = entities.map((states, i) => ({ states, verbs: net.verbs.filter((v) => home.get(v.id) === i).map((v) => v.id) }))
  // Leftovers: union states not in an entity with verbs that have no home, through take and give arcs.
  const parent = new Map<string, string>()
  const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!))
  const loose = [...net.states.filter((s) => !entityOf.has(s.id)).map((s) => s.id), ...net.verbs.filter((v) => !home.has(v.id)).map((v) => v.id)]
  loose.forEach((x) => parent.set(x, x))
  for (const a of net.arcs) if ((a.kind === 'take' || a.kind === 'give') && parent.has(a.state) && parent.has(a.verb)) parent.set(find(a.state), find(a.verb))
  const comps = new Map<string, string[]>()
  for (const x of loose) { const r = find(x); comps.set(r, [...(comps.get(r) ?? []), x]) }
  const isState = new Set(net.states.map((s) => s.id))
  const free: string[] = []
  const pseudo: Spine[] = []
  for (const members of comps.values()) {
    const ss = members.filter((m) => isState.has(m)), vs = members.filter((m) => !isState.has(m))
    if (ss.length >= 2) pseudo.push({ states: ss.sort((a, b) => order.get(a)! - order.get(b)!), verbs: vs })
    else free.push(...members)
  }
  pseudo.sort((a, b) => order.get(a.states[0])! - order.get(b.states[0])!)
  return { spines: [...spines, ...pseudo], entityCount: spines.length, free: free.sort((a, b) => order.get(a)! - order.get(b)!) }
}

interface Node { id: string; kind: 'state' | 'verb'; x: number; y: number; w: number; h: number }

export function layout(net: Net, without: string[] = []) {
  const order = canonicalOrder(net)
  const byOrder = (a: string, b: string) => order.get(a)! - order.get(b)!
  const states = new Map(net.states.map((s) => [s.id, s])), verbs = new Map(net.verbs.map((v) => [v.id, v]))
  const arcsOf = (v: string) => net.arcs.filter((a) => a.verb === v)
  const { spines, free, entityCount } = decompose(net, order)
  const stateLines = (s: State) => wrap(s.ends ? s.ends : s.label)
  const verbLines = (v: Verb) => wrap(v.label + (v.by === 'world' && v.weight > 1 && !without.includes('weight') ? ` ×${v.weight}` : ''))
  const prioW = (v: Verb) => (v.by === 'world' && !without.includes('priority') ? String(v.priority).length * CHAR + 4 : 0)
  const inputs = (v: string) => arcsOf(v).filter((a) => a.kind !== 'give').length
  const outputs = (v: string) => arcsOf(v).filter((a) => a.kind === 'give').length
  const barW = (v: string) => Math.max(28, 9 * Math.max(inputs(v), outputs(v)) + 6)
  const sExt = (id: string) => ({ l: R + 6 + textW(stateLines(states.get(id)!)), r: R + 4 })
  const vExt = (id: string) => ({ l: barW(id) / 2 + prioW(verbs.get(id)!) + 2, r: barW(id) / 2 + 6 + textW(verbLines(verbs.get(id)!)) })

  // Local layout of one spine: rows are half-steps (even = states, odd = verbs), x in px about the spine's left edge.
  interface Local { x: Map<string, number>; row: Map<string, number>; back: Map<string, { lane: number; laneX: number; to: Set<string>; far: Set<string> }>; skip: Map<string, { laneX: number; to: Set<string> }>; left: number; right: number }
  function layoutSpine(sp: Spine): Local {
    const inS = new Set(sp.states)
    const S = (v: string) => arcsOf(v).filter((a) => a.kind === 'take' && inS.has(a.state)).map((a) => a.state).sort(byOrder)
    const T = (v: string) => arcsOf(v).filter((a) => a.kind === 'give' && inS.has(a.state)).map((a) => a.state).sort(byOrder)
    const succ = new Map<string, string[]>(sp.states.map((s) => [s, []]))
    for (const v of [...verbs.keys()].sort(byOrder)) for (const s of S(v)) for (const t of T(v)) if (!succ.get(s)!.includes(t)) succ.get(s)!.push(t)
    for (const l of succ.values()) l.sort(byOrder)
    // Rows: walk forward from the starting state; a move to a state already on the walk is a return. Each state sits at its longest walk.
    const marked = sp.states.filter((s) => states.get(s)!.marks > 0)
    const sourced = sp.verbs.filter((v) => !S(v).length).flatMap(T).sort(byOrder)
    const starts = marked.length ? marked : sourced.length ? [sourced[0]] : [sp.states[0]]
    const backEdge = new Set<string>(), seen = new Map<string, number>(), post: string[] = []
    const dfs = (s: string) => {
      seen.set(s, 1)
      for (const t of succ.get(s)!) { if (seen.get(t) === 1) backEdge.add(s + '>' + t); else if (!seen.has(t)) dfs(t) }
      seen.set(s, 2); post.push(s)
    }
    for (const s of [...starts, ...sp.states]) if (!seen.has(s)) dfs(s)
    const rank = new Map<string, number>()
    for (const s of [...post].reverse()) {
      if (!rank.has(s)) rank.set(s, 0)
      for (const t of succ.get(s)!) if (!backEdge.has(s + '>' + t)) rank.set(t, Math.max(rank.get(t) ?? 0, rank.get(s)! + 1))
    }
    const roots: string[] = [], children = new Map<string, string[]>(sp.states.map((s) => [s, []]))
    for (const t of sp.states) {
      const p = sp.states.find((s) => rank.get(s) === rank.get(t)! - 1 && succ.get(s)!.includes(t) && !backEdge.has(s + '>' + t))
      if (p) children.get(p)!.push(t); else roots.push(t)
    }
    // Classify each verb on the spine and pick the state it hangs beside.
    const parentOf = new Map<string, string>()
    for (const [p, ch] of children) ch.forEach((c) => parentOf.set(c, p))
    const lineage = (s: string) => { const out = new Set<string>(); for (let c: string | undefined = s; c; c = parentOf.get(c)) out.add(c); return out }
    const row = new Map<string, number>(), anchor = new Map<string, string>(), sweeps = new Map<string, Set<string>>()
    const multi = new Set<string>(), skipTo = new Map<string, Set<string>>()
    for (const s of sp.states) row.set(s, 2 * rank.get(s)!)
    for (const v of sp.verbs) {
      const s = S(v), t = T(v)
      const maxS = Math.max(...s.map((x) => rank.get(x)!)), minT = Math.min(...t.map((x) => rank.get(x)!))
      if (s.length && t.length && minT === maxS + 1) { row.set(v, 2 * maxS + 1); anchor.set(v, t[0]); if (t.length > 1) multi.add(v) }
      else if (!s.length) { row.set(v, 2 * minT - 1); anchor.set(v, t[0]); if (t.length > 1) multi.add(v) }
      else {
        row.set(v, 2 * maxS + 1); anchor.set(v, s[s.length - 1])
        const up = lineage(s[s.length - 1]), sw = new Set(t.filter((q) => up.has(q)))
        if (sw.size) sweeps.set(v, sw)
      }
    }
    for (const v of sp.verbs) { const down = new Set(T(v).filter((q) => row.get(q)! > row.get(v)! + 1)); if (down.size) skipTo.set(v, down) }
    const column = new Map<string, string>()
    const setCol = (s: string, c: string) => { column.set(s, c); const ch = children.get(s)!; ch.forEach((k) => setCol(k, ch.length === 1 ? c : k)) }
    roots.sort(byOrder).forEach((r) => setCol(r, r))
    const group = new Map<string, string[]>()
    for (const v of [...sp.verbs].sort(byOrder)) { const k = column.get(anchor.get(v)!)! + '@' + row.get(v); group.set(k, [...(group.get(k) ?? []), v]) }
    const skipCol = new Map<string, Set<string>>()
    for (const [v, ts] of skipTo) { const c = column.get(anchor.get(v)!)!, same = new Set([...ts].filter((t) => column.get(t) === c)); if (same.size) skipCol.set(v, same) }
    const leftLanes = new Map<string, number>()
    for (const v of skipCol.keys()) { const c = column.get(anchor.get(v)!)!; leftLanes.set(c, (leftLanes.get(c) ?? 0) + 1) }
    // In a row of parallel bars, the bar that continues the spine sits on it; skips go to its left, everything else to its right.
    const arrange = (vs: string[]) => {
      const center = vs.find((v) => !skipCol.has(v) && !sweeps.has(v)) ?? vs.find((v) => !skipCol.has(v))
      return { left: vs.filter((v) => skipCol.has(v)), center, right: vs.filter((v) => v !== center && !skipCol.has(v)) }
    }
    const spread = (vs: string[]) => {
      const g = arrange(vs), wd = (v: string) => vExt(v).l + vExt(v).r + 14
      const cl = g.center ? vExt(g.center).l : 0, cr = g.center ? vExt(g.center).r : -7
      return { l: cl + g.left.reduce((m, v) => m + wd(v), 0), r: cr + 14 + g.right.reduce((m, v) => m + wd(v), 0) }
    }
    const ext = (s: string, lanes: number) => {
      let l = sExt(s).l, r = sExt(s).r
      for (const [k, vs] of group) {
        const [c, rw] = [k.slice(0, k.lastIndexOf('@')), Number(k.slice(k.lastIndexOf('@') + 1))]
        if (c === column.get(s) && Math.abs(rw - row.get(s)!) === 1) { const g = spread(vs); l = Math.max(l, g.l); r = Math.max(r, g.r) }
      }
      return { l: l + (leftLanes.get(column.get(s)!) ?? 0) * LANE, r: r + lanes * LANE }
    }
    // Lanes for returns: every return in a column sweeps around that column's right side.
    const colLanes = new Map<string, number>()
    for (const v of sweeps.keys()) { const c = column.get(anchor.get(v)!)!; colLanes.set(c, (colLanes.get(c) ?? 0) + 1) }
    const width = new Map<string, number>(), x = new Map<string, number>()
    const own = (s: string) => ext(s, colLanes.get(column.get(s)!) ?? 0)
    const block = (s: string): number => {
      const ch = children.get(s)!.sort(byOrder)
      const o = own(s), mine = o.l + o.r + GAP / 2
      const sum = ch.reduce((m, c) => m + block(c), 0)
      width.set(s, Math.max(mine, sum))
      return width.get(s)!
    }
    const place = (s: string, a: number) => {
      const ch = children.get(s)!, W = width.get(s)!, o = own(s)
      if (!ch.length) { x.set(s, a + (W - (o.l + o.r)) / 2 + o.l); return }
      const sum = ch.reduce((m, c) => m + width.get(c)!, 0)
      let cur = a + (W - sum) / 2
      for (const c of ch) { place(c, cur); cur += width.get(c)! }
      x.set(s, ch.length === 1 ? x.get(ch[0])! : (x.get(ch[0])! + x.get(ch[ch.length - 1])!) / 2)
    }
    let cur = 0
    for (const r of roots) { block(r); place(r, cur); cur += width.get(r)! }
    // Verbs: a group of parallel bars spreads side by side, centered on its column's axis.
    for (const vs of group.values()) {
      const tx = (v: string) => { const t = T(v); return multi.has(v) ? t.reduce((m, q) => m + x.get(q)!, 0) / t.length : x.get(anchor.get(v)!)! }
      const g = arrange(vs), ax = tx(g.center ?? vs[0])
      if (g.center) x.set(g.center, ax)
      let c = ax + (g.center ? vExt(g.center).r + 14 : 0)
      for (const v of g.right) { c += vExt(v).l; x.set(v, c); c += vExt(v).r + 14 }
      c = ax - (g.center ? vExt(g.center).l + 14 : 0)
      for (const v of [...g.left].reverse()) { c -= vExt(v).r; x.set(v, c); c -= vExt(v).l + 14 }
    }
    const back = new Map<string, { lane: number; laneX: number; to: Set<string>; far: Set<string> }>()
    const byCol = new Map<string, string[]>()
    for (const v of sweeps.keys()) { const c = column.get(anchor.get(v)!)!; byCol.set(c, [...(byCol.get(c) ?? []), v]) }
    let right = 0, left = Infinity
    for (const id of [...sp.states, ...sp.verbs]) {
      const e = states.has(id) ? sExt(id) : vExt(id)
      right = Math.max(right, x.get(id)! + e.r); left = Math.min(left, x.get(id)! - e.l)
    }
    for (const [c, vs] of byCol) {
      const span = (v: string) => row.get(v)! - Math.min(...[...sweeps.get(v)!].map((t) => row.get(t)!))
      vs.sort((a, b) => span(a) - span(b) || byOrder(a, b))
      const members = [...sp.states, ...sp.verbs].filter((id) => (states.has(id) ? column.get(id) : column.get(anchor.get(id)!)) === c)
      const base = Math.max(...members.map((id) => x.get(id)! + (states.has(id) ? sExt(id) : vExt(id)).r)) + 8
      vs.forEach((v, i) => { back.set(v, { lane: i, laneX: base + i * LANE, to: sweeps.get(v)!, far: new Set([...sweeps.get(v)!].filter((t) => column.get(t) !== c)) }); right = Math.max(right, base + i * LANE + 6) })
    }
    const skip = new Map<string, { laneX: number; to: Set<string> }>()
    const skipByCol = new Map<string, string[]>()
    for (const v of skipCol.keys()) { const c = column.get(anchor.get(v)!)!; skipByCol.set(c, [...(skipByCol.get(c) ?? []), v]) }
    for (const [c, vs] of skipByCol) {
      const span = (v: string) => Math.max(...[...skipCol.get(v)!].map((t) => row.get(t)!)) - row.get(v)!
      vs.sort((a, b) => span(a) - span(b) || byOrder(a, b))
      const members = [...sp.states, ...sp.verbs].filter((id) => (states.has(id) ? column.get(id) : column.get(anchor.get(id)!)) === c)
      const base = Math.min(...members.map((id) => x.get(id)! - (states.has(id) ? sExt(id) : vExt(id)).l)) - 8
      vs.forEach((v, i) => { skip.set(v, { laneX: base - i * LANE, to: skipCol.get(v)! }); left = Math.min(left, base - i * LANE - 6) })
    }
    return { x, row, back, skip, left, right }
  }

  const locals = spines.map(layoutSpine)
  // Order spines left to right: the most coupled first, each next beside the end it couples with most.
  const spineOf = new Map<string, number>()
  spines.forEach((sp, i) => [...sp.states, ...sp.verbs].forEach((id) => spineOf.set(id, i)))
  const couple = (i: number, j: number) => net.arcs.filter((a) => { const p = spineOf.get(a.state), q = spineOf.get(a.verb); return (p === i && q === j) || (p === j && q === i) }).length
    + free.filter((f) => { const touch = new Set(net.arcs.filter((a) => a.state === f || a.verb === f).map((a) => spineOf.get(a.state === f ? a.verb : a.state))); return touch.has(i) && touch.has(j) }).length
  const total = (i: number) => spines.reduce((m, _, j) => (j === i ? m : m + couple(i, j)), 0)
  // Entities first: the most coupled, then each next beside the end it couples with most.
  const seq: number[] = []
  const ents = spines.map((_, i) => i).filter((i) => i < entityCount)
  if (ents.length) {
    seq.push([...ents].sort((a, b) => total(b) - total(a) || a - b)[0])
    while (seq.length < ents.length) {
      const rest = ents.filter((i) => !seq.includes(i))
      const toPlaced = (i: number) => seq.reduce((m, j) => m + couple(i, j), 0)
      const nxt = rest.sort((a, b) => toPlaced(b) - toPlaced(a) || total(b) - total(a) || a - b)[0]
      if (couple(nxt, seq[0]) > couple(nxt, seq[seq.length - 1])) seq.unshift(nxt); else seq.push(nxt)
    }
  }
  // Then each non-entity spine (a clock, a shared process) goes into the slot between the entities it couples most.
  for (let i = entityCount; i < spines.length; i++) {
    let best = seq.length, bw = -1
    for (let k = 0; k <= seq.length; k++) {
      const w = (k > 0 ? couple(i, seq[k - 1]) : 0) + (k < seq.length ? couple(i, seq[k]) : 0) + (k > 0 && k < seq.length ? 0.5 : 0)
      if (w > bw) { bw = w; best = k }
    }
    seq.splice(best, 0, i)
  }
  const minRow = Math.min(0, ...locals.flatMap((l) => [...l.row.values()]))
  const maxRow = (i: number) => Math.max(...locals[i].row.values())
  const TOP = 46
  // Blocks: each tall spine stands alone; a run of short spines (half the tallest or less) stacks into a grid as tall as the tallest.
  const spineH = (i: number) => (maxRow(i) - Math.min(...locals[i].row.values()) + 2) * HALF
  const spineW = (i: number) => locals[i].right - locals[i].left + GAP
  const tallest = Math.max(1, ...seq.map(spineH))
  // Short spines with the same drawn shape (the same capability schema) gather into one grid, where the first of them stands.
  const shape = (i: number) => { const l = locals[i]; return [...l.row.keys()].map((id) => `${l.row.get(id)},${Math.round(l.x.get(id)! - l.left)},${states.has(id) ? 's' : 'v'}`).sort().join(';') }
  const blocks: number[][] = []
  const shortBlock = new Map<string, number[]>()
  for (const i of seq) {
    if (spineH(i) * 2 > tallest) { blocks.push([i]); continue }
    const k = shape(i), b = shortBlock.get(k)
    if (b) b.push(i); else { const nb = [i]; shortBlock.set(k, nb); blocks.push(nb) }
  }
  const cellOf: { col: number; row: number }[] = []
  const blockGrid = blocks.map((bl) => {
    const rows = bl.length > 1 ? Math.max(1, Math.min(bl.length, Math.max(Math.floor(tallest / Math.max(...bl.map(spineH))), Math.round(Math.sqrt(bl.length))))) : 1
    const cols = Math.ceil(bl.length / rows)
    bl.forEach((i, n) => (cellOf[i] = { col: n % cols, row: Math.floor(n / cols) }))
    const colW = Array.from({ length: cols }, (_, c) => Math.max(...bl.filter((i) => cellOf[i].col === c).map(spineW)))
    const rowH = Array.from({ length: rows }, (_, r) => Math.max(0, ...bl.filter((i) => cellOf[i].row === r).map(spineH)))
    return { colW, rowH, width: colW.reduce((m, w) => m + w, 0) }
  })
  const yOf = (row: number, i: number) => {
    const b = blocks.findIndex((bl) => bl.includes(i)), g = blockGrid[b]
    if (blocks[b].length === 1) return TOP + (row - minRow) * HALF
    return TOP + g.rowH.slice(0, cellOf[i].row).reduce((m, h) => m + h, 0) + (row - Math.min(...locals[i].row.values())) * HALF
  }
  const blockX: number[] = []
  const placeSpines = (gapW: number[]) => {
    const off: number[] = []
    let cur = 20 + gapW[0]
    blocks.forEach((bl, b) => {
      blockX[b] = cur
      const g = blockGrid[b]
      for (const i of bl) off[i] = cur + g.colW.slice(0, cellOf[i].col).reduce((m, w) => m + w, 0) - locals[i].left
      cur += g.width + gapW[b + 1]
    })
    blockX[blocks.length] = cur
    return { off, end: cur }
  }
  const pos = new Map<string, { x: number; y: number }>()
  const freeGap = new Map<string, number>()
  const gapW = new Array(blocks.length + 1).fill(0)
  for (let pass = 0; pass < 2; pass++) {
    const { off } = placeSpines(gapW)
    pos.clear()
    spines.forEach((sp, i) => [...sp.states, ...sp.verbs].forEach((id) => pos.set(id, { x: off[i] + locals[i].x.get(id)!, y: yOf(locals[i].row.get(id)!, i) })))
    if (pass === 1) break
    const gapX = (k: number) => (k === 0 ? 0 : blockX[k] - GAP / 2)
    const want = new Map<string, { x: number; y: number }>()
    let pending = [...free]
    for (let it = 0; it < 6 && pending.length; it++) {
      const still: string[] = []
      for (const f of pending) {
        const ps = net.arcs.filter((a) => a.state === f || a.verb === f).map((a) => (a.state === f ? a.verb : a.state)).map((o) => pos.get(o) ?? want.get(o)).filter(Boolean) as { x: number; y: number }[]
        if (!ps.length) { still.push(f); continue }
        want.set(f, { x: ps.reduce((m, p) => m + p.x, 0) / ps.length, y: ps.reduce((m, p) => m + p.y, 0) / ps.length })
      }
      pending = still
    }
    pending.forEach((f) => want.set(f, { x: 1e9, y: TOP }))
    for (const f of free) {
      const w = want.get(f)!
      let best = 0, bd = Infinity
      for (let k = 0; k <= blocks.length; k++) { const d = Math.abs(gapX(k) - w.x); if (d < bd) { bd = d; best = k } }
      freeGap.set(f, best)
      pos.set(f, w)
    }
    for (const f of free) { const k = freeGap.get(f)!; const e = states.has(f) ? { l: R, r: R + 6 + textW(stateLines(states.get(f)!)) } : vExt(f); gapW[k] = Math.max(gapW[k], e.l + e.r + GAP) }
  }
  const { off, end } = placeSpines(gapW)
  const gapLeft = (k: number) => (k === 0 ? 20 : blockX[k] - gapW[k])
  const wantY = new Map<string, number>()
  let pending = [...free]
  for (let it = 0; it < 6 && pending.length; it++) {
    const still: string[] = []
    for (const f of pending) {
      const ys = net.arcs.filter((a) => a.state === f || a.verb === f).map((a) => (a.state === f ? a.verb : a.state)).filter((o) => pos.has(o) && !free.includes(o) || wantY.has(o)).map((o) => wantY.get(o) ?? pos.get(o)!.y)
      if (!ys.length) { still.push(f); continue }
      wantY.set(f, ys.reduce((m, y) => m + y, 0) / ys.length)
    }
    pending = still
  }
  pending.forEach((f) => wantY.set(f, TOP))
  for (let k = 0; k <= blocks.length; k++) {
    const fs = free.filter((f) => freeGap.get(f) === k).sort((a, b) => wantY.get(a)! - wantY.get(b)! || byOrder(a, b))
    let lastY = -Infinity
    for (const f of fs) {
      const y = Math.max(wantY.get(f)!, lastY + HALF, TOP)
      const e = states.has(f) ? { l: R, r: 0 } : vExt(f)
      pos.set(f, { x: gapLeft(k) + e.l + 6, y }); lastY = y
    }
  }
  const bottom = Math.max(...[...pos.values()].map((p) => p.y)) + HALF
  return { order, spines, seq, locals, off, free, pos, barW, vExt, sExt, stateLines, verbLines, width: end + 10, height: bottom, spineOf, minRow }
}

const cubic = (p0: Pt, c1: Pt, c2: Pt, p3: Pt, n = 16): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t
  return { x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y }
})

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const without = opts?.without ?? []
  const L = layout(net, without)
  const { pos, order } = L
  const byOrder = (a: string, b: string) => order.get(a)! - order.get(b)!
  const states = new Map(net.states.map((s) => [s.id, s])), verbs = new Map(net.verbs.map((v) => [v.id, v]))
  const seatColor = new Map(net.seats.map((s) => [s.id, s.color]))
  const out: string[] = []
  const nodes: Drawing['layout']['nodes'] = {}
  const arcs: Drawing['layout']['arcs'] = {}

  // Anchor points: every input enters a bar from above, every output leaves from below, spread along the bar in the order of where the other end sits.
  const ends = new Map<string, Pt>()
  for (const v of net.verbs) {
    const p = pos.get(v.id)!, w = L.barW(v.id)
    const ins = net.arcs.filter((a) => a.verb === v.id && a.kind !== 'give'), outs = net.arcs.filter((a) => a.verb === v.id && a.kind === 'give')
    for (const [list, dy] of [[ins, -BAR_H / 2], [outs, BAR_H / 2]] as const) {
      const sorted = [...list].sort((a, b) => pos.get(a.state)!.x - pos.get(b.state)!.x || byOrder(a.state, b.state) || a.kind.localeCompare(b.kind))
      sorted.forEach((a, i) => ends.set(arcKey(a), { x: p.x + (sorted.length === 1 ? 0 : (i / (sorted.length - 1) - 0.5) * (w - 8)), y: p.y + dy }))
    }
  }
  // A give arc that climbs back up its own spine is a return: it sweeps around the column's outside.
  const sweepInto = new Map<string, string[]>()
  const isSweep = (a: Arc) => {
    if (a.kind !== 'give' || without.includes('return-sweep')) return false
    const sp = L.spineOf.get(a.verb)
    if (sp === undefined || sp !== L.spineOf.get(a.state)) return false
    return !!L.locals[sp].back.get(a.verb)?.to.has(a.state) && pos.get(a.state)!.y < pos.get(a.verb)!.y
  }
  for (const a of net.arcs) if (isSweep(a)) sweepInto.set(a.state, [...(sweepInto.get(a.state) ?? []), arcKey(a)])
  const laneOf = (k: string) => { const v = k.split('|')[2]; return L.locals[L.spineOf.get(v)!].back.get(v)!.laneX }
  for (const ks of sweepInto.values()) ks.sort((p, q) => laneOf(q) - laneOf(p) || byOrder(p.split('|')[2], q.split('|')[2]))

  const arcPath = (a: Arc): Pt[] => {
    const s = pos.get(a.state)!, e = ends.get(arcKey(a))!
    const spv = L.spineOf.get(a.verb)
    const sk = a.kind === 'give' && spv !== undefined && !without.includes('return-sweep') ? L.locals[spv].skip.get(a.verb) : undefined
    if (sk?.to.has(a.state)) {
      // A move that skips ahead down its own column sweeps down the left side and enters from above-left.
      const lx = L.off[spv!] + sk.laneX, low = e.y + 22
      const ent = { x: s.x - R * 0.7, y: s.y - R * 0.7 }
      const p1 = cubic(e, { x: e.x, y: low }, { x: lx, y: low }, { x: lx, y: e.y + 30 }, 12)
      const p2 = cubic({ x: lx, y: s.y - 40 }, { x: lx, y: s.y - 20 }, { x: ent.x - 10, y: ent.y - 10 }, ent, 10)
      return [...p1, ...p2].reverse()
    }
    if (isSweep(a)) {
      const sp = L.spineOf.get(a.verb)!
      const lx = L.off[sp] + L.locals[sp].back.get(a.verb)!.laneX
      const ks = sweepInto.get(a.state)!, i = ks.indexOf(arcKey(a))
      const dy = ks.length === 1 ? 0 : (i / (ks.length - 1) - 0.5) * Math.min(14, 5 * (ks.length - 1))
      const side = lx >= s.x ? 1 : -1
      const entry = { x: s.x + side * Math.sqrt(Math.max(0, R * R - dy * dy)), y: s.y + dy }
      const low = e.y + 24
      const p1 = cubic(e, { x: e.x, y: low }, { x: lx, y: low }, { x: lx, y: e.y - 6 }, 12)
      if (L.locals[sp].back.get(a.verb)!.far.has(a.state)) {
        // The target heads another column: rise in the gap and enter it from below, between the straight arcs it sends out.
        const top = { x: lx, y: s.y + HALF + 10 }, d = Math.hypot(top.x - s.x, top.y - s.y)
        const ent = { x: s.x + ((top.x - s.x) / d) * R, y: s.y + ((top.y - s.y) / d) * R }
        return [...p1, top, ent].reverse()
      }
      const p2 = cubic({ x: lx, y: s.y + 26 }, { x: lx, y: entry.y }, { x: lx, y: entry.y }, entry, 10)
      return [...p1, ...p2].reverse()
    }
    const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1
    const inSpine = L.spineOf.get(a.state) !== undefined && L.spineOf.get(a.state) === L.spineOf.get(a.verb)
    const below = a.kind === 'give' ? e.y < s.y : e.y > s.y
    if (inSpine && below) return [{ x: s.x + (dx / d) * R, y: s.y + (dy / d) * R }, { x: e.x, y: e.y }]
    const k = Math.min(40, Math.abs(dy) / 2 + 14)
    const start = { x: s.x + (dx / d) * R, y: s.y + (dy / d) * R }
    if (Math.abs(dx) < 1) return [start, { x: e.x, y: e.y }]
    const c2 = { x: e.x, y: e.y + (a.kind === 'give' ? k : -k) }
    const ang = Math.atan2(c2.y - s.y, c2.x - s.x)
    const st = { x: s.x + Math.cos(ang) * R, y: s.y + Math.sin(ang) * R }
    const c1 = { x: st.x + Math.cos(ang) * k * 0.6, y: st.y + Math.sin(ang) * k * 0.6 }
    return cubic(st, c1, c2, e)
  }

  const INK = '#222', SOFT = '#555'
  const pathD = (pts: Pt[]) => 'M' + pts.map((p) => `${f1(p.x)},${f1(p.y)}`).join(' L')
  const arrow = (tip: Pt, from: Pt) => {
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x), l = 7, w = 3.2
    const b = { x: tip.x - Math.cos(ang) * l, y: tip.y - Math.sin(ang) * l }
    return `<path d="M${f1(tip.x)},${f1(tip.y)} L${f1(b.x - Math.sin(ang) * w)},${f1(b.y + Math.cos(ang) * w)} L${f1(b.x + Math.sin(ang) * w)},${f1(b.y - Math.cos(ang) * w)} Z" fill="${INK}"/>`
  }
  for (const a of [...net.arcs].sort((p, q) => arcKey(p).localeCompare(arcKey(q)))) {
    const pts = arcPath(a)
    arcs[arcKey(a)] = pts.map((p) => ({ x: f1(p.x), y: f1(p.y) }))
    const cross = L.spineOf.get(a.state) !== L.spineOf.get(a.verb)
    out.push(`<path d="${pathD(pts)}" fill="none" stroke="${cross && !without.includes('contact-ink') ? SOFT : INK}" stroke-width="${cross ? 1 : 1.3}"/>`)
    const v = pts[pts.length - 1], vPrev = pts[Math.max(0, pts.length - 3)]
    if (without.includes('arc-kinds')) { /* plain line */ }
    else if (a.kind === 'take') out.push(arrow(v, vPrev))
    else if (a.kind === 'give') out.push(arrow(pts[0], pts[Math.min(2, pts.length - 1)]))
    else if (a.kind === 'need') out.push(`<circle cx="${f1(v.x)}" cy="${f1(v.y - 3)}" r="3" fill="${INK}"/>`)
    else out.push(`<circle cx="${f1(v.x)}" cy="${f1(v.y - 3.5)}" r="3.2" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`)
    if (a.count > 1 && !without.includes('arc-count')) {
      const at = a.kind === 'give' ? pts[Math.max(0, pts.length - 4)] : pts[Math.max(0, pts.length - 4)]
      out.push(`<text x="${f1(at.x + 5)}" y="${f1(at.y - 2)}" font-size="11" font-weight="700" fill="${INK}">${a.count}</text>`)
    }
  }
  const text = (x: number, y: number, lines: string[], anchor: string, extra = '') =>
    `<text x="${f1(x)}" y="${f1(y - ((lines.length - 1) * 12) / 2 + 4)}" font-size="11" text-anchor="${anchor}" fill="${INK}"${extra}>` +
    lines.map((l, i) => `<tspan x="${f1(x)}" dy="${i ? 12 : 0}">${esc(l)}</tspan>`).join('') + `</text>`
  for (const s of [...net.states].sort((a, b) => byOrder(a.id, b.id))) {
    const p = pos.get(s.id)!
    nodes[s.id] = { x: f1(p.x), y: f1(p.y), w: 2 * R, h: 2 * R }
    const hidden = s.seenBy !== 'all' && !without.includes('hidden')
    out.push(`<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${R}" fill="#fff" stroke="${INK}" stroke-width="1.4"${hidden ? ' stroke-dasharray="3 2"' : ''}/>`)
    if (s.ends && !without.includes('outcome')) out.push(`<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${R - 3.5}" fill="none" stroke="${INK}" stroke-width="1.2"/>`)
    if (s.marks === 1 && !without.includes('marks')) out.push(`<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="3.6" fill="${INK}"/>`)
    if (s.marks > 1 && !without.includes('marks')) out.push(`<text x="${f1(p.x)}" y="${f1(p.y + 4)}" font-size="11" font-weight="700" text-anchor="middle" fill="${INK}">${s.marks}</text>`)
    const freeState = L.free.includes(s.id)
    out.push(freeState ? text(p.x + R + 6, p.y, L.stateLines(s), 'start', s.ends ? ' font-weight="700"' : '') : text(p.x - R - 6, p.y, L.stateLines(s), 'end', s.ends ? ' font-weight="700"' : ''))
  }
  for (const v of [...net.verbs].sort((a, b) => byOrder(a.id, b.id))) {
    const p = pos.get(v.id)!, w = L.barW(v.id)
    nodes[v.id] = { x: f1(p.x), y: f1(p.y), w, h: BAR_H + 2 }
    const fill = v.by === 'world' || without.includes('speaker-color') ? INK : seatColor.get(v.by) ?? INK
    out.push(`<rect x="${f1(p.x - w / 2)}" y="${f1(p.y - BAR_H / 2)}" width="${f1(w)}" height="${BAR_H}" fill="${fill}"/>`)
    out.push(text(p.x + w / 2 + 6, p.y, L.verbLines(v), 'start'))
    if (v.by === 'world' && !without.includes('priority')) out.push(`<text x="${f1(p.x - w / 2 - 4)}" y="${f1(p.y + 4)}" font-size="10" text-anchor="end" fill="${SOFT}">${v.priority}</text>`)
  }
  if (!without.includes('speaker-key')) {
    let kx = 20
    const key: string[] = []
    for (const s of net.seats) { key.push(`<rect x="${kx}" y="14" width="22" height="${BAR_H}" fill="${s.color}"/>${text(kx + 28, 16, [s.name], 'start')}`); kx += 40 + s.name.length * CHAR }
    key.push(`<rect x="${kx}" y="14" width="22" height="${BAR_H}" fill="${INK}"/>${text(kx + 28, 16, ['world (number = priority, highest answers first)'], 'start')}`)
    out.unshift(key.join(''))
  }
  const keyW = 20 + net.seats.reduce((m, st) => m + 40 + st.name.length * CHAR, 0) + 28 + 48 * CHAR
  const W = Math.ceil(Math.max(L.width, without.includes('speaker-key') ? 0 : keyW)), H = Math.ceil(L.height)
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${out.join('')}</svg>`,
    width: W, height: H, layout: { nodes, arcs },
  }
}

const elements: Element[] = [
  { id: 'spine', what: 'An entity\'s states in one straight vertical line, alternating with the verbs that move it, top to bottom from its starting state.', purpose: 'Shows that an entity is always in one of its states, and gives each entity the same readable silhouette whatever it is called.', serves: ['entity', 'compare-shape', 'readable', 'napkin'] },
  { id: 'state', what: 'A circle, label to its left. Dashed when some seat cannot see it.', purpose: 'Where a mark can be; dashed shows hidden information without a second symbol.', serves: ['possibility', 'entity'] },
  { id: 'marks', what: 'One dot for one starting mark, the number for more.', purpose: 'Shows where play starts and how much of a count there is.', serves: ['counts', 'possibility'] },
  { id: 'outcome', what: 'A ring inside the circle, label in bold, the result text.', purpose: 'Lets a reader find every ending at a glance.', serves: ['possibility', 'actionable'] },
  { id: 'verb-bar', what: 'A thin horizontal bar across the spine, label to its right. Inputs enter from above, outputs leave below.', purpose: 'Petri\'s transition, kept thin so the spine reads as one line.', serves: ['readable', 'conversation'] },
  { id: 'speaker-color', what: 'A seat\'s bar is filled in that seat\'s color; the world\'s bar is black.', purpose: 'Who speaks each verb, the first fact of the conversation.', serves: ['conversation'] },
  { id: 'priority', what: 'The world verb\'s priority, printed small left of its bar.', purpose: 'The order in which the world answers; equal numbers are a chance tie.', serves: ['conversation', 'counts'] },
  { id: 'weight', what: '×n after a world verb\'s label when its weight is above 1.', purpose: 'The odds of a chance tie are on the map.', serves: ['counts'] },
  { id: 'arc-kinds', what: 'take: arrow into the bar. give: arrow into the state. need: line ending in a dot on the bar. unless: line ending in a ring.', purpose: 'Tells moving a mark from only reading it, and reading for presence from absence.', serves: ['possibility', 'content', 'contact'] },
  { id: 'arc-count', what: 'The count in bold beside an arc whose count is above 1.', purpose: 'Costs, thresholds and caps on the map.', serves: ['counts', 'actionable'] },
  { id: 'return-sweep', what: 'A give arc that goes back up its own column sweeps around the right side and enters the state from the side; one that skips ahead sweeps down the left.', purpose: 'Loops read as loops, the spine stays one straight line, and no arc runs through the states it passes.', serves: ['loop', 'readable', 'possibility'] },
  { id: 'shape-grid', what: 'Short spines of identical shape stand together in a square grid.', purpose: 'Identical parts are drawn identically and side by side, so repetition (nine squares, many enemies) reads as one idea.', serves: ['compare-shape', 'readable'] },
  { id: 'contact-ink', what: 'Arcs between two spines, or to a free state, are thinner and grey; arcs within a spine are black.', purpose: 'Separates an entity\'s own capability from the contacts that gate it on another entity\'s state.', serves: ['contact', 'content', 'readable'] },
  { id: 'shared-place', what: 'A state in no entity (a counter, a clock, an outcome) sits in the gap between the spines it touches, at their height.', purpose: 'The dining philosophers\' forks: shared places between the processes they couple.', serves: ['contact', 'counts', 'readable'] },
  { id: 'speaker-key', what: 'One line at the top: each seat\'s color, and black for the world.', purpose: 'Lets a cold reader decode the colors.', serves: ['conversation'] },
]

export const design: Design = {
  id: 'spines',
  title: 'Spines: one straight process per entity',
  idea: 'Each entity, a set of states that always holds exactly one mark, is drawn as its own straight vertical spine of states and verb bars, as in the dining philosophers figure. Spines stand side by side, ordered so coupled entities are neighbours; counters, clocks and lone outcomes sit between the spines they couple, and returns sweep around the outside of each spine.',
  rules: [
    'Find the entities: a set of states holding exactly one mark, where every verb that takes from the set gives back into it. Try smaller sets first; a state belongs to the first entity that claims it.',
    'Each verb belongs to the smallest entity it moves. Leftover states joined by verbs that move no entity form a spine of their own (a clock, a pool); any other leftover is a shared place.',
    'Draw each entity as a vertical spine, its starting state at the top. Walk forward along its verbs; a move to a state already on the walk is a return. Each state sits at the end of its longest walk. States that branch off the same state sit side by side under it.',
    'Put each verb as a thin horizontal bar in the row just below the state it takes from (just above, if it takes from no state of the spine). The bar that continues the spine sits on it; a bar that skips ahead sits to its left, any other parallel bar to its right.',
    'Labels: a state\'s to its left, a verb\'s to its right. Arcs enter a bar from above and leave it from below, straight within a spine.',
    'A return sweeps up around the right side of its column, shorter returns inside longer ones, and enters its state from the side (from below, if the state heads a branch). A skip sweeps down the left side and enters from above.',
    'Order the entities left to right: the most coupled first, then each next one beside the end spine it shares the most arcs with. Put each non-entity spine between the two neighbours it couples most.',
    'Short spines with the same shape (half the tallest or less) gather into one square grid where the first of them stands.',
    'Put each shared place in the gap between spines nearest the verbs it touches, at their average height.',
    'Arcs within a spine are black; arcs between spines, or to a shared place, are thin grey curves.',
    'Seat verbs are bars in the seat color, world verbs black with the priority to the left. Print every count above 1, a weight above 1 as ×n, one mark as a dot, more as the number. A dashed circle is hidden from some seat.',
    'take: arrow into the bar. give: arrow into the state. need: dot on the bar. unless: ring on the bar. Outcomes get an inner ring and a bold label.',
  ],
  elements,
  axes: {
    x: 'which entity: one spine per entity, coupled entities side by side',
    y: 'longest forward walk from the entity\'s starting state along its own verbs',
    placement: 'place invariants pick the entities; the longest forward walk from the starting mark picks the row',
    verb: 'thin horizontal bar across the spine, label to its right',
    speaker: 'bar fill: seat color, or black with a priority number for the world',
    entity: 'a straight vertical spine of its states',
    routing: 'straight within a spine, returns sweep around the spine\'s right side, contacts as thin grey curves between spines',
    unit: 'one whole net',
  },
  draw,
}
