import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Honotrap/z_en_honotrap.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Three kinds by params (line 232, enum in z_en_honotrap.h): the eye switch on a wall (HONOTRAP_TYPE_EYE), the
 * flame it shoots (HONOTRAP_TYPE_FLAME_MOVE, spawned as its child at line 280), and the flame Dampé drops in his
 * race (HONOTRAP_TYPE_FLAME_DROP, `src/overlays/actors/ovl_En_Po_Relay/z_en_po_relay.c:242`).
 * The eye and its flame are one encounter: the phases are the product of the eye's state and its flame's.
 *
 * The eye's AC (0x0001F824: slingshot and arrows) is registered only while its lids are not shut (line 501);
 * a hit then kills the eye (line 500). A flame already out keeps going. The flame's own AC accepts only
 * DMG_SHIELD (line 131), and no flame function reads its AC_HIT, so a flame cannot be hurt.
 * The eye has no health, so killing it is the defeat.
 *
 * The flame carries HIT_SPECIAL_EFFECT_FIRE, so it burns. Dampé's flame also knocks Link back
 * (Actor_SetPlayerKnockbackLargeNoDamage, line 340); one effect per attack, so it carries the burn.
 * The decomp has no scene data to cite for age, so both ages are kept as a judgment.
 */
const EYE_HITS: DmgType[] = ['SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3']
const killEye = Object.fromEntries(EYE_HITS.map((d) => [d, { damage: 0, to: 'flame_out', cite: at(500) }]))
const killEyeNoFlame = Object.fromEntries(EYE_HITS.map((d) => [d, { damage: 0, to: 'defeated', cite: at(500) }]))
const shut = { hittable: 'none' as const }

export const enHonotrap: ActorSpec = {
  overlay: 'ovl_En_Honotrap',
  name: 'Flame trap',
  role: 'hazard',
  summary:
    "A wall eye that opens when Link stands in front of and below it, shoots a flame at where he stood, and closes; the flame then chases him until it hits, is blocked, or burns out, and the eye waits 200 frames once it is gone. A slingshot seed or arrow destroys the eye while it is open. Dampé's race flame is a second kind: a small flame that burns where it falls for 40 frames.",
  cite: at(230),
  pools: [],
  damage: { kind: 'custom', entries: {} },
  phases: [
    { id: 'eye_ready', label: 'The eye is shut, ready to open', ...shut, cite: at(255) },
    { id: 'eye_wait', label: 'The eye is shut and recovering', ...shut, frames: { value: 200, cite: at(307) }, cite: at(257) },
    { id: 'eye_open', label: 'The eye is open and its flame flies at Link', frames: { value: 30, cite: at(272) }, overrides: killEye, cite: at(276) },
    { id: 'eye_spent', label: 'The eye is still open; its flame is gone', overrides: killEyeNoFlame, cite: at(293) },
    { id: 'eye_chase', label: 'The eye has shut; its flame chases Link', ...shut, frames: { value: 100, cite: at(423) }, cite: at(426) },
    { id: 'flame_out', label: 'The eye is destroyed; its flame still chases Link', ...shut, frames: { value: 100, cite: at(423) }, cite: at(426) },
    { id: 'drop', label: "Dampé's flame burns where it fell", ...shut, frames: { value: 40, cite: at(330) }, cite: at(337) },
    { id: 'burnt_out', label: 'The flame has died away', ...shut, cite: at(463) },
  ],
  start: 'eye_ready',
  variants: [
    { id: 'eye', label: 'Eye switch with its flame (HONOTRAP_TYPE_EYE)', start: 'eye_ready', cite: at(233) },
    { id: 'drop', label: "Dampé's dropped flame (HONOTRAP_TYPE_FLAME_DROP)", start: 'drop', cite: at(222) },
  ],
  range: 'near',
  steps: [
    { from: 'eye_ready', to: 'eye_open', label: 'Link stands before the eye; it opens and shoots', range: 'near', cite: at(263) },
    { from: 'eye_wait', to: 'eye_open', label: 'Link stands before the eye; it opens and shoots', range: 'near', afterTimer: true, cite: at(263) },
    { from: 'eye_open', to: 'eye_spent', label: 'The flame strikes Link', range: 'near', attack: 'flame', cite: at(404) },
    { from: 'eye_open', to: 'eye_chase', label: 'The eye shuts while its flame hunts Link', afterTimer: true, range: 'far', cite: at(295) },
    { from: 'eye_spent', to: 'eye_wait', label: 'The eye shuts', cite: at(306) },
    { from: 'eye_chase', to: 'eye_wait', label: 'The flame strikes Link', range: 'near', attack: 'flame', cite: at(448) },
    { from: 'eye_chase', to: 'eye_wait', label: 'The flame burns out', range: 'far', afterTimer: true, cite: at(452) },
    { from: 'flame_out', to: 'burnt_out', label: 'The flame strikes Link', range: 'near', attack: 'flame', cite: at(448) },
    { from: 'flame_out', to: 'burnt_out', label: 'The flame burns out', range: 'far', afterTimer: true, cite: at(452) },
    { from: 'drop', to: 'burnt_out', label: 'Link runs into the flame', range: 'near', attack: 'drop_flame', cite: at(338) },
    { from: 'drop', to: 'burnt_out', label: 'The flame dies down', range: 'far', afterTimer: true, cite: at(338) },
  ],
  attacks: [
    { id: 'flame', label: "Eye's flame", damage: 4, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(130) },
    { id: 'drop_flame', label: "Dampé's flame", damage: 4, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(130) },
  ],
  actionFuncs: {
    EnHonotrap_EyeIdle: 'eye_ready',
    EnHonotrap_EyeOpen: 'eye_open',
    EnHonotrap_EyeAttack: 'eye_open',
    EnHonotrap_EyeClose: 'eye_spent',
    EnHonotrap_FlameGrow: 'eye_open',
    EnHonotrap_FlameMove: 'eye_open',
    EnHonotrap_FlameChase: 'eye_chase',
    EnHonotrap_FlameDrop: 'drop',
    EnHonotrap_FlameVanish: 'burnt_out',
  },
  atSources: { [at(130)]: 'flame' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      eye_wait_timer_clears: 'the eye leaves its 200-frame wait only when the wait runs out, so no timer is ever left to clear',
      flame_lands_again: "after a flame hits, the eye shuts and waits 200 frames (10 beats) before it can shoot again, longer than Link's burn (5 beats)",
      flame_lands_dd_again: 'as flame_lands_again',
      drop_flame_lands_again: "Dampé's flame hits once and burns out, so it never finds Link still burning",
      drop_flame_lands_dd_again: 'as drop_flame_lands_again',
    },
  },
}
