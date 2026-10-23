// usage: node harness/png.mjs <design> [net]
import { createRequire } from 'node:module'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const require = createRequire('/home/wscottsh/repos/egs/maps-notation/studio/package.json')
const { chromium } = require('playwright')
const [design, only] = process.argv.slice(2)
const dir = `${root}/${process.env.OUT ?? 'out'}/${design}`
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 })
for (const f of readdirSync(dir).filter((f) => f.endsWith('.svg') && (!only || f === only + '.svg'))) {
  const key = f.replace('.svg', '')
  const svg = readFileSync(`${dir}/${f}`, 'utf8')
  const fig = `${root}/figures/clips/${key}.png`
  const left = existsSync(fig) ? `<img src="data:image/png;base64,${readFileSync(fig).toString('base64')}" style="max-width:820px;max-height:900px">` : ''
  await p.setContent(`<body style="margin:0;background:white"><div id="w" style="display:inline-flex;gap:24px;align-items:center;padding:12px;background:white">${left}<div id="s" style="max-width:900px">${svg.replace('<svg ', '<svg style="max-width:900px;max-height:900px;height:auto" ')}</div></div></body>`)
  await p.locator('#s').screenshot({ path: `${dir}/${key}.png` })
  if (left) await p.locator('#w').screenshot({ path: `${dir}/${key}.pair.png` })
}
await b.close()
console.log('ok')
