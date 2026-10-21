import type { Disposition } from '../../spec'

export const bgJyaZurerukabe: Disposition = {
  overlay: 'ovl_Bg_Jya_Zurerukabe',
  excluded:
    "Sliding climbable brick wall (Spirit Temple). While Link climbs it (stateFlags1 == PLAYER_STATE1_21 with a wall poly, z_bg_jya_zurerukabe.c:95), a moving section knocks him off with Actor_SetPlayerKnockbackLarge whose damage argument is 0 (z_bg_jya_zurerukabe.c:112, 118). The call adds no damage (knockbackDamage, src/code/z_actor.c:1976), so it costs Link no health. It has no collider and no health, so Link cannot hurt it. A climbing obstacle, not combat.",
  cite: 'src/overlays/actors/ovl_Bg_Jya_Zurerukabe/z_bg_jya_zurerukabe.c:112',
}
