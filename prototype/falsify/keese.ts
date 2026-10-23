import { readFileSync } from 'node:fs'
import { parse } from '/home/wscottsh/repos/egs/maps-notation/studio/src/core/text.ts'
const { analyze } = require('./sheets-lib.cjs') /* generated from ../sheets.html script */
const net = parse(readFileSync('/home/wscottsh/repos/egs/maps-notation/examples/ocarina-of-time/ocarina-combat.maps', 'utf8'))
const inG = new Set(net.states.filter(s => s.group === 'en_firefly__enemy').map(s => s.id))
const moves: any[] = []
for (const v of net.verbs) { const a = net.arcs.filter(x => x.verb === v.id); const f = a.filter(x => x.kind === 'take' && inG.has(x.state)); const t = a.filter(x => x.kind === 'give' && inG.has(x.state)); if (f.length && t.length && f[0].state !== t[0].state) moves.push({ v, from: f[0].state, to: t[0].state, gates: a.filter(x => x.kind === 'need' || x.kind === 'unless').length }) }
const ids = [...new Set(moves.flatMap(m => [m.from, m.to]))]
const lab = (id: string) => net.states.find(s => s.id === id)!.label
console.log(`moving token among ${ids.length} of ${inG.size} enemy states via ${moves.length} verbs; gates per verb avg ${(moves.reduce((a, m) => a + m.gates, 0) / moves.length).toFixed(1)}`)
const indeg: Record<string, number> = {}; moves.forEach(m => indeg[m.to] = (indeg[m.to] || 0) + 1)
const root = ids.sort((a, b) => (indeg[b] || 0) - (indeg[a] || 0))[0]
const K = { states: ids.map(id => [id, lab(id).slice(0, 28)]), verbs: moves.map(m => [m.v.label.slice(0, 28), m.from, m.to, m.v.by === 'world' ? 'world' : 'controller', `${m.gates} gates`]), root, homes: [root] }
const A = analyze(K)
let lines = 0, cols = 0, tags = 0, refs = 0
A.sections.forEach((sec: any) => { let row = 0; const w = (n: any, c: number) => { cols = Math.max(cols, c + 1); tags = Math.max(tags, n.tags.length); let first = true; for (const k of n.kids) { if (!first) row++; if (k.kind === 'ref') refs++; if (k.kind === 'state') w(k.node, c + 1); else cols = Math.max(cols, c + 2); first = false } }; w(sec.tree, 0); lines += row + 1 })
console.log(`home picked: ${lab(root)}; parts ${A.sections.length}; lines ${lines}; columns ${cols}; dashed back-links ${refs}; most ↩/↻ notes under one state ${tags}`)
console.log('state labels sample:', ids.slice(0, 12).map(lab).join(' | '))
