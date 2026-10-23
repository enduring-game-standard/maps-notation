// The rule checks must pass Peterson's own drawings. Coordinates measured from the 300 dpi clips.
import { readFileSync } from 'node:fs'
import { parseNet } from '../engine/net.ts'
import { ruleChecks } from '../harness/rules.ts'
import { attach, straight } from '../engine/geometry.ts'
import type { Layout, Pt } from '../engine/layout.ts'

type Spec = { places: Record<string, [number, number]>; bars: Record<string, [number, number, number]>; curves: Record<string, Pt[]> }
const specs: Record<string, Spec> = {
  'fig-03-29': {
    places: { p1: [370, 265], p2: [370, 680], p3: [1145, 265], p4: [1145, 680], B: [755, 680] },
    bars: { t1: [370, 475, 0], t2: [370, 885, 0], t3: [1145, 475, 0], t4: [1145, 890, 0] },
    curves: { 't2>p1': [{ x: 340, y: 890 }, { x: 60, y: 1100 }, { x: 60, y: 120 }, { x: 345, y: 215 }],
      't4>p3': [{ x: 1175, y: 895 }, { x: 1460, y: 1100 }, { x: 1460, y: 120 }, { x: 1175, y: 215 }] },
  },
  'fig-04-06': {
    places: { p1: [310, 180], p2: [310, 590], p3: [310, 1000], p6: [1075, 180], p7: [1075, 595], p8: [1075, 1010], p4: [690, 435], p5: [690, 850] },
    bars: { t1: [310, 385, 0], t2: [310, 800, 0], t3: [310, 1210, 0], t4: [1075, 385, 0], t5: [1075, 800, 0], t6: [1075, 1210, 0] },
    curves: { 't3>p1': [{ x: 300, y: 1215 }, { x: -40, y: 1400 }, { x: 20, y: 0 }, { x: 290, y: 130 }],
      't6>p6': [{ x: 1085, y: 1215 }, { x: 1420, y: 1400 }, { x: 1360, y: 0 }, { x: 1090, y: 130 }] },
  },
}
for (const [key, sp] of Object.entries(specs)) {
  const net = parseNet(JSON.parse(readFileSync(`corpus/book/${key}.json`, 'utf8')))
  const nodes: Layout['nodes'] = {}
  for (const [id, [x, y]] of Object.entries(sp.places)) nodes[id] = { kind: 'place', x, y }
  for (const [id, [x, y, a]] of Object.entries(sp.bars)) nodes[id] = { kind: 'transition', x, y, angle: a, length: 100 }
  const arcs = net.arcs.map((a) => ({ ...a, path: sp.curves[`${a.from}>${a.to}`] ?? straight(attach(nodes[a.from], nodes[a.to]), attach(nodes[a.to], nodes[a.from])) }))
  const r = ruleChecks(net, { nodes, arcs }, 12)
  console.log(key, r.failures.length ? 'FAIL ' + r.failures.join('; ') : 'pass', r.notes.join('; '))
}
