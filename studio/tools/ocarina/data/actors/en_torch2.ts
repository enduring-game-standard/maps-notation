import { DMG_TYPES } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Torch2/z_en_torch2.c'
const at = (line: number): Cite => `${F}:${line}`
const PLAYER_CYLINDER: Cite = 'src/overlays/actors/ovl_player_actor/z_player.c:10478'

/** Dark Link is a Player actor (playerInit, line 124): his body is the player cylinder, whose AC mask 0xFFCFFFFF leaves out SHIELD and MIR_RAY. */
const BODY: DmgType[] = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
/** Sword, stick, and hammer swings he mirrors (clank, line 273), backflips from (416), sidesteps (319), or shields (414). */
const MELEE: DmgType[] = [
  'DEKU_STICK', 'HAMMER_SWING', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT',
  'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP',
]
/** Arrows, seeds, the hookshot, and explosions he sees coming (EnTorch2_GetAttackItem) and rolls through with 20 invincible frames. */
const ROLLED: DmgType[] = ['SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT', 'EXPLOSIVE']

const startsDuel = Object.fromEntries(ROLLED.map((d) => [d, { damage: 0, to: 'fading', cite: at(246) }]))

const phases: Phase[] = [
  { id: 'wait', label: 'Dark Link waits by the tree', hittable: [...ROLLED, 'DEKU_NUT'], overrides: startsDuel, cite: at(237) },
  { id: 'fading', label: 'Dark Link duels, still translucent', hittable: BODY, guards: [...MELEE, ...ROLLED], frames: { value: 1280, cite: at(501) }, cite: at(186) },
  { id: 'duel', label: 'Dark Link duels at full strength', hittable: BODY, guards: [...MELEE, ...ROLLED], cite: at(262) },
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
  { from: 'duel', to: 'duel', label: 'Dark Link slashes', range: 'near', weight: 7, attack: 'sword', cite: at(204) },
  { from: 'duel', to: 'duel', label: 'Dark Link holds his swing', range: 'near', weight: 3, cite: at(184) },
  { from: 'stunned_faint', to: 'fading', label: 'Dark Link thaws', afterTimer: true, cite: at(648) },
  { from: 'stunned', to: 'duel', label: 'Dark Link thaws', afterTimer: true, cite: at(648) },
  { from: 'hurt_faint', to: 'fading', label: 'Dark Link rises behind Link', cite: at(540) },
  { from: 'hurt', to: 'duel', label: 'Dark Link rises behind Link', cite: at(540) },
]

const knockedDown = { fading: 'hurt_faint', stunned_faint: 'hurt_faint', duel: 'hurt', stunned: 'hurt' }
const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, to: knockedDown, note: 'any reaction but 1: Actor_ApplyDamage, small knockback, ENTORCH2_DAMAGE', cite: at(634) },
  '0x1': {
    damage: true,
    to: { wait: 'stunned_faint', fading: 'stunned_faint', stunned_faint: 'stunned_faint', duel: 'stunned', stunned: 'stunned' },
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
    "Link's shadow, driven by the player code with a fake controller. He waits by his spawn until Link comes close, then mirrors every sword, stick, or hammer swing with a counter, a backflip, a sidestep, or his shield, and rolls through arrows, the hookshot, and explosions. While he fades in he never starts a swing; once solid he slashes for 8. A Deku Nut freezes him, and then a hit lands. His health is Link's heart capacity shifted right by 3, so each kit gives him his own pool, and he falls when it empties.",
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
    ENTORCH2_ATTACK_frozen: { phase: 'stunned*', cite: at(651) },
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
