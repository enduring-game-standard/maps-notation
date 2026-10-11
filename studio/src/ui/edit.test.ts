import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { check } from '../core/check'
import { parse, print } from '../core/text'
import { addState, addVerb, connect, deleteSeat, deleteSelection, renameNode, updateArc, updateSeat } from './edit'
import { docReducer } from './history'

const ttt = () => parse(readFileSync(new URL('../../../examples/tic-tac-toe.maps', import.meta.url), 'utf8'))

describe('editing a net', () => {
  it('connects state to verb as take and verb to state as give, never state to state', () => {
    let [net, p] = addState(ttt(), 0, 0)
    let v: string
    ;[net, v] = addVerb(net, 100, 0)
    expect(connect(net, { kind: 'state', id: p }, { kind: 'state', id: 'x_1' })).toBeNull()
    const [n1, a1] = connect(net, { kind: 'state', id: p }, { kind: 'verb', id: v })!
    expect(a1.arcKind).toBe('take')
    const [n2, a2] = connect(n1, { kind: 'verb', id: v }, { kind: 'state', id: p })!
    expect(a2.arcKind).toBe('give')
    expect(connect(n2, { kind: 'state', id: p }, { kind: 'verb', id: v })).toBeNull()
    expect(check(parse(print(n2)))).toEqual([])
  })

  it('deleting a state removes the arcs that touched it', () => {
    const net = deleteSelection(ttt(), { kind: 'state', id: 'x_to_move' })
    expect(net.arcs.some((a) => a.state === 'x_to_move')).toBe(false)
    expect(check(net)).toEqual([])
  })

  it('renaming a node or seat carries every reference with it', () => {
    let net = renameNode(ttt(), { kind: 'state', id: 'empty_5' }, 'centre')
    net = updateSeat(net, 'x', { id: 'cross' })
    expect(check(net)).toEqual([])
    expect(print(net)).toContain('take centre')
    expect(print(net)).toContain('by cross')
  })

  it('refuses an arc kind change that would duplicate an arc', () => {
    let [net, p] = addState(ttt(), 0, 0)
    net = connect(net, { kind: 'state', id: p }, { kind: 'verb', id: 'pass_to_o' })![0]
    net = updateArc(net, { kind: 'arc', state: p, verb: 'pass_to_o', arcKind: 'take' }, { kind: 'need' })![0]
    net = connect(net, { kind: 'state', id: p }, { kind: 'verb', id: 'pass_to_o' })![0]
    expect(updateArc(net, { kind: 'arc', state: p, verb: 'pass_to_o', arcKind: 'take' }, { kind: 'need' })).toBeNull()
  })

  it('a removed seat hands its verbs to the world', () => {
    const net = deleteSeat(ttt(), 'o')
    expect(net.verbs.filter((v) => v.id.startsWith('o_marks')).every((v) => v.by === 'world')).toBe(true)
  })

  it('a drag is one undo step', () => {
    const a = ttt()
    const b = { ...a, title: 'b' }
    const c = { ...a, title: 'c' }
    let d = docReducer({ net: a, past: [], future: [] }, { type: 'checkpoint' })
    d = docReducer(d, { type: 'live', net: b })
    d = docReducer(d, { type: 'live', net: c })
    d = docReducer(d, { type: 'undo' })
    expect(d.net).toBe(a)
    expect(docReducer(d, { type: 'redo' }).net).toBe(c)
  })
})
