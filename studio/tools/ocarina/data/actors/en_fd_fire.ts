import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Fd_Fire/z_en_fd_fire.c'
const at = (line: number): Cite => `${F}:${line}`

const phases: Phase[] = [
  { id: 'launch_dance', label: 'Blue flame arcs out of Flare Dancer', cite: at(159) },
  { id: 'launch_still', label: 'Flame arcs out of Flare Dancer', cite: at(159) },
  { id: 'dance', label: 'Blue flame dances around Link', frames: { value: 200, cite: at(171) }, cite: at(186) },
  { id: 'still', label: 'Flame burns in place', frames: { value: 300, cite: at(174) }, cite: at(180) },
  /** Update stops setting AT and AC once the action is Disappear. */
  { id: 'gone', label: 'Flame dies away', hittable: 'none', cite: at(236) },
]

const steps: Step[] = [
  { from: 'launch_dance', to: 'dance', label: 'Flame lands and starts to dance', cite: at(172) },
  { from: 'launch_still', to: 'still', label: 'Flame lands', cite: at(175) },
  { from: 'dance', to: 'dance', label: 'Flame dances up to Link', range: 'far', move: 'near', cite: at(202) },
  /** Touching Link sets OC2_HIT_PLAYER (line 127), which puts the flame out the same as a hit. */
  { from: 'dance', to: 'gone', label: 'Flame runs into Link', range: 'near', attack: 'flame', cite: at(228) },
  { from: 'dance', to: 'gone', label: 'Flame burns out', afterTimer: true, cite: at(200) },
  { from: 'still', to: 'gone', label: 'Link walks into the flame', range: 'near', attack: 'flame', cite: at(228) },
  { from: 'still', to: 'gone', label: 'Flame burns out', afterTimer: true, cite: at(182) },
]

export const enFdFire: ActorSpec = {
  overlay: 'ovl_En_Fd_Fire',
  name: "Flare Dancer's flame",
  role: 'projectile',
  summary:
    'A flame Flare Dancer throws out in a ring of eight. Red flames burn where they land; blue flames dance around Link. Either burns Link on contact and goes out, burns out on its own, or is put out by any hit its collider accepts.',
  cite: at(222),
  pools: [{ id: 'flame', label: 'Flame', hp: { value: 1, cite: at(59) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      '0x0': {
        damage: true,
        to: 'defeated',
        note: 'any hit the collider accepts sets AC_HIT, and Update then switches to Disappear without reading health or damage',
        cite: at(228),
      },
    },
  },
  phases,
  start: 'launch_still',
  variants: [
    { id: 'dancing', label: 'Blue flame that dances after Link (params bit 15 set)', start: 'launch_dance', cite: at(170) },
    { id: 'standing', label: 'Red flame that burns in place (params bit 15 clear)', start: 'launch_still', cite: at(170) },
  ],
  range: 'far',
  steps,
  attacks: [{ id: 'flame', label: 'Flame', damage: 8, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(50) }],
  actionFuncs: {
    func_80A0E70C: 'launch_*',
    EnFdFire_DanceTowardsPlayer: 'dance',
    EnFdFire_WaitToDie: 'still',
    EnFdFire_Disappear: 'gone',
  },
  atSources: { [at(50)]: 'flame' },
  loadouts: standardLoadouts(['adult'], 1),
  expected: {
    deadVerbs: {
      flame_hurt: 'every accepted hit sends the flame straight to defeat (reaction 0x0), so its health is never drained',
      flame_overkill: 'as flame_hurt',
      flame_lands_again: 'a flame goes out when it touches Link, so it cannot burn him again while he still burns',
      flame_lands_dd_again: 'as flame_lands_again',
      fairy_revives_link: 'the only kit with a fairy (adult_bottles) also has Double Defense, under which one flame and its burn cannot empty one heart',
      hit_spin_giant__launch_dance: 'the launch is only the opening beat, when Link is still far, and this attack needs near',
      hit_spin_giant__launch_still: 'as hit_spin_giant__launch_dance',
      hit_spin_master__launch_dance: 'as hit_spin_giant__launch_dance',
      hit_spin_master__launch_still: 'as hit_spin_giant__launch_dance',
      hit_jump_giant__launch_dance: 'as hit_spin_giant__launch_dance',
      hit_jump_giant__launch_still: 'as hit_spin_giant__launch_dance',
      hit_jump_giant_self__launch_dance: 'as hit_spin_giant__launch_dance',
      hit_jump_giant_self__launch_still: 'as hit_spin_giant__launch_dance',
      hit_jump_master__launch_dance: 'as hit_spin_giant__launch_dance',
      hit_jump_master__launch_still: 'as hit_spin_giant__launch_dance',
      hit_jump_master_self__launch_dance: 'as hit_spin_giant__launch_dance',
      hit_jump_master_self__launch_still: 'as hit_spin_giant__launch_dance',
    },
  },
}
