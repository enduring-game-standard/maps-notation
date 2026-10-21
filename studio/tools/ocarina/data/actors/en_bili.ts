import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bili/z_en_bili.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * Reported gaps:
 * - EnBili_AscendAway ends when gBiriAscendAwayAnim finishes (z_en_bili.c:383-384). The animation's frame count is not in
 *   this checkout (assets/xml/objects/object_bl.xml:4 gives only an offset), so `ascend` has no timer and lasts one beat.
 * - A dead Biri crackling out its electrify still takes AC hits, and the collision system copies its backlash onto Link's
 *   weapon (src/code/z_collision_check.c:1732) though EnBili_CheckCollide skips a body at zero health (z_en_bili.c:510).
 *   `electrify_dying` carries that as zero-damage melee hits that still shock.
 * - Harness: a non-slash killing blow whose backlash drops Link to 0 still ends in "Link wins", since the pool empties
 *   (priority 92) before Link falls (89); in the code Link at 0 health dies (z_player.c:9146). A whole Deku Stick also
 *   takes the backlash in the model, though it breaks and returns before the check (z_player.c:9000, 9143).
 */
const MELEE: DmgType[] = ['DEKU_STICK', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER']

const phases: Phase[] = [
  { id: 'idle', label: 'Biri drifts', cite: at(314) },
  { id: 'approach', label: 'Biri drifts toward Link', cite: at(388) },
  { id: 'electrify', label: 'Biri crackles after touching Link', frames: { value: 10, cite: at(173) }, cite: at(341) },
  {
    id: 'electrify_dying',
    label: 'A slashed Biri crackles before it dies',
    frames: { value: 10, cite: at(173) },
    hittable: MELEE,
    overrides: Object.fromEntries(MELEE.map((d) => [d, { damage: 0, cite: at(510) }])),
    cite: at(526),
  },
  { id: 'ascend', label: 'Biri springs away upward', cite: at(372) },
  { id: 'flee', label: 'Biri floats away above Link', frames: { value: 96, cite: at(194) }, cite: at(403) },
  { id: 'knockback', label: 'Biri is knocked back by a seed', cite: at(415) },
  { id: 'stunned', label: 'Biri is stunned and sinks', backlashOff: at(233), frames: { value: 80, cite: at(232) }, cite: at(477) },
  { id: 'spawned', label: 'Biri pops out of a Bari', frames: { value: 25, cite: at(163) }, cite: at(331) },
]

const steps: Step[] = [
  { from: 'idle', to: 'approach', label: 'Biri notices Link', range: 'near', cite: at(327) },
  { from: 'idle', to: 'electrify', label: 'Biri drifts into Link', range: 'near', attack: 'zap', cite: at(555) },
  { from: 'approach', to: 'idle', label: 'Link is too far: the Biri drifts', range: 'far', cite: at(399) },
  { from: 'approach', to: 'electrify', label: 'Biri touches Link', range: 'near', attack: 'zap', cite: at(555) },
  { from: 'electrify', to: 'ascend', label: 'Biri stops crackling', afterTimer: true, cite: at(367) },
  { from: 'electrify', to: 'electrify', label: 'Biri shocks Link again', range: 'near', attack: 'zap', cite: at(555) },
  { from: 'electrify_dying', to: 'defeated', label: 'Biri stops crackling and dies', afterTimer: true, cite: at(365) },
  { from: 'electrify_dying', to: 'electrify_dying', label: 'The dying Biri shocks Link again', range: 'near', attack: 'zap', cite: at(555) },
  { from: 'ascend', to: 'flee', label: 'Biri is up', cite: at(384) },
  { from: 'flee', to: 'idle', label: 'Biri settles', afterTimer: true, cite: at(411) },
  { from: 'flee', to: 'electrify', label: 'Biri brushes Link as it floats', range: 'near', attack: 'zap', cite: at(555) },
  { from: 'knockback', to: 'idle', label: 'Biri stops sliding', cite: at(419) },
  { from: 'knockback', to: 'electrify', label: 'Biri slides into Link', range: 'near', attack: 'zap', cite: at(555) },
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
      EN_BILI_DMG_REACT_SWORD_SLASH: {
        damage: false,
        to: { ...all('electrify_dying', AWAKE), stunned: 'defeated' },
        note: 'every slash has damage against 1 health, so it kills: awake, the Biri electrifies with its contact still live and dies when that ends; stunned, it goes to EnBili_Damaged and dies. The kill is the move, so the table damage is not drained',
        cite: at(526),
      },
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
  attacks: [{ id: 'zap', label: 'Biri shock', damage: 8, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(65) },
    { id: 'backlash', label: 'Shock from striking the Biri', damage: 8, effect: { kind: 'shock' }, blockable: false, dodgeable: false, source: at(65) },
  ],
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
  backlash: { attack: 'backlash', cite: at(66) },
  atSources: { [at(65)]: 'zap' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      hit_deku_nut__knockback: 'knockback is entered only by Link\'s own seed and left on that same beat, so no later hit finds it',
      hit_slingshot__knockback: 'as hit_deku_nut__knockback',
      body_empty_in_knockback: 'as hit_deku_nut__knockback: no damaging hit can land in knockback',
      hit_slash_kokiri__knockback: 'as hit_deku_nut__knockback',
      hit_slash_kokiri__spawned: 'spawned lasts 25 frames, one beat, and the from_bari variant starts with Link far; the beat he spends closing in is the beat it ends, and a slash needs near',
      hit_slash_master__spawned: 'as hit_slash_kokiri__spawned',
      hit_slash_giant__spawned: 'as hit_slash_kokiri__spawned',
      electrify_dying_timer_clears: 'electrify_dying lasts 10 frames, one beat, takes no hit that moves it, and is left only to itself or to defeat once the timer runs out, so no timer is ever left behind',
      backlash_lands_again: 'the backlash resolves on Link\'s own hit, before any enemy step that beat, and the shock wears off at the end of the beat; a second backlash needs a second hit on a later beat',
      backlash_lands_dd_again: 'as backlash_lands_again',
      link_helpless_shock: 'the shock lasts one beat and wears off at the end of the beat it lands, before Link\'s next move, so he never loses a move to it',
      link_hurt_overkill: 'the shock is the only damage, and in every kit Link starts at 32 health and loses 8 (4 with Double Defense) per shock, so his health reaches exactly 0 and never has damage left over',
    },
  },
}
