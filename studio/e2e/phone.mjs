import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
const url = process.env.STUDIO_URL ?? 'http://localhost:5173/'
const out = process.argv[2] ?? 'e2e-shots'
const device = process.argv[3] ?? 'iPhone 13'
mkdirSync(out, { recursive: true })
const b = await chromium.launch()
const c = await b.newContext({ ...devices[device], reducedMotion: 'reduce' })
const p = await c.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const cdp = await c.newCDPSession(p)
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`)
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` })
const center = async (sel) => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((t, i) => ({ x: t.x, y: t.y, id: i })) })
const swipe = async (paths) => {
  await touch('touchStart', paths.map((f) => f(0)))
  for (let i = 1; i <= 10; i++) { await touch('touchMove', paths.map((f) => f(i / 10))); await p.waitForTimeout(16) }
  await p.waitForTimeout(150)
  await touch('touchEnd', [])
  await p.waitForTimeout(100)
}
const zoomPct = async () => Number((await p.locator('.zoom span').textContent()).replace('%', ''))
const transform = () => p.locator('.canvas svg > g').getAttribute('transform')

await p.goto(url)
await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600)
check('phone layout is used', await p.locator('.phone-app').count() === 1)
check('no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
const vw = p.viewportSize()
const docked = vw.width > vw.height
const stageBox = await p.locator('.phone-stage').boundingBox()
const share = (stageBox.width * stageBox.height) / (vw.width * vw.height)
check('canvas gets most of the screen', share > (docked ? 0.5 : 0.65), `${Math.round(share * 100)}% of the screen${docked ? ', sheet docked right' : ''}`)
const sheetTop = docked ? vw.height : (await p.locator('.sheet').boundingBox()).y
await shot('1-open')

const z0 = await zoomPct()
const mid = { x: stageBox.x + stageBox.width / 2, y: stageBox.y + stageBox.height / 2 }
await swipe([(t) => ({ x: mid.x - 40 - t * 120, y: mid.y }), (t) => ({ x: mid.x + 40 + t * 120, y: mid.y })])
const z1 = await zoomPct()
check('pinch out zooms in', z1 > z0 * 2, `${z0}% -> ${z1}%`)
const under = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e.tagName + '.' + (e.getAttribute('class') ?? '') + ' in ' + (e.closest('[data-node],.hull')?.getAttribute('class') ?? 'background') }, mid)
const t0 = await transform()
await swipe([(t) => ({ x: mid.x - t * 120, y: mid.y - t * 60 })])
check('one-finger drag pans', (await transform()) !== t0, 'finger on ' + under)
check('pan did not change zoom', (await zoomPct()) === z1)
await shot('2-zoomed')

await p.locator('.zoom button', { hasText: 'Fit' }).tap()
const v = await center('[data-node="x_marks_5"]')
await p.touchscreen.tap(v.x, v.y)
await p.waitForTimeout(200)
if (docked) check('tap selects a verb; the docked panel inspects it', (await p.locator('.sheet-body').textContent()).includes('x_marks_5'))
else {
  check('tap selects a verb; peek names it', (await p.locator('.sheet-summary').textContent()).includes('X marks 5'))
  await p.locator('.sheet-summary').tap()
  await p.waitForTimeout(300)
}
check('the inspector opens', (await p.locator('.sheet-body').isVisible()) && (await p.locator('.sheet-body').textContent()).includes('Speaker'))
await shot('3-inspect')
if (!docked) { await p.locator('.sheet-grip').tap(); await p.waitForTimeout(300) }
const nodeAt = () => p.locator('[data-node="o_5"]').getAttribute('transform')
const dragFrom = (pt) => swipe([(t) => ({ x: pt.x + t * 48, y: pt.y + t * 36 })])
const n0 = await nodeAt(); const tv0 = await transform()
await dragFrom(await center('[data-node="o_5"] .state-body'))
check('dragging an unselected node pans and leaves it in place', (await nodeAt()) === n0 && (await transform()) !== tv0)
await p.touchscreen.tap(...Object.values(await center('[data-node="o_5"] .state-body')))
await p.waitForTimeout(150)
const tv1 = await transform()
const sel1 = await p.locator('.sheet-body h2').first().textContent()
await dragFrom(await center('[data-node="o_5"] .state-body'))
check('dragging a selected node moves it, not the view', (await nodeAt()) !== n0 && (await transform()) === tv1, `selected: ${sel1}; node ${n0} -> ${await nodeAt()}; view moved ${(await transform()) !== tv1}`)
if (await p.getByRole('button', { name: 'Undo' }).isEnabled()) await p.getByRole('button', { name: 'Undo' }).tap()
await p.waitForTimeout(150)
check('undo puts it back', (await nodeAt()) === n0)

await p.getByRole('tab', { name: 'Play' }).tap()
await p.waitForTimeout(300)
const chips = await p.locator('.moves .move').allTextContents()
check('play shows X its nine moves as chips', chips.length === 9 && chips.every((t) => t.startsWith('X marks')), chips.join(','))
await shot('4-play')
for (const m of ['X marks 1', 'O marks 4', 'X marks 2', 'O marks 5', 'X marks 3']) {
  await p.locator('.moves .move', { hasText: m }).tap()
  await p.waitForTimeout(150)
}
check('chips play a game to an X win', (await p.locator('.sheet-play .status').textContent()).includes('X wins'))
check('game over offers Play again', await p.locator('.moves .move', { hasText: 'Play again' }).count() === 1)
await shot('5-won')
await p.getByRole('tab', { name: 'Conversation' }).tap()
await p.waitForTimeout(300)
check('conversation tab shows the transcript', (await p.locator('.transcript').textContent()).includes('X has 1-2-3'))
await shot('6-conversation')

await p.getByRole('tab', { name: 'Analysis' }).tap()
await p.getByRole('button', { name: 'Analyze', exact: true }).tap()
await p.waitForTimeout(2500)
const atext = await p.locator('.sheet-body').textContent()
check('analysis runs on phone', atext.includes('5,478') && atext.includes('255,168'))
await shot('7-analysis')

await p.getByRole('tab', { name: 'Edit' }).tap()
await p.getByRole('tab', { name: 'Text' }).tap()
await p.waitForTimeout(300)
check('text tab shows the .maps source', (await p.locator('.sheet-body').textContent()).includes('maps 2'))
await shot('8-text')
await p.getByRole('tab', { name: 'Text' }).tap()
await p.waitForTimeout(300)
if (docked) check('docked sheet keeps its tab open', (await p.getByRole('tab', { name: 'Text' }).getAttribute('aria-selected')) === 'true')
else check('tapping the open tab collapses the sheet', await p.locator('.sheet.snap-peek').count() === 1)

await p.locator('.phone-app .menu summary').tap()
await p.getByRole('menuitem', { name: 'New design' }).tap()
await p.waitForTimeout(300)
const stage = await p.locator('.phone-stage').boundingBox()
await p.locator('.palette button', { hasText: 'State' }).tap()
await p.touchscreen.tap(stage.x + 90, stage.y + stage.height / 2)
await p.locator('.palette button', { hasText: 'Verb' }).tap()
await p.touchscreen.tap(stage.x + stage.width - 90, stage.y + stage.height / 2)
await p.waitForTimeout(200)
check('tap-to-place adds a state and a verb', (await p.locator('[data-node]').count()) === 2)
const st = await center('[data-kind="state"]')
await p.touchscreen.tap(st.x, st.y)
await p.waitForTimeout(150)
const h = await p.locator('[data-kind="state"] .handle-hit').boundingBox()
const vb = await center('[data-kind="verb"]')
check('selected state shows a finger-sized handle', h && h.width >= 30, h ? `${Math.round(h.width)}px` : 'none')
const hs = { x: h.x + h.width / 2, y: h.y + h.height / 2 }
await swipe([(t) => ({ x: hs.x + (vb.x - hs.x) * t, y: hs.y + (vb.y - hs.y) * t })])
await p.waitForTimeout(600)
const saved = await p.evaluate(() => localStorage.getItem('maps-studio:net'))
check('dragging the handle onto the verb makes an arc', /\n  take state_1\n/.test(saved ?? ''), (saved ?? '').split('\n').filter((l) => l.startsWith('  ')).join('|'))
await shot('9-authored')

if (!docked) {
  const grip = await center('.sheet-grip')
  await swipe([(t) => ({ x: grip.x, y: grip.y - t * 600 })])
  await p.waitForTimeout(300)
  check('dragging the grip up opens the sheet', (await p.locator('.sheet.snap-full, .sheet.snap-half').count()) === 1, await p.locator('.sheet').getAttribute('class'))
}
await shot('10-sheet')

check('no console errors', errors.length === 0, errors.join(' | '))
console.log(results.join('\n'))
process.exitCode = results.some((r) => r.startsWith('FAIL')) ? 1 : 0
await b.close()
