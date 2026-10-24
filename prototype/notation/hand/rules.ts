// The revised duel placed by hand under PR 23's RULES.md. measure.ts draws it and runs PR 23's checks on the same geometry.
import type { P, Spec } from './geom.ts'
export const file = new URL('../corpus/duel-revised.maps', import.meta.url).pathname
const R = [120, 215, 310, 405, 470, 600, 690, 790]
const row = (k: number) => R[k]
const L = 400, W = 170, E = 1120
const sh = L - W, st = L, ro = L + W
const y0 = row(0)
// a held stance meets the blow one stretch down and across: guarding and striking read by one translation
const V: P = [420, row(5) - row(2)]
const at = (p: P, v: P = V): P => [p[0] + v[0], p[1] + v[1]]
const LW = 140, EW = 145
const retL = (x: number, d: number): P[] => [[x, row(3) + 32 + d], [sh - LW - d, row(3) + 32 + d], [sh - LW - d, y0 - 45 - d], [L, y0 - 45 - d]]
const under = (x: number, y: number, d: number): P[] => [[x, y + 1], [x, row(7) + 50 + d], [E + EW + d, row(7) + 50 + d], [E + EW + d, y0 - 40 - d * 0.5], [E, y0 - 40 - d * 0.5]]
const block = at([sh, row(2)]), hit: P = [block[0] + 240, row(5)], punish: P = [E - 150, row(7)]
export const spec: Spec = {
  at: {
    neutral: [L, row(0)],
    guard: [sh, row(1)], strike: [st, row(1)], roll: [ro, row(1)],
    guarding: [sh, row(2)], striking: [st, row(2)], rolling: [ro, row(2)],
    lower: [sh, row(3)], whiff: [st, row(3)], rollend: [ro, row(3)],
    // R1: the enemy's lane is one line, and the miss is its own step from the blow to recovering
    idle: [E, row(0)], tell: [E, row(1)], windup: [E, row(2)], swing: [E, row(3)], attack: [E, row(4)],
    evade: [E, row(5)], recover: [E, row(6)], steady: [E, row(7)],
    // R7, R11: what couples to Link sits inside, in the gap
    block, hit, punish,
    link_hit: [hit[0] + 60, row(5) + 28], enemy_hit: [punish[0] - 80, row(7) + 20],
    wait: [750, row(0) + 10], beat: [750, row(1) + 50], tick: [910, row(1) + 50], ebeat: [1040, row(3) + 30],
    after: [800, row(2) + 40], end: [900, row(2) + 40],
  },
  bar: { wait: 90 },
  route: {
    'lower>neutral': { corners: retL(sh, 0) }, 'whiff>neutral': { corners: retL(st, 18) }, 'rollend>neutral': { corners: retL(ro, 36) },
    'steady>idle': { corners: under(E, row(7), 0) },
    'punish>idle': { corners: under(punish[0] + 20, row(7) + 10, 12) },
    'hit>idle': { corners: under(hit[0] - 18, row(5) + 10, 24) },
    'block>idle': { corners: under(block[0] - 15, row(5) + 10, 36) },
    'beat>wait': { bend: 22 }, 'wait>beat': { bend: 22 },
    'neutral>hit': { bend: -45 },
    'guard>beat': { bend: 45 }, 'strike>beat': { bend: 28 }, 'roll>beat': { bend: 10 },
    'lower>beat': { through: [[ro - 85, row(2) + 50], [ro + 40, row(2) + 10]] },
  },
  label: {
    neutral: 'w', guarding: 'e', striking: 'e', rolling: 'nw', guard: 'w', strike: 'w', roll: 'e', lower: 'w', whiff: 'e', rollend: 'se',
    idle: 'e', tell: 'e', windup: 'e', swing: 'e', attack: 'e', evade: 'e', recover: 'e', steady: 'e',
    block: 'sw', hit: 'w', punish: 'se', link_hit: 'e', enemy_hit: 'w',
    beat: 's', wait: 'e', tick: 'n', after: 's', end: 'n', ebeat: 'w',
  },
}
