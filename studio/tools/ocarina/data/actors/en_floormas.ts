import { standardLoadouts } from '../loadouts'
import { DMG_TYPES } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Floormas/z_en_floormas.c'
const at = (line: number): Cite => `${F}:${line}`

/*
 * Reported gaps (the types cannot express these):
 * - Regrowth (EnFloormas_Merge). A small hand that releases Link while both siblings are grabbing or dead (:812-818)
 *   lands, merges (:665) and stands up as a big Floormaster with full health (:933); killing that one splits all three
 *   hands again at 2 health each (:445-447, :313). Step.restore can refill the big pool, but only on a step, and the
 *   step out of jump_s* cannot branch on whether its grab connected: a dodge leaves the step's destination unchanged and
 *   onBlock covers only shield blocks (the grab is unblockable). The re-split would also need three small pools refilled,
 *   and a step restores one pool. So the last hand dies normally here and regrowth is not modeled.
 * - A small hand hit or stunned while it scurries resumes the scurry timer where it left off (smallActionTimer is set only
 *   at :668 and :681 and counts only at :694); here it starts the 50 frames again. Hit while stalking, jumping or landing,
 *   the timer is already 0, so it goes straight back to stalking (:700-701); that case is modeled (hurt_s*_hunting).
 * - The charge also ends on hitting a wall (:622); the model has no walls, so only the timer ends it.
 * - The grab hold is as long as Link takes to escape. 42 frames is A/B mashing alone at best (+5 per press,
 *   z_player.c:1867, past 100 at z_player.c:14249). Spinning the stick adds up to 4 more each frame (z_player.c:1863-1864,
 *   magnitude capped at 60 at src/code/z_lib.c:233), so a faster escape can beat the first 8 at frame 20.
 */

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
    { id: `hurt_${s}_hunting`, label: `The ${NAME[s]} reels mid-hunt`, pool: `small_${s}`, hittable: 'none', cite: at(951) },
    { id: `frozen_${s}_hunting`, label: `The ${NAME[s]} is stunned mid-hunt`, pool: `small_${s}`, frames: { value: 80, cite: at(437) }, cite: at(976) },
  ]),
]

/** A small hand hit after its scurry timer ran out (stalking, jumping, landing) has smallActionTimer 0 and resumes the hunt. */
const HUNTING = ['stalk', 'jump', 'land']
const reactTo = (id: string, kind: 'hurt' | 'frozen') => {
  const [phase, who, hunting] = id.split('_')
  return `${kind}_${who}${hunting === 'hunting' || (who !== 'big' && HUNTING.includes(phase)) ? '_hunting' : ''}`
}

/** A small hand is not hookable, so the code rewrites a hookshot hit to plain damage 2. */
for (const p of phases)
  if (p.pool && p.hittable !== 'none') p.overrides = { HOOKSHOT: { damage: 2, to: reactTo(p.id, 'hurt'), cite: at(1004) } }

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
    { from: `hurt_${s}_hunting`, to: `stalk_${s}`, label: `The ${NAME[s]} recovers and turns on Link`, cite: at(701) },
    { from: `frozen_${s}_hunting`, to: `stalk_${s}`, label: `The ${NAME[s]} shakes off the stun and turns on Link`, afterTimer: true, cite: at(701) },
  ]),
]

const attacks: Attack[] = [
  { id: 'charge', label: 'Floormaster charge', damage: 16, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(84) },
  {
    id: 'grab',
    label: 'Small hand grab',
    // The code deals nothing on contact: actionTarget starts at 0x28 (z_en_floormas.c:200) and counts down once a frame
    // (:1081-1084), so the first 8 lands on frame 20 of the hold (:827), then every 20 frames.
    damage: 0,
    // Escape by A/B mashing alone: actionVar2 must pass 100 (z_player.c:14249) at +5 per press, 21 presses, one every other
    // frame at best. Stick spinning can shorten it (header gap).
    effect: { kind: 'grab', frames: { value: 42, cite: 'src/overlays/actors/ovl_player_actor/z_player.c:1867' }, damagePerBeat: { value: { units: 8, frames: 20 }, cite: at(833) }, release: 'escape' },
    blockable: false,
    dodgeable: true,
    source: at(833),
  },
]

const hittable = phases.filter((p) => p.hittable !== 'none' && !p.guards).map((p) => p.id)
const toMap = (target: 'hurt' | 'frozen') =>
  Object.fromEntries(hittable.filter((id) => !(target === 'frozen' && id.startsWith('frozen_'))).map((id) => [id, reactTo(id, target)]))

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
    EnFloormas_Merge: off('regrowth into a full-health Floormaster (:933) by a hand that releases Link while both siblings grab or are dead (:812-818); not modeled: the jump step cannot branch on whether its grab connected, and the re-split needs three pool refills (header gap)', 877),
    EnFloormas_SmallFollowerJumpAtLeader: off('a small hand jumping into the merging leader; part of the unmodeled regrowth', 840),
    EnFloormas_SmallShrink: off('death shrink after the finishing blow on a small hand', 747),
    EnFloormas_SmallWait: off('an empty slot: the two extra hands before the split (:159-162), a dead small hand waiting for the others (SmallShrink, :749), or a follower absorbed into the merge leader (:863, unmodeled regrowth)', 948),
  },
  atSources: {
    [at(84)]: 'charge',
    [at(833)]: 'grab',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'Link starts and heals in whole hearts (even marks) and every cost is 2 or 4 marks, except the 1-mark grab tick with Double Defense; grabs come only from the small hands after the split, when no 2-mark charge can follow, so no cost is ever larger than the health left',
      charge_big_timer_clears: 'the charge lasts one beat and is guarded against every hit, so it never ends with its timer left',
      grab_lands_again: 'after a grab the hand lands (2 beats) and scurries (3 beats) before it can leap again, longer than the 2-beat hold',
      grab_lands_dd_again: 'as grab_lands_again',
    },
  },
}
