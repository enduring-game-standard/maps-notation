import type { Disposition } from '../../spec'

export const enSi: Disposition = {
  overlay: 'ovl_En_Si',
  excluded:
    "Gold Skulltula token. Its three freezeTimer writes (z_en_si.c:104, 126, 137) hold Link still while the item-get text box is up after he collects the token (Item_Give plus Message_StartTextbox). Its only collider is ATELEM_NONE, and its AC element (hookable, Boomerang and Hookshot) only lets Link fetch the token (ACTOR_FLAG_HOOKSHOT_ATTACHED, z_en_si.c:91); it has no health to lose. Not combat.",
  cite: 'src/overlays/actors/ovl_En_Si/z_en_si.c:104',
}
