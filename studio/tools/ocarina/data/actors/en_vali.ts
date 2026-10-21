import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Vali/z_en_vali.c'
const P = 'src/overlays/actors/ovl_player_actor/z_player.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * A melee weapon hit on an element whose hitBacklash is HIT_BACKLASH_ELECTRIC shocks Link for 8 (z_player.c:9146).
 * Slashes reach it through EN_VALI_DMG_REACT_SWORD_SLASH; spins and jump attacks share EN_VALI_DMG_REACT_NONE with
 * arrows, bombs, the hammer, and Deku Sticks, which do not shock, so they are split out here with their table damage (sDamageTable lines 132-137).
 * The hammer is exempt in the player code, and an unbroken Deku Stick returns before the backlash check.
 */
const BACKLASH: Partial<Record<DmgType, number>> = {
  SPIN_KOKIRI: 1, SPIN_GIANT: 4, SPIN_MASTER: 2, JUMP_KOKIRI: 2, JUMP_GIANT: 8, JUMP_MASTER: 4,
}
const shocks: Phase['overrides'] = Object.fromEntries(
  Object.entries(BACKLASH).map(([d, n]) => [d, { damage: n, to: 'damaged_backlash', cite: `${P}:9146` as Cite }]),
)

const phases: Phase[] = [
  { id: 'buried', label: 'Bari waits out of sight', hittable: 'none', cite: at(188) },
  { id: 'appear', label: 'Bari drops into place', hittable: 'none', cite: at(318) },
  { id: 'spin', label: 'Bari spins its tentacles', overrides: shocks, cite: at(328) },
  { id: 'electrify', label: 'Bari crackles after stinging Link', hittable: 'none', frames: { value: 20, cite: at(219) }, cite: at(221) },
  { id: 'electrify_slashed', label: 'Bari crackles after a sword hit, shocking Link', hittable: 'none', frames: { value: 20, cite: at(219) }, cite: at(507) },
  { id: 'damaged', label: 'Bari reels', hittable: 'none', cite: at(229) },
  { id: 'damaged_backlash', label: 'Bari reels from a sword hit, shocking Link', hittable: 'none', cite: at(229) },
  { id: 'recover', label: 'Bari pulls itself together', hittable: 'none', cite: at(387) },
  { id: 'stunned', label: 'Bari is stunned (its body no longer shocks)', frames: { value: 80, cite: at(265) }, cite: at(268) },
  { id: 'bury', label: 'Bari withdraws', overrides: shocks, cite: at(476) },
]

const steps: Step[] = [
  { from: 'buried', to: 'appear', label: 'Link comes close: the Bari drops', range: 'near', cite: at(314) },
  { from: 'appear', to: 'spin', label: 'Bari lands and spins', cite: at(324) },
  { from: 'spin', to: 'electrify', label: 'Bari stings Link', range: 'near', attack: 'sting', cite: at(536) },
  { from: 'spin', to: 'bury', label: 'Link is far: the Bari withdraws', range: 'far', cite: at(351) },
  { from: 'electrify', to: 'spin', label: 'Bari spins again', afterTimer: true, cite: at(366) },
  { from: 'electrify_slashed', to: 'damaged', label: 'The sword hit shocks Link; the Bari reels', afterTimer: true, attack: 'backlash', cite: at(364) },
  { from: 'damaged', to: 'recover', label: 'Bari recovers', cite: at(380) },
  { from: 'damaged_backlash', to: 'recover', label: 'The sword hit shocks Link; the Bari recovers', attack: 'backlash', cite: at(380) },
  { from: 'recover', to: 'spin', label: 'Bari spins again', cite: at(389) },
  { from: 'stunned', to: 'spin', label: 'Bari shakes off the stun', afterTimer: true, cite: at(444) },
  { from: 'bury', to: 'buried', label: 'Bari is gone', cite: at(479) },
]

const MELEE = [
  'deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master',
  'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump',
]
const deadVerbs: Record<string, string> = {
  electrify_timer_clears: 'the electrify timer is one beat and the phase is left only when it runs out, so no timer is ever left behind',
  electrify_slashed_timer_clears: 'as electrify_timer_clears',
  backlash_lands_again: 'the shock lasts 20 frames, one beat, and wears off at the end of the beat it lands, and a second backlash needs a second hit on a later beat',
  link_helpless_shock: 'the shock lasts one beat and wears off at the end of the beat it lands, before Link\'s next move, so he never loses a move to it',
  link_hurt_overkill: 'both attacks deal 8 (4 with Double Defense), and in every kit Link starts at 32 health, so his health reaches exactly 0 and never has damage left over',
  ...Object.fromEntries(MELEE.map((k) => [`hit_${k}__bury`, 'bury is entered only when Link is far and is left on the next enemy step whatever Link does, so the move that brings him near for a melee swing is spent before he can swing'])),
}

export const enVali: ActorSpec = {
  overlay: 'ovl_En_Vali',
  name: 'Bari',
  role: 'enemy',
  summary:
    'A large electric jellyfish with two health points. It drops when Link comes close and spins its tentacles; a sword hit on its body shocks Link back unless it is stunned. Killing it splits it into three Biri, which have their own encounter.',
  cite: at(46),
  pools: [{ id: 'body', label: 'Bari', hp: { value: 2, cite: at(98) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      EN_VALI_DMG_REACT_NONE: { damage: true, to: ({ spin: 'damaged', bury: 'damaged', stunned: 'damaged' }), note: 'a hit with damage makes it reel; one with no damage does nothing', cite: at(520) },
      EN_VALI_DMG_REACT_STUN: { damage: true, to: ({ spin: 'stunned', bury: 'stunned' }), note: 'a Deku Nut or Boomerang stuns it unless already stunned', cite: at(500) },
      EN_VALI_DMG_REACT_SLINGSHOT: { damage: true, note: 'a seed only makes it spin faster for 20 frames (spinTimer), with no damage', cite: at(517) },
      EN_VALI_DMG_REACT_SWORD_SLASH: {
        damage: true,
        to: ({ spin: 'electrify_slashed', bury: 'electrify_slashed', stunned: 'damaged' }),
        note: 'a slash makes it electrify (and shock Link through the backlash), then reel; while stunned it just reels',
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
  atSources: { [at(69)]: 'sting', [at(89)]: 'sting' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
