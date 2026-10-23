import { render, type P } from './draw'
const hub: P = [260, 420]
const pol = (deg: number, r: number): P => [Math.round(hub[0] + r * Math.cos((deg * Math.PI) / 180)), Math.round(hub[1] + r * Math.sin((deg * Math.PI) / 180))]
// a petal: the move out, the stance at its tip, the way back; `w` is the side the move out takes
const petal = (deg: number, outSide: 1 | -1) => ({ out: pol(deg + outSide * 24, 190), tip: pol(deg, 330), back: pol(deg - outSide * 24, 190) })
const sh = petal(-78, -1), ro = petal(0, -1), st = petal(78, 1)
render('/home/wscottsh/repos/egs/maps-notation/.claude/worktrees/notation/prototype/notation/corpus/duel-revised.maps', {
  width: 1360, height: 990,
  at: {
    neutral: hub, beat: [60, 420], wait: [60, 600],
    guard: sh.out, guarding: sh.tip, lower: sh.back,
    roll: ro.out, rolling: ro.tip, rollend: ro.back,
    strike: st.out, striking: st.tip, whiff: st.back,
    hit: pol(-40, 310), link_hit: [445, 165],
    block: [560, 130], attack: [740, 300], evade: [700, 470],
    punish: [560, 730], recover: [760, 640], enemy_hit: [640, 800],
    idle: [1040, 420], tell: [1080, 305], windup: [1040, 190], swing: [870, 175], steady: [1000, 680],
    ebeat: [1220, 120], tick: [470, 920], after: [470, 600], end: [610, 600],
  },
  bend: {
    'guard>beat': 60, 'lower>beat': 170, 'roll>beat': 70, 'strike>beat': -50,
    'hit>idle': -150, 'block>idle': -60, 'punish>idle': 170, 'beat>tick': 160, 'tick>ebeat': 700, 'beat>wait': 22, 'wait>beat': -22, 'tick>after': 0, 'after>rollend': 0,
    'ebeat>swing': 30, 'ebeat>steady': -230, 'ebeat>tell': 0, 'evade>recover': 0, 'after>rollend': 20,
    'neutral>hit': -10, 'neutral>guard': -35, 'guard>guarding': -35, 'guarding>lower': -35, 'lower>neutral': -35, 'neutral>roll': -30, 'roll>rolling': -30, 'rolling>rollend': -30, 'rollend>neutral': -30, 'neutral>strike': 35, 'strike>striking': 35, 'striking>whiff': 35, 'whiff>neutral': 35,
  },
  label: { neutral: 'sw', beat: 'n', wait: 's', guarding: 'n', rolling: 'e', striking: 's', link_hit: 'n', enemy_hit: 's', idle: 'e', windup: 'n', ebeat: 'e', attack: 'ne', recover: 'se', after: 'sw', tick: 's', end: 'e',
    guard: 'w', lower: 'e', roll: 'n', rollend: 's', strike: 'w', whiff: 'e', hit: 'ne', block: 'n', evade: 'e', punish: 'e', swing: 'n', tell: 'e', steady: 's' },
}, new URL('duel.svg', import.meta.url).pathname)
