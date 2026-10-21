import { standardLoadouts } from '../loadouts'
import { DMG_TYPES } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Floormas/z_en_floormas.c'
const at = (line: number): Cite => `${F}:${line}`

/** Every type the cylinder's AC element accepts (0xFFCFFFFF): what a hardened Floormaster bounces. */
const AC_TYPES = DMG_TYPES.filter((_, i) => (0xffcfffff >>> i) & 1)

/**
 * The split leaves three small hands. One encounter engages them one at a time: `s3` is the first of three,
 * `s2` the next once it dies, `s1` the last. Each has its own two-point pool.
 */
type Small = 's3' | 's2' | 's1'
const SMALLS: Small[] = ['s3', 's2', 's1']
const NEXT: Record<Small, string> = { s3: 'stalk_s2', s2: 'stalk_s1', s1: 'defeated' }
const NAME: Record<Small, string> = { s3: 'first small hand', s2: 'second small hand', s1: 'last small hand' }

const phases: Phase[] = [
  { id: 'idle_big', label: 'Floormaster prowls', cite: at(457) },
  { id: 'hover_big', label: 'Floormaster rises to charge', guards: AC_TYPES, cite: at(568) },
  { id: 'charge_big', label: 'Floormaster slides at Link', guards: AC_TYPES, frames: { value: 25, cite: at(277) }, cite: at(601) },
  { id: 'land_big', label: 'Floormaster bounces off Link and lands', frames: { value: 30, cite: at(286) }, cite: at(627) },
  { id: 'land_big_long', label: 'Floormaster ends its slide', frames: { value: 45, cite: at(288) }, cite: at(627) },
  { id: 'hurt_big', label: 'Floormaster reels', hittable: 'none', cite: at(951) },
  { id: 'frozen_big', label: 'Floormaster is stunned', frames: { value: 80, cite: at(437) }, cite: at(976) },
  { id: 'split', label: 'Floormaster splits into three small hands', hittable: 'none', cite: at(677) },
  ...SMALLS.flatMap((s): Phase[] => [
    { id: `idle_${s}`, label: `The ${NAME[s]} scurries`, pool: `small_${s}`, frames: { value: 50, cite: at(668) }, cite: at(692) },
    { id: `stalk_${s}`, label: `The ${NAME[s]} goes for Link`, pool: `small_${s}`, cite: at(710) },
    { id: `jump_${s}`, label: `The ${NAME[s]} leaps at Link`, pool: `small_${s}`, cite: at(755) },
    { id: `land_${s}`, label: `The ${NAME[s]} lands`, pool: `small_${s}`, frames: { value: 30, cite: at(286) }, cite: at(627) },
    { id: `hurt_${s}`, label: `The ${NAME[s]} reels`, pool: `small_${s}`, hittable: 'none', cite: at(951) },
    { id: `frozen_${s}`, label: `The ${NAME[s]} is stunned`, pool: `small_${s}`, frames: { value: 80, cite: at(437) }, cite: at(976) },
  ]),
]

/** A small hand is not hookable, so the code rewrites a hookshot hit to plain damage 2. */
for (const p of phases)
  if (p.pool && p.hittable !== 'none') p.overrides = { HOOKSHOT: { damage: 2, to: `hurt_${p.id.split('_')[1]}`, cite: at(1004) } }

const steps: Step[] = [
  { from: 'idle_big', to: 'idle_big', label: 'Floormaster runs at Link', range: 'far', move: 'near', cite: at(501) },
  { from: 'idle_big', to: 'hover_big', label: 'Floormaster rears up', range: 'near', cite: at(465) },
  { from: 'hover_big', to: 'charge_big', label: 'Floormaster launches', cite: at(570) },
  { from: 'charge_big', to: 'land_big', label: 'Floormaster slams into Link', range: 'near', attack: 'charge', cite: at(1047) },
  { from: 'charge_big', to: 'land_big_long', label: 'Floormaster slides past', range: 'far', afterTimer: true, cite: at(623) },
  { from: 'land_big', to: 'idle_big', label: 'Floormaster stands', afterTimer: true, cite: at(667) },
  { from: 'land_big_long', to: 'idle_big', label: 'Floormaster stands', afterTimer: true, cite: at(667) },
  { from: 'hurt_big', to: 'idle_big', label: 'Floormaster recovers', cite: at(956) },
  { from: 'frozen_big', to: 'idle_big', label: 'Floormaster shakes off the stun', afterTimer: true, cite: at(986) },
  { from: 'split', to: 'idle_s3', label: 'The small hands land', cite: at(682) },
  ...SMALLS.flatMap((s): Step[] => [
    { from: `idle_${s}`, to: `stalk_${s}`, label: `The ${NAME[s]} turns on Link`, afterTimer: true, cite: at(701) },
    { from: `stalk_${s}`, to: `stalk_${s}`, label: `The ${NAME[s]} runs at Link`, range: 'far', move: 'near', cite: at(740) },
    { from: `stalk_${s}`, to: `jump_${s}`, label: `The ${NAME[s]} jumps`, range: 'near', cite: at(742) },
    { from: `jump_${s}`, to: `land_${s}`, label: `The ${NAME[s]} latches onto Link`, range: 'near', attack: 'grab', cite: at(772) },
    { from: `jump_${s}`, to: `land_${s}`, label: `The ${NAME[s]} lands short`, range: 'far', cite: at(768) },
    { from: `land_${s}`, to: `idle_${s}`, label: `The ${NAME[s]} stands`, afterTimer: true, cite: at(667) },
    { from: `hurt_${s}`, to: `idle_${s}`, label: `The ${NAME[s]} recovers`, cite: at(956) },
    { from: `frozen_${s}`, to: `idle_${s}`, label: `The ${NAME[s]} shakes off the stun`, afterTimer: true, cite: at(986) },
  ]),
]

const attacks: Attack[] = [
  { id: 'charge', label: 'Floormaster charge', damage: 16, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(84) },
  {
    id: 'grab',
    label: 'Small hand grab',
    // Hardened at the grab, actionTarget starts at 0x28 (z_en_floormas.c:200), so the first 8 lands at once and then every 20 frames.
    damage: 8,
    // Escape is mashing: actionVar2 must pass 100 (z_player.c:14249) at +5 per A/B press, 21 presses, one every other frame at best.
    effect: { kind: 'grab', frames: { value: 42, cite: 'src/overlays/actors/ovl_player_actor/z_player.c:1867' }, damagePerBeat: 8, release: 'escape' },
    blockable: false,
    dodgeable: true,
    source: at(833),
  },
]

const hittable = phases.filter((p) => p.hittable !== 'none' && !p.guards).map((p) => p.id)
const who = (id: string) => id.split('_')[1]
const toMap = (target: 'hurt' | 'frozen') =>
  Object.fromEntries(hittable.filter((id) => !(target === 'frozen' && id.startsWith('frozen_'))).map((id) => [id, `${target}_${who(id)}`]))

const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, to: toMap('hurt'), note: 'damage, then the hand reels', cite: at(1028) },
  '0x1': { damage: true, to: toMap('frozen'), note: 'Deku Nut, Boomerang, and Hookshot stun it unless already stunned (no damage in the table)', cite: at(1021) },
  '0x2': { damage: true, to: toMap('hurt'), note: 'fire: damage with a fire ring, then the hand reels', cite: at(1025) },
  '0x4': { damage: true, to: toMap('frozen'), note: 'light: damage and a stun unless already stunned', cite: at(1021) },
}

const off = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enFloormas: ActorSpec = {
  overlay: 'ovl_En_Floormas',
  name: 'Floormaster',
  role: 'enemy',
  summary:
    'A large hand that prowls the floor and slides at Link when it faces him. Killing it splits it into three small hands of two health each; each leaps at Link and grabs him, costing health until he shakes it off. All three must die to end it.',
  cite: at(4),
  pools: [
    { id: 'big', label: 'Floormaster', hp: { value: 4, cite: at(93) }, then: 'split' },
    ...SMALLS.map((s) => ({ id: `small_${s}`, label: `The ${NAME[s]}`, hp: { value: 2, cite: at(313) }, then: NEXT[s] })),
  ],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'idle_big',
  variants: [
    { id: 'visible', label: 'Floormaster', start: 'idle_big', cite: at(187) },
    { id: 'invisible', label: 'Floormaster, visible only through the Lens', start: 'idle_big', unseen: true, cite: at(154) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnFloormas_BigDecideAction: 'idle_big',
    EnFloormas_BigWalk: 'idle_big',
    EnFloormas_BigStopWalk: 'idle_big',
    EnFloormas_Run: 'idle_big',
    EnFloormas_Stand: 'idle_*',
    EnFloormas_Turn: 'idle_*',
    EnFloormas_Recover: 'idle_*',
    EnFloormas_SmallWalk: 'idle_s*',
    EnFloormas_Hover: 'hover_big',
    EnFloormas_Charge: 'charge_big',
    EnFloormas_Land: 'land_*',
    EnFloormas_TakeDamage: 'hurt_*',
    EnFloormas_Freeze: 'frozen_*',
    EnFloormas_Split: 'split',
    EnFloormas_SmallDecideAction: 'stalk_*',
    EnFloormas_JumpAtLink: 'jump_*',
    EnFloormas_GrabLink: off('the hold is the grab attack\'s status on Link (8 health per 20 frames until he escapes); steps cannot branch on whether the grab connected, so the jump always lands in land_*', 776),
    EnFloormas_Merge: off('regrowth into a full-health Floormaster after the last grab releases; not modeled: steps cannot see whether the grab connected and pools cannot refill', 877),
    EnFloormas_SmallFollowerJumpAtLeader: off('a small hand jumping into the merging leader; part of the unmodeled regrowth', 840),
    EnFloormas_SmallShrink: off('death shrink after the finishing blow on a small hand', 747),
    EnFloormas_SmallWait: off('a dead small hand waiting for the others; the next hand is already engaged', 948),
  },
  atSources: {
    [at(84)]: 'charge',
    [at(833)]: 'grab',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      charge_big_timer_clears: 'the charge lasts one beat and is guarded against every hit, so it never ends with its timer left',
      grab_lands_again: 'after a grab the hand lands (2 beats) and scurries (3 beats) before it can leap again, longer than the 2-beat hold',
      grab_lands_dd_again: 'as grab_lands_again',
    },
  },
}
