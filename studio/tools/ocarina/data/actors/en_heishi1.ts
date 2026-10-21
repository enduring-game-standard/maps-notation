import type { Disposition } from '../../spec'

export const enHeishi1: Disposition = {
  overlay: 'ovl_En_Heishi1',
  excluded:
    "Hyrule Castle courtyard guard with no collider and no damage table. The extracted direct hurt call only reads Link's freezeTimer to pause the guard while Link is held, it never sets it. A guard that spots Link sends him back by a scene transition (play->nextEntranceIndex, z_en_heishi1.c:378), not by damage, so the guard cannot hurt Link and Link cannot hurt it.",
  cite: 'src/overlays/actors/ovl_En_Heishi1/z_en_heishi1.c:431',
}
