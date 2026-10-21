import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Dodongo/z_boss_dodongo.c'
const at = (line: number): Cite => `${F}:${line}`
const DATA = 'src/overlays/actors/ovl_Boss_Dodongo/z_boss_dodongo_data.inc.c'
const CC = 'src/code/z_collision_check.c'

/** `CollisionCheck_GetSwordDamage` on the head element, read only while he lies down (line 1296). Every such hit sends him to Damaged (line 1301). */
const sword = (damage: number, line: number) => ({ damage, to: 'damaged', cite: `${CC}:${line}` as Cite })
const SWORD: Partial<Record<DmgType, { damage: number; to: string; cite: Cite }>> = {
  SLASH_KOKIRI: sword(1, 3718),
  SPIN_KOKIRI: sword(1, 3718),
  JUMP_KOKIRI: sword(2, 3720),
  SPIN_MASTER: sword(2, 3720),
  SLASH_MASTER: sword(2, 3720),
  HAMMER_SWING: sword(2, 3720),
  DEKU_STICK: sword(2, 3720),
  HAMMER_JUMP: sword(4, 3722),
  JUMP_MASTER: sword(4, 3722),
  SPIN_GIANT: sword(4, 3722),
  SLASH_GIANT: sword(4, 3722),
  JUMP_GIANT: sword(8, 3724),
}

const phases: Phase[] = [
  { id: 'walk_recover', label: 'King Dodongo plods along the wall, not yet deciding', hittable: 'none', frames: { value: 50, cite: at(1286) }, cite: at(690) },
  { id: 'walk_free', label: 'King Dodongo plods along the wall, watching Link', hittable: 'none', cite: at(752) },
  {
    id: 'inhale', label: 'King Dodongo inhales', hittable: ['EXPLOSIVE', 'SLINGSHOT', 'BOOMERANG'],
    overrides: {
      EXPLOSIVE: { damage: 2, to: 'explode', cite: at(591) },
      SLINGSHOT: { damage: 0, to: 'walk_recover', cite: at(1285) },
      BOOMERANG: { damage: 0, to: 'walk_recover', cite: at(1285) },
    },
    frames: { value: 100, cite: at(541) }, cite: at(661),
  },
  { id: 'blow', label: 'King Dodongo breathes fire', hittable: 'none', frames: { value: 50, cite: at(532) }, cite: at(635) },
  { id: 'explode', label: 'The bomb goes off in his belly', hittable: 'none', frames: { value: 35, cite: at(505) }, cite: at(556) },
  { id: 'down', label: 'King Dodongo lies stunned', hittable: Object.keys(SWORD) as DmgType[], frames: { value: 100, cite: at(609) }, cite: at(613) },
  { id: 'getup', label: 'King Dodongo gets up', hittable: 'none', cite: at(627) },
  { id: 'damaged', label: 'King Dodongo reels from the sword', hittable: 'none', cite: at(546) },
  { id: 'roll', label: 'King Dodongo curls up and rolls around the arena', hittable: 'none', frames: { value: 27, cite: at(524) }, cite: at(764) },
]

const steps: Step[] = [
  { from: 'walk_recover', to: 'walk_free', label: 'King Dodongo looks for Link', afterTimer: true, cite: at(752) },
  { from: 'walk_free', to: 'inhale', label: 'Link is ahead of him; he draws breath', range: 'near', cite: at(754) },
  { from: 'walk_free', to: 'roll', label: 'Link is off to the side; he rolls', range: 'far', cite: at(759) },
  { from: 'inhale', to: 'blow', label: 'King Dodongo breathes fire over Link', range: 'near', afterTimer: true, attack: 'fire', cite: at(651) },
  { from: 'inhale', to: 'blow', label: 'King Dodongo breathes fire, out of Link\'s way', range: 'far', afterTimer: true, cite: at(672) },
  { from: 'blow', to: 'roll', label: 'King Dodongo rolls', afterTimer: true, cite: at(657) },
  { from: 'explode', to: 'down', label: 'King Dodongo slumps', afterTimer: true, cite: at(587) },
  { from: 'down', to: 'getup', label: 'King Dodongo stirs', afterTimer: true, cite: at(623) },
  { from: 'getup', to: 'roll', label: 'King Dodongo rolls', cite: at(631) },
  { from: 'damaged', to: 'roll', label: 'King Dodongo rolls', cite: at(552) },
  { from: 'roll', to: 'walk_free', label: 'King Dodongo rolls over Link', range: 'near', afterTimer: true, attack: 'roll', cite: at(1057) },
  { from: 'roll', to: 'walk_free', label: 'King Dodongo rolls into the wall', range: 'far', afterTimer: true, cite: at(821) },
]

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const ELEMENT_LINES = [19, 30, 41, 52, 63, 74, 85, 96, 107, 118, 129, 140, 151, 162, 173, 184, 195, 206, 217]

export const bossDodongo: ActorSpec = {
  overlay: 'ovl_Boss_Dodongo',
  name: 'King Dodongo',
  role: 'boss',
  summary:
    'A huge lizard with 12 health. He walks the arena wall; when Link is ahead of him he inhales and breathes fire, and otherwise he rolls. A bomb swallowed while he inhales costs him 2 and knocks him down, where one sword-type hit lands before he rolls away. A seed or boomerang breaks off his inhale. Only his roll carries his body collider.',
  cite: at(61),
  pools: [{ id: 'body', label: 'King Dodongo', hp: { value: 12, cite: at(231) }, then: 'defeated' }],
  damage: { kind: 'custom', entries: SWORD },
  phases,
  start: 'walk_recover',
  range: 'far',
  steps,
  attacks: [
    { id: 'roll', label: 'King Dodongo rolls into Link', damage: 4, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: `${DATA}:19` },
    {
      id: 'fire', label: 'Fire breath', damage: 8, effect: { kind: 'burn' }, blockable: false, dodgeable: true,
      source: 'src/overlays/actors/ovl_En_Bdfire/z_en_bdfire.c:188', via: { overlay: 'ovl_En_Bdfire', spawn: at(1258) },
    },
  ],
  actionFuncs: {
    BossDodongo_Walk: 'walk_*',
    BossDodongo_Inhale: 'inhale',
    BossDodongo_BlowFire: 'blow',
    BossDodongo_Explode: 'explode',
    BossDodongo_LayDown: 'down',
    BossDodongo_Vulnerable: 'down',
    BossDodongo_GetUp: 'getup',
    BossDodongo_Damaged: 'damaged',
    BossDodongo_Roll: 'roll',
    BossDodongo_IntroCutscene: post('intro cutscene; it ends in Walk with a 50-frame wait, the start phase', 457),
    BossDodongo_DeathCutscene: post('death cutscene once health reaches 0; the encounter has already ended', 1270),
  },
  atSources: Object.fromEntries(ELEMENT_LINES.map((l) => [`${DATA}:${l}` as Cite, 'roll'])),
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      walk_recover_timer_clears: 'nothing Link does connects while he waits, so the wait is left only when its timer runs out',
      blow_timer_clears: 'as walk_recover_timer_clears: the fire breath is left only by its timer',
      explode_timer_clears: 'as walk_recover_timer_clears: the explosion is left only by its timer',
      roll_timer_clears: 'as walk_recover_timer_clears: the roll windup is left only by its timer',
      fire_lands_again: 'between two breaths he blows out (3 beats), rolls, walks, and inhales (5 beats), longer than Link burns; En_Bdfire also skips its burn while Link already burns (z_en_bdfire.c:178)',
    },
  },
}
