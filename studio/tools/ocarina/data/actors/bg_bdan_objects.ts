import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Bdan_Objects/z_bg_bdan_objects.c'
const at = (line: number): Cite => `${F}:${line}`
const x = (excluded: string, line: number): Excluded => ({ excluded, cite: at(line) })

const cutscene = 'Big Octo intro cutscene driven by Ruto and the camera; the spike collider is not set'
const afterClear = 'runs after the room is cleared (Big Octo defeated), when the platform sinks and becomes a lift; the spike collider is no longer set'
const otherType = 'a Jabu-Jabu object type with no collider: only JABU_OBJECTS_TYPE_BIG_OCTO_PLATFORM sets one up'

export const bgBdanObjects: ActorSpec = {
  overlay: 'ovl_Bg_Bdan_Objects',
  name: "Big Octo's spiked platform",
  role: 'hazard',
  summary: "Lord Jabu-Jabu's rotating platform in Big Octo's room. While the battle runs, its spikes (a 187-unit cylinder at the platform's center) cut Link. It has no AC collider, so Link cannot hurt it.",
  cite: at(343),
  pools: [],
  damage: { kind: 'none' },
  phases: [{ id: 'battle', label: 'The platform turns while Big Octo fights', cite: at(345) }],
  start: 'battle',
  range: 'far',
  steps: [{ from: 'battle', to: 'battle', label: 'The spikes cut Link', range: 'near', attack: 'spikes', cite: at(345) }],
  attacks: [
    { id: 'spikes', label: 'Platform spikes', damage: 4, effect: { kind: 'none' }, blockable: false, dodgeable: true, source: at(84) },
  ],
  actionFuncs: {
    BgBdanObjects_OctoPlatform_BattleInProgress: 'battle',
    BgBdanObjects_OctoPlatform_WaitForRutoToStartCutscene: x(cutscene, 210),
    BgBdanObjects_OctoPlatform_RaiseToUpperPosition: x(cutscene, 238),
    BgBdanObjects_OctoPlatform_WaitForRutoToAdvanceCutscene: x(cutscene, 262),
    BgBdanObjects_OctoPlatform_PauseBeforeDescending: x(cutscene, 319),
    BgBdanObjects_OctoPlatform_DescendWithBigOcto: x(cutscene, 286),
    BgBdanObjects_OctoPlatform_WaitForBigOctoToStartBattle: x('waits for Big Octo to start the battle after the intro; the spike collider is set only in BattleInProgress', 330),
    BgBdanObjects_SinkToFloorHeight: x(afterClear, 357),
    BgBdanObjects_WaitForPlayerInRange: x(afterClear, 367),
    BgBdanObjects_RaiseToUpperPosition: x(afterClear, 376),
    BgBdanObjects_DoNothing: x('idle end state of the lift and the lowered falling platform; no collider', 386),
    BgBdanObjects_ElevatorOscillate: x(otherType, 178),
    BgBdanObjects_WaitForSwitch: x(otherType, 147),
    BgBdanObjects_ChangeWaterBoxLevel: x(otherType, 147),
    BgBdanObjects_WaitForTimerExpired: x(otherType, 147),
    BgBdanObjects_WaitForPlayerOnTop: x(otherType, 183),
    BgBdanObjects_FallToLowerPos: x(otherType, 183),
  },
  atSources: { [at(84)]: 'spikes' },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the only damage is the 4-unit spike, and every kit starts and heals Link in multiples of 4, so a hit never finds less health left than it costs',
    },
  },
}
