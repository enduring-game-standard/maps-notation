import type { Disposition } from '../../spec'

export const enEg: Disposition = {
  overlay: 'ovl_En_Eg',
  excluded:
    'The Ganon\'s Tower collapse escape timer (ACTORCAT_ITEMACTION, line 37), with no collider or health. When the escape sub-timer runs out with switch 0x36 set, it voids Link out (Play_TriggerRespawn, this line), the respawn path that costs one heart (Player_InflictDamage(play, -16), src/overlays/actors/ovl_player_actor/z_player.c:4824, armed at z_player.c:10743). That is an environmental timer, which the contract puts out of scope.',
  cite: 'src/overlays/actors/ovl_En_Eg/z_en_eg.c:64',
}
