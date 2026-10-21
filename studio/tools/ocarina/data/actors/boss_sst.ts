/*
 * Reported gaps (the types cannot express these; each is modeled as the closest honest thing):
 * - An actionFuncs entry names one phase or one prefix glob, so functions that run in several groups are mapped to
 *   the main one. BossSst_HeadWait also runs through down1_* (HeadDamagedHand ends in HeadSetupWait, z_boss_sst.c:723).
 *   BossSst_HandWait also runs as the other hand's wait in down1_* (z_boss_sst.c:1455). BossSst_HeadDamagedHand also
 *   runs in down2_flinch and ice_open (z_boss_sst.c:711).
 * - After a hit in Vulnerable the eye's AC is off until the damage animation ends (z_boss_sst.c:946, :956-957), while the
 *   stun timer keeps counting (z_boss_sst.c:952-953). A phase timer cannot carry across phases, so a hurt phase would
 *   restart the 50-frame window; and the animation's length is not in the decomp source. stun_open stays hittable.
 * - The hookshot holds the stun timer up while attached, +2 a frame capped at 50 (z_boss_sst.c:923-924). The model
 *   refills it to the cap (stun_hooked re-enters stun_open); a short pull refills it less.
 * - The sweep's AT is on only while Link stands taller than 40 or is airborne (z_boss_sst.c:1622). The model's dodge is
 *   its only low-profile stance; crouching under the sweep is not a stance the model has.
 * - The swing's helpless time is derived, not stated: four swings at steps of (timer * 0xE4 + 0x1C8) * 1.5 per frame
 *   (z_boss_sst.c:1946, src/code/z_lib.c:55) take 16+16, 12+12, 10+10 and 12 frames to the release, about 92 frames
 *   assuming the hand starts level. The clap's hold is at least the 30-frame timer (z_boss_sst.c:1762); the closing
 *   swing before it depends on the hands' angle and is left out.
 * - The fist charge: the head (48) and either fist (32, z_boss_sst.c:748-749) can connect first, by geometry; the two
 *   steps tie.
 */
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
const END_CITE: Record<Kind, Cite> = { slam: at(1546), sweep: at(1607), punch: at(1674), grab: at(1862), clap: at(1752) }
const HEALTHY: Kind[] = ['slam', 'sweep', 'punch', 'grab', 'clap']
const ONE_DOWN: Kind[] = ['slam', 'sweep', 'punch', 'grab']

/** The punch flies hardened (BossSst_HandSetInvulnerable(this, true)); hard hands ignore hits. */
const strikePhase = (id: string, k: Kind, label: string, reelTo: string): Phase =>
  k === 'punch' ? { id, label, guards: AC_TYPES, cite: at(1651) } : { id, label, overrides: handHits(reelTo), cite: STRIKE_CITE[k] }

/** The strike out of a phase: the slam hits Link under it, and its shockwave reaches him if he backed away. */
const slamSteps = (from: string, to: string, who: string): Step[] => [
  { from, to, label: `${who} slams down on Link`, range: 'near', attack: 'slam', cite: END_CITE.slam },
  { from, to, label: `${who} slams down; the shockwave rolls out`, range: 'far', attack: 'shockwave', cite: at(1539) },
]
const strikeSteps = (from: string, to: string, k: Kind, who: string): Step[] =>
  k === 'slam'
    ? slamSteps(from, to, who)
    : k === 'grab'
      ? [
          { from, to, label: `${who} grabs Link and crushes him`, attack: 'grab', cite: at(1855) },
          { from, to, label: `${who} grabs Link and swings him`, attack: 'grab_swing', cite: at(1857) },
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
    { id: d1(c, 'wait'), label: `One hand reels or shakes (cycle ${c}); the other waits`, overrides: handHits('down2_flinch'), cite: at(1266) },
    ...ONE_DOWN.flatMap((k): Phase[] => [
      { id: d1(c, `${k}_ready`), label: `One hand down (cycle ${c}); the other winds up to ${KIND_NAME[k]}`, overrides: handHits('down2_flinch'), cite: READY_CITE[k] },
      strikePhase(d1(c, k), k, `One hand down (cycle ${c}); the other ${k === 'punch' ? 'punches, hardened' : VERB[k].split(' ')[0]}`, 'down2_ready'),
    ]),
    { id: d1(c, 'retreat'), label: `One hand down (cycle ${c}); the other flies back`, overrides: handHits('down2_flinch'), cite: at(1438) },
  ]),
  { id: 'down1_slam', label: 'The shaking hand gives up and lies slammed on the floor, unhittable; the other hand waits', frames: { value: 30, cite: at(1532) }, overrides: handHits('down1_1_wait'), cite: at(1526) },
  { id: 'down2_flinch', label: 'Both hands down: Bongo Bongo flinches and opens its eye', hittable: 'none', cite: at(707) },
  { id: 'down2_ready', label: 'Both hands down: the eye is open and Bongo Bongo readies its charge', frames: { value: 36, cite: at(2001) }, overrides: eyeHits, cite: at(735) },
  { id: 'down2_charge', label: 'Bongo Bongo charges across the room, eye open', overrides: eyeHits, cite: at(757) },
  { id: 'down2_end', label: 'Bongo Bongo turns back after its charge', hittable: 'none', cite: at(807) },
  { id: 'ice_open', label: 'A hand is frozen; Bongo Bongo flinches', hittable: 'none', cite: at(714) },
  { id: 'ice_ready', label: 'The eye is open; the other hand moves in to break the ice', overrides: eyeHits, cite: at(824) },
  { id: 'ice_break', label: 'The eye is open; the other hand smashes the ice', overrides: eyeHits, cite: at(2402) },
  { id: 'stun_knockout', label: 'Bongo Bongo is knocked out and falls', hittable: 'none', cite: at(852) },
  {
    id: 'stun_open', label: 'Bongo Bongo lies stunned, its eye open to blades', hittable: [...SWORD_STICK, 'HOOKSHOT'], frames: { value: 50, cite: at(910) },
    overrides: { HOOKSHOT: { damage: 0, to: 'stun_hooked', cite: at(907) } }, cite: at(905),
  },
  { id: 'stun_hooked', label: 'Link hookshots the stunned head; its stun timer climbs while he is attached', hittable: 'none', cite: at(922) },
  { id: 'recover', label: 'Bongo Bongo recovers and vanishes again', hittable: 'none', cite: at(963) },
]

const steps: Step[] = [
  ...HEALTHY.map((k): Step => ({ from: 'drum', to: `atk_${k}_ready`, label: `A hand flies at Link to ${KIND_NAME[k]}`, afterTimer: true, move: 'near', weight: ODDS[k].w, cite: ODDS[k].cite })),
  ...HEALTHY.map((k): Step => ({ from: `atk_${k}_ready`, to: `atk_${k}`, label: `The hand begins its ${KIND_NAME[k]}`, cite: GO_CITE[k] })),
  ...strikeSteps('atk_slam', 'atk_slam_down', 'slam', 'The hand'),
  { from: 'atk_slam_down', to: 'atk_retreat', label: 'The hand pushes off the floor', afterTimer: true, cite: at(1524) },
  ...HEALTHY.filter((k) => k !== 'slam').flatMap((k) => strikeSteps(`atk_${k}`, 'atk_retreat', k, 'The hand')),
  { from: 'atk_retreat', to: 'drum', label: 'The hands are back; the drumming starts again', cite: at(663) },
  ...Array.from({ length: CYCLES }, (_, i) => i + 1).flatMap((c): Step[] => {
    const next = c < CYCLES ? d1(c + 1, 'wait') : 'down1_slam'
    return [
      ...ONE_DOWN.map((k): Step => ({ from: d1(c, 'wait'), to: d1(c, `${k}_ready`), label: `The other hand flies at Link to ${KIND_NAME[k]}`, weight: ODDS[k].w, cite: ODDS[k].cite })),
      ...ONE_DOWN.map((k): Step => ({ from: d1(c, `${k}_ready`), to: d1(c, k), label: `The other hand begins its ${KIND_NAME[k]}`, cite: GO_CITE[k] })),
      ...ONE_DOWN.flatMap((k) => strikeSteps(d1(c, k), d1(c, 'retreat'), k, 'The other hand')),
      c < CYCLES
        ? { from: d1(c, 'retreat'), to: next, label: 'The other hand is back and waits', cite: at(1455) }
        : null,
    ].filter((s): s is Step => s !== null)
  }),
  ...slamSteps(d1(CYCLES, 'retreat'), 'down1_slam', 'The shaking hand gives up and'),
  { from: 'down1_slam', to: 'drum', label: 'The fallen hand turns hittable again and waits; the drumming starts again', afterTimer: true, cite: at(1527) },
  { from: 'down2_flinch', to: 'down2_ready', label: 'The flinch ends; Bongo Bongo opens its eye to charge', cite: at(717) },
  { from: 'down2_ready', to: 'down2_charge', label: 'Both fists are set: Bongo Bongo charges', afterTimer: true, cite: at(739) },
  { from: 'down2_charge', to: 'down2_end', label: 'Bongo Bongo rams Link', attack: 'charge', cite: at(773) },
  { from: 'down2_charge', to: 'down2_end', label: 'A fist rams Link in the charge', attack: 'fist_charge', cite: at(2109) },
  { from: 'down2_end', to: 'atk_retreat', label: 'The hands fly home', cite: at(815) },
  { from: 'ice_open', to: 'ice_ready', label: 'Bongo Bongo opens its eye on the frozen hand', cite: at(719) },
  { from: 'ice_ready', to: 'ice_break', label: 'The other hand starts smashing', cite: at(2392) },
  { from: 'ice_break', to: 'atk_retreat', label: 'The ice shatters and the hands fly home', cite: at(2434) },
  { from: 'stun_knockout', to: 'stun_open', label: 'Bongo Bongo lands, stunned', cite: at(898) },
  { from: 'stun_open', to: 'recover', label: 'Bongo Bongo comes to', afterTimer: true, cite: at(933) },
  { from: 'stun_hooked', to: 'stun_open', label: 'The hookshot lets go; the stun timer has climbed back toward its cap', cite: at(924) },
  { from: 'recover', to: 'atk_retreat', label: 'Bongo Bongo rises; the hands fly home', cite: at(993) },
]

const HAND_RUNTIME = at(2533)
const attacks: Attack[] = [
  { id: 'slam', label: 'Hand slam', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  { id: 'shockwave', label: 'Slam shockwave', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: col(309) },
  { id: 'sweep', label: 'Hand sweep', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  { id: 'punch', label: 'Fist punch', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  {
    id: 'grab', label: 'Fist grab and crush', damage: 32,
    effect: { kind: 'grab', frames: { value: 21, cite: `${PL}:14249` }, damagePerBeat: { value: { units: 8, frames: 20 }, cite: at(1914) }, release: 'escape' },
    blockable: false, dodgeable: true, source: HAND_RUNTIME,
  },
  {
    id: 'grab_swing', label: 'Fist grab and swing', damage: 32, effect: { kind: 'paralyze', frames: { value: 92, cite: at(1946) } },
    blockable: false, dodgeable: true, source: HAND_RUNTIME,
  },
  { id: 'clap', label: 'Clap: the hands catch and hold Link', damage: 32, effect: { kind: 'paralyze', frames: { value: 30, cite: at(1762) } }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
  { id: 'fist_charge', label: 'Fist in the head charge', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: HAND_RUNTIME },
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
    'and an ice hit freezes a hand and opens it too. The Lens only shows the eye; a blind hit still lands. A hit on the open eye knocks Bongo Bongo out, ' +
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
    BossSst_HeadLurk: post('before the fight: the head waits undrawn for Link to drop in, and from NTSC 1.2 on its AC colliders are not checked while it lurks', 2705),
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
    BossSst_HeadRecover: 'recover',
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
    BossSst_HandStunned: 'stun_*',
    BossSst_HandDamage: 'stun_open',
    BossSst_HandRecover: 'recover',
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
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        [
          'explosive', 'arrow_normal', 'hammer_swing', 'hookshot', 'slash_master', 'slash_giant', 'arrow_fire', 'arrow_ice', 'arrow_light',
          'spin_giant', 'spin_master', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump',
        ].map((k) => [`hit_${k}__down1_1_wait`, 'down1_1_wait is entered only by Link hitting a hand, and its one step leaves it that same beat, so no later swing finds it']),
      ),
      ...Object.fromEntries(
        ['ice_ready', 'ice_break'].map((p) => [
          `hit_arrow_light__${p}`,
          'only adult_arrows carries ice and light arrows; it arrives with 8 magic and spends 4 on the ice arrow that reaches this phase, leaving too little for an 8-magic light arrow',
        ]),
      ),
      grab_lands_again: 'the grab holds Link for one beat (21 frames), which ends before the hand can grab again',
      grab_lands_dd_again: 'as grab_lands_again',
      clap_lands_again: 'the clap holds Link two beats (30 frames), and the next clap is at least a retreat and a 127-frame drum away',
      clap_lands_dd_again: 'as clap_lands_again',
      link_helpless_grab: "the fastest escape (21 frames) is one beat, so the grab ends at that beat's end before Link's next move",
    },
  },
  /**
   * adult_nayru fights without its sword: Nayru's Love lasts 60 beats (link.ts nayruFrames), and that timer across a
   * 36-health fight passes the 1M-position slice limit. Its kit still tests Nayru's Love against every attack; the
   * other kits carry the swords and the wins.
   */
  loadouts: standardLoadouts(['adult'], 4).map((lo) => (lo.id === 'adult_nayru' ? { ...lo, gear: lo.gear.filter((g) => g !== 'master_sword') } : lo)),
}
