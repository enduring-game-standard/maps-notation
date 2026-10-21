import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Hidan_Sekizou/z_bg_hidan_sekizou.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Params 0 is the short statue on a fixed cycle: its counter runs 36 down to -36 (lines 233-235) and the
 * flames are on while it is above 0. Any other params is the tall statue, which fires a flame down whichever
 * axis Link stands on within 300 units (lines 206-219) and keeps it burning while he stays.
 * The Fire Temple is visited as adult: `src/overlays/actors/ovl_En_Du/z_en_du.c:173` gates Darunia's
 * Fire Temple appearance on LINK_IS_ADULT.
 */
export const bgHidanSekizou: ActorSpec = {
  overlay: 'ovl_Bg_Hidan_Sekizou',
  name: 'Fire Temple flamethrower statue',
  role: 'hazard',
  summary: 'A stationary statue that breathes fire. The short kind fires two diagonal jets on a fixed on-off cycle. The tall kind fires down whichever side Link lines up with when he comes close, and keeps firing while he stays in line. The flame burns and cannot be blocked.',
  cite: at(4),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'timed_on', label: 'The short statue\'s jets burn', frames: { value: 36, cite: at(235) }, cite: at(297) },
    { id: 'timed_off', label: 'The short statue\'s jets are out', frames: { value: 36, cite: at(234) }, cite: at(233) },
    { id: 'aim_idle', label: 'The tall statue waits for Link to line up', cite: at(216) },
    { id: 'aim_burst', label: 'The tall statue fires down Link\'s side', frames: { value: 35, cite: at(219) }, cite: at(303) },
  ],
  start: 'timed_on',
  variants: [
    { id: 'timed', label: 'Short statue on a fixed cycle', start: 'timed_on', cite: at(175) },
    { id: 'aimed', label: 'Tall statue that fires at Link', start: 'aim_idle', cite: at(182) },
  ],
  range: 'far',
  steps: [
    { from: 'timed_on', to: 'timed_on', label: 'The jets burn Link', range: 'near', attack: 'flame', cite: at(298) },
    { from: 'timed_on', to: 'timed_off', label: 'The jets die down', afterTimer: true, cite: at(297) },
    { from: 'timed_off', to: 'timed_on', label: 'The jets flare up', afterTimer: true, cite: at(235) },
    { from: 'aim_idle', to: 'aim_burst', label: 'Link lines up and the statue fires', range: 'near', cite: at(219) },
    { from: 'aim_burst', to: 'aim_burst', label: 'The flame burns Link', range: 'near', attack: 'flame', cite: at(304) },
    { from: 'aim_burst', to: 'aim_idle', label: 'Link is out of line and the flame dies', range: 'far', afterTimer: true, cite: at(303) },
  ],
  attacks: [
    { id: 'flame', label: 'Statue flame', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(49) },
  ],
  actionFuncs: {},
  states: {
    func_8088D720: { phase: 'timed_on', cite: at(180) },
    func_8088D720_off: { phase: 'timed_off', cite: at(234) },
    func_8088D434: { phase: 'aim_idle', cite: at(184) },
    func_8088D434_firing: { phase: 'aim_burst', cite: at(219) },
  },
  atSources: {
    [at(49)]: 'flame',
    [at(60)]: 'flame',
    [at(71)]: 'flame',
    [at(82)]: 'flame',
    [at(93)]: 'flame',
    [at(104)]: 'flame',
  },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      timed_on_timer_clears: 'timed_on is left only by a step that waits for its timer, so the timer is always spent when it is left; its burn step stays in timed_on',
      timed_off_timer_clears: 'timed_off is left only by a step that waits for its timer, so the timer is always spent when it is left',
      aim_burst_timer_clears: 'aim_burst is left only by a step that waits for its timer, so the timer is always spent when it is left; its burn step stays in aim_burst',
    },
  },
}
