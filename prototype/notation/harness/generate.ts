// PROTOTYPE. Generates structurally varied MAPS nets so no single example shapes a drawing convention.
// Labels are neutral (A1, a3) so a drawing must carry structure, not hints.
// Run: tsx generate.ts [count=12] [seed=1]  -> ../gen/gNN.maps and ../gen/questions.json (engine-derived answers)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { print } from '../../../studio/src/core/text'
import { check } from '../../../studio/src/core/check'
import { analyze } from '../../../studio/src/core/analyze'
import { WORLD, type Net, type Arc } from '../../../studio/src/core/model'

const COUNT = Number(process.argv[2] ?? 12)
let seed = Number(process.argv[3] ?? 1)
const rand = () => (seed = (seed * 48271) % 2147483647) / 2147483647
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1))
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]

const SHAPES = ['cycle', 'chain', 'star', 'branch'] as const
const COLORS = ['#1f6feb', '#c2410c']

const entities: { name: string; states: string[]; by: string }[] = []
function generate(n: number): Net {
  const net: Net = { title: `Generated ${String(n).padStart(2, '0')}`, seats: [], groups: [], states: [], verbs: [], arcs: [] }
  const seats = int(1, 2)
  for (let i = 0; i < seats; i++) net.seats.push({ id: `p${i + 1}`, name: `Player ${i + 1}`, color: COLORS[i] })
  const arc = (kind: Arc['kind'], state: string, verb: string, count = 1) => net.arcs.push({ kind, state, verb, count })
  let vn = 0
  const verb = (by: string, priority = 0, weight = 1) => {
    const id = `v${++vn}`
    net.verbs.push({ id, label: `v${vn}`, by, priority: by === WORLD ? priority : 0, weight: by === WORLD ? weight : 1, x: 0, y: 0 })
    return id
  }
  entities.length = 0
  const E = int(2, 4)
  for (let e = 0; e < E; e++) {
    const name = String.fromCharCode(65 + e)
    const k = int(2, 6)
    const states = Array.from({ length: k }, (_, i) => `${name.toLowerCase()}${i + 1}`)
    states.forEach((s, i) => net.states.push({ id: s, label: `${name}${i + 1}`, marks: i === 0 ? 1 : 0, seenBy: 'all', x: 0, y: 0 }))
    const by = e < seats ? `p${e + 1}` : WORLD
    entities.push({ name, states, by })
    const shape = pick([...SHAPES])
    const edges: [number, number][] = []
    if (shape === 'cycle') for (let i = 0; i < k; i++) edges.push([i, (i + 1) % k])
    if (shape === 'chain') { for (let i = 0; i < k - 1; i++) edges.push([i, i + 1]); edges.push([k - 1, 0]) }
    if (shape === 'star') for (let i = 1; i < k; i++) { edges.push([0, i]); edges.push([i, 0]) }
    if (shape === 'branch') { for (let i = 1; i < k; i++) edges.push([int(0, i - 1), i]); for (let i = 1; i < k; i++) if (rand() < 0.6) edges.push([i, 0]) }
    for (const [a, b] of edges) {
      // a seat's entity mostly speaks for itself, but the world often finishes a move (returns, timeouts)
      const speaker = by === WORLD ? WORLD : rand() < 0.3 ? WORLD : by
      const v = verb(speaker, int(0, 2))
      arc('take', states[a], v); arc('give', states[b], v)
    }
  }
  // contact: one entity's verb gated by another entity's state
  const contacts = int(1, 3)
  for (let c = 0; c < contacts; c++) {
    const own = pick(net.verbs), ownEntity = entities.find((en) => net.arcs.some((a) => a.verb === own.id && en.states.includes(a.state)))!
    const other = pick(entities.filter((en) => en !== ownEntity))
    arc(rand() < 0.7 ? 'need' : 'unless', pick(other.states), own.id)
  }
  // a pool with costs and a capped refill: the commonest feedback in games
  if (rand() < 0.6) {
    const cap = int(2, 5)
    net.states.push({ id: 'pool', label: 'Pool', marks: cap, seenBy: 'all', x: 0, y: 0 })
    const seatVerbs = net.verbs.filter((v) => v.by !== WORLD)
    for (const v of seatVerbs.slice(0, int(1, Math.max(1, seatVerbs.length)))) if (rand() < 0.5) arc('take', 'pool', v.id, int(1, 2))
    const refill = verb(WORLD, 0)
    arc('give', 'pool', refill); arc('unless', 'pool', refill, cap)
    const gate = pick(entities[0].states)
    arc('take', gate, refill); arc('give', gate, refill)
  }
  // chance: the world chooses between two weighted answers at one priority
  if (rand() < 0.5) {
    const w = entities.find((en) => en.by === WORLD) ?? entities[entities.length - 1]
    const from = w.states[0]
    const p = 3
    const a = verb(WORLD, p, int(1, 4)), b = verb(WORLD, p, int(1, 4))
    for (const [v, to] of [[a, pick(w.states)], [b, pick(w.states)]] as const) { arc('take', from, v); arc('give', to, v); arc('need', pick(entities[0].states), v) }
  }
  // an outcome reached by contact
  if (rand() < 0.7) {
    net.states.push({ id: 'end', label: 'Over', marks: 0, seenBy: 'all', ends: 'Over', x: 0, y: 0 })
    const v = verb(WORLD, 5)
    arc('need', pick(entities[0].states), v); arc('need', pick(entities[entities.length - 1].states), v); arc('give', 'end', v)
    if (net.states.some((s) => s.id === 'pool')) arc('unless', 'pool', v)
  }
  return net
}

const OUT = join(import.meta.dirname, '..', 'gen')
mkdirSync(OUT, { recursive: true })
const questions: Record<string, unknown> = {}
let made = 0, tries = 0
while (made < COUNT && tries < 5000) {
  tries++
  const net = generate(made + 1)
  if (check(net).some((p) => p.severity === 'error')) continue
  const a = analyze(net, 20000)
  if (!a.complete || a.livelocks.length || a.stalls.length || a.deadVerbs.length) continue
  made++
  const name = `g${String(made).padStart(2, '0')}`
  net.title = `Generated ${name}`
  writeFileSync(join(OUT, name + '.maps'), print(net))
  const speakerOf = (v: string) => { const b = net.verbs.find((x) => x.id === v)!.by; return b === WORLD ? 'the world' : net.seats.find((s) => s.id === b)!.name }
  const root = a.nodes.get(a.root[0])
  const open = root?.next.map((n) => n.verb) ?? []
  const vs = [...net.verbs].sort(() => rand() - 0.5).slice(0, 3)
  const truth = { entities: Object.fromEntries(entities.map((en) => [en.name, en.states])), contacts: net.arcs.filter((x) => (x.kind === 'need' || x.kind === 'unless')).map((x) => `${x.kind}|${x.state}|${x.verb}`) }
  questions[name + '.maps'] = { truth, questions: [
    ...vs.map((v, i) => ({ id: `${name}-who${i}`, criteria: ['conversation'], question: `Who says ${v.label}?`, answer: speakerOf(v.id) })),
    ...vs.map((v, i) => ({ id: `${name}-gate${i}`, criteria: ['possibility'], question: `What must hold for ${v.label} to be said, and what does saying it change?`,
      answer: net.arcs.filter((x) => x.verb === v.id).map((x) => `${x.kind}${x.count > 1 ? ' ' + x.count : ''} ${net.states.find((s) => s.id === x.state)!.label}`).join('; ') })),
    { id: `${name}-open`, criteria: ['possibility', 'conversation'], question: 'At the start, once the world falls silent, who speaks and which verbs can they say?',
      answer: open.length ? `${speakerOf(open[0])}: ${[...new Set(open)].map((v) => net.verbs.find((x) => x.id === v)!.label).join(', ')}` : 'nobody' },
    { id: `${name}-ent`, criteria: ['entity'], question: 'How many separate things are each always in exactly one state here, and which states belong to each?',
      answer: 'Entities A.. by letter: ' + [...new Set(net.states.filter((s) => /^[a-z]\d/.test(s.id)).map((s) => s.label[0]))].map((L) => `${L}: ${net.states.filter((s) => s.label[0] === L && /\d/.test(s.label)).map((s) => s.label).join(', ')}`).join('; ') },
    { id: `${name}-contact`, criteria: ['contact'], question: "Which verbs depend on the state of a different entity than the one they move, and on which state?",
      answer: net.arcs.filter((x) => (x.kind === 'need' || x.kind === 'unless')).map((x) => `${net.verbs.find((v) => v.id === x.verb)!.label} ${x.kind} ${net.states.find((s) => s.id === x.state)!.label}`).join('; ') },
  ]}
}
writeFileSync(join(OUT, 'questions.json'), JSON.stringify({ about: 'Auto-generated blind-read questions; answers derived from the arcs and the engine root moment.', files: questions }, null, 1))
console.log(`made ${made} nets in ${tries} tries`)
