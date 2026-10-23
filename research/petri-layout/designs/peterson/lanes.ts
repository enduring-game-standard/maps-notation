import type { NodeId } from '../../engine/net.ts'
import { laneOrders, type LaneOrder, type Spine } from '../../engine/structure.ts'
import { arcKey, mean, type FC, type Graph, type Hint, type Plan, type Side } from './model.ts'
import { labelExtent } from './text.ts'

// Spacing, in px, set once per drawing. ROW is one stage along the flow. Across a left-to-right flow, labels
// sit above and below their nodes, so the steps across grow by the tallest label and the stages by the widest.
const BASE = { row: 60, half: 60, exc: 72, mingap: 56, satGap: 48, track: 60 }
let S = BASE
export const ROW = BASE.row
function spacing(g: Graph, frame: 'down' | 'right') {
  if (frame === 'down') return BASE
  const ext = [...g.net.places, ...g.net.transitions].map((n) => labelExtent(g, n.id))
  const w = Math.max(...ext.map((e) => e.w)), h = Math.max(...ext.map((e) => e.h))
  const grow = Math.max(0, h - 14)
  // two bars side by side across the flow leave room for a label line between them
  return { row: Math.max(BASE.row, Math.ceil(w) + 10), half: BASE.half + grow, exc: BASE.exc + grow, mingap: BASE.mingap + 20 + grow, satGap: BASE.satGap + 16 + grow, track: BASE.track + 16 + grow }
}
const NODE_HALF = 20
const CORE_SHARED = 150 // a gap that holds shared places (R4)
const CORE_EMPTY = 100
const RET_GAP = 22

type Lane = {
  i: number
  sp: Spine
  ord: LaneOrder
  unbranched: boolean
  pos: number // index across the flow (R4 lane order)
  outer: Side // the side away from the lanes it couples to (R7)
  satSide: Side // where side places and loops go (R9, R13)
  retSide: Side // where returns and back-jumps go (R7, R14)
  col: number
  track: Map<NodeId, number> // cross offset from the lane's line, own nodes only
  profile: { row: number; c: number }[] // everything drawn beside this lane, for extents
  labelRoom: Record<Side, number>
  retRoom: Record<Side, number>
}

export function lanePlan(g: Graph): Plan {
  const { net, s } = g
  const frame = s.spines.length >= 2 ? 'down' : 'right'
  S = spacing(g, frame)
  const ords = laneOrders(net, s)
  const lanes: Lane[] = s.spines.map((sp, i) => {
    const ord = ords[i]
    const counts = new Map<number, number>()
    for (const k of ord.stage.values()) counts.set(k, (counts.get(k) ?? 0) + 1)
    return { i, sp, ord, unbranched: [...counts.values()].every((c) => c === 1), pos: 0, outer: -1, satSide: -1, retSide: 1, col: 0,
      track: new Map(), profile: [], labelRoom: { [-1]: 0, [1]: 0 } as Record<Side, number>, retRoom: { [-1]: 0, [1]: 0 } as Record<Side, number> }
  })
  const lanesOf = new Map<NodeId, number[]>()
  for (const L of lanes) for (const n of L.ord.stage.keys()) lanesOf.set(n, [...(lanesOf.get(n) ?? []), L.i])
  // A transition on several lanes is placed by one of them: an unbranched lane, whose line it must sit on (R1).
  const primary = new Map<NodeId, number>()
  for (const [n, ls] of lanesOf) primary.set(n, ls.slice().sort((a, b) => Number(lanes[b].unbranched) - Number(lanes[a].unbranched) || a - b)[0])
  const own = (L: Lane, n: NodeId) => primary.get(n) === L.i

  const row = new Map<NodeId, number>()
  for (const [n, li] of primary) row.set(n, lanes[li].ord.stage.get(n)!)

  orderLanes(g, lanes, lanesOf)
  const byPos = lanes.slice().sort((a, b) => a.pos - b.pos)
  for (const L of lanes) {
    if (frame === 'right') { L.outer = -1; L.satSide = -1; L.retSide = 1; continue }
    if (L.pos === 0) L.outer = -1
    else if (L.pos === lanes.length - 1) L.outer = 1
    else {
      // C7: a middle lane returns around whichever side carries fewer coupling arcs
      const left = couplingArcs(g, L, byPos[L.pos - 1], lanesOf), right = couplingArcs(g, L, byPos[L.pos + 1], lanesOf)
      L.outer = right < left ? 1 : -1
    }
    L.satSide = L.outer
    L.retSide = L.outer
  }

  for (const L of lanes) laneTracks(g, L, own, row)

  // what is not on a lane: shared places between lanes, everything else beside its lane
  const onLane = (n: NodeId) => lanesOf.has(n)
  const shared = net.places.map((p) => p.id).filter((p) => s.placeRole.get(p)!.kind === 'shared').sort(g.byKey)
  // R11: a bar on no lane that feeds two or more lanes starts them; it sits across them, a row before the first it feeds
  const starters = net.transitions.map((t) => t.id).filter((t) => !onLane(t)
    && new Set(g.outs.get(t)!.flatMap((p) => lanesOf.get(p) ?? [])).size >= 2).sort(g.byKey)
  for (const t of starters) row.set(t, Math.min(...g.outs.get(t)!.filter(onLane).map((p) => row.get(p)!)) - 1)
  const loose = [...net.places, ...net.transitions].map((n) => n.id).filter((n) => !onLane(n) && !shared.includes(n) && !starters.includes(n)).sort(g.byKey)
  const comps = components(g, loose)
  const satPos = new Map<NodeId, FC>() // c relative to the home lane's line, f in rows
  const home = new Map<NodeId, number>()
  const sideRows = satelliteRows(g, comps, row, onLane)
  for (const [n, r] of sideRows) row.set(n, r)
  for (const L of lanes) for (const r of returnLike(g, L, row, (t) => lanes[primary.get(t)!])) if (!r.loop) L.retRoom[r.side] = RET_GAP + 8
  placeSatellites(g, lanes, comps, row, primary, onLane, satPos, home, frame === 'right')

  // label room and return room on each side of each lane (R7: returns go outside the labels, only as wide as needed)
  for (const L of lanes) {
    const labelSide: Side = frame === 'down' ? L.outer : 1
    const ownNodes = [...L.track.keys()]
    L.labelRoom[labelSide] = frame === 'down' ? Math.max(0, ...ownNodes.map((n) => labelExtent(g, n).w)) + 8 : 30
  }

  const pos = new Map<NodeId, FC>()
  const ext = (L: Lane, side: Side) => Math.max(NODE_HALF, ...L.profile.map((p) => side * p.c + NODE_HALF)) + L.labelRoom[side] + L.retRoom[side]
  // columns, left to right (R3, R4)
  let c = 0
  byPos.forEach((L, k) => {
    if (k > 0) {
      const prev = byPos[k - 1]
      const between = shared.filter((p) => { const ls = touchingLanes(g, p, lanesOf); return ls.includes(prev.i) && ls.includes(L.i) })
      // a gap that holds shared places is wide enough for a label beside each of them
      const core = between.length ? Math.max(CORE_SHARED, ...between.map((p) => 2 * (NODE_HALF + 13 + labelExtent(g, p).w))) : CORE_EMPTY
      c += ext(prev, 1) + core + ext(L, -1)
    }
    L.col = c
  })
  for (const [n, li] of primary) {
    const L = lanes[li]
    if (own(L, n)) pos.set(n, { f: row.get(n)! * S.row, c: L.col + L.track.get(n)! })
  }
  const barSpan = new Map<NodeId, number>()
  // a transition on two unbranched lanes is a join or fork bar spanning them (R11); R1 cannot hold for both lanes
  for (const [n, ls] of lanesOf) {
    if (ls.length < 2) continue
    const unb = ls.filter((i) => lanes[i].unbranched)
    if (unb.length >= 2) {
      const cols = unb.map((i) => lanes[i].col)
      pos.set(n, { f: row.get(n)! * S.row, c: mean(cols) })
      barSpan.set(n, Math.max(...cols) - Math.min(...cols) + 40)
    }
  }
  for (const [n, p] of satPos) pos.set(n, { f: row.get(n)! * S.row, c: lanes[home.get(n)!].col + p.c })

  const fed = (t: NodeId) => [...new Set(g.outs.get(t)!.flatMap((p) => lanesOf.get(p) ?? []))].map((i) => lanes[i].col)
  const mid = (t: NodeId) => (Math.min(...fed(t)) + Math.max(...fed(t))) / 2
  const startRows = new Map<number, NodeId[]>()
  for (const t of starters) startRows.set(row.get(t)!, [...(startRows.get(row.get(t)!) ?? []), t])
  for (const ts of startRows.values()) ts.sort((a, b) => mid(a) - mid(b) || g.byKey(a, b))
    .forEach((t, k) => pos.set(t, { f: row.get(t)! * S.row, c: mid(t) + (k - (ts.length - 1) / 2) * (2 * S.half + 40) }))
  const spans = [...barSpan.keys()].map((t) => { const ps = lanesOf.get(t)!.map((i) => lanes[i].pos); return { row: row.get(t)!, lo: Math.min(...ps), hi: Math.max(...ps) } })
  placeShared(g, shared, byPos, lanes, lanesOf, row, pos, ext, spans)

  const hints = routeHints(g, lanes, lanesOf, primary, home, row, pos)

  const bar = new Map<NodeId, 'across' | 'along'>()
  const crowded = (t: NodeId) => (lanesOf.get(t) ?? []).some((i) => [...lanes[i].ord.stage.values()].filter((k) => k === lanes[i].ord.stage.get(t)).length > 1)
  for (const t of net.transitions) bar.set(t.id, isLoopTransition(g, t.id, lanesOf) && (!lanesOf.has(t.id) || crowded(t.id)) ? 'along' : 'across')
  const labelSide = new Map<NodeId, Side>()
  for (const n of pos.keys()) {
    const li = primary.get(n) ?? home.get(n)
    // across a left-to-right flow, steps are named above and states below, so neighbors' labels never meet
    labelSide.set(n, frame === 'right' ? (g.isPlace(n) ? 1 : -1) : li === undefined ? 1 : lanes[li].outer)
  }
  return { frame, pos, bar, barSpan, hints, labelSide }
}

// How each arc is drawn follows from the rule that placed its ends.
function routeHints(g: Graph, lanes: Lane[], lanesOf: Map<NodeId, number[]>, primary: Map<NodeId, number>, home: Map<NodeId, number>,
  row: Map<NodeId, number>, pos: Map<NodeId, FC>): Map<string, Hint> {
  const { net, s } = g
  const hints = new Map<string, Hint>()
  for (const L of lanes) {
    for (const a of net.arcs) {
      const sa = L.ord.stage.get(a.from), sb = L.ord.stage.get(a.to)
      if (sa === undefined || sb === undefined) continue
      if (sb === sa + 1 && Math.abs(pos.get(a.from)!.c - pos.get(a.to)!.c) < 1) hints.set(arcKey(a.from, a.to), { kind: 'lane' })
    }
    // R7: each return only as wide as it must be; a return that spans more runs outside the ones it contains
    const rets = returnLike(g, L, row, (t) => lanes[primary.get(t)!])
    const span = (r: { from: NodeId; to: NodeId }) => [Math.min(row.get(r.to)!, row.get(r.from)!) - 0.6, Math.max(row.get(r.to)!, row.get(r.from)!) + 0.6]
    const used: { side: Side; lo: number; hi: number; d: number; to: NodeId }[] = []
    for (const r of rets.sort((a, b) => (span(a)[1] - span(a)[0]) - (span(b)[1] - span(b)[0]) || g.byKey(a.from, b.from))) {
      if (r.loop) { hints.set(arcKey(r.from, r.to), { kind: 'loop' }); hints.set(arcKey(r.to, r.from), { kind: 'loop' }); continue }
      if (row.get(r.from)! - row.get(r.to)! <= 1) continue // one step back across branches: a direct curve
      const [lo, hi] = span(r)
      const prof = L.profile.filter((p) => p.row >= lo && p.row <= hi).map((p) => r.side * p.c + NODE_HALF)
      let d = Math.max(NODE_HALF, ...prof) + L.labelRoom[r.side] + RET_GAP
      for (const u of used) if (u.side === r.side && u.lo < hi && lo < u.hi) d = Math.max(d, u.d + 14)
      const shift = used.filter((u) => u.side === r.side && u.to === r.to).length * 9
      used.push({ side: r.side, lo, hi, d, to: r.to })
      hints.set(arcKey(r.from, r.to), { kind: 'around', side: r.side, channel: L.col + r.side * d, entry: r.to === L.ord.anchor ? 'before' : 'side', shift })
    }
  }
  for (const { place, transition } of s.selfLoops) { hints.set(arcKey(place, transition), { kind: 'loop' }); hints.set(arcKey(transition, place), { kind: 'loop' }) }
  for (const a of net.arcs) {
    if (hints.has(arcKey(a.from, a.to))) continue
    const li = primary.get(a.from) ?? primary.get(a.to) ?? home.get(a.from) ?? home.get(a.to)
    // R7: a lane's own states and resources meet its bars along the flow (an acquire from above, a release
    // dipping below); a buffer to or from another lane meets the bar on the face toward it
    const t = g.isPlace(a.from) ? a.to : a.from, p = g.isPlace(a.from) ? a.from : a.to
    const tl = lanesOf.get(t) ?? (home.has(t) ? [home.get(t)!] : [])
    const sameLane = (u: NodeId) => (lanesOf.get(u) ?? (home.has(u) ? [home.get(u)!] : [])).some((i) => tl.includes(i))
    const hook = lanesOf.has(p) || (g.ins.get(p)!.some(sameLane) && g.outs.get(p)!.some(sameLane))
    hints.set(arcKey(a.from, a.to), { kind: 'free', prefer: li === undefined ? 1 : lanes[li].satSide, hook })
  }

  return hints
}

// a transition on no lane (one that starts lanes from a common start) touches the lanes it feeds
function touchingLanes(g: Graph, p: NodeId, lanesOf: Map<NodeId, number[]>): number[] {
  const near = (t: NodeId) => lanesOf.get(t) ?? g.nbrs.get(t)!.flatMap((q) => lanesOf.get(q) ?? [])
  return [...new Set(g.nbrs.get(p)!.flatMap(near))].sort((a, b) => a - b)
}

// R4: lanes ordered so each shared place's lanes are adjacent, the giver before the taker.
function orderLanes(g: Graph, lanes: Lane[], lanesOf: Map<NodeId, number[]>) {
  const w = lanes.map(() => lanes.map(() => 0))
  const give = lanes.map(() => lanes.map(() => 0)) // give[i][j]: i writes what j reads
  for (const p of g.net.places) {
    if (g.s.placeRole.get(p.id)!.kind !== 'shared') continue
    const ls = touchingLanes(g, p.id, lanesOf)
    for (const i of ls) for (const j of ls) if (i !== j) w[i][j] += 1
    const writers = new Set(g.ins.get(p.id)!.flatMap((t) => lanesOf.get(t) ?? []))
    const readers = new Set(g.outs.get(p.id)!.flatMap((t) => lanesOf.get(t) ?? []))
    for (const i of writers) for (const j of readers) if (i !== j && !(writers.has(j) && readers.has(i))) give[i][j] += p.tokens === 0 ? 2 : 1
  }
  for (const [, ls] of lanesOf) if (ls.length > 1) for (const i of ls) for (const j of ls) if (i !== j) w[i][j] += 1
  const laneKey = (L: Lane) => L.sp.places.map((p) => g.key(p)).sort().join('|')
  const outflow = (i: number) => give[i].reduce((a, b) => a + b, 0) - give.reduce((a, r) => a + r[i], 0)
  // the line starts at its most loosely coupled lane, so the most coupled ones end up in the middle
  const strength = (i: number) => w[i].reduce((a, b) => a + b, 0)
  const startCmp = (a: number, b: number) => strength(a) - strength(b) || outflow(b) - outflow(a) || cmp(laneKey(lanes[a]), laneKey(lanes[b]))
  const order: number[] = []
  const left = new Set(lanes.map((L) => L.i))
  while (left.size) {
    const last = order[order.length - 1]
    let cands = [...left].filter((j) => last !== undefined && w[last][j] > 0)
    let pick: number
    if (cands.length) pick = cands.sort((a, b) => w[last][b] - w[last][a] || (give[last][b] - give[b][last]) - (give[last][a] - give[a][last]) || startCmp(a, b))[0]
    else {
      cands = [...left].filter((j) => order.some((i) => w[i][j] > 0))
      const tot = (j: number) => order.reduce((s, i) => s + w[i][j], 0)
      pick = cands.length ? cands.sort((a, b) => tot(b) - tot(a) || startCmp(a, b))[0] : [...left].sort(startCmp)[0]
    }
    order.push(pick)
    left.delete(pick)
  }
  order.forEach((i, k) => (lanes[i].pos = k))
}

function couplingArcs(g: Graph, L: Lane, M: Lane, lanesOf: Map<NodeId, number[]>): number {
  let k = 0
  for (const p of g.net.places) {
    if (g.s.placeRole.get(p.id)!.kind !== 'shared') continue
    const ls = touchingLanes(g, p.id, lanesOf)
    if (!ls.includes(L.i) || !ls.includes(M.i)) continue
    k += g.nbrs.get(p.id)!.filter((t) => (lanesOf.get(t) ?? []).includes(L.i)).length
  }
  return k
}

// R10, R13, R14: cross offsets inside one lane. Alternatives spread symmetrically about their place;
// a branch keeps its offset; a merge comes back between its branches; loops and returns step outside.
function laneTracks(g: Graph, L: Lane, own: (L: Lane, n: NodeId) => boolean, row: Map<NodeId, number>) {
  const stage = L.ord.stage
  const P = new Set(L.sp.places)
  const byStage = new Map<number, NodeId[]>()
  for (const [n, k] of stage) if (own(L, n)) byStage.set(k, [...(byStage.get(k) ?? []), n])
  const tr = L.track
  tr.set(L.ord.anchor, 0)
  const laneOut = (t: NodeId) => g.outs.get(t)!.filter((p) => P.has(p))
  const continuing = (t: NodeId) => { const o = laneOut(t); return o.length === 0 || o.some((p) => stage.get(p)! > stage.get(t)!) }
  const maxStage = Math.max(...stage.values())
  for (let k = 1; k <= maxStage; k++) {
    const ns = (byStage.get(k) ?? []).slice().sort(g.byKey)
    const want = new Map<NodeId, number>()
    for (const n of ns) {
      if (P.has(n)) {
        const preds = g.ins.get(n)!.filter((t) => stage.get(t) === k - 1 && tr.has(t))
        want.set(n, preds.length ? mean(preds.map((t) => tr.get(t)!)) : 0)
        continue
      }
      const m = g.ins.get(n)!.find((p) => P.has(p) && stage.get(p) === k - 1)
      const base = m !== undefined ? tr.get(m) ?? 0 : 0
      const sibs = m === undefined ? [n] : g.outs.get(m)!.filter((t) => stage.get(t) === k && own(L, t)).sort(g.byKey)
      // a step that goes back is an excursion beside the lane when it loops on its own place or a sibling goes on
      // (alone at its stage it stays on the line: R1 outranks R13)
      const excursion = (t: NodeId) => sibs.length > 1 && !continuing(t) && (laneOut(t).includes(m!) || sibs.some(continuing))
      // R10: alternatives lie on the side of what they share with the branches already drawn
      const affinity = (t: NodeId) => mean(g.nbrs.get(t)!.filter((x) => !stage.has(x)).flatMap((x) => g.nbrs.get(x)!.filter((y) => tr.has(y)).map((y) => tr.get(y)!)))
      const cont = sibs.filter((t) => !excursion(t)).sort((a, b) => affinity(a) - affinity(b) || g.byKey(a, b)), exc = sibs.filter(excursion)
      if (!excursion(n)) want.set(n, base + (cont.indexOf(n) - (cont.length - 1) / 2) * 2 * S.half)
      else {
        const isLoop = laneOut(n).includes(m!)
        const side = isLoop ? L.satSide : L.retSide
        const sameSide = exc.filter((t) => (laneOut(t).includes(m!) ? L.satSide : L.retSide) === side)
        const spread = cont.length > 1 ? (cont.length - 1) * S.half : 0
        want.set(n, base + side * (spread + (sameSide.indexOf(n) + 1) * S.exc))
      }
    }
    // keep the row apart without changing its order or its center
    const sorted = ns.slice().sort((a, b) => want.get(a)! - want.get(b)! || g.byKey(a, b))
    const got: number[] = []
    sorted.forEach((n, i) => got.push(i === 0 ? want.get(n)! : Math.max(want.get(n)!, got[i - 1] + S.mingap)))
    if (got.some((v, i) => v !== want.get(sorted[i])!)) {
      const shift = mean(sorted.map((n) => want.get(n)!)) - mean(got)
      sorted.forEach((n, i) => tr.set(n, got[i] + shift))
    } else sorted.forEach((n) => tr.set(n, want.get(n)!))
  }
  for (const [n, c] of tr) L.profile.push({ row: row.get(n)!, c })
}

function isLoopTransition(g: Graph, t: NodeId, lanesOf: Map<NodeId, number[]>): boolean {
  // R13 case 1: a transition whose only lane connection is a self-loop on one lane place
  const lanePlaces = g.nbrs.get(t)!.filter((p) => lanesOf.has(p))
  return lanePlaces.length === 1 && g.ins.get(t)!.includes(lanePlaces[0]) && g.outs.get(t)!.includes(lanePlaces[0])
}

type ReturnArc = { from: NodeId; to: NodeId; side: Side; loop: boolean }

// R7, R14: arcs that go back along a lane. Adjacent ones are loops; the rest run outside.
function returnLike(g: Graph, L: Lane, row: Map<NodeId, number>, homeLane: (t: NodeId) => Lane): ReturnArc[] {
  const out: ReturnArc[] = []
  const P = new Set(L.sp.places)
  for (const t of L.sp.transitions) {
    if (!L.ord.stage.has(t)) continue
    for (const p of g.outs.get(t)!) {
      if (!P.has(p) || !L.ord.stage.has(p)) continue
      if (L.ord.stage.get(p)! >= L.ord.stage.get(t)!) continue
      const loop = row.get(t)! - row.get(p)! <= 1 && g.ins.get(t)!.includes(p)
      const tc = L.track.get(t) ?? 0
      const H = homeLane(t)
      // a return from a step drawn on another lane comes back on that lane's side
      // a jump back to another branch goes around that branch's side
      const pc = L.track.get(p) ?? 0
      const side: Side = H !== L ? (Math.sign(H.pos - L.pos) as Side) : Math.abs(pc) > 1 ? (Math.sign(pc) as Side) : Math.abs(tc) > 1 ? (Math.sign(tc) as Side) : L.retSide
      out.push({ from: t, to: p, side, loop })
    }
  }
  return out
}

function components(g: Graph, nodes: NodeId[]): NodeId[][] {
  const set = new Set(nodes), seen = new Set<NodeId>(), out: NodeId[][] = []
  for (const n of nodes) {
    if (seen.has(n)) continue
    const comp: NodeId[] = [n]
    seen.add(n)
    for (let i = 0; i < comp.length; i++) for (const m of g.nbrs.get(comp[i])!) if (set.has(m) && !seen.has(m)) { seen.add(m); comp.push(m) }
    out.push(comp.sort(g.byKey))
  }
  return out
}

// Rows for nodes off the lanes. A place whose arcs all reach lanes sits centered on the stretch it serves
// (R9, R16: one consumer means beside it). A chain off the lane steps one stage at a time from where it
// leaves the lane (R10: stage against stage), or back from where it joins it when it starts nowhere.
function satelliteRows(g: Graph, comps: NodeId[][], row: Map<NodeId, number>, onLane: (n: NodeId) => boolean): Map<NodeId, number> {
  const out = new Map<NodeId, number>()
  const known = (n: NodeId) => (row.has(n) ? row.get(n) : out.get(n))
  for (const comp of comps) {
    const rest: NodeId[] = []
    for (const n of comp) {
      const nb = g.nbrs.get(n)!
      const loops = g.s.selfLoops.filter((l) => l.place === n && onLane(l.transition)).map((l) => row.get(l.transition)!)
      if (g.isPlace(n) && loops.length) out.set(n, mean(loops)) // R13: beside the bar it loops on
      else if (g.isPlace(n) && nb.length && nb.every(onLane)) {
        const rs = nb.map((t) => row.get(t)!)
        // R16: an extra input enters just before its consumer; a by-product leaves just after its producer
        const lean = g.ins.get(n)!.length === 0 ? -0.5 : g.outs.get(n)!.length === 0 ? 0.5 : 0
        out.set(n, (Math.min(...rs) + Math.max(...rs)) / 2 + (nb.length === 1 ? lean : 0))
      }
      else rest.push(n)
    }
    // topological order inside the component; a cycle is broken at its smallest key
    const inside = new Set(rest)
    const indeg = new Map(rest.map((n) => [n, g.ins.get(n)!.filter((m) => inside.has(m) && m !== n).length]))
    const topo: NodeId[] = []
    const left = new Set(rest)
    while (left.size) {
      const ready = [...left].filter((n) => indeg.get(n) === 0).sort(g.byKey)
      const n = ready[0] ?? [...left].sort(g.byKey)[0]
      left.delete(n)
      topo.push(n)
      for (const m of g.outs.get(n)!) if (left.has(m)) indeg.set(m, indeg.get(m)! - 1)
    }
    const pending: NodeId[] = []
    for (const n of topo) {
      const pr = g.ins.get(n)!.map(known).filter((r): r is number => r !== undefined)
      if (pr.length) out.set(n, Math.max(...pr) + 1)
      else pending.push(n)
    }
    for (const n of pending.reverse()) {
      const sr = g.outs.get(n)!.map(known).filter((r): r is number => r !== undefined)
      out.set(n, sr.length ? Math.min(...sr) - 1 : 0)
    }
  }
  return out
}

// R9: beside the lane, outside; narrower spans inside wider ones; a resource shared by mirrored
// alternatives sits on the axis between them.
function placeSatellites(g: Graph, lanes: Lane[], comps: NodeId[][], row: Map<NodeId, number>, primary: Map<NodeId, number>,
  onLane: (n: NodeId) => boolean, satPos: Map<NodeId, FC>, home: Map<NodeId, number>, alternate: boolean) {
  type Group = { nodes: NodeId[]; lane: Lane; lo: number; hi: number; attach: NodeId[] }
  const groups: Group[] = []
  for (const comp of comps) {
    const attach = [...new Set(comp.flatMap((n) => g.nbrs.get(n)!.filter(onLane)))].sort(g.byKey)
    const ls = [...new Set(attach.map((a) => primary.get(a)!))].sort((a, b) => lanes[a].pos - lanes[b].pos)
    const lane = lanes[ls[0] ?? lanes.slice().sort((a, b) => a.pos - b.pos)[0].i]
    const rs = [...comp, ...attach].map((n) => row.get(n)!)
    groups.push({ nodes: comp, lane, lo: Math.min(...rs), hi: Math.max(...rs), attach })
  }
  groups.sort((a, b) => (a.hi - a.lo) - (b.hi - b.lo) || a.nodes.length - b.nodes.length || cmp(g.key(a.nodes[0]), g.key(b.nodes[0])))
  type Rect = { lo: number; hi: number; d0: number; d1: number }
  const rects = new Map<string, Rect[]>()
  const sameAs = new Map<string, Side>()
  const isSubLine = (G: Group) => G.nodes.some((n) => !g.isPlace(n))
  const subLineOrder = groups.filter(isSubLine).sort((a, b) => a.lo - b.lo || a.hi - b.hi || cmp(g.key(a.nodes[0]), g.key(b.nodes[0])))
  for (const G of groups) {
    const L = G.lane
    const ownAttach = G.attach.filter((a) => L.track.has(a))
    const tracks = ownAttach.map((a) => L.track.get(a)!)
    const m = mean(tracks)
    for (const n of G.nodes) home.set(n, L.i)
    // the axis between mirrored alternatives (3.2's d)
    if (G.nodes.length === 1 && tracks.some((t) => t > 1) && tracks.some((t) => t < -1) && Math.abs(m) < 1) {
      const r = row.get(G.nodes[0])!
      if (!L.profile.some((p) => Math.abs(p.row - r) < 0.6 && Math.abs(p.c) < 40)) {
        satPos.set(G.nodes[0], { f: r, c: 0 })
        L.profile.push({ row: r, c: 0 })
        continue
      }
    }
    let side: Side = L.satSide
    if (Math.abs(m) >= 20) side = Math.sign(m) as Side
    else if (isSubLine(G)) {
      // R10, R11: branches that leave the line as sub-lines spread to both sides of it, in the order they leave
      // (only across a left-to-right lane; a column's other side faces the lanes it couples to)
      if (alternate) side = (subLineOrder.indexOf(G) % 2 === 0 ? L.satSide : -L.satSide) as Side
    }
    const lo = G.lo === G.hi ? G.lo - 0.4 : G.lo, hi = G.lo === G.hi ? G.hi + 0.4 : G.hi
    const buckets = new Map<number, NodeId[]>()
    for (const n of G.nodes) { const b = Math.round(row.get(n)! * 2); buckets.set(b, [...(buckets.get(b) ?? []), n]) }
    const width = (Math.max(...[...buckets.values()].map((v) => v.length)) - 1) * S.track
    const reach = (sd: Side) => {
      const own = L.profile.filter((p) => p.row >= lo - 0.5 && p.row <= hi + 0.5).map((p) => sd * p.c + NODE_HALF)
      let d = Math.max(NODE_HALF, ...own) + S.satGap
      for (let moved = true; moved;) {
        moved = false
        for (const R of rects.get(`${L.i}:${sd}`) ?? []) {
          if (lo < R.hi - 0.01 && R.lo < hi - 0.01 && d < R.d1 + S.track - 0.01 && R.d0 < d + width + S.track - 0.01) { d = R.d1 + S.track; moved = true }
        }
      }
      return d
    }
    // R13: a side condition sits tight against its bar, on the other side if this one is taken
    // R13, R9: a side condition sits tight against its bar, and across a left-to-right lane any side place
    // takes the nearer side rather than stacking farther out on this one
    const tight = G.nodes.length === 1 && g.s.selfLoops.some((l) => l.place === G.nodes[0] && onLane(l.transition))
    const free = alternate && Math.abs(m) < 20 && !isSubLine(G)
    // R6: identical side places all take the side the first of them took
    const sig = G.nodes.map((n) => g.key(n)).sort().join('|')
    if (tight || free) {
      if (sameAs.has(sig)) side = sameAs.get(sig)!
      else if ((tight || !L.retRoom[-side as Side]) && reach(-side as Side) < reach(side)) side = -side as Side // not where the returns run
      sameAs.set(sig, side)
    }
    const d = reach(side)
    const key = `${L.i}:${side}`
    const rs = rects.get(key) ?? []
    rs.push({ lo, hi, d0: d, d1: d + width })
    rects.set(key, rs)
    for (const [, ns] of buckets) ns.sort(g.byKey).forEach((n, k) => {
      const c = side * (d + k * S.track)
      satPos.set(n, { f: row.get(n)!, c })
      L.profile.push({ row: row.get(n)!, c })
    })
  }
}

// R4: a shared place sits in the gap between its lanes, at the level that says how it is used.
function placeShared(g: Graph, shared: NodeId[], byPos: Lane[], lanes: Lane[], lanesOf: Map<NodeId, number[]>, row: Map<NodeId, number>,
  pos: Map<NodeId, FC>, ext: (L: Lane, s: Side) => number, spans: { row: number; lo: number; hi: number }[]) {
  type Item = { p: NodeId; level: number; lo: number; hi: number }
  const gaps = new Map<number, Item[]>()
  for (const p of shared) {
    const ls = touchingLanes(g, p, lanesOf).map((i) => lanes[i]).sort((a, b) => a.pos - b.pos)
    const first = ls[0]
    const ts = g.nbrs.get(p)!
    const rs = ts.map((t) => row.get(t)!)
    const firstTs = ts.filter((t) => (lanesOf.get(t) ?? []).includes(first.i))
    const takes = firstTs.filter((t) => g.outs.get(p)!.includes(t)), gives = firstTs.filter((t) => g.ins.get(p)!.includes(t))
    let level: number
    // a resource sits level with the first state that holds it, just after its taker
    if (takes.length && gives.length) level = Math.min(Math.min(...takes.map((t) => row.get(t)!)) + 1, Math.max(...gives.map((t) => row.get(t)!)))
    else {
      const w = g.ins.get(p)!.map((t) => row.get(t)!), r = g.outs.get(p)!.map((t) => row.get(t)!)
      // a start nothing refills sits a row before the bars that take from it
      level = w.length && r.length ? (mean(w) + mean(r)) / 2 : w.length ? mean(rs) : Math.min(...rs) - 1
    }
    const gap = Math.floor((ls[0].pos + ls[ls.length - 1].pos) / 2)
    gaps.set(gap, [...(gaps.get(gap) ?? []), { p, level, lo: Math.min(...rs), hi: Math.max(...rs) }])
  }
  const SEP = 0.8
  for (const [gap, items] of gaps) {
    // a join bar spanning this gap keeps its row clear
    for (const it of items) for (const sp of spans) {
      if (sp.lo <= gap && gap < sp.hi && Math.abs(it.level - sp.row) < 0.5) it.level = sp.row - 0.5 >= it.lo ? sp.row - 0.5 : sp.row + 0.5
    }
    const A = byPos[gap], B = byPos[Math.min(gap + 1, byPos.length - 1)]
    const center = A === B ? A.col + ext(A, 1) + 60 : (A.col + ext(A, 1) + B.col - ext(B, -1)) / 2
    // R8: ordered along the flow by level; forward (unmarked) before return (marked) at one level (R12)
    items.sort((a, b) => a.level - b.level || (g.tokens.get(a.p)! - g.tokens.get(b.p)!) || g.byKey(a.p, b.p))
    const got: number[] = []
    items.forEach((it, i) => got.push(i === 0 ? it.level : Math.max(it.level, got[i - 1] + SEP)))
    const shift = mean(items.map((i) => i.level)) - mean(got)
    const fs = got.map((v) => v + shift)
    const fits = items.every((it, i) => fs[i] >= it.lo - 0.01 && fs[i] <= it.hi + 0.01)
    items.forEach((it, i) => {
      if (fits) pos.set(it.p, { f: fs[i] * S.row, c: center })
      else {
        // too many for one column: those that collide step across the gap
        const k = items.slice(0, i).filter((o) => Math.abs(o.level - it.level) < SEP).length
        pos.set(it.p, { f: it.level * S.row, c: center + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 44 })
      }
      row.set(it.p, pos.get(it.p)!.f / S.row)
    })
  }
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
