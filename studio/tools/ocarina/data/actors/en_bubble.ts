import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bubble/z_en_bubble.c'
const at = (line: number): Cite => `${F}:${line}`

/** Element 1 (0x00002824) takes these and only pushes the bubble (`func_809CC648`); element 0 takes the rest and pops it. */
const PUSHES: DmgType[] = ['SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_LIGHT']

export const enBubble: ActorSpec = {
  overlay: 'ovl_En_Bubble',
  name: 'Shabom',
  role: 'enemy',
  summary: 'A drifting bubble. It bounces around the room without chasing Link. Touching Link costs him a quarter heart and pops it; most hits pop it, while seeds and plain, fire, and light arrows only push it.',
  cite: at(371),
  pools: [],
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(9)',
    reactions: {
      '0x0': { damage: false, to: 'popping', note: 'any AC hit on element 0 pops the bubble; the code never reads colChkInfo damage or health', cite: at(311) },
    },
  },
  phases: [
    {
      id: 'drift',
      label: 'Shabom drifts and bounces',
      overrides: Object.fromEntries(PUSHES.map((d) => [d, { damage: 0, cite: at(308) }])),
      cite: at(376),
    },
    { id: 'popping', label: 'Shabom pops', hittable: 'none', frames: { value: 6, cite: at(119) }, cite: at(384) },
  ],
  start: 'drift',
  range: 'far',
  steps: [
    { from: 'drift', to: 'popping', label: 'Shabom bumps into Link and pops', range: 'near', attack: 'touch', cite: at(320) },
    { from: 'drift', to: 'drift', label: 'Shabom drifts toward Link', move: 'near', cite: at(289) },
    { from: 'drift', to: 'drift', label: 'Shabom drifts away', move: 'far', cite: at(289) },
    { from: 'popping', to: 'defeated', label: 'Shabom bursts and is gone', afterTimer: true, cite: at(386) },
  ],
  attacks: [
    { id: 'touch', label: 'Shabom bump: damagePlayer with element 0\'s 4 damage, then a small knockback', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(131) },
  ],
  actionFuncs: {
    EnBubble_Wait: 'drift',
    EnBubble_Pop: 'popping',
    EnBubble_Regrow: { excluded: 'unused: only EnBubble_Disappear sets it, and nothing sets EnBubble_Disappear', cite: at(402) },
  },
  atSources: {
    [at(114)]: { excluded: 'sets the AT damage types when the bubble pops; EnBubble_Pop never calls CollisionCheck_SetAT, so this AT never registers against Link', cite: at(384) },
    [at(115)]: { excluded: 'as the dmgFlags change at line 114: the popped bubble never registers an AT', cite: at(384) },
    [at(116)]: { excluded: 'as the dmgFlags change at line 114: it runs once the bubble pops, after which EnBubble_DetectPop never calls EnBubble_DamagePlayer again', cite: at(315) },
    [at(131)]: 'touch',
  },
  loadouts: [
    ...standardLoadouts(['child']),
    /** One bump costs 4 and pops the bubble, so only a Link already down to a quarter heart can fall to it. */
    { id: 'child_quarter_heart', age: 'child', hearts: 0.25, gear: ['kokiri_sword', 'deku_shield'] },
  ],
  expected: {
    deadVerbs: {
      popping_timer_clears: 'popping lasts one beat and its only step waits for that timer, so the phase never ends with beats left on it',
      link_hurt_overkill: 'the bubble lands at most one bump of 4 before it pops, which at most empties the quarter-heart kit exactly',
      fairy_revives_link: 'only the quarter-heart kit can fall to one bump, and it carries no fairy; the bottle kit has 2 hearts',
    },
  },
}
