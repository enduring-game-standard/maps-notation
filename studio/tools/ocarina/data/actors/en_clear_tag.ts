import { DMG_TYPES, type DmgType } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Clear_Tag/z_en_clear_tag.c'
const at = (line: number): Cite => `${F}:${line}`
const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/** Every AC hit takes exactly one health point, whatever its damage (line 377). The AC element accepts every type but DMG_MIR_RAY (0xFFDFFFFF, line 65). */
const entries = Object.fromEntries(
  DMG_TYPES.filter((d) => d !== 'MIR_RAY').map((d) => [d, { damage: 1, cite: at(377) }]),
) as Partial<Record<DmgType, { damage: number; cite: Cite }>>

const phases: Phase[] = [
  { id: 'locked', label: 'Arwing locks on and flies at Link, firing lasers', cite: at(389) },
  { id: 'flying', label: 'Arwing breaks off and circles Link', frames: { value: [100, 199], cite: at(459) }, cite: at(461) },
]

const steps: Step[] = [
  /** Lasers fire every 4th frame at 3 in 4 odds while it faces Link (line 482), so a beat of the run in always fires some. */
  { from: 'locked', to: 'flying', label: 'Arwing swoops in, firing, and pulls up within 150 units', range: 'far', move: 'near', attack: 'laser', cite: at(461) },
  { from: 'locked', to: 'flying', label: 'Arwing flies into Link and pulls up', range: 'near', attack: 'ram', cite: at(461) },
  /** A flying Arwing picks a point 400 units from Link, scattered by 700 (lines 397-404). */
  { from: 'flying', to: 'flying', label: 'Arwing flies off to circle', range: 'near', move: 'far', cite: at(400) },
  { from: 'flying', to: 'locked', label: 'Arwing locks on again', afterTimer: true, cite: at(389) },
]

export const enClearTag: ActorSpec = {
  overlay: 'ovl_En_Clear_Tag',
  name: 'Arwing',
  role: 'boss',
  summary:
    'A Star Fox Arwing. It locks on, swoops at Link firing lasers that the shield cannot stop, pulls up, circles, and comes around again. Any three hits bring it down in flames.',
  cite: at(322),
  pools: [{ id: 'arwing', label: 'Arwing', hp: { value: 3, cite: at(272) }, then: 'defeated' }],
  damage: { kind: 'custom', entries },
  phases,
  /** The debug spawn puts it 100 units over Link (src/code/z_actor.c:2437); within 150 of him the first lock breaks off at once (lines 456-461). */
  start: 'flying',
  range: 'near',
  steps,
  attacks: [
    {
      id: 'laser',
      label: 'Arwing laser',
      damage: 4,
      effect: { kind: 'none' },
      blockable: false,
      dodgeable: true,
      source: at(84),
      via: { overlay: 'ovl_En_Clear_Tag', spawn: at(507) },
    },
    { id: 'ram', label: 'Arwing body', damage: 4, effect: { kind: 'none' }, blockable: false, dodgeable: true, source: at(64) },
  ],
  actionFuncs: {},
  states: {
    CLEAR_TAG_STATE_TARGET_LOCKED: { phase: 'locked', cite: at(389) },
    CLEAR_TAG_STATE_FLYING: { phase: 'flying', cite: at(392) },
    CLEAR_TAG_STATE_CRASHING: ex(
      'the fall after the third hit: hits are no longer read (the crash jumps past the AC_HIT check, line 381) and it explodes when it meets the ground or a wall; the code states no duration for the fall, so the third hit ends the encounter. Its body AT stays set while it falls (line 530), which this leaves out',
      379,
    ),
    CLEAR_TAG_STATE_DEMO: ex(
      'intro barrel roll of the cutscene Arwing (params 0) during a manual cutscene; its only spawn, in Player on opening an ice trap, sits under `getItemId != GI_ICE_TRAP` inside `getItemId == GI_ICE_TRAP` and can never run (src/overlays/actors/ovl_player_actor/z_player.c:13897)',
      278,
    ),
    CLEAR_TAG_STATE_LASER: ex('a laser is a separate En_Clear_Tag the Arwing spawns; it is carried as the Arwing\'s laser attack (via), and it never sets AC, so Link cannot hit it', 577),
  },
  atSources: {
    [at(64)]: 'ram',
    [at(84)]: 'laser',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: "both attacks deal 4, which divides Link's health exactly, and Link falls (or a fairy revives him) before another hit lands, so no hit finds him at zero",
      flying_timer_clears: 'the circling phase is left only by its afterTimer step (its fly-off step re-enters itself and keeps the timer), and the third hit ends the fight without leaving it, so the timer is always spent when it clears',
      arwing_overkill: 'every hit takes exactly one of its 3 health points and the third ends the fight, so no hit finds it at zero',
    },
  },
}
