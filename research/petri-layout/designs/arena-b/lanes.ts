import type { Net, NodeId } from '../../engine/net.ts'
import { PLACE_R } from '../../engine/layout.ts'
import { laneOrder, type LaneOrder, type Structure } from '../../engine/structure.ts'
import { G, BR, MAXBAR, barLength, cmp, labelWidth, spread } from './common.ts'

export type Pos = { f: number; c: number }

export type LaneRec = {
  k: number // index in structure.spines
  ord: LaneOrder
  nodes: Set<NodeId>
  stage: Map<NodeId, number>
  off: Map<NodeId, number> // cross offset from the lane's line
  col: number
  line: number // cross coordinate of the lane's line
  retSide: 1 | -1
  satSide: 1 | -1
  reach: { neg: number; pos: number } // how far the lane's own nodes and satellites reach from its line
  open: boolean
  coupled: { neg: boolean; pos: boolean } // which sides carry arcs to shared places
  clear: number // room a return corridor leaves for labels between the lane and itself
}

export type Plan = {
  lanes: LaneRec[] // in column order
  pos: Map<NodeId, Pos>
  barLen: Map<NodeId, number>
  laneOf: Map<NodeId, LaneRec[]> // lane nodes only
  leftover: Set<NodeId> // nodes no lane scene could take
  barAngle: Map<NodeId, number> // bars turned off the usual direction
  backArcs: Set<string> // 'from>to' of feedback arcs in the layered block
  block: { lo: number; hi: number } | null // cross extent of the layered block
  sharedGap: Map<NodeId, number> // shared place -> gap index (between column g and g+1)
}

const key = (s: Structure, n: NodeId) => s.canon.get(n)!
const byCanon = (s: Structure) => (a: NodeId, b: NodeId) => cmp(key(s, a), key(s, b)) || cmp(a, b)

export function planLanes(net: Net, s: Structure): Plan {
  const isPlace = new Set(net.places.map((p) => p.id))
  const by = byCanon(s)
  const lanes0 = s.spines.map((sp, k) => ({ k, ord: laneOrder(net, s, sp) }))
  const nbrs = new Map<NodeId, NodeId[]>() // all arcs, both directions, inhibitors too
  for (const n of [...net.places, ...net.transitions]) nbrs.set(n.id, [])
  for (const a of net.arcs) { nbrs.get(a.from)!.push(a.to); nbrs.get(a.to)!.push(a.from) }

  // ---- lanes, staged by laneOrder ----
  const recs: LaneRec[] = lanes0.map(({ k, ord }) => {
    // nodes the anchor does not reach (a second source feeding the lane) are not on the line; they become satellites
    const nodes = new Set<NodeId>(ord.stage.keys())
    return { k, ord, nodes, stage: new Map(ord.stage), off: new Map(), col: 0, line: 0, retSide: -1, satSide: 1, reach: { neg: 0, pos: 0 }, open: s.spines[k].open, clear: 34, coupled: { neg: false, pos: false } }
  })
  const textOf = new Map([...net.places, ...net.transitions].map((n) => [n.id, n.label ?? '']))
  for (const r of recs) r.clear = Math.min(96, Math.max(34, ...[...r.nodes].map((n) => Math.max(16, labelWidth(textOf.get(n)!)) + 16)))

  // ---- levels along the flow: stage k of every lane is level k, unless shared bars force later ----
  const lev = new Map<NodeId, number>()
  for (const r of recs) for (const [n, v] of r.stage) lev.set(n, Math.max(lev.get(n) ?? 0, v))
  for (let guard = 0; guard < 200; guard++) {
    let changed = false
    for (const r of recs) {
      const groups = new Map<number, NodeId[]>()
      for (const [n, v] of r.stage) groups.set(v, [...(groups.get(v) ?? []), n])
      let running = -Infinity
      for (const v of [...groups.keys()].sort((a, b) => a - b)) {
        const g = groups.get(v)!
        const want = Math.max(running + 1, ...g.map((n) => lev.get(n)!))
        for (const n of g) if (lev.get(n)! !== want) { lev.set(n, want); changed = true }
        running = want
      }
    }
    if (!changed) break
  }

  // a stretch of a lane that waits for a shared bar sits just before it, not at the top (C10)
  for (const r of recs) {
    const groups = new Map<number, NodeId[]>()
    for (const [n, v] of r.stage) groups.set(v, [...(groups.get(v) ?? []), n])
    const ks = [...groups.keys()].sort((a, b) => a - b)
    const multi = (n: NodeId) => recs.filter((q) => q.nodes.has(n)).length > 1
    if (!ks.some((k) => groups.get(k)!.some(multi))) continue
    for (let i = ks.length - 2; i >= 0; i--) {
      const g = groups.get(ks[i])!, nextLev = lev.get(groups.get(ks[i + 1])![0])!
      if (g.some(multi)) continue
      if (nextLev - lev.get(g[0])! > 1) for (const n of g) lev.set(n, nextLev - 1)
    }
  }

  const laneOf = new Map<NodeId, LaneRec[]>()
  for (const r of recs) for (const n of r.nodes) laneOf.set(n, [...(laneOf.get(n) ?? []), r])

  // ---- cross offsets inside each lane: alternatives spread symmetrically, branches follow their roots ----
  for (const r of recs) {
    const groups = new Map<number, NodeId[]>()
    for (const [n, v] of r.stage) groups.set(v, [...(groups.get(v) ?? []), n])
    const preds = (n: NodeId) => (nbrs.get(n) ?? []).filter((m) => r.nodes.has(m) && r.stage.get(m)! < r.stage.get(n)!
      && net.arcs.some((a) => a.from === m && a.to === n && !a.inhibitor))
    for (const v of [...groups.keys()].sort((a, b) => a - b)) {
      const g = groups.get(v)!.sort(by)
      if (g.length === 1) { r.off.set(g[0], 0); continue }
      const base = g.map((n) => { const ps = preds(n).filter((m) => r.off.has(m)); return ps.length ? ps.reduce((t, m) => t + r.off.get(m)!, 0) / ps.length : 0 })
      const order = g.map((_, i) => i).sort((i, j) => base[i] - base[j] || by(g[i], g[j]))
      const sp = spread(order.map((i) => base[i]), BR)
      order.forEach((i, j) => r.off.set(g[i], sp[j]))
    }
  }

  // ---- bar lengths (R19): long enough for the arcs on a side ----
  const barLen = new Map<NodeId, number>()
  for (const t of net.transitions) barLen.set(t.id, barLength(net.arcs, t.id))

  // ---- lane order (R4): shared places' lanes adjacent, giver before taker ----
  const order = orderLanes(net, s, recs)
  order.forEach((r, i) => (r.col = i))

  // ---- shared places: which gap, and where along the flow ----
  const sharedGap = new Map<NodeId, number>()
  const sharedF = new Map<NodeId, number>()
  const shared = net.places.filter((p) => s.placeRole.get(p.id)!.kind === 'shared').map((p) => p.id).sort(by)
  const touchT = (p: NodeId) => net.arcs.filter((a) => a.from === p || a.to === p).map((a) => (a.from === p ? a.to : a.from))
  const laneRecOf = (k: number) => recs.find((r) => r.k === k)!
  for (const p of shared) {
    const role = s.placeRole.get(p)! as { kind: 'shared'; spines: number[] }
    const cols = role.spines.map((k) => laneRecOf(k).col).sort((a, b) => a - b)
    const center = (cols[0] + cols[cols.length - 1]) / 2
    let best = cols[0], bd = Infinity
    for (let g = cols[0]; g < cols[cols.length - 1]; g++) { const d = Math.abs(g + 0.5 - center); if (d < bd - 1e-9) { bd = d; best = g } }
    sharedGap.set(p, best)
    // a resource sits midway through the stretch where its first lane holds it; a buffer midway between its ends
    const fsAll = touchT(p).filter((t) => lev.has(t)).map((t) => lev.get(t)! * G.step)
    const first = recs.filter((r) => role.spines.includes(r.k)).sort((a, b) => a.col - b.col)[0]
    const fsFirst = touchT(p).filter((t) => first.nodes.has(t)).map((t) => lev.get(t)! * G.step)
    const use = fsFirst.length && Math.max(...fsFirst) > Math.min(...fsFirst) ? fsFirst : fsAll
    sharedF.set(p, use.length ? (Math.min(...use) + Math.max(...use)) / 2 : 0)
  }

  // ---- sides: returns and side places face away from the coupling arcs (R7, R9, C7) ----
  const nCols = recs.length
  for (const r of recs) {
    const cnt = { '-1': 0, '1': 0 } as Record<string, number>
    for (const p of shared) {
      const g = sharedGap.get(p)!
      const mine = touchT(p).filter((t) => r.nodes.has(t)).length
      if (!mine) continue
      const side = g >= r.col ? 1 : -1
      cnt[String(side)] += mine
    }
    r.coupled = { neg: cnt['-1'] > 0, pos: cnt['1'] > 0 }
    if (r.col === 0 && nCols > 1) r.retSide = -1
    else if (r.col === nCols - 1 && nCols > 1) r.retSide = 1
    else r.retSide = cnt['-1'] <= cnt['1'] ? -1 : 1
    if (cnt['-1'] === 0 && cnt['1'] === 0) r.retSide = -1
    r.satSide = cnt['-1'] === 0 && cnt['1'] === 0 ? 1 : r.retSide
  }

  // ---- local scenes: lane nodes, then satellites (side places, free nodes) beside what they serve ----
  const local = new Map<NodeId, Pos>()
  const leftover = new Set<NodeId>()
  const owner = new Map<NodeId, LaneRec>()
  for (const r of recs) for (const n of r.nodes) if (!owner.has(n)) owner.set(n, r)
  const satellites = [...net.places, ...net.transitions].map((n) => n.id).filter((n) => !laneOf.has(n) && s.placeRole.get(n)?.kind !== 'shared').sort(by)
  // ownership by flood from lane nodes
  const unowned = new Set(satellites)
  for (let guard = 0; guard < 100 && unowned.size; guard++) {
    let changed = false
    for (const n of [...unowned].sort(by)) {
      const owners = (nbrs.get(n) ?? []).filter((m) => owner.has(m) && !(s.placeRole.get(m)?.kind === 'shared')).map((m) => owner.get(m)!)
      if (!owners.length) continue
      const tally = new Map<LaneRec, number>()
      for (const o of owners) tally.set(o, (tally.get(o) ?? 0) + 1)
      const best = [...tally].sort((a, b) => b[1] - a[1] || a[0].col - b[0].col)[0][0]
      owner.set(n, best); unowned.delete(n); changed = true
    }
    if (!changed) break
  }
  for (const n of unowned) leftover.add(n)

  for (const r of recs) {
    for (const n of r.nodes) { if (!local.has(n) || laneOf.get(n)!.length === 1) local.set(n, { f: lev.get(n)! * G.step, c: r.off.get(n)! }) }
  }
  // multi-lane nodes keep each lane's own offset for obstacle purposes; their final place is set below
  type Box = { f0: number; f1: number; c0: number; c1: number }
  const boxFor = (id: NodeId, p: Pos): Box => {
    if (isPlace.has(id)) return { f0: p.f - PLACE_R, f1: p.f + PLACE_R, c0: p.c - PLACE_R, c1: p.c + PLACE_R }
    return { f0: p.f - 4, f1: p.f + 4, c0: p.c - barLen.get(id)! / 2, c1: p.c + barLen.get(id)! / 2 }
  }
  const inter = (a: Box, b: Box, pad: number) => a.f0 < b.f1 + pad && b.f0 < a.f1 + pad && a.c0 < b.c1 + pad && b.c0 < a.c1 + pad

  for (const r of recs) {
    const mine = satellites.filter((n) => owner.get(n) === r)
    const scene = new Map<NodeId, Pos>()
    for (const n of r.nodes) scene.set(n, local.get(n)!)
    const placed = new Set<NodeId>(r.nodes)
    const todo = new Set(mine)
    const segHits = (a: Pos, b: Pos, skip: Set<NodeId>) => {
      for (const [id, p] of scene) {
        if (skip.has(id)) continue
        const bx = boxFor(id, p)
        for (let i = 1; i < 12; i++) {
          const t = i / 12, q = { f: a.f + (b.f - a.f) * t, c: a.c + (b.c - a.c) * t }
          if (q.f > bx.f0 - 3 && q.f < bx.f1 + 3 && q.c > bx.c0 - 3 && q.c < bx.c1 + 3) return true
        }
      }
      return false
    }
    // a run of degree-2 satellites between two placed nodes is a parallel sub-line, evenly spaced between them (R10, R11)
    {
      const deg = (n: NodeId) => net.arcs.filter((a) => a.from === n || a.to === n).length
      const outOf = (n: NodeId) => net.arcs.filter((a) => a.from === n && !a.inhibitor).map((a) => a.to)
      const found: { seq: NodeId[]; u: NodeId; v: NodeId }[] = []
      for (const u of [...scene.keys()].sort(by)) for (const s1 of outOf(u).sort(by)) {
        if (!todo.has(s1) || deg(s1) !== 2) continue
        const seq = [s1]
        let v: NodeId | null = null
        for (let cur = s1; ;) {
          const nx = outOf(cur)
          if (nx.length !== 1) break
          if (scene.has(nx[0])) { v = nx[0]; break }
          if (!todo.has(nx[0]) || deg(nx[0]) !== 2 || seq.includes(nx[0])) break
          seq.push(nx[0]); cur = nx[0]
        }
        if (v && v !== u && scene.get(v)!.f - scene.get(u)!.f >= (seq.length + 1) * 60) found.push({ seq, u, v })
      }
      found.sort((a, b) => a.seq.length - b.seq.length || by(a.seq[0], b.seq[0]) || scene.get(a.u)!.f - scene.get(b.u)!.f)
      const used = { '-1': 0, '1': 0 } as Record<string, number>
      found.forEach((ch, i) => {
        if (ch.seq.some((n) => !todo.has(n))) return
        const fu = scene.get(ch.u)!.f, fv = scene.get(ch.v)!.f
        const sg: 1 | -1 = i % 2 === 0 ? r.satSide : (-r.satSide as 1 | -1)
        const reach = Math.max(0, ...[...scene].filter(([id, p]) => r.nodes.has(id) && p.f >= fu && p.f <= fv).map(([, p]) => sg * p.c))
        for (let tier = used[String(sg)]; tier < 12; tier++) {
          const c = sg * (Math.max(76, reach + 62) + tier * 64)
          const spots = ch.seq.map((n, j) => ({ n, p: { f: fu + ((j + 1) * (fv - fu)) / (ch.seq.length + 1), c } }))
          if (spots.some(({ n, p }) => [...scene].some(([id, q]) => inter(boxFor(n, p), boxFor(id, q), 10)))) continue
          for (const { n, p } of spots) { scene.set(n, p); placed.add(n); todo.delete(n) }
          used[String(sg)] = tier + 1
          break
        }
      })
    }
    // place in rounds: nodes with the most placed neighbours first (satellite chains follow their anchor)
    while (todo.size) {
      const cand = [...todo].map((n) => ({ n, ps: (nbrs.get(n) ?? []).filter((m) => placed.has(m) && scene.has(m)) })).filter((x) => x.ps.length)
      if (!cand.length) { for (const n of todo) leftover.add(n); break }
      cand.sort((a, b) => b.ps.length - a.ps.length || by(a.n, b.n))
      const { n, ps } = cand[0]
      const uniq = [...new Set(ps)]
      let use = uniq
      if (isPlace.has(n)) {
        const consumers = uniq.filter((m) => net.arcs.some((a) => a.from === n && a.to === m))
        if (consumers.length && uniq.length > consumers.length && uniq.some((m) => net.arcs.some((a) => a.from === m && a.to === n)) === false) use = consumers
      }
      const fs = use.map((m) => scene.get(m)!.f)
      const span = Math.max(...fs) - Math.min(...fs)
      // a place that loops on a transition stays level with it (R13); otherwise it centers on what it serves
      const loopMate = uniq.find((m) => net.arcs.some((x) => x.from === n && x.to === m) && net.arcs.some((x) => x.from === m && x.to === n))
      const f0 = loopMate ? scene.get(loopMate)!.f : (Math.min(...fs) + Math.max(...fs)) / 2
      const lean = loopMate ? scene.get(loopMate)!.c : use.map((m) => scene.get(m)!.c).reduce((x, y) => x + y, 0) / use.length
      let sigma: 1 | -1 = Math.abs(lean) > 10 ? (lean > 0 ? 1 : -1) : r.satSide
      let base = Math.max(56 + (span > 1 && !loopMate ? 52 : 0), Math.abs(lean) * (sigma === (lean > 0 ? 1 : -1) ? 1 : 0) + 56)
      // twins (same neighbours) mirror about the lane (R12)
      const myN = [...new Set(nbrs.get(n) ?? [])].sort().join('|')
      const twin = [...scene].find(([id, p]) => id !== n && !r.nodes.has(id) && isPlace.has(id) === isPlace.has(n) && p.f === scene.get(id)!.f
        && [...new Set(nbrs.get(id) ?? [])].sort().join('|') === myN)
      if (twin && twin[1].c !== 0) { sigma = twin[1].c > 0 ? -1 : 1; base = Math.abs(twin[1].c) }
      const mybox = (p: Pos) => boxFor(n, p)
      const skip = new Set([...uniq, n])
      const tryAt = (needArcs: boolean): Pos | null => {
        for (let tries = 0; tries < 36; tries++) {
          const sgn = tries < 18 ? sigma : (-sigma as 1 | -1)
          const p = { f: f0, c: sgn * (base + (tries % 18) * 26) }
          if ([...scene].some(([id, q]) => inter(mybox(p), boxFor(id, q), 12))) continue
          if (needArcs && uniq.some((m) => segHits(p, scene.get(m)!, skip))) continue
          return p
        }
        return null
      }
      let spot = tryAt(true) ?? tryAt(false)
      if (!spot) {
        for (let k = 0; k < 40 && !spot; k++) {
          const p = { f: f0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 30, c: sigma * (base + 26 * 18) }
          if (![...scene].some(([id, q]) => inter(mybox(p), boxFor(id, q), 12))) spot = p
        }
      }
      if (!spot) spot = { f: f0, c: sigma * (base + 26 * 40) }
      scene.set(n, spot); placed.add(n); todo.delete(n)
    }
    for (const [n, p] of scene) if (!r.nodes.has(n)) local.set(n, p)
    // reach
    let neg = 0, pos = 0
    for (const [n, p] of scene) {
      if (n && laneOf.get(n)?.length! > 1) continue
      const hw = isPlace.has(n) ? PLACE_R : barLen.get(n)! / 2
      neg = Math.max(neg, -p.c + hw); pos = Math.max(pos, p.c + hw)
    }
    r.reach = { neg, pos }
  }

  // ---- columns ----
  const cols = recs.slice().sort((a, b) => a.col - b.col)
  const corridor = (r: LaneRec, side: 1 | -1) => (r.retSide === side && hasReturn(r) ? r.clear + 10 : 0)
  // shared places per gap. Places whose rows would collide stack along the flow, the forward one above (R12).
  const stackOff = new Map<NodeId, number>()
  const gapW: number[] = []
  const written = (p: NodeId) => Math.min(99, ...net.arcs.filter((a) => a.to === p).map((a) => owner.get(a.from)?.col ?? 99))
  for (let g = 0; g + 1 < nCols; g++) {
    const here = shared.filter((p) => sharedGap.get(p) === g).sort((a, b) => sharedF.get(a)! - sharedF.get(b)! || by(a, b))
    let i = 0
    while (i < here.length) {
      let j = i + 1
      while (j < here.length && sharedF.get(here[j])! - sharedF.get(here[j - 1])! < 2 * PLACE_R + 12) j++
      const cluster = here.slice(i, j).sort((a, b) => written(a) - written(b) || by(a, b))
      const k = cluster.length
      cluster.forEach((p, q) => stackOff.set(p, (q - (k - 1) / 2) * (2 * PLACE_R + 14)))
      i = j
    }
    gapW.push(here.length ? 104 : 72)
  }
  let x = 0
  for (let i = 0; i < cols.length; i++) {
    const r = cols[i]
    if (i > 0) {
      const prev = cols[i - 1]
      x = x + prev.reach.pos + corridor(prev, 1) + gapW[i - 1] + r.reach.neg + corridor(r, -1)
    }
    r.line = x
  }
  const pos = new Map<NodeId, Pos>()
  for (const r of recs) for (const [n, p] of local) {
    if (!(owner.get(n) === r)) continue
    if ((laneOf.get(n)?.length ?? 0) > 1) continue
    pos.set(n, { f: p.f, c: r.line + p.c })
  }
  // a bar shared by lanes sits on the straight line of a lane that has no choices (R1 outranks R11); with none, centered across them
  const branched = (r: LaneRec) => { const seen = new Set<number>(); for (const v of r.stage.values()) { if (seen.has(v)) return true; seen.add(v) } return false }
  for (const [n, ls] of laneOf) {
    if (ls.length < 2) continue
    const host = ls.slice().sort((a, b) => a.col - b.col).find((r) => !branched(r))
    const cs = ls.map((r) => r.line + r.off.get(n)!)
    pos.set(n, { f: lev.get(n)! * G.step, c: host ? host.line + host.off.get(n)! : cs.reduce((a, b) => a + b, 0) / cs.length })
    if (!isPlace.has(n)) barLen.set(n, MAXBAR)
  }
  for (const p of shared) {
    const g = sharedGap.get(p)!
    const left = cols[g], right = cols[g + 1]
    const cx = (left.line + left.reach.pos + corridor(left, 1) + right.line - right.reach.neg - corridor(right, -1)) / 2
    pos.set(p, { f: sharedF.get(p)! + (stackOff.get(p) ?? 0), c: cx })
  }
  // a shared place keeps clear of the long bars that pass through its column
  for (const p of shared) {
    const me = pos.get(p)!
    const mine = touchT(p).filter((t) => pos.has(t))
    for (const t of net.transitions.map((x) => x.id)) {
      const b = pos.get(t)
      if (!b || isPlace.has(t) || (laneOf.get(t)?.length ?? 0) < 2) continue
      if (Math.abs(b.f - me.f) < 36 && Math.abs(b.c - me.c) < barLen.get(t)! / 2 + PLACE_R) {
        const others = mine.filter((m) => m !== t).map((m) => pos.get(m)!.f)
        const toward = others.length ? (others.reduce((a, c) => a + c, 0) / others.length >= b.f ? 1 : -1) : -1
        me.f = b.f + toward * 40
      }
    }
  }
  // lane-less and un-owned nodes are laid out by the caller
  for (const n of leftover) pos.delete(n)

  return { lanes: cols, pos, barLen, laneOf, leftover, sharedGap, barAngle: new Map(), backArcs: new Set(), block: null }
}

function hasReturn(r: LaneRec): boolean {
  return r.ord.returnArcs.length > 0
}

function orderLanes(net: Net, s: Structure, recs: LaneRec[]): LaneRec[] {
  const n = recs.length
  if (n <= 1) return recs.slice()
  const laneKey = recs.map((r) => [...r.nodes].map((x) => key(s, x)).sort().join('|'))
  const idx = new Map(recs.map((r, i) => [r.k, i]))
  // links: sets of lane indices that one shared place or one shared bar ties together
  const links: number[][] = []
  const dirs: { from: number; to: number; w: number }[] = []
  for (const p of net.places) {
    const role = s.placeRole.get(p.id)!
    if (role.kind !== 'shared') continue
    const ls = role.spines.map((k) => idx.get(k)!)
    links.push(ls)
    if (ls.length === 2) {
      const writes = (i: number) => net.arcs.some((a) => a.to === p.id && recs[i].nodes.has(a.from))
      const reads = (i: number) => net.arcs.some((a) => a.from === p.id && recs[i].nodes.has(a.to))
      const [a, b] = ls
      if (writes(a) && !reads(a) && reads(b) && !writes(b)) dirs.push({ from: a, to: b, w: p.tokens === 0 ? 2 : 1 })
      else if (writes(b) && !reads(b) && reads(a) && !writes(a)) dirs.push({ from: b, to: a, w: p.tokens === 0 ? 2 : 1 })
    }
  }
  for (const t of net.transitions) {
    const ls = (s.spineOfTransition.get(t.id) ?? []).map((k) => idx.get(k)!)
    if (ls.length >= 2) links.push(ls)
  }
  const score = (perm: number[]) => {
    const at = new Array(n)
    perm.forEach((lane, i) => (at[lane] = i))
    let gaps = 0, broken = 0
    for (const l of links) { const ps = l.map((x) => at[x]); const g = Math.max(...ps) - Math.min(...ps) - (new Set(ps).size - 1); gaps += g; if (g > 0) broken++ }
    let inv = 0
    for (const d of dirs) if (at[d.from] > at[d.to]) inv += d.w
    return [broken, gaps, inv]
  }
  let best: number[] | null = null, bs: number[] = []
  const better = (a: number[], b: number[], pa: number[], pb: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
    const ka = pa.map((i) => laneKey[i]).join('/'), kb = pb.map((i) => laneKey[i]).join('/')
    return ka < kb
  }
  const perm: number[] = []
  const used = new Array(n).fill(false)
  const go = () => {
    if (perm.length === n) {
      const sc = score(perm)
      if (!best || better(sc, bs, perm, best)) { best = perm.slice(); bs = sc }
      return
    }
    for (let i = 0; i < n; i++) if (!used[i]) { used[i] = true; perm.push(i); go(); perm.pop(); used[i] = false }
  }
  if (n <= 7) go()
  else best = recs.map((_, i) => i).sort((a, b) => cmp(laneKey[a], laneKey[b]))
  return best!.map((i) => recs[i])
}
