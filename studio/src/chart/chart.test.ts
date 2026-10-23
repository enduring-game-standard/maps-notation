import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WORLD, type Net } from '../core/model'
import { parse } from '../core/text'
import { buildChart, foldLabel } from './chart'
import { facetsOf } from './structure'
import { numberScrabble } from '../../tools/gen-number-scrabble'

const load = (f: string) => parse(readFileSync(new URL(`../../../examples/${f}`, import.meta.url), 'utf8'))
const ttt = load('tic-tac-toe.maps')
const coin = load('call-the-coin.maps')

const hash = (s: string) => {
  let h = 7
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}
const shuffled = (net: Net): Net => {
  const r = (s: string) => `n${hash(s).toString(36)}`
  const mix = <T,>(xs: T[]) => [...xs].sort((a, b) => hash(JSON.stringify(b)) - hash(JSON.stringify(a)))
  return {
    ...net,
    seats: mix(net.seats.map((s) => ({ ...s, id: r(s.id), name: '?' }))),
    states: mix(net.states.map((s) => ({ ...s, id: r(s.id), label: '?', group: undefined }))),
    verbs: mix(net.verbs.map((v) => ({ ...v, id: r(v.id), by: v.by === WORLD ? WORLD : r(v.by), label: '?', group: undefined }))),
    arcs: mix(net.arcs.map((a) => ({ ...a, state: r(a.state), verb: r(a.verb) }))),
  }
}

describe('facets', () => {
  it('finds the nine squares and the turn ring in tic-tac-toe, and leaves the counter out', () => {
    const f = facetsOf(ttt)
    expect(f).toHaveLength(10)
    expect(f.filter((x) => x.states.length === 3).map((x) => x.home).sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `empty_${i}`))
    const turn = f.find((x) => x.home === 'x_to_move')!
    expect(turn.states.sort()).toEqual(['drawn', 'judge_o', 'judge_x', 'o_to_move', 'o_won', 'x_to_move', 'x_won'])
    expect(f.flatMap((x) => x.states)).not.toContain('squares_left')
  })
  it('finds the coin and the call in call-the-coin, sharing their outcomes', () => {
    const f = facetsOf(coin)
    expect(f.map((x) => x.home).sort()).toEqual(['coin', 'may_call'])
    for (const x of f) expect(x.states).toEqual(expect.arrayContaining(['caller_won', 'caller_lost']))
  })
})

describe('shape', () => {
  it('does not change when every name is hidden and every list is shuffled', () => {
    expect(buildChart(shuffled(ttt)).shape).toBe(buildChart(ttt).shape)
    expect(buildChart(shuffled(coin)).shape).toBe(buildChart(coin).shape)
  })
  it('is the same for Number Scrabble and tic-tac-toe, which are one game', () => {
    expect(buildChart(numberScrabble()).shape).toBe(buildChart(ttt).shape)
  })
  it('changes when one priority changes the game', () => {
    const race = { ...ttt, verbs: ttt.verbs.map((v) => (v.id.includes('_line_') ? { ...v, priority: 0 } : v)) }
    expect(buildChart(race).shape).not.toBe(buildChart(ttt).shape)
  })
  it('folds the nine squares into one band and the nine marking verbs into one line', () => {
    const ch = buildChart(ttt)
    expect(ch.bands.map((b) => b.facets.length)).toEqual([1, 9])
    const marks = ch.bands[0].lines.filter((l) => l.kind === 'verb' && l.verbs.length === 9)
    expect(marks).toHaveLength(2)
    const lines = ch.bands[0].lines.filter((l) => l.kind === 'verb' && l.verbs.length === 8)
    expect(lines.map((l) => l.kind === 'verb' && [...l.cells.values()].map((c) => `${c.glyph}${c.times}`))).toEqual([['●3'], ['●3']])
  })
})

describe('foldLabel', () => {
  it('names a family once with its members in reading order', () => {
    expect(foldLabel(['X marks 3', 'X marks 1', 'X marks 2'])).toBe('X marks {1, 2, 3}')
    expect(foldLabel(['Lands heads'])).toBe('Lands heads')
  })
})
