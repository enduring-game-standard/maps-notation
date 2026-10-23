import type { NodeId } from '../../engine/net.ts'
import { BAR_LEN, PLACE_R, type ArcRoute, type BarBox, type LabelSpot, type Layout, type PlaceBox, type Pt } from '../../engine/layout.ts'
import { sampleBezier } from '../../engine/geometry.ts'
import { arcKey, type FC, type Graph, type Hint, type Plan, type Side } from './model.ts'
import { labelExtent } from './text.ts'

type V = Pt
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y })
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y })
const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k })
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y
const len = (a: V) => Math.hypot(a.x, a.y)
const unit = (a: V): V => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l } }
const lerp = (a: V, b: V, t: number): V => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

export function draw(g: Graph, plan: Plan): Layout {
  const down = plan.frame === 'down'
  const F: V = down ? { x: 0, y: 1 } : { x: 1, y: 0 }
  const C: V = down ? { x: 1, y: 0 } : { x: 0, y: 1 }
  const xy = (p: FC): V => add(mul(F, p.f), mul(C, p.c))
  const nodes: Layout['nodes'] = {}
  const { net } = g

  for (const p of net.places) { const q = xy(plan.pos.get(p.id)!); nodes[p.id] = { kind: 'place', x: q.x, y: q.y } }
  for (const t of net.transitions) {
    const q = xy(plan.pos.get(t.id)!)
    const dir = plan.bar.get(t.id)!
    const angle = typeof dir === 'object' ? dir.angle : (dir === 'across') === down ? 0 : Math.PI / 2
    const nrm = { x: -Math.sin(angle), y: Math.cos(angle) }
    const faces = [0, 0]
    for (const o of [...g.ins.get(t.id)!, ...g.outs.get(t.id)!]) {
      const r = xy(plan.pos.get(o)!)
      faces[dot(sub(r, q), nrm) >= 0 ? 0 : 1] += 1
    }
    const spread = [...g.ins.get(t.id)!.map((o) => arcKey(o, t.id)), ...g.outs.get(t.id)!.map((o) => arcKey(t.id, o))]
      .filter((k) => { const h = plan.hints.get(k)?.kind; return h === 'free' || h === 'lane' })
      .map((k) => { const o = k.split('>').find((x) => x !== t.id)!; return dot(sub(xy(plan.pos.get(o)!), q), { x: Math.cos(angle), y: Math.sin(angle) }) })
    const fan = spread.length ? Math.min(-Math.min(0, ...spread), Math.max(0, ...spread)) : 0
    const length = Math.max(BAR_LEN, plan.barSpan.get(t.id) ?? 0, Math.max(...faces) * 11 + 8, Math.min(88, fan * 1.1))
    nodes[t.id] = { kind: 'transition', x: q.x, y: q.y, angle, length }
  }

  const arcs: ArcRoute[] = []
  for (const a of net.arcs) {
    const hint = plan.hints.get(arcKey(a.from, a.to)) ?? { kind: 'free', prefer: 1 }
    arcs.push({ ...a, path: route(nodes, a.from, a.to, hint, F, C, net.arcs.some((b) => b.from === a.to && b.to === a.from)) })
  }
  spreadOnBars(nodes, arcs)

  placeLabels(g, plan, nodes, arcs, F, C)
  return { nodes, arcs }
}

function attach(n: PlaceBox | BarBox, toward: V): V {
  const d = sub(toward, n)
  if (n.kind === 'place') { const u = unit(d); return add(n, mul(u, PLACE_R)) }
  const u = { x: Math.cos(n.angle), y: Math.sin(n.angle) }, nrm = { x: -u.y, y: u.x }
  const h = n.length / 2
  const along = Math.max(-h + 3, Math.min(h - 3, dot(d, u)))
  const side = Math.sign(dot(d, nrm)) || 1
  return add(add(n, mul(u, along)), mul(nrm, side * 2))
}

function route(nodes: Layout['nodes'], from: NodeId, to: NodeId, hint: Hint, F: V, C: V, paired: boolean): Pt[] {
  const A = nodes[from], B = nodes[to]
  if (hint.kind === 'lane') { const s = attach(A, B), e = attach(B, A); return [s, lerp(s, e, 1 / 3), lerp(s, e, 2 / 3), e] }
  if (hint.kind === 'loop' && paired) {
    const place = A.kind === 'place' ? A : B
    const ab = sub(B, A), nrm = unit({ x: -ab.y, y: ab.x })
    const sgn = A === place ? 1 : -1
    const c1 = add(lerp(A, B, 1 / 3), mul(nrm, sgn * 16)), c2 = add(lerp(A, B, 2 / 3), mul(nrm, sgn * 16))
    const s = attach(A, c1), e = attach(B, c2)
    return [s, add(lerp(s, e, 1 / 3), mul(nrm, sgn * 14)), add(lerp(s, e, 2 / 3), mul(nrm, sgn * 14)), e]
  }
  if (hint.kind === 'around') return around(nodes, from, to, hint, F, C)
  if (hint.kind === 'ring') return ringArc(A, B, hint.r)
  if (hint.kind === 'petal') {
    const n = mul(unit({ x: -(B.y - A.y), y: B.x - A.x }), hint.side)
    const s = attach(A, add(A, mul(n, 60))), e = add(B, mul(n, PLACE_R))
    return [s, add(s, mul(n, hint.d * 1.4)), add(e, mul(n, hint.d * 1.4)), e]
  }
  return smooth(nodes, from, to, hint.kind === 'free' ? hint.prefer : 1, hint.kind === 'free' ? hint.hook ?? true : true, F, C)
}

function ringArc(A: PlaceBox | BarBox, B: PlaceBox | BarBox, r: number): Pt[] {
  const trim = (n: PlaceBox | BarBox) => (n.kind === 'place' ? PLACE_R : 2) / r
  let a = Math.atan2(A.y, A.x), b = Math.atan2(B.y, B.x)
  while (b <= a) b += 2 * Math.PI
  a += trim(A); b -= trim(B)
  const k = (4 / 3) * Math.tan((b - a) / 4) * r
  const p = (t: number) => ({ x: r * Math.cos(t), y: r * Math.sin(t) }), tg = (t: number) => ({ x: -Math.sin(t), y: Math.cos(t) })
  return [p(a), add(p(a), mul(tg(a), k)), sub(p(b), mul(tg(b), k)), p(b)]
}

function around(nodes: Layout['nodes'], from: NodeId, to: NodeId, h: Extract<Hint, { kind: 'around' }>, F: V, C: V): Pt[] {
  const T = nodes[from], M = nodes[to]
  const fc = (p: V) => ({ f: dot(p, F), c: dot(p, C) })
  const pt = (f: number, c: number) => add(mul(F, f), mul(C, c))
  const t = fc(T), m = fc(M)
  const half = T.kind === 'transition' ? T.length / 2 : PLACE_R
  const out = Math.abs(h.channel - t.c) > half ? Math.sign(h.channel - t.c) : h.side
  const s = T.kind === 'transition' ? { f: t.f + 2, c: t.c + out * (half - 4) } : { f: t.f + PLACE_R * 0.7, c: t.c + h.side * PLACE_R * 0.7 }
  const k1 = Math.max(26, Math.abs(h.channel - s.c) * 0.75)
  const bottom = { f: t.f + 6, c: h.channel }
  const seg1 = [pt(s.f, s.c), pt(s.f + k1, s.c), pt(bottom.f + k1, bottom.c), pt(bottom.f, bottom.c)]
  let seg3: V[]
  if (h.entry === 'before') {
    const k3 = Math.max(26, Math.abs(h.channel - m.c) * 0.75)
    const top = { f: m.f - 6, c: h.channel }
    const a = (h.side * h.shift) / PLACE_R
    const E = { f: m.f - PLACE_R * Math.cos(a), c: m.c + PLACE_R * Math.sin(a) }
    seg3 = [pt(top.f, top.c), pt(top.f - k3, top.c), pt(E.f - k3, E.c), pt(E.f, E.c)]
  } else {
    const k3 = Math.max(30, Math.abs(h.channel - m.c) * 0.6)
    const top = { f: m.f, c: h.channel }
    const d = Math.SQRT1_2
    seg3 = [pt(top.f, top.c), pt(top.f - k3, top.c), pt(m.f - d * (PLACE_R + k3), m.c + h.side * d * (PLACE_R + k3)), pt(m.f - d * PLACE_R, m.c + h.side * d * PLACE_R)]
  }
  const B0 = seg1[3], T0 = seg3[0]
  if (dot(sub(B0, T0), F) <= 2) return [...seg1.slice(0, 2), seg3[2], seg3[3]]
  return [...seg1, lerp(B0, T0, 1 / 3), lerp(B0, T0, 2 / 3), ...seg3]
}

function smooth(nodes: Layout['nodes'], from: NodeId, to: NodeId, prefer: Side, hook: boolean, F: V, C: V): Pt[] {
  const A = nodes[from], B = nodes[to]
  const ab = sub(B, A), dist = len(ab)
  const k = Math.max(24, Math.min(80, dist * 0.42))
  const barEnd = (n: BarBox, other: V, leaving: boolean): { p: V; t: V } => {
    const u = { x: Math.cos(n.angle), y: Math.sin(n.angle) }, nrm = { x: -u.y, y: u.x }
    const h = n.length / 2
    const along = Math.max(-h + 3, Math.min(h - 3, dot(sub(other, n), u)))
    let dir: V
    const rel = sub(other, n)
    if (Math.abs(dot(nrm, F)) > 0.8 && Math.abs(dot(rel, C)) > 2 * Math.abs(dot(rel, F)) + 20) {
      const e = mul(u, Math.sign(dot(rel, u)) || 1)
      const face = mul(nrm, (Math.sign(dot(rel, nrm)) || 1) * 2)
      return { p: add(add(n, mul(e, h - 3)), face), t: leaving ? e : mul(e, -1) }
    }
    if (hook && Math.abs(dot(nrm, F)) > 0.8) dir = mul(nrm, Math.sign(dot(nrm, F)) * (leaving ? 1 : -1))
    else dir = mul(nrm, Math.sign(dot(sub(other, n), nrm)) || 1)
    return { p: add(add(n, mul(u, along)), mul(dir, 2)), t: leaving ? dir : mul(dir, -1) }
  }
  const build = (bow: V): Pt[] => {
    if (A.kind === 'transition' && B.kind === 'place') {
      const s = barEnd(A, B, true)
      const c1 = add(add(s.p, mul(s.t, k)), bow)
      const e = add(B, mul(unit(sub(c1, B)), PLACE_R))
      const c2 = add(add(e, mul(unit(sub(c1, e)), k * 0.6)), bow)
      const e2 = add(B, mul(unit(sub(c2, B)), PLACE_R))
      return [s.p, c1, c2, e2]
    }
    const e = barEnd(B as BarBox, A, false)
    const c2 = add(sub(e.p, mul(e.t, k)), bow)
    const s = add(A, mul(unit(sub(c2, A)), PLACE_R))
    const c1 = add(add(s, mul(unit(sub(c2, s)), k * 0.6)), bow)
    const s2 = add(A, mul(unit(sub(c1, A)), PLACE_R))
    return [s2, c1, c2, e.p]
  }
  const path = build({ x: 0, y: 0 })
  if (!blocked(nodes, path, from, to)) return path
  const nrm = unit({ x: -ab.y, y: ab.x })
  const s0 = (Math.sign(dot(nrm, C)) || 1) * prefer
  for (let amt = 20; amt <= 360; amt += 20) for (const s of [s0, -s0]) {
    const p = build(mul(nrm, s * amt))
    if (!blocked(nodes, p, from, to)) return p
  }
  return path
}

export function blocked(nodes: Layout['nodes'], path: Pt[], from: NodeId, to: NodeId): boolean {
  const pts = sampleBezier(path, 24)
  for (const [id, n] of Object.entries(nodes)) {
    if (id === from || id === to) continue
    if (n.kind === 'place') { if (pts.some((p) => Math.hypot(p.x - n.x, p.y - n.y) < PLACE_R + 3)) return true }
    else if (pts.some((p) => segDist(p, n) < 5)) return true
  }
  return false
}

function segDist(p: V, n: BarBox) {
  const ux = Math.cos(n.angle), uy = Math.sin(n.angle)
  const t = Math.max(-n.length / 2, Math.min(n.length / 2, (p.x - n.x) * ux + (p.y - n.y) * uy))
  return Math.hypot(p.x - (n.x + ux * t), p.y - (n.y + uy * t))
}

function spreadOnBars(nodes: Layout['nodes'], arcs: ArcRoute[]) {
  for (const [id, n] of Object.entries(nodes)) {
    if (n.kind !== 'transition') continue
    const u = { x: Math.cos(n.angle), y: Math.sin(n.angle) }, nrm = { x: -u.y, y: u.x }
    const ends: { a: ArcRoute; i: number; along: number; face: number; dir: number }[] = []
    for (const a of arcs) {
      if (a.from === id) { const p = a.path[0]; ends.push({ a, i: 0, along: dot(sub(p, n), u), face: Math.sign(dot(sub(p, n), nrm)), dir: dot(sub(a.path[1], n), u) }) }
      if (a.to === id) { const k = a.path.length - 1, p = a.path[k]; ends.push({ a, i: k, along: dot(sub(p, n), u), face: Math.sign(dot(sub(p, n), nrm)), dir: dot(sub(a.path[k - 1], n), u) }) }
    }
    const h = n.length / 2 - 3
    for (const face of [-1, 1]) {
      const fs = ends.filter((e) => e.face === face).sort((x, y) => x.along - y.along || x.dir - y.dir)
      if (fs.length < 2) continue
      const gap = Math.min(10, (2 * h) / (fs.length - 1))
      const pos = fs.map((e) => e.along)
      for (let i = 1; i < pos.length; i++) pos[i] = Math.max(pos[i], pos[i - 1] + gap)
      const over = pos[pos.length - 1] - h
      if (over > 0) for (let i = pos.length - 1; i >= 0; i--) { pos[i] -= over; if (i > 0 && pos[i - 1] > pos[i] - gap) continue; else break }
      for (let i = pos.length - 2; i >= 0; i--) pos[i] = Math.min(pos[i], pos[i + 1] - gap)
      fs.forEach((e, k) => {
        const delta = mul(u, pos[k] - e.along)
        e.a.path[e.i] = add(e.a.path[e.i], delta)
        const ci = e.i === 0 ? 1 : e.i - 1
        e.a.path[ci] = add(e.a.path[ci], delta)
      })
    }
  }
}

function placeLabels(g: Graph, plan: Plan, nodes: Layout['nodes'], arcs: ArcRoute[], F: V, C: V) {
  const samples = arcs.map((a) => sampleBezier(a.path, 40))
  const placed = new Map<NodeId, { x0: number; x1: number; y0: number; y1: number }>()
  const ids = Object.keys(nodes).sort(g.byKey)
  for (const id of [...ids, ...ids]) {
    const n = nodes[id]
    const boxes = [...placed].filter(([o]) => o !== id).map(([, b]) => b)
    const { w, h } = labelExtent(g, id)
    const side = plan.labelSide.get(id) ?? 1
    const cands: LabelSpot[] = []
    const off = (v: V, k: number) => add(n, mul(v, k))
    const horiz = (v: V, k: number, s: number): LabelSpot => {
      const p = off(v, k)
      return { x: p.x, y: p.y, anchor: s > 0 ? 'start' : 'end' }
    }
    const vert = (v: V, k: number): LabelSpot => { const p = off(v, k); return { x: p.x, y: p.y + (dot(v, { x: 0, y: 1 }) > 0 ? h / 2 + 2 : -h / 2 + 2), anchor: 'middle' } }
    const ext = n.kind === 'place' ? PLACE_R + 5 : n.length / 2 + 5
    const thin = n.kind === 'place' ? PLACE_R + 5 : 7
    const dir = plan.labelDir?.get(id)
    const across = dir ?? mul(C, side), back = mul(across, -1)
    const Fl = dir ? { x: across.y, y: -across.x } : F
    const isX = (v: V) => Math.abs(v.x) > 0.5
    const pushDir = (v: V, k: number) => cands.push(isX(v) ? horiz(v, k, v.x) : vert(v, k))
    if (n.kind === 'transition') {
      const u = { x: Math.cos(n.angle), y: Math.sin(n.angle) }
      const ends = [u, mul(u, -1)].sort((a, b) => dot(b, across) - dot(a, across))
      pushDir(ends[0], ext); pushDir(ends[1], ext)
      const nrm = { x: -u.y, y: u.x }
      pushDir(nrm, thin); pushDir(mul(nrm, -1), thin)
      for (const e of ends) for (const s of [1, -1]) { const p = add(off(e, ext - 8), mul(nrm, s * 14)); cands.push(isX(e) ? { x: p.x, y: p.y, anchor: e.x > 0 ? 'start' : 'end' } : { x: p.x, y: p.y + (e.y > 0 ? h / 2 + 2 : -h / 2 + 2), anchor: 'middle' }) }
    } else {
      pushDir(across, ext); pushDir(back, ext)
      pushDir(Fl, ext); pushDir(mul(Fl, -1), ext)
      for (const d of [add(across, mul(Fl, -1)), add(across, Fl), add(back, mul(Fl, -1)), add(back, Fl)]) {
        const v = unit(d), p = off(v, PLACE_R + 4)
        cands.push({ x: p.x, y: p.y + (v.y > 0 ? h / 2 : -h / 2 + 4), anchor: v.x > 0 ? 'start' : 'end' })
      }
    }
    const boxOf = (L: LabelSpot) => {
      const x0 = L.anchor === 'start' ? L.x : L.anchor === 'end' ? L.x - w : L.x - w / 2
      const y0 = L.y - h / 2 - 2
      return { x0, x1: x0 + w, y0, y1: y0 + h + 2 }
    }
    const conflicts = (L: LabelSpot) => {
      const b = boxOf(L)
      const hits = (p: V, m: number) => p.x > b.x0 - m && p.x < b.x1 + m && p.y > b.y0 - m && p.y < b.y1 + m
      let k = 0
      for (const o of Object.values(nodes)) {
        if (o.kind === 'place') {
          if (Math.hypot(Math.max(b.x0 - o.x, 0, o.x - b.x1), Math.max(b.y0 - o.y, 0, o.y - b.y1)) < PLACE_R + 2) k += 10
        } else {
          const u = { x: Math.cos(o.angle), y: Math.sin(o.angle) }
          if (Array.from({ length: 9 }, (_, i) => add(o, mul(u, (i / 8 - 0.5) * o.length))).some((p) => hits(p, 2))) k += 10
        }
      }
      for (const pts of samples) { const inside = pts.filter((p) => p.x > b.x0 - 1 && p.x < b.x1 + 1 && p.y > b.y0 - 1 && p.y < b.y1 + 1).length; if (inside) k += inside >= 2 ? 30 : 3 }
      for (const o of boxes) if (o.x0 < b.x1 + 3 && b.x0 < o.x1 + 3 && o.y0 < b.y1 && b.y0 < o.y1) k += 40
      return k
    }
    const near = cands.length
    for (const step of [10, 22]) for (const c of cands.slice(0, near)) {
      const v = unit(sub(c, n))
      cands.push({ ...c, x: c.x + v.x * step, y: c.y + v.y * step })
    }
    let best = cands[0], bestK = Infinity
    for (const c of cands) { const k = conflicts(c); if (k < bestK) { best = c; bestK = k } if (k === 0) break }
    n.label = best
    placed.set(id, boxOf(best))
  }
}
