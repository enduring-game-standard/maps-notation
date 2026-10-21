import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Reeba/z_en_reeba.c'
const at = (line: number): Cite => `${F}:${line}`

type Size = 'small' | 'big'
const SIZES: Size[] = ['small', 'big']
const NAME: Record<Size, string> = { small: 'Leever', big: 'Big Leever' }

const phases: Phase[] = [
  ...SIZES.flatMap((s): Phase[] => [
    { id: `surface_${s}`, label: `${NAME[s]} rises out of the sand`, pool: s, hittable: 'none', frames: { value: 20, cite: at(206) }, cite: at(693) },
    { id: `move_${s}`, label: `${NAME[s]} spins across the sand at Link`, pool: s, cite: at(s === 'small' ? 277 : 305) },
    { id: `damaged_${s}`, label: `${NAME[s]} reels from a hit`, pool: s, hittable: 'none', frames: { value: 14, cite: at(388) }, cite: at(559) },
    { id: `stunned_${s}`, label: `${NAME[s]} is knocked back, stunned`, pool: s, frames: { value: 14, cite: at(413) }, cite: at(421) },
    { id: `recover_${s}`, label: `${NAME[s]} shakes off the stun`, pool: s, frames: { value: 66, cite: at(447) }, cite: at(540) },
  ]),
  { id: 'sunk', label: 'The Leever has sunk away into the sand and is gone', pool: 'small', hittable: 'none', cite: at(383) },
]

const steps: Step[] = [
  { from: 'surface_small', to: 'move_small', label: 'Leever surfaces and aims at Link', afterTimer: true, cite: at(271) },
  { from: 'surface_big', to: 'move_big', label: 'Big Leever surfaces', afterTimer: true, cite: at(267) },
  { from: 'move_small', to: 'move_small', label: 'Leever charges at Link', range: 'far', move: 'near', cite: at(270) },
  { from: 'move_small', to: 'sunk', label: 'Leever spins into Link and sinks', range: 'near', attack: 'spin', cite: at(675) },
  { from: 'move_small', to: 'sunk', label: 'Leever runs out of time and sinks', afterTimer: true, cite: at(293) },
  { from: 'move_big', to: 'move_big', label: 'Big Leever closes on Link', range: 'far', move: 'near', cite: at(328) },
  { from: 'move_big', to: 'move_big', label: 'Big Leever spins into Link', range: 'near', attack: 'spin_big', cite: at(697) },
  { from: 'damaged_small', to: 'sunk', label: 'Leever sinks after the hit', afterTimer: true, cite: at(407) },
  { from: 'damaged_big', to: 'move_big', label: 'Big Leever comes back around', afterTimer: true, cite: at(405) },
  ...SIZES.map((s): Step => ({ from: `stunned_${s}`, to: `recover_${s}`, label: `${NAME[s]} stops sliding`, afterTimer: true, cite: at(448) })),
  { from: 'recover_small', to: 'sunk', label: 'Leever recovers and sinks', afterTimer: true, cite: at(549) },
  { from: 'recover_big', to: 'move_big', label: 'Big Leever recovers', afterTimer: true, cite: at(547) },
]
/** Move times out after 130 frames. */
phases.find((p) => p.id === 'move_small')!.frames = { value: 130, cite: at(269) }

const attacks: Attack[] = [
  { id: 'spin', label: 'Leever spin', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(121) },
  { id: 'spin_big', label: 'Big Leever spin', damage: 16, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(156) },
]

const hittableIds = (s: Size) => [`move_${s}`, `stunned_${s}`, `recover_${s}`]
const toAll = (target: (s: Size) => string) => Object.fromEntries(SIZES.flatMap((s) => hittableIds(s).map((p) => [p, target(s)])))

const reactions: Record<string, Reaction> = {
  LEEVER_DMG_REACT_NONE: { damage: false, note: 'falls to the default case: nothing happens', cite: at(618) },
  LEEVER_DMG_REACT_OTHER: { damage: true, to: toAll((s) => `damaged_${s}`), note: 'damage applies; a survivor reels (EnReeba_SetupDamaged), and an empty pool kills it', cite: at(587) },
  LEEVER_DMG_REACT_ICE: { damage: true, to: toAll((s) => `stunned_${s}`), note: 'damage applies and it is frozen in a stun; an empty pool kills it', cite: at(602) },
  LEEVER_DMG_REACT_BOOMERANG: { damage: false, to: toAll((s) => `stunned_${s}`), note: 'stuns without damage while health is above 1 (the only case a small Leever reaches)', cite: at(566) },
  LEEVER_DMG_REACT_HOOKSHOT: { damage: false, to: toAll((s) => `stunned_${s}`), note: 'stuns without damage while health is above 2 (the only case a small Leever reaches)', cite: at(576) },
  LEEVER_DMG_REACT_UNK: { damage: false, to: toAll((s) => `stunned_${s}`), note: 'stuns without damage', cite: at(610) },
}

const STUN_HITS = [
  'deku_stick', 'slingshot', 'explosive', 'boomerang', 'arrow_normal', 'hammer_swing', 'hookshot', 'slash_kokiri', 'slash_master',
  'arrow_fire', 'arrow_ice', 'arrow_light', 'spin_master', 'jump_kokiri', 'jump_master', 'jump_master_self',
]
const deadVerbs: Record<string, string> = {
  ...Object.fromEntries(SIZES.flatMap((s) => ['surface', 'damaged', 'stunned'].map((p) => [
    `${p}_${s}_timer_clears`, `${p}_${s} has a one-beat timer that ticks before its only way out, so the timer is always spent when the phase is left`,
  ]))),
  ...Object.fromEntries(SIZES.flatMap((s) => STUN_HITS.map((k) => [
    `hit_${k}__stunned_${s}`, `stunned_${s} lasts one beat (14 frames) and is entered only by Link's own hit, so it is gone before his next move`,
  ]))),
  link_hurt_overkill: 'the spins cost 8 or 16 units, or half that with Double Defense, and Link\'s health stays a multiple of the cost, so a hit never finds less health than it takes',
  hit_arrow_light__recover_big: 'in the only kit with light arrows (adult_arrows, 8 magic) the only stunning hit is an ice arrow (4 magic), which leaves too little for a light arrow (8 magic)',
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enReeba: ActorSpec = {
  overlay: 'ovl_En_Reeba',
  name: 'Leever',
  role: 'enemy',
  summary:
    'A sand creature that surfaces near Link and spins at him. A small Leever has 4 health and sinks away after it touches Link, takes a hit, or runs out of time. A Big Leever has 20 health, hits for a heart with a knockback, and keeps circling Link.',
  cite: at(100),
  pools: [
    { id: 'small', label: 'Leever', hp: { value: 4, cite: at(142) }, then: 'defeated' },
    { id: 'big', label: 'Big Leever', hp: { value: 20, cite: at(154) }, then: 'defeated' },
  ],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'surface_small',
  variants: [
    { id: 'small', label: 'Leever', start: 'surface_small', cite: at(145) },
    { id: 'big', label: 'Big Leever', start: 'surface_big', cite: at(148) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnReeba_SetupSurface: 'surface_*',
    EnReeba_Surface: 'surface_*',
    EnReeba_Move: 'move_small',
    EnReeba_SetupMoveBig: 'move_big',
    EnReeba_MoveBig: 'move_big',
    EnReeba_Recoiled: post(
      'entered only when a raised shield bounces the spin (AT_BOUNCED); a step cannot branch on a block, and it ends the same way under a beat (14 frames): a small Leever sinks, a big one moves again',
      666,
    ),
    EnReeba_SetupSink: 'sunk',
    EnReeba_Sink: 'sunk',
    EnReeba_SetupDamaged: 'damaged_*',
    EnReeba_Damaged: 'damaged_*',
    EnReeba_SetupStunned: 'stunned_*',
    EnReeba_Stunned: 'stunned_*',
    EnReeba_StunRecover: 'recover_*',
    EnReeba_StunDie: post('frozen death after an ice hit empties its health; the encounter has already ended', 457),
    EnReeba_SetupDie: post('death after the finishing blow; the encounter has already ended', 481),
    EnReeba_Die: post('death shrink, item drop, and despawn after the finishing blow; drops are out of scope', 490),
  },
  atSources: {
    [at(121)]: 'spin',
    [at(155)]: 'spin_big',
    [at(156)]: 'spin_big',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
