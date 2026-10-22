import type { Disposition } from '../../spec'

export const enMm: Disposition = {
  overlay: 'ovl_En_Mm',
  excluded: 'NPC (running man). Its only collider is AC_NONE with ACELEM_NONE and ATELEM_NONE and is registered only with CollisionCheck_SetOC (z_en_mm.c:522), so no Link attack reaches its zero-valued damage table and it has nothing that hurts Link.',
  cite: 'src/overlays/actors/ovl_En_Mm/z_en_mm.c:73',
}
