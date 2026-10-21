import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bb/z_en_bb.c'
const at = (line: number): Cite => `${F}:${line}`

const BLUE = ['blue_fly', 'damage_blue', 'down_blue', 'stunned_blue']
const RED_EXPOSED = ['red_attack', 'damage_red', 'down_red']
const WHITE = ['white_fly', 'stunned_white']
const GREEN = ['green_on', 'green_off', 'stunned_green']

/** Reaction 0 entries: damage lands only while the flame is out (`flameScaleX < 20`) or the Bubble is down, else the hit bounces off. */
const BLUE_GREEN_FLAME_GUARDED: DmgType[] = [
  'DEKU_STICK', 'SLINGSHOT', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3',
  'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'UNBLOCKABLE', 'UNKNOWN_2',
]
const RED_FLAME_GUARDED: DmgType[] = ['SPIN_KOKIRI', 'JUMP_KOKIRI', 'UNBLOCKABLE', 'UNKNOWN_2']
const flameGuard = (guards: DmgType[]) => ({ guards })

const phases: Phase[] = [
  { id: 'blue_fly', label: 'Blue Bubble flies, flame lit', ...flameGuard(BLUE_GREEN_FLAME_GUARDED), cite: at(564) },
  { id: 'damage_blue', label: 'Blue Bubble reels from a hit', cite: at(546) },
  { id: 'down_blue', label: 'Blue Bubble is down, flame out', frames: { value: 200, cite: at(695) }, cite: at(706) },
  { id: 'stunned_blue', label: 'Blue Bubble is stunned, flame out', frames: { value: 80, cite: at(1115) }, cite: at(1122) },

  { id: 'red_wait', label: 'Fire Bubble lurks below the floor', hittable: 'none', cite: at(784) },
  { id: 'red_attack', label: 'Fire Bubble bounces about, flame lit', table: 'sDamageTableRed', ...flameGuard(RED_FLAME_GUARDED), cite: at(795) },
  { id: 'red_hide', label: 'Fire Bubble sinks into the floor', hittable: 'none', frames: { value: 10, cite: at(840) }, cite: at(839) },
  { id: 'red_rest', label: 'Fire Bubble rests below the floor', hittable: 'none', frames: { value: 120, cite: at(863) }, cite: at(862) },
  { id: 'damage_red', label: 'Fire Bubble reels from a hit', table: 'sDamageTableRed', cite: at(546) },
  { id: 'down_red', label: 'Fire Bubble is down, flame out', table: 'sDamageTableRed', frames: { value: 200, cite: at(695) }, cite: at(706) },

  { id: 'white_fly', label: 'White Bubble flies its path', table: 'sDamageTableWhite', cite: at(909) },
  { id: 'stunned_white', label: 'White Bubble is stunned', table: 'sDamageTableWhite', frames: { value: 80, cite: at(1115) }, cite: at(1122) },

  { id: 'green_on', label: 'Green Bubble circles, flame lit', pool: 'green', ...flameGuard(BLUE_GREEN_FLAME_GUARDED), frames: { value: [180, 210], cite: at(984) }, cite: at(1001) },
  { id: 'green_off', label: 'Green Bubble circles, flame out', pool: 'green', frames: { value: [60, 90], cite: at(1064) }, cite: at(1001) },
  { id: 'stunned_green', label: 'Green Bubble is stunned, flame out', pool: 'green', frames: { value: 80, cite: at(1115) }, cite: at(1122) },
]

const steps: Step[] = [
  { from: 'blue_fly', to: 'blue_fly', label: 'Blue Bubble charges into Link', range: 'near', attack: 'bite', cite: at(1277) },
  { from: 'blue_fly', to: 'blue_fly', label: 'Blue Bubble turns toward Link', range: 'far', move: 'near', cite: at(622) },
  { from: 'damage_blue', to: 'down_blue', label: 'Blue Bubble drops', cite: at(550) },
  { from: 'down_blue', to: 'down_blue', label: 'Downed Blue Bubble hops into Link', range: 'near', attack: 'bite', cite: at(1277) },
  { from: 'down_blue', to: 'blue_fly', label: 'Blue Bubble relights and takes off', afterTimer: true, cite: at(750) },
  { from: 'stunned_blue', to: 'down_blue', label: 'Blue Bubble shakes off the stun and drops', afterTimer: true, cite: at(1149) },

  { from: 'red_wait', to: 'red_attack', label: 'Fire Bubble leaps out at Link', range: 'near', cite: at(808) },
  { from: 'red_attack', to: 'red_attack', label: 'Fire Bubble bounces into Link', range: 'near', attack: 'bite_fire', cite: at(1277) },
  { from: 'red_attack', to: 'red_attack', label: 'Fire Bubble bounces off the floor', cite: at(844) },
  { from: 'red_attack', to: 'red_hide', label: 'Fire Bubble lands on a hot floor and sinks', cite: at(841) },
  { from: 'red_hide', to: 'red_rest', label: 'Fire Bubble is back home below the floor', afterTimer: true, cite: at(862) },
  { from: 'red_rest', to: 'red_attack', label: 'Fire Bubble leaps out at Link again', range: 'near', afterTimer: true, cite: at(808) },
  { from: 'damage_red', to: 'down_red', label: 'Fire Bubble drops', cite: at(550) },
  { from: 'down_red', to: 'down_red', label: 'Downed Fire Bubble hops into Link', range: 'near', attack: 'bite_fire', cite: at(1277) },
  { from: 'down_red', to: 'red_attack', label: 'Fire Bubble relights and springs up', afterTimer: true, cite: at(754) },

  { from: 'stunned_white', to: 'white_fly', label: 'White Bubble shakes off the stun', afterTimer: true, cite: at(1146) },

  { from: 'green_on', to: 'green_on', label: 'Green Bubble swoops into Link', range: 'near', attack: 'bite', cite: at(1277) },
  { from: 'green_on', to: 'green_off', label: 'Green Bubble\'s flame goes out', afterTimer: true, cite: at(1063) },
  { from: 'green_off', to: 'green_off', label: 'Unlit Green Bubble swoops into Link', range: 'near', attack: 'bite', cite: at(1277) },
  { from: 'green_off', to: 'green_on', label: 'Green Bubble relights', afterTimer: true, cite: at(1073) },
  { from: 'stunned_green', to: 'green_on', label: 'Green Bubble shakes off the stun and relights', afterTimer: true, cite: at(1144) },
]

const attacks: Attack[] = [
  { id: 'bite', label: 'Bubble bite', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(356) },
  { id: 'bite_fire', label: 'Fire Bubble bite', damage: 8, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(374) },
]

const all = (ids: string[], to: string) => Object.fromEntries(ids.map((id) => [id, to]))

/** Reactions 10, 11, 12, 14 (and the White table's 5, 7): damage, then a blue or fire Bubble drops and reels; a white one recoils. */
const knockDown: Record<string, string> = {
  ...all(BLUE, 'damage_blue'),
  ...all(RED_EXPOSED, 'damage_red'),
  ...all(WHITE, 'white_fly'),
}
const knockDownReaction = (note: string): Reaction => ({ damage: true, to: knockDown, note, cite: at(1201) })

/**
 * Reactions 8, 9, 15: stun unless already stunned. Stunned phases are absent from the map, so a stunning hit there changes nothing,
 * and every such entry in a stunned phase's table deals 0. The Fire Bubble has no stunned phase: its only stunning entries are
 * Ice Arrow (4) and ice magic (3, never emitted by Link), and 4 is its full health, so it dies before the stun runs.
 */
const stun: Record<string, string> = {
  ...all(['blue_fly', 'damage_blue', 'down_blue'], 'stunned_blue'),
  white_fly: 'stunned_white',
  ...all(['green_on', 'green_off'], 'stunned_green'),
}
const stunReaction = (note: string): Reaction => ({ damage: true, to: stun, note, cite: at(1194) })

const reactions: Record<string, Reaction> = {
  '0x0': {
    damage: true,
    to: { ...all(['damage_blue', 'down_blue', 'stunned_blue'], 'damage_blue'), ...all(['damage_red', 'down_red'], 'damage_red') },
    note: 'lands only while the Bubble is down or its flame is out (flameScaleX < 20), then sends it reeling; a lit Bubble bounces it off (the guards on lit phases)',
    cite: at(1210),
  },
  '0xA': knockDownReaction('damage, and a blue or fire Bubble drops (flame out) and reels; a white Bubble recoils; a green one has 1 health and dies'),
  '0xB': knockDownReaction('as 0xA'),
  '0xC': knockDownReaction('as 0xA'),
  '0xE': knockDownReaction('as 0xA'),
  '0x5': knockDownReaction('White table fire arrow: sets the burn timer, then as 0xA (a white Bubble only recoils)'),
  '0x7': knockDownReaction("White table Din's Fire: freezes the actor for the hit's damage in frames, then as 0xA"),
  '0x6': { damage: false, note: "only halts the actor for a few frames (freezeTimer = the hit's damage); no health lost", cite: at(1189) },
  '0x8': stunReaction('light-magic stun: gray filter for 80 frames'),
  '0x9': stunReaction('ice stun: blue filter for 80 frames'),
  '0xF': stunReaction('Deku Nut, Boomerang, Hookshot stun: blue filter for 80 frames'),
  '0xD': { damage: false, note: 'Fire Bubble table: no effect beyond skipping one frame of its action (EnBb_Update)', cite: at(1240) },
}

const REELS =
  'a Bubble reels (EnBb_Damage) only on the beat Link\'s own hit sends it there, and its step drops it to the down phase that same beat, so no later hit finds it'
const reelHits = (variant: 'blue' | 'red', keys: string[]) => Object.fromEntries(keys.map((k) => [`hit_${k}__damage_${variant}`, REELS]))

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enBb: ActorSpec = {
  overlay: 'ovl_En_Bb',
  name: 'Bubble',
  role: 'enemy',
  summary:
    'A flaming flying skull. Blue Bubbles fly about and bite; a lit one shrugs off blades until something knocks it down. Fire Bubbles leap from the floor and burn. White Bubbles fly a fixed path. Green Bubbles circle with a flame that comes and goes, and have one health point.',
  cite: at(329),
  pools: [
    { id: 'body', label: 'Bubble', hp: { value: 4, cite: at(338) }, then: 'defeated' },
    { id: 'green', label: 'Green Bubble', hp: { value: 1, cite: at(409) }, then: 'defeated' },
  ],
  damage: { kind: 'decomp', table: 'sDamageTableBlueGreen', reactions },
  phases,
  start: 'blue_fly',
  variants: [
    { id: 'blue', label: 'Blue Bubble', start: 'blue_fly', cite: at(367) },
    { id: 'red', label: 'Fire Bubble', start: 'red_wait', cite: at(375) },
    { id: 'white', label: 'White Bubble', start: 'white_fly', cite: at(394) },
    { id: 'green', label: 'Green Bubble (small or big; size and path only)', start: 'green_on', cite: at(411) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnBb_Blue: 'blue_fly',
    EnBb_Damage: 'damage_*',
    EnBb_Down: 'down_*',
    EnBb_Stunned: 'stunned_*',
    EnBb_Red: 'red_*',
    EnBb_White: 'white_fly',
    EnBb_Green: 'green_*',
    EnBb_Death: post('death animation and drop after the finishing blow; the encounter has already ended', 488),
    EnBb_FlameTrail: post(
      'the Fire Bubble\'s trailing flame children (params 0): they never collide, since AT needs speed != 0 and they stay at speed 0, and AC needs action > BB_FLAME_TRAIL',
      1277,
    ),
    actionFunc: post('not an action function: the extractor picked up the parameter name of EnBb_SetupAction', 262),
  },
  atSources: {
    [at(355)]: 'bite',
    [at(356)]: 'bite',
    [at(374)]: 'bite_fire',
    [at(1179)]: { excluded: "sets the Bubble's own freezeTimer (a hitstop of the attacker's damage in frames) when Din's Fire hits a White Bubble; it does not touch Link", cite: at(1179) },
    [at(1189)]: { excluded: "sets the Bubble's own freezeTimer (hitstop) for reaction 6 hits; it does not touch Link", cite: at(1189) },
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      ...reelHits('blue', [
        'deku_nut', 'deku_stick', 'slingshot', 'explosive', 'boomerang', 'arrow_normal', 'hammer_swing', 'hookshot', 'slash_kokiri',
        'slash_master', 'slash_giant', 'arrow_fire', 'arrow_ice', 'arrow_light', 'spin_kokiri', 'spin_giant', 'spin_master', 'jump_kokiri',
        'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump',
      ]),
      ...reelHits('red', [
        'explosive', 'arrow_normal', 'hammer_swing', 'slash_master', 'slash_giant', 'arrow_fire', 'arrow_light', 'spin_giant',
        'arrow_ice', 'spin_master', 'jump_kokiri', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump',
      ]),
      red_hide_timer_clears: 'red_hide cannot be hit and has one step, after its one-beat timer, so its timer always runs out',
      red_rest_timer_clears: 'red_rest cannot be hit and is left only once its timer runs out',
      stunned_green_timer_clears: 'a stunned Green Bubble leaves only by recovering when the stun runs out, or by dying, which ends the encounter',
    },
  },
}
