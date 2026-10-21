import type { Disposition } from '../../spec'

export const enMa1: Disposition = {
  overlay: 'ovl_En_Ma1',
  excluded:
    'NPC (child Malon, per its header). Its only collider is AC_NONE with ACELEM_NONE and ATELEM_NONE, never changed at runtime, and is registered only with CollisionCheck_SetOC (z_en_ma1.c:413), so no Link attack reaches the all-zero DamageTable_Get(22) it takes (z_en_ma1.c:280) and it has nothing that hurts Link.',
  cite: 'src/overlays/actors/ovl_En_Ma1/z_en_ma1.c:59',
}
