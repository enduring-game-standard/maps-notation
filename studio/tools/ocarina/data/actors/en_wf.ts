import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Wf/z_en_wf.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

type Kind = 'gray' | 'white'
const KINDS: Kind[] = ['gray', 'white']
const NAME: Record<Kind, string> = { gray: 'Wolfos', white: 'White Wolfos' }
const CLAW: Record<Kind, string> = { gray: 'claw_gray', white: 'claw_white' }

/** Swings that set the player's meleeWeaponState, which EnWf_PickAction answers by blocking or backflipping out of reach. */
const MELEE: DmgType[] = [
  'DEKU_STICK', 'HAMMER_SWING', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT',
  'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP',
]
/** En_Arrow (arrows, seeds, nuts) and Arms_Hook: the actors Actor_GetProjectileActor reports (z_actor.c:3868). */
const PROJECTILE: DmgType[] = ['DEKU_NUT', 'SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT']
/** Every type the block spheres accept (0xFFC1FFFF, z_en_wf.c:110): all of the body's types except magic. */
const BLOCKED: DmgType[] = [
  'DEKU_NUT', 'DEKU_STICK', 'SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'HAMMER_SWING', 'HOOKSHOT',
  'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT',
  'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP',
]
/** sDamageTable entries (z_en_wf.c:193-224) whose reaction takes the damage branch; a hit from behind multiplies them by 4. */
const TABLE: Partial<Record<DmgType, number>> = {
  DEKU_STICK: 2, SLINGSHOT: 1, EXPLOSIVE: 2, ARROW_NORMAL: 2, HAMMER_SWING: 2,
  SLASH_KOKIRI: 1, SLASH_MASTER: 2, SLASH_GIANT: 4, ARROW_FIRE: 4, ARROW_ICE: 2, ARROW_LIGHT: 2,
  MAGIC_FIRE: 4, MAGIC_LIGHT: 3, SPIN_KOKIRI: 1, SPIN_GIANT: 4, SPIN_MASTER: 2,
  JUMP_KOKIRI: 2, JUMP_GIANT: 8, JUMP_MASTER: 4, HAMMER_JUMP: 4,
}

type Overrides = NonNullable<Phase['overrides']>
const sendAll = (types: DmgType[], to: string, line: number): Overrides =>
  Object.fromEntries(types.map((d) => [d, { damage: 0, to, cite: at(line) }]))

const phasesOf = (k: Kind): Phase[] => {
  const n = NAME[k]
  const meleeToBlock = sendAll(MELEE, `block_${k}`, 350)
  const bombToFlip = sendAll(['EXPLOSIVE'], `backflip_${k}`, 374)
  const facing: Overrides = { ...meleeToBlock, ...sendAll(PROJECTILE, `block_${k}`, 1439), ...bombToFlip }
  const fromBehind: Overrides = Object.fromEntries(
    Object.entries(TABLE).map(([d, dmg]) => [d, { damage: dmg * 4, to: `damaged_${k}`, cite: at(1235) }]),
  )
  return [
    { id: `appear_wait_${k}`, label: `${n} waits underground`, hittable: 'none', cite: at(1288) },
    { id: `appear_rise_${k}`, label: `${n} rises and howls`, hittable: 'none', cite: at(1288) },
    { id: `idle_${k}`, label: `${n} watches Link`, frames: { value: [2, 12], cite: at(446) }, overrides: facing, cite: at(452) },
    { id: `run_${k}`, label: `${n} runs at Link`, overrides: facing, cite: at(515) },
    { id: `circle_${k}`, label: `${n} circles Link`, frames: { value: [30, 60], cite: at(647) }, overrides: facing, cite: at(653) },
    { id: `short_${k}`, label: `${n} darts sideways`, frames: { value: [5, 15], cite: at(1072) }, overrides: { ...meleeToBlock, ...bombToFlip }, cite: at(1077) },
    { id: `attack_${k}`, label: `${n} lunges with its claws`, cite: at(740) },
    { id: `back_${k}`, label: `${n} has spun past Link and shows its back`, overrides: fromBehind, cite: at(764) },
    { id: `block_${k}`, label: `${n} blocks with its arms`, guards: BLOCKED, cite: at(1295) },
    { id: `backflip_${k}`, label: `${n} backflips away`, hittable: 'none', cite: at(1288) },
    { id: `damaged_${k}`, label: `${n} reels from the hit`, hittable: 'none', cite: at(1288) },
    { id: `stunned_${k}`, label: `${n} is stunned`, frames: { value: 80, cite: at(1248) }, cite: at(881) },
  ]
}

const stepsOf = (k: Kind): Step[] => {
  const n = NAME[k]
  return [
    { from: `appear_wait_${k}`, to: `appear_rise_${k}`, label: `Link comes close: ${n} rises`, range: 'near', cite: at(419) },
    { from: `appear_rise_${k}`, to: `idle_${k}`, label: `${n} finishes its howl`, cite: at(438) },
    { from: `idle_${k}`, to: `run_${k}`, label: `${n} charges`, afterTimer: true, weight: 7, cite: at(490) },
    { from: `idle_${k}`, to: `circle_${k}`, label: `${n} starts to circle`, afterTimer: true, weight: 3, cite: at(492) },
    { from: `run_${k}`, to: `run_${k}`, label: `${n} closes the distance`, range: 'far', move: 'near', cite: at(537) },
    { from: `run_${k}`, to: `attack_${k}`, label: `${n} leaps to attack`, range: 'near', weight: 97, cite: at(567) },
    { from: `run_${k}`, to: `circle_${k}`, label: `${n} veers off to circle`, range: 'near', weight: 3, cite: at(571) },
    { from: `circle_${k}`, to: `circle_${k}`, label: `${n} tightens its circle`, range: 'far', move: 'near', cite: at(686) },
    { from: `circle_${k}`, to: `attack_${k}`, label: `${n} cuts in to attack`, range: 'near', cite: at(713) },
    { from: `circle_${k}`, to: `idle_${k}`, label: `${n} stops circling`, afterTimer: true, cite: at(720) },
    { from: `short_${k}`, to: `attack_${k}`, label: `${n} attacks from the side`, range: 'near', afterTimer: true, cite: at(1147) },
    { from: `short_${k}`, to: `run_${k}`, label: `${n} runs back in`, range: 'far', afterTimer: true, cite: at(1149) },
    { from: `short_${k}`, to: `idle_${k}`, label: `${n} stops, facing Link`, afterTimer: true, cite: at(1139) },
    { from: `attack_${k}`, to: `back_${k}`, label: `${n} slashes and spins around`, range: 'near', attack: CLAW[k], cite: at(768) },
    { from: `attack_${k}`, to: `idle_${k}`, label: `${n} pulls up short`, range: 'far', cite: at(774) },
    { from: `back_${k}`, to: `run_${k}`, label: `${n} turns and charges`, weight: 8, cite: at(624) },
    { from: `back_${k}`, to: `circle_${k}`, label: `${n} turns and circles`, weight: 2, cite: at(622) },
    { from: `block_${k}`, to: `attack_${k}`, label: `${n} counterattacks`, range: 'near', cite: at(1026) },
    { from: `block_${k}`, to: `circle_${k}`, label: `${n} lowers its guard and circles`, range: 'far', cite: at(1032) },
    { from: `backflip_${k}`, to: `short_${k}`, label: `${n} lands and darts sideways`, move: 'far', cite: at(861) },
    { from: `backflip_${k}`, to: `idle_${k}`, label: `${n} lands and watches`, move: 'far', cite: at(863) },
    { from: `damaged_${k}`, to: `attack_${k}`, label: `${n} recovers into an attack`, range: 'near', weight: 14, cite: at(938) },
    { from: `damaged_${k}`, to: `idle_${k}`, label: `${n} recovers and watches`, weight: 1, cite: at(940) },
    { from: `damaged_${k}`, to: `backflip_${k}`, label: `${n} recovers with a backflip`, weight: 1, cite: at(944) },
    { from: `stunned_${k}`, to: `attack_${k}`, label: `${n} shakes off the stun and attacks`, range: 'near', afterTimer: true, weight: 7, cite: at(391) },
    { from: `stunned_${k}`, to: `circle_${k}`, label: `${n} shakes off the stun and circles`, afterTimer: true, weight: 1, cite: at(394) },
  ]
}

const phases = KINDS.flatMap(phasesOf)
const hittable = phases.filter((p) => p.hittable !== 'none').map((p) => p.id)
const kindOf = (id: string) => KINDS.find((k) => id.endsWith(`_${k}`))!
const toDamaged = Object.fromEntries(hittable.map((p) => [p, `damaged_${kindOf(p)}`]))
const toStunned = Object.fromEntries(hittable.filter((p) => !p.startsWith('stunned_')).map((p) => [p, `stunned_${kindOf(p)}`]))

const reactions: Record<string, Reaction> = {
  ENWF_DMG_REACT_NONE: { damage: true, to: toDamaged, note: 'damage applies; at zero health it dies, otherwise it reels', cite: at(1261) },
  ENWF_DMG_REACT_STUN: { damage: true, to: toStunned, note: 'stun (Deku Nut, Boomerang, Hookshot) unless already stunned; the entries deal 0', cite: at(1250) },
  ENWF_DMG_REACT_FIRE: { damage: true, to: toDamaged, note: 'damage applies and it reels; the 40-frame onFireTimer only draws flames', cite: at(1255) },
  ENWF_DMG_REACT_ICE_MAGIC: { damage: false, note: 'ignored entirely: no damage, no reaction', cite: at(1239) },
  ENWF_DMG_REACT_LIGHT_MAGIC: { damage: true, to: toDamaged, note: 'takes the damage branch and reels', cite: at(1261) },
}

/** Melee and Din's Fire need near. short_* is entered only from a backflip, which leaves Link far, and runs out on the next beat. */
const SHORT_MISSED = [
  'deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire',
  'spin_kokiri', 'spin_giant', 'spin_master', 'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self',
  'jump_master', 'jump_master_self', 'hammer_jump',
]
const deadVerbs: Record<string, string> = {
  link_hurt_overkill: 'in every kit and variant each hit costs a whole divisor of Link\'s health, and heals refill to full, so his health always reaches exactly zero',
}
for (const k of KINDS) {
  for (const key of SHORT_MISSED)
    deadVerbs[`hit_${key}__short_${k}`] = 'short_* is entered only from a backflip that leaves Link far, and runs out on the next beat, so a near-only attack never finds it'
  deadVerbs[`hit_magic_fire__block_${k}`] = 'block_* is entered only by Link\'s own swing or shot and is left on that same beat, so no later hit finds it'
}

export const enWf: ActorSpec = {
  overlay: 'ovl_En_Wf',
  name: 'Wolfos',
  role: 'enemy',
  summary: 'A wolf with eight health points that rises from the ground when Link comes near. It blocks or backflips away from frontal swings and arrows, circles and lunges, and after a full lunge spins past Link and shows its back, where hits deal four times their damage. The White Wolfos claws for twice the damage.',
  cite: at(227),
  pools: [{ id: 'body', label: 'Wolfos', hp: { value: 8, cite: at(257) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'appear_wait_gray',
  variants: [
    { id: 'gray', label: 'Wolfos', start: 'appear_wait_gray', cite: at(271) },
    { id: 'white', label: 'White Wolfos', start: 'appear_wait_white', cite: at(281) },
  ],
  range: 'far',
  steps: KINDS.flatMap(stepsOf),
  attacks: [
    { id: 'claw_gray', label: 'Wolfos claws', damage: 4, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(87) },
    { id: 'claw_white', label: 'White Wolfos claws', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(281) },
  ],
  actionFuncs: {
    EnWf_WaitAppear: 'appear_*',
    EnWf_Idle: 'idle_*',
    EnWf_RunToAttack: 'run_*',
    EnWf_CirclePlayer: 'circle_*',
    EnWf_ShortCirclePlayer: 'short_*',
    EnWf_Attack: 'attack_*',
    EnWf_TurnTowardsPlayer: 'back_*',
    EnWf_Block: 'block_*',
    EnWf_BackflipBackward: 'backflip_*',
    EnWf_Damaged: 'damaged_*',
    EnWf_Stunned: 'stunned_*',
    EnWf_AttackBouncedOff: post('entered only when the claws bounce off Link\'s raised shield; a step\'s destination cannot depend on Link\'s stance, so a blocked lunge follows the unblocked path to back_*', 1301),
    EnWf_BackflipForward: post('entered only with a wall behind the Wolfos (z_en_wf.c:342, 932) or a Bombchu heading at it (z_en_wf.c:364); the range model has no walls, and Bombchus share the EXPLOSIVE swing with bombs, which send it backflipping backward', 344),
    EnWf_Die: post('death animation and item drop after the finishing blow; the encounter has already ended', 1180),
    actionFunc: post('the struct field EnWf_SetupAction assigns, not a function of its own', 245),
  },
  atSources: {
    [at(87)]: 'claw_gray',
    [at(98)]: 'claw_gray',
    [at(280)]: 'claw_white',
    [at(281)]: 'claw_white',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
