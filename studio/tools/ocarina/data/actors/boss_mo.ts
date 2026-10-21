import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

/*
 * Reported gaps (the types cannot express these):
 * - The second tentacle. After the nucleus's third sword hit (hitCount, z_boss_mo.c:1807) tentacle 1's RETREAT
 *   spawns a second tentacle (z_boss_mo.c:978-994). Its strike lasts 55 frames, not 175 (z_boss_mo.c:657-662), and
 *   each tentacle waits while the other holds Link (HAS_LINK, z_boss_mo.c:647, 686, 706). An encounter is one actor
 *   in one phase, and no pool threshold counts hits rather than health, so the spec models tentacle 1 only.
 * - The shield and the lash. The tentacle's AT flags (z_boss_mo_colchk.inc.c:6) share bits with the shield's AC mask
 *   (z_player.c:10518), so a raised shield bounces the 16 contact damage (z_player.c:4882). The bounce still marks the
 *   element hit (z_collision_check.c:1730), which sets playerHitTimer (z_boss_mo.c:1217-1219), and grabPlayer checks no
 *   shield (z_player.c:16089-16099), so the grab still lands. One attack has one `blockable`; the spec keeps the lash
 *   unblockable because the grab is the larger cost, and so overcharges 16 against a raised shield.
 * - The hold before the shake. CURL and GRAB hold Link for up to 40 frames with no drain (z_boss_mo.c:689, 775-787)
 *   before SHAKE's 150 (z_boss_mo.c:791). A grab has one duration, so tent_held and the grab both run the 150 frames
 *   of the drain. A grab that grabPlayer refuses (z_player.c:16090-16091, player states the model lacks) is not modeled.
 * - A miss with Link more than 300 units away sends the tentacle to RETREAT for 75 frames, not READY
 *   (z_boss_mo.c:705-711). The range bands cannot tell 300 units from the strike's 120 (z_boss_mo.c:686), so a miss
 *   always goes to tent_reset.
 * - A sword-stunned nucleus that drops back into the water goes to MAKE_TENT at once (z_boss_mo.c:1982-1986), then to
 *   MOVE with timer 70 (z_boss_mo.c:1953-1956), instead of MOVE with timer 30 (z_boss_mo.c:1979-1980). Which happens
 *   depends on the nucleus's height, which the model does not track; the spec models the 30-frame recovery.
 * - Under the tentacle (MAKE_TENT) the nucleus sits 40 units below the tentacle's base (z_boss_mo.c:2130). The code
 *   gates sword and hookshot hits by state only (z_boss_mo.c:1793-1796, 1831-1833); that they cannot reach it there is
 *   a reach judgment, not a code rule. Its body contact there is left out on the same judgment.
 * - The grab drain is -1 per tick (z_boss_mo.c:815), which Double Defense's shift leaves at -1; the generator halves
 *   the drain under Double Defense.
 * - Once the SHAKE timer is 0 the drain fires every frame until the tentacle's swing passes the exit test
 *   (z_boss_mo.c:850-853); the rate models the 150 timed frames only.
 */

const F = 'src/overlays/actors/ovl_Boss_Mo/z_boss_mo.c'
const COL = 'src/overlays/actors/ovl_Boss_Mo/z_boss_mo_colchk.inc.c'
const CC = 'src/code/z_collision_check.c'
const at = (line: number): Cite => `${F}:${line}`
const col = (line: number): Cite => `${COL}:${line}`
const cc = (line: number): Cite => `${CC}:${line}`

/** `CollisionCheck_GetSwordDamage`, the only damage the nucleus takes (z_boss_mo.c:1794). */
const SWORD_DAMAGE: [DmgType, number, number][] = [
  ['SPIN_KOKIRI', 1, 3718], ['SLASH_KOKIRI', 1, 3718],
  ['JUMP_KOKIRI', 2, 3720], ['SPIN_MASTER', 2, 3720], ['SLASH_MASTER', 2, 3720], ['HAMMER_SWING', 2, 3720], ['DEKU_STICK', 2, 3720],
  ['HAMMER_JUMP', 4, 3722], ['JUMP_MASTER', 4, 3722], ['SPIN_GIANT', 4, 3722], ['SLASH_GIANT', 4, 3722],
  ['JUMP_GIANT', 8, 3724],
]

/** The tentacle's phases: the nucleus sits under its base (MAKE_TENT) or rides inside it (ATTACK, RETREAT). */
const TENT = ['tent_rise', 'tent_ready', 'tent_reset', 'tent_swing', 'tent_strike', 'tent_held', 'tent_cut', 'tent_retreat'] as const
/** Phases where the core is in ATTACK (riding the tentacle), so a hookshot hit also cuts tentacle 1 (z_boss_mo.c:1833-1839). */
const RIDING: Tent[] = ['tent_strike', 'tent_cut']
/** Link is held: grabPlayer puts him in the held action (z_player.c:16093), so none of his attacks are swung. */
const HELD = 'src/overlays/actors/ovl_player_actor/z_player.c:16093' as Cite
type Tent = (typeof TENT)[number]
/** Phases where the nucleus is under the water at the tentacle's base, 40 units below it. */
const SUBMERGED: Tent[] = ['tent_rise', 'tent_ready', 'tent_reset', 'tent_swing', 'tent_retreat']
/** Phases whose tentacle still has its AC collider (cutIndex is 0) for Din's Fire to cut. */
const CUTTABLE: Tent[] = ['tent_rise', 'tent_ready', 'tent_reset', 'tent_swing', 'tent_strike', 'tent_held', 'tent_retreat']

const tentOverrides = (p: Tent): Phase['overrides'] => {
  const out: NonNullable<Phase['overrides']> = {}
  const swordCite = SUBMERGED.includes(p) ? at(2130) : p === 'tent_held' ? HELD : at(1796)
  for (const [d] of SWORD_DAMAGE) out[d] = { damage: 0, cite: swordCite }
  out.HOOKSHOT = RIDING.includes(p)
    ? { damage: 0, to: 'stunned_hook_cut', cite: at(1838) }
    : { damage: 0, cite: SUBMERGED.includes(p) ? at(2130) : HELD }
  if (CUTTABLE.includes(p)) out.MAGIC_FIRE = { damage: 0, to: 'tent_cut', cite: at(1195) }
  return out
}

const tentPhase = (id: Tent, label: string, frames: [number, number], cite: number): Phase => ({
  id, label, frames: { value: frames[0], cite: at(frames[1]) }, overrides: tentOverrides(id), cite: at(cite),
})

const phases: Phase[] = [
  { id: 'roam', label: 'The nucleus swims free', frames: { value: 70, cite: at(1956) }, cite: at(1937) },
  { id: 'recover', label: 'The nucleus swims free after a stun', frames: { value: 30, cite: at(1980) }, cite: at(1937) },
  { id: 'stunned_sword', label: 'The nucleus reels from a sword hit', frames: { value: 25, cite: at(1799) }, cite: at(1798) },
  { id: 'stunned_hook', label: 'The nucleus lies hooked out of the water', frames: { value: 30, cite: at(1848) }, cite: at(1847) },
  { id: 'stunned_hook_cut', label: 'The nucleus lies hooked out of its cut tentacle', frames: { value: 30, cite: at(1848) }, cite: at(1838) },
  /** The core waits for tentacle 1 to be back in WAIT or READY (z_boss_mo.c:1939-1941); its RETREAT timer is 75. */
  { id: 'recover_cut', label: 'The nucleus swims free while its cut tentacle sinks', frames: { value: 75, cite: at(913) }, cite: at(1940) },
  tentPhase('tent_rise', 'A tentacle rises out of the water', [70, 1947], 571),
  tentPhase('tent_ready', 'The tentacle sways, ready', [60, 579], 611),
  tentPhase('tent_reset', 'The tentacle sways after a miss', [30, 704], 698),
  tentPhase('tent_swing', 'The tentacle winds up', [50, 649], 612),
  tentPhase('tent_strike', 'The tentacle strikes, the nucleus inside it', [175, 659], 666),
  tentPhase('tent_held', 'The tentacle holds and shakes Link', [150, 791], 809),
  /** Din's Fire cuts at 15 (z_boss_mo.c:1193) and the melt runs one index a frame to 41, so 25 frames. */
  tentPhase('tent_cut', 'The tentacle melts where it was cut', [25, 911], 888),
  tentPhase('tent_retreat', 'The tentacle sinks back into the water', [75, 865], 920),
]

const steps: Step[] = [
  { from: 'roam', to: 'tent_rise', label: 'The nucleus raises a tentacle', afterTimer: true, cite: at(1944) },
  { from: 'recover', to: 'tent_rise', label: 'The nucleus raises a tentacle', afterTimer: true, cite: at(1944) },
  { from: 'roam', to: 'roam', label: 'The nucleus bumps Link', range: 'near', attack: 'nucleus', cite: at(2280) },
  { from: 'recover', to: 'recover', label: 'The nucleus bumps Link', range: 'near', attack: 'nucleus', cite: at(2280) },
  { from: 'stunned_sword', to: 'recover', label: 'The nucleus recovers', afterTimer: true, cite: at(1979) },
  { from: 'stunned_hook', to: 'recover', label: 'The nucleus recovers', afterTimer: true, cite: at(1979) },
  { from: 'stunned_hook_cut', to: 'recover_cut', label: 'The nucleus recovers', afterTimer: true, cite: at(1979) },
  { from: 'recover_cut', to: 'tent_rise', label: 'The nucleus raises a tentacle', afterTimer: true, cite: at(1944) },
  { from: 'recover_cut', to: 'recover_cut', label: 'The nucleus bumps Link', range: 'near', attack: 'nucleus', cite: at(2280) },
  { from: 'tent_ready', to: 'tent_ready', label: 'The swaying tentacle hits Link', range: 'near', attack: 'tent_contact', cite: at(2432) },
  { from: 'tent_reset', to: 'tent_reset', label: 'The swaying tentacle hits Link', range: 'near', attack: 'tent_contact', cite: at(2432) },
  { from: 'tent_swing', to: 'tent_swing', label: 'The winding tentacle hits Link', range: 'near', attack: 'tent_contact', cite: at(2432) },
  { from: 'tent_cut', to: 'tent_cut', label: 'The nucleus in the melting tentacle bumps Link', range: 'near', attack: 'nucleus', cite: at(2280) },
  { from: 'tent_rise', to: 'tent_ready', label: 'The tentacle is up', afterTimer: true, cite: at(578) },
  { from: 'tent_ready', to: 'tent_swing', label: 'The tentacle winds up', afterTimer: true, cite: at(648) },
  { from: 'tent_reset', to: 'tent_swing', label: 'The tentacle winds up', afterTimer: true, cite: at(648) },
  { from: 'tent_swing', to: 'tent_strike', label: 'The tentacle strikes', afterTimer: true, cite: at(657) },
  { from: 'tent_strike', to: 'tent_held', label: 'The tentacle lashes and seizes Link', range: 'near', attack: 'lash', cite: at(750) },
  { from: 'tent_strike', to: 'tent_reset', label: 'The tentacle misses and pulls back', range: 'far', afterTimer: true, cite: at(698) },
  { from: 'tent_held', to: 'tent_retreat', label: 'The tentacle lets Link go', afterTimer: true, cite: at(854) },
  { from: 'tent_cut', to: 'tent_retreat', label: 'The cut tentacle sinks', afterTimer: true, cite: at(912) },
  { from: 'tent_retreat', to: 'roam', label: 'The nucleus swims out again', afterTimer: true, cite: at(1955) },
]

const attacks: Attack[] = [
  {
    id: 'lash', label: 'Tentacle lash and grab', damage: 16,
    effect: { kind: 'grab', frames: { value: 150, cite: at(791) }, damagePerBeat: { value: { units: 1, frames: 8 }, cite: at(814) }, release: 'escape' },
    blockable: false, dodgeable: true, source: col(7),
  },
  /** READY and SWING keep the tentacle's AT on (z_boss_mo.c:2426-2433, radius at 2450); a hit there only sets playerHitTimer (z_boss_mo.c:1217-1219), which only ATTACK and CURL read. */
  { id: 'tent_contact', label: 'Tentacle contact', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: col(7) },
  { id: 'nucleus', label: 'Nucleus contact', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: col(239) },
]

const excl = (excluded: string, line: number): Excluded => ({ excluded, cite: at(line) })
const intro = 'intro cutscene before the fight starts'
const death = 'death cutscene after the finishing blow; the encounter has already ended'

export const bossMo: ActorSpec = {
  overlay: 'ovl_Boss_Mo',
  name: 'Morpha',
  role: 'boss',
  summary:
    'A water nucleus that raises tentacles from the pool. A tentacle strikes, seizes Link and shakes him; the hookshot pulls the nucleus out of the water or out of a striking tentacle, and only sword and hammer hits on the nucleus hurt it.',
  cite: at(364),
  pools: [{ id: 'nucleus', label: 'Morpha nucleus', hp: { value: 20, cite: at(384) }, then: 'defeated' }],
  damage: {
    kind: 'custom',
    entries: {
      ...Object.fromEntries(SWORD_DAMAGE.map(([d, n, line]) => [d, { damage: n, to: 'stunned_sword', cite: cc(line) }])),
      HOOKSHOT: { damage: 0, to: 'stunned_hook', cite: at(1847) },
    },
  },
  phases,
  start: 'roam',
  range: 'far',
  steps,
  attacks,
  actionFuncs: { BossMo_Tentacle: 'tent_*' },
  states: {
    MO_CORE_MOVE: { phase: 'roam', cite: at(1937) },
    MO_CORE_MAKE_TENT: { phase: 'tent_*', cite: at(1952) },
    MO_CORE_UNDERWATER: excl('the nucleus chases Link only while he is more than 50 units under the water surface, and the encounter has no depth (no Iron Boots state)', 1929),
    MO_CORE_STUNNED: { phase: 'stunned_*', cite: at(1976) },
    MO_CORE_ATTACK: { phase: 'tent_*', cite: at(1993) },
    MO_CORE_RETREAT: { phase: 'tent_*', cite: at(2008) },
    MO_CORE_INTRO_WAIT: excl(intro, 1904),
    MO_CORE_INTRO_REVEAL: excl(intro, 2018),
    MO_CORE_UNUSED: excl('no code sets this state; its case only breaks', 1988),
    MO_TENT_WAIT: { phase: 'roam', cite: at(563) },
    MO_TENT_SPAWN: { phase: 'tent_rise', cite: at(571) },
    MO_TENT_READY: { phase: 'tent_ready', cite: at(611) },
    MO_TENT_SWING: { phase: 'tent_swing', cite: at(612) },
    MO_TENT_ATTACK: { phase: 'tent_strike', cite: at(666) },
    MO_TENT_CURL: { phase: 'tent_held', cite: at(715) },
    MO_TENT_GRAB: { phase: 'tent_held', cite: at(716) },
    MO_TENT_SHAKE: { phase: 'tent_held', cite: at(809) },
    MO_TENT_CUT: { phase: 'tent_cut', cite: at(888) },
    MO_TENT_RETREAT: { phase: 'tent_retreat', cite: at(920) },
    MO_TENT_DESPAWN: { phase: 'tent_retreat', cite: at(997) },
    MO_TENT_DEATH_START: excl(death, 1019),
    MO_TENT_DEATH_1: excl(death, 1039),
    MO_TENT_DEATH_2: excl(death, 1057),
    MO_TENT_DEATH_3: excl(death, 1022),
    MO_TENT_DEATH_5: excl(death, 1084),
    MO_TENT_DEATH_6: excl(death, 1148),
  },
  atSources: {
    ...Object.fromEntries([7, 18, 29, 40, 51, 62, 73, 84, 95, 106, 117, 128, 139, 150, 161, 172, 183, 194, 205].map((l) => [col(l), 'lash'])),
    [col(239)]: 'nucleus',
    [at(815)]: 'lash',
    [at(861)]: excl('the push that ends a shake that ran out its timer deals no damage (last argument 0)', 862),
  },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      stunned_sword_timer_clears: 'the sword stun lasts one beat (25 frames) and is left only when that timer runs out, so no timer is ever left behind',
      tent_cut_timer_clears: 'the cut tentacle is left only when its melt timer runs out, so no timer is ever left behind',
      ...Object.fromEntries(
        ['hammer_swing', 'hookshot', 'slash_master', 'slash_giant', 'spin_giant', 'spin_master', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump'].map((k) => [
          `hit_${k}__stunned_sword`,
          'the sword stun lasts one beat (25 frames) and is entered only by Link\'s own hit, so the nucleus recovers on that same beat before Link moves again',
        ]),
      ),
      lash_lands_again: 'only the lash grabs Link, and the tentacle then holds him in tent_held for exactly as many beats as the grab lasts (150 frames each), so it cannot lash him again while he is held',
      lash_lands_dd_again: 'as lash_lands_again',
      grab_count_clears: 'the grab ends only when its 8-beat timer (150 frames) runs out, and its drain costs every 2 beats, so the count is back at 0 every time the grab ends',
    },
  },
}
