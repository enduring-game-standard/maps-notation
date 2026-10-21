import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

/*
 * Reported gaps (the types cannot express these; the closest honest model is used):
 * - A fire hit turns the root's AC off for 100 frames (z_en_peehat.c:940, 993-995; RED is 0x4000, include/actor.h:168).
 *   A phase holds one timer, so that window cannot run beside the seek, landed and veer timers. It is modeled exactly only
 *   from a stun (`stunned_burn_*`), where the 100-frame color filter is also the stun's own timer (z_en_peehat.c:811).
 * - The rise phases last one beat. Their length is a 5-frame blade spin-up (z_en_peehat.c:445), then the rising
 *   animation's last-frame count (z_en_peehat.c:436), then up to 40 frames (z_en_peehat.c:450); the animation length is in
 *   the object assets, which this checkout holds only as XML (assets/xml/objects/object_peehat.xml:77).
 * - A larva dies when it touches the ground (z_en_peehat.c:589, 599, 616). When that happens depends on its spawn height
 *   above the floor, which is scene data, so no step models it.
 * - The flying Peahat drops larvae only while Link is within xzDistMax 1400 of it (z_en_peehat.c:244, 414) and climbs as long
 *   as he is within 2800 (z_en_peehat.c:243, 385). The far band cannot split at 1400, so the larva step fires in both bands.
 * - Which of Link's hits reach the root past the blade quad is geometry. The quad takes the same 0xFFCFFFFF mask as the
 *   root (z_en_peehat.c:134, 100) and any touch of an AC_HARD collider bounces (src/code/z_collision_check.c:1722), which
 *   voids the root hit (z_en_peehat.c:907-910). The model's judgment is that thin projectiles reach the root (the lock-on
 *   point sits on it, z_en_peehat.c:976-978) and melee meets the blades; the flying kind is out of melee reach once it climbs
 *   at 18 units a frame (z_en_peehat.c:503).
 * - Seek timers restart on every entry; the code keeps the remaining count across a stun (z_en_peehat.c:429-438 never
 *   touches seekPlayerTimer).
 * - Night behavior is not modeled: the encounter is the daytime fight (IS_DAY at z_en_peehat.c:347, 534, 710).
 * - The death explosion (an En_Bom of 8 + 6 damage, z_en_peehat.c:889, src/overlays/actors/ovl_En_Bom/z_en_bom.c:72, 119)
 *   lands after the finishing blow, and the types have no attack after defeat.
 */
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
  { id: 'stunned_burn_g', label: 'Stunned Peahat burns, untouchable', hittable: 'none', frames: { value: 100, cite: at(940) }, cite: at(993) },
  { id: 'stunned_burn_fs', label: 'Stunned downed flying Peahat burns, untouchable', hittable: 'none', frames: { value: 100, cite: at(940) }, cite: at(993) },
  { id: 'rise_fs2', label: 'Downed flying Peahat rises again', cite: at(441) },
  { id: 'seek_fs2', label: 'Downed flying Peahat hunts Link again', frames: { value: 600, cite: at(338) }, cite: at(523) },
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
/** A damaging hit resets the color filter to 8 frames, so the stun ends within the beat (z_en_peehat.c:927, 811). */
const hitEndsStun = { stunned_g: 'rise_g', stunned_fs: 'rise_fs' }
/** A fire hit resets it to 100 frames of RED, which also keeps the root out of the AC list (z_en_peehat.c:940, 993). */
const fireBurnsStun = { stunned_g: 'stunned_burn_g', stunned_fs: 'stunned_burn_fs' }

const reactions: Record<string, Reaction> = {
  PEAHAT_DMG_REACT_ATTACK: { damage: true, to: hitEndsStun, note: 'the root takes the table damage; the 8-frame red filter ends a stun', cite: at(927) },
  PEAHAT_DMG_REACT_FIRE: { damage: true, to: fireBurnsStun, note: 'the root takes the table damage and burns; from a stun the 100-frame red filter holds it down, untouchable', cite: at(940) },
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
    { from: `landed_${k}`, to: k === 'g' ? 'rise_g' : 'rise_fs2', label: `${WHO[k]} spins up again`, afterTimer: true, cite: at(351) },
    { from: `stunned_${k}`, to: `rise_${k}`, label: `${WHO[k]} recovers and rises`, afterTimer: true, cite: at(812) },
  ]),
  { from: 'stunned_burn_g', to: 'rise_g', label: 'Peahat stops burning and rises', afterTimer: true, cite: at(812) },
  { from: 'stunned_burn_fs', to: 'rise_fs', label: 'Downed flying Peahat stops burning and rises', afterTimer: true, cite: at(812) },
  { from: 'rise_fs2', to: 'seek_fs2', label: 'Downed flying Peahat is aloft', cite: at(456) },
  { from: 'seek_fs2', to: 'seek_fs2', label: 'Downed flying Peahat flies at Link', range: 'far', move: 'near', cite: at(526) },
  { from: 'seek_fs2', to: 'landing_fs', label: 'Downed flying Peahat tires and comes down', afterTimer: true, cite: at(529) },
  { from: 'seek_g', to: 'recoil_g', label: 'Peahat cuts Link with its blades', range: 'near', attack: 'blade', cite: at(1002) },
  { from: 'recoil_g', to: 'seek_g', label: 'Peahat comes back for Link', cite: at(786) },
  { from: 'grounded_f', to: 'rise_f', label: 'Flying Peahat takes off', cite: at(386) },
  { from: 'rise_f', to: 'fly', label: 'Flying Peahat is high up', cite: at(501) },
  { from: 'fly', to: 'fly_veer', label: 'A larva it dropped cuts Link', attack: 'dropped_larva_blade', cite: at(416) },
  { from: 'fly_veer', to: 'fly', label: 'The larva homes in again', afterTimer: true, cite: at(574) },
  { from: 'larva', to: 'larva_veer', label: 'Larva cuts Link', range: 'near', attack: 'larva_blade', cite: at(598) },
  { from: 'larva', to: 'larva', label: 'Larva flies at Link', range: 'far', move: 'near', cite: at(567) },
  { from: 'larva_veer', to: 'larva', label: 'Larva homes in again', afterTimer: true, cite: at(574) },
]

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enPeehat: ActorSpec = {
  overlay: 'ovl_En_Peehat',
  name: 'Peahat',
  role: 'enemy',
  summary:
    'A plant with a spinning blade. By day the grounded kind rises and hunts Link; its hard blades turn melee aside while it flies, so Link shoots its root, stuns it with the Boomerang, or waits for it to land. The flying kind circles high and drops larvae, which the Slingshot or an arrow kills, and which die on a raised shield. The Hookshot kills any adult outright.',
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
  attacks: [
    { id: 'blade', label: 'Peahat blade', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(133) },
    {
      id: 'larva_blade',
      label: 'Larva blade',
      damage: 16,
      effect: { kind: 'none' },
      blockable: true,
      dodgeable: true,
      source: at(133),
      onBlock: { to: 'defeated', cite: at(585) },
    },
    {
      id: 'dropped_larva_blade',
      label: 'Blade of a larva the flying Peahat drops',
      damage: 16,
      effect: { kind: 'none' },
      blockable: true,
      dodgeable: true,
      source: at(133),
      via: { overlay: 'ovl_En_Peehat', spawn: at(416) },
      onBlock: { to: 'fly', cite: at(585) },
    },
  ],
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
    EnPeehat_Ground_StateReturnHome: post('entered when Link is more than xzDistMax (1200) from its home, past where the encounter ends (Link leaving is the withdraw outcome), or at night, which the daytime encounter does not model (IS_DAY at z_en_peehat.c:534, 710)', 534),
    EnPeehat_Flying_StateLanding: post('entered only at night or when Link is beyond xzDistToRise (2800), past where the encounter ends', 412),
    EnPeehat_Adult_StateDie: post('entered only once health is 0; the death spin after the finishing blow', 942),
    EnPeehat_StateExplode: post('the death explosion and drops after StateDie. Its En_Bom blast (8 + 6 = 14 damage, z_en_bom.c:72, 119) can hurt a close Link, but it lands after the finishing blow, where the encounter has ended; reported as a gap in the header', 864),
    actionFunc: post('the parameter name of EnPeehat_SetupAction, not an action function', 207),
  },
  atSources: { [at(133)]: 'blade' },
  // Din's Fire on a Boomerang-stunned Peahat is the one pairing the standard kits split (z_en_peehat.c:922, 940).
  loadouts: standardLoadouts(['child', 'adult'], 2, { child_dins: ['boomerang'] }),
  expected: {
    deadVerbs: {
      stunned_burn_g_timer_clears: 'stunned_burn_g is hittable by nothing and has no step but the one after its timer, so it is never left with beats on the timer',
      stunned_burn_fs_timer_clears: 'as stunned_burn_g_timer_clears',
      miss_magic_fire__stunned_burn_g:
        "stunned_burn is entered only by a fire hit on a stun, which in the one kit with the Boomerang and fire (child_dins) is Din's Fire, and that cast spends all 12 of the kit's 12 magic, so none is left to cast again there",
      miss_magic_fire__stunned_burn_fs: 'as miss_magic_fire__stunned_burn_g',
      miss_jump_kokiri_self__stunned_burn_g: "the great spin costs magic, and child_dins reaches stunned_burn only by spending all of its magic on Din's Fire",
      miss_jump_kokiri_self__stunned_burn_fs: 'as miss_jump_kokiri_self__stunned_burn_g',
      larva_veer_timer_clears: 'a veering larva is left only when its veer runs out or by being shot, which ends the encounter',
      body_empty_in_grounded_f: 'grounded_f lasts only Link\'s first beat, from far, and no ranged hit deals the 6 health it would take',
      link_hurt_overkill: 'the blade costs 16 (8 with Double Defense), and Link starts and heals in multiples of 16, so a hit never takes more health than he has',
    },
  },
}
