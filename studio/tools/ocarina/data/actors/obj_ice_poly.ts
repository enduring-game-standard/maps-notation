import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Obj_Ice_Poly/z_obj_ice_poly.c'
const at = (line: number): Cite => `${F}:${line}`

export const objIcePoly: ActorSpec = {
  overlay: 'ovl_Obj_Ice_Poly',
  name: 'Ice block',
  role: 'hazard',
  summary: 'A block of ice that encases a switch or Hookshot target. Touching it freezes Link without damage. A Fire Arrow or Din\'s Fire melts it away; other weapons bounce off its hard collider.',
  cite: at(126),
  pools: [],
  damage: {
    kind: 'custom',
    entries: {
      ARROW_FIRE: { damage: 0, to: 'melt', cite: at(135) },
      MAGIC_FIRE: { damage: 0, to: 'melt', cite: at(135) },
    },
  },
  phases: [
    { id: 'idle', label: 'The ice stands', cite: at(138) },
    { id: 'melt', label: 'The ice melts', hittable: 'none', frames: { value: 40, cite: at(181) }, cite: at(153) },
  ],
  start: 'idle',
  range: 'far',
  steps: [
    { from: 'idle', to: 'idle', label: 'Link touches the ice', range: 'near', attack: 'chill', cite: at(138) },
    { from: 'melt', to: 'defeated', label: 'The ice is gone', afterTimer: true, cite: at(191) },
  ],
  attacks: [
    { id: 'chill', label: 'Freezing ice', damage: 0, effect: { kind: 'freeze' }, blockable: false, dodgeable: true, source: at(55) },
  ],
  actionFuncs: {
    ObjIcePoly_Idle: 'idle',
    ObjIcePoly_Melt: 'melt',
  },
  atSources: { [at(55)]: 'chill' },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      melt_timer_clears: 'the ice leaves its melt only by the step that waits for the timer, and no hit lands on it, so the timer is always spent',
      miss_magic_fire: 'adult_dins carries exactly one cast of Din\'s Fire (12 magic), and that first cast always melts the ice, so no later cast finds the melting ice',
    },
  },
}
