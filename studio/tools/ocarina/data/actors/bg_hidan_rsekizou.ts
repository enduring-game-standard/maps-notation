import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Hidan_Rsekizou/z_bg_hidan_rsekizou.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * The statue turns 0x180 a frame (line 179) and carries two opposed flame arms (elements at +z and -z),
 * so an arm sweeps over any spot within reach every half turn: 0x8000 / 0x180 = 85 frames.
 * The Fire Temple is visited as adult: `src/overlays/actors/ovl_En_Du/z_en_du.c:173` gates Darunia's
 * Fire Temple appearance on LINK_IS_ADULT.
 */
export const bgHidanRsekizou: ActorSpec = {
  overlay: 'ovl_Bg_Hidan_Rsekizou',
  name: 'Fire Temple spinning flamethrower',
  role: 'hazard',
  summary: 'A statue that turns without pause, sweeping two arms of flame around it. An arm passes over Link every half turn while he stands within reach. The flame burns and cannot be blocked.',
  cite: at(4),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'turning', label: 'The flame arms swing around', frames: { value: 85, cite: at(179) }, cite: at(179) },
    { id: 'arm_over', label: 'A flame arm sweeps over Link\'s spot', cite: at(194) },
  ],
  start: 'turning',
  range: 'far',
  steps: [
    { from: 'turning', to: 'arm_over', label: 'A flame arm comes around', afterTimer: true, cite: at(179) },
    { from: 'arm_over', to: 'turning', label: 'The flame arm sweeps through Link', range: 'near', attack: 'flame', cite: at(194) },
    { from: 'arm_over', to: 'turning', label: 'The flame arm sweeps past, out of reach', range: 'far', cite: at(179) },
  ],
  attacks: [
    { id: 'flame', label: 'Flame arm', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(45) },
  ],
  actionFuncs: {},
  states: {
    arm_away: { phase: 'turning', cite: at(179) },
    arm_over: { phase: 'arm_over', cite: at(194) },
  },
  atSources: {
    [at(45)]: 'flame',
    [at(56)]: 'flame',
    [at(67)]: 'flame',
    [at(78)]: 'flame',
    [at(89)]: 'flame',
    [at(100)]: 'flame',
  },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      turning_timer_clears: 'turning is left only by a step that waits for its timer, so the timer is always spent when it is left',
      flame_lands_again: 'an arm can reach Link only every 5 beats (4 turning plus 1 over him), and the burn it sets lasts 5 beats, so it is out before the next arm',
      flame_lands_dd_again: 'as flame_lands_again',
    },
  },
}
