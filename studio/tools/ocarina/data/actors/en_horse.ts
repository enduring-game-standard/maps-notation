import type { Disposition } from '../../spec'

export const enHorse: Disposition = {
  overlay: 'ovl_En_Horse',
  excluded:
    'Epona and the ranch horses. The only AT collider is player-aligned (AT_TYPE_PLAYER, z_en_horse.c:113; turned on above speed 5 at z_en_horse.c:3610), and an AT hits an AC only when they share an alignment bit (src/code/z_collision_check.c:2677), while Link takes only enemy-aligned hits (AC_ON | AC_TYPE_ENEMY, src/overlays/actors/ovl_player_actor/z_player.c:10470), so the trample hurts enemies, never Link. The AC sphere is ACELEM_NO_DAMAGE (z_en_horse.c:157) and a hit only plays a neigh (z_en_horse.c:3543-3547); the 10 health (z_en_horse.c:177) is never decremented, so Link cannot hurt the horse. Link riding the horse is out of scope.',
  cite: 'src/overlays/actors/ovl_En_Horse/z_en_horse.c:113',
}
