import { readFileSync } from 'node:fs'
import { parse } from '/home/wscottsh/repos/egs/maps-notation/studio/src/core/text.ts'
const { analyze, SHEETS } = require('./sheets-lib.cjs') /* generated from ../sheets.html script */

const cellsOf = (S: any) => {
  const A = analyze(S); const out: string[] = []; const shown = new Set<any>()
  A.sections.forEach((sec: any, n: number) => {
    let row = 0
    const walk = (node: any, col: number, r: number) => {
      out.push(`${n}:${r}:${col}`)
      node.tags.forEach((t: any) => shown.add(t.v))
      let first = true
      for (const k of node.kids) {
        shown.add(k.v)
        const rr = first ? r : ++row
        if (k.kind === 'state') walk(k.node, col + 1, rr); else out.push(`${n}:${rr}:${col + 1}`)
        first = false
      }
    }
    walk(sec.tree, 0, 0)
  })
  A.start?.path.forEach((p: any) => shown.add(p.v))
  const hidden = A.verbs.filter((v: any) => ![...shown].some((s: any) => s.name === v.name && s.from === v.from && s.to === v.to))
  return { shape: out.sort().join(' '), hidden, A }
}
const shuffle = <T,>(a: T[], seed: number) => { const b = [...a]; let s = seed; for (let i = b.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

console.log('T1 same structure, verbs listed in a different order: distinct shapes out of 30 shuffles')
for (const S of SHEETS) {
  const shapes = new Set<string>()
  for (let k = 1; k <= 30; k++) shapes.add(cellsOf({ ...S, verbs: shuffle(S.verbs, k * 7919) }).shape)
  console.log(`  ${S.title}: ${shapes.size}`)
}
console.log('T2 verbs that never appear on the sheet')
for (const S of SHEETS) { const { hidden } = cellsOf(S); console.log(`  ${S.title}: ${hidden.length}/${S.verbs.length} hidden: ${hidden.map((v: any) => `${v.name} (${v.speaker})`).join(', ')}`) }

console.log('T3 one added verb: cells that move')
const g = SHEETS.find((s: any) => s.key === 'goomba'), l = SHEETS.find((s: any) => s.key === 'link')
const diff = (a: string, b: string) => { const A = new Set(a.split(' ')), B = new Set(b.split(' ')); return [...A].filter(x => !B.has(x)).length + [...B].filter(x => !A.has(x)).length }
const add = (S: any, v: any, at = 0) => ({ ...S, verbs: [...S.verbs.slice(0, at), v, ...S.verbs.slice(at)] })
console.log('  Goomba + jump (walking→falling), listed first:', diff(cellsOf(g).shape, cellsOf(add(g, ['jump', 'walking', 'falling', 'world', ''], 1)).shape))
console.log('  Link + backflip (z→air), listed first:', diff(cellsOf(l).shape, cellsOf(add(l, ['backflip', 'z', 'air', 'controller', ''], 0)).shape))

console.log('T4 dungeon with no home declared (homes picked by the code)')
const d = SHEETS.find((s: any) => s.key === 'deku')
const d2 = cellsOf({ ...d, homes: [] }).A
console.log('  homes picked:', d2.sections.map((s: any) => d2.label[s.home]).join(' | '), ' vs declared:', cellsOf(d).A.sections.map((s: any) => cellsOf(d).A.label[s.home]).join(' | '))

console.log('T5 real scale: Keese from the atlas, enemy group projected to one entity')
const net = parse(readFileSync('/home/wscottsh/repos/egs/maps-notation/examples/ocarina-of-time/ocarina-combat.maps', 'utf8'))
const inG = new Set(net.states.filter(s => s.group === 'en_firefly__enemy').map(s => s.id))
const verbs: any[] = []
for (const v of net.verbs) {
  const arcs = net.arcs.filter(a => a.verb === v.id)
  const from = arcs.filter(a => a.kind === 'take' && inG.has(a.state)).map(a => a.state)
  const to = arcs.filter(a => a.kind === 'give' && inG.has(a.state)).map(a => a.state)
  if (!from.length) continue
  verbs.push([v.label.slice(0, 30), from[0], to[0] ?? from[0], v.by === 'world' ? 'world' : 'controller', arcs.filter(a => a.kind !== 'take' && a.kind !== 'give' && !inG.has(a.state)).length + ' gates'])
}
const label = (id: string) => net.states.find(s => s.id === id)!.label.slice(0, 30)
const root = [...inG].find(id => net.states.find(s => s.id === id)!.marks > 0) ?? [...inG][0]
const K = { key: 'keese', title: 'Keese', states: [...inG].map(id => [id, label(id)]), verbs, root, homes: [root] }
const r = cellsOf(K)
const multiFrom = net.verbs.filter(v => net.arcs.filter(a => a.verb === v.id && a.kind === 'take' && inG.has(a.state)).length > 1).length
const rows = new Set(r.shape.split(' ').map(c => c.split(':').slice(0, 2).join(':'))).size
const cols = Math.max(...r.shape.split(' ').map(c => +c.split(':')[2])) + 1
console.log(`  ${inG.size} states, ${verbs.length} verbs touching them; ${multiFrom} verbs take from 2+ Keese states at once`)
console.log(`  sheet: ${r.A.sections.length} parts, ${rows} lines, ${cols} columns, ${r.hidden.length} verbs hidden`)
console.log(`  tag counts under the busiest state:`, Math.max(...(r.A.sections.flatMap((s: any) => { const acc: number[] = []; const w = (n: any) => { acc.push(n.tags.length); n.kids.forEach((k: any) => k.kind === 'state' && w(k.node)) }; w(s.tree); return acc }))))
