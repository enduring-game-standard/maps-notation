import type { Disposition } from '../../spec'

export const enFr: Disposition = {
  overlay: 'ovl_En_Fr',
  excluded:
    "Frog choir NPC with no collider. Its one direct hurt call, `this->unusedButterflyActor->freezeTimer = 10` (z_en_fr.c:1001), freezes an unused butterfly actor pointer that the frog sets to NULL and never assigns, so it never touches Link. Link cannot damage it either: it declares no collider and no damage table.",
  cite: 'src/overlays/actors/ovl_En_Fr/z_en_fr.c:342',
}
