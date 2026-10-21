import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Sst/z_boss_sst.c'
const C = 'src/overlays/actors/ovl_Boss_Sst/z_boss_sst_colchk.inc.c'
const PL = 'src/overlays/actors/ovl_player_actor/z_player.c'
const at = (line: number): Cite => `${F}:${line}`
const col = (line: number): Cite => `${C}:${line}`

/** Every type the hand spheres and the eye cylinder accept (0xFFCFFFFF). */
const AC_TYPES = DMG_TYPES.filter((_, i) => (0xffcfffff >>> i) & 1)
/** sDamageTable (colchk 321..352), [damage, reaction] in DMG_TYPES order. */
const TABLE: [number, number][] = [
  [0, 0], [2, 0], [1, 0], [2, 0], [0, 0], [2, 0], [2, 0], [2, 0], [1, 0], [2, 0], [4, 0], [2, 0], [4, 3], [2, 0], [4, 0], [2, 0],
  [2, 0], [0, 0], [4, 3], [4, 4], [0, 0], [0, 0], [1, 0], [4, 0], [2, 0], [2, 0], [8, 0], [4, 0], [0, 0], [0, 0], [4, 0], [0, 0],
]
const entry = (d: DmgType) => TABLE[DMG_TYPES.indexOf(d)]
/** A hit counts only when its entry has damage or a reaction (`damageReaction != 0 || damage != 0`). */
const counts = (d: DmgType) => entry(d)[0] !== 0 || entry(d)[1] !== 0

type Over = NonNullable<Phase['overrides']>
/** A hand that is not hardened: any counting hit freezes it (ice) or sends it reeling; the hands have no health of their own. */
const handHits = (reelTo: string): Over =>
  Object.fromEntries(
    AC_TYPES.map((d) => [
      d,
      !counts(d) ? { damage: 0, cite: at(2557) } : entry(d)[1] === 3 ? { damage: 0, to: 'ice_open', cite: at(2569) } : { damage: 0, to: reelTo, cite: at(2571) },
    ]),
  )
/** The open eye outside Vulnerable: any counting hit knocks Bongo Bongo out, with no damage to its health. */
const eyeHits: Over = Object.fromEntries(
  AC_TYPES.map((d) => [d, counts(d) ? { damage: 0, to: 'stun_knockout', cite: at(2600) } : { damage: 0, cite: at(2588) }]),
)
const SWORD_STICK: DmgType[] = [
  'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_MASTER', 'SPIN_GIANT', 'JUMP_KOKIRI', 'JUMP_MASTER', 'JUMP_GIANT', 'DEKU_STICK',
]

type Kind = 'slam' | 'sweep' | 'punch' | 'grab' | 'clap'
const KIND_NAME: Record<Kind, string> = { slam: 'slam', sweep: 'sweep', punch: 'punch', grab: 'grab', clap: 'clap' }
const VERB: Record<Kind, string> = { slam: 'slams', sweep: 'sweeps into', punch: 'punches', grab: 'grabs', clap: 'claps together on' }
/** BossSst_HandSelectAttack: rand*6 floored; 0 slam, 1 sweep, 2 punch, 3-4 grab, 5 clap. With the other hand down, rand*5/6 capped at 4, so no clap. */
const ODDS: Record<Kind, { w: number; cite: Cite }> = {
  slam: { w: 1, cite: at(2516) },
  sweep: { w: 1, cite: at(2518) },
  punch: { w: 1, cite: at(2520) },
  grab: { w: 2, cite: at(2524) },
  clap: { w: 1, cite: at(2522) },
}
const READY_CITE: Record<Kind, Cite> = { slam: at(1478), sweep: at(1569), punch: at(1640), grab: at(1816), clap: at(1697) }
const STRIKE_CITE: Record<Kind, Cite> = { slam: at(1512), sweep: at(1598), punch: at(1657), grab: at(1838), clap: at(1734) }
const GO_CITE: Record<Kind, Cite> = { slam: at(1486), sweep: at(1581), punch: at(1644), grab: at(1824), clap: at(1704) }
const END_CITE: Record<Kind, Cite> = { slam: at(1532), sweep: at(1607), punch: at(1674), grab: at(1862), clap: at(1752) }
const HEALTHY: Kind[] = ['slam', 'sweep', 'punch', 'grab', 'clap']
const ONE_DOWN: Kind[] = ['slam', 'sweep', 'punch', 'grab']

/** The punch flies hardened (BossSst_HandSetInvulnerable(this, true)); hard hands ignore hits. */
const strikePhase = (id: string, k: Kind, label: string, reelTo: string): Phase =>
  k === 'punch' ? { id, label, guards: AC_TYPES, cite: at(1651) } : { id, label, overrides: handHits(reelTo), cite: STRIKE_CITE[k] }

/** The strike out of a phase: the slam hits Link under it, and its shockwave reaches him if he backed away. */
const strikeSteps = (from: string, to: string, k: Kind, who: string): Step[] =>
  k === 'slam'
    ? [
        { from, to, label: `${who} slams down on Link`, range: 'near', attack: 'slam', cite: END_CITE.slam },
        { from, to, label: `${who} slams down; the shockwave rolls out`, range: 'far', attack: 'shockwave', cite: at(1539) },
      ]
    : [{ from, to, label: `${who} ${VERB[k]} Link`, attack: k, cite: END_CITE[k] }]

/**
 * One hand down: the hit hand reels for 36 frames and then shakes for 200, 12 beats in all. The other hand attacks
 * meanwhile, so the window is a chain of beats, three cycles of wait, wind-up, strike, and retreat, ending when the
 * shaking hand gives up and slams back into place.
 */
const CYCLES = 3
const d1 = (c: number, part: string) => `down1_${c}_${part}`

const phases: Phase[] = [
  { id: 'drum', label: 'Bongo Bongo drums; the hands beat on the drum', frames: { value: 127, cite: at(668) }, overrides: handHits('down1_1_wait'), cite: at(673) },
  ...HEALTHY.flatMap((k): Phase[] => [
    { id: `atk_${k}_ready`, label: `A hand winds up to ${KIND_NAME[k]}`, overrides: handHits('down1_1_wait'), cite: READY_CITE[k] },
    strikePhase(`atk_${k}`, k, `A hand ${k === 'punch' ? 'punches, hardened' : VERB[k].split(' ')[0]}`, 'down1_1_wait'),
  ]),
  { id: 'atk_slam_down', label: 'The slamming hand lies on the floor', frames: { value: 30, cite: at(1532) }, overrides: handHits('down1_1_wait'), cite: at(1517) },
  { id: 'atk_retreat', label: 'The hands fly back to the drum', overrides: handHits('down1_1_wait'), cite: at(1438) },
  ...Array.from({ length: CYCLES }, (_, i) => i + 1).flatMap((c): Phase[] => [
    { id: d1(c, 'wait'), label: `One hand reels or shakes (cycle ${c}); the other waits`, overrides: handHits('down2_ready'), cite: at(1266) },
    ...ONE_DOWN.flatMap((k): Phase[] => [
      { id: d1(c, `${k}_ready`), label: `One hand down (cycle ${c}); the other winds up to ${KIND_NAME[k]}`, overrides: handHits('down2_ready'), cite: READY_CITE[k] },
      strikePhase(d1(c, k), k, `One hand down (cycle ${c}); the other ${k === 'punch' ? 'punches, hardened' : VERB[k].split(' ')[0]}`, 'down2_ready'),
    ]),
    { id: d1(c, 'retreat'), label: `One hand down (cycle ${c}); the other flies back`, overrides: handHits('down2_ready'), cite: at(1438) },
  ]),
  { id: 'down2_ready', label: 'Both hands down: the eye opens and Bongo Bongo readies its charge', invisible: true, frames: { value: 36, cite: at(2001) }, overrides: eyeHits, cite: at(735) },
  { id: 'down2_charge', label: 'Bongo Bongo charges across the room, eye open', invisible: true, overrides: eyeHits, cite: at(757) },
  { id: 'down2_end', label: 'Bongo Bongo turns back after its charge', hittable: 'none', cite: at(807) },
  { id: 'ice_open', label: 'A hand is frozen; Bongo Bongo flinches', hittable: 'none', cite: at(714) },
  { id: 'ice_ready', label: 'The eye is open; the other hand moves in to break the ice', invisible: true, overrides: eyeHits, cite: at(824) },
  { id: 'ice_break', label: 'The eye is open; the other hand smashes the ice', invisible: true, overrides: eyeHits, cite: at(2402) },
  { id: 'stun_knockout', label: 'Bongo Bongo is knocked out and falls', hittable: 'none', cite: at(852) },
  { id: 'stun_open', label: 'Bongo Bongo lies stunned, its eye open to blades', hittable: SWORD_STICK, frames: { value: 50, cite: at(910) }, cite: at(905) },
  { id: 'stun_recover', label: 'Bongo Bongo recovers and vanishes again', hittable: 'none', cite: at(963) },
]

const steps: Step[] = [
  ...HEALTHY.map((k): Step => ({ from: 'drum', to: `atk_${k}_ready`, label: `A hand flies at Link to ${KIND_NAME[k]}`, afterTimer: true, move: 'near', weight: ODDS[k].w, cite: ODDS[k].cite })),
  ...HEALTHY.map((k): Step => ({ from: `atk_${k}_ready`, to: `atk_${k}`, label: `The hand begins its ${KIND_NAME[k]}`, cite: GO_CITE[k] })),
  ...strikeSteps('atk_slam', 'atk_slam_down', 'slam', 'The hand'),
  { from: 'atk_slam_down', to: 'atk_retreat', label: 'The hand pushes off the floor', afterTimer: true, cite: at(1524) },
  ...HEALTHY.filter((k) => k !== 'slam').flatMap((k) => strikeSteps(`atk_${k}`, 'atk_retreat', k, 'The hand')),
  { from: 'atk_retreat', to: 'drum', label: 'The hands are back; the drumming starts again', cite: at(663) },
  ...Array.from({ length: CYCLES }, (_, i) => i + 1).flatMap((c): Step[] => {
    const next = c < CYCLES ? d1(c + 1, 'wait') : 'drum'
    return [
      ...ONE_DOWN.map((k): Step => ({ from: d1(c, 'wait'), to: d1(c, `${k}_ready`), label: `The other hand flies at Link to ${KIND_NAME[k]}`, weight: ODDS[k].w, cite: ODDS[k].cite })),
      ...ONE_DOWN.map((k): Step => ({ from: d1(c, `${k}_ready`), to: d1(c, k), label: `The other hand begins its ${KIND_NAME[k]}`, cite: GO_CITE[k] })),
      ...ONE_DOWN.flatMap((k) => strikeSteps(d1(c, k), d1(c, 'retreat'), k, 'The other hand')),
      c < CYCLES
        ? { from: d1(c, 'retreat'), to: next, label: 'The other hand is back and waits', cite: at(1455) }
        : { from: d1(c, 'retreat'), to: next, label: 'The shaking hand gives up and slams back into place', cite: at(2087) },
    ]
  }),
  { from: 'down2_ready', to: 'down2_charge', label: 'Both fists are set: Bongo Bongo charges', afterTimer: true, cite: at(739) },
  { from: 'down2_charge', to: 'down2_end', label: 'Bongo Bongo rams Link', attack: 'charge', cite: at(773) },
  { from: 'down2_end', to: 'atk_retreat', label: 'The hands fly home', cite: at(815) },
  { from: 'ice_open', to: 'ice_ready', label: 'Bongo Bongo opens its eye on the frozen hand', cite: at(719) },
  { from: 'ice_ready', to: 'ice_break', label: 'The other hand starts smashing', cite: at(2392) },
  { from: 'ice_break', to: 'atk_retreat', label: 'The ice shatters and the hands fly home', cite: at(2434) },
  { from: 'stun_knockout', to: 'stun_open', label: 'Bongo Bongo lands, stunned', cite: at(898) },
  { from: 'stun_open', to: 'stun_recover', label: 'Bongo Bongo comes to', afterTimer: true, cite: at(933) },
  { from: 'stun_recover', to: 'atk_retreat', label: 'Bongo Bongo rises; the hands fly home', cite: at(993) },
]

const HAND_RUNTIME = at(2533)
const attacks: Attack[] = [
  { id: 'slam', label: 'Hand slam', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  { id: 'shockwave', label: 'Slam shockwave', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: col(309) },
  { id: 'sweep', label: 'Hand sweep', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  { id: 'punch', label: 'Fist punch', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  {
    id: 'grab', label: 'Fist grab and crush', damage: 32,
    effect: { kind: 'grab', frames: { value: 21, cite: `${PL}:14249` }, damagePerBeat: 8, release: 'escape' },
    blockable: false, dodgeable: true, source: HAND_RUNTIME,
  },
  { id: 'clap', label: 'Clap', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  { id: 'charge', label: 'Head charge', damage: 48, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: col(145) },
]

const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, note: 'in Vulnerable the eye takes the table damage (Actor_ApplyDamage); elsewhere the phases override it', cite: at(2590) },
  '0x3': { damage: false, note: 'ice freezes a hand; ice never reaches the eye in Vulnerable, where only swords and sticks connect', cite: at(2568) },
  '0x4': { damage: false, note: 'light magic has no case of its own: a hand reels as from any hit, and only swords and sticks reach the eye in Vulnerable', cite: at(2571) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const AFTER = 'death cutscene after the finishing blow; the encounter has already ended'
const handAt: Excluded = ({ excluded: 'a hand sphere, AT damage 0 at init; BossSst_HandSetDamage sets its damage per attack, carried by the runtime change', cite: HAND_RUNTIME })

export const bossSst: ActorSpec = {
  overlay: 'ovl_Boss_Sst',
  name: 'Bongo Bongo',
  role: 'boss',
  summary:
    'A headless drummer and its two giant hands. Hitting a hand sends it reeling; hitting the other before the first recovers opens the eye, ' +
    'and an ice hit freezes a hand and opens it too. The eye is visible only through the Lens. A hit on the open eye knocks Bongo Bongo out, ' +
    'and only then do swords and sticks hurt it.',
  cite: at(295),
  pools: [{ id: 'head', label: 'Bongo Bongo', hp: { value: 36, cite: col(318) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'drum',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    BossSst_HeadLurk: post('before the fight: the head waits undrawn for Link to drop in, and no collider is checked', 381),
    BossSst_HeadIntro: post('intro cutscene: Link is held in a cutscene action and no AC collider is checked', 2705),
    BossSst_HeadNeutral: 'drum',
    BossSst_HeadWait: 'atk_*',
    BossSst_HeadDamagedHand: 'down1_*',
    BossSst_HeadReadyCharge: 'down2_ready',
    BossSst_HeadCharge: 'down2_charge',
    BossSst_HeadEndCharge: 'down2_end',
    BossSst_HeadFrozenHand: 'ice_*',
    BossSst_HeadUnfreezeHand: 'atk_retreat',
    BossSst_HeadStunned: 'stun_knockout',
    BossSst_HeadVulnerable: 'stun_open',
    BossSst_HeadDamage: 'stun_open',
    BossSst_HeadRecover: 'stun_recover',
    BossSst_HeadDeath: post(AFTER, 1065),
    BossSst_HeadThrash: post(AFTER, 1107),
    BossSst_HeadDarken: post(AFTER, 1126),
    BossSst_HeadFall: post(AFTER, 1162),
    BossSst_HeadMelt: post(AFTER, 1180),
    BossSst_HeadFinish: post(AFTER, 1204),
    BossSst_HandWait: 'drum',
    BossSst_HandDownbeat: 'drum',
    BossSst_HandDownbeatEnd: 'drum',
    BossSst_HandOffbeat: 'drum',
    BossSst_HandOffbeatEnd: 'drum',
    BossSst_HandReadySlam: 'atk_slam_ready',
    BossSst_HandSlam: 'atk_slam',
    BossSst_HandEndSlam: 'atk_retreat',
    BossSst_HandReadySweep: 'atk_sweep_ready',
    BossSst_HandSweep: 'atk_sweep',
    BossSst_HandReadyPunch: 'atk_punch_ready',
    BossSst_HandPunch: 'atk_punch',
    BossSst_HandReadyClap: 'atk_clap_ready',
    BossSst_HandClap: 'atk_clap',
    BossSst_HandEndClap: 'atk_retreat',
    BossSst_HandReadyGrab: 'atk_grab_ready',
    BossSst_HandGrab: 'atk_grab',
    BossSst_HandCrush: 'atk_grab',
    BossSst_HandSwing: 'atk_grab',
    BossSst_HandEndCrush: 'atk_retreat',
    BossSst_HandRetreat: 'atk_retreat',
    BossSst_HandReel: 'down1_*',
    BossSst_HandReadyShake: 'down1_*',
    BossSst_HandShake: 'down1_*',
    BossSst_HandReadyCharge: 'down2_ready',
    BossSst_HandFrozen: 'ice_*',
    BossSst_HandReadyBreakIce: 'ice_ready',
    BossSst_HandBreakIce: 'ice_break',
    BossSst_HandStunned: 'stun_knockout',
    BossSst_HandDamage: 'stun_open',
    BossSst_HandRecover: 'stun_recover',
    BossSst_HandThrash: post(AFTER, 2198),
    BossSst_HandDarken: post(AFTER, 2236),
    BossSst_HandFall: post(AFTER, 2250),
    BossSst_HandMelt: post(AFTER, 2266),
    BossSst_HandFinish: post(AFTER, 2287),
  },
  atSources: {
    ...Object.fromEntries([8, 19, 30, 41, 52, 63, 74, 85, 96, 107, 118].map((l) => [col(l), handAt])),
    ...Object.fromEntries([145, 156, 167, 178, 189, 200, 211, 222, 233, 244, 255].map((l) => [col(l), 'charge'])),
    [col(309)]: 'shockwave',
    [HAND_RUNTIME]: 'slam',
    [at(1914)]: 'grab',
  },
  loadouts: [
    ...standardLoadouts(['adult'], 4),
    { id: 'adult_ice_lens', age: 'adult', hearts: 4, gear: ['deku_nuts', 'master_sword', 'bow', 'ice_arrows', 'magic', 'lens_of_truth'], magic: 8 },
  ],
}
