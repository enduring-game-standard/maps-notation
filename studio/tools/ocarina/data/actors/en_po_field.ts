import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Po_Field/z_en_po_field.c'
const at = (line: number): Cite => `${F}:${line}`

/** Deku Nut and Din's Fire are DMG_ENTRY(0, 0x0): with no damage and reaction 0 the hit is ignored. */
const IGNORED = { DEKU_NUT: { damage: 0, cite: at(747) }, MAGIC_FIRE: { damage: 0, cite: at(747) } }

/** `_c` phases belong to a spawn point whose Big Poe is already bottled: only small Poes rise there. */
const phases: Phase[] = [
  { id: 'wait', label: 'No Poe: waiting to rise near Link', hittable: 'none', frames: { value: 200, cite: at(214) }, cite: at(417) },
  { id: 'wait_c', label: 'No Poe: waiting to rise near Link (Big Poe already taken)', hittable: 'none', frames: { value: 200, cite: at(214) }, cite: at(417) },
  { id: 'appear_small', label: 'A Poe fades in', hittable: 'none', cite: at(461) },
  { id: 'appear_small_c', label: 'A Poe fades in', hittable: 'none', cite: at(461) },
  { id: 'appear_big', label: 'A Big Poe fades in', hittable: 'none', cite: at(461) },
  { id: 'circle', label: 'Poe circles Link, dropping flames', frames: { value: 600, cite: at(266) }, overrides: IGNORED, cite: at(485) },
  { id: 'circle_c', label: 'Poe circles Link, dropping flames', frames: { value: 600, cite: at(266) }, overrides: IGNORED, cite: at(485) },
  { id: 'flee', label: 'Big Poe flees', frames: { value: 2000, cite: at(280) }, overrides: IGNORED, cite: at(521) },
  { id: 'hurt_small', label: 'Poe recoils', hittable: 'none', cite: at(549) },
  { id: 'hurt_small_c', label: 'Poe recoils', hittable: 'none', cite: at(549) },
  { id: 'hurt_big', label: 'Big Poe recoils', hittable: 'none', cite: at(549) },
  { id: 'vanish', label: 'Poe vanishes, laughing', hittable: 'none', frames: { value: 16, cite: at(312) }, cite: at(607) },
  { id: 'vanish_c', label: 'Poe vanishes, laughing', hittable: 'none', frames: { value: 16, cite: at(312) }, cite: at(607) },
]

const steps: Step[] = [
  { from: 'wait', to: 'appear_big', label: 'A Big Poe rises', weight: 2, afterTimer: true, cite: at(437) },
  { from: 'wait', to: 'appear_small', label: 'A Poe rises', weight: 3, afterTimer: true, cite: at(442) },
  { from: 'wait_c', to: 'appear_small_c', label: 'A Poe rises', afterTimer: true, cite: at(434) },
  { from: 'appear_small', to: 'circle', label: 'Poe closes on Link', move: 'far', cite: at(468) },
  { from: 'appear_small_c', to: 'circle_c', label: 'Poe closes on Link', move: 'far', cite: at(468) },
  { from: 'appear_big', to: 'flee', label: 'Big Poe turns to flee', move: 'far', cite: at(466) },
  { from: 'circle', to: 'circle', label: 'Poe drops a flame on Link', range: 'near', attack: 'flame', cite: at(515) },
  { from: 'circle_c', to: 'circle_c', label: 'Poe drops a flame on Link', range: 'near', attack: 'flame', cite: at(515) },
  { from: 'circle', to: 'vanish', label: 'Poe tires of circling', afterTimer: true, cite: at(513) },
  { from: 'circle_c', to: 'vanish_c', label: 'Poe tires of circling', afterTimer: true, cite: at(513) },
  { from: 'flee', to: 'flee', label: 'Big Poe outruns Link', range: 'near', move: 'far', cite: at(536) },
  { from: 'flee', to: 'vanish', label: 'Big Poe gives up and vanishes', afterTimer: true, cite: at(542) },
  { from: 'hurt_small', to: 'circle', label: 'Poe resumes circling', cite: at(557) },
  { from: 'hurt_small_c', to: 'circle_c', label: 'Poe resumes circling', cite: at(557) },
  { from: 'hurt_big', to: 'flee', label: 'Big Poe flees again', cite: at(555) },
  { from: 'vanish', to: 'wait', label: 'Poe is gone', afterTimer: true, restore: { pool: 'body', to: 4, cite: at(219) }, cite: at(616) },
  { from: 'vanish_c', to: 'wait_c', label: 'Poe is gone', afterTimer: true, restore: { pool: 'body', to: 4, cite: at(219) }, cite: at(616) },
]

const attacks: Attack[] = [
  { id: 'flame', label: 'Poe lantern flame', damage: 4, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(97) },
]

const hurtTo = { circle: 'hurt_small', circle_c: 'hurt_small_c', flee: 'hurt_big' }
const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, to: hurtTo, note: 'any hit with damage recoils the Poe', cite: at(754) },
  '0x1': { damage: true, to: hurtTo, note: 'Boomerang and Hookshot: read the same as 0x0; TestForDamage does not tell reactions apart', cite: at(754) },
}

const soul = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enPoField: ActorSpec = {
  overlay: 'ovl_En_Po_Field',
  name: 'Hyrule Field Poe',
  role: 'enemy',
  summary:
    'A ghost that rises near Link in Hyrule Field. A Poe circles him dropping lantern flames that burn; a Big Poe (two in five, where its soul is not yet bottled) never attacks and flees. Either vanishes when its timer runs out and may rise again.',
  cite: at(169),
  pools: [{ id: 'body', label: 'Poe', hp: { value: 4, cite: at(106) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'wait',
  variants: [
    { id: 'big_poe_spot', label: 'Spawn point whose Big Poe is still out there', start: 'wait', cite: at(437) },
    { id: 'taken_spot', label: 'Spawn point whose Big Poe was already bottled', start: 'wait_c', cite: at(430) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnPoField_WaitForSpawn: 'wait*',
    EnPoField_Appear: 'appear_*',
    EnPoField_CirclePlayer: 'circle*',
    EnPoField_Flee: 'flee',
    EnPoField_Damage: 'hurt_*',
    EnPoField_Disappear: 'vanish*',
    EnPoField_Death: soul('death burst after the finishing blow; the encounter has already ended', 562),
    EnPoField_SoulIdle: soul('the soul falls after death; catching it in a bottle is not combat', 620),
    func_80AD587C: soul('the soul brightens after landing; not combat', 657),
    func_80AD58D4: soul('the soul waits to be bottled; not combat', 665),
    EnPoField_SoulDisappear: soul('the uncaught soul fades; not combat', 701),
    EnPoField_SoulInteract: soul('the bottling dialogue; not combat', 708),
  },
  atSources: { [at(97)]: 'flame' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      body_stands_again: 'the vanish restore stands the pool back up only if it had emptied, but an empty pool ends the fight first',
      wait_timer_clears: 'the Poe rises only when the wait runs out, and nothing can hit it while it waits, so no timer is left behind',
      wait_c_timer_clears: 'as wait_timer_clears',
      vanish_timer_clears: 'as wait_timer_clears: the vanish is left only when its timer runs out',
      vanish_c_timer_clears: 'as vanish_timer_clears',
      hit_deku_stick__flee: 'the Big Poe enters flee at far and moves back to far on the same beat Link closes in, so a melee or self-centered swing never finds it near',
      hit_hammer_swing__flee: 'as hit_deku_stick__flee',
      hit_slash_kokiri__flee: 'as hit_deku_stick__flee',
      hit_slash_master__flee: 'as hit_deku_stick__flee',
      hit_slash_giant__flee: 'as hit_deku_stick__flee',
      hit_spin_kokiri__flee: 'as hit_deku_stick__flee',
      hit_spin_giant__flee: 'as hit_deku_stick__flee',
      hit_spin_master__flee: 'as hit_deku_stick__flee',
      hit_jump_kokiri__flee: 'as hit_deku_stick__flee',
      hit_jump_kokiri_self__flee: 'as hit_deku_stick__flee',
      hit_jump_giant__flee: 'as hit_deku_stick__flee',
      hit_jump_giant_self__flee: 'as hit_deku_stick__flee',
      hit_jump_master__flee: 'as hit_deku_stick__flee',
      hit_jump_master_self__flee: 'as hit_deku_stick__flee',
      hit_hammer_jump__flee: 'as hit_deku_stick__flee',
    },
  },
}
