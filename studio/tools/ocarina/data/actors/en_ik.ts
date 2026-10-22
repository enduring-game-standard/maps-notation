import { DMG_TYPES, type DmgType } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Ik/z_en_ik.c'
const at = (line: number): Cite => `${F}:${line}`
const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * Three modes of the same fight loop, each its own copy of the walk/attack phases:
 * - `armored`: silver, black, and white knights before the armor breaks; hits spark and never flinch.
 * - `broken`: the same knights once health first falls to 10 or below (armorStatusFlag set, z_en_ik.c:778);
 *   every hit that gets through sends the knight into a flinch, and projectiles now hurt.
 * - `nabooru`: the Nabooru knight, which never loses its armor (z_en_ik.c:776) and has 50 health.
 */
const MODES = ['armored', 'broken', 'nabooru'] as const
type Mode = (typeof MODES)[number]
const LOOP = ['walk', 'vertical', 'axe_stuck', 'horizontal', 'recover'] as const
const id = (phase: (typeof LOOP)[number], mode: Mode) => `${phase}_${mode}`

/** Any hit on the sleeping knight only wakes it: StandUp reads AC_HIT itself, and UpdateDamage returns early while unk_2F8 is 3. */
const wakes = Object.fromEntries(DMG_TYPES.map((d) => [d, { damage: 0, to: id('walk', 'armored'), cite: at(326) }]))

/** Table damage of every EN_IK_DMG_REACT_PROJECTILE entry (sDamageTable). */
const PROJECTILES: Partial<Record<DmgType, number>> = {
  SLINGSHOT: 1, ARROW_NORMAL: 2, ARROW_FIRE: 2, ARROW_ICE: 2, ARROW_LIGHT: 2, ARROW_UNK1: 2, ARROW_UNK2: 2, ARROW_UNK3: 15,
}
/** With the armor broken, the PROJECTILE early return no longer applies, so projectiles deal table damage and the knight flinches. */
const projectilesHurt = Object.fromEntries(
  Object.entries(PROJECTILES).map(([d, damage]) => [d, { damage: damage!, to: 'flinch', cite: at(763) }]),
)

const LABELS: Record<(typeof LOOP)[number], string> = {
  walk: 'stalks Link',
  vertical: 'raises its axe overhead',
  axe_stuck: "has its axe stuck in the floor",
  horizontal: 'sweeps its axe sideways',
  recover: 'recovers from its sweep',
}
const CITES: Record<(typeof LOOP)[number], number> = { walk: 394, vertical: 471, axe_stuck: 514, horizontal: 543, recover: 585 }
const WHO: Record<Mode, string> = { armored: 'Armored Iron Knuckle', broken: 'Unarmored Iron Knuckle', nabooru: "Nabooru's Iron Knuckle" }

const phases: Phase[] = [
  { id: 'dormant', label: 'Iron Knuckle sits motionless', overrides: wakes, cite: at(318) },
  ...MODES.flatMap((mode) =>
    LOOP.map((p): Phase => ({
      id: id(p, mode),
      label: `${WHO[mode]} ${LABELS[p]}`,
      ...(mode === 'broken' ? { overrides: projectilesHurt } : {}),
      ...(mode === 'nabooru' ? { pool: 'nabooru' } : {}),
      cite: at(CITES[p]),
    })),
  ),
  { id: 'flinch', label: 'Unarmored Iron Knuckle reels from a hit', hittable: 'none', cite: at(871) },
]

const loopSteps = (mode: Mode): Step[] => [
  { from: id('walk', mode), to: id('walk', mode), label: 'Iron Knuckle closes on Link', range: 'far', move: 'near', cite: at(420) },
  { from: id('walk', mode), to: id('vertical', mode), label: 'Iron Knuckle starts an overhead chop', range: 'near', weight: 1, cite: at(429) },
  { from: id('walk', mode), to: id('horizontal', mode), label: 'Iron Knuckle starts a sweep', range: 'near', weight: 1, cite: at(431) },
  { from: id('vertical', mode), to: id('axe_stuck', mode), label: 'The overhead chop lands on Link', range: 'near', attack: 'axe', cite: at(498) },
  { from: id('vertical', mode), to: id('axe_stuck', mode), label: 'The overhead chop hits the floor', range: 'far', cite: at(498) },
  { from: id('axe_stuck', mode), to: id('walk', mode), label: 'Iron Knuckle pulls its axe free', cite: at(519) },
  { from: id('horizontal', mode), to: id('recover', mode), label: 'The sweep catches Link', range: 'near', attack: 'axe', cite: at(571) },
  { from: id('horizontal', mode), to: id('recover', mode), label: 'The sweep cuts the air', range: 'far', cite: at(571) },
  { from: id('recover', mode), to: id('walk', mode), label: 'Iron Knuckle stands ready', cite: at(587) },
]

const steps: Step[] = [
  ...MODES.flatMap(loopSteps),
  { from: 'flinch', to: id('walk', 'broken'), label: 'Iron Knuckle recovers and faces Link', cite: at(681) },
]

/** Every unarmored phase a damaging hit can find, sent to the flinch. */
const toFlinch = Object.fromEntries(LOOP.map((p) => [id(p, 'broken'), 'flinch']))

const reactions: Record<string, Reaction> = {
  EN_IK_DMG_REACT_NONE: { damage: false, note: 'returns before Actor_ApplyDamage, without sparks', cite: at(762) },
  EN_IK_DMG_REACT_SPARKS_NO_DMG: { damage: false, note: 'sparks off the armor and returns before Actor_ApplyDamage', cite: at(762) },
  EN_IK_DMG_REACT_PROJECTILE: {
    damage: false,
    note: 'while armorStatusFlag is 0 (armored knight, and always for Nabooru) projectiles spark off; unarmored phases override this with the table damage',
    cite: at(763),
  },
  EN_IK_DMG_REACT_ELEMENTAL_MAGIC: {
    damage: true,
    to: toFlinch,
    note: 'reaches Actor_ApplyDamage with the table damage, 0 for every magic entry; armored it only sparks, unarmored it still flinches',
    cite: at(816),
  },
  EN_IK_DMG_REACT_DAMAGE: {
    damage: true,
    to: toFlinch,
    note: 'Actor_ApplyDamage; armored or Nabooru, the knight sparks and keeps its action; unarmored, it flinches',
    cite: at(816),
  },
}

export const enIk: ActorSpec = {
  overlay: 'ovl_En_Ik',
  name: 'Iron Knuckle',
  role: 'enemy',
  summary:
    'An armored knight that walks at Link and swings a great axe: an overhead chop that sticks in the floor, or a sideways sweep. Every axe hit costs 64 (four hearts), knocks Link back, and carries DMG_UNBLOCKABLE, so no shield stops it. The common knight has 30 health and sits until struck; armored, it shrugs off projectiles and never flinches, and when its health first falls to 10 or below the armor breaks and every hit makes it reel. Nabooru\'s knight has 50 health, keeps its armor, and yields when its health falls to 10.',
  cite: at(221),
  pools: [
    {
      id: 'body',
      label: 'Iron Knuckle',
      hp: { value: 30, cite: at(240) },
      then: 'defeated',
      thresholds: [{ at: 10, to: Object.fromEntries(LOOP.map((p) => [id(p, 'armored'), 'flinch'])), cite: at(778) }],
    },
    {
      id: 'nabooru',
      label: "Nabooru's Iron Knuckle",
      hp: { value: 50, cite: at(240), ops: [at(246)] },
      then: 'defeated',
      thresholds: [{ at: 10, to: 'defeated', cite: at(835) }],
    },
  ],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'dormant',
  variants: [
    { id: 'common', label: 'Silver, black, or white Iron Knuckle', start: 'dormant', cite: at(776) },
    { id: 'nabooru', label: "Nabooru's Iron Knuckle", start: id('walk', 'nabooru'), cite: at(1535) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'axe', label: 'Iron Knuckle axe', damage: 64, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(161) },
  ],
  actionFuncs: {
    EnIk_StandUp: 'dormant',
    EnIk_Idle: 'walk_*',
    EnIk_WalkOrRun: 'walk_*',
    EnIk_VerticalAttack: 'vertical_*',
    EnIk_PullOutAxe: 'axe_stuck_*',
    EnIk_DoubleHorizontalAttack: 'horizontal_*',
    EnIk_SingleHorizontalAttack: 'horizontal_*',
    EnIk_RecoverFromHorizontalAttack: 'recover_*',
    EnIk_ReactToAttack: 'flinch',
    EnIk_StopAndBlock: ex(
      'entered from EnIk_HandleBlocking only while Link is mid-swing (player->meleeWeaponState, src/code/z_actor.c:4694); in the beat model Link\'s hit resolves before the enemy steps, so a guard raised in answer to the swing cannot be expressed (reported gap)',
      280,
    ),
    EnIk_Die: ex('death animation, item drop, and despawn after the finishing blow; the encounter has already ended', 702),
    actionFunc: ex('not an action function: the extractor read the parameter name of EnIk_SetupAction', 218),
  },
  atSources: {
    [at(161)]: 'axe',
    [at(850)]: 'axe',
  },
  loadouts: standardLoadouts(['adult'], 5),
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        ['explosive', 'hammer_swing', 'slash_master', 'slash_giant', 'spin_giant', 'spin_master', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump'].map((k) => [
          `miss_${k}__flinch`,
          'the flinch is entered only by Link\'s own hit (or the armor breaking on it) and its one step out fires the same beat, so no later hit finds it',
        ]),
      ),
      ...Object.fromEntries(
        LOOP.map((p) => [
          `body_empty_in_${id(p, 'armored')}`,
          'the largest table damage of any type Link emits is 8 (Giant jump, z_en_ik.c:197); the 15 and 10 entries (:187, :199) are ARROW_UNK3 and UNKNOWN_1, which Link never emits, so health 30 passes through 10 before it can reach 0, and the threshold has already moved the knight to the flinch',
        ]),
      ),
      ...Object.fromEntries(
        LOOP.map((p) => [
          `nabooru_empty_in_${id(p, 'nabooru')}`,
          'the largest table damage of any type Link emits is 8 (Giant jump, z_en_ik.c:197); the 15 and 10 entries (:187, :199) are ARROW_UNK3 and UNKNOWN_1, which Link never emits, so health 50 cannot jump from above 10 to 0; the threshold at 10 defeats the knight first',
        ]),
      ),
      nabooru_overkill: 'the threshold at 10 ends the fight before the last segment empties, and no hit Link emits exceeds 8 (z_en_ik.c:197), so damage never finds the pool empty',
    },
  },
}
