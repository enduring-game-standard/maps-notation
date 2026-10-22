import type { Disposition } from '../../spec'

export const enCs: Disposition = {
  overlay: 'ovl_En_Cs',
  excluded:
    'NPC (graveyard kid, per its animation names). Its only collider is AC_NONE with ACELEM_NONE and ATELEM_NONE, never changed at runtime, and is registered only with CollisionCheck_SetOC (z_en_cs.c:450), so no Link attack reaches its all-zero damage table (z_en_cs.c:67) and it has nothing that hurts Link.',
  cite: 'src/overlays/actors/ovl_En_Cs/z_en_cs.c:49',
}
