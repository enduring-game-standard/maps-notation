import type { Disposition } from '../../spec'

export const enSda: Disposition = {
  overlay: 'ovl_En_Sda',
  excluded:
    "Dynamic shadow for Link (header, z_en_sda.c:4). EnSda_Update only moves the actor onto the player's position (z_en_sda.c:120), and EnSda_Draw hides the normal shadow (z_en_sda.c:138) and renders a shadow texture of Link's body parts. It declares no collider, no damage table, and no health, and calls nothing that hurts Link. Rendering only.",
  cite: 'src/overlays/actors/ovl_En_Sda/z_en_sda.c:120',
}
