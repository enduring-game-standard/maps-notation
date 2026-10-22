import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Arrow/z_en_arrow.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * En_Arrow is Link's own arrow, seed, and nut (already carried in link.ts) and, with params below 0, an
 * enemy arrow: line 148 turns its collider into AT_TYPE_ENEMY. The only spawner that passes a negative
 * params is the arrow trap, which fires ARROW_NORMAL_SILENT every 80 frames while Link is within 400 units
 * (`src/overlays/actors/ovl_En_Arow_Trap/z_en_arow_trap.c:49`). This encounter is that enemy arrow.
 *
 * An unparented arrow is killed on its first frame unless `player->unk_A73` is nonzero (line 178).
 * The player sets it to 4 when he releases a held arrow, seed, or bomb
 * (`src/overlays/actors/ovl_player_actor/z_player.c:3131`) or throws the boomerang (z_player.c:3390), and it
 * counts down each frame (z_player.c:11697). So a trap's arrow flies only when Link let go of something in the
 * last four frames. The world cannot see that, so the two outcomes are variants at the model's even odds.
 *
 * The decomp has no scene placement data for the trap, so both ages are kept.
 * The arrow hits once for 1, so the kits carry one sixteenth of a heart: the only way it can fell Link.
 */
export const enArrow: ActorSpec = {
  overlay: 'ovl_En_Arrow',
  name: 'Arrow trap arrow',
  role: 'projectile',
  summary:
    "An arrow shot by a wall arrow trap. It flies for 12 frames and hits Link once for a sixteenth of a heart unless his shield or a dodge stops it. It is killed on its first frame unless Link has just shot or thrown something himself. Link cannot hit it.",
  cite: at(260),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'flying', label: 'The arrow flies at Link', frames: { value: 12, cite: at(210) }, cite: at(260) },
    { id: 'spent', label: 'The arrow is gone, stuck, or falling away', cite: at(270) },
  ],
  start: 'flying',
  variants: [
    { id: 'flies', label: 'Link let go of a projectile in the last four frames, so the arrow flies', start: 'flying', cite: at(201) },
    { id: 'killed', label: 'Link let go of nothing, so the arrow is killed as it is shot', start: 'spent', cite: at(179) },
  ],
  range: 'near',
  steps: [
    { from: 'flying', to: 'spent', label: 'The arrow strikes Link and drops away', range: 'near', attack: 'arrow', cite: at(326) },
    { from: 'flying', to: 'spent', label: 'The arrow misses and runs out of flight', range: 'far', afterTimer: true, cite: at(270) },
  ],
  attacks: [{ id: 'arrow', label: 'Trap arrow', damage: 1, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(64) }],
  actionFuncs: {
    EnArrow_Shoot: { excluded: 'runs one frame: kills the arrow or starts its flight; the two outcomes are the variants', cite: at(178) },
    EnArrow_Fly: 'flying',
    func_809B45E0: 'spent',
    func_809B4640: 'spent',
    actionFunc: { excluded: 'not a function: the parameter name the extractor read from EnArrow_SetupAction', cite: at(78) },
  },
  atSources: {
    [at(64)]: 'arrow',
    [at(150)]: {
      excluded: "runs only for params 0 and up (line 149), Link's own arrows, seeds, and nuts; the enemy arrow keeps the element's DMG_ARROW_NORMAL",
      cite: at(149),
    },
  },
  loadouts: standardLoadouts(['child', 'adult'], 1 / 16),
  expected: {
    deadVerbs: {
      flying_timer_clears: 'the 12-frame flight is one beat, and its timer runs out on the first beat before the arrow can leave the phase',
      link_hurt_overkill: 'the arrow hits once for 1 and every kit starts with 1 health, so a hit never takes more than Link has left',
    },
  },
}
