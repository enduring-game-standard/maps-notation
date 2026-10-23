// PROTOTYPE. The `exchange` convention: vertical position is the moment in one exchange when a verb can speak.
import type { Arc, Net, State, Verb } from '../../../../studio/src/core/model'
import { arcKey, type Box, type Design, type Drawing, type Pt } from '../../harness/contract'

type RowKind = 'gap' | 'band' | 'ends'
interface Item { id: string; state?: State; verb?: Verb; cable?: string; w: number; h: number; labelW: number; x: number; key: string }
interface Row { kind: RowKind; band?: number; items: Item[]; y: number; h: number }
type Route = { arc: Arc; kind: 'direct' | 'cable' | 'return'; upper: string; lower: string; flowUp: boolean; cable?: string }

const R = 10, BAR_H = 5, FONT = 11, CH = 6.5, SEP = 18, LANE = 12, TRACK = 8, CORRIDOR = 38
const textW = (s: string) => Math.ceil(s.length * CH)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) }
const digits = (s: string) => (s.match(/\d+/g) ?? []).map((d) => d.padStart(6, '0')).join('.')

/** Structural signature per node: speaker, priority, weight, marks, outcome, refined by its arcs. Names never enter it. */
function signatures(net: Net, seatIndex: Map<string, number>) {
  let sig = new Map<string, string>()
  for (const s of net.states) sig.set(s.id, `s|${s.marks}|${s.ends ? 'E' : ''}|${s.seenBy === 'all' ? 'a' : 'h'}`)
  for (const v of net.verbs) sig.set(v.id, `v|${v.by === 'world' ? 'w' : 's' + seatIndex.get(v.by)}|${v.priority}|${v.weight}`)
  for (let round = 0; round < 4; round++) {
    const next = new Map<string, string>()
    for (const [id, s] of sig) {
      const nb = net.arcs.filter((a) => a.state === id || a.verb === id)
        .map((a) => `${a.kind}${a.count}${a.state === id ? '>' : '<'}${sig.get(a.state === id ? a.verb : a.state)}`).sort()
      next.set(id, hash(s + '#' + nb.join(',')))
    }
    sig = next
  }
  return sig
}

/** Order items to minimize (x_i - d_i)^2 subject to keeping order and spacing: isotonic regression by pooling adjacent violators. */
function placeRow(items: Item[], desired: number[]) {
  const off: number[] = []
  let acc = 0
  items.forEach((it, i) => { if (i) acc += items[i - 1].w / 2 + items[i - 1].labelW + SEP + it.w / 2; off.push(acc) })
  const blocks: { sum: number; w: number; n: number }[] = []
  desired.forEach((d, i) => {
    const w = items[i].cable ? 8 : 1
    blocks.push({ sum: w * (d - off[i]), w, n: 1 })
    const mean = (b: { sum: number; w: number }) => b.sum / b.w
    while (blocks.length > 1 && mean(blocks[blocks.length - 2]) > mean(blocks[blocks.length - 1])) {
      const b = blocks.pop()!, t = blocks[blocks.length - 1]; t.sum += b.sum; t.w += b.w; t.n += b.n
    }
  })
  let i = 0
  for (const b of blocks) for (let k = 0; k < b.n; k++, i++) items[i].x = b.sum / b.w + off[i]
}

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const without = new Set(opts?.without ?? [])
  const seatIndex = new Map(net.seats.map((s, i) => [s.id, i]))
  const seatColor = new Map(net.seats.map((s) => [s.id, s.color]))
  const sig = signatures(net, seatIndex)
  const stateById = new Map(net.states.map((s) => [s.id, s]))
  const verbById = new Map(net.verbs.map((v) => [v.id, v]))
  const label = (id: string) => (stateById.get(id)?.label ?? verbById.get(id)?.label ?? '')
  const canon = (id: string) => `${sig.get(id)}|${digits(label(id))}|${String(label(id).length).padStart(4, '0')}|${label(id)}|${id}`

  // Bands: the seats first, then the world by priority, highest first.
  const hasSeat = net.verbs.some((v) => v.by !== 'world')
  const prios = [...new Set(net.verbs.filter((v) => v.by === 'world').map((v) => v.priority))].sort((a, b) => b - a)
  const bandOf = (v: Verb) => (v.by === 'world' ? prios.indexOf(v.priority) + (hasSeat ? 1 : 0) : 0)
  const nb = prios.length + (hasSeat ? 1 : 0)

  // Each state sits in the gap where most of its arcs point down; ties go to the shortest arcs, then the top.
  const gapOf = new Map<string, number>()
  for (const s of net.states) {
    if (s.ends) { gapOf.set(s.id, nb + 1); continue }
    const arcs = net.arcs.filter((a) => a.state === s.id)
    let best = 0, bestScore = -Infinity
    for (let g = 0; g <= nb; g++) {
      let down = 0, len = 0
      for (const a of arcs) {
        const b = bandOf(verbById.get(a.verb)!)
        if (a.kind === 'give' ? b < g : b >= g) down++
        len += Math.abs(2 * b + 1 - 2 * g)
      }
      const score = down * 1000 - len
      if (score > bestScore) { bestScore = score; best = g }
    }
    gapOf.set(s.id, best)
  }

  // Rows in exchange order: gap 0, band 0, gap 1, ... band nb-1, gap nb, outcomes. Empty gaps are dropped.
  const rows: Row[] = []
  const rowOf = new Map<string, number>()
  const itemOf = new Map<string, Item>()
  const mkState = (s: State): Item => ({ id: s.id, state: s, w: 2 * R, h: 2 * R, labelW: 6 + textW(s.ends ?? s.label), x: 0, key: canon(s.id) })
  const verbText = (v: Verb) => v.label + (v.weight > 1 ? `  w${v.weight}` : '')
  const mkVerb = (v: Verb): Item => {
    const n = net.arcs.filter((a) => a.verb === v.id).length
    return { id: v.id, verb: v, w: Math.max(26, 7 * (n + 1)), h: BAR_H, labelW: 6 + textW(verbText(v)), x: 0, key: canon(v.id) }
  }
  for (let g = 0; g <= nb + 1; g++) {
    const ss = net.states.filter((s) => gapOf.get(s.id) === g)
    if (ss.length) rows.push({ kind: g === nb + 1 ? 'ends' : 'gap', items: ss.map(mkState), y: 0, h: 2 * R })
    if (g < nb) rows.push({ kind: 'band', band: g, items: net.verbs.filter((v) => bandOf(v) === g).map(mkVerb), y: 0, h: 14 })
  }
  rows.forEach((r, i) => r.items.forEach((it) => { rowOf.set(it.id, i); itemOf.set(it.id, it) }))

  // Routes. Long downward arcs that end at one node with one kind share a cable of placeholders through the rows between.
  const routes: Route[] = []
  const cables = new Map<string, { lower: string; kind: string; from: number; to: number }>()
  for (const a of [...net.arcs].sort((p, q) => (canon(p.state) + p.kind + canon(p.verb) < canon(q.state) + q.kind + canon(q.verb) ? -1 : 1))) {
    const rs = rowOf.get(a.state)!, rv = rowOf.get(a.verb)!
    const upper = rs < rv ? a.state : a.verb, lower = rs < rv ? a.verb : a.state
    const flowUp = a.kind === 'give' ? rv > rs : rs > rv
    const span = Math.abs(rs - rv)
    if (span === 1) routes.push({ arc: a, kind: 'direct', upper, lower, flowUp })
    else if (!flowUp || without.has('return-sweep')) {
      const ck = `${lower}|${a.kind === 'give' ? 'give' : a.kind}`
      const c = cables.get(ck) ?? { lower, kind: a.kind, from: Infinity, to: rowOf.get(lower)! - 1 }
      c.from = Math.min(c.from, rowOf.get(upper)! + 1); cables.set(ck, c)
      routes.push({ arc: a, kind: 'cable', upper, lower, flowUp, cable: ck })
    } else routes.push({ arc: a, kind: 'return', upper, lower, flowUp })
  }
  for (const [ck, c] of [...cables].sort((p, q) => (p[0] < q[0] ? -1 : 1))) for (let r = c.from; r <= c.to; r++) {
    const it: Item = { id: `~${ck}~${r}`, cable: ck, w: 6, h: 6, labelW: 0, x: 0, key: canon(c.lower) + c.kind }
    rows[r].items.push(it); rowOf.set(it.id, r); itemOf.set(it.id, it)
  }

  // Ordering graph between adjacent rows.
  const edges: [string, string, number][] = []
  for (const rt of routes) {
    if (rt.kind === 'direct') edges.push([rt.upper, rt.lower, 1])
    if (rt.kind === 'cable') { const c = cables.get(rt.cable!)!; edges.push([rt.upper, `~${rt.cable}~${rowOf.get(rt.upper)! + 1}`, 1]) }
  }
  for (const [ck, c] of cables) { for (let r = c.from; r < c.to; r++) edges.push([`~${ck}~${r}`, `~${ck}~${r + 1}`, 6]); edges.push([`~${ck}~${c.to}`, c.lower, 2]) }
  const uniq = new Map<string, [string, string, number]>()
  for (const e of edges) { const k = e[0] + '>' + e[1]; const o = uniq.get(k); uniq.set(k, o ? [e[0], e[1], o[2] + e[2]] : e) }
  const E = [...uniq.values()]
  const nbr = new Map<string, { id: string; w: number; up: boolean }[]>()
  for (const [u, l, w] of E) {
    if (!nbr.has(u)) nbr.set(u, []); if (!nbr.has(l)) nbr.set(l, [])
    nbr.get(u)!.push({ id: l, w, up: false }); nbr.get(l)!.push({ id: u, w, up: true })
  }

  // In the seat row each seat's verbs stay together, seats in their declared order; placeholders join the nearest seat.
  const blocksOf = (r: Row, bc: Map<string, number>) => {
    const out = new Map<string, number>()
    const seatItems = r.items.filter((it) => it.verb && it.verb.by !== 'world')
    const means = new Map<number, number>()
    for (const k of new Set(seatItems.map((it) => seatIndex.get(it.verb!.by)!))) {
      const xs = seatItems.filter((it) => seatIndex.get(it.verb!.by) === k).map((it) => bc.get(it.id)!)
      means.set(k, xs.reduce((a, b) => a + b, 0) / xs.length)
    }
    for (const it of r.items) {
      if (it.verb && it.verb.by !== 'world') out.set(it.id, seatIndex.get(it.verb.by)!)
      else if (means.size) out.set(it.id, [...means].sort((p, q) => Math.abs(p[1] - bc.get(it.id)!) - Math.abs(q[1] - bc.get(it.id)!) || p[0] - q[0])[0][0])
      else out.set(it.id, 0)
    }
    return out
  }
  for (const r of rows) r.items.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  { const bc0 = new Map<string, number>(); rows.forEach((r) => r.items.forEach((it, i) => bc0.set(it.id, i))); for (const r of rows) { const blk = blocksOf(r, bc0); r.items.sort((a, b) => blk.get(a.id)! - blk.get(b.id)! || bc0.get(a.id)! - bc0.get(b.id)!) } }
  const pos = new Map<string, number>()
  const index = () => rows.forEach((r) => r.items.forEach((it, i) => pos.set(it.id, i)))
  const crossings = () => {
    let n = 0
    for (let i = 0; i + 1 < rows.length; i++) {
      const es = E.filter(([u]) => rowOf.get(u) === i).map(([u, l]) => [pos.get(u)!, pos.get(l)!])
      for (let a = 0; a < es.length; a++) for (let b = a + 1; b < es.length; b++) if ((es[a][0] - es[b][0]) * (es[a][1] - es[b][1]) < 0) n++
    }
    return n
  }
  index()
  let best = rows.map((r) => [...r.items]), bestC = crossings()
  const sweep = (it: number, hold: number) => {
    const down = it % 2 === 0
    const order = (down ? rows.map((_, i) => i) : rows.map((_, i) => rows.length - 1 - i)).filter((i) => i !== hold)
    for (const ri of order) {
      const r = rows[ri]
      const bc = new Map<string, number>()
      r.items.forEach((item, i) => {
        const ns = (nbr.get(item.id) ?? []).filter((n) => n.up === down)
        const tw = ns.reduce((s, n) => s + n.w, 0)
        bc.set(item.id, tw ? ns.reduce((s, n) => s + n.w * pos.get(n.id)!, 0) / tw : i)
      })
      const blk = blocksOf(r, bc)
      r.items.sort((a, b) => blk.get(a.id)! - blk.get(b.id)! || bc.get(a.id)! - bc.get(b.id)! || pos.get(a.id)! - pos.get(b.id)!)
      r.items.forEach((item, i) => pos.set(item.id, i))
    }
  }
  for (let it = 0; it < 24; it++) {
    sweep(it, -1)
    const c = crossings()
    if (c < bestC) { bestC = c; best = rows.map((r) => [...r.items]) }
  }
  rows.forEach((r, i) => (r.items = best[i]))
  index()
  // Refine: try reversing each seat's block, then swap neighbors, keeping any change that removes crossings.
  const tryOrder = (ri: number, items: Item[]) => {
    const keep = rows[ri].items
    rows[ri].items = items; index()
    const c = crossings()
    if (c < bestC) { bestC = c; return true }
    rows[ri].items = keep; index(); return false
  }
  rows.forEach((r, ri) => {
    if (r.kind !== 'band' || r.band !== 0 || !hasSeat) return
    for (const k of net.seats.map((_, i) => i)) {
      const idx = r.items.map((it, i) => (it.verb && it.verb.by !== 'world' && seatIndex.get(it.verb.by) === k ? i : -1)).filter((i) => i >= 0)
      if (idx.length < 2) continue
      const lo = idx[0], hi = idx[idx.length - 1]
      const keep = rows.map((q) => [...q.items])
      r.items = [...r.items.slice(0, lo), ...r.items.slice(lo, hi + 1).reverse(), ...r.items.slice(hi + 1)]
      index()
      for (let it = 0; it < 8; it++) sweep(it, ri)
      const c = crossings()
      if (c < bestC) bestC = c
      else { rows.forEach((q, i) => (q.items = keep[i])); index() }
    }
  })
  for (let pass = 0, improved = true; pass < 6 && improved; pass++) {
    improved = false
    for (const [ri, r] of rows.entries()) for (let i = 0; i + 1 < r.items.length; i++) {
      const a = r.items[i], b = r.items[i + 1]
      if (r.kind === 'band' && r.band === 0 && hasSeat && a.verb && b.verb && a.verb.by !== b.verb.by) continue
      const next = [...r.items]; next[i] = b; next[i + 1] = a
      if (tryOrder(ri, next)) improved = true
    }
  }

  // Horizontal positions: pack, then pull each node toward its neighbors, row by row, down and up.
  for (const r of rows) placeRow(r.items, r.items.map(() => 0))
  for (let it = 0; it < 60; it++) {
    const seq = it % 2 === 0 ? rows : [...rows].reverse()
    const cableX = new Map<string, number>()
    for (const [ck, c] of cables) {
      const xs: number[] = []
      for (let r = c.from; r <= c.to; r++) xs.push(itemOf.get(`~${ck}~${r}`)!.x)
      const ends = [c.lower, ...routes.filter((rt) => rt.cable === ck).map((rt) => rt.upper)].map((id) => itemOf.get(id)!.x)
      cableX.set(ck, (xs.reduce((a, b) => a + b, 0) * 2 + ends.reduce((a, b) => a + b, 0)) / (xs.length * 2 + ends.length))
    }
    for (const r of seq) {
      const desired = r.items.map((item) => {
        if (item.cable) return cableX.get(item.cable)!
        const ns = nbr.get(item.id) ?? []
        const tw = ns.reduce((s, n) => s + n.w, 0)
        return tw ? ns.reduce((s, n) => s + n.w * itemOf.get(n.id)!.x, 0) / tw : item.x
      })
      placeRow(r.items, desired)
    }
  }

  // Straighten: each cable, longest first, moves to one x if that x fits between its neighbors in every row it crosses.
  const fits = (it: Item, x: number) => {
    const r = rows[rowOf.get(it.id)!], i = r.items.indexOf(it)
    const p = r.items[i - 1], n = r.items[i + 1]
    return (!p || p.x + p.w / 2 + p.labelW + SEP / 2 + it.w / 2 <= x) && (!n || x + it.w / 2 + it.labelW + SEP / 2 + n.w / 2 <= n.x)
  }
  for (const [ck, c] of [...cables].sort((p, q) => (q[1].to - q[1].from) - (p[1].to - p[1].from) || (canon(p[1].lower) + p[1].kind < canon(q[1].lower) + q[1].kind ? -1 : 1))) {
    const ds: Item[] = []
    for (let r = c.from; r <= c.to; r++) ds.push(itemOf.get(`~${ck}~${r}`)!)
    const cands = [...ds.map((d) => d.x), itemOf.get(c.lower)!.x].sort((a, b) => a - b)
    const median = cands[Math.floor(cands.length / 2)]
    const ok = cands.filter((x) => ds.every((d) => fits(d, x))).sort((a, b) => Math.abs(a - median) - Math.abs(b - median) || a - b)
    if (ok.length) { for (const d of ds) d.x = ok[0]; continue }
    // Otherwise keep it straight in runs, jogging only where a row forces it.
    for (let i = 1; i < ds.length; i++) if (fits(ds[i], ds[i - 1].x)) ds[i].x = ds[i - 1].x
    for (let i = ds.length - 2; i >= 0; i--) if (fits(ds[i], ds[i + 1].x)) ds[i].x = ds[i + 1].x
  }

  // Returns go around the outside: the nearer side, longer returns farther out.
  const allX = rows.flatMap((r) => r.items.flatMap((it) => [it.x - it.w / 2, it.x + it.w / 2 + it.labelW]))
  const minX0 = Math.min(...allX), maxX0 = Math.max(...allX), mid = (minX0 + maxX0) / 2
  const rets = routes.filter((r) => r.kind === 'return').map((rt) => {
    const lo = rowOf.get(rt.lower)!, up = rowOf.get(rt.upper)!
    const side: 'L' | 'R' = (itemOf.get(rt.lower)!.x + itemOf.get(rt.upper)!.x) / 2 <= mid ? 'L' : 'R'
    return { rt, lo, up, side, lane: 0, tTop: 0, tBot: 0 }
  }).sort((a, b) => (a.lo - a.up) - (b.lo - b.up) || a.up - b.up || (canon(a.rt.arc.state) + canon(a.rt.arc.verb) < canon(b.rt.arc.state) + canon(b.rt.arc.verb) ? -1 : 1))
  const lanesUsed: Record<string, [number, number][][]> = { L: [], R: [] }
  for (const t of rets) {
    const lanes = lanesUsed[t.side]
    let k = 0
    while (lanes[k] && lanes[k].some(([a, b]) => !(t.lo < a || t.up > b))) k++
    if (!lanes[k]) lanes[k] = []
    lanes[k].push([t.up, t.lo]); t.lane = k
  }
  // Tracks: a corridor c lies below row c. Top runs hug the upper row, bottom runs hug the lower row; outer lanes hug closest.
  const corr: { top: typeof rets; bot: typeof rets }[] = rows.map(() => ({ top: [], bot: [] }))
  for (const t of rets) { corr[t.up].top.push(t); corr[t.lo - 1].bot.push(t) }
  const nTracks = corr.map((c) => {
    c.top.sort((a, b) => b.lane - a.lane || (a.side < b.side ? -1 : 1)).forEach((t, i) => (t.tTop = i))
    c.bot.sort((a, b) => b.lane - a.lane || (a.side < b.side ? -1 : 1)).forEach((t, i) => (t.tBot = i))
    return c.top.length + c.bot.length
  })
  const nL = lanesUsed.L.length, nR = lanesUsed.R.length

  // Vertical positions.
  const TAG = without.has('row-tag') ? 0 : 74
  const left = 16 + TAG + nL * LANE + (nL ? 10 : 0)
  const shift = left - minX0
  for (const r of rows) for (const it of r.items) it.x += shift
  let y = 24
  const corrTop: number[] = []
  rows.forEach((r, i) => {
    r.y = y + r.h / 2
    y += r.h
    corrTop[i] = y
    y += CORRIDOR + nTracks[i] * TRACK
  })
  const H = y - CORRIDOR + 24
  const maxX = maxX0 + shift
  const W = maxX + 10 + nR * LANE + (nR ? 10 : 0) + 16
  const laneX = (side: 'L' | 'R', k: number) => (side === 'L' ? left - 10 - k * LANE : maxX + 10 + k * LANE)
  const trackY = (t: (typeof rets)[number], end: 'top' | 'bot') => {
    const c = end === 'top' ? t.up : t.lo - 1
    const top = corrTop[c] + 10, bottom = corrTop[c] + CORRIDOR + nTracks[c] * TRACK - 10
    return end === 'top' ? top + t.tTop * TRACK : bottom - t.tBot * TRACK
  }

  // Attachment points: arcs meet a bar spread across it, in the order of their far ends.
  const attach = new Map<string, Pt>()
  const farX = (rt: Route, end: string) => {
    if (rt.kind === 'return') return null
    const other = end === rt.upper ? rt.lower : rt.upper
    if (rt.kind === 'cable') return end === rt.upper ? itemOf.get(`~${rt.cable}~${rowOf.get(rt.upper)! + 1}`)!.x : itemOf.get(`~${rt.cable}~${cables.get(rt.cable!)!.to}`)!.x
    return itemOf.get(other)!.x
  }
  for (const v of net.verbs) {
    const it = itemOf.get(v.id)!, r = rows[rowOf.get(v.id)!]
    for (const sideY of ['top', 'bot'] as const) {
      const mine = routes.filter((rt) => (rt.upper === v.id && sideY === 'bot' && rt.kind !== 'return') || (rt.lower === v.id && sideY === 'top' && rt.kind !== 'return')
        || (rt.kind === 'return' && ((rt.lower === v.id && sideY === 'top') || (rt.upper === v.id && sideY === 'bot'))))
      const keyed = mine.map((rt) => {
        let fx = farX(rt, v.id)
        if (fx === null) { const t = rets.find((q) => q.rt === rt)!; fx = t.side === 'L' ? -1e6 + t.lane : 1e6 - t.lane }
        return { rt, fx }
      }).sort((a, b) => a.fx - b.fx || (arcKey(a.rt.arc) < arcKey(b.rt.arc) ? -1 : 1))
      // Cabled arcs into the same placeholder share one point.
      const groups: { rts: Route[]; fx: number }[] = []
      for (const k of keyed) { const last = groups[groups.length - 1]; if (last && last.fx === k.fx && k.rt.kind === 'cable' && last.rts[0].kind === 'cable') last.rts.push(k.rt); else groups.push({ rts: [k.rt], fx: k.fx }) }
      groups.forEach((g, i) => {
        const x = it.x - it.w / 2 + (it.w * (i + 1)) / (groups.length + 1)
        for (const rt of g.rts) attach.set(arcKey(rt.arc) + '@' + v.id, { x, y: r.y + (sideY === 'top' ? -BAR_H / 2 : BAR_H / 2) })
      })
    }
  }
  const anchor = (rt: Route, id: string, end: 'top' | 'bot'): Pt => {
    const it = itemOf.get(id)!, r = rows[rowOf.get(id)!]
    if (it.verb) return attach.get(arcKey(rt.arc) + '@' + id)!
    return { x: it.x, y: r.y + (end === 'top' ? -it.h / 2 : it.h / 2) }
  }

  // Geometry of each arc, drawn upper end to lower end, then flipped to state end first for the layout.
  const bez = (a: Pt, b: Pt, n = 8): Pt[] => {
    const m = (b.y - a.y) / 2, out: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t
      out.push({ x: u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * (a.y + m) + 3 * u * t * t * (b.y - m) + t * t * t * b.y })
    }
    return out
  }
  const pathOf = (pts: Pt[]) => 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')
  const arcs: Record<string, Pt[]> = {}
  const svgArcs: string[] = []
  const svgCounts: string[] = []
  const marker = (a: Arc) => (a.kind === 'take' ? 'url(#hv)' : a.kind === 'give' ? 'url(#hs)' : '')
  const styleOf = (a: Arc) => {
    const test = (a.kind === 'need' && !without.has('test-arc')) || (a.kind === 'unless' && !without.has('unless-arc'))
    return `fill="none" stroke="#555" stroke-width="1.2"${test ? ' stroke-dasharray="4 3"' : ''}`
  }
  for (const rt of routes) {
    const a = rt.arc
    let down: Pt[] = []
    let d = ''
    if (rt.kind === 'direct') { down = bez(anchor(rt, rt.upper, 'bot'), anchor(rt, rt.lower, 'top')); d = pathOf(down) }
    else if (rt.kind === 'cable') {
      const c = cables.get(rt.cable!)!
      const pts: Pt[] = [anchor(rt, rt.upper, 'bot')]
      const chain: Pt[] = []
      for (let r = rowOf.get(rt.upper)! + 1; r <= c.to; r++) { const it = itemOf.get(`~${rt.cable}~${r}`)!; chain.push({ x: it.x, y: rows[r].y - rows[r].h / 2 }, { x: it.x, y: rows[r].y + rows[r].h / 2 }) }
      chain.push(anchor(rt, rt.lower, 'top'))
      down = [...bez(pts[0], chain[0])]
      for (let i = 1; i < chain.length; i++) down.push(...(i % 2 === 1 ? [chain[i]] : bez(chain[i - 1], chain[i]).slice(1)))
      d = pathOf(down)
    } else {
      const t = rets.find((q) => q.rt === rt)!
      const lx = laneX(t.side, t.lane), yb = trackY(t, 'bot'), yt = trackY(t, 'top')
      const pl = anchor(rt, rt.lower, 'top'), pu = anchor(rt, rt.upper, 'bot')
      down = [pu, { x: pu.x, y: yt }, { x: lx, y: yt }, { x: lx, y: yb }, { x: pl.x, y: yb }, pl]
      const rr = 6, sx = t.side === 'L' ? -1 : 1
      const dirU = Math.sign(lx - pu.x), dirL = Math.sign(pl.x - lx)
      d = `M${pu.x.toFixed(1)},${pu.y.toFixed(1)}L${pu.x.toFixed(1)},${(yt - rr).toFixed(1)}Q${pu.x.toFixed(1)},${yt.toFixed(1)} ${(pu.x + dirU * rr).toFixed(1)},${yt.toFixed(1)}`
        + `L${(lx - sx * rr).toFixed(1)},${yt.toFixed(1)}Q${lx.toFixed(1)},${yt.toFixed(1)} ${lx.toFixed(1)},${(yt + rr).toFixed(1)}L${lx.toFixed(1)},${(yb - rr).toFixed(1)}`
        + `Q${lx.toFixed(1)},${yb.toFixed(1)} ${(lx + dirL * rr).toFixed(1)},${yb.toFixed(1)}L${(pl.x - dirL * rr).toFixed(1)},${yb.toFixed(1)}Q${pl.x.toFixed(1)},${yb.toFixed(1)} ${pl.x.toFixed(1)},${(yb + rr).toFixed(1)}L${pl.x.toFixed(1)},${pl.y.toFixed(1)}`
    }
    const stateIsUpper = rt.upper === a.state
    arcs[arcKey(a)] = stateIsUpper ? down : [...down].reverse()
    // Markers sit at the arc's end in path direction; the path runs upper to lower, so flip markers for arcs that flow up.
    const towardVerb = a.kind !== 'give'
    const endAtLower = towardVerb ? stateIsUpper : !stateIsUpper
    const mk = marker(a)
    const unlessDot = a.kind === 'unless' && !without.has('unless-arc')
    const verbEnd = stateIsUpper ? down[down.length - 1] : down[0]
    svgArcs.push(`<path d="${d}" ${styleOf(a)}${mk ? (endAtLower ? ` marker-end="${mk}"` : ` marker-start="${mk.replace(')', 'r)')}"`) : ''}/>`)
    if (unlessDot) svgArcs.push(`<circle cx="${verbEnd.x.toFixed(1)}" cy="${(verbEnd.y + (stateIsUpper ? -4 : 4)).toFixed(1)}" r="3.5" fill="#fff" stroke="#555" stroke-width="1.2"/>`)
    if (a.count > 1 && !without.has('count')) {
      const seg = rt.kind === 'return' ? [down[1], down[2]] : [down[0], down[Math.min(4, down.length - 1)]]
      const p = rt.kind === 'return' ? { x: (seg[0].x + seg[1].x) / 2, y: seg[0].y - 3 } : { x: (seg[0].x + seg[1].x) / 2 + 5, y: (seg[0].y + seg[1].y) / 2 + 4 }
      svgCounts.push(`<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" font-size="10" font-weight="700" fill="#222" paint-order="stroke" stroke="#fff" stroke-width="3">${a.count}</text>`)
    }
  }

  // Nodes.
  const nodes: Record<string, Box> = {}
  const svgNodes: string[] = []
  for (const r of rows) for (const it of r.items) {
    if (it.cable) continue
    const lw = without.has(it.verb ? 'verb-label' : 'state-label') ? 0 : it.labelW
    nodes[it.id] = { x: it.x - it.w / 2 + (it.w + lw) / 2, y: r.y, w: it.w + lw, h: Math.max(it.h, 12) }
    if (it.state) {
      const s = it.state
      const hidden = s.seenBy !== 'all' && !without.has('hidden-ring')
      svgNodes.push(`<circle cx="${it.x.toFixed(1)}" cy="${r.y}" r="${R}" fill="#fff" stroke="#222" stroke-width="1.4"${hidden ? ' stroke-dasharray="3 2"' : ''}/>`)
      if (s.ends && !without.has('outcome-ring')) svgNodes.push(`<circle cx="${it.x.toFixed(1)}" cy="${r.y}" r="${R - 3}" fill="none" stroke="#222" stroke-width="1"/>`)
      if (!without.has('mark')) {
        if (s.marks === 1) svgNodes.push(`<circle cx="${it.x.toFixed(1)}" cy="${r.y}" r="3.2" fill="#222"/>`)
        else if (s.marks > 1) svgNodes.push(`<text x="${it.x.toFixed(1)}" y="${r.y + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="#222">${s.marks}</text>`)
      }
      if (lw) svgNodes.push(`<text x="${(it.x + R + 5).toFixed(1)}" y="${r.y + 4}" font-size="${FONT}" fill="#222"${s.ends ? ' font-weight="700"' : ''}>${esc(s.ends ?? s.label)}</text>`)
    } else if (it.verb) {
      const v = it.verb
      const fill = v.by === 'world' || without.has('seat-bar') ? '#222' : seatColor.get(v.by) ?? '#888'
      svgNodes.push(`<rect x="${(it.x - it.w / 2).toFixed(1)}" y="${r.y - BAR_H / 2}" width="${it.w}" height="${BAR_H}" fill="${fill}"/>`)
      if (lw) {
        svgNodes.push(`<text x="${(it.x + it.w / 2 + 5).toFixed(1)}" y="${r.y + 4}" font-size="${FONT}" fill="#222">${esc(v.label)}</text>`)
        if (v.weight > 1) svgNodes.push(`<text x="${(it.x + it.w / 2 + 5 + textW(v.label) + 8).toFixed(1)}" y="${r.y + 4}" font-size="10" fill="#666">w${v.weight}</text>`)
      }
    }
  }

  // Row tags: who may speak in this band, and the world's priority.
  const svgTags: string[] = []
  if (!without.has('row-tag')) for (const r of rows) {
    if (r.kind === 'band') {
      const isSeat = hasSeat && r.band === 0
      if (isSeat) {
        const seats = net.seats.filter((s) => net.verbs.some((v) => v.by === s.id))
        seats.forEach((s, i) => svgTags.push(`<text x="16" y="${r.y + 4 + (i - (seats.length - 1) / 2) * 12}" font-size="10" font-weight="700" fill="${s.color}">${esc(s.name)}</text>`))
      } else {
        const p = prios[(r.band ?? 0) - (hasSeat ? 1 : 0)]
        svgTags.push(`<text x="16" y="${r.y + 4}" font-size="10" fill="#444"><tspan font-weight="700">world</tspan> ${p}</text>`)
      }
    } else if (r.kind === 'ends') svgTags.push(`<text x="16" y="${r.y + 4}" font-size="10" font-weight="700" fill="#444">ends</text>`)
  }

  const defs = `<defs>`
    + `<marker id="hv" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="#555"/></marker>`
    + `<marker id="hvr" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M8,0L0,4L8,8z" fill="#555"/></marker>`
    + `<marker id="hs" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="#555"/></marker>`
    + `<marker id="hsr" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M8,0L0,4L8,8z" fill="#555"/></marker></defs>`
  const width = Math.ceil(W), height = Math.ceil(H)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif">${defs}<rect width="100%" height="100%" fill="#fff"/>`
    + svgTags.join('') + svgArcs.join('') + svgNodes.join('') + svgCounts.join('') + `</svg>`
  return { svg, width, height, layout: { nodes, arcs } }
}

export const design: Design = {
  id: 'exchange',
  title: 'Exchange: one turn of the conversation, top to bottom',
  idea: 'Down the page is one exchange. The seats speak in the top row; below them the world answers, one row per priority, highest first, until it falls silent and the seats speak again. States sit in the gaps between the rows that write them and the rows that read them, so most arcs run downward in the order the conversation happens, and anything that flows back up to an earlier moment sweeps around the outside.',
  rules: [
    'Draw one row for the seats’ verbs at the top. Below it draw one row per world priority, highest first. Tag each row at the left with who speaks: the seat names, or "world" and the priority.',
    'Draw each verb as a thin horizontal bar in its row, seat verbs in the seat’s color and world verbs black, with the label to the right. Add "w" and the weight when the weight is above 1.',
    'Put every outcome state in one last row at the bottom, tagged "ends", drawn as a double ring with its result as the label.',
    'Put every other state in the gap between two verb rows (or above the top row, or below the last) where the most of its arcs point downward. If several gaps tie, take the one that keeps its arcs shortest, then the higher one.',
    'Draw each state as a circle with its label to the right: a dot for one starting mark, the number for more. Dash the circle if not every seat sees it.',
    'Order each row so arcs to the rows above and below cross as little as possible, then slide each node toward the average position of the nodes it connects to, keeping its order.',
    'Join a state and a verb in neighboring rows with a smooth curve from the bottom of the upper one to the top of the lower one.',
    'When an arc runs down past rows in between, give it its own slot in each of those rows and pass straight through it. Arcs that end at the same node with the same kind share one slot.',
    'When an arc runs up past rows in between, take it around the outside: up out of the lower node, out to the nearer margin, up the margin, and in under the upper node. Longer returns go farther out.',
    'Take and give are solid arrows pointing the way the mark moves. Need is dashed with no arrowhead. Unless is dashed with an open circle at the verb.',
    'Spread the arcs that meet a bar across its width, in the order of their other ends. Print any count above 1 beside its arc.',
  ],
  elements: [
    { id: 'row-tag', what: 'Left-margin tag on each verb row: the seat names in their colors, or "world" and the priority; "ends" on the outcome row.', purpose: 'Says who may speak at each moment of the exchange and in what order the world answers, which is the vertical meaning of the drawing.', serves: ['conversation', 'actionable'] },
    { id: 'seat-bar', what: 'Thin horizontal bar in the seat color for a seat verb.', purpose: 'Who speaks the verb, at the verb itself.', serves: ['conversation', 'contact'] },
    { id: 'world-bar', what: 'Thin black bar for a world verb.', purpose: 'The world answering, distinct from any seat.', serves: ['conversation'] },
    { id: 'verb-label', what: 'Verb label beside its bar, with "w" and the weight for chance ties.', purpose: 'Names the verb for comparing by name; the weight gives the odds of a chance tie.', serves: ['compare-name', 'counts', 'possibility'] },
    { id: 'state-ring', what: 'Circle for a state.', purpose: 'Where a mark can rest; distinct from verbs as in any Petri figure.', serves: ['entity', 'possibility'] },
    { id: 'state-label', what: 'State label beside its ring.', purpose: 'Names the state for comparing by name and reading the design.', serves: ['compare-name', 'actionable'] },
    { id: 'mark', what: 'A dot for one starting mark, the number for more.', purpose: 'Shows the opening moment and starting counts.', serves: ['counts', 'possibility', 'entity'] },
    { id: 'outcome-ring', what: 'Double ring with a bold result label, in the bottom "ends" row.', purpose: 'Where the conversation stops; everything above flows toward it.', serves: ['possibility', 'actionable'] },
    { id: 'hidden-ring', what: 'Dashed ring for a state not every seat sees.', purpose: 'Hidden information changes what a seat can listen to.', serves: ['conversation', 'content'] },
    { id: 'move-arc', what: 'Solid arrow for take (state to verb) and give (verb to state).', purpose: 'The marks the verb moves: what it consumes and what it produces.', serves: ['possibility', 'entity', 'loop'] },
    { id: 'test-arc', what: 'Dashed line without arrowhead for need.', purpose: 'A condition that moves nothing, so contact and content conditions read apart from capability moves.', serves: ['contact', 'content'] },
    { id: 'unless-arc', what: 'Dashed line with an open circle at the verb for unless.', purpose: 'What closes a verb.', serves: ['possibility', 'content'] },
    { id: 'count', what: 'Bold number beside an arc whose count is above 1.', purpose: 'Counts and costs are on the map.', serves: ['counts', 'actionable'] },
    { id: 'return-sweep', what: 'An arc flowing up past other rows routed out to the margin and back in.', purpose: 'A mark carried to an earlier moment of the next exchange is a return; sweeping it around the outside keeps it off the downward flow and makes feedback loops visible as loops around the figure.', serves: ['loop', 'readable', 'conversation'] },
  ],
  axes: {
    x: 'none; order within a row minimizes crossings',
    y: 'the moment in one exchange: seats, then world by priority, then outcomes',
    placement: 'verb row from speaker and priority; state gap where most of its arcs point down',
    verb: 'thin horizontal bar, label to the right',
    speaker: 'bar color plus a row tag; one row for all seats, one row per world priority',
    entity: 'not grouped; states fall in the gap their arcs choose',
    routing: 'downward through reserved slots; upward around the outside margins',
    unit: 'one net',
  },
  draw,
}
