import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { buildChart } from '../src/chart/chart'
import { LEGEND, chartHtml, page } from '../src/chart/html'
import { possibleVerbs } from '../src/chart/possible'
import { initialMarking } from '../src/core/model'
import { parse } from '../src/core/text'

const out = process.argv[2] ?? 'chart-out'
mkdirSync(out, { recursive: true })
const load = (f: string) => parse(readFileSync(`../examples/${f}`, 'utf8'))

const nav = `<p class="meta"><a href="index.html">Link's moveset</a> · <a href="same-shape.html">Same structure, same shape</a> · <a href="coin.html">Call the coin</a></p>`

{
  const net = load('link-moveset.maps')
  const chart = buildChart(net)
  const ageVerbs = new Set(net.arcs.filter((a) => (a.state === 'child' || a.state === 'adult') && a.kind !== 'need' && a.kind !== 'unless').map((a) => a.verb))
  const m = initialMarking(net)
  const child = possibleVerbs(net, { ...m, child: 1, adult: 0 }, ageVerbs)
  const adult = possibleVerbs(net, { ...m, child: 0, adult: 1 }, ageVerbs)
  const label = (v: string) => net.verbs.find((x) => x.id === v)!.label
  const only = (a: Set<string>, b: Set<string>) => {
    const other = new Set([...b].map(label))
    return [...new Set([...a].map(label))].filter((l) => !other.has(l)).sort()
  }
  const mark = (set: Set<string>) => (vs: string[]) => {
    const n = vs.filter((v) => set.has(v)).length
    return n === vs.length ? '<span class="yes">✓</span>' : n ? `<span class="yes">${n}/${vs.length}</span>` : '<span class="no">·</span>'
  }
  const html = chartHtml(net, chart, {
    extra: { label: 'Can ever say it', columns: [{ label: 'as a child', mark: mark(child) }, { label: 'as an adult', mark: mark(adult) }] },
  })
  const summary = `<div class="note"><p><b>Child against adult.</b> Fix the age and drop the two Master Sword verbs, and the chart computes what each age can ever say: the child ${child.size} of ${net.verbs.length} verbs, the adult ${adult.size}. The two right-hand columns show it on every line, so the difference reads straight down the page. The computation follows each facet and count on its own, which over-approximates play: a <span class="no">·</span> is proven impossible for that age, and a <span class="yes">✓</span> is possible as far as this check can tell.</p>
<p>By name, ignoring which states a verb starts from:</p><p><b>Only the child:</b> ${only(child, adult).join(', ')}.</p><p><b>Only the adult:</b> ${only(adult, child).join(', ')}.</p>
<p>The net is <code>examples/link-moveset.maps</code>, written by <code>studio/tools/gen-link.ts</code> from <code>research/link-moveset.md</code>, with the decomp line for each verb as a comment above it. Buttons, feel, and frame data are left out on purpose; so are health and damage, which belong to combat.</p></div>`
  writeFileSync(`${out}/index.html`, page(net.title, `<h1>${net.title}</h1>${nav}${LEGEND}${summary}${html}`))
}

{
  const ttt = load('tic-tac-toe.maps')
  const ns = load('number-scrabble.maps')
  const a = buildChart(ttt)
  const b = buildChart(ns)
  const same = a.shape === b.shape
  const note = `<div class="note"><p><b>Same structure, same shape.</b> Number Scrabble (take numbers 1 to 9 in turn, first to hold three that sum to 15 wins) is tic-tac-toe in disguise: the magic square 2 7 6 / 9 5 1 / 4 3 8 maps one onto the other. It was written without the board, with other names and another order. Both charts are built by the same rule from the net alone, and their shape fingerprints are ${same ? `<b>identical</b> (<code>${a.shape}</code>)` : `<b>different</b> (<code>${a.shape}</code> against <code>${b.shape}</code>)`}. Change one priority in tic-tac-toe (SPEC's line-check race) and the fingerprint changes.</p></div>`
  writeFileSync(`${out}/same-shape.html`, page('Same structure, same shape', `<h1>Same structure, same shape</h1>${nav}${LEGEND}${note}<div class="pair"><div><h2>${ttt.title}</h2>${chartHtml(ttt, a)}</div><div><h2>${ns.title}</h2>${chartHtml(ns, b)}</div></div>`))
}

{
  const net = load('call-the-coin.maps')
  writeFileSync(`${out}/coin.html`, page(net.title, `<h1>${net.title}</h1>${nav}${LEGEND}${chartHtml(net, buildChart(net))}`))
}
console.log(`wrote ${out}/index.html, same-shape.html, coin.html`)
