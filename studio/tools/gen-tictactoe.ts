import { writeFileSync } from 'node:fs'
import { WORLD, type Arc, type Net, type State, type Verb } from '../src/core/model'
import { print } from '../src/core/text'

const LINES = [
  [1, 2, 3], [4, 5, 6], [7, 8, 9],
  [1, 4, 7], [2, 5, 8], [3, 6, 9],
  [1, 5, 9], [3, 5, 7],
]
const SEATS = [
  { id: 'x', name: 'X', color: '#e4572e', other: 'o' },
  { id: 'o', name: 'O', color: '#2e86ab', other: 'x' },
]

export const ticTacToe = (): Net => {
  const states: State[] = []
  const verbs: Verb[] = []
  const arcs: Arc[] = []
  const state = (p: Partial<State> & Pick<State, 'id' | 'label' | 'x' | 'y'>) => states.push({ marks: 0, seenBy: 'all', ...p })
  const verb = (v: Partial<Verb> & Pick<Verb, 'id' | 'label' | 'by' | 'x' | 'y'>, ...a: [Arc['kind'], string, number?][]) => {
    verbs.push({ priority: 0, weight: 1, ...v })
    for (const [kind, p, count = 1] of a) arcs.push({ kind, state: p, verb: v.id, count })
  }

  const cell = (i: number) => ({ cx: 360 + ((i - 1) % 3) * 200, cy: 200 + Math.floor((i - 1) / 3) * 200 })
  state({ id: 'x_to_move', label: 'X to move', marks: 1, group: 'turn', x: 120, y: 260 })
  state({ id: 'o_to_move', label: 'O to move', group: 'turn', x: 120, y: 540 })
  state({ id: 'squares_left', label: 'Squares left', marks: 9, group: 'turn', x: 120, y: 400 })
  for (let i = 1; i <= 9; i++) {
    const { cx, cy } = cell(i)
    state({ id: `empty_${i}`, label: `${i} empty`, marks: 1, group: 'board', x: cx, y: cy - 45 })
    state({ id: `x_${i}`, label: `X on ${i}`, group: 'board', x: cx - 55, y: cy + 50 })
    state({ id: `o_${i}`, label: `O on ${i}`, group: 'board', x: cx + 55, y: cy + 50 })
  }
  for (const s of SEATS) {
    const jy = s.id === 'x' ? 140 : 660
    state({ id: `judge_${s.id}`, label: `Judge ${s.name}'s move`, group: 'judge', x: 1080, y: jy + 120 })
    state({ id: `${s.id}_won`, label: `${s.name} wins`, ends: `${s.name} wins`, group: 'judge', x: 1360, y: jy + 120 })
  }
  state({ id: 'drawn', label: 'Draw', ends: 'Draw', group: 'judge', x: 1360, y: 400 })

  for (const s of SEATS)
    for (let i = 1; i <= 9; i++) {
      const { cx, cy } = cell(i)
      verb(
        { id: `${s.id}_marks_${i}`, label: `${s.name} marks ${i}`, by: s.id, group: 'board', x: cx + (s.id === 'x' ? -55 : 55), y: cy - 5 },
        ['take', `${s.id}_to_move`], ['take', `empty_${i}`], ['take', 'squares_left'], ['give', `${s.id}_${i}`], ['give', `judge_${s.id}`],
      )
    }
  for (const s of SEATS) {
    const jy = s.id === 'x' ? 140 : 660
    LINES.forEach((line, k) =>
      verb(
        { id: `${s.id}_line_${line.join('')}`, label: `${s.name} has ${line.join('-')}`, by: WORLD, priority: 2, group: 'judge', x: 1220, y: jy - 105 + k * 30 },
        ...line.map((c): [Arc['kind'], string] => ['need', `${s.id}_${c}`]), ['take', `judge_${s.id}`], ['give', `${s.id}_won`],
      ),
    )
    verb({ id: `pass_to_${s.other}`, label: `Pass to ${s.other.toUpperCase()}`, by: WORLD, group: 'judge', x: 1080, y: jy + (s.id === 'x' ? 240 : 0) },
      ['take', `judge_${s.id}`], ['give', `${s.other}_to_move`])
  }
  verb({ id: 'board_full', label: 'Board full', by: WORLD, priority: 1, group: 'judge', x: 1220, y: 400 },
    ['take', 'judge_x'], ['unless', 'squares_left'], ['give', 'drawn'])

  return {
    title: 'Tic-Tac-Toe',
    seats: SEATS.map(({ id, name, color }) => ({ id, name, color })),
    groups: [
      { id: 'turn', label: 'Whose turn' },
      { id: 'board', label: 'The board' },
      { id: 'judge', label: 'The judge' },
    ],
    states,
    verbs,
    arcs,
  }
}

if (process.argv[1]?.endsWith('gen-tictactoe.ts')) {
  const out = new URL('../../examples/tic-tac-toe.maps', import.meta.url)
  writeFileSync(out, print(ticTacToe()))
  console.log('wrote', out.pathname)
}
