import type { Disposition } from '../../spec'

export const enDu: Disposition = {
  overlay: 'ovl_En_Du',
  excluded:
    'NPC (Darunia). Its only collider is AC_NONE with ACELEM_NONE and ATELEM_NONE, never changed at runtime, and is registered only with CollisionCheck_SetOC (z_en_du.c:571), so no Link attack reaches the all-zero DamageTable_Get(0x16) it takes (z_en_du.c:301) and it has nothing that hurts Link.',
  cite: 'src/overlays/actors/ovl_En_Du/z_en_du.c:57',
}
