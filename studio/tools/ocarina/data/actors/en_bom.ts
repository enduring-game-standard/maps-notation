import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bom/z_en_bom.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * A bomb as a hazard: Link against one bomb. Its blast is AT_TYPE_ALL (line 85), so it hurts Link as well as enemies.
 *
 * Three kinds, by who made it. Link's own bomb burns a 70-frame fuse (line 113). An enemy's bomb is spawned with its
 * timer at 0 and goes off at once: 8 damage for most (En_Dodojr, En_Dodongo, En_Am, En_Bom_Chu, En_Go), 14 for those
 * that spawn it with 6 in rot.z's high byte (En_Vm, En_Peehat, En_Fw), which line 119 adds to the blast's damage.
 *
 * The bomb body's collider accepts only explosions, arrows, and Din's Fire (0x0003F828, line 60). A sword or stick
 * does not set it off. Any accepted hit zeroes the timer (line 287), and it explodes on that frame (line 317). The
 * blast lasts 10 frames (line 340), one beat, and the bomb is then gone (line 232). An enemy actor touching the bomb
 * zeroes the timer too (lines 285-286), and a bomb 20 or more units under water is removed with no blast (lines
 * 360-363). Neither can happen with Link alone against one bomb, so neither is modeled.
 *
 * Lifting and throwing are not Link verbs, so the held bomb (EnBom_WaitForRelease) is left out. The fuse still burns
 * while Link holds it (EnBom_Update counts the timer down at lines 249-250, before the action function at 262) and
 * the blast still fires (lines 317-342, raised 30 units when held at 321-322), so a held bomb can blow up in his hands.
 * The `fuse` phase reaches that same blast near Link. A burning Deku Stick
 * only lowers a timer above 100 (line 292), and this bomb's never is, so it does nothing here.
 * One blast hits once for 8 or 14, so the kits carry half a heart: the only way one blast can fell Link.
 */
const DETONATE: DmgType[] = ['EXPLOSIVE', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3', 'MAGIC_FIRE']
const off = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enBom: ActorSpec = {
  overlay: 'ovl_En_Bom',
  name: 'Bomb',
  role: 'hazard',
  summary:
    "A bomb. Link's own burns a 70-frame fuse; one an enemy sets off explodes at once. The blast hurts anyone in reach, Link included, for half a heart, or 14 from a Beamos, Peehat, or Flare Dancer. An explosion, an arrow, or Din's Fire sets a lit bomb off early; a sword does not.",
  cite: at(105),
  pools: [],
  damage: {
    kind: 'custom',
    entries: Object.fromEntries(DETONATE.map((d) => [d, { damage: 0, to: 'blast_normal', cite: at(287) }])),
  },
  phases: [
    { id: 'fuse', label: 'The fuse burns', frames: { value: 70, cite: at(113) }, cite: at(126) },
    { id: 'blast_normal', label: 'The bomb explodes', hittable: 'none', cite: at(195) },
    { id: 'blast_strong', label: 'The bomb explodes with extra force', hittable: 'none', cite: at(195) },
    { id: 'spent', label: 'The blast has faded and the bomb is gone', hittable: 'none', cite: at(232) },
  ],
  start: 'fuse',
  variants: [
    { id: 'link_bomb', label: "Link's own bomb, set down", start: 'fuse', cite: at(113) },
    { id: 'enemy_bomb', label: 'A bomb an enemy sets off at once', start: 'blast_normal', cite: 'src/overlays/actors/ovl_En_Dodojr/z_en_dodojr.c:601' },
    { id: 'enemy_bomb_strong', label: 'A bomb a Beamos, Peehat, or Flare Dancer sets off at once', start: 'blast_strong', cite: 'src/overlays/actors/ovl_En_Vm/z_en_vm.c:393' },
  ],
  range: 'near',
  steps: [
    { from: 'fuse', to: 'blast_normal', label: 'The fuse runs out', afterTimer: true, cite: at(342) },
    { from: 'blast_normal', to: 'spent', label: 'The blast catches Link', range: 'near', attack: 'explosion', cite: at(195) },
    { from: 'blast_normal', to: 'spent', label: 'The blast goes off out of reach', range: 'far', cite: at(232) },
    { from: 'blast_strong', to: 'spent', label: 'The blast catches Link', range: 'near', attack: 'explosion_strong', cite: at(195) },
    { from: 'blast_strong', to: 'spent', label: 'The blast goes off out of reach', range: 'far', cite: at(232) },
  ],
  attacks: [
    { id: 'explosion', label: 'Bomb blast', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(72) },
    { id: 'explosion_strong', label: 'Strong bomb blast', damage: 14, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(119) },
  ],
  actionFuncs: {
    EnBom_Move: 'fuse',
    EnBom_Explode: 'blast_*',
    EnBom_WaitForRelease: off('the bomb is held by Link until he lets go; lifting and throwing are not Link verbs. The fuse and the blast still run while held (lines 249-250, 317-342), and `fuse` reaches the same blast near Link', 178),
    actionFunc: off('not an action function: the parameter name of EnBom_SetupAction', 102),
  },
  atSources: {
    [at(72)]: 'explosion',
    [at(119)]: 'explosion_strong',
  },
  loadouts: standardLoadouts(['child', 'adult'], 0.5),
}
