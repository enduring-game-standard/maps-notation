import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Haka_Tubo/z_bg_haka_tubo.c'
const at = (line: number): Cite => `${F}:${line}`

export const bgHakaTubo: ActorSpec = {
  overlay: 'ovl_Bg_Haka_Tubo',
  name: 'Giant Skull Jar',
  role: 'hazard',
  summary: "Shadow Temple's giant skull jar, ringed by blue flame that burns Link. A bomb that blows up inside the jar breaks it; nothing else does.",
  cite: at(119),
  pools: [],
  damage: {
    kind: 'custom',
    entries: { EXPLOSIVE: { damage: 0, to: 'defeated', cite: at(138) } },
  },
  phases: [{ id: 'idle', label: 'The jar stands in its ring of flame', cite: at(119) }],
  start: 'idle',
  range: 'far',
  steps: [{ from: 'idle', to: 'idle', label: 'The flame ring burns Link', range: 'near', attack: 'flames', cite: at(155) }],
  attacks: [
    { id: 'flames', label: 'Flame ring', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(78) },
  ],
  actionFuncs: {
    BgHakaTubo_Idle: 'idle',
    BgHakaTubo_DropCollectible: { excluded: 'runs after the jar breaks: a five-frame delay, then an item drop or a Keese, then Actor_Kill; drops are out of scope', cite: at(167) },
  },
  atSources: { [at(78)]: 'flames' },
  loadouts: standardLoadouts(['adult']),
}
