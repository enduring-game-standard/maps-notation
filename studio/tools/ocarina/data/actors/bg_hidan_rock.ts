import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Hidan_Rock/z_bg_hidan_rock.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * A stone block with a fire pillar. The pillar's collider is live while its height factor unk_16C is above 0
 * (line 353). Two kinds by params (line 91):
 * - Type 0 is a pushable block beside a vent. Until Link pushes it onto the vent, the vent's pillar follows a
 *   512-frame cycle of gameplayFrames: it grows and holds through frame 230 (lines 201-204), shrinks by 1 a frame
 *   from 19.625 (lines 204-206, about 20 frames), and is out while bit 0x100 is set (line 199, 256 frames).
 *   Pushing is a Link action the beat model lacks, so the block already on its vent (switch set, line 100) is
 *   its own variant. There the pillar lifts the block: rise, hold 20 frames, fall, rest 60 frames, and over.
 *   Init resets the timer to 0 after setting 60 (lines 103, 119), so that variant starts rising at once.
 * - Type 1 is a block that shakes when Link stands on it, then rides a pillar up and falls back.
 * Rising follows Math_SmoothStepToF(0.25, 20, 0.5) over 1820 or 480 units (lines 317-319): simulated, about
 * 101 and 34 frames. Falling, the pillar shrinks by 0.5 a frame (line 273) from (rise + 90) / 80 (line 328):
 * about 48 frames for type 0 and 14 for type 1. The rest of the fall, with the pillar out, is folded into the
 * next phase.
 * The Fire Temple is visited as adult: `src/overlays/actors/ovl_En_Du/z_en_du.c:173` gates Darunia's
 * Fire Temple appearance on LINK_IS_ADULT.
 */
const BURNING = ['vent_burning', 'vent_dying', 'rising_lift', 'top_lift', 'falling_lift', 'rising_block', 'top_block', 'falling_block']

const steps: Step[] = [
  ...BURNING.map((p): Step => ({ from: p, to: p, label: 'The fire pillar burns Link', range: 'near', attack: 'pillar', cite: at(355) })),
  { from: 'vent_burning', to: 'vent_dying', label: 'The vent\'s pillar shrinks', afterTimer: true, cite: at(206) },
  { from: 'vent_dying', to: 'vent_quiet', label: 'The vent goes quiet', afterTimer: true, cite: at(200) },
  { from: 'vent_quiet', to: 'vent_burning', label: 'The vent\'s pillar grows', afterTimer: true, cite: at(202) },
  { from: 'rising_lift', to: 'top_lift', label: 'The block reaches the top', afterTimer: true, cite: at(325) },
  { from: 'top_lift', to: 'falling_lift', label: 'The block drops', afterTimer: true, cite: at(303) },
  { from: 'falling_lift', to: 'resting_lift', label: 'The block lands on the vent', afterTimer: true, cite: at(260) },
  { from: 'resting_lift', to: 'rising_lift', label: 'The pillar lifts the block again', afterTimer: true, cite: at(221) },
  { from: 'idle_block', to: 'shaking_block', label: 'Link steps on and the block shakes', range: 'near', cite: at(229) },
  { from: 'shaking_block', to: 'rising_block', label: 'The pillar lifts the block', afterTimer: true, cite: at(246) },
  { from: 'rising_block', to: 'top_block', label: 'The block reaches the top', afterTimer: true, cite: at(325) },
  { from: 'top_block', to: 'falling_block', label: 'The block drops', afterTimer: true, cite: at(303) },
  { from: 'falling_block', to: 'settling_block', label: 'The block lands', afterTimer: true, cite: at(263) },
  { from: 'settling_block', to: 'idle_block', label: 'The block settles back in place', afterTimer: true, cite: at(293) },
]

const phases: Phase[] = [
  { id: 'vent_burning', label: 'The vent\'s pillar burns', frames: { value: 230, cite: at(203) }, cite: at(201) },
  { id: 'vent_dying', label: 'The vent\'s pillar shrinks away', frames: { value: 20, cite: at(204) }, cite: at(206) },
  { id: 'vent_quiet', label: 'The vent is quiet', frames: { value: 256, cite: at(199) }, cite: at(200) },
  { id: 'rising_lift', label: 'The pillar lifts the block high', frames: { value: 101, cite: at(317) }, cite: at(308) },
  { id: 'top_lift', label: 'The block hangs at the top', frames: { value: 20, cite: at(324) }, cite: at(297) },
  { id: 'falling_lift', label: 'The block falls as the pillar dies', frames: { value: 48, cite: at(273) }, cite: at(255) },
  { id: 'resting_lift', label: 'The block rests on the vent', frames: { value: 60, cite: at(259) }, cite: at(215) },
  { id: 'idle_block', label: 'The block waits for Link to step on', cite: at(225) },
  { id: 'shaking_block', label: 'The block shakes', frames: { value: 20, cite: at(227) }, cite: at(233) },
  { id: 'rising_block', label: 'The pillar lifts the block', frames: { value: 34, cite: at(319) }, cite: at(308) },
  { id: 'top_block', label: 'The block hangs at the top', frames: { value: 20, cite: at(324) }, cite: at(297) },
  { id: 'falling_block', label: 'The block falls as the pillar dies', frames: { value: 14, cite: at(273) }, cite: at(255) },
  { id: 'settling_block', label: 'The block settles into place', frames: { value: 15, cite: at(262) }, cite: at(291) },
]

/** A phase left only by steps that wait for its timer always has its timer spent when it is left. */
const timerSpent = (phases: Phase[], steps: Step[]) =>
  Object.fromEntries(
    phases
      .filter((p) => p.frames && steps.every((s) => s.from !== p.id || s.to === p.id || s.afterTimer))
      .map((p) => [`${p.id}_timer_clears`, `${p.id} is left only by a step that waits for its timer, so the timer is always spent when it is left`]),
  )

export const bgHidanRock: ActorSpec = {
  overlay: 'ovl_Bg_Hidan_Rock',
  name: 'Fire Temple stone block',
  role: 'hazard',
  summary: 'A stone block tied to a fire pillar. A pushable block sits beside a vent whose pillar flares and dies on a cycle; once pushed onto the vent, the pillar lifts it and drops it over and over. Another block shakes when Link stands on it, then rides a pillar up and falls back. The pillar burns and cannot be blocked.',
  cite: at(4),
  pools: [],
  damage: { kind: 'none' },
  phases,
  start: 'vent_burning',
  variants: [
    { id: 'pushable', label: 'Pushable block beside its vent', start: 'vent_burning', cite: at(106) },
    { id: 'pushed', label: 'Block already pushed onto its vent', start: 'rising_lift', cite: at(104) },
    { id: 'elevator', label: 'Block that rides a pillar when stood on', start: 'idle_block', cite: at(115) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'pillar', label: 'Fire pillar', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(69) },
  ],
  actionFuncs: {
    func_8088B268: 'vent_*',
    func_8088B5F4: 'resting_lift',
    func_8088B634: 'idle_block',
    func_8088B69C: 'shaking_block',
    func_8088B79C: 'falling_*',
    func_8088B90C: 'settling_block',
    func_8088B954: 'top_*',
    func_8088B990: 'rising_*',
  },
  atSources: { [at(69)]: 'pillar' },
  loadouts: standardLoadouts(['adult']),
  expected: { deadVerbs: timerSpent(phases, steps) },
}
