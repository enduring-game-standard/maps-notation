import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

/*
 * Reported gaps (types cannot express these; each is left out of the net):
 * - Z-targeting a fully visible sister for 20 frames makes her vanish (z_en_po_sisters.c:1129, 1141-1143).
 *   Lock-on is not a Link action in the beat model, so the only way into vanishing_sis is the wall during a flee.
 * - Meg's circle ends 15 frames after Link has struck all three illusions (each hit drops her count,
 *   z_en_po_sisters.c:1157; the attack at 1001-1005). The illusions are separate actors with no phase here, so
 *   the circle ends only by its 300-frame timer, or when Link leaves (modeled as far, 986).
 * - The unseen sister's 100-frame counter runs through her strike (z_en_po_sisters.c:1136-1140) and she fades
 *   in at the first non-windup, non-dash frame after it hits 0 (1141-1145). Phase timers reset on entry, so the
 *   model lets one unseen strike per window and fades her in when its recoil ends. A short attack animation
 *   (gPoeSistersAttackAnim, whose length is not in this checkout) could allow a second strike.
 * - Swirl, windup and dash durations are animation lengths (z_en_po_sisters.c:489, 294, 306) that are not in
 *   this checkout, so those phases last one beat.
 */
const F = 'src/overlays/actors/ovl_En_Po_Sisters/z_en_po_sisters.c'
const at = (line: number): Cite => `${F}:${line}`

/** A shell on (`COL_MATERIAL_METAL`): every hit connects and does nothing (z_en_po_sisters.c:1166). */
const shelled = 'none' as const
/** Din's Fire is in the AC mask but its table entry is 0 damage, reaction 0: the hit does nothing (z_en_po_sisters.c:1167). */
const dinsFizzles: Phase['overrides'] = { MAGIC_FIRE: { damage: 0, cite: at(1167) } }

/** Unseen, the hurtbox accepts only these (z_en_po_sisters.c:768). */
const unseen: Phase['hittable'] = ['DEKU_NUT', 'MAGIC_FIRE', 'MAGIC_ICE']
/** The recoil starts at the dash's speed 5.0 (z_en_po_sisters.c:300) and ends when it decays to 0 at 0.1 a frame: 50 frames. */
const recoilFrames = { value: 50, cite: at(711) } as const

const phases: Phase[] = [
  { id: 'wait_meg', label: 'Meg weeps among her illusions, waiting for Link', hittable: 'none', cite: at(855) },
  { id: 'swirl_meg', label: 'Meg and her three illusions swirl into view', hittable: 'none', cite: at(906) },
  {
    id: 'circle_meg', label: 'Meg and her illusions circle Link',
    guards: ['SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER'],
    overrides: dinsFizzles, frames: { value: 300, cite: at(506) }, cite: at(957),
  },
  { id: 'dash_meg', label: 'Meg spins at Link, shelled', hittable: shelled, cite: at(685) },
  { id: 'recoil_meg', label: 'Meg drifts back from her strike, shelled', hittable: shelled, frames: recoilFrames, cite: at(708) },
  { id: 'damaged_meg', label: 'Meg reels from a hit', hittable: 'none', cite: at(722) },
  { id: 'vanish_meg', label: 'Meg is gone, and returns beside Link', hittable: 'none', frames: { value: 100, cite: at(451) }, cite: at(866) },
  { id: 'appear_meg', label: 'Meg fades in beside Link', hittable: 'none', cite: at(776) },

  { id: 'intro_amy', label: 'Amy fades in', hittable: 'none', cite: at(1012) },
  { id: 'intro_jb', label: 'Joelle or Beth fades in', hittable: 'none', cite: at(1012) },
  { id: 'home_jb', label: 'Joelle or Beth floats to her post', hittable: 'none', cite: at(1036) },
  { id: 'wait_jb', label: 'Joelle or Beth waits at her post', overrides: dinsFizzles, cite: at(1046) },
  { id: 'roam_sis', label: 'The sister drifts about and toward Link', overrides: dinsFizzles, cite: at(630) },
  { id: 'windup_sis', label: 'The sister winds up a spin, shelled', hittable: shelled, cite: at(671) },
  { id: 'dash_sis', label: 'The sister spins at Link, shelled', hittable: shelled, cite: at(685) },
  { id: 'recoil_sis', label: 'The sister drifts back from her strike', overrides: dinsFizzles, frames: recoilFrames, cite: at(708) },
  { id: 'damaged_sis', label: 'The sister reels from a hit', hittable: 'none', cite: at(722) },
  { id: 'flee_sis', label: 'The sister flees from Link', overrides: dinsFizzles, cite: at(747) },
  { id: 'vanishing_sis', label: 'The sister fades out', hittable: 'none', cite: at(763) },
  {
    id: 'roam_hidden', label: 'The sister roams and strikes unseen; only a Deku Nut or magic touches her',
    hittable: unseen, overrides: dinsFizzles,
    frames: { value: 100, cite: at(350) }, cite: at(768),
  },
  { id: 'windup_hidden', label: 'The unseen sister winds up a spin, unshelled while unseen', hittable: unseen, overrides: dinsFizzles, cite: at(288) },
  { id: 'dash_hidden', label: 'The unseen sister spins at Link', hittable: unseen, overrides: dinsFizzles, cite: at(1234) },
  { id: 'recoil_hidden', label: 'The unseen sister drifts back from her strike', hittable: unseen, overrides: dinsFizzles, frames: recoilFrames, cite: at(708) },
  { id: 'appear_sis', label: 'The sister fades back in', hittable: 'none', cite: at(776) },
]

const steps: Step[] = [
  { from: 'wait_meg', to: 'swirl_meg', label: 'Link comes close and Meg rises', range: 'near', cite: at(858) },
  { from: 'swirl_meg', to: 'circle_meg', label: 'Meg begins to circle', cite: at(923) },
  { from: 'circle_meg', to: 'dash_meg', label: 'Meg stops circling and attacks', afterTimer: true, cite: at(991) },
  { from: 'circle_meg', to: 'vanish_meg', label: 'Meg rings Link wherever he goes, so he gets away only by leaving her room, and she vanishes', range: 'far', cite: at(986) },
  { from: 'dash_meg', to: 'recoil_meg', label: 'Meg strikes Link', move: 'near', attack: 'spin', cite: at(1199) },
  { from: 'recoil_meg', to: 'vanish_meg', label: 'Meg laughs and vanishes', afterTimer: true, cite: at(717) },
  { from: 'damaged_meg', to: 'vanish_meg', label: 'Meg vanishes after the hit', cite: at(730) },
  { from: 'vanish_meg', to: 'appear_meg', label: 'Meg returns beside Link', afterTimer: true, cite: at(881) },
  { from: 'appear_meg', to: 'circle_meg', label: 'Meg and new illusions circle again', cite: at(791) },

  { from: 'intro_amy', to: 'roam_sis', label: 'Amy starts to roam', cite: at(1022) },
  { from: 'intro_jb', to: 'home_jb', label: 'Joelle or Beth heads to her post', cite: at(1024) },
  { from: 'home_jb', to: 'wait_jb', label: 'Joelle or Beth reaches her post', cite: at(1039) },
  { from: 'wait_jb', to: 'roam_sis', label: 'Link comes close and the sister leaves her post', range: 'near', cite: at(1050) },
  { from: 'roam_sis', to: 'windup_sis', label: 'Link is close and the sister winds up', range: 'near', cite: at(665) },
  { from: 'windup_sis', to: 'dash_sis', label: 'The sister spins at Link', cite: at(681) },
  { from: 'dash_sis', to: 'recoil_sis', label: 'The sister strikes Link', move: 'near', attack: 'spin', cite: at(1199) },
  { from: 'recoil_sis', to: 'roam_sis', label: 'The sister drifts off', afterTimer: true, cite: at(714) },
  { from: 'damaged_sis', to: 'flee_sis', label: 'The sister flees', cite: at(726) },
  { from: 'flee_sis', to: 'vanishing_sis', label: 'The sister backs into a wall and fades', cite: at(756) },
  { from: 'flee_sis', to: 'roam_sis', label: 'Far from Link, the sister stops fleeing', range: 'far', cite: at(759) },
  { from: 'vanishing_sis', to: 'roam_hidden', label: 'The sister is unseen', cite: at(769) },
  { from: 'roam_hidden', to: 'windup_hidden', label: 'Link is close and the unseen sister winds up', range: 'near', cite: at(665) },
  { from: 'windup_hidden', to: 'dash_hidden', label: 'The unseen sister spins at Link', cite: at(681) },
  { from: 'dash_hidden', to: 'recoil_hidden', label: 'The unseen sister strikes Link', move: 'near', attack: 'spin', cite: at(1199) },
  { from: 'recoil_hidden', to: 'appear_sis', label: 'Her unseen time has run out, and the sister fades back in', afterTimer: true, cite: at(1145) },
  { from: 'roam_hidden', to: 'appear_sis', label: 'The sister fades back in', afterTimer: true, cite: at(1145) },
  { from: 'appear_sis', to: 'roam_sis', label: 'The sister roams again', cite: at(788) },
]

const attacks: Attack[] = [
  { id: 'spin', label: "Poe Sister's spinning strike", damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(108) },
]

/** Every phase a damaging hit can land in, and where the hit sends the sister (z_en_po_sisters.c:1187). */
const hurtTo: Record<string, string> = {
  circle_meg: 'damaged_meg',
  wait_jb: 'damaged_sis',
  roam_sis: 'damaged_sis',
  recoil_sis: 'damaged_sis',
  flee_sis: 'damaged_sis',
}

const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, to: hurtTo, note: 'damage applies and the sister reels; 0-damage entries do nothing', cite: at(1181) },
  '0xE': { damage: true, to: hurtTo, note: "swords: as 0x0, except that the real Meg ignores them while circling (the circle_meg guard)", cite: at(1175) },
  '0xF': { damage: false, to: { roam_hidden: 'appear_sis', windup_hidden: 'appear_sis', dash_hidden: 'appear_sis', recoil_hidden: 'appear_sis' }, note: 'a Deku Nut, accepted only while unseen, makes the sister reappear', cite: at(1174) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const intro = (line: number) => post('flame-theft cutscene variant (params bit 12): the actor is turned into a prop and its collider never updates', line)

export const enPoSisters: ActorSpec = {
  overlay: 'ovl_En_Po_Sisters',
  name: 'Poe Sister',
  role: 'enemy',
  summary:
    'The four Poe Sisters of the Forest Temple, 10 health each. Joelle, Beth, and Amy drift, spin at Link, flee when hurt, and turn invisible, when only a Deku Nut brings them back. Meg circles Link with three illusions, shrugs off swords while circling, and vanishes after every hit.',
  cite: at(88),
  pools: [{ id: 'body', label: 'Poe Sister', hp: { value: 10, cite: at(117) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'wait_meg',
  variants: [
    { id: 'meg', label: 'Meg, with her illusions', start: 'wait_meg', cite: at(227) },
    { id: 'joelle_beth', label: 'Joelle or Beth (identical in combat)', start: 'intro_jb', cite: at(1024) },
    { id: 'amy', label: 'Amy', start: 'intro_amy', cite: at(1017) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    func_80ADA4A8: 'roam_*',
    func_80ADA530: 'roam_*',
    func_80ADA6A0: 'roam_*',
    func_80ADA7F0: 'windup_*',
    func_80ADA8C0: 'dash_*',
    func_80ADA9E8: 'recoil_*',
    func_80ADAAA4: 'damaged_*',
    func_80ADAC70: 'flee_sis',
    func_80ADAD54: 'vanishing_sis',
    func_80ADAE6C: 'appear_*',
    func_80ADAFC0: post('death spiral, set by func_80AD99D4, which runs only once health is 0 (z_en_po_sisters.c:733); the encounter has already ended', 402),
    func_80ADB17C: post('flame returns to its torch, set by func_80AD9A54, which runs only at the end of the death spiral (z_en_po_sisters.c:821); the encounter has already ended', 411),
    func_80ADB2B8: 'wait_meg',
    func_80ADB338: 'vanish_meg',
    func_80ADB4B0: 'swirl_meg',
    func_80ADB51C: 'swirl_meg',
    func_80ADB770: 'circle_meg',
    func_80ADB9F0: 'intro_*',
    func_80ADBB6C: 'home_jb',
    func_80ADBBF4: 'wait_jb',
    func_80ADBC88: intro(542),
    func_80ADBD38: intro(225),
    func_80ADBD8C: intro(225),
    func_80ADBEE8: intro(225),
    func_80ADBF58: intro(1124),
  },
  atSources: {
    [at(108)]: 'spin',
  },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      vanish_meg_timer_clears: 'vanish_meg has no collider and no step but its timer, so Meg leaves it only when the timer has run out and there is nothing left to clear',
      recoil_meg_timer_clears: 'recoil_meg is shelled, so no hit moves Meg out of it, and its only step waits for the timer, so she leaves it only once the timer has run out and there is nothing left to clear',
      link_hurt_overkill:
        "the only attack costs 8 units, one whole mark in every kit (kits with Double Defense take only the 4-unit hit, again one mark), and there is no burn, so Link's health reaches exactly zero and he falls before another hit can find him at zero",
    },
  },
}
