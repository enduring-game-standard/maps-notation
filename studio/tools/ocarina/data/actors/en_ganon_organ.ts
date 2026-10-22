import type { Disposition } from '../../spec'

export const enGanonOrgan: Disposition = {
  overlay: 'ovl_En_Ganon_Organ',
  excluded:
    "The organ, carpet, and scenery Ganondorf plays in the cutscene before his fight (header, z_en_ganon_organ.c:4). EnGanonOrgan_Update does nothing but kill the actor once Ganondorf's organAlpha reaches 0 (z_en_ganon_organ.c:143-144); the rest of the file builds display lists. It declares no collider, no damage table, and no health, and calls nothing that hurts Link.",
  cite: 'src/overlays/actors/ovl_En_Ganon_Organ/z_en_ganon_organ.c:143',
}
