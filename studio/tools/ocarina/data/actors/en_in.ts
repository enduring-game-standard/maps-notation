import type { Disposition } from '../../spec'

export const enIn: Disposition = {
  overlay: 'ovl_En_In',
  excluded:
    'NPC (Ingo). Its collider is AC_NONE (z_en_in.c:64) with no AT and is registered only with CollisionCheck_SetOC (z_en_in.c:958); it has no damage table (NULL at z_en_in.c:553). Every direct-hurt line is a cutscene hold, not harm: freezeTimer = 10 on Link and his horse at z_en_in.c:505/507 runs while Ingo opens a textbox, letterboxes, and hides the HUD (z_en_in.c:498-510), and again at z_en_in.c:841/843 (EnIn_ClosingGate) and z_en_in.c:927/929 (EnIn_EndRentalPeriod), each refreshing a 10-frame freeze during dialogue. No damage, knockback, or health change is applied.',
  cite: 'src/overlays/actors/ovl_En_In/z_en_in.c:507',
}
