// PROTOTYPE. spinenet: one straight spine per entity, coupling states between spines, hubs and far contacts as fusion copies.
import { analyze, STALLED, LIVELOCK } from '../../../../studio/src/core/analyze'
import { compile, whoseTurn } from '../../../../studio/src/core/engine'
import { WORLD, initialMarking } from '../../../../studio/src/core/model'
import { arcKey, type Box, type Design, type Drawing, type Element, type Net, type Pt } from '../../harness/contract'

type Kind = 'take' | 'give' | 'need' | 'unless'
interface A { kind: Kind; state: string; verb: string; count: number; key: string }

const R = 10, CR = 6, BAR_W = 4, BAR_H = 22, HB = BAR_H / 2
const FONT = 10.5, CH = 5.7, LINE = 12, SFONT = 9, SCH = 4.9, SLINE = 10
const PAD = 18, BASE = 42, LANE = 9, GP = 22, NEAR = 140, HUB = 5, MARGIN = 20, LIMIT = 20000
const INK = '#222', WORLD_INK = '#7a7a7a', COPY_FILL = '#e9e9e9'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const f1 = (n: number) => Math.round(n * 10) / 10
function wrap(s: string, max: number): string[] {
  const out: string[] = []; let cur = ''
  for (const w of s.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}
const width = (lines: string[], ch = CH) => Math.max(0, ...lines.map((l) => l.length * ch))
const mask = (s: string) => s.replace(/[a-z]/g, 'a').replace(/[A-Z]/g, 'A')
const natural = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

/** Structural order: colour refinement, then label, then id. Only the last two see names. */
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
  const label0 = new Map<string, string>([...net.states.map((s) => [s.id, s.label] as const), ...net.verbs.map((v) => [v.id, v.label] as const)])
  const tieBreak = (a: string, b: string) => natural(mask(label0.get(a)!), mask(label0.get(b)!)) || natural(label0.get(a)!, label0.get(b)!) || (a < b ? -1 : a > b ? 1 : 0)
  // individualize and refine: each remaining tie is broken once, and every later tie follows the structure from it
  refine()
  for (let k = 0; k < color.size; k++) {
    const cls = new Map<string, string[]>()
    for (const [id, c] of color) cls.set(c, [...(cls.get(c) ?? []), id])
    const tie = [...cls].filter(([, m]) => m.length > 1).sort((p, q) => (p[0] < q[0] ? -1 : 1))[0]
    if (!tie) break
    const pick = [...tie[1]].sort(tieBreak)[0]
    color.set(pick, color.get(pick)! + '!')
    refine()
  }
  const label = new Map<string, string>([...net.states.map((s) => [s.id, s.label] as const), ...net.verbs.map((v) => [v.id, v.label] as const)])
  const ids = [...color.keys()].sort((a, b) => (color.get(a)! < color.get(b)! ? -1 : color.get(a)! > color.get(b)! ? 1 : 0) || natural(mask(label.get(a)!), mask(label.get(b)!)) || natural(label.get(a)!, label.get(b)!) || (a < b ? -1 : a > b ? 1 : 0))
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

type Role = 'A' | 'B' | 'C' | 'P'
interface BarSpec { id: string; slot: number; role: Role }
interface Spine { states: string[]; bars: BarSpec[]; items: { kind: 's' | 'b'; id: string; online: boolean }[]; shape: string }

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const off = new Set(opts?.without ?? [])
  const on = (e: string) => !off.has(e)
  const order = canonicalOrder(net)
  const byOrder = (a: string, b: string) => order.get(a)! - order.get(b)!
  const states = new Map(net.states.map((s) => [s.id, s])), verbs = new Map(net.verbs.map((v) => [v.id, v]))
  const arcs: A[] = net.arcs.map((a) => ({ kind: a.kind as Kind, state: a.state, verb: a.verb, count: a.count, key: arcKey(a) }))
    .sort((p, q) => byOrder(p.verb, q.verb) || byOrder(p.state, q.state) || (p.kind < q.kind ? -1 : p.kind > q.kind ? 1 : 0))
  const arcsOfV = new Map<string, A[]>(net.verbs.map((v) => [v.id, []])), arcsOfS = new Map<string, A[]>(net.states.map((s) => [s.id, []]))
  for (const a of arcs) { arcsOfV.get(a.verb)!.push(a); arcsOfS.get(a.state)!.push(a) }
  const isOutcome = (s: string) => states.get(s)!.ends !== undefined

  // 1. Entities: 0/1 invariants holding one mark, outcomes left out.
  const marks = (ss: string[]) => ss.reduce((m, s) => m + states.get(s)!.marks, 0)
  const cands = (on('spines') ? invariants(net) : []).filter((y) => y.every((v) => v === 0 || v === 1))
    .map((y) => net.states.filter((_, i) => y[i]).map((s) => s.id))
    .filter((ss) => marks(ss) === 1).map((ss) => ss.filter((s) => !isOutcome(s)).sort(byOrder)).filter((ss) => ss.length >= 2)
    .sort((a, b) => a.length - b.length || order.get(a[0])! - order.get(b[0])!)
  const claimed = new Set<string>(), ents: string[][] = []
  for (const c of cands) { const rest = c.filter((s) => !claimed.has(s)); if (rest.length >= 2) { rest.forEach((s) => claimed.add(s)); ents.push(rest) } }
  const entOf = new Map<string, number>(); ents.forEach((e, i) => e.forEach((s) => entOf.set(s, i)))

  // 2. Home spine of each verb: the smallest entity it moves, else one it leaves, else one it enters; none means it lives in a gap.
  const home = new Map<string, number>()
  for (const v of net.verbs) {
    const as = arcsOfV.get(v.id)!
    const ins = (k: Kind) => new Set(as.filter((a) => a.kind === k && entOf.has(a.state)).map((a) => entOf.get(a.state)!))
    const t = ins('take'), g = ins('give')
    const moves = [...t].filter((e) => g.has(e)), pick = (xs: number[]) => xs.sort((a, b) => ents[a].length - ents[b].length || a - b)[0]
    if (moves.length) home.set(v.id, pick(moves))
  }

  // 3. Each spine: states in walk order from the marked state; each verb in a slot beside the rightmost state it touches.
  const spines: Spine[] = ents.map((ss, ei) => {
    const inS = new Set(ss)
    const mine = net.verbs.filter((v) => home.get(v.id) === ei).map((v) => v.id).sort(byOrder)
    const succ = new Map<string, string[]>(ss.map((s) => [s, []]))
    for (const v of net.verbs.map((x) => x.id).sort(byOrder)) for (const t of arcsOfV.get(v)!.filter((a) => a.kind === 'take' && inS.has(a.state))) for (const g of arcsOfV.get(v)!.filter((a) => a.kind === 'give' && inS.has(a.state))) if (!succ.get(t.state)!.includes(g.state)) succ.get(t.state)!.push(g.state)
    for (const l of succ.values()) l.sort(byOrder)
    const start = ss.find((s) => states.get(s)!.marks > 0) ?? ss[0]
    const seen = new Map<string, number>(), back = new Set<string>(), post: string[] = []
    const dfs = (s: string) => { seen.set(s, 1); for (const t of succ.get(s)!) { if (seen.get(t) === 1) back.add(s + '>' + t); else if (!seen.has(t)) dfs(t) } seen.set(s, 2); post.push(s) }
    for (const s of [start, ...ss]) if (!seen.has(s)) dfs(s)
    const rank = new Map<string, number>()
    for (const s of [...post].reverse()) { if (!rank.has(s)) rank.set(s, 0); for (const t of succ.get(s)!) if (!back.has(s + '>' + t)) rank.set(t, Math.max(rank.get(t) ?? 0, rank.get(s)! + 1)) }
    const row = [...ss].sort((a, b) => rank.get(a)! - rank.get(b)! || byOrder(a, b))
    const col = new Map(row.map((s, i) => [s, i]))
    const bars: BarSpec[] = []
    for (const v of mine) {
      const as = arcsOfV.get(v)!
      const T = as.filter((a) => a.kind === 'take' && inS.has(a.state)).map((a) => col.get(a.state)!).sort((a, b) => a - b)
      const G = as.filter((a) => a.kind === 'give' && inS.has(a.state)).map((a) => col.get(a.state)!).sort((a, b) => a - b)
      if (T.length && G.length) {
        const t = T[T.length - 1], g = G[0]
        if (g === t + 1) bars.push({ id: v, slot: t, role: 'B' })
        else if (g > t + 1) bars.push({ id: v, slot: g - 1, role: 'C' })
        else bars.push({ id: v, slot: t, role: 'A' })
      } else if (T.length) bars.push({ id: v, slot: T[T.length - 1], role: 'A' })
      else bars.push({ id: v, slot: G[0] - 1, role: 'C' })
    }
    // a second bar for the same step becomes a parallel bar off the line
    const firstB = new Set<number>()
    for (const b of bars) if (b.role === 'B') { if (firstB.has(b.slot)) b.role = 'P'; else firstB.add(b.slot) }
    const items: Spine['items'] = []
    for (let k = -1; k < row.length; k++) {
      if (k >= 0) items.push({ kind: 's', id: row[k], online: true })
      const inSlot = bars.filter((b) => b.slot === k)
      const As = inSlot.filter((b) => b.role === 'A'), B = inSlot.find((b) => b.role === 'B'), Ps = inSlot.filter((b) => b.role === 'P'), Cs = inSlot.filter((b) => b.role === 'C')
      if (B) {
        As.forEach((b) => items.push({ kind: 'b', id: b.id, online: false }))
        items.push({ kind: 'b', id: B.id, online: true })
        ;[...Ps, ...Cs].forEach((b) => items.push({ kind: 'b', id: b.id, online: false }))
      } else {
        As.slice(1).forEach((b) => items.push({ kind: 'b', id: b.id, online: false }))
        if (As[0]) items.push({ kind: 'b', id: As[0].id, online: k >= 0 })
        const last = Cs[Cs.length - 1]
        if (last) items.push({ kind: 'b', id: last.id, online: k < row.length - 1 })
        Cs.slice(0, -1).forEach((b) => items.push({ kind: 'b', id: b.id, online: false }))
      }
    }
    const shape = items.map((it) => it.kind + (it.online ? 1 : 0) + (it.kind === 'b' ? bars.find((b) => b.id === it.id)!.role : '')).join('')
    return { states: row, bars, items, shape }
  })
  const spineOf = new Map<string, number>()
  spines.forEach((sp, i) => { sp.states.forEach((s) => spineOf.set(s, i)); sp.bars.forEach((b) => spineOf.set(b.id, i)) })
  const onlineBar = new Set(spines.flatMap((sp) => sp.items.filter((it) => it.kind === 'b' && it.online).map((it) => it.id)))
  const roleOf = new Map(spines.flatMap((sp) => sp.bars.map((b) => [b.id, b] as const)))

  // 4. Bands: spines ordered so the most coupled sit together; three or more spines of one shape form a grid.
  const couple = (i: number, j: number) => net.verbs.filter((v) => { const ss = new Set(arcsOfV.get(v.id)!.map((a) => spineOf.get(a.state)).concat([spineOf.get(v.id)])); return ss.has(i) && ss.has(j) }).length
  const groups = new Map<string, number[]>()
  spines.forEach((sp, i) => groups.set(sp.shape, [...(groups.get(sp.shape) ?? []), i]))
  const units: number[][] = []
  const inGrid = new Set<number>()
  spines.forEach((sp, i) => { if (inGrid.has(i)) return; const g = groups.get(sp.shape)!; if (g.length >= 3 && on('grid')) { units.push([...g].sort((a, b) => natural(states.get(spines[a].states[0])!.label, states.get(spines[b].states[0])!.label) || a - b)); g.forEach((x) => inGrid.add(x)) } else units.push([i]) })
  const uc = (p: number[], q: number[]) => p.reduce((m, i) => m + q.reduce((n, j) => n + (i === j ? 0 : couple(i, j)), 0), 0)
  const total = (u: number) => units.reduce((m, q, k) => (k === u ? m : m + uc(units[u], q)), 0)
  const seq: number[] = []
  if (units.length) {
    seq.push(units.map((_, k) => k).sort((a, b) => total(b) - total(a) || a - b)[0])
    while (seq.length < units.length) {
      const rest = units.map((_, k) => k).filter((k) => !seq.includes(k))
      const to = (k: number) => seq.reduce((m, j) => m + uc(units[k], units[j]), 0)
      const nxt = rest.sort((a, b) => to(b) - to(a) || total(b) - total(a) || a - b)[0]
      if (uc(units[nxt], units[seq[0]]) > uc(units[nxt], units[seq[seq.length - 1]])) seq.unshift(nxt); else seq.push(nxt)
    }
  }
  const bands: number[][] = []
  let firstRows = 0
  for (const k of seq) { const u = units[k]; if (k === seq[0]) firstRows = u.length === 1 ? 1 : Math.ceil(u.length / Math.ceil(Math.sqrt(u.length))); if (u.length === 1) { bands.push(u); continue } const cols = Math.ceil(Math.sqrt(u.length)); for (let i = 0; i < u.length; i += cols) bands.push(u.slice(i, i + cols)) }
  const bandOf = new Map<number, number>(); bands.forEach((b, i) => b.forEach((s) => bandOf.set(s, i)))
  const outer = (b: number) => (b < firstRows ? -1 : 1)
  const nb = bands.length

  // 5. Gaps: every state in no entity and every verb with no home sits in the gap between the bands it touches.
  const hubs = new Set(net.states.filter((s) => !entOf.has(s.id) && new Set(arcsOfS.get(s.id)!.map((a) => a.verb)).size >= HUB && on('hubs')).map((s) => s.id))
  const gapNodes = [...net.states.filter((s) => !entOf.has(s.id) && !hubs.has(s.id)).map((s) => s.id), ...net.verbs.filter((v) => !home.has(v.id)).map((v) => v.id)].sort(byOrder)
  const isGap = new Set(gapNodes)
  const nbrs = (id: string) => (states.has(id) ? arcsOfS.get(id)!.map((a) => a.verb) : arcsOfV.get(id)!.map((a) => a.state))
  const gapOf = new Map<string, number>()
  const innerGap = (b: number) => (outer(b) < 0 ? b + 1 : b)
  for (let it = 0; it < 4; it++) for (const g of gapNodes) {
    if (gapOf.has(g)) continue
    const bs = nbrs(g).filter((n) => spineOf.has(n)).map((n) => bandOf.get(spineOf.get(n)!)!)
    if (bs.length) {
      const lo = Math.min(...bs), hi = Math.max(...bs)
      gapOf.set(g, lo === hi ? innerGap(lo) : Math.min(hi, Math.max(lo + 1, Math.round((lo + hi + 1) / 2))))
    } else {
      const gs = nbrs(g).map((n) => gapOf.get(n)).filter((x) => x !== undefined) as number[]
      if (gs.length || it === 3) gapOf.set(g, gs.length ? Math.min(...gs) : 1)
    }
  }

  // world answers numbered in the order they are tried; ties share a number (chance by weight)
  const pr = [...new Set(net.verbs.filter((v) => v.by === WORLD).map((v) => v.priority))].sort((a, b) => b - a)
  const ordinal = new Map(net.verbs.filter((v) => v.by === WORLD).map((v) => [v.id, pr.indexOf(v.priority) + 1]))

  // engine facts
  const an = on('analysis') || on('first') ? analyze(net, LIMIT) : undefined
  const firstVerbs = new Set<string>(an ? an.root.flatMap((k) => an.nodes.get(k)?.next.map((e) => e.verb) ?? []) : [])
  const dead = new Set(an?.deadVerbs ?? [])

  // labels
  const stateLines = (s: string) => { const st = states.get(s)!; const t = st.ends ? st.ends : st.label; const hid = st.seenBy === 'all' || !on('hidden') ? '' : st.seenBy.length ? ` (seen by ${st.seenBy.map((x) => net.seats.find((q) => q.id === x)?.name ?? x).join(', ')})` : ' (seen by nobody)'; return wrap(t + hid, 18) }
  const verbLines = (v: string) => { const vb = verbs.get(v)!; return wrap((firstVerbs.has(v) && on('first') ? '▸ ' : '') + vb.label + (vb.weight > 1 ? ` ×${vb.weight}` : '') + (dead.has(v) ? ' (never said)' : ''), 20) }
  const copyLines = (s: string) => wrap(states.get(s)!.ends ?? states.get(s)!.label, 12)
  const copyW = (s: string) => Math.max(2 * CR, width(copyLines(s), SCH)) + 6
  const ordW = (v: string) => (ordinal.has(v) && on('order') ? String(ordinal.get(v)).length * 5.5 + 4 : 0)

  // which arcs are drawn as copies; grows until the layout agrees with it
  const copyArc = new Set<string>()
  for (const a of arcs) {
    const sv = spineOf.get(a.verb), ss = spineOf.get(a.state)
    if (hubs.has(a.state) || (!on('gaps') && (isGap.has(a.state) || isGap.has(a.verb)))) copyArc.add(a.key)
    else if (sv !== undefined && ss !== undefined && sv !== ss) copyArc.add(a.key)
    else if (sv !== undefined && !onlineBar.has(a.verb) && isGap.has(a.state)) copyArc.add(a.key)
    else if (isGap.has(a.verb) && isGap.has(a.state) && gapOf.get(a.verb) !== gapOf.get(a.state)) copyArc.add(a.key)
    else if ((isGap.has(a.verb) && ss !== undefined) || (isGap.has(a.state) && sv !== undefined)) {
      const g = gapOf.get(isGap.has(a.verb) ? a.verb : a.state)!, b = bandOf.get((ss ?? sv)!)!
      if (b !== g && b !== g - 1) copyArc.add(a.key)
    }
  }
  const copiesOf = (v: string) => [...new Set(arcsOfV.get(v)!.filter((a) => copyArc.has(a.key)).map((a) => a.state))].sort(byOrder)

  type P = { x: number; y: number }
  let pos = new Map<string, P>(), copyPos = new Map<string, P>(), spineX = new Map<number, number>(), bandY: number[] = [], gapY = new Map<number, number>()
  let reach: { up: number; down: number; lanes: Map<string, number>; laneBase: number }[] = []
  let W = 0, Hnet = 0
  const sweepKeys = new Set<string>(), rowPair = new Set<string>()
  const direct = new Set<string>()

  const layoutAll = () => {
    rowPair.clear(); pos = new Map(); copyPos = new Map(); spineX = new Map(); gapY = new Map(); direct.clear(); sweepKeys.clear()
    // 5a. local x along each spine
    const local = spines.map((sp, si) => {
      const xs = new Map<string, number>()
      let cur = 0, prevR = 0, first = true, prev = ''
      const linked = (p: string, q: string) => arcs.some((a) => (a.state === p && a.verb === q) || (a.state === q && a.verb === p))
      for (const it of sp.items) {
        let l: number, r: number
        if (it.kind === 's') { const w = width(stateLines(it.id)); l = Math.max(R, w / 2); r = l }
        else {
          const cw = copiesOf(it.id).reduce((m, s) => m + copyW(s), 4)
          l = BAR_W / 2 + ordW(it.id) + 2
          r = Math.max(BAR_W / 2 + 6 + width(verbLines(it.id)), cw)
        }
        cur = first ? l : cur + prevR + PAD + (linked(prev, it.id) || !it.online ? 0 : 2 * PAD) + l
        first = false; prev = it.id
        xs.set(it.id, cur); prevR = r
      }
      return { xs, w: cur + prevR, si }
    })
    // direct and sweep arcs within a spine
    for (const [si, sp] of spines.entries()) {
      const col = new Map(sp.states.map((s, i) => [s, i]))
      for (const b of sp.bars) {
        const used = new Set<string>()
        for (const a of arcsOfV.get(b.id)!) {
          if (spineOf.get(a.state) !== si || copyArc.has(a.key)) continue
          const c = col.get(a.state)!
          const left = c === b.slot && a.kind !== 'give' && b.role !== 'C'
          const right = c === b.slot + 1 && a.kind === 'give' && b.role !== 'A'
          if ((left || right) && !used.has(a.state)) { direct.add(a.key); used.add(a.state) } else if (on('returns')) sweepKeys.add(a.key); else copyArc.add(a.key)
        }
      }
    }
    // 5b. vertical extents of each spine
    reach = spines.map((sp) => {
      let outerR = R + 4, innerR = R + 4
      for (const it of sp.items) {
        if (it.kind === 's') { innerR = Math.max(innerR, R + 4 + stateLines(it.id).length * LINE); continue }
        const cps = copiesOf(it.id), cl = Math.max(0, ...cps.map((s) => copyLines(s).length)) * SLINE
        if (it.online) { outerR = Math.max(outerR, HB + 4 + verbLines(it.id).length * LINE); if (cps.length) innerR = Math.max(innerR, HB + 16 + CR + 3 + cl) }
        else outerR = Math.max(outerR, BASE + Math.max(HB, verbLines(it.id).length * LINE / 2) + (cps.length ? 16 + CR + 3 + cl : 0))
      }
      // lanes for sweeps
      const xs = local[spines.indexOf(sp)].xs
      const sw = arcs.filter((a) => sweepKeys.has(a.key) && spineOf.get(a.verb) === spines.indexOf(sp))
      const iv = sw.map((a) => ({ k: a.key, l: Math.min(xs.get(a.state)!, xs.get(a.verb)!), r: Math.max(xs.get(a.state)!, xs.get(a.verb)!) }))
        .sort((p, q) => p.r - p.l - (q.r - q.l) || (p.k < q.k ? -1 : 1))
      const lanes = new Map<string, number>(), taken: { l: number; r: number; lane: number }[] = []
      for (const i of iv) { let lane = 0; while (taken.some((t) => t.lane === lane && i.l < t.r + 6 && t.l < i.r + 6)) lane++; lanes.set(i.k, lane); taken.push({ ...i, lane }) }
      const nl = taken.length ? Math.max(...taken.map((t) => t.lane)) + 1 : 0
      return { up: 0, down: 0, lanes, laneBase: outerR + 10, outerR: outerR + (nl ? 10 + nl * LANE : 0), innerR }
    }).map((r: any) => r)
    // 5c. bands: x offsets and vertical extents
    const bandW: number[] = [], colW = new Map<number, number>()
    bands.forEach((b, bi) => {
      let x = MARGIN
      b.forEach((si, k) => {
        const cw = Math.max(...bands.filter((q) => q.length === b.length && q.every((s) => groups.get(spines[s].shape)!.includes(si))).map((q) => local[q[k]]?.w ?? 0), local[si].w)
        spineX.set(si, x); colW.set(si, cw); x += cw + 60
      })
      bandW[bi] = x
      for (const si of b) { const r = reach[si] as any; r.up = outer(bi) < 0 ? r.outerR : r.innerR; r.down = outer(bi) < 0 ? r.innerR : r.outerR }
    })
    const ax = (id: string) => spineX.get(spineOf.get(id)!)! + local[spineOf.get(id)!].xs.get(id)!
    // 5d. gap rows: desired x from real neighbours, packed left to right
    const gapRows = new Map<number, string[]>()
    for (const g of gapNodes) { const k = gapOf.get(g)!; gapRows.set(k, [...(gapRows.get(k) ?? []), g]) }
    const want = new Map<string, number>()
    for (let it = 0; it < 6; it++) for (const g of gapNodes) {
      const xs = (states.has(g) ? arcsOfS.get(g)! : arcsOfV.get(g)!).filter((a) => !copyArc.has(a.key)).map((a) => (states.has(g) ? a.verb : a.state))
        .map((n) => (spineOf.has(n) ? ax(n) : want.get(n))).filter((x) => x !== undefined) as number[]
      const all = xs.length ? xs : (nbrs(g).map((n) => (spineOf.has(n) ? ax(n) : want.get(n))).filter((x) => x !== undefined) as number[])
      if (all.length) want.set(g, all.reduce((m, x) => m + x, 0) / all.length)
    }
    const gapExt = (g: string) => {
      if (states.has(g)) { const w = Math.max(R, width(stateLines(g)) / 2); return { l: w, r: w, up: R + 4 + stateLines(g).length * LINE, down: R + 4 + stateLines(g).length * LINE } }
      const cps = copiesOf(g), cl = Math.max(0, ...cps.map((s) => copyLines(s).length)) * SLINE
      return { l: BAR_W / 2 + ordW(g) + 2, r: Math.max(BAR_W / 2 + 6 + width(verbLines(g)), cps.reduce((m, s) => m + copyW(s), 4)), up: HB + 2 + verbLines(g).length * LINE, down: HB + (cps.length ? 16 + CR + 3 + cl : 2) }
    }
    const gx = new Map<string, number>(), subRows = new Map<number, string[][]>()
    const limit = Math.max(900, 1.4 * Math.max(0, ...bandW))
    for (const [k, row] of gapRows) {
      const sorted = [...row].sort((a, b) => (want.get(a) ?? -1e9) - (want.get(b) ?? -1e9) || byOrder(a, b))
      let right = -Infinity
      const subs: string[][] = [[]]
      for (const g of sorted) {
        const e = gapExt(g)
        let x = Math.max(want.get(g) ?? MARGIN + e.l, right === -Infinity ? MARGIN + e.l : right + PAD + e.l)
        if (x + e.r > limit && subs[subs.length - 1].length) { subs.push([]); x = Math.max(MARGIN + e.l, Math.min(want.get(g) ?? 0, limit - e.r)) }
        const cur = subs[subs.length - 1]
        if (cur.length) rowPair.add(cur[cur.length - 1] + '|' + g).add(g + '|' + cur[cur.length - 1])
        cur.push(g); gx.set(g, x); right = x + e.r
      }
      subRows.set(k, subs)
    }
    const rowY = new Map<string, number>()
    // 5e. vertical positions
    bandY = []
    let y = 8
    const placeGap = (k: number) => { for (const row of subRows.get(k)!) { y += GP + Math.max(0, ...row.map((g) => gapExt(g).up)); row.forEach((g) => rowY.set(g, y)); y += Math.max(0, ...row.map((g) => gapExt(g).down)) } }
    for (let b = 0; b < nb; b++) {
      const up = Math.max(...bands[b].map((s) => reach[s].up)), down = Math.max(...bands[b].map((s) => reach[s].down))
      if (b > 0 && gapRows.has(b)) { placeGap(b); y += GP } else if (b > 0) y += GP
      y += up; bandY[b] = y; y += down
    }
    const last = nb === 0 ? 1 : nb
    for (const k of [...gapRows.keys()].filter((k) => k >= last || nb === 0)) placeGap(k)
    Hnet = y + MARGIN
    for (const [si, sp] of spines.entries()) {
      const b = bandOf.get(si)!, o = outer(b)
      for (const it of sp.items) pos.set(it.id, { x: ax(it.id), y: bandY[b] + (it.kind === 'b' && !it.online ? o * BASE : 0) })
    }
    for (const g of gapNodes) pos.set(g, { x: gx.get(g)!, y: rowY.get(g)! })
    // copies hang from the free end of their bar, in a row to the right
    for (const v of net.verbs) {
      const p = pos.get(v.id)!, cps = copiesOf(v.id)
      const si = spineOf.get(v.id), o = si === undefined ? 1 : outer(bandOf.get(si)!)
      const dir = si === undefined ? 1 : onlineBar.has(v.id) ? -o : o
      let cx = p.x + 4
      for (const s of cps) { const w = copyW(s); copyPos.set(s + '@' + v.id, { x: cx + w / 2 - 3, y: p.y + dir * (HB + 16) }); cx += w }
    }
    W = Math.max(MARGIN * 2, ...bandW, ...[...gx].map(([g, x]) => x + gapExt(g).r + MARGIN))
  }

  // 6. Settle which gap arcs are drawn: short and clear, else a copy.
  const endPt = (id: string, toward: P): P => {
    const p = pos.get(id)!
    if (states.has(id)) { const d = Math.hypot(toward.x - p.x, toward.y - p.y) || 1; return { x: p.x + ((toward.x - p.x) / d) * R, y: p.y + ((toward.y - p.y) / d) * R } }
    return { x: p.x, y: p.y + (toward.y > p.y ? HB : -HB) }
  }
  const boxes = () => {
    const bs: [string, Box][] = []
    for (const [id, p] of pos) bs.push([id, states.has(id) ? { x: p.x, y: p.y, w: 2 * R, h: 2 * R } : { x: p.x, y: p.y, w: BAR_W + 4, h: BAR_H }])
    for (const [k, p] of copyPos) bs.push([k, { x: p.x, y: p.y, w: 2 * CR, h: 2 * CR }])
    return bs
  }
  const clear = (p: P, q: P, skip: string[], bs: [string, Box][]) => {
    for (const [id, b] of bs) {
      if (skip.includes(id.split('@')[0])) continue
      for (let t = 0.04; t < 0.97; t += 0.04) { const x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t; if (Math.abs(x - b.x) < b.w / 2 + 2 && Math.abs(y - b.y) < b.h / 2 + 2) return false }
    }
    return true
  }
  for (let pass = 0; pass < 8; pass++) {
    const before = copyArc.size
    layoutAll()
    const bs = boxes()
    let changed = copyArc.size !== before
    for (const a of arcs) {
 if (copyArc.has(a.key) || sweepKeys.has(a.key) || rowPair.has(a.state + '|' + a.verb)) continue
      const p = pos.get(a.state)!, q = pos.get(a.verb)!
      if (direct.has(a.key)) { if (!onlineBar.has(a.verb) && Math.hypot(p.x - q.x, p.y - q.y) > NEAR) { copyArc.add(a.key); changed = true } continue }
      const ok = Math.abs(p.x - q.x) <= NEAR && Math.abs(p.y - q.y) <= NEAR && clear(endPt(a.state, q), endPt(a.verb, p), [a.state, a.verb], bs)
      if (!ok) { copyArc.add(a.key); changed = true }
    }
    if (!changed) break
  }
  // a gap state left with no drawn arc is shown only by its copies
  const soleCopies = new Set(net.states.filter((s) => isGap.has(s.id) && arcsOfS.get(s.id)!.length > 0 && arcsOfS.get(s.id)!.every((a) => copyArc.has(a.key))).map((s) => s.id))
  for (const s of [...soleCopies, ...hubs]) pos.delete(s)

  // 7. Geometry of every arc, state end first.
  const paths = new Map<string, P[]>()
  const verbEnd = (v: string, toward: P): P => { const p = pos.get(v)!; return (onlineBar.has(v) || isGap.has(v)) && Math.abs(toward.y - p.y) < 2 ? { x: p.x + (toward.x < p.x ? -BAR_W / 2 : BAR_W / 2), y: p.y } : { x: p.x, y: p.y + (toward.y > p.y ? HB : -HB) } }
  const circ = (c: P, toward: P, r: number): P => { const d = Math.hypot(toward.x - c.x, toward.y - c.y) || 1; return { x: c.x + ((toward.x - c.x) / d) * r, y: c.y + ((toward.y - c.y) / d) * r } }
  // sweeps: out of the bar's outer end, along a lane, into the state from outside
  const descents = new Map<string, string[]>()
  for (const a of arcs) if (sweepKeys.has(a.key)) descents.set(a.state, [...(descents.get(a.state) ?? []), a.key])
  for (const [si, sp] of spines.entries()) {
    const b = bandOf.get(si)!, o = outer(b), rr = reach[si]
    for (const a of arcs.filter((x) => sweepKeys.has(x.key) && spineOf.get(x.verb) === si)) {
      const lane = rr.lanes.get(a.key)!, ly = bandY[b] + o * (rr.laneBase + lane * LANE)
      const ds = descents.get(a.state)!.sort((p, q) => rr.lanes.get(q)! - rr.lanes.get(p)! || (p < q ? -1 : 1)), i = ds.indexOf(a.key)
      const s = pos.get(a.state)!, v = pos.get(a.verb)!
      const fromRight = v.x > s.x
      const dx = ds.length === 1 ? 0 : (fromRight ? -7 + (14 * i) / (ds.length - 1) : 7 - (14 * i) / (ds.length - 1))
      const top = { x: s.x + dx, y: s.y + o * Math.sqrt(Math.max(0, R * R - dx * dx)) }
      const vEnd = { x: v.x, y: v.y + o * HB }
      paths.set(a.key, [top, { x: top.x, y: ly }, { x: vEnd.x, y: ly }, vEnd])
    }
    void sp
  }
  for (const a of arcs) {
    if (paths.has(a.key)) continue
    if (copyArc.has(a.key)) {
      const c = copyPos.get(a.state + '@' + a.verb)!, v = pos.get(a.verb)!
      const ve = { x: v.x + 1, y: v.y + (c.y > v.y ? HB : -HB) }
      paths.set(a.key, [{ x: c.x, y: c.y + (c.y > v.y ? -CR : CR) }, ve])
      continue
    }
    const s = pos.get(a.state)!, v = pos.get(a.verb)!
    paths.set(a.key, [circ(s, verbEnd(a.verb, s), R), verbEnd(a.verb, s)])
  }
  // two arcs between one state end and one bar end are bowed apart
  const pairCount = new Map<string, number>()
  for (const a of arcs) {
    const k = a.state + '|' + a.verb, n = pairCount.get(k) ?? 0; pairCount.set(k, n + 1)
    if (!n) continue
    const pts = paths.get(a.key)!, p = pts[0], q = pts[pts.length - 1], len = Math.hypot(q.x - p.x, q.y - p.y) || 1
    const m = { x: (p.x + q.x) / 2 - ((q.y - p.y) / len) * 8 * n, y: (p.y + q.y) / 2 + ((q.x - p.x) / len) * 8 * n }
    paths.set(a.key, [p, m, q])
  }

  // 8. Render.
  const TOPKEY = on('key') ? 118 : 30
  const T = (p: P) => ({ x: f1(p.x), y: f1(p.y + TOPKEY) })
  const layout: Drawing['layout'] = { nodes: {}, arcs: {} }
  const out: string[] = []
  const seatColor = (by: string) => (by === WORLD || !on('speaker-color') ? WORLD_INK : net.seats.find((s) => s.id === by)?.color ?? INK)
  const pathD = (pts: P[]) => {
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1], u1 = Math.hypot(b.x - a.x, b.y - a.y) || 1, u2 = Math.hypot(c.x - b.x, c.y - b.y) || 1
      const r = Math.min(8, u1 / 2, u2 / 2)
      d += `L${f1(b.x - ((b.x - a.x) / u1) * r)},${f1(b.y - ((b.y - a.y) / u1) * r)}Q${b.x},${b.y} ${f1(b.x + ((c.x - b.x) / u2) * r)},${f1(b.y + ((c.y - b.y) / u2) * r)}`
    }
    const z = pts[pts.length - 1]
    return d + `L${z.x},${z.y}`
  }
  const arrow = (tip: P, from: P) => {
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x), l = 6.5, w = 3
    const b = { x: tip.x - Math.cos(ang) * l, y: tip.y - Math.sin(ang) * l }
    return `<path d="M${f1(tip.x)},${f1(tip.y)}L${f1(b.x - Math.sin(ang) * w)},${f1(b.y + Math.cos(ang) * w)}L${f1(b.x + Math.sin(ang) * w)},${f1(b.y - Math.cos(ang) * w)}Z" fill="${INK}"/>`
  }
  const arcSvg: string[] = [], textSvg: string[] = [], nodeSvg: string[] = []
  for (const a of arcs) {
    const pts = paths.get(a.key)!.map(T)
    layout.arcs[a.key] = pts
    const copy = copyArc.has(a.key)
    arcSvg.push(`<path d="${pathD(pts)}" fill="none" stroke="${INK}" stroke-width="${copy ? 0.9 : 1.1}"${a.kind === 'need' || a.kind === 'unless' ? ' stroke-dasharray="3 2"' : ''}/>`)
    const sEnd = pts[0], vEnd = pts[pts.length - 1], vPrev = pts[pts.length - 2], sNext = pts[1]
    if (!on('arc-ends')) { /* plain */ }
    else if (a.kind === 'take') arcSvg.push(arrow(vEnd, vPrev))
    else if (a.kind === 'give') arcSvg.push(arrow(sEnd, sNext))
    else { const ang = Math.atan2(vEnd.y - vPrev.y, vEnd.x - vPrev.x), c = { x: vEnd.x - Math.cos(ang) * 3, y: vEnd.y - Math.sin(ang) * 3 }; arcSvg.push(a.kind === 'need' ? `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="2.8" fill="${INK}"/>` : `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="3" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`) }
    if (a.count > 1 && on('counts')) {
      const m = pts.length === 2 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[pts.length - 2]
      textSvg.push(`<text x="${f1(m.x + 4)}" y="${f1(m.y - 2)}" font-size="10" font-weight="700" fill="${INK}" stroke="#fff" stroke-width="3" paint-order="stroke">${a.count}</text>`)
    }
  }
  const txt = (x: number, y: number, lines: string[], anchor: string, size = FONT, extra = '') => lines.map((l, i) => `<text x="${f1(x)}" y="${f1(y + i * (size === FONT ? LINE : SLINE))}" font-size="${size}" text-anchor="${anchor}" fill="${INK}" stroke="#fff" stroke-width="2.5" paint-order="stroke"${extra}>${esc(l)}</text>`).join('')
  const stateGlyph = (id: string, c: P, r: number, copy: boolean) => {
    const st = states.get(id)!, hidden = st.seenBy !== 'all' && on('hidden'), end = st.ends !== undefined && on('outcome')
    let g = `<circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${copy && on('copies-shade') ? COPY_FILL : '#fff'}" stroke="${INK}" stroke-width="${end ? 2 : 1.3}"${hidden ? ' stroke-dasharray="3 2"' : ''}/>`
    if (end) g += `<circle cx="${c.x}" cy="${c.y}" r="${r - 3.2}" fill="none" stroke="${INK}" stroke-width="1"/>`
    if (on('marks') && st.marks === 1) g += `<circle cx="${c.x}" cy="${c.y}" r="${copy ? 2.2 : 3.4}" fill="${INK}"/>`
    if (on('marks') && st.marks > 1) g += `<text x="${c.x}" y="${f1(c.y + (copy ? 3 : 3.8))}" font-size="${copy ? 8 : 10.5}" font-weight="700" text-anchor="middle" fill="${INK}">${st.marks}</text>`
    return g
  }
  for (const [id, p0] of pos) {
    const p = T(p0)
    if (states.has(id)) {
      layout.nodes[id] = { x: p.x, y: p.y, w: 2 * R, h: 2 * R }
      nodeSvg.push(stateGlyph(id, p, R, false))
      const ls = stateLines(id), bold = states.get(id)!.ends !== undefined && on('outcome') ? ' font-weight="700"' : ''
      if (isGap.has(id)) {
        const ends = arcs.filter((a) => a.state === id && !copyArc.has(a.key)).map((a) => pos.get(a.verb)!.y - p0.y)
        const above = ends.filter((d) => d < -2).length < ends.filter((d) => d > 2).length
        textSvg.push(txt(p.x, above ? p.y - R - 5 - (ls.length - 1) * LINE : p.y + R + 12, ls, 'middle', FONT, bold))
      }
      else { const b = bandOf.get(spineOf.get(id)!)!, inner = -outer(b); textSvg.push(txt(p.x, inner > 0 ? p.y + R + 12 : p.y - R - 5 - (ls.length - 1) * LINE, ls, 'middle', FONT, bold)) }
      continue
    }
    const vb = verbs.get(id)!, col = seatColor(vb.by)
    layout.nodes[id] = { x: p.x, y: p.y, w: BAR_W + 2, h: BAR_H }
    nodeSvg.push(`<rect x="${f1(p.x - BAR_W / 2)}" y="${f1(p.y - HB)}" width="${BAR_W}" height="${BAR_H}" fill="${col}"${dead.has(id) ? ' opacity="0.35"' : ''}/>`)
    const ls = verbLines(id), si = spineOf.get(id)
    const fill = ` fill="${vb.by === WORLD ? '#555' : col}"`
    if (si !== undefined && onlineBar.has(id)) {
      const o = outer(bandOf.get(si)!)
      textSvg.push(txt(p.x + 4, o < 0 ? p.y - HB - 4 - (ls.length - 1) * LINE : p.y + HB + 11, ls, 'start', FONT, fill))
    } else if (si === undefined) textSvg.push(txt(p.x + 5, p.y - HB - 4 - (ls.length - 1) * LINE, ls, 'start', FONT, fill))
    else textSvg.push(txt(p.x + 6, p.y + 4 - ((ls.length - 1) * LINE) / 2, ls, 'start', FONT, fill))
    if (ordinal.has(id) && on('order')) textSvg.push(`<text x="${f1(p.x - BAR_W / 2 - 2)}" y="${f1(p.y + 4)}" font-size="10" font-weight="700" text-anchor="end" fill="#555" stroke="#fff" stroke-width="2.5" paint-order="stroke">${ordinal.get(id)}</text>`)
  }
  // copies
  const copyIx = new Map<string, number>()
  for (const v of [...net.verbs].sort((a, b) => byOrder(a.id, b.id))) for (const s of copiesOf(v.id)) {
    const n = copyIx.get(s) ?? 0; copyIx.set(s, n + 1)
    const p = T(copyPos.get(s + '@' + v.id)!)
    layout.nodes[`${s}#${n}`] = { x: p.x, y: p.y, w: 2 * CR, h: 2 * CR }
    nodeSvg.push(stateGlyph(s, p, CR, true))
    const ls = copyLines(s), below = copyPos.get(s + '@' + v.id)!.y > pos.get(v.id)!.y
    textSvg.push(txt(p.x, below ? p.y + CR + 9 : p.y - CR - 4 - (ls.length - 1) * SLINE, ls, 'middle', SFONT, ` fill="#333"${states.get(s)!.ends ? ' font-weight="700"' : ''}`))
  }

  // header, key, analysis
  const head: string[] = []
  head.push(`<text x="${MARGIN}" y="18" font-size="13" font-weight="700" fill="${INK}">${esc(net.title)}</text>`)
  let kx = MARGIN
  head.push(`<text x="${kx}" y="36" font-size="10.5" fill="#444">Seats:</text>`); kx += 40
  for (const s of net.seats) { head.push(`<rect x="${kx}" y="${36 - 11}" width="${BAR_W}" height="13" fill="${seatColor(s.id)}"/><text x="${kx + 8}" y="36" font-size="10.5" fill="${INK}">${esc(s.name)}</text>`); kx += 18 + s.name.length * CH }
  head.push(`<rect x="${kx}" y="25" width="${BAR_W}" height="13" fill="${WORLD_INK}"/><text x="${kx + 8}" y="36" font-size="10.5" fill="${INK}">the world</text>`)
  const KEYW = 760
  if (on('key')) {
    const k: string[] = [], ky = 48
    k.push(`<rect x="${MARGIN}" y="${ky}" width="${KEYW}" height="62" fill="none" stroke="#bbb"/>`)
    const row = (y: number, items: [string, string][]) => { let x = MARGIN + 8; for (const [g, t] of items) { k.push(g.replace(/@X/g, String(x)).replace(/@Y/g, String(y))); k.push(`<text x="${x + 22}" y="${y + 4}" font-size="9.5" fill="#333">${esc(t)}</text>`); x += 30 + t.length * 5.1 } }
    row(ky + 13, [
      [`<circle cx="@X" cy="@Y" r="6" fill="#fff" stroke="${INK}" stroke-width="1.2" transform="translate(8 0)"/><circle cx="@X" cy="@Y" r="2.4" fill="${INK}" transform="translate(8 0)"/>`, 'state; dot = one mark, number = marks'],
      [`<circle cx="@X" cy="@Y" r="6" fill="#fff" stroke="${INK}" stroke-width="2" transform="translate(8 0)"/><circle cx="@X" cy="@Y" r="3" fill="none" stroke="${INK}" transform="translate(8 0)"/>`, 'ends play (result in bold)'],
      [`<circle cx="@X" cy="@Y" r="6" fill="#fff" stroke="${INK}" stroke-dasharray="3 2" transform="translate(8 0)"/>`, 'hidden from some seat'],
      [`<circle cx="@X" cy="@Y" r="5" fill="${COPY_FILL}" stroke="${INK}" transform="translate(8 0)"/>`, 'copy: same name, same state'],
    ])
    row(ky + 31, [
      [`<path d="M@X @YL0 0" transform="translate(0 0)"/><line x1="@X" y1="@Y" x2="@X" y2="@Y" stroke="${INK}"/><g transform="translate(@X @Y)"><line x1="0" y1="0" x2="12" y2="0" stroke="${INK}"/><path d="M16,0L10,-3L10,3Z" fill="${INK}"/></g>`, 'take / give: a mark moves'],
      [`<g transform="translate(@X @Y)"><line x1="0" y1="0" x2="13" y2="0" stroke="${INK}" stroke-dasharray="3 2"/><circle cx="14" cy="0" r="2.6" fill="${INK}"/></g>`, 'need: only if marked'],
      [`<g transform="translate(@X @Y)"><line x1="0" y1="0" x2="12" y2="0" stroke="${INK}" stroke-dasharray="3 2"/><circle cx="14" cy="0" r="3" fill="#fff" stroke="${INK}"/></g>`, 'unless: only if not marked (count = threshold)'],
      [`<g transform="translate(@X @Y)"><text x="12" y="4" font-size="10" font-weight="700" fill="${INK}">2</text></g>`, 'count'],
    ])
    row(ky + 49, [
      [`<g transform="translate(@X @Y)"><text x="8" y="4" font-size="10" font-weight="700" text-anchor="end" fill="#555">1</text><rect x="10" y="-7" width="${BAR_W}" height="14" fill="${WORLD_INK}"/></g>`, 'the world answers first, 1 before 2, until silent; same number: chance by ×weight'],
      [`<g transform="translate(@X @Y)"><text x="6" y="4" font-size="10">▸</text></g>`, 'open at the first resting moment'],
    ])
    head.push(...k)
  }
  const foot: string[] = []
  let FH = 0
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
    const wrapped = lines.flatMap((l) => wrap(l, Math.max(60, Math.floor((Math.max(W, KEYW + 2 * MARGIN) - 2 * MARGIN) / 5.6))))
    FH = 16 + wrapped.length * 13
    foot.push(`<line x1="${MARGIN}" y1="${f1(Hnet + TOPKEY + 2)}" x2="${f1(Math.max(W, KEYW + MARGIN * 2) - MARGIN)}" y2="${f1(Hnet + TOPKEY + 2)}" stroke="#bbb"/>`)
    wrapped.forEach((l, i) => foot.push(`<text x="${MARGIN}" y="${f1(Hnet + TOPKEY + 16 + i * 13)}" font-size="10.5" fill="#333">${esc(l)}</text>`))
  }
  const Wt = Math.ceil(Math.max(W, on('key') ? KEYW + 2 * MARGIN : 0, kx + 80)), Ht = Math.ceil(Hnet + TOPKEY + FH + 10)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wt}" height="${Ht}" viewBox="0 0 ${Wt} ${Ht}" font-family="Helvetica, Arial, sans-serif"><rect width="${Wt}" height="${Ht}" fill="#fff"/>${head.join('')}<g>${arcSvg.join('')}</g><g>${nodeSvg.join('')}</g><g>${textSvg.join('')}</g>${foot.join('')}</svg>`
  return { svg, width: Wt, height: Ht, layout }
}

const elements: Element[] = [
  { id: 'spines', what: 'Each entity (a set of states that always holds exactly one mark) is one straight horizontal spine: its states in walk order from the marked state, the verbs that move it as bars between them. Each bar sits beside the rightmost state of the spine it touches: between two states for a step, just before the target for a skip, just after the source for a return; extra bars in one slot are raised off the line.', purpose: 'An entity is always in one of its states; one line per entity makes that the first thing seen, as in the dining philosophers figure.', serves: ['entity', 'readable', 'compare-shape', 'napkin'] },
  { id: 'returns', what: 'Arcs to a state that is not next to the bar sweep around the outside of the spine in nested lanes, shortest innermost.', purpose: 'Loops read as loops and the spine stays one line, as in the dining philosophers figure.', serves: ['loop', 'readable'] },
  { id: 'gaps', what: 'States in no entity and verbs that move no entity sit in a row in the gap between the spines they touch, at the average position of what they connect to.', purpose: 'Coupling states (a beat, stamina) sit between the processes they couple, and a contact verb sits beside the states it reads.', serves: ['contact', 'counts', 'readable'] },
  { id: 'hubs', what: 'A state in no entity that touches five or more verbs has no single position: it is drawn as a copy beside each verb.', purpose: 'Fusion places (coloured Petri nets): a beat or a counter reads as a local fact at every verb instead of a fan of long lines.', serves: ['readable', 'contact', 'counts'] },
  { id: 'copies-shade', what: 'A copy is a small grey circle with the state\'s name; any arc that would be long, cross a spine, or run into a node goes to a copy beside its verb instead.', purpose: 'No arc ever needs tracing; contact between spines reads as a name beside the verb that depends on it.', serves: ['contact', 'readable', 'content'] },
  { id: 'grid', what: 'Three or more spines of the same shape stand in a square grid.', purpose: 'Identical parts are drawn identically and side by side.', serves: ['compare-shape', 'readable'] },
  { id: 'speaker-color', what: 'A seat\'s bars and labels are in its color; the world\'s are grey.', purpose: 'Who speaks each verb.', serves: ['conversation'] },
  { id: 'order', what: 'Each world bar carries a number: the order the world tries its answers, 1 first. Equal numbers are a chance tie, with ×weight on each label.', purpose: 'Turn order of the world\'s answers, read directly instead of compared from raw priorities.', serves: ['conversation', 'actionable', 'counts'] },
  { id: 'first', what: '▸ before the label of every verb a seat can say at the first resting moment, and a line naming who chooses first.', purpose: 'Who speaks first.', serves: ['conversation', 'possibility'] },
  { id: 'arc-ends', what: 'take and give: solid with an arrow where the mark goes. need: dashed to a dot. unless: dashed to an open ring.', purpose: 'Moving a mark versus reading a state, and presence versus absence.', serves: ['content', 'contact', 'possibility'] },
  { id: 'counts', what: 'Arc counts above 1 in bold beside the arc; marks above 1 as a number in the circle.', purpose: 'Costs, thresholds and counters are on the map.', serves: ['counts', 'actionable'] },
  { id: 'marks', what: 'A dot for one starting mark, the number for more, on every copy too.', purpose: 'Where play starts.', serves: ['possibility', 'counts'] },
  { id: 'outcome', what: 'An outcome is a heavy circle with an inner ring, its result in bold.', purpose: 'Where play ends.', serves: ['possibility', 'actionable'] },
  { id: 'hidden', what: 'A dashed circle and "(seen by ...)" for a state some seat cannot see.', purpose: 'Hidden information.', serves: ['conversation', 'possibility'] },
  { id: 'key', what: 'A fixed key at the top: every mark, line end, number and the turn rule.', purpose: 'A cold reader can decode every mark without guessing.', serves: ['readable', 'conversation', 'counts'] },
  { id: 'analysis', what: 'Engine facts under the net: resting moments, who chooses first, outcomes with ending positions, plays, stalls, dead verbs; capped exploration says so.', purpose: 'What the engine finds is printed beside the picture, so a designer can check a reading against it.', serves: ['actionable', 'possibility'] },
]

export const design: Design = {
  id: 'spinenet',
  title: 'Spinenet: straight spines, coupling between, copies for what is far',
  idea: 'Each entity is one straight horizontal spine of its states and the bars that move it, with returns swept around the outside, as in the dining philosophers figure. States and verbs that belong to no entity sit in the gap between the spines they couple. Any arc that would be long or would cross a spine goes instead to a small named copy of its state beside the verb (a fusion place), so no line ever needs tracing; a key, the world\'s answer order and the engine\'s facts are printed on the page.',
  rules: [
    'Entities: find sets of states that always hold exactly one mark between them (every verb that takes from the set gives back into it), leaving outcomes out. Smaller sets claim first.',
    'Draw each entity as a horizontal line: its marked state first, then each state in order of its longest walk from there.',
    'A verb belongs to the smallest entity it moves (takes from and gives back into). Any other verb is a gap verb.',
    'Put each bar beside the rightmost state of its line that it touches: between the states for a one-step move, just before the target for a skip, just after the source for a return or exit. If a slot holds more than one bar, only the step stays on the line; the rest are raised to the outside.',
    'Arcs to a state of the line that is not next to the bar sweep around the outside in lanes, shortest innermost. The first line (or the first grid) sweeps above; every other line sweeps below.',
    'Order the lines top to bottom so the most coupled are neighbours. Three or more lines of the same shape stand in a square grid, in label order.',
    'Every state in no entity and every gap verb sits in a row in the gap between the lines it touches, at the average position of what it is drawn connected to.',
    'A state in no entity touching five or more verbs is a hub: draw a copy of it beside each verb instead.',
    'Neighbours in a gap row are always joined. Any other arc is a straight line only if it joins a gap row to a line beside it, runs at most 140 px across and 140 px down, and touches no other node; a raised bar\'s arc to its own line only if under 140 px. Otherwise draw a small grey copy of the state hanging from the bar\'s free end, and connect that.',
    'States are circles (dot = one mark, number = more), outcomes heavy with an inner ring, hidden states dashed. Verbs are thin bars in the speaker\'s color, the world grey with its answer order number (1 first) at the left; equal numbers are chance, weight as ×n.',
    'take and give are solid arrows; need is dashed to a dot; unless is dashed to a ring. Print counts above 1. ▸ marks the verbs open at the first resting moment.',
    'Labels beside their node: a state on the inner side of its line, a bar to its right. Put the key at the top and the engine facts at the bottom.',
  ],
  elements,
  axes: {
    x: 'along a spine, the longest walk from the entity\'s marked state; in a gap, the average position of what a node connects to',
    y: 'which entity, the most coupled adjacent, with coupling states and gap verbs in rows between',
    placement: 'invariants pick the spines; each verb in a slot beside the rightmost state it touches; far contacts become fusion copies',
    verb: 'thin vertical bar on or just off the spine, label to its right',
    speaker: 'bar color; the world grey with its answer order 1, 2, 3',
    entity: 'one straight horizontal spine of its states',
    routing: 'straight between neighbours, returns in nested lanes outside the spine, everything far drawn as a named copy beside the verb',
    unit: 'one whole net with key and engine facts',
  },
  draw,
}
