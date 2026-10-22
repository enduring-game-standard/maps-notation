import type { Disposition } from '../../spec'

export const objRoomtimer: Disposition = {
  overlay: 'ovl_Obj_Roomtimer',
  excluded:
    'A room time limit, not a combatant. It starts the HUD timer with a per-scene seconds count from its params (Interface_SetTimer, this line), switches itself to ACTORCAT_PROP (line 61), and has no collider or health, so Link cannot hurt it. When the room is cleared it chimes and dies (line 66); when the timer reaches zero it voids Link out (Play_TriggerVoidOut, line 79), the respawn path that costs one heart (Player_InflictDamage(play, -16), src/overlays/actors/ovl_player_actor/z_player.c:4824). That is an environmental timer, which the contract puts out of scope, and its length lives in scene data the decomp does not carry, so no beat count could be cited.',
  cite: 'src/overlays/actors/ovl_Obj_Roomtimer/z_obj_roomtimer.c:58',
}
