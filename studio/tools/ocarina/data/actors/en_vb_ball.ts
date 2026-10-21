import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Vb_Ball/z_en_vb_ball.c'
const at = (line: number): Cite => `${F}:${line}`
const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * Update sets AT every frame (line 304) but never calls CollisionCheck_SetAC, so nothing of Link's connects.
 * A rock (params 100) splits on landing into two params 101 rocks (line 229), which split again into params 102
 * rocks that crumble on landing (line 294). Each generation lands where the last one did, give or take a few units
 * (spawn offsets of 13 and 10 units, lines 218-224), so each lands near Link exactly when the one before it did.
 */
const phases: Phase[] = [
  { id: 'falling', label: 'A rock falls from the ceiling', hittable: 'none', cite: at(81) },
  { id: 'shards', label: 'Two pieces bounce out of the landing', hittable: 'none', cite: at(226) },
  { id: 'pebbles', label: 'The pieces split once more', hittable: 'none', cite: at(226) },
  { id: 'gone', label: 'The rock has crumbled away', hittable: 'none', cite: at(294) },
]

const steps: Step[] = [
  { from: 'falling', to: 'shards', label: 'The rock lands on Link', range: 'near', attack: 'rock', cite: at(304) },
  { from: 'falling', to: 'shards', label: 'The rock lands away from Link and splits', range: 'far', cite: at(203) },
  { from: 'shards', to: 'pebbles', label: 'A piece bounces into Link', range: 'near', attack: 'rock', cite: at(304) },
  { from: 'shards', to: 'pebbles', label: 'The pieces land and split', range: 'far', cite: at(203) },
  { from: 'pebbles', to: 'gone', label: 'A last piece bounces into Link', range: 'near', attack: 'rock', cite: at(304) },
  { from: 'pebbles', to: 'gone', label: 'The last pieces land and crumble', range: 'far', cite: at(294) },
]

export const enVbBall: ActorSpec = {
  overlay: 'ovl_En_Vb_Ball',
  name: "Volvagia's falling rock",
  role: 'projectile',
  summary:
    'A rock Volvagia brings down from the ceiling of her lair. It falls where she is, splits into two pieces when it lands, and those split once more before crumbling. Every piece hurts Link if it lands on him. Link cannot break or deflect it.',
  cite: at(78),
  pools: [],
  damage: { kind: 'none' },
  phases,
  start: 'falling',
  range: 'far',
  steps,
  attacks: [{ id: 'rock', label: 'Falling rock', damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(55) }],
  actionFuncs: {},
  states: {
    'params 100 (rock)': { phase: 'falling', cite: at(202) },
    'params 101 (piece)': { phase: 'shards', cite: at(229) },
    'params 102 (last piece)': { phase: 'pebbles', cite: at(294) },
    'params >= 200 (bones)': ex("Volvagia's bones falling apart after her death: no collider is initialized for these params, only gravity and bounces", 70),
  },
  atSources: { [at(55)]: 'rock' },
  /** A rock costs exactly 2 hearts, so with 2 Link could only ever block a rock he was already near, which he cannot be before it first lands; 3 hearts let him survive one and still fall to a second. */
  loadouts: standardLoadouts(['adult'], 3),
}
