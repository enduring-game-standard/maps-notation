import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Hidan_Curtain/z_bg_hidan_curtain.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * A ring of fire that guards a spot. The fire burns while it stands above 50 alpha (line 242). A switch or a
 * cleared room lowers it; Link sets those elsewhere, so the beat model has no verb for it. The fight therefore
 * starts either at rest or on the beat the switch has just lowered the fire, one variant per timed type.
 * Types 4 and 5 run inverted (lines 231-238): at rest they are out, and the switch raises them.
 * Lowering or raising takes riseDist / riseSpeed = 144 / 5 or 88 / 3, about 29 frames (line 68).
 * The Fire Temple is visited as adult: `src/overlays/actors/ovl_En_Du/z_en_du.c:173` gates Darunia's
 * Fire Temple appearance on LINK_IS_ADULT.
 */
const OPEN: [type: number, frames: number, line: number][] = [[1, 300, 200], [2, 400, 194], [3, 160, 198]]
const SHIFT = { value: 29, cite: at(68) }

const phases: Phase[] = [
  { id: 'rest_up', label: 'The fire ring burns, waiting for a switch', cite: at(141) },
  { id: 'rest_down', label: 'The fire ring is out, waiting for a switch', cite: at(124) },
  ...OPEN.map(([t]): Phase => ({ id: `turnoff_lower_t${t}`, label: `The fire ring sinks (type ${t})`, frames: SHIFT, cite: at(187) })),
  { id: 'turnoff_raise_t4', label: 'The fire ring rises (type 4)', frames: SHIFT, cite: at(187) },
  ...OPEN.map(([t, frames, line]): Phase => ({ id: `timer_open_t${t}`, label: `The fire ring is out for a while (type ${t})`, frames: { value: frames, cite: at(line) }, cite: at(207) })),
  { id: 'timer_lit_t4', label: 'The fire ring burns for a while (type 4)', frames: { value: 200, cite: at(196) }, cite: at(207) },
  { id: 'turnon_raise', label: 'The fire ring rises again', frames: SHIFT, cite: at(178) },
  { id: 'turnon_lower', label: 'The fire ring sinks again (type 4)', frames: SHIFT, cite: at(178) },
]

const BURNING = ['rest_up', ...OPEN.map(([t]) => `turnoff_lower_t${t}`), 'turnoff_raise_t4', 'timer_lit_t4', 'turnon_raise', 'turnon_lower']

const steps: Step[] = [
  ...BURNING.map((p): Step => ({ from: p, to: p, label: 'The fire ring burns Link', range: 'near', attack: 'flame', cite: at(244) })),
  ...OPEN.map(([t]): Step => ({ from: `turnoff_lower_t${t}`, to: `timer_open_t${t}`, label: 'The fire ring is down', afterTimer: true, cite: at(202) })),
  { from: 'turnoff_raise_t4', to: 'timer_lit_t4', label: 'The fire ring is up', afterTimer: true, cite: at(202) },
  ...OPEN.map(([t]): Step => ({ from: `timer_open_t${t}`, to: 'turnon_raise', label: 'Time is up and the fire ring returns', afterTimer: true, cite: at(210) })),
  { from: 'timer_lit_t4', to: 'turnon_lower', label: 'Time is up and the fire ring sinks', afterTimer: true, cite: at(210) },
  { from: 'turnon_raise', to: 'rest_up', label: 'The fire ring stands again', afterTimer: true, cite: at(180) },
  { from: 'turnon_lower', to: 'rest_down', label: 'The fire ring is out again', afterTimer: true, cite: at(180) },
]

/** A phase left only by steps that wait for its timer always has its timer spent when it is left. */
const timerSpent = (phases: Phase[], steps: Step[]) =>
  Object.fromEntries(
    phases
      .filter((p) => p.frames && steps.every((s) => s.from !== p.id || s.to === p.id || s.afterTimer))
      .map((p) => [`${p.id}_timer_clears`, `${p.id} is left only by a step that waits for its timer, so the timer is always spent when it is left`]),
  )

export const bgHidanCurtain: ActorSpec = {
  overlay: 'ovl_Bg_Hidan_Curtain',
  name: 'Fire Temple fire ring',
  role: 'hazard',
  summary: 'A ring of fire that walls off a spot until a switch or a cleared room lowers it. Timed rings return after a set time; inverted rings stay out until a switch raises them. The fire burns and cannot be blocked.',
  cite: at(4),
  pools: [],
  damage: { kind: 'none' },
  phases,
  start: 'rest_up',
  variants: [
    { id: 'resting', label: 'A standing fire ring (types 0, 1, 2, 3, 6)', start: 'rest_up', cite: at(122) },
    { id: 'resting_inverted', label: 'An inverted fire ring, out until its switch (types 4, 5)', start: 'rest_down', cite: at(124) },
    ...OPEN.map(([t, , line]) => ({ id: `switched_t${t}`, label: `A type ${t} fire ring just switched off`, start: `turnoff_lower_t${t}`, cite: at(line) })),
    { id: 'switched_t4', label: 'A type 4 fire ring just switched on', start: 'turnoff_raise_t4', cite: at(196) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'flame', label: 'Fire ring', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(57) },
  ],
  actionFuncs: {
    BgHidanCurtain_WaitForSwitchOn: 'rest_*',
    BgHidanCurtain_WaitForClear: 'rest_up',
    BgHidanCurtain_WaitForSwitchOff: 'rest_up',
    BgHidanCurtain_TurnOff: 'turnoff_*',
    BgHidanCurtain_WaitForTimer: 'timer_*',
    BgHidanCurtain_TurnOn: 'turnon_*',
    BgHidanCurtain_WaitForCutscene: { excluded: 'a camera cutscene of 50 or 30 frames between the switch and TurnOff; the switched variants start after it', cite: at(145) },
  },
  atSources: { [at(57)]: 'flame' },
  loadouts: standardLoadouts(['adult']),
  expected: { deadVerbs: timerSpent(phases, steps) },
}
