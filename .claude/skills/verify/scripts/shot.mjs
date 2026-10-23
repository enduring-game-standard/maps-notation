#!/usr/bin/env node
// Screenshot any page headlessly and report its console errors.
// Usage: node shot.mjs <url> <out.png> [--selector css] [--width 1600] [--height 1000] [--wait 800]
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
const require = createRequire(resolve(import.meta.dirname, '../../../../studio/package.json'))
const { chromium } = require('playwright')
const [url, out, ...rest] = process.argv.slice(2)
if (!url || !out) { console.error('usage: node shot.mjs <url> <out.png> [--selector css] [--width n] [--height n] [--wait ms]'); process.exit(2) }
const opt = (k, d) => { const i = rest.indexOf('--' + k); return i < 0 ? d : rest[i + 1] }
mkdirSync(dirname(resolve(out)), { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: +opt('width', 1600), height: +opt('height', 1000) } })
const errors = []
p.on('pageerror', e => errors.push(e.message))
p.on('console', m => m.type() === 'error' && errors.push(m.text()))
const res = await p.goto(url, { waitUntil: 'load' })
await p.waitForTimeout(+opt('wait', 800))
const sel = opt('selector')
await (sel ? p.locator(sel).first().screenshot({ path: out }) : p.screenshot({ path: out, fullPage: true }))
await b.close()
console.log(JSON.stringify({ url, status: res?.status(), out: resolve(out), errors }))
process.exit(errors.length || (res && res.status() >= 400) ? 1 : 0)
