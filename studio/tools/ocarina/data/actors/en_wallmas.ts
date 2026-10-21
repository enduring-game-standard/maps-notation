import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Wallmas/z_en_wallmas.c'
const at = (line: number): Cite => `${F}:${line}`

/** Spawn params (`WMT_*`) decide where the hand goes after it climbs back to the ceiling. */
type Kind = 'timer' | 'prox' | 'flag'
const KINDS: Kind[] = ['timer', 'prox', 'flag']
const NAME: Record<Kind, string> = { timer: 'Wallmaster', prox: 'Wallmaster (wakes near home)', flag: 'Wallmaster (switch-flag, one drop)' }

const phases: Phase[] = [
  { id: 'dormant', label: 'Wallmaster waits on the ceiling for Link to come near its home', hittable: 'none', cite: at(498) },
  { id: 'gone', label: 'Wallmaster has gone back into the ceiling for good', hittable: 'none', cite: at(396) },
  ...KINDS.flatMap((k): Phase[] => [
    {
      id: `wait_${k}`, label: `${NAME[k]}: shadow follows Link`, hittable: 'none',
      frames: k === 'flag' ? { value: 0x51, cite: at(508) } : { value: 0x82, cite: at(173) }, cite: at(311),
    },
    { id: `drop_${k}`, label: `${NAME[k]} falls on Link`, hittable: 'none', cite: at(339) },
    { id: `land_${k}`, label: `${NAME[k]} lands`, cite: at(349) },
    { id: `stand_${k}`, label: `${NAME[k]} stands up`, cite: at(355) },
    { id: `walk_${k}`, label: `${NAME[k]} walks`, cite: at(363) },
    { id: `rise_${k}`, label: `${NAME[k]} crouches to jump`, cite: at(376) },
    { id: `up_${k}`, label: `${NAME[k]} rises to the ceiling`, hittable: 'none', cite: at(382) },
    { id: `hurt_${k}`, label: `${NAME[k]} reels`, hittable: 'none', cite: at(409) },
    { id: `cooldown_${k}`, label: `${NAME[k]} recovers`, cite: at(424) },
    { id: `stun_${k}`, label: `${NAME[k]} is stunned`, frames: { value: 0x50, cite: at(307) }, cite: at(512) },
  ]),
]

const UP_TO: Record<Kind, Step[]> = {
  timer: [{ from: 'up_timer', to: 'wait_timer', label: 'Wallmaster lies in wait again', cite: at(402) }],
  prox: [
    { from: 'up_prox', to: 'wait_prox', label: 'Wallmaster lies in wait again', range: 'near', cite: at(402) },
    { from: 'up_prox', to: 'dormant', label: 'Wallmaster goes dormant', range: 'far', cite: at(404) },
  ],
  flag: [{ from: 'up_flag', to: 'gone', label: 'Wallmaster vanishes', cite: at(396) }],
}

const steps: Step[] = [
  { from: 'dormant', to: 'wait_prox', label: 'Link comes near; Wallmaster starts following him', range: 'near', cite: at(501) },
  ...KINDS.flatMap((k): Step[] => [
    { from: `wait_${k}`, to: `drop_${k}`, label: `${NAME[k]} drops`, afterTimer: true, cite: at(335) },
    { from: `drop_${k}`, to: `land_${k}`, label: `${NAME[k]} grabs at Link as it lands`, attack: 'grab', move: 'near', cite: at(345) },
    { from: `land_${k}`, to: `stand_${k}`, label: `${NAME[k]} stands`, cite: at(351) },
    { from: `stand_${k}`, to: `walk_${k}`, label: `${NAME[k]} walks off`, cite: at(357) },
    { from: `walk_${k}`, to: `rise_${k}`, label: `${NAME[k]} stops`, cite: at(365) },
    { from: `rise_${k}`, to: `up_${k}`, label: `${NAME[k]} jumps`, cite: at(378) },
    { from: `hurt_${k}`, to: `cooldown_${k}`, label: `${NAME[k]} steadies`, cite: at(414) },
    { from: `cooldown_${k}`, to: `up_${k}`, label: `${NAME[k]} jumps`, cite: at(426) },
    { from: `stun_${k}`, to: `up_${k}`, label: `${NAME[k]} shakes off the stun`, afterTimer: true, cite: at(522) },
    ...UP_TO[k],
  ]),
]

const attacks: Attack[] = [
  {
    id: 'grab',
    label: 'Wallmaster grab',
    // The carry-off itself deals nothing; Play_TriggerRespawn (z_en_wallmas.c:494) reloads the entrance with
    // respawnFlag -1, Player_Init sets unk_A86 = -2 (z_player.c:10743), and func_808382DC then inflicts 16 (z_player.c:4824).
    damage: 16,
    effect: { kind: 'grab', frames: { value: 0x1e, cite: at(275) }, damagePerBeat: 0, release: 'carried_off' },
    blockable: false,
    dodgeable: true,
    source: at(345),
  },
]

const HITTABLE = ['land', 'stand', 'walk', 'rise', 'cooldown', 'stun']
const toMap = (target: 'hurt' | 'stun') =>
  Object.fromEntries(
    KINDS.flatMap((k) => HITTABLE.filter((h) => !(target === 'stun' && h === 'stun')).map((h) => [`${h}_${k}`, `${target}_${k}`])),
  )

const reactions: Record<string, Reaction> = {
  WALLMAS_DMG_REACT_NONE: { damage: true, to: toMap('hurt'), note: 'damage, then the hand reels (even out of a stun)', cite: at(552) },
  WALLMAS_DMG_REACT_BURN: { damage: true, to: toMap('hurt'), note: 'damage with a fire ring, then the hand reels', cite: at(549) },
  WALLMAS_DMG_REACT_STUN_BLUE: { damage: true, to: toMap('stun'), note: 'stun unless already stunned', cite: at(545) },
  WALLMAS_DMG_REACT_STUN_WHITE: { damage: true, to: toMap('stun'), note: 'damage and a stun unless already stunned', cite: at(545) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enWallmas: ActorSpec = {
  overlay: 'ovl_En_Wallmas',
  name: 'Wallmaster',
  role: 'enemy',
  summary:
    'A hand on the ceiling whose shadow follows Link. It drops on him, and if it catches him it carries him back to the room entrance, where he loses a heart. If it misses it walks a little, then jumps back up and waits to drop again.',
  cite: at(4),
  pools: [{ id: 'body', label: 'Wallmaster', hp: { value: 4, cite: at(84) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'wait_timer',
  variants: [
    { id: 'timer', label: 'Wallmaster that drops on a timer', start: 'wait_timer', cite: at(158) },
    { id: 'prox', label: 'Wallmaster that wakes when Link nears its home', start: 'dormant', cite: at(155) },
    { id: 'flag', label: 'Wallmaster released by a switch flag', start: 'wait_flag', cite: at(148) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnWallmas_WaitToDrop: 'wait_*',
    EnWallmas_Drop: 'drop_*',
    EnWallmas_Land: 'land_*',
    EnWallmas_Stand: 'stand_*',
    EnWallmas_Walk: 'walk_*',
    EnWallmas_JumpToCeiling: 'rise_*',
    EnWallmas_ReturnToCeiling: 'up_*',
    EnWallmas_TakeDamage: 'hurt_*',
    EnWallmas_Cooldown: 'cooldown_*',
    EnWallmas_Stun: 'stun_*',
    EnWallmas_WaitForProximity: 'dormant',
    EnWallmas_WaitForSwitchFlag: post('waits off-screen for a room switch flag set by a scene event; the encounter starts once it is set (wait_flag carries the 0x51 timer it then sets)', 506),
    EnWallmas_TakePlayer: post('the carry-off cutscene; it is the grab attack\'s carried_off effect, which ends the encounter', 441),
    EnWallmas_Die: post('shrink and item drop after the finishing blow; the encounter has already ended', 430),
  },
  atSources: {
    [at(589)]: post('reads the Wallmaster\'s own freezeTimer to decide whether it can be hit; it does not touch Link', 589),
  },
  loadouts: standardLoadouts(['child', 'adult'], 1),
  expected: {
    deadVerbs: {
      wait_timer_timer_clears: 'the hand leaves its wait only when the timer runs out, and it cannot be hit there, so no timer is ever left behind',
      wait_prox_timer_clears: 'as wait_timer_timer_clears',
      wait_flag_timer_clears: 'as wait_timer_timer_clears',
      link_hurt_overkill: 'the grab is the only damage and it ends the fight, so it never lands on an empty health bar',
      grab_lands_again: 'the grab ends the fight when the hold runs out, so it never lands while Link is still held',
      grab_lands_dd_again: 'as grab_lands_again',
    },
  },
}
