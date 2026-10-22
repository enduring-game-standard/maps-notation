import type { Disposition } from '../../spec'

export const enGanonMant: Disposition = {
  overlay: 'ovl_En_Ganon_Mant',
  excluded:
    "Ganondorf's cape (header, z_en_ganon_mant.c:4), a cloth simulation drawn on Ganondorf. EnGanonMant_Update only counts down attach timers, copies Ganondorf's facing (z_en_ganon_mant.c:389), and tears the cloth (z_en_ganon_mant.c:393). The file declares no collider, no damage table, and no health, and calls nothing that hurts Link, so it neither hurts nor can be hurt. Ganondorf's own fight is modeled under Boss_Ganon.",
  cite: 'src/overlays/actors/ovl_En_Ganon_Mant/z_en_ganon_mant.c:389',
}
