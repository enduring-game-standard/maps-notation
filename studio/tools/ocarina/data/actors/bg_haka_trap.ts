import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Haka_Trap/z_bg_haka_trap.c'
const at = (line: number): Cite => `${F}:${line}`
const x = (excluded: string, line: number): Excluded => ({ excluded, cite: at(line) })

const crusher = 'spiked crusher: Update never registers its cylinder (the AT/AC block skips BG_HAKA_TRAP_SPIKED_CRUSHER) and it has no AC tris, so it neither cuts nor can be hit; it hurts only by crushing Link between floor and ceiling, a void-out the player code handles, not a collider'
const fan = 'fan blade: no collider is ever made for it; it only sets pushedSpeed on Link (BgHakaTrap_PushPlayer), which costs no health'

const phases: Phase[] = [
  { id: 'fall_slow', label: 'The guillotine drops', hittable: 'none', frames: { value: 20, cite: at(369) }, cite: at(348) },
  { id: 'lift_slow', label: 'The guillotine is hauled back up', hittable: 'none', frames: { value: 40, cite: at(341) }, cite: at(352) },
  { id: 'fall_fast', label: 'The fast guillotine drops', hittable: 'none', frames: { value: 20, cite: at(369) }, cite: at(348) },
  { id: 'lift_fast', label: 'The fast guillotine snaps back up', hittable: 'none', frames: { value: 10, cite: at(339) }, cite: at(357) },
  { id: 'wall_close', label: 'The spiked wall closes in', hittable: ['MAGIC_FIRE'], cite: at(519) },
  { id: 'wall_burn', label: 'The spiked wall burns away', hittable: 'none', frames: { value: 20, cite: at(286) }, cite: at(518) },
]

const guillotine = (fall: string, lift: string, name: string): Step[] => [
  { from: fall, to: lift, label: `The ${name} blade cuts Link`, range: 'near', afterTimer: true, attack: 'blade', cite: at(344) },
  { from: fall, to: lift, label: `The ${name} blade strikes the floor`, range: 'far', afterTimer: true, cite: at(344) },
  { from: lift, to: fall, label: `The ${name} drops again`, afterTimer: true, cite: at(372) },
]

export const bgHakaTrap: ActorSpec = {
  overlay: 'ovl_Bg_Haka_Trap',
  name: 'Shadow Temple trap',
  role: 'hazard',
  summary: "Shadow Temple's mechanical traps. A guillotine (slow or fast) cuts Link while it falls. A spiked wall cuts Link as it closes in, and Din's Fire on its face burns it away.",
  cite: at(149),
  pools: [],
  damage: {
    kind: 'custom',
    entries: { MAGIC_FIRE: { damage: 0, to: 'wall_burn', cite: at(288) } },
  },
  phases,
  start: 'fall_slow',
  variants: [
    { id: 'guillotine', label: 'Guillotine', start: 'fall_slow', cite: at(172) },
    { id: 'guillotine_fast', label: 'Fast guillotine', start: 'fall_fast', cite: at(170) },
    { id: 'spiked_wall', label: 'Spiked wall', start: 'wall_close', cite: at(214) },
  ],
  range: 'far',
  steps: [
    ...guillotine('fall_slow', 'lift_slow', 'guillotine'),
    ...guillotine('fall_fast', 'lift_fast', 'fast guillotine'),
    { from: 'wall_close', to: 'wall_close', label: 'The wall spikes cut Link', range: 'near', attack: 'spikes', cite: at(521) },
    { from: 'wall_burn', to: 'wall_burn', label: 'The burning wall spikes still cut Link', range: 'near', attack: 'spikes', cite: at(521) },
    { from: 'wall_burn', to: 'defeated', label: 'The wall burns away', afterTimer: true, cite: at(314) },
  ],
  attacks: [
    { id: 'blade', label: 'Guillotine blade', damage: 4, effect: { kind: 'none' }, blockable: false, dodgeable: true, source: at(86) },
    { id: 'spikes', label: 'Wall spikes', damage: 4, effect: { kind: 'none' }, blockable: false, dodgeable: true, source: at(86) },
  ],
  actionFuncs: {
    BgHakaTrap_Guillotine_Fall: 'fall_*',
    BgHakaTrap_Guillotine_Lift: 'lift_*',
    BgHakaTrap_SpikedWall_CloseIn: 'wall_close',
    BgHakaTrap_SpikedWall_Burn: 'wall_burn',
    BgHakaTrap_SpikedCrusher_Fall: x(crusher, 512),
    BgHakaTrap_SpikedCrusher_Lift: x(crusher, 512),
    BgHakaTrap_FanBlade_Idle: x(fan, 158),
    BgHakaTrap_FanBlade_ToggleFanGust: x(fan, 489),
    BgHakaTrap_FanBlade_FullGust: x(fan, 503),
  },
  atSources: { [at(86)]: 'blade' },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      fall_slow_timer_clears: 'the guillotine leaves its fall only by the steps that wait for the timer, and no hit moves it, so the timer is always spent when the fall ends',
      lift_slow_timer_clears: 'as fall_slow_timer_clears, for the lift',
      fall_fast_timer_clears: 'as fall_slow_timer_clears, for the fast guillotine',
      lift_fast_timer_clears: 'as fall_slow_timer_clears, for the fast lift',
      wall_burn_timer_clears: 'the burning wall leaves only by burning away once its timer is spent; its self-step keeps the phase and the timer, and no hit lands on it',
      link_hurt_overkill: 'the only damage is the 4-unit blade or spikes (2 with Double Defense), and every kit starts and heals Link in multiples of 4, so a hit never finds less health left than it costs',
    },
  },
}
