// The revised duel placed by hand, following PR 23's RULES.md (R1-R22) rule by rule.
import { render, type P } from './draw2'
const row = (k: number) => 120 + k * 85
const L = 380, E = 1040 // R3: two lanes, so time runs down and the lanes are columns
const sh = L - 175, st = L, ro = L + 175 // R10: the choice's three branches, spread symmetrically
const y0 = row(0)
// R7: each return runs around the far side of its lane, only as wide as needed, and enters the anchor from before it
const retL = (x: number, d: number): P[] => [[x, row(3) + 32 + d], [sh - 70 - d, row(3) + 32 + d], [sh - 70 - d, y0 - 50 - d], [L, y0 - 50 - d]]
const retR = (x: number, y: number, d: number): P[] => [[x, y + 34 + d], [E + 90 + d, y + 34 + d], [E + 90 + d, y0 - 50 - d], [E, y0 - 50 - d]]
const keys = ['lower>neutral', 'whiff>neutral', 'rollend>neutral', 'block>idle', 'hit>idle', 'steady>idle', 'punish>idle']
render('/home/wscottsh/repos/egs/maps-notation/.claude/worktrees/notation/prototype/notation/corpus/duel-revised.maps', {
  width: 1300, height: 900,
  at: {
    // Link's lane: anchor first (R2), the choice row (R10), the stances, the steps back
    neutral: [L, row(0)],
    guard: [sh, row(1)], strike: [st, row(1)], roll: [ro, row(1)],
    guarding: [sh, row(2)], striking: [st, row(2)], rolling: [ro, row(2)],
    lower: [sh, row(3)], whiff: [st, row(3)], rollend: [ro, row(3)],
    // the enemy's lane, stage against stage with Link's (R3)
    idle: [E, row(0)], tell: [E, row(1)], windup: [E, row(2)], swing: [E, row(3)], attack: [E, row(4)],
    evade: [E, row(5)], block: [E - 130, row(5)], hit: [E - 260, row(5)],
    recover: [E, row(6)], steady: [E, row(7)], punish: [E - 130, row(7)],
    // by-products beside their producers, off the lane (R16)
    link_hit: [E - 380, row(5) + 75], enemy_hit: [E - 250, row(7) + 75],
    // the coupling layer between the lanes (R4); hubs among the bars they serve (R9); a lone loop beside its place (R13)
    beat: [730, row(1) + 40], wait: [730, row(0) + 20], tick: [820, row(2) + 20], after: [730, row(3)], end: [820, row(3) + 50],
    ebeat: [E - 120, row(3) + 20],
  },
  bar: { guard: 0, strike: 0, roll: 0, lower: 0, whiff: 0, rollend: 0, tell: 0, swing: 0, evade: 0, block: 0, hit: 0, steady: 0, punish: 0, tick: 0, end: 0, wait: 90 },
  round: keys,
  via: {
    'lower>neutral': retL(sh, 0), 'whiff>neutral': retL(st, 18), 'rollend>neutral': retL(ro, 36),
    'block>idle': [[E - 130, row(5) + 36], [E + 70, row(5) + 36], [E + 70, y0 - 36], [E, y0 - 36]],
    'hit>idle': [[E - 260, row(5) + 52], [E + 86, row(5) + 52], [E + 86, y0 - 50], [E, y0 - 50]],
    'steady>idle': retR(E, row(7), 18), 'punish>idle': retR(E - 130, row(7), 34),
  },
  bend: { 'neutral>hit': 150, 'guarding>block': 210, 'rolling>evade': 120, 'striking>punish': 40,
    'ebeat>steady': -30, 'ebeat>tell': -20, 'ebeat>swing': 0,
    'guard>beat': 45, 'strike>beat': 25, 'roll>beat': 8, 'lower>beat': -40, 'beat>wait': 22, 'wait>beat': -22 },
  label: {
    neutral: 'w', guarding: 'w', striking: 'w', rolling: 'e', guard: 'w', strike: 'w', roll: 'e', lower: 'w', whiff: 'w', rollend: 'w',
    idle: 'e', tell: 'e', windup: 'e', swing: 'e', attack: 'e', evade: 'e', recover: 'e', steady: 'e', block: 'n', hit: 'n', punish: 'n',
    link_hit: 's', enemy_hit: 's', beat: 'e', wait: 'e', tick: 'e', after: 'w', end: 'e', ebeat: 'w',
  },
}, new URL('rules.svg', import.meta.url).pathname)
