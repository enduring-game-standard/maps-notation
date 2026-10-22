import { standardLoadouts } from '../loadouts'
import { DMG_TYPES } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Eiyer/z_en_eiyer.c'
const at = (line: number): Cite => `${F}:${line}`

/** Out of the floor its AC takes DMG_DEFAULT (everything but shield and mirror ray), set in EnEiyer_SetupAmbush. */
const DEFAULT = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')

/** Din's Fire connects (AC accepts it) but its entry is damage 0, reaction 0, which EnEiyer_UpdateDamage skips. */
const dinsDoesNothing = { MAGIC_FIRE: { damage: 0, cite: at(627) } }

const phases: Phase[] = [
  { id: 'emerge', label: 'Stinger rises to just under the floor', hittable: 'none', cite: at(221) },
  {
    id: 'underground',
    label: 'Stinger lurks under the floor',
    hittable: ['DEKU_NUT', 'EXPLOSIVE', 'BOOMERANG'],
    overrides: {
      DEKU_NUT: { damage: 0, to: 'ambush', cite: at(637) },
      BOOMERANG: { damage: 0, to: 'ambush', cite: at(637) },
      EXPLOSIVE: { damage: 2, to: 'defeated', cite: at(639) },
    },
    cite: at(200),
  },
  { id: 'ambush', label: 'Stinger backflips out of the floor', hittable: 'none', cite: at(254) },
  { id: 'glide', label: 'Stinger glides above the floor', frames: { value: 60, cite: at(266) }, hittable: DEFAULT, overrides: dinsDoesNothing, cite: at(429) },
  { id: 'dive', label: 'Stinger dives at Link', hittable: DEFAULT, overrides: dinsDoesNothing, cite: at(279) },
  { id: 'land', label: 'Stinger plunges back into the floor', frames: { value: 10, cite: at(516) }, hittable: DEFAULT, overrides: dinsDoesNothing, cite: at(509) },
  { id: 'hurt', label: 'Stinger reels from a hit', hittable: 'none', frames: { value: 40, cite: at(299) }, cite: at(304) },
  { id: 'stunned', label: 'Stinger is stunned', frames: { value: 80, cite: at(334) }, hittable: DEFAULT, overrides: dinsDoesNothing, cite: at(598) },
]

const steps: Step[] = [
  { from: 'emerge', to: 'underground', label: 'Stinger settles under the floor', cite: at(349) },
  { from: 'underground', to: 'ambush', label: 'Link steps on the Stinger and it springs out', range: 'near', cite: at(356) },
  { from: 'ambush', to: 'glide', label: 'Stinger takes to the air', cite: at(422) },
  { from: 'glide', to: 'dive', label: 'Stinger is over Link and dives', range: 'near', afterTimer: true, cite: at(464) },
  { from: 'dive', to: 'land', label: 'Stinger dives into Link', range: 'near', attack: 'sting', cite: at(502) },
  { from: 'dive', to: 'land', label: 'Stinger dives into the floor', range: 'far', cite: at(499) },
  { from: 'land', to: 'emerge', label: 'Stinger is back under the floor', afterTimer: true, cite: at(531) },
  { from: 'hurt', to: 'glide', label: 'Stinger recovers', afterTimer: true, cite: at(560) },
  { from: 'stunned', to: 'glide', label: 'Stinger shakes off the stun', afterTimer: true, cite: at(618) },
]

const above = ['glide', 'dive', 'land', 'stunned']
const reactions: Record<string, Reaction> = {
  '0x0': {
    damage: true,
    to: Object.fromEntries(above.map((p) => [p, 'hurt'])),
    note: 'damage, then reel (or die at zero health); an entry of damage 0 and reaction 0 is skipped',
    cite: at(647),
  },
  '0x1': {
    damage: true,
    to: Object.fromEntries(above.filter((p) => p !== 'stunned').map((p) => [p, 'stunned'])),
    note: 'stun unless already stunned; under the floor a zero-damage hit makes it spring out instead (phase override)',
    cite: at(643),
  },
}

const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enEiyer: ActorSpec = {
  overlay: 'ovl_En_Eiyer',
  name: 'Stinger (floor)',
  role: 'enemy',
  summary:
    'A stingray that lurks under sand or floor. Only bombs, Deku Nuts, and the Boomerang reach it there: a bomb kills it outright, and a nut or boomerang flushes it out. It springs out when Link steps on it, glides, and dives at him with a knockback sting.',
  cite: at(137),
  pools: [{ id: 'body', label: 'Stinger', hp: { value: 2, cite: at(89) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'emerge',
  variants: [
    { id: 'circling', label: 'Stinger circling with three decoy clones (params 0)', start: 'emerge', cite: at(181) },
    { id: 'wandering', label: 'Stinger wandering near its spawn point (params 10)', start: 'emerge', cite: at(181) },
  ],
  range: 'far',
  steps,
  attacks: [{ id: 'sting', label: 'Stinger dive', damage: 8, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(80) }],
  actionFuncs: {
    EnEiyer_AppearFromGround: 'emerge',
    EnEiyer_WanderUnderground: 'underground',
    EnEiyer_CircleUnderground: 'underground',
    EnEiyer_Ambush: 'ambush',
    EnEiyer_Glide: 'glide',
    EnEiyer_StartAttack: 'dive',
    EnEiyer_DiveAttack: 'dive',
    EnEiyer_Land: 'land',
    EnEiyer_Hurt: 'hurt',
    EnEiyer_Stunned: 'stunned',
    EnEiyer_Inactive: ex('run only by the decoy clones (params 1-3), which never set AT or AC, so they cannot hurt or be hurt', 682),
    EnEiyer_Die: ex('death spin after the finishing blow; the encounter has already ended', 565),
    EnEiyer_Dead: ex('sinking corpse and item drop after death; drops are out of scope', 587),
  },
  atSources: { [at(80)]: 'sting' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      hurt_timer_clears: 'hurt is left only by its own timer running out; nothing connects in hurt to move it early',
      link_hurt_overkill: "the sting deals 8 (4 with Double Defense) and every loadout's health and every heal is a multiple of 8, so Link never holds less than one sting",
    },
  },
}
