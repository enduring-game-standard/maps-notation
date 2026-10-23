// Parse, check, and analyze a .maps file with the real engine. Prints one JSON summary.
// Usage (from studio/): npx tsx ../.claude/skills/verify/scripts/engine.ts <file.maps>
import { readFileSync } from 'node:fs'
import { parse } from '../../../../studio/src/core/text'
import { check } from '../../../../studio/src/core/check'
import { analyze } from '../../../../studio/src/core/analyze'
const file = process.argv[2]
if (!file) { console.error('usage: npx tsx engine.ts <file.maps>'); process.exit(2) }
const net = parse(readFileSync(file, 'utf8'))
const problems = check(net)
const a = analyze(net)
console.log(JSON.stringify({
  file, title: net.title,
  counts: { seats: net.seats.length, states: net.states.length, verbs: net.verbs.length, arcs: net.arcs.length },
  problems, complete: a.complete, positions: a.nodes.size, plays: a.plays,
  outcomes: Object.fromEntries(a.outcomes), playsBy: Object.fromEntries(a.playsBy),
  stalls: a.stalls.length, livelocks: a.livelocks.length, deadVerbs: a.deadVerbs,
}, null, 1))
process.exit(problems.some(p => p.severity === 'error') ? 1 : 0)
