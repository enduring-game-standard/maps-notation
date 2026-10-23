import { WORLD, type Net } from '../core/model'
import { foldLabel, foldPattern, type Band, type Chart, type VerbLine } from './chart'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface ChartView {
  /** Extra columns at the right of every verb line, such as which age can say it. */
  extra?: { label: string; columns: { label: string; mark: (verbs: string[]) => string }[] }
  /** Verbs to draw faded, such as those that can never be said under a fixed kit. */
  faded?: (verbs: string[]) => boolean
}

export const chartHtml = (net: Net, chart: Chart, view: ChartView = {}) => {
  const state = new Map(net.states.map((s) => [s.id, s]))
  const verb = new Map(net.verbs.map((v) => [v.id, v]))
  const seat = new Map(net.seats.map((s) => [s.id, s]))
  const label = (id: string) => state.get(id)!.label
  const speaker = (vid: string) => {
    const v = verb.get(vid)!
    if (v.by === WORLD) return `<span class="who world" title="the world, priority ${v.priority}${v.weight > 1 ? `, weight ${v.weight}` : ''}">◆${v.priority ? `<sub>${v.priority}</sub>` : ''}</span>`
    const s = seat.get(v.by)!
    return `<span class="who" style="color:${s.color}" title="${esc(s.name)}">●</span>`
  }
  const stateName = (id: string) => {
    const s = state.get(id)!
    const marks = [s.ends !== undefined ? '<span class="end" title="the game ends">✕</span>' : '', s.seenBy !== 'all' ? `<span class="hid" title="seen by ${s.seenBy.length ? s.seenBy.join(', ') : 'no one'}">◌</span>` : '']
    return `${esc(s.label)}${marks.join('')}`
  }
  const cell = (l: VerbLine, key: string) => {
    const out: string[] = []
    for (const g of ['−', '+', '●', '○'] as const) {
      const c = l.cells.get(key + g)
      if (!c) continue
      const n = c.count > 1 ? `<small>${c.count}</small>` : ''
      const t = c.times > 1 ? `<sup>×${c.times}</sup>` : ''
      out.push(`<span class="g${'−+●○'.indexOf(g)}">${g}${n}${t}</span>`)
    }
    return out.join('')
  }

  const fromList = (froms: string[], b: Band) => {
    const rest = b.facets[0].states.filter((x) => !froms.includes(x) && !b.lines.some((l) => l.kind === 'verb' && l.lead === 'from' && l.to === x && l.froms === froms))
    return rest.length <= 3 && froms.length > rest.length ? `every state but ${rest.map(label).join(', ')}` : froms.map(label).join(', ')
  }
  const band = (b: Band, bi: number) => {
    const cols = b.groups.flatMap((g) => g.columns)
    const extra = view.extra?.columns ?? []
    const head1 = b.groups.map((g) => `<th class="grp" colspan="${g.columns.length}">${esc(g.label)}</th>`).join('')
    const head2 = cols.map((c) => `<th class="col"><div>${esc(c.states.length > 1 ? foldPattern(c.states.map(label)) : label(c.states[0]))}</div></th>`).join('')
    const extraHead1 = extra.length ? `<th class="grp extra" colspan="${extra.length}">${esc(view.extra!.label)}</th>` : ''
    const extraHead2 = extra.map((x) => `<th class="col extra"><div>${esc(x.label)}</div></th>`).join('')
    const home = b.facets[0].home
    const rows = b.lines.map((l) => {
      const pad = `style="padding-left:${0.4 + l.depth * 1.15}em"`
      if (l.kind === 'state') {
        const isHome = l.state === home
        return `<tr class="st${isHome ? ' home' : ''}" id="s-${bi}-${esc(l.state)}"><td class="out" ${pad}>${isHome ? '<span class="homemark" title="home: holds the mark at the start">⌂</span>' : ''}${stateName(l.state)}</td><td></td>${cols.map(() => '<td></td>').join('')}${extra.map(() => '<td class="extra"></td>').join('')}</tr>`
      }
      const names = l.verbs.map((v) => verb.get(v)!.label)
      const lead =
        l.lead === 'child' ? '<span class="lead">→</span>'
        : l.lead === 'home' ? `<span class="lead" title="back to ${esc(label(home))}">↩</span>`
        : l.lead === 'self' ? '<span class="lead" title="stays">↻</span>'
        : l.lead === 'from' ? `<span class="lead">◁</span> <span class="froms">from ${esc(fromList(l.froms!, b))}</span>`
        : `<span class="lead">⇢</span> <a class="ref" href="#s-${bi}-${esc(l.to)}">${stateName(l.to)}</a>`
      const elsewhere = l.primary !== bi
      const faded = view.faded?.(l.verbs) ? ' faded' : ''
      const fold = l.verbs.length > 1 ? `<span class="n" title="${esc(names.join(' · '))}">${l.verbs.length}</span>` : ''
      const see = elsewhere ? ` <a class="see" href="#band-${l.primary}">see ${esc(chart.bands[l.primary].label)}</a>` : ''
      return `<tr class="vb${elsewhere ? ' other' : ''}${faded}"><td class="out" ${pad}><span class="branch">├</span>${esc(foldLabel(names))}${fold} ${lead}${see}</td><td class="sp">${speaker(l.verbs[0])}</td>${cols.map((c) => `<td class="c">${elsewhere ? '' : cell(l, c.key)}</td>`).join('')}${extra.map((x) => `<td class="c extra">${x.mark(l.verbs)}</td>`).join('')}</tr>`
    })
    const caption = b.facets.length > 1 ? `${esc(b.label)} <span class="members">${esc(foldLabel(b.facets.map((f) => label(f.home))))}</span>` : esc(b.label)
    return `<section class="band" id="band-${bi}"><h3>${caption}<span class="count">${b.facets[0].states.length} states</span></h3>
<table><thead><tr><th class="out"></th><th></th>${head1}${extraHead1}</tr><tr><th class="out"></th><th></th>${head2}${extraHead2}</tr></thead><tbody>${rows.join('\n')}</tbody></table></section>`
  }
  const loose = chart.loose.length ? `<section class="band"><h3>Verbs on no facet</h3><ul>${chart.loose.map((v) => `<li>${esc(verb.get(v)!.label)}</li>`).join('')}</ul></section>` : ''
  return `<div class="chart"><div class="meta">${chart.bands.length} bands · ${chart.counts.length} counts · ${net.verbs.length} verbs · ${net.states.length} states · shape <code>${chart.shape}</code></div>${chart.bands.map(band).join('\n')}${loose}</div>`
}

export const LEGEND = `<p class="legend"><b>How to read it.</b> Each band is one facet: a set of states that always holds exactly one mark between them, found from the net, not drawn by hand. <span class="homemark">⌂</span> home holds the mark at the start. Indent is the fewest moves from home. <span class="lead">→</span> leads to the state below, <span class="lead">⇢</span> to a state drawn elsewhere, <span class="lead">↩</span> back home, <span class="lead">↻</span> stays, <span class="lead">◁</span> arrives here from each state listed. Columns are the arcs to other facets and counts: <span class="g0">−</span> takes, <span class="g1">+</span> gives, <span class="g2">●</span> needs, <span class="g3">○</span> is blocked by. A small number is the arc's count; <sup>×3</sup> means three members of a folded family. <span class="who">●</span> a seat chooses, <span class="who world">◆</span> the world must answer (priority below). <span class="end">✕</span> ends the game, <span class="hid">◌</span> hidden.</p>`

export const CSS = `
body{font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;color:#1d1d1f;margin:24px;background:#fbfbf8}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
h3{font-size:13px;margin:14px 0 2px;font-weight:650} h3 .count{font-weight:400;color:#888;margin-left:8px;font-size:11px}
.members{font-weight:400;color:#666} .meta{color:#777;font-size:11px;margin:2px 0 6px} code{font-size:11px}
.legend{max-width:980px;color:#444;background:#fff;border:1px solid #e3e3df;padding:8px 10px;border-radius:6px}
table{border-collapse:collapse} td,th{padding:0 2px;vertical-align:middle}
th.grp{font-size:10.5px;font-weight:600;color:#555;border-left:1px solid #ddd;text-align:left;padding:0 4px;white-space:nowrap}
th.col{height:86px;vertical-align:bottom;border-left:1px solid #eee;width:22px;min-width:22px}
th.col div{writing-mode:vertical-rl;transform:rotate(180deg);font-size:10.5px;font-weight:400;color:#444;white-space:nowrap;max-height:84px;overflow:hidden;text-overflow:ellipsis}
td.out{white-space:nowrap;min-width:320px;padding-right:10px}
tr.st td.out{font-weight:600;padding-top:3px} tr.st.home td.out{color:#000}
tr.vb td.out{color:#333} tr.vb.other td.out{color:#999} tr.vb.faded{opacity:.28}
.branch{color:#bbb;margin-right:4px} .lead{color:#777} .ref{color:#555;text-decoration:none;border-bottom:1px dotted #aaa}
.froms{font-size:11px;color:#888;white-space:normal}
.see{font-size:10.5px;color:#aaa;text-decoration:none;margin-left:4px}
.n{display:inline-block;font-size:9.5px;background:#ececec;color:#555;border-radius:7px;padding:0 5px;margin-left:4px}
td.c{text-align:center;border-left:1px solid #f0f0ee;font-size:12px;white-space:nowrap}
td.c small{font-size:9px} td.c sup{font-size:8.5px;color:#777}
tr.vb:hover td{background:#f3f1ea}
.g0{color:#b23} .g1{color:#18753a} .g2{color:#222} .g3{color:#555}
.who{font-size:11px} .who.world{color:#999} .who sub{font-size:8px}
.homemark{color:#a07a00;margin-right:3px} .end{color:#b23;margin-left:3px} .hid{color:#777;margin-left:3px}
td.extra,th.extra{background:#f6f4ec}
.yes{color:#18753a;font-weight:600} .no{color:#bbb}
.pair{display:flex;gap:36px;align-items:flex-start;flex-wrap:wrap}
.note{max-width:980px;color:#333}
`

export const page = (title: string, body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`
