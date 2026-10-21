import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bdfire/z_en_bdfire.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * One flame segment burns Link at most once: the burn check is skipped while he is already burning. It has no
 * collider, so its harm is code, not an AT element: a distance check that sets Link alight and knocks him down for 8.
 */
export const enBdfire: ActorSpec = {
  overlay: 'ovl_En_Bdfire',
  name: "King Dodongo's fire breath",
  role: 'projectile',
  summary:
    "One segment of King Dodongo's fire breath, moving at 30 units a frame and turning at the arena walls, alive for 25 frames less 0.8 per segment index. If Link is within its burn radius and not already burning, it sets him on fire and knocks him down for 8. It has no collider: no shield stops it and Link cannot hit it.",
  cite: 'src/overlays/actors/ovl_Boss_Dodongo/z_boss_dodongo.c:1258',
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'breath', label: 'The flame rolls toward Link', cite: at(136) },
    { id: 'spent', label: 'The flame has died out', hittable: 'none', cite: at(175) },
  ],
  start: 'breath',
  range: 'far',
  steps: [{ from: 'breath', to: 'spent', label: 'The flame washes over Link', attack: 'flame', cite: at(181) }],
  attacks: [{ id: 'flame', label: 'Fire breath', damage: 8, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(188) }],
  actionFuncs: {
    actionFunc: { excluded: 'not a function: the extractor read the parameter name of EnBdfire_SetupAction', cite: at(49) },
    func_809BC2A4: {
      excluded: "params < 0 is the light at King Dodongo's mouth: it tracks firePos and fades, with no collider and no burn check",
      cite: at(63),
    },
    func_809BC598: 'breath',
  },
  atSources: { [at(188)]: 'flame' },
  loadouts: standardLoadouts(['child'], 1),
  expected: {
    deadVerbs: {
      flame_lands_again: 'one flame segment strikes at most once, so it never finds Link still burning from an earlier strike (and the code skips the burn check while he burns, line 178)',
    },
  },
}
