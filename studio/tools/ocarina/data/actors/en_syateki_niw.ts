import type { Disposition } from '../../spec'

export const enSyatekiNiw: Disposition = {
  overlay: 'ovl_En_Syateki_Niw',
  excluded:
    "Minigame cucco (Bombchu Bowling Alley, plus an unused archery behavior, z_en_syateki_niw.h:74-75). Its freezeTimer writes are only in EnSyatekiNiw_Archery (z_en_syateki_niw.c:384, 483), the archery minigame holding Link still and then ending the game by a scene transition (z_en_syateki_niw.c:480-481). Its collider is ATELEM_NONE, and an AC hit only makes it cluck, fall, or turn sooty (EnSyatekiNiw_CheckHit, z_en_syateki_niw.c:557-580); it has no health. It cannot hurt Link and Link cannot hurt it.",
  cite: 'src/overlays/actors/ovl_En_Syateki_Niw/z_en_syateki_niw.c:384',
}
