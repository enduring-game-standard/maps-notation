import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Ganondrof/z_boss_ganondrof.c'
const at = (line: number): Cite => `${F}:${line}`
const HG = 'src/overlays/actors/ovl_En_fHG/z_en_fhg.c'
const hg = (line: number): Cite => `${HG}:${line}`
const FF = 'src/overlays/actors/ovl_En_Fhg_Fire/z_en_fhg_fire.c'
const ff = (line: number): Cite => `${FF}:${line}`
const CC = 'src/code/z_collision_check.c'

/** DMG_RANGED (collision_check.h:452): the painting body takes 2 from these, and Block shrugs them off. */
const RANGED: DmgType[] = ['ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT', 'SLINGSHOT']
/** Fired items set `player->unk_A73` (z_player.c:3131, 3390), which Neutral answers with Block (line 636). */
const FIRED: DmgType[] = ['SLINGSHOT', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'HOOKSHOT']
/** The energy ball's AC mask 0x0D900700 (z_en_fhg_fire.c:90): slashes, Master and two-handed spins and jumps, and the shield. */
const BALL_SWORD: DmgType[] = ['SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'JUMP_MASTER', 'JUMP_GIANT']
const BALL_SPIN: DmgType[] = ['SPIN_MASTER', 'SPIN_GIANT']
const BALL_HITS: DmgType[] = [...BALL_SWORD, ...BALL_SPIN, 'SHIELD']

/** CollisionCheck_GetSwordDamage: a sword-type hit's damage; such a hit may also deal the finishing blow (line 1279). */
const SWORD: Partial<Record<DmgType, number>> = {
  SLASH_KOKIRI: 1, SPIN_KOKIRI: 1,
  JUMP_KOKIRI: 2, SPIN_MASTER: 2, SLASH_MASTER: 2, HAMMER_SWING: 2, DEKU_STICK: 2,
  HAMMER_JUMP: 4, JUMP_MASTER: 4, SPIN_GIANT: 4, SLASH_GIANT: 4,
  JUMP_GIANT: 8,
}
const SWORD_LINE: Record<number, number> = { 1: 3719, 2: 3721, 4: 3723, 8: 3725 }
/** Every other type the body's AC mask 0xFFCFFFFE (line 120) accepts: 2 damage, but never the finishing blow. */
const OTHER: DmgType[] = ['SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'MAGIC_FIRE', 'MAGIC_ICE', 'MAGIC_LIGHT', 'UNKNOWN_1', 'UNBLOCKABLE', 'UNKNOWN_2', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3']
const entries: Partial<Record<DmgType, { damage: number; cite: Cite }>> = {
  ...Object.fromEntries(Object.entries(SWORD).map(([d, n]) => [d, { damage: n!, cite: `${CC}:${SWORD_LINE[n!]}` as Cite }])),
  ...Object.fromEntries(OTHER.map((d) => [d, { damage: 2, cite: at(1279) }])),
  HOOKSHOT: { damage: 0, cite: at(1275) },
}

/**
 * Health bands. Above 4 he never charges (line 524); at 2 or below only a sword-type hit still hurts (line 1280).
 * `pre1`..`pre4` and `pre0` are the high band before his fifth throw: until then every decision is a throw (line 538).
 */
type Band = 'hi' | 'low' | 'crit'
const BANDS: Band[] = ['hi', 'low', 'crit']
const sfx = (b: Band) => (b === 'hi' ? '' : `_${b}`)
const BAND_LABEL: Record<Band, string> = { hi: '', low: ' (health 4 or less)', crit: ' (health 2 or less)' }
const PRE = [0, 1, 2, 3, 4]
const pre = (k: number) => (k < 5 ? `_p${k}` : '')
const PRE_LABEL = (k: number) => (k < 5 ? ` (${k} throws so far)` : '')

const noFinish = (b: Band): Phase['overrides'] =>
  b === 'crit' ? Object.fromEntries(OTHER.map((d) => [d, { damage: 0, cite: at(1280) }])) : undefined
const blockHits = (b: Band, stun: string): Phase['overrides'] =>
  Object.fromEntries(
    [...Object.keys(SWORD), ...OTHER.filter((d) => !RANGED.includes(d))].map((d) => [
      d,
      { damage: b === 'crit' && !SWORD[d as DmgType] ? 0 : (SWORD[d as DmgType] ?? 2), to: stun, cite: at(1290) },
    ]),
  )
const fired = (to: string): Phase['overrides'] => Object.fromEntries(FIRED.map((d) => [d, { damage: 0, to, cite: at(637) }]))

/** The neutral-throw loop: hover, throw, the ball at Link, the ball sent back, the stun it causes, and Block. */
const throwLoop = (s: string, label: string, b: Band, neutral: string): { phases: Phase[]; steps: Step[] } => ({
  phases: [
    { id: `throw${s}`, label: `Phantom Ganon winds up an energy ball${label}`, hittable: 'none', frames: { value: 25, cite: at(656) }, cite: at(668) },
    {
      id: `ball${s}`, label: `An energy ball flies at Link${label}`, hittable: BALL_HITS,
      overrides: {
        ...Object.fromEntries([...BALL_SWORD, ...BALL_SPIN].map((d) => [d, { damage: 0, to: `ball_back${s}`, cite: ff(540) }])),
        SHIELD: { damage: 0, to: neutral, cite: ff(514) },
      },
      cite: ff(433),
    },
    { id: `ball_back${s}`, label: `The ball flies back at Phantom Ganon, scattered${label}`, hittable: 'none', cite: ff(517) },
    { id: `stun${s}`, label: `Phantom Ganon lies stunned${label}`, overrides: noFinish(b), frames: { value: 50, cite: at(745) }, cite: at(758) },
  ],
  steps: [
    { from: `throw${s}`, to: `ball${s}`, label: 'Phantom Ganon hurls the ball', afterTimer: true, cite: at(696) },
    { from: `ball${s}`, to: neutral, label: 'The ball strikes Link', attack: 'energy_ball', cite: ff(553) },
    { from: `ball_back${s}`, to: `stun${s}`, label: 'The ball strikes Phantom Ganon', cite: ff(575) },
    { from: `ball_back${s}`, to: neutral, label: 'The ball misses and bursts on a wall', cite: ff(632) },
    { from: `stun${s}`, to: neutral, label: 'Phantom Ganon rises', afterTimer: true, cite: at(780) },
  ],
})
const block = (s: string, label: string, b: Band, neutral: string, stun: string): { phases: Phase[]; steps: Step[] } => ({
  phases: [{
    id: `block${s}`, label: `Phantom Ganon blocks with his spear${label}`, guards: RANGED,
    overrides: blockHits(b, stun), frames: { value: 10, cite: at(795) }, cite: at(799),
  }],
  steps: [{ from: `block${s}`, to: neutral, label: 'Phantom Ganon lowers his spear', afterTimer: true, cite: at(808) }],
})

const phases: Phase[] = [
  { id: 'paint_approach', label: 'Phantom Ganon gallops up inside a painting', hittable: 'none', frames: { value: 100, cite: hg(462) }, cite: hg(478) },
  {
    id: 'paint_emerge', label: 'Phantom Ganon rides out of a painting', hittable: RANGED,
    overrides: Object.fromEntries(RANGED.map((d) => [d, { damage: 2, to: 'paint_hit', cite: at(1302) }])),
    frames: { value: 40, cite: hg(505) }, cite: hg(516),
  },
  {
    id: 'paint_leap', label: 'Phantom Ganon leaps across the room, spear raised', hittable: RANGED,
    overrides: Object.fromEntries(RANGED.map((d) => [d, { damage: 2, to: 'paint_hit', cite: at(1302) }])),
    frames: { value: 50, cite: hg(522) }, cite: hg(516),
  },
  { id: 'paint_retreat', label: 'Phantom Ganon rides off into the paintings', hittable: 'none', frames: { value: 140, cite: hg(588) }, cite: hg(646) },
  { id: 'paint_hit', label: 'An arrow knocks Phantom Ganon back into his painting', hittable: 'none', cite: hg(596) },
]
const steps: Step[] = [
  { from: 'paint_approach', to: 'paint_emerge', label: 'Phantom Ganon bursts out of the painting', afterTimer: true, cite: hg(503) },
  { from: 'paint_emerge', to: 'paint_leap', label: 'Phantom Ganon raises his spear', afterTimer: true, cite: hg(521) },
  { from: 'paint_leap', to: 'paint_retreat', label: 'Lightning from the spear sends shocks across the floor', afterTimer: true, attack: 'lightning', cite: hg(540) },
  { from: 'paint_retreat', to: 'paint_approach', label: 'Phantom Ganon picks another painting', afterTimer: true, cite: hg(681) },
  { from: 'paint_hit', to: 'paint_retreat', label: 'Phantom Ganon withdraws', cite: hg(635) },
]
const add = (x: { phases: Phase[]; steps: Step[] }) => (phases.push(...x.phases), steps.push(...x.steps))

/** The high band before the fifth throw: each decision is a throw, and each throw advances the count. */
for (const k of PRE) {
  const n = `neutral${pre(k)}`
  phases.push({
    id: n, label: `Phantom Ganon hovers before Link${PRE_LABEL(k)}`, hittable: FIRED, overrides: fired(`block${pre(k)}`),
    frames: k === 0 ? { value: 100, cite: at(485) } : { value: [30, 93], cite: at(505) }, cite: at(508),
  })
  steps.push({ from: n, to: `throw${pre(k + 1)}`, label: 'Phantom Ganon throws (fewer than five throws so far)', afterTimer: true, cite: at(539) })
  add(block(pre(k), PRE_LABEL(k), 'hi', n, `stun${pre(k)}`))
  if (k > 0) add(throwLoop(pre(k), PRE_LABEL(k), 'hi', n))
}
/** stun_p0 is where a hit in Block sends him before any throw. */
phases.push({ id: 'stun_p0', label: 'Phantom Ganon lies stunned (0 throws so far)', frames: { value: 50, cite: at(745) }, cite: at(758) })
steps.push({ from: 'stun_p0', to: 'neutral_p0', label: 'Phantom Ganon rises', afterTimer: true, cite: at(780) })

const RALLY = [0, 1, 2, 3, 4]
for (const b of BANDS) {
  const s = sfx(b)
  const L = BAND_LABEL[b]
  const n = `neutral${s}`
  const low = b !== 'hi'
  phases.push({ id: n, label: `Phantom Ganon hovers before Link${L}`, hittable: FIRED, overrides: fired(`block${s}`), frames: { value: [30, 93], cite: at(505) }, cite: at(508) })
  if (low) {
    steps.push(
      { from: n, to: `throw${s}`, label: 'Phantom Ganon throws', weight: 5, afterTimer: true, cite: at(526) },
      { from: n, to: `charge_wait${s}`, label: 'Phantom Ganon backs off to charge', weight: 4, afterTimer: true, cite: at(528) },
      { from: n, to: `volley_wait${s}`, label: 'Phantom Ganon backs off for a volley', weight: 11, afterTimer: true, cite: at(533) },
    )
  } else {
    steps.push(
      { from: n, to: `throw${s}`, label: 'Phantom Ganon throws', weight: 1, afterTimer: true, cite: at(539) },
      { from: n, to: `volley_wait${s}`, label: 'Phantom Ganon backs off for a volley', weight: 1, afterTimer: true, cite: at(541) },
    )
  }
  add(throwLoop(s, L, b, n))
  add(block(s, L, b, n, `stun${s}`))
  phases.push(
    { id: `volley_wait${s}`, label: `Phantom Ganon hovers at the far end, readying a volley${L}`, hittable: FIRED, overrides: fired(`block${s}`), frames: { value: 60, cite: at(542) }, cite: at(564) },
    { id: `rally_throw${s}`, label: `Phantom Ganon winds up a volley ball${L}`, hittable: 'none', frames: { value: 25, cite: at(656) }, cite: at(668) },
    ...RALLY.map((c): Phase => ({
      id: `rally_ball_${c}${s}`, label: `A volley ball flies at Link (${c === 4 ? '4 or more' : c} returns)${L}`, hittable: BALL_HITS,
      overrides: {
        ...Object.fromEntries(BALL_SWORD.map((d) => [d, c < 3 ? { damage: 0, to: `rally_back_${c + 1}${s}`, cite: ff(525) } : { damage: 0, to: `rally_back_coin${s}`, cite: ff(526) }])),
        ...Object.fromEntries(BALL_SPIN.map((d) => [d, { damage: 0, to: `rally_back_spin${s}`, cite: ff(532) }])),
        SHIELD: { damage: 0, to: n, cite: ff(514) },
      },
      cite: ff(433),
    })),
    ...[1, 2, 3].map((c): Phase => ({ id: `rally_back_${c}${s}`, label: `Link sends the volley ball back (${c} returns)${L}`, hittable: 'none', cite: ff(557) })),
    { id: `rally_back_spin${s}`, label: `A spin attack sends the volley ball back hard${L}`, hittable: 'none', cite: ff(532) },
    { id: `rally_back_coin${s}`, label: `The volley ball flies back past four returns${L}`, hittable: 'none', cite: ff(526) },
    { id: `stun_long${s}`, label: `Phantom Ganon lies stunned by his own volley${L}`, overrides: noFinish(b), frames: { value: 120, cite: at(1292) }, cite: at(758) },
  )
  steps.push(
    { from: `volley_wait${s}`, to: `rally_throw${s}`, label: 'Phantom Ganon throws a volley ball', afterTimer: true, cite: at(574) },
    { from: `rally_throw${s}`, to: `rally_ball_0${s}`, label: 'Phantom Ganon hurls the ball', afterTimer: true, cite: at(696) },
    ...RALLY.map((c): Step => ({ from: `rally_ball_${c}${s}`, to: n, label: 'The volley ball strikes Link', attack: 'energy_ball', cite: ff(553) })),
    ...[1, 2, 3].map((c): Step => ({ from: `rally_back_${c}${s}`, to: `rally_ball_${c}${s}`, label: 'Phantom Ganon returns the ball', cite: ff(561) })),
    { from: `rally_back_spin${s}`, to: `rally_ball_4${s}`, label: 'Phantom Ganon returns the ball', cite: ff(561) },
    { from: `rally_back_coin${s}`, to: `rally_ball_4${s}`, label: 'Phantom Ganon returns the ball', weight: 1, cite: ff(561) },
    { from: `rally_back_coin${s}`, to: `stun_long${s}`, label: 'Phantom Ganon misses the return and the ball strikes him', weight: 1, cite: ff(575) },
    { from: `stun_long${s}`, to: n, label: 'Phantom Ganon rises', afterTimer: true, cite: at(780) },
  )
  if (low) {
    phases.push(
      { id: `charge_wait${s}`, label: `Phantom Ganon hovers, readying a charge${L}`, hittable: FIRED, overrides: fired(`block${s}`), frames: { value: 60, cite: at(529) }, cite: at(595) },
      { id: `charge_windup${s}`, label: `Phantom Ganon winds up his charge${L}`, hittable: 'none', frames: { value: 20, cite: at(818) }, cite: at(832) },
      { id: `charge${s}`, label: `Phantom Ganon charges at Link${L}`, hittable: 'none', cite: at(862) },
      { id: `charge_finish${s}`, label: `Phantom Ganon pulls out of his charge${L}`, hittable: 'none', frames: { value: 20, cite: at(879) }, cite: at(882) },
    )
    steps.push(
      { from: `charge_wait${s}`, to: `charge_windup${s}`, label: 'Phantom Ganon begins his charge', afterTimer: true, cite: at(603) },
      { from: `charge_windup${s}`, to: `charge${s}`, label: 'Phantom Ganon lunges', afterTimer: true, cite: at(846) },
      { from: `charge${s}`, to: `charge_finish${s}`, label: 'The spear strikes Link', attack: 'spear', move: 'near', cite: at(878) },
      { from: `charge${s}`, to: `charge_finish${s}`, label: 'Phantom Ganon rams Link', attack: 'charge_body', move: 'near', cite: at(878) },
      { from: `charge_finish${s}`, to: n, label: 'Phantom Ganon floats back up', afterTimer: true, cite: at(901) },
    )
  }
}

/** Phases where a damaging hit can leave him, by band, so thresholds know where he goes. */
const DAMAGE_HI = [...PRE.map((k) => `stun_p${k}`), ...PRE.map((k) => `block_p${k}`), 'stun', 'block', 'stun_long']
const lowOf = (id: string) => `${id.replace(/_p\d$/, '')}_low`
const critOf = (id: string) => `${id.replace(/_p\d$/, '').replace(/_low$/, '')}_crit`
const DAMAGE_LOW = ['stun_low', 'block_low', 'stun_long_low']

const attacks: Attack[] = [
  {
    id: 'energy_ball', label: 'Energy ball', damage: 16, effect: { kind: 'knockback' }, blockable: true, dodgeable: true,
    source: ff(553), via: { overlay: 'ovl_En_Fhg_Fire', spawn: at(695) },
  },
  {
    id: 'lightning', label: 'Spear lightning', damage: 32, effect: { kind: 'shock' }, blockable: true, dodgeable: true,
    source: ff(89), via: { overlay: 'ovl_En_Fhg_Fire', spawn: hg(540) },
  },
  { id: 'spear', label: 'Charging spear', damage: 48, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(139) },
  { id: 'charge_body', label: 'Charging body', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(119) },
]

const out = (why: string, line: number, file = F): Excluded => ({ excluded: why, cite: `${file}:${line}` as Cite })

/** Dead verbs the beat model forces, derived from the phase lists so each reason stays tied to its cause. */
const deadVerbs: Record<string, string> = {}
const BLOCKS = [...PRE.map((k) => `block_p${k}`), ...BANDS.map((b) => `block${sfx(b)}`)]
const BLOCK_WHY = 'Block lasts 10 frames, one beat, and is entered only by Link firing an item on his own move, so it is over before his next hit'
for (const p of BLOCKS) {
  deadVerbs[`${p}_timer_clears`] = `${BLOCK_WHY}; it is only ever left by that timer`
  for (const d of ['explosive', 'hammer_swing', 'hammer_jump', 'slash_master', 'spin_master', 'jump_master', 'jump_master_self']) deadVerbs[`hit_${d}__${p}`] = BLOCK_WHY
}
const STUN0_WHY = 'stun_p0 is entered only by a hit in block_p0, which no hit can find (see block_p0_timer_clears)'
for (const d of ['explosive', 'arrow_normal', 'arrow_fire', 'arrow_ice', 'arrow_light', 'hammer_swing', 'slash_master', 'slash_giant', 'magic_fire', 'spin_giant', 'spin_master', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump'])
  deadVerbs[`hit_${d}__stun_p0`] = STUN0_WHY
for (const v of ['stun_p0_timer_clears', 'stun_p0_ticks', 'stun_p0_step_1', 'stun_p0_holds', 'ganon_empty_in_stun_p0', 'ganon_falls_to_4_in_stun_p0', 'ganon_falls_to_2_in_stun_p0']) deadVerbs[v] = STUN0_WHY
const UNHIT = 'no hit can land in this phase (hittable none), so it is only ever left when its timer runs out'
for (const p of ['paint_approach', 'paint_retreat', ...[1, 2, 3, 4].map((k) => `throw_p${k}`), ...BANDS.flatMap((b) => [`throw${sfx(b)}`, `rally_throw${sfx(b)}`]), ...['low', 'crit'].flatMap((b) => [`charge_windup_${b}`, `charge_finish_${b}`])])
  deadVerbs[`${p}_timer_clears`] = UNHIT
deadVerbs.stun_p1_timer_clears = 'stun_p1 can be left early only by a health threshold, and health enters it at 24, more than three beats of the hardest hits in any kit that can pass the paintings (Master Sword jump, 4) can bring to 4'
deadVerbs.ganon_falls_to_4_in_stun_p1 = 'as stun_p1_timer_clears: three hits of at most 4 from 24 cannot reach 4'
deadVerbs.ganon_falls_to_2_in_stun_p1 = 'as stun_p1_timer_clears'
deadVerbs.stun_crit_timer_clears = 'at 2 or less a stun ends only by its timer or by the finishing blow, which ends the encounter first'
deadVerbs.stun_long_crit_timer_clears = 'as stun_crit_timer_clears'
deadVerbs.ganon_empty_in_paint_hit = 'painting hits deal 2 from 30, and at 24 the threshold takes him out of the paintings, so health never runs out there'
for (const k of [1, 2, 3, 4]) deadVerbs[`ganon_empty_in_stun_p${k}`] = 'in the high band health is above 4, and a hit that empties it passes the 4 and 2 thresholds first, which move him to the crit band'
deadVerbs.ganon_empty_in_stun = deadVerbs.ganon_empty_in_stun_p1
deadVerbs.ganon_empty_in_stun_long = deadVerbs.ganon_empty_in_stun_p1
deadVerbs.lightning_lands_again = 'the shock lasts 20 frames, one beat, and wears off at the end of the beat it lands in, so no attack finds Link still shocked'
deadVerbs.lightning_lands_dd_again = 'as lightning_lands_again'
deadVerbs.link_helpless_shock = "as lightning_lands_again: the one-beat shock is gone before Link's next move"

export const bossGanondrof: ActorSpec = {
  overlay: 'ovl_Boss_Ganondrof',
  name: 'Phantom Ganon',
  role: 'boss',
  summary:
    'Phantom Ganon (30 health) first rides out of the paintings and casts spear lightning; only a ranged shot (arrow, hookshot) at the real rider counts, 2 each, and at 24 he leaves the paintings. Then he hovers and hurls energy balls. His body takes no hits except while stunned, and the only way to stun him is his own ball: a sword sends it back. A volley turns into a rally he returns until, past four returns, each return has an even chance of getting by him, stunning him longer. Stunned, he takes sword damage, or 2 from anything else, which cannot finish him. At 4 or less he also charges with his spear.',
  cite: at(310),
  pools: [{
    id: 'ganon', label: 'Phantom Ganon', hp: { value: 30, cite: at(310) }, then: 'defeated',
    thresholds: [
      { at: 24, to: { paint_hit: 'neutral_p0' }, cite: hg(640) },
      { at: 4, to: Object.fromEntries(DAMAGE_HI.map((p) => [p, lowOf(p)])), cite: at(524) },
      { at: 2, to: Object.fromEntries([...DAMAGE_HI, ...DAMAGE_LOW].map((p) => [p, critOf(p)])), cite: at(1280) },
    ],
  }],
  damage: { kind: 'custom', entries },
  phases,
  start: 'paint_approach',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    BossGanondrof_Paintings: 'paint_*',
    BossGanondrof_Neutral: 'neutral*',
    BossGanondrof_Throw: 'throw*',
    BossGanondrof_Return: 'rally_back_*',
    BossGanondrof_Stunned: 'stun*',
    BossGanondrof_Block: 'block*',
    BossGanondrof_Charge: 'charge*',
    BossGanondrof_Intro: out('intro cutscene on the horse; it ends in SetupPaintings when the horse signals the fight start (line 440)', 440),
    BossGanondrof_Death: out('death cutscene after the finishing blow; the encounter has already ended', 1285),
  },
  atSources: {
    [at(119)]: 'charge_body',
    [at(139)]: 'spear',
  },
  loadouts: standardLoadouts(['adult'], 4),
  expected: { deadVerbs },
}
