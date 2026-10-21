import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bombf/z_en_bombf.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * A Bomb Flower as a hazard. The flower (params BOMBFLOWER_FLOWER) never dies; its bomb's blast is AT_TYPE_ALL
 * (line 88), so it hurts Link.
 *
 * The flower and its bomb share one collider mask, 0x0003F828 (line 63): explosions, arrows, and Din's Fire. A sword
 * or stick does not set either off. A hit on a grown flower spawns a bomb with its timer at 0 (lines 186-190), which
 * explodes on its first frame (line 425), and the flower starts regrowing: 180 frames (line 191), then 20 frames of
 * growth (line 221). The blast takes one beat of that, so the 180-frame timer stands for the rest. Hits during
 * regrowth do nothing: the hit test sits under `flowerBombScale >= 1.0f` (line 165).
 *
 * The other kind is a bomb Link has pulled from the flower (line 167) and set down: a 140-frame fuse (line 130), cut
 * short by any accepted hit (line 387). Pulling and throwing are not Link verbs, so the pull is the variant's setup
 * and the held bomb (EnBombf_WaitForRelease) is left out. A burning Deku Stick lights a flower's bomb at 100 frames
 * (line 198) or shortens a pulled one to 100 (line 391); the Link spec has no burning-stick verb, so neither is here.
 * The blast lasts 10 frames (line 447), one beat. One blast hits for 8, so the kits carry half a heart.
 */
const DETONATE: DmgType[] = ['EXPLOSIVE', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3', 'MAGIC_FIRE']
const off = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const pulledBombLit = Object.fromEntries(DETONATE.map((d) => [d, { damage: 0, to: 'blast_body', cite: at(387) }])) as Phase['overrides']

export const enBombf: ActorSpec = {
  overlay: 'ovl_En_Bombf',
  name: 'Bomb Flower',
  role: 'hazard',
  summary:
    "A Bomb Flower. An explosion, an arrow, or Din's Fire makes its bomb explode on the spot, hurting Link for half a heart if he is close, and the flower regrows its bomb in about ten seconds. A bomb Link has pulled and set down burns a 140-frame fuse. A sword does not set either off.",
  cite: at(102),
  pools: [],
  damage: {
    kind: 'custom',
    entries: Object.fromEntries(DETONATE.map((d) => [d, { damage: 0, to: 'blast_flower', cite: at(190) }])),
  },
  phases: [
    { id: 'flower_ready', label: 'The flower holds a grown bomb', cite: at(165) },
    { id: 'blast_flower', label: "The flower's bomb explodes", hittable: 'none', cite: at(286) },
    { id: 'flower_regrowing', label: 'The flower regrows its bomb', hittable: 'none', frames: { value: 180, cite: at(191) }, cite: at(220) },
    { id: 'body_fuse', label: 'The pulled bomb burns its fuse', frames: { value: 140, cite: at(130) }, overrides: pulledBombLit, cite: at(136) },
    { id: 'blast_body', label: 'The pulled bomb explodes', hittable: 'none', cite: at(286) },
    { id: 'spent', label: 'The blast has faded and the pulled bomb is gone', hittable: 'none', cite: at(323) },
  ],
  start: 'flower_ready',
  variants: [
    { id: 'flower', label: 'A grown Bomb Flower', start: 'flower_ready', cite: at(141) },
    { id: 'pulled_bomb', label: 'A bomb Link has pulled from the flower and set down', start: 'body_fuse', cite: at(167) },
  ],
  range: 'near',
  steps: [
    { from: 'blast_flower', to: 'flower_regrowing', label: 'The blast catches Link', range: 'near', attack: 'explosion', cite: at(286) },
    { from: 'blast_flower', to: 'flower_regrowing', label: 'The blast goes off out of reach', range: 'far', cite: at(191) },
    { from: 'flower_regrowing', to: 'flower_ready', label: 'The bomb has grown back', afterTimer: true, cite: at(222) },
    { from: 'body_fuse', to: 'blast_body', label: 'The fuse runs out', afterTimer: true, cite: at(449) },
    { from: 'blast_body', to: 'spent', label: 'The blast catches Link', range: 'near', attack: 'explosion', cite: at(286) },
    { from: 'blast_body', to: 'spent', label: 'The blast goes off out of reach', range: 'far', cite: at(323) },
  ],
  attacks: [{ id: 'explosion', label: 'Bomb Flower blast', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(75) }],
  actionFuncs: {
    EnBombf_GrowBomb: 'flower_*',
    EnBombf_Move: 'body_fuse',
    EnBombf_Explode: 'blast_*',
    EnBombf_WaitForRelease: off('the pulled bomb is held by Link until he lets go; lifting and throwing are not Link verbs', 265),
    actionFunc: off('not an action function: the parameter name of EnBombf_SetupAction', 99),
  },
  atSources: { [at(75)]: 'explosion' },
  loadouts: standardLoadouts(['child', 'adult'], 0.5),
  expected: {
    deadVerbs: {
      flower_regrowing_timer_clears: 'the regrowing flower ignores every hit and has no other step, so it leaves only when its timer has run out',
      link_hurt_overkill: 'the blast hits once for 8 (4 with Double Defense) and every kit starts with 8 health, so a hit never takes more than Link has left',
    },
  },
}
