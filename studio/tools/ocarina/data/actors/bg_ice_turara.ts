import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Ice_Turara/z_bg_ice_turara.c'
const at = (line: number): Cite => `${F}:${line}`

/** The AC cylinder's 0x4FC007CA, as the damage types Link emits. */
const BREAKS: DmgType[] = [
  'DEKU_STICK', 'EXPLOSIVE', 'HAMMER_SWING', 'HOOKSHOT', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT',
  'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP',
]

type Kind = 'once' | 'regrow'
const KINDS: Kind[] = ['once', 'regrow']
const NAME: Record<Kind, string> = { once: 'icicle', regrow: 'regrowing icicle' }
const AFTER: Record<Kind, { to: string; line: number }> = { once: { to: 'gone', line: 182 }, regrow: { to: 'regrow', line: 180 } }

const phases: Phase[] = [
  { id: 'stalagmite', label: 'An ice stalagmite stands', cite: at(131) },
  ...KINDS.flatMap((k): Phase[] => [
    { id: `wait_${k}`, label: `The ${NAME[k]} hangs from the ceiling`, hittable: 'none', cite: at(135) },
    { id: `shiver_${k}`, label: `The ${NAME[k]} shivers`, hittable: 'none', frames: { value: 10, cite: at(136) }, cite: at(149) },
    { id: `fall_${k}`, label: `The ${NAME[k]} falls`, hittable: 'none', cite: at(191) },
  ]),
  { id: 'regrow', label: 'The icicle grows back', hittable: 'none', frames: { value: 120, cite: at(178) }, cite: at(196) },
  { id: 'gone', label: 'The icicle has shattered', hittable: 'none', cite: at(182) },
]

const steps: Step[] = [
  ...KINDS.flatMap((k): Step[] => [
    { from: `wait_${k}`, to: `shiver_${k}`, label: `Link walks under the ${NAME[k]}`, range: 'near', cite: at(137) },
    { from: `shiver_${k}`, to: `fall_${k}`, label: `The ${NAME[k]} drops`, afterTimer: true, cite: at(158) },
    { from: `fall_${k}`, to: AFTER[k].to, label: `The ${NAME[k]} strikes Link and shatters`, range: 'near', attack: 'icicle', cite: at(AFTER[k].line) },
    { from: `fall_${k}`, to: AFTER[k].to, label: `The ${NAME[k]} shatters on the floor`, range: 'far', cite: at(AFTER[k].line) },
  ]),
  { from: 'regrow', to: 'wait_regrow', label: 'The icicle has grown back', afterTimer: true, cite: at(197) },
]

export const bgIceTurara: ActorSpec = {
  overlay: 'ovl_Bg_Ice_Turara',
  name: 'Icicle',
  role: 'hazard',
  summary: 'Ice Cavern icicles. A hanging icicle shivers when Link walks under it, then drops and shatters, cutting him if he is still there; one kind grows back. An ice stalagmite never hurts Link and shatters at one sword, stick, hammer, hookshot, or bomb hit.',
  cite: at(84),
  pools: [],
  damage: {
    kind: 'custom',
    entries: Object.fromEntries(BREAKS.map((d) => [d, { damage: 0, to: 'defeated', cite: at(128) }])),
  },
  phases,
  start: 'stalagmite',
  variants: [
    { id: 'stalagmite', label: 'Ice stalagmite', start: 'stalagmite', cite: at(85) },
    { id: 'stalactite', label: 'Icicle', start: 'wait_once', cite: at(89) },
    { id: 'stalactite_regrow', label: 'Icicle that grows back', start: 'wait_regrow', cite: at(177) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'icicle', label: 'Falling icicle', damage: 4, effect: { kind: 'none' }, blockable: false, dodgeable: true, source: at(44) },
  ],
  actionFuncs: {
    BgIceTurara_Stalagmite: 'stalagmite',
    BgIceTurara_Wait: 'wait_*',
    BgIceTurara_Shiver: 'shiver_*',
    BgIceTurara_Fall: 'fall_*',
    BgIceTurara_Regrow: 'regrow',
  },
  atSources: { [at(44)]: 'icicle' },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      shiver_once_timer_clears: 'the icicle leaves its shiver only by the step that waits for the timer, and no hit lands on it, so the timer is always spent',
      shiver_regrow_timer_clears: 'as shiver_once_timer_clears',
      regrow_timer_clears: 'the icicle leaves regrowth only by the step that waits for the timer, and no hit lands on it',
      link_hurt_overkill: 'the only damage is the 4-unit hit (2 with Double Defense), and every kit starts and heals Link in multiples of 4, so a hit never finds less health left than it costs',
    },
  },
}
