import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Sb/z_en_sb.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * `sDamageTable` (lines 72-105), assigned straight to `colChkInfo.damageTable` at line 132, so the extractor does not
 * see it. Each entry is [damage, reaction, table line]. `EnSb_UpdateDamage` reads the reaction: 15 and 14 damage it
 * only while vulnerable; 13 and 1 damage it while vulnerable and send it to cooldown; 2 (fire) always damages it;
 * 0 does nothing.
 */
const TABLE: Partial<Record<DmgType, [number, number, number]>> = {
  EXPLOSIVE: [2, 15, 76],
  ARROW_NORMAL: [2, 15, 78],
  HAMMER_SWING: [2, 15, 79],
  HOOKSHOT: [2, 1, 80],
  SLASH_KOKIRI: [1, 13, 81],
  SLASH_MASTER: [2, 13, 82],
  SLASH_GIANT: [4, 13, 83],
  ARROW_FIRE: [4, 2, 84],
  ARROW_ICE: [2, 15, 85],
  ARROW_LIGHT: [2, 15, 86],
  ARROW_UNK1: [4, 14, 87],
  ARROW_UNK2: [2, 15, 88],
  ARROW_UNK3: [2, 15, 89],
  MAGIC_FIRE: [4, 2, 90],
  SPIN_KOKIRI: [1, 13, 95],
  SPIN_GIANT: [4, 13, 96],
  SPIN_MASTER: [2, 13, 97],
  JUMP_KOKIRI: [2, 13, 98],
  JUMP_GIANT: [8, 13, 99],
  JUMP_MASTER: [4, 13, 100],
}
const entries = Object.fromEntries(
  Object.entries(TABLE).map(([d, [damage, reaction, line]]) => [
    d,
    { damage, cite: at(line), ...(reaction === 13 || reaction === 1 ? { to: 'cooldown' } : {}) },
  ]),
)
/** Outside its vulnerable frames, or facing away, a non-fire hit only throws metal sparks (line 455). */
const SHELL = (Object.keys(TABLE) as DmgType[]).filter((d) => TABLE[d]![1] !== 2)

export const enSb: ActorSpec = {
  overlay: 'ovl_En_Sb',
  name: 'Shell Blade',
  role: 'enemy',
  summary: 'A clam that opens when Link is in range, then turns and hops at him. Its shell turns every blow except fire; it can be hurt only from the front while it is opening or open. A sword or hookshot hit makes it snap shut and back off. Fire hurts it in any state.',
  cite: at(41),
  pools: [{ id: 'shell', label: 'Shell Blade', hp: { value: 2, cite: at(133) }, then: 'defeated' }],
  damage: { kind: 'custom', entries },
  phases: [
    { id: 'closed', label: 'Shell Blade waits, shut', guards: SHELL, cite: at(362) },
    { id: 'open', label: 'Shell Blade opens', cite: at(357) },
    { id: 'wait_open', label: 'Shell Blade waits, open', frames: { value: 15, cite: at(241) }, cite: at(367) },
    { id: 'lunge', label: 'Shell Blade turns and hops at Link', guards: SHELL, cite: at(272) },
    { id: 'cooldown', label: 'Shell Blade snaps shut and backs off', guards: SHELL, frames: { value: 60, cite: at(224) }, cite: at(210) },
  ],
  start: 'closed',
  range: 'far',
  steps: [
    { from: 'closed', to: 'open', label: 'Link is in range and the Shell Blade opens', range: 'near', cite: at(233) },
    { from: 'open', to: 'wait_open', label: 'Shell Blade finishes opening', range: 'near', cite: at(242) },
    { from: 'open', to: 'closed', label: 'Link is out of range and it shuts', range: 'far', cite: at(246) },
    { from: 'wait_open', to: 'lunge', label: 'Shell Blade turns to attack', range: 'near', afterTimer: true, cite: at(265) },
    { from: 'wait_open', to: 'closed', label: 'Link is out of range and it shuts', range: 'far', cite: at(257) },
    { from: 'lunge', to: 'cooldown', label: 'Shell Blade hops into Link', range: 'near', attack: 'lunge', cite: at(394) },
    { from: 'lunge', to: 'closed', label: 'Shell Blade lands short and settles', range: 'far', cite: at(332) },
    { from: 'cooldown', to: 'closed', label: 'Shell Blade settles', afterTimer: true, cite: at(348) },
  ],
  attacks: [
    { id: 'lunge', label: 'Shell Blade hop', damage: 8, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(63) },
  ],
  actionFuncs: {
    EnSb_WaitClosed: 'closed',
    EnSb_Open: 'open',
    EnSb_WaitOpen: 'wait_open',
    EnSb_TurnAround: 'lunge',
    EnSb_Lunge: 'lunge',
    EnSb_Bounce: 'lunge',
    EnSb_Cooldown: 'cooldown',
  },
  atSources: {
    [at(63)]: 'lunge',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      cooldown_timer_clears: 'cooldown is left only when its timer runs out; the only hit that connects there is fire, which kills it and ends the fight',
      link_hurt_overkill: 'the hop costs 8, or 4 with Double Defense, and every kit\'s health and heal stays a multiple of that, so no hop finds Link already at zero',
    },
  },
}
