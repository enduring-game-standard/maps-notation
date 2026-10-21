import type { Disposition } from '../../spec'

export const enDaikuKakariko: Disposition = {
  overlay: 'ovl_En_Daiku_Kakariko',
  excluded: 'NPC (Kakariko carpenter). Its only collider is AC_NONE with ACELEM_NONE and ATELEM_NONE and is registered only with CollisionCheck_SetOC (z_en_daiku_kakariko.c:502), so no Link attack reaches its zero-valued damage table and it has nothing that hurts Link.',
  cite: 'src/overlays/actors/ovl_En_Daiku_Kakariko/z_en_daiku_kakariko.c:62',
}
