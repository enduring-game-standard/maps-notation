import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Encount2/z_en_encount2.c'
const at = (line: number): Cite => `${F}:${line}`
const ROCK = 'src/overlays/actors/ovl_En_Fire_Rock/z_en_fire_rock.c'

/**
 * The Death Mountain eruption, with Link inside its trigger box. The spawner itself has no collider: its harm is the
 * En_Fire_Rock it drops, up to two alive at once, each replaced as it breaks, for 200 frames, then 100 quiet frames.
 * A rock may land on Link every beat of the eruption; where it lands is random, and a dodge stands for the miss.
 */
export const enEncount2: ActorSpec = {
  overlay: 'ovl_En_Encount2',
  name: 'Death Mountain eruption',
  role: 'hazard',
  summary:
    'The falling-rock spawner on the Death Mountain summit trail. While Link is inside its box it rains burning rocks for 200 frames, at most two at a time and often right on Link, then rests for 100 frames. Each rock deals 8. It has no collider or health: Link cannot hurt it.',
  cite: at(86),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'eruption', label: 'Rocks rain down', frames: { value: 200, cite: at(124) }, cite: at(132) },
    { id: 'quiet', label: 'The mountain rumbles quietly', frames: { value: 100, cite: at(158) }, cite: at(78) },
  ],
  start: 'eruption',
  range: 'near',
  steps: [
    { from: 'eruption', to: 'eruption', label: 'A burning rock falls on Link', attack: 'rock', cite: at(246) },
    { from: 'eruption', to: 'quiet', label: 'The rain of rocks stops', afterTimer: true, cite: at(159) },
    { from: 'quiet', to: 'eruption', label: 'The mountain erupts again', afterTimer: true, cite: at(126) },
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
    EnEncount2_SpawnRocks: 'eruption',
  },
  atSources: {},
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      eruption_timer_clears: 'each phase is left only once its timer has run out, so no timer marks are ever left behind',
      quiet_timer_clears: 'as eruption_timer_clears',
      link_hurt_overkill: 'every hit costs 8, or 4 with Double Defense, and both divide Link\'s 2 hearts (32) evenly, so the last hit always lands on exactly zero',
    },
  },
}
