import { readFileSync, writeFileSync } from 'node:fs'
import type { Net } from '../../src/core/model'
import { parse, print } from '../../src/core/text'
import { encounterFile, modeled, OUT } from './build'
import { LINK } from './gen'

/**
 * Every encounter in one net. Link first chooses whom to meet; each encounter keeps its own states and verbs under a
 * prefix, so the atlas plays exactly as the encounter files do once the choice is made.
 */
export const atlas = (encounters: { name: string; net: Net }[]): Net => {
  const out: Net = {
    title: 'Ocarina of Time combat: every encounter',
    seats: [{ id: LINK, name: 'Link', color: '#3a7d44' }],
    groups: [{ id: 'atlas', label: 'choose an encounter' }],
    states: [{ id: 'choose_encounter', label: 'Link chooses whom to fight', marks: 1, seenBy: 'all', group: 'atlas', x: 120, y: 80 }],
    verbs: [],
    arcs: [],
  }
  const perRow = 10
  let rowTop = 300
  let rowHeight = 0
  let left = 0
  encounters.forEach(({ name, net }, i) => {
    if (i % perRow === 0 && i) {
      rowTop += rowHeight + 400
      rowHeight = 0
      left = 0
    }
    const xs = [...net.states, ...net.verbs].map((n) => n.x)
    const ys = [...net.states, ...net.verbs].map((n) => n.y)
    const dx = left - Math.min(...xs)
    const dy = rowTop - Math.min(...ys)
    left += Math.max(...xs) - Math.min(...xs) + 400
    rowHeight = Math.max(rowHeight, Math.max(...ys) - Math.min(...ys))
    const id = (x: string) => `${name}__${x}`
    out.groups.push(...net.groups.map((g) => ({ id: id(g.id), label: `${net.title.replace(/^.*Link vs /, '')}: ${g.label}` })))
    out.states.push(...net.states.map((s) => ({ ...s, id: id(s.id), marks: s.id === 'choose_age' ? 0 : s.marks, group: s.group && id(s.group), x: s.x + dx, y: s.y + dy })))
    out.verbs.push(...net.verbs.map((v) => ({ ...v, id: id(v.id), group: v.group && id(v.group), x: v.x + dx, y: v.y + dy })))
    out.arcs.push(...net.arcs.map((a) => ({ ...a, state: id(a.state), verb: id(a.verb), via: a.via?.map((p) => ({ x: p.x + dx, y: p.y + dy })) })))
    const meet = `meet_${name}`
    out.verbs.push({ id: meet, label: `Fight ${net.title.replace(/^.*Link vs /, '')}`, by: LINK, priority: 0, weight: 1, group: 'atlas', x: 120 + (i % perRow) * 140, y: 160 + Math.floor(i / perRow) * 70 })
    out.arcs.push({ kind: 'take', state: 'choose_encounter', verb: meet, count: 1 }, { kind: 'give', state: id('choose_age'), verb: meet, count: 1 })
  })
  return out
}

export const ATLAS = new URL('ocarina-combat.maps', OUT)

if (import.meta.url === `file://${process.argv[1]}`) {
  const encounters = modeled().map((s) => {
    const f = encounterFile(s.overlay)
    return { name: f.replace(/\.maps$/, ''), net: parse(readFileSync(new URL(`encounters/${f}`, OUT), 'utf8')) }
  })
  const net = atlas(encounters)
  writeFileSync(ATLAS, print(net))
  console.log(`atlas: ${encounters.length} encounters, ${net.states.length} states, ${net.verbs.length} verbs, ${net.arcs.length} arcs`)
}
