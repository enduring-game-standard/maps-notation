import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Attack_Niw/z_en_attack_niw.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * One cucco of the swarm. It has no collider: its harm is code, a 20-unit distance check that knocks Link down for 16
 * and starts a 70-frame cooldown on the parent En_Niw. Its 100-frame chase outlasts at most one peck, since the
 * cooldown (4 beats) runs past the end of the chase (5 beats) whenever the peck lands.
 */
export const enAttackNiw: ActorSpec = {
  overlay: 'ovl_En_Attack_Niw',
  name: 'Angry cucco',
  role: 'enemy',
  summary:
    'One cucco of the swarm an abused cucco calls down. It swoops in from the camera, lands, hops after Link for 100 frames, then flies off and vanishes once off screen. Within 20 units it knocks Link down for 16, at most once per 70 frames across the whole swarm. It has no collider and no health: no shield stops it and Link cannot hit it.',
  cite: 'src/overlays/actors/ovl_En_Niw/z_en_niw.c:386',
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'swoop', label: 'The cucco swoops down', cite: at(195) },
    { id: 'chase', label: 'The cucco hops after Link', frames: { value: 100, cite: at(274) }, cite: at(258) },
    { id: 'cooldown', label: 'The swarm waits before the next peck', frames: { value: 70, cite: at(385) }, cite: at(385) },
    { id: 'flies_off', label: 'The cucco flies off', hittable: 'none', cite: at(299) },
  ],
  start: 'swoop',
  range: 'far',
  steps: [
    { from: 'swoop', to: 'chase', label: 'The cucco lands', cite: at(249) },
    { from: 'chase', to: 'chase', label: 'The cucco hops up to Link', range: 'far', move: 'near', cite: at(272) },
    { from: 'chase', to: 'cooldown', label: 'The cucco pecks', range: 'near', attack: 'peck', cite: at(384) },
    { from: 'chase', to: 'flies_off', label: 'The cucco gives up and flies off', afterTimer: true, cite: at(291) },
    { from: 'cooldown', to: 'flies_off', label: 'The cucco flies off', afterTimer: true, cite: at(291) },
  ],
  attacks: [{ id: 'peck', label: 'Cucco attack', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(384) }],
  actionFuncs: {
    func_809B5670: 'swoop',
    func_809B59B0: 'chase',
    func_809B5C18: 'flies_off',
  },
  atSources: { [at(384)]: 'peck' },
  loadouts: standardLoadouts(['child', 'adult'], 1),
  expected: {
    deadVerbs: {
      cooldown_timer_clears: 'cooldown is left only once its timer has run out, so no timer marks are ever left behind',
      link_hurt_overkill: 'the one peck deals 16, exactly the heart Link starts with, and nothing else can hurt him, so no hit finds him already empty',
    },
  },
}
