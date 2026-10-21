import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Karebaba/z_en_karebaba.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/** DMG_DEFAULT, the body collider's flags while it is buried, rising, or retracting. */
const DEFAULT = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
/** DMG_SWORD | DMG_BOOMERANG, the body collider's flags while it stands. */
const STANDING: DmgType[] = [
  'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_MASTER', 'SPIN_GIANT',
  'JUMP_KOKIRI', 'JUMP_MASTER', 'JUMP_GIANT', 'BOOMERANG',
]

export const enKarebaba: ActorSpec = {
  overlay: 'ovl_En_Karebaba',
  name: 'Withered Deku Baba',
  role: 'enemy',
  summary:
    'A Deku Baba head on a stalk. Buried, it is a hard bud that shrugs off every hit. When Link comes close it rises, stands, and swings its head around in a circle. Standing, any sword or boomerang hit kills it outright.',
  cite: at(4),
  pools: [{ id: 'body', label: 'Withered Deku Baba', hp: { value: 1, cite: at(97) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(1)',
    reactions: Object.fromEntries(
      ['0x0', '0x1', '0x2', '0xE', '0xF'].map((r) => [
        r,
        { damage: false, to: { upright: 'defeated', spin: 'defeated' }, note: 'any hit that reaches the standing body kills it on AC_HIT; the code never applies table damage', cite: at(280) },
      ]),
    ),
  },
  phases: [
    { id: 'grow', label: 'Withered Deku Baba sprouts', hittable: 'none', frames: { value: 20, cite: at(244) }, cite: at(441) },
    { id: 'idle', label: 'Withered Deku Baba lies buried', guards: DEFAULT, cite: at(140) },
    { id: 'awaken', label: 'Withered Deku Baba rises', guards: DEFAULT, cite: at(259) },
    { id: 'upright', label: 'Withered Deku Baba stands', hittable: STANDING, frames: { value: 40, cite: at(178) }, cite: at(172) },
    { id: 'spin', label: 'Withered Deku Baba swings its head around', hittable: STANDING, frames: { value: 40, cite: at(183) }, cite: at(310) },
    { id: 'retract', label: 'Withered Deku Baba sinks back', guards: DEFAULT, cite: at(214) },
  ],
  start: 'idle',
  variants: [
    { id: 'sprout', label: 'Withered Deku Baba that sprouts as Link arrives (params 0)', start: 'grow', cite: at(123) },
    { id: 'buried', label: 'Withered Deku Baba already in the ground', start: 'idle', cite: at(125) },
  ],
  range: 'far',
  steps: [
    { from: 'grow', to: 'idle', label: 'Withered Deku Baba finishes sprouting', afterTimer: true, cite: at(245) },
    { from: 'idle', to: 'awaken', label: 'Withered Deku Baba senses Link', range: 'near', cite: at(251) },
    { from: 'awaken', to: 'upright', label: 'Withered Deku Baba stands up', cite: at(260) },
    { from: 'upright', to: 'spin', label: 'Withered Deku Baba starts to swing', range: 'near', afterTimer: true, cite: at(285) },
    { from: 'upright', to: 'retract', label: 'Link is too far; Withered Deku Baba retracts', range: 'far', cite: at(283) },
    { from: 'upright', to: 'upright', label: 'Withered Deku Baba bites Link', range: 'near', attack: 'bite', cite: at(442) },
    { from: 'spin', to: 'upright', label: 'Withered Deku Baba stops swinging', afterTimer: true, cite: at(324) },
    { from: 'spin', to: 'spin', label: 'Withered Deku Baba strikes Link with its swinging head', range: 'near', attack: 'bite', cite: at(442) },
    { from: 'retract', to: 'idle', label: 'Withered Deku Baba is buried again', cite: at(388) },
  ],
  attacks: [
    { id: 'bite', label: 'Withered Deku Baba head', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(88) },
  ],
  actionFuncs: {
    EnKarebaba_Grow: 'grow',
    EnKarebaba_Idle: 'idle',
    EnKarebaba_Awaken: 'awaken',
    EnKarebaba_Upright: 'upright',
    EnKarebaba_Spin: 'spin',
    EnKarebaba_Retract: 'retract',
    EnKarebaba_Dying: post('falls over after the finishing blow; the encounter has already ended', 195),
    EnKarebaba_DeadItemDrop: post('Deku Stick drop after death; drops are out of scope', 378),
    EnKarebaba_Dead: post('waits as a dead stalk after the finishing blow', 226),
    EnKarebaba_Regrow: post('regrows 200 frames after death, past the end of the encounter', 418),
  },
  atSources: {
    [at(88)]: 'bite',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      grow_timer_clears: 'sprouting lasts one beat and nothing can hit it, so it always leaves by its timer',
      spin_timer_clears: 'the swing leaves only by its timer; a hit during it ends the encounter',
      body_hurt: 'a hit kills it on AC_HIT alone and the code never subtracts health (z_en_karebaba.c:279), so the health pool is never drained',
      body_overkill: 'as body_hurt',
      link_hurt_overkill: 'its only attack costs 8, or 4 with Double Defense, and every kit starts at 32 health, so no hit finds Link with less health than it takes',
    },
  },
}
