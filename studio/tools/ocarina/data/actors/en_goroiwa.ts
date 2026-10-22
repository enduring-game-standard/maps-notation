import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Goroiwa/z_en_goroiwa.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Params bit 10 picks the boulder's kind: 0 rolls along the ground and climbs or descends sloped path
 * stretches (EnGoroiwa_Move, MoveUp, MoveDown); 1 rolls and falls under gravity (EnGoroiwa_MoveAndFall).
 * `home.rot.z & 1` sets a 50-frame window after each hit in which AT is not registered (line 639, gate at
 * line 780), and shortens the stop to 6 frames (line 695). Each combination is a variant.
 *
 * Near is contact: Link's body touching the 58-unit sphere (lines 85, 130). AT is submitted only while Link is
 * within 300 units (line 778), which contains that contact, so the 300 gate never cuts a touching hit.
 * The element carries only DMG_UNBLOCKABLE (0x20000000), which the shield quad's 0xDFCFFFFF leaves out
 * (`src/overlays/actors/ovl_player_actor/z_player.c:10518`), so no shield stops it.
 *
 * A ground boulder switches between level and sloped stretches at each waypoint (Roll to MoveUp/MoveDown at
 * lines 655 and 657, back to Roll at lines 725 and 750). The hit branch runs before the move branch in each
 * function (line 621 before 641, 716 before 723), so the switch steps are `far`: while Link is touching it the
 * boulder hits him first. How often it reaches a waypoint depends on path length, which the code does not fix,
 * so a far boulder switches every beat. That is an approximation.
 *
 * `stop_t` and `stop_bt` each span the whole 50-frame hit window. They start with Wait (6 frames, line 695) and
 * then roll (Roll, and for the bouncing kind MoveAndFallToGround first) with AT off, so Roll and
 * MoveAndFallToGround also run inside them. The ledger maps each action function to one glob.
 *
 * Reported gaps:
 * - Slope contact deals 8: the collider's 4 (line 80) plus the knockback's 4 (lines 718, 743), which the player
 *   adds to the hit (`src/overlays/actors/ovl_player_actor/z_player.c:4878`). An attack has one source and its
 *   damage must equal that source's, so the slope steps deliver the collider's 4.
 * - A round-trip boulder (params bits 8-9, line 642) also waits at each path end with AT off (line 650). The
 *   loop mode would be one more variant split. It is not modeled.
 *
 * The decomp carries no scene placement data; the only scene the code names is Kokiri Forest (line 156, a
 * speed change). With no cite that rules out either age, both ages are kept.
 */
const phases: Phase[] = [
  { id: 'roll', label: 'The boulder rolls along its path', cite: at(613) },
  { id: 'stop', label: 'The boulder stops after hitting Link', frames: { value: 20, cite: at(690) }, cite: at(699) },
  { id: 'roll_t', label: 'The boulder rolls along its path (hit pause variant)', cite: at(613) },
  { id: 'stop_t', label: 'The boulder stops, then rolls on with its attack off', frames: { value: 50, cite: at(639) }, cite: at(763) },
  { id: 'slope', label: 'The boulder climbs or descends a slope', cite: at(715) },
  { id: 'slope_t', label: 'The boulder climbs or descends a slope (hit pause variant)', cite: at(740) },
  { id: 'slope_pause_t', label: 'The boulder keeps rolling with its attack off', frames: { value: 50, cite: at(721) }, cite: at(763) },
  { id: 'roll_b', label: 'The bouncing boulder rolls and falls along its path', cite: at(641) },
  { id: 'fall_b', label: 'The bouncing boulder hops off Link and falls', cite: at(678) },
  { id: 'stop_b', label: 'The bouncing boulder stops', frames: { value: 20, cite: at(690) }, cite: at(699) },
  { id: 'roll_bt', label: 'The bouncing boulder rolls and falls along its path (hit pause variant)', cite: at(641) },
  { id: 'stop_bt', label: 'The bouncing boulder hops, falls, and stops with its attack off', frames: { value: 50, cite: at(639) }, cite: at(763) },
]

const steps: Step[] = [
  { from: 'roll', to: 'stop', label: 'The boulder runs Link down and stops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'stop', to: 'roll', label: 'The boulder rolls on', afterTimer: true, cite: at(704) },
  { from: 'roll_t', to: 'stop_t', label: 'The boulder runs Link down and stops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'stop_t', to: 'roll_t', label: 'The boulder can hit again', afterTimer: true, cite: at(780) },
  { from: 'roll', to: 'slope', label: 'The boulder reaches a waypoint and starts up or down a slope', range: 'far', cite: at(655) },
  { from: 'slope', to: 'roll', label: 'The boulder reaches a waypoint and rolls on level ground', range: 'far', cite: at(725) },
  { from: 'roll_t', to: 'slope_t', label: 'The boulder reaches a waypoint and starts up or down a slope', range: 'far', cite: at(655) },
  { from: 'slope_t', to: 'roll_t', label: 'The boulder reaches a waypoint and rolls on level ground', range: 'far', cite: at(725) },
  { from: 'slope', to: 'slope', label: 'The boulder runs Link down and keeps rolling', range: 'near', attack: 'boulder', cite: at(718) },
  { from: 'slope_t', to: 'slope_pause_t', label: 'The boulder runs Link down and keeps rolling', range: 'near', attack: 'boulder', cite: at(718) },
  { from: 'slope_pause_t', to: 'slope_t', label: 'The boulder can hit again', afterTimer: true, cite: at(780) },
  { from: 'roll_b', to: 'fall_b', label: 'The boulder runs Link down and hops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'fall_b', to: 'stop_b', label: 'The boulder lands and stops', cite: at(685) },
  { from: 'stop_b', to: 'roll_b', label: 'The boulder rolls on', afterTimer: true, cite: at(704) },
  { from: 'roll_bt', to: 'stop_bt', label: 'The boulder runs Link down and hops', range: 'near', attack: 'boulder', cite: at(632) },
  { from: 'stop_bt', to: 'roll_bt', label: 'The boulder can hit again', afterTimer: true, cite: at(780) },
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
    { id: 'ground', label: 'Ground boulder (params bit 10 clear)', start: 'roll', cite: at(615) },
    { id: 'ground_pause', label: 'Ground boulder with a hit pause (home.rot.z bit 0 set)', start: 'roll_t', cite: at(638) },
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
      stop_t_timer_clears: 'as stop_timer_clears: the window is left only when its 50 frames run out',
      slope_pause_t_timer_clears: 'as stop_t_timer_clears',
      stop_b_timer_clears: 'as stop_timer_clears',
      stop_bt_timer_clears: 'as stop_t_timer_clears',
      link_hurt_overkill: "every kit's health is a multiple of the boulder's 4 (2 with Double Defense), so a hit never takes more than Link has left",
    },
  },
}
