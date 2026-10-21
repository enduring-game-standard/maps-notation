import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Fire_Rock/z_en_fire_rock.c'
const at = (line: number): Cite => `${F}:${line}`

export const enFireRock: ActorSpec = {
  overlay: 'ovl_En_Fire_Rock',
  name: 'Falling volcanic rock',
  role: 'hazard',
  summary: 'Burning rocks. A falling rock drops on Link, breaks on the ground or on his shield into two pieces that bounce out and can hit him too. A ceiling spot drops a rock each time Link steps under it. A rock resting on the floor burns Link when he touches it. None of them has health; Link cannot destroy them.',
  cite: at(35),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'fall_rock', label: 'A rock falls', cite: at(180) },
    { id: 'fall_homing', label: 'A rock falls, steering over Link', cite: at(195) },
    { id: 'fall_pieces', label: 'Two broken pieces bounce out', cite: at(252) },
    { id: 'gone', label: 'The rock has crumbled away', hittable: 'none', cite: at(277) },
    { id: 'on_floor', label: 'A burning rock rests on the floor', cite: at(308) },
    { id: 'ceiling_armed', label: 'A ceiling spot waits for Link', hittable: 'none', cite: at(283) },
    { id: 'fall_ceiling', label: 'A rock falls from the ceiling spot', cite: at(289) },
    { id: 'fall_pieces_ceiling', label: 'Pieces of the ceiling rock bounce out', cite: at(252) },
    { id: 'ceiling_spent', label: 'The ceiling spot waits for Link to step away', hittable: 'none', cite: at(296) },
  ],
  start: 'fall_rock',
  variants: [
    { id: 'falling', label: 'A rock spawned to fall', start: 'fall_rock', cite: at(124) },
    { id: 'falling_homing', label: 'A Death Mountain rock that steers over Link', start: 'fall_homing', cite: at(119) },
    { id: 'floor', label: 'A burning rock on the floor', start: 'on_floor', cite: at(107) },
    { id: 'ceiling', label: 'A ceiling spot that drops rocks', start: 'ceiling_armed', cite: at(102) },
  ],
  range: 'far',
  steps: [
    { from: 'fall_rock', to: 'fall_pieces', label: 'The rock lands on Link and breaks', range: 'near', attack: 'rock', cite: at(227) },
    { from: 'fall_rock', to: 'fall_pieces', label: 'The rock lands away from Link and breaks', range: 'far', cite: at(227) },
    { from: 'fall_homing', to: 'fall_pieces', label: 'The steering rock lands on Link and breaks', attack: 'rock', cite: at(195) },
    { from: 'fall_pieces', to: 'gone', label: 'A piece bounces into Link', range: 'near', attack: 'rock', cite: at(255) },
    { from: 'fall_pieces', to: 'gone', label: 'The pieces land and crumble', cite: at(255) },
    { from: 'on_floor', to: 'on_floor', label: 'Link brushes the burning rock', range: 'near', attack: 'floor_burn', cite: at(380) },
    { from: 'ceiling_armed', to: 'fall_ceiling', label: 'Link steps under the ceiling spot and a rock drops', range: 'near', cite: at(286) },
    { from: 'fall_ceiling', to: 'fall_pieces_ceiling', label: 'The ceiling rock lands on Link and breaks', range: 'near', attack: 'rock', cite: at(227) },
    { from: 'fall_ceiling', to: 'fall_pieces_ceiling', label: 'The ceiling rock lands away from Link', range: 'far', cite: at(227) },
    { from: 'fall_pieces_ceiling', to: 'ceiling_spent', label: 'A piece bounces into Link', range: 'near', attack: 'rock', cite: at(255) },
    { from: 'fall_pieces_ceiling', to: 'ceiling_spent', label: 'The pieces land and crumble', cite: at(255) },
    { from: 'ceiling_spent', to: 'ceiling_armed', label: 'Link steps away and the ceiling spot rearms', range: 'far', cite: at(298) },
  ],
  attacks: [
    { id: 'rock', label: 'Falling rock', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(58) },
    { id: 'floor_burn', label: 'Burning floor rock', damage: 8, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(78) },
  ],
  actionFuncs: {
    EnFireRock_Fall: 'fall_*',
    EnFireRock_SpawnMoreBrokenPieces: { excluded: 'runs one frame: spawns the next pieces and kills the rock; it is the step from a falling phase into its pieces phase', cite: at(277) },
    FireRock_WaitOnFloor: 'on_floor',
    FireRock_WaitSpawnRocksFromCeiling: 'ceiling_*',
  },
  atSources: {
    [at(58)]: 'rock',
    [at(78)]: 'floor_burn',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
    },
  },
}
