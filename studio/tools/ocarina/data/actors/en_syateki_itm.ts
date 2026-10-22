import type { Disposition } from '../../spec'

export const enSyatekiItm: Disposition = {
  overlay: 'ovl_En_Syateki_Itm',
  excluded:
    "Shooting gallery game controller with no collider and no damage table. Its five freezeTimer writes (z_en_syateki_itm.c:146, 161, 182, 288, 320) hold Link in place when a round of the minigame ends (signal ENSYATEKI_END, then EnSyatekiItm_CleanupGame / EnSyatekiItm_EndGame). That is minigame control, not harm, and Link cannot hit the controller.",
  cite: 'src/overlays/actors/ovl_En_Syateki_Itm/z_en_syateki_itm.c:146',
}
