import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Hidan_Fwbig/z_bg_hidan_fwbig.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Two kinds by params (line 93). Direction 0 is the wall before a door: it stands until a switch lowers it for
 * 150 frames. Link sets the switch elsewhere, so that kind is two variants, at rest and just switched.
 * Any other direction is the wall that chases Link: it rises when he crosses x < 1150, sweeps after him, and
 * when it touches him drops, backs off, and rises again (lines 239-241, 169).
 * The collider is live while the wall stands above home - 200 (line 251). Rising or lowering steps 10 a frame
 * (line 150) over 2400 * scale: 240 for the door wall (scale 0.1, line 116), 360 for the chasing wall
 * (scale 0.15, line 109), so 24 or 36 frames.
 * The chasing sweep turns 0x6390 at 0x20 scaled by R_UPDATE_RATE * 0.5 (src/code/z_lib.c:55), with
 * R_UPDATE_RATE 3 (src/code/game.c:497): 0x6390 / 0x30 = 531 frames.
 * The Fire Temple is visited as adult: `src/overlays/actors/ovl_En_Du/z_en_du.c:173` gates Darunia's
 * Fire Temple appearance on LINK_IS_ADULT.
 */
const burns = (p: string, line: number, to = p): Step => ({ from: p, to, label: 'The fire wall burns Link', range: 'near', attack: 'flame', cite: at(line) })

const phases: Phase[] = [
  { id: 'wall_up', label: 'The fire wall blocks the door', cite: at(135) },
  { id: 'lower_wall', label: 'The fire wall drops', frames: { value: 24, cite: at(161) }, cite: at(160) },
  { id: 'wall_open', label: 'The fire wall is down', frames: { value: 150, cite: at(164) }, cite: at(180) },
  { id: 'rise_wall', label: 'The fire wall rises again', frames: { value: 24, cite: at(150) }, cite: at(149) },
  { id: 'chase_wait', label: 'The chasing wall lies low', cite: at(190) },
  { id: 'rise_chase', label: 'The chasing wall rises', frames: { value: 36, cite: at(150) }, cite: at(149) },
  { id: 'chase_sweep', label: 'The chasing wall sweeps after Link', frames: { value: 531, cite: at(201) }, cite: at(199) },
  { id: 'lower_chase', label: 'The chasing wall drops back', frames: { value: 36, cite: at(161) }, cite: at(160) },
]

const steps: Step[] = [
  burns('wall_up', 258),
  burns('lower_wall', 258),
  { from: 'lower_wall', to: 'wall_open', label: 'The fire wall is down', afterTimer: true, cite: at(163) },
  { from: 'wall_open', to: 'rise_wall', label: 'Time is up and the fire wall rises', afterTimer: true, cite: at(185) },
  burns('rise_wall', 258),
  { from: 'rise_wall', to: 'wall_up', label: 'The fire wall stands again', afterTimer: true, cite: at(153) },
  { from: 'chase_wait', to: 'rise_chase', label: 'Link crosses the room and the wall rises', range: 'near', cite: at(194) },
  burns('rise_chase', 241, 'lower_chase'),
  { from: 'rise_chase', to: 'chase_sweep', label: 'The chasing wall starts to sweep', afterTimer: true, cite: at(155) },
  burns('chase_sweep', 241, 'lower_chase'),
  { from: 'chase_sweep', to: 'lower_chase', label: 'The sweep ends and the wall drops to start over', afterTimer: true, cite: at(203) },
  burns('lower_chase', 241),
  { from: 'lower_chase', to: 'rise_chase', label: 'The chasing wall rises behind Link again', afterTimer: true, cite: at(175) },
]

/** A phase left only by steps that wait for its timer always has its timer spent when it is left. */
const timerSpent = (phases: Phase[], steps: Step[]) =>
  Object.fromEntries(
    phases
      .filter((p) => p.frames && steps.every((s) => s.from !== p.id || s.to === p.id || s.afterTimer))
      .map((p) => [`${p.id}_timer_clears`, `${p.id} is left only by a step that waits for its timer, so the timer is always spent when it is left`]),
  )

export const bgHidanFwbig: ActorSpec = {
  overlay: 'ovl_Bg_Hidan_Fwbig',
  name: 'Fire Temple great fire wall',
  role: 'hazard',
  summary: 'A towering wall of fire. One kind blocks a door until a switch drops it for a few seconds. The other rises behind Link and sweeps after him across the room, dropping back each time it touches him. The fire burns and cannot be blocked.',
  cite: at(4),
  pools: [],
  damage: { kind: 'none' },
  phases,
  start: 'wall_up',
  variants: [
    { id: 'door_wall', label: 'Fire wall before a door', start: 'wall_up', cite: at(117) },
    { id: 'door_wall_switched', label: 'Fire wall before a door, just switched off', start: 'lower_wall', cite: at(145) },
    { id: 'chasing_wall', label: 'Fire wall that chases Link', start: 'chase_wait', cite: at(113) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'flame', label: 'Fire wall', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(71) },
  ],
  actionFuncs: {
    BgHidanFwbig_WaitForSwitch: 'wall_up',
    BgHidanFwbig_WaitForCs: { excluded: 'a 35-frame camera cutscene between the switch and the wall dropping; the switched variant starts after it', cite: at(138) },
    BgHidanFwbig_Lower: 'lower_*',
    BgHidanFwbig_WaitForTimer: 'wall_open',
    BgHidanFwbig_Rise: 'rise_*',
    BgHidanFwbig_WaitForPlayer: 'chase_wait',
    BgHidanFwbig_Move: 'chase_sweep',
  },
  atSources: { [at(71)]: 'flame' },
  loadouts: standardLoadouts(['adult']),
  expected: { deadVerbs: timerSpent(phases, steps) },
}
