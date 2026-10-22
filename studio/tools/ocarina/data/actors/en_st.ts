import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_St/z_en_st.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/** Cylinder 0, the body: hit from any side (z_en_st.c:311). */
const BODY: DmgType[] = [
  'MAGIC_FIRE', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3',
  'HOOKSHOT', 'HAMMER_SWING', 'BOOMERANG', 'EXPLOSIVE', 'DEKU_NUT',
]
const DEFAULT = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
/** Cylinder 2, the metal front of the legs, set when Link is within 90 degrees of its facing (z_en_st.c:319). */
const FRONT = DEFAULT.filter((d) => !BODY.includes(d))
/** Cylinder 1, the soft back of the legs (z_en_st.c:313). */
const BACK = FRONT.filter((d) => d !== 'MAGIC_LIGHT' && d !== 'MAGIC_ICE')

type Facing = 'front' | 'back' | 'fixed'
type Origin = 'ceiling' | 'drop' | 'rise' | 'front' | 'back'
const ORIGINS: Origin[] = ['ceiling', 'drop', 'rise', 'front', 'back']
const ORIGIN_PHASE: Record<Origin, string> = { ceiling: 'ceiling', drop: 'drop', rise: 'rise', front: 'ground_front', back: 'ground_back' }
const ORIGIN_FACING: Record<Origin, Facing> = { ceiling: 'fixed', drop: 'fixed', rise: 'fixed', front: 'front', back: 'back' }

/**
 * Which colliders Link's hits reach in one phase (EnSt_CheckColliders, z_en_st.c:511). The body takes BODY from any side.
 * The legs take the rest on the soft back, or on the metal front, which sways it (`sway`) or stops the hit outright.
 */
const hits = (facing: Facing, sway: boolean): Pick<Phase, 'hittable' | 'guards' | 'overrides'> => {
  if (facing === 'back') return { hittable: [...BODY, ...BACK] }
  if (sway) return { hittable: [...BODY, ...FRONT], overrides: Object.fromEntries(FRONT.map((d) => [d, { damage: 0, to: 'sway', cite: at(443) }])) }
  return { hittable: [...BODY, ...FRONT], guards: FRONT }
}
const STUN_FROM: Record<string, Origin> = { ceiling: 'ceiling', drop: 'drop', rise: 'rise', ground_front: 'front', ground_back: 'back', sway: 'front' }

const phases: Phase[] = [
  { id: 'ceiling', label: 'Skulltula hangs from the ceiling', ...hits('fixed', false), cite: at(844) },
  { id: 'drop', label: 'Skulltula drops on its thread', ...hits('fixed', false), cite: at(919) },
  { id: 'rise', label: 'Skulltula climbs back up its thread', ...hits('fixed', false), cite: at(942) },
  { id: 'ground_front', label: 'Skulltula faces Link at the bottom of its thread', frames: { value: 30, cite: at(643) }, ...hits('front', true), cite: at(650) },
  { id: 'ground_back', label: 'Skulltula turns its back to Link', frames: { value: 30, cite: at(636) }, ...hits('back', false), cite: at(645) },
  { id: 'sway', label: 'Skulltula sways from a blow to its front', frames: { value: 60, cite: at(443) }, ...hits('front', false), cite: at(1065) },
  { id: 'spin', label: 'Skulltula spins from damage', hittable: 'none', cite: at(398) },
  ...ORIGINS.map((o): Phase => ({
    id: `stunned_${o}`, label: `Skulltula is stunned (${ORIGIN_PHASE[o].replace('_', ' ')})`,
    frames: { value: 120, cite: at(474) }, ...hits(ORIGIN_FACING[o], false), cite: at(1062),
  })),
]

const steps: Step[] = [
  { from: 'ceiling', to: 'drop', label: 'Link walks underneath; Skulltula drops', range: 'near', cite: at(847) },
  { from: 'drop', to: 'ground_front', label: 'Skulltula reaches the bottom of its thread', range: 'near', cite: at(913) },
  { from: 'drop', to: 'rise', label: 'Link moves away; Skulltula climbs back', range: 'far', cite: at(930) },
  { from: 'ground_front', to: 'ground_back', label: 'Skulltula turns away from Link', afterTimer: true, cite: at(636) },
  { from: 'ground_back', to: 'ground_front', label: 'Skulltula turns back to face Link', afterTimer: true, cite: at(643) },
  { from: 'ground_front', to: 'rise', label: 'Link moves away; Skulltula climbs back', range: 'far', cite: at(875) },
  { from: 'ground_back', to: 'rise', label: 'Link moves away; Skulltula climbs back', range: 'far', cite: at(875) },
  { from: 'rise', to: 'drop', label: 'Link comes back; Skulltula drops again', range: 'near', cite: at(952) },
  { from: 'rise', to: 'ceiling', label: 'Skulltula is back on the ceiling', range: 'far', cite: at(956) },
  { from: 'spin', to: 'drop', label: 'Skulltula stops spinning and drops at Link', range: 'near', cite: at(952) },
  { from: 'spin', to: 'rise', label: 'Skulltula stops spinning and keeps climbing', range: 'far', cite: at(875) },
  ...(['ground_front', 'ground_back', 'sway'] as const).map((p): Step => ({
    from: p, to: p, label: 'Skulltula bumps into Link', range: 'near', attack: 'contact', cite: at(427),
  })),
  { from: 'sway', to: 'ground_front', label: 'Skulltula stops swaying', afterTimer: true, cite: at(776) },
  ...ORIGINS.map((o): Step => ({ from: `stunned_${o}`, to: ORIGIN_PHASE[o], label: 'Skulltula shakes off the stun', afterTimer: true, cite: at(588) })),
]

const KINDS = [
  { id: 'normal', label: 'Skulltula', cite: at(822), unseen: false },
  { id: 'big', label: 'Big Skulltula (params 1, 1.4 times the size)', cite: at(541), unseen: false },
  { id: 'invisible', label: 'Skulltula visible only through the Lens (params 2)', cite: at(817), unseen: true },
] as const
const STARTS = [
  { id: 'ceiling', label: 'on the ceiling', start: 'ceiling' },
  { id: 'ground', label: 'already at the bottom of its thread', start: 'ground_front' },
] as const

export const enSt: ActorSpec = {
  overlay: 'ovl_En_St',
  name: 'Skulltula',
  role: 'enemy',
  summary:
    'A spider that drops on its thread when Link walks underneath. Its front is armored: sword-type hits there only make it sway. It turns its back on Link every 30 frames, and then those hits land. Arrows, bombs, the Hookshot, the hammer, and Din\'s Fire hit its body from any side. A Deku Nut or the Boomerang stuns it. After each damaging hit it spins and climbs back up.',
  cite: at(820),
  pools: [{ id: 'body', label: 'Skulltula', hp: { value: 2, cite: at(80) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(2)',
    reactions: {
      '0x0': {
        damage: true,
        to: Object.fromEntries(phases.filter((p) => p.id !== 'spin').map((p) => [p.id, 'spin'])),
        note: 'a body or back hit damages it and sets it spinning, which clears a stun or sway',
        cite: at(484),
      },
      '0x1': {
        damage: true,
        to: Object.fromEntries(Object.entries(STUN_FROM).map(([p, o]) => [p, `stunned_${o}`])),
        note: 'Deku Nut and Boomerang stun it for 120 frames unless already stunned (table damage 0)',
        cite: at(474),
      },
    },
  },
  phases,
  start: 'ceiling',
  variants: KINDS.flatMap((k) =>
    STARTS.map((s) => ({ id: `${k.id}_${s.id}`, label: `${k.label}, ${s.label}`, start: s.start, ...(k.unseen ? { unseen: true } : {}), cite: k.cite })),
  ),
  range: 'far',
  steps,
  attacks: [
    { id: 'contact', label: 'Skulltula body slam', damage: 8, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(427) },
  ],
  actionFuncs: {
    EnSt_WaitOnCeiling: 'ceiling',
    EnSt_StartOnCeilingOrGround: 'ceiling',
    EnSt_MoveToGround: 'drop',
    EnSt_LandOnGround: 'drop',
    EnSt_WaitOnGround: 'ground_*',
    EnSt_ReturnToCeiling: 'rise',
    EnSt_BounceAround: post('death bounce after the finishing blow; the encounter has already ended', 502),
    EnSt_FinishBouncing: post('end of the death bounce after the finishing blow', 976),
    EnSt_Die: post('death effect and item drop after the finishing blow', 1018),
    actionFunc: post('the parameter of EnSt_SetupAction, not a function; every real target is ledgered by name', 152),
  },
  atSources: {
    [at(71)]: { excluded: 'element of the AC cylinders, whose base is AT_NONE; it never registers as an attack', cite: at(63) },
    [at(106)]: { excluded: 'the sphere is never passed to CollisionCheck_SetAT, only repositioned each draw; its 4 damage never lands. The real contact hit is the damagePlayer call below', cite: at(1109) },
    [at(427)]: 'contact',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the slam costs 8, or 4 with Double Defense, and every kit starts at 32 health, so no hit finds Link with less health than it takes',
      hit_hammer_swing__sway: 'a sway is entered only by Link\'s own frontal hit, with Link near; each sway beat the Skulltula slams him back to far, so a hit that needs Link near never finds it (the 30-frame slam cooldown, z_en_st.c:426, is not modeled)',
      hit_magic_fire__sway: 'as hit_hammer_swing__sway',
      ...Object.fromEntries(
        ['explosive', 'arrow_normal', 'arrow_fire', 'arrow_ice', 'arrow_light', 'hammer_swing', 'hookshot', 'magic_fire'].map((k) => [
          `miss_${k}`,
          'this hit misses only in spin, which is entered only by Link\'s own damaging hit and left on that same beat, so no later hit finds it',
        ]),
      ),
    },
  },
}
