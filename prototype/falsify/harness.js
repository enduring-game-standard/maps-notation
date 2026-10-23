// Run: node prototype/falsify/harness.js
const { SHEETS, analyze, findLoops } = require('../sheets-lib.js')

const cellsOf = S => {
  const A = analyze(S); const out = []
  A.sections.forEach((sec, n) => {
    let row = 0
    const walk = (node, col, r) => {
      out.push(`${n}:${r}:${col}:${node.label}:${node.tags.map(t => t.k + t.v.name).join(',')}`)
      let first = true
      for (const k of node.kids) {
        const rr = first ? r : ++row
        if (k.kind === 'state') walk(k.node, col + 1, rr); else out.push(`${n}:${rr}:${col + 1}:${k.kind}:${k.v.name}`)
        first = false
      }
    }
    walk(sec.tree, 0, 0)
  })
  return { layout: out.join(' '), A }
}
const shuffle = (a, seed) => { const b = [...a]; let s = seed; for (let i = b.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

let fail = 0
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fail++ }

for (const S of SHEETS) {
  const layouts = new Set()
  for (let k = 1; k <= 30; k++) layouts.add(cellsOf({ ...S, verbs: shuffle(S.verbs, k * 7919), states: shuffle(S.states, k * 31) }).layout)
  check(layouts.size === 1, `${S.title}: 30 shuffled listings draw ${layouts.size} distinct sheet(s)`)
  const { A } = cellsOf(S)
  check(A.hidden.length === 0, `${S.title}: ${S.verbs.length - A.hidden.length}/${S.verbs.length} verbs drawn${A.hidden.length ? ' missing: ' + A.hidden.map(v => v.name).join(', ') : ''}`)
  check(A.sections.every(s => S.homes.includes(s.home)), `${S.title}: every part starts at a named home (${A.sections.map(s => A.label[s.home]).join(' | ')})`)
}

const by = Object.fromEntries(SHEETS.map(s => [s.key, s]))
const diff = (a, b) => { const A = new Set(a.split(' ')), B = new Set(b.split(' ')); return [...A].filter(x => !B.has(x)).length + [...B].filter(x => !A.has(x)).length }
const add = (S, v) => ({ ...S, verbs: [v, ...S.verbs] })
console.log('INFO one added verb, cells changed:',
  'Goomba + jump', diff(cellsOf(by.goomba).layout, cellsOf(add(by.goomba, ['jump', 'walking', 'falling', 'world', ''])).layout),
  '· sword + take a hit (idle)', diff(cellsOf(by.sword).layout, cellsOf(add(by.sword, ['take a hit', 'idle', 'idle', 'content', ''])).layout))

const loops = findLoops([by.z1link, by.octorok, by.reach])
check(loops.length === 1, `Zelda: ${loops.length} loop found from effects`)
const noBeamGate = { ...by.z1link, verbs: by.z1link.verbs.map(v => v[0] === 'sword beam' ? [...v.slice(0, 5), {}] : v) }
check(findLoops([noBeamGate, by.octorok, by.reach]).length === 0, 'Zelda: no loop once the beam stops needing full hearts')
const rangedStab = { ...by.z1link, verbs: by.z1link.verbs.map(v => v[0] === 'stab' ? [...v.slice(0, 5), {}] : v) }
check(findLoops([rangedStab, by.octorok, by.reach]).length === 0, 'Zelda: no loop once the stab stops needing to be close')
process.exit(fail ? 1 : 0)
