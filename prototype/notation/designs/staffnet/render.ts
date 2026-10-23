// PROTOTYPE. The `staffnet` convention: score's staves and columns, drawn as a Petri net.
import { WORLD, initialMarking, type Net } from '../../../../studio/src/core/model'
import { compile, whoseTurn } from '../../../../studio/src/core/engine'
import { analyze } from '../../../../studio/src/core/analyze'
import { arcKey, type Box, type Design, type Drawing, type Pt } from '../../harness/contract'

// ---------- structure: a canonical rank for every node, from structure alone ----------

type Colors = Map<string, number>
const pad = (n: number) => String(n).padStart(4, '0')

function canonicalRank(net: Net): Map<string, number> {
  const seatIx = (by: string) => (by === WORLD ? 999 : net.seats.findIndex((s) => s.id === by))
  const init = new Map<string, string>()
  for (const s of net.states) init.set(s.id, `S|${pad(s.marks)}|${s.ends !== undefined ? 1 : 0}|${s.seenBy === 'all' ? 'all' : s.seenBy.length}`)
  for (const v of net.verbs) init.set(v.id, `V|${pad(seatIx(v.by))}|${pad(1000 - v.priority)}|${pad(v.weight)}`)
  const adj = new Map<string, [string, string][]>([...init.keys()].map((k) => [k, []]))
  for (const a of net.arcs) {
    adj.get(a.state)?.push([a.verb, `${a.kind}${a.count}`])
    adj.get(a.verb)?.push([a.state, `${a.kind}${a.count}`])
  }
  const ids = [...init.keys()]
  const index = (sig: Map<string, string>): Colors => {
    const sorted = [...new Set(sig.values())].sort()
    return new Map(ids.map((id) => [id, sorted.indexOf(sig.get(id)!)]))
  }
  const count = (c: Colors) => new Set(c.values()).size
  const refine = (c: Colors): Colors => {
    for (;;) {
      const sig = new Map(ids.map((id) => [id, `${pad(c.get(id)!)}|${adj.get(id)!.map(([n, l]) => `${l}:${pad(c.get(n)!)}`).sort().join(',')}`]))
      const next = index(sig)
      if (count(next) === count(c)) return next
      c = next
    }
  }
  const cert = (c: Colors) => net.arcs.map((a) => `${pad(c.get(a.state)!)},${pad(c.get(a.verb)!)},${a.kind}${a.count}`).sort().join(';')
  let best: { cert: string; c: Colors } | undefined
  let leaves = 0
  const search = (c: Colors) => {
    c = refine(c)
    const cells = new Map<number, string[]>()
    for (const id of ids) cells.set(c.get(id)!, [...(cells.get(c.get(id)!) ?? []), id])
    const cell = [...cells.entries()].filter(([, m]) => m.length > 1).sort((a, b) => a[0] - b[0])[0]
    if (!cell) {
      leaves++
      const k = cert(c)
      if (!best || k < best.cert) best = { cert: k, c }
      return
    }
    for (const m of cell[1]) {
      if (leaves > 400) return
      const d: Colors = new Map(ids.map((id) => [id, c.get(id)! * 2]))
      d.set(m, c.get(m)! * 2 - 1)
      search(d)
    }
  }
  search(index(init))
  return best!.c
}

// ---------- structure: entities are the 0/1 place invariants holding exactly one mark ----------

function invariants(net: Net): string[][] {
  const S = net.states.map((s) => s.id), V = net.verbs.map((v) => v.id)
  const col = new Map(V.map((v, j) => [v, j]))
  type Row = { vec: number[]; y: number[] }
  let rows: Row[] = S.map((_, i) => ({ vec: V.map(() => 0), y: S.map((_, k) => (k === i ? 1 : 0)) }))
  const si = new Map(S.map((s, i) => [s, i]))
  for (const a of net.arcs) {
    if (a.kind === 'take') rows[si.get(a.state)!].vec[col.get(a.verb)!] -= a.count
    if (a.kind === 'give') rows[si.get(a.state)!].vec[col.get(a.verb)!] += a.count
  }
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))
  const supp = (r: Row) => r.y.map((x, i) => (x ? i : -1)).filter((i) => i >= 0)
  for (let j = 0; j < V.length; j++) {
    const keep = rows.filter((r) => r.vec[j] === 0)
    const pos = rows.filter((r) => r.vec[j] > 0), neg = rows.filter((r) => r.vec[j] < 0)
    for (const p of pos) for (const n of neg) {
      const a = -n.vec[j], b = p.vec[j]
      const vec = p.vec.map((x, k) => a * x + b * n.vec[k]), y = p.y.map((x, k) => a * x + b * n.y[k])
      const g = [...vec, ...y].reduce(gcd, 0) || 1
      keep.push({ vec: vec.map((x) => x / g), y: y.map((x) => x / g) })
      if (keep.length > 3000) break
    }
    const sets = keep.map(supp)
    rows = keep.filter((_, i) => !sets.some((t, k) => k !== i && t.length < sets[i].length && t.every((x) => sets[i].includes(x))))
    const seen = new Set<string>()
    rows = rows.filter((r) => { const k = supp(r).join(','); if (seen.has(k)) return false; seen.add(k); return true })
  }
  const marks = new Map(net.states.map((s) => [s.id, s.marks]))
  return rows
    .filter((r) => r.vec.every((x) => x === 0) && r.y.every((x) => x === 0 || x === 1))
    .map((r) => supp(r).map((i) => S[i]))
    .filter((ss) => ss.reduce((m, s) => m + marks.get(s)!, 0) === 1)
}

// ---------- arrangement: staves of rows, measures of columns ----------

type StaffKind = 'entity' | 'loose'
interface Staff { kind: StaffKind; states: string[]; coupling: string[] }
interface Measure { by: string; tier?: number; verbs: string[] }

function arrange(net: Net) {
  const rank = canonicalRank(net)
  const cr = (id: string) => rank.get(id)!
  const isOutcome = new Set(net.states.filter((s) => s.ends !== undefined).map((s) => s.id))
  const speakerIx = (by: string) => (by === WORLD ? net.seats.length : net.seats.findIndex((s) => s.id === by))
  const verb = new Map(net.verbs.map((v) => [v.id, v]))
  const arcsOf = (v: string) => net.arcs.filter((a) => a.verb === v)

  const cands = invariants(net).map((ss) => ss.filter((s) => !isOutcome.has(s))).filter((ss) => ss.length >= 2)
    .sort((a, b) => b.length - a.length || Math.min(...a.map(cr)) - Math.min(...b.map(cr)))
  const used = new Set<string>(), entities: string[][] = []
  for (const c of cands) if (c.every((s) => !used.has(s))) { entities.push(c); c.forEach((s) => used.add(s)) }

  const voice = (ss: string[]) => {
    const n = new Map<number, number>()
    for (const a of net.arcs) if (a.kind === 'take' && ss.includes(a.state)) { const k = speakerIx(verb.get(a.verb)!.by); n.set(k, (n.get(k) ?? 0) + 1) }
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? net.seats.length + 1
  }
  const flow = (ss: string[]) => {
    const start = ss.find((s) => net.states.find((x) => x.id === s)!.marks > 0) ?? [...ss].sort((a, b) => cr(a) - cr(b))[0]
    const order = [start], q = [start]
    while (q.length) {
      const s = q.shift()!
      const next = net.arcs.filter((a) => a.kind === 'take' && a.state === s)
        .flatMap((a) => arcsOf(a.verb).filter((b) => b.kind === 'give' && ss.includes(b.state)).map((b) => b.state))
      for (const t of [...new Set(next)].sort((a, b) => cr(a) - cr(b))) if (!order.includes(t)) { order.push(t); q.push(t) }
    }
    return [...order, ...ss.filter((s) => !order.includes(s)).sort((a, b) => cr(a) - cr(b))]
  }
  const staves: Staff[] = entities
    .map((ss) => ({ ss, v: voice(ss), m: Math.min(...ss.map(cr)) }))
    .sort((a, b) => a.v - b.v || b.ss.length - a.ss.length || a.m - b.m)
    .map(({ ss }) => ({ kind: 'entity' as const, states: flow(ss), coupling: [] }))

  // a state in no entity is a coupling place: it sits just under the entity whose verbs touch it most
  const staffOf = new Map<string, number>()
  staves.forEach((st, i) => st.states.forEach((s) => staffOf.set(s, i)))
  const loose: string[] = []
  const pending = net.states.filter((s) => !used.has(s.id) && !isOutcome.has(s.id)).map((s) => s.id).sort((a, b) => cr(a) - cr(b))
  for (let placed = true; placed; ) {
    placed = false
    for (const s of pending.filter((s) => !staffOf.has(s))) {
      const votes = staves.map(() => 0)
      for (const a of net.arcs.filter((a) => a.state === s)) {
        const touched = new Set(arcsOf(a.verb).map((b) => staffOf.get(b.state)).filter((i) => i !== undefined) as number[])
        for (const i of touched) votes[i]++
      }
      const best = votes.reduce((b, n, i) => (n > votes[b] ? i : b), 0)
      if (staves.length && votes[best] > 0) { staves[best].coupling.push(s); staffOf.set(s, best); placed = true }
    }
  }
  for (const st of staves) st.coupling.sort((a, b) => cr(a) - cr(b))
  loose.push(...pending.filter((s) => !staffOf.has(s)))
  if (loose.length) staves.push({ kind: 'loose', states: loose, coupling: [] })

  const row = new Map<string, number>()
  staves.flatMap((s) => [...s.states, ...s.coupling]).forEach((s, i) => row.set(s, i))

  const measures: Measure[] = []
  for (const seat of net.seats) measures.push({ by: seat.id, verbs: net.verbs.filter((v) => v.by === seat.id).map((v) => v.id) })
  const pr = [...new Set(net.verbs.filter((v) => v.by === WORLD).map((v) => v.priority))].sort((a, b) => b - a)
  pr.forEach((p, i) => measures.push({ by: WORLD, tier: i + 1, verbs: net.verbs.filter((v) => v.by === WORLD && v.priority === p).map((v) => v.id) }))
  const key = (v: string) => {
    const as = arcsOf(v).filter((a) => row.has(a.state)), rows = (k: string[]) => as.filter((a) => k.includes(a.kind)).map((a) => row.get(a.state)!)
    const first = rows(['take']).length ? Math.min(...rows(['take'])) : Math.min(...rows(['take', 'give', 'need', 'unless']), 1e6)
    return [first, Math.min(...rows(['give']), 1e6), Math.min(...rows(['need', 'unless']), 1e6), cr(v)]
  }
  for (const m of measures) m.verbs.sort((a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]; return 0 })
  return { staves, measures: measures.filter((m) => m.verbs.length) }
}

/** World verbs in one tier with identical inputs: whenever one can be said all can, so chance picks among them by weight. */
function chanceGroups(net: Net, m: Measure): string[][] {
  if (m.by !== WORLD || m.verbs.length < 2) return []
  const inputs = (v: string) => net.arcs.filter((a) => a.verb === v && a.kind !== 'give').map((a) => `${a.kind}${a.count}|${a.state}`).sort().join(',')
  const groups = new Map<string, string[]>()
  for (const v of m.verbs) groups.set(inputs(v), [...(groups.get(inputs(v)) ?? []), v])
  return [...groups.values()].filter((g) => g.length > 1)
}

// ---------- analysis: the engine's facts about the net ----------

const LIMIT = 20_000

interface Facts {
  complete: boolean
  /** settled positions where some seat must choose */
  resting: number
  /** seats that may speak at the first resting moment */
  first: string[]
  /** the world answers before any seat speaks */
  worldFirst: boolean
  outcomes: [string, number][]
  plays: number | 'endless' | 'unknown'
  dead: string[]
}

function facts(net: Net): Facts {
  const a = analyze(net, LIMIT)
  const c = compile(net)
  const nodes = [...a.nodes.values()]
  const first = new Set<string>()
  for (const k of a.root) for (const e of a.nodes.get(k)?.next ?? []) first.add(e.speaker)
  return {
    complete: a.complete,
    resting: nodes.filter((n) => n.next.length > 0).length,
    worldFirst: whoseTurn(c, initialMarking(net)).kind === 'world',
    first: net.seats.map((s) => s.id).filter((s) => first.has(s)),
    outcomes: [...a.outcomes.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)),
    plays: a.plays,
    dead: a.deadVerbs,
  }
}

// ---------- drawing ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tw = (s: string, size: number) => s.length * size * 0.56
const WORLD_INK = '#555'
const RAIL = '#c8c8c8'
const fmt = (n: number) => n.toLocaleString('en-US')

/** Greedy word wrap to lines of at most `n` characters. */
const wrap = (s: string, n: number): string[] => {
  const out: string[] = []
  for (const w of s.split(' ')) {
    const last = out[out.length - 1]
    if (last !== undefined && last.length + 1 + w.length <= n) out[out.length - 1] = last + ' ' + w
    else out.push(w)
  }
  return out
}

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const off = new Set(opts?.without ?? [])
  const on = (e: string) => !off.has(e)
  const { staves, measures } = arrange(net)
  const F = on('analysis') || on('turn-order') ? facts(net) : undefined
  const state = new Map(net.states.map((s) => [s.id, s]))
  const verb = new Map(net.verbs.map((v) => [v.id, v]))
  const ink = (by: string) => (by === WORLD ? WORLD_INK : net.seats.find((s) => s.id === by)?.color ?? '#000')
  const seatName = (by: string) => net.seats.find((s) => s.id === by)?.name ?? by

  const RH = 17, SG = 20, CW = 56, MG = 24, PG = 4, LF = 11, VF = 9.5, VLH = 10.5, CHARS = 10, R = 6.5
  const label = (id: string) => {
    const s = state.get(id)!
    const seen = s.seenBy === 'all' ? '' : s.seenBy.length ? ` (seen by ${s.seenBy.map(seatName).join(', ')})` : ' (hidden)'
    return s.label + seen
  }
  const LX = 12 + Math.max(...net.states.filter((s) => s.ends === undefined).map((s) => tw(label(s.id), LF)), 60)
  const HX = LX + 8 + R, X0 = HX + R + 30

  // columns
  const colX = new Map<string, number>()
  const span: { m: Measure; x0: number; x1: number }[] = []
  let x = X0
  measures.forEach((m, i) => {
    if (i) x += measures[i - 1].by !== m.by ? MG : PG
    const x0 = x
    m.verbs.forEach((v) => { colX.set(v, x + CW / 2); x += CW })
    span.push({ m, x0, x1: x })
  })
  const XE = x

  // rows
  const rowY = new Map<string, number>()
  const staffSpan: { st: Staff; y0: number; y1: number }[] = []
  let y = 0
  staves.forEach((st, i) => {
    if (i) y += SG
    const y0 = y
    st.states.forEach((s) => { rowY.set(s, y); y += RH })
    const y1 = y - RH
    if (st.coupling.length) y += 4
    st.coupling.forEach((s) => { rowY.set(s, y); y += RH })
    staffSpan.push({ st, y0, y1 })
  })
  const rowsH = y - RH

  // labels sit above the top of each bar; the header grows to fit the highest one
  const lines = new Map(net.verbs.map((v) => [v.id, wrap(v.label, CHARS)]))
  // hubs: a state whose verbs reach into three or more other staves is drawn again under each such verb (fusion)
  const staffIx = new Map<string, number>()
  staves.forEach((st, i) => [...st.states, ...st.coupling].forEach((s) => staffIx.set(s, i)))
  const otherStaves = (v: string, s: string) => new Set(net.arcs.filter((a) => a.verb === v && staffIx.has(a.state) && staffIx.get(a.state) !== staffIx.get(s)).map((a) => staffIx.get(a.state)!))
  const hubs = new Set(on('fusion') ? [...staffIx.keys()].filter((s) => {
    const reach = new Set<number>()
    for (const a of net.arcs.filter((a) => a.state === s)) for (const i of otherStaves(a.verb, s)) reach.add(i)
    return reach.size >= 3
  }) : [])
  const plainRows = (v: string) => net.arcs.filter((b) => b.verb === v && staffIx.has(b.state) && !hubs.has(b.state))
  const fused = new Set(net.arcs.filter((a) => {
    if (!hubs.has(a.state)) return false
    const own = plainRows(a.verb)
    if (own.some((b) => staffIx.get(b.state) === staffIx.get(a.state))) return false
    return !own.length ? otherStaves(a.verb, a.state).size > 0 || net.arcs.some((b) => b.verb === a.verb && hubs.has(b.state) && staffIx.get(b.state) !== staffIx.get(a.state)) : true
  }).map(arcKey))
  const onRow = (a: { kind: string; state: string; verb: string }) => rowY.has(a.state) && !fused.has(arcKey(a))
  const rowArcs = (v: string) => net.arcs.filter((a) => a.verb === v && onRow(a))
  const topOf = (v: string) => Math.min(...rowArcs(v).map((a) => rowY.get(a.state)! - (a.kind === 'take' || a.kind === 'give' ? 6 : 0)), 0)
  const tierTag = (v: string) => verb.get(v)!.by === WORLD && on('order')
  const labelH = (v: string) => (lines.get(v)!.length + 1) * VLH + (tierTag(v) ? 14 : 0)
  const wf = on('turn-order') && F!.worldFirst
  const firsts = new Set(on('turn-order') ? F!.first : [])
  const heads: { x: number; text: string; note: string; color: string; line: number }[] = []
  for (const sp of span) if (sp.m.by !== WORLD) {
    const note = !firsts.has(sp.m.by) ? '' : (firsts.size > 1 ? 'may ' : '') + (wf ? 'choose first' : 'speak first')
    heads.push({ x: sp.x0 + 4, text: seatName(sp.m.by), note: firsts.size > 1 || wf ? note : note.replace('speak', 'speaks'), color: ink(sp.m.by), line: 0 })
  }
  const ws = span.filter((s) => s.m.by === WORLD)
  if (ws.length) heads.push({ x: ws[0].x0 + 4, text: 'the world answers', note: [wf ? 'speaks first' : '', on('order') ? 'tries 1, 2, 3… in turn' : ''].filter(Boolean).join(', then '), color: WORLD_INK, line: 0 })
  const headW = (h: { text: string; note: string }) => Math.max(h.text.length * 12.5 * 0.6, h.note.length * 10.5 * 0.55)
  heads.forEach((h, i) => { if (i && heads[i - 1].line === 0 && heads[i - 1].x + headW(heads[i - 1]) + 10 > h.x) h.line = 1 })
  const HEAD = 44 + (heads.some((h) => h.line) ? 30 : 0)
  const Y0 = HEAD + Math.max(...net.verbs.map((v) => labelH(v.id) + 10 - topOf(v.id)), 0)
  for (const [k, v] of rowY) rowY.set(k, v + Y0)
  for (const s of staffSpan) { s.y0 += Y0; s.y1 += Y0 }
  const YE = Y0 + rowsH

  const out: string[] = []
  const nodes: Record<string, Box> = {}
  const arcs: Record<string, Pt[]> = {}
  const txt = (x: number, y: number, s: string, a = '') => out.push(`<text x="${x}" y="${y}"${a}>${esc(s)}</text>`)
  const HALO = ' stroke="#fff" stroke-width="3" paint-order="stroke" stroke-linejoin="round"'

  // the conversation header: each seat over its verbs, then the world
  for (const h of heads) {
    txt(h.x, 18 + h.line * 30, h.text, ` font-size="12.5" font-weight="700" fill="${h.color}"`)
    if (h.note) txt(h.x, 31 + h.line * 30, h.note, ` font-size="10.5" font-style="italic" fill="${h.color}"`)
  }

  /** how far a verb's bar and stem reach, top to bottom */
  const extent = (v: string): [number, number] => {
    const as = rowArcs(v), ys = as.map((a) => rowY.get(a.state)!), mv = as.filter((a) => a.kind === 'take' || a.kind === 'give' || !on('stems')).map((a) => rowY.get(a.state)!)
    if (!ys.length) return [Y0 - 6, Y0 + 6]
    return [Math.min(...ys, ...mv.map((y) => y - 6)), Math.max(...ys, ...mv.map((y) => y + 6))]
  }

  // hung copies: outcomes, and hubs reached from other staves, hang beside a stem under the bar
  const hangRank = (a: { state: string }) => rowY.get(a.state) ?? 1e6
  const terminals = net.arcs.filter((a) => !onRow(a)).sort((p, q) => colX.get(p.verb)! - colX.get(q.verb)! || hangRank(p) - hangRank(q) || (p.state < q.state ? -1 : 1))
  const QR = R - 0.5, QX = 12, QLH = 9.5
  const hang = new Map<string, { cy: number; ls: string[]; top: number; h: number }>()
  const stemEnd = new Map<string, number>()
  {
    const below = new Map<string, number>()
    for (const a of terminals) {
      const S = state.get(a.state)!
      const y0 = below.get(a.verb) ?? extent(a.verb)[1] + 4, cy = y0 + QR + 4
      const ls = wrap(S.ends !== undefined ? S.ends : S.label, CHARS)
      const top = cy - QR, h = 2 * QR + 7 + ls.length * QLH
      hang.set(arcKey(a), { cy, ls, top, h })
      below.set(a.verb, top + h + 4)
      stemEnd.set(a.verb, cy)
    }
  }
  const reach = (v: string): [number, number] => { const [t, b] = extent(v); return [t, Math.max(b, stemEnd.has(v) ? (below0(v)) : b)] }
  const below0 = (v: string) => Math.max(...terminals.filter((a) => a.verb === v).map((a) => { const q = hang.get(arcKey(a))!; return q.top + q.h }))

  // rails: a place's circle at the head of its line, the line running to its last use
  const lastUse = new Map<string, number>()
  for (const a of net.arcs) if (onRow(a)) lastUse.set(a.state, Math.max(lastUse.get(a.state) ?? 0, colX.get(a.verb)! + 14))
  for (const { st, y0, y1 } of staffSpan) {
    if (st.kind === 'entity' && on('spines')) out.push(`<rect x="${HX - R - 3}" y="${y0 - R - 3}" width="${2 * R + 6}" height="${y1 - y0 + 2 * R + 6}" rx="${R + 3}" fill="#ececec"/>`)
    for (const s of [...st.states, ...st.coupling]) {
      const ry = rowY.get(s)!, S = state.get(s)!
      const hidden = S.seenBy !== 'all' && on('hidden')
      const end = lastUse.get(s) ?? HX + 20
      if (on('rails')) {
        const gaps: [number, number][] = []
        if (on('gaps')) for (const v of net.verbs) {
          const gx = colX.get(v.id)!, [t, b] = extent(v.id)
          if (gx >= end) continue
          if (t < ry && ry < b && !rowArcs(v.id).some((a) => a.state === s)) gaps.push([gx - 4, gx + 4])
          else if (stemEnd.has(v.id) && b <= ry && ry < below0(v.id) + 2) gaps.push([gx - QX - CW / 2 + 4, gx + 4])
        }
        gaps.sort((p, q) => p[0] - q[0])
        let x0 = HX + R
        const d = [...gaps.map(([g0, g1]) => { const seg = `M${x0} ${ry} H${Math.max(x0, g0)}`; x0 = Math.max(x0, g1); return seg }), `M${x0} ${ry} H${Math.max(x0, end)}`].join(' ')
        out.push(`<path d="${d}" stroke="${RAIL}" stroke-width="0.9" fill="none"${hidden ? ' stroke-dasharray="3 3"' : ''}/>`)
      }
      const t = label(s), outcome = S.ends !== undefined && on('outcomes')
      txt(LX, ry + 3.8, t, ` font-size="${LF}" text-anchor="end" fill="#222"${outcome ? ' font-weight="700"' : ''}`)
      out.push(`<circle cx="${HX}" cy="${ry}" r="${R}" fill="#fff" stroke="#222" stroke-width="${outcome ? 2 : 1.2}"${hidden ? ' stroke-dasharray="2.2 1.6"' : ''}/>`)
      if (outcome) out.push(`<circle cx="${HX}" cy="${ry}" r="${R - 3}" fill="#222"/>`)
      if (S.marks === 1 && on('marks')) out.push(`<circle cx="${HX}" cy="${ry}" r="2.6" fill="#111"/>`)
      if (S.marks > 1 && on('marks')) txt(HX, ry + 3.3, String(S.marks), ` font-size="9" font-weight="700" text-anchor="middle" fill="#111"`)
      nodes[s] = { x: (LX - tw(t, LF) + HX + R) / 2, y: ry, w: HX + R - (LX - tw(t, LF)), h: RH - 4 }
    }
  }

  // chance: a bracket over competing world verbs, weights after their labels
  const weighted = new Set<string>()
  for (const { m } of span) for (const g of chanceGroups(net, m)) g.forEach((v) => weighted.add(v))

  // outcomes: drawn where they are reached, a copy hanging under each bar that ends the game
  const footOf = new Map<string, number>()

  // verbs: a thin bar over the rows it takes from and gives to, a hairline stem out to rows it only reads
  const dead = new Set(on('analysis') && F!.complete ? F!.dead : [])
  for (const v of net.verbs) {
    const cx = colX.get(v.id)!, as = rowArcs(v.id)
    const c = ink(v.by), seat = v.by !== WORLD
    const move = as.filter((a) => a.kind === 'take' || a.kind === 'give' || !on('stems')).map((a) => rowY.get(a.state)!)
    const all = as.map((a) => rowY.get(a.state)!)
    const yt = all.length ? Math.min(...all) : Y0, yb = all.length ? Math.max(...all) : Y0
    const bt = move.length ? Math.min(...move) - 6 : yt - 6, bb = move.length ? Math.max(...move) + 6 : yb + 6
    footOf.set(v.id, Math.max(yb, bb))
    if (yt < bt) out.push(`<line x1="${cx}" y1="${yt}" x2="${cx}" y2="${bt}" stroke="${c}" stroke-width="1"/>`)
    if (yb > bb) out.push(`<line x1="${cx}" y1="${bb}" x2="${cx}" y2="${yb}" stroke="${c}" stroke-width="1"/>`)
    const bw = seat ? 3.4 : 2.6
    out.push(dead.has(v.id)
      ? `<rect x="${cx - bw / 2}" y="${bt}" width="${bw}" height="${bb - bt}" fill="#fff" stroke="${c}" stroke-width="1" stroke-dasharray="2 1.5"/>`
      : `<rect x="${cx - bw / 2}" y="${bt}" width="${bw}" height="${bb - bt}" fill="${c}"/>`)
    nodes[v.id] = { x: cx, y: (Math.min(yt, bt) + Math.max(yb, bb)) / 2, w: 4, h: Math.max(yb, bb) - Math.min(yt, bt) }
    const ls = [...lines.get(v.id)!]
    if (weighted.has(v.id) && on('chance')) ls.push(`chance ×${v.weight}`)
    else if (v.weight > 1) ls.push(`×${v.weight}`)
    if (dead.has(v.id)) ls.push('(never said)')
    const top = Math.min(yt, bt)
    ls.forEach((l, i) => txt(cx, top - 7 - (ls.length - 1 - i) * VLH, l, ` font-size="${VF}" text-anchor="middle" fill="${c}"${seat ? ' font-weight="600"' : ''}${HALO}`))
    if (tierTag(v.id)) {
      const t = span.find((s) => s.m.verbs.includes(v.id))!.m.tier!, ty = top - 7 - ls.length * VLH - 2
      out.push(`<circle cx="${cx}" cy="${ty}" r="6" fill="#fff" stroke="${WORLD_INK}" stroke-width="1"/>`)
      txt(cx, ty + 3.2, String(t), ` font-size="8.5" font-weight="700" text-anchor="middle" fill="${WORLD_INK}"`)
    }
  }

  // arcs: a short tick where a bar meets a rail, with the Petri arc end
  const plain = !on('arc-ends')
  const leftUsed = new Map<string, number>()
  for (const a of net.arcs.filter(onRow)) {
    const cx = colX.get(a.verb)!, ry = rowY.get(a.state)!, c = ink(verb.get(a.verb)!.by)
    const k = arcKey(a)
    if (a.kind === 'give') {
      arcs[k] = [{ x: cx + 13, y: ry }, { x: cx, y: ry }]
      if (plain) out.push(`<circle cx="${cx}" cy="${ry}" r="3" fill="${c}"/>`)
      else out.push(`<line x1="${cx}" y1="${ry}" x2="${cx + 8}" y2="${ry}" stroke="${c}" stroke-width="1.4"/><path d="M${cx + 7} ${ry - 3.4} L${cx + 13} ${ry} L${cx + 7} ${ry + 3.4} Z" fill="${c}"/>`)
      if (a.count > 1 && on('counts')) txt(cx + 7, ry - 5, String(a.count), ` font-size="9.5" font-weight="700" text-anchor="middle" fill="${c}"${HALO}`)
      continue
    }
    const slot = `${a.state}|${a.verb}`, n = leftUsed.get(slot) ?? 0
    leftUsed.set(slot, n + 1)
    const ex = cx - 2 - n * 9
    arcs[k] = [{ x: ex - 12, y: ry }, { x: ex, y: ry }]
    if (plain) out.push(`<circle cx="${ex}" cy="${ry}" r="3" fill="${c}"/>`)
    else if (a.kind === 'take') out.push(`<line x1="${ex - 13}" y1="${ry}" x2="${ex - 5}" y2="${ry}" stroke="${c}" stroke-width="1.4"/><path d="M${ex - 6} ${ry - 3.4} L${ex} ${ry} L${ex - 6} ${ry + 3.4} Z" fill="${c}"/>`)
    else if (a.kind === 'need') out.push(`<line x1="${ex - 12}" y1="${ry}" x2="${ex - 4}" y2="${ry}" stroke="${c}" stroke-width="1.1"/><circle cx="${ex - 2.4}" cy="${ry}" r="2.6" fill="${c}"/>`)
    else out.push(`<line x1="${ex - 12}" y1="${ry}" x2="${ex - 6}" y2="${ry}" stroke="${c}" stroke-width="1.1"/><circle cx="${ex - 3}" cy="${ry}" r="3" fill="#fff" stroke="${c}" stroke-width="1.3"/>`)
    if (a.count > 1 && on('counts')) txt(ex - 7, ry - 5, String(a.count), ` font-size="9.5" font-weight="700" fill="${c}" text-anchor="middle"${HALO}`)
  }

  let bottom = YE
  const copies = new Map<string, number>()
  for (const a of terminals) {
    const cx = colX.get(a.verb)!, c = ink(verb.get(a.verb)!.by), S = state.get(a.state)!
    const { cy, ls, top, h } = hang.get(arcKey(a))!, qx = cx - QX
    const n = copies.get(a.state) ?? 0
    copies.set(a.state, n + 1)
    const isEnd = S.ends !== undefined, x1 = qx + QR
    if (a.kind === 'give') out.push(`<line x1="${cx}" y1="${cy}" x2="${x1 + 5}" y2="${cy}" stroke="${c}" stroke-width="1.4"/><path d="M${x1 + 5.5} ${cy - 3.2} L${x1} ${cy} L${x1 + 5.5} ${cy + 3.2} Z" fill="${c}"/>`)
    else if (a.kind === 'take') out.push(`<line x1="${x1}" y1="${cy}" x2="${cx - 5}" y2="${cy}" stroke="${c}" stroke-width="1.4"/><path d="M${cx - 5.5} ${cy - 3.2} L${cx} ${cy} L${cx - 5.5} ${cy + 3.2} Z" fill="${c}"/>`)
    else if (a.kind === 'need') out.push(`<line x1="${x1}" y1="${cy}" x2="${cx - 3}" y2="${cy}" stroke="${c}" stroke-width="1.1"/><circle cx="${cx - 2.4}" cy="${cy}" r="2.4" fill="${c}"/>`)
    else out.push(`<line x1="${x1}" y1="${cy}" x2="${cx - 5}" y2="${cy}" stroke="${c}" stroke-width="1.1"/><circle cx="${cx - 3}" cy="${cy}" r="2.8" fill="#fff" stroke="${c}" stroke-width="1.2"/>`)
    if (a.count > 1 && on('counts')) txt(cx + 6, cy + 3.5, String(a.count), ` font-size="9.5" font-weight="700" fill="${c}"${HALO}`)
    const term = isEnd && on('outcomes')
    out.push(`<circle cx="${qx}" cy="${cy}" r="${QR}" fill="#fff" stroke="#222" stroke-width="${term ? 2 : 1.1}"${S.seenBy !== 'all' && on('hidden') ? ' stroke-dasharray="2.2 1.6"' : ''}/>`)
    if (term) out.push(`<circle cx="${qx}" cy="${cy}" r="${QR - 3}" fill="#222"/>`)
    ls.forEach((l, i) => txt(qx, cy + QR + 10 + i * QLH, l, ` font-size="8.8"${isEnd ? ' font-weight="700"' : ' font-style="italic"'} text-anchor="middle" fill="#222"${HALO}`))
    arcs[arcKey(a)] = [{ x: x1, y: cy }, { x: cx, y: cy }]
    const lw = Math.min(CW - 6, Math.max(...ls.map((l) => tw(l, 8.8)), 2 * QR))
    nodes[`${a.state}#${n}`] = { x: qx, y: top + h / 2, w: lw, h }
    bottom = Math.max(bottom, top + h)
  }
  for (const [v, ye] of stemEnd) out.push(`<line x1="${colX.get(v)!}" y1="${footOf.get(v)!}" x2="${colX.get(v)!}" y2="${ye}" stroke="${ink(verb.get(v)!.by)}" stroke-width="1.2"/>`)

  // the foot: a fixed key, and what the engine finds
  let foot = bottom + 44
  const FX = 12
  if (on('key')) {
    const ky = foot, g = (dx: number, dy: number, s: string) => out.push(`<g transform="translate(${FX + dx},${ky + dy})">${s}</g>`)
    const k = (dx: number, dy: number, s: string) => txt(FX + dx, ky + dy + 3.5, s, ' font-size="10" fill="#333"')
    txt(FX, ky - 8, 'key', ' font-size="10" font-weight="700" fill="#333"')
    g(0, 6, `<line x1="0" y1="0" x2="8" y2="0" stroke="#333" stroke-width="1.4"/><path d="M7 -3.4 L13 0 L7 3.4 Z" fill="#333"/><rect x="13" y="-7" width="3" height="14" fill="#333"/>`); k(24, 6, 'takes a mark')
    g(0, 22, `<rect x="0" y="-7" width="3" height="14" fill="#333"/><line x1="3" y1="0" x2="10" y2="0" stroke="#333" stroke-width="1.4"/><path d="M9 -3.4 L15 0 L9 3.4 Z" fill="#333"/>`); k(24, 22, 'gives a mark')
    g(0, 38, `<line x1="0" y1="0" x2="9" y2="0" stroke="#333" stroke-width="1.1"/><circle cx="10.6" cy="0" r="2.6" fill="#333"/><line x1="14" y1="-7" x2="14" y2="7" stroke="#333" stroke-width="1"/>`); k(24, 38, 'needs a mark, keeps it')
    g(0, 54, `<line x1="0" y1="0" x2="7" y2="0" stroke="#333" stroke-width="1.1"/><circle cx="10" cy="0" r="3" fill="#fff" stroke="#333" stroke-width="1.3"/><line x1="14" y1="-7" x2="14" y2="7" stroke="#333" stroke-width="1"/>`); k(24, 54, 'only while it has no mark')
    g(160, 6, `<circle cx="6" cy="0" r="6.5" fill="#fff" stroke="#222" stroke-width="1.2"/><circle cx="6" cy="0" r="2.6" fill="#111"/>`); k(180, 6, 'a state holding one mark')
    g(160, 22, `<circle cx="6" cy="0" r="6.5" fill="#fff" stroke="#222" stroke-width="2"/><circle cx="6" cy="0" r="3.5" fill="#222"/>`); k(180, 22, 'an outcome: the game ends')
    g(160, 38, `<circle cx="6" cy="0" r="6.5" fill="#fff" stroke="#222" stroke-width="1.2" stroke-dasharray="2.2 1.6"/>`); k(180, 38, 'hidden from some seat')
    g(160, 54, `<circle cx="6" cy="0" r="6" fill="#fff" stroke="${WORLD_INK}" stroke-width="1"/><text x="6" y="3.2" font-size="8.5" font-weight="700" text-anchor="middle" fill="${WORLD_INK}">1</text>`); k(180, 54, 'the world tries answers in this order')
    g(390, 6, `<rect x="4" y="-8" width="3" height="16" fill="#333"/>`); k(406, 6, 'bar: what the verb moves')
    g(390, 22, `<line x1="5.5" y1="-8" x2="5.5" y2="8" stroke="#333" stroke-width="1"/>`); k(406, 22, 'stem: what it only reads')
    g(390, 38, `<line x1="-4" y1="0" x2="1.5" y2="0" stroke="${RAIL}" stroke-width="1.2"/><line x1="9.5" y1="0" x2="15" y2="0" stroke="${RAIL}" stroke-width="1.2"/><line x1="5.5" y1="-8" x2="5.5" y2="8" stroke="#333" stroke-width="1"/>`); k(406, 38, 'a broken line is passed, not touched')
    txt(FX, ky + 76, 'A seat speaks when the world is silent. After any verb the world says its lowest-numbered possible answer, again', ' font-size="10" fill="#333"')
    txt(FX, ky + 89, 'and again, until none is possible. Answers marked chance ×n are picked at random in proportion to n. Numbers on arcs are counts.', ' font-size="10" fill="#333"')
    foot = ky + 108
  }
  if (on('analysis')) {
    const f = F!
    const who = (f.worldFirst ? 'The world speaks first, then ' : '') + (f.first.map(seatName).join(' or ') || 'nobody') + (f.worldFirst ? ' chooses' : ' speaks first')
    const lb = f.complete ? '' : 'at least '
    const outs = f.outcomes.map(([o, n]) => `${o} (${fmt(n)} position${n === 1 ? '' : 's'})`).join(', ') || 'none reachable'
    const plays = f.plays === 'endless' ? 'play can go on forever' : f.plays === 'unknown' ? 'number of plays not counted' : `${fmt(f.plays)} complete plays`
    const deadL = f.complete ? (f.dead.length ? f.dead.map((d) => verb.get(d)!.label).join(', ') : 'none') : 'not known'
    const rows = [
      `${lb}${fmt(f.resting)} resting moment${f.resting === 1 ? '' : 's'}: settled positions where a seat must choose. ${who}.`,
      `Outcomes reached: ${outs}; ${plays}.`,
      `Verbs never said: ${deadL}.`,
    ]
    if (!f.complete) rows.push(`Exploration stopped at ${fmt(LIMIT)} positions, so these are lower bounds.`)
    txt(FX, foot, 'the engine finds', ' font-size="10" font-weight="700" fill="#333"')
    rows.forEach((r, i) => txt(FX, foot + 14 + i * 13, r, ' font-size="10.5" fill="#222"'))
    foot += 14 + rows.length * 13
  }

  const W = Math.ceil(Math.max(XE + 16, 700, ...heads.map((h) => h.x + headW(h) + 8))), H = Math.ceil(foot + 10)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${out.join('')}</svg>`
  return { svg, width: W, height: H, layout: { nodes, arcs } }
}

// ---------- the design ----------

export const design: Design = {
  id: 'staffnet',
  title: 'Staffnet: the score drawn as a Petri net',
  idea: 'Each entity is a staff of places, one circle per state on a straight spine, each with a line running right to the last verb that uses it. Verbs are thin bars standing in columns, ordered as the conversation hears them: each seat, then the world by the order it tries its answers. Every arc is a short tick where a bar meets a line, so nothing needs tracing and the same structure always draws the same.',
  rules: [
    'Find the entities: sets of states that always hold exactly one mark between them (every verb that takes from the set gives back into it). Each entity is a staff. Order the staves by the seat whose verbs take from it most (seats in order, the world last), larger first.',
    'Inside a staff, start with the state holding the mark, then each state it moves to, in the order you reach them.',
    'Every other state, except outcomes, is a coupling place. Put it just under the staff whose verbs touch it most, counting places already put; repeat until none moves. Any left over form one last staff.',
    'Draw each state as a circle at the left with its label beside it: a dot inside for one mark, the number for more, a dashed circle if some seat cannot see it. An entity\'s circles sit on one grey spine. From each circle draw a thin line right, as far as the last verb that uses it.',
    'Columns, left to right: each seat\'s verbs, then the world\'s verbs in groups by priority, highest first. Number the world\'s groups 1, 2, 3: the order in which it tries them.',
    'Inside a group, order verbs by the first line they take from, top first, then by the first line they give to.',
    'Draw each verb as a thin vertical bar in its speaker\'s color (the world grey) over the lines it takes from and gives to, and a hairline stem out to lines it only needs or is blocked by. Write its label level, above the top of the bar; for the world, its group number in a small circle above that. Where a bar or stem passes a line it does not use, break the line.',
    'Where a bar meets a line, draw the arc: take is an arrow into the bar from the left, give an arrow out of it to the right, need a dot on the bar\'s left, unless a ring there. Print a count above 1 beside its arrow.',
    'Hung copies. Outcomes get no line, and neither does a hub (a state whose verbs reach three or more other staves) for any verb that has no plain line in the hub\'s staff. Continue that verb\'s bar down as a stem, hang a small copy circle on its left for each such state with the arc on a short tick, and write the name under it (an outcome: heavy circle, filled core, its result). Break any line a copy sits on.',
    'World verbs in one group with identical inputs are chance: write "chance ×weight" under each label. Write any other weight above 1 as ×weight.',
    'Head each seat\'s columns with its name and the world\'s with "the world answers". Run the engine and mark who speaks first: a seat, or the world when it moves before anyone may choose.',
    'Under the net, draw the fixed key and the engine\'s facts: resting moments (settled positions where a seat must choose), outcomes, plays, verbs never said. Stop at 20,000 positions and say so.',
  ],
  elements: [
    { id: 'spines', what: 'a grey spine through the circles of one entity\'s states', purpose: 'Shows which states are one entity, always in exactly one of them, without a bracket or box.', serves: ['entity', 'contact'] },
    { id: 'rails', what: 'a thin line from each state circle to the last verb that uses it', purpose: 'Gives every state a fixed address, so each arc lands on the same line and two nets compare line by line; ending it at its last use shows where a state stops mattering.', serves: ['entity', 'compare-shape', 'compare-name', 'readable'] },
    { id: 'gaps', what: 'a break in a state line where a bar or stem passes it without an arc', purpose: 'Tells touching from passing at a glance: a bar meets only the lines it uses.', serves: ['readable', 'possibility', 'contact'] },
    { id: 'marks', what: 'a dot inside a circle for one starting mark, the number for more', purpose: 'The Petri marking: where play starts and how much of a count there is.', serves: ['possibility', 'counts'] },
    { id: 'stems', what: 'a hairline stem from the bar to lines the verb only needs or is blocked by', purpose: 'Separates what a verb moves (the bar) from what it only reads (the stem): contact between entities is the hairline.', serves: ['contact', 'content', 'readable'] },
    { id: 'arc-ends', what: 'arrow in for take, arrow out for give, dot for need, ring for unless, where bar meets line', purpose: 'The SPEC arc ends on a short tick: what the verb consumes, produces, requires, and is blocked by, with nothing to trace.', serves: ['possibility', 'content', 'actionable', 'loop'] },
    { id: 'counts', what: 'a number beside any arc whose count is above 1', purpose: 'Costs and thresholds are on the map.', serves: ['counts', 'actionable'] },
    { id: 'outcomes', what: 'a heavy circle with a filled core hung beside the stem of each verb that ends the game, result written under it', purpose: 'Where the game ends is read at the verb that ends it, with no bar running to the foot of the page. Copies of one outcome share its text (fusion).', serves: ['possibility', 'actionable', 'readable'] },
    { id: 'fusion', what: 'a hub (a state whose verbs reach three or more other staves) drawn again as a small named copy hung under each verb from another staff', purpose: 'Replaces bars that run the height of the page to a turn or a counter: each verb becomes a short local module, and identical modules draw identically.', serves: ['readable', 'compare-shape', 'contact'] },
    { id: 'order', what: 'circled numbers over the world\'s verbs: the order the world tries them', purpose: 'Says which answer is checked first, so a reader can play the world by hand.', serves: ['conversation', 'actionable'] },
    { id: 'turn-order', what: 'who speaks first, from the engine, in the seat or world heading', purpose: 'Every bakeoff design left this unclear; the engine settles it.', serves: ['conversation'] },
    { id: 'chance', what: '"chance ×weight" under the labels of world verbs that compete in one group with identical inputs', purpose: 'Marks where the world rolls the dice and the odds.', serves: ['conversation', 'counts', 'possibility'] },
    { id: 'hidden', what: 'dashed circle and line, "(hidden)" in the label, for states some seat cannot see', purpose: 'Shows what a seat cannot know.', serves: ['possibility', 'conversation'] },
    { id: 'key', what: 'a small fixed key under the net, the same on every page', purpose: 'Defines every mark on the page; readers in the bakeoff guessed at rings, counts and numbers.', serves: ['readable', 'napkin', 'conversation'] },
    { id: 'analysis', what: 'the engine\'s facts under the net: resting moments, outcomes, plays, verbs never said; a dashed bar for a verb never said', purpose: 'Answers what no reader could count from any drawing (the stamina variants\' 16 and 17 resting moments) and points at dead verbs on the net.', serves: ['possibility', 'actionable', 'compare-name'] },
  ],
  axes: {
    x: 'the conversation order: each seat, then the world by priority, highest first',
    y: 'fixed place lines, one staff per entity, coupling places under the entity they touch most',
    placement: 'a fixed line per state and a fixed-width column per verb, sorted by structure',
    verb: 'a thin bar over the lines it moves, a hairline stem to the lines it reads, label above',
    speaker: 'bar color and the seat or world heading over its columns',
    entity: 'place circles on one grey spine, lines adjacent, in flow order from the marked state',
    routing: 'none: an arc is a tick where a bar meets a line',
    unit: 'one whole net on one page, with a key and the engine facts',
  },
  draw,
}
