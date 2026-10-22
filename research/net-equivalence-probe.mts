// Probes behind research/net-equivalence.md. From studio/: npx tsx ../research/net-equivalence-probe.mts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')
const { parse } = await import(`${ROOT}/studio/src/core/text.ts`)
const { analyze } = await import(`${ROOT}/studio/src/core/analyze.ts`)
const { WORLD } = await import(`${ROOT}/studio/src/core/model.ts`)
type Net = any

const ttt: Net = parse(readFileSync(`${ROOT}/examples/tic-tac-toe.maps`, 'utf8'))
console.log(`tic-tac-toe: ${ttt.states.length} states, ${ttt.verbs.length} verbs, ${ttt.arcs.length} arcs`)

// ---------- 1. Incidence matrix and invariants (Murata 1989 sec. V-B, VIII) ----------
type Q = [bigint, bigint]
const g = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : g(b, a % b))
const q = (n: bigint, d: bigint = 1n): Q => { if (d < 0n) { n = -n; d = -d } const k = g(n, d) || 1n; return [n / k, d / k] }
const sub = (a: Q, b: Q): Q => q(a[0] * b[1] - b[0] * a[1], a[1] * b[1])
const mul = (a: Q, b: Q): Q => q(a[0] * b[0], a[1] * b[1])
const div = (a: Q, b: Q): Q => q(a[0] * b[1], a[1] * b[0])
const rank = (rows: number[][]): number => {
  const m = rows.map((r) => r.map((x) => q(BigInt(x))))
  let r = 0
  for (let c = 0; c < (m[0]?.length ?? 0) && r < m.length; c++) {
    const p = m.findIndex((row, i) => i >= r && row[c][0] !== 0n)
    if (p < 0) continue
    ;[m[r], m[p]] = [m[p], m[r]]
    for (let i = 0; i < m.length; i++) if (i !== r && m[i][c][0] !== 0n) {
      const f = div(m[i][c], m[r][c])
      m[i] = m[i].map((x, j) => sub(x, mul(f, m[r][j])))
    }
    r++
  }
  return r
}
const incidence = (net: Net) => {
  const P = net.states.map((s: any) => s.id), T = net.verbs.map((v: any) => v.id)
  const C = P.map(() => T.map(() => 0))
  for (const a of net.arcs) {
    const i = P.indexOf(a.state), j = T.indexOf(a.verb)
    if (a.kind === 'take') C[i][j] -= a.count
    if (a.kind === 'give') C[i][j] += a.count
  }
  return { P, T, C }
}
{
  const { P, T, C } = incidence(ttt)
  const rk = rank(C)
  const invisible = ttt.arcs.filter((a: any) => a.kind === 'need' || a.kind === 'unless').length
  console.log(`\n[1] incidence matrix ${P.length}x${T.length}, rank ${rk}`)
  console.log(`    independent S-invariants (|P|-rank): ${P.length - rk}; T-invariant space dim (|T|-rank): ${T.length - rk}`)
  console.log(`    need/unless arcs, which contribute 0 to the matrix: ${invisible} of ${ttt.arcs.length}`)
  const col = (t: string) => C.map((r) => r[T.indexOf(t)]).join(',')
  const xLines = T.filter((t: string) => t.startsWith('x_line_'))
  console.log(`    distinct incidence columns among the 8 "X has a line" verbs: ${new Set(xLines.map(col)).size}`)
  // candidate invariants checked on every reachable position
  const a = analyze(ttt)
  const inv: [string, (m: any) => number][] = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i): [string, (m: any) => number] => [`empty_${i}+x_${i}+o_${i}`, (m) => m[`empty_${i}`] + m[`x_${i}`] + m[`o_${i}`]]),
    ['turn token: x_to_move+o_to_move+judge_x+judge_o+x_won+o_won+drawn', (m) => m.x_to_move + m.o_to_move + m.judge_x + m.judge_o + m.x_won + m.o_won + m.drawn],
    ['squares_left+sum(x_i+o_i)', (m) => m.squares_left + [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((s, i) => s + m[`x_${i}`] + m[`o_${i}`], 0)],
  ]
  for (const [name, f] of inv) {
    const vals = new Set([...a.nodes.values()].map((n: any) => f(n.marking)))
    console.log(`    ${name}: values over ${a.nodes.size} reachable positions = {${[...vals]}}`)
  }
  // flow check (Jensen Def 7.1(i)): y^T C = 0
  for (const [name, y] of [
    ['square 5', P.map((p: string) => (['empty_5', 'x_5', 'o_5'].includes(p) ? 1 : 0))],
    ['turn token', P.map((p: string) => (['x_to_move', 'o_to_move', 'judge_x', 'judge_o', 'x_won', 'o_won', 'drawn'].includes(p) ? 1 : 0))],
  ] as [string, number[]][]) {
    const flow = T.every((_: any, j: number) => P.reduce((s: number, _p: any, i: number) => s + y[i] * C[i][j], 0) === 0)
    console.log(`    ${name} is a place flow (y·C = 0): ${flow}`)
  }
}

// ---------- 2. Symmetry (Jensen 1996; Jensen 1993 sec. 6) ----------
const D4: number[][] = (() => {
  const rot = [7, 4, 1, 8, 5, 2, 9, 6, 3], refl = [3, 2, 1, 6, 5, 4, 9, 8, 7]
  const compose = (a: number[], b: number[]) => a.map((x) => b[x - 1])
  const id = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const out: number[][] = []
  let r = id
  for (let k = 0; k < 4; k++) { out.push(r, compose(r, refl)); r = compose(r, rot) }
  return out
})()
const mapId = (perm: number[], id: string) => id.replace(/_(\d)$/, (_, d) => `_${perm[+d - 1]}`).replace(/_line_(\d{3})$/, (_, ds) => `_line_${[...ds].map((d: string) => perm[+d - 1]).sort().join('')}`)
{
  const arcKey = (a: any) => `${a.kind}|${a.state}|${a.verb}|${a.count}`
  const arcs = new Set(ttt.arcs.map(arcKey))
  const verbIds = new Set(ttt.verbs.map((v: any) => v.id))
  let autos = 0
  for (const p of D4) {
    const ok = ttt.arcs.every((a: any) => arcs.has(arcKey({ ...a, state: mapId(p, a.state), verb: mapId(p, a.verb) }))) && ttt.verbs.every((v: any) => verbIds.has(mapId(p, v.id)))
    if (ok) autos++
  }
  console.log(`\n[2] board symmetries that are automorphisms of the net (static check): ${autos} of ${D4.length}`)
  const a = analyze(ttt)
  const P = ttt.states.map((s: any) => s.id)
  const canon = (m: any) => D4.map((p) => P.map((s: string) => m[mapId(p, s)]).join(',')).sort()[0]
  const orbits = new Set([...a.nodes.values()].map((n: any) => canon(n.marking)))
  const endOrbits = new Set([...a.nodes.values()].filter((n: any) => n.outcome).map((n: any) => canon(n.marking)))
  console.log(`    reachable positions ${a.nodes.size} -> symmetry classes ${orbits.size} (endings ${[...a.outcomes.values()].reduce((x: number, y: number) => x + y, 0)} -> ${endOrbits.size})`)
}

// ---------- 3. Weisfeiler-Lehman on the net (Shervashidze et al. 2011) ----------
// The net as a directed bipartite graph. Initial labels carry only what MAPS means, never names.
const wl = (net: Net, h = 6) => {
  const seatIdx = new Map(net.seats.map((s: any, i: number) => [s.id, i]))
  const nodes: string[] = [], label = new Map<string, string>()
  for (const s of net.states) { nodes.push('s:' + s.id); label.set('s:' + s.id, `S m${s.marks} ${s.ends !== undefined ? 'end' : ''} v${s.seenBy === 'all' ? 'all' : s.seenBy.length}`) }
  // seats are anonymous: a seat verb's label says only "seat"; turn order lives in the marking
  for (const v of net.verbs) { nodes.push('v:' + v.id); label.set('v:' + v.id, v.by === WORLD ? `W p${v.priority} w${v.weight}` : 'seat') }
  const adj = new Map<string, [string, string][]>(nodes.map((n) => [n, []]))
  for (const a of net.arcs) {
    adj.get('s:' + a.state)!.push([`${a.kind}${a.count}`, 'v:' + a.verb])
    adj.get('v:' + a.verb)!.push([`${a.kind}${a.count}`, 's:' + a.state])
  }
  // same-seat relation: verbs of one seat are linked to a seat node so X's verbs and O's verbs stay apart
  for (const v of net.verbs) if (v.by !== WORLD) {
    const sn = 'seat:' + seatIdx.get(v.by)
    if (!adj.has(sn)) { adj.set(sn, []); nodes.push(sn); label.set(sn, 'SEAT') }
    adj.get(sn)!.push(['by', 'v:' + v.id]); adj.get('v:' + v.id)!.push(['by', sn])
  }
  let cur = new Map(label)
  const hist: string[][] = [[...cur.values()].sort()]
  for (let i = 0; i < h; i++) {
    const next = new Map<string, string>()
    for (const n of nodes) next.set(n, cur.get(n)! + '(' + adj.get(n)!.map(([k, m]) => k + ':' + cur.get(m)).sort().join(';') + ')')
    // compress by hashing, so labels agree across separately processed designs
    cur = new Map([...next].map(([n, s]) => [n, hash(s)]))
    hist.push([...cur.values()].sort())
  }
  return { colors: cur, signature: hash(hist.map((x) => x.join(',')).join('|')), classes: new Set(cur.values()).size, hist }
}
import { createHash } from 'node:crypto'
function hash(s: string) { return createHash('sha256').update(s).digest('hex').slice(0, 16) }
const wlKernel = (A: string[][], B: string[][]) => {
  // WL subtree kernel: dot product of label-count vectors over all iterations
  let k = 0
  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    const ca = new Map<string, number>(), cb = new Map<string, number>()
    for (const x of A[i]) ca.set(x, (ca.get(x) ?? 0) + 1)
    for (const x of B[i]) cb.set(x, (cb.get(x) ?? 0) + 1)
    for (const [x, n] of ca) k += n * (cb.get(x) ?? 0)
  }
  return k
}
const normK = (A: string[][], B: string[][]) => wlKernel(A, B) / Math.sqrt(wlKernel(A, A) * wlKernel(B, B))

// Number scrabble: players alternately take numbers 1..9; first to hold three summing to 15 wins.
const numberScrabble = (): Net => {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const triples: number[][] = []
  for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) if (a + b + c === 15) triples.push([a, b, c])
  const states: any[] = [], verbs: any[] = [], arcs: any[] = []
  const P = [{ id: 'ann', n: 'Ann' }, { id: 'bo', n: 'Bo' }]
  const st = (id: string, extra: any = {}) => states.push({ id, label: id, marks: 0, seenBy: 'all', x: 0, y: 0, ...extra })
  // deliberately different order and names from tic-tac-toe
  for (const n of nums.slice().reverse()) st(`pool_${n}`, { marks: 1 })
  for (const p of P) { st(`${p.id}_up`, p.id === 'ann' ? { marks: 1 } : {}); st(`${p.id}_check`); st(`${p.id}_wins`, { ends: `${p.n} wins` }) }
  st('left', { marks: 9 }); st('tie', { ends: 'Nobody wins' })
  for (const p of P) for (const n of nums) st(`${p.id}_has_${n}`)
  for (const p of P) {
    const other = p.id === 'ann' ? 'bo' : 'ann'
    for (const n of nums) {
      verbs.push({ id: `${p.id}_takes_${n}`, label: '', by: p.id, priority: 0, weight: 1, x: 0, y: 0 })
      for (const [kind, s] of [['take', `pool_${n}`], ['give', `${p.id}_has_${n}`], ['take', `${p.id}_up`], ['give', `${p.id}_check`], ['take', 'left']]) arcs.push({ kind, state: s, verb: `${p.id}_takes_${n}`, count: 1 })
    }
    verbs.push({ id: `${p.id}_hands_over`, label: '', by: WORLD, priority: 0, weight: 1, x: 0, y: 0 })
    arcs.push({ kind: 'take', state: `${p.id}_check`, verb: `${p.id}_hands_over`, count: 1 }, { kind: 'give', state: `${other}_up`, verb: `${p.id}_hands_over`, count: 1 })
    for (const t of triples) {
      const id = `${p.id}_fifteen_${t.join('')}`
      verbs.push({ id, label: '', by: WORLD, priority: 2, weight: 1, x: 0, y: 0 })
      arcs.push({ kind: 'take', state: `${p.id}_check`, verb: id, count: 1 }, { kind: 'give', state: `${p.id}_wins`, verb: id, count: 1 })
      for (const n of t) arcs.push({ kind: 'need', state: `${p.id}_has_${n}`, verb: id, count: 1 })
    }
  }
  verbs.push({ id: 'exhausted', label: '', by: WORLD, priority: 1, weight: 1, x: 0, y: 0 })
  arcs.push({ kind: 'take', state: 'ann_check', verb: 'exhausted', count: 1 }, { kind: 'unless', state: 'left', verb: 'exhausted', count: 1 }, { kind: 'give', state: 'tie', verb: 'exhausted', count: 1 })
  return { title: 'Number scrabble', seats: P.map((p) => ({ id: p.id, name: p.n, color: '#000000' })), groups: [], states, verbs, arcs }
}
// Tic-tac-toe with the SPEC's bug: line checks at the same priority as passing the turn.
const tttRace = (): Net => ({ ...ttt, verbs: ttt.verbs.map((v: any) => (v.id.includes('_line_') ? { ...v, priority: 0 } : v)) })
// Tic-tac-toe renamed and reordered: same design, different text.
const tttShuffled = (): Net => {
  const r = (s: string) => 'n' + hash(s).slice(0, 8)
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [hash(JSON.stringify(x)), x] as const).sort().map(([, x]) => x)
  return { ...ttt, seats: ttt.seats.map((s: any) => ({ ...s, id: r(s.id) })), states: shuffle(ttt.states.map((s: any) => ({ ...s, id: r(s.id), label: '?' }))), verbs: shuffle(ttt.verbs.map((v: any) => ({ ...v, id: r(v.id), by: v.by === WORLD ? WORLD : r(v.by), label: '?' }))), arcs: shuffle(ttt.arcs.map((a: any) => ({ ...a, state: r(a.state), verb: r(a.verb) }))) }
}
{
  const ns = numberScrabble()
  const designs: [string, Net][] = [['tic-tac-toe', ttt], ['tic-tac-toe renamed+reordered', tttShuffled()], ['number scrabble', ns], ['tic-tac-toe, lines at priority 0', tttRace()]]
  console.log(`\n[3] Weisfeiler-Lehman (h=6) on the design graph, names stripped`)
  const res = designs.map(([n, net]) => ({ n, net, w: wl(net), a: analyze(net) }))
  for (const { n, net, w, a } of res) console.log(`    ${n.padEnd(34)} states ${net.states.length} verbs ${net.verbs.length} | WL signature ${w.signature} | WL classes ${w.classes} | positions ${a.nodes.size} plays ${a.plays}`)
  console.log(`    normalized WL subtree kernel vs tic-tac-toe: ` + res.map((r) => `${r.n}=${normK(res[0].w.hist, r.w.hist).toFixed(3)}`).join(', '))
  // which board squares does WL put together?
  const w0 = res[0].w.colors
  const cls = new Map<string, number[]>()
  for (let i = 1; i <= 9; i++) { const c = w0.get('s:empty_' + i)!; cls.set(c, [...(cls.get(c) ?? []), i]) }
  console.log(`    WL classes of the nine "empty" states: ${[...cls.values()].map((x) => '{' + x + '}').join(' ')}`)
  const w2 = res[2].w.colors
  const cls2 = new Map<string, number[]>()
  for (let i = 1; i <= 9; i++) { const c = w2.get('s:pool_' + i)!; cls2.set(c, [...(cls2.get(c) ?? []), i]) }
  console.log(`    WL classes of number scrabble's nine numbers: ${[...cls2.values()].map((x) => '{' + x + '}').join(' ')}`)
  // verify an explicit isomorphism: the Lo Shu magic square 2 7 6 / 9 5 1 / 4 3 8
  const magic = [2, 7, 6, 9, 5, 1, 4, 3, 8]
  const sm = (id: string) => id.replace(/^empty_(\d)$/, (_, d) => `pool_${magic[+d - 1]}`).replace(/^x_(\d)$/, (_, d) => `ann_has_${magic[+d - 1]}`).replace(/^o_(\d)$/, (_, d) => `bo_has_${magic[+d - 1]}`)
    .replace(/^x_to_move$/, 'ann_up').replace(/^o_to_move$/, 'bo_up').replace(/^judge_x$/, 'ann_check').replace(/^judge_o$/, 'bo_check').replace(/^x_won$/, 'ann_wins').replace(/^o_won$/, 'bo_wins').replace(/^drawn$/, 'tie').replace(/^squares_left$/, 'left')
  const vm = (id: string) => id.replace(/^(x|o)_marks_(\d)$/, (_, s, d) => `${s === 'x' ? 'ann' : 'bo'}_takes_${magic[+d - 1]}`).replace(/^(x|o)_line_(\d{3})$/, (_, s, ds) => `${s === 'x' ? 'ann' : 'bo'}_fifteen_${[...ds].map((d: string) => magic[+d - 1]).sort((a, b) => a - b).join('')}`)
    .replace(/^pass_to_o$/, 'ann_hands_over').replace(/^pass_to_x$/, 'bo_hands_over').replace(/^board_full$/, 'exhausted')
  const key = (a: any) => `${a.kind}|${a.state}|${a.verb}|${a.count}`
  const nsArcs = new Set(ns.arcs.map(key))
  const mapped = new Set(ttt.arcs.map((a: any) => key({ ...a, state: sm(a.state), verb: vm(a.verb) })))
  const sameArcs = mapped.size === nsArcs.size && [...mapped].every((k) => nsArcs.has(k))
  const sameMarks = ttt.states.every((s: any) => ns.states.find((t: any) => t.id === sm(s.id))?.marks === s.marks)
  const samePrio = ttt.verbs.every((v: any) => { const u = ns.verbs.find((t: any) => t.id === vm(v.id)); return u && u.priority === v.priority && (u.by === WORLD) === (v.by === WORLD) })
  console.log(`    magic-square map is an isomorphism of the two designs: arcs ${sameArcs}, marks ${sameMarks}, speakers+priorities ${samePrio}`)
}

// ---------- 4. Bisimulation on the conversation graph (Milner; Park; van Glabbeek) ----------
// Nodes: settled positions from analyze (the world's own answers already folded away, like tau steps).
// Edges: labelled by the seat that chose; terminals labelled by outcome.
const bisim = (a: any, seatName: (s: string) => string, outName: (o: string) => string) => {
  const ids = [...a.nodes.keys()]
  let block = new Map<string, string>(ids.map((k) => { const n = a.nodes.get(k); return [k, n.outcome !== undefined ? 'end:' + outName(n.outcome) : n.stalled ? 'stall' : 'live'] }))
  for (let round = 0; ; round++) {
    const sig = new Map<string, string>(ids.map((k) => {
      const n = a.nodes.get(k)
      const succ = new Set<string>()
      for (const e of n.next) for (const t of e.to) succ.add(seatName(e.speaker) + '>' + block.get(t))
      return [k, block.get(k) + '|' + [...succ].sort().join(',')]
    }))
    const before = new Set(block.values()).size, after = new Set(sig.values()).size
    block = new Map([...sig].map(([k, s]) => [k, hash(s)]))
    if (after === before) return { classes: after, block, root: a.root.map((r: string) => block.get(r)) }
  }
}
{
  const aT = analyze(ttt), aN = analyze(numberScrabble())
  const seat = (s: string) => (s === 'x' || s === 'ann' ? 'first' : 'second')
  const out = (o: string) => (o.startsWith('X') || o.startsWith('Ann') ? 'first wins' : o.startsWith('O') || o.startsWith('Bo') ? 'second wins' : 'draw')
  const bT = bisim(aT, seat, out), bN = bisim(aN, seat, out)
  console.log(`\n[4] strong bisimulation on the settled conversation graph (edges = which seat chose; ends = who won)`)
  console.log(`    tic-tac-toe: ${aT.nodes.size} positions -> ${bT.classes} bisimulation classes`)
  console.log(`    number scrabble: ${aN.nodes.size} positions -> ${bN.classes} classes; roots bisimilar: ${bT.root[0] === bN.root[0]}`)
  // coarser still: forget who won, keep only "the game ended"
  const bT2 = bisim(aT, seat, () => 'end')
  console.log(`    tic-tac-toe, outcomes merged into one "ended": ${bT2.classes} classes`)
}

// ---------- 5. WL at Ocarina scale: fold candidates and nearest encounters ----------
{
  const { readdirSync } = await import('node:fs')
  const dir = `${ROOT}/examples/ocarina-of-time/encounters`
  const files = readdirSync(dir).filter((f) => f.endsWith('.maps'))
  const t0 = performance.now()
  const enc = files.map((f) => { const net = parse(readFileSync(`${dir}/${f}`, 'utf8')); return { f, net, w: wl(net, 3) } })
  const t1 = performance.now()
  const nodes = enc.reduce((s, e) => s + e.net.states.length + e.net.verbs.length, 0)
  const arcs = enc.reduce((s, e) => s + e.net.arcs.length, 0)
  console.log(`\n[5] WL (h=3) over ${enc.length} Ocarina encounters: ${nodes} nodes, ${arcs} arcs, ${(t1 - t0).toFixed(0)} ms including parse`)
  const keese = enc.find((e) => e.f === 'en_firefly.maps')!
  // colour classes of verbs only, after h=3
  const vcls = new Map<string, string[]>()
  for (const v of keese.net.verbs) { const c = keese.w.colors.get('v:' + v.id)!; vcls.set(c, [...(vcls.get(c) ?? []), v.id]) }
  const big = [...vcls.values()].sort((a, b) => b.length - a.length)
  console.log(`    Keese: ${keese.net.verbs.length} verbs fall into ${vcls.size} WL classes; ${big.filter((c) => c.length > 1).length} classes have 2+ members, covering ${big.filter((c) => c.length > 1).reduce((s, c) => s + c.length, 0)} verbs`)
  for (const c of big.slice(0, 3)) console.log(`      class of ${c.length}: ${c.slice(0, 4).join(', ')}${c.length > 4 ? ', ...' : ''}`)
  // nearest neighbours by normalized WL subtree kernel
  const pairs: [number, string, string][] = []
  for (let i = 0; i < enc.length; i++) for (let j = i + 1; j < enc.length; j++) pairs.push([normK(enc[i].w.hist, enc[j].w.hist), enc[i].f, enc[j].f])
  const t2 = performance.now()
  pairs.sort((a, b) => b[0] - a[0])
  console.log(`    ${pairs.length} pairwise kernels in ${(t2 - t1).toFixed(0)} ms; identical WL signatures: ${pairs.filter((p) => p[0] > 0.999999).length}`)
  for (const [k, a, b] of pairs.slice(0, 6)) console.log(`      ${k.toFixed(3)} ${a} ~ ${b}`)
  const kn = pairs.filter((p) => p[1] === 'en_firefly.maps' || p[2] === 'en_firefly.maps').slice(0, 3)
  for (const [k, a, b] of kn) console.log(`      Keese nearest: ${k.toFixed(3)} ${a} ~ ${b}`)
}
{
  const { readdirSync } = await import('node:fs')
  const dir = `${ROOT}/examples/ocarina-of-time/encounters`
  const enc = readdirSync(dir).filter((f) => f.endsWith('.maps')).map((f) => ({ f, w: wl(parse(readFileSync(`${dir}/${f}`, 'utf8')), 3) }))
  const ks: number[] = []
  for (let i = 0; i < enc.length; i++) for (let j = i + 1; j < enc.length; j++) ks.push(normK(enc[i].w.hist, enc[j].w.hist))
  ks.sort((a, b) => a - b)
  const pct = (p: number) => ks[Math.floor(p * (ks.length - 1))].toFixed(3)
  console.log(`    kernel distribution over all pairs: min ${pct(0)} p10 ${pct(0.1)} median ${pct(0.5)} p90 ${pct(0.9)} max ${pct(1)}`)
  // same, iteration 0 only (label histogram), to show how much is shared scaffolding
  const k0 = (A: string[][], B: string[][]) => normK([A[0]], [B[0]])
  const ks0: number[] = []
  for (let i = 0; i < enc.length; i++) for (let j = i + 1; j < enc.length; j++) ks0.push(k0(enc[i].w.hist, enc[j].w.hist))
  ks0.sort((a, b) => a - b)
  console.log(`    iteration-0 (node-label histogram only) median ${ks0[Math.floor(ks0.length / 2)].toFixed(3)}`)
}
