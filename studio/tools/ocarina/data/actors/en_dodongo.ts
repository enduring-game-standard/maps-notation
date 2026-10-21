import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Dodongo/z_en_dodongo.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })


const phases: Phase[] = [
  { id: 'idle', label: 'Dodongo stands still', frames: { value: [30, 80], cite: at(378) }, cite: at(427) },
  { id: 'idle_short', label: 'Dodongo pauses after breathing fire', frames: { value: [10, 30], cite: at(437) }, cite: at(427) },
  { id: 'walk', label: 'Dodongo walks', frames: { value: [50, 120], cite: at(388) }, cite: at(544) },
  { id: 'fire', label: 'Dodongo breathes fire', cite: at(441) },
  { id: 'fire_end', label: 'Dodongo closes its mouth', cite: at(434) },
  { id: 'hurt', label: 'Dodongo reels from the hit', hittable: 'none', cite: at(803) },
  { id: 'sweep', label: 'Dodongo sweeps its tail', hittable: 'none', frames: { value: 18, cite: at(647) }, cite: at(803) },
  { id: 'stunned', label: 'Dodongo is stunned', frames: { value: 80, cite: at(743) }, cite: at(721) },
  { id: 'swallow', label: 'Dodongo swallows a bomb', hittable: 'none', frames: { value: 25, cite: at(411) }, cite: at(803) },
]

/** EnDodongo_AteBomb runs while actionState >= DODONGO_IDLE: idle, closing the mouth, stunned, and walking, but not breathing fire. */
const MOUTH_OPEN = ['idle', 'idle_short', 'walk', 'fire_end', 'stunned']
for (const p of phases) if (MOUTH_OPEN.includes(p.id)) p.overrides = { ...p.overrides, EXPLOSIVE: { damage: 0, to: 'swallow', cite: at(806) } }

/** A stun reaction is ignored while already stunned: no damage, no change (z_en_dodongo.c:742). */
const STUN_TYPES: DmgType[] = ['DEKU_NUT', 'BOOMERANG', 'HOOKSHOT', 'ARROW_ICE']
const stunned = phases.find((p) => p.id === 'stunned')!
for (const d of STUN_TYPES) stunned.overrides = { ...stunned.overrides, [d]: { damage: 0, cite: at(742) } }

const HITTABLE = ['idle', 'idle_short', 'walk', 'fire', 'fire_end', 'stunned']
const toHurt = Object.fromEntries(HITTABLE.map((p) => [p, 'hurt']))
const toStun = Object.fromEntries(HITTABLE.filter((p) => p !== 'stunned').map((p) => [p, 'stunned']))

const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, to: toHurt, note: 'damage applies; at zero health it dies, otherwise it reels and may sweep its tail', cite: at(752) },
  '0x1': { damage: true, to: toStun, note: 'stun (Deku Nut, Boomerang, Hookshot) unless already stunned', cite: at(745) },
  '0x6': { damage: true, to: toHurt, note: 'fire magic deals 0 but takes the damage branch, so the Dodongo reels and may sweep its tail', cite: at(752) },
  '0xF': { damage: true, to: toStun, note: 'ice freezes it like a stun and applies the damage; at zero health it dies when the stun ends', cite: at(745) },
}

const steps: Step[] = [
  { from: 'idle', to: 'walk', label: 'Dodongo starts walking', afterTimer: true, cite: at(430) },
  { from: 'idle_short', to: 'walk', label: 'Dodongo starts walking', afterTimer: true, cite: at(430) },
  { from: 'walk', to: 'fire', label: 'Dodongo faces Link and draws breath', range: 'near', cite: at(585) },
  { from: 'walk', to: 'idle', label: 'Dodongo stops to rest', range: 'far', afterTimer: true, weight: 7, cite: at(603) },
  { from: 'walk', to: 'walk', label: 'Dodongo wanders on', range: 'far', afterTimer: true, weight: 3, cite: at(600) },
  { from: 'fire', to: 'fire_end', label: 'Dodongo breathes fire on Link', range: 'near', attack: 'fire_breath', cite: at(464) },
  { from: 'fire', to: 'fire_end', label: 'Dodongo breathes fire at nothing', range: 'far', cite: at(464) },
  { from: 'fire_end', to: 'idle_short', label: 'Dodongo settles', cite: at(436) },
  { from: 'hurt', to: 'fire', label: 'Link is in front: Dodongo breathes fire', cite: at(632) },
  { from: 'hurt', to: 'sweep', label: 'Link is behind: Dodongo whips its tail around', cite: at(647) },
  { from: 'sweep', to: 'fire', label: 'The tail catches Link', range: 'near', attack: 'tail_sweep', afterTimer: true, cite: at(677) },
  { from: 'sweep', to: 'fire', label: 'The tail sweeps empty air', range: 'far', afterTimer: true, cite: at(632) },
  { from: 'stunned', to: 'idle', label: 'Dodongo recovers', afterTimer: true, cite: at(727) },
  { from: 'swallow', to: 'defeated', label: 'The bomb goes off inside the Dodongo', afterTimer: true, cite: at(540) },
]

export const enDodongo: ActorSpec = {
  overlay: 'ovl_En_Dodongo',
  name: 'Dodongo',
  role: 'enemy',
  summary: 'A slow lizard with four health points. It wanders, breathes fire at Link when he is close in front of it, and after a hit whips its tail if Link is behind it. A bomb left at its mouth is swallowed and kills it.',
  cite: at(56),
  pools: [{ id: 'body', label: 'Dodongo', hp: { value: 4, cite: at(337) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'idle',
  range: 'far',
  steps,
  attacks: [
    // The breath carries only DMG_UNBLOCKABLE (0x20000000), a bit the player's shield quad does not accept (0xDFCFFFFF, z_player.c:10518).
    { id: 'fire_breath', label: 'Dodongo fire breath', damage: 16, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(210) },
    { id: 'tail_sweep', label: 'Dodongo tail sweep', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(653) },
  ],
  actionFuncs: {
    EnDodongo_Idle: 'idle*',
    EnDodongo_Walk: 'walk',
    EnDodongo_BreatheFire: 'fire',
    EnDodongo_EndBreatheFire: 'fire_end',
    EnDodongo_SweepTail: 'hurt',
    EnDodongo_Stunned: 'stunned',
    EnDodongo_SwallowBomb: 'swallow',
    EnDodongo_Death: post('death animation, bomb blast, and item drop after the finishing blow; the encounter has already ended', 691),
    actionFunc: post('the struct field EnDodongo_SetupAction assigns, not a function of its own', 255),
  },
  atSources: {
    [at(210)]: 'fire_breath',
    [at(628)]: post('clears the tail flags when the sweep ends; no attack', 628),
    [at(629)]: post('clears the tail flags when the sweep ends; no attack', 629),
    [at(630)]: post('zeroes the tail damage when the sweep ends; no attack', 630),
    [at(631)]: post('zeroes the tail damage when the sweep ends; no attack', 631),
    [at(651)]: 'tail_sweep',
    [at(652)]: 'tail_sweep',
    [at(653)]: 'tail_sweep',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      sweep_timer_clears: 'the sweep cannot be hit and has no exit but its own timer, so no timer is left when it ends',
      swallow_timer_clears: 'the swallow cannot be hit and ends only when its timer runs out, in defeat',
      miss_slash_giant: 'misses only land while the Dodongo reels, sweeps, or swallows; a two-handed slash deals 4, its whole health, so the first hit kills, and that kit carries no bombs or Din\'s Fire to reach those phases without damage',
      miss_spin_giant: 'as miss_slash_giant: the two-handed spin deals 4',
      miss_jump_giant: 'as miss_slash_giant: the two-handed jump attack deals 8',
      miss_jump_giant_self: 'as miss_slash_giant, for the great spin, which carries the jump flags',
    },
  },
}
