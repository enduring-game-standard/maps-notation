import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Dekubaba/z_en_dekubaba.c'
const at = (line: number): Cite => `${F}:${line}`

type Size = 'small' | 'big'
const SIZES: Size[] = ['small', 'big']
const NAME: Record<Size, string> = { small: 'Deku Baba', big: 'Big Deku Baba' }
const TABLE: Record<Size, string> = { small: 'sDamageTableNormal', big: 'sDamageTableBig' }

/** A shield bash is DMG_ENTRY(0, NONE) in both tables, and a zero-damage NONE hit changes nothing. */
const shieldDoesNothing = { SHIELD: { damage: 0, cite: at(943) } }
/** Outside Vulnerable a boomerang keeps the old health and stuns. */
const boomerangStuns = (s: Size) => ({ BOOMERANG: { damage: 0, to: `attacked_stun_${s}`, cite: at(949) } })

const phases: Phase[] = SIZES.flatMap((s): Phase[] => {
  const n = NAME[s]
  const base = { pool: `body_${s}`, table: TABLE[s] }
  const open = { ...base, overrides: { ...shieldDoesNothing, ...boomerangStuns(s) } }
  const shut = { ...base, hittable: 'none' as const }
  return [
    { id: `buried_init_${s}`, label: `${n} lies hidden in the ground`, ...shut, cite: at(298) },
    { id: `buried_${s}`, label: `${n} lies hidden, resettling`, ...shut, frames: { value: 45, cite: at(300) }, cite: at(298) },
    { id: `emerge_${s}`, label: `${n} rises out of the ground`, ...open, frames: { value: 15, cite: at(315) }, cite: at(319) },
    { id: `retract_${s}`, label: `${n} sinks back into the ground`, ...open, frames: { value: 15, cite: at(330) }, cite: at(334) },
    { id: `prepare_${s}`, label: `${n} rears back`, ...open, frames: { value: 8, cite: at(344) }, cite: at(345) },
    { id: `lunge_${s}`, label: `${n} lunges at Link`, ...open, frames: { value: 10, cite: at(661) }, cite: at(352) },
    { id: `recover_${s}`, label: `${n} lies on the ground after missing`, ...open, frames: { value: 30, cite: at(748) }, cite: at(359) },
    { id: `soothe_${s}`, label: `${n} straightens up`, ...open, frames: { value: 8, cite: at(778) }, cite: at(365) },
    { id: `chomp_${s}`, label: `${n} sways and chomps`, ...open, cite: at(340) },
    { id: `attacked_strong_${s}`, label: `${n} recoils from a hit`, ...shut, cite: at(378) },
    { id: `attacked_weak_${s}`, label: `${n} is knocked upright, weakened`, ...shut, cite: at(378) },
    { id: `attacked_stun_${s}`, label: `${n} is knocked upright, stunned`, ...shut, cite: at(378) },
    { id: `vulnerable_weak_${s}`, label: `${n} stands stiff, stalk exposed`, ...base, overrides: shieldDoesNothing, frames: { value: 40, cite: at(416) }, cite: at(411) },
    { id: `vulnerable_stun_${s}`, label: `${n} stands stunned, stalk exposed`, ...base, overrides: shieldDoesNothing, frames: { value: 60, cite: at(420) }, cite: at(411) },
    { id: `wobble_${s}`, label: `${n} wobbles from a stalk cut`, ...shut, cite: at(434) },
  ]
})

const steps: Step[] = SIZES.flatMap((s): Step[] => {
  const n = NAME[s]
  const exits = (from: string, near: number, far: number, afterTimer = false): Step[] => [
    { from, to: `prepare_${s}`, label: `${n} turns on Link`, range: 'near', afterTimer, cite: at(near) },
    { from, to: `soothe_${s}`, label: `${n} settles`, range: 'far', afterTimer, cite: at(far) },
  ]
  return [
    { from: `buried_init_${s}`, to: `emerge_${s}`, label: `${n} springs up at Link`, range: 'near', cite: at(460) },
    { from: `buried_${s}`, to: `emerge_${s}`, label: `${n} springs up at Link`, range: 'near', afterTimer: true, cite: at(460) },
    { from: `emerge_${s}`, to: `prepare_${s}`, label: `${n} readies to strike`, range: 'near', afterTimer: true, cite: at(520) },
    { from: `emerge_${s}`, to: `retract_${s}`, label: `${n} finds nobody and sinks`, range: 'far', afterTimer: true, cite: at(522) },
    { from: `retract_${s}`, to: `buried_${s}`, label: `${n} is underground`, afterTimer: true, cite: at(571) },
    { from: `prepare_${s}`, to: `lunge_${s}`, label: `${n} lunges`, afterTimer: true, cite: at(691) },
    { from: `lunge_${s}`, to: `soothe_${s}`, label: `${n} bites`, range: 'near', attack: 'bite', cite: at(1017) },
    { from: `lunge_${s}`, to: `recover_${s}`, label: `${n} bites empty air and flops down`, range: 'far', afterTimer: true, cite: at(662) },
    { from: `recover_${s}`, to: `prepare_${s}`, label: `${n} rises and rears back`, range: 'near', afterTimer: true, cite: at(750) },
    { from: `recover_${s}`, to: `chomp_${s}`, label: `${n} rises and sways`, range: 'far', afterTimer: true, cite: at(752) },
    { from: `soothe_${s}`, to: `chomp_${s}`, label: `${n} starts chomping`, afterTimer: true, cite: at(785) },
    { from: `chomp_${s}`, to: `prepare_${s}`, label: `${n} rears back at Link`, range: 'near', cite: at(625) },
    { from: `chomp_${s}`, to: `retract_${s}`, label: `${n} loses Link and sinks`, range: 'far', cite: at(623) },
    ...exits(`attacked_strong_${s}`, 807, 809),
    { from: `attacked_weak_${s}`, to: `vulnerable_weak_${s}`, label: `${n} goes stiff`, cite: at(812) },
    { from: `attacked_stun_${s}`, to: `vulnerable_stun_${s}`, label: `${n} goes stiff`, cite: at(812) },
    ...exits(`vulnerable_weak_${s}`, 827, 829, true),
    ...exits(`vulnerable_stun_${s}`, 827, 829, true),
    ...exits(`wobble_${s}`, 848, 850),
  ]
})

/** Where a damaging hit sends the head, by phase: Recover weakens it (956), Vulnerable cuts the stalk (963), anything else strengthens (958). */
const ACTIVE = ['emerge', 'retract', 'prepare', 'lunge', 'soothe', 'chomp']
const headHit = (vulnerable: 'wobble' | 'attacked_strong'): Record<string, string> =>
  Object.fromEntries(
    SIZES.flatMap((s) => [
      ...ACTIVE.map((k) => [`${k}_${s}`, `attacked_strong_${s}`]),
      [`recover_${s}`, `attacked_weak_${s}`],
      [`vulnerable_weak_${s}`, `${vulnerable}_${s}`],
      [`vulnerable_stun_${s}`, `${vulnerable}_${s}`],
    ]),
  )
const stunTo: Record<string, string> = Object.fromEntries(
  SIZES.flatMap((s) => [...ACTIVE, 'recover'].map((k) => [`${k}_${s}`, `attacked_stun_${s}`])),
)

const reactions: Record<string, Reaction> = {
  EN_DEKUBABA_DMG_REACT_NONE: {
    damage: true, to: headHit('attacked_strong'),
    note: 'a damaging hit strengthens it (recoil), weakens it if it lies after a miss, and recoils it even when the stalk is exposed',
    cite: at(968),
  },
  EN_DEKUBABA_DMG_REACT_FIRE: {
    damage: true, to: headHit('attacked_strong'),
    note: 'read like NONE, plus flame effects',
    cite: at(977),
  },
  EN_DEKUBABA_DMG_REACT_SWORD: {
    damage: true, to: headHit('wobble'),
    note: 'a blade on the exposed stalk makes it wobble (or die, dropping a stick); elsewhere it reads like NONE',
    cite: at(963),
  },
  EN_DEKUBABA_DMG_REACT_BOOMERANG: {
    damage: true, to: headHit('wobble'),
    note: 'on the exposed stalk it cuts like a blade; elsewhere it stuns without damage (phase override at 949)',
    cite: at(961),
  },
  EN_DEKUBABA_DMG_REACT_STUN: {
    damage: true, to: stunTo,
    note: 'stuns it upright outside Vulnerable; once exposed a stun does nothing',
    cite: at(951),
  },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enDekubaba: ActorSpec = {
  overlay: 'ovl_En_Dekubaba',
  name: 'Deku Baba',
  role: 'enemy',
  summary:
    'A carnivorous plant rooted in place. It springs from the ground when Link comes near and lunges to bite. A hit on the head knocks it back; a hit while it lies after a miss, or a stun, leaves the stalk exposed, and a blade on the exposed stalk finishes it.',
  cite: at(47),
  pools: [
    { id: 'body_small', label: 'Deku Baba', hp: { value: 2, cite: at(150) }, then: 'defeated' },
    { id: 'body_big', label: 'Big Deku Baba', hp: { value: 4, cite: at(254) }, then: 'defeated' },
  ],
  damage: { kind: 'decomp', table: 'sDamageTableNormal', reactions },
  phases,
  start: 'buried_init_small',
  variants: [
    { id: 'small', label: 'Deku Baba', start: 'buried_init_small', cite: at(257) },
    { id: 'big', label: 'Big Deku Baba', start: 'buried_init_big', cite: at(244) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'bite', label: 'Deku Baba bite', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(61) },
  ],
  actionFuncs: {
    EnDekubaba_WaitPlayerNear: 'buried_*',
    EnDekubaba_ExitGround: 'emerge_*',
    EnDekubaba_EnterGround: 'retract_*',
    EnDekubaba_PrepareAttack: 'prepare_*',
    EnDekubaba_Attack: 'lunge_*',
    EnDekubaba_RecoverFromAttackMiss: 'recover_*',
    EnDekubaba_Soothe: 'soothe_*',
    EnDekubaba_ChompAir: 'chomp_*',
    EnDekubaba_Attacked: 'attacked_*',
    EnDekubaba_Vulnerable: 'vulnerable_*',
    EnDekubaba_Wobble: 'wobble_*',
    EnDekubaba_Die: post('shrinks into the ground after the finishing blow; the encounter has already ended', 801),
    EnDekubaba_DieDropStick: post('the cut head falls after the finishing blow on the stalk; the encounter has already ended', 965),
    EnDekubaba_DekuStick: post('the dropped head becomes a Deku Stick pickup (ACTORCAT_MISC); drops are out of scope', 445),
  },
  atSources: { [at(61)]: 'bite' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs: deadVerbs() },
}

function deadVerbs(): Record<string, string> {
  const out: Record<string, string> = {
    link_hurt_overkill: 'every cost to Link is 8 (4 with Double Defense) and his health starts and refills in multiples of that, so no hit ever exceeds what is left',
    wobble_small_step_2:
      'a small Deku Baba survives a stalk hit only from the Kokiri Sword (1 of its 2 health), which needs near, and it leaves the wobble on that same beat; the boomerang, the only ranged stalk cutter, deals 2 and kills it',
  }
  const reachNear = ['deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master',
    'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump']
  for (const s of SIZES) {
    out[`buried_${s}_timer_clears`] = 'the buried phase is left only by a step that waits for its timer, so the timer is always spent when it ends'
    for (const k of reachNear)
      out[`hit_${k}__retract_${s}`] =
        'it sinks only when Link is far, and sinking lasts one beat (15 frames), so an attack that needs near never finds it: closing in spends the only beat'
  }
  return out
}
