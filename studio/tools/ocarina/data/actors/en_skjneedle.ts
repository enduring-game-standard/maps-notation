import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Skjneedle/z_en_skjneedle.c'
const at = (line: number): Cite => `${F}:${line}`
const SKJ = 'src/overlays/actors/ovl_En_Skj/z_en_skj.c'

/**
 * One needle is one strike: it dies on its first AT contact, shield included, or when its 100-frame life runs out.
 * Link starts at half a heart so the single 8-unit strike can make him fall.
 */
export const enSkjneedle: ActorSpec = {
  overlay: 'ovl_En_Skjneedle',
  name: "Skull Kid's needle",
  role: 'projectile',
  summary:
    'A needle Skull Kid shoots at 24 units a frame with a 100-frame life. It deals 8 on contact and vanishes on any AT contact, a raised shield included. Its collider is registered only for AT and OC, never AC, so Link cannot hit it.',
  cite: `${SKJ}:535`,
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'flying', label: 'The needle flies at Link', cite: at(101) },
    { id: 'spent', label: 'The needle is gone', hittable: 'none', cite: at(97) },
  ],
  start: 'flying',
  range: 'far',
  steps: [{ from: 'flying', to: 'spent', label: 'The needle reaches Link and breaks', attack: 'needle', cite: at(96) }],
  attacks: [{ id: 'needle', label: 'Needle', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(49) }],
  actionFuncs: {},
  states: {
    flying: { phase: 'flying', cite: at(101) },
    killed: { phase: 'spent', cite: at(97) },
  },
  atSources: { [at(49)]: 'needle' },
  loadouts: standardLoadouts(['adult'], 0.5),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the one strike deals 8, exactly the half heart Link starts with, and nothing else can hurt him, so no hit ever finds him already empty',
      fairy_revives_link: 'the only adult kit with a fairy also has Double Defense, which halves the single strike to 4, so Link never reaches zero there',
    },
  },
}
