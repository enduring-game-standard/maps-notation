import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Tite/z_en_tite.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

type Kind = 'red' | 'blue'
const KINDS: Kind[] = ['red', 'blue']
const NAME: Record<Kind, string> = { red: 'Red Tektite', blue: 'Blue Tektite' }
const ACTIVE = ['idle', 'turn', 'move', 'attack'] as const
const each = (f: (k: Kind) => [string, string][]) => Object.fromEntries(KINDS.flatMap(f))

/** A stunned Tektite ignores a second stun-type hit, damage and all (z_en_tite.c:878). */
const stunnedOverrides: Phase['overrides'] = {
  ARROW_ICE: { damage: 0, cite: at(878) },
  MAGIC_ICE: { damage: 0, cite: at(878) },
}

const phases: Phase[] = KINDS.flatMap((k): Phase[] => [
  { id: `idle_${k}`, label: `${NAME[k]} waits`, pool: k, frames: { value: [15, 44], cite: at(242) }, cite: at(247) },
  { id: `turn_${k}`, label: `${NAME[k]} turns toward Link`, pool: k, cite: at(455) },
  { id: `move_${k}`, label: `${NAME[k]} hops toward Link`, pool: k, cite: at(527) },
  { id: `attack_${k}`, label: `${NAME[k]} lunges at Link`, pool: k, cite: at(283) },
  { id: `recoil_${k}`, label: `${NAME[k]} springs back`, pool: k, hittable: 'none', cite: at(871) },
  { id: `stunned_${k}`, label: `${NAME[k]} is stunned`, pool: k, frames: { value: 80, cite: at(879) }, overrides: stunnedOverrides, cite: at(710) },
])

const steps: Step[] = KINDS.flatMap((k): Step[] => [
  { from: `idle_${k}`, to: `turn_${k}`, label: `${NAME[k]} notices Link`, afterTimer: true, cite: at(268) },
  { from: `turn_${k}`, to: `attack_${k}`, label: `${NAME[k]} faces Link up close and crouches to lunge`, range: 'near', cite: at(502) },
  { from: `turn_${k}`, to: `move_${k}`, label: `${NAME[k]} faces Link far off and starts hopping`, range: 'far', cite: at(504) },
  { from: `move_${k}`, to: `turn_${k}`, label: `${NAME[k]} hops up to Link`, move: 'near', cite: at(588) },
  { from: `attack_${k}`, to: `recoil_${k}`, label: `${NAME[k]} lunges into Link`, range: 'near', attack: 'lunge', cite: at(398) },
  { from: `attack_${k}`, to: `turn_${k}`, label: `${NAME[k]} lands its lunges short of Link`, range: 'far', cite: at(346) },
  { from: `recoil_${k}`, to: `attack_${k}`, label: `${NAME[k]} lands near Link and lunges again`, range: 'near', cite: at(686) },
  { from: `recoil_${k}`, to: `move_${k}`, label: `${NAME[k]} lands far from Link and hops after him`, range: 'far', cite: at(688) },
  { from: `stunned_${k}`, to: `attack_${k}`, label: `${NAME[k]} recovers near Link`, range: 'near', afterTimer: true, cite: at(758) },
  { from: `stunned_${k}`, to: `move_${k}`, label: `${NAME[k]} recovers far from Link`, range: 'far', afterTimer: true, cite: at(760) },
])

/** Swing states of Link attacks that need the near band (melee, and self-centered spins). */
const MELEE_KEYS = [
  'deku_stick', 'hammer_swing', 'hammer_jump', 'slash_kokiri', 'slash_master', 'slash_giant', 'spin_kokiri', 'spin_master', 'spin_giant',
  'jump_kokiri', 'jump_kokiri_self', 'jump_master', 'jump_master_self', 'jump_giant', 'jump_giant_self',
]

const hammerFlip = 'entered only when a Megaton Hammer strikes the floor within 400 units (actorCtx.unk_02, z_en_tite.c:903) without hitting the Tektite; the beat model has no Link verb for a floor strike that misses the enemy, so the flipped state is not on the page'

export const enTite: ActorSpec = {
  overlay: 'ovl_En_Tite',
  name: 'Tektite',
  role: 'enemy',
  summary:
    'A one-eyed hopping spider. It turns to face Link, hops closer, and lunges. After any lunge that connects, and after any hit it takes, it springs back and cannot be hurt until it lands. Deku Nuts, the Boomerang, the Hookshot, and ice stun it. Blue Tektites have twice the health.',
  cite: at(4),
  pools: [
    { id: 'red', label: 'Red Tektite', hp: { value: 2, cite: at(209) }, then: 'defeated' },
    { id: 'blue', label: 'Blue Tektite', hp: { value: 4, cite: at(216) }, then: 'defeated' },
  ],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      '0x0': {
        damage: true,
        to: each((k) => [...ACTIVE.map((p): [string, string] => [`${p}_${k}`, `recoil_${k}`]), [`stunned_${k}`, `recoil_${k}`]]),
        note: 'damage applies (a blue stun filter does not block it), then it springs back',
        cite: at(895),
      },
      '0x1': { damage: true, to: each((k) => ACTIVE.map((p) => [`${p}_${k}`, `stunned_${k}`])), note: 'stuns it unless already stunned', cite: at(881) },
      '0xF': { damage: true, to: each((k) => ACTIVE.map((p) => [`${p}_${k}`, `stunned_${k}`])), note: 'damage applies and it is stunned, unless already stunned', cite: at(880) },
      '0xE': { damage: false, note: 'immune to fire magic', cite: at(873) },
    },
  },
  phases,
  start: 'idle_red',
  variants: [
    { id: 'red', label: 'Red Tektite (params -1)', start: 'idle_red', cite: at(209) },
    { id: 'blue', label: 'Blue Tektite (params -2)', start: 'idle_blue', cite: at(214) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'lunge', label: 'Tektite lunge', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(111) },
  ],
  actionFuncs: {
    EnTite_Idle: 'idle_*',
    EnTite_TurnTowardPlayer: 'turn_*',
    EnTite_MoveTowardPlayer: 'move_*',
    EnTite_Attack: 'attack_*',
    EnTite_Recoil: 'recoil_*',
    EnTite_Stunned: 'stunned_*',
    EnTite_FlipOnBack: post(hammerFlip, 909),
    EnTite_FlipUpright: post(`${hammerFlip}; it is also the way out of the flipped state`, 906),
    EnTite_DeathCry: post('death cry after the finishing blow; the encounter has already ended', 890),
    EnTite_FallApart: post('body breaks apart and drops an item after death; drops are out of scope', 796),
    actionFunc: post('the parameter of EnTite_SetupAction, not a function; every real target is ledgered by name', 191),
  },
  atSources: {
    [at(111)]: 'lunge',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the lunge costs 8, or 4 with Double Defense, and every kit starts at 32 health, so no hit finds Link with less health than it takes',
      ...Object.fromEntries(
        KINDS.flatMap((k) =>
          MELEE_KEYS.flatMap((key) => [
            [`hit_${key}__idle_${k}`, `idle_${k} is only the opening phase, with Link far, and it turns toward him the beat he closes in, so a hit that needs Link near never finds it`],
            [`hit_${key}__move_${k}`, `move_${k} is entered only with Link far and leaves by hopping up to him, so a hit that needs Link near never finds it`],
          ]),
        ),
      ),
    },
  },
}
