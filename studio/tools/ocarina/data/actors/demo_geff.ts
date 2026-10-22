import type { Disposition } from '../../spec'

export const demoGeff: Disposition = {
  overlay: 'ovl_Demo_Geff',
  excluded:
    "Ganon's Lair rubble fragment for the castle-collapse cutscene (header, z_demo_geff.c:4). Its only update action, func_80978308 (z_demo_geff.c:179), finds the Demo_Gt it belongs to and copies that actor's position plus an offset (z_demo_geff.c:173); the other action only sets scale and the draw mode. The file declares no collider, no damage table, and no health, and calls nothing that hurts Link, so Link cannot hurt it and it cannot hurt Link. Category BOSS only because it is cutscene scenery of the Ganon fight.",
  cite: 'src/overlays/actors/ovl_Demo_Geff/z_demo_geff.c:173',
}
