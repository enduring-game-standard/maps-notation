import { DMG_TYPES } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Hintnuts/z_en_hintnuts.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Only its own nut, reflected, makes it run (ac->id == ACTOR_EN_NUTSBALL, line 475); any other hit makes it duck. The
 * hit rule reads the damage type, not the actor that dealt it, so the up phases send DMG_DEKU_STICK, the reflected
 * nut's type (z_en_nutsball.c:134), to begin_run. Link's own Deku Stick needs near and never finds the scrub up (see the
 * hit_deku_stick__* dead verbs), so only the reflected nut takes this path.
 */
const reflectedNut: Phase['overrides'] = { DEKU_STICK: { damage: 0, to: 'begin_run', cite: at(479) } }

const phases: Phase[] = [
  /** SetupWait turns the AC collider off; it comes back on at frame 9 of the pop-up animation. */
  { id: 'hidden', label: 'Deku Scrub hides in its flower', hittable: 'none', frames: { value: [100, 149], cite: at(130) }, cite: at(133) },
  { id: 'up', label: 'Deku Scrub pops up and faces Link', overrides: reflectedNut, cite: at(271) },
  { id: 'looking', label: 'Deku Scrub looks around', overrides: reflectedNut, cite: at(261) },
  { id: 'throw', label: 'Deku Scrub spits a nut', overrides: reflectedNut, cite: at(286) },
  { id: 'up_after_throw', label: 'Deku Scrub watches its nut', overrides: reflectedNut, cite: at(276) },
  { id: 'burrow', label: 'Deku Scrub ducks into its flower', cite: at(305) },
  /** HitByScrubProjectile2 turns the AC collider off (line 168); SetupWait leaves it off until the next pop-up. */
  { id: 'begin_run', label: 'Deku Scrub is hit by its own nut and jumps out', hittable: 'none', cite: at(319) },
  { id: 'run', label: 'Deku Scrub runs from Link', hittable: 'none', cite: at(347) },
]

const steps: Step[] = [
  { from: 'hidden', to: 'up', label: 'Deku Scrub pops up', range: 'far', cite: at(252) },
  { from: 'hidden', to: 'looking', label: 'Deku Scrub pops up and looks around', range: 'far', afterTimer: true, cite: at(250) },
  { from: 'up', to: 'throw', label: 'Deku Scrub takes aim', range: 'far', cite: at(282) },
  { from: 'up', to: 'burrow', label: 'Link is too close', range: 'near', cite: at(280) },
  { from: 'looking', to: 'burrow', label: 'Deku Scrub ducks back down', cite: at(267) },
  { from: 'throw', to: 'up_after_throw', label: 'Deku Scrub spits', range: 'far', attack: 'nut', cite: at(293) },
  { from: 'throw', to: 'burrow', label: 'Link is too close', range: 'near', cite: at(291) },
  { from: 'up_after_throw', to: 'burrow', label: 'Deku Scrub ducks back down', cite: at(280) },
  { from: 'burrow', to: 'hidden', label: 'Deku Scrub is hidden', cite: at(307) },
  { from: 'begin_run', to: 'run', label: 'Deku Scrub starts to run', cite: at(322) },
  { from: 'run', to: 'burrow', label: 'Deku Scrub runs back to its flower and ducks', cite: at(394) },
]

export const enHintnuts: ActorSpec = {
  overlay: 'ovl_En_Hintnuts',
  name: 'Hint Deku Scrub',
  role: 'enemy',
  summary:
    'A Deku Scrub in the Deku Tree that pops up and spits nuts at Link from a distance and ducks when he comes close. It spits nuts for half a heart. Link\'s own attacks only make it duck; it never loses health. Its own nut sent back by a Deku Shield makes it run, and it leaves for good only after Link talks to it.',
  cite: at(4),
  pools: [],
  /** No damage table (SetInfo with NULL) and nothing reads health: any hit by Link sends it into its flower. */
  damage: {
    kind: 'custom',
    entries: Object.fromEntries(DMG_TYPES.map((d) => [d, { damage: 0, to: 'burrow', cite: at(476) }])),
  },
  phases,
  start: 'hidden',
  range: 'far',
  steps,
  attacks: [
    {
      id: 'nut',
      label: 'Spat Deku Nut',
      damage: 8,
      effect: { kind: 'none' },
      blockable: true,
      dodgeable: true,
      source: 'src/overlays/actors/ovl_En_Nutsball/z_en_nutsball.c:59',
      via: { overlay: 'ovl_En_Nutsball', spawn: at(298) },
      reflect: {
        shields: [{ gear: 'deku_shield' }, { gear: 'hylian_shield', ages: ['adult'] }],
        as: 'DEKU_STICK',
        damage: 8,
        cite: 'src/overlays/actors/ovl_En_Nutsball/z_en_nutsball.c:134',
      },
    },
  ],
  actionFuncs: {
    EnHintnuts_Wait: 'hidden',
    EnHintnuts_Stand: 'up',
    EnHintnuts_LookAround: 'looking',
    EnHintnuts_ThrowNut: 'throw',
    EnHintnuts_Burrow: 'burrow',
    EnHintnuts_BeginRun: 'begin_run',
    EnHintnuts_Run: 'run',
    EnHintnuts_Talk: { excluded: 'Link talks to the running scrub, a conversation; talking is not a Link verb', cite: at(384) },
    EnHintnuts_Leave: { excluded: 'the scrub runs off and despawns after the conversation', cite: at(439) },
    EnHintnuts_BeginFreeze: {
      excluded: 'the order-puzzle scrubs (params 1-3) freeze instead of running; what follows depends on sPuzzleCounter, shared across three scrubs (lines 450-456), which one encounter cannot carry, so the model is the params 0 hint scrub',
      cite: at(183),
    },
    EnHintnuts_Freeze: { excluded: 'follows BeginFreeze; the scrub stays frozen until the shared puzzle counter resolves across all three scrubs', cite: at(450) },
  },
  atSources: {},
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      link_heals: 'the nut lands only on a far beat Link spends neither guarding, dodging, closing in, nor attacking (any hit makes the scrub duck first); in the bottles kit the only such move is the red potion, which then finds him at full health and is gone',
      fairy_revives_link: 'as link_heals: in the bottles kit the nut can land at most once, so Link never runs out of health',
      link_hurt_overkill: 'the nut costs 8 and every kit starts at 32 health, so his health reaches exactly 0 and never has damage left over',
      nut_blocked_deku_shield: 'a raised Deku Shield always sends the nut back (z_en_nutsball.c:127), and the reflection outranks the plain block',
      miss_reflect_nut: 'the reflected nut resolves on the beat it was spat, and spitting always leaves the scrub in up_after_throw',
      hit_reflect_nut__up: 'as miss_reflect_nut',
      hit_reflect_nut__looking: 'as miss_reflect_nut',
      hit_reflect_nut__throw: 'as miss_reflect_nut',
      hit_reflect_nut__burrow: 'as miss_reflect_nut',
      hit_deku_stick__up: 'the scrub is above ground only while Link is far, and ducks the beat he comes near, so an attack that needs near never finds it up',
      hit_deku_stick__looking: 'as hit_deku_stick__up',
      hit_deku_stick__throw: 'as hit_deku_stick__up',
      hit_deku_stick__up_after_throw: 'as hit_deku_stick__up',
      hit_slash_kokiri__up: 'as hit_deku_stick__up',
      hit_slash_kokiri__looking: 'as hit_deku_stick__up',
      hit_slash_kokiri__throw: 'as hit_deku_stick__up',
      hit_slash_kokiri__up_after_throw: 'as hit_deku_stick__up',
      hit_magic_fire__up: 'as hit_deku_stick__up',
      hit_magic_fire__looking: 'as hit_deku_stick__up',
      hit_magic_fire__throw: 'as hit_deku_stick__up',
      hit_magic_fire__up_after_throw: 'as hit_deku_stick__up',
      hit_spin_kokiri__up: 'as hit_deku_stick__up',
      hit_spin_kokiri__looking: 'as hit_deku_stick__up',
      hit_spin_kokiri__throw: 'as hit_deku_stick__up',
      hit_spin_kokiri__up_after_throw: 'as hit_deku_stick__up',
      hit_jump_kokiri__up: 'as hit_deku_stick__up',
      hit_jump_kokiri__looking: 'as hit_deku_stick__up',
      hit_jump_kokiri__throw: 'as hit_deku_stick__up',
      hit_jump_kokiri__up_after_throw: 'as hit_deku_stick__up',
      hit_jump_kokiri_self__up: 'as hit_deku_stick__up',
      hit_jump_kokiri_self__looking: 'as hit_deku_stick__up',
      hit_jump_kokiri_self__throw: 'as hit_deku_stick__up',
      hit_jump_kokiri_self__up_after_throw: 'as hit_deku_stick__up',
      hit_jump_master__up: 'as hit_deku_stick__up',
      hit_jump_master__looking: 'as hit_deku_stick__up',
      hit_jump_master__throw: 'as hit_deku_stick__up',
      hit_jump_master__up_after_throw: 'as hit_deku_stick__up',
    },
  },
}
