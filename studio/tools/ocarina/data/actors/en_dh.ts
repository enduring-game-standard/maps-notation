import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Pool, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Dh/z_en_dh.c'
const at = (line: number): Cite => `${F}:${line}`
const HAND = 'src/overlays/actors/ovl_En_Dha/z_en_dha.c'

/**
 * Health is 14 for adult Link and 20 for child Link (line 178), so each age gets its own pool and its own copy of the
 * phases. A wound that takes health below 15, 9, or 3 sets `retreat` (lines 527-531): pool thresholds at 14, 8, and 2.
 */
interface Age { id: string; age: 'adult' | 'child'; hp: number; ats: [number, number][] }
const AGES: Age[] = [
  { id: 'adult', age: 'adult', hp: 14, ats: [[8, 528], [2, 529]] },
  { id: 'child', age: 'child', hp: 20, ats: [[14, 527], [8, 528], [2, 529]] },
]
const tag = (s: Age) => `(${s.age} Link)`

const phases: Phase[] = [
  {
    id: 'wait_dormant',
    label: 'Dead Hand waits underground; only its hands are up',
    hittable: ['EXPLOSIVE'],
    overrides: { EXPLOSIVE: { damage: 0, to: 'wait_stirring', cite: at(233) } },
    cite: at(220),
  },
  { id: 'wait_stirring', label: 'Dead Hand rises from the ground', hittable: 'none', cite: at(559) },
  ...AGES.flatMap((s): Phase[] => [
    {
      id: `wait_buried_${s.id}`,
      label: `Dead Hand waits underground again ${tag(s)}`,
      pool: s.id,
      hittable: ['EXPLOSIVE'],
      overrides: { EXPLOSIVE: { damage: 0, to: `wait_rising_${s.id}`, cite: at(233) } },
      cite: at(220),
    },
    { id: `wait_rising_${s.id}`, label: `Dead Hand rises again ${tag(s)}`, pool: s.id, hittable: 'none', cite: at(559) },
    { id: `walk_${s.id}`, label: `Dead Hand shambles toward Link ${tag(s)}`, pool: s.id, frames: { value: 300, cite: at(274) }, cite: at(279) },
    { id: `bite_${s.id}`, label: `Dead Hand bends down to bite ${tag(s)}`, pool: s.id, cite: at(327) },
    { id: `damage_${s.id}`, label: `Dead Hand reels from a wound ${tag(s)}`, pool: s.id, cite: at(446) },
    { id: `burrow_${s.id}`, label: `Dead Hand sinks into the ground in a wave of dirt ${tag(s)}`, pool: s.id, cite: at(405) },
    { id: `reel_${s.id}`, label: `Dead Hand reels, about to retreat ${tag(s)}`, pool: s.id, hittable: 'none', cite: at(510) },
    { id: `retreat_${s.id}`, label: `Dead Hand backs away ${tag(s)}`, pool: s.id, hittable: 'none', frames: { value: 70, cite: at(302) }, cite: at(510) },
  ]),
]

const steps: Step[] = [
  { from: 'wait_dormant', to: 'wait_stirring', label: 'A hand grabs Link and calls Dead Hand up', range: 'near', cite: `${HAND}:237` },
  { from: 'wait_stirring', to: 'walk_adult', label: 'Dead Hand is up (adult Link)', age: 'adult', cite: at(259) },
  { from: 'wait_stirring', to: 'walk_child', label: 'Dead Hand is up (child Link)', age: 'child', cite: at(259) },
  ...AGES.flatMap((s): Step[] => [
    { from: `wait_buried_${s.id}`, to: `wait_rising_${s.id}`, label: 'A hand grabs Link and calls Dead Hand up', range: 'near', cite: `${HAND}:237` },
    { from: `wait_rising_${s.id}`, to: `walk_${s.id}`, label: 'Dead Hand is up', cite: at(259) },
    { from: `walk_${s.id}`, to: `bite_${s.id}`, label: 'Link is within 100 units and Dead Hand bends to bite', range: 'near', cite: at(292) },
    { from: `walk_${s.id}`, to: `burrow_${s.id}`, label: 'Dead Hand gives up and burrows', afterTimer: true, cite: at(295) },
    { from: `bite_${s.id}`, to: `bite_${s.id}`, label: 'Dead Hand bites', range: 'near', attack: 'bite', cite: at(353) },
    { from: `bite_${s.id}`, to: `walk_${s.id}`, label: 'Link is out of reach and Dead Hand straightens up', range: 'far', cite: at(385) },
    { from: `damage_${s.id}`, to: `bite_${s.id}`, label: 'Dead Hand recovers next to Link and bends to bite', range: 'near', cite: at(458) },
    { from: `damage_${s.id}`, to: `walk_${s.id}`, label: 'Dead Hand recovers and shambles on', range: 'far', cite: at(461) },
    { from: `burrow_${s.id}`, to: `wait_buried_${s.id}`, label: 'The dirt wave catches Link', range: 'near', attack: 'dirt_wave', cite: at(431) },
    { from: `burrow_${s.id}`, to: `wait_buried_${s.id}`, label: 'Dead Hand is underground', range: 'far', cite: at(431) },
    { from: `reel_${s.id}`, to: `retreat_${s.id}`, label: 'Dead Hand turns away', cite: at(454) },
    { from: `retreat_${s.id}`, to: `burrow_${s.id}`, label: 'Dead Hand burrows', afterTimer: true, cite: at(311) },
  ]),
]

const attacks: Attack[] = [
  { id: 'bite', label: 'Dead Hand bite', damage: 8, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(353) },
  { id: 'dirt_wave', label: 'Dead Hand dirt wave', damage: 4, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(413) },
]

const wound: Record<string, string> = {}
for (const s of AGES) for (const p of ['walk', 'bite', 'damage', 'burrow']) wound[`${p}_${s.id}`] = `damage_${s.id}`

const reactions: Record<string, Reaction> = {
  '0x0': { damage: false, note: 'reaction 0 is skipped by the damage check', cite: at(512) },
  '0xF': { damage: true, to: wound, note: 'damage, then EnDh_SetupDamage; a wound across 15, 9, or 3 also sets retreat (the pool thresholds carry that)', cite: at(533) },
}

const pools: Pool[] = AGES.map((s) => ({
  id: s.id,
  label: `Dead Hand ${tag(s)}`,
  hp: { value: s.hp, cite: at(178) },
  then: 'defeated',
  thresholds: s.ats.map(([v, line]) => ({ at: v, to: { [`damage_${s.id}`]: `reel_${s.id}` }, cite: at(line) })),
}))

const off = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enDh: ActorSpec = {
  overlay: 'ovl_En_Dh',
  name: 'Dead Hand',
  role: 'enemy',
  summary:
    'A buried ghoul whose hands grab Link from the floor and call it up. It shambles toward him and bites for 8 with a knockback; its head is the only target. Each time a wound takes its health below 15, 9, or 3 it backs away and burrows with a damaging wave of dirt, and must be called up again.',
  cite: at(168),
  pools,
  damage: { kind: 'decomp', table: 'D_809EC620', reactions },
  phases,
  start: 'wait_dormant',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnDh_Wait: 'wait_*',
    EnDh_Walk: 'walk_*',
    EnDh_Attack: 'bite_*',
    EnDh_Damage: 'damage_*',
    EnDh_Retreat: 'retreat_*',
    EnDh_Burrow: 'burrow_*',
    EnDh_Death: off('death animation and fade after the finishing blow; the encounter has already ended', 479),
    actionFunc: off('not an action function: the extractor matched the struct field that EnDh_SetupAction assigns', 165),
  },
  atSources: {
    [at(336)]: off('turns the bite off when Link leaves its reach mid-bite', 333),
    [at(337)]: off('turns the bite off when Link leaves its reach mid-bite', 333),
    [at(352)]: 'bite',
    [at(353)]: 'bite',
    [at(359)]: off('turns the bite off after it bounces off a shield', 355),
    [at(360)]: off('turns the bite off after it bounces off a shield', 355),
    [at(380)]: off('turns the bite off when the bite ends with Link out of reach', 377),
    [at(381)]: off('turns the bite off when the bite ends with Link out of reach', 377),
    [at(412)]: 'dirt_wave',
    [at(413)]: 'dirt_wave',
    [at(430)]: off('turns the dirt wave off when the burrow ends', 429),
    [at(515)]: off('turns the bite off when Dead Hand is wounded', 513),
    [at(516)]: off('turns the bite off when Dead Hand is wounded', 513),
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        [
          'deku_stick__damage_child', 'slash_kokiri__damage_child', 'slash_master__damage_adult', 'slash_giant__damage_adult',
          'spin_kokiri__damage_child', 'spin_giant__damage_adult', 'spin_master__damage_adult', 'jump_kokiri__damage_child',
          'jump_kokiri_self__damage_child', 'jump_giant__damage_adult', 'jump_giant_self__damage_adult', 'jump_master__damage_adult',
          'jump_master__damage_child', 'jump_master_self__damage_adult', 'hammer_jump__damage_adult',
        ].map((v) => [
          `hit_${v}`,
          "the reel is one beat (its animation length is not in the source) entered only by Link's own melee hit, and Dead Hand leaves it on that beat, so no later hit finds it",
        ]),
      ),
      retreat_adult_timer_clears: 'the retreat is left only when its timer runs out, so none is left to clear',
      retreat_child_timer_clears: 'as retreat_adult_timer_clears',
      damage_adult_step_2: 'a wound is always a melee hit, so Link is near on the beat Dead Hand recovers and the far step never fires',
      damage_child_step_2: 'as damage_adult_step_2',
    },
  },
}
