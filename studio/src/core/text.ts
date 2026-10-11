import { ARC_KINDS, emptyNet, isIdent, type ArcKind, type Net, type State, type Verb } from './model'

export const HEADER = 'maps 2'

export class MapsSyntaxError extends Error {
  constructor(
    public line: number,
    message: string,
  ) {
    super(`line ${line}: ${message}`)
  }
}

const tokenize = (line: string, n: number): string[] => {
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === ' ' || ch === '\t') i++
    else if (ch === '#') break
    else if (ch === '"') {
      let s = ''
      for (i++; ; i++) {
        if (i >= line.length) throw new MapsSyntaxError(n, 'unterminated string')
        if (line[i] === '"') break
        if (line[i] === '\\') i++
        s += line[i]
      }
      i++
      out.push('"' + s)
    } else {
      let j = i
      while (j < line.length && line[j] !== ' ' && line[j] !== '\t') j++
      out.push(line.slice(i, j))
      i = j
    }
  }
  return out
}

const quoted = (tok: string | undefined, n: number, what: string) => {
  if (!tok?.startsWith('"')) throw new MapsSyntaxError(n, `expected quoted ${what}`)
  return tok.slice(1)
}
const ident = (tok: string | undefined, n: number, what: string) => {
  if (!tok || !isIdent(tok)) throw new MapsSyntaxError(n, `expected ${what} name (lowercase, digits, _), got ${tok ?? 'nothing'}`)
  return tok
}
const int = (tok: string | undefined, n: number, what: string) => {
  if (!tok || !/^-?\d+$/.test(tok)) throw new MapsSyntaxError(n, `expected a whole number for ${what}`)
  return Number(tok)
}

export const parse = (src: string): Net => {
  const net = emptyNet()
  let verb: Verb | undefined
  let sawHeader = false
  src.split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1
    const t = tokenize(raw, n)
    if (!t.length) return
    if (!sawHeader) {
      if (t.join(' ') !== HEADER) throw new MapsSyntaxError(n, `a MAPS file starts with "${HEADER}"`)
      sawHeader = true
      return
    }
    const indented = /^\s/.test(raw)
    if (indented) {
      if (!verb) throw new MapsSyntaxError(n, 'an indented arc must follow a verb')
      const kind = t[0] as ArcKind
      if (!ARC_KINDS.includes(kind)) throw new MapsSyntaxError(n, `arcs are ${ARC_KINDS.join(', ')}; got ${t[0]}`)
      if (t.length !== 2 && t.length !== 3) throw new MapsSyntaxError(n, `an arc is "${kind} state" or "${kind} count state"`)
      const count = t.length === 3 ? int(t[1], n, 'count') : 1
      if (count < 1) throw new MapsSyntaxError(n, 'an arc count is at least 1')
      net.arcs.push({ kind, count, state: ident(t[t.length - 1], n, 'state'), verb: verb.id })
      return
    }
    verb = undefined
    const [kw, ...rest] = t
    switch (kw) {
      case 'title':
        if (rest.length !== 1) throw new MapsSyntaxError(n, 'title takes one quoted label')
        net.title = quoted(rest[0], n, 'title')
        break
      case 'seat':
      {
        const seat = { id: ident(rest[0], n, 'seat'), name: quoted(rest[1], n, 'seat name'), color: '#888888' }
        attrs(rest.slice(2), n, { color: (a) => (seat.color = quoted(a(), n, 'color')) })
        net.seats.push(seat)
        break
      }
      case 'group':
        if (rest.length !== 2) throw new MapsSyntaxError(n, 'group takes a name and a quoted label')
        net.groups.push({ id: ident(rest[0], n, 'group'), label: quoted(rest[1], n, 'group label') })
        break
      case 'state': {
        const p: State = { id: ident(rest[0], n, 'state'), label: quoted(rest[1], n, 'state label'), marks: 0, seenBy: 'all', x: 0, y: 0 }
        attrs(rest.slice(2), n, {
          marks: (a) => (p.marks = int(a(), n, 'marks')),
          'seen-by': (a) => {
            const v = a()
            p.seenBy = v === 'all' ? 'all' : v === 'none' ? [] : v.split(',').map((s) => ident(s, n, 'seat'))
          },
          ends: (a) => (p.ends = quoted(a(), n, 'outcome')),
          in: (a) => (p.group = ident(a(), n, 'group')),
          at: (a) => ((p.x = int(a(), n, 'x')), (p.y = int(a(), n, 'y'))),
        })
        net.states.push(p)
        break
      }
      case 'verb': {
        const v: Verb = { id: ident(rest[0], n, 'verb'), label: quoted(rest[1], n, 'verb label'), by: '', priority: 0, weight: 1, x: 0, y: 0 }
        attrs(rest.slice(2), n, {
          by: (a) => (v.by = ident(a(), n, 'speaker')),
          priority: (a) => (v.priority = int(a(), n, 'priority')),
          weight: (a) => (v.weight = int(a(), n, 'weight')),
          in: (a) => (v.group = ident(a(), n, 'group')),
          at: (a) => ((v.x = int(a(), n, 'x')), (v.y = int(a(), n, 'y'))),
        })
        if (!v.by) throw new MapsSyntaxError(n, `verb ${v.id} must say who speaks it: "by world" or "by <seat>"`)
        net.verbs.push(v)
        verb = v
        break
      }
      default:
        throw new MapsSyntaxError(n, `unknown statement "${kw}"`)
    }
  })
  if (!sawHeader) throw new MapsSyntaxError(1, `a MAPS file starts with "${HEADER}"`)
  return net
}

const attrs = (toks: string[], n: number, handlers: Record<string, (next: () => string) => void>) => {
  let i = 0
  const used = new Set<string>()
  const next = () => {
    if (i >= toks.length) throw new MapsSyntaxError(n, 'attribute is missing its value')
    return toks[i++]
  }
  while (i < toks.length) {
    const key = toks[i++]
    const h = handlers[key]
    if (!h) throw new MapsSyntaxError(n, `unknown attribute "${key}"; expected ${Object.keys(handlers).join(', ')}`)
    if (used.has(key)) throw new MapsSyntaxError(n, `"${key}" is given twice`)
    used.add(key)
    h(next)
  }
}

const q = (s: string) => `"${s.replace(/(["\\])/g, '\\$1').replace(/\n/g, ' ')}"`

export const print = (net: Net): string => {
  const lines = [HEADER, `title ${q(net.title)}`, '']
  for (const s of net.seats) lines.push(`seat ${s.id} ${q(s.name)} color ${q(s.color)}`)
  for (const g of net.groups) lines.push(`group ${g.id} ${q(g.label)}`)
  if (net.seats.length || net.groups.length) lines.push('')
  for (const p of net.states) {
    const a = [`state ${p.id} ${q(p.label)}`]
    if (p.marks) a.push(`marks ${p.marks}`)
    if (p.seenBy !== 'all') a.push(`seen-by ${p.seenBy.length ? p.seenBy.join(',') : 'none'}`)
    if (p.ends !== undefined) a.push(`ends ${q(p.ends)}`)
    if (p.group) a.push(`in ${p.group}`)
    a.push(`at ${Math.round(p.x)} ${Math.round(p.y)}`)
    lines.push(a.join(' '))
  }
  for (const v of net.verbs) {
    lines.push('')
    const a = [`verb ${v.id} ${q(v.label)} by ${v.by}`]
    if (v.priority) a.push(`priority ${v.priority}`)
    if (v.weight !== 1) a.push(`weight ${v.weight}`)
    if (v.group) a.push(`in ${v.group}`)
    a.push(`at ${Math.round(v.x)} ${Math.round(v.y)}`)
    lines.push(a.join(' '))
    for (const arc of net.arcs.filter((x) => x.verb === v.id))
      lines.push(`  ${arc.kind}${arc.count !== 1 ? ' ' + arc.count : ''} ${arc.state}`)
  }
  return lines.join('\n') + '\n'
}
