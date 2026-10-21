import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Hidan_Sima/z_bg_hidan_sima.c'
const at = (line: number): Cite => `${F}:${line}`

/** Only the moving platform sets its fire collider; the sinking platform never does. */
const sinking = (why: string, line: number): Excluded => ({
  excluded: `sinking-platform variant, which never sets its fire collider (AT is set only when params is not BG_HIDAN_SIMA_SINKING, line 241), so it cannot hurt Link: ${why}`,
  cite: at(line),
})

/**
 * The Fire Temple is visited as adult: `src/overlays/actors/ovl_En_Du/z_en_du.c:173` gates Darunia's
 * Fire Temple appearance on LINK_IS_ADULT.
 */
export const bgHidanSima: ActorSpec = {
  overlay: 'ovl_Bg_Hidan_Sima',
  name: 'Fire Temple flaming platform',
  role: 'hazard',
  summary: 'A stone platform over lava that slides back and forth, trailing two fireballs behind it while it moves and resting between runs. The fire burns and cannot be blocked.',
  cite: at(4),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'resting', label: 'The platform rests before turning around', frames: { value: 20, cite: at(215) }, cite: at(180) },
    { id: 'moving', label: 'The platform slides, trailing fire', frames: { value: 60, cite: at(187) }, cite: at(192) },
  ],
  start: 'resting',
  range: 'far',
  steps: [
    { from: 'resting', to: 'moving', label: 'The platform turns and starts to slide', afterTimer: true, cite: at(188) },
    { from: 'moving', to: 'moving', label: 'The trailing fire burns Link', range: 'near', attack: 'fire', cite: at(251) },
    { from: 'moving', to: 'resting', label: 'The platform stops', afterTimer: true, cite: at(216) },
  ],
  attacks: [
    { id: 'fire', label: 'Trailing fireball', damage: 4, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(53) },
  ],
  actionFuncs: {
    BgHidanSima_MovingPlatform_Idle: 'resting',
    BgHidanSima_MovingPlatform_Move: 'moving',
    BgHidanSima_SinkingPlatform_Idle: sinking('waits for Link to stand on it', 129),
    BgHidanSima_SinkingPlatform_WarningShake: sinking('shakes before sinking', 147),
    BgHidanSima_SinkingPlatform_Sink: sinking('sinks into the lava', 167),
  },
  atSources: { [at(53)]: 'fire', [at(64)]: 'fire' },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      resting_timer_clears: 'resting is left only by a step that waits for its timer, so the timer is always spent when it is left',
      moving_timer_clears: 'moving is left only by a step that waits for its timer, so the timer is always spent when it is left; its fire step stays in moving',
    },
  },
}
