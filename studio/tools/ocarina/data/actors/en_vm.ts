import { DMG_TYPES, type DmgType } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Vm/z_en_vm.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

type Size = 'large' | 'small'
const SIZES: Size[] = ['large', 'small']

/** A hit on the eye quad stuns without damage; an explosion against the body takes one health, then stuns. */
const stunsFrom = (s: Size): Phase['overrides'] =>
  Object.fromEntries(
    DMG_TYPES.map((d: DmgType) => [d, d === 'EXPLOSIVE' ? { damage: 1, to: `stun_${s}`, cite: at(409) } : { damage: 0, to: `stun_${s}`, cite: at(420) }]),
  )

const phases: Phase[] = SIZES.flatMap((s): Phase[] => [
  { id: `wait_scan_${s}`, label: `Beamos (${s}) sweeps its eye`, pool: s, overrides: stunsFrom(s), frames: { value: 10, cite: at(188) }, cite: at(192) },
  { id: `wait_charge_${s}`, label: `Beamos (${s}) locks on and charges`, pool: s, overrides: stunsFrom(s), cite: at(231) },
  { id: `beam_${s}`, label: `Beamos (${s}) fires its beam`, pool: s, overrides: stunsFrom(s), cite: at(276) },
  /** While stunned (unk_21C == 2) the eye quad is ignored; only an explosion against the body counts. */
  { id: `stun_${s}`, label: `Beamos (${s}) is stunned`, pool: s, hittable: ['EXPLOSIVE'], frames: { value: 180, cite: at(338) }, cite: at(412) },
])

const steps: Step[] = SIZES.flatMap((s): Step[] => [
  { from: `wait_scan_${s}`, to: `wait_charge_${s}`, label: 'Beamos spots Link', range: 'near', afterTimer: true, cite: at(218) },
  { from: `wait_charge_${s}`, to: `beam_${s}`, label: 'Beamos fires', range: 'near', cite: at(261) },
  { from: `wait_charge_${s}`, to: `wait_scan_${s}`, label: 'Link is too far off; Beamos gives up', range: 'far', cite: at(254) },
  { from: `beam_${s}`, to: `wait_scan_${s}`, label: 'Beam sweeps over Link', range: 'near', attack: 'beam', cite: at(288) },
  { from: `beam_${s}`, to: `wait_scan_${s}`, label: 'Beam loses Link', range: 'far', cite: at(295) },
  { from: `stun_${s}`, to: `wait_scan_${s}`, label: 'Beamos recovers', afterTimer: true, cite: at(352) },
])

export const enVm: ActorSpec = {
  overlay: 'ovl_En_Vm',
  name: 'Beamos',
  role: 'enemy',
  summary:
    'A stone sentry that sweeps its eye and fires a beam at Link when he is in sight. Any hit on the eye stuns it without damage. Only explosions hurt it: a large Beamos takes two, a small one takes one.',
  cite: at(4),
  pools: [
    { id: 'large', label: 'Large Beamos', hp: { value: 2, cite: at(166) }, then: 'defeated' },
    { id: 'small', label: 'Small Beamos', hp: { value: 1, cite: at(169) }, then: 'defeated' },
  ],
  damage: { kind: 'custom', entries: { EXPLOSIVE: { damage: 1, cite: at(409) } } },
  phases,
  start: 'wait_scan_large',
  variants: [
    { id: 'large', label: 'Large Beamos', start: 'wait_scan_large', cite: at(165) },
    { id: 'small', label: 'Small Beamos', start: 'wait_scan_small', cite: 'src/overlays/actors/ovl_En_Vm/z_en_vm.h:37' },
  ],
  range: 'far',
  steps,
  attacks: [{ id: 'beam', label: 'Beamos beam', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(85) }],
  actionFuncs: {
    EnVm_Wait: 'wait_*',
    EnVm_Attack: 'beam_*',
    EnVm_Stun: 'stun_*',
    EnVm_Die: post('the head flies off and a bomb goes off after the last explosion empties health; the encounter has already ended', 429),
    actionFunc: post('the parameter name in EnVm_SetupAction, not an action function', 146),
  },
  atSources: { [at(85)]: 'beam' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      stun_large_timer_clears: 'the stun is left only once its timer runs out, or by defeat, which ends the encounter',
      stun_small_timer_clears: 'as stun_large_timer_clears',
      link_hurt_overkill: 'the beam costs exactly one health mark, so Link\'s health reaches zero exactly and is never overshot',
      large_overkill: 'each explosion takes exactly one health, so the pool reaches zero exactly',
      small_overkill: 'as large_overkill',
    },
  },
}
