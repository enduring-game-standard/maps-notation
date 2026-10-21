import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_Door_Killer/z_door_killer.c'
const at = (line: number): Cite => `${F}:${line}`

/** DMG_RANGED | DMG_SLASH | DMG_DEKU_STICK, cut down to what the AC cylinder accepts and Link emits. */
const WOBBLES: DmgType[] = ['DEKU_STICK', 'SLINGSHOT', 'ARROW_NORMAL', 'HOOKSHOT', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT']
const BREAKS: DmgType[] = ['EXPLOSIVE', 'HAMMER_SWING']

export const doorKiller: ActorSpec = {
  overlay: 'ovl_Door_Killer',
  name: 'Fake Door',
  role: 'hazard',
  summary: 'A door that is a trap. When Link tries to open it, or hits it with a sword, stick, or ranged weapon, it wobbles and falls flat on him. A bomb or the Megaton Hammer smashes it to rubble.',
  cite: at(422),
  pools: [],
  damage: {
    kind: 'custom',
    entries: {
      ...Object.fromEntries(WOBBLES.map((d) => [d, { damage: 0, to: 'wobble', cite: at(439) }])),
      ...Object.fromEntries(BREAKS.map((d) => [d, { damage: 0, to: 'defeated', cite: at(442) }])),
    },
  },
  phases: [
    { id: 'wait', label: 'The door stands, waiting', cite: at(467) },
    { id: 'opening', label: 'Link reaches for the handle', hittable: 'none', frames: { value: 10, cite: at(432) }, cite: at(414) },
    { id: 'wobble', label: 'The door wobbles', hittable: 'none', frames: { value: 16, cite: at(440) }, cite: at(381) },
    { id: 'fall', label: 'The door falls over', hittable: 'none', frames: { value: 8, cite: at(395) }, cite: at(362) },
    { id: 'rise', label: 'The door rises back up', hittable: 'none', frames: { value: 16, cite: at(318) }, cite: at(273) },
  ],
  start: 'wait',
  range: 'far',
  steps: [
    { from: 'wait', to: 'opening', label: 'Link tries to open the door', range: 'near', cite: at(431) },
    { from: 'opening', to: 'wobble', label: 'The door starts to wobble', afterTimer: true, cite: at(418) },
    { from: 'wobble', to: 'fall', label: 'The door tips over', afterTimer: true, cite: at(394) },
    { from: 'fall', to: 'rise', label: 'The door slams down on Link', range: 'near', afterTimer: true, attack: 'slam', cite: at(369) },
    { from: 'fall', to: 'rise', label: 'The door slams into the floor', range: 'far', afterTimer: true, cite: at(317) },
    { from: 'rise', to: 'wait', label: 'The door stands again', afterTimer: true, cite: at(276) },
  ],
  attacks: [
    { id: 'slam', label: 'Falling door (Actor_SetPlayerKnockbackLarge, 0x10 damage)', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(68) },
  ],
  actionFuncs: {
    DoorKiller_Wait: 'wait',
    DoorKiller_WaitBeforeWobble: 'opening',
    DoorKiller_Wobble: 'wobble',
    DoorKiller_FallOver: 'fall',
    DoorKiller_RiseBackUp: 'rise',
    DoorKiller_WaitForObject: { excluded: 'waits for the door texture object to load; no collider is set', cite: at(486) },
    DoorKiller_Die: { excluded: 'runs after the smashing blow: sets the switch flag and calls Actor_Kill', cite: at(263) },
    DoorKiller_FallAsRubble: { excluded: 'the four rubble pieces spawned when the door breaks; they have no collider and despawn on a timer', cite: at(237) },
  },
  atSources: {
    [at(68)]: {
      excluded: 'the cylinder is never registered as an attacker: the file calls CollisionCheck_SetAC for it (DoorKiller_SetAC) and never CollisionCheck_SetAT. The slam hurts Link by a direct distance check that calls Actor_SetPlayerKnockbackLarge with 0x10 damage, modeled as the slam attack',
      cite: at(252),
    },
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      opening_timer_clears: 'the door leaves this phase only by the step that waits for the timer, and no hit lands on it here, so the timer is always spent',
      wobble_timer_clears: 'as opening_timer_clears, for the wobble',
      fall_timer_clears: 'as opening_timer_clears, for the fall',
      rise_timer_clears: 'as opening_timer_clears, for the rise',
      link_hurt_overkill: 'the only damage is the 16-unit slam (8 with Double Defense), and every kit starts and heals Link in multiples of 16, so a hit never finds less health left than it costs',
    },
  },
}
