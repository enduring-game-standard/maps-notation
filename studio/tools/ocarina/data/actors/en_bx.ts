import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bx/z_en_bx.c'
const at = (line: number): Cite => `${F}:${line}`

export const enBx: ActorSpec = {
  overlay: 'ovl_En_Bx',
  name: 'Electrified tentacle',
  role: 'hazard',
  summary:
    "A fixed electrified tentacle in Jabu-Jabu's belly. Touching it, or standing within 70 units, costs 4 and knocks Link back; its AT collider is electric. It has no health and no damage handling, so nothing Link does hurts it, and a sword strike on it shocks Link through the backlash. It is removed only when its switch flag is already set as the room loads.",
  cite: at(146),
  pools: [],
  damage: { kind: 'own' },
  backlash: { attack: 'backlash', cite: at(56) },
  phases: [
    { id: 'charged', label: 'The tentacle crackles', cite: at(207) },
  ],
  start: 'charged',
  range: 'far',
  steps: [
    { from: 'charged', to: 'charged', label: 'Link touches the tentacle', range: 'near', attack: 'zap', cite: at(153) },
  ],
  attacks: [
    { id: 'zap', label: 'Electric tentacle', damage: 4, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(55) },
    {
      id: 'backlash',
      label: 'Sword backlash',
      damage: 8,
      effect: { kind: 'shock' },
      blockable: false,
      dodgeable: false,
      source: at(55),
    },
  ],
  actionFuncs: {},
  states: {
    EnBx_Update: { phase: 'charged', cite: at(146) },
    switch_flag_set: { excluded: 'killed in Init when its switch flag is already set, before any fight', cite: at(118) },
    sparking: { excluded: 'unk_14C only spawns lightning effects and a sound for 20 frames after contact; the colliders run every frame regardless', cite: at(184) },
  },
  atSources: {
    [at(55)]: 'zap',
    [at(75)]: 'zap',
    /** Within 70 units without a collider hit, the same 4 and the same knockback land through damagePlayer: one contact. */
    [at(168)]: 'zap',
  },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      backlash_lands_again: 'the backlash resolves on Link\'s own hit, before any enemy step that beat, and the shock lasts 20 frames, one beat, wearing off at the end of the beat; a second backlash needs a second hit on a later beat',
      link_helpless_shock: 'the shock lasts 20 frames, one beat, and wears off at the end of the beat it lands, so it is spent before Link\'s next move',
    },
  },
}
