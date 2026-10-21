import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Weiyer/z_en_weiyer.c'
const at = (line: number): Cite => `${F}:${line}`

/** Din's Fire connects (AC accepts it) but its entry is damage 0, reaction 0, which EnWeiyer_UpdateDamage skips. */
const dinsDoesNothing = { MAGIC_FIRE: { damage: 0, cite: at(580) } }

const phases: Phase[] = [
  { id: 'swim', label: 'Stinger swims about', overrides: dinsDoesNothing, cite: at(247) },
  { id: 'attack', label: 'Stinger charges Link', frames: { value: 200, cite: at(162) }, overrides: dinsDoesNothing, cite: at(370) },
  { id: 'inactive', label: 'Stinger swims off after a charge', frames: { value: 200, cite: at(169) }, overrides: dinsDoesNothing, cite: at(411) },
  { id: 'beached', label: 'Stinger flops out of the water, spines out', frames: { value: 40, cite: at(156) }, overrides: dinsDoesNothing, cite: at(338) },
  { id: 'beached_spent', label: 'Stinger flops after stinging', frames: { value: 40, cite: at(156) }, overrides: dinsDoesNothing, cite: at(618) },
  { id: 'hurt', label: 'Stinger reels from a hit', hittable: 'none', frames: { value: 40, cite: at(180) }, cite: at(182) },
  { id: 'stunned', label: 'Stinger is stunned', frames: { value: 80, cite: at(193) }, overrides: dinsDoesNothing, cite: at(501) },
]

const steps: Step[] = [
  { from: 'swim', to: 'attack', label: 'Stinger spots Link in its water and charges', cite: at(306) },
  { from: 'attack', to: 'attack', label: 'Stinger closes on Link', range: 'far', move: 'near', cite: at(384) },
  { from: 'attack', to: 'inactive', label: 'Stinger stings Link', range: 'near', attack: 'sting', cite: at(380) },
  { from: 'attack', to: 'inactive', label: 'Stinger gives up the charge', afterTimer: true, cite: at(379) },
  { from: 'attack', to: 'beached', label: 'Stinger overshoots the surface and lands out of the water', range: 'far', cite: at(392) },
  { from: 'inactive', to: 'inactive', label: 'Stinger swims away from Link', range: 'near', move: 'far', cite: at(436) },
  { from: 'inactive', to: 'swim', label: 'Stinger settles back to swimming', afterTimer: true, cite: at(448) },
  { from: 'beached', to: 'beached_spent', label: 'Stinger flops into Link', range: 'near', attack: 'sting', cite: at(618) },
  { from: 'beached', to: 'inactive', label: 'Stinger flips back into the water', afterTimer: true, cite: at(331) },
  { from: 'beached_spent', to: 'beached', label: 'Stinger turns over, spines out again', afterTimer: true, cite: at(353) },
  { from: 'hurt', to: 'swim', label: 'Stinger recovers', afterTimer: true, cite: at(472) },
  { from: 'stunned', to: 'swim', label: 'Stinger shakes off the stun', afterTimer: true, cite: at(524) },
]

const hittable = phases.filter((p) => p.hittable !== 'none').map((p) => p.id)
const reactions: Record<string, Reaction> = {
  '0x0': {
    damage: true,
    to: Object.fromEntries(hittable.map((p) => [p, 'hurt'])),
    note: 'damage, then reel (or die at zero health); an entry of damage 0 and reaction 0 is skipped',
    cite: at(591),
  },
  '0x1': {
    damage: true,
    to: Object.fromEntries(hittable.filter((p) => p !== 'stunned').map((p) => [p, 'stunned'])),
    note: 'stun unless already stunned; the table damage is 0',
    cite: at(582),
  },
}

const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enWeiyer: ActorSpec = {
  overlay: 'ovl_En_Weiyer',
  name: 'Stinger (water)',
  role: 'enemy',
  summary:
    'A stingray that swims in deep water, charges Link for up to 200 frames, and swims off after a sting. Its spines are only armed while charging or out of the water. Deku Nuts and the Boomerang stun it.',
  cite: at(117),
  pools: [{ id: 'body', label: 'Stinger', hp: { value: 2, cite: at(74) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'swim',
  range: 'far',
  steps,
  attacks: [{ id: 'sting', label: 'Stinger sting', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(65) }],
  actionFuncs: {
    EnWeiyer_InitInsideWaterBox: ex('one-frame placement in its water box, then EnWeiyer_SetupFreeSwim; it kills itself if there is no water', 243),
    EnWeiyer_FreeSwim: 'swim',
    EnWeiyer_Attack: 'attack',
    EnWeiyer_OutOfWater: 'attack',
    EnWeiyer_Inactive: 'inactive',
    EnWeiyer_TurnAround: 'beached',
    EnWeiyer_StuckOnFloor: 'beached*',
    EnWeiyer_Hurt: 'hurt',
    EnWeiyer_Stunned: 'stunned',
    EnWeiyer_Die: ex('death spin after the finishing blow; the encounter has already ended', 476),
    EnWeiyer_Dead: ex('sinking corpse and item drop after death; drops are out of scope', 490),
  },
  atSources: { [at(65)]: 'sting' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      hurt_timer_clears: 'hurt is left only by its own timer running out; nothing connects in hurt to move it early',
      link_hurt_overkill: "the sting deals 8 (4 with Double Defense) and every loadout's health and every heal is a multiple of 8, so Link never holds less than one sting",
      miss_arrow_normal: 'adult-only attack, and every adult damaging hit deals at least 2, the whole health pool, so an adult kit never sees the Stinger reel (hurt is the only phase where hits miss)',
      miss_hammer_swing: 'as miss_arrow_normal',
      miss_hookshot: 'as miss_arrow_normal',
      miss_slash_master: 'as miss_arrow_normal',
      miss_slash_giant: 'as miss_arrow_normal',
      miss_arrow_fire: 'as miss_arrow_normal',
      miss_arrow_ice: 'as miss_arrow_normal',
      miss_arrow_light: 'as miss_arrow_normal',
      miss_spin_giant: 'as miss_arrow_normal',
      miss_spin_master: 'as miss_arrow_normal',
      miss_jump_giant: 'as miss_arrow_normal',
      miss_jump_giant_self: 'as miss_arrow_normal',
      miss_jump_master_self: 'as miss_arrow_normal',
      miss_hammer_jump: 'as miss_arrow_normal',
    },
  },
}
