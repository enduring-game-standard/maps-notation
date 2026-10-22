import { DMG_TYPES } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Phase, Reaction, Step } from '../../spec'

/*
 * Reported gaps (the types cannot express these; each is modeled as the closest honest thing):
 * - Link's health. Under 5 hearts (health < 0x50) his swing window widens from 1 frame in 8 to 1 in 16 and each try
 *   fails 3 times in 10 (lines 182-185), and he staggers after fewer clanks (674-676). Steps cannot depend on Link's
 *   health, so every beat uses the full-health odds: a near beat always holds 2 or 3 swing frames (189).
 * - The fade is one global alpha (148) that rises only in ENTORCH2_ATTACK (501-503), keeps rising while frozen,
 *   and pauses in ENTORCH2_DAMAGE (506-547). A phase timer restarts on entry, so each nut, knockdown, or countered
 *   swing restarts the 1280-frame fade here. This lengthens the translucent window.
 * - Lock-on. Link Z-targeting him starts the duel from any distance (243). The beat model has no lock-on action,
 *   so only closing in starts it.
 * - Melee guard. Link's swings are stopped every beat by the clank (273 clears his body hit), his shield (414),
 *   or a backflip's invincibility (216). A hit that lands in the frames of a stagger (684-689) or of a sword
 *   jump is a frame-level window the beat model does not split out.
 */
const F = 'src/overlays/actors/ovl_En_Torch2/z_en_torch2.c'
const at = (line: number): Cite => `${F}:${line}`

/** Dark Link is a Player actor (playerInit, line 124): his body is the player cylinder, whose AC mask 0xFFCFFFFF leaves out SHIELD and MIR_RAY. */
const BODY: DmgType[] = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
/** Sword, stick, and hammer swings he mirrors (clank, line 273), backflips from (416), sidesteps (319), or shields (414). */
const MELEE: DmgType[] = [
  'DEKU_STICK', 'HAMMER_SWING', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT',
  'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP',
]
/** Arrows, seeds, the hookshot, and explosions he sees coming (EnTorch2_GetAttackItem) and rolls through with 20 invincible frames. */
const ROLLED: DmgType[] = ['SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT', 'EXPLOSIVE']

/** Slashes and combos (PLAYER_MWA 0-11, lines 405-412) he answers with a mirrored swing of his own (403, 703-714), which the fade does not gate. */
const COUNTERED: DmgType[] = ['DEKU_STICK', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT']
const countered = Object.fromEntries(COUNTERED.map((d) => [d, { damage: 0, to: 'countering_faint', cite: at(403) }]))

const startsDuel = Object.fromEntries(ROLLED.map((d) => [d, { damage: 0, to: 'fading', cite: at(246) }]))

const phases: Phase[] = [
  { id: 'wait', label: 'Dark Link waits by the tree', hittable: [...ROLLED, 'DEKU_NUT'], overrides: startsDuel, cite: at(237) },
  {
    id: 'fading',
    label: 'Dark Link duels, still translucent',
    hittable: BODY,
    guards: [...MELEE.filter((d) => !COUNTERED.includes(d)), ...ROLLED],
    overrides: countered,
    frames: { value: 1280, cite: at(501) },
    cite: at(186),
  },
  { id: 'countering_faint', label: 'Translucent Dark Link mirrors Link\'s swing', hittable: BODY, guards: [...MELEE, ...ROLLED], cite: at(422) },
  { id: 'duel', label: 'Dark Link duels at full strength', hittable: BODY, guards: [...MELEE, ...ROLLED], cite: at(262) },
  { id: 'stunned_wait', label: 'Waiting Dark Link is frozen by a Deku Nut', hittable: BODY, frames: { value: 80, cite: at(622) }, cite: at(660) },
  { id: 'stunned_faint', label: 'Translucent Dark Link is frozen by a Deku Nut', hittable: BODY, frames: { value: 80, cite: at(622) }, cite: at(660) },
  { id: 'stunned', label: 'Dark Link is frozen by a Deku Nut', hittable: BODY, frames: { value: 80, cite: at(620) }, cite: at(660) },
  { id: 'hurt_faint', label: 'Translucent Dark Link is knocked down and sinks away', hittable: 'none', cite: at(509) },
  { id: 'hurt', label: 'Dark Link is knocked down and sinks away', hittable: 'none', cite: at(509) },
]

const steps: Step[] = [
  { from: 'wait', to: 'fading', label: 'Link comes close and the duel begins', range: 'near', cite: at(258) },
  { from: 'fading', to: 'duel', label: 'Dark Link is fully solid', afterTimer: true, cite: at(502) },
  { from: 'fading', to: 'fading', label: 'Dark Link runs at Link', range: 'far', move: 'near', cite: at(456) },
  { from: 'duel', to: 'duel', label: 'Dark Link runs at Link', range: 'far', move: 'near', cite: at(456) },
  /** At full health 1 frame in 8 passes the mask and no roll refuses it (175-176), so every near beat swings; off frames are backflips (442). */
  { from: 'duel', to: 'duel', label: 'Dark Link slashes', range: 'near', attack: 'sword', cite: at(189) },
  { from: 'countering_faint', to: 'fading', label: "Dark Link's mirrored swing", attack: 'sword', cite: at(708) },
  { from: 'stunned_wait', to: 'wait', label: 'Dark Link thaws, still waiting', afterTimer: true, cite: at(648) },
  { from: 'stunned_wait', to: 'stunned_faint', label: 'Link comes close and the duel begins while he is frozen', range: 'near', cite: at(258) },
  { from: 'stunned_faint', to: 'fading', label: 'Dark Link thaws', afterTimer: true, cite: at(648) },
  { from: 'stunned', to: 'duel', label: 'Dark Link thaws', afterTimer: true, cite: at(648) },
  /** He rises 120 units behind Link (515-516), past the 100 at which he runs back in (450), or at his spawn (518-535). */
  { from: 'hurt_faint', to: 'fading', label: 'Dark Link rises behind Link', move: 'far', cite: at(540) },
  { from: 'hurt', to: 'duel', label: 'Dark Link rises behind Link', move: 'far', cite: at(540) },
]

const knockedDown = { fading: 'hurt_faint', countering_faint: 'hurt_faint', stunned_wait: 'hurt_faint', stunned_faint: 'hurt_faint', duel: 'hurt', stunned: 'hurt' }
const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, to: knockedDown, note: 'any reaction but 1: Actor_ApplyDamage, small knockback, ENTORCH2_DAMAGE', cite: at(634) },
  '0x1': {
    damage: true,
    to: { wait: 'stunned_wait', stunned_wait: 'stunned_wait', fading: 'stunned_faint', countering_faint: 'stunned_faint', stunned_faint: 'stunned_faint', duel: 'stunned', stunned: 'stunned' },
    note: 'reaction 1 (Deku Nut, Boomerang, Hookshot): a blue color filter for 80 frames that freezes his input',
    cite: at(618),
  },
  '0x6': { damage: true, to: knockedDown, note: 'not reaction 1, so the knockback path', cite: at(627) },
  '0xD': { damage: true, to: knockedDown, note: 'not reaction 1, so the knockback path', cite: at(627) },
  '0xE': { damage: true, to: knockedDown, note: "Din's Fire: not reaction 1, so the knockback path; his shield-in-place (line 568) does not gate the damage check at line 598", cite: at(627) },
}

export const enTorch2: ActorSpec = {
  overlay: 'ovl_En_Torch2',
  name: 'Dark Link',
  role: 'boss',
  summary:
    "Link's shadow, driven by the player code with a fake controller. He waits by his spawn until Link comes close, then mirrors every sword, stick, or hammer swing with a counter, a backflip, a sidestep, or his shield, and rolls through arrows, the hookshot, and explosions. While he fades in he never starts a swing, but he still answers Link's slashes with a mirrored swing; once solid he also slashes on his own for 8. A Deku Nut freezes him, and then a hit lands. His health is Link's heart capacity shifted right by 3, so each kit gives him his own pool, and he falls when it empties.",
  cite: at(220),
  pools: [{ id: 'body', label: 'Dark Link', hp: { value: 3, cite: at(135), fromLinkHealth: { shift: 3 } }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'wait',
  range: 'far',
  steps,
  attacks: [
    { id: 'sword', label: "Dark Link's sword", damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(130) },
  ],
  actionFuncs: {},
  states: {
    ENTORCH2_WAIT: { phase: 'wait', cite: at(237) },
    ENTORCH2_ATTACK: { phase: 'duel', cite: at(262) },
    ENTORCH2_ATTACK_fading: { phase: 'fading', cite: at(186) },
    ENTORCH2_WAIT_frozen: { phase: 'stunned_wait', cite: at(651) },
    ENTORCH2_ATTACK_frozen: { phase: 'stunned_faint', cite: at(651) },
    ENTORCH2_ATTACK_frozen_solid: { phase: 'stunned', cite: at(651) },
    ENTORCH2_ATTACK_countering: { phase: 'countering_faint', cite: at(422) },
    ENTORCH2_DAMAGE: { phase: 'hurt*', cite: at(506) },
    ENTORCH2_DEATH: { excluded: 'fade-out and despawn after the finishing blow; the encounter has already ended', cite: at(549) },
  },
  atSources: { [at(130)]: 'sword' },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: "his only attack costs 8 (4 with Double Defense) and every kit's health is a multiple of 8, so Link's health reaches exactly zero",
      miss_deku_nut: 'the nut connects in every phase but hurt and hurt_faint, which Link enters only with his own hit and which are left on that same beat',
      miss_magic_fire: "as miss_deku_nut; in wait Din's Fire needs near, and wait is left the beat Link comes near",
    },
  },
}
