import type { Disposition } from '../../spec'

export const enGs: Disposition = {
  overlay: 'ovl_En_Gs',
  excluded:
    'Gossip Stone prop. Its collider is AT_NONE (z_en_gs.c:54), so it never hurts Link, and every damage-table entry is 0 damage with no health (z_en_gs.c:71). A hit only picks a scripted reaction in this switch: a text box (0xF), a wobble (0xE), a squash (0xD), a spin (0xB), or for explosives a countdown and rocket launch that ends in Actor_Kill with a visual-only EffectSsBomb2 (0xC, z_en_gs.c:388-401). None of these changes anything combat-relevant.',
  cite: 'src/overlays/actors/ovl_En_Gs/z_en_gs.c:546',
}
