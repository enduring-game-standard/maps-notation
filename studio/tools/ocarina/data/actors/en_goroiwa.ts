import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Goroiwa/z_en_goroiwa.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Params bit 10 picks the boulder's kind: 0 rolls along the ground and climbs or descends sloped path
 * stretches (EnGoroiwa_Move, MoveUp, MoveDown); 1 rolls and falls under gravity (EnGoroiwa_MoveAndFall).
 * `home.rot.z & 1` sets a 50-frame window after each hit in which AT is not registered (line 639, gate at
 * line 780), and shortens the stop to 6 frames (line 690). Each combination is a variant.
 *
 * AT is registered only while Link is within 300 units (line 778): that is near.
 * The element carries only DMG_UNBLOCKABLE (0x20000000), which the shield quad's 0xDFCFFFFF leaves out
 * (`src/overlays/actors/ovl_player_actor/z_player.c:10518`), so no shield stops it.
 *
 * The decomp carries no scene placement data; the only scene the code names is Kokiri Forest (line 156, a
 * speed change). With no cite that rules out either age, both ages are kept.
 */
const phases: Phase[] = [
  { id: 'roll', label: 'The boulder rolls along its path', cite: at(613) },
  { id: 'stop', label: 'The boulder stops after hitting Link', frames: { value: 20, cite: at(690) }, cite: at(699) },
  { id: 'roll_t', label: 'The boulder rolls along its path (hit pause variant)', cite: at(613) },
  { id: 'pause_t', label: 'The boulder stops, then rolls on with its attack off', frames: { value: 50, cite: at(639) }, cite: at(763) },
  { id: 'slope', label: 'The boulder climbs or descends a slope', cite: at(715) },
  { id: 'slope_t', label: 'The boulder climbs or descends a slope (hit pause variant)', cite: at(740) },
  { id: 'slope_pause_t', label: 'The boulder keeps rolling with its attack off', frames: { value: 50, cite: at(721) }, cite: at(763) },
  { id: 'roll_b', label: 'The bouncing boulder rolls and falls along its path', cite: at(641) },
  { id: 'fall_b', label: 'The bouncing boulder hops off Link and falls', cite: at(678) },
  { id: 'stop_b', label: 'The bouncing boulder stops', frames: { value: 20, cite: at(690) }, cite: at(699) },
  { id: 'roll_bt', label: 'The bouncing boulder rolls and falls along its path (hit pause variant)', cite: at(641) },
  { id: 'pause_bt', label: 'The bouncing boulder hops, falls, and stops with its attack off', frames: { value: 50, cite: at(639) }, cite: at(763) },
]

const steps: Step[] = [
  { from: 'roll', to: 'stop', label: 'The boulder runs Link down and stops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'stop', to: 'roll', label: 'The boulder rolls on', afterTimer: true, cite: at(704) },
  { from: 'roll_t', to: 'pause_t', label: 'The boulder runs Link down and stops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'pause_t', to: 'roll_t', label: 'The boulder can hit again', afterTimer: true, cite: at(780) },
  { from: 'slope', to: 'slope', label: 'The boulder runs Link down and keeps rolling', range: 'near', attack: 'boulder', cite: at(718) },
  { from: 'slope_t', to: 'slope_pause_t', label: 'The boulder runs Link down and keeps rolling', range: 'near', attack: 'boulder', cite: at(718) },
  { from: 'slope_pause_t', to: 'slope_t', label: 'The boulder can hit again', afterTimer: true, cite: at(780) },
  { from: 'roll_b', to: 'fall_b', label: 'The boulder runs Link down and hops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'fall_b', to: 'stop_b', label: 'The boulder lands and stops', cite: at(685) },
  { from: 'stop_b', to: 'roll_b', label: 'The boulder rolls on', afterTimer: true, cite: at(704) },
  { from: 'roll_bt', to: 'pause_bt', label: 'The boulder runs Link down and hops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'pause_bt', to: 'roll_bt', label: 'The boulder can hit again', afterTimer: true, cite: at(780) },
]

export const enGoroiwa: ActorSpec = {
  overlay: 'ovl_En_Goroiwa',
  name: 'Rolling boulder',
  role: 'hazard',
  summary:
    'A boulder that rolls along a path. When it runs into Link it knocks him flat: a ground boulder stops briefly (or keeps going on a slope), a bouncing boulder hops off him, falls, and stops. Some boulders then hold their attack off for 50 frames. Nothing Link has can touch it.',
  cite: at(613),
  pools: [],
  damage: { kind: 'none' },
  phases,
  start: 'roll',
  variants: [
    { id: 'ground', label: 'Ground boulder on a level stretch (params bit 10 clear)', start: 'roll', cite: at(615) },
    { id: 'ground_pause', label: 'Ground boulder with a hit pause (home.rot.z bit 0 set)', start: 'roll_t', cite: at(638) },
    { id: 'slope', label: 'Ground boulder on a sloped stretch', start: 'slope', cite: at(655) },
    { id: 'slope_pause', label: 'Ground boulder on a sloped stretch, with a hit pause', start: 'slope_t', cite: at(720) },
    { id: 'bouncing', label: 'Bouncing boulder (params bit 10 set)', start: 'roll_b', cite: at(641) },
    { id: 'bouncing_pause', label: 'Bouncing boulder with a hit pause', start: 'roll_bt', cite: at(638) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'boulder', label: 'Rolling boulder', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(80) },
  ],
  actionFuncs: {
    EnGoroiwa_Roll: 'roll*',
    EnGoroiwa_Wait: 'stop*',
    EnGoroiwa_MoveUp: 'slope*',
    EnGoroiwa_MoveDown: 'slope*',
    EnGoroiwa_MoveAndFallToGround: 'fall_b',
  },
  /**
   * The knockback calls are the same contact's knockback effect. On a slope (lines 718, 743) the call also
   * passes 4 damage, which the player adds to the hit (`src/overlays/actors/ovl_player_actor/z_player.c:4878`);
   * an attack has one source, so the slope hit carries the collider's 4 and the extra 4 is a reported gap.
   */
  atSources: { [at(80)]: 'boulder', [at(632)]: 'boulder', [at(718)]: 'boulder', [at(743)]: 'boulder' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      stop_timer_clears: 'a stop is left only when its wait runs out, so no timer is ever left to clear',
      pause_t_timer_clears: 'as stop_timer_clears: the pause is left only when its 50 frames run out',
      slope_pause_t_timer_clears: 'as pause_t_timer_clears',
      stop_b_timer_clears: 'as stop_timer_clears',
      pause_bt_timer_clears: 'as pause_t_timer_clears',
      link_hurt_overkill: "every kit's health is a multiple of the boulder's 4 (2 with Double Defense), so a hit never takes more than Link has left",
    },
  },
}
