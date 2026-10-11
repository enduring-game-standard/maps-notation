import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { LIVELOCK, analyze } from './analyze'
import { check } from './check'
import { compile, fire, heardBy, replay, settle, whoseTurn, type Compiled, type Utterance } from './engine'
import { initialMarking, type Marking } from './model'
import { parse, print } from './text'

const net = (body: string) => parse(`maps 2\n${body}\n`)
const errorsOf = (body: string) => check(net(body)).map((p) => `${p.severity}: ${p.message}`)

describe('text form', () => {
  it.each([
    ['trailing spaces', 'title "x"   '],
    ['a whole-line comment', '# the board'],
    ['a trailing comment', 'title "x" # named later'],
  ])('accepts %s', (_, line) => expect(() => net(line)).not.toThrow())

  it.each([
    ['an unterminated string', 'title "abc', 'unterminated string'],
    ['a verb with no speaker', 'verb go "Go"', 'must say who speaks it'],
    ['an arc with extra words', 'verb go "Go" by world\n  take 2 a b', 'an arc is'],
    ['a bare arc', 'verb go "Go" by world\n  take', 'an arc is'],
    ['an attribute given twice', 'place a "A" marks 1 marks 2', 'given twice'],
    ['a missing header', null, 'starts with'],
    ['words after a title', 'title "A" bogus', 'one quoted label'],
    ['words after a group', 'group g "G" bogus', 'name and a quoted label'],
    ['a bare word where a label belongs', 'place a A', 'expected quoted'],
  ])('rejects %s', (_, body, message) => {
    expect(() => (body === null ? parse('place a "A"\n') : net(body))).toThrow(message)
  })

  it('reports the line of a syntax error', () => expect(() => net('title "x"\nplace A "A"')).toThrow('line 3'))

  it('prints a canonical file that parses back to the same net and the same text', () => {
    const n = net('seat ann "Ann" color "#123456"\nplace a "A \\"quoted\\"" marks 2 seen-by ann at 1 2\nverb go "Go" by ann at 3 4\n  take 2 a')
    expect(parse(print(n))).toEqual(n)
    expect(print(parse(print(n)))).toBe(print(n))
  })
})

describe('checker', () => {
  it.each([
    ['a reserved seat name', 'seat world "W" color "#000000"', 'reserved'],
    ['a seat named all', 'seat all "All" color "#000000"', 'reserved'],
    ['a name used twice', 'group a "G"\nplace a "A"', 'names both'],
    ['a bad color', 'seat ann "Ann" color "red"', '#rrggbb'],
    ['an unknown speaker', 'verb go "Go" by bob\n  take a\nplace a "A"', 'not a seat'],
    ['a world weight of zero', 'place a "A"\nverb go "Go" by world weight 0\n  take a', 'at least 1'],
    ['an unknown place', 'verb go "Go" by world\n  take nowhere', 'unknown place'],
    ['two identical arcs', 'place a "A"\nverb go "Go" by world\n  take a\n  take a', 'use a count'],
    ['a verb with no inputs', 'place a "A"\nverb go "Go" by world\n  give a', 'never falls silent'],
    ['a seat reading a place it cannot see', 'seat ann "Ann" color "#000000"\nplace a "A" seen-by none\nverb go "Go" by ann\n  need a', 'cannot see'],
  ])('reports %s', (_, body, message) => {
    expect(errorsOf(body).join('\n')).toContain(message)
  })

  it('reports an arc whose verb is gone', () => {
    const n = net('place a "A"')
    n.arcs.push({ kind: 'take', place: 'a', verb: 'ghost', count: 1 })
    expect(check(n).map((p) => p.message)).toContain('an arc to a belongs to unknown verb ghost')
  })
})

describe('the conversation', () => {
  it('reports a world that never falls silent instead of dropping it', () => {
    const n = net('seat ann "Ann" color "#000000"\nplace ready "Ready" marks 1\nplace p "P"\nplace q "Q"\nverb go "Go" by ann\n  take ready\n  give p\nverb ping "Ping" by world\n  take p\n  give q\nverb pong "Pong" by world\n  take q\n  give p')
    expect(() => settle(compile(n), fire(compile(n), initialMarking(n), 'go'))).toThrow('without falling silent')
    const a = analyze(n)
    expect(a.livelocks).toHaveLength(1)
    expect(Object.fromEntries(a.playsBy)).toEqual({ [LIVELOCK]: 1 })
  })

  it('names every outcome reached at once', () => {
    const n = net('place go "Go" marks 1\nplace a "A" ends "Ann wins"\nplace b "B" ends "Bo wins"\nverb tie "Tie" by world\n  take go\n  give a\n  give b')
    expect(settle(compile(n), initialMarking(n)).turn).toEqual({ kind: 'over', outcome: 'Ann wins and Bo wins' })
  })

  it('an unrelated world rule tied with a die does not change the odds of where the world settles', () => {
    const n = net('place d "Die" marks 1\nplace one "One"\nplace two "Two"\nplace u "Untidy" marks 1\nplace t "Tidy"\nverb r1 "Rolls 1" by world\n  take d\n  give one\nverb r2 "Rolls 2" by world weight 3\n  take d\n  give two\nverb tidy "Tidy" by world\n  take u\n  give t')
    const odds = settledOdds(compile(n), initialMarking(n))
    expect(odds.get('one')).toBeCloseTo(0.25)
    expect(odds.get('two')).toBeCloseTo(0.75)
  })

  it('interleaves seats that can speak at the same moment: two seats with two moves each give 8 transcripts', () => {
    const n = net('seat a "A" color "#000000"\nseat b "B" color "#000000"\nplace ra "A ready" marks 1\nplace rb "B ready" marks 1\nplace done "Done" ends "Done"\nplace ca "A chose" seen-by a\nplace cb "B chose" seen-by b\nverb a1 "A1" by a\n  take ra\n  give ca\nverb a2 "A2" by a\n  take ra\n  give ca\nverb b1 "B1" by b\n  take rb\n  give cb\nverb b2 "B2" by b\n  take rb\n  give cb\nverb reveal "Reveal" by world\n  take ca\n  take cb\n  give done')
    expect(analyze(n).plays).toBe(8)
  })

  it('a seat hears a world answer only when it can see every place the answer touches', () => {
    const coin = parse(readFileSync(new URL('../../../examples/call-the-coin.maps', import.meta.url), 'utf8'))
    const c = compile(coin)
    const flip: Utterance = { speaker: 'world', verb: 'flip_heads' }
    expect(heardBy(c, flip, 'caller')).toBeUndefined()
    expect(heardBy(c, flip, undefined)).toBe('flip_heads')
    expect(heardBy(c, { speaker: 'caller', verb: 'call_tails' }, 'caller')).toBe('call_tails')
  })

  it('replays a legal transcript and rejects an illegal one', () => {
    const coin = parse(readFileSync(new URL('../../../examples/call-the-coin.maps', import.meta.url), 'utf8'))
    const c = compile(coin)
    const good: Utterance[] = [
      { speaker: 'world', verb: 'flip_heads' },
      { speaker: 'caller', verb: 'call_heads' },
      { speaker: 'world', verb: 'right_heads' },
    ]
    const r = replay(c, good, initialMarking(coin))
    expect(r.ok && r.turn).toEqual({ kind: 'over', outcome: 'Caller wins' })
    expect(replay(c, [{ speaker: 'caller', verb: 'call_heads' }], initialMarking(coin))).toMatchObject({ ok: false, at: 0 })
  })
})

/** Probability that the world, answering on its own, ends up with a mark in each place. */
const settledOdds = (c: Compiled, m: Marking, p = 1, into = new Map<string, number>()) => {
  const turn = whoseTurn(c, m)
  if (turn.kind !== 'world') {
    for (const [place, n] of Object.entries(m)) if (n > 0) into.set(place, (into.get(place) ?? 0) + p)
    return into
  }
  for (const b of turn.branches) settledOdds(c, fire(c, m, b.verb.id), p * b.p, into)
  return into
}
