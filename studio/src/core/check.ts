import { WORLD, type Net } from './model'

export interface Problem {
  severity: 'error' | 'warning'
  message: string
  at?: string
}

/** Structural problems: anything that makes the net mean nothing or mean two things. */
export const check = (net: Net): Problem[] => {
  const out: Problem[] = []
  const err = (message: string, at?: string) => out.push({ severity: 'error', message, at })
  const warn = (message: string, at?: string) => out.push({ severity: 'warning', message, at })
  const ids = new Map<string, string>()
  const claim = (id: string, what: string) => {
    if (ids.has(id)) err(`"${id}" names both a ${ids.get(id)} and a ${what}`, id)
    else ids.set(id, what)
  }
  net.seats.forEach((s) => claim(s.id, 'seat'))
  if (ids.has(WORLD)) err('"world" is the rules themselves; a seat cannot use that name', WORLD)
  net.places.forEach((p) => claim(p.id, 'place'))
  net.verbs.forEach((v) => claim(v.id, 'verb'))
  const seats = new Set(net.seats.map((s) => s.id))
  const places = new Set(net.places.map((p) => p.id))
  const groups = new Set(net.groups.map((g) => g.id))
  for (const v of net.verbs) {
    if (v.by !== WORLD && !seats.has(v.by)) err(`${v.id} is spoken by "${v.by}", which is not a seat`, v.id)
    if (v.weight < 0) err(`${v.id} has a negative weight`, v.id)
    if (v.by !== WORLD && (v.priority || v.weight !== 1)) warn(`${v.id}: priority and weight only order the world's responses; a seat simply chooses`, v.id)
    if (v.group && !groups.has(v.group)) err(`${v.id} is in unknown group ${v.group}`, v.id)
    if (!net.arcs.some((a) => a.verb === v.id && a.kind !== 'give'))
      warn(`${v.id} has no inputs, so it is always possible${v.by === WORLD ? ' and the world never falls silent' : ''}`, v.id)
  }
  for (const p of net.places) {
    if (p.seenBy !== 'all') for (const s of p.seenBy) if (!seats.has(s)) err(`${p.id} is seen by unknown seat ${s}`, p.id)
    if (p.group && !groups.has(p.group)) err(`${p.id} is in unknown group ${p.group}`, p.id)
    if (p.marks < 0) err(`${p.id} starts with negative marks`, p.id)
  }
  const seen = new Set<string>()
  for (const a of net.arcs) {
    if (!places.has(a.place)) err(`${a.verb} ${a.kind}s unknown place ${a.place}`, a.verb)
    const key = `${a.kind}|${a.place}|${a.verb}`
    if (seen.has(key)) err(`${a.verb} has two "${a.kind} ${a.place}" arcs; use a count instead`, a.verb)
    seen.add(key)
  }
  return out
}
