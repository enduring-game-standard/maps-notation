import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Vali/z_en_vali.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * Reported gaps:
 * - EnVali_Damaged and EnVali_Recover each end when their animation finishes (z_en_vali.c:378, 388). The animation
 *   lengths are not in this checkout (assets/xml/objects/object_vali.xml gives only offsets), so each lasts one beat.
 * - It drops at xzDistToPlayer < 150 (z_en_vali.c:313) but withdraws only past 250 (z_en_vali.c:350). One near/far band
 *   carries both, so between 150 and 250 the model withdraws where the code keeps spinning.
 * - Harness: the backlash rides on every Deku Stick hit (gen.ts MELEE_WEAPON), but a whole stick breaks on the hit and
 *   returns before the backlash check (z_player.c:9000-9008, 9143); only a broken stick takes the shock.
 * - Harness: a killing blow whose backlash drops Link to 0 still ends in "Link wins", since the pool empties (priority
 *   92) before Link falls (89). In the code Link at 0 health dies with the Bari (z_player.c:9146).
 *
 * The backlash is off from EnVali_SetupStunned (z_en_vali.c:268) until the stun runs out (z_en_vali.c:443). A damaging
 * hit during the stun leaves through EnVali_SetupDamaged, which never restores it, so the `_quiet` phases carry a Bari
 * that spins on with no backlash until its next stun runs out.
 */
const QUIET = ['buried', 'appear', 'spin', 'electrify', 'damaged', 'recover', 'bury']
const quiet = (p: Phase): Phase => ({ ...p, id: `${p.id}_quiet`, label: `${p.label} (no backlash after an interrupted stun)`, backlashOff: at(268) })
const quietStep = (st: Step): Step => ({ ...st, from: `${st.from}_quiet`, to: `${st.to}_quiet` })

const base: Phase[] = [
  { id: 'buried', label: 'Bari waits out of sight', hittable: 'none', cite: at(188) },
  { id: 'appear', label: 'Bari drops into place', hittable: 'none', cite: at(318) },
  { id: 'spin', label: 'Bari spins its tentacles', cite: at(328) },
  { id: 'electrify', label: 'Bari crackles after stinging Link', hittable: 'none', frames: { value: 20, cite: at(219) }, cite: at(221) },
  { id: 'damaged', label: 'Bari reels', hittable: 'none', cite: at(229) },
  { id: 'recover', label: 'Bari pulls itself together', hittable: 'none', cite: at(387) },
  { id: 'bury', label: 'Bari withdraws', cite: at(476) },
]
const phases: Phase[] = [
  ...base,
  { id: 'electrify_slashed', label: 'Bari crackles after a sword hit', hittable: 'none', frames: { value: 20, cite: at(219) }, cite: at(507) },
  { id: 'stunned', label: 'Bari is stunned (its body no longer shocks)', backlashOff: at(268), frames: { value: 80, cite: at(265) }, cite: at(268) },
  ...base.filter((p) => QUIET.includes(p.id)).map(quiet),
]

const loop: Step[] = [
  { from: 'buried', to: 'appear', label: 'Link comes within 150: the Bari drops', range: 'near', cite: at(314) },
  { from: 'appear', to: 'spin', label: 'Bari lands and spins', cite: at(324) },
  { from: 'spin', to: 'electrify', label: 'Bari stings Link', range: 'near', attack: 'sting', cite: at(536) },
  { from: 'spin', to: 'bury', label: 'Link is beyond 250: the Bari withdraws', range: 'far', cite: at(351) },
  { from: 'electrify', to: 'spin', label: 'Bari spins again', afterTimer: true, cite: at(366) },
  { from: 'damaged', to: 'recover', label: 'Bari recovers', cite: at(380) },
  { from: 'recover', to: 'spin', label: 'Bari spins again', cite: at(389) },
  { from: 'bury', to: 'buried', label: 'Bari is gone', cite: at(479) },
]
const steps: Step[] = [
  ...loop,
  { from: 'electrify_slashed', to: 'damaged', label: 'The Bari stops crackling and reels', afterTimer: true, cite: at(364) },
  { from: 'stunned', to: 'spin', label: 'Bari shakes off the stun and shocks again', afterTimer: true, cite: at(444) },
  ...loop.map(quietStep),
]

const MELEE = [
  'deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master',
  'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump',
]
const on = (to: string, from: string[]) => Object.fromEntries(from.map((p) => [p, to]))
const deadVerbs: Record<string, string> = {
  electrify_timer_clears: 'the electrify timer is one beat and the phase is left only when it runs out, so no timer is ever left behind',
  electrify_slashed_timer_clears: 'as electrify_timer_clears',
  electrify_quiet_timer_clears: 'as electrify_timer_clears',
  backlash_lands_again: 'the backlash resolves on Link\'s own hit, before any enemy step that beat, and the shock lasts 20 frames, one beat, wearing off at the end of the beat; a second backlash needs a second hit on a later beat',
  backlash_lands_dd_again: 'as backlash_lands_again',
  link_helpless_shock: 'the shock lasts one beat and wears off at the end of the beat it lands, before Link\'s next move, so he never loses a move to it',
  link_hurt_overkill: 'both attacks deal 8 (4 with Double Defense), and in every kit Link starts at 32 health, so his health reaches exactly 0 and never has damage left over',
  ...Object.fromEntries(
    ['deku_stick', 'slash_kokiri', 'magic_fire', 'spin_kokiri', 'jump_kokiri', 'jump_kokiri_self', 'jump_master'].map((k) => [`hit_${k}__bury_quiet`, 'as hit_slash_kokiri__bury: bury_quiet is entered the same way and left the same way']),
  ),
  ...Object.fromEntries(MELEE.map((k) => [`hit_${k}__bury`, 'bury is entered only when Link is far and is left on the next enemy step whatever Link does, so the move that brings him near for a melee swing is spent before he can swing'])),
}

export const enVali: ActorSpec = {
  overlay: 'ovl_En_Vali',
  name: 'Bari',
  role: 'enemy',
  summary:
    'A large electric jellyfish with two health points. It drops when Link comes close and spins its tentacles; a melee weapon hit on its body shocks Link back, the killing blow included, unless it is stunned or was hurt out of a stun. Killing it splits it into three Biri, which have their own encounter.',
  cite: at(46),
  pools: [{ id: 'body', label: 'Bari', hp: { value: 2, cite: at(98) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      EN_VALI_DMG_REACT_NONE: {
        damage: true,
        to: { ...on('damaged', ['spin', 'bury']), ...on('damaged_quiet', ['stunned', 'spin_quiet', 'bury_quiet']) },
        note: 'a hit with damage makes it reel; one with no damage does nothing. Reeling out of a stun leaves the backlash off',
        cite: at(520),
      },
      EN_VALI_DMG_REACT_STUN: { damage: true, to: on('stunned', ['spin', 'bury', 'spin_quiet', 'bury_quiet']), note: 'a Deku Nut or Boomerang stuns it unless already stunned', cite: at(500) },
      EN_VALI_DMG_REACT_SLINGSHOT: { damage: true, note: 'a seed only makes it spin faster for 20 frames (spinTimer), with no damage', cite: at(517) },
      EN_VALI_DMG_REACT_SWORD_SLASH: {
        damage: true,
        to: { ...on('electrify_slashed', ['spin', 'bury', 'spin_quiet', 'bury_quiet']), stunned: 'damaged_quiet' },
        note: 'a slash makes it electrify, then reel; while stunned it just reels, with the backlash still off. A quiet Bari has 1 health left, so any slash there kills it',
        cite: at(507),
      },
      EN_VALI_DMG_REACT_FIRE: { damage: true, to: 'defeated', note: 'fire burns it, and EnVali_Burnt always ends in death', cite: at(398) },
      EN_VALI_DMG_REACT_ICE: { damage: true, to: 'defeated', note: 'ice freezes it, and EnVali_Frozen always ends in death', cite: at(470) },
    },
  },
  phases,
  start: 'buried',
  range: 'far',
  steps,
  attacks: [
    { id: 'sting', label: 'Bari sting', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(89) },
    { id: 'backlash', label: 'Shock from striking the Bari', damage: 8, effect: { kind: 'shock' }, blockable: false, dodgeable: false, source: at(89) },
  ],
  actionFuncs: {
    EnVali_WaitPlayerNear: 'buried',
    EnVali_Appear: 'appear',
    EnVali_Spin: 'spin',
    EnVali_Electrify: 'electrify*',
    EnVali_Damaged: 'damaged*',
    EnVali_Recover: 'recover',
    EnVali_Stunned: 'stunned',
    EnVali_Bury: 'bury',
    EnVali_Burnt: post('reached only by fire, which always leads to EnVali_SetupDie; the fire reaction is modeled as defeat', 398),
    EnVali_Frozen: post('reached only by ice, which always leads to EnVali_SetupDie; the ice reaction is modeled as defeat', 470),
    EnVali_Die: post('the split into three Biri and the item drop after the finishing blow; the Biri have their own encounter (En_Bili, from_bari variant)', 249),
  },
  backlash: { attack: 'backlash', cite: at(90) },
  atSources: { [at(69)]: 'sting', [at(89)]: 'sting' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
