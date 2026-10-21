import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Jya_Haheniron/z_bg_jya_haheniron.c'
const at = (line: number): Cite => `${F}:${line}`
const noCollider = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * Bg_Jya_Ironobj spawns these when an Iron Knuckle smashes a Spirit Temple pillar or throne
 * (`src/overlays/actors/ovl_Bg_Jya_Ironobj/z_bg_jya_ironobj.c:135`). Both ages walk the Spirit Temple
 * (`src/overlays/actors/ovl_Bg_Jya_Block/z_bg_jya_block.c:57`, `src/overlays/actors/ovl_Bg_Jya_1flift/z_bg_jya_1flift.c:119`).
 *
 * One fragment hits Link at most once for 4 health, so the kits carry a quarter heart: the fight is the
 * fragment against Link on his last quarter heart, which is the only way it can fell him.
 */
export const bgJyaHaheniron: ActorSpec = {
  overlay: 'ovl_Bg_Jya_Haheniron',
  name: 'Iron Knuckle debris',
  role: 'projectile',
  summary:
    'An iron chunk thrown out when an Iron Knuckle smashes a pillar or throne. It tumbles through the air and shatters on the first thing it meets: the floor, a wall, or Link, whom it hits once. After 60 frames it vanishes on its own. Link cannot hit it.',
  cite: at(158),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'flying', label: 'The iron chunk tumbles through the air', frames: { value: 60, cite: at(172) }, cite: at(158) },
    { id: 'gone', label: 'The chunk has shattered', cite: at(171) },
  ],
  start: 'flying',
  range: 'near',
  steps: [
    { from: 'flying', to: 'gone', label: 'The chunk strikes Link and shatters', range: 'near', attack: 'chunk', cite: at(166) },
    { from: 'flying', to: 'gone', label: 'The chunk misses Link, lands and shatters, or vanishes', range: 'far', afterTimer: true, cite: at(173) },
  ],
  attacks: [{ id: 'chunk', label: 'Iron chunk', damage: 4, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(51) }],
  actionFuncs: {
    BgJyaHaheniron_ChairCrumble: 'flying',
    BgJyaHaheniron_PillarCrumble: noCollider('params 1 debris: only params 0 initializes the collider, so it can never touch Link', 134),
    BgJyaHaheniron_RubbleCollide: noCollider('params 2 debris: only params 0 initializes the collider, so it can never touch Link', 134),
  },
  atSources: { [at(51)]: 'chunk' },
  loadouts: standardLoadouts(['child', 'adult'], 0.25),
  expected: {
    deadVerbs: {
      link_hurt_overkill: "the chunk hits once for 4 (2 with Double Defense) and every kit starts with 4 health, so a hit never takes more than Link has left",
    },
  },
}
