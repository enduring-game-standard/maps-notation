import { DMG_TYPES } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Hintnuts/z_en_hintnuts.c'
const at = (line: number): Cite => `${F}:${line}`

const phases: Phase[] = [
  /** SetupWait turns the AC collider off; it comes back on at frame 9 of the pop-up animation. */
  { id: 'hidden', label: 'Deku Scrub hides in its flower', hittable: 'none', frames: { value: [100, 149], cite: at(130) }, cite: at(133) },
  { id: 'up', label: 'Deku Scrub pops up and faces Link', cite: at(271) },
  { id: 'looking', label: 'Deku Scrub looks around', cite: at(261) },
  { id: 'throw', label: 'Deku Scrub spits a nut', cite: at(286) },
  { id: 'up_after_throw', label: 'Deku Scrub watches its nut', cite: at(276) },
  { id: 'burrow', label: 'Deku Scrub ducks into its flower', cite: at(305) },
]

const steps: Step[] = [
  { from: 'hidden', to: 'up', label: 'Deku Scrub pops up', range: 'far', cite: at(252) },
  { from: 'hidden', to: 'looking', label: 'Deku Scrub pops up and looks around', range: 'far', afterTimer: true, cite: at(250) },
  { from: 'up', to: 'throw', label: 'Deku Scrub takes aim', range: 'far', cite: at(282) },
  { from: 'up', to: 'burrow', label: 'Link is too close', range: 'near', cite: at(280) },
  { from: 'looking', to: 'burrow', label: 'Deku Scrub ducks back down', cite: at(267) },
  { from: 'throw', to: 'up_after_throw', label: 'Deku Scrub spits', range: 'far', cite: at(293) },
  { from: 'throw', to: 'burrow', label: 'Link is too close', range: 'near', cite: at(291) },
  { from: 'up_after_throw', to: 'burrow', label: 'Deku Scrub ducks back down', cite: at(280) },
  { from: 'burrow', to: 'hidden', label: 'Deku Scrub is hidden', cite: at(307) },
]

export const enHintnuts: ActorSpec = {
  overlay: 'ovl_En_Hintnuts',
  name: 'Hint Deku Scrub',
  role: 'enemy',
  summary:
    'A Deku Scrub in the Deku Tree that pops up and spits nuts at Link from a distance and ducks when he comes close. Link\'s own attacks only make it duck; it never loses health. Only its own nut reflected back, or a Megaton Hammer quake, makes it flee, and it leaves for good only after Link talks to it.',
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
  attacks: [],
  actionFuncs: {
    EnHintnuts_Wait: 'hidden',
    EnHintnuts_Stand: 'up',
    EnHintnuts_LookAround: 'looking',
    EnHintnuts_ThrowNut: 'throw',
    EnHintnuts_Burrow: 'burrow',
    EnHintnuts_BeginRun: {
      excluded: 'entered only when its own reflected nut hits it (ac->id == ACTOR_EN_NUTSBALL) or a Megaton Hammer quake sets actorCtx.unk_02; Link has no verb for a reflected nut, and the hammer is adult-only while this scrub is in the Deku Tree',
      cite: at(475),
    },
    EnHintnuts_Run: { excluded: 'follows BeginRun, which the model cannot enter (see EnHintnuts_BeginRun)', cite: at(322) },
    EnHintnuts_Talk: { excluded: 'Link talks to the beaten scrub; a conversation, reached only from Run', cite: at(384) },
    EnHintnuts_Leave: { excluded: 'the scrub runs off and despawns after the conversation', cite: at(439) },
    EnHintnuts_BeginFreeze: {
      excluded: 'the order puzzle (params 1-3): entered only when the reflected nut hits it, which the model cannot express (see EnHintnuts_BeginRun)',
      cite: at(183),
    },
    EnHintnuts_Freeze: { excluded: 'follows BeginFreeze; the scrub stays frozen until the shared puzzle counter resolves across all three scrubs', cite: at(450) },
  },
  atSources: {},
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      link_hurt: 'the scrub has no attack of its own; its nut is the separate En_Nutsball actor, so Link is never hurt here',
      link_hurt_overkill: 'as link_hurt',
      link_heals: 'Link is never hurt (see link_hurt), so he has nothing to heal',
      link_fell: 'as link_hurt',
      fairy_revives_link: 'as link_hurt',
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
