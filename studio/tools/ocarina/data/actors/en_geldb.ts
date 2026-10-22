import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

/*
 * Facing. The beat model has no facing, so the spec takes the duel case: she faces Link and Link faces her
 * (he Z-targets her). Every weight and branch below follows that case. Reported gaps, all in z_en_geldb.c:
 * - A frontal swing that misses the odd-frame block test (308) falls to the second check and flips her away
 *   (326), or, outside its narrower window (313), reaches Ready's or Advance's circle-on-swing exit (472-475,
 *   529-533). An override carries one outcome, so every reacted swing is modeled as the block.
 * - Ready after a slash, spin, flip, or sidestep restarts with a 5-10 or 1-5 frame timer (607-608, 903-904,
 *   1308-1309), not the 5-15 of SetupReady (440). A phase has one timer.
 * - The block's unguarded tail (block_lower) lasts until the block animation ends (1170); its length is in the
 *   animation asset, not the source, so it is modeled as one beat.
 * - Circle's slash at Link's back (751-753) is geometry; modeled as a near step, so near circling always ends in a
 *   slash before her timer runs out.
 * - Branches that need Link's back turned or her not facing him are not modeled: RollForward to Ready (606-607),
 *   Sidestep's slash, flip, spin, and advance (1311-1328), Slash and SpinAttack's ReactToPlayer branch (914, 995),
 *   and Pivot (492), which Ready enters only when she is not facing him.
 */
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
  {
    id: 'block_lower',
    label: 'Gerudo lowers her guard',
    overrides: {
      ...Object.fromEntries(SWINGS.map((d) => [d, { damage: 0, to: 'block', cite: at(1206) }])),
      ...Object.fromEntries(JUMPS.map((d) => [d, { damage: 0, to: 'spin_dodge', cite: at(1197) }])),
    },
    cite: at(1168),
  },
  { id: 'roll_forward', label: 'Gerudo flips toward Link', cite: at(599) },
  { id: 'roll_back', label: 'Gerudo flips away', hittable: 'none', cite: at(1445) },
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
  { from: 'circle', to: 'slash', label: 'Gerudo slashes at his back', range: 'near', cite: at(753) },
  { from: 'sidestep', to: 'ready', label: 'Gerudo stops on guard, Link facing her', afterTimer: true, cite: at(1308) },
  { from: 'block', to: 'block_lower', label: 'Gerudo starts lowering her guard', afterTimer: true, cite: at(1168) },
  { from: 'block_lower', to: 'slash', label: 'Gerudo lowers her guard and slashes', range: 'near', weight: 1, cite: at(1186) },
  { from: 'block_lower', to: 'circle', label: 'Gerudo lowers her guard and circles', range: 'near', weight: 1, cite: at(1188) },
  { from: 'block_lower', to: 'circle', label: 'Gerudo lowers her guard and circles', range: 'far', cite: at(1192) },
  { from: 'roll_forward', to: 'slash', label: 'Gerudo lands her flip and slashes', move: 'near', weight: 1, cite: at(614) },
  { from: 'roll_forward', to: 'advance', label: 'Gerudo lands her flip', move: 'near', weight: 1, cite: at(616) },
  { from: 'roll_back', to: 'spin_attack', label: 'Gerudo lands and spins back in', move: 'far', weight: 2, cite: at(1020) },
  { from: 'roll_back', to: 'sidestep', label: 'Gerudo lands and sidesteps', move: 'far', weight: 4, cite: at(1022) },
  { from: 'roll_back', to: 'ready', label: 'Gerudo lands on guard', move: 'far', weight: 4, cite: at(1024) },
  { from: 'jump', to: 'slash', label: 'Gerudo lands her leap and slashes', move: 'near', cite: at(1139) },
  { from: 'slash', to: 'ready', label: 'Gerudo slashes and resets', range: 'near', attack: 'slash', weight: 30, cite: at(903) },
  { from: 'slash', to: 'sidestep', label: 'Gerudo slashes and sidesteps', range: 'near', attack: 'slash', weight: 21, cite: at(908) },
  { from: 'slash', to: 'circle', label: 'Gerudo slashes and circles', range: 'near', attack: 'slash', weight: 49, cite: at(917) },
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
  { id: 'slash', label: 'Scimitar slash', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(174), onBlock: { to: 'roll_back', cite: at(894) } },
  {
    id: 'spin',
    label: 'Spin attack: she catches Link and he is carried off (Gerudo Valley without a Hookshot, else the fortress cell)',
    damage: 8,
    effect: { kind: 'grab', frames: { value: 30, cite: at(951) }, damagePerBeat: 0, release: 'carried_off' },
    blockable: true,
    dodgeable: true,
    source: at(174),
    onBlock: { to: 'roll_back', cite: at(977) },
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
    'A Gerudo swordswoman with 20 health. She blocks frontal swings and arrows, spins aside from jump slashes, and leaps over the Hookshot, so Link hurts her only while she attacks, flips, or is stunned. Her spin attack, if it lands, catches Link and he is carried off: to Gerudo Valley without a Hookshot, else to the fortress cell.',
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
      hit_deku_stick__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_deku_stick__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_deku_stick__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_slingshot__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_explosive__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_boomerang__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_arrow_normal__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_hammer_swing__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_swing__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_swing__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_hookshot__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_slash_kokiri__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_kokiri__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_kokiri__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_slash_master__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_master__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_master__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_slash_giant__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_giant__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_slash_giant__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_arrow_fire__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_arrow_ice__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_arrow_light__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_magic_fire__block: "the block is entered only by Link's own hit and lasts one beat (5 to 15 frames), so she lowers it on that same beat and no later hit finds it",
      hit_magic_fire__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_magic_fire__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_magic_fire__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_spin_kokiri__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_kokiri__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_kokiri__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_spin_giant__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_giant__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_giant__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_spin_master__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_master__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_spin_master__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_jump_kokiri__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_jump_kokiri_self__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri_self__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_kokiri_self__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_jump_giant__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_jump_giant_self__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant_self__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_giant_self__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_jump_master__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_jump_master_self__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master_self__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_jump_master_self__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      hit_hammer_jump__roll_forward: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_jump__spin_attack: "the flip and the spin attack are entered only from far and their step brings her near, so Link is far on the only beat he can hit them, and this hit needs near",
      hit_hammer_jump__spin_dodge: "the spin dodge is entered only by Link's own jump attack and lasts one beat (6 frames), so she leaves it on that same beat and no later hit finds it",
      spin_dodge_step_2: "the spin dodge is entered only by Link's jump attack, which needs near, and it is left on that same beat",
      spin_lands_again: "a landed spin attack catches Link and ends the fight with him carried off, so it never lands while he is still held",
      spin_lands_dd_again: "a landed spin attack catches Link and ends the fight with him carried off, so it never lands while he is still held",
    },
  },
}
