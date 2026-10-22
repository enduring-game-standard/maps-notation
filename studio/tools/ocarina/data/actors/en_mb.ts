import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Mb/z_en_mb.c'
const at = (line: number): Cite => `${F}:${line}`

type Kind = 'guard' | 'patrol' | 'club'
const SPEAR = 'sSpearMoblinDamageTable'
const CLUB = 'sClubMoblinDamageTable'
const of = (k: Kind) => ({ pool: k, table: k === 'club' ? CLUB : SPEAR })
/** Body AC is set only in states at or above STUNNED, and for spear Moblins never while charging (ENMB_STATE_ATTACK). */
const shut = (k: Kind) => ({ ...of(k), hittable: 'none' as const })
/** In ENMB_STATE_STUNNED a STUN or STUN_ICE hit neither damages nor restuns. */
const stunnedOverrides = { ARROW_ICE: { damage: 0, cite: at(1462) } }

const phases: Phase[] = [
  { id: 'guard_look', label: 'Spear Moblin looks around', ...of('guard'), frames: { value: [30, 80], cite: at(458) }, cite: at(460) },
  { id: 'guard_walk', label: 'Spear Moblin turns toward Link', ...of('guard'), cite: at(487) },
  { id: 'guard_walk_cooldown', label: 'Spear Moblin wanders after a charge', ...of('guard'), frames: { value: 80, cite: at(720) }, cite: at(719) },
  { id: 'guard_charge', label: 'Spear Moblin charges', ...shut('guard'), cite: at(1506) },
  { id: 'end_quick_guard', label: 'Spear Moblin skids to a stop', ...of('guard'), cite: at(552) },
  { id: 'damaged_guard', label: 'Spear Moblin staggers', ...shut('guard'), cite: at(1445) },
  { id: 'stunned_guard', label: 'Spear Moblin is stunned', ...of('guard'), overrides: stunnedOverrides, frames: { value: 80, cite: at(610) }, cite: at(619) },

  { id: 'patrol_turn', label: 'Patrol Moblin turns to its next waypoint', ...of('patrol'), frames: { value: [40, 120], cite: at(474) }, cite: at(477) },
  { id: 'patrol_walk', label: 'Patrol Moblin walks its path', ...of('patrol'), cite: at(498) },
  { id: 'patrol_charge', label: 'Patrol Moblin charges down the corridor', ...shut('patrol'), cite: at(1506) },
  { id: 'patrol_end_charge', label: 'Patrol Moblin lands and eyes Link', ...of('patrol'), frames: { value: 50, cite: at(560) }, cite: at(564) },
  { id: 'patrol_end_rebound', label: 'Patrol Moblin throws Link off and turns', ...of('patrol'), frames: { value: 1, cite: at(1079) }, cite: at(1078) },
  { id: 'patrol_rush', label: 'Patrol Moblin rushes along its path', ...shut('patrol'), cite: at(1506) },
  { id: 'end_quick_patrol', label: 'Patrol Moblin skids to a stop', ...of('patrol'), cite: at(552) },
  { id: 'damaged_patrol', label: 'Patrol Moblin staggers', ...shut('patrol'), cite: at(1445) },
  { id: 'stunned_patrol', label: 'Patrol Moblin is stunned', ...of('patrol'), overrides: stunnedOverrides, frames: { value: 80, cite: at(610) }, cite: at(619) },

  { id: 'club_wait', label: 'Club Moblin stands with its club down', ...of('club'), cite: at(468) },
  { id: 'club_attack', label: 'Club Moblin raises its club', ...of('club'), cite: at(543) },
  { id: 'club_recover', label: 'Club Moblin lifts its club from the ground', ...of('club'), cite: at(573) },
  { id: 'club_kneel', label: 'Club Moblin kneels from a hit', ...shut('club'), cite: at(1445) },
  { id: 'stunned_ice_club', label: 'Club Moblin is frozen in ice', ...of('club'), overrides: stunnedOverrides, frames: { value: 40, cite: at(612) }, cite: at(619) },
  { id: 'stunned_club', label: 'Club Moblin is stunned', ...of('club'), overrides: stunnedOverrides, frames: { value: 80, cite: at(610) }, cite: at(619) },
]

const steps: Step[] = [
  { from: 'guard_look', to: 'guard_walk', label: 'Spear Moblin starts walking', afterTimer: true, cite: at(666) },
  { from: 'guard_walk', to: 'guard_charge', label: 'Spear Moblin faces Link and lowers its spear', cite: at(1193) },
  { from: 'guard_walk_cooldown', to: 'guard_walk', label: 'Spear Moblin keeps walking', afterTimer: true, weight: 3, cite: at(1212) },
  { from: 'guard_walk_cooldown', to: 'guard_look', label: 'Spear Moblin stops to look around', afterTimer: true, weight: 7, cite: at(1216) },
  { from: 'guard_charge', to: 'end_quick_guard', label: 'Spear Moblin runs Link through', range: 'near', attack: 'spear', cite: at(840) },
  { from: 'guard_charge', to: 'guard_charge', label: 'Spear Moblin charges at Link', range: 'far', move: 'near', cite: at(829) },
  { from: 'end_quick_guard', to: 'guard_walk_cooldown', label: 'Spear Moblin shoulders its spear', cite: at(719) },
  { from: 'damaged_guard', to: 'guard_look', label: 'Spear Moblin recovers', cite: at(1320) },
  { from: 'stunned_guard', to: 'damaged_guard', label: 'Spear Moblin shakes off the stun', afterTimer: true, cite: at(649) },

  { from: 'patrol_turn', to: 'patrol_charge', label: 'Patrol Moblin spots Link in its corridor', range: 'near', cite: at(691) },
  { from: 'patrol_turn', to: 'patrol_walk', label: 'Patrol Moblin sets off', afterTimer: true, cite: at(679) },
  { from: 'patrol_walk', to: 'patrol_charge', label: 'Patrol Moblin spots Link in its corridor', range: 'near', cite: at(1255) },
  { from: 'patrol_walk', to: 'patrol_turn', label: 'Patrol Moblin reaches its waypoint', range: 'far', cite: at(1240) },
  { from: 'patrol_charge', to: 'patrol_end_charge', label: 'Patrol Moblin skewers Link and carries him to the end of the floor', range: 'near', attack: 'spear_carry', cite: at(997) },
  { from: 'patrol_charge', to: 'patrol_end_charge', label: 'Patrol Moblin charges to the end of the floor', range: 'far', cite: at(997) },
  ...(['patrol_end_charge', 'patrol_end_rebound'] as const).flatMap((from): Step[] => [
    { from, to: 'patrol_charge', label: 'Patrol Moblin charges again', range: 'near', afterTimer: true, cite: at(769) },
    { from, to: 'patrol_turn', label: 'Patrol Moblin goes back to its path', range: 'far', afterTimer: true, cite: at(798) },
  ]),
  { from: 'patrol_rush', to: 'patrol_end_rebound', label: 'Patrol Moblin rushes into Link and carries him off', range: 'near', attack: 'spear_carry', cite: at(1078) },
  { from: 'patrol_rush', to: 'end_quick_patrol', label: 'Patrol Moblin rushes home', range: 'far', cite: at(1091) },
  { from: 'end_quick_patrol', to: 'patrol_turn', label: 'Patrol Moblin shoulders its spear', cite: at(722) },
  { from: 'damaged_patrol', to: 'patrol_rush', label: 'Patrol Moblin rushes off', cite: at(1322) },
  { from: 'stunned_patrol', to: 'damaged_patrol', label: 'Patrol Moblin shakes off the stun', afterTimer: true, cite: at(649) },

  { from: 'club_wait', to: 'club_attack', label: 'Club Moblin hefts its club at Link', cite: at(1294) },
  { from: 'club_attack', to: 'club_recover', label: 'Club Moblin smashes Link with its club', range: 'near', attack: 'club', cite: at(896) },
  { from: 'club_attack', to: 'club_recover', label: 'Club Moblin smashes the ground and a shockwave runs at Link', range: 'far', attack: 'shockwave', cite: at(894) },
  { from: 'club_recover', to: 'club_wait', label: 'Club Moblin is ready again', cite: at(731) },
  { from: 'club_kneel', to: 'club_wait', label: 'Club Moblin stands up', cite: at(1103) },
  { from: 'stunned_ice_club', to: 'stunned_club', label: 'The ice on Club Moblin melts', afterTimer: true, cite: at(1616) },
  { from: 'stunned_club', to: 'club_wait', label: 'Club Moblin shakes off the stun', afterTimer: true, cite: at(643) },
]

const STUNNED = ['stunned_guard', 'stunned_patrol', 'stunned_club', 'stunned_ice_club']
const hittable = phases.filter((p) => p.hittable !== 'none')
const kindOf = (id: string): Kind => (id.includes('club') ? 'club' : id.includes('guard') ? 'guard' : 'patrol')
const stunTo = (ice: boolean) =>
  Object.fromEntries(
    hittable
      .filter((p) => !STUNNED.includes(p.id) && (!ice || kindOf(p.id) === 'club'))
      .map((p) => [p.id, ice ? 'stunned_ice_club' : `stunned_${kindOf(p.id)}`]),
  )
const DAMAGED: Record<Kind, string> = { guard: 'damaged_guard', patrol: 'damaged_patrol', club: 'club_kneel' }

const reactions: Record<string, Reaction> = {
  ENMB_DMG_REACT_IGNORE: { damage: false, note: 'ignored outright', cite: at(1447) },
  ENMB_DMG_REACT_FREEZE: {
    damage: false,
    note: 'ignored by the hit check; it only skips the action function for the one frame the reaction is set (colChkInfo is reset every frame), so nothing changes in beats',
    cite: at(1492),
  },
  ENMB_DMG_REACT_STUN: { damage: true, to: stunTo(false), note: 'damage applies and it is stunned for the 80-frame color filter, unless already stunned', cite: at(1464) },
  ENMB_DMG_REACT_STUN_ICE: {
    damage: true, to: stunTo(true),
    note: 'as STUN; the ice effect holds the color filter for 40 more frames first. The only STUN_ICE Link emits is the ice arrow (4), which empties a spear Moblin (2 or 1 health), so only the club one is routed to a stun; a spear one is defeated where it stands',
    cite: at(1612),
  },
  ENMB_DMG_REACT_DEFAULT: {
    damage: true, to: Object.fromEntries(hittable.map((p) => [p.id, DAMAGED[kindOf(p.id)]])),
    note: 'damage applies; a spear Moblin staggers back, a club Moblin kneels',
    cite: at(1473),
  },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enMb: ActorSpec = {
  overlay: 'ovl_En_Mb',
  name: 'Moblin',
  role: 'enemy',
  summary:
    'A large pig-faced warrior in three kinds. The spear guard wanders near home and charges Link; the patrol walks a path and charges down its corridor, carrying Link off on its spear; the club Moblin stands still and smashes the ground, sending a shockwave along it.',
  cite: at(31),
  pools: [
    { id: 'guard', label: 'Spear Moblin', hp: { value: 2, cite: at(300) }, then: 'defeated' },
    { id: 'patrol', label: 'Patrol Moblin', hp: { value: 1, cite: at(343) }, then: 'defeated' },
    { id: 'club', label: 'Club Moblin', hp: { value: 6, cite: at(310) }, then: 'defeated' },
  ],
  damage: { kind: 'decomp', table: SPEAR, reactions },
  phases,
  start: 'guard_look',
  variants: [
    { id: 'guard', label: 'Spear Moblin guarding its home', start: 'guard_look', cite: at(304) },
    { id: 'patrol', label: 'Spear Moblin patrolling a path', start: 'patrol_turn', cite: at(348) },
    { id: 'club', label: 'Club Moblin', start: 'club_wait', cite: at(333) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'spear', label: 'Spear Moblin charge', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(181) },
    { id: 'spear_carry', label: 'Patrol Moblin charge', damage: 8, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(181) },
    { id: 'club', label: 'Club Moblin club', damage: 8, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(320) },
    {
      id: 'shockwave', label: 'Club Moblin shockwave', damage: 8, effect: { kind: 'knockback' }, blockable: false, dodgeable: true,
      source: 'src/overlays/actors/ovl_En_Part/z_en_part.c:210', via: { overlay: 'ovl_En_Part', spawn: at(894) },
    },
  ],
  actionFuncs: {
    EnMb_SpearGuardLookAround: 'guard_look',
    EnMb_SpearGuardWalk: 'guard_walk*',
    EnMb_SpearGuardPrepareAndCharge: 'guard_charge',
    EnMb_SpearEndChargeQuick: 'end_quick_*',
    EnMb_SpearDamaged: 'damaged_*',
    EnMb_Stunned: 'stunned_*',
    EnMb_SpearPatrolTurnTowardsWaypoint: 'patrol_turn',
    EnMb_SpearPatrolWalkTowardsWaypoint: 'patrol_walk',
    EnMb_SpearPatrolPrepareAndCharge: 'patrol_charge',
    EnMb_SpearPatrolEndCharge: 'patrol_end_*',
    EnMb_SpearPatrolImmediateCharge: 'patrol_rush',
    EnMb_ClubWaitPlayerNear: 'club_wait',
    EnMb_ClubAttack: 'club_attack',
    EnMb_ClubWaitAfterAttack: 'club_recover',
    EnMb_ClubDamaged: 'club_kneel',
    EnMb_ClubDamagedWhileKneeling: post('unreachable: its only setup call runs in EnMb_Stunned when state is CLUB_KNEELING, but Stunned always has state STUNNED', 640),
    EnMb_ClubDead: post('death fall after the finishing blow; the encounter has already ended', 1131),
    EnMb_SpearDead: post('death fall after the finishing blow; the encounter has already ended', 1347),
    actionFunc: post('not a function: the parameter name of EnMb_SetupAction', 275),
  },
  atSources: { [at(181)]: 'spear', [at(320)]: 'club', [at(865)]: 'club', [at(945)]: 'spear_carry', [at(1027)]: 'spear_carry' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs: deadVerbs() },
}

function deadVerbs(): Record<string, string> {
  const out: Record<string, string> = {
    link_hurt_overkill: 'every cost to Link is 8 (4 with Double Defense) and his health starts and refills in multiples of that, so no hit ever exceeds what is left',
  }
  out.hit_arrow_light__stunned_ice_club = 'only an ice arrow (4 magic) freezes the club Moblin, and the arrows kit arrives with 8 magic, too little left for a light arrow (8)'
  out.hit_arrow_light__stunned_club = 'as hit_arrow_light__stunned_ice_club: the stun that leads here was the ice arrow'
  out.patrol_empty_in_patrol_end_rebound =
    'the only hit that empties the patrol pool without moving it is the ice arrow, an adult kit, and adult Link never sees a rebound: it follows a rush, a rush follows a stun, and only the child boomerang stuns a spear Moblin'
  out.patrol_empty_in_end_quick_patrol = 'as patrol_empty_in_patrol_end_rebound, for the skid after a missed rush'
  for (const k of ['deku_stick', 'slash_kokiri', 'jump_kokiri', 'jump_master'])
    out[`hit_${k}__end_quick_patrol`] =
      'the patrol skids to a stop only after a rush that missed Link, so Link is far, and the skid lasts one beat: closing in spends it'
  for (const k of ['hammer_swing', 'slash_master', 'slash_giant', 'spin_kokiri', 'spin_giant', 'spin_master', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master_self', 'hammer_jump'])
    out[`hit_${k}__patrol_turn`] =
      'patrol_turn charges the beat Link is near, so a melee hit lands there only when it was entered from a skid with Link near; a skid follows a rush, a rush follows a stun, and only the child\'s boomerang (child_blade) stuns a spear Moblin, a kit without this attack'
  return out
}
