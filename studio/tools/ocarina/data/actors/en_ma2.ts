import type { Disposition } from '../../spec'

export const enMa2: Disposition = {
  overlay: 'ovl_En_Ma2',
  excluded:
    'NPC (adult Malon at the stables, per its header). Its only collider is AC_NONE with ACELEM_NONE and ATELEM_NONE, never changed at runtime, and is registered only with CollisionCheck_SetOC (z_en_ma2.c:350), so no Link attack reaches the all-zero DamageTable_Get(22) it takes (z_en_ma2.c:255) and it has nothing that hurts Link.',
  cite: 'src/overlays/actors/ovl_En_Ma2/z_en_ma2.c:60',
}
