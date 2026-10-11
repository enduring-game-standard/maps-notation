import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analyze } from './analyze'
import { check } from './check'
import { canSee, compile, settle, whoseTurn } from './engine'
import { initialMarking } from './model'
import { parse, print } from './text'

const src = readFileSync(new URL('../../../examples/call-the-coin.maps', import.meta.url), 'utf8')
const net = parse(src)
const c = compile(net)

describe('call the coin: chance and hidden information', () => {
  it('prints back exactly as written by hand', () => {
    expect(print(net)).toBe(src)
    expect(check(net)).toEqual([])
  })

  it('the world flips before the caller may speak, at even odds', () => {
    const t = whoseTurn(c, initialMarking(net))
    if (t.kind !== 'world') throw new Error(t.kind)
    expect(t.branches.map((b) => [b.verb.id, b.p])).toEqual([['flip_heads', 0.5], ['flip_tails', 0.5]])
  })

  it('weights set the odds of a tie', () => {
    const loaded = parse(src.replace('verb flip_heads "Lands heads" by world', 'verb flip_heads "Lands heads" by world weight 3'))
    const t = whoseTurn(compile(loaded), initialMarking(loaded))
    if (t.kind !== 'world') throw new Error(t.kind)
    expect(t.branches.map((b) => b.p)).toEqual([0.75, 0.25])
  })

  it('the caller cannot see the covered coin', () => {
    const covered = net.places.filter((p) => !canSee(p, 'caller')).map((p) => p.id)
    expect(covered).toEqual(['heads', 'tails'])
  })

  it('a chance result shows its odds in the transcript', () => {
    const { said, turn } = settle(c, initialMarking(net), () => 0.9)
    expect(said).toEqual([{ speaker: 'world', verb: 'flip_tails', p: 0.5 }])
    expect(turn.kind).toBe('seats')
  })

  it('has four plays: two coin results times two calls, half of them won', () => {
    const a = analyze(net)
    expect(a.plays).toBe(4)
    expect(Object.fromEntries(a.playsBy)).toEqual({ 'Caller wins': 2, 'Caller loses': 2 })
    expect(Object.fromEntries(a.outcomes)).toEqual({ 'Caller wins': 1, 'Caller loses': 1 })
    expect(a.stalls).toEqual([])
  })
})
