import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Encount2/z_en_encount2.c'
const at = (line: number): Cite => `${F}:${line}`
const ROCK = 'src/overlays/actors/ovl_En_Fire_Rock/z_en_fire_rock.c'

/**
 * The Death Mountain eruption, with Link inside its trigger box. The spawner itself has no collider: its harm is the
 * En_Fire_Rock it drops, up to two alive at once, each replaced as it breaks, for 200 frames, then 100 quiet frames.
 * A rock may land on Link every beat of the eruption; where it lands is random, and a dodge stands for the miss.
 * The eruption runs only while Link is inside the box (lines 86-90, 163-167); outside it the spawner waits in
 * EnEncount2_Wait forever. The encounter starts with Link in the box, so its start range is near.
 * Outside Death Mountain the same actor is the Ganon's Tower collapse spawner (lines 56-58): with Link within 700 and
 * switch 0x37 set (lines 91-98, 171-179) it drops one rock at a time (maxRocks 1, line 177), one each 50 frames
 * (line 234), and a quarter of them near Link (Rand_ZeroFloat(3.99f) < 1.0f, line 240). It never returns to Wait.
 * That is the collapse variant: a 50-frame cycle modeled as a 30-frame wait plus the one beat the rock falls, so 3
 * beats. The collapse is met only as adult, so the rock that falls on Link carries age adult and a child kit in this
 * variant is never struck; the types cannot limit a variant to an age.
 * Reported gaps:
 * - A rock that lands, or bounces off a shield, breaks into two FIRE_ROCK_BROKEN_PIECE1 pieces
 *   (src/overlays/actors/ovl_En_Fire_Rock/z_en_fire_rock.c:227, 252, 366-370), which keep the same 8-damage AT
 *   collider (z_en_fire_rock.c:364, 393). The model gives each rock one contact.
 * - On Death Mountain a child's rock lands near him half the time even while he moves (line 216); an adult's lands
 *   near him only if he stands still (line 221). The model has one dodgeable rock for both ages, with the dodge for
 *   the moving case, so a moving child is hit less often than the code says.
 */
export const enEncount2: ActorSpec = {
  overlay: 'ovl_En_Encount2',
  name: 'Falling-rock spawner',
  role: 'hazard',
  summary:
    'The falling-rock spawner on the Death Mountain summit trail. While Link is inside its box it rains burning rocks for 200 frames, at most two at a time and often right on Link, then rests for 100 frames. In the collapse of Ganon\'s Tower it drops one rock every 50 frames, a quarter of them on Link, without rest. Each rock deals 8. It has no collider or health: Link cannot hurt it.',
  cite: at(86),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'eruption', label: 'Rocks rain down', frames: { value: 200, cite: at(124) }, cite: at(132) },
    { id: 'quiet', label: 'The mountain rumbles quietly', frames: { value: 100, cite: at(158) }, cite: at(78) },
    { id: 'eruption_collapse_wait', label: 'The collapsing tower shakes', frames: { value: 30, cite: at(234) }, cite: at(132) },
    { id: 'eruption_collapse_fall', label: 'A burning rock falls from the collapsing tower', cite: at(246) },
  ],
  start: 'eruption',
  variants: [
    { id: 'death_mountain', label: 'Death Mountain eruption', start: 'eruption', cite: at(56) },
    { id: 'ganons_tower', label: "Ganon's Tower collapse", start: 'eruption_collapse_fall', cite: at(91) },
  ],
  range: 'near',
  steps: [
    { from: 'eruption', to: 'eruption', label: 'A burning rock falls on Link', attack: 'rock', cite: at(246) },
    { from: 'eruption', to: 'quiet', label: 'The rain of rocks stops', afterTimer: true, cite: at(159) },
    { from: 'quiet', to: 'eruption', label: 'The mountain erupts again', afterTimer: true, cite: at(126) },
    { from: 'eruption_collapse_wait', to: 'eruption_collapse_fall', label: 'Another rock breaks loose', afterTimer: true, cite: at(234) },
    { from: 'eruption_collapse_fall', to: 'eruption_collapse_wait', label: 'The rock falls on Link', weight: 1, age: 'adult', attack: 'rock', cite: at(240) },
    { from: 'eruption_collapse_fall', to: 'eruption_collapse_wait', label: 'The rock falls ahead of Link', weight: 3, cite: at(237) },
  ],
  attacks: [
    {
      id: 'rock',
      label: 'Falling rock',
      damage: 8,
      effect: { kind: 'none' },
      blockable: true,
      dodgeable: true,
      source: `${ROCK}:58`,
      via: { overlay: 'ovl_En_Fire_Rock', spawn: at(246) },
    },
  ],
  actionFuncs: {
    EnEncount2_Wait: 'quiet',
    EnEncount2_SpawnRocks: 'eruption*',
  },
  atSources: {},
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      eruption_timer_clears: 'each phase is left only once its timer has run out, so no timer marks are ever left behind',
      quiet_timer_clears: 'as eruption_timer_clears',
      eruption_collapse_wait_timer_clears: 'as eruption_timer_clears',
      link_hurt_overkill: 'every hit costs 8, or 4 with Double Defense, and both divide Link\'s 2 hearts (32) evenly, so the last hit always lands on exactly zero',
    },
  },
}
