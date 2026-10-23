// Cross-check the MAPS ports against duel.js, the source of truth (branch prototype/possibility, commit a48d305).
// Usage (from studio/): npx tsx ../prototype/notation/corpus/crosscheck-duel.ts
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../../../studio/src/core/text'
import { analyze } from '../../../studio/src/core/analyze'
import { compile, fire, whoseTurn, type Compiled } from '../../../studio/src/core/engine'
import type { Marking } from '../../../studio/src/core/model'

const here = dirname(fileURLToPath(import.meta.url))
const src = execFileSync('git', ['show', 'a48d305:prototype/duel.js'], { cwd: here, encoding: 'utf8' })
const mod = { exports: {} as any }
new Function('module', src)(mod)
const { duel, explore } = mod.exports

const DRAFTS = { first: 'duel-first.maps', revised: 'duel-revised.maps', mixup: 'duel-held.maps' } as const
// MAPS forbids a state and a verb sharing a name, so three duel.js places are renamed; every other id is kept but one.
const STATE = (p: string) => ({ guard: 'guarding', strike: 'striking', roll: 'rolling' })[p] ?? p
const VERB = (v: string) => ({ gstrike: 'guard_strike' })[v] ?? v
const OUTCOME: Record<number, string> = { [-1]: 'Link takes a hit', [1]: 'Link lands a hit' }

const markingKey = (m: Marking) => Object.keys(m).filter((k) => m[k] > 0).sort().map((k) => (m[k] === 1 ? k : `${k}x${m[k]}`)).join('+')
const toMarking = (c: Compiled, places: Set<string>): Marking =>
  Object.fromEntries(c.net.states.map((s) => [s.id, 0]).concat([...places].map((p) => [STATE(p), 1])))

/** Every settled result of the world answering from m, as outcome text or resting marking, with its odds. */
const settleDist = (c: Compiled, m: Marking, p = 1, out = new Map<string, number>()) => {
  const t = whoseTurn(c, m)
  if (t.kind === 'world') for (const b of t.branches) settleDist(c, fire(c, m, b.verb.id), p * b.p, out)
  else {
    const k = t.kind === 'over' ? `END ${t.outcome}` : markingKey(m)
    out.set(k, (out.get(k) ?? 0) + p)
  }
  return out
}

const sameDist = (a: Map<string, number>, b: Map<string, number>) =>
  a.size === b.size && [...a].every(([k, p]) => Math.abs((b.get(k) ?? -1) - p) < 1e-12)
const show = (d: Map<string, number>) => [...d].map(([k, p]) => `${k} @${p.toFixed(3)}`).sort().join('; ')

let failures = 0
for (const [draft, file] of Object.entries(DRAFTS)) {
  const c = compile(parse(readFileSync(join(here, file), 'utf8')))
  const ex = explore(duel(draft))
  let options = 0
  const problems: string[] = []
  for (const r of ex.rests.values()) {
    const m = toMarking(c, r.m)
    const turn = whoseTurn(c, m)
    const offered = turn.kind === 'seats' ? (turn.choices.get('link') ?? []).map((v) => v.id).sort() : []
    const expected = r.options.map((o: any) => VERB(o.said.id)).sort()
    if (turn.kind !== 'seats' || offered.join() !== expected.join())
      problems.push(`at ${markingKey(m)}: engine ${turn.kind} offers [${offered}], duel.js offers [${expected}]`)
    for (const o of r.options) {
      options++
      const want = new Map<string, number>()
      for (const b of o.branches) {
        const scored = b.answer.filter((w: any) => w.outcome)
        const k = scored.length ? `END ${OUTCOME[scored[0].outcome]}` : markingKey(toMarking(c, b.next))
        want.set(k, (want.get(k) ?? 0) + b.p)
      }
      const got = settleDist(c, fire(c, m, VERB(o.said.id)))
      if (!sameDist(want, got)) problems.push(`at ${markingKey(m)} after ${VERB(o.said.id)}: engine {${show(got)}}, duel.js {${show(want)}}`)
    }
  }
  const a = analyze(c.net)
  const engineRests = [...a.nodes.values()].filter((n) => n.outcome === undefined).map((n) => markingKey(n.marking))
  const duelRests = new Set([...ex.rests.values()].map((r: any) => markingKey(toMarking(c, r.m))))
  const extra = engineRests.filter((k) => !duelRests.has(k))
  if (extra.length) problems.push(`engine reaches resting moments duel.js never finds: ${extra.join(', ')}`)
  failures += problems.length
  console.log(
    `${file}: ${problems.length ? `FAIL, ${problems.length} mismatches` : 'ok, same seat verbs, next moments, and odds'}. ` +
      `${ex.rests.size} duel.js resting moments, ${options} seat options; engine reaches ${engineRests.length} of them before a hit ends play` +
      (problems.length ? '\n  ' + problems.join('\n  ') : ''),
  )
}
process.exit(failures ? 1 : 0)
