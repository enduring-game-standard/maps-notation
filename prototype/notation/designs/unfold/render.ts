// PROTOTYPE. The `unfold` convention: x is when a verb first becomes sayable, y is which entity it moves.
import { compile, fire, whoseTurn } from '../../../../studio/src/core/engine'
import { WORLD, initialMarking, type Marking, type Net } from '../../../../studio/src/core/model'
import type { Box, Design, Drawing, Element, Pt } from '../../harness/contract'
import { arcKey } from '../../harness/contract'

/** Exploration stops after this many distinct markings, or this many exchanges. Tic-tac-toe needs about 16,000. */
const CAP_MARKINGS = 60_000
const CAP_EXCHANGES = 40
const STEP = 1000
const UNREACHED = Number.POSITIVE_INFINITY
const INITIAL = -1

// ---------------------------------------------------------------- exploration

interface Unfolding {
  /** earliest time each verb is said, as exchange * STEP + world step; UNREACHED if never within the cap */
  verbT: Map<string, number>
  /** earliest time each state holds a mark; INITIAL for starting marks */
  stateT: Map<string, number>
  samples: Marking[]
  complete: boolean
  exchanges: number
}

function unfold(net: Net): Unfolding {
  const c = compile(net)
  const ids = net.states.map((s) => s.id).sort()
  const key = (m: Marking) => ids.map((id) => m[id] ?? 0).join(',')
  const verbT = new Map<string, number>()
  const stateT = new Map<string, number>()
  for (const s of net.states) if (s.marks > 0) stateT.set(s.id, INITIAL)
  const seen = new Set<string>()
  const samples: Marking[] = []
  let complete = true
  const said = (verb: string, t: number) => {
    if (!verbT.has(verb)) verbT.set(verb, t)
    for (const o of c.outputs.get(verb)!) if (!stateT.has(o.state)) stateT.set(o.state, t)
  }
  const settle = (front: Marking[], e: number): Marking[] => {
    const resting: Marking[] = []
    for (let s = 1; front.length; s++) {
      const next: Marking[] = []
      for (const m of front) {
        const k = key(m)
        if (seen.has(k)) continue
        if (seen.size >= CAP_MARKINGS) { complete = false; return resting }
        seen.add(k)
        samples.push(m)
        const turn = whoseTurn(c, m)
        if (turn.kind === 'world') for (const b of turn.branches) { said(b.verb.id, e * STEP + s); next.push(fire(c, m, b.verb.id)) }
        else if (turn.kind === 'seats') resting.push(m)
      }
      front = next
      if (s >= STEP - 1) break
    }
    return resting
  }
  let resting = settle([initialMarking(net)], 0)
  let e = 0
  while (resting.length && complete) {
    if (++e > CAP_EXCHANGES) { complete = false; break }
    const front: Marking[] = []
    for (const m of resting) {
      const turn = whoseTurn(c, m)
      if (turn.kind !== 'seats') continue
      for (const verbs of turn.choices.values()) for (const v of verbs) { said(v.id, e * STEP); front.push(fire(c, m, v.id)) }
    }
    resting = settle(front, e)
  }
  return { verbT, stateT, samples, complete, exchanges: e }
}

// ---------------------------------------------------------------- canonical order (structure only, never names or file order)

const fnv = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(36) }

function signatures(net: Net, U: Unfolding) {
  const sig = new Map<string, string>()
  for (const s of net.states) sig.set(s.id, `s|${s.marks}|${s.ends !== undefined}|${s.seenBy === 'all' ? 'all' : [...s.seenBy].sort().join(',')}|${U.stateT.get(s.id) ?? 'n'}`)
  for (const v of net.verbs) sig.set(v.id, `v|${v.by}|${v.priority}|${v.weight}|${U.verbT.get(v.id) ?? 'n'}`)
  for (let round = 0; round < 5; round++) {
    const nb = new Map<string, string[]>([...sig.keys()].map((k) => [k, []]))
    for (const a of net.arcs) {
      nb.get(a.state)!.push(`${a.kind}${a.count}>${sig.get(a.verb)}`)
      nb.get(a.verb)!.push(`${a.kind}${a.count}<${sig.get(a.state)}`)
    }
    for (const [k, v] of sig) sig.set(k, fnv(v + '#' + nb.get(k)!.sort().join(';')))
  }
  return sig
}

// ---------------------------------------------------------------- entities: states of which exactly one is always marked

function findEntities(net: Net, U: Unfolding, cmp: (a: string, b: string) => number): string[][] {
  const n = U.samples.length
  const words = Math.ceil(n / 32)
  const bits = new Map<string, Uint32Array>()
  const oneBounded = net.states.filter((s) => U.samples.every((m) => (m[s.id] ?? 0) <= 1)).map((s) => s.id).sort(cmp)
  for (const id of oneBounded) {
    const b = new Uint32Array(words)
    U.samples.forEach((m, i) => { if ((m[id] ?? 0) === 1) b[i >> 5] |= 1 << (i & 31) })
    bits.set(id, b)
  }
  const disjoint = (a: Uint32Array, b: Uint32Array) => a.every((w, i) => (w & b[i]) === 0)
  const full = new Uint32Array(words); for (let i = 0; i < n; i++) full[i >> 5] |= 1 << (i & 31)
  const taken = new Set<string>()
  const out: string[][] = []
  const seeds = oneBounded.filter((id) => net.states.find((s) => s.id === id)!.marks === 1)
  for (const seed of seeds) {
    if (taken.has(seed)) continue
    const cands = oneBounded.filter((id) => id !== seed && !taken.has(id) && disjoint(bits.get(id)!, bits.get(seed)!) && U.stateT.get(id) !== undefined)
    let budget = 20_000
    const search = (chosen: string[], cover: Uint32Array): string[] | null => {
      if (--budget < 0) return null
      let first = -1
      for (let w = 0; w < words && first < 0; w++) { const gap = full[w] & ~cover[w]; if (gap) first = w * 32 + (31 - Math.clz32(gap & -gap)) }
      if (first < 0) return chosen
      for (const id of cands) {
        const b = bits.get(id)!
        if (!(b[first >> 5] & (1 << (first & 31))) || !disjoint(b, cover)) continue
        const r = search([...chosen, id], cover.map((w, i) => w | b[i]))
        if (r) return r
      }
      return null
    }
    const found = search([seed], bits.get(seed)!.slice())
    if (found && found.length > 1) { out.push(found.sort(cmp)); found.forEach((id) => taken.add(id)) }
  }
  return out
}

// ---------------------------------------------------------------- the drawing

interface Node { id: string; kind: 'state' | 'verb'; col: number; band: number; lane: number; lanes: number; w: number; h: number; above: number; below: number; x: number; y: number; ord: number; lines: string[] }

const FONT = 9.5, CH = 5.3, LINE = 11
const R = 8, BAR_W = 5, PORT = 7
const TRACK = 6, GAP_PAD = 8, CH_PAD = 8, RULER = 30, MARGIN = 14

const wrap = (s: string, max = 15) => {
  const out: string[] = []; let cur = ''
  for (const w of s.split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w }
  if (cur) out.push(cur)
  return out
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function roundCorners(pts: Pt[], r = 5): Pt[] {
  const clean = pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.01)
  if (clean.length < 3) return clean
  const out: Pt[] = [clean[0]]
  for (let i = 1; i < clean.length - 1; i++) {
    const a = clean[i - 1], b = clean[i], c = clean[i + 1]
    const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y)
    const rr = Math.min(r, l1 / 2, l2 / 2)
    const p = { x: b.x + ((a.x - b.x) / l1) * rr, y: b.y + ((a.y - b.y) / l1) * rr }
    const q = { x: b.x + ((c.x - b.x) / l2) * rr, y: b.y + ((c.y - b.y) / l2) * rr }
    for (let t = 0; t <= 1.001; t += 0.25) out.push({ x: (1 - t) ** 2 * p.x + 2 * (1 - t) * t * b.x + t * t * q.x, y: (1 - t) ** 2 * p.y + 2 * (1 - t) * t * b.y + t * t * q.y })
  }
  out.push(clean[clean.length - 1])
  return out.map((p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 }))
}

function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const off = new Set(opts?.without ?? [])
  const U = unfold(net)
  const sig = signatures(net, U)
  const cmp = (a: string, b: string) => (sig.get(a)! < sig.get(b)! ? -1 : sig.get(a)! > sig.get(b)! ? 1 : a < b ? -1 : a > b ? 1 : 0)
  const stateOf = new Map(net.states.map((s) => [s.id, s]))
  const verbOf = new Map(net.verbs.map((v) => [v.id, v]))
  const arcsOfVerb = new Map(net.verbs.map((v) => [v.id, net.arcs.filter((a) => a.verb === v.id)]))
  const arcsOfState = new Map(net.states.map((s) => [s.id, net.arcs.filter((a) => a.state === s.id)]))

  // time -> column. Each verb time gets a verb column, followed by a column for the states it first marks.
  const vt = (id: string) => U.verbT.get(id) ?? UNREACHED
  const st = (id: string) => {
    if (U.stateT.has(id)) return U.stateT.get(id)!
    return arcsOfState.get(id)!.some((a) => a.kind === 'give') ? UNREACHED : INITIAL
  }
  const times = [...new Set(net.verbs.map((v) => vt(v.id)))].sort((a, b) => a - b)
  const stateTimes = new Set(net.states.map((s) => st(s.id)))
  const cols: { t: number; kind: 'state' | 'verb' }[] = []
  if (stateTimes.has(INITIAL)) cols.push({ t: INITIAL, kind: 'state' })
  for (const t of times) { cols.push({ t, kind: 'verb' }); if (stateTimes.has(t)) cols.push({ t, kind: 'state' }) }
  const colOf = (kind: 'state' | 'verb', t: number) => cols.findIndex((c) => c.kind === kind && c.t === t)

  // entities -> bands
  const ents = findEntities(net, U, cmp)
  const entOfState = new Map<string, number>()
  ents.forEach((e, i) => e.forEach((s) => entOfState.set(s, i)))
  const verbEnt = new Map<string, number>()
  for (const v of [...net.verbs].map((v) => v.id).sort(cmp)) {
    const moved = [...new Set(arcsOfVerb.get(v)!.filter((a) => a.kind === 'take' || a.kind === 'give').map((a) => entOfState.get(a.state)).filter((x) => x !== undefined))] as number[]
    if (moved.length) verbEnt.set(v, moved.sort((a, b) => ents[a].length - ents[b].length || a - b)[0])
  }
  const firstMove = (i: number) => Math.min(...[...verbEnt].filter(([, e]) => e === i).map(([v]) => vt(v)), UNREACHED)
  const coupling = (i: number) => net.arcs.filter((a) => (entOfState.get(a.state) === i) !== (verbEnt.get(a.verb) === i)).length
  const order = ents.map((_, i) => i).sort((a, b) => firstMove(a) - firstMove(b) || coupling(b) - coupling(a) || ents[b].length - ents[a].length || cmp(ents[a][0], ents[b][0]))
  const arranged: number[] = []
  order.forEach((e, i) => (i % 2 ? arranged.unshift(e) : arranged.push(e)))
  const entRow = new Map(arranged.map((e, r) => [e, r]))

  // rows: entity rows at even slots 2r+1, shared rows in the gaps at even slots 2g
  const slot = new Map<string, number>()
  for (const [s, e] of entOfState) slot.set(s, 2 * entRow.get(e)! + 1)
  for (const [v, e] of verbEnt) slot.set(v, 2 * entRow.get(e)! + 1)
  const nbrs = (id: string) => (stateOf.has(id) ? arcsOfState.get(id)!.map((a) => a.verb) : arcsOfVerb.get(id)!.map((a) => a.state))
  const loose = [...net.states.map((s) => s.id), ...net.verbs.map((v) => v.id)].filter((id) => !slot.has(id)).sort(cmp)
  const aff = new Map<string, number>()
  for (let round = 0; round < 4; round++) for (const id of loose) {
    const ys = nbrs(id).map((n) => slot.get(n) ?? aff.get(n)).filter((y) => y !== undefined) as number[]
    if (ys.length) aff.set(id, ys.reduce((s, y) => s + y, 0) / ys.length)
  }
  for (const id of loose) {
    const ns = nbrs(id)
    const own = [...new Set(ns.map((n) => slot.get(n)))]
    if (stateOf.has(id) && ns.length && own.length === 1 && own[0] !== undefined) { slot.set(id, own[0]); continue }
    const a = aff.get(id) ?? 2 * arranged.length
    slot.set(id, Math.min(2 * arranged.length, Math.max(0, 2 * Math.floor((a + 1) / 2))))
  }
  const usedSlots = [...new Set(slot.values())].sort((a, b) => a - b)
  const bandOf = (id: string) => usedSlots.indexOf(slot.get(id)!)
  const B = usedSlots.length

  // nodes, with lanes inside each (band, column) cell ordered by where their placed neighbors sit
  const nodes = new Map<string, Node>()
  const mk = (id: string, kind: 'state' | 'verb'): Node => {
    const label = kind === 'state' ? stateOf.get(id)!.label : verbOf.get(id)!.label
    const lines = off.has('labels') ? [] : wrap(label)
    const extra = kind === 'state' ? (stateOf.get(id)!.ends !== undefined && !off.has('labels') ? 1 : 0) + (stateOf.get(id)!.seenBy !== 'all' ? 1 : 0) : 0
    if (kind === 'state') return { id, kind, col: colOf('state', st(id)), band: bandOf(id), lane: 0, lanes: 1, w: 2 * R, h: 2 * R, above: R + 2, below: R + 3 + (lines.length + extra) * LINE, x: 0, y: 0, ord: 0, lines }
    const ins = arcsOfVerb.get(id)!.filter((a) => a.kind !== 'give').length
    const h = Math.max(18, PORT * (ins + 1))
    const v = verbOf.get(id)!
    const meta = v.by === WORLD && !off.has('priority') ? 1 : 0
    return { id, kind, col: colOf('verb', vt(id)), band: bandOf(id), lane: 0, lanes: 1, w: BAR_W, h, above: h / 2 + 3 + lines.length * LINE, below: h / 2 + 3 + meta * LINE, x: 0, y: 0, ord: 0, lines }
  }
  for (const s of net.states) nodes.set(s.id, mk(s.id, 'state'))
  for (const v of net.verbs) nodes.set(v.id, mk(v.id, 'verb'))
  const cells = new Map<string, Node[]>()
  for (const n of nodes.values()) { const k = `${n.band}|${n.col}`; cells.set(k, [...(cells.get(k) ?? []), n]) }
  const placed = new Set<string>()
  for (let pass = 0; pass < 3; pass++) {
    const colOrder = cols.map((_, i) => i)
    for (const c of pass === 1 ? colOrder.reverse() : colOrder) for (let b = 0; b < B; b++) {
      const cell = cells.get(`${b}|${c}`)
      if (!cell) continue
      const bary = (n: Node) => {
        const ys = nbrs(n.id).map((m) => nodes.get(m)!).filter((m) => placed.has(m.id) && m.col !== n.col).map((m) => m.ord)
        return ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : n.band * 100
      }
      const bs = new Map(cell.map((n) => [n.id, bary(n)]))
      cell.sort((p, q) => bs.get(p.id)! - bs.get(q.id)! || cmp(p.id, q.id))
      cell.forEach((n, i) => { n.lane = i; n.lanes = cell.length; n.ord = n.band * 100 + (i - (cell.length - 1) / 2) * (40 / cell.length); placed.add(n.id) })
    }
  }

  // arcs: each runs from its source's right side to its target's left side
  type Route = { key: string; src: Node; tgt: Node; kind: string; count: number; port: number; ins: number }
  const routes: Route[] = []
  for (const a of net.arcs) {
    const s = nodes.get(a.state)!, v = nodes.get(a.verb)!
    routes.push({ key: arcKey(a), src: a.kind === 'give' ? v : s, tgt: a.kind === 'give' ? s : v, kind: a.kind, count: a.count, port: 0, ins: 1 })
  }
  for (const v of net.verbs) {
    const ins = routes.filter((r) => r.tgt.id === v.id).sort((p, q) => p.src.ord - q.src.ord || p.src.col - q.src.col || cmp(p.src.id, q.src.id) || p.kind.localeCompare(q.kind))
    ins.forEach((r, i) => { r.port = i; r.ins = ins.length })
  }

  // abstract plan per arc: straight, adjacent (one vertical in a gap), or detour (gap, channel, gap)
  type Plan = { r: Route; type: 'straight' | 'adjacent' | 'run' | 'detour'; g1: number; g2: number; chan: number; side: 0 | 1 }
  const sameLine = (r: Route) => r.src.band === r.tgt.band && Math.abs(r.src.ord - r.tgt.ord) < 1e-6 && r.ins === 1
  const clearBetween = (r: Route) => {
    for (const n of nodes.values()) if (n.band === r.src.band && n.col > r.src.col && n.col < r.tgt.col && Math.abs(n.ord - r.src.ord) < 1e-6) return false
    return true
  }
  const bandPitch = (b: number) => { const ns = [...nodes.values()].filter((n) => n.band === b); return Math.max(...ns.map((n) => n.above)) + Math.max(...ns.map((n) => n.below)) + 8 }
  const yoff = (n: Node) => (n.lane - (n.lanes - 1) / 2) * bandPitch(n.band)
  // a forward arc keeps to its source's line when nothing (node or label) sits on that line before the target column
  const laneClear = (r: Route) => {
    const y = yoff(r.src)
    for (const n of nodes.values()) if (n.band === r.src.band && n.col > r.src.col && n.col < r.tgt.col && y > yoff(n) - n.above - 3 && y < yoff(n) + n.below + 3) return false
    return true
  }
  const plans: Plan[] = routes.map((r) => {
    const fwd = r.tgt.col > r.src.col
    if (fwd && sameLine(r) && clearBetween(r)) return { r, type: 'straight', g1: r.src.col, g2: r.src.col, chan: -1, side: 0 }
    if (r.tgt.col === r.src.col + 1) return { r, type: 'adjacent', g1: r.src.col, g2: r.src.col, chan: -1, side: 0 }
    if (fwd && laneClear(r)) return { r, type: 'run', g1: r.tgt.col - 1, g2: r.tgt.col - 1, chan: -1, side: 0 }
    let chan: number
    // returns sweep around the outside: above for the upper half of the rows, below for the lower half; blocked forward arcs take the inner side
    const outerBelow = r.src.band > (B - 1) / 2
    if (r.src.band === r.tgt.band) chan = fwd !== outerBelow ? r.src.band + 1 : r.src.band
    else chan = r.tgt.band > r.src.band ? r.src.band + 1 : r.src.band
    // side 0: the arc leaves the band above the channel; side 1: the band below
    return { r, type: 'detour', g1: r.src.col, g2: r.tgt.col - 1, chan, side: chan === r.src.band ? 1 : 0 }
  })

  // ordinal coordinates for track assignment: bands at odd values, channels at even
  const oy = (n: Node) => 2 * n.band + 1 + (n.ord - n.band * 100) / 100
  const chanY = (c: number) => 2 * c
  const firstFit = (items: { key: string; lo: number; hi: number }[]) => {
    const merged = new Map<string, { lo: number; hi: number }>()
    for (const it of items) { const m = merged.get(it.key); merged.set(it.key, m ? { lo: Math.min(m.lo, it.lo), hi: Math.max(m.hi, it.hi) } : { lo: it.lo, hi: it.hi }) }
    const list = [...merged].sort((p, q) => p[1].hi - p[1].lo - (q[1].hi - q[1].lo) || p[1].lo - q[1].lo || (p[0] < q[0] ? -1 : 1))
    const tracks: { lo: number; hi: number }[][] = []
    const at = new Map<string, number>()
    for (const [k, iv] of list) {
      let t = tracks.findIndex((tr) => tr.every((o) => iv.hi < o.lo - 1e-9 || iv.lo > o.hi + 1e-9))
      if (t < 0) { t = tracks.length; tracks.push([]) }
      tracks[t].push(iv); at.set(k, t)
    }
    return { at, n: tracks.length }
  }
  const nodeKey = (n: Node) => `${String(n.col).padStart(3, '0')}.${String(n.band).padStart(3, '0')}.${String(n.lane).padStart(3, '0')}`
  // every state has one cable out (its takes, needs, unlesses) and one cable in (its gives), as a single wire until it branches
  const cable = (p: Plan) => (p.r.kind === 'give' ? 'G:' + nodeKey(p.r.tgt) : 'S:' + nodeKey(p.r.src))
  // vertical segments in gaps, keyed by the arc's source so a fan-out shares one trunk
  const gapItems = new Map<number, { key: string; lo: number; hi: number }[]>()
  const pushGap = (g: number, key: string, a: number, b: number) => gapItems.set(g, [...(gapItems.get(g) ?? []), { key, lo: Math.min(a, b), hi: Math.max(a, b) }])
  // horizontal segments in channels, per side
  const chanItems = new Map<string, { key: string; lo: number; hi: number }[]>()
  for (const p of plans) {
    const s = oy(p.r.src), t = oy(p.r.tgt) + (p.r.port - (p.r.ins - 1) / 2) * 1e-4
    if (p.type === 'adjacent' || p.type === 'run') pushGap(p.g1, cable(p), s, t)
    if (p.type === 'detour') {
      const cy = chanY(p.chan)
      pushGap(p.g1, cable(p), s, cy)
      pushGap(p.g2, cable(p), cy, t)
      const k = `${p.chan}|${p.side}`
      chanItems.set(k, [...(chanItems.get(k) ?? []), { key: cable(p), lo: Math.min(p.g1, p.g2), hi: Math.max(p.g1, p.g2) }])
    }
  }
  const gapTracks = new Map([...gapItems].map(([g, items]) => [g, firstFit(items)]))
  const chanTracks = new Map([...chanItems].map(([k, items]) => [k, firstFit(items)]))

  // real coordinates
  const colW = cols.map((_, c) => Math.max(24, ...[...nodes.values()].filter((n) => n.col === c).map((n) => Math.max(n.w, ...n.lines.map((l) => l.length * CH), n.kind === 'verb' ? 30 : 0) + 6)))
  const gapW = (g: number) => 2 * GAP_PAD + Math.max(0, (gapTracks.get(g)?.n ?? 0) - 1) * TRACK
  const colX: number[] = []
  const gapX = new Map<number, number>()
  let x = MARGIN
  gapX.set(-1, x); x += gapW(-1)
  cols.forEach((_, c) => { colX[c] = x + colW[c] / 2; x += colW[c]; gapX.set(c, x); x += gapW(c) })
  const width = x + MARGIN
  const pitch = (b: number) => { const ns = [...nodes.values()].filter((n) => n.band === b); return Math.max(...ns.map((n) => n.above)) + Math.max(...ns.map((n) => n.below)) + 8 }
  const maxAbove = (b: number) => Math.max(...[...nodes.values()].filter((n) => n.band === b).map((n) => n.above))
  const lanesIn = (b: number) => Math.max(...[...nodes.values()].filter((n) => n.band === b).map((n) => n.lanes))
  const chanH = (c: number) => { const a = chanTracks.get(`${c}|0`)?.n ?? 0, b = chanTracks.get(`${c}|1`)?.n ?? 0; return 2 * CH_PAD + Math.max(0, a + b - 1) * TRACK + (a && b ? TRACK : 0) }
  const chanTop: number[] = [], bandTop: number[] = []
  let y = MARGIN + (off.has('ruler') ? 0 : RULER)
  for (let b = 0; b <= B; b++) {
    chanTop[b] = y; y += chanH(b)
    if (b < B) { bandTop[b] = y; y += lanesIn(b) * pitch(b) }
  }
  const height = y + MARGIN
  for (const n of nodes.values()) {
    const P = pitch(n.band), L = lanesIn(n.band)
    const center = bandTop[n.band] + (L * P) / 2
    n.x = colX[n.col]
    n.y = center + (n.lane - (n.lanes - 1) / 2) * P - P / 2 + 4 + maxAbove(n.band)
  }
  const gx = (g: number, key: string) => gapX.get(g)! + GAP_PAD + (gapTracks.get(g)?.at.get(key) ?? 0) * TRACK
  const cy = (c: number, side: 0 | 1, key: string) => {
    const t = chanTracks.get(`${c}|${side}`)?.at.get(key) ?? 0
    return side === 0 ? chanTop[c] + CH_PAD + t * TRACK : chanTop[c] + chanH(c) - CH_PAD - t * TRACK
  }
  const exitPt = (n: Node): Pt => ({ x: n.x + n.w / 2, y: n.y })
  const entryPt = (r: Route): Pt => (r.tgt.kind === 'state' ? { x: r.tgt.x - R, y: r.tgt.y } : { x: r.tgt.x - BAR_W / 2, y: r.tgt.y - r.tgt.h / 2 + PORT * (r.port + 1) * (r.tgt.h / (PORT * (r.ins + 1))) })

  const arcs: Record<string, Pt[]> = {}
  // T-junction dots: where an arc turns off a shared trunk that carries on past it
  const tracksUsed = new Map<string, { vertical: boolean; at: number; ends: number[] }>()
  const seg = (id: string, p: number, q: number, at: number, vertical: boolean) => { const t = tracksUsed.get(id) ?? { vertical, at, ends: [] }; t.ends.push(p, q); tracksUsed.set(id, t) }
  for (const p of plans) {
    const a = exitPt(p.r.src), b = entryPt(p.r)
    let pts: Pt[]
    if (p.type === 'straight') pts = [a, { x: b.x, y: a.y }]
    else if (p.type === 'adjacent' || p.type === 'run') { const X = gx(p.g1, cable(p)); pts = [a, { x: X, y: a.y }, { x: X, y: b.y }, b]; seg(`g${p.g1}|${cable(p)}`, a.y, b.y, X, true) }
    else {
      const X1 = gx(p.g1, cable(p)), X2 = gx(p.g2, cable(p)), Y = cy(p.chan, p.side, cable(p))
      pts = [a, { x: X1, y: a.y }, { x: X1, y: Y }, { x: X2, y: Y }, { x: X2, y: b.y }, b]
      seg(`g${p.g1}|${cable(p)}`, a.y, Y, X1, true); seg(`g${p.g2}|${cable(p)}`, Y, b.y, X2, true); seg(`c${p.chan}|${p.side}|${cable(p)}`, X1, X2, Y, false)
    }
    arcs[p.r.key] = roundCorners(pts, 9)
  }

  const junctions = new Map<string, Pt>()
  for (const t of tracksUsed.values()) {
    const lo = Math.min(...t.ends), hi = Math.max(...t.ends)
    for (const e of t.ends) if (e > lo + 0.5 && e < hi - 0.5) { const pt = t.vertical ? { x: t.at, y: e } : { x: e, y: t.at }; junctions.set(`${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, pt) }
  }

  // ---------------------------------------------------------------- SVG
  const seatColor = new Map(net.seats.map((s) => [s.id, s.color]))
  const INK = '#222', WORLD_INK = '#6b6b6b', ARC = '#555'
  const out: string[] = []
  const t = (x: number, y: number, s: string, extra = '') => out.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${extra}>${esc(s)}</text>`)
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}" font-family="system-ui, sans-serif" font-size="${FONT}">`)
  out.push(`<rect width="100%" height="100%" fill="#fff"/>`)
  out.push(`<defs><marker id="u-ah" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.8 L8,4 L0,7.2 z" fill="${ARC}"/></marker></defs>`)

  // ruler: when each column first becomes possible
  if (!off.has('ruler')) {
    const byEx = new Map<string, number[]>()
    cols.forEach((c, i) => {
      const k = c.t === INITIAL ? 'start' : c.t === UNREACHED ? 'not reached' : String(Math.floor(c.t / STEP))
      byEx.set(k, [...(byEx.get(k) ?? []), i])
    })
    for (const [k, is] of byEx) {
      const x0 = colX[is[0]] - colW[is[0]] / 2 + 2, x1 = colX[is[is.length - 1]] + colW[is[is.length - 1]] / 2 - 2
      out.push(`<line x1="${x0.toFixed(1)}" y1="${MARGIN + 20}" x2="${x1.toFixed(1)}" y2="${MARGIN + 20}" stroke="#999" stroke-width="1"/>`)
      t((x0 + x1) / 2, MARGIN + 15, k === 'start' || k === 'not reached' ? k : `exchange ${k}`, `text-anchor="middle" fill="#666" font-size="9"`)
    }
  }

  // arcs, under the nodes
  for (const p of plans) {
    const pts = arcs[p.r.key]
    const d = pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('')
    const ends = !off.has('arc-ends')
    const head = ends && (p.r.kind === 'take' || p.r.kind === 'give') ? ` marker-end="url(#u-ah)"` : ''
    out.push(`<path d="${d}" fill="none" stroke="${ARC}" stroke-width="1"${head}/>`)
    const end = pts[pts.length - 1]
    if (ends && p.r.kind === 'need') out.push(`<circle cx="${(end.x - 2.5).toFixed(1)}" cy="${end.y.toFixed(1)}" r="2.5" fill="${ARC}"/>`)
    if (ends && p.r.kind === 'unless') out.push(`<circle cx="${(end.x - 3).toFixed(1)}" cy="${end.y.toFixed(1)}" r="2.8" fill="#fff" stroke="${ARC}" stroke-width="1.1"/>`)
    if (p.r.count > 1 && !off.has('counts')) t(end.x - 9, end.y - 2.5, String(p.r.count), `text-anchor="end" font-size="8.5" font-weight="bold" fill="${INK}"`)
  }

  if (!off.has('junctions')) for (const j of junctions.values()) out.push(`<circle cx="${j.x.toFixed(1)}" cy="${j.y.toFixed(1)}" r="2" fill="${ARC}"/>`)
  for (const n of nodes.values()) {
    if (n.kind === 'state') {
      const s = stateOf.get(n.id)!
      const dash = s.seenBy !== 'all' && !off.has('hidden') ? ` stroke-dasharray="3 2"` : ''
      out.push(`<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${R}" fill="#fff" stroke="${INK}" stroke-width="1.3"${dash}/>`)
      if (s.ends !== undefined && !off.has('outcome')) out.push(`<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${R - 2.6}" fill="none" stroke="${INK}" stroke-width="1"/>`)
      if (s.marks === 1 && !off.has('state')) out.push(`<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="2.6" fill="${INK}"/>`)
      if (s.marks > 1 && !off.has('state')) t(n.x, n.y + 3.3, String(s.marks), `text-anchor="middle" font-size="9" font-weight="bold"`)
      let ly = n.y + R + 3 + 8
      for (const l of n.lines) { t(n.x, ly, l, `text-anchor="middle" fill="${INK}"`); ly += LINE }
      if (s.ends !== undefined && n.lines.length) { if (s.ends !== s.label) t(n.x, ly, `ends: ${s.ends}`, `text-anchor="middle" font-style="italic" fill="${INK}"`); ly += LINE }
      if (s.seenBy !== 'all' && !off.has('hidden')) t(n.x, ly, `seen by ${s.seenBy.length ? s.seenBy.map((id) => net.seats.find((x) => x.id === id)?.name ?? id).join(', ') : 'nobody'}`, `text-anchor="middle" fill="#777" font-size="8.5"`)
    } else {
      const v = verbOf.get(n.id)!
      const fill = off.has('speaker') ? INK : v.by === WORLD ? WORLD_INK : seatColor.get(v.by) ?? INK
      if (v.by === WORLD && !off.has('speaker')) out.push(`<rect x="${(n.x - n.w / 2).toFixed(1)}" y="${(n.y - n.h / 2).toFixed(1)}" width="${n.w}" height="${n.h.toFixed(1)}" fill="#fff" stroke="${fill}" stroke-width="1.4"/>`)
      else out.push(`<rect x="${(n.x - n.w / 2).toFixed(1)}" y="${(n.y - n.h / 2).toFixed(1)}" width="${n.w}" height="${n.h.toFixed(1)}" fill="${fill}"/>`)
      let ly = n.y - n.h / 2 - 4 - (n.lines.length - 1) * LINE
      const color = off.has('speaker') || v.by === WORLD ? INK : seatColor.get(v.by) ?? INK
      for (const l of n.lines) { t(n.x, ly, l, `text-anchor="middle" fill="${color}"${v.by === WORLD ? '' : ' font-weight="600"'}`); ly += LINE }
      if (v.by === WORLD && !off.has('priority')) t(n.x, n.y + n.h / 2 + 10, `p${v.priority}${v.weight > 1 ? ` w${v.weight}` : ''}`, `text-anchor="middle" fill="#777" font-size="8.5"`)
      else if (v.weight > 1 && !off.has('priority')) t(n.x, n.y + n.h / 2 + 10, `w${v.weight}`, `text-anchor="middle" fill="#777" font-size="8.5"`)
    }
  }
  if (!U.complete && !off.has('ruler')) t(width - MARGIN, MARGIN + 8, `explored ${U.samples.length.toLocaleString('en-US')} positions, ${U.exchanges} exchanges; capped`, `text-anchor="end" fill="#a33" font-size="8.5"`)
  out.push('</svg>')

  const layout: Record<string, Box> = {}
  for (const n of nodes.values()) layout[n.id] = { x: Math.round(n.x * 100) / 100, y: Math.round(n.y * 100) / 100, w: n.w, h: Math.round(n.h * 100) / 100 }
  return { svg: out.join(''), width: Math.ceil(width), height: Math.ceil(height), layout: { nodes: layout, arcs } }
}

const elements: Element[] = [
  { id: 'columns', what: 'Columns left to right in the order things first become possible: the starting marks, then each exchange, a seat speaking and the world answering step by step.', purpose: 'Position reads as when. A reader sees what opens first, what each choice opens next, and how far into play an outcome lies.', serves: ['possibility', 'conversation', 'compare-shape'] },
  { id: 'ruler', what: 'A thin rule above the columns naming each exchange.', purpose: 'Turns column position into a count of exchanges, so "the punish window opens in exchange 2" can be read off.', serves: ['possibility', 'conversation'] },
  { id: 'rows', what: 'One straight row per entity, holding its states and the verbs that move it.', purpose: 'Each entity is always in one of its states; its row is its process spine, as in the dining philosophers.', serves: ['entity', 'readable', 'compare-shape'] },
  { id: 'shared-rows', what: 'States and verbs no entity owns (counts, clocks, judges) sit in thin rows between the entity rows they connect.', purpose: 'Shared places sit between the processes they couple, and content stays apart from capability.', serves: ['contact', 'content', 'readable'] },
  { id: 'state', what: 'A circle. One mark is a dot; more is a number. An outcome has an inner ring and its result written under it.', purpose: 'Starting marks and outcomes are visible without the text.', serves: ['counts', 'possibility'] },
  { id: 'speaker', what: 'A thin vertical bar: solid in the seat\'s color for a seat\'s verb, a hollow gray bar for the world\'s.', purpose: 'Who speaks each verb, and where the world answers with nobody speaking.', serves: ['conversation'] },
  { id: 'priority', what: 'Under each world bar, its priority and, if above 1, its weight.', purpose: 'The order in which the world answers, and the odds of a chance tie.', serves: ['conversation', 'counts'] },
  { id: 'arc-ends', what: 'Arrow into a verb is take, arrow into a state is give, a dot is need, a ring is unless. Every arc leaves its source on the right and enters its target on the left.', purpose: 'What a verb depends on and what it changes; contact shows as a dot or ring arriving from another row.', serves: ['possibility', 'contact', 'actionable'] },
  { id: 'counts', what: 'A number beside the arrowhead when an arc moves or tests more than one mark.', purpose: 'Counts are on the map.', serves: ['counts', 'actionable'] },
  { id: 'returns', what: 'An arc to an earlier column loops back around the outside of its row through the channel above it.', purpose: 'A loop is the only thing that runs right to left, so feedback jumps out.', serves: ['loop', 'readable'] },
  { id: 'junctions', what: 'A small dot where an arc branches off a shared cable.', purpose: 'Tells a branch from a crossing, so no connection is ambiguous.', serves: ['readable'] },
  { id: 'labels', what: 'Verb labels above the bar, state labels below the circle.', purpose: 'Names, for comparing by name.', serves: ['compare-name', 'actionable'] },
  { id: 'hidden', what: 'A dashed circle and "seen by ..." under a state some seat cannot see.', purpose: 'Who can hear what.', serves: ['conversation'] },
  { id: 'outcome', what: 'The inner ring on an outcome state.', purpose: 'Where play ends.', serves: ['possibility'] },
]

export const design: Design = {
  id: 'unfold',
  title: 'Unfold: the net laid out by when each verb first becomes possible',
  idea: 'Columns run left to right in the order play first makes things possible: the starting marks, then exchange 1 (a seat speaks, the world answers step by step), exchange 2, and so on. Rows are entities, each a straight spine of its states and verbs, with shared states in thin rows between. Forward arcs read as "this opens that"; the only arcs that run backward are returns, so loops stand out.',
  rules: [
    'Find the entities: sets of states of which exactly one always holds a mark (follow one starting mark through every verb that moves it). Every other state is shared.',
    'Play the net forward by hand, breadth first. Exchange 0 is the world answering the starting marks. Exchange k starts with every seat choice open after exchange k-1 and follows the world\'s answers, highest priority first, one step at a time. Stop when nothing new becomes possible.',
    'Write beside each verb the first exchange and world step at which it is said, and beside each state the first moment it holds a mark (states marked at the start are "start").',
    'Make columns in that order: the start states, then for each moment its verbs, then the states those verbs first mark. Columns are by order, not to scale; label each exchange on a rule above.',
    'Draw one row per entity. Put the entity that moves first in the middle and alternate the next ones above and below; break ties by the entity with the most arcs to other rows.',
    'A verb sits in the row of the entity it moves (takes from or gives to). If it moves several, use the one with the fewest states.',
    'A state no entity owns sits in the row its verbs all share; otherwise in a thin row between the rows of its verbs, at their average.',
    'Where several nodes share a row and column, stack them, ordered by the height of what they connect to on their left.',
    'Draw states as circles (a dot for one mark, a number for more, an inner ring for an outcome, dashed if hidden). Draw verbs as thin vertical bars: solid seat color for a seat, hollow gray for the world, with priority and weight under it.',
    'Every arc leaves its source on the right and enters its target on the left. Arrow into a verb is take, into a state is give; a dot is need; a ring is unless. Write any count above 1 beside the end.',
    'Route an arc to the next column straight across the gap. A longer forward arc drops into the channel below its row; a cross-row arc uses the channel beside its source row facing the target; an arc back to an earlier column goes up and around through the channel above its row.',
    'Arcs from one source share a trunk until they split. Corners are rounded; crossings are square.',
  ],
  elements,
  axes: {
    x: 'the earliest moment (exchange, then world step) at which a verb is first said or a state first marked',
    y: 'which entity: one row per entity, shared states in rows between',
    placement: 'a breadth-first play-out of the net from the start marks',
    verb: 'thin vertical bar, solid seat color or hollow gray for the world, priority below',
    speaker: 'bar fill: seat color, hollow gray for the world',
    entity: 'a row: an entity is the set of states exactly one of which is always marked',
    routing: 'rounded orthogonal through column gaps and row channels; returns loop through the channel above',
    unit: 'one whole net',
  },
  draw,
}
