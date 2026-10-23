// PROTOTYPE. noreturn: vertical position means what cannot be undone.
import { arcKey, type Box, type Design, type Drawing, type Element, type Net, type Pt } from '../../harness/contract'

type Kind = 'take' | 'give' | 'need' | 'unless'
interface Arc { kind: Kind; state: string; verb: string; count: number }
interface N { id: string; isState: boolean; label: string; key: string; marks: number; ends?: string; hidden?: string; by?: string; priority: number; weight: number }

const STATE_R = 10, BAR_W = 5, BAR_H = 24, FONT = 10, CH = 5.4, LINE = 11
const STEP = 30, GAP_UNIT = 56, GAP_BAND = 46, MARGIN = 24

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36) }
const mask = (s: string) => s.replace(/[a-z]/g, 'a').replace(/[A-Z]/g, 'A')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

function wrap(s: string, max = 18): string[] {
  const out: string[] = []; let cur = ''
  for (const w of s.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w }
  if (cur) out.push(cur)
  return out
}

/** Structural key per node: refined from kind, speaker, marks, ends and the keys of its arc neighbours. Same structure, same key, whatever the names or file order. */
function structuralKeys(net: Net) {
  const seatIx = (by: string) => (by === 'world' ? -1 : net.seats.findIndex((s) => s.id === by))
  const col = new Map<string, string>()
  for (const s of net.states) col.set(s.id, `s${s.marks}|${s.ends ? 1 : 0}|${s.seenBy === 'all' ? 'a' : (s.seenBy as string[]).map(seatIx).sort().join(',')}`)
  for (const v of net.verbs) col.set(v.id, `v${seatIx(v.by)}|${v.by === 'world' ? v.priority : ''}|${v.weight}`)
  const nb = new Map<string, [string, string][]>([...col.keys()].map((k) => [k, []]))
  for (const a of net.arcs) { nb.get(a.state)!.push([`${a.kind}${a.count}>`, a.verb]); nb.get(a.verb)!.push([`${a.kind}${a.count}<`, a.state]) }
  for (let r = 0; r < 6; r++) {
    const next = new Map<string, string>()
    for (const [id, c] of col) next.set(id, hash(c + '|' + nb.get(id)!.map(([k, o]) => k + col.get(o)).sort().join(',')))
    col.clear(); next.forEach((v, k) => col.set(k, v))
  }
  return col
}

function tarjan(ids: string[], out: (v: string) => string[]) {
  let i = 0; const ix = new Map<string, number>(), low = new Map<string, number>(), st: string[] = [], on = new Set<string>(), comps: string[][] = []
  const go = (v: string) => {
    ix.set(v, i); low.set(v, i++); st.push(v); on.add(v)
    for (const w of out(v)) { if (!ix.has(w)) { go(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)) } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, ix.get(w)!)) }
    if (low.get(v) === ix.get(v)) { const c: string[] = []; let w: string; do { w = st.pop()!; on.delete(w); c.push(w) } while (w !== v); comps.push(c) }
  }
  ids.forEach((v) => { if (!ix.has(v)) go(v) })
  return comps
}

interface Unit { H: number; id: number; nodes: string[]; ring: boolean; rel: Map<string, Pt>; row: Map<string, number>; back: [string, string][]; minKey: string; top: number; bottom: number; left: number; right: number; x: number; level: number }

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const off = new Set(opts?.without ?? [])
  const keys = structuralKeys(net)
  const nodes = new Map<string, N>()
  for (const s of net.states) nodes.set(s.id, { id: s.id, isState: true, label: s.label, key: '', marks: s.marks, ends: s.ends, priority: 0, weight: 1,
    hidden: s.seenBy === 'all' ? undefined : (s.seenBy as string[]).length ? 'seen only by ' + (s.seenBy as string[]).map((id) => net.seats.find((x) => x.id === id)?.name ?? id).join(', ') : 'seen by nobody' })
  for (const v of net.verbs) nodes.set(v.id, { id: v.id, isState: false, label: v.label, key: '', marks: 0, by: v.by, priority: v.priority, weight: v.weight })
  for (const n of nodes.values()) n.key = keys.get(n.id)! + '|' + mask(n.label)
  // last resort tie-break: id (only truly identical parts with identical label shapes reach it)
  const cmp = (a: string, b: string) => { const ka = nodes.get(a)!.key, kb = nodes.get(b)!.key; return ka < kb ? -1 : ka > kb ? 1 : a < b ? -1 : a > b ? 1 : 0 }
  const ids = [...nodes.keys()].sort(cmp)
  const arcs: Arc[] = net.arcs.map((a) => ({ kind: a.kind as Kind, state: a.state, verb: a.verb, count: a.count }))
    .sort((a, b) => cmp(a.state, b.state) || cmp(a.verb, b.verb) || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0))
  const src = (a: Arc) => (a.kind === 'give' ? a.verb : a.state), dst = (a: Arc) => (a.kind === 'give' ? a.state : a.verb)

  // 1. Rings: strongly connected parts of the mark flow (take and give only).
  const flowOut = new Map(ids.map((i) => [i, [] as string[]]))
  for (const a of arcs) if (a.kind === 'take' || a.kind === 'give') flowOut.get(src(a))!.push(dst(a))
  for (const l of flowOut.values()) l.sort(cmp)
  let comps = tarjan(ids, (v) => flowOut.get(v)!)
  if (off.has('rings')) comps = ids.map((i) => [i])
  let units: Unit[] = comps.map((c, i) => ({ id: i, nodes: [...c].sort(cmp), H: 56, ring: c.length > 1, rel: new Map(), row: new Map(), back: [], minKey: '', top: 0, bottom: 0, left: 0, right: 0, x: 0, level: 0 }))
  units.forEach((u) => (u.minKey = nodes.get(u.nodes[0])!.key))
  units.sort((a, b) => cmp(a.nodes[0], b.nodes[0])); units.forEach((u, i) => (u.id = i))
  const unitOf = new Map<string, Unit>(); units.forEach((u) => u.nodes.forEach((n) => unitOf.set(n, u)))

  // 2. Levels: follow every arc between units. Units that depend on each other share a level.
  const uOut = new Map<number, Set<number>>(units.map((u) => [u.id, new Set()]))
  for (const a of arcs) { const p = unitOf.get(src(a))!, q = unitOf.get(dst(a))!; if (p !== q) uOut.get(p.id)!.add(q.id) }
  const sup = tarjan(units.map((u) => String(u.id)), (v) => [...uOut.get(Number(v))!].map(String)).map((c) => c.map(Number))
  const supOf = new Map<number, number>(); sup.forEach((c, i) => c.forEach((u) => supOf.set(u, i)))
  const sOut = sup.map(() => new Set<number>()), sIn = sup.map(() => new Set<number>())
  for (const [p, qs] of uOut) for (const q of qs) { const a = supOf.get(p)!, b = supOf.get(q)!; if (a !== b) { sOut[a].add(b); sIn[b].add(a) } }
  // tarjan returns components in reverse topological order
  const topo = sup.map((_, i) => i).reverse()
  const asap = sup.map(() => 0)
  for (const s of topo) for (const t of sOut[s]) asap[t] = Math.max(asap[t], asap[s] + 1)
  const isOutcome = (s: number) => sup[s].every((u) => units[u].nodes.every((n) => nodes.get(n)!.ends))
  const lone = (s: number) => sup[s].length === 1 && !units[sup[s][0]].ring
  const lvl = sup.map(() => 0)
  const nonOutcomeMax = Math.max(0, ...topo.filter((s) => !isOutcome(s)).map((s) => asap[s]))
  for (const s of [...topo].reverse()) {
    if (isOutcome(s)) { lvl[s] = nonOutcomeMax + 1; continue }
    const succ = [...sOut[s]].filter((t) => !isOutcome(t))
    lvl[s] = lone(s) && succ.length ? Math.max(asap[s], Math.min(...succ.map((t) => lvl[t])) - 1) : asap[s]
  }
  for (const s of topo) for (const t of sOut[s]) if (!isOutcome(t)) lvl[t] = Math.max(lvl[t], lvl[s] + 1)
  if (off.has('levels')) lvl.fill(0)
  units.forEach((u) => (u.level = lvl[supOf.get(u.id)!]))

  // 3. Inside a ring: a row from its start, columns by longest step count, returns swept outside.
  const labelW = (id: string) => Math.max(...labelLines(id).map((l) => l.length * CH), 0)
  const labelLines = (id: string) => {
    const n = nodes.get(id)!; if (off.has('labels')) return []
    const lines = n.ends && !off.has('outcome') ? [...wrap(n.ends), ...(n.ends !== n.label ? wrap(n.label) : [])] : wrap(n.label)
    if (n.hidden && !off.has('hidden')) lines.push(...wrap('(' + n.hidden + ')'))
    return lines
  }
  const step = off.has('staircase') ? 0 : STEP
  for (const u of units) {
    if (!u.ring) { u.rel.set(u.nodes[0], { x: 0, y: 0 }); u.row.set(u.nodes[0], 0); continue }
    const inU = new Set(u.nodes)
    const out = (v: string) => flowOut.get(v)!.filter((w) => inU.has(w))
    const marked = u.nodes.filter((n) => nodes.get(n)!.marks > 0)
    const entered = u.nodes.filter((n) => arcs.some((a) => dst(a) === n && !inU.has(src(a))))
    const root = (marked[0] ?? entered[0] ?? u.nodes[0])
    const onStack = new Set<string>(), seen = new Set<string>(), back = new Set<string>(), post: string[] = []
    const dfs = (v: string) => { seen.add(v); onStack.add(v); for (const w of out(v)) { if (onStack.has(w)) back.add(v + '>' + w); else if (!seen.has(w)) dfs(w) } onStack.delete(v); post.push(v) }
    dfs(root)
    const col = new Map<string, number>(u.nodes.map((n) => [n, 0]))
    const preds = new Map<string, string[]>(u.nodes.map((n) => [n, []]))
    for (const v of [...post].reverse()) for (const w of out(v)) if (!back.has(v + '>' + w)) { col.set(w, Math.max(col.get(w)!, col.get(v)! + 1)); preds.get(w)!.push(v) }
    u.back = [...back].map((e) => e.split('>') as [string, string])
    const maxCol = Math.max(...col.values())
    const spine = new Set<string>()
    let cur = u.nodes.filter((n) => col.get(n) === maxCol).sort(cmp)[0]
    while (cur) { spine.add(cur); const p = preds.get(cur)!.filter((q) => col.get(q) === col.get(cur)! - 1).sort(cmp); cur = p[0] }
    const cols: string[][] = Array.from({ length: maxCol + 1 }, () => [])
    u.nodes.forEach((n) => cols[col.get(n)!].push(n))
    const byLabel = (a: string, b: string) => mask(nodes.get(a)!.label).localeCompare(mask(nodes.get(b)!.label), 'en', { numeric: true }) || cmp(a, b)
    for (const c of cols) {
      const bary = (n: string) => { const ps = preds.get(n)!.filter((p) => u.row.has(p)); return ps.length ? ps.reduce((s, p) => s + u.row.get(p)!, 0) / ps.length : 0 }
      const sp = c.find((n) => spine.has(n))!
      const order = [...c].sort((a, b) => (a === sp ? 0 : bary(a)) - (b === sp ? 0 : bary(b)) || byLabel(a, b))
      const s0 = order.indexOf(sp)
      u.row.set(sp, 0)
      for (let i = s0 - 1; i >= 0; i--) u.row.set(order[i], Math.min(u.row.get(order[i + 1])! - 1, Math.round(bary(order[i]))))
      for (let i = s0 + 1; i < order.length; i++) u.row.set(order[i], Math.max(u.row.get(order[i - 1])! + 1, Math.round(bary(order[i]))))
    }
    const lines = (n: string) => labelLines(n).length
    const above = Math.max(0, ...u.nodes.filter((n) => !nodes.get(n)!.isState).map(lines)), below = Math.max(0, ...u.nodes.filter((n) => nodes.get(n)!.isState).map(lines))
    const H = Math.max(56, BAR_H / 2 + 6 + LINE * (above + below) + STATE_R + 12)
    u.H = H
    let x = 0
    const colX: number[] = []
    for (let c = 0; c <= maxCol; c++) {
      const ext = (n: string) => { const r = u.row.get(n)! * step, hw = Math.max(labelW(n) / 2, STATE_R); return [r - hw, r + hw] }
      if (c > 0) {
        const prevR = Math.max(...cols[c - 1].map((n) => ext(n)[1])), curL = Math.min(...cols[c].map((n) => ext(n)[0]))
        x += Math.max(48, prevR - curL + 14)
      }
      colX.push(x)
    }
    for (const n of u.nodes) u.rel.set(n, { x: colX[col.get(n)!] + u.row.get(n)! * step, y: u.row.get(n)! * H })
  }


  // lone nodes that touch only one ring at their own level are drawn beside it, in a row just outside
  const nbrs = new Map<string, string[]>(ids.map((i) => [i, []]))
  for (const a of arcs) { nbrs.get(a.state)!.push(a.verb); nbrs.get(a.verb)!.push(a.state) }
  if (!off.has('satellites')) for (const L of [...units]) {
    if (L.ring) continue
    const m = L.nodes[0], hosts = new Set(nbrs.get(m)!.map((x) => unitOf.get(x)!))
    const R = [...hosts][0]
    if (hosts.size !== 1 || !R.ring || R.level !== L.level) continue
    const ns = nbrs.get(m)!, mr = ns.reduce((t, x) => t + R.row.get(x)!, 0) / ns.length
    const row = mr > 0 ? Math.max(...R.row.values()) + 1 : Math.min(...R.row.values()) - 1
    let x = ns.reduce((t, n) => t + R.rel.get(n)!.x, 0) / ns.length
    while (R.nodes.some((n) => R.row.get(n) === row && Math.abs(R.rel.get(n)!.x - x) < 40)) x += 40
    R.nodes.push(m); R.row.set(m, row); R.rel.set(m, { x, y: row * R.H }); unitOf.set(m, R)
    units = units.filter((u) => u !== L)
  }

  // node boxes, label extents per unit
  const box = (id: string, p: Pt): Box => (nodes.get(id)!.isState ? { x: p.x, y: p.y, w: 2 * STATE_R + 2, h: 2 * STATE_R + 2 } : { x: p.x, y: p.y, w: BAR_W + 2, h: BAR_H })
  for (const u of units) {
    let t = 0, b = 0, l = 0, r = 0
    for (const n of u.nodes) {
      const p = u.rel.get(n)!, hw = Math.max(labelW(n) / 2, STATE_R) + 4, lh = labelLines(n).length * LINE
      t = Math.min(t, p.y - STATE_R - (nodes.get(n)!.isState ? 4 : lh + BAR_H / 2)); b = Math.max(b, p.y + STATE_R + (nodes.get(n)!.isState ? lh + 6 : BAR_H / 2))
      l = Math.min(l, p.x - hw); r = Math.max(r, p.x + hw)
    }
    const nb = u.back.filter(([a]) => u.row.get(a)! >= 0).length, na = u.back.length - nb
    if (nb) b += 8 + 12 * nb
    if (na) t -= 8 + 12 * na
    Object.assign(u, { top: t, bottom: b, left: l, right: r })
  }

  // 4. Levels top to bottom; within a level, order by where the unit's neighbours are.
  const levels = [...new Set(units.map((u) => u.level))].sort((a, b) => a - b)
  const band = new Map<number, Unit[]>(levels.map((l) => [l, units.filter((u) => u.level === l)]))
  const absX = (n: string) => unitOf.get(n)!.x + unitOf.get(n)!.rel.get(n)!.x
  const desired = (u: Unit, ok: (v: Unit) => boolean) => {
    const ds: number[] = []
    for (const n of u.nodes) for (const m of nbrs.get(n)!) { const v = unitOf.get(m)!; if (v !== u && ok(v)) ds.push(absX(m) - u.rel.get(n)!.x) }
    return ds.length ? ds.reduce((s, d) => s + d, 0) / ds.length : NaN
  }
  const placeBand = (us: Unit[], want: (u: Unit) => number) => {
    const w = new Map(us.map((u) => [u, want(u)]))
    const order = [...us].sort((a, b) => { const p = w.get(a)!, q = w.get(b)!; if (isNaN(p) || isNaN(q)) return isNaN(p) === isNaN(q) ? a.id - b.id : isNaN(p) ? 1 : -1; return p - q || a.id - b.id })
    let right = -Infinity, sumD = 0, nD = 0
    for (const u of order) {
      const d = w.get(u)!, gap = u.ring || order.some((v) => v.ring) ? GAP_UNIT : 14
      const x = Math.max(isNaN(d) ? right - u.left + gap : d, right === -Infinity ? -Infinity : right + gap - u.left)
      u.x = isFinite(x) ? x : (isNaN(d) ? -u.left : d)
      right = u.x + u.right
      if (!isNaN(d)) { sumD += d - u.x; nD++ }
    }
    if (nD) for (const u of order) u.x += sumD / nD
  }
  for (const l of levels) placeBand(band.get(l)!, (u) => desired(u, (v) => v.level < l))
  for (let it = 0; it < 4; it++) for (const l of (it % 2 ? [...levels].reverse() : levels)) placeBand(band.get(l)!, (u) => desired(u, (v) => v.level !== l))

  let y = 0
  const pos = new Map<string, Pt>()
  for (const l of levels) {
    const us = band.get(l)!, top = Math.min(...us.map((u) => u.top)), bottom = Math.max(...us.map((u) => u.bottom))
    y += -top
    for (const u of us) for (const n of u.nodes) pos.set(n, { x: u.x + u.rel.get(n)!.x, y: y + u.rel.get(n)!.y })
    ;(us as any).baseline = y
    y += bottom + GAP_BAND
  }
  const boxes = new Map<string, Box>([...pos].map(([id, p]) => [id, box(id, p)]))

  // 5. Arcs.
  const hits = (pts: Pt[], skip: string[]) => {
    let h = 0
    for (const [id, b] of boxes) {
      if (skip.includes(id)) continue
      const hw = b.w / 2 + 3, hh = b.h / 2 + 3
      for (let i = 0; i < pts.length - 1; i++) {
        let hit = false
        const dt = 3 / (Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y) || 1)
        for (let t = 0; t <= 1 && !hit; t += dt) { const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t, y2 = pts[i].y + (pts[i + 1].y - pts[i].y) * t; if (Math.abs(x - b.x) < hw && Math.abs(y2 - b.y) < hh) hit = true }
        if (hit) { h++; break }
      }
    }
    return h
  }
  const quad = (p: Pt, c: Pt, q: Pt, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return { x: (1 - t) ** 2 * p.x + 2 * (1 - t) * t * c.x + t * t * q.x, y: (1 - t) ** 2 * p.y + 2 * (1 - t) * t * c.y + t * t * q.y } })
  const paths = new Map<string, { pts: Pt[]; d: string }>()
  const backSet = new Set(units.flatMap((u) => u.back.map(([a, b]) => a + '>' + b)))
  // returns: swept around the outside of the ring, on the side of the row they leave, longest outermost
  for (const u of units) {
    for (const side of [-1, 1]) {
      const mine = u.back.filter(([a]) => (u.row.get(a)! < 0 ? -1 : 1) === side)
      const ranked = mine.sort((a, b) => (u.rel.get(a[0])!.x - u.rel.get(a[1])!.x) - (u.rel.get(b[0])!.x - u.rel.get(b[1])!.x) || cmp(a[0], b[0]))
      const edge = side > 0
        ? Math.max(...u.nodes.map((n) => pos.get(n)!.y + (nodes.get(n)!.isState ? STATE_R + labelLines(n).length * LINE + 4 : BAR_H / 2)))
        : Math.min(...u.nodes.map((n) => pos.get(n)!.y - (nodes.get(n)!.isState ? STATE_R : BAR_H / 2 + labelLines(n).length * LINE + 4)))
      ranked.forEach(([a, b], i) => {
        const p = pos.get(a)!, q = pos.get(b)!
        const yo = edge + side * 12 * (i + 1), dx = 10 + 5 * i
        const pts = [p, { x: p.x + dx, y: p.y + side * 14 }, { x: p.x + dx, y: yo }, { x: q.x - dx, y: yo }, { x: q.x - dx, y: q.y + side * 14 }, q]
        if (!off.has('returns')) for (const a2 of arcs) if (src(a2) === a && dst(a2) === b && (a2.kind === 'take' || a2.kind === 'give')) paths.set(arcKey(a2), { pts, d: '' })
      })
    }
  }
  function route(p: Pt, q: Pt, skip: string[]): Pt[] {
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, len = Math.hypot(q.x - p.x, q.y - p.y) || 1, nx = -(q.y - p.y) / len, ny = (q.x - p.x) / len
    let best: Pt[] = [p, q], bh = hits(best, skip)
    if (bh) for (const d of [24, -24, 40, -40, 60, -60, 85, -85, 120, -120, 170, -170, 240, -240, 330, -330, 450, -450]) {
      const c = quad(p, { x: mx + nx * d, y: my + ny * d }, q), h = hits(c, skip)
      if (h < bh) { best = c; bh = h; if (!h) break }
    }
    return best
  }
  // cables: three or more arcs between one node and nodes of another level travel together and split near their ends
  const levelOf = (n: string) => unitOf.get(n)!.level
  const groups = new Map<string, Arc[]>()
  for (const a of arcs) for (const [hub, other] of [[a.state, a.verb], [a.verb, a.state]]) {
    if (paths.has(arcKey(a)) || levelOf(hub) === levelOf(other)) continue
    const g = hub + '@' + levelOf(other); if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(a)
  }
  const used = new Set<string>()
  if (!off.has('cables')) for (const [g, as] of [...groups].sort((p, q) => q[1].length - p[1].length || cmp(p[0].split('@')[0], q[0].split('@')[0]) || Number(p[0].split('@')[1]) - Number(q[0].split('@')[1]))) {
    const hub = g.split('@')[0], h = pos.get(hub)!
    const free = as.filter((a) => !used.has(arcKey(a)))
    const other = (a: Arc) => (a.state === hub ? a.verb : a.state)
    const sorted = [...free].sort((p, q) => pos.get(other(p))!.x - pos.get(other(q))!.x || cmp(other(p), other(q)))
    const clusters: Arc[][] = []
    for (const a of sorted) { const last = clusters[clusters.length - 1]; if (last && pos.get(other(a))!.x - pos.get(other(last[last.length - 1]))!.x < 80) last.push(a); else clusters.push([a]) }
    for (const cl of clusters) {
      if (cl.length < 3) continue
      const ts = cl.map((a) => pos.get(other(a))!), below = ts[0].y > h.y
      const sy = below ? Math.max(h.y + 30, Math.min(...ts.map((t) => t.y)) - 40) : Math.min(h.y - 30, Math.max(...ts.map((t) => t.y)) + 40)
      const sx = ts.reduce((t, p) => t + p.x, 0) / ts.length
      const trunk = route(h, { x: sx, y: sy }, [hub])
      for (const a of cl) {
        const t = pos.get(other(a))!, full = [...trunk, t]
        paths.set(arcKey(a), { pts: src(a) === hub ? full : [...full].reverse(), d: '' }); used.add(arcKey(a))
      }
    }
  }
  for (const a of arcs) {
    const k = arcKey(a); if (paths.has(k)) continue
    paths.set(k, { pts: route(pos.get(src(a))!, pos.get(dst(a))!, [a.state, a.verb]), d: '' })
  }

  // arcs that join the same state and verb are bowed apart so none lies on another
  const pairs = new Map<string, Arc[]>()
  for (const a of arcs) { const k = a.state + '|' + a.verb; if (!pairs.has(k)) pairs.set(k, []); pairs.get(k)!.push(a) }
  for (const group of pairs.values()) group.forEach((a, i) => {
    if (!i) return
    const p = pos.get(src(a))!, q = pos.get(dst(a))!, len = Math.hypot(q.x - p.x, q.y - p.y) || 1
    const bow = (d: number) => quad(p, { x: (p.x + q.x) / 2 - ((q.y - p.y) / len) * d, y: (p.y + q.y) / 2 + ((q.x - p.x) / len) * d }, q)
    let best: Pt[] = [], bh = Infinity
    for (const m of [1, 2, 3]) for (const sg of [1, -1]) { const c = bow(sg * 18 * i * m), h = hits(c, [a.state, a.verb]); if (h < bh) { bh = h; best = c } }
    paths.set(arcKey(a), { pts: best, d: '' })
  })

  // labels
  const occupied: Box[] = [...boxes.values()]
  const arcPts = [...paths.values()].map((p) => p.pts).flatMap((pts) => pts.flatMap((p, i) => i ? Array.from({ length: 6 }, (_, j) => ({ x: pts[i - 1].x + (p.x - pts[i - 1].x) * j / 6, y: pts[i - 1].y + (p.y - pts[i - 1].y) * j / 6 })) : []))
  const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) * Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2))
  const placed: { id: string; b: Box; anchor: string; lines: string[] }[] = []
  for (const id of ids) {
    const n = nodes.get(id)!, lines = labelLines(id); if (!lines.length) continue
    const c = pos.get(id)!, w = labelW(id) + 4, h = lines.length * LINE
    const ry = n.isState ? STATE_R : BAR_H / 2
    const cands: [Box, 'middle' | 'start' | 'end'][] = [
      ...(n.isState ? [] : [[{ x: c.x, y: c.y - ry - 3 - h / 2, w, h }, 'middle'] as [Box, 'middle']]),
      [{ x: c.x, y: c.y + ry + 3 + h / 2, w, h }, 'middle'],
      ...(n.isState ? [[{ x: c.x, y: c.y - ry - 3 - h / 2, w, h }, 'middle'] as [Box, 'middle']] : []),
      [{ x: c.x + (n.isState ? STATE_R : 4) + 3 + w / 2, y: c.y + (n.isState ? 0 : 0), w, h }, 'start'],
      [{ x: c.x - (n.isState ? STATE_R : 4) - 3 - w / 2, y: c.y, w, h }, 'end'],
    ]
    let best = cands[0], bc = Infinity
    for (const cand of cands) {
      const [b] = cand
      const cost = occupied.reduce((s, o) => s + overlap(b, o), 0) * 4 + arcPts.filter((p) => Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2).length * 6
      if (cost < bc - 0.01) { bc = cost; best = cand }
    }
    const [b, anchor] = best
    occupied.push(b)
    placed.push({ id, b, anchor, lines })
  }

  // geometry in drawing coordinates, then translate
  const all: Pt[] = [...pos.values()]
  for (const { pts } of paths.values()) all.push(...pts)
  for (const { b } of placed) all.push({ x: b.x - b.w / 2, y: b.y - b.h / 2 }, { x: b.x + b.w / 2, y: b.y + b.h / 2 })
  const minX = Math.min(...all.map((p) => p.x)) - MARGIN, minY = Math.min(...all.map((p) => p.y)) - MARGIN
  const T = (p: Pt) => ({ x: Math.round((p.x - minX) * 10) / 10, y: Math.round((p.y - minY) * 10) / 10 })
  const width = Math.ceil(Math.max(...all.map((p) => p.x)) - minX + MARGIN), height = Math.ceil(Math.max(...all.map((p) => p.y)) - minY + MARGIN)

  const layout: Drawing['layout'] = { nodes: {}, arcs: {} }
  for (const [id, b] of boxes) { const t = T(b); layout.nodes[id] = { ...b, x: t.x, y: t.y } }
  const svg: string[] = []
  const seatColor = (by: string) => (off.has('speaker-color') || by === 'world' ? '#8a8a8a' : net.seats.find((s) => s.id === by)?.color ?? '#333')

  // arcs
  const clip = (pts: Pt[], id: string, atEnd: boolean) => {
    const n = nodes.get(id)!, ps = atEnd ? pts : [...pts].reverse()
    const e = ps[ps.length - 1]
    let i = ps.length - 2
    const inside = (p: Pt) => n.isState ? Math.hypot(p.x - e.x, p.y - e.y) < STATE_R + 1.5 : Math.abs(p.x - e.x) < BAR_W / 2 + 1.5 && Math.abs(p.y - e.y) < BAR_H / 2 + 1.5
    while (i > 0 && inside(ps[i])) i--
    let a = ps[i], b = e
    for (let k = 0; k < 20; k++) { const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; if (inside(m)) b = m; else a = m }
    const res = [...ps.slice(0, i + 1), a]
    return atEnd ? res : res.reverse()
  }
  const pathD = (pts: Pt[]) => {
    if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`
    if (pts.length > 8) return 'M' + pts.map((p) => `${p.x},${p.y}`).join('L')
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1]
      const r = Math.min(14, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2)
      const u1 = Math.hypot(b.x - a.x, b.y - a.y) || 1, u2 = Math.hypot(c.x - b.x, c.y - b.y) || 1
      d += `L${(b.x - ((b.x - a.x) / u1) * r).toFixed(1)},${(b.y - ((b.y - a.y) / u1) * r).toFixed(1)}Q${b.x},${b.y} ${(b.x + ((c.x - b.x) / u2) * r).toFixed(1)},${(b.y + ((c.y - b.y) / u2) * r).toFixed(1)}`
    }
    const z = pts[pts.length - 1]
    return d + `L${z.x},${z.y}`
  }
  const arcSvg: string[] = [], countSvg: string[] = []
  for (const a of arcs) {
    const k = arcKey(a), raw = paths.get(k)!.pts.map(T)
    // drawn from source to destination; layout lists the state end first
    const flowPts = clip(clip(raw, dst(a), true), src(a), false)
    layout.arcs[k] = a.kind === 'give' ? [...raw].reverse() : raw
    const ends = off.has('arc-ends') ? '' : a.kind === 'take' || a.kind === 'give' ? ' marker-end="url(#arrow)"' : a.kind === 'need' ? ' marker-end="url(#dot)"' : ' marker-end="url(#ring)"'
    arcSvg.push(`<path d="${pathD(flowPts)}" fill="none" stroke="#333" stroke-width="1"${a.kind === 'need' || a.kind === 'unless' ? ' stroke-dasharray="3 2"' : ''}${ends}/>`)
    if (a.count > 1 && !off.has('counts')) {
      const m = flowPts[Math.max(0, Math.floor(flowPts.length * 0.7) - (flowPts.length === 2 ? 0 : 0))]
      const p = flowPts.length === 2 ? { x: flowPts[0].x + (flowPts[1].x - flowPts[0].x) * 0.72, y: flowPts[0].y + (flowPts[1].y - flowPts[0].y) * 0.72 } : m
      countSvg.push(`<text x="${p.x + 4}" y="${p.y - 3}" font-size="10" font-weight="bold" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke">${a.count}</text>`)
    }
  }

  const labelSvg: string[] = []
  for (const { id, b: b0, anchor, lines } of placed) {
    const n = nodes.get(id)!, b = { ...b0, ...T(b0) }, h = b.h
    const tx = anchor === 'middle' ? b.x : anchor === 'start' ? b.x - b.w / 2 + 2 : b.x + b.w / 2 - 2
    const fill = n.isState ? '#111' : seatColor(n.by!)
    lines.forEach((l, i) => labelSvg.push(`<text x="${tx}" y="${(b.y - h / 2 + LINE * (i + 0.8)).toFixed(1)}" text-anchor="${anchor}" font-size="${FONT}" fill="${fill}"${n.ends && !off.has('outcome') && i < wrap(n.ends).length ? ' font-weight="bold"' : ''} stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(l)}</text>`))
  }
  // nodes
  const nodeSvg: string[] = []
  for (const id of ids) {
    const n = nodes.get(id)!, c = T(pos.get(id)!)
    if (n.isState) {
      const dash = n.hidden && !off.has('hidden') ? ' stroke-dasharray="3 2"' : ''
      nodeSvg.push(`<circle cx="${c.x}" cy="${c.y}" r="${STATE_R}" fill="#fff" stroke="#222" stroke-width="${n.ends && !off.has('outcome') ? 2.2 : 1.3}"${dash}/>`)
      if (n.ends && !off.has('outcome')) nodeSvg.push(`<circle cx="${c.x}" cy="${c.y}" r="${STATE_R - 3.5}" fill="#222"/>`)
      if (!off.has('marks')) {
        if (n.marks === 1) nodeSvg.push(`<circle cx="${c.x}" cy="${c.y}" r="3" fill="#111"/>`)
        else if (n.marks > 1) nodeSvg.push(`<text x="${c.x}" y="${c.y + 3.5}" text-anchor="middle" font-size="10" font-weight="bold">${n.marks}</text>`)
      }
    } else {
      const col = seatColor(n.by!)
      const vertical = true
      nodeSvg.push(vertical ? `<rect x="${c.x - BAR_W / 2}" y="${c.y - BAR_H / 2}" width="${BAR_W}" height="${BAR_H}" fill="${col}"/>` : '')
      if (n.by === 'world' && !off.has('priority')) {
        nodeSvg.push(`<text x="${c.x - BAR_W / 2 - 2}" y="${c.y + BAR_H / 2 - 1}" text-anchor="end" font-size="8" fill="#666" stroke="#fff" stroke-width="2" paint-order="stroke">${n.priority}</text>`)
      }
      if (n.weight > 1 && !off.has('counts')) nodeSvg.push(`<text x="${c.x + BAR_W / 2 + 2}" y="${c.y + BAR_H / 2 - 1}" font-size="9" font-weight="bold" fill="#666" stroke="#fff" stroke-width="2" paint-order="stroke">×${n.weight}</text>`)
    }
  }

  const defs = `<defs><marker id="arrow" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0.8L8,4L0,7.2z" fill="#333"/></marker><marker id="dot" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="6" markerHeight="6"><circle cx="4" cy="4" r="3" fill="#333"/></marker><marker id="ring" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7"><circle cx="5" cy="5" r="3.4" fill="#fff" stroke="#333" stroke-width="1.4"/></marker></defs>`
  const title = `<text x="${MARGIN}" y="16" font-size="12" font-weight="bold" fill="#333">${esc(net.title)}</text>`
  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 10}" viewBox="0 -10 ${width} ${height + 10}" font-family="Helvetica, Arial, sans-serif">${defs}${title}<g>${arcSvg.join('')}</g><g>${nodeSvg.join('')}</g><g>${countSvg.join('')}${labelSvg.join('')}</g></svg>`
  return { svg: body, width, height: height + 10, layout }
}

const elements: Element[] = [
  { id: 'levels', what: 'Vertical position. Follow every arc; a ring or node sits below everything it depends on, loops that gate each other share a level, outcomes sit on the bottom line.', purpose: 'Down is what cannot be undone: nothing below ever feeds marks back up, so the page narrows toward the outcomes and a reader sees which parts of play are left behind for good.', serves: ['possibility', 'actionable', 'compare-shape', 'readable'] },
  { id: 'rings', what: 'Each strongly connected part of the mark flow (take and give only) is drawn as one ring at one level: a straight row from its marked state, left to right.', purpose: 'A ring is a loop play can return to, which is usually one entity always in one of its states; contact between rings shows as arcs between them.', serves: ['entity', 'loop', 'contact', 'readable'] },
  { id: 'returns', what: 'Arcs that close a ring are swept around the outside of the ring, on the side of the row they leave, longest outermost.', purpose: 'Makes every loop visible as a loop without crossing the ring row, as in the dining philosophers figure.', serves: ['loop', 'readable'] },
  { id: 'staircase', what: 'Nodes that share a column in a ring step one notch right per row away from the row they branch from.', purpose: 'Alternatives that branch from the same state stay identical in shape, and arcs that arrive from above or below reach each one without running through its siblings.', serves: ['possibility', 'readable'] },
  { id: 'satellites', what: 'A lone node that touches only one ring at its own level sits in a row just outside that ring, over the node it touches.', purpose: 'Keeps a ring\'s helper (a pass, a hold) next to the state it gates instead of pushed beside the whole ring.', serves: ['readable'] },
  { id: 'cables', what: 'Three or more arcs between one node and one other level travel as one line and split close to their ends.', purpose: 'A hub such as a turn counter reads as one connection to a group, not a fan of crossing lines; no arc is merged away, each keeps its own end.', serves: ['readable'] },
  { id: 'state-circle', what: 'A state is a circle; one mark is a dot, more marks are printed as a number.', purpose: 'Petri convention: where marks can be, and the starting marking.', serves: ['entity', 'counts', 'possibility'] },
  { id: 'verb-bar', what: 'A verb is a thin bar with its label beside it.', purpose: 'Petri convention: what can be said, kept visually light so states and flow dominate.', serves: ['conversation', 'readable'] },
  { id: 'speaker-color', what: 'A seat\'s verb bar and label are in the seat\'s color; the world\'s are gray.', purpose: 'Who speaks each verb, and which answers are the world\'s.', serves: ['conversation'] },
  { id: 'priority', what: 'The world verb\'s priority is printed small at the foot of its bar.', purpose: 'The order in which the world answers until it falls silent.', serves: ['conversation', 'actionable'] },
  { id: 'arc-ends', what: 'take and give are solid lines with an arrow at the end marks flow into; need is dashed ending in a dot at the verb; unless is dashed ending in an open ring.', purpose: 'Separates moving marks (which decide rings and levels) from gates (contact and content conditions).', serves: ['contact', 'content', 'possibility'] },
  { id: 'counts', what: 'Arc counts above 1 are printed near the arc\'s verb end; world weights above 1 as \u00d7n beside the bar.', purpose: 'Counts and odds are on the map.', serves: ['counts', 'actionable'] },
  { id: 'outcome', what: 'An outcome is a heavy circle with a filled core, its result in bold, always on the bottom line.', purpose: 'Where play ends, and what each ending is called.', serves: ['possibility', 'actionable'] },
  { id: 'hidden', what: 'A state not seen by every seat has a dashed outline and says who sees it.', purpose: 'Hidden information is a property of the state.', serves: ['conversation', 'possibility'] },
  { id: 'labels', what: 'Every node\'s label, beside it, in the first free place below, above, right or left.', purpose: 'Names, for comparing by name.', serves: ['compare-name', 'actionable'] },
]
export const design: Design = {
  id: 'noreturn',
  title: 'No return: down is what cannot be undone',
  idea: 'Vertical position means irreversibility. The loops play can return to (strongly connected parts of the mark flow) are drawn as rings, each a straight row with its returns swept around the outside, and every ring sits below everything it depends on. Marks only ever move down or around a ring, so the page narrows from where play starts to the outcomes on the bottom line.',
  rules: [
    'Treat take as an arrow state to verb and give as verb to state. A ring is every set of nodes where you can follow those arrows from any one back to any other. Everything else is a lone node.',
    'Levels: now follow every arc (need and unless also point state to verb). Put each ring or lone node one level below everything it depends on. Rings that depend on each other share a level. A lone node that only feeds something sits just above what it feeds.',
    'Outcomes (states that end play) go on one line at the bottom.',
    'Draw each ring as a row: start at its marked state, and give every node a column equal to the longest step count from the start, not counting steps back to earlier columns.',
    'Within a column, the node on the longest path stays on the row; the others stack above and below it, in the order of their parents\' rows, then of the numbers in their labels. Each row away moves one notch right.',
    'Arrows that go back to an earlier column are returns: sweep them around the outside of the ring, below if they leave from the row or under it, above otherwise, longest outermost.',
    'A lone node that touches only one ring on its own level sits just outside that ring, over the node it touches.',
    'Within a level, order rings and nodes left to right by the average position of everything they connect to on other levels.',
    'Draw states as circles (a dot for one mark, the number for more), verbs as thin bars in the speaker\'s color (world gray, priority at the foot), outcomes as heavy circles with a filled core.',
    'Arcs: take and give solid with an arrow; need dashed to a dot; unless dashed to an open ring. Print counts above 1 by the verb end and weights as \u00d7n.',
    'Draw an arc straight if it clears every node, else bend it to one side. Three or more arcs from one node to one other level run together and split near their ends.',
    'Write each label beside its node in the first free place: below a state or above a bar, then the other side, then right, then left.',
  ],
  elements,
  axes: {
    x: 'within a ring, steps along the loop from its marked state; between units, the average position of what they connect to',
    y: 'irreversibility: dependency level in the condensation of the net, outcomes at the bottom',
    placement: 'strongly connected parts of the mark flow, layered by dependency',
    verb: 'thin bar, label beside it',
    speaker: 'bar and label in the seat color; world gray with its priority at the foot',
    entity: 'a ring: the loop of states play can return to, drawn as one row',
    routing: 'straight when clear, else one bend; ring returns swept around the outside; hub arcs cabled',
    unit: 'one whole net',
  },
  draw,
}
