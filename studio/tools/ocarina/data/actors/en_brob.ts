import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Brob/z_en_brob.c'
const at = (line: number): Cite => `${F}:${line}`

export const enBrob: ActorSpec = {
  overlay: 'ovl_En_Brob',
  name: 'Flobbery Muscle Block',
  role: 'enemy',
  summary: 'An electrified pillar that rises from the floor when Link comes close and shocks him on contact. It has no health and cannot be killed. A boomerang stuns it back into the floor; a Kokiri Sword slash sets off its shock.',
  cite: at(35),
  pools: [],
  damage: {
    kind: 'custom',
    entries: {
      BOOMERANG: { damage: 0, to: 'stunned', cite: at(284) },
      SLASH_KOKIRI: { damage: 0, to: 'shock', cite: at(294) },
    },
  },
  phases: [
    { id: 'idle', label: 'Block waits in the floor', hittable: 'none', cite: at(305) },
    { id: 'idle_recover', label: 'Block recovers in the floor after a stun', hittable: 'none', frames: { value: 200, cite: at(118) }, cite: at(305) },
    { id: 'move_up', label: 'Block rises', hittable: 'none', cite: at(309) },
    { id: 'wobble', label: 'Block stands and wobbles', frames: { value: 1200, cite: at(133) }, cite: at(192) },
    { id: 'shock', label: 'Block crackles with lightning', cite: at(231) },
    { id: 'stunned', label: 'Block is stunned and sinks', hittable: 'none', cite: at(306) },
    { id: 'move_down', label: 'Block sinks into the floor', hittable: 'none', cite: at(305) },
  ],
  start: 'idle',
  range: 'far',
  steps: [
    { from: 'idle', to: 'move_up', label: 'Link comes close and the block rises', range: 'near', cite: at(168) },
    { from: 'idle_recover', to: 'move_up', label: 'Block recovers and rises at Link', range: 'near', afterTimer: true, cite: at(168) },
    { from: 'idle_recover', to: 'idle', label: 'Block recovers', range: 'far', afterTimer: true, cite: at(162) },
    { from: 'move_up', to: 'wobble', label: 'Block finishes rising', cite: at(179) },
    { from: 'move_up', to: 'wobble', label: 'Block rises into Link', range: 'near', attack: 'zap', cite: at(291) },
    { from: 'wobble', to: 'shock', label: 'Block shocks Link on contact', range: 'near', attack: 'zap', cite: at(294) },
    { from: 'wobble', to: 'move_down', label: 'Link is far and the block sinks', range: 'far', afterTimer: true, cite: at(201) },
    { from: 'shock', to: 'wobble', label: 'The lightning dies down', cite: at(264) },
    { from: 'shock', to: 'shock', label: 'Block shocks Link again', range: 'near', attack: 'zap', cite: at(294) },
    { from: 'stunned', to: 'idle_recover', label: 'Block finishes sinking, stunned', cite: at(207) },
    { from: 'move_down', to: 'idle', label: 'Block is back in the floor', cite: at(218) },
  ],
  attacks: [
    { id: 'zap', label: 'Electric touch', damage: 8, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(58) },
  ],
  actionFuncs: {
    EnBrob_Idle: 'idle*',
    EnBrob_MoveUp: 'move_up',
    EnBrob_Wobble: 'wobble',
    EnBrob_Shock: 'shock',
    EnBrob_Stunned: 'stunned',
    EnBrob_MoveDown: 'move_down',
  },
  atSources: {
    [at(58)]: 'zap',
  },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      idle_recover_timer_clears: 'both ways out of idle_recover wait for its timer and cover both ranges, and nothing can hit the block there, so it never leaves with beats left',
      link_hurt_overkill: 'the only damage is the 8-unit zap, and every kit\'s health and heal stays a multiple of 8, so a zap never finds Link already at zero',
      zap_lands_again: 'the shock lasts 20 frames, one beat, and wears off at the end of the beat it lands in, so no zap finds Link still shocked',
      link_helpless_shock: 'as zap_lands_again: the one-beat shock is gone before Link\'s next move',
    },
  },
}
