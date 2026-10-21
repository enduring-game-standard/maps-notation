import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Tubo_Trap/z_en_tubo_trap.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Any hit the flying pot's collider accepts breaks it (AC_HIT, line 203, then Actor_Kill at line 209): that is
 * Link's win. A pot that breaks on Link, his shield, a wall, or the floor is gone too, but not by Link's hand,
 * so it ends in the `broken` phase and Link walks away.
 * AC is registered every frame (line 298), but only EnTuboTrap_Fly reads AC_HIT (through HandleImpact, line
 * 284); in the other actions the next frame's CollisionCheck_SetAC clears the flag unread
 * (`src/code/z_collision_check.c:1257`, `Collider_ResetACBase` at `src/code/z_collision_check.c:154`).
 *
 * Both ages meet it: the rise height reads Link's age (line 248).
 * One pot hits once for 4, so the kits carry a quarter heart: the only way the pot can fell Link.
 */
const breaks = Object.fromEntries(
  DMG_TYPES.map((d): [DmgType, { damage: number; to: string; cite: Cite }] => [d, { damage: 0, to: 'defeated', cite: at(209) }]),
)

export const enTuboTrap: ActorSpec = {
  overlay: 'ovl_En_Tubo_Trap',
  name: 'Flying pot',
  role: 'hazard',
  summary:
    'A pot that sits still until Link comes within 200 units and is not below it, then rises, spins, and flies at him. It breaks on whatever it meets first: Link (hitting him once), his shield, a wall, the floor, or any attack.',
  cite: at(272),
  pools: [],
  damage: { kind: 'custom', entries: breaks },
  phases: [
    { id: 'resting', label: 'The pot sits still', hittable: 'none', cite: at(234) },
    { id: 'rising', label: 'The pot rises and spins', hittable: 'none', cite: at(261) },
    { id: 'flying', label: 'The pot flies at Link', cite: at(272) },
    { id: 'broken', label: 'The pot has shattered', hittable: 'none', cite: at(220) },
  ],
  start: 'resting',
  range: 'far',
  steps: [
    { from: 'resting', to: 'rising', label: 'Link comes close and the pot lifts off', range: 'near', cite: at(257) },
    { from: 'rising', to: 'flying', label: 'The pot turns toward Link and flies', cite: at(268) },
    { from: 'flying', to: 'broken', label: 'The pot smashes into Link', range: 'near', attack: 'pot', cite: at(215) },
    { from: 'flying', to: 'broken', label: 'The pot misses and shatters on the floor or a wall', range: 'far', cite: at(225) },
  ],
  attacks: [{ id: 'pot', label: 'Flying pot', damage: 4, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(48) }],
  actionFuncs: {
    EnTuboTrap_WaitForProximity: 'resting',
    EnTuboTrap_Levitate: 'rising',
    EnTuboTrap_Fly: 'flying',
  },
  atSources: { [at(48)]: 'pot' },
  loadouts: standardLoadouts(['child', 'adult'], 0.25),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the pot hits once for 4 (2 with Double Defense) and every kit starts with 4 health, so a hit never takes more than Link has left',
    },
  },
}
