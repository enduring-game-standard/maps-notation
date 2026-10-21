import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bili/z_en_bili.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

const phases: Phase[] = [
  { id: 'idle', label: 'Biri drifts', cite: at(314) },
  { id: 'approach', label: 'Biri drifts toward Link', cite: at(388) },
  { id: 'electrify', label: 'Biri crackles after touching Link', frames: { value: 10, cite: at(173) }, cite: at(341) },
  { id: 'ascend', label: 'Biri springs away upward', cite: at(372) },
  { id: 'flee', label: 'Biri floats away above Link', frames: { value: 96, cite: at(194) }, cite: at(403) },
  { id: 'knockback', label: 'Biri is knocked back by a seed', cite: at(415) },
  { id: 'stunned', label: 'Biri is stunned and sinks', frames: { value: 80, cite: at(232) }, cite: at(477) },
  { id: 'spawned', label: 'Biri pops out of a Bari', frames: { value: 25, cite: at(163) }, cite: at(331) },
]

const steps: Step[] = [
  { from: 'idle', to: 'approach', label: 'Biri notices Link', range: 'near', cite: at(327) },
  { from: 'approach', to: 'idle', label: 'Link is too far: the Biri drifts', range: 'far', cite: at(399) },
  { from: 'approach', to: 'electrify', label: 'Biri touches Link', range: 'near', attack: 'zap', cite: at(555) },
  { from: 'electrify', to: 'ascend', label: 'Biri stops crackling', afterTimer: true, cite: at(367) },
  { from: 'ascend', to: 'flee', label: 'Biri is up', cite: at(384) },
  { from: 'flee', to: 'idle', label: 'Biri settles', afterTimer: true, cite: at(411) },
  { from: 'knockback', to: 'idle', label: 'Biri stops sliding', cite: at(419) },
  { from: 'stunned', to: 'idle', label: 'Biri recovers', afterTimer: true, cite: at(485) },
  { from: 'spawned', to: 'idle', label: 'Biri settles', afterTimer: true, cite: at(337) },
]

const AWAKE = ['idle', 'approach', 'electrify', 'ascend', 'flee', 'knockback', 'spawned']
const all = (to: string, from: string[]) => Object.fromEntries(from.map((p) => [p, to]))

export const enBili: ActorSpec = {
  overlay: 'ovl_En_Bili',
  name: 'Biri',
  role: 'enemy',
  summary:
    'A small electric jellyfish with one health point. It drifts toward Link and shocks him on contact, then springs away and floats off. Any damaging hit kills it; a Deku Nut stuns it and a seed knocks it back.',
  cite: at(42),
  pools: [{ id: 'body', label: 'Biri', hp: { value: 1, cite: at(74) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      EN_BILI_DMG_REACT_NONE: { damage: true, note: 'a hit with damage sends it to EnBili_Damaged, which always ends in death; a hit with no damage does nothing', cite: at(540) },
      EN_BILI_DMG_REACT_STUN: { damage: true, to: all('stunned', AWAKE), note: 'a Deku Nut stuns it unless it is already stunned', cite: at(520) },
      EN_BILI_DMG_REACT_SLINGSHOT: { damage: true, to: all('knockback', [...AWAKE, 'stunned']), note: 'a seed knocks it back, from any phase', cite: at(538) },
      EN_BILI_DMG_REACT_SWORD_SLASH: { damage: true, note: 'every slash has damage, so it kills: the Biri electrifies and then dies', cite: at(526) },
      EN_BILI_DMG_REACT_FIRE: { damage: true, note: 'fire kills it after a two-frame damage flash', cite: at(533) },
      EN_BILI_DMG_REACT_ICE: { damage: true, note: 'ice kills it: it freezes, falls, and dies on landing', cite: at(536) },
    },
  },
  phases,
  start: 'idle',
  variants: [
    { id: 'normal', label: 'A Biri on its own', start: 'idle', cite: at(137) },
    { id: 'from_bari', label: 'A Biri split off a Bari', start: 'spawned', cite: at(139) },
  ],
  range: 'far',
  steps,
  attacks: [{ id: 'zap', label: 'Biri shock', damage: 8, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(65) }],
  actionFuncs: {
    EnBili_Idle: 'idle',
    EnBili_ApproachPlayer: 'approach',
    EnBili_Electrify: 'electrify',
    EnBili_AscendAway: 'ascend',
    EnBili_FleePlayer: 'flee',
    EnBili_SlingshotKnockback: 'knockback',
    EnBili_Stunned: 'stunned',
    EnBili_SpawnedByBari: 'spawned',
    EnBili_Damaged: post('reached only by a hit with damage, which empties its single health point; it always leads to EnBili_SetupDie', 432),
    EnBili_Frozen: post('reached only by ice, which deals 4 damage against 1 health; it ends in death on landing', 502),
    EnBili_Die: post('death effects and item drop after the finishing blow; the encounter has already ended', 447),
  },
  atSources: { [at(65)]: 'zap' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      hit_deku_nut__knockback: 'knockback is entered only by Link\'s own seed and left on that same beat, so no later hit finds it',
      hit_slingshot__knockback: 'as hit_deku_nut__knockback',
      body_empty_in_knockback: 'as hit_deku_nut__knockback: no damaging hit can land in knockback',
      zap_lands_again: 'the shock lasts 20 frames, one beat, and wears off at the end of the beat it lands, so the Biri never touches Link while he is still shocked',
      zap_lands_dd_again: 'as zap_lands_again',
      link_helpless_shock: 'the shock lasts one beat and wears off at the end of the beat it lands, before Link\'s next move, so he never loses a move to it',
      link_hurt_overkill: 'the shock is the only damage, and in every kit Link starts at 32 health and loses 8 (4 with Double Defense) per shock, so his health reaches exactly 0 and never has damage left over',
    },
  },
}
