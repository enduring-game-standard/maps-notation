import { WORLD, type Net } from './model'

export interface Problem {
  severity: 'error' | 'warning'
  message: string
  at?: string
}

const RESERVED = [WORLD, 'all', 'none']

/** Structural problems: anything that makes the net mean nothing, mean two things, or leak a secret. */
export const check = (net: Net): Problem[] => {
  const out: Problem[] = []
  const err = (message: string, at?: string) => out.push({ severity: 'error', message, at })
  const warn = (message: string, at?: string) => out.push({ severity: 'warning', message, at })
  const ids = new Map<string, string>()
  const claim = (id: string, what: string) => {
    if (RESERVED.includes(id)) err(`"${id}" is reserved and cannot name a ${what}`, id)
    else if (ids.has(id)) err(`"${id}" names both a ${ids.get(id)} and a ${what}`, id)
    else ids.set(id, what)
  }
  net.seats.forEach((s) => claim(s.id, 'seat'))
  net.groups.forEach((g) => claim(g.id, 'group'))
  net.states.forEach((p) => claim(p.id, 'state'))
  net.verbs.forEach((v) => claim(v.id, 'verb'))
  for (const s of net.seats) if (!/^#[0-9a-f]{6}$/i.test(s.color)) err(`seat ${s.id} has color "${s.color}"; use #rrggbb`, s.id)

  const seats = new Set(net.seats.map((s) => s.id))
  const stateById = new Map(net.states.map((p) => [p.id, p]))
  const verbIds = new Set(net.verbs.map((v) => v.id))
  const groups = new Set(net.groups.map((g) => g.id))
  const speakerOf = new Map(net.verbs.map((v) => [v.id, v.by]))
  const hasInput = new Set(net.arcs.filter((a) => a.kind !== 'give').map((a) => a.verb))
  for (const v of net.verbs) {
    if (v.by !== WORLD && !seats.has(v.by)) err(`${v.id} is spoken by "${v.by}", which is not a seat`, v.id)
    if (v.by === WORLD && v.weight < 1) err(`${v.id} has weight ${v.weight}; a world verb's weight is at least 1`, v.id)
    if (v.by !== WORLD && (v.priority || v.weight !== 1)) warn(`${v.id}: priority and weight only order the world's responses; a seat simply chooses`, v.id)
    if (v.group && !groups.has(v.group)) err(`${v.id} is in unknown group ${v.group}`, v.id)
    if (!hasInput.has(v.id))
      warn(`${v.id} has no inputs, so it is always possible${v.by === WORLD ? ' and the world never falls silent' : ''}`, v.id)
  }
  for (const p of net.states) {
    if (p.seenBy !== 'all') for (const s of p.seenBy) if (!seats.has(s)) err(`${p.id} is seen by unknown seat ${s}`, p.id)
    if (p.group && !groups.has(p.group)) err(`${p.id} is in unknown group ${p.group}`, p.id)
    if (p.marks < 0) err(`${p.id} starts with negative marks`, p.id)
  }
  const seen = new Set<string>()
  for (const a of net.arcs) {
    if (!verbIds.has(a.verb)) err(`an arc to ${a.state} belongs to unknown verb ${a.verb}`, a.state)
    const state = stateById.get(a.state)
    if (!state) err(`${a.verb} ${a.kind}s unknown state ${a.state}`, a.verb)
    if (a.count < 1) err(`${a.verb} ${a.kind}s ${a.count} of ${a.state}; a count is at least 1`, a.verb)
    const key = `${a.kind}|${a.state}|${a.verb}`
    if (seen.has(key)) err(`${a.verb} has two "${a.kind} ${a.state}" arcs; use a count instead`, a.verb)
    seen.add(key)
    const speaker = speakerOf.get(a.verb)
    if (state && speaker && speaker !== WORLD && a.kind !== 'give' && state.seenBy !== 'all' && !state.seenBy.includes(speaker))
      warn(`${a.verb} ${a.kind}s ${a.state}, which ${speaker} cannot see; whether ${a.verb} is possible tells ${speaker} about it`, a.verb)
  }
  return out
}
