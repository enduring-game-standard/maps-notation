import { writeFileSync } from 'node:fs'
import { WORLD, type Arc, type Net, type State, type Verb } from '../src/core/model'
import { print } from '../src/core/text'

// Take numbers 1 to 9 in turn; the first to hold three that sum to 15 wins. Written without reference to the board.
export const numberScrabble = (): Net => {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const triples: number[][] = []
  for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) if (a + b + c === 15) triples.push([a, b, c])
  const states: State[] = []
  const verbs: Verb[] = []
  const arcs: Arc[] = []
  const st = (id: string, label: string, extra: Partial<State> = {}) => states.push({ id, label, marks: 0, seenBy: 'all', x: 0, y: 0, ...extra })
  const P = [{ id: 'ann', n: 'Ann' }, { id: 'bo', n: 'Bo' }]
  for (const n of [...nums].reverse()) st(`pool_${n}`, `${n} in the pool`, { marks: 1 })
  for (const p of P) {
    st(`${p.id}_up`, `${p.n} to take`, p.id === 'ann' ? { marks: 1 } : {})
    st(`${p.id}_check`, `Check ${p.n}'s numbers`)
    st(`${p.id}_wins`, `${p.n} wins`, { ends: `${p.n} wins` })
  }
  st('left', 'Numbers left', { marks: 9 })
  st('tie', 'Nobody wins', { ends: 'Nobody wins' })
  for (const p of P) for (const n of nums) st(`${p.id}_has_${n}`, `${p.n} holds ${n}`)
  const verb = (id: string, label: string, by: string, priority: number, ...a: [Arc['kind'], string][]) => {
    verbs.push({ id, label, by, priority, weight: 1, x: 0, y: 0 })
    for (const [kind, state] of a) arcs.push({ kind, state, verb: id, count: 1 })
  }
  for (const p of P) {
    const other = p.id === 'ann' ? 'bo' : 'ann'
    for (const n of nums) verb(`${p.id}_takes_${n}`, `${p.n} takes ${n}`, p.id, 0, ['take', `pool_${n}`], ['give', `${p.id}_has_${n}`], ['take', `${p.id}_up`], ['give', `${p.id}_check`], ['take', 'left'])
    verb(`${p.id}_hands_over`, `Hand over to ${other}`, WORLD, 0, ['take', `${p.id}_check`], ['give', `${other}_up`])
    for (const t of triples) verb(`${p.id}_fifteen_${t.join('')}`, `${p.n} holds ${t.join('+')}`, WORLD, 2, ['take', `${p.id}_check`], ['give', `${p.id}_wins`], ...t.map((n) => ['need', `${p.id}_has_${n}`] as [Arc['kind'], string]))
  }
  verb('exhausted', 'Pool empty', WORLD, 1, ['take', 'ann_check'], ['unless', 'left'], ['give', 'tie'])
  return { title: 'Number Scrabble', seats: P.map((p) => ({ id: p.id, name: p.n, color: p.id === 'ann' ? '#c2410c' : '#1d4ed8' })), groups: [], states, verbs, arcs }
}

if (process.argv[1]?.endsWith('gen-number-scrabble.ts')) writeFileSync(process.argv[2] ?? '../examples/number-scrabble.maps', print(numberScrabble()))
