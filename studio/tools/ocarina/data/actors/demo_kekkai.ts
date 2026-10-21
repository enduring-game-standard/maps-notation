import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Demo_Kekkai/z_demo_kekkai.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Ganon's Castle barriers (the scene header at line 25). Params 0 is the tower barrier, run by
 * DemoKekkai_Update with DemoKekkai_TowerBarrier as its updateFunc; params 1-6 are the trial barriers, whose
 * `update` is swapped to DemoKekkai_TrialBarrierIdle (line 125). There are no action functions, so the
 * update functions are the states.
 *
 * Touching either barrier hurts Link for the element's 4 and knocks him back (lines 207, 265). The element
 * carries only DMG_UNBLOCKABLE (0x20000000), which the shield quad's 0xDFCFFFFF leaves out
 * (`src/overlays/actors/ovl_player_actor/z_player.c:10518`), so no shield stops it.
 * A Light Arrow on a trial barrier's AC (0x00002000, line 64) dispels it (line 272); the tower barrier never
 * registers AC (lines 209-212), so Link cannot touch it. A dispelled barrier is not killed: it plays its
 * cutscene, so it is a phase, not a defeat.
 *
 * Ganon's Castle is an adult place in the game, but the decomp here has no scene data to cite, so this is a
 * judgment: both ages are kept, and child kits simply lack Light Arrows.
 */
export const demoKekkai: ActorSpec = {
  overlay: 'ovl_Demo_Kekkai',
  name: "Ganon's Castle barrier",
  role: 'hazard',
  summary:
    "The energy barriers of Ganon's Castle. Walking into one hurts Link and throws him back, and no shield helps. A trial barrier is dispelled by a Light Arrow; the tower barrier cannot be touched.",
  cite: at(201),
  pools: [],
  damage: { kind: 'custom', entries: { ARROW_LIGHT: { damage: 0, to: 'dispelled', cite: at(272) } } },
  phases: [
    { id: 'tower', label: 'The tower barrier blocks the way', hittable: 'none', cite: at(209) },
    { id: 'trial', label: 'The trial barrier stands', cite: at(260) },
    { id: 'dispelled', label: 'The trial barrier is dispelled', hittable: 'none', cite: at(221) },
  ],
  start: 'trial',
  variants: [
    { id: 'tower', label: 'Tower barrier (params 0)', start: 'tower', cite: at(110) },
    { id: 'trial', label: 'Trial barrier (params 1-6)', start: 'trial', cite: at(125) },
  ],
  range: 'far',
  steps: [
    { from: 'tower', to: 'tower', label: 'Link touches the barrier and is thrown back', range: 'near', attack: 'barrier', cite: at(207) },
    { from: 'trial', to: 'trial', label: 'Link touches the barrier and is thrown back', range: 'near', attack: 'barrier', cite: at(265) },
  ],
  attacks: [
    { id: 'barrier', label: 'Barrier', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(63) },
  ],
  actionFuncs: {},
  states: {
    DemoKekkai_TowerBarrier: { phase: 'tower', cite: at(176) },
    DemoKekkai_TrialBarrierIdle: { phase: 'trial', cite: at(260) },
    DemoKekkai_TrialBarrierDispel: { phase: 'dispelled', cite: at(221) },
    killed_on_init: { excluded: 'a barrier whose event flag is already set is killed in Init and never appears', cite: at(139) },
  },
  atSources: { [at(63)]: 'barrier' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: "every kit's health is a multiple of the barrier's 4 (2 with Double Defense), so a touch never takes more than Link has left",
      link_deku_stick: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_hammer_swing: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_slash_giant_1: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_slash_giant_2: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_shield_1: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_jump_giant_1: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_jump_giant_3: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_jump_master_3: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      link_hammer_jump: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_deku_stick: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_hammer_swing: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_slash_giant: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_magic_fire: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_spin_giant: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_jump_kokiri_self: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_jump_giant: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_jump_giant_self: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_jump_master_self: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
      miss_hammer_jump: 'needs Link near at his turn, but the barrier throws him back on the beat he closes in; only Nayru\'s Love keeps him near, and the Nayru kits carry neither this item nor this sword',
    },
  },
}
