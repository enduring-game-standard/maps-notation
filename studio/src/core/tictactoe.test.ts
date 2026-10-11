import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ticTacToe } from '../../tools/gen-tictactoe'
import { analyze } from './analyze'
import { check } from './check'
import { compile, fire, settle, whoseTurn } from './engine'
import { initialMarking } from './model'
import { parse, print } from './text'

const net = parse(readFileSync(new URL('../../../examples/tic-tac-toe.maps', import.meta.url), 'utf8'))
const c = compile(net)

const play = (...moves: string[]) => {
  let { marking, turn } = settle(c, initialMarking(net))
  for (const mv of moves) {
    expect(turn.kind, `before ${mv}`).toBe('seats')
    ;({ marking, turn } = settle(c, fire(c, marking, mv)))
  }
  return { marking, turn }
}

describe('tic-tac-toe written in MAPS', () => {
  it('the published file is exactly what the generator writes', () => {
    expect(print(net)).toBe(print(ticTacToe()))
  })

  it('has no structural problems', () => {
    expect(check(net)).toEqual([])
  })

  it('opens with only X able to speak, nine ways', () => {
    const t = whoseTurn(c, initialMarking(net))
    expect(t.kind).toBe('seats')
    if (t.kind !== 'seats') return
    expect([...t.choices.keys()]).toEqual(['x'])
    expect(t.choices.get('x')).toHaveLength(9)
  })

  it('hands the turn to O after X speaks, minus the taken square', () => {
    const { turn } = play('x_marks_5')
    if (turn.kind !== 'seats') throw new Error(turn.kind)
    expect([...turn.choices.keys()]).toEqual(['o'])
    expect(turn.choices.get('o')!.map((v) => v.id)).not.toContain('o_marks_5')
    expect(turn.choices.get('o')).toHaveLength(8)
  })

  it('ends when X completes a row, and nobody may speak after', () => {
    const { turn } = play('x_marks_1', 'o_marks_4', 'x_marks_2', 'o_marks_5', 'x_marks_3')
    expect(turn).toEqual({ kind: 'over', outcome: 'X wins' })
  })

  it('a ninth move that also completes a line is a win, not a draw', () => {
    const { turn } = play('x_marks_1', 'o_marks_4', 'x_marks_2', 'o_marks_5', 'x_marks_6', 'o_marks_9', 'x_marks_7', 'o_marks_8', 'x_marks_3')
    expect(turn).toEqual({ kind: 'over', outcome: 'X wins' })
  })

  it('a full board with no line is a draw', () => {
    const d = play('x_marks_1', 'o_marks_5', 'x_marks_9', 'o_marks_2', 'x_marks_8', 'o_marks_7', 'x_marks_3', 'o_marks_6', 'x_marks_4')
    expect(d.turn).toEqual({ kind: 'over', outcome: 'Draw' })
  })

  it('reaches exactly the 5,478 legal positions, 958 endings and 255,168 games of tic-tac-toe', () => {
    const a = analyze(net)
    const boards = new Set([...a.nodes.values()].map((n) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (n.marking[`x_${i}`] ? 'x' : n.marking[`o_${i}`] ? 'o' : '.')).join('')))
    expect(a.complete).toBe(true)
    expect(a.nodes.size).toBe(5478)
    expect(boards.size).toBe(5478)
    expect(Object.fromEntries(a.outcomes)).toEqual({ 'X wins': 626, 'O wins': 316, Draw: 16 })
    expect(a.plays).toBe(255_168)
    expect(a.stalls).toEqual([])
    expect(a.deadVerbs).toEqual([])
  })
})
