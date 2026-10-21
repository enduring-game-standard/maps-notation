import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Crow/z_en_crow.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

const phases: Phase[] = [
  { id: 'fly', label: 'Guay circles', frames: { value: 100, cite: at(146) }, cite: at(243) },
  { id: 'dive', label: 'Guay dives at Link', frames: { value: 300, cite: at(153) }, cite: at(300) },
  { id: 'turn_away', label: 'Guay flies off, dazed', frames: { value: 100, cite: at(209) }, cite: at(383) },
]

const steps: Step[] = [
  { from: 'fly', to: 'dive', label: 'Guay dives', range: 'near', afterTimer: true, gear: [{ gear: 'skull_mask', has: false }], cite: at(296) },
  { from: 'dive', to: 'dive', label: 'Guay wheels after Link', range: 'far', move: 'near', cite: at(328) },
  { from: 'dive', to: 'fly', label: 'Guay pecks Link', range: 'near', attack: 'peck', cite: at(339) },
  { from: 'dive', to: 'fly', label: 'Guay gives up the dive', afterTimer: true, cite: at(339) },
  { from: 'turn_away', to: 'fly', label: 'Guay recovers', afterTimer: true, cite: at(399) },
]

const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, note: 'nonzero damage is applied to its single health point and it falls; zero damage does nothing', cite: at(436) },
  '0x1': { damage: false, to: 'turn_away', note: 'a Deku Nut sends it flying away from Link', cite: at(434) },
  '0x2': { damage: true, note: 'fire arrows and Din\'s Fire apply damage like any hit, with a fire effect', cite: at(183) },
  '0x3': { damage: true, note: 'ice arrows apply damage like any hit, with an ice effect', cite: at(174) },
}

export const enCrow: ActorSpec = {
  overlay: 'ovl_En_Crow',
  name: 'Guay',
  role: 'enemy',
  summary:
    'A crow with one health point. It circles its home, dives at Link when he is close, and pecks. A Deku Nut sends it flying off; any damaging hit drops it. The Skull Mask keeps it from diving.',
  cite: at(116),
  pools: [{ id: 'body', label: 'Guay', hp: { value: 1, cite: at(75) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'fly',
  range: 'far',
  steps,
  attacks: [{ id: 'peck', label: 'Guay peck', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(52) }],
  actionFuncs: {
    EnCrow_FlyIdle: 'fly',
    EnCrow_DiveAttack: 'dive',
    EnCrow_TurnAway: 'turn_away',
    EnCrow_Damaged: post('the fall after the finishing blow (Enemy_StartFinishingBlow); the encounter has already ended', 438),
    EnCrow_Die: post('shrinks away and drops an item after death; drops are out of scope', 372),
    EnCrow_Respawn: post('a fresh Guay reappears at home 300 frames after death; that is a new encounter', 234),
  },
  atSources: { [at(52)]: 'peck' },
  loadouts: [
    ...standardLoadouts(['child', 'adult']),
    { id: 'child_skull_mask', age: 'child', hearts: 2, gear: ['kokiri_sword', 'deku_shield', 'skull_mask'] },
  ],
  expected: {
    deadVerbs: {
      turn_away_timer_clears: 'turning away is left only once its timer runs out, or by defeat, which ends the encounter',
      link_hurt_overkill: 'the peck costs exactly one health mark, so Link\'s health reaches zero exactly and is never overshot',
    },
  },
}
