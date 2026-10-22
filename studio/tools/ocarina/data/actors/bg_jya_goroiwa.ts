import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Jya_Goroiwa/z_bg_jya_goroiwa.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Both ages walk the Spirit Temple: `src/overlays/actors/ovl_Bg_Jya_Block/z_bg_jya_block.c:57` keeps its block
 * only for child Link, and `src/overlays/actors/ovl_Bg_Jya_1flift/z_bg_jya_1flift.c:119` runs its lift only for adult Link.
 *
 * The boulder's element carries only DMG_UNBLOCKABLE (0x20000000), and the shield quad accepts 0xDFCFFFFF
 * (`src/overlays/actors/ovl_player_actor/z_player.c:10518`), which leaves that bit out, so no shield stops it.
 */
export const bgJyaGoroiwa: ActorSpec = {
  overlay: 'ovl_Bg_Jya_Goroiwa',
  name: 'Spirit Temple rolling boulder',
  role: 'hazard',
  summary:
    'A boulder that rolls back and forth along a fixed stretch of the Spirit Temple. Running into Link knocks him flat; it then hops, stops for 60 frames with its attack off, and rolls on. Nothing Link has can touch it.',
  cite: at(131),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'rolling', label: 'The boulder rolls along its track', cite: at(131) },
    /** The 13-frame hop after a hit runs with AT already off (line 157), so it is folded into the stop. */
    { id: 'stopped', label: 'The boulder has stopped after a hit', frames: { value: 60, cite: at(199) }, cite: at(197) },
  ],
  start: 'rolling',
  range: 'far',
  steps: [
    { from: 'rolling', to: 'stopped', label: 'The boulder runs into Link and knocks him down', range: 'near', attack: 'boulder', cite: at(164) },
    { from: 'stopped', to: 'rolling', label: 'The boulder rolls on', afterTimer: true, cite: at(200) },
  ],
  attacks: [
    { id: 'boulder', label: 'Rolling boulder', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(51) },
  ],
  actionFuncs: {
    BgJyaGoroiwa_Move: 'rolling',
    BgJyaGoroiwa_Wait: 'stopped',
  },
  /** The knockback call (damage argument 0) is the same contact's knockback effect. */
  atSources: { [at(51)]: 'boulder', [at(164)]: 'boulder' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      stopped_timer_clears: 'the boulder leaves its stop only when the 60-frame wait runs out, so no timer is ever left to clear',
      link_hurt_overkill: "every kit's health is a multiple of the boulder's 4 (2 with Double Defense), so a hit never takes more than Link has left",
    },
  },
}
