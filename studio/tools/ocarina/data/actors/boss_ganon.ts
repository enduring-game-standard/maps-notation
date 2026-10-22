import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Ganon/z_boss_ganon.c'
const at = (line: number): Cite => `${F}:${line}`
const CC = (line: number): Cite => `src/code/z_collision_check.c:${line}`

/**
 * Ganondorf (z_boss_ganon.c). Reported gaps, none expressible in the types:
 * - A swatted big magic ball flies at a random point within 350 of Ganondorf (lines 4457-4463) and stuns him only if it
 *   passes within 45 of him (line 4528). The odds are geometric, not a coded draw, so a non-spin swing and the Mirror
 *   Shield are modeled as a sure miss; only a spin attack (line 4433) is a sure stun.
 * - The light ball's forced volley needs Ganondorf more than 250 from Link and fewer than 3 returns (line 3989). Link's
 *   swings are melee, which the beat model gives only to a near Link, inside the 110-unit box under Ganondorf
 *   (line 2248) at about 150 below him (line 2272), almost always within 250. A return from afar is not representable,
 *   so every return takes the 0.7 draw (line 3991).
 * - Wait picks the big magic whenever Link is more than 350 away (line 2257); the far band has one set of odds, 2/1/1.
 * - A shot fired during a block resets its 10-frame timer (lines 2877, 2410). A phase re-entering itself keeps its timer,
 *   so the extension is not modeled.
 * - A bottle swing returns the light ball at 0.9/0.1 odds (lines 3959-3966, 4002-4007); a bottle swing is no damage type.
 * - Hits during BossGanon_Damaged are ignored (line 2743) for the damage animation, whose length is in the object binary.
 *   A damaged phase would restart the 70-frame down timer (line 2607) that keeps running in the code, so it is left out.
 * - The pound's shockwave misses a Link right under the landing point (inner edge 150 x scale, line 4804); there he
 *   touches the body cylinder (line 103) instead. Near carries the shockwave on landing and the body as he rises.
 */

/**
 * The health bands the code reads. `hi` is health 20 or more, when the Wait timer only ever starts a light ball
 * (line 2254). `lo` is 19 down to 3. `fl` is 2 or less, where only a sword-class hit still drains health (line 2766).
 */
type Band = 'hi' | 'lo' | 'fl'
const BANDS: Band[] = ['hi', 'lo', 'fl']
const BAND_NAME: Record<Band, string> = { hi: '', lo: ' (health under 20)', fl: ' (health 2 or less)' }

/** Damage on the downed Ganondorf: CollisionCheck_GetSwordDamage, or 2 for anything else (lines 2758-2763). */
const SWORDLIKE: Partial<Record<DmgType, [number, Cite]>> = {
  SLASH_KOKIRI: [1, CC(3719)], SPIN_KOKIRI: [1, CC(3719)],
  DEKU_STICK: [2, CC(3721)], SLASH_MASTER: [2, CC(3721)], SPIN_MASTER: [2, CC(3721)], JUMP_KOKIRI: [2, CC(3721)], HAMMER_SWING: [2, CC(3721)],
  SLASH_GIANT: [4, CC(3723)], SPIN_GIANT: [4, CC(3723)], JUMP_MASTER: [4, CC(3723)], HAMMER_JUMP: [4, CC(3723)],
  JUMP_GIANT: [8, CC(3725)],
}
/** The body cylinder takes 0xFFCFFFFE (line 98): every type but the Deku Nut, the shield, and reflected light. */
const OTHER: DmgType[] = ['SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'MAGIC_FIRE']
/** Shots that set player->unk_A73 when fired (z_player.c:3131, 3390), which makes a waiting Ganondorf block (line 2877). */
const FIRED: DmgType[] = ['SLINGSHOT', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT', 'BOOMERANG']
/** The light ball's cylinder takes 0x0D900740 (line 118): hammer swing, slashes, two-handed and Master spins and jumps, and the shield. */
const BALL_SWINGS: DmgType[] = ['HAMMER_SWING', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_GIANT', 'JUMP_MASTER']
/** A spin attack within 80 of a big magic ball sends it straight at Ganondorf (lines 4433-4439). */
const SPINS: DmgType[] = ['SPIN_GIANT', 'SPIN_MASTER']

const over = (types: DmgType[], to: string, cite: Cite) => Object.fromEntries(types.map((d) => [d, { damage: 0, to, cite }]))

const bandPhases = (b: Band): Phase[] => {
  const n = BAND_NAME[b]
  const wait = (id: string, label: string, frames: Phase['frames']): Phase => ({
    id, label,
    hittable: FIRED,
    overrides: over(FIRED, `block_${b}`, at(2877)),
    frames, cite: at(2225),
  })
  const ps: Phase[] = [
    wait(`wait_${b}`, `Ganondorf floats and waits${n}`, { value: [30, 93], cite: at(2227) }),
    wait(`wait_hit_${b}`, `Ganondorf floats after his light ball hit Link${n}`, { value: 125, cite: at(4143) }),
    { id: `block_${b}`, label: `Ganondorf blocks a shot with his cape${n}`, hittable: 'none', frames: { value: 10, cite: at(2410) }, cite: at(2406) },
    { id: `charge_${b}`, label: `Ganondorf charges a light ball${n}`, hittable: 'none', frames: { value: 25, cite: at(2292) }, cite: at(2291) },
    {
      id: `ball_out_${b}`, label: `The light ball flies at Link${n}`,
      hittable: [...BALL_SWINGS, 'SHIELD'],
      overrides: { ...over(BALL_SWINGS, `ball_back_${b}`, at(3978)), SHIELD: { damage: 0, to: `wait_${b}`, cite: at(3974) } },
      cite: at(2338),
    },
    { id: `ball_back_${b}`, label: `Link sends the light ball back at Ganondorf${n}`, hittable: 'none', cite: at(3990) },
    { id: `pound_${b}`, label: `Ganondorf rises to pound the floor${n}`, hittable: 'none', frames: { value: 40, cite: at(1880) }, cite: at(1881) },
    { id: `pound_end_${b}`, label: `Ganondorf lands and gets back up${n}`, hittable: 'none', frames: { value: 10, cite: at(1941) }, cite: at(1940) },
    {
      id: `stunned_${b}`, label: `Ganondorf reels from his own light${n}`,
      hittable: ['ARROW_LIGHT'], overrides: { ARROW_LIGHT: { damage: 0, to: `down_falling_${b}`, cite: at(2738) } },
      frames: { value: 70, cite: at(2455) }, cite: at(2464),
    },
    { id: `down_falling_${b}`, label: `A light arrow drops Ganondorf to the floor${n}`, hittable: 'none', cite: at(2528) },
    {
      id: `down_lying_${b}`, label: `Ganondorf is down and open to the sword${n}`,
      ...(b === 'fl' ? { overrides: Object.fromEntries(OTHER.map((d) => [d, { damage: 0, cite: at(2766) }])) } : {}),
      frames: { value: 70, cite: at(2607) }, cite: at(2604),
    },
    /** unk_2D4 = 80 as the get-up starts (line 2633) turns his collider's AC off until it counts down (line 2914). */
    { id: `down_rising_${b}`, label: `Ganondorf gets back up${n}`, hittable: 'none', cite: at(2630) },
  ]
  if (b === 'hi') return ps
  return [
    ...ps,
    {
      id: `magic_start_${b}`, label: `Ganondorf starts to charge his big magic${n}`,
      hittable: ['ARROW_LIGHT'], overrides: { ARROW_LIGHT: { damage: 0, to: `down_falling_${b}`, cite: at(2738) } },
      frames: { value: 30, cite: at(2015) }, cite: at(2019),
    },
    {
      id: `magic_hold_${b}`, label: `Ganondorf holds his big magic${n}`,
      hittable: ['ARROW_LIGHT'], overrides: { ARROW_LIGHT: { damage: 0, to: `down_falling_${b}`, cite: at(2738) } },
      frames: { value: 100, cite: at(2057) }, cite: at(2056),
    },
    {
      id: `magic_out_${b}`, label: `Five big magic balls fly at Link${n}`,
      hittable: ['ARROW_LIGHT', ...BALL_SWINGS],
      overrides: {
        ARROW_LIGHT: { damage: 0, to: `down_falling_${b}`, cite: at(2738) },
        ...over(BALL_SWINGS, `wait_${b}`, at(4457)),
        ...over(SPINS, `stunned_${b}`, at(4439)),
      },
      cite: at(2179),
    },
  ]
}

const bandSteps = (b: Band): Step[] => {
  const waitSteps = (w: string): Step[] => [
    { from: w, to: `pound_${b}`, label: 'Link stands under Ganondorf: he pounds the floor', range: 'near', cite: at(2250) },
    ...(b === 'hi'
      ? [{ from: w, to: `charge_${b}`, label: 'Ganondorf readies a light ball', range: 'far' as const, afterTimer: true, cite: at(2255) }]
      : [
          { from: w, to: `charge_${b}`, label: 'Ganondorf readies a light ball', range: 'far' as const, afterTimer: true, weight: 2, cite: at(2263) },
          { from: w, to: `magic_start_${b}`, label: 'Ganondorf readies his big magic', range: 'far' as const, afterTimer: true, weight: 1, cite: at(2258) },
          { from: w, to: `pound_${b}`, label: 'Ganondorf rises to pound the floor', range: 'far' as const, afterTimer: true, weight: 1, cite: at(2260) },
        ]),
  ]
  const s: Step[] = [
    ...waitSteps(`wait_${b}`),
    ...waitSteps(`wait_hit_${b}`),
    { from: `block_${b}`, to: `wait_${b}`, label: 'Ganondorf lowers his cape', afterTimer: true, cite: at(2436) },
    { from: `charge_${b}`, to: `ball_out_${b}`, label: 'Ganondorf throws the light ball', afterTimer: true, cite: at(2318) },
    { from: `ball_out_${b}`, to: `wait_hit_${b}`, label: 'The light ball reaches Link', attack: 'light_ball', cite: at(4143) },
    { from: `ball_back_${b}`, to: `ball_out_${b}`, label: 'Ganondorf volleys the ball back', weight: 7, cite: at(3991) },
    { from: `ball_back_${b}`, to: `stunned_${b}`, label: 'Ganondorf misses, and the ball strikes him', weight: 3, cite: at(4138) },
    { from: `pound_${b}`, to: `pound_end_${b}`, label: 'Ganondorf crashes down, and a shockwave rolls out under Link', range: 'near', afterTimer: true, attack: 'shockwave', cite: at(4806) },
    { from: `pound_${b}`, to: `pound_end_${b}`, label: 'Ganondorf crashes down, and a shockwave rolls out', range: 'far', afterTimer: true, attack: 'shockwave', cite: at(4806) },
    { from: `pound_end_${b}`, to: `wait_${b}`, label: 'Ganondorf rises from the landing into Link (his collider is AT here, line 2919)', range: 'near', afterTimer: true, attack: 'body', cite: at(1991) },
    { from: `pound_end_${b}`, to: `wait_${b}`, label: 'Ganondorf floats back up', range: 'far', afterTimer: true, cite: at(1991) },
    { from: `stunned_${b}`, to: `wait_${b}`, label: 'Ganondorf shakes off the shock', afterTimer: true, cite: at(2512) },
    { from: `down_falling_${b}`, to: `down_lying_${b}`, label: 'Ganondorf hits the floor', cite: at(2604) },
    { from: `down_lying_${b}`, to: `down_rising_${b}`, label: 'Ganondorf starts to get up', afterTimer: true, cite: at(2630) },
    { from: `down_rising_${b}`, to: `wait_${b}`, label: 'Ganondorf floats again', cite: at(2695) },
  ]
  if (b === 'hi') return s
  return [
    ...s,
    { from: `magic_start_${b}`, to: `magic_hold_${b}`, label: 'Ganondorf gathers the big magic', afterTimer: true, cite: at(2056) },
    { from: `magic_hold_${b}`, to: `magic_out_${b}`, label: 'Ganondorf hurls the big magic', afterTimer: true, cite: at(2179) },
    { from: `magic_out_${b}`, to: `wait_${b}`, label: 'The big magic reaches Link', attack: 'big_magic', cite: at(2216) },
  ]
}

const attacks: Attack[] = [
  {
    id: 'light_ball', label: 'Light ball (Actor_SetPlayerKnockbackLarge, 0x30 damage)', damage: 48, effect: { kind: 'knockback' },
    blockable: true, dodgeable: true, source: at(4013), via: { overlay: 'ovl_Boss_Ganon', spawn: at(2372) },
  },
  {
    id: 'big_magic', label: 'Big magic ball (Actor_SetPlayerKnockbackLarge, 0x50 damage)', damage: 80, effect: { kind: 'knockback' },
    blockable: false, dodgeable: true, source: at(4485), via: { overlay: 'ovl_Boss_Ganon', spawn: at(2192) },
    reflect: { shields: [{ gear: 'mirror_shield' }], as: 'MIR_RAY', damage: 0, cite: at(4449) },
  },
  { id: 'body', label: 'Ganondorf lands on Link', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(97) },
  { id: 'shockwave', label: 'Floor shockwave (Actor_SetPlayerKnockbackLarge, 0x20 damage)', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(4806) },
]

const cut = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const bossGanon: ActorSpec = {
  overlay: 'ovl_Boss_Ganon',
  name: 'Ganondorf',
  role: 'boss',
  summary:
    'Ganondorf floats above the tower top. He throws light balls that Link bats back with a sword or the hammer until one gets past Ganondorf. A light arrow then drops him for sword hits. Below 20 health he also hurls big magic: a spin attack sends it back to stun him, while other swings and the Mirror Shield only deflect it. Standing under him brings a floor pound and its shockwave.',
  cite: at(393),
  pools: [{
    id: 'body', label: 'Ganondorf', hp: { value: 40, cite: at(393) }, then: 'defeated',
    thresholds: [
      { at: 19, to: { down_lying_hi: 'down_lying_lo' }, cite: at(2254) },
      { at: 2, to: { down_lying_lo: 'down_lying_fl' }, cite: at(2766) },
    ],
  }],
  damage: {
    kind: 'custom',
    entries: {
      ...Object.fromEntries(Object.entries(SWORDLIKE).map(([d, [n, c]]) => [d, { damage: n, cite: c }])),
      ...Object.fromEntries(OTHER.map((d) => [d, { damage: 2, cite: at(2761) }])),
      HOOKSHOT: { damage: 0, cite: at(2744) },
    },
  },
  phases: BANDS.flatMap(bandPhases),
  start: 'wait_hi',
  range: 'far',
  steps: BANDS.flatMap(bandSteps),
  attacks,
  actionFuncs: {
    BossGanon_Wait: 'wait_*',
    BossGanon_Block: 'block_*',
    BossGanon_ChargeLightBall: 'charge_*',
    BossGanon_PlayTennis: 'ball_*',
    BossGanon_PoundFloor: 'pound_*',
    BossGanon_ChargeBigMagic: 'magic_*',
    BossGanon_HitByLightBall: 'stunned_*',
    BossGanon_Vulnerable: 'down_*',
    BossGanon_Damaged: 'down_lying_*',
    BossGanon_SetupIntroCutscene: cut('waits for the intro cutscene to start; no fight yet, Link is in a cutscene', 530),
    BossGanon_IntroCutscene: cut('the intro cutscene (organ, Zelda, transformation talk); Link cannot act', 567),
    BossGanon_SetupTowerCutscene: cut('the tower-collapse cutscene setup, used after the fight (params 1)', 1235),
    BossGanon_DeathAndTowerCutscene: cut('the death cutscene after the finishing blow, and the tower-collapse cutscene; the encounter has ended', 1208),
  },
  atSources: {
    [at(97)]: 'body',
    [at(117)]: cut('the light-ball cylinder is only ever registered as AC (CollisionCheck_SetAC here and at line 4473); CollisionCheck_SetAT is called only for Ganondorf himself (line 2919). The balls hurt Link through distance checks that call Actor_SetPlayerKnockbackLarge (lines 4013, 4485)', 4072),
    [at(4013)]: 'light_ball',
    [at(4485)]: 'big_magic',
    [at(4806)]: 'shockwave',
  },
  loadouts: [
    ...standardLoadouts(['adult'], 6),
    { id: 'adult_light_arrows', age: 'adult', hearts: 6, gear: ['deku_nuts', 'master_sword', 'mirror_shield', 'bow', 'fire_arrows', 'ice_arrows', 'light_arrows', 'magic'] },
  ],
  expected: {
    deadVerbs: {
      block_hi_timer_clears: 'the phase is left only by its own step that waits for the timer, and no hit moves Ganondorf out of it, so the timer is always spent when he leaves',
      charge_hi_timer_clears: 'as block_hi_timer_clears',
      pound_hi_timer_clears: 'as block_hi_timer_clears',
      pound_end_hi_timer_clears: 'as block_hi_timer_clears',
      block_lo_timer_clears: 'as block_hi_timer_clears',
      charge_lo_timer_clears: 'as block_hi_timer_clears',
      pound_lo_timer_clears: 'as block_hi_timer_clears',
      pound_end_lo_timer_clears: 'as block_hi_timer_clears',
      block_fl_timer_clears: 'as block_hi_timer_clears',
      charge_fl_timer_clears: 'as block_hi_timer_clears',
      pound_fl_timer_clears: 'as block_hi_timer_clears',
      pound_end_fl_timer_clears: 'as block_hi_timer_clears',
      down_lying_fl_timer_clears: 'below 3 health no threshold is left to move Ganondorf out of down_lying_fl, and a hit there either keeps him down or ends the fight, so he leaves only when the timer has run out',
      body_empty_in_down_lying_hi: 'in the hi band his health is 20 or more and the largest hit is 8 (two-handed jump attack), so health never runs out while he is still in it',
    },
  },
}
