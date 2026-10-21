import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Haka_Sgami/z_bg_haka_sgami.c'
const at = (line: number): Cite => `${F}:${line}`

export const bgHakaSgami: ActorSpec = {
  overlay: 'ovl_Bg_Haka_Sgami',
  name: 'Spinning Scythe Trap',
  role: 'hazard',
  summary: 'A pair of scythe blades that spin forever around a post. The blades always cut; nothing Link carries can hurt them, since the trap has no AC collider.',
  cite: at(217),
  pools: [],
  damage: { kind: 'none' },
  phases: [{ id: 'spin', label: 'The scythes spin', cite: at(292) }],
  start: 'spin',
  range: 'far',
  steps: [{ from: 'spin', to: 'spin', label: 'A blade sweeps through Link', range: 'near', attack: 'scythe', cite: at(292) }],
  attacks: [
    { id: 'scythe', label: 'Scythe blade', damage: 4, effect: { kind: 'none' }, blockable: false, dodgeable: true, source: at(54) },
  ],
  actionFuncs: {
    BgHakaSgami_SetupSpin: { excluded: 'waits for the object to load before the first spin; no collider is set until BgHakaSgami_Spin', cite: at(208) },
    BgHakaSgami_Spin: 'spin',
  },
  atSources: {
    [at(54)]: 'scythe',
    [at(65)]: 'scythe',
    [at(76)]: 'scythe',
    [at(87)]: 'scythe',
  },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the only damage is the 4-unit blade (2 with Double Defense), and every kit starts and heals Link in multiples of 4, so a hit never finds less health left than it costs',
    },
  },
}
