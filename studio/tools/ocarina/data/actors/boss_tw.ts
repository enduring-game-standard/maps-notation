import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Tw/z_boss_tw.c'
const at = (line: number): Cite => `${F}:${line}`
const CC = 'src/code/z_collision_check.c'

/*
 * Reported gaps (the types cannot carry these):
 * - The ice blast's own collider has no special effect (line 174). Link freezes from the ground ice it leaves where it
 *   lands, when he stands on the floor inside it (lines 3553-3555). The blast is aimed at Link, so blast_ice carries the
 *   freeze; a backflip that dodges the blast but lands in the ice is not modeled.
 * - A beam hurts Link only when no beam or ground blast has hurt him for 150 frames (lines 833-834; ground fire and ice
 *   set 100, lines 3556, 4072). The model's beams are at least 11 beats apart (fly, turn, charge), past that gate.
 * - Burning wipes an ice charge every frame Link burns, and a freeze wipes a fire charge (lines 3186-3198). The landing
 *   blast clears the charge (onLand); an ice blast soaked up while Link still burns keeps its charge here.
 * - The sisters are one combined actor. A flight to a pillar runs until arrival or 200 frames (lines 699, 733); only
 *   the 50-100 frame flight is carried. The fusion waits for both sisters to be in FlyTo (lines 1500-1502); hit_4 fuses
 *   when its 53-frame timer ends.
 * - A sister's spin lasts 20 frames plus the end of its animation (lines 1462-1476); the animation length is asset data.
 * - The stun needs Link to aim the sent-back blast within 60 units of Twinrova (line 4647); the model assumes he does.
 * - From 10 health up Twinrova fires runs of three of one element, starting with a coin flip (lines 532, 5143-5148).
 *   Carried as phase states at 10 hearts, the run took adult_spin past the 1M position limit (adult_arrows 320536,
 *   2.7 times this model). Every blast is a coin flip here.
 * - Twinrova spins from a shot during TwinrovaFly too (lines 3026-3031); her flight has no timer here, so the spin
 *   changes nothing and is not carried.
 */

/**
 * Link never emits these types (link.ts), so they stand only for what the Mirror Shield sends on: a reflected beam,
 * and a fire or ice blast the shield soaks up. Each phase that reads one names it in `hittable`.
 */
const REFLECTED_BEAM: DmgType = 'UNBLOCKABLE'
const ABSORB: Record<El, DmgType> = { fire: 'UNKNOWN_1', ice: 'UNKNOWN_2' }
/** Fired items set `player->unk_A73` (z_player.c:3131, 3390), which spins a sister or Twinrova aside. */
const FIRED: DmgType[] = ['SLINGSHOT', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT']

/** Hits on a stunned Twinrova that are not sword-type: 2 damage each (line 3133). */
const OTHER: DmgType[] = ['SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'MAGIC_LIGHT']

type El = 'fire' | 'ice'
const ELS: El[] = ['fire', 'ice']
const SISTER: Record<El, string> = { fire: 'Koume', ice: 'Kotake' }

/**
 * Phase one: k counts the reflected beams that have struck a sister; the fusion needs four (line 1502). The sisters are
 * one combined actor: a fly phase (FlyTo) ends in a turn (TurnToPlayer), and a turn ends in a shot only when the last
 * flight was to a pillar (CAN_SHOOT, lines 699-700), else in another flight (line 666).
 */
const K = [0, 1, 2, 3]
const spinOnFired = (k: number) => Object.fromEntries(FIRED.map((d) => [d, { damage: 0, to: `spin_${k}`, cite: at(2906) }]))
const phaseOne: Phase[] = [
  ...K.flatMap((k): Phase[] => [
    {
      id: `fly_${k}`, label: `The sisters fly to a new spot (${k} hits)`, hittable: FIRED, overrides: spinOnFired(k),
      frames: { value: [50, 100], cite: at(693) }, cite: at(704),
    },
    {
      id: `turn_${k}`, label: `A sister turns on Link (${k} hits)`, hittable: FIRED, overrides: spinOnFired(k),
      frames: { value: 60, cite: at(644) }, cite: at(650),
    },
    { id: `spin_${k}`, label: `A sister spins away from a shot (${k} hits)`, hittable: 'none', frames: { value: 20, cite: at(1459) }, cite: at(1462) },
    ...ELS.flatMap((e): Phase[] => [
      { id: `shoot_charge_${e}_${k}`, label: `${SISTER[e]} charges her ${e} beam (${k} hits)`, hittable: 'none', frames: { value: 70, cite: at(744) }, cite: at(993) },
      {
        id: `shoot_beam_${e}_${k}`, label: `${SISTER[e]}'s ${e} beam is out (${k} hits)`, hittable: [REFLECTED_BEAM],
        overrides: { [REFLECTED_BEAM]: { damage: 0, to: `hit_${k + 1}`, cite: at(1336) } }, cite: at(1103),
      },
    ]),
  ]),
  ...[1, 2, 3, 4].map((k): Phase => ({
    id: `hit_${k}`, label: `A sister reels from her twin's beam (${k} hits)`, hittable: 'none', frames: { value: 53, cite: at(1368) }, cite: at(1376),
  })),
]

/** A sister's AT cylinder is set every update outside Wait (line 2932), so Link near her is struck in every phase. */
const body = (from: string): Step => ({ from, to: from, label: 'A sister flies into Link', range: 'near', attack: 'sister_body', cite: at(2932) })
const phaseOneSteps: Step[] = [
  ...K.flatMap((k): Step[] => [
    { from: `fly_${k}`, to: `turn_${k}`, label: 'A sister arrives and turns on Link', afterTimer: true, cite: at(734) },
    ...ELS.map((e): Step => ({ from: `turn_${k}`, to: `shoot_charge_${e}_${k}`, label: `${SISTER[e]} raises her scepter`, afterTimer: true, weight: 1, cite: at(663) })),
    { from: `turn_${k}`, to: `fly_${k}`, label: 'She was not at a pillar, so she flies on', afterTimer: true, weight: 2, cite: at(666) },
    { from: `spin_${k}`, to: `fly_${k}`, label: 'The sister flies on', afterTimer: true, cite: at(1475) },
    body(`fly_${k}`), body(`turn_${k}`), body(`spin_${k}`),
    ...ELS.flatMap((e): Step[] => [
      { from: `shoot_charge_${e}_${k}`, to: `shoot_beam_${e}_${k}`, label: `${SISTER[e]} fires her ${e} beam`, afterTimer: true, attack: `beam_${e}`, cite: at(1103) },
      body(`shoot_charge_${e}_${k}`),
      { from: `shoot_beam_${e}_${k}`, to: `fly_${k}`, label: `${SISTER[e]}'s beam dies away`, range: 'far', cite: at(1356) },
      { from: `shoot_beam_${e}_${k}`, to: `fly_${k}`, label: `${SISTER[e]}'s beam dies away as she flies into Link`, range: 'near', attack: 'sister_body', cite: at(1356) },
    ]),
  ]),
  ...[1, 2, 3, 4].map((k) => body(`hit_${k}`)),
  ...[1, 2, 3].map((k): Step => ({ from: `hit_${k}`, to: `fly_${k}`, label: 'The sister recovers and flies off', afterTimer: true, cite: at(1426) })),
  { from: 'hit_4', to: 'tw_fly_r_c0', label: 'Four hits: Koume and Kotake fuse into Twinrova', afterTimer: true, cite: at(1504) },
]

/**
 * Phase two. A sequence state says which element Twinrova fires next: r, a coin flip each blast (line 5141), and l,
 * the same once health is below 3, where hits other than the sword stop counting (line 3139). A done state also
 * remembers the element just fired, which is the one the Mirror Shield can soak up.
 */
const FLY: Record<string, [El, string][]> = {
  r: [['fire', 'rf'], ['ice', 'ri']],
  l: [['fire', 'lf'], ['ice', 'li']],
}
/** Each done state: the element just fired, and the fly and stun state that follow it. */
const DONE: Record<string, { el: El; back: string }> = {
  rf: { el: 'fire', back: 'r' }, ri: { el: 'ice', back: 'r' },
  lf: { el: 'fire', back: 'l' }, li: { el: 'ice', back: 'l' },
}
const STUNS = ['r', 'l']
type Charge = 'c0' | 'cf1' | 'cf2' | 'ci1' | 'ci2'
const CHARGES: Charge[] = ['c0', 'cf1', 'cf2', 'ci1', 'ci2']
/** What soaking up a blast of element `e` does to charge `c`: the next charge, or the release that stuns Twinrova. */
const absorb = (e: El, c: Charge): { to: Charge | 'release'; cite: Cite } => {
  const mine = e === 'fire' ? ['cf1', 'cf2'] : ['ci1', 'ci2']
  if (c === 'c0') return { to: e === 'fire' ? 'cf1' : 'ci1', cite: at(e === 'fire' ? 4346 : 4357) }
  if (c === mine[0]) return { to: mine[1] as Charge, cite: at(e === 'fire' ? 4346 : 4357) }
  if (c === mine[1]) return { to: 'release', cite: at(4363) }
  return { to: 'c0', cite: at(e === 'fire' ? 4342 : 4352) }
}
const CHARGE_LABEL: Record<Charge, string> = { c0: 'no charge', cf1: 'shield holds 1 fire', cf2: 'shield holds 2 fire', ci1: 'shield holds 1 ice', ci2: 'shield holds 2 ice' }

const phaseTwo: Phase[] = [
  ...Object.keys(FLY).flatMap((q) =>
    CHARGES.map((c): Phase => ({ id: `tw_fly_${q}_${c}`, label: `Twinrova flies to a pillar and winds up (${q}, ${CHARGE_LABEL[c]})`, hittable: 'none', cite: at(5380) })),
  ),
  ...Object.entries(DONE).flatMap(([q, { el, back }]) =>
    CHARGES.map((c): Phase => {
      const soak = absorb(el, c)
      return {
        id: `tw_done_${q}_${c}`, label: `Twinrova hovers after her ${el} blast (${q}, ${CHARGE_LABEL[c]})`,
        hittable: [...FIRED, ABSORB[el]],
        overrides: {
          ...Object.fromEntries(FIRED.map((d) => [d, { damage: 0, to: `tw_fly_${back}_${c}`, cite: at(3031) }])),
          [ABSORB[el]]: { damage: 0, to: soak.to === 'release' ? `tw_done_aim_${back}` : `tw_done_${q}_${soak.to}`, cite: soak.cite },
        },
        frames: { value: 60, cite: at(5222) }, cite: at(5225),
      }
    }),
  ),
  ...STUNS.flatMap((q): Phase[] => [
    {
      id: `tw_done_aim_${q}`, label: `The shield holds the third blast and fires it back at Twinrova, who hovers (${q})`, hittable: 'none',
      frames: { value: [30, 80], cite: at(4364) }, cite: at(5228),
    },
    {
      id: `tw_stun_${q}`, label: `Twinrova lies stunned on the floor (${q})`, frames: { value: 150, cite: at(5243) }, cite: at(5272),
      ...(q === 'l' ? { overrides: Object.fromEntries(OTHER.map((d) => [d, { damage: 0, cite: at(3139) }])) } : {}),
    },
    {
      id: `tw_getup_${q}`, label: `Twinrova gets up (${q})`, hittable: FIRED,
      overrides: Object.fromEntries(FIRED.map((d) => [d, { damage: 0, to: `tw_fly_${q}_c0`, cite: at(3031) }])),
      frames: { value: 50, cite: at(5334) }, cite: at(5337),
    },
  ]),
]

const phaseTwoSteps: Step[] = [
  ...Object.entries(FLY).flatMap(([q, next]) =>
    CHARGES.flatMap((c) =>
      next.map(([e, d]): Step => ({
        from: `tw_fly_${q}_${c}`, to: `tw_done_${d}_${c}`, label: `Twinrova fires a ${e} blast`, attack: `blast_${e}`,
        ...(next.length > 1 ? { weight: 1 } : {}), cite: at(5189),
      })),
    ),
  ),
  ...Object.entries(DONE).flatMap(([q, { back }]) =>
    CHARGES.map((c): Step => ({ from: `tw_done_${q}_${c}`, to: `tw_fly_${back}_${c}`, label: 'Twinrova flies off', afterTimer: true, cite: at(5230) })),
  ),
  ...STUNS.flatMap((q): Step[] => [
    { from: `tw_done_aim_${q}`, to: `tw_stun_${q}`, label: "The sent-back blast reaches Twinrova and stuns her", afterTimer: true, cite: at(4662) },
    { from: `tw_stun_${q}`, to: `tw_getup_${q}`, label: 'Twinrova comes to', afterTimer: true, cite: at(5326) },
    { from: `tw_getup_${q}`, to: `tw_fly_${q}_c0`, label: 'Twinrova rises and flies off', afterTimer: true, move: 'far', cite: at(5347) },
  ]),
]

/** Burning Link wipes an ice charge, freezing him a fire charge (lines 3186-3198): the landing blast leaves no charge. */
const landingClears = (done: string[], lost: Charge[]) =>
  Object.fromEntries(done.flatMap((q) => lost.map((c) => [`tw_done_${q}_${c}`, `tw_done_${q}_c0`])))

const attacks: Attack[] = [
  { id: 'sister_body', label: "A sister's body", damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(194) },
  ...ELS.map((e): Attack => ({
    id: `beam_${e}`, label: `${SISTER[e]}'s ${e} beam`, damage: 32, effect: { kind: e === 'fire' ? 'burn' : 'freeze' },
    blockable: true, dodgeable: true, source: at(836),
    reflect: { shields: [{ gear: 'mirror_shield' }], as: REFLECTED_BEAM, damage: 0, cite: at(1126) },
  })),
  ...ELS.map((e): Attack => ({
    id: `blast_${e}`, label: `Twinrova's ${e} blast`, damage: 48, effect: { kind: e === 'fire' ? 'burn' : 'freeze' },
    blockable: true, dodgeable: true, source: e === 'fire' ? at(496) : at(174),
    reflect: { shields: [{ gear: 'mirror_shield' }], as: ABSORB[e], damage: 0, cite: at(e === 'fire' ? 4346 : 4357) },
    onLand: e === 'fire'
      ? { to: landingClears(['rf', 'lf'], ['ci1', 'ci2']), cite: at(3198) }
      : { to: landingClears(['ri', 'li'], ['cf1', 'cf2']), cite: at(3193) },
  })),
]

/** Only a stunned Twinrova takes damage (line 3123): a sword-type hit by `CollisionCheck_GetSwordDamage`, anything else 2, the hookshot nothing. */
const SWORD: Partial<Record<DmgType, number>> = {
  SLASH_KOKIRI: 1, SPIN_KOKIRI: 1,
  JUMP_KOKIRI: 2, SPIN_MASTER: 2, SLASH_MASTER: 2, HAMMER_SWING: 2, DEKU_STICK: 2,
  HAMMER_JUMP: 4, JUMP_MASTER: 4, SPIN_GIANT: 4, SLASH_GIANT: 4,
  JUMP_GIANT: 8,
}
const SWORD_LINE: Record<number, number> = { 1: 3718, 2: 3720, 4: 3722, 8: 3724 }
const entries: Partial<Record<DmgType, { damage: number; cite: Cite }>> = {
  ...Object.fromEntries(Object.entries(SWORD).map(([d, n]) => [d, { damage: n!, cite: `${CC}:${SWORD_LINE[n!]}` as Cite }])),
  ...Object.fromEntries(OTHER.map((d) => [d, { damage: 2, cite: at(3133) }])),
  HOOKSHOT: { damage: 0, cite: at(3138) },
}

const out = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const bossTw: ActorSpec = {
  overlay: 'ovl_Boss_Tw',
  name: 'Twinrova',
  role: 'boss',
  summary:
    "Koume (fire) and Kotake (ice) fly the arena and take turns firing beams that burn or freeze Link. Link's weapons pass through them; only a beam sent back by the Mirror Shield into the other sister counts, and four such hits fuse them into Twinrova, with 24 health. She hurls fire and ice blasts. Three of one element soaked up by the Mirror Shield are released at her and stun her, and only while stunned does she take damage, from the sword or anything else that hits.",
  cite: at(579),
  pools: [
    {
      id: 'twinrova', label: 'Twinrova', hp: { value: 24, cite: at(579) }, then: 'defeated',
      thresholds: [
        { at: 2, to: { tw_stun_r: 'tw_stun_l' }, cite: at(3139) },
      ],
    },
  ],
  damage: { kind: 'custom', entries },
  phases: [...phaseOne, ...phaseTwo],
  start: 'fly_0',
  range: 'far',
  steps: [...phaseOneSteps, ...phaseTwoSteps],
  attacks,
  actionFuncs: {
    BossTw_FlyTo: 'fly_*',
    BossTw_TurnToPlayer: 'turn_*',
    BossTw_Spin: 'spin_*',
    BossTw_ShootBeam: 'shoot_*',
    BossTw_FinishBeamShoot: 'shoot_beam_*',
    BossTw_Laugh: 'shoot_beam_*',
    BossTw_HitByBeam: 'hit_*',
    BossTw_TwinrovaFly: 'tw_fly_*',
    BossTw_TwinrovaArriveAtTarget: 'tw_fly_*',
    BossTw_TwinrovaChargeBlast: 'tw_fly_*',
    BossTw_TwinrovaShootBlast: 'tw_fly_*',
    BossTw_TwinrovaSpin: 'tw_fly_*',
    BossTw_TwinrovaDoneBlastShoot: 'tw_done_*',
    BossTw_TwinrovaLaugh: 'tw_done_*',
    BossTw_TwinrovaStun: 'tw_stun_*',
    BossTw_TwinrovaGetUp: 'tw_getup_*',
    BossTw_Wait: out('the fused actor waits hidden (visible off, moved to y -2000) while the sisters fight; its fusion check is the hit_4 step', 1494),
    BossTw_CSWait: out('sisters wait out the intro cutscene; with the battle begun they start in FlyTo (line 547), the start phase', 1785),
    BossTw_TwinrovaIntroCS: out('intro cutscene; it ends by sending both sisters to FlyTo (line 2283)', 1795),
    BossTw_MergeCS: out('fusion cutscene: the sisters only animate', 1487),
    BossTw_TwinrovaMergeCS: out('fusion cutscene; it ends by setting up TwinrovaFly (line 1745), modeled as hit_4 going to tw_fly_r_c0', 1516),
    BossTw_DeathCS: out("the sisters' death cutscene after the finishing blow; the encounter has already ended", 1758),
    BossTw_TwinrovaDeathCS: out('death cutscene after the finishing blow; the encounter has already ended', 2628),
    BossTw_DeathBall: out('death-cutscene effect actor spawned after the finishing blow', 2331),
    BossTw_BlastFire: out('the fire blast projectile (same overlay, params TW_FIRE_BLAST): carried as attack blast_fire, and the beams\' ground fire as part of beam_fire', 495),
    BossTw_BlastIce: out('the ice blast projectile (same overlay, params TW_ICE_BLAST): carried as attack blast_ice, and the beams\' ground ice as part of beam_ice', 498),
  },
  atSources: {
    [at(174)]: 'blast_ice',
    [at(194)]: 'sister_body',
    [at(214)]: out("Twinrova's own cylinder: BossTw_TwinrovaUpdate registers it for AC and OC only, never AT", 3148),
    [at(496)]: 'blast_fire',
    [at(836)]: 'beam_fire',
    [at(4821)]: 'beam_ice',
  },
  /*
   * The worst landed hit is the fire blast: 48 (line 174) plus a burn of (0 + 199) / 2 frames (z_player.c:4798) at 1 a
   * frame in this arena, 5 beats or 100. 148 health is 9.25 hearts of 16, so 10 hearts is the fewest that survive it.
   */
  loadouts: standardLoadouts(['adult'], 10),
  linkRules: {
    statusFrames: { freeze: { value: 100, cite: at(343) } },
    burnDamage: { value: { units: 1, frames: 1 }, cite: 'src/overlays/actors/ovl_player_actor/z_player.c:11559' },
    freezeDamage: { value: { units: 1, frames: 2 }, cite: at(4820) },
  },
  expected: {
    deadVerbs: {
      spin_0_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_fire_0_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_ice_0_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      spin_1_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_fire_1_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_ice_1_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      spin_2_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_fire_2_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_ice_2_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      spin_3_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_fire_3_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      shoot_charge_ice_3_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      hit_1_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      hit_2_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      hit_3_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      hit_4_timer_clears: 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends',
      tw_stun_l_timer_clears: 'the last stun is left only by its timer or by the finishing blow, which ends the encounter',
      ...Object.fromEntries(STUNS.map((q) => [`tw_done_aim_${q}_timer_clears`, 'this phase is left only by a step that waits for its timer, so its timer is always spent when it ends'])),
      miss_reflect_beam_fire: 'a sent-back beam or soaked-up blast resolves on the beat it is fired, in the phase that fired it, where it always has an effect',
      hit_reflect_beam_fire__shoot_beam_ice_0: "Koume's beam is out only in shoot_beam_fire phases, so it is never sent back from shoot_beam_ice",
      hit_reflect_beam_fire__shoot_beam_ice_1: "Koume's beam is out only in shoot_beam_fire phases, so it is never sent back from shoot_beam_ice",
      hit_reflect_beam_fire__shoot_beam_ice_2: "Koume's beam is out only in shoot_beam_fire phases, so it is never sent back from shoot_beam_ice",
      hit_reflect_beam_fire__shoot_beam_ice_3: "Koume's beam is out only in shoot_beam_fire phases, so it is never sent back from shoot_beam_ice",
      miss_reflect_beam_ice: 'a sent-back beam or soaked-up blast resolves on the beat it is fired, in the phase that fired it, where it always has an effect',
      hit_reflect_beam_ice__shoot_beam_fire_0: "Kotake's beam is out only in shoot_beam_ice phases, so it is never sent back from shoot_beam_fire",
      hit_reflect_beam_ice__shoot_beam_fire_1: "Kotake's beam is out only in shoot_beam_ice phases, so it is never sent back from shoot_beam_fire",
      hit_reflect_beam_ice__shoot_beam_fire_2: "Kotake's beam is out only in shoot_beam_ice phases, so it is never sent back from shoot_beam_fire",
      hit_reflect_beam_ice__shoot_beam_fire_3: "Kotake's beam is out only in shoot_beam_ice phases, so it is never sent back from shoot_beam_fire",
      miss_reflect_blast_fire: 'a sent-back beam or soaked-up blast resolves on the beat it is fired, in the phase that fired it, where it always has an effect',
      miss_reflect_blast_ice: 'a sent-back beam or soaked-up blast resolves on the beat it is fired, in the phase that fired it, where it always has an effect',
      beam_fire_lands_again: 'between two beams the sisters fly (4 beats), turn (3) and charge (4), longer than the 5-beat burn or freeze a beam leaves',
      beam_fire_lands_dd_again: 'between two beams the sisters fly (4 beats), turn (3) and charge (4), longer than the 5-beat burn or freeze a beam leaves',
      beam_ice_lands_again: 'between two beams the sisters fly (4 beats), turn (3) and charge (4), longer than the 5-beat burn or freeze a beam leaves',
      beam_ice_lands_dd_again: 'between two beams the sisters fly (4 beats), turn (3) and charge (4), longer than the 5-beat burn or freeze a beam leaves',
      beam_fire_blocked_mirror_shield: 'a raised Mirror Shield always sends the beam back (line 898 returns before the block test at 904)',
      beam_ice_blocked_mirror_shield: 'a raised Mirror Shield always sends the beam back (line 898 returns before the block test at 904)',
      blast_fire_blocked_mirror_shield: 'a raised Mirror Shield always soaks the blast up first (the absorb verb outranks the block)',
      blast_ice_blocked_mirror_shield: 'a raised Mirror Shield always soaks the blast up first (the absorb verb outranks the block)',
    },
  },
}
