import type { Disposition } from '../../spec'

export const bgIceShelter: Disposition = {
  overlay: 'ovl_Bg_Ice_Shelter',
  excluded:
    "Red ice. Both freezeTimer writes (z_bg_ice_shelter.c:355, 366) are on its parent, and only for the RED_ICE_KING_ZORA type: they keep the frozen King Zora still, never Link. It has no AT collider. Its AC cylinders only react to blue fire (ac->id == ACTOR_EN_ICE_HONO, z_bg_ice_shelter.c:363), which melts it; Link's own attacks land on the AC_HARD cylinder and do nothing (z_bg_ice_shelter.c:81). It has no health. A puzzle obstacle, not combat.",
  cite: 'src/overlays/actors/ovl_Bg_Ice_Shelter/z_bg_ice_shelter.c:353',
}
