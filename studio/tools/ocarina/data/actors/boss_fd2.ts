import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2.c'
const at = (line: number): Cite => `${F}:${line}`
const COL = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2_colchk.inc.c'
const col = (line: number): Cite => `${COL}:${line}`
const FD = 'src/overlays/actors/ovl_Boss_Fd/z_boss_fd.c'
const CC = 'src/code/z_collision_check.c'

/*
 * The head at its last health (1, after the hammer's clamp at line 859). At that health it makes three fakeout passes
 * per pop (line 242), so the hole counter (line 270) reaches 4 on the first pop and every burrow hands off to the body
 * (line 399): one pop per head turn.
 *
 * Reported gaps (the types or the decomp checkout cannot express them):
 * - The animation legs: the emerge rise, the strikes, the burrow before its 25-frame timer (line 392), the knockout
 *   before the 60-frame stun (lines 576-579) and the two hit animations before the 25-frame sink (lines 606-620) run
 *   to `Animation_GetLastFrame`, and this checkout has no extracted object data, so their lengths are unknown.
 * - Two near distances: the emerge knockback needs 120 (line 318), the claw 200 (line 369). The model has one near band.
 * - Each emerge pass also waits for Link's y above 70 (line 261). The model has no height.
 * - The breath is not a projectile actor: line 487 adds effects to Boss_Fd's effect array, and Boss_Fd's effect update
 *   applies the hurt (z_boss_fd.c:1491-1497). The types accept a source in another overlay only with `via`, so the
 *   attack carries `via` with the spawn line of the effect.
 */

/** Only the hammer cracks the hidden face (line 856). */
const HAMMER: DmgType[] = ['HAMMER_SWING', 'HAMMER_JUMP']

/** `CollisionCheck_GetSwordDamage` (z_collision_check.c:3715): a sword-type hit may always kill (line 890 sets canKill). */
const SWORD: Partial<Record<DmgType, number>> = {
  SLASH_KOKIRI: 1, SPIN_KOKIRI: 1,
  JUMP_KOKIRI: 2, SPIN_MASTER: 2, SLASH_MASTER: 2, HAMMER_SWING: 2, DEKU_STICK: 2,
  HAMMER_JUMP: 4, JUMP_MASTER: 4, SPIN_GIANT: 4, SLASH_GIANT: 4,
  JUMP_GIANT: 8,
}
const SWORD_LINE: Record<number, number> = { 1: 3718, 2: 3720, 4: 3722, 8: 3724 }
/** Every other type the face accepts that Link emits. At health 2 or less these take nothing (line 895), yet still knock the head back down (line 912). */
const OTHER: DmgType[] = ['SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'MAGIC_ICE', 'MAGIC_LIGHT']

const hidden = (id: string, label: string, cite: Cite, frames?: Phase['frames']): Phase => ({
  id, label, cite, hittable: HAMMER,
  overrides: Object.fromEntries(HAMMER.map((d) => [d, { damage: 0, to: 'daze', cite: at(859) }])),
  ...(frames ? { frames } : {}),
})

/** First pass 20 frames after the hand-back (line 823), then four hole times of 5 (line 282) with three 10-frame re-entries (line 297). */
const UNDERGROUND = 20 + 5 + 3 * (10 + 5)

const phases: Phase[] = [
  { id: 'wake', label: 'The head waits under the holes, faking out three times', hittable: 'none', frames: { value: UNDERGROUND, cite: at(823) }, cite: at(822) },
  hidden('up', 'The head rears up out of a hole', at(301)),
  hidden('idle', 'The head turns to Link, face armored', at(337), { value: 20, cite: at(348) }),
  hidden('claw', 'The head swipes its claw', at(521)),
  hidden('breath', 'The head breathes fire', at(412)),
  hidden('burrow', 'The head sinks back into the hole', at(381), { value: 25, cite: at(394) }),
  { id: 'daze', label: 'The head is knocked out, still shaking off the blow', hittable: 'none', frames: { value: 30, cite: at(863) }, cite: at(539) },
  { id: 'vuln', label: 'The head lies stunned, face cracked open', frames: { value: 60, cite: at(579) }, cite: at(539) },
  { id: 'burrow_open', label: 'The stunned head sinks back, face still open', frames: { value: 25, cite: at(394) }, cite: at(587) },
  { id: 'damaged', label: 'The head reels from the blow and sinks away', hittable: 'none', frames: { value: 25, cite: at(620) }, cite: at(596) },
  { id: 'away', label: "The head waits below while Volvagia's body flies", hittable: 'none', cite: at(817) },
]

/** The AT collider is set every frame unless Vulnerable or Damaged turn it off (lines 981, 1006-1008, 547, 604). */
const touch = (from: string): Step => ({ from, to: from, label: 'The head is up beside Link and he touches it', range: 'near', attack: 'claw', cite: at(1007) })

const steps: Step[] = [
  { from: 'wake', to: 'up', label: 'The head bursts up beside Link, knocking him back', range: 'near', afterTimer: true, attack: 'emerge_knock', cite: at(319) },
  { from: 'wake', to: 'up', label: 'The head bursts up', range: 'far', afterTimer: true, cite: at(305) },
  { from: 'up', to: 'idle', label: 'The head rises beside Link, touching him', range: 'near', attack: 'claw', cite: at(323) },
  { from: 'up', to: 'idle', label: 'The head is up', range: 'far', cite: at(323) },
  touch('idle'),
  { from: 'idle', to: 'claw', label: 'The head rears to swipe its claw', range: 'near', afterTimer: true, cite: at(370) },
  { from: 'idle', to: 'breath', label: 'The head breathes fire', range: 'far', afterTimer: true, attack: 'breath', cite: at(372) },
  { from: 'claw', to: 'burrow', label: 'The claw swipe lands', range: 'near', attack: 'claw', cite: at(532) },
  { from: 'claw', to: 'burrow', label: 'The head finishes its swipe and burrows', range: 'far', cite: at(532) },
  { from: 'breath', to: 'burrow', label: 'The head finishes its breath beside Link, touching him', range: 'near', attack: 'claw', cite: at(432) },
  { from: 'breath', to: 'burrow', label: 'The head finishes its breath and burrows', range: 'far', cite: at(432) },
  touch('burrow'),
  { from: 'burrow', to: 'away', label: 'The hole counter is past 3: the body takes to the air', afterTimer: true, cite: at(402) },
  { from: 'daze', to: 'vuln', label: 'The head lies still, open to hits', afterTimer: true, cite: at(1001) },
  { from: 'vuln', to: 'burrow_open', label: 'The head comes to and burrows', afterTimer: true, cite: at(587) },
  touch('burrow_open'),
  { from: 'burrow_open', to: 'away', label: 'The hole counter is past 3: the body takes to the air', afterTimer: true, cite: at(402) },
  { from: 'damaged', to: 'away', label: 'The head is gone: the body takes to the air', afterTimer: true, cite: at(626) },
  { from: 'away', to: 'wake', label: 'The body dives into a hole and the head rises again', cite: at(822) },
]

const attacks: Attack[] = [
  { id: 'emerge_knock', label: 'The emerging head', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(319) },
  { id: 'claw', label: "The head's claws and jaws (live whenever it is up and not stunned)", damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: col(18) },
  {
    id: 'breath', label: "The head's fire breath", damage: 48, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: `${FD}:1497`,
    via: { overlay: 'ovl_Boss_Fd', spawn: at(487) },
  },
]

const entries: Partial<Record<DmgType, { damage: number; to?: string; cite: Cite }>> = {
  ...Object.fromEntries(Object.entries(SWORD).map(([d, n]) => [d, { damage: n!, cite: `${CC}:${SWORD_LINE[n!]}` as Cite }])),
  ...Object.fromEntries(OTHER.map((d) => [d, { damage: 0, to: 'damaged', cite: at(895) }])),
  HOOKSHOT: { damage: 0, cite: at(893) },
}

const out = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const bossFd2: ActorSpec = {
  overlay: 'ovl_Boss_Fd2',
  name: 'Volvagia (head in the holes)',
  role: 'boss',
  summary:
    "Volvagia's head, popping out of the lava holes. It has no health of its own: every hit drains the flying body's (Boss_Fd), and the full fight is Boss_Fd's encounter. " +
    "This encounter is the last stand at health 1, where a hammer from 4 or less leaves her (line 859). The head fakes out three times, pops once, claws or breathes fire, " +
    'hurts by touch whenever it is up and not stunned, and sinks while the body flies. A hammer blow cracks the face and stuns it; one sword hit on the open face kills, ' +
    'while anything else only sends it back under.',
  cite: at(192),
  pools: [{ id: 'volvagia', label: 'Volvagia (last health)', hp: { value: 1, cite: at(859) }, then: 'defeated' }],
  damage: { kind: 'custom', entries },
  phases,
  start: 'wake',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    BossFd2_Emerge: 'wake',
    BossFd2_Idle: 'idle',
    BossFd2_ClawSwipe: 'claw',
    BossFd2_BreatheFire: 'breath',
    BossFd2_Burrow: 'burrow',
    BossFd2_Vulnerable: 'vuln',
    BossFd2_Damaged: 'damaged',
    BossFd2_Wait: 'away',
    BossFd2_Death: out('death sequence after the finishing blow (set up at line 905); the encounter has already ended', 635),
  },
  atSources: {
    [at(319)]: 'emerge_knock',
    ...Object.fromEntries([18, 29, 40, 51, 62, 73, 84, 95].map((l) => [col(l), 'claw'])),
  },
  loadouts: standardLoadouts(['adult'], 4),
  expected: {
    deadVerbs: {
      wake_timer_clears: 'wake cannot be hit and is left only by its steps that wait for the timer, so the timer is always spent',
      daze_timer_clears: 'daze cannot be hit and is left only by its step that waits for the timer, so the timer is always spent',
      damaged_timer_clears: 'damaged cannot be hit and is left only by its step that waits for the timer, so the timer is always spent',
      hit_hammer_swing__breath: "breath is entered only by the idle step that needs Link far, and every step out of it fires the next beat at either range, so Link's melee hammer never finds it",
      hit_hammer_jump__breath: 'as hit_hammer_swing__breath',
      breath_lands_again: 'the burn lasts 5 beats (mean of 0-199 frames), and the next breath is at least 8 beats later: burrow, away, a 4-beat wake, up and idle',
      breath_lands_dd_again: 'as breath_lands_again',
    },
  },
}
