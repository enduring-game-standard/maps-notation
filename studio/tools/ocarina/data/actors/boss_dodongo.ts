import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

/*
 * Reported gaps (z_boss_dodongo.c):
 * - The roll ends at the second corner it reaches (812-821), a distance at up to 15 units a frame (786), not a timer. The model rolls
 *   in two legs, each left the beat it is not spent rolling over Link, so it can run shorter than the code's roll.
 * - After a roll he stands within 200 of a corner, where neither the inhale nor the roll can start (753, 758, 1249-1252) until he
 *   walks clear at about 2.8 units a frame (726). The model gives that walk one beat. On the rest of the wall, the same corner zones
 *   and Link's place in front of him (1200, 1233) are a chance of walking on, not a position.
 * - The walk band is coarse: inhale needs Link within 500 (753) and in a narrow column in front (1200); the roll needs him outside an
 *   80-degree cone (1233) at any distance. Near maps to inhale or roll, far to roll or walking on.
 * - A bomb must come within 40 units of his mouth (207). The bomb's 2 damage lands when the explosion ends (591), not on the swallow,
 *   and it cannot kill him: health stops at 1 (594-595), the contract's declared floor. The model drains on the swallow and to 0.
 * - LayDown runs until its animation ends (605-609) before the 100-frame stun, and hits land in it (1296). The animation length is in
 *   the object data, not this source, so the model's `down` phase has only the 100 frames.
 */
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

const BREAKERS: DmgType[] = ['SLINGSHOT', 'BOOMERANG']
/** A seed or boomerang on any element during the inhale sends him back to Walk with a 50-frame wait (lines 1281-1286). */
const breakers = Object.fromEntries(BREAKERS.map((d) => [d, { damage: 0, to: 'walk_recover', cite: at(1285) }]))
/** He swallows a bomb only while the inhale count is past 20 and under 82 (line 676), which splits the 100-frame inhale (line 541). */
const INHALE = [
  { id: 'inhale_early', label: 'King Dodongo starts to inhale', frames: 20, bomb: false },
  { id: 'inhale_open', label: 'King Dodongo inhales hard, mouth open to a bomb', frames: 61, bomb: true },
  { id: 'inhale_late', label: 'King Dodongo finishes inhaling', frames: 19, bomb: false },
] as const

const phases: Phase[] = [
  { id: 'walk_recover', label: 'King Dodongo plods along the wall, not yet deciding', hittable: 'none', frames: { value: 50, cite: at(1286) }, cite: at(690) },
  { id: 'walk_corner', label: 'King Dodongo walks out of the corner he rolled into', hittable: 'none', cite: at(1249) },
  { id: 'walk_free', label: 'King Dodongo plods along the wall, watching Link', hittable: 'none', cite: at(752) },
  ...INHALE.map((ph): Phase => ({
    id: ph.id, label: ph.label, hittable: ph.bomb ? ['EXPLOSIVE', ...BREAKERS] : BREAKERS,
    overrides: { ...breakers, ...(ph.bomb ? { EXPLOSIVE: { damage: 2, to: 'explode', cite: at(591) } } : {}) },
    frames: { value: ph.frames, cite: at(ph.id === 'inhale_late' ? 541 : 676) }, cite: at(661),
  })),
  { id: 'blow', label: 'King Dodongo breathes fire', hittable: 'none', frames: { value: 50, cite: at(532) }, cite: at(635) },
  { id: 'explode', label: 'The bomb goes off in his belly', hittable: 'none', frames: { value: 35, cite: at(505) }, cite: at(556) },
  { id: 'down', label: 'King Dodongo lies stunned', hittable: Object.keys(SWORD) as DmgType[], frames: { value: 100, cite: at(609) }, cite: at(613) },
  { id: 'getup', label: 'King Dodongo gets up', hittable: 'none', cite: at(627) },
  { id: 'damaged', label: 'King Dodongo reels from the sword', hittable: 'none', cite: at(546) },
  { id: 'roll', label: 'King Dodongo curls up to roll', hittable: 'none', frames: { value: 27, cite: at(524) }, cite: at(764) },
  { id: 'roll_1', label: 'King Dodongo rolls toward the next corner', hittable: 'none', cite: at(786) },
  { id: 'roll_2', label: 'King Dodongo rolls on toward the corner after', hittable: 'none', cite: at(836) },
]

/** His body collider strikes whenever the action is Roll (lines 1056-1057), windup included. */
const rollsOver = (from: string): Step => ({ from, to: from, label: 'King Dodongo rolls over Link', range: 'near', attack: 'roll', cite: at(1057) })

const steps: Step[] = [
  { from: 'walk_recover', to: 'walk_free', label: 'King Dodongo looks for Link', afterTimer: true, cite: at(752) },
  { from: 'walk_corner', to: 'walk_free', label: 'King Dodongo is clear of the corner', cite: at(1249) },
  { from: 'walk_free', to: 'inhale_early', label: 'Link is in front of him; he draws breath', range: 'near', cite: at(754) },
  { from: 'walk_free', to: 'roll', label: 'Link is beside or behind him; he rolls', range: 'near', cite: at(759) },
  { from: 'walk_free', to: 'roll', label: 'Link is off to the side; he rolls', range: 'far', cite: at(759) },
  { from: 'walk_free', to: 'walk_free', label: 'Link is ahead of him but off his breath\'s line, or he is near a corner; he walks on', cite: at(753) },
  { from: 'inhale_early', to: 'inhale_open', label: 'King Dodongo draws in hard', afterTimer: true, cite: at(676) },
  { from: 'inhale_open', to: 'inhale_late', label: 'King Dodongo stops drawing in', afterTimer: true, cite: at(676) },
  { from: 'inhale_late', to: 'blow', label: 'King Dodongo breathes fire over Link', range: 'near', afterTimer: true, attack: 'fire', cite: at(672) },
  { from: 'inhale_late', to: 'blow', label: 'King Dodongo breathes fire, out of Link\'s way', range: 'far', afterTimer: true, cite: at(672) },
  { from: 'blow', to: 'roll', label: 'King Dodongo rolls', afterTimer: true, cite: at(657) },
  { from: 'explode', to: 'down', label: 'King Dodongo slumps', afterTimer: true, cite: at(587) },
  { from: 'down', to: 'getup', label: 'King Dodongo stirs', afterTimer: true, cite: at(623) },
  { from: 'getup', to: 'roll', label: 'King Dodongo rolls', cite: at(631) },
  { from: 'damaged', to: 'roll', label: 'King Dodongo rolls', cite: at(552) },
  rollsOver('roll'),
  { from: 'roll', to: 'roll_1', label: 'King Dodongo starts rolling', afterTimer: true, cite: at(785) },
  rollsOver('roll_1'),
  { from: 'roll_1', to: 'roll_2', label: 'King Dodongo bounces off a corner', cite: at(812) },
  rollsOver('roll_2'),
  { from: 'roll_2', to: 'walk_corner', label: 'King Dodongo hits the second corner and stands up', cite: at(821) },
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
    BossDodongo_Inhale: 'inhale_*',
    BossDodongo_BlowFire: 'blow',
    BossDodongo_Explode: 'explode',
    BossDodongo_LayDown: 'down',
    BossDodongo_Vulnerable: 'down',
    BossDodongo_GetUp: 'getup',
    BossDodongo_Damaged: 'damaged',
    BossDodongo_Roll: 'roll*',
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
