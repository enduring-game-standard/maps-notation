import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Dha/z_en_dha.c'
const at = (line: number): Cite => `${F}:${line}`

export const enDha: ActorSpec = {
  overlay: 'ovl_En_Dha',
  name: "Dead Hand's hand",
  role: 'part',
  summary:
    'One of the arms Dead Hand plants in the floor. It reaches for Link when he comes within 100 units and grabs him, which calls Dead Hand up. It has 8 health, recoils immune for 15 frames after each wound, and sinks into the floor when killed.',
  cite: at(171),
  pools: [{ id: 'hand', label: 'Hand', hp: { value: 8, cite: at(182) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      '0x0': { damage: false, note: 'reaction 0 returns before any damage is applied', cite: at(414) },
      '0xF': { damage: true, to: { wait: 'recoil' }, note: 'a wound that leaves health plays the damage sound and sets up TakeDamage', cite: at(426) },
    },
  },
  phases: [
    { id: 'wait', label: 'The hand waits in the floor, reaching for Link when he is close', cite: at(208) },
    {
      id: 'recoil',
      label: 'The hand recoils from a wound (immune while unk_1C0 is 9)',
      hittable: 'none',
      frames: { value: 15, cite: at(326) },
      cite: at(411),
    },
  ],
  start: 'wait',
  range: 'far',
  steps: [{ from: 'recoil', to: 'wait', label: 'The hand recovers and reaches again', afterTimer: true, cite: at(348) }],
  attacks: [],
  actionFuncs: {
    EnDha_Wait: 'wait',
    EnDha_TakeDamage: 'recoil',
    EnDha_Die: {
      excluded:
        'runs after the finishing blow: the hand sinks and stays down for 300 frames, then rises with health reset to 8 (lines 404, 420); pools cannot refill, so the encounter ends at the kill',
      cite: at(354),
    },
    actionFunc: { excluded: 'not an action function: the extractor matched the struct field that EnDha_SetupAction assigns', cite: at(168) },
  },
  atSources: {},
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        ['link_hurt', 'link_hurt_overkill', 'link_fell', 'link_heals', 'fairy_revives_link'].map((v) => [
          v,
          'the hand never damages Link: it has no AT element and no runtime atDmgInfo change, and its grab (line 232) deals no damage, so Link never loses health to heal, revive, or fall',
        ]),
      ),
      recoil_timer_clears: 'the recoil is one beat (15 frames) and its timer always runs out on that beat, so none is left to clear',
      ...Object.fromEntries(
        ['deku_stick', 'slash_kokiri', 'slash_master', 'slash_giant', 'spin_kokiri', 'spin_giant', 'spin_master', 'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump'].map((k) => [
          `miss_${k}`,
          'the only phase this swing misses in is the one-beat recoil, which only Link\'s own hit starts and which ends before his next move',
        ]),
      ),
    },
  },
}
