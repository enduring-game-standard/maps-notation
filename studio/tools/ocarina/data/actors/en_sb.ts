import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Reaction } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Sb/z_en_sb.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * `EnSb_UpdateDamage` reads `sDamageTable`'s reactions. 15 and 14 damage it only while vulnerable and facing Link;
 * 13 and 1 do the same and send it to cooldown; 2 (fire) always damages it; 0 falls to the default and does nothing.
 * The vulnerable window is carried by the guards on the shut phases.
 */
const reactions: Record<string, Reaction> = {
  '0x0': { damage: false, note: 'falls to the default case: no damage, only metal sparks', cite: at(438) },
  '0xF': { damage: true, note: 'explosives, arrows, hammer: damage while vulnerable and facing Link', cite: at(408) },
  '0xE': { damage: true, note: 'wind arrow: falls through to the explosive case', cite: at(405) },
  '0x2': { damage: true, note: 'fire arrow and Din\'s Fire: damage in any state', cite: at(419) },
  '0xD': { damage: true, to: 'cooldown', note: 'swords: damage while vulnerable and facing Link, then it snaps shut (EnSb_SetupCooldown)', cite: at(426) },
  '0x1': { damage: true, to: 'cooldown', note: 'hookshot: handled with the swords', cite: at(425) },
}
/** Outside its vulnerable frames, or facing away, a non-fire hit only throws metal sparks (line 455). */
const SHELL: DmgType[] = [
  'EXPLOSIVE', 'ARROW_NORMAL', 'HAMMER_SWING', 'HOOKSHOT', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'ARROW_ICE',
  'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3', 'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI',
  'JUMP_GIANT', 'JUMP_MASTER',
]

export const enSb: ActorSpec = {
  overlay: 'ovl_En_Sb',
  name: 'Shell Blade',
  role: 'enemy',
  summary: 'A clam that opens when Link is in range, then turns and hops at him. Its shell turns every blow except fire; it can be hurt only from the front while it is opening or open. A sword or hookshot hit makes it snap shut and back off. Fire hurts it in any state.',
  cite: at(41),
  pools: [{ id: 'shell', label: 'Shell Blade', hp: { value: 2, cite: at(133) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
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
