import type { Net, NodeId } from '../../engine/net.ts'
import type { Structure } from '../../engine/structure.ts'
import { BR, G, barLength, cmp, spread } from './common.ts'
import type { Pos } from './lanes.ts'

// C12: no lane structure. Marked places and sources come first, feedback arcs are cut, every node sits one
// step past its latest input, and alternatives spread symmetrically about what they follow.
export type Layered = { pos: Map<NodeId, Pos>; back: Set<string>; loopBars: Set<NodeId> }

export function layered(net: Net, s: Structure, all0: Set<NodeId>): Layered {
  // R13: a node whose every arc is a loop with one partner sits beside that partner, not in the layers
  const loopHost = new Map<NodeId, NodeId>()
  const placeSet = new Set(net.places.map((p) => p.id))
  for (const n of all0) {
    const touching = net.arcs.filter((a) => a.from === n || a.to === n)
    const partners = new Set(touching.map((a) => (a.from === n ? a.to : a.from)))
    if (partners.size !== 1 || touching.some((a) => a.inhibitor)) continue
    const h = [...partners][0]
    if (!all0.has(h)) continue
    const both = touching.some((a) => a.from === n) && touching.some((a) => a.to === n)
    if (!both) continue
    const hostArcs = net.arcs.filter((a) => a.from === h || a.to === h)
    if (hostArcs.every((a) => a.from === n || a.to === n)) continue
    loopHost.set(n, h)
  }
  const ids = new Set([...all0].filter((n) => !loopHost.has(n)))
  const { pos: core, back } = layeredCore(net, s, ids)
  const taken = [...core.values()]
  for (const n of [...loopHost.keys()].sort((a, b) => cmp(s.canon.get(a)!, s.canon.get(b)!) || cmp(a, b))) {
    const h = core.get(loopHost.get(n)!)
    if (!h) continue
    let spot: Pos | null = null
    const d0 = placeSet.has(n) && !placeSet.has(loopHost.get(n)!) ? barLength(net.arcs, loopHost.get(n)!) / 2 + 18 + 14 : 66
    for (let d = d0; d < 400 && !spot; d += 30) for (const sg of [1, -1]) {
      const p = { f: h.f, c: h.c + sg * d }
      if (!taken.some((q) => Math.abs(q.f - p.f) < 58 && Math.abs(q.c - p.c) < 58)) { spot = p; break }
    }
    spot = spot ?? { f: h.f, c: h.c + d0 }
    core.set(n, spot); taken.push(spot)
  }
  return { pos: core, back, loopBars: new Set([...loopHost.keys()].filter((n) => !placeSet.has(n))) }
}

function layeredCore(net: Net, s: Structure, ids: Set<NodeId>): { pos: Map<NodeId, Pos>; back: Set<string> } {
  const key = (n: NodeId) => s.canon.get(n)!
  const by = (a: NodeId, b: NodeId) => cmp(key(a), key(b)) || cmp(a, b)
  const isPlace = new Set(net.places.map((p) => p.id))
  const tokens = new Map(net.places.map((p) => [p.id, p.tokens]))
  const out = new Map<NodeId, NodeId[]>(), inn = new Map<NodeId, NodeId[]>()
  for (const n of ids) { out.set(n, []); inn.set(n, []) }
  for (const a of net.arcs) {
    if (!ids.has(a.from) || !ids.has(a.to) || a.from === a.to) continue
    if (a.inhibitor) { // an inhibitor source sits with the other inputs: treat as input of its transition
      out.get(a.from)!.push(a.to); inn.get(a.to)!.push(a.from); continue
    }
    out.get(a.from)!.push(a.to); inn.get(a.to)!.push(a.from)
  }
  for (const n of ids) { out.get(n)!.sort(by); inn.get(n)!.sort(by) }

  const all = [...ids].sort(by)
  const starts = [
    ...all.filter((n) => isPlace.has(n) && (tokens.get(n) ?? 0) > 0).sort((a, b) => (tokens.get(b) ?? 0) - (tokens.get(a) ?? 0) || by(a, b)),
    ...all.filter((n) => inn.get(n)!.length === 0 && !((tokens.get(n) ?? 0) > 0)),
    ...all,
  ]
  const state = new Map<NodeId, 0 | 1 | 2>()
  const back = new Set<string>()
  const post: NodeId[] = []
  const dfs = (u: NodeId) => {
    state.set(u, 1)
    for (const v of out.get(u)!) {
      const st = state.get(v) ?? 0
      if (st === 1) back.add(u + '>' + v)
      else if (st === 0) dfs(v)
    }
    state.set(u, 2); post.push(u)
  }
  for (const n of starts) if (!state.get(n)) dfs(n)
  const topo = post.slice().reverse()
  const preds = (n: NodeId) => inn.get(n)!.filter((m) => !back.has(m + '>' + n))

  const layer = new Map<NodeId, number>()
  for (const n of topo) layer.set(n, Math.max(0, ...preds(n).map((m) => layer.get(m)! + 1)))
  // a source that does not start the main thread enters at its consumer (R16)
  for (const n of [...topo].reverse()) {
    if (preds(n).length === 0 && !((tokens.get(n) ?? 0) > 0)) {
      const cons = out.get(n)!.filter((m) => !back.has(n + '>' + m))
      if (cons.length) layer.set(n, Math.min(...cons.map((m) => layer.get(m)!)) - 1)
    }
  }
  const lo = Math.min(...layer.values())
  for (const [n, v] of layer) layer.set(n, v - lo)

  const byLayer = new Map<number, NodeId[]>()
  for (const [n, v] of layer) byLayer.set(v, [...(byLayer.get(v) ?? []), n])
  const cross = new Map<NodeId, number>()
  const pos = new Map<NodeId, Pos>()
  for (const v of [...byLayer.keys()].sort((a, b) => a - b)) {
    const g = byLayer.get(v)!
    const base = new Map(g.map((n) => {
      const ps = preds(n).filter((m) => cross.has(m))
      return [n, ps.length ? ps.reduce((t, m) => t + cross.get(m)!, 0) / ps.length : 0] as const
    }))
    g.sort((a, b) => base.get(a)! - base.get(b)! || by(a, b))
    const sp = spread(g.map((n) => base.get(n)!), BR)
    g.forEach((n, i) => { cross.set(n, sp[i]); pos.set(n, { f: v * G.step, c: sp[i] }) })
  }
  return { pos, back }
}
