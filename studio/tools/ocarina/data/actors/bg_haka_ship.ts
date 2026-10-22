import type { Disposition } from '../../spec'

export const bgHakaShip: Disposition = {
  overlay: 'ovl_Bg_Haka_Ship',
  excluded:
    'The Shadow Temple ferry, a platform (ACTORCAT_BG, line 40) with no collider or health. Once it has sunk more than 500 units with Link still aboard, it voids him out (Play_TriggerVoidOut, this line), the respawn path that costs one heart (Player_InflictDamage(play, -16), src/overlays/actors/ovl_player_actor/z_player.c:4824, armed at z_player.c:10743). That is a fall from scenery, not a combatant, which the contract puts out of scope.',
  cite: 'src/overlays/actors/ovl_Bg_Haka_Ship/z_bg_haka_ship.c:197',
}
