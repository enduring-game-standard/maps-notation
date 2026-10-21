import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Trap/z_en_trap.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * A sliding metal spike trap. It has no AT collider: every frame it is not frozen, a distance check (xz within 40,
 * y within 20) costs Link 4 through damagePlayer and knocks him back, then waits 15 frames (under one beat). Its only
 * AC element accepts ice arrows (0x00001000), which freeze it for 250 frames: no damage check runs and no AC is set
 * until the color filter runs out. It has no health and cannot be destroyed.
 *
 * Its three movement modes (linear, circular, four-way from params) differ only in path. Each brings the trap into
 * Link, so in range bands they are the same: one phase, which slides in when Link is far and cuts him when he is near.
 * Both ages meet spike traps (a judgment; the decomp has no scene lists).
 */
export const enTrap: ActorSpec = {
  overlay: 'ovl_En_Trap',
  name: 'Spike trap',
  role: 'hazard',
  summary:
    'A metal blade trap that slides along a line, a circle, or out toward Link and back. Within 40 units it costs Link a quarter heart and knocks him back, every 15 frames. A shield does not help. An ice arrow freezes it for 250 frames; nothing destroys it.',
  cite: at(182),
  pools: [],
  damage: { kind: 'custom', entries: { ARROW_ICE: { damage: 0, to: 'frozen', cite: at(167) } } },
  phases: [
    { id: 'sliding', label: 'The trap slides about', cite: at(178) },
    { id: 'frozen', label: 'The trap is frozen', hittable: 'none', frames: { value: 250, cite: at(167) }, cite: at(405) },
  ],
  start: 'sliding',
  range: 'far',
  steps: [
    { from: 'sliding', to: 'sliding', label: 'The trap cuts Link', range: 'near', attack: 'spikes', cite: at(192) },
    { from: 'sliding', to: 'sliding', label: 'The trap slides into Link', range: 'far', move: 'near', cite: at(336) },
    { from: 'frozen', to: 'sliding', label: 'The ice wears off', afterTimer: true, cite: at(178) },
  ],
  attacks: [
    { id: 'spikes', label: 'Spike trap blades', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(192) },
  ],
  actionFuncs: {},
  states: {
    SPIKETRAP_MODE_LINEAR: { phase: 'sliding', cite: at(196) },
    SPIKETRAP_MODE_CIRCULAR: { phase: 'sliding', cite: at(225) },
    SPIKETRAP_MODE_FOUR_WAY: { phase: 'sliding', cite: at(237) },
    frozen_color_filter: { phase: 'frozen', cite: at(167) },
  },
  atSources: { [at(192)]: 'spikes' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      frozen_timer_clears: 'the frozen phase is left only by its timer running out, so no timer marks are ever left behind',
      link_hurt_overkill: 'the blades deal 4 (2 with Double Defense) and every kit starts with 32 health, a multiple of both, so a cut never takes more than Link has left',
    },
  },
}
