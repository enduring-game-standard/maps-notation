import type { Disposition } from '../../spec'

export const enGe1: Disposition = {
  overlay: 'ovl_En_Ge1',
  excluded:
    `NPC (white-clothed Gerudo: gate guard, archery host, gate operator). Neither direct-hurt line harms Link: freezeTimer = 1200 on Link (z_en_ge1.c:607) and his horse (z_en_ge1.c:610) holds them while the archery game starts a scene transition (z_en_ge1.c:598-601). Spotting Link (EnGe1_SpotPlayer, z_en_ge1.c:259-264) starts a cutscene and EnGe1_KickPlayer sends Link to another entrance (z_en_ge1.c:244-254) with no damage. It has no AT, no health, and no damage table, and its AC is enemy-aligned (AC_ON | AC_TYPE_ENEMY, z_en_ge1.c:74), which Link's player-aligned attacks never match (src/code/z_collision_check.c:2677); an AC hit only triggers the same spotting (z_en_ge1.c:274, 317).`,
  cite: 'src/overlays/actors/ovl_En_Ge1/z_en_ge1.c:607',
}
