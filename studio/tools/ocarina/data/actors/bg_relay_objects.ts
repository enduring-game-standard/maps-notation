import type { Disposition } from '../../spec'

export const bgRelayObjects: Disposition = {
  overlay: 'ovl_Bg_Relay_Objects',
  excluded:
    'The doors of the Dampé race (ACTORCAT_BG, line 43), with no collider or health. When its countdown reaches zero outside a cutscene it voids Link out (Play_TriggerRespawn, this line), the respawn path that costs one heart (Player_InflictDamage(play, -16), src/overlays/actors/ovl_player_actor/z_player.c:4824, armed at z_player.c:10743). That is an environmental timer, which the contract puts out of scope.',
  cite: 'src/overlays/actors/ovl_Bg_Relay_Objects/z_bg_relay_objects.c:187',
}
