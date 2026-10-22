import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Brob/z_en_brob.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Reported gaps:
 * - EnBrob_Shock counts its 10-tick timer down once per loop of gBrobShockAnim (z_en_brob.c:238-239). The animation's
 *   length is not in this checkout (assets/xml/objects/object_brob.xml:35 gives only an offset), so `shock` carries the
 *   10 ticks as 10 frames, a lower bound of one beat.
 * - A contact while the block rises does not change its action; it knocks Link back with no damage on top of the
 *   collider's shock (z_en_brob.c:289-291). The step carries the shock and drops the knockback.
 * - Standing on the sunken block knocks Link off with no damage as it rises (z_en_brob.c:164-166); range bands do not
 *   express standing on top, so that knockback is dropped.
 */

export const enBrob: ActorSpec = {
  overlay: 'ovl_En_Brob',
  name: 'Flobbery Muscle Block',
  role: 'enemy',
  summary: 'An electrified pillar that rises from the floor when Link comes close and shocks him on contact. It has no health and cannot be killed. A boomerang stuns it back into the floor; a Kokiri Sword slash sets off its shock. Every melee weapon hit on the standing block also shocks Link through its electric backlash.',
  cite: at(35),
  pools: [],
  backlash: { attack: 'backlash', cite: at(59) },
  damage: {
    kind: 'custom',
    entries: {
      BOOMERANG: { damage: 0, to: 'stunned', cite: at(284) },
      SLASH_KOKIRI: { damage: 0, to: 'crackle', cite: at(294) },
    },
  },
  phases: [
    { id: 'idle', label: 'Block waits in the floor', hittable: 'none', cite: at(305) },
    { id: 'idle_recover', label: 'Block recovers in the floor after a stun', hittable: 'none', frames: { value: 200, cite: at(118) }, cite: at(305) },
    { id: 'move_up', label: 'Block rises', hittable: 'none', cite: at(309) },
    { id: 'wobble', label: 'Block stands and wobbles', frames: { value: 1200, cite: at(133) }, cite: at(192) },
    { id: 'crackle', label: 'Block crackles with lightning', frames: { value: 10, cite: at(154) }, cite: at(231) },
    { id: 'stunned', label: 'Block is stunned and sinks', hittable: 'none', cite: at(306) },
    { id: 'move_down', label: 'Block sinks into the floor', hittable: 'none', cite: at(305) },
  ],
  start: 'idle',
  range: 'far',
  steps: [
    { from: 'idle', to: 'move_up', label: 'Link comes within 300 and the block rises', range: 'near', cite: at(168) },
    { from: 'idle_recover', to: 'move_up', label: 'Block recovers and rises at Link within 300', range: 'near', afterTimer: true, cite: at(168) },
    { from: 'idle_recover', to: 'idle', label: 'Block recovers with Link beyond 300', range: 'far', afterTimer: true, cite: at(162) },
    { from: 'move_up', to: 'wobble', label: 'Block finishes rising', cite: at(179) },
    { from: 'move_up', to: 'move_up', label: 'Block rises into Link and keeps rising', range: 'near', attack: 'zap', cite: at(291) },
    { from: 'wobble', to: 'crackle', label: 'Block shocks Link on contact', range: 'near', attack: 'zap', cite: at(294) },
    { from: 'wobble', to: 'move_down', label: 'Link is beyond 500 and the block sinks', range: 'far', afterTimer: true, cite: at(201) },
    { from: 'crackle', to: 'wobble', label: 'The lightning dies down', afterTimer: true, cite: at(264) },
    { from: 'crackle', to: 'crackle', label: 'Block shocks Link again', range: 'near', attack: 'zap', cite: at(294) },
    { from: 'stunned', to: 'idle_recover', label: 'Block finishes sinking, stunned', cite: at(207) },
    { from: 'move_down', to: 'idle', label: 'Block is back in the floor', cite: at(218) },
  ],
  attacks: [
    { id: 'zap', label: 'Electric touch', damage: 8, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(58) },
    { id: 'backlash', label: 'Shock from striking the block', damage: 8, effect: { kind: 'shock' }, blockable: false, dodgeable: false, source: at(58) },
  ],
  actionFuncs: {
    EnBrob_Idle: 'idle*',
    EnBrob_MoveUp: 'move_up',
    EnBrob_Wobble: 'wobble',
    EnBrob_Shock: 'crackle',
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
      backlash_lands_again: 'the backlash resolves on Link\'s own hit, before any enemy step that beat, and the shock lasts 20 frames, one beat, wearing off at the end of the beat; a second backlash needs a second hit on a later beat',
      link_helpless_shock: 'the shock lasts 20 frames, one beat, and wears off at the end of the beat it lands in, so it is gone before Link\'s next move',
    },
  },
}
