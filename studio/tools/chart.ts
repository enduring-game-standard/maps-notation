import { readFileSync, writeFileSync } from 'node:fs'
import { buildChart } from '../src/chart/chart'
import { LEGEND, chartHtml, page } from '../src/chart/html'
import { parse } from '../src/core/text'

const [out, ...files] = process.argv.slice(2)
if (!out || !files.length) throw new Error('usage: tsx tools/chart.ts out.html design.maps [more.maps ...]')
const parts = files.map((f) => {
  const net = parse(readFileSync(f, 'utf8'))
  return `<div><h2>${net.title}</h2>${chartHtml(net, buildChart(net))}</div>`
})
writeFileSync(out, page(files.join(', '), `${LEGEND}<div class="pair">${parts.join('')}</div>`))
