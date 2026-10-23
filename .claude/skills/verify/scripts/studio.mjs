#!/usr/bin/env node
// Load a .maps file into a running Studio the way a user's saved work loads, fit it, screenshot the canvas.
// Usage: STUDIO_URL=http://21.0.0.3:5173/ node studio.mjs <file.maps> <out.png>
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
const require = createRequire(resolve(import.meta.dirname, '../../../../studio/package.json'))
const { chromium } = require('playwright')
const [file, out] = process.argv.slice(2)
if (!file || !out) { console.error('usage: node studio.mjs <file.maps> <out.png>'); process.exit(2) }
const url = process.env.STUDIO_URL ?? 'http://127.0.0.1:5173/'
const text = readFileSync(file, 'utf8')
mkdirSync(dirname(resolve(out)), { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
p.on('pageerror', e => errors.push(e.message))
p.on('console', m => m.type() === 'error' && errors.push(m.text()))
await p.goto(url)
await p.evaluate(t => localStorage.setItem('maps-studio:net', t), text)
await p.reload()
await p.waitForTimeout(600)
await p.getByRole('button', { name: 'Fit', exact: true }).click()
await p.waitForTimeout(300)
const title = await p.locator('.doc-title').textContent()
const nodes = await p.locator('[data-node]').count()
await p.locator('.canvas').first().screenshot({ path: out })
await b.close()
console.log(JSON.stringify({ file, title, nodes, out: resolve(out), errors }))
process.exit(errors.length ? 1 : 0)
