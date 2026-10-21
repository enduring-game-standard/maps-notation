import type { Disposition } from '../../spec'

export const enToryo: Disposition = {
  overlay: 'ovl_En_Toryo',
  excluded: 'NPC (head carpenter). Its only collider is AC_NONE with ACELEM_NONE and ATELEM_NONE and is registered only with CollisionCheck_SetOC (z_en_toryo.c:366), so no Link attack reaches its zero-valued damage table and it has nothing that hurts Link.',
  cite: 'src/overlays/actors/ovl_En_Toryo/z_en_toryo.c:49',
}
