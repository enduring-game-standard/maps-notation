// PROTOTYPE. Prints each net's state-verb graph as JSON lines, for planarity.py.
// Run: tsx graph.ts ../corpus/*.maps ../gen/*.maps | python planarity.py
import { readFileSync } from 'node:fs'
import { parse } from '../../../studio/src/core/text'
for (const f of process.argv.slice(2)) {
  const net = parse(readFileSync(f, 'utf8'))
  console.log(JSON.stringify({ f: f.split('/').pop(), edges: net.arcs.map((a) => [a.state, a.verb, a.kind]) }))
}
