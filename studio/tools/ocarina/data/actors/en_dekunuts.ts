import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Dekunuts/z_en_dekunuts.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/** The body collider accepts 0xFFCFFFFF: every type but DMG_SHIELD and DMG_MIR_RAY. */
const ACCEPTED = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
/** While planted (MASS_IMMOVABLE), any hit that connects only makes it pop out and run; the damage table is not read. */
const startsRun = (types: readonly DmgType[], line: number): Phase['overrides'] =>
  Object.fromEntries(types.map((d) => [d, { damage: 0, to: 'begin_run', cite: at(line) }]))
const planted = startsRun(ACCEPTED, 474)
/** The Megaton Hammer's ground quake (actorCtx.unk_02) pops a planted scrub out even while it is under ground. */
const quake = startsRun(['HAMMER_SWING', 'HAMMER_JUMP'], 476)

/** runAwayCount: set to 3 when it starts running, one less each time it stops to gasp, and at 0 it runs home. */
const COUNTS = [3, 2, 1, 0] as const
const below = (c: number) => Math.max(c - 1, 0)

const phases: Phase[] = [
  { id: 'wait_hidden', label: 'Scrub waits under its flower', hittable: ['HAMMER_SWING', 'HAMMER_JUMP'], overrides: quake, cite: at(156) },
  { id: 'wait_rising', label: 'Scrub pops up', overrides: planted, cite: at(258) },
  { id: 'stand', label: 'Scrub stands and faces Link', overrides: planted, cite: at(292) },
  { id: 'throw', label: 'Scrub spits a nut', overrides: planted, cite: at(311) },
  { id: 'look_around', label: 'Scrub looks around', overrides: planted, cite: at(282) },
  { id: 'burrow', label: 'Scrub ducks back under', overrides: planted, cite: at(333) },
  { id: 'begin_run', label: 'Scrub jumps out of its flower', hittable: 'none', cite: at(193) },
  ...COUNTS.map((c): Phase => ({ id: `run_${c}`, label: c ? `Scrub runs away (${c} gasps left)` : 'Scrub runs home', cite: at(201) })),
  ...COUNTS.filter((c) => c < 3).map((c): Phase => ({ id: `gasp_${c}`, label: `Scrub stops to gasp (${c} left)`, cite: at(402) })),
  ...COUNTS.map((c): Phase => ({ id: `stunned_${c}`, label: `Scrub is stunned (${c} gasps left)`, cite: at(419) })),
]

const steps: Step[] = [
  { from: 'wait_hidden', to: 'wait_rising', label: 'Scrub pops up at Link', range: 'far', cite: at(278) },
  { from: 'wait_rising', to: 'burrow', label: 'Link is close: the scrub ducks', range: 'near', cite: at(265) },
  { from: 'wait_rising', to: 'stand', label: 'Scrub stands to face Link', range: 'far', cite: at(272) },
  { from: 'wait_rising', to: 'look_around', label: 'Link is far off: the scrub looks around', range: 'far', cite: at(270) },
  { from: 'stand', to: 'throw', label: 'Scrub takes aim', range: 'far', cite: at(304) },
  { from: 'stand', to: 'burrow', label: 'Link is close: the scrub ducks', range: 'near', cite: at(302) },
  { from: 'throw', to: 'stand', label: 'The nut flies (it is En_Nutsball, a separate actor)', cite: at(316) },
  { from: 'look_around', to: 'burrow', label: 'Scrub gives up and ducks', cite: at(288) },
  { from: 'burrow', to: 'wait_hidden', label: 'Scrub is under', cite: at(335) },
  { from: 'begin_run', to: 'run_3', label: 'Scrub starts to run', cite: at(350) },
  ...COUNTS.filter((c) => c > 0).map((c): Step => ({ from: `run_${c}`, to: `gasp_${below(c)}`, label: 'Scrub runs out of breath', cite: at(398) })),
  { from: 'run_0', to: 'gasp_0', label: 'Scrub runs out of breath before it is home', cite: at(398) },
  { from: 'run_0', to: 'burrow', label: 'Scrub reaches its flower and ducks', cite: at(396) },
  ...COUNTS.filter((c) => c < 3).map((c): Step => ({ from: `gasp_${c}`, to: `run_${c}`, label: 'Scrub runs again', cite: at(408) })),
  ...COUNTS.map((c): Step => ({ from: `stunned_${c}`, to: `run_${c}`, label: 'Scrub comes to and runs', cite: at(426) })),
]

const stunTo: Record<string, string> = {}
for (const c of COUNTS) stunTo[`run_${c}`] = `stunned_${c}`
for (const c of COUNTS.filter((x) => x < 3)) stunTo[`gasp_${c}`] = `stunned_${c}`

const MELEE = [
  'deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master',
  'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump',
]
const RANGED = ['slingshot', 'explosive', 'boomerang', 'arrow_normal', 'hookshot', 'arrow_fire', 'arrow_ice', 'arrow_light']
const noAttack = 'the scrub has no attack in this spec (its nuts are En_Nutsball, a separate actor whose collider is not in this inventory entry), so Link never loses health'
const deadVerbs: Record<string, string> = {
  link_hurt: noAttack,
  link_hurt_overkill: noAttack,
  link_heals: `${noAttack}, and healing only follows the fairy reviving him`,
  fairy_revives_link: noAttack,
  link_fell: noAttack,
  ...Object.fromEntries(COUNTS.map((c) => [`body_empty_in_stunned_${c}`, 'stunned has no timer (it counts loops of gDekuNutsDamageAnim, whose length is not in the decomp source), so it is entered only by Link\'s own Deku Nut and left on that same beat; no damaging hit finds it'])),
  ...Object.fromEntries(MELEE.flatMap((k) => ['wait_rising', 'throw', 'look_around'].map((p) => [`hit_${k}__${p}`, `${p} is entered only while Link is far and is left on the next enemy step whatever Link does, so the move that brings him near for a melee swing is spent before he can swing`]))),
  ...Object.fromEntries([...MELEE, ...RANGED].map((k) => [`miss_${k}__begin_run`, 'begin_run is entered only by Link\'s own hit and left on that same beat, so no later hit finds it'])),
}

export const enDekunuts: ActorSpec = {
  overlay: 'ovl_En_Dekunuts',
  name: 'Mad Deku Scrub',
  role: 'enemy',
  summary:
    'A scrub planted in a flower that pops up and spits nuts. While planted, any hit only drives it out to run; once running, any damaging hit kills it and a Deku Nut stuns it. Its nuts are a separate actor (En_Nutsball) and are not attacks of this spec.',
  cite: at(123),
  pools: [{ id: 'body', label: 'Mad Deku Scrub', hp: { value: 1, cite: at(75) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      '0x0': { damage: true, note: 'once out of its flower, a hit with damage sends it to BeDamaged, which always ends in death; a hit with no damage does nothing', cite: at(465) },
      '0x1': { damage: true, to: stunTo, note: 'a Deku Nut stuns a running scrub unless it is already stunned', cite: at(470) },
      '0x2': { damage: true, note: 'fire burns it, then the same BeDamaged path kills it', cite: at(463) },
    },
  },
  phases,
  start: 'wait_hidden',
  range: 'far',
  steps,
  attacks: [],
  actionFuncs: {
    EnDekunuts_Wait: 'wait_*',
    EnDekunuts_Stand: 'stand',
    EnDekunuts_ThrowNut: 'throw',
    EnDekunuts_LookAround: 'look_around',
    EnDekunuts_Burrow: 'burrow',
    EnDekunuts_BeginRun: 'begin_run',
    EnDekunuts_Run: 'run_*',
    EnDekunuts_Gasp: 'gasp_*',
    EnDekunuts_BeStunned: 'stunned_*',
    EnDekunuts_BeDamaged: post('hit reaction after the killing hit; it always leads to EnDekunuts_SetupDie, so the encounter has already ended', 415),
    EnDekunuts_Die: post('death effects and item drop after the finishing blow; the encounter has already ended', 446),
  },
  atSources: {},
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
