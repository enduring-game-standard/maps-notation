import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Peehat/z_en_peehat.c'
const at = (line: number): Cite => `${F}:${line}`

/** Every AC element takes 0xFFCFFFFF (z_en_peehat.c:87, 100, 134). */
const ACCEPTED = DMG_TYPES.filter((_, i) => (0xffcfffff >>> i) & 1)
/** Thin projectiles that reach the root sphere without touching the blades (DMG_RANGED plus the boomerang). */
const PROJECTILE: DmgType[] = ['SLINGSHOT', 'BOOMERANG', 'HOOKSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3']
/** The larva's cylinder is rewritten to take only DMG_ARROW | DMG_SLINGSHOT (z_en_peehat.c:254); any such hit kills it. */
const LARVA_HIT: DmgType[] = ['SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3']
const larvaDies: Phase['overrides'] = Object.fromEntries(LARVA_HIT.map((d) => [d, { damage: 0, to: 'defeated', cite: at(599) }]))

/**
 * `g` is the grounded Peahat, whose spinning blade quad (AC_HARD) is up while it flies: anything that touches it bounces and
 * the root hit is thrown away (z_en_peehat.c:907-910). `fs` is the flying Peahat after a Boomerang stun drops it: it then runs
 * the ground states, but a PEAHAT_TYPE_FLYING never sets the blade quad (z_en_peehat.c:1008), so it neither blocks nor cuts.
 */
type Kind = 'g' | 'fs'
const KINDS: Kind[] = ['g', 'fs']
const WHO: Record<Kind, string> = { g: 'Peahat', fs: 'Downed flying Peahat' }
const SEEK_FRAMES: Record<Kind, Cite> = { g: at(338), fs: at(376) }

const phases: Phase[] = [
  ...KINDS.flatMap((k): Phase[] => [
    { id: `rise_${k}`, label: `${WHO[k]} rises from the ground`, cite: at(441) },
    {
      id: `seek_${k}`,
      label: `${WHO[k]} hunts Link`,
      frames: { value: k === 'g' ? 600 : 400, cite: SEEK_FRAMES[k] },
      ...(k === 'g' ? { guards: ACCEPTED.filter((d) => !PROJECTILE.includes(d)) } : {}),
      cite: at(523),
    },
    { id: `landing_${k}`, label: `${WHO[k]} lands`, cite: at(627) },
    { id: `landed_${k}`, label: `${WHO[k]} rests on the ground`, frames: { value: 40, cite: at(530) }, cite: at(346) },
    { id: `stunned_${k}`, label: `${WHO[k]} is stunned on the ground`, frames: { value: 80, cite: at(803) }, cite: at(808) },
  ]),
  { id: 'recoil_g', label: 'Peahat bounces back from Link', cite: at(768) },
  { id: 'grounded_f', label: 'Flying Peahat sits on the ground', cite: at(383) },
  { id: 'rise_f', label: 'Flying Peahat climbs high', hittable: PROJECTILE, cite: at(503) },
  { id: 'fly', label: 'Flying Peahat circles high, dropping larvae', hittable: PROJECTILE, cite: at(409) },
  { id: 'fly_veer', label: 'Flying Peahat circles high; its larva veers off', hittable: PROJECTILE, frames: { value: 40, cite: at(598) }, cite: at(409) },
  { id: 'larva', label: 'Peahat larva homes in on Link', hittable: LARVA_HIT, overrides: larvaDies, cite: at(558) },
  { id: 'larva_veer', label: 'Peahat larva veers off', hittable: LARVA_HIT, overrides: larvaDies, frames: { value: 40, cite: at(598) }, cite: at(576) },
]

const ADULT = phases.map((p) => p.id).filter((id) => !id.startsWith('larva'))
const stunTo = Object.fromEntries(ADULT.filter((id) => !id.startsWith('stunned_')).map((id) => [id, id.endsWith('_g') ? 'stunned_g' : 'stunned_fs']))

const reactions: Record<string, Reaction> = {
  PEAHAT_DMG_REACT_ATTACK: { damage: true, note: 'the root takes the table damage', cite: at(926) },
  PEAHAT_DMG_REACT_FIRE: { damage: true, note: 'the root takes the table damage and burns', cite: at(926) },
  PEAHAT_DMG_REACT_HOOKSHOT: { damage: false, to: Object.fromEntries(ADULT.map((id) => [id, 'defeated'])), note: 'the Hookshot sets health to 0', cite: at(919) },
  PEAHAT_DMG_REACT_BOOMERANG: { damage: false, to: stunTo, note: 'the Boomerang stuns it unless already stunned, and it drops to the ground', cite: at(922) },
  PEAHAT_DMG_REACT_NUT: { damage: false, note: 'a Deku Nut does nothing', cite: at(916) },
  PEAHAT_DMG_REACT_LIGHT_ICE_ARROW: { damage: false, note: 'ice and light magic only pause it for the frame', cite: at(916) },
}

const steps: Step[] = [
  ...KINDS.flatMap((k): Step[] => [
    { from: `rise_${k}`, to: `seek_${k}`, label: `${WHO[k]} is aloft`, cite: at(456) },
    { from: `seek_${k}`, to: `seek_${k}`, label: `${WHO[k]} flies at Link`, range: 'far', move: 'near', cite: at(526) },
    { from: `seek_${k}`, to: `landing_${k}`, label: `${WHO[k]} tires and comes down`, afterTimer: true, cite: at(529) },
    { from: `landing_${k}`, to: `landed_${k}`, label: `${WHO[k]} touches down`, cite: at(632) },
    { from: `landed_${k}`, to: `rise_${k}`, label: `${WHO[k]} spins up again`, afterTimer: true, cite: at(351) },
    { from: `stunned_${k}`, to: `rise_${k}`, label: `${WHO[k]} recovers and rises`, afterTimer: true, cite: at(812) },
  ]),
  { from: 'seek_g', to: 'recoil_g', label: 'Peahat cuts Link with its blades', range: 'near', attack: 'blade', cite: at(1002) },
  { from: 'recoil_g', to: 'seek_g', label: 'Peahat comes back for Link', cite: at(786) },
  { from: 'grounded_f', to: 'rise_f', label: 'Flying Peahat takes off', cite: at(386) },
  { from: 'rise_f', to: 'fly', label: 'Flying Peahat is high up', cite: at(501) },
  { from: 'fly', to: 'fly_veer', label: 'A larva it dropped cuts Link', attack: 'blade', cite: at(416) },
  { from: 'fly_veer', to: 'fly', label: 'The larva homes in again', afterTimer: true, cite: at(574) },
  { from: 'larva', to: 'larva_veer', label: 'Larva cuts Link', range: 'near', attack: 'blade', cite: at(598) },
  { from: 'larva', to: 'larva', label: 'Larva flies at Link', range: 'far', move: 'near', cite: at(567) },
  { from: 'larva_veer', to: 'larva', label: 'Larva homes in again', afterTimer: true, cite: at(574) },
]

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enPeehat: ActorSpec = {
  overlay: 'ovl_En_Peehat',
  name: 'Peahat',
  role: 'enemy',
  summary:
    'A plant with a spinning blade. By day the grounded kind rises and hunts Link; its hard blades turn melee aside while it flies, so Link shoots its root, stuns it with the Boomerang, or waits for it to land. The flying kind circles high and drops larvae, which the Slingshot or an arrow kills. The Hookshot kills any adult outright.',
  cite: at(210),
  pools: [{ id: 'body', label: 'Peahat', hp: { value: 6, cite: at(221) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'rise_g',
  variants: [
    { id: 'grounded', label: 'Peahat', start: 'rise_g', cite: at(239) },
    { id: 'flying', label: 'Flying Peahat', start: 'grounded_f', cite: at(245) },
    { id: 'larva', label: 'Peahat larva', start: 'larva', cite: at(258) },
  ],
  range: 'far',
  steps,
  attacks: [{ id: 'blade', label: 'Peahat blade', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(133) }],
  actionFuncs: {
    EnPeehat_Ground_StateRise: 'rise_*',
    EnPeehat_Ground_StateHover: 'seek_*',
    EnPeehat_Ground_StateSeekPlayer: 'seek_*',
    EnPeehat_Ground_StateLanding: 'landing_*',
    EnPeehat_Ground_StateGround: 'landed_*',
    EnPeehat_StateBoomerangStunned: 'stunned_*',
    EnPeehat_StateAttackRecoil: 'recoil_g',
    EnPeehat_Flying_StateGrounded: 'grounded_f',
    EnPeehat_Flying_StateRise: 'rise_f',
    EnPeehat_Flying_StateFly: 'fly*',
    EnPeehat_Larva_StateSeekPlayer: 'larva*',
    EnPeehat_Ground_StateReturnHome: post('entered only when Link is more than xzDistMax (1200) from its home, past where the encounter ends; Link leaving is the withdraw outcome', 534),
    EnPeehat_Flying_StateLanding: post('entered only at night or when Link is beyond xzDistToRise (2800), past where the encounter ends', 412),
    EnPeehat_Adult_StateDie: post('entered only once health is 0; the death spin after the finishing blow', 942),
    EnPeehat_StateExplode: post('the death explosion and drops after StateDie; the encounter has already ended', 864),
    actionFunc: post('the parameter name of EnPeehat_SetupAction, not an action function', 207),
  },
  atSources: { [at(133)]: 'blade' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      stunned_g_timer_clears: 'a stunned Peahat is left only when the stun runs out or by defeat, which ends the encounter',
      stunned_fs_timer_clears: 'as stunned_g_timer_clears',
      larva_veer_timer_clears: 'a veering larva is left only when its veer runs out or by being shot, which ends the encounter',
      body_empty_in_grounded_f: 'grounded_f lasts only Link\'s first beat, from far, and no ranged hit deals the 6 health it would take',
      link_hurt_overkill: 'the blade costs 16 (8 with Double Defense), and Link starts and heals in multiples of 16, so a hit never takes more health than he has',
    },
  },
}
