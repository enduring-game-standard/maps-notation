// PROTOTYPE. The `score` convention: the net drawn as its incidence matrix, the way a staff draws music.
import { WORLD, type Net, type Arc } from '../../../../studio/src/core/model'
import { arcKey, type Box, type Design, type Drawing, type Pt } from '../../harness/contract'

// ---------- structure: a canonical rank for every node, from structure alone ----------

type Colors = Map<string, number>

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

const pad = (n: number) => String(n).padStart(4, '0')

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

// ---------- the score: rows, staves, measures, columns ----------

type StaffKind = 'entity' | 'loose' | 'outcome'
interface Staff { kind: StaffKind; states: string[] }
interface Measure { by: string; priority?: number; verbs: string[] }

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
    .map(({ ss }) => ({ kind: 'entity' as const, states: flow(ss) }))
  const loose = net.states.filter((s) => !used.has(s.id) && !isOutcome.has(s.id)).map((s) => s.id).sort((a, b) => cr(a) - cr(b))
  if (loose.length) staves.push({ kind: 'loose', states: loose })
  const outs = [...isOutcome].sort((a, b) => cr(a) - cr(b))
  if (outs.length) staves.push({ kind: 'outcome', states: outs })

  const row = new Map<string, number>()
  staves.flatMap((s) => s.states).forEach((s, i) => row.set(s, i))

  const measures: Measure[] = []
  for (const seat of net.seats) measures.push({ by: seat.id, verbs: net.verbs.filter((v) => v.by === seat.id).map((v) => v.id) })
  const pr = [...new Set(net.verbs.filter((v) => v.by === WORLD).map((v) => v.priority))].sort((a, b) => b - a)
  for (const p of pr) measures.push({ by: WORLD, priority: p, verbs: net.verbs.filter((v) => v.by === WORLD && v.priority === p).map((v) => v.id) })
  const key = (v: string) => {
    const as = arcsOf(v), rows = (k: string[]) => as.filter((a) => k.includes(a.kind)).map((a) => row.get(a.state)!)
    const first = rows(['take']).length ? Math.min(...rows(['take'])) : Math.min(...rows(['take', 'give', 'need', 'unless']), 1e6)
    return [first, Math.min(...rows(['give']), 1e6), Math.min(...rows(['need', 'unless']), 1e6), cr(v)]
  }
  for (const m of measures) m.verbs.sort((a, b) => { const ka = key(a), kb = key(b); for (let i = 0; i < 4; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]; return 0 })
  return { staves: staves, measures: measures.filter((m) => m.verbs.length), row }
}

/** World verbs at one priority with identical inputs: whenever one can be said all can, so chance picks among them by weight. */
function chanceGroups(net: Net, m: Measure): string[][] {
  if (m.by !== WORLD || m.verbs.length < 2) return []
  const inputs = (v: string) => net.arcs.filter((a) => a.verb === v && a.kind !== 'give').map((a) => `${a.kind}${a.count}|${a.state}`).sort().join(',')
  const groups = new Map<string, string[]>()
  for (const v of m.verbs) groups.set(inputs(v), [...(groups.get(inputs(v)) ?? []), v])
  return [...groups.values()].filter((g) => g.length > 1)
}

// ---------- drawing ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tw = (s: string, size: number) => s.length * size * 0.56
const WORLD_INK = '#444'
const LINE = '#bdbdbd'
const REPEAT_NOTE = 'repeat until no answer is possible, then the seats speak again'

/** Split a long label into at most two lines at the space nearest its middle. */
const wrap = (s: string): string[] => {
  if (s.length <= 22) return [s]
  const mid = s.length / 2
  let best = -1
  for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
  return best < 0 ? [s] : [s.slice(0, best), s.slice(best + 1)]
}

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const off = new Set(opts?.without ?? [])
  const on = (e: string) => !off.has(e)
  const { staves, measures } = arrange(net)
  const state = new Map(net.states.map((s) => [s.id, s]))
  const verb = new Map(net.verbs.map((v) => [v.id, v]))
  const ink = (by: string) => (by === WORLD ? WORLD_INK : net.seats.find((s) => s.id === by)?.color ?? '#000')
  const seatName = (by: string) => net.seats.find((s) => s.id === by)?.name ?? by

  const RH = 15, SG = 17, CW = 28, MG = 26, PG = 12, LF = 11, VF = 10.5
  const label = (id: string) => {
    const s = state.get(id)!
    const seen = s.seenBy === 'all' ? '' : s.seenBy.length ? ` (seen by ${s.seenBy.map(seatName).join(', ')})` : ' (hidden)'
    return s.label + seen
  }
  const LX = 12 + Math.max(...net.states.map((s) => tw(label(s.id), LF)), 60)
  const BX = LX + 7, KX = LX + 24, LS = LX + 16, X0 = LX + 64
  const colX = new Map<string, number>()
  const span: { m: Measure; x0: number; x1: number; bar: number | null }[] = []
  let x = X0
  measures.forEach((m, i) => {
    const prev = measures[i - 1]
    const newSpeaker = !prev || prev.by !== m.by
    let bar: number | null = null
    const opensWorld = newSpeaker && m.by === WORLD
    if (i) { x += newSpeaker ? MG + (opensWorld ? 10 : 0) : PG; if (newSpeaker) bar = x - CW / 2 - MG / 2 + 4 - (opensWorld ? 10 : 0) }
    const x0 = x
    m.verbs.forEach((v) => { colX.set(v, x); x += CW })
    span.push({ m, x0, x1: x - CW, bar })
  })
  const XE = x - CW / 2 + 16
  const ANG = 60, sin = Math.sin((ANG * Math.PI) / 180), cos = Math.cos((ANG * Math.PI) / 180)
  const lines = new Map(net.verbs.map((v) => [v.id, wrap(v.label)]))
  const longest = (v: string) => Math.max(...lines.get(v)!.map((l) => tw(l, VF)))
  const labH = Math.max(...net.verbs.map((v) => longest(v.id) * sin + 12), 20)
  const labW = Math.max(...net.verbs.map((v) => colX.get(v.id)! + longest(v.id) * cos + 14), XE)
  const HS = 18, HP = 34, HC = 46, HW = 58
  const Y0 = HW + labH + 20
  const rowY = new Map<string, number>()
  let y = Y0
  const staffSpan: { st: Staff; y0: number; y1: number }[] = []
  staves.forEach((st, i) => {
    if (i) y += SG + (st.kind === 'outcome' ? 6 : 0)
    const y0 = y
    st.states.forEach((s) => { rowY.set(s, y); y += RH })
    staffSpan.push({ st, y0, y1: y - RH })
  })
  const YE = y - RH
  const hasWorld = span.some((s) => s.m.by === WORLD)
  const W = Math.ceil(Math.max(labW, XE + 12, hasWorld ? X0 + tw(REPEAT_NOTE, 10) : 0) + 10), H = Math.ceil(YE + 34)

  const out: string[] = []
  const nodes: Record<string, Box> = {}
  const arcs: Record<string, Pt[]> = {}
  const vline = (x: number, w: number, c = '#222') => out.push(`<line x1="${x}" y1="${Y0 - 8}" x2="${x}" y2="${YE + 8}" stroke="${c}" stroke-width="${w}"/>`)
  const dots = (x: number) => { for (const { st, y0, y1 } of staffSpan) if (st.kind === 'entity') out.push(`<circle cx="${x}" cy="${(y0 + y1) / 2 - 4}" r="1.8" fill="#222"/><circle cx="${x}" cy="${(y0 + y1) / 2 + 4}" r="1.8" fill="#222"/>`) }

  // measures: the opening bar, a bar between speakers, repeat bars around the world's answers
  if (on('measures')) {
    vline(X0 - CW / 2 - 6, 2)
    const ws = span.filter((s) => s.m.by === WORLD)
    if (!ws.length) vline(XE - 6, 2)
    for (const s of span) if (s.bar !== null) {
      if (s === ws[0] && on('repeats')) { vline(s.bar - 2, 3); vline(s.bar + 3, 1); dots(s.bar + 8) } else vline(s.bar, 0.9, '#888')
    }
    for (const sp of span) if (sp.m.by !== WORLD) out.push(`<text x="${(sp.x0 + sp.x1) / 2}" y="${HS}" font-size="12" font-weight="700" text-anchor="middle" fill="${ink(sp.m.by)}">${esc(seatName(sp.m.by))}</text>`)
    if (ws.length) {
      const a = ws[0].x0, b = ws[ws.length - 1].x1
      out.push(`<text x="${a - 6}" y="${HS}" font-size="12" font-weight="700" fill="${WORLD_INK}">the world answers</text>`)
      if (on('priorities')) {
        out.push(`<text x="${LX}" y="${HP}" font-size="9" fill="#777" text-anchor="end" font-style="italic">world priority</text>`)
        for (const s of ws) out.push(`<text x="${(s.x0 + s.x1) / 2}" y="${HP}" font-size="9.5" text-anchor="middle" fill="${WORLD_INK}">${s.m.priority}</text>`)
      }
      void b
      if (on('repeats')) {
        const ex = ws[ws.length - 1].x1 + CW / 2 + 12
        dots(ex - 6); vline(ex, 1); vline(ex + 5, 3)
        out.push(`<text x="${ex + 6}" y="${YE + 26}" font-size="10" fill="#555" text-anchor="end" font-style="italic">${REPEAT_NOTE}</text>`)
      }
    }
  }

  // staves: lines, brackets, start marks
  for (const { st, y0, y1 } of staffSpan) {
    for (const s of st.states) {
      const ry = rowY.get(s)!, S = state.get(s)!
      const hidden = S.seenBy !== 'all' && on('hidden')
      if (st.kind === 'outcome' && on('outcomes')) out.push(`<line x1="${LS}" y1="${ry - 1.6}" x2="${XE}" y2="${ry - 1.6}" stroke="#666" stroke-width="0.8"/><line x1="${LS}" y1="${ry + 1.6}" x2="${XE}" y2="${ry + 1.6}" stroke="#666" stroke-width="0.8"/>`)
      else if (on('lines')) out.push(`<line x1="${LS}" y1="${ry}" x2="${XE}" y2="${ry}" stroke="${LINE}" stroke-width="0.8"${hidden ? ' stroke-dasharray="3 3"' : ''}/>`)
      const txt = label(s)
      const bold = st.kind === 'outcome' && on('outcomes')
      out.push(`<text x="${LX}" y="${ry + 3.8}" font-size="${LF}" text-anchor="end" fill="#222"${bold ? ' font-weight="700"' : ''}>${esc(txt)}</text>`)
      nodes[s] = { x: LX - tw(txt, LF) / 2, y: ry, w: tw(txt, LF), h: RH - 3 }
      if (S.marks > 0 && on('start-marks')) {
        out.push(`<circle cx="${KX}" cy="${ry}" r="4.2" fill="#111"/>`)
        if (S.marks > 1) out.push(`<text x="${KX + 7}" y="${ry + 4}" font-size="11" font-weight="700" fill="#111" stroke="#fff" stroke-width="3" paint-order="stroke">${S.marks}</text>`)
      }
    }
    if (st.kind === 'entity' && on('staves')) out.push(`<path d="M${BX + 4} ${y0 - 5} H${BX} V${y1 + 5} H${BX + 4}" fill="none" stroke="#333" stroke-width="1.6"/>`)
    if (st.kind === 'outcome' && on('outcomes')) out.push(`<text x="${LX}" y="${y0 - 11}" font-size="9" fill="#777" text-anchor="end" font-style="italic">ends the game</text>`)
  }

  // chance brackets over world verbs with identical inputs at one priority
  const weighted = new Set<string>()
  for (const { m } of span) for (const g of chanceGroups(net, m)) {
    g.forEach((v) => weighted.add(v))
    if (!on('chance')) continue
    const xs = g.map((v) => colX.get(v)!), a = Math.min(...xs) - 8, b = Math.max(...xs) + 8
    out.push(`<path d="M${a} ${HC + 4} V${HC} H${b} V${HC + 4}" fill="none" stroke="#666" stroke-width="1"/>`)
    out.push(`<text x="${(a + b) / 2}" y="${HC - 3}" font-size="9" fill="#666" text-anchor="middle" font-style="italic">chance</text>`)
  }

  // verbs: one stem per verb, a chord across the lines it touches; label slanted above
  for (const v of net.verbs) {
    const cx = colX.get(v.id)!, as = net.arcs.filter((a) => a.verb === v.id)
    const ys = as.map((a) => rowY.get(a.state)!)
    const yt = as.length ? Math.min(...ys) : Y0, yb = as.length ? Math.max(...ys) : Y0
    const c = ink(v.by), seat = v.by !== WORLD
    out.push(`<line x1="${cx}" y1="${yt - 4}" x2="${cx}" y2="${yb + 4}" stroke="${c}" stroke-width="${seat ? 2.6 : 1.6}"/>`)
    nodes[v.id] = { x: cx, y: (yt + yb) / 2, w: 4, h: yb - yt + 8 }
    const ly = Y0 - 16
    if (on('guides')) out.push(`<line x1="${cx}" y1="${ly + 4}" x2="${cx}" y2="${yt - 6}" stroke="${c}" stroke-width="0.6" stroke-dasharray="1 3" opacity="0.7"/>`)
    const ls = lines.get(v.id)!
    out.push(`<text transform="translate(${cx + 3},${ly}) rotate(-${ANG})" font-size="${VF}" fill="${c}"${seat ? ' font-weight="600"' : ''}>${ls.map((l, i) => `<tspan x="${i ? 8 : 0}" dy="${i ? VF + 1 : 0}">${esc(l)}</tspan>`).join('')}</text>`)
    if ((weighted.has(v.id) && on('chance')) || v.weight > 1) out.push(`<text x="${cx}" y="${HW}" font-size="9.5" fill="#333" text-anchor="middle">×${v.weight}</text>`)
  }

  // arcs: a glyph where the verb's stem meets the state's line
  const plain = !on('glyphs')
  const leftUsed = new Map<string, number>()
  for (const a of net.arcs) {
    const cx = colX.get(a.verb)!, ry = rowY.get(a.state)!, c = ink(verb.get(a.verb)!.by)
    const k = arcKey(a)
    if (a.kind === 'give') {
      arcs[k] = [{ x: cx + 11, y: ry }, { x: cx, y: ry }]
      if (plain) out.push(`<circle cx="${cx}" cy="${ry}" r="3" fill="${c}"/>`)
      else out.push(`<line x1="${cx}" y1="${ry}" x2="${cx + 6}" y2="${ry}" stroke="${c}" stroke-width="1.8"/><path d="M${cx + 5} ${ry - 3.6} L${cx + 11.5} ${ry} L${cx + 5} ${ry + 3.6} Z" fill="${c}"/>`)
      if (a.count > 1 && on('counts')) out.push(`<text x="${cx + 7}" y="${ry - 4.5}" font-size="9.5" font-weight="700" fill="${c}">${a.count}</text>`)
      continue
    }
    const slot = `${a.state}|${a.verb}`, n = leftUsed.get(slot) ?? 0
    leftUsed.set(slot, n + 1)
    const ex = cx - 1 - n * 9
    arcs[k] = [{ x: ex - 10, y: ry }, { x: ex, y: ry }]
    if (plain) out.push(`<circle cx="${ex}" cy="${ry}" r="3" fill="${c}"/>`)
    else if (a.kind === 'take') out.push(`<line x1="${ex - 11}" y1="${ry}" x2="${ex - 5}" y2="${ry}" stroke="${c}" stroke-width="1.8"/><path d="M${ex - 6.5} ${ry - 3.6} L${ex} ${ry} L${ex - 6.5} ${ry + 3.6} Z" fill="${c}"/>`)
    else if (a.kind === 'need') out.push(`<line x1="${ex - 10}" y1="${ry}" x2="${ex - 3}" y2="${ry}" stroke="${c}" stroke-width="1.4"/><circle cx="${ex - 2.6}" cy="${ry}" r="2.6" fill="${c}"/>`)
    else out.push(`<line x1="${ex - 10}" y1="${ry}" x2="${ex - 6}" y2="${ry}" stroke="${c}" stroke-width="1.4"/><circle cx="${ex - 3}" cy="${ry}" r="3" fill="#fff" stroke="${c}" stroke-width="1.4"/>`)
    if (a.count > 1 && on('counts')) out.push(`<text x="${ex - 9}" y="${ry - 4.5}" font-size="9.5" font-weight="700" fill="${c}" text-anchor="end">${a.count}</text>`)
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="system-ui, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${out.join('')}</svg>`
  return { svg, width: W, height: H, layout: { nodes, arcs } }
}

// ---------- the design ----------

export const design: Design = {
  id: 'score',
  title: 'Score: the net as a staff',
  idea: 'The net is written as its incidence matrix, the way a score writes music: a fixed line per state, a vertical stem per verb, a glyph wherever an arc joins them. States that hold one travelling mark between them form a staff, so an entity reads as a melody stepping from line to line. Verbs run left to right in the order the conversation hears them: each seat, then the world answering by priority, repeated until silent.',
  rules: [
    'Find the entities: sets of states that always hold exactly one mark between them (every verb that takes from the set gives back into it). Each entity is a staff.',
    'Order the staves: entities moved mostly by the first seat, then the next seat, then the world; larger first. Then one staff of loose states (counters, signals). Outcome states go last, on double lines.',
    'Inside an entity staff, start with the state that holds the mark, then each state it moves to, in the order you reach them.',
    'Draw one thin horizontal line per state, its label at the left. Bracket each entity staff. Put a filled dot before the line for each starting mark, with the number when it is more than 1.',
    'Divide the page into measures, left to right: one per seat, then one for the world, its verbs in priority groups, highest first, with each group number above it. Draw a bar line between speakers and repeat bars around the world measure.',
    'Inside a measure, order verbs by the first line they take from, top first, then by the first line they give to.',
    'Draw each verb as a vertical stem in its speaker color, from the topmost to the bottommost line it touches. Write its label slanted above the column.',
    'Where a stem meets a line it uses, draw the arc: take is an arrow into the stem from the left; give is an arrow out of the stem to the right; need is a dot touching the stem on the left; unless is a ring touching it on the left.',
    'Write a count above any arc whose count is more than 1.',
    'Over world verbs at one priority with identical inputs (take, need, unless), draw a "chance" bracket and write each weight above its stem.',
  ],
  elements: [
    { id: 'lines', what: 'one thin horizontal line per state, label at the left', purpose: 'Fixed lines: every state has an address, so every arc to it lands on the same line and two nets compare line by line.', serves: ['entity', 'compare-shape', 'compare-name', 'readable', 'napkin'] },
    { id: 'staves', what: 'a bracket grouping the lines of one entity', purpose: 'Shows which states are one entity, always in exactly one of them: the mark steps from line to line inside the bracket.', serves: ['entity', 'contact', 'compare-shape'] },
    { id: 'start-marks', what: 'filled dot before a line for its starting marks, number when above 1', purpose: 'The key signature: where every mark starts, so a reader can find what is open at the first moment.', serves: ['possibility', 'counts'] },
    { id: 'stems', what: 'a vertical stem per verb in its speaker color, spanning the lines it touches', purpose: 'A verb is a chord: everything it reads and writes is on one vertical. A stem that reaches into another staff is contact.', serves: ['conversation', 'contact', 'possibility', 'readable'] },
    { id: 'glyphs', what: 'arrow in (take), arrow out (give), dot (need), ring (unless) where stem meets line', purpose: 'Distinguishes what the verb consumes, produces, requires, and is blocked by, using the SPEC arc ends.', serves: ['possibility', 'content', 'actionable', 'loop'] },
    { id: 'counts', what: 'numeral above an arc glyph with count above 1', purpose: 'Costs and thresholds are on the map.', serves: ['counts', 'actionable'] },
    { id: 'measures', what: 'bar lines and headers grouping verbs by speaker, seats first, then world by priority', purpose: 'Reading left to right is the conversation: who speaks, then the world answering in rule order.', serves: ['conversation', 'compare-shape', 'napkin'] },
    { id: 'priorities', what: 'priority number above each world measure', purpose: 'Says which world answer is checked first.', serves: ['conversation', 'actionable'] },
    { id: 'repeats', what: 'repeat bars around the world measures and the line under them', purpose: 'The world keeps answering until silent, then the seats speak again: the loop of the conversation.', serves: ['conversation', 'loop'] },
    { id: 'chance', what: 'a "chance" bracket over competing world verbs at one priority, weights above stems', purpose: 'Marks where the world rolls the dice and the odds.', serves: ['conversation', 'counts', 'possibility'] },
    { id: 'outcomes', what: 'outcome states on double lines, bold, in the last staff', purpose: 'Where the game ends; a stem reaching the bottom staff ends the conversation.', serves: ['possibility', 'actionable'] },
    { id: 'hidden', what: 'dashed line and "(hidden)" for states some seat cannot see', purpose: 'Shows what a seat cannot know.', serves: ['possibility', 'conversation'] },
    { id: 'guides', what: 'dotted hairline from a verb label down to its stem', purpose: 'Ties a label at the top of the page to a stem low in the score.', serves: ['readable'] },
  ],
  axes: {
    x: 'the conversation order: each seat, then the world by priority, highest first',
    y: 'fixed state lines, grouped into one staff per entity',
    placement: 'a fixed line per state and a column per verb, sorted by structure; nothing placed by connectivity',
    verb: 'a vertical stem spanning the lines it touches, label slanted above',
    speaker: 'measure (bar-lined column block) and stem color',
    entity: 'a bracketed staff of adjacent lines in flow order from the marked state',
    routing: 'none: an arc is a glyph where a stem crosses a line',
    unit: 'one whole net on one page',
  },
  draw,
}
