/**
 * Gohma Larva. Body contact: cylinder 1 (AT, 8 damage, z_en_goma.c:92) is submitted every frame the invincibility
 * timer is 0 (z_en_goma.c:765-770), in every egg and larva state, so every phase where Link can be near carries a
 * contact step. Reported gaps:
 * - A ceiling egg cannot reach Link until it falls; that is its own variant with no contact while resting.
 * - The boss egg's colliders are off for its first 10 frames (z_en_goma.c:170), and a shield bash outside the leap turns
 *   them off for 5 (z_en_goma.c:662). Both are under one beat and are not modeled.
 */
import { DMG_TYPES, type DmgType } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Goma/z_en_goma.c'
const CC = 'src/code/z_collision_check.c'
const at = (line: number): Cite => `${F}:${line}`

/** The AC cylinder (`D_80A4B7CC`) takes every type but the reflected light ray (0xFFDFFFFF). */
const CONNECTS: DmgType[] = DMG_TYPES.filter((d) => d !== 'MIR_RAY')

/** `CollisionCheck_GetSwordDamage`; any other connecting type that is not a shield or a nut deals 1. */
const SWORD: Partial<Record<DmgType, [number, number]>> = {
  SPIN_KOKIRI: [1, 3719], SLASH_KOKIRI: [1, 3719],
  JUMP_KOKIRI: [2, 3721], SPIN_MASTER: [2, 3721], SLASH_MASTER: [2, 3721], HAMMER_SWING: [2, 3721], DEKU_STICK: [2, 3721],
  HAMMER_JUMP: [4, 3723], JUMP_MASTER: [4, 3723], SPIN_GIANT: [4, 3723], SLASH_GIANT: [4, 3723],
  JUMP_GIANT: [8, 3725],
}

const entries: Partial<Record<DmgType, { damage: number; to?: string; cite: Cite }>> = {}
for (const d of CONNECTS) {
  if (d === 'SHIELD') entries[d] = { damage: 0, cite: at(652) }
  else if (d === 'DEKU_NUT') entries[d] = { damage: 0, to: 'stunned', cite: at(666) }
  else {
    const s = SWORD[d]
    entries[d] = s ? { damage: s[0], to: 'hurt', cite: `${CC}:${s[1]}` } : { damage: 1, to: 'hurt', cite: at(675) }
  }
}

/** An egg dies to any hit that connects: only a hatched larva (`ENGOMA_NORMAL`) reads the damage. */
const eggBreaks = Object.fromEntries(CONNECTS.map((d) => [d, { damage: 0, to: 'defeated', cite: at(692) }]))

const phases: Phase[] = [
  { id: 'egg_rest_ceiling', label: 'Gohma egg clings to the ceiling', overrides: eggBreaks, cite: at(292) },
  { id: 'egg_rest_floor', label: 'Gohma egg sits on the floor', overrides: eggBreaks, cite: at(292) },
  { id: 'egg_fall_room', label: 'Gohma egg drops and hatches on landing', overrides: eggBreaks, cite: at(247) },
  { id: 'egg_fall_boss', label: "Gohma's egg bounces and wobbles before hatching", frames: { value: 80, cite: at(271) }, overrides: eggBreaks, cite: at(277) },
  { id: 'hatch', label: 'Larva breaks out of its shell', frames: { value: 5, cite: at(328) }, cite: at(336) },
  { id: 'stand', label: 'Larva stands and watches Link', frames: { value: [10, 39], cite: at(457) }, cite: at(540) },
  { id: 'chase', label: 'Larva runs at Link', cite: at(551) },
  { id: 'prepare_jump', label: 'Larva crouches to leap', frames: { value: 30, cite: at(474) }, cite: at(477) },
  { id: 'jump', label: 'Larva leaps headfirst at Link', overrides: { SHIELD: { damage: 0, to: 'land', cite: at(654) } }, cite: at(524) },
  { id: 'land', label: 'Larva lands', frames: { value: 10, cite: at(497) }, cite: at(500) },
  { id: 'hurt', label: 'Larva reels from a hit', frames: { value: 10, cite: at(352) }, hittable: 'none', cite: at(633) },
  { id: 'flee', label: 'Larva runs away from Link', frames: { value: 20, cite: at(209) }, cite: at(218) },
  { id: 'stunned', label: 'Larva is stunned by a Deku Nut', frames: { value: 100, cite: at(576) }, overrides: { DEKU_NUT: { damage: 0, cite: at(665) } }, cite: at(587) },
]

const contact = (from: string, label: string): Step => ({ from, to: from, label, range: 'near', attack: 'contact', cite: at(770) })

const steps: Step[] = [
  { from: 'egg_rest_ceiling', to: 'egg_fall_room', label: 'Link comes close and the egg drops', range: 'near', cite: at(301) },
  { from: 'egg_rest_floor', to: 'egg_fall_room', label: 'Link bumps the egg and it stirs', range: 'near', attack: 'contact', cite: at(301) },
  { from: 'egg_fall_room', to: 'hatch', label: 'The egg lands on Link and hatches', range: 'near', attack: 'contact', cite: at(247) },
  { from: 'egg_fall_room', to: 'hatch', label: 'The egg lands and hatches', range: 'far', cite: at(247) },
  contact('egg_fall_boss', 'Link bumps the wobbling egg'),
  { from: 'egg_fall_boss', to: 'hatch', label: 'The egg hatches', afterTimer: true, cite: at(280) },
  { from: 'hatch', to: 'stand', label: 'Larva breaks out against Link', afterTimer: true, range: 'near', attack: 'contact', cite: at(339) },
  { from: 'hatch', to: 'stand', label: 'Larva is out', afterTimer: true, range: 'far', cite: at(339) },
  contact('stand', 'Link bumps the standing larva'),
  { from: 'stand', to: 'chase', label: 'Larva starts running', afterTimer: true, cite: at(547) },
  { from: 'chase', to: 'prepare_jump', label: 'Larva runs into Link and crouches', range: 'near', attack: 'contact', cite: at(570) },
  { from: 'chase', to: 'prepare_jump', label: 'Larva reaches Link and crouches', range: 'far', move: 'near', cite: at(570) },
  contact('prepare_jump', 'Link bumps the crouching larva'),
  { from: 'prepare_jump', to: 'jump', label: 'Larva leaps', afterTimer: true, cite: at(488) },
  { from: 'jump', to: 'land', label: 'Larva headbutts Link', range: 'near', attack: 'contact', cite: at(640) },
  { from: 'jump', to: 'land', label: 'Larva lands short', range: 'far', cite: at(530) },
  { from: 'land', to: 'stand', label: 'Larva lands against Link', afterTimer: true, range: 'near', attack: 'contact', cite: at(507) },
  { from: 'land', to: 'stand', label: 'Larva steadies itself', afterTimer: true, range: 'far', cite: at(507) },
  { from: 'hurt', to: 'flee', label: 'The reeling larva bumps Link and turns to run', afterTimer: true, range: 'near', attack: 'contact', cite: at(375) },
  { from: 'hurt', to: 'flee', label: 'Larva turns to run', afterTimer: true, range: 'far', cite: at(375) },
  { from: 'flee', to: 'stand', label: 'Larva bumps Link as it runs off', afterTimer: true, range: 'near', move: 'far', attack: 'contact', cite: at(226) },
  { from: 'flee', to: 'stand', label: 'Larva stops running', afterTimer: true, range: 'far', cite: at(226) },
  contact('stunned', 'Link bumps the stunned larva'),
  { from: 'stunned', to: 'stand', label: 'Larva shakes off the stun', afterTimer: true, cite: at(601) },
]

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enGoma: ActorSpec = {
  overlay: 'ovl_En_Goma',
  name: 'Gohma Larva',
  role: 'enemy',
  summary: 'A Gohma egg that breaks to any hit, hatching into a two-health larva that runs at Link and leaps headfirst. Swords deal their sword damage, other weapons 1, a Deku Nut stuns it, and a shield bash knocks it out of its leap.',
  cite: at(131),
  pools: [{ id: 'body', label: 'Gohma Larva', hp: { value: 2, cite: at(166) }, then: 'defeated' }],
  damage: { kind: 'custom', entries },
  phases,
  start: 'egg_rest_ceiling',
  variants: [
    { id: 'ceiling_egg', label: 'Egg placed on the ceiling (params 8, 9)', start: 'egg_rest_ceiling', cite: at(179) },
    { id: 'floor_egg', label: 'Egg placed on the floor (params 6, 7)', start: 'egg_rest_floor', cite: at(182) },
    { id: 'boss_egg', label: 'Egg laid by Queen Gohma', start: 'egg_fall_boss', cite: at(169) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'contact', label: 'Larva body or headbutt', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(92) },
  ],
  actionFuncs: {
    EnGoma_Egg: 'egg_rest_*',
    EnGoma_EggFallToGround: 'egg_fall_*',
    EnGoma_Hatch: 'hatch',
    EnGoma_Stand: 'stand',
    EnGoma_ChasePlayer: 'chase',
    EnGoma_PrepareJump: 'prepare_jump',
    EnGoma_Jump: 'jump',
    EnGoma_Land: 'land',
    EnGoma_Hurt: 'hurt',
    EnGoma_Flee: 'flee',
    EnGoma_Stunned: 'stunned',
    EnGoma_Die: post('death animation after the finishing blow (health at or below 0); the encounter has already ended', 373),
    EnGoma_Dead: post('corpse shrink, despawn, and item drop after death; drops are out of scope', 446),
    EnGoma_Debris: post('params 10 to 99 are eggshell debris with no colliders: Destroy and Init only set colliders up for params below 10', 154),
    EnGoma_BossLimb: post("params 100 and up are pieces of Queen Gohma's falling corpse, spawned after the boss dies, with no colliders", 142),
  },
  atSources: {
    [at(92)]: 'contact',
  },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      egg_fall_boss_timer_clears: "Queen Gohma's egg leaves its wobble only when the wobble runs out or when a hit breaks it, which ends the encounter",
      hurt_timer_clears: 'the larva leaves its hurt reel only when the reel runs out; it cannot be hit there',
      link_hurt_overkill: "body contact is Link's only damage, 8 units, and his health is a multiple of 8, so no hit finds him at zero",
      ...Object.fromEntries(
        ['deku_stick', 'slingshot', 'explosive', 'boomerang', 'slash_kokiri', 'magic_fire', 'spin_kokiri', 'jump_kokiri', 'jump_kokiri_self', 'jump_master'].map((k) => [
          `miss_${k}`,
          'this swing misses only in the hurt reel, which lasts one beat (10 frames) and is entered only by Link\'s own hit, so the reel is over before his next move',
        ]),
      ),
      ...Object.fromEntries(
        ['deku_stick', 'slash_kokiri', 'magic_fire', 'shield', 'spin_kokiri', 'jump_kokiri', 'jump_kokiri_self', 'jump_master'].flatMap((k) =>
          ['egg_rest_ceiling', 'egg_rest_floor'].map((p) => [`hit_${k}__${p}`, 'a resting egg drops the beat Link comes near, and this attack reaches only near']),
        ),
      ),
    },
  },
}
