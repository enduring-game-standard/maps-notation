import { DMG_TYPES } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Ik/z_en_ik.c'
const at = (line: number): Cite => `${F}:${line}`
const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/** Any hit on the sleeping knight only wakes it: StandUp reads AC_HIT itself, and UpdateDamage returns early while unk_2F8 is 3. */
const wakes = Object.fromEntries(DMG_TYPES.map((d) => [d, { damage: 0, to: 'walk', cite: at(326) }]))

const phases: Phase[] = [
  { id: 'dormant', label: 'Iron Knuckle sits motionless', overrides: wakes, cite: at(318) },
  { id: 'walk', label: 'Iron Knuckle stalks Link', cite: at(394) },
  { id: 'vertical', label: 'Iron Knuckle raises its axe overhead', cite: at(471) },
  { id: 'axe_stuck', label: "Iron Knuckle's axe is stuck in the floor", cite: at(514) },
  { id: 'horizontal', label: 'Iron Knuckle sweeps its axe sideways', cite: at(543) },
  { id: 'recover', label: 'Iron Knuckle recovers from its sweep', cite: at(585) },
]

const steps: Step[] = [
  { from: 'walk', to: 'walk', label: 'Iron Knuckle trudges toward Link', range: 'far', move: 'near', cite: at(420) },
  { from: 'walk', to: 'vertical', label: 'Iron Knuckle starts an overhead chop', range: 'near', weight: 1, cite: at(429) },
  { from: 'walk', to: 'horizontal', label: 'Iron Knuckle starts a sweep', range: 'near', weight: 1, cite: at(431) },
  { from: 'vertical', to: 'axe_stuck', label: 'The overhead chop lands on Link', range: 'near', attack: 'axe', cite: at(498) },
  { from: 'vertical', to: 'axe_stuck', label: 'The overhead chop hits the floor', range: 'far', cite: at(498) },
  { from: 'axe_stuck', to: 'walk', label: 'Iron Knuckle pulls its axe free', cite: at(519) },
  { from: 'horizontal', to: 'recover', label: 'The sweep catches Link', range: 'near', attack: 'axe', cite: at(571) },
  { from: 'horizontal', to: 'recover', label: 'The sweep cuts the air', range: 'far', cite: at(571) },
  { from: 'recover', to: 'walk', label: 'Iron Knuckle stands ready', cite: at(587) },
]

const reactions: Record<string, Reaction> = {
  EN_IK_DMG_REACT_NONE: { damage: false, note: 'returns before Actor_ApplyDamage, without sparks', cite: at(762) },
  EN_IK_DMG_REACT_SPARKS_NO_DMG: { damage: false, note: 'sparks off the armor and returns before Actor_ApplyDamage', cite: at(762) },
  EN_IK_DMG_REACT_PROJECTILE: { damage: false, note: 'while the armor is on (armorStatusFlag 0) projectiles spark off without damage', cite: at(763) },
  EN_IK_DMG_REACT_ELEMENTAL_MAGIC: { damage: true, note: 'reaches Actor_ApplyDamage with the table damage, which is 0 for every magic entry; armored, it only sparks', cite: at(774) },
  EN_IK_DMG_REACT_DAMAGE: { damage: true, note: 'Actor_ApplyDamage; armored, the knight sparks and keeps its current action (no flinch)', cite: at(774) },
}

export const enIk: ActorSpec = {
  overlay: 'ovl_En_Ik',
  name: 'Iron Knuckle',
  role: 'enemy',
  summary:
    'An armored knight with 30 health that sits until struck, then walks at Link and swings a great axe: an overhead chop that sticks in the floor, or a sideways sweep. Every axe hit costs 64 (four hearts), knocks Link back, and carries DMG_UNBLOCKABLE, so no shield stops it. Armored, it shrugs off projectiles and never flinches.',
  cite: at(221),
  pools: [{ id: 'body', label: 'Iron Knuckle', hp: { value: 30, cite: at(240) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'dormant',
  range: 'far',
  steps,
  attacks: [
    { id: 'axe', label: 'Iron Knuckle axe', damage: 64, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(161) },
  ],
  actionFuncs: {
    EnIk_StandUp: 'dormant',
    EnIk_Idle: 'walk',
    EnIk_WalkOrRun: 'walk',
    EnIk_VerticalAttack: 'vertical',
    EnIk_PullOutAxe: 'axe_stuck',
    EnIk_DoubleHorizontalAttack: 'horizontal',
    EnIk_SingleHorizontalAttack: 'horizontal',
    EnIk_RecoverFromHorizontalAttack: 'recover',
    EnIk_StopAndBlock: ex('entered only from EnIk_HandleBlocking, which needs the armor broken or the Nabooru type; the model keeps the armor on for the whole fight (reported gap: no health threshold in the spec types)', 280),
    EnIk_ReactToAttack: ex('the flinch runs only when the armor is broken (armorStatusFlag set at health 10 or less); armored hits spark instead (reported gap)', 808),
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
    },
  },
}
