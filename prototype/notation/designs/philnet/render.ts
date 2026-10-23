// PROTOTYPE. philnet: the dining philosophers figure on a fixed grid. One straight spine per entity, loops as labelled arches, coupling states drawn once between the spines they couple.
import { analyze, STALLED, LIVELOCK } from '../../../../studio/src/core/analyze'
import { compile, whoseTurn } from '../../../../studio/src/core/engine'
import { WORLD, initialMarking } from '../../../../studio/src/core/model'
import { arcKey, type Box, type Design, type Drawing, type Element, type Net, type Pt } from '../../harness/contract'

type Kind = 'take' | 'give' | 'need' | 'unless'
interface A { kind: Kind; state: string; verb: string; count: number; key: string }
type Side = -1 | 1

/** Fixed pitches. Nothing below depends on the width of any label. */
const R = 11, BAR_W = 5, BAR_H = 22, HB = BAR_H / 2
const RAILP = 10, D = 150, SLOT = D / 2, BASE = 66, LP = 46, ROW = 84, GP = 12, EXT0 = 44, MARGIN = 24
const FONT = 10.5, LINE = 12, VFONT = 10, VLINE = 11, LIMIT = 20000
const INK = '#222', WORLD_INK = '#7a7a7a', SPINE_INK = '#d4d4d4'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const f1 = (n: number) => Math.round(n * 10) / 10
function wrap(s: string, max: number): string[] {
  const out: string[] = []; let cur = ''
  for (const w of s.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}
const mask = (s: string) => s.replace(/[a-z]/g, 'a').replace(/[A-Z]/g, 'A')
const natural = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

/** Structural order: colour refinement, individualized until every node is distinct. Used only to break ties the rules leave open. */
function canonicalOrder(net: Net): Map<string, number> {
  const seatIx = new Map(net.seats.map((s, i) => [s.id, i]))
  let color = new Map<string, string>()
  for (const s of net.states) color.set(s.id, `s|${s.marks}|${s.ends ? 1 : 0}|${s.seenBy === 'all' ? 'a' : s.seenBy.length}|${mask(s.label)}|${mask(s.ends ?? '')}`)
  for (const v of net.verbs) color.set(v.id, `v|${v.by === WORLD ? 'w' : seatIx.get(v.by)}|${v.by === WORLD ? v.priority : 0}|${v.weight}|${mask(v.label)}`)
  const nb = new Map<string, string[]>([...color.keys()].map((k) => [k, []]))
  for (const a of net.arcs) { nb.get(a.state)!.push(`${a.kind}${a.count}>` + a.verb); nb.get(a.verb)!.push(`${a.kind}${a.count}<` + a.state) }
  const refine = () => {
    let classes = new Set(color.values()).size
    for (let round = 0; round < 60; round++) {
      const raw = new Map<string, string>()
      for (const [id, c] of color) raw.set(id, c + '(' + nb.get(id)!.map((e) => { const i = e.indexOf(e.includes('>') ? '>' : '<'); return e.slice(0, i + 1) + color.get(e.slice(i + 1)) }).sort().join(',') + ')')
      const uniq = [...new Set(raw.values())].sort()
      const ix = new Map(uniq.map((u, i) => [u, String(i).padStart(4, '0')]))
      color = new Map([...raw].map(([id, r]) => [id, ix.get(r)!]))
      if (uniq.length === classes) break
      classes = uniq.length
    }
  }
  const label = new Map<string, string>([...net.states.map((s) => [s.id, s.label] as const), ...net.verbs.map((v) => [v.id, v.label] as const)])
  const tieBreak = (a: string, b: string) => natural(mask(label.get(a)!), mask(label.get(b)!)) || natural(label.get(a)!, label.get(b)!) || (a < b ? -1 : a > b ? 1 : 0)
  refine()
  for (let k = 0; k < color.size; k++) {
    const cls = new Map<string, string[]>()
    for (const [id, c] of color) cls.set(c, [...(cls.get(c) ?? []), id])
    const tie = [...cls].filter(([, m]) => m.length > 1).sort((p, q) => (p[0] < q[0] ? -1 : 1))[0]
    if (!tie) break
    color.set([...tie[1]].sort(tieBreak)[0], tie[0] + '!')
    refine()
  }
  const ids = [...color.keys()].sort((a, b) => (color.get(a)! < color.get(b)! ? -1 : color.get(a)! > color.get(b)! ? 1 : 0) || tieBreak(a, b))
  return new Map(ids.map((id, i) => [id, i]))
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
/** Minimal semi-positive place invariants (Farkas). */
function invariants(net: Net): number[][] {
  const V = net.verbs.length
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
      const y = p.y.map((v, k) => a * v + b * q.y[k]), g = y.reduce((m, v) => gcd(m, v), 0) || 1
      keep.push({ c: p.c.map((v, k) => (a * v + b * q.c[k]) / g), y: y.map((v) => v / g), sup: p.sup | q.sup })
    }
    rows = minimal(keep)
    if (rows.length > 3000) return []
  }
  return rows.map((r) => r.y)
}

/** A spine: one entity's states on a straight line, home at column 0, branches to either side. */
interface Spine { states: string[]; col: Map<string, number>; shape: string }
/** A bar of a spine verb: a step on the line, an arch over the line, or a loop on one state. */
interface Bar { v: string; spine: number; kind: 'step' | 'arch' | 'loop'; from: string; to: string; lo: number; hi: number; side: Side; lane: number }
/** An arc between a spine bar and a state of the same spine that is not the bar's own move. */
interface Spur { key: string; spine: number; state: string; v: string; side: Side; lane: number; lo: number; hi: number }

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const off = new Set(opts?.without ?? [])
  const on = (e: string) => !off.has(e)
  const order = canonicalOrder(net)
  const states = new Map(net.states.map((s) => [s.id, s])), verbs = new Map(net.verbs.map((v) => [v.id, v]))
  const label = (id: string) => states.get(id)?.label ?? verbs.get(id)!.label
  const tk = (a: string, b: string) => natural(mask(label(a)), mask(label(b))) || order.get(a)! - order.get(b)!
  const arcs: A[] = net.arcs.map((a) => ({ kind: a.kind as Kind, state: a.state, verb: a.verb, count: a.count, key: arcKey(a) }))
    .sort((p, q) => order.get(p.verb)! - order.get(q.verb)! || order.get(p.state)! - order.get(q.state)! || (p.kind < q.kind ? -1 : p.kind > q.kind ? 1 : 0))
  const arcsOfV = new Map<string, A[]>(net.verbs.map((v) => [v.id, []])), arcsOfS = new Map<string, A[]>(net.states.map((s) => [s.id, []]))
  for (const a of arcs) { arcsOfV.get(a.verb)!.push(a); arcsOfS.get(a.state)!.push(a) }
  const seatIx = (by: string) => (by === WORLD ? net.seats.length : net.seats.findIndex((s) => s.id === by))

  // 1. Entities: 0/1 invariants holding one mark, outcomes left out; smaller sets claim first.
  const marks = (ss: string[]) => ss.reduce((m, s) => m + states.get(s)!.marks, 0)
  const cands = (on('spines') ? invariants(net) : []).filter((y) => y.every((v) => v === 0 || v === 1))
    .map((y) => net.states.filter((_, i) => y[i]).map((s) => s.id))
    .filter((ss) => marks(ss) === 1).map((ss) => ss.filter((s) => states.get(s)!.ends === undefined)).filter((ss) => ss.length >= 2)
    .sort((a, b) => a.length - b.length || Math.min(...a.map((s) => order.get(s)!)) - Math.min(...b.map((s) => order.get(s)!)))
  const claimed = new Set<string>(), ents0: string[][] = []
  for (const c of cands) { const rest = c.filter((s) => !claimed.has(s)); if (rest.length >= 2) { rest.forEach((s) => claimed.add(s)); ents0.push(rest) } }
  // top to bottom: the earliest seat that takes from it (the world last), larger first, then the home state's label
  const homeOf = (ss: string[]) => ss.find((s) => states.get(s)!.marks > 0) ?? [...ss].sort(tk)[0]
  const firstSeat = (ss: string[]) => Math.min(...ss.flatMap((s) => arcsOfS.get(s)!.filter((a) => a.kind === 'take').map((a) => seatIx(verbs.get(a.verb)!.by))), net.seats.length + 1)
  const ents = ents0.sort((a, b) => firstSeat(a) - firstSeat(b) || b.length - a.length || tk(homeOf(a), homeOf(b)))
  const entOf = new Map<string, number>(); ents.forEach((e, i) => e.forEach((s) => entOf.set(s, i)))

  // 2. A verb's home is the smallest entity it moves (takes from and gives into); a verb that moves none is a gap verb.
  const moved = (v: string, e: number) => {
    const as = arcsOfV.get(v)!.filter((a) => entOf.get(a.state) === e)
    const t = as.filter((a) => a.kind === 'take'), g = as.filter((a) => a.kind === 'give')
    return t.length && g.length ? { from: t[0].state, to: g[0].state } : undefined
  }
  const home = new Map<string, number>()
  for (const v of net.verbs) {
    const es = ents.map((_, e) => e).filter((e) => moved(v.id, e)).sort((a, b) => ents[a].length - ents[b].length || a - b)
    if (es.length) home.set(v.id, es[0])
  }

  // 3. Each spine: home at column 0; each state reached first from home starts a branch; branches, largest first, alternate right and left.
  const spines: Spine[] = ents.map((ss, ei) => {
    const inS = new Set(ss), h = homeOf(ss)
    const succ = new Map<string, string[]>(ss.map((s) => [s, []]))
    for (const v of net.verbs) { const m = moved(v.id, ei); if (m && m.from !== m.to && !succ.get(m.from)!.includes(m.to)) succ.get(m.from)!.push(m.to) }
    for (const l of succ.values()) l.sort(tk)
    // depth: the longest walk from home, once back moves (found depth first, successors in order) are set aside
    const seen = new Map<string, number>(), back = new Set<string>(), post: string[] = []
    const dfs = (s: string) => { seen.set(s, 1); for (const t of succ.get(s)!) { if (seen.get(t) === 1) back.add(s + '>' + t); else if (!seen.has(t)) dfs(t) } seen.set(s, 2); post.push(s) }
    dfs(h)
    const depth = new Map<string, number>([[h, 0]]), branch = new Map<string, string>()
    for (const s of [...post].reverse()) for (const t of succ.get(s)!) {
      if (back.has(s + '>' + t) || t === h) continue
      const d = depth.get(s)! + 1
      if (d > (depth.get(t) ?? -1)) { depth.set(t, d); branch.set(t, s === h ? t : branch.get(s)!) }
    }
    const roots = [...new Set(branch.values())]
    const size = (r: string) => [...branch.values()].filter((x) => x === r).length
    roots.sort((a, b) => size(b) - size(a) || tk(a, b))
    const members = (r: string) => ss.filter((s) => branch.get(s) === r).sort((a, b) => depth.get(a)! - depth.get(b)! || tk(a, b))
    const right: string[] = [], left: string[] = []
    roots.forEach((r, i) => (i % 2 ? left : right).push(...members(r)))
    right.push(...ss.filter((s) => s !== h && !depth.has(s)).sort(tk))
    void inS
    const col = new Map<string, number>([[h, 0]])
    right.forEach((s, i) => col.set(s, i + 1)); left.forEach((s, i) => col.set(s, -(i + 1)))
    const st = [...left].reverse().concat([h], right)
    return { states: st, col, shape: '' }
  })
  const spineOf = new Map<string, number>(); spines.forEach((sp, i) => sp.states.forEach((s) => spineOf.set(s, i)))

  // 4. Bars of each spine verb: one step outward on the line, anything else an arch (or a loop on one state).
  const bars: Bar[] = []
  const stepTaken = new Set<string>()
  for (const v of [...net.verbs].map((x) => x.id).sort(tk)) {
    const e = home.get(v)
    if (e === undefined) continue
    const { from, to } = moved(v, e)!, sp = spines[e]
    const cf = sp.col.get(from)!, ct = sp.col.get(to)!
    const outward = (cf === 0 ? Math.abs(ct) === 1 : Math.sign(ct) === Math.sign(cf) && Math.abs(ct) === Math.abs(cf) + 1)
    if (outward && !stepTaken.has(from + '>' + to)) { stepTaken.add(from + '>' + to); bars.push({ v, spine: e, kind: 'step', from, to, lo: Math.min(cf, ct), hi: Math.max(cf, ct), side: -1, lane: 0 }) }
    else if (from === to) bars.push({ v, spine: e, kind: 'loop', from, to, lo: cf - 0.3, hi: cf + 0.3, side: -1, lane: 0 })
    else bars.push({ v, spine: e, kind: 'arch', from, to, lo: Math.min(cf, ct), hi: Math.max(cf, ct), side: -1, lane: 0 })
  }
  const barOf = new Map(bars.map((b) => [b.v, b]))
  for (const sp of spines) sp.shape = bars.filter((b) => spines[b.spine] === sp).map((b) => `${b.kind}${b.lo},${b.hi}`).sort().join(' ') + '|' + sp.states.map((s) => sp.col.get(s)).join(',')

  // 5. Bands top to bottom: one spine each, except three or more spines of one shape, which stand in a square grid.
  const groups = new Map<string, number[]>()
  spines.forEach((sp, i) => groups.set(sp.shape, [...(groups.get(sp.shape) ?? []), i]))
  const bands: number[][] = [], gridCol = new Map<number, number>(), done = new Set<number>()
  spines.forEach((sp, i) => {
    if (done.has(i)) return
    const g = groups.get(sp.shape)!
    if (g.length >= 3 && on('grid')) {
      const cols = Math.ceil(Math.sqrt(g.length))
      for (let k = 0; k < g.length; k += cols) bands.push(g.slice(k, k + cols))
      g.forEach((s, k) => { gridCol.set(s, k % cols); done.add(s) })
    } else { bands.push([i]); gridCol.set(i, 0); done.add(i) }
  })
  const nb = bands.length
  const bandOf = new Map<number, number>(); bands.forEach((b, i) => b.forEach((s) => bandOf.set(s, i)))
  const outer = (b: number): Side => (b === 0 ? -1 : 1)

  // 6. Gaps: gap g lies above band g. A state in no entity, or a gap verb, goes in the gap between the bands it touches; touching one band, on its inner side.
  const gapNodes = [...net.states.filter((s) => !entOf.has(s.id)).map((s) => s.id), ...net.verbs.filter((v) => !home.has(v.id)).map((v) => v.id)].sort(tk)
  const isGap = new Set(gapNodes)
  // Hubs: a state whose verbs stand in three or more places (spines or gaps) other than its own. Its arcs to verbs elsewhere run as one cable.
  const cable = new Set<string>(), hubIx = new Map<string, number>()
  let hubs: string[] = []
  const nbrs = (id: string) => (states.has(id) ? arcsOfS.get(id)!.filter((a) => !cable.has(a.key)).map((a) => a.verb) : arcsOfV.get(id)!.filter((a) => !cable.has(a.key)).map((a) => a.state))
  const bandOfNode = (id: string) => (spineOf.has(id) ? bandOf.get(spineOf.get(id)!) : home.has(id) ? bandOf.get(home.get(id)!) : undefined)
  const gapOf = new Map<string, number>()
  const inner = (b: number) => (nb === 1 || b === 0 ? b + 1 : b)
  const assignGaps = () => {
    gapOf.clear()
    for (let it = 0; it <= gapNodes.length; it++) for (const g of gapNodes) {
      if (gapOf.has(g)) continue
      const bs = nbrs(g).map(bandOfNode).filter((x) => x !== undefined) as number[]
      if (!on('gaps')) { gapOf.set(g, nb); continue }
      if (bs.length) { const lo = Math.min(...bs), hi = Math.max(...bs); gapOf.set(g, lo === hi ? inner(lo) : Math.min(hi, Math.max(lo + 1, Math.round((lo + hi + 1) / 2)))); continue }
      const gs = nbrs(g).map((n) => gapOf.get(n)).filter((x) => x !== undefined) as number[]
      if (gs.length) gapOf.set(g, Math.min(...gs))
      else if (it === gapNodes.length) gapOf.set(g, nb ? 1 : 0)
    }
  }
  const placeOfV = (v: string) => (home.has(v) ? 's' + home.get(v) : 'g' + gapOf.get(v))
  const placeOfS = (s: string) => (spineOf.has(s) ? 's' + spineOf.get(s) : 'g' + gapOf.get(s))
  assignGaps()
  for (let pass = 0; pass < 2 && on('cables'); pass++) {
    hubs = net.states.map((s) => s.id).filter((s) => {
      const far = arcsOfS.get(s)!.map((a) => placeOfV(a.verb)).filter((p) => p !== placeOfS(s)), n = new Set(far).size
      return n >= 3
    }).sort(tk)
    hubIx.clear(); hubs.forEach((h, i) => hubIx.set(h, i))
    cable.clear()
    for (const a of arcs) if (hubIx.has(a.state) && placeOfV(a.verb) !== placeOfS(a.state) && (home.has(a.verb) || gapOf.get(a.verb)! < nb)) cable.add(a.key)
    assignGaps()
  }
  for (const a of arcs) if (cable.has(a.key) && (placeOfV(a.verb) === placeOfS(a.state) || (isGap.has(a.verb) && gapOf.get(a.verb)! >= nb))) cable.delete(a.key)
  // rows inside a gap: states touching only the band above on top, every gap verb in the middle, other states below
  const rowOf = new Map<string, number>()
  for (const g of gapNodes) {
    const k = gapOf.get(g)!, bs = nbrs(g).map(bandOfNode).filter((x) => x !== undefined) as number[]
    const up = bs.some((b) => b < k), down = bs.some((b) => b >= k)
    rowOf.set(g, verbs.has(g) ? 1 : up && !down ? 0 : 2)
  }

  // vertical level of any node, in band units: band b at b, gap g rows between b-1 and b
  const level = (id: string): number | undefined => {
    if (isGap.has(id)) return gapOf.get(id)! - 0.5 + (rowOf.get(id)! - 1) * 0.1
    return bandOfNode(id)
  }
  // 7. Arch side: toward where the verb's other arcs lead, more arcs winning; none, the outer side (above the top band, below the others).
  for (const b of bars) {
    if (b.kind === 'step') continue
    const bb = bandOf.get(b.spine)!
    const others = arcsOfV.get(b.v)!.filter((a) => a.state !== b.from && a.state !== b.to && !cable.has(a.key)).map((a) => level(a.state)).filter((l) => l !== undefined && l !== bb) as number[]
    const up = others.filter((l) => l < bb).length, down = others.filter((l) => l > bb).length
    b.side = on('inner') && up > down ? -1 : on('inner') && down > up ? 1 : outer(bb)
  }
  // spurs: arcs from a spine bar to a state of its own spine other than its move
  const spurs: Spur[] = []
  for (const b of bars) for (const a of arcsOfV.get(b.v)!) {
    if (spineOf.get(a.state) !== b.spine) continue
    const isMove = (a.kind === 'take' && a.state === b.from) || (a.kind === 'give' && a.state === b.to)
    if (isMove) continue
    const cs = spines[b.spine].col.get(a.state)!, cb = (b.lo + b.hi) / 2
    spurs.push({ key: a.key, spine: b.spine, state: a.state, v: b.v, side: b.kind === 'step' ? outer(bandOf.get(b.spine)!) : b.side, lane: 0, lo: Math.min(cs, cb), hi: Math.max(cs, cb) })
  }
  // 8. Lanes: on each side of a spine, shortest first; each takes the lowest lane free of every arch it overlaps.
  for (let si = 0; si < spines.length; si++) for (const side of [-1, 1] as Side[]) {
    const items: { lo: number; hi: number; lane: number; id: string; set: (l: number) => void }[] = [
      ...bars.filter((b) => b.spine === si && b.kind !== 'step' && b.side === side).map((b) => ({ lo: b.lo, hi: b.hi, lane: 0, id: b.v, set: (l: number) => { b.lane = l } })),
      ...spurs.filter((s) => s.spine === si && s.side === side && barOf.get(s.v)!.kind === 'step').map((s) => ({ lo: s.lo, hi: s.hi, lane: 0, id: s.v, set: (l: number) => { s.lane = l } })),
    ].sort((p, q) => p.hi - p.lo - (q.hi - q.lo) || p.lo - q.lo || tk(p.id, q.id))
    const placed: typeof items = []
    for (const it of items) {
      let lane = 1
      while (placed.some((p) => p.lane === lane && it.lo < p.hi && p.lo < it.hi)) lane++
      it.lane = lane; it.set(lane); placed.push(it)
    }
  }
  for (const s of spurs) if (barOf.get(s.v)!.kind !== 'step') s.lane = barOf.get(s.v)!.lane

  // world answers numbered in the order they are tried; ties share a number (chance by weight)
  const pr = [...new Set(net.verbs.filter((v) => v.by === WORLD).map((v) => v.priority))].sort((a, b) => b - a)
  const ordinal = new Map(net.verbs.filter((v) => v.by === WORLD).map((v) => [v.id, pr.indexOf(v.priority) + 1]))
  const an = on('analysis') || on('first') ? analyze(net, LIMIT) : undefined
  const firstVerbs = new Set<string>(an ? an.root.flatMap((k) => an.nodes.get(k)?.next.map((e) => e.verb) ?? []) : [])
  const dead = new Set(an?.deadVerbs ?? [])

  // 9. Vertical: each spine's reach to each side from its lanes; gaps hold up to three rows.
  const laneY = (lane: number) => BASE + (lane - 1) * LP
  const reach = (si: number, side: Side) => {
    const ls = [...bars.filter((b) => b.spine === si && b.kind !== 'step' && b.side === side).map((b) => b.lane), ...spurs.filter((s) => s.spine === si && s.side === side).map((s) => s.lane)]
    return ls.length ? laneY(Math.max(...ls)) + HB + 30 : EXT0
  }
  const gapRows = new Map<number, number[]>()
  for (const g of gapNodes) { const k = gapOf.get(g)!; gapRows.set(k, [...new Set([...(gapRows.get(k) ?? []), rowOf.get(g)!])].sort()) }
  const bandY: number[] = [], rowY = new Map<string, number>()
  // rails: one per hub above each band whose bars (or whose gap verbs above it) it reaches
  const cableBand = (v: string) => (home.has(v) ? bandOf.get(home.get(v)!)! : gapOf.get(v)!)
  const railsOf = (b: number) => hubs.filter((h) => arcsOfS.get(h)!.some((a) => cable.has(a.key) && cableBand(a.verb) === b))
  const railY = new Map<string, number>()
  let y = 0
  const placeGap = (k: number) => { const rows = gapRows.get(k); if (!rows) return; y += GP; for (const r of rows) { y += ROW / 2; rowY.set(`${k}:${r}`, y); y += ROW / 2 } y += GP }
  for (let b = 0; b < nb; b++) {
    placeGap(b)
    const up = Math.max(...bands[b].map((s) => reach(s, -1))), down = Math.max(...bands[b].map((s) => reach(s, 1)))
    const rs = railsOf(b)
    if (rs.length) { y += 10; rs.forEach((h) => { railY.set(h + '@' + b, y); y += RAILP }) }
    y += up; bandY[b] = y; y += down
  }
  placeGap(nb)
  if (!nb && !gapRows.size) y += 40
  const Hnet = y + MARGIN

  // 10. Horizontal: every spine's home on one axis (per grid column); a column of states every D.
  const cols = Math.max(1, ...[...gridCol.values()].map((c) => c + 1))
  const leftExt = new Array(cols).fill(0), rightExt = new Array(cols).fill(0)
  spines.forEach((sp, i) => { const c = gridCol.get(i)!; const cs = [...sp.col.values()]; leftExt[c] = Math.max(leftExt[c], -Math.min(...cs)); rightExt[c] = Math.max(rightExt[c], Math.max(...cs)) })
  const colX: number[] = []
  const TRUNK = hubs.length ? hubs.length * 10 + 24 : 0, riserX = (h: string) => MARGIN + 8 + hubIx.get(h)! * 10
  const LEFT = MARGIN + 30 + TRUNK
  let x = LEFT
  for (let c = 0; c < cols; c++) { x += leftExt[c] * D; colX[c] = x; x += rightExt[c] * D + D }
  const pos = new Map<string, Pt>()
  spines.forEach((sp, i) => { for (const s of sp.states) pos.set(s, { x: colX[gridCol.get(i)!] + sp.col.get(s)! * D, y: bandY[bandOf.get(i)!] }) })
  for (const b of bars) {
    const sp = spines[b.spine], y0 = bandY[bandOf.get(b.spine)!], x0 = colX[gridCol.get(b.spine)!]
    pos.set(b.v, { x: x0 + ((b.lo + b.hi) / 2) * D, y: b.kind === 'step' ? y0 : y0 + b.side * laneY(b.lane) })
    void sp
  }
  // gap nodes: most arcs to placed nodes first, then label order. Each goes at the free slot nearest the mean of its placed neighbours, right first on a tie
  const taken = new Map<string, 's' | 'v'>()
  const pending = [...gapNodes]
  while (pending.length) {
    const placedN = (g: string) => nbrs(g).filter((n) => pos.has(n)).length
    pending.sort((a, b) => placedN(b) - placedN(a) || tk(a, b))
    const g = pending.shift()!
    const xs = nbrs(g).filter((n) => pos.has(n)).map((n) => pos.get(n)!.x)
    const want = xs.length && on('gaps') ? xs.reduce((m, v) => m + v, 0) / xs.length : colX[0]
    const own = `${gapOf.get(g)}:${rowOf.get(g)}`
    const smin = Math.ceil((LEFT - colX[0]) / SLOT)
    const s0 = Math.max(smin, Math.round((want - colX[0]) / SLOT))
    // verbs a half column apart, states a whole column
    const kind = states.has(g) ? 's' : 'v'
    const busy = (rk: string, t: number) => t < smin || taken.has(rk + ':' + t) || (kind === 's' && (taken.has(rk + ':' + (t - 1)) || taken.has(rk + ':' + (t + 1))))
    // nearest free slot in its row
    const rk = own
    const at = (d: number) => s0 + (d === 0 ? 0 : d % 2 ? (d + 1) / 2 : -d / 2)
    let d = 0
    while (busy(own, at(d))) d++
    const s = at(d)
    taken.set(rk + ':' + s, kind)
    pos.set(g, { x: colX[0] + s * SLOT, y: rowY.get(rk)! })
  }

  // 11. Arc geometry, state end first.
  type P = Pt
  const cubic = (p0: P, p1: P, p2: P, p3: P, n = 14): P[] => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y } })
  const paths = new Map<string, P[]>()
  const curved = new Set<string>()
  // legs landing on one side of one state are spread across it: outer lanes nearer the middle
  type Leg = { key: string; state: string; side: Side; dir: number; lane: number; bar: P; barEnd: P; loop?: boolean }
  const legs: Leg[] = []
  const barCenter = (v: string) => pos.get(v)!
  for (const b of bars) {
    const p = barCenter(b.v)
    for (const a of arcsOfV.get(b.v)!) {
      const isMove = (a.kind === 'take' && a.state === b.from) || (a.kind === 'give' && a.state === b.to)
      if (!isMove || b.kind === 'step') continue
      const s = pos.get(a.state)!
      const dir = b.kind === 'loop' ? (a.kind === 'take' ? -1 : 1) : Math.sign(p.x - s.x)
      legs.push({ key: a.key, state: a.state, side: b.side, dir, lane: b.lane, bar: p, barEnd: { x: p.x - dir * BAR_W / 2, y: p.y }, loop: b.kind === 'loop' })
    }
  }
  for (const s of spurs) {
    const b = barOf.get(s.v)!, p = barCenter(s.v), st = pos.get(s.state)!
    const dir = Math.sign(p.x - st.x) || 1
    if (b.kind === 'step') legs.push({ key: s.key, state: s.state, side: s.side, dir, lane: s.lane, bar: p, barEnd: { x: p.x, y: p.y + s.side * HB } })
    else legs.push({ key: s.key, state: s.state, side: s.side, dir, lane: s.lane, bar: p, barEnd: { x: p.x - dir * BAR_W / 2, y: p.y } })
  }
  const attach = new Map<string, P>()
  const byStateSide = new Map<string, Leg[]>()
  for (const l of legs) { const k = `${l.state}|${l.side}|${l.dir}`; byStateSide.set(k, [...(byStateSide.get(k) ?? []), l]) }
  for (const [, ls] of byStateSide) {
    ls.sort((p, q) => q.lane - p.lane || Math.abs(p.bar.x - pos.get(p.state)!.x) - Math.abs(q.bar.x - pos.get(q.state)!.x))
    ls.forEach((l, i) => {
      const s = pos.get(l.state)!, n = ls.length
      const off = (n === 1 ? 0.45 : 0.15 + (0.7 * i) / (n - 1)) * R * (l.dir || 1)
      attach.set(l.key, { x: s.x + off, y: s.y + l.side * Math.sqrt(R * R - off * off) })
    })
  }
  for (const l of legs) {
    const p0 = attach.get(l.key)!, e = l.barEnd
    if (l.loop) { const bow = l.dir * 34; paths.set(l.key, cubic(p0, { x: p0.x + bow, y: p0.y + l.side * 10 }, { x: e.x + bow, y: e.y }, e)); curved.add(l.key); continue }
    const isStepSpur = Math.abs(e.y - l.bar.y) > 1
    if (isStepSpur) {
      const top = l.bar.y + l.side * laneY(l.lane), mid = { x: (p0.x + e.x) / 2, y: top }
      paths.set(l.key, [...cubic(p0, { x: p0.x, y: top }, { x: p0.x, y: top }, mid, 8), ...cubic(mid, { x: e.x, y: top }, { x: e.x, y: top }, e, 8).slice(1)])
    } else paths.set(l.key, on('arches') ? cubic(p0, { x: p0.x, y: e.y }, { x: (p0.x + e.x) / 2, y: e.y }, e) : [p0, e])
    curved.add(l.key)
  }
  const circ = (c: P, toward: P, r: number): P => { const d = Math.hypot(toward.x - c.x, toward.y - c.y) || 1; return { x: c.x + ((toward.x - c.x) / d) * r, y: c.y + ((toward.y - c.y) / d) * r } }
  const verbEnd = (v: string, from: P): P => {
    const p = pos.get(v)!, dx = from.x - p.x, dy = from.y - p.y
    if (Math.abs(dy) <= Math.abs(dx) * 0.35) return { x: p.x + Math.sign(dx) * BAR_W / 2, y: p.y }
    return { x: p.x + Math.max(-BAR_W / 2, Math.min(BAR_W / 2, dx * 0.05)), y: p.y + Math.sign(dy) * HB }
  }
  // cables: down from the hub, left to its riser, along the rail above the verb's band, and a short drop to the bar
  const dropsOf = new Map<string, string[]>()
  for (const a of arcs) if (cable.has(a.key)) dropsOf.set(a.verb, [...new Set([...(dropsOf.get(a.verb) ?? []), a.state])].sort((p, q) => hubIx.get(p)! - hubIx.get(q)!))
  for (const a of arcs) {
    if (!cable.has(a.key)) continue
    const h = pos.get(a.state)!, v = pos.get(a.verb)!, k = hubIx.get(a.state)!, ry = railY.get(a.state + '@' + cableBand(a.verb))!
    const ds = dropsOf.get(a.verb)!, dx = v.x + (ds.indexOf(a.state) - (ds.length - 1) / 2) * 12
    const cy = h.y + (spineOf.has(a.state) ? 52 : 40) + k * 7, ve = { x: v.x, y: v.y + (ry < v.y ? -HB : HB) }
    paths.set(a.key, [{ x: h.x, y: h.y + R }, { x: h.x, y: cy }, { x: riserX(a.state), y: cy }, { x: riserX(a.state), y: ry }, { x: dx, y: ry }, ve])
  }
  for (const a of arcs) {
    if (paths.has(a.key)) continue
    const b = barOf.get(a.verb), s = pos.get(a.state)!, v = pos.get(a.verb)!
    if (b && b.kind === 'step' && ((a.kind === 'take' && a.state === b.from) || (a.kind === 'give' && a.state === b.to))) {
      const dir = Math.sign(v.x - s.x)
      paths.set(a.key, [{ x: s.x + dir * R, y: s.y }, { x: v.x - dir * BAR_W / 2, y: v.y }])
      continue
    }
    const ve = verbEnd(a.verb, s)
    // an arc along a gap row that would pass other nodes of the row bows below them
    if (isGap.has(a.state) && isGap.has(a.verb) && Math.abs(s.y - v.y) < 1 && gapNodes.some((g) => g !== a.state && g !== a.verb && Math.abs(pos.get(g)!.y - s.y) < 1 && (pos.get(g)!.x - s.x) * (pos.get(g)!.x - v.x) < 0)) {
      const p0 = { x: s.x, y: s.y + R }, p3 = { x: v.x, y: v.y + HB }, dip = 26 + Math.abs(v.x - s.x) * 0.08
      paths.set(a.key, cubic(p0, { x: p0.x, y: s.y + dip }, { x: p3.x, y: s.y + dip }, p3)); curved.add(a.key)
      continue
    }
    paths.set(a.key, [circ(s, ve, R), ve])
  }
  // two arcs between one state and one bar are bowed apart
  const pairCount = new Map<string, number>()
  for (const a of arcs) {
    const k = a.state + '|' + a.verb, n = pairCount.get(k) ?? 0; pairCount.set(k, n + 1)
    if (!n || curved.has(a.key) || cable.has(a.key)) continue
    const pts = paths.get(a.key)!, p = pts[0], q = pts[pts.length - 1], len = Math.hypot(q.x - p.x, q.y - p.y) || 1
    const m = { x: (p.x + q.x) / 2 - ((q.y - p.y) / len) * 9 * n, y: (p.y + q.y) / 2 + ((q.x - p.x) / len) * 9 * n }
    paths.set(a.key, cubic(p, m, m, q, 10))
  }

  // 12. Render.
  const TOPKEY = on('key') ? 124 : 34
  const T = (p: P) => ({ x: f1(p.x), y: f1(p.y + TOPKEY) })
  const layout: Drawing['layout'] = { nodes: {}, arcs: {} }
  const seatColor = (by: string) => (by === WORLD || !on('speaker-color') ? WORLD_INK : net.seats.find((s) => s.id === by)?.color ?? INK)
  const pathD = (pts: P[]) => 'M' + pts.map((p) => `${f1(p.x)},${f1(p.y)}`).join('L')
  const roundD = (pts: P[]) => {
    let d = `M${f1(pts[0].x)},${f1(pts[0].y)}`
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1], u1 = Math.hypot(b.x - a.x, b.y - a.y) || 1, u2 = Math.hypot(c.x - b.x, c.y - b.y) || 1, r = Math.min(6, u1 / 2, u2 / 2)
      d += `L${f1(b.x - ((b.x - a.x) / u1) * r)},${f1(b.y - ((b.y - a.y) / u1) * r)}Q${f1(b.x)},${f1(b.y)} ${f1(b.x + ((c.x - b.x) / u2) * r)},${f1(b.y + ((c.y - b.y) / u2) * r)}`
    }
    const z = pts[pts.length - 1]
    return d + `L${f1(z.x)},${f1(z.y)}`
  }
  const arrow = (tip: P, from: P) => {
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x), l = 9, w = 4.2
    const b = { x: tip.x - Math.cos(ang) * l, y: tip.y - Math.sin(ang) * l }
    return `<path d="M${f1(tip.x)},${f1(tip.y)}L${f1(b.x - Math.sin(ang) * w)},${f1(b.y + Math.cos(ang) * w)}L${f1(b.x + Math.sin(ang) * w)},${f1(b.y - Math.cos(ang) * w)}Z" fill="${INK}"/>`
  }
  const back = (pts: P[], d: number, fromEnd: boolean) => {
    // the point d px back along the path from one end, for an arrow's direction
    const seq = fromEnd ? [...pts].reverse() : pts
    let acc = 0
    for (let i = 1; i < seq.length; i++) { acc += Math.hypot(seq[i].x - seq[i - 1].x, seq[i].y - seq[i - 1].y); if (acc >= d) return seq[i] }
    return seq[seq.length - 1]
  }
  const arcSvg: string[] = [], textSvg: string[] = [], nodeSvg: string[] = [], spineSvg: string[] = []
  for (const a of arcs) {
    const pts = paths.get(a.key)!.map(T)
    layout.arcs[a.key] = pts
    const dashed = a.kind === 'need' || a.kind === 'unless'
    arcSvg.push(`<path d="${cable.has(a.key) ? roundD(pts) : pathD(pts)}" fill="none" stroke="${INK}" stroke-width="${cable.has(a.key) ? 1 : 1.2}"${dashed ? ' stroke-dasharray="4 2.5"' : ''}/>`)
    if (cable.has(a.key) && a.kind === 'give') { const q = pts[pts.length - 2], z = pts[pts.length - 1]; arcSvg.push(arrow({ x: (q.x + z.x) / 2, y: (q.y + z.y) / 2 }, z)) }
    const sEnd = pts[0], vEnd = pts[pts.length - 1]
    if (!on('arc-ends')) { /* plain */ }
    else if (a.kind === 'take') arcSvg.push(arrow(vEnd, back(pts, 9, true)))
    else if (a.kind === 'give') arcSvg.push(arrow(sEnd, back(pts, 9, false)))
    else { const pb = back(pts, 4, true), ang = Math.atan2(vEnd.y - pb.y, vEnd.x - pb.x), c = { x: vEnd.x - Math.cos(ang) * 3.4, y: vEnd.y - Math.sin(ang) * 3.4 }; arcSvg.push(a.kind === 'need' ? `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="3.3" fill="${INK}"/>` : `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="3.5" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`) }
    if (a.count > 1 && on('counts')) {
      const m = pts[Math.floor(pts.length / 2)]
      textSvg.push(`<text x="${f1(m.x + 5)}" y="${f1(m.y - 3)}" font-size="11" font-weight="700" fill="${INK}" stroke="#fff" stroke-width="3" paint-order="stroke">${a.count}</text>`)
    }
  }
  if (on('spines')) spines.forEach((sp) => {
    const ps = sp.states.map((s) => T(pos.get(s)!))
    spineSvg.push(`<line x1="${f1(ps[0].x - 16)}" y1="${ps[0].y}" x2="${f1(ps[ps.length - 1].x + 16)}" y2="${ps[0].y}" stroke="${SPINE_INK}" stroke-width="5" stroke-linecap="round"/>`)
  })
  const txt = (x: number, y: number, lines: string[], anchor: string, size: number, lh: number, extra = '') => lines.map((l, i) => `<text x="${f1(x)}" y="${f1(y + i * lh)}" font-size="${size}" text-anchor="${anchor}" stroke="#fff" stroke-width="3" paint-order="stroke"${extra}>${esc(l)}</text>`).join('')
  const stateLines = (s: string) => { const st = states.get(s)!; const t = st.ends ?? st.label; const hid = st.seenBy === 'all' || !on('hidden') ? '' : st.seenBy.length ? ` (seen by ${st.seenBy.map((x) => net.seats.find((q) => q.id === x)?.name ?? x).join(', ')})` : ' (seen by nobody)'; return wrap(t + hid, 16) }
  const verbLines = (v: string) => { const vb = verbs.get(v)!; const b = barOf.get(v); return wrap((firstVerbs.has(v) && on('first') ? '▸ ' : '') + vb.label + (vb.weight > 1 ? ` ×${vb.weight}` : '') + (dead.has(v) ? ' (never said)' : ''), b && b.kind !== 'step' ? 22 : 14) }
  for (const s of net.states) {
    const p = T(pos.get(s.id)!), st = s
    layout.nodes[s.id] = { x: p.x, y: p.y, w: 2 * R, h: 2 * R }
    const hidden = st.seenBy !== 'all' && on('hidden'), end = st.ends !== undefined && on('outcome')
    let g = `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="#fff" stroke="${INK}" stroke-width="${end ? 2.2 : 1.4}"${hidden ? ' stroke-dasharray="3.5 2.2"' : ''}/>`
    if (end) g += `<circle cx="${p.x}" cy="${p.y}" r="${R - 3.5}" fill="none" stroke="${INK}" stroke-width="1"/>`
    if (on('marks') && st.marks === 1) g += `<circle cx="${p.x}" cy="${p.y}" r="3.8" fill="${INK}"/>`
    if (on('marks') && st.marks > 1) g += `<text x="${p.x}" y="${f1(p.y + 4)}" font-size="11.5" font-weight="700" text-anchor="middle" fill="${INK}">${st.marks}</text>`
    nodeSvg.push(g)
    textSvg.push(txt(p.x, p.y + R + 12, stateLines(s.id), 'middle', FONT, LINE, ` fill="${INK}"${end ? ' font-weight="700"' : ''}`))
  }
  for (const v of net.verbs) {
    const p = T(pos.get(v.id)!), col = seatColor(v.by)
    layout.nodes[v.id] = { x: p.x, y: p.y, w: BAR_W + 2, h: BAR_H }
    nodeSvg.push(`<rect x="${f1(p.x - BAR_W / 2)}" y="${f1(p.y - HB)}" width="${BAR_W}" height="${BAR_H}" fill="${col}"${dead.has(v.id) ? ' opacity="0.35"' : ''}/>`)
    const ls = verbLines(v.id), b = barOf.get(v.id), down = b && b.kind !== 'step' && b.side === 1
    const fill = ` fill="${v.by === WORLD ? '#555' : col}"`
    textSvg.push(down ? txt(p.x + 5, p.y + HB + 11, ls, 'start', VFONT, VLINE, fill) : txt(p.x + 5, p.y - HB - 4 - (ls.length - 1) * VLINE, ls, 'start', VFONT, VLINE, fill))
    if (ordinal.has(v.id) && on('order')) textSvg.push(`<text x="${f1(p.x - BAR_W / 2 - 3)}" y="${f1(p.y - 2)}" font-size="11" font-weight="700" text-anchor="end" fill="#555" stroke="#fff" stroke-width="3" paint-order="stroke">${ordinal.get(v.id)}</text>`)
  }
  for (const [k, ry] of railY) {
    const h = k.split('@')[0], b = Number(k.split('@')[1])
    const xe = Math.max(...arcsOfS.get(h)!.filter((a) => cable.has(a.key) && cableBand(a.verb) === b).map((a) => pos.get(a.verb)!.x + 12))
    textSvg.push(`<text x="${f1(xe + 4)}" y="${f1(ry + TOPKEY + 3)}" font-size="9" font-style="italic" fill="#444" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(states.get(h)!.label)}</text>`)
  }
  let W = Math.max(...[...pos.values()].map((p) => p.x)) + 200

  // header, key, analysis
  const head: string[] = []
  head.push(`<text x="${MARGIN}" y="20" font-size="13.5" font-weight="700" fill="${INK}">${esc(net.title)}</text>`)
  let kx = MARGIN
  head.push(`<text x="${kx}" y="38" font-size="10.5" fill="#444">Seats:</text>`); kx += 40
  for (const s of net.seats) { head.push(`<rect x="${kx}" y="${38 - 11}" width="${BAR_W}" height="13" fill="${seatColor(s.id)}"/><text x="${kx + 9}" y="38" font-size="10.5" fill="${INK}">${esc(s.name)}</text>`); kx += 20 + s.name.length * 6 }
  head.push(`<rect x="${kx}" y="27" width="${BAR_W}" height="13" fill="${WORLD_INK}"/><text x="${kx + 9}" y="38" font-size="10.5" fill="${INK}">the world</text>`)
  kx += 80
  const KEYW = 800
  if (on('key')) {
    const k: string[] = [], ky = 50
    k.push(`<rect x="${MARGIN}" y="${ky}" width="${KEYW}" height="64" fill="none" stroke="#bbb"/>`)
    const row = (yy: number, items: [string, string][]) => { let xx = MARGIN + 8; for (const [g, t] of items) { k.push(`<g transform="translate(${xx} ${yy})">${g}</g>`); k.push(`<text x="${xx + 26}" y="${yy + 4}" font-size="9.5" fill="#333">${esc(t)}</text>`); xx += 34 + t.length * 5.1 } }
    row(ky + 13, [
      [`<circle cx="9" cy="0" r="7" fill="#fff" stroke="${INK}" stroke-width="1.3"/><circle cx="9" cy="0" r="2.8" fill="${INK}"/>`, 'state; dot = one mark, number = marks'],
      [`<circle cx="9" cy="0" r="7" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="9" cy="0" r="4" fill="none" stroke="${INK}"/>`, 'ends play (result in bold)'],
      [`<circle cx="9" cy="0" r="7" fill="#fff" stroke="${INK}" stroke-dasharray="3 2"/>`, 'hidden from some seat'],
      [`<line x1="0" y1="0" x2="20" y2="0" stroke="${SPINE_INK}" stroke-width="5" stroke-linecap="round"/>`, 'one entity: always in exactly one of these states'],
    ])
    row(ky + 32, [
      [`<line x1="0" y1="0" x2="12" y2="0" stroke="${INK}" stroke-width="1.2"/><path d="M20,0L11,-4.2L11,4.2Z" fill="${INK}"/>`, 'take / give: a mark moves this way'],
      [`<line x1="0" y1="0" x2="15" y2="0" stroke="${INK}" stroke-dasharray="4 2.5"/><circle cx="17" cy="0" r="3.3" fill="${INK}"/>`, 'need: only if marked'],
      [`<line x1="0" y1="0" x2="13" y2="0" stroke="${INK}" stroke-dasharray="4 2.5"/><circle cx="17" cy="0" r="3.5" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`, 'unless: only if not marked (count = threshold)'],
      [`<text x="10" y="4" font-size="11" font-weight="700" fill="${INK}">2</text>`, 'count'],
    ])
    row(ky + 51, [
      [`<text x="8" y="4" font-size="11" font-weight="700" text-anchor="end" fill="#555">1</text><rect x="11" y="-7" width="${BAR_W}" height="14" fill="${WORLD_INK}"/>`, 'the world answers first, 1 before 2, until silent; same number: chance by ×weight'],
      [`<text x="8" y="4" font-size="10">▸</text>`, 'open at the first resting moment'],
      [`<path d="M2,4 C2,-8 18,-8 18,4" fill="none" stroke="${INK}"/><rect x="8" y="-11" width="${BAR_W}" height="10" fill="${WORLD_INK}"/>`, 'arch: a move back or past'],
    ])
    head.push(...k)
  }
  const foot: string[] = []
  let FH = 0
  W = Math.max(W, on('key') ? KEYW + 2 * MARGIN : 0, kx + 40)
  if (an && on('analysis')) {
    const lines: string[] = []
    const resting = [...an.nodes.values()].filter((n) => n.next.length).length
    const cap = an.complete ? '' : ` (exploration capped at ${LIMIT.toLocaleString('en')} positions: counts are lower bounds)`
    const c = compile(net), t0 = whoseTurn(c, initialMarking(net))
    const seatsFirst = [...new Set(an.root.flatMap((k) => an.nodes.get(k)?.next.map((e) => e.speaker) ?? []))].map((s) => net.seats.find((q) => q.id === s)?.name ?? s)
    lines.push(`Engine: ${resting.toLocaleString('en')} resting moments, settled positions where a seat must choose${cap}.`)
    lines.push(`First: ${t0.kind === 'world' ? 'the world answers, then ' : ''}${seatsFirst.length ? seatsFirst.join(' or ') + (seatsFirst.length > 1 ? ', whoever speaks first' : '') + ' chooses (▸ verbs).' : 'no seat ever chooses.'}`)
    const outs = [...an.outcomes].sort((p, q) => q[1] - p[1] || natural(p[0], q[0]))
    lines.push(`Outcomes: ${outs.length ? outs.map(([o, n]) => `${o} (${n.toLocaleString('en')} ending position${n === 1 ? '' : 's'})`).join(', ') : 'none reachable'}.`)
    lines.push(`Plays: ${an.plays === 'endless' ? 'endless, a seat can repeat a position forever' : an.plays === 'unknown' ? 'not counted (capped)' : an.plays.toLocaleString('en') + ' complete plays'}.`)
    if (an.stalls.length) lines.push(`Stalls: ${an.stalls.length} position${an.stalls.length === 1 ? '' : 's'} where nobody can speak (${STALLED}).`)
    if (an.livelocks.length) lines.push(`Livelocks: ${an.livelocks.length}, ${LIVELOCK}.`)
    lines.push(`Dead verbs: ${!an.complete ? 'unknown (capped)' : an.deadVerbs.length ? an.deadVerbs.map((v) => verbs.get(v)!.label).join(', ') : 'none, every verb can be said'}.`)
    const wrapped = lines.flatMap((l) => wrap(l, Math.max(60, Math.floor((W - 2 * MARGIN) / 5.6))))
    FH = 16 + wrapped.length * 13
    foot.push(`<line x1="${MARGIN}" y1="${f1(Hnet + TOPKEY + 2)}" x2="${f1(W - MARGIN)}" y2="${f1(Hnet + TOPKEY + 2)}" stroke="#bbb"/>`)
    wrapped.forEach((l, i) => foot.push(`<text x="${MARGIN}" y="${f1(Hnet + TOPKEY + 16 + i * 13)}" font-size="10.5" fill="#333">${esc(l)}</text>`))
  }
  const Wt = Math.ceil(W), Ht = Math.ceil(Hnet + TOPKEY + FH + 10)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wt}" height="${Ht}" viewBox="0 0 ${Wt} ${Ht}" font-family="Helvetica, Arial, sans-serif"><rect width="${Wt}" height="${Ht}" fill="#fff"/>${head.join('')}<g>${spineSvg.join('')}</g><g>${arcSvg.join('')}</g><g>${nodeSvg.join('')}</g><g>${textSvg.join('')}</g>${foot.join('')}</svg>`
  return { svg, width: Wt, height: Ht, layout }
}

const elements: Element[] = [
  { id: 'spines', what: 'Each entity (states that always hold exactly one mark between them) is one straight horizontal spine on a grey rule: its home (marked) state at the centre, each branch of states reached from home laid outward, largest branch to the right, the next to the left, alternating.', purpose: 'An entity is always in one of its states; one straight line per entity makes that the first thing seen, as each philosopher is one cycle in the dining philosophers figure.', serves: ['entity', 'readable', 'compare-shape', 'napkin'] },
  { id: 'arches', what: 'A verb that moves its entity one state outward sits on the line between the two states. Every other move (back toward home, past a state, or a second verb for the same step) is an arch from its state to its target, with the verb\'s bar at the top; arches nest in lanes, shortest innermost.', purpose: 'Every loop is drawn as a loop, and each return is its own curve carrying its own labelled bar, so no two returns merge.', serves: ['loop', 'readable', 'possibility'] },
  { id: 'inner', what: 'An arch whose verb also touches something off its spine rises on the side where those arcs lead; other arches go on the outer side.', purpose: 'Contact verbs sit between the spines they couple, so their arcs are short; internal loops sweep around the outside.', serves: ['contact', 'readable'] },
  { id: 'gaps', what: 'Every state in no entity (coupling states and outcomes) and every verb that moves no entity is drawn once, in the gap between the spines it touches, on a slot grid at the mean position of its neighbours.', purpose: 'Coupling states sit between the processes they couple, drawn once with all their arcs: no connection is hidden behind a copy.', serves: ['contact', 'counts', 'readable'] },
  { id: 'cables', what: 'A hub (a state whose verbs stand on three or more other spines) is drawn once; its arcs to those verbs run as one cable: down from the hub, along its own riser at the left edge, along a rail above each band it reaches, and a short drop to each bar. The rail is tagged with the hub\'s name.', purpose: 'A turn or a counter that every module uses is drawn once with every arc, without a fan of long crossing lines and without copies.', serves: ['readable', 'contact', 'counts'] },
  { id: 'grid', what: 'Three or more spines of the same shape stand in a square grid.', purpose: 'Identical parts are drawn identically and side by side.', serves: ['compare-shape', 'readable'] },
  { id: 'speaker-color', what: 'A seat\'s bars and labels are in its color; the world\'s are grey.', purpose: 'Who speaks each verb.', serves: ['conversation'] },
  { id: 'order', what: 'Each world bar carries a number: the order the world tries its answers, 1 first. Equal numbers are a chance tie, with ×weight on each label.', purpose: 'Turn order of the world\'s answers, read directly.', serves: ['conversation', 'actionable', 'counts'] },
  { id: 'first', what: '▸ before the label of every verb a seat can say at the first resting moment, and a line naming who chooses first.', purpose: 'Who speaks first.', serves: ['conversation', 'possibility'] },
  { id: 'arc-ends', what: 'take and give: solid with a large arrowhead where the mark goes. need: dashed to a dot. unless: dashed to an open ring.', purpose: 'Moving a mark versus reading a state, and presence versus absence, readable at 100%.', serves: ['content', 'contact', 'possibility'] },
  { id: 'counts', what: 'Arc counts above 1 in bold beside the arc; marks above 1 as a number in the circle.', purpose: 'Costs, thresholds and counters are on the map.', serves: ['counts', 'actionable'] },
  { id: 'marks', what: 'A dot for one starting mark, the number for more.', purpose: 'Where play starts.', serves: ['possibility', 'counts'] },
  { id: 'outcome', what: 'An outcome is a heavy circle with an inner ring, its result in bold.', purpose: 'Where play ends.', serves: ['possibility', 'actionable'] },
  { id: 'hidden', what: 'A dashed circle and "(seen by ...)" for a state some seat cannot see.', purpose: 'Hidden information.', serves: ['conversation', 'possibility'] },
  { id: 'key', what: 'A fixed key at the top: every mark, line end, number, the arch and the turn rule.', purpose: 'A cold reader can decode every mark without guessing.', serves: ['readable', 'conversation', 'counts'] },
  { id: 'analysis', what: 'Engine facts under the net: resting moments, who chooses first, outcomes with ending positions, plays, stalls, dead verbs; capped exploration says so.', purpose: 'What the engine finds is printed beside the picture, so a designer can check a reading against it.', serves: ['actionable', 'possibility'] },
]

export const design: Design = {
  id: 'philnet',
  title: 'Philnet: the dining philosophers figure on a fixed grid',
  idea: 'Each entity is one straight spine with its home state at the centre and its branches laid outward, every return drawn as its own labelled arch, as each philosopher is one cycle. States and verbs in no entity are drawn once in the gap between the spines they couple, with every arc. Every position comes from a fixed grid of columns and lanes, so a variant moves only what changed.',
  rules: [
    "Entities: find sets of states that always hold exactly one mark between them (every verb that takes from the set gives back into it), outcomes left out; smaller sets claim states first. Each entity is a spine, a straight horizontal line on a grey rule. Order spines top to bottom by the earliest seat that takes from them (seats in listed order, the world last), then larger first, then by home label.",
    "Columns: the home (marked) state is column 0; columns are 150 px apart. A state's depth is its longest walk from home (walk depth first, successors in label order; a move back onto the walk does not count). Each depth-1 state starts a branch; a deeper state joins the branch it is reached from on its longest walk. Branches, largest first then by label, go right, left, right, ...; each side lays its branches outward, a branch's states by depth then label; unreached states go last on the right.",
    "Bars: a verb's home is the smallest entity it moves (takes from and gives into). A move one column outward from home sits on the line midway between the two states (only the first such verb in label order). Every other move is an arch from its state to its target with the bar at the top, midway between them; a verb that takes and gives back the same state is a small loop over it.",
    "Arch side and lanes: an arch rises on the side where the verb's other arcs lead (more arcs wins); with none or a tie, on the outer side: above the top band, below every other. On each side, arches shortest first (then leftmost, then label) take the lowest lane free of every arch they overlap; lane k's top is 66 + 46(k-1) px from the line.",
    "Bands: three or more spines of the same shape stand in a square grid, one band per grid row; any other spine is a band of its own. Every home state sits on one vertical axis (one per grid column).",
    "Gaps: every other state (coupling states, outcomes) and every verb that moves no entity goes in a gap: between the bands it touches (the middle gap, rounded down toward the lower band), or, touching one band, on its inner side (below the top band, above the others); touching none, in the gap of its neighbours. In a gap, states touching only the band above form the top row, gap verbs the middle row, other states the bottom row; rows are 84 px apart.",
    "Gap positions: place gap nodes one at a time, the one with most arcs to placed nodes first, then label order. Each goes on the slot (every 75 px, on the column grid) nearest the mean x of its placed neighbours, right first on a tie; a verb needs a free slot, a state a free slot with both neighbouring slots free. Nothing else moves to make room.",
    "Hubs: a state whose verbs stand in three or more places (spines or gaps) other than its own is a hub. Its arcs to those verbs run as one cable: down from the hub, left to its own riser at the left edge, along a rail just above each band it reaches (tagged with its name), then a short drop to each bar. Hub arcs do not count in rules 4, 6 and 7.",
    "Arcs: a step runs straight along the line. An arch leg rises from its state and turns flat into the bar; legs landing on one side of one state spread across it, outer lanes nearer the top. Every other arc is straight, except that two arcs between one state and one bar bow apart, and an arc along a gap row that would pass other nodes dips below them.",
    "Marks: states are circles (dot = one mark, number = more); outcomes heavy with an inner ring, result in bold; hidden states dashed. Verbs are thin bars in the speaker's color, the world grey with its answer order (1 first) at the upper left; equal numbers are chance, weight as ×n. take and give are solid with a large arrowhead where the mark goes; need is dashed to a dot; unless dashed to a ring; counts above 1 printed beside the arc.",
    "Labels: a state's label under its circle, wrapped at 16 letters. A verb's label starts right of its bar's outer end, above it (below for an arch under its spine), wrapped at 14 letters, 22 on an arch. ▸ marks the verbs open at the first resting moment.",
    "Put the key at the top and the engine's facts at the bottom: resting moments, who chooses first, outcomes, plays, stalls, dead verbs."
  ],
  elements,
  axes: {
    x: 'along a spine, branches outward from the home state on fixed columns; in a gap, the slot nearest the mean of a node\'s neighbours',
    y: 'which entity, by the first seat that moves it; coupling states and gap verbs in rows between',
    placement: 'a fixed column grid per spine, arches in nested lanes, gap nodes on a slot grid',
    verb: 'thin vertical bar on the line for a step, at the top of an arch for any other move, label at its outer end',
    speaker: 'bar color; the world grey with its answer order 1, 2, 3',
    entity: 'one straight horizontal spine on a grey rule',
    routing: 'steps straight along the spine, returns as nested arches, contact and coupling arcs straight and short',
    unit: 'one whole net with key and engine facts',
  },
  draw,
}
