import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2.c'
const at = (line: number): Cite => `${F}:${line}`
const COL = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2_colchk.inc.c'
const col = (line: number): Cite => `${COL}:${line}`
const FD = 'src/overlays/actors/ovl_Boss_Fd/z_boss_fd.c'
const CC = 'src/code/z_collision_check.c'

/** Only the hammer cracks the hidden face (line 856). */
const HAMMER: DmgType[] = ['HAMMER_SWING', 'HAMMER_JUMP']
const K = [1, 2, 3] as const

/** `CollisionCheck_GetSwordDamage` (z_collision_check.c:3716): a sword-type hit may always kill (line 890 sets canKill). */
const SWORD: Partial<Record<DmgType, number>> = {
  SLASH_KOKIRI: 1, SPIN_KOKIRI: 1,
  JUMP_KOKIRI: 2, SPIN_MASTER: 2, SLASH_MASTER: 2, HAMMER_SWING: 2, DEKU_STICK: 2,
  HAMMER_JUMP: 4, JUMP_MASTER: 4, SPIN_GIANT: 4, SLASH_GIANT: 4,
  JUMP_GIANT: 8,
}
const SWORD_LINE: Record<number, number> = { 1: 3718, 2: 3720, 4: 3722, 8: 3724 }
/** Every other type the face accepts that Link emits. At health 2 or less these take nothing (line 895), yet still knock the head back down (line 912). */
const OTHER: DmgType[] = ['SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'MAGIC_ICE', 'MAGIC_LIGHT']

const hidden = (id: string, label: string, cite: Cite, k: number, frames?: Phase['frames']): Phase => ({
  id, label, cite, hittable: HAMMER,
  overrides: Object.fromEntries(HAMMER.map((d) => [d, { damage: 0, to: `vuln_${k}`, cite: at(859) }])),
  ...(frames ? { frames } : {}),
})

const phases: Phase[] = [
  ...K.flatMap((k): Phase[] => [
    { id: `emerge_${k}`, label: `The head waits under a hole and bursts out (pop ${k})`, hittable: 'none', frames: { value: 10, cite: at(232) }, cite: at(271) },
    hidden(`idle_${k}`, `The head turns to Link, face armored (pop ${k})`, at(337), k, { value: 20, cite: at(348) }),
    hidden(`strike_${k}`, `The head claws or breathes fire (pop ${k})`, at(370), k),
    hidden(`burrow_${k}`, `The head sinks back into the hole (pop ${k})`, at(381), k, { value: 25, cite: at(394) }),
    { id: `vuln_${k}`, label: `The head lies stunned, face cracked open (pop ${k})`, frames: { value: 60, cite: at(579) }, cite: at(539) },
    { id: `burrow_open_${k}`, label: `The stunned head sinks back, face still open (pop ${k})`, frames: { value: 25, cite: at(394) }, cite: at(587) },
  ]),
  { id: 'damaged', label: 'The head reels from the blow and sinks away', hittable: 'none', frames: { value: 25, cite: at(620) }, cite: at(596) },
  { id: 'away', label: "The head waits below while Volvagia's body flies", hittable: 'none', cite: at(626) },
]

const afterBurrow = (k: number, from: string): Step =>
  k < 3
    ? { from, to: `emerge_${k + 1}`, label: 'The head pops up at another hole', afterTimer: true, cite: at(404) }
    : { from, to: 'away', label: 'Third pop done: the body takes to the air', afterTimer: true, cite: at(402) }

const steps: Step[] = [
  ...K.flatMap((k): Step[] => [
    { from: `emerge_${k}`, to: `idle_${k}`, label: 'The head bursts up beside Link, knocking him back', range: 'near', afterTimer: true, attack: 'emerge_knock', cite: at(319) },
    { from: `emerge_${k}`, to: `idle_${k}`, label: 'The head bursts up', range: 'far', afterTimer: true, cite: at(323) },
    { from: `idle_${k}`, to: `strike_${k}`, label: 'The head swipes its claw', range: 'near', afterTimer: true, attack: 'claw', cite: at(370) },
    { from: `idle_${k}`, to: `strike_${k}`, label: 'The head breathes fire', range: 'far', afterTimer: true, attack: 'breath', cite: at(372) },
    { from: `strike_${k}`, to: `burrow_${k}`, label: 'The head finishes and burrows', cite: at(532) },
    afterBurrow(k, `burrow_${k}`),
    { from: `vuln_${k}`, to: `burrow_open_${k}`, label: 'The head comes to and burrows', afterTimer: true, cite: at(587) },
    afterBurrow(k, `burrow_open_${k}`),
  ]),
  { from: 'damaged', to: 'away', label: 'The head is gone: the body takes to the air', afterTimer: true, cite: at(626) },
  { from: 'away', to: 'emerge_1', label: 'The body dives into a hole and the head rises again', cite: at(822) },
]

const attacks: Attack[] = [
  { id: 'emerge_knock', label: 'The emerging head', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(319) },
  { id: 'claw', label: "The head's claw swipe", damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: col(18) },
  {
    id: 'breath', label: "The head's fire breath", damage: 48, effect: { kind: 'burn' }, blockable: false, dodgeable: true,
    source: `${FD}:1497`, via: { overlay: 'ovl_Boss_Fd', spawn: at(487) },
  },
]

const entries: Partial<Record<DmgType, { damage: number; to?: string; cite: Cite }>> = {
  ...Object.fromEntries(Object.entries(SWORD).map(([d, n]) => [d, { damage: n!, cite: `${CC}:${SWORD_LINE[n!]}` as Cite }])),
  ...Object.fromEntries(OTHER.map((d) => [d, { damage: 0, to: 'damaged', cite: at(895) }])),
  HOOKSHOT: { damage: 0, cite: at(893) },
}

const out = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const bossFd2: ActorSpec = {
  overlay: 'ovl_Boss_Fd2',
  name: 'Volvagia (head in the holes)',
  role: 'boss',
  summary:
    "Volvagia's head, popping out of the lava holes. It has no health of its own: every hit drains the flying body's (Boss_Fd), and the full fight is Boss_Fd's encounter. " +
    'This encounter is the last stand the head\'s own code decides: the hammer clamps her health to 1 (line 859), so the head pops, claws or breathes fire, and sinks; ' +
    'a hammer blow cracks the face and stuns it, and one sword hit on the open face kills, while anything else only sends it back under.',
  cite: at(192),
  pools: [{ id: 'volvagia', label: 'Volvagia (last health)', hp: { value: 1, cite: at(859) }, then: 'defeated' }],
  damage: { kind: 'custom', entries },
  phases,
  start: 'emerge_1',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    BossFd2_Emerge: 'emerge_*',
    BossFd2_Idle: 'idle_*',
    BossFd2_ClawSwipe: 'strike_*',
    BossFd2_BreatheFire: 'strike_*',
    BossFd2_Burrow: 'burrow_*',
    BossFd2_Vulnerable: 'vuln_*',
    BossFd2_Damaged: 'damaged',
    BossFd2_Wait: 'away',
    BossFd2_Death: out('death sequence after the finishing blow (set up at line 905); the encounter has already ended', 635),
  },
  atSources: {
    [at(319)]: 'emerge_knock',
    ...Object.fromEntries([18, 29, 40, 51, 62, 73, 84, 95].map((l) => [col(l), 'claw'])),
  },
  loadouts: standardLoadouts(['adult'], 4),
  expected: {
    deadVerbs: {
      emerge_1_timer_clears: 'the head is underground and unhittable while emerging, and it leaves only by its steps that wait for the timer, so the timer is always spent',
      emerge_2_timer_clears: 'as emerge_1_timer_clears',
      emerge_3_timer_clears: 'as emerge_1_timer_clears',
      damaged_timer_clears: 'damaged is unhittable and leaves only by its step that waits for the timer, so the timer is always spent',
      miss_hammer_swing__damaged: 'damaged lasts one beat (25 frames) and is entered only by Link\'s own hit, so it is gone before his next move',
      miss_hammer_jump__damaged: 'as miss_hammer_swing__damaged',
    },
  },
}
