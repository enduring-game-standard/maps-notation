import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Hidan_Firewall/z_bg_hidan_firewall.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Reported gap: on contact the flame also knocks Link back with no damage (BgHidanFirewall_Collide,
 * Actor_SetPlayerKnockbackLargeNoDamage at line 146, called from line 194). The attack carries the burn, which costs
 * health; the knockback is reported, not modeled.
 * Once Link leaves, the flame shrinks 0.01 a frame from 0.1 to 0.01 (line 128) with the collider still live, at most
 * 9 frames. That rounds to no beat, so erupting goes straight to dormant the beat Link is far.
 * The Fire Temple is visited as adult: `src/overlays/actors/ovl_En_Du/z_en_du.c:173` gates Darunia's
 * Fire Temple appearance on LINK_IS_ADULT.
 */
export const bgHidanFirewall: ActorSpec = {
  overlay: 'ovl_Bg_Hidan_Firewall',
  name: 'Fire Temple flame wall',
  role: 'hazard',
  summary: 'A floor vent that erupts into a wall of flame a few frames after Link steps close, follows him along its width while he stays, and dies down once he leaves. Its flame burns and cannot be blocked.',
  cite: at(4),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'dormant', label: 'The vent is quiet', cite: at(106) },
    { id: 'countdown', label: 'The vent is about to erupt', frames: { value: 5, cite: at(109) }, cite: at(114) },
    { id: 'erupting', label: 'The flame wall burns', cite: at(124) },
  ],
  start: 'dormant',
  range: 'far',
  steps: [
    { from: 'dormant', to: 'countdown', label: 'Link steps close and the vent rumbles', range: 'near', cite: at(110) },
    { from: 'countdown', to: 'erupting', label: 'The flame wall erupts', afterTimer: true, cite: at(120) },
    { from: 'erupting', to: 'erupting', label: 'The flame wall burns Link', range: 'near', attack: 'flame', cite: at(200) },
    { from: 'erupting', to: 'dormant', label: 'Link is gone and the flame dies down', range: 'far', cite: at(130) },
  ],
  attacks: [
    { id: 'flame', label: 'Flame wall', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(58) },
  ],
  actionFuncs: {
    BgHidanFirewall_Wait: 'dormant',
    BgHidanFirewall_Countdown: 'countdown',
    BgHidanFirewall_Erupt: 'erupting',
  },
  atSources: { [at(58)]: 'flame' },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      countdown_timer_clears: 'countdown lasts one beat and is left only when that beat runs out',
    },
  },
}
