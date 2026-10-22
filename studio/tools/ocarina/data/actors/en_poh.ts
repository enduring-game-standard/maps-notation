import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Poh/z_en_poh.c'
const at = (line: number): Cite => `${F}:${line}`

/** Table entries of 0 damage and reaction 0: `func_80AE032C` reacts only when the reaction or the damage is nonzero. */
const NO_EFFECT: DmgType[] = ['DEKU_NUT', 'MAGIC_FIRE', 'MAGIC_ICE', 'MAGIC_LIGHT', 'SHIELD', 'MIR_RAY', 'UNKNOWN_1', 'UNBLOCKABLE', 'UNKNOWN_2']
const shrugs = Object.fromEntries(NO_EFFECT.map((d) => [d, { damage: 0, cite: at(884) }]))
/** The body cylinder takes hits only while fully visible (`lightColor.a == 255`) and AC_ON. */
const unhittable = { hittable: 'none' as const }

const phases: Phase[] = [
  { id: 'rise_wait', label: 'Poe waits, unseen, to rise', ...unhittable, cite: at(339) },
  { id: 'rise_up', label: 'Poe rises into view', ...unhittable, cite: at(345) },
  { id: 'hover_seen', label: 'Poe hovers, lantern lit', overrides: shrugs, frames: { value: [700, 999], cite: at(598) }, cite: at(513) },
  { id: 'damaged', label: 'Poe reels from a hit', ...unhittable, cite: at(319) },
  { id: 'flee', label: 'Poe flees from Link', overrides: shrugs, cite: at(715) },
  { id: 'vanish', label: 'Poe fades out', ...unhittable, frames: { value: 32, cite: at(372) }, cite: at(690) },
  { id: 'hover_unseen', label: 'Poe hovers, faded out', ...unhittable, frames: { value: [100, 149], cite: at(698) }, cite: at(915) },
  { id: 'appear', label: 'Poe fades back in', ...unhittable, frames: { value: 32, cite: at(708) }, cite: at(703) },
]

const steps: Step[] = [
  { from: 'rise_wait', to: 'rise_up', label: 'Poe notices Link and rises', range: 'near', cite: at(604) },
  { from: 'rise_up', to: 'hover_seen', label: 'Poe is up', cite: at(600) },
  { from: 'hover_seen', to: 'hover_seen', label: 'Poe swings its lantern', range: 'near', attack: 'lantern', cite: at(1017) },
  { from: 'hover_seen', to: 'vanish', label: 'Poe fades away', afterTimer: true, cite: at(913) },
  { from: 'damaged', to: 'flee', label: 'Poe turns to flee', cite: at(588) },
  { from: 'flee', to: 'hover_seen', label: 'Poe gets clear and settles', move: 'far', cite: at(726) },
  { from: 'vanish', to: 'hover_unseen', label: 'Poe is gone from sight', afterTimer: true, cite: at(699) },
  { from: 'hover_unseen', to: 'hover_unseen', label: 'Unseen Poe swings its lantern', range: 'near', attack: 'lantern', cite: at(1017) },
  { from: 'hover_unseen', to: 'appear', label: 'Poe starts to reappear', afterTimer: true, cite: at(918) },
  { from: 'appear', to: 'hover_seen', label: 'Poe is back in sight', afterTimer: true, cite: at(711) },
]

const attacks: Attack[] = [
  { id: 'lantern', label: 'Poe lantern swing', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(99) },
]

const struck = { hover_seen: 'damaged', flee: 'damaged' }
const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, to: struck, note: 'any hit with damage takes health and sends the Poe reeling (its zero-damage entries are overridden as no effect)', cite: at(891) },
  '0x1': { damage: true, to: struck, note: 'Boomerang and Hookshot: the code reads reaction 1 no differently from 0', cite: at(884) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enPoh: ActorSpec = {
  overlay: 'ovl_En_Poh',
  name: 'Poe',
  role: 'enemy',
  summary:
    'A lantern-carrying ghost with four health. It hovers near Link and swings its lantern, and it can only be hit while fully visible. Every so often it fades out, still swinging, and later fades back in. A hit sends it reeling and fleeing. The Composer Brothers Sharp and Flat fight the same way.',
  cite: at(202),
  pools: [{ id: 'body', label: 'Poe', hp: { value: 4, cite: at(122) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'rise_wait',
  variants: [
    { id: 'poe', label: 'Poe (params 0 or 1)', start: 'rise_wait', cite: at(250) },
    { id: 'composer', label: 'Composer Brother Sharp or Flat (params 2 or 3)', start: 'rise_up', cite: at(256) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    func_80ADEAC4: 'hover_*',
    EnPoh_Idle: 'hover_*',
    func_80ADEC9C: 'hover_*',
    func_80ADF5E0: 'hover_*',
    EnPoh_Attack: 'hover_*',
    func_80ADF574: 'hover_*',
    func_80ADEF38: 'rise_*',
    EnPoh_ComposerAppear: 'rise_up',
    EnPoh_Disappear: 'vanish',
    EnPoh_Appear: 'appear',
    func_80ADEECC: 'damaged',
    func_80ADF894: 'flee',
    func_80ADF15C: post('the Poe burns away after the finishing blow; the encounter has already ended', 655),
    EnPoh_Death: post('the lantern falls after the finishing blow; the encounter has already ended', 731),
    func_80ADFE28: post('the soul rises after death; no collider takes or deals damage', 771),
    func_80ADFE80: post('the soul waits to be bottled after death; only an OC cylinder for talking', 779),
    func_80AE009C: post('the soul fades out after death', 817),
    EnPoh_TalkRegular: post('bottling dialogue with the soul after death', 824),
    EnPoh_TalkComposer: post('Composer Brother dialogue after death', 853),
  },
  atSources: {
    [at(99)]: 'lantern',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      vanish_timer_clears: 'vanish cannot be hit and is left only once its timer runs out',
      hover_unseen_timer_clears: 'hover_unseen cannot be hit and is left only once its timer runs out',
      appear_timer_clears: 'appear cannot be hit and is left only once its timer runs out',
      link_hurt_overkill:
        'the lantern costs 8, or 4 in a kit with Double Defense; every kit\'s health and every heal (capped at the bar) is a multiple of 8, so Link\'s health always reaches exactly 0 with no damage left over',
    },
  },
}
