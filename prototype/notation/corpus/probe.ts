// Print every resting moment of a score: who speaks, what each seat verb leads to (world answers, odds, next moment),
// and which outcomes stay reachable. questions.json answers are read off this output.
// Usage (from studio/): npx tsx ../prototype/notation/corpus/probe.ts <file.maps>
import { readFileSync } from 'node:fs'
import { parse } from '../../../studio/src/core/text'
import { analyze } from '../../../studio/src/core/analyze'
import { compile, fire, whoseTurn, type Compiled } from '../../../studio/src/core/engine'
import type { Marking } from '../../../studio/src/core/model'

const net = parse(readFileSync(process.argv[2], 'utf8'))
const c = compile(net)
const a = analyze(net)
const show = (m: Marking) => net.states.filter((p) => m[p.id] > 0).map((p) => (m[p.id] > 1 ? `${p.id}=${m[p.id]}` : p.id)).join(' ')

const answers = (m: Marking, p = 1, said: string[] = []): { said: string[]; p: number; m: Marking }[] => {
  const t = whoseTurn(c, m)
  if (t.kind !== 'world') return [{ said, p, m }]
  return t.branches.flatMap((b) => answers(fire(c, m, b.verb.id), p * b.p, [...said, b.verb.id]))
}

const keys = [...a.nodes.keys()]
const name = new Map(keys.map((k, i) => [k, `M${i}`]))
const reach = new Map<string, Set<string>>()
const reachFrom = (k: string, seen = new Set<string>()): Set<string> => {
  if (reach.has(k)) return reach.get(k)!
  const out = new Set<string>()
  const stack = [k]
  while (stack.length) {
    const x = stack.pop()!
    if (seen.has(x)) continue
    seen.add(x)
    const n = a.nodes.get(x)!
    if (n.outcome) out.add(n.outcome)
    for (const e of n.next) stack.push(...e.to)
  }
  reach.set(k, out)
  return out
}
console.log(`${net.title}\nroot ${a.root.map((k) => name.get(k)).join(' ')}`)
for (const k of keys) {
  const n = a.nodes.get(k)!
  if (n.outcome) { console.log(`${name.get(k)} [${show(n.marking)}] OVER: ${n.outcome}`); continue }
  console.log(`${name.get(k)} [${show(n.marking)}] can still reach: ${[...reachFrom(k)].join(' | ')}`)
  for (const e of n.next) {
    console.log(`  ${e.speaker} ${e.verb}:`)
    for (const b of answers(fire(c, n.marking, e.verb)))
      console.log(`    @${b.p.toFixed(3)} ${b.said.join(' > ') || '(world silent)'} => ${name.get(c.net.states.map((p) => b.m[p.id] ?? 0).join(','))}`)
  }
}
