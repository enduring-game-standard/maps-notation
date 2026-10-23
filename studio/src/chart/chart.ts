import { WORLD, type Arc, type Net, type Verb } from '../core/model'
import { canonicalColors, facetsOf, fnv, wlColors, type Facet } from './structure'

/** One arc drawn as a mark in a column: `+` gives, `−` takes, `●` needs, `○` is blocked by. */
export type Glyph = '+' | '−' | '●' | '○'
export interface Cell {
  glyph: Glyph
  count: number
  /** How many members of a folded family the arc reaches, as in "needs X on three squares". */
  times: number
}

export interface StateLine {
  kind: 'state'
  state: string
  depth: number
}

/** Where a move leads: down the outline to a new state, to a state drawn elsewhere, back home, or nowhere. */
export type Lead = 'child' | 'ref' | 'home' | 'self' | 'from'
export interface VerbLine {
  kind: 'verb'
  verbs: string[]
  from: string
  to: string
  depth: number
  lead: Lead
  /** The band that draws this verb's cells. Another band only names it. */
  primary: number
  cells: Map<string, Cell>
  /** For a line drawn once at its target: every state it leads there from. */
  froms?: string[]
}
export type Line = StateLine | VerbLine

export interface Column {
  key: string
  /** The states this column stands for, one per member of a folded family. */
  states: string[]
}
export interface ColumnGroup {
  label: string
  columns: Column[]
}

export interface Band {
  /** Facets with the same shape drawn once; the first is the one whose labels are shown. */
  facets: Facet[]
  label: string
  lines: Line[]
  groups: ColumnGroup[]
}

export interface Chart {
  title: string
  bands: Band[]
  /** States outside every facet: counts such as squares left or magic. */
  counts: string[]
  /** Verbs that move no facet and need no state in one. */
  loose: string[]
  /** A label-free fingerprint of the drawing. Two designs with the same shape print the same one. */
  shape: string
}

const FAN_IN = 4

const speakerKey = (v: Verb, color: Map<string, string>) => (v.by === WORLD ? `w${v.priority}/${v.weight}` : color.get(`p:${v.by}`)!)

const commonPrefix = (xs: string[]) => {
  let n = 0
  while (xs.every((x) => n < x.length && x[n] === xs[0][n])) n++
  return n
}

/** "X marks 1" … "X marks 9" reads as "X marks {1, 2, …, 9}". Labels with no words in common are listed. */
export const foldLabel = (labels: string[]) => {
  const uniq = [...new Set(labels)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  if (uniq.length === 1) return uniq[0]
  let pre = commonPrefix(uniq)
  if (uniq.some((x) => pre < x.length && x[pre] !== ' ' && pre > 0 && x[pre - 1] !== ' ')) pre = uniq[0].lastIndexOf(' ', pre - 1) + 1
  const rev = uniq.map((x) => [...x.slice(pre)].reverse().join(''))
  let suf = commonPrefix(rev)
  if (rev.some((x) => suf < x.length && x[suf] !== ' ' && suf > 0 && x[suf - 1] !== ' ')) suf = Math.max(0, rev[0].lastIndexOf(' ', suf - 1) + 1)
  if (!pre && !suf) return uniq.join(' · ')
  const mids = uniq.map((x) => x.slice(pre, x.length - suf))
  const shown = mids.length > 4 ? [...mids.slice(0, 2), '…', mids[mids.length - 1]] : mids
  return `${uniq[0].slice(0, pre)}{${shown.join(', ')}}${uniq[0].slice(uniq[0].length - suf)}`
}

/** A family's shared name: "1 empty" … "9 empty" is "n empty". */
export const foldPattern = (labels: string[]) => foldLabel(labels).replace(/\{[^}]*\}/, 'n')

export const buildChart = (net: Net): Chart => {
  // Structural colors decide what folds; canonical colors break every remaining tie without looking at names.
  const color = wlColors(net)
  const rank = canonicalColors(net)
  const facets = facetsOf(net)
  const byRank = (a: string, b: string) => rank.get(a)!.localeCompare(rank.get(b)!)
  const stateById = new Map(net.states.map((s) => [s.id, s]))
  const verbById = new Map(net.verbs.map((v) => [v.id, v]))
  const arcsOf = new Map<string, Arc[]>(net.verbs.map((v) => [v.id, []]))
  for (const a of net.arcs) arcsOf.get(a.verb)!.push(a)

  // A verb moves a facet when it takes one of its states and gives one. One-hot means at most one of each.
  const moves = facets.map((f) => {
    const inF = new Set(f.states)
    const m = new Map<string, { from: string; to: string }>()
    for (const v of net.verbs) {
      const as = arcsOf.get(v.id)!
      const from = as.find((a) => a.kind === 'take' && inF.has(a.state))?.state
      const to = as.find((a) => a.kind === 'give' && inF.has(a.state))?.state
      if (from && to) m.set(v.id, { from, to })
    }
    return m
  })

  // Lay each facet out as a tree from home: depth is the fewest moves from home, and children are ordered by
  // structure alone (deepest branch first, then by speaker and outcome), so naming and order cannot change the shape.
  const outline = (fi: number) => {
    const f = facets[fi]
    const edges = [...moves[fi]].map(([verb, e]) => ({ verb, ...e }))
    const localKey = (s: string) => {
      const st = stateById.get(s)!
      const into = edges.filter((e) => e.to === s && e.from !== s).map((e) => speakerKey(verbById.get(e.verb)!, color)).sort()
      return `${st.ends !== undefined ? 1 : 0}${st.marks > 0 ? 1 : 0}|${into.join(',')}`
    }
    const depth = new Map<string, number>([[f.home, 0]])
    for (let frontier = [f.home]; frontier.length; ) {
      const next: string[] = []
      for (const s of frontier)
        for (const e of edges)
          if (e.from === s && !depth.has(e.to)) {
            depth.set(e.to, depth.get(s)! + 1)
            next.push(e.to)
          }
      frontier = next
    }
    // Of several states one move closer to home, the parent is the first by structure, never by name or order.
    const parent = new Map<string, string>()
    for (const t of f.states) {
      const ps = [...new Set(edges.filter((e) => e.to === t && e.from !== t && depth.get(e.from) === depth.get(t)! - 1).map((e) => e.from))]
      const best = ps.sort((a, b) => color.get(`s:${a}`)!.localeCompare(color.get(`s:${b}`)!) || localKey(a).localeCompare(localKey(b)) || byRank(`s:${a}`, `s:${b}`))[0]
      if (best && t !== f.home) parent.set(t, best)
    }
    const roots = [f.home, ...f.states.filter((s) => !depth.has(s)).sort((a, b) => localKey(a).localeCompare(localKey(b)) || byRank(`s:${a}`, `s:${b}`))]
    for (const r of roots) if (!depth.has(r)) depth.set(r, 0)
    const kids = (s: string) => f.states.filter((c) => parent.get(c) === s)
    const size = (s: string): number => 1 + kids(s).reduce((t, c) => t + size(c), 0)
    const order = (s: string) =>
      kids(s).sort((a, b) => size(b) - size(a) || localKey(a).localeCompare(localKey(b)) || byRank(`s:${a}`, `s:${b}`))
    return { edges, depth, parent, roots, order }
  }
  const outlines = facets.map((_, i) => outline(i))

  // States in outline order give every facet a fixed column order and give folded families aligned positions.
  const treeOrder = outlines.map((o) => {
    const out: string[] = []
    const walk = (s: string) => {
      out.push(s)
      o.order(s).forEach(walk)
    }
    o.roots.forEach(walk)
    return out
  })
  const shapeOf = (fi: number) => {
    const o = outlines[fi]
    const pos = new Map(treeOrder[fi].map((s, i) => [s, i]))
    const e = o.edges.map((x) => `${pos.get(x.from)}>${pos.get(x.to)}:${speakerKey(verbById.get(x.verb)!, color)}`).sort()
    const st = treeOrder[fi].map((s) => `${o.depth.get(s)}${stateById.get(s)!.ends !== undefined ? 'e' : ''}`)
    return fnv(st.join() + '|' + e.join())
  }
  const facetShape = facets.map((_, i) => shapeOf(i))

  // A facet is driven when every verb that moves it also moves a larger facet, the way each square is driven by
  // the turn. Driven facets with the same shape and no state in common are one family and fold into one band.
  const driven = facets.map((f, i) => [...moves[i].keys()].every((v) => facets.some((g, j) => j !== i && g.states.length > f.states.length && moves[j].has(v))))
  const fold: number[][] = []
  for (let i = 0; i < facets.length; i++) {
    const g = fold.find((g) => driven[i] && driven[g[0]] && facetShape[g[0]] === facetShape[i] && g.every((j) => !facets[j].states.some((s) => facets[i].states.includes(s))))
    if (g) g.push(i)
    else fold.push([i])
  }
  const primaryCount = (fi: number) => moves[fi].size
  fold.sort((a, b) => facets[b[0]].states.length - facets[a[0]].states.length || primaryCount(b[0]) - primaryCount(a[0]) || facetShape[a[0]].localeCompare(facetShape[b[0]]) || byRank(`s:${facets[a[0]].home}`, `s:${facets[b[0]].home}`))
  for (const g of fold) g.sort((a, b) => byRank(`s:${facets[a].home}`, `s:${facets[b].home}`))
  const bandOf = new Map<number, number>()
  fold.forEach((g, bi) => g.forEach((fi) => bandOf.set(fi, bi)))

  // Each state's column: the first band whose facet holds it, at its position in that facet's outline.
  const columnOf = new Map<string, string>()
  const counts = net.states
    .filter((s) => !facets.some((f) => f.states.includes(s.id)))
    .map((s) => s.id)
    .sort((a, b) => byRank(`s:${a}`, `s:${b}`))
  counts.forEach((s, i) => columnOf.set(s, `c:${i}`))
  for (const s of net.states) {
    const holders = facets.map((_, i) => i).filter((i) => facets[i].states.includes(s.id))
    const fi = holders.sort((a, b) => bandOf.get(a)! - bandOf.get(b)!)[0]
    if (fi !== undefined) columnOf.set(s.id, `b${bandOf.get(fi)}:${treeOrder[fi].indexOf(s.id)}`)
  }

  // Each verb draws its cells in one band: the first band it moves, else the first band holding a state it needs.
  const primary = new Map<string, number>()
  const anchor = new Map<string, string>()
  const loose: string[] = []
  for (const v of net.verbs) {
    const moved = facets.map((_, fi) => fi).filter((fi) => moves[fi].has(v.id))
    if (moved.length) {
      primary.set(v.id, Math.min(...moved.map((fi) => bandOf.get(fi)!)))
      continue
    }
    const needed = arcsOf
      .get(v.id)!
      .filter((a) => a.kind === 'need' && !columnOf.get(a.state)!.startsWith('c:'))
      .sort((a, b) => columnOf.get(a.state)!.localeCompare(columnOf.get(b.state)!, undefined, { numeric: true }))[0]
    if (needed) {
      primary.set(v.id, Number(columnOf.get(needed.state)!.slice(1).split(':')[0]))
      anchor.set(v.id, needed.state)
    } else loose.push(v.id)
  }

  const cellsOf = (vid: string, bi: number) => {
    const own = new Set(fold[bi].flatMap((fi) => (moves[fi].has(vid) ? [moves[fi].get(vid)!.from, moves[fi].get(vid)!.to] : [])))
    const cells = new Map<string, Cell>()
    for (const a of arcsOf.get(vid)!) {
      if (own.has(a.state) && (a.kind === 'take' || a.kind === 'give')) continue
      if (anchor.get(vid) === a.state) continue
      const key = columnOf.get(a.state)!
      const glyph: Glyph = a.kind === 'take' ? '−' : a.kind === 'give' ? '+' : a.kind === 'need' ? '●' : '○'
      const k = `${key}${glyph}`
      const c = cells.get(k)
      if (c) c.times++
      else cells.set(k, { glyph, count: a.count, times: 1 })
    }
    return cells
  }
  const cellSig = (cells: Map<string, Cell>) => [...cells].map(([k, c]) => `${k}${c.count}x${c.times}`).sort().join()

  const bands: Band[] = fold.map((g, bi) => {
    const fi = g[0]
    const o = outlines[fi]
    const f = facets[fi]
    // Line up the members of a folded family by outline position, so "X marks 5" sits with "X marks 1".
    const memberAt = g.map((m) => new Map(treeOrder[m].map((s, i) => [s, treeOrder[fi][i]])))
    const edgesHere: { verb: string; from: string; to: string }[] = []
    g.forEach((m, k) => {
      for (const [verb, e] of moves[m]) edgesHere.push({ verb, from: memberAt[k].get(e.from)!, to: memberAt[k].get(e.to)! })
      for (const [verb, s] of anchor) if (primary.get(verb) === bi && treeOrder[m].includes(s)) edgesHere.push({ verb, from: memberAt[k].get(s)!, to: memberAt[k].get(s)! })
    })
    const lines: Line[] = []
    const verbLines = (from: string, to: string, lead: Lead, depth: number) => {
      const here = edgesHere.filter((e) => e.from === from && e.to === to)
      const groups = new Map<string, string[]>()
      for (const e of here) {
        const v = verbById.get(e.verb)!
        const p = primary.get(e.verb)!
        const sig = `${speakerKey(v, color)}|${p}|${p === bi ? cellSig(cellsOf(e.verb, bi)) : ''}`
        groups.set(sig, [...(groups.get(sig) ?? []), e.verb])
      }
      const out = [...groups.values()].map((verbs) => {
        const p = primary.get(verbs[0])!
        const cells = new Map<string, Cell>()
        if (p === bi) for (const [k, c] of cellsOf(verbs[0], bi)) cells.set(k, c)
        return { kind: 'verb', verbs, from, to, depth, lead, primary: p, cells } satisfies VerbLine
      })
      return out.sort((a, b) => b.verbs.length - a.verbs.length || cellSig(a.cells).localeCompare(cellSig(b.cells)) || byRank(`v:${a.verbs[0]}`, `v:${b.verbs[0]}`))
    }
    const walk = (s: string) => {
      const d = o.depth.get(s)!
      lines.push({ kind: 'state', state: s, depth: d })
      for (const c of o.order(s)) {
        lines.push(...verbLines(s, c, 'child', d))
        walk(c)
      }
      const targets = [...new Set(edgesHere.filter((e) => e.from === s).map((e) => e.to))].sort((a, b) => byRank(`s:${a}`, `s:${b}`))
      for (const t of targets.filter((t) => t !== s && t !== f.home && o.parent.get(t) !== s)) lines.push(...verbLines(s, t, 'ref', d))
      lines.push(...verbLines(s, s, 'self', d))
      if (s !== f.home) lines.push(...verbLines(s, f.home, 'home', d))
    }
    o.roots.forEach(walk)

    // Harel's "hurt from anywhere": the same move into one state from many states is drawn once, under that state.
    const fanSig = (l: VerbLine) => `${l.to}|${speakerKey(verbById.get(l.verbs[0])!, color)}|${l.primary}|${cellSig(l.cells)}`
    const fans = new Map<string, VerbLine[]>()
    for (const l of lines) if (l.kind === 'verb' && l.to !== f.home && l.from !== l.to) fans.set(fanSig(l), [...(fans.get(fanSig(l)) ?? []), l])
    for (const group of fans.values()) {
      if (new Set(group.map((l) => l.from)).size < FAN_IN) continue
      for (const l of group) lines.splice(lines.indexOf(l), 1)
      const at = lines.findIndex((l) => l.kind === 'state' && l.state === group[0].to)
      const froms = group.map((l) => l.from)
      lines.splice(at + 1, 0, { ...group[0], verbs: group.flatMap((l) => l.verbs), lead: 'from', depth: o.depth.get(group[0].to)!, froms })
    }

    const used = new Set(lines.flatMap((l) => (l.kind === 'verb' ? [...l.cells.keys()].map((k) => k.slice(0, -1)) : [])))
    const groups: ColumnGroup[] = []
    fold.forEach((g2, bj) => {
      const cols = treeOrder[g2[0]]
        .map((_, i) => ({ key: `b${bj}:${i}`, states: g2.map((m) => treeOrder[m][i]) }))
        .filter((c) => used.has(c.key))
      if (cols.length) groups.push({ label: bandLabel(net, facets, g2), columns: cols })
    })
    counts.forEach((s, i) => {
      if (used.has(`c:${i}`)) groups.push({ label: stateById.get(s)!.label, columns: [{ key: `c:${i}`, states: [s] }] })
    })
    return { facets: g.map((m) => facets[m]), label: bandLabel(net, facets, g), lines, groups }
  })

  const shape = fnv(
    bands
      .map((b) =>
        `${b.facets.length}[` +
        b.lines
          .map((l) => (l.kind === 'state' ? `s${l.depth}` : `v${l.depth}${l.lead}${l.verbs.length}p${l.primary}${cellSig(l.cells)}${l.froms ? `f${l.froms.length}` : ''}`))
          .join(';') +
        ']',
      )
      .join('/') + `|${counts.length}|${loose.length}`,
  )
  return { title: net.title, bands, counts, loose, shape }
}

const bandLabel = (net: Net, facets: Facet[], g: number[]) => {
  const f = facets[g[0]]
  const groups = new Set(f.states.map((s) => net.states.find((x) => x.id === s)!.group))
  const group = groups.size === 1 ? [...groups][0] : undefined
  const named = group ? net.groups.find((x) => x.id === group)?.label : undefined
  const home = net.states.find((s) => s.id === f.home)!.label
  if (g.length === 1) return named ?? home
  return `${foldPattern(g.map((i) => net.states.find((s) => s.id === facets[i].home)!.label))} ×${g.length}`
}
