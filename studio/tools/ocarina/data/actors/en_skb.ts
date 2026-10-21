import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Skb/z_en_skb.c'
const at = (line: number): Cite => `${F}:${line}`
const SPAWNER = 'src/overlays/actors/ovl_En_Encount1/z_en_encount1.c'

const phases: Phase[] = [
  { id: 'rise', label: 'Stalchild climbs out of the ground', hittable: 'none', cite: at(235) },
  { id: 'walk', label: 'Stalchild walks at Link', cite: at(283) },
  { id: 'attack', label: 'Stalchild swipes', cite: at(331) },
  { id: 'stunned', label: 'Stalchild is stunned', frames: { value: 80, cite: at(485) }, cite: at(374) },
  { id: 'hurt', label: 'Stalchild reels from a hit', hittable: 'none', cite: at(403) },
]

/** EnSkb_DecideNextAction: attack when Link is close and in front, else walk. */
const decide = (from: string, label: string, line: number, afterTimer = false): Step[] => [
  { from, to: 'attack', label: `${label}, Link is close: it swipes`, range: 'near', ...(afterTimer ? { afterTimer } : {}), cite: at(line) },
  { from, to: 'walk', label: `${label}, Link is away: it walks`, range: 'far', ...(afterTimer ? { afterTimer } : {}), cite: at(line) },
]

const steps: Step[] = [
  ...decide('rise', 'Stalchild is up', 248),
  { from: 'walk', to: 'walk', label: 'Stalchild walks up to Link', range: 'far', move: 'near', cite: at(292) },
  { from: 'walk', to: 'attack', label: 'Stalchild reaches Link and swipes', range: 'near', cite: at(318) },
  { from: 'attack', to: 'attack', label: 'Stalchild swipes at Link', range: 'near', attack: 'swipe', cite: at(337) },
  { from: 'attack', to: 'walk', label: 'Stalchild swipes at air and walks on', range: 'far', cite: at(345) },
  ...decide('stunned', 'Stalchild shakes off the stun', 387, true),
  ...decide('hurt', 'Stalchild recovers', 423),
]

const hittablePhases = ['walk', 'attack', 'stunned']
const toHurt: Record<string, string> = Object.fromEntries(hittablePhases.map((p) => [p, 'hurt']))
const toStun: Record<string, string> = Object.fromEntries(hittablePhases.filter((p) => p !== 'stunned').map((p) => [p, 'stunned']))

const damaged = (note: string, line: number): Reaction => ({ damage: true, to: toHurt, note, cite: at(line) })
const reactions: Record<string, Reaction> = {
  '0x1': { damage: true, to: toStun, note: 'stun (blue flash, 80 frames) unless already stunned; the table damage is 0', cite: at(483) },
  '0x0': damaged('any other reaction applies damage and sends it reeling, or kills it at zero health', 520),
  '0x7': damaged('fire: flames and a longer red flash, then damage like any hit', 491),
  '0xD': damaged('damage, and the head breaks off (cosmetic; headless walking only jitters its heading)', 510),
  '0xE': damaged('damage, and a Kokiri slash breaks the head off (cosmetic)', 511),
  '0xF': damaged('damage and reel', 520),
  '0x6': { damage: false, note: 'reaction 6 is ignored entirely: no damage, no reaction', cite: at(478) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enSkb: ActorSpec = {
  overlay: 'ovl_En_Skb',
  name: 'Stalchild',
  role: 'enemy',
  summary:
    'A skeleton that climbs out of Hyrule Field at night, walks at Link, and swipes when close. A Deku Nut, Boomerang, or Hookshot stuns it; any damaging hit makes it reel. It cannot be hurt while rising or reeling.',
  cite: at(173),
  pools: [{ id: 'body', label: 'Stalchild', hp: { value: 2, cite: at(181) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'rise',
  variants: [
    { id: 'small', label: 'Stalchild (params 0)', start: 'rise', cite: `${SPAWNER}:296` },
    { id: 'large', label: 'Large Stalchild, every tenth kill after the tenth (params kills/10 * 5)', start: 'rise', cite: `${SPAWNER}:302` },
  ],
  range: 'far',
  steps,
  attacks: [{ id: 'swipe', label: 'Stalchild swipe', damage: 4, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(64) }],
  actionFuncs: {
    EnSkb_RiseFromGround: 'rise',
    EnSkb_WalkForward: 'walk',
    EnSkb_Attack: 'attack',
    EnSkb_Recoil: 'walk',
    EnSkb_Stunned: 'stunned',
    EnSkb_TakeDamage: 'hurt',
    EnSkb_Despawn: post('sinks back underground by day or when Link is 800 units from its home; the encounter ends as if Link left', 314),
    EnSkb_Death: post('body break and drop after the finishing blow; the encounter has already ended', 443),
    actionFunc: post('not an action function: the parameter name of EnSkb_SetupAction', 145),
  },
  atSources: { [at(64)]: 'swipe' },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      miss_deku_stick: 'the only phases a hit misses in are rise and hurt. Rise is only the opening beat, at far, where melee cannot reach; hurt is entered by Link\'s hit and left on that same beat',
      miss_slash_kokiri: 'as miss_deku_stick',
      miss_spin_kokiri: 'as miss_deku_stick',
      miss_jump_kokiri: 'as miss_deku_stick',
      miss_jump_kokiri_self: 'as miss_deku_stick',
      miss_jump_master: 'as miss_deku_stick',
      miss_magic_fire: "as miss_deku_stick: Din's Fire reaches only near",
      link_hurt_overkill: "the swipe deals 4 (2 with Double Defense) and every loadout's health and every heal is a multiple of 4, so Link never holds less than one swipe",
    },
  },
}
