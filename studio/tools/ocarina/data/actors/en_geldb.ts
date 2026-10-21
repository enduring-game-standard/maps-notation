import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_GeldB/z_en_geldb.c'
const at = (line: number): Cite => `${F}:${line}`

/** The block tris accepts 0xFFC1FFFF: everything but the three magic types, the shield bash, and the light ray. */
const BLOCKED: DmgType[] = DMG_TYPES.filter((d) => !['MAGIC_FIRE', 'MAGIC_ICE', 'MAGIC_LIGHT', 'SHIELD', 'MIR_RAY'].includes(d))
/** Swings that set the player's meleeWeaponState, which func_800354B4 reads. */
const SWINGS: DmgType[] = ['DEKU_STICK', 'HAMMER_SWING', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER']
/** Jump attacks start with PLAYER_MWA_JUMPSLASH_START, which she answers with a spin dodge instead of a block. */
const JUMPS: DmgType[] = ['JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP']
/** En_Arrow projectiles (arrows, seeds, and the thrown Deku Nut), which Actor_GetProjectileActor finds. */
const SHOTS: DmgType[] = ['DEKU_NUT', 'SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT']

/**
 * EnGeldB_ReactToPlayer and EnGeldB_DodgeRanged run every frame in these phases: a frontal swing makes her block
 * (or roll back), a jump slash makes her spin aside, an arrow in front makes her block, and a Hookshot makes her jump.
 */
const reacts: Phase['overrides'] = {
  ...Object.fromEntries(SWINGS.map((d) => [d, { damage: 0, to: 'block', cite: at(309) }])),
  ...Object.fromEntries(JUMPS.map((d) => [d, { damage: 0, to: 'spin_dodge', cite: at(306) }])),
  ...Object.fromEntries(SHOTS.map((d) => [d, { damage: 0, to: 'block', cite: at(1662) }])),
  HOOKSHOT: { damage: 0, to: 'jump', cite: at(1660) },
}

const phases: Phase[] = [
  { id: 'ready', label: 'Gerudo stands on guard', frames: { value: [5, 15], cite: at(440) }, overrides: reacts, cite: at(446) },
  { id: 'advance', label: 'Gerudo advances', overrides: reacts, cite: at(509) },
  { id: 'circle', label: 'Gerudo circles Link', frames: { value: [30, 60], cite: at(668) }, overrides: reacts, cite: at(674) },
  { id: 'sidestep', label: 'Gerudo sidesteps', frames: { value: [5, 15], cite: at(1231) }, overrides: reacts, cite: at(1236) },
  { id: 'block', label: 'Gerudo blocks with her swords', frames: { value: [5, 15], cite: at(1154) }, guards: BLOCKED, cite: at(1450) },
  { id: 'roll_forward', label: 'Gerudo flips toward Link', cite: at(599) },
  { id: 'roll_back', label: 'Gerudo flips away', cite: at(1016) },
  { id: 'jump', label: 'Gerudo leaps over', hittable: 'none', cite: at(1445) },
  { id: 'slash', label: 'Gerudo slashes', cite: at(876) },
  { id: 'spin_attack', label: 'Gerudo spins in with both swords', cite: at(934) },
  { id: 'spin_dodge', label: 'Gerudo spins aside', frames: { value: 6, cite: at(782) }, cite: at(790) },
  { id: 'stunned', label: 'Gerudo is stunned', frames: { value: 80, cite: at(1403) }, overrides: { ARROW_ICE: { damage: 0, cite: at(1402) } }, cite: at(1047) },
  { id: 'damaged', label: 'Gerudo reels from a hit', hittable: 'none', cite: at(1445) },
]

const steps: Step[] = [
  { from: 'ready', to: 'roll_forward', label: 'Gerudo flips in from mid range', range: 'far', afterTimer: true, weight: 15, cite: at(482) },
  { from: 'ready', to: 'spin_attack', label: 'Gerudo spins in from mid range', range: 'far', afterTimer: true, weight: 15, cite: at(484) },
  { from: 'ready', to: 'advance', label: 'Gerudo advances', range: 'far', afterTimer: true, weight: 49, cite: at(487) },
  { from: 'ready', to: 'circle', label: 'Gerudo starts circling', range: 'far', afterTimer: true, weight: 21, cite: at(489) },
  { from: 'ready', to: 'advance', label: 'Gerudo advances', range: 'near', afterTimer: true, weight: 70, cite: at(487) },
  { from: 'ready', to: 'circle', label: 'Gerudo starts circling', range: 'near', afterTimer: true, weight: 30, cite: at(489) },
  { from: 'advance', to: 'slash', label: 'Gerudo reaches Link and slashes', range: 'near', weight: 97, cite: at(551) },
  { from: 'advance', to: 'circle', label: 'Gerudo circles instead', range: 'near', weight: 3, cite: at(555) },
  { from: 'advance', to: 'advance', label: 'Gerudo closes in', range: 'far', move: 'near', weight: 2, cite: at(522) },
  { from: 'advance', to: 'roll_forward', label: 'Gerudo flips in', range: 'far', weight: 1, cite: at(563) },
  { from: 'advance', to: 'spin_attack', label: 'Gerudo spins in', range: 'far', weight: 1, cite: at(565) },
  { from: 'circle', to: 'ready', label: 'Gerudo stops circling', afterTimer: true, cite: at(758) },
  { from: 'sidestep', to: 'slash', label: 'Gerudo turns in to slash', range: 'near', afterTimer: true, cite: at(1317) },
  { from: 'sidestep', to: 'roll_forward', label: 'Gerudo flips in', range: 'far', afterTimer: true, weight: 1, cite: at(1322) },
  { from: 'sidestep', to: 'spin_attack', label: 'Gerudo spins in', range: 'far', afterTimer: true, weight: 1, cite: at(1324) },
  { from: 'sidestep', to: 'advance', label: 'Gerudo advances', range: 'far', afterTimer: true, weight: 2, cite: at(1327) },
  { from: 'block', to: 'slash', label: 'Gerudo lowers her guard and slashes', range: 'near', afterTimer: true, weight: 1, cite: at(1186) },
  { from: 'block', to: 'circle', label: 'Gerudo lowers her guard and circles', range: 'near', afterTimer: true, weight: 1, cite: at(1188) },
  { from: 'block', to: 'circle', label: 'Gerudo lowers her guard and circles', range: 'far', afterTimer: true, cite: at(1192) },
  { from: 'roll_forward', to: 'slash', label: 'Gerudo lands her flip and slashes', move: 'near', weight: 1, cite: at(614) },
  { from: 'roll_forward', to: 'advance', label: 'Gerudo lands her flip', move: 'near', weight: 1, cite: at(616) },
  { from: 'roll_back', to: 'spin_attack', label: 'Gerudo lands and spins back in', move: 'far', weight: 2, cite: at(1020) },
  { from: 'roll_back', to: 'sidestep', label: 'Gerudo lands and sidesteps', move: 'far', weight: 4, cite: at(1022) },
  { from: 'roll_back', to: 'ready', label: 'Gerudo lands on guard', move: 'far', weight: 4, cite: at(1024) },
  { from: 'jump', to: 'slash', label: 'Gerudo lands her leap and slashes', move: 'near', cite: at(1139) },
  { from: 'slash', to: 'ready', label: 'Gerudo slashes and resets', range: 'near', attack: 'slash', weight: 30, cite: at(903) },
  { from: 'slash', to: 'sidestep', label: 'Gerudo slashes and sidesteps', range: 'near', attack: 'slash', weight: 21, cite: at(908) },
  { from: 'slash', to: 'slash', label: 'Gerudo slashes again', range: 'near', attack: 'slash', weight: 49, cite: at(914) },
  { from: 'slash', to: 'ready', label: 'Gerudo slashes at air', range: 'far', cite: at(902) },
  { from: 'spin_attack', to: 'ready', label: 'Gerudo spins into Link and resets', move: 'near', attack: 'spin', weight: 30, cite: at(979) },
  { from: 'spin_attack', to: 'sidestep', label: 'Gerudo spins into Link and sidesteps', move: 'near', attack: 'spin', weight: 21, cite: at(984) },
  { from: 'spin_attack', to: 'circle', label: 'Gerudo spins into Link and circles', move: 'near', attack: 'spin', weight: 49, cite: at(998) },
  { from: 'spin_dodge', to: 'slash', label: 'Gerudo comes out of her spin slashing', range: 'near', afterTimer: true, cite: at(852) },
  { from: 'spin_dodge', to: 'roll_back', label: 'Gerudo comes out of her spin and flips away', range: 'far', afterTimer: true, cite: at(854) },
  { from: 'stunned', to: 'slash', label: 'Gerudo shakes off the stun and slashes', range: 'near', afterTimer: true, weight: 7, cite: at(360) },
  { from: 'stunned', to: 'circle', label: 'Gerudo shakes off the stun and circles', range: 'near', afterTimer: true, weight: 1, cite: at(363) },
  { from: 'stunned', to: 'circle', label: 'Gerudo shakes off the stun and circles', range: 'far', afterTimer: true, cite: at(363) },
  { from: 'damaged', to: 'slash', label: 'Gerudo recovers and slashes', range: 'near', weight: 7, cite: at(1103) },
  { from: 'damaged', to: 'roll_back', label: 'Gerudo recovers and flips away', range: 'near', weight: 1, cite: at(1105) },
  { from: 'damaged', to: 'roll_back', label: 'Gerudo recovers and flips away', range: 'far', cite: at(1105) },
]

const attacks: Attack[] = [
  { id: 'slash', label: 'Scimitar slash', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(174) },
  {
    id: 'spin',
    label: 'Spin attack: she catches Link and throws him in the cell',
    damage: 8,
    effect: { kind: 'grab', frames: { value: 30, cite: at(951) }, damagePerBeat: 0, release: 'carried_off' },
    blockable: true,
    dodgeable: true,
    source: at(174),
  },
]

const hittable = phases.filter((p) => p.hittable !== 'none').map((p) => p.id)
const toDamaged = Object.fromEntries(hittable.map((p) => [p, 'damaged']))
const toStunned = Object.fromEntries(hittable.filter((p) => p !== 'stunned').map((p) => [p, 'stunned']))
const damaged = (note: string): Reaction => ({ damage: true, to: toDamaged, note, cite: at(1421) })

const reactions: Record<string, Reaction> = {
  GELDB_DMG_REACT_NORMAL: damaged('damage and a red flash, then she reels; at zero health she is defeated'),
  GELDB_DMG_REACT_STUN: { damage: true, to: toStunned, note: 'blue flash for 80 frames and a stun unless already stunned; the table damage is 0', cite: at(1405) },
  GELDB_DMG_REACT_FREEZE: { damage: true, to: toStunned, note: 'damage and a freeze-stun unless already stunned', cite: at(1405) },
  GELDB_DMG_REACT_UNK_D: damaged('handled like any damaging hit'),
  GELDB_DMG_REACT_UNK_E: damaged('handled like any damaging hit'),
  GELDB_DMG_REACT_UNK_6: { damage: false, note: 'reaction 6 is skipped by EnGeldB_CollisionCheck: no damage, no reaction', cite: at(1396) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enGeldB: ActorSpec = {
  overlay: 'ovl_En_GeldB',
  name: 'Gerudo fighter',
  role: 'enemy',
  summary:
    'A Gerudo swordswoman with 20 health. She blocks frontal swings and arrows, spins aside from jump slashes, and leaps over the Hookshot, so Link hurts her only while she attacks, flips, or is stunned. Her spin attack, if it lands, catches Link and throws him in the cell.',
  cite: at(93),
  pools: [{ id: 'body', label: 'Gerudo fighter', hp: { value: 20, cite: at(248) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'ready',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnGeldB_Ready: 'ready',
    EnGeldB_Pivot: 'ready',
    EnGeldB_Advance: 'advance',
    EnGeldB_Circle: 'circle',
    EnGeldB_Sidestep: 'sidestep',
    EnGeldB_Block: 'block',
    EnGeldB_RollForward: 'roll_forward',
    EnGeldB_RollBack: 'roll_back',
    EnGeldB_Jump: 'jump',
    EnGeldB_Slash: 'slash',
    EnGeldB_SpinAttack: 'spin_attack',
    EnGeldB_SpinDodge: 'spin_dodge',
    EnGeldB_Stunned: 'stunned',
    EnGeldB_Damaged: 'damaged',
    EnGeldB_Wait: post('intro: she hangs 120 units up until her switch is set and Link is within 300; action GELDB_WAIT is below GELDB_READY, so her body is never put on the AC list, and her sword is off', 384),
    EnGeldB_Defeated: post('defeat animation after the finishing blow; the encounter has already ended', 1357),
    EnGeldB_Flee: post('after defeat she leaps away and is removed; the encounter has already ended', 432),
    actionFunc: post('the action function pointer field, set through EnGeldB_SetupAction; not an action function', 236),
  },
  atSources: { [at(174)]: 'slash' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      block_timer_clears: "the phase is left only when its timer runs out, so no timer is ever left behind",
      spin_dodge_timer_clears: "the phase is left only when its timer runs out, so no timer is ever left behind",
      link_hurt_overkill: "every change to Link's health is a multiple of the 8-unit slash, so his health reaches zero exactly and never overshoots",
      hit_deku_nut__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_deku_stick: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_deku_stick__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_deku_stick__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_deku_stick__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_slingshot: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_slingshot__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_explosive: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_explosive__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_boomerang__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_arrow_normal: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_arrow_normal__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_hammer_swing: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_hammer_swing__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_swing__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_swing__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_hookshot__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_slash_kokiri: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_slash_kokiri__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_kokiri__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_kokiri__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_slash_master: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_slash_master__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_master__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_master__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_slash_giant: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_slash_giant__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_giant__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_giant__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_arrow_fire: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_arrow_fire__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_arrow_ice__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_arrow_light: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_arrow_light__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_magic_fire: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_magic_fire__block: "the block is entered only by Link's own hit and lasts one beat (5 to 15 frames), so she lowers it on that same beat and no later hit finds it",
      hit_magic_fire__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_magic_fire__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_magic_fire__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_spin_kokiri: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_spin_kokiri__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_kokiri__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_kokiri__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_spin_giant: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_spin_giant__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_giant__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_giant__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_spin_master: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_spin_master__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_master__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_master__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_jump_kokiri: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_jump_kokiri__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_jump_kokiri_self: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_jump_kokiri_self__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri_self__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri_self__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_jump_giant: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_jump_giant__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_jump_giant_self: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_jump_giant_self__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant_self__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant_self__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_jump_master: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_jump_master__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_jump_master_self: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_jump_master_self__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master_self__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master_self__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      miss_hammer_jump: "the hits with no effect are the ones on the leap, the reel, and the block; each is entered only by Link's own hit and left on that same beat, so no later hit finds it",
      hit_hammer_jump__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_jump__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_jump__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      spin_dodge_step_2: "the spin dodge is entered only by Link's jump attack, which needs near, and it is left on that same beat",
      spin_lands_again: "a landed spin attack catches Link and ends the fight with him carried off, so it never lands while he is still held",
      spin_lands_dd_again: "a landed spin attack catches Link and ends the fight with him carried off, so it never lands while he is still held",
    },
  },
}
