// PROTOTYPE. The `lanes` convention: x means who speaks. One lane per seat, the world's lane between them.
import type { Net, Design, Drawing, Box, Pt, Element } from '../../harness/contract'
import { arcKey } from '../../harness/contract'

type Arc = Net['arcs'][number]
type Kind = 'S' | 'V' | 'D'
interface Node {
  id: string
  kind: Kind
  col: number
  label: string[]
  under: string
  top: number
  bottom: number
  y: number
  canon: number
  dist: number
  color: string
}
interface ColSpec { kind: 'S' | 'V'; role: string; speaker: string }

const WORLD = 'world'
const WORLD_COLOR = '#3d3d3d'
const R = 9
const BAR_W = 4
const FONT = 11
const LINE = 13
const GAP = 10
const CHAR = 6.1

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const r1 = (x: number) => Math.round(x * 10) / 10

function wrap(s: string, max = 24): string[] {
  const out: string[] = []
  let line = ''
  for (const w of s.split(' ')) {
    if (line && (line + ' ' + w).length > max) { out.push(line); line = w } else line = line ? line + ' ' + w : w
  }
  if (line) out.push(line)
  return out
}

function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0).toString(36)
}

/** Columns left to right: for each left seat its own states, its verbs, its boundary with the world; then the world; then the right seats mirrored. */
function columns(net: Net): ColSpec[] {
  const left = net.seats.filter((_, i) => i % 2 === 0).reverse(), right = net.seats.filter((_, i) => i % 2 === 1)
  const cols: ColSpec[] = []
  for (const s of left) cols.push({ kind: 'S', role: 'own', speaker: s.id }, { kind: 'V', role: 'verbs', speaker: s.id }, { kind: 'S', role: 'edge', speaker: s.id })
  cols.push({ kind: 'V', role: 'wleft', speaker: WORLD }, { kind: 'S', role: 'own', speaker: WORLD }, { kind: 'V', role: 'wright', speaker: WORLD })
  for (const s of right) cols.push({ kind: 'S', role: 'edge', speaker: s.id }, { kind: 'V', role: 'verbs', speaker: s.id }, { kind: 'S', role: 'own', speaker: s.id })
  return cols
}

export function draw(net: Net, opts?: { without?: string[] }): Drawing {
  const off = new Set(opts?.without ?? [])
  const cols = columns(net)
  const colOf = (kind: 'S' | 'V', role: string, speaker: string) => cols.findIndex((c) => c.kind === kind && c.role === role && c.speaker === speaker)
  const worldCol = colOf('S', 'own', WORLD)
  const verbBy = new Map(net.verbs.map((v) => [v.id, v]))
  const seatColor = new Map(net.seats.map((s) => [s.id, s.color]))

  // A state's column is decided by who moves it (take or give) and whether the world reads it. A seat that only reads another seat's state reaches across: that is contact.
  const stateCol = new Map<string, number>()
  for (const s of net.states) {
    const movers = new Set(net.arcs.filter((a) => a.state === s.id && (a.kind === 'take' || a.kind === 'give' || verbBy.get(a.verb)!.by === WORLD)).map((a) => verbBy.get(a.verb)!.by))
    const who = movers.size ? movers : new Set(net.arcs.filter((a) => a.state === s.id).map((a) => verbBy.get(a.verb)!.by))
    const seats = [...who].filter((w) => w !== WORLD)
    if (off.has('boundary-states')) stateCol.set(s.id, worldCol)
    else if (seats.length === 1 && who.has(WORLD)) stateCol.set(s.id, colOf('S', 'edge', seats[0]))
    else if (seats.length === 1) stateCol.set(s.id, colOf('S', 'own', seats[0]))
    else stateCol.set(s.id, worldCol)
  }
  // A world verb sits on the side of the world's lane it reads from, so its answer lands next to the seat it answers.
  const verbCol = new Map<string, number>()
  for (const v of net.verbs) {
    if (off.has('lane-columns')) { verbCol.set(v.id, colOf('V', 'wleft', WORLD)); continue }
    if (v.by !== WORLD) { verbCol.set(v.id, colOf('V', 'verbs', v.by)); continue }
    let l = 0, r = 0
    for (const a of net.arcs) if (a.verb === v.id) {
      const c = stateCol.get(a.state)!, w = a.kind === 'give' ? 1 : 2
      if (c < worldCol) l += w; else if (c > worldCol) r += w
    }
    verbCol.set(v.id, colOf('V', l > r ? 'wleft' : 'wright', WORLD))
  }

  // Structural fingerprint (color refinement) so ties are broken by structure, never by input order.
  const nodesBase = [...net.states.map((s) => s.id), ...net.verbs.map((v) => v.id)]
  let color = new Map<string, string>()
  for (const s of net.states) color.set(s.id, hash(`S|${s.marks}|${s.ends ? 1 : 0}|${s.seenBy === 'all' ? 'a' : (s.seenBy as string[]).length}|${stateCol.get(s.id)}`))
  for (const v of net.verbs) color.set(v.id, hash(`V|${v.by === WORLD ? 'w' : net.seats.findIndex((s) => s.id === v.by)}|${v.priority}|${v.weight}|${verbCol.get(v.id)}`))
  for (let round = 0, classes = new Set(color.values()).size; round < nodesBase.length; round++) {
    const next = new Map<string, string>()
    for (const id of nodesBase) {
      const sig = net.arcs.filter((a) => a.state === id || a.verb === id).map((a) => `${a.kind}${a.count}${a.state === id ? '<' : '>'}${color.get(a.state === id ? a.verb : a.state)}`).sort().join(',')
      next.set(id, hash(color.get(id) + '#' + sig))
    }
    color = next
    const now = new Set(color.values()).size
    if (now === classes) break
    classes = now
  }
  const labelOf = new Map<string, string>([...net.states.map((s) => [s.id, s.label] as [string, string]), ...net.verbs.map((v) => [v.id, v.label] as [string, string])])
  const canonSorted = [...nodesBase].sort((a, b) => (color.get(a)! < color.get(b)! ? -1 : color.get(a)! > color.get(b)! ? 1 : labelOf.get(a)! < labelOf.get(b)! ? -1 : labelOf.get(a)! > labelOf.get(b)! ? 1 : a < b ? -1 : 1))
  const canon = new Map(canonSorted.map((id, i) => [id, i]))

  // Distance from the starting marks along the flow, so the opening of play sits at the top.
  const dist = new Map<string, number>()
  const queue: string[] = net.states.filter((s) => s.marks > 0).map((s) => s.id).sort((a, b) => canon.get(a)! - canon.get(b)!)
  queue.forEach((id) => dist.set(id, 0))
  for (const v of net.verbs) if (!net.arcs.some((a) => a.verb === v.id && (a.kind === 'take' || a.kind === 'need'))) { dist.set(v.id, 1); queue.push(v.id) }
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi], d = dist.get(id)!
    const outs = net.arcs.filter((a) => (a.state === id && a.kind !== 'give') || (a.verb === id && a.kind === 'give')).map((a) => (a.state === id ? a.verb : a.state)).sort((a, b) => canon.get(a)! - canon.get(b)!)
    for (const o of outs) if (!dist.has(o)) { dist.set(o, d + 1); queue.push(o) }
  }

  const nodes = new Map<string, Node>()
  for (const s of net.states) {
    const lab = wrap(s.label)
    if (s.ends) lab.push(...wrap('ends: ' + s.ends))
    if (s.seenBy !== 'all') lab.push(s.seenBy.length ? `seen by ${s.seenBy.join(', ')}` : 'seen by no seat')
    nodes.set(s.id, { id: s.id, kind: 'S', col: stateCol.get(s.id)!, label: off.has('labels') ? [] : lab, under: '', top: 0, bottom: 0, y: 0, canon: canon.get(s.id)!, dist: dist.get(s.id) ?? 99, color: '#222' })
  }
  for (const v of net.verbs) {
    const under = v.by === WORLD && !off.has('priority') ? `${v.priority}${v.weight > 1 ? ` ×${v.weight}` : ''}` : ''
    nodes.set(v.id, { id: v.id, kind: 'V', col: verbCol.get(v.id)!, label: off.has('labels') ? [] : wrap(v.label), under, top: 0, bottom: 0, y: 0, canon: canon.get(v.id)!, dist: dist.get(v.id) ?? 99, color: off.has('speaker-color') ? '#222' : v.by === WORLD ? WORLD_COLOR : seatColor.get(v.by) ?? '#222' })
  }

  // Each arc is a chain through every column it crosses; a placeholder in each crossed column keeps a clear channel open.
  const arcs = [...net.arcs].sort((a, b) => canon.get(a.state)! - canon.get(b.state)! || canon.get(a.verb)! - canon.get(b.verb)! || (a.kind < b.kind ? -1 : 1))
  const chains = new Map<Arc, string[]>()
  for (const a of arcs) {
    const cs = nodes.get(a.state)!.col, cv = nodes.get(a.verb)!.col
    const chain = [a.state]
    const step = cv > cs ? 1 : -1
    for (let c = cs + step; c !== cv; c += step) {
      const id = `~${arcKey(a)}~${c}`
      nodes.set(id, { id, kind: 'D', col: c, label: [], under: '', top: 4, bottom: 4, y: 0, canon: 1e6 + canon.get(a.state)! * 1000 + canon.get(a.verb)!, dist: Math.min(dist.get(a.state) ?? 99, dist.get(a.verb) ?? 99), color: '' })
      chain.push(id)
    }
    chain.push(a.verb)
    chains.set(a, chain)
  }
  const nbr = new Map<string, { id: string; w: number }[]>()
  for (const n of nodes.keys()) nbr.set(n, [])
  const deg = new Map<string, number>()
  for (const a of arcs) { deg.set(a.state, (deg.get(a.state) ?? 0) + 1); deg.set(a.verb, (deg.get(a.verb) ?? 0) + 1) }
  // A hub says little about where any one of its neighbors belongs, so a neighbor pulls in proportion to 1 / its degree.
  // A real node feels a long arc with the pull of the node at its far end; the gaps along it just keep it straight.
  for (const chain of chains.values()) {
    const toVerb = 1 / deg.get(chain[chain.length - 1])!, toState = 1 / deg.get(chain[0])!
    for (let i = 0; i < chain.length - 1; i++) {
      nbr.get(chain[i])!.push({ id: chain[i + 1], w: i === 0 ? toVerb : 1 }); nbr.get(chain[i + 1])!.push({ id: chain[i], w: i + 1 === chain.length - 1 ? toState : 1 })
    }
  }

  // Bar height grows with the arcs that meet each side.
  const sideCount = new Map<string, [number, number]>()
  for (const chain of chains.values()) {
    const v = chain[chain.length - 1], prev = nodes.get(chain[chain.length - 2])!
    const sc = sideCount.get(v) ?? [0, 0]
    sc[prev.col < nodes.get(v)!.col ? 0 : 1]++
    sideCount.set(v, sc)
  }
  const barH = (id: string) => Math.max(18, Math.max(...(sideCount.get(id) ?? [0, 0])) * 7 + 6)
  for (const n of nodes.values()) {
    if (n.kind === 'D') continue
    const body = n.kind === 'S' ? R : barH(n.id) / 2
    n.top = body + (n.label.length ? n.label.length * LINE + 2 : 0)
    n.bottom = body + (n.under ? LINE : 0)
  }

  // Order within each column: start by distance from the marks, then sweep so each node sits level with its neighbors.
  const byCol: string[][] = cols.map(() => [])
  for (const n of [...nodes.values()].sort((a, b) => a.dist - b.dist || a.canon - b.canon)) byCol[n.col].push(n.id)
  const pos = new Map<string, number>()
  const index = () => byCol.forEach((c) => c.forEach((id, i) => pos.set(id, i)))
  index()
  const crossings = () => {
    let x = 0
    for (let c = 0; c < cols.length - 1; c++) {
      const segs: [number, number][] = []
      for (const id of byCol[c]) for (const e of nbr.get(id)!) if (nodes.get(e.id)!.col === c + 1) segs.push([pos.get(id)!, pos.get(e.id)!])
      for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) if ((segs[i][0] - segs[j][0]) * (segs[i][1] - segs[j][1]) < 0) x++
    }
    return x
  }
  const pairCross = (u: string, v: string) => {
    let x = 0
    for (const e of nbr.get(u)!) for (const f of nbr.get(v)!) if (nodes.get(e.id)!.col === nodes.get(f.id)!.col && pos.get(e.id)! > pos.get(f.id)!) x++
    return x
  }
  const transpose = () => {
    for (let it = 0, changed = true; it < 20 && changed; it++) {
      changed = false
      for (const c of byCol) for (let i = 0; i < c.length - 1; i++) {
        if (pairCross(c[i + 1], c[i]) < pairCross(c[i], c[i + 1])) { [c[i], c[i + 1]] = [c[i + 1], c[i]]; pos.set(c[i], i); pos.set(c[i + 1], i + 1); changed = true }
      }
    }
  }
  transpose()
  let best = byCol.map((c) => [...c]), bestX = crossings()
  for (let it = 0; it < 32; it++) {
    const down = it % 2 === 0
    const order = down ? cols.map((_, i) => i) : cols.map((_, i) => cols.length - 1 - i)
    for (const c of order) {
      const ref = down ? c - 1 : c + 1
      const bary = new Map<string, number>()
      for (const id of byCol[c]) {
        const ns = nbr.get(id)!.filter((e) => nodes.get(e.id)!.col === ref)
        bary.set(id, ns.length ? ns.reduce((s, e) => s + pos.get(e.id)!, 0) / ns.length : pos.get(id)!)
      }
      byCol[c].sort((a, b) => bary.get(a)! - bary.get(b)! || pos.get(a)! - pos.get(b)!)
      byCol[c].forEach((id, i) => pos.set(id, i))
    }
    transpose()
    const x = crossings()
    if (x < bestX) { bestX = x; best = byCol.map((cc) => [...cc]) }
  }
  best.forEach((c, i) => (byCol[i] = c))
  index()

  // Heights: each node moves toward the mean height of its neighbors, keeping its column's order and spacing.
  const sep = (a: Node, b: Node) => a.bottom + b.top + (a.kind === 'D' && b.kind === 'D' ? 2 : a.kind === 'D' || b.kind === 'D' ? 7 : GAP)
  for (const c of byCol) { let y = 0; c.forEach((id, i) => { const n = nodes.get(id)!; if (i) y += sep(nodes.get(c[i - 1])!, n); n.y = y }) }
  const settle = (c: string[]) => {
    if (!c.length) return
    const offs: number[] = [0]
    for (let i = 1; i < c.length; i++) offs.push(offs[i - 1] + sep(nodes.get(c[i - 1])!, nodes.get(c[i])!))
    const blocks: { sum: number; w: number; n: number }[] = []
    c.forEach((id, i) => {
      const n = nodes.get(id)!, ns = nbr.get(id)!
      const wsum = ns.reduce((s, e) => s + e.w, 0)
      const d = wsum ? ns.reduce((s, e) => s + nodes.get(e.id)!.y * e.w, 0) / wsum : n.y
      const w = wsum || 0.01
      blocks.push({ sum: (d - offs[i]) * w, w, n: 1 })
      while (blocks.length > 1 && blocks[blocks.length - 2].sum / blocks[blocks.length - 2].w > blocks[blocks.length - 1].sum / blocks[blocks.length - 1].w) {
        const b = blocks.pop()!, a = blocks[blocks.length - 1]
        a.sum += b.sum; a.w += b.w; a.n += b.n
      }
    })
    let i = 0
    for (const b of blocks) { const z = b.sum / b.w; for (let k = 0; k < b.n; k++, i++) nodes.get(c[i])!.y = z + offs[i] }
  }
  for (let it = 0; it < 40; it++) {
    const order = it % 2 === 0 ? byCol : [...byCol].reverse()
    for (const c of order) settle(c)
  }

  // Column x positions from the widest label in each column.
  const textW = (n: Node) => Math.max(0, ...n.label.map((l) => l.length * CHAR))
  const colW = byCol.map((c) => {
    const real = c.map((id) => nodes.get(id)!).filter((n) => n.kind !== 'D')
    if (!real.length) return c.length ? 24 : 0
    return Math.max(2 * R, ...real.map(textW))
  })
  const HEAD = off.has('lane-headers') ? 16 : 40, M = 24, CG = 64
  const colX: number[] = []
  let x = M
  const hasReal = byCol.map((c) => c.some((id) => nodes.get(id)!.kind !== 'D'))
  colW.forEach((w, i) => {
    if (w === 0) { colX.push(x); return }
    if (colW.slice(0, i).some((v) => v > 0)) x += hasReal[i] && hasReal.slice(0, i).some(Boolean) ? CG : CG / 3
    colX.push(x + w / 2); x += w
  })
  const width = x + M
  let minY = Infinity, maxY = -Infinity
  for (const n of nodes.values()) { minY = Math.min(minY, n.y - n.top); maxY = Math.max(maxY, n.y + n.bottom) }
  const dy = HEAD + M - minY
  for (const n of nodes.values()) n.y = r1(n.y + dy)
  const height = Math.ceil(maxY + dy + M)
  const X = (id: string) => colX[nodes.get(id)!.col]

  // Arc attachment: arcs meeting a bar side are spread down that side in the order of where they come from.
  const attach = new Map<string, number>()
  for (const v of net.verbs) {
    for (const side of [0, 1]) {
      const here = arcs.filter((a) => a.verb === v.id).map((a) => ({ a, prev: chains.get(a)![chains.get(a)!.length - 2] })).filter(({ prev }) => (nodes.get(prev)!.col < nodes.get(v.id)!.col ? 0 : 1) === side)
      here.sort((p, q) => nodes.get(p.prev)!.y - nodes.get(q.prev)!.y || canon.get(p.a.state)! - canon.get(q.a.state)!)
      here.forEach(({ a }, k) => attach.set(arcKey(a), nodes.get(v.id)!.y + (k - (here.length - 1) / 2) * 7))
    }
  }

  // Arcs meeting a circle are spread around its facing side in the same order, so arrowheads and dots never pile up.
  const sAttach = new Map<string, Pt>()
  for (const st of net.states) {
    for (const side of [-1, 1]) {
      const here = arcs.filter((a) => a.state === st.id).filter((a) => Math.sign(X(chains.get(a)![1]) - X(st.id)) === side)
      here.sort((p, q) => nodes.get(chains.get(p)![1])!.y - nodes.get(chains.get(q)![1])!.y || canon.get(p.verb)! - canon.get(q.verb)!)
      const span = Math.min(1.1, 0.28 * (here.length - 1))
      here.forEach((a, k) => {
        const t = here.length > 1 ? -span / 2 + (span * k) / (here.length - 1) : 0
        sAttach.set(arcKey(a), { x: X(st.id) + side * R * Math.cos(t), y: nodes.get(st.id)!.y + R * Math.sin(t) })
      })
    }
  }

  const svg: string[] = []
  const layoutNodes: Record<string, Box> = {}, layoutArcs: Record<string, Pt[]> = {}

  // Lanes: a faint tint per seat lane, and a header naming each speaker.
  const seatLanes = net.seats.map((s) => {
    const own = colOf('S', 'own', s.id), edge = colOf('S', 'edge', s.id)
    const lo = Math.min(own, edge), hi = Math.max(own, edge)
    const outer = own < edge ? 0 : width
    const x0 = Math.min(outer, colX[edge]), x1 = Math.max(outer, colX[edge])
    return { s, lo, hi, x0, x1, verbX: colX[colOf('V', 'verbs', s.id)] }
  })
  if (!off.has('lane-tint')) for (const l of seatLanes) svg.push(`<rect x="${r1(l.x0)}" y="0" width="${r1(l.x1 - l.x0)}" height="${height}" fill="${l.s.color}" fill-opacity="0.07"/>`)
  if (!off.has('lane-headers')) {
    for (const l of seatLanes) svg.push(`<text x="${r1(l.verbX)}" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="${l.s.color}">${esc(l.s.name)}</text>`)
    const wl = colX[colOf('V', 'wleft', WORLD)], wr = colX[colOf('V', 'wright', WORLD)]
    svg.push(`<text x="${r1((wl + wr) / 2)}" y="22" text-anchor="middle" font-size="13" font-weight="700" fill="${WORLD_COLOR}">World</text>`)
  }

  // Arcs first, so nodes sit on top of them.
  for (const a of arcs) {
    const chain = chains.get(a)!
    const via = off.has('channels') ? [chain[0], chain[chain.length - 1]] : chain.filter((id, i) => i === 0 || i === chain.length - 1 || hasReal[nodes.get(id)!.col])
    const pts: Pt[] = via.map((id) => ({ x: X(id), y: nodes.get(id)!.y }))
    const sSide = Math.sign(pts[1].x - pts[0].x), vSide = Math.sign(pts[pts.length - 2].x - pts[pts.length - 1].x)
    pts[0] = sAttach.get(arcKey(a))!
    pts[pts.length - 1] = { x: pts[pts.length - 1].x + vSide * BAR_W / 2, y: attach.get(arcKey(a))! }
    const poly: Pt[] = [pts[0]]
    let d = `M${r1(pts[0].x)},${r1(pts[0].y)}`
    // Level where it leaves, where it arrives, and through each gap it crosses, so it never clips a node beside the gap.
    const n = pts.length - 1
    const tan = pts.map((p, i) => i === 0 ? { x: 1.5 * (pts[1].x - p.x), y: 0 } : i === n ? { x: 1.5 * (p.x - pts[n - 1].x), y: 0 } : { x: (pts[i + 1].x - pts[i - 1].x) / 2, y: 0 })
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[i + 1]
      const c1 = { x: p.x + tan[i].x / 3, y: p.y + tan[i].y / 3 }, c2 = { x: q.x - tan[i + 1].x / 3, y: q.y - tan[i + 1].y / 3 }
      d += ` C${r1(c1.x)},${r1(c1.y)} ${r1(c2.x)},${r1(c2.y)} ${r1(q.x)},${r1(q.y)}`
      for (let t = 1; t <= 8; t++) {
        const u = t / 8, m = 1 - u
        poly.push({ x: r1(m * m * m * p.x + 3 * m * m * u * c1.x + 3 * m * u * u * c2.x + u * u * u * q.x), y: r1(m * m * m * p.y + 3 * m * m * u * c1.y + 3 * m * u * u * c2.y + u * u * u * q.y) })
      }
    }
    layoutArcs[arcKey(a)] = poly
    const stroke = a.kind === 'need' || a.kind === 'unless' ? '#777' : '#333'
    svg.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.1"/>`)
    const end = pts[pts.length - 1], start = pts[0]
    if (!off.has('arc-ends')) {
      if (a.kind === 'take') svg.push(`<path d="M${r1(end.x)},${r1(end.y)} l${r1(vSide * 7)},-3.5 l0,7 z" fill="#333"/>`)
      if (a.kind === 'give') svg.push(`<path d="M${r1(start.x)},${r1(start.y)} l${r1(sSide * 7)},-3.5 l0,7 z" fill="#333"/>`)
      if (a.kind === 'need') svg.push(`<circle cx="${r1(end.x + vSide * 3)}" cy="${r1(end.y)}" r="2.8" fill="#333"/>`)
      if (a.kind === 'unless') svg.push(`<circle cx="${r1(end.x + vSide * 3.5)}" cy="${r1(end.y)}" r="3" fill="#fff" stroke="#333" stroke-width="1.2"/>`)
    }
    if (a.count > 1 && !off.has('counts')) svg.push(`<text x="${r1(end.x + vSide * 15)}" y="${r1(end.y + 3.5)}" text-anchor="middle" font-size="10" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke" fill="#000">${a.count}</text>`)
  }

  for (const n of nodes.values()) {
    if (n.kind === 'D') continue
    const cx = X(n.id), cy = n.y
    if (n.kind === 'S') {
      const s = net.states.find((t) => t.id === n.id)!
      layoutNodes[n.id] = { x: cx, y: cy, w: 2 * R, h: 2 * R }
      const hidden = s.seenBy !== 'all' && !off.has('hidden-dash')
      svg.push(`<circle cx="${r1(cx)}" cy="${cy}" r="${R}" fill="#fff" stroke="#222" stroke-width="1.4"${hidden ? ' stroke-dasharray="3 2"' : ''}/>`)
      if (s.ends && !off.has('outcome-ring')) svg.push(`<circle cx="${r1(cx)}" cy="${cy}" r="${R - 3}" fill="none" stroke="#222" stroke-width="1"/>`)
      if (!off.has('marks')) {
        if (s.marks === 1) svg.push(`<circle cx="${r1(cx)}" cy="${cy}" r="3" fill="#222"/>`)
        if (s.marks > 1) svg.push(`<text x="${r1(cx)}" y="${r1(cy + 4)}" text-anchor="middle" font-size="11" font-weight="700">${s.marks}</text>`)
      }
    } else {
      const h = barH(n.id)
      layoutNodes[n.id] = { x: cx, y: cy, w: BAR_W, h }
      if (off.has('bars')) svg.push(`<rect x="${r1(cx - 7)}" y="${r1(cy - 7)}" width="14" height="14" rx="3" fill="#fff" stroke="${n.color}" stroke-width="1.5"/>`)
      else svg.push(`<rect x="${r1(cx - BAR_W / 2)}" y="${r1(cy - h / 2)}" width="${BAR_W}" height="${h}" fill="${n.color}"/>`)
      if (n.under) svg.push(`<text x="${r1(cx)}" y="${r1(cy + h / 2 + 11)}" text-anchor="middle" font-size="9.5" fill="#666">${esc(n.under)}</text>`)
    }
    const bodyTop = n.kind === 'S' ? R : barH(n.id) / 2
    n.label.forEach((l, i) => svg.push(`<text x="${r1(cx)}" y="${r1(cy - bodyTop - 4 - (n.label.length - 1 - i) * LINE)}" text-anchor="middle" font-size="${FONT}" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke" fill="${n.kind === 'V' ? n.color : '#222'}">${esc(l)}</text>`))
  }

  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif">${svg.join('')}</svg>`
  return { svg: out, width, height, layout: { nodes: layoutNodes, arcs: layoutArcs } }
}

const elements: Element[] = [
  { id: 'lane-columns', what: 'Each verb in the column of its speaker; seat lanes outside, the world lane in the middle.', purpose: 'Who speaks a verb is read from where it is, before any label.', serves: ['conversation', 'compare-shape'] },
  { id: 'boundary-states', what: 'A state sits in the lane of whoever touches it; one touched by a seat and the world sits on their shared edge; one moved by two seats sits in the world lane. A seat reading another seat\'s state does not count.', purpose: 'Shows which speakers hand an entity back and forth, and keeps an entity\'s states in one column.', serves: ['entity', 'conversation', 'compare-shape'] },
  { id: 'lane-tint', what: 'A faint wash of the seat color over each seat lane, ending at the boundary column.', purpose: 'Marks where a lane ends, so boundary states read as shared and interior states as private.', serves: ['conversation', 'readable'] },
  { id: 'lane-headers', what: 'The seat name, and "World", above each lane.', purpose: 'Names the speaker of every verb in that lane once.', serves: ['conversation'] },
  { id: 'speaker-color', what: 'Verb bars and labels in the speaker color; world verbs dark gray.', purpose: 'A second cue for who speaks, for a verb far from its header.', serves: ['conversation'] },
  { id: 'bars', what: 'A verb is a thin vertical bar with its label above.', purpose: 'Petri transition; arcs meet its sides, so it never hides a line.', serves: ['readable', 'napkin'] },
  { id: 'priority', what: 'The priority under each world verb, and ×weight when the weight is above 1.', purpose: 'The order in which the world answers, and the odds of a chance tie.', serves: ['conversation', 'counts', 'possibility'] },
  { id: 'arc-ends', what: 'take: arrowhead into the bar; give: arrowhead into the circle; need: dot at the bar; unless: ring at the bar. Reads are gray.', purpose: 'Separates what a verb consumes, produces, and only checks.', serves: ['possibility', 'contact', 'actionable'] },
  { id: 'counts', what: 'An arc count above 1 printed next to the bar end of the arc.', purpose: 'Counts are on the map.', serves: ['counts', 'actionable'] },
  { id: 'marks', what: 'One starting mark is a dot; more are a numeral in the circle.', purpose: 'Shows where play starts.', serves: ['possibility', 'counts'] },
  { id: 'outcome-ring', what: 'An outcome state is a double circle, with the result it ends in under its label.', purpose: 'Where the conversation ends.', serves: ['possibility', 'conversation'] },
  { id: 'hidden-dash', what: 'A state not seen by every seat has a dashed outline and says who sees it.', purpose: 'Hidden information is visible as such.', serves: ['possibility'] },
  { id: 'channels', what: 'An arc that crosses a column passes through a gap kept open for it there.', purpose: 'Contact arcs cross lanes without running through any node.', serves: ['contact', 'readable'] },
  { id: 'labels', what: 'Each node\'s label above it.', purpose: 'Comparison by name.', serves: ['compare-name', 'actionable'] },
]

export const design: Design = {
  id: 'lanes',
  title: 'Lanes: who speaks, left to right',
  idea: 'Bura folds a game by seat; Crawford has two parties. Each seat gets a lane, the world gets the lane between them, and every verb sits in its speaker\'s lane. A state sits in the lane of whoever moves it, or on the edge between a seat and the world when both do, so turn-taking shows as states on lane edges and contact shows as a gray read arc reaching across a lane.',
  rules: [
    'Draw a vertical lane per seat: the first seat on the left, the second on the right. The world\'s lane goes between them, or on the right when there is one seat.',
    'A seat\'s lane has three columns, outside in: states only that seat touches, the seat\'s verbs, and states the seat shares with the world (its edge).',
    'The world\'s lane has three columns: world verbs facing the left seat, states only the world touches (or that two seats both move), world verbs facing the right.',
    'A speaker touches a state when one of its verbs takes or gives it, or, for the world, needs it or is blocked by it. A seat verb that only reads another seat\'s state does not move that state: its arc reaches across the lanes, and that is contact.',
    'A world verb faces the side it reads from more (take, need, unless count 2, give counts 1). A tie, or no seat side, faces right.',
    'In each column, start with the states that hold marks, then what they lead to, then what that leads to.',
    'Reorder each column so its nodes follow the order of their neighbors in the column before, to remove crossings; then go back the other way. Repeat a few times, swapping neighbors that cross less swapped.',
    'Slide each node up or down toward the mean height of what it connects to, keeping each column\'s order and spacing. A busy node pulls weakly: one over its number of arcs.',
    'An arc that skips columns passes through a gap you leave for it in each column it crosses.',
    'Verb: a thin vertical bar in the speaker\'s color, label above, priority below a world verb (×weight if above 1). Arcs meet its sides, spread in the order they come from.',
    'State: a circle with a dot for one mark or a numeral for more, double for an outcome (its result under the label), dashed if hidden (who sees it under the label).',
    'Arcs are smooth curves, level where they leave and arrive: take ends in an arrow at the bar, give in an arrow at the circle, need in a dot, unless in a ring; reads are gray. Print a count above 1 at the bar end.',
  ],
  elements,
  axes: {
    x: 'who speaks: one lane per seat, the world lane between them, states on the lane edges they are handed across',
    y: 'none: the order and height that keep arcs level and uncrossed, starting marks first',
    placement: 'column by speaker and by who touches the state; height by crossing reduction, then the mean height of neighbors',
    verb: 'thin vertical bar in the speaker color, label above, priority below',
    speaker: 'the lane the verb sits in, its header, and the bar color',
    entity: 'an entity\'s states share one column, the lane or edge of whoever moves them',
    routing: 'smooth horizontal curves between adjacent columns; long arcs pass through reserved gaps',
    unit: 'one whole net',
  },
  draw,
}
