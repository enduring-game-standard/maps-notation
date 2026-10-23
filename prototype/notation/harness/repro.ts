// PROTOTYPE. Napkin check: compares a hand reproduction (positions a fresh reader drew from a design's rules alone) with the renderer's layout.
// Run: tsx repro.ts <design> <net.maps> <reader.json>   reader.json is { "<state or verb id>": { "x": n, "y": n }, ... }
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '../../../studio/src/core/text'
import type { Design } from './contract'

const [designId, netPath, readerPath] = process.argv.slice(2)
const { design } = (await import(join(import.meta.dirname, '..', 'designs', designId, 'render.ts'))) as { design: Design }
const net = parse(readFileSync(netPath, 'utf8'))
const drawn = design.draw(net).layout.nodes
const hand: Record<string, { x: number; y: number }> = JSON.parse(readFileSync(readerPath, 'utf8'))
const ids = [...net.states, ...net.verbs].map((n) => n.id)
const missing = ids.filter((id) => !hand[id])
const both = ids.filter((id) => hand[id] && (drawn[id] ?? drawn[id + '#0']))
const at = (id: string) => drawn[id] ?? drawn[id + '#0']
// pairwise order agreement: for each pair, do both drawings put them in the same left/right and above/below order? Ties within 8px count as ties.
// Ties are within 2% of each drawing's own extent, since the hand drawing uses its own units.
const agree = (f: (id: string) => number, g: (id: string) => number) => {
  let same = 0, n = 0
  const tol = (h: (id: string) => number) => { const v = both.map(h); return (Math.max(...v) - Math.min(...v)) * 0.02 }
  const tf = tol(f), tg = tol(g)
  const sgn = (d: number, t: number) => (Math.abs(d) <= t ? 0 : Math.sign(d))
  for (let i = 0; i < both.length; i++) for (let j = i + 1; j < both.length; j++) {
    const a = sgn(f(both[i]) - f(both[j]), tf), b = sgn(g(both[i]) - g(both[j]), tg)
    n++; if (a === b) same++
  }
  return n ? Math.round((same / n) * 100) : 0
}
console.log(JSON.stringify({ design: designId, net: netPath.split('/').pop(), nodes: ids.length, missing, xOrderAgreementPct: agree((id) => at(id).x, (id) => hand[id].x), yOrderAgreementPct: agree((id) => at(id).y, (id) => hand[id].y) }))
