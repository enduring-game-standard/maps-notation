import { DMG_TYPES } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Yukabyun/z_en_yukabyun.c'
const at = (line: number): Cite => `${F}:${line}`

/** Every type the collider accepts (0xFFCFFFFF: all but SHIELD and MIR_RAY) breaks the tile on contact. */
const breaks = Object.fromEntries(
  DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY').map((d) => [d, { damage: 0, to: 'defeated', cite: at(131) }]),
)

/**
 * The tile has no health: any AC hit, any AT hit, or a wall sends it to EnYukabyun_Break. Link starts at a quarter
 * heart so its single 4-unit strike can make him fall.
 */
export const enYukabyun: ActorSpec = {
  overlay: 'ovl_En_Yukabyun',
  name: 'Flying floor tile',
  role: 'enemy',
  summary:
    'A floor tile that waits a params-set delay, spins up into the air, then flies straight at where Link was. It deals 4 on contact and shatters on any contact: hitting Link, a raised shield, a wall, or any of Link\'s attacks. It has no health, so one hit of anything breaks it. While it lies dormant it registers no collider.',
  cite: at(72),
  pools: [],
  damage: { kind: 'custom', entries: breaks },
  phases: [
    { id: 'dormant', label: 'The tile lies in the floor', hittable: 'none', cite: at(145) },
    /** unk_150 climbs by 0xA0 a frame from 0 to 0x2000: 52 frames. */
    { id: 'rising', label: 'The tile spins up into the air', frames: { value: 52, cite: at(103) }, cite: at(100) },
    { id: 'flying', label: 'The tile flies at Link', cite: at(112) },
    { id: 'shattered', label: 'The tile has shattered', hittable: 'none', cite: at(124) },
  ],
  start: 'dormant',
  range: 'far',
  steps: [
    { from: 'dormant', to: 'rising', label: 'The tile lifts off', cite: at(96) },
    { from: 'rising', to: 'flying', label: 'The tile launches at Link', afterTimer: true, cite: at(106) },
    { from: 'flying', to: 'shattered', label: 'The tile strikes and shatters', attack: 'tile', cite: at(139) },
  ],
  attacks: [{ id: 'tile', label: 'Flying tile', damage: 4, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(56) }],
  actionFuncs: {
    func_80B43A94: 'dormant',
    func_80B43AD4: 'rising',
    func_80B43B6C: 'flying',
    EnYukabyun_Break: 'shattered',
  },
  atSources: { [at(56)]: 'tile' },
  loadouts: standardLoadouts(['child', 'adult'], 0.25),
  expected: {
    deadVerbs: {
      rising_timer_clears: 'rising is left only once its timer has run out, or by a hit that breaks the tile and ends the encounter, so no timer marks are ever left behind',
      link_hurt_overkill: 'the one strike deals 4, exactly the quarter heart Link starts with, and nothing else can hurt him, so no hit finds him already empty',
    },
  },
}
