import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Goma/z_boss_goma.c'
const at = (line: number): Cite => `${F}:${line}`
const CC = 'src/code/z_collision_check.c'

/** Only the eye element is read for hits (elements[0], line 1847). */
const STUN = { DEKU_NUT: { damage: 0, to: 'stunned_nut', cite: at(1877) }, SLINGSHOT: { damage: 0, to: 'stunned_seed', cite: at(1879) } }
/** Shots that reach the ceiling. Fired ones (seed, arrow, hookshot, boomerang) set player->unk_A73, which shuts the eye for 12 frames in the default eye state (line 1758). */
const CEILING_SHOTS: DmgType[] = ['DEKU_NUT', 'SLINGSHOT', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT']
const crash = (types: DmgType[]): Phase['overrides'] => Object.fromEntries(types.map((d) => [d, { damage: 0, to: 'crash', cite: at(1852) }]))
/** `CollisionCheck_GetSwordDamage`, read only while stunned (line 1855). */
const SWORD: Partial<Record<DmgType, { damage: number; cite: Cite }>> = {
  SLASH_KOKIRI: { damage: 1, cite: `${CC}:3718` },
  SPIN_KOKIRI: { damage: 1, cite: `${CC}:3718` },
  JUMP_KOKIRI: { damage: 2, cite: `${CC}:3720` },
  SPIN_MASTER: { damage: 2, cite: `${CC}:3720` },
  SLASH_MASTER: { damage: 2, cite: `${CC}:3720` },
  HAMMER_SWING: { damage: 2, cite: `${CC}:3720` },
  DEKU_STICK: { damage: 2, cite: `${CC}:3720` },
  HAMMER_JUMP: { damage: 4, cite: `${CC}:3722` },
  JUMP_MASTER: { damage: 4, cite: `${CC}:3722` },
  SPIN_GIANT: { damage: 4, cite: `${CC}:3722` },
  SLASH_GIANT: { damage: 4, cite: `${CC}:3722` },
  JUMP_GIANT: { damage: 8, cite: `${CC}:3724` },
}
const SWORD_TYPES = Object.keys(SWORD) as DmgType[]

const stunned = (id: string, label: string, frames: number, line: number): Phase => ({
  id, label, hittable: SWORD_TYPES, frames: { value: frames, cite: at(line) }, cite: at(1432),
})

const phases: Phase[] = [
  { id: 'floor_main_patient', label: 'Gohma stalks Link on the floor, eye open', hittable: ['DEKU_NUT'], overrides: { DEKU_NUT: STUN.DEKU_NUT }, frames: { value: 200, cite: at(998) }, cite: at(1614) },
  { id: 'posture', label: 'Gohma rears up, eye red', hittable: ['DEKU_NUT', 'SLINGSHOT'], overrides: STUN, cite: at(1289) },
  { id: 'attack', label: 'Gohma swipes', hittable: ['DEKU_NUT', 'SLINGSHOT'], overrides: STUN, cite: at(1328) },
  { id: 'rest', label: 'Gohma rests after her swipe, eye red', hittable: ['DEKU_NUT', 'SLINGSHOT'], overrides: STUN, frames: { value: [30, 59], cite: at(1354) }, cite: at(1359) },
  stunned('stunned_nut', 'Gohma reels from a Deku Nut', 40, 1877),
  stunned('stunned_seed', 'Gohma reels from a seed in the eye', 90, 1879),
  stunned('stunned_struck', 'Gohma lies stunned after her fall', 150, 1410),
  { id: 'floor_main_retreat', label: 'Gohma backs away from Link, out of patience', hittable: 'none', cite: at(1660) },
  { id: 'wall_climb', label: 'Gohma climbs the wall', hittable: 'none', cite: at(1686) },
  { id: 'ceiling_move', label: 'Gohma crawls to the middle of the ceiling', hittable: ['DEKU_NUT'], overrides: crash(['DEKU_NUT']), frames: { value: [30, 89], cite: at(536) }, cite: at(1708) },
  { id: 'ceiling_idle_fresh', label: 'Gohma hangs from the ceiling', hittable: ['DEKU_NUT'], overrides: crash(['DEKU_NUT']), frames: { value: [20, 49], cite: at(475) }, cite: at(1579) },
  { id: 'ceiling_prepare', label: 'Gohma readies her eggs, eye red', hittable: CEILING_SHOTS, overrides: crash(CEILING_SHOTS), frames: { value: 70, cite: at(514) }, cite: at(1550) },
  { id: 'ceiling_laying', label: 'Gohma lays three eggs', hittable: 'none', frames: { value: 64, cite: at(1539) }, cite: at(1495) },
  { id: 'ceiling_idle_larvae', label: 'Gohma waits on the ceiling, eye shut, while her larvae live', hittable: 'none', frames: { value: [20, 49], cite: at(475) }, cite: at(1768) },
  { id: 'fall', label: 'Gohma drops to the floor', hittable: 'none', cite: at(1460) },
  { id: 'crash', label: 'Gohma crashes down from the ceiling', hittable: 'none', cite: at(1477) },
]

const steps: Step[] = [
  { from: 'floor_main_patient', to: 'posture', label: 'Gohma closes on Link and rears up', range: 'near', cite: at(1646) },
  { from: 'floor_main_patient', to: 'floor_main_retreat', label: 'Gohma runs out of patience', afterTimer: true, cite: at(1642) },
  { from: 'posture', to: 'attack', label: 'Gohma strikes at Link', range: 'near', cite: at(1300) },
  { from: 'posture', to: 'floor_main_patient', label: 'Link is out of reach; Gohma walks on', range: 'far', cite: at(1302) },
  { from: 'attack', to: 'rest', label: 'Gohma swipes Link', range: 'near', attack: 'claw', cite: at(1337) },
  { from: 'attack', to: 'rest', label: 'Gohma swipes at empty air', range: 'far', cite: at(1353) },
  { from: 'rest', to: 'floor_main_patient', label: 'Gohma recovers', afterTimer: true, cite: at(1373) },
  { from: 'stunned_nut', to: 'floor_main_retreat', label: 'Gohma comes to', afterTimer: true, cite: at(1445) },
  { from: 'stunned_seed', to: 'floor_main_retreat', label: 'Gohma comes to', afterTimer: true, cite: at(1445) },
  { from: 'stunned_struck', to: 'floor_main_retreat', label: 'Gohma comes to', afterTimer: true, cite: at(1445) },
  { from: 'floor_main_retreat', to: 'wall_climb', label: 'Gohma backs into a wall and climbs', cite: at(1675) },
  { from: 'wall_climb', to: 'ceiling_move', label: 'Gohma reaches the ceiling', move: 'far', cite: at(1699) },
  { from: 'ceiling_move', to: 'ceiling_idle_fresh', label: 'Gohma settles at the middle of the ceiling', afterTimer: true, cite: at(1739) },
  { from: 'ceiling_idle_fresh', to: 'ceiling_prepare', label: 'Gohma gets ready to lay', afterTimer: true, cite: at(1588) },
  { from: 'ceiling_prepare', to: 'ceiling_laying', label: 'Gohma lays', afterTimer: true, cite: at(1554) },
  { from: 'ceiling_laying', to: 'ceiling_idle_larvae', label: 'The eggs are down', afterTimer: true, cite: at(1540) },
  { from: 'ceiling_idle_larvae', to: 'fall', label: 'Her larvae are dead (their own encounter); Gohma jumps down', afterTimer: true, cite: at(1592) },
  { from: 'fall', to: 'floor_main_patient', label: 'Gohma lands, patience renewed', cite: at(1424) },
  { from: 'crash', to: 'stunned_struck', label: 'Gohma hits the floor', cite: at(1407) },
]

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const ELEMENT_LINES = [100, 111, 122, 133, 144, 155, 166, 177, 188, 199, 210, 221, 232]

export const bossGoma: ActorSpec = {
  overlay: 'ovl_Boss_Goma',
  name: 'Queen Gohma',
  role: 'boss',
  summary:
    'A one-eyed arachnid with 10 health that only a sword-type hit to her eye can drain, and only while she is stunned. On the floor she stalks Link and swipes; a Deku Nut, or a seed while her eye is red, stuns her. Out of patience she climbs to the ceiling to lay eggs, where a shot to the open eye knocks her down into a long stun.',
  cite: at(84),
  pools: [{ id: 'body', label: 'Queen Gohma', hp: { value: 10, cite: at(389) }, then: 'defeated' }],
  damage: { kind: 'custom', entries: SWORD },
  phases,
  start: 'floor_main_patient',
  range: 'far',
  steps,
  attacks: [{ id: 'claw', label: 'Gohma claw swipe', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(100) }],
  actionFuncs: {
    BossGoma_FloorMain: 'floor_main_*',
    BossGoma_FloorIdle: 'floor_main_patient',
    BossGoma_FloorAttackPosture: 'posture',
    BossGoma_FloorPrepareAttack: 'attack',
    BossGoma_FloorAttack: 'attack',
    BossGoma_FloorStunned: 'stunned_*',
    BossGoma_FloorDamaged: 'stunned_*',
    BossGoma_WallClimb: 'wall_climb',
    BossGoma_CeilingMoveToCenter: 'ceiling_move',
    BossGoma_CeilingIdle: 'ceiling_idle_*',
    BossGoma_CeilingPrepareSpawnGohmas: 'ceiling_prepare',
    BossGoma_CeilingSpawnGohmas: 'ceiling_laying',
    BossGoma_FallJump: 'fall',
    BossGoma_FloorLand: 'fall',
    BossGoma_FallStruckDown: 'crash',
    BossGoma_FloorLandStruckDown: 'crash',
    BossGoma_Encounter: post('intro cutscene with gameplay logic disabled; it ends in FloorMain with patience 200, the start phase', 455),
    BossGoma_Defeated: post('death cutscene after the finishing blow; the encounter has already ended', 1863),
  },
  atSources: Object.fromEntries(ELEMENT_LINES.map((l) => [at(l), 'claw'])),
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      stunned_nut_timer_clears: 'a stun is left only when its timer runs out or by defeat, which ends the encounter; no hit moves Gohma out of it, so its timer never outlives it',
      stunned_seed_timer_clears: 'as stunned_nut_timer_clears',
      stunned_struck_timer_clears: 'as stunned_nut_timer_clears',
      ceiling_laying_timer_clears: 'laying cannot be interrupted (line 1846 skips hits during it) and has one way out, its timer',
      ceiling_idle_larvae_timer_clears: 'the eye is shut while larvae live (line 1768), so no hit moves her; the timer is the only way out',
      link_hurt_overkill: 'the claw is her only attack, 8 units, and every kit starts at 32, so Link reaches exactly 0 and falls before another hit',
    },
  },
}
