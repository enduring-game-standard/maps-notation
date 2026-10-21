import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Fd/z_boss_fd.c'
const at = (line: number): Cite => `${F}:${line}`
const COL = 'src/overlays/actors/ovl_Boss_Fd/z_boss_fd_colchk.inc.c'
const F2 = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2.c'
const at2 = (line: number): Cite => `${F2}:${line}`
const COL2 = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2_colchk.inc.c'
const CC = 'src/code/z_collision_check.c'

/**
 * One health value, the body's (line 231), drained by both forms. Every hit in this fight deals an even amount until
 * the hammer's clamp, so three bands of it decide behavior:
 * A is 6 or more; B is exactly 4, where an ice arrow on the flying head would cross the floor of 2 (lines 1305-1308);
 * C is 2 or less, where flying hits do nothing and only a sword on the open face still lands (line 895).
 */
type Band = 'A' | 'B' | 'C'
const BANDS: Band[] = ['A', 'B', 'C']
/** The attack of the body's next flight: odd flights chase Link, even ones bring the ceiling down (lines 607-616). */
type Par = 'c' | 'r'
const PARS: Par[] = ['c', 'r']
const OTHER_PAR: Record<Par, Par> = { c: 'r', r: 'c' }
const K = [1, 2, 3] as const

/** Damage types the head's AC element accepts (0xFFCDFFFE, colchk line 7) that Link emits. */
const SWORD: Partial<Record<DmgType, number>> = {
  SLASH_KOKIRI: 1, SPIN_KOKIRI: 1,
  JUMP_KOKIRI: 2, SPIN_MASTER: 2, SLASH_MASTER: 2, HAMMER_SWING: 2, DEKU_STICK: 2,
  HAMMER_JUMP: 4, JUMP_MASTER: 4, SPIN_GIANT: 4, SLASH_GIANT: 4,
  JUMP_GIANT: 8,
}
const SWORD_LINE: Record<number, number> = { 1: 3718, 2: 3720, 4: 3722, 8: 3724 }
const OTHER: DmgType[] = ['SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'MAGIC_ICE', 'MAGIC_LIGHT']
const ALL: DmgType[] = [...(Object.keys(SWORD) as DmgType[]), ...OTHER, 'HOOKSHOT']
const HAMMER: DmgType[] = ['HAMMER_SWING', 'HAMMER_JUMP']

type Over = NonNullable<Phase['overrides']>
const map = (ds: DmgType[], f: (d: DmgType) => { damage: number; to?: string; cite: Cite } | undefined): Over =>
  Object.fromEntries(ds.flatMap((d) => { const v = f(d); return v ? [[d, v]] : [] }))

/** A hit on the flying head: 2, an ice arrow 4 (lines 1303-1305), never below 2 (line 1308). */
const flyHit = (b: Band, d: DmgType, to?: string) => {
  const raw = d === 'ARROW_ICE' ? 4 : 2
  const dmg = b === 'A' ? raw : b === 'B' ? 2 : 0
  const cite = b === 'A' ? at(d === 'ARROW_ICE' ? 1305 : 1303) : at(1308)
  return { damage: dmg, ...(to ? { to } : {}), cite }
}
/** A hit on the head's open face (z_boss_fd2.c:885-912). In band C only a sword still takes health. */
const faceHit = (b: Band, d: DmgType, damaged: string) => {
  if (d === 'HOOKSHOT') return { damage: 0, cite: at2(893) }
  const sw = SWORD[d]
  if (sw) return { damage: sw, to: damaged, cite: `${CC}:${SWORD_LINE[sw]}` as Cite }
  if (b === 'C') return { damage: 0, to: damaged, cite: at2(895) }
  return { damage: d === 'ARROW_ICE' ? 4 : 2, to: damaged, cite: at2(888) }
}

const tag = (b: Band | 'F', p: Par) => (b === 'F' ? 'f' : `${b.toLowerCase()}${p}`)

/** The head's turn: three pops (the hole counter, z_boss_fd2.c:270) before the body flies again (line 399). */
const headPhases = (b: Band | 'F', p: Par): Phase[] => {
  const t = tag(b, p)
  const vulnOf = (k: number) => (b === 'F' ? `h_ac_vuln_${k}` : `h_${t}_vuln_${k}`)
  const hidden = (id: string, label: string, cite: Cite, k: number, frames?: Phase['frames']): Phase => ({
    id, label, cite, hittable: HAMMER,
    overrides: map(HAMMER, () => ({ damage: b === 'C' ? 0 : 2, to: vulnOf(k), cite: at2(b === 'C' ? 859 : 857) })),
    ...(frames ? { frames } : {}),
  })
  const idle = b === 'F' ? { value: 50, cite: at2(340) } : b === 'A' ? { value: 40, cite: at2(342) } : { value: 20, cite: at2(348) }
  const out: Phase[] = K.flatMap((k): Phase[] => [
    { id: `h_${t}_emerge_${k}`, label: `Head pops from a hole (${t}, pop ${k})`, hittable: 'none', frames: { value: 10, cite: at2(232) }, cite: at2(271) },
    hidden(`h_${t}_idle_${k}`, `Head turns to Link, face armored (${t}, pop ${k})`, at2(337), k, idle),
    hidden(`h_${t}_strike_${k}`, `Head claws or breathes fire (${t}, pop ${k})`, at2(370), k),
    hidden(`h_${t}_burrow_${k}`, `Head sinks into its hole (${t}, pop ${k})`, at2(381), k, { value: 25, cite: at2(394) }),
  ])
  if (b === 'F') return out
  const damaged = `h_${t}_damaged`
  return [
    ...out,
    ...K.flatMap((k): Phase[] => [
      {
        id: `h_${t}_vuln_${k}`, label: `Head lies stunned, face open (${t}, pop ${k})`, frames: { value: 60, cite: at2(579) }, cite: at2(539),
        overrides: map(ALL, (d) => faceHit(b, d, damaged)),
      },
      {
        id: `h_${t}_oburrow_${k}`, label: `Stunned head sinks, face still open (${t}, pop ${k})`, frames: { value: 25, cite: at2(394) }, cite: at2(587),
        overrides: map(ALL, (d) => faceHit(b, d, damaged)),
      },
    ]),
    { id: damaged, label: `Head reels and sinks away (${t})`, hittable: 'none', frames: { value: 25, cite: at2(620) }, cite: at2(596) },
  ]
}

const headSteps = (b: Band | 'F', p: Par): Step[] => {
  const t = tag(b, p)
  const fly = b === 'F' ? undefined : `f_${t}_rise`
  const after = (k: number, from: string): Step =>
    k < 3 ? { from, to: `h_${t}_emerge_${k + 1}`, label: 'Head pops up at another hole', afterTimer: true, cite: at2(404) }
    : fly ? { from, to: fly, label: 'Third pop: the body takes to the air', afterTimer: true, cite: at2(402) }
    : { from, to: `h_${t}_emerge_3`, label: 'Unhurt, the head keeps popping', afterTimer: true, cite: at2(399) }
  return [
    ...K.flatMap((k): Step[] => [
      { from: `h_${t}_emerge_${k}`, to: `h_${t}_idle_${k}`, label: 'Head bursts up beside Link, knocking him back', range: 'near', afterTimer: true, attack: 'emerge_knock', cite: at2(319) },
      { from: `h_${t}_emerge_${k}`, to: `h_${t}_idle_${k}`, label: 'Head bursts up', range: 'far', afterTimer: true, cite: at2(323) },
      { from: `h_${t}_idle_${k}`, to: `h_${t}_strike_${k}`, label: 'Head swipes its claw', range: 'near', afterTimer: true, attack: 'claw', cite: at2(370) },
      { from: `h_${t}_idle_${k}`, to: `h_${t}_strike_${k}`, label: 'Head breathes fire', range: 'far', afterTimer: true, attack: 'fire_breath', cite: at2(372) },
      { from: `h_${t}_strike_${k}`, to: `h_${t}_burrow_${k}`, label: 'Head finishes and burrows', cite: at2(532) },
      after(k, `h_${t}_burrow_${k}`),
      ...(fly
        ? [
            { from: `h_${t}_vuln_${k}`, to: `h_${t}_oburrow_${k}`, label: 'Head comes to and burrows', afterTimer: true, cite: at2(587) },
            after(k, `h_${t}_oburrow_${k}`),
          ]
        : []),
    ]),
    ...(fly ? [{ from: `h_${t}_damaged`, to: fly, label: 'Head gone: the body takes to the air', afterTimer: true, cite: at2(626) }] : []),
  ]
}

/** The body's turn: rise, its attack (chase or rocks by `p`), fly to a hole, dive in. */
const flyPhases = (b: Band, p: Par): Phase[] => {
  const t = tag(b, p)
  const dive = `f_${t}_dive`
  return [
    { id: `f_${t}_rise`, label: `Volvagia bursts out and soars (${t})`, frames: { value: 50, cite: at(654) }, cite: at(643), overrides: map(ALL, (d) => flyHit(b, d)) },
    p === 'c'
      ? { id: `f_${t}_chase`, label: `Volvagia chases Link, breathing fire (${t})`, frames: { value: 300, cite: at(610) }, cite: at(609), overrides: map(ALL, (d) => flyHit(b, d, dive)) }
      : { id: `f_${t}_rocks`, label: `Volvagia rams the ceiling, raining rocks (${t})`, frames: { value: 150, cite: at(670) }, cite: at(668), overrides: map(ALL, (d) => flyHit(b, d)) },
    { id: dive, label: `Volvagia flies for a hole (${t})`, frames: { value: 20, cite: at(600) }, cite: at(603), overrides: map(ALL, (d) => flyHit(b, d)) },
    { id: `f_${t}_burrow`, label: `Volvagia dives into the hole (${t})`, hittable: 'none', frames: { value: 150, cite: at(627) }, cite: at(624) },
  ]
}

const flySteps = (b: Band, p: Par): Step[] => {
  const t = tag(b, p)
  const next = `h_${tag(b, OTHER_PAR[p])}_emerge_1`
  return [
    p === 'c'
      ? { from: `f_${t}_rise`, to: `f_${t}_chase`, label: 'Volvagia turns on Link', afterTimer: true, cite: at(609) }
      : { from: `f_${t}_rise`, to: `f_${t}_rocks`, label: 'Volvagia climbs to the ceiling', afterTimer: true, cite: at(615) },
    ...(p === 'c'
      ? [
          { from: `f_${t}_chase`, to: `f_${t}_chase`, label: 'Volvagia breathes fire at Link', range: 'far' as const, attack: 'fire_breath', cite: at(718) },
          { from: `f_${t}_chase`, to: `f_${t}_chase`, label: 'Volvagia flies into Link', range: 'near' as const, attack: 'body', cite: at(1344) },
          { from: `f_${t}_chase`, to: `f_${t}_dive`, label: 'Volvagia gives up the chase', afterTimer: true, cite: at(723) },
        ]
      : [
          { from: `f_${t}_rocks`, to: `f_${t}_rocks`, label: 'A rock falls on Link', attack: 'rock', cite: at(1379) },
          { from: `f_${t}_rocks`, to: `f_${t}_dive`, label: 'Volvagia leaves the ceiling', afterTimer: true, cite: at(703) },
        ]),
    { from: `f_${t}_dive`, to: `f_${t}_burrow`, label: 'Volvagia dives', afterTimer: true, cite: at(623) },
    { from: `f_${t}_burrow`, to: next, label: 'Volvagia is under: the head takes over', afterTimer: true, cite: at(637) },
  ]
}

const combos = BANDS.flatMap((b) => PARS.map((p) => [b, p] as const))
const phases: Phase[] = [...headPhases('F', 'c'), ...combos.flatMap(([b, p]) => [...headPhases(b, p), ...flyPhases(b, p)])]
const steps: Step[] = [...headSteps('F', 'c'), ...combos.flatMap(([b, p]) => [...headSteps(b, p), ...flySteps(b, p)])]

/** Threshold maps: a phase in one band to its twin in a lower band. */
const twin = (from: Band, to: Band) =>
  Object.fromEntries(phases.filter((x) => new RegExp(`^[hf]_${from.toLowerCase()}[cr]_`).test(x.id)).map((x) => [x.id, x.id.replace(`_${from.toLowerCase()}`, `_${to.toLowerCase()}`)]))

const attacks: Attack[] = [
  { id: 'body', label: "Volvagia's body", damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: `${COL}:7` },
  { id: 'fire_breath', label: "Volvagia's fire breath", damage: 48, effect: { kind: 'burn' }, blockable: false, dodgeable: true, source: at(1497) },
  {
    id: 'rock', label: 'A falling rock', damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true,
    source: 'src/overlays/actors/ovl_En_Vb_Ball/z_en_vb_ball.c:55', via: { overlay: 'ovl_En_Vb_Ball', spawn: at(1379) },
  },
  {
    id: 'emerge_knock', label: 'The emerging head', damage: 32, effect: { kind: 'knockback' }, blockable: false, dodgeable: true,
    source: at2(319), via: { overlay: 'ovl_Boss_Fd2', spawn: at(245) },
  },
  {
    id: 'claw', label: "The head's claw swipe", damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true,
    source: `${COL2}:18`, via: { overlay: 'ovl_Boss_Fd2', spawn: at(245) },
  },
]

const ELEMENTS = [7, 18, 29, 40, 51, 62, 73, 84, 95, 106, 117, 128, 139, 150, 161, 172, 183, 194, 205]

const ONE_KIT = 'only the hammer opens the face and so starts any flight, and the one kit with it (adult_blade) has no ice arrows or Biggoron Sword'
const deadVerbs: Record<string, string> = {
  fire_breath_lands_dd_again: 'breath lands on a still-burning Link only in the chase, which needs a flight, which needs the hammer; the hammer kit has no Double Defense',
  ...Object.fromEntries(phases.filter((x) => /_emerge_\d$/.test(x.id) || /^f_.*_burrow$/.test(x.id)).map((x) => [
    `${x.id}_timer_clears`, 'this phase cannot be hit and is left only by its steps that wait for the timer, so the timer is always spent',
  ])),
  ...Object.fromEntries(phases.filter((x) => /^(h_c[cr]_damaged|f_c[cr]_(rise|rocks|dive))$/.test(x.id)).map((x) => [
    `${x.id}_timer_clears`, 'band C has no threshold below it and no hit here changes the phase, so the phase is left only by its timed step',
  ])),
  ...Object.fromEntries(phases.filter((x) => /^h_[ab][cr]_vuln_\d$/.test(x.id)).map((x) => [
    `volvagia_empty_in_${x.id}`, 'the hammer that opens the face takes 2 from at least 4, so it never empties the pool here',
  ])),
  ...Object.fromEntries(phases.filter((x) => /^h_a[cr]_vuln_\d$/.test(x.id)).map((x) => [
    `volvagia_falls_to_2_in_${x.id}`, 'the hammer takes 2 from 6 or more here, so it cannot bring health to 2',
  ])),
  ...Object.fromEntries(phases.filter((x) => /^h_a[cr]_damaged$/.test(x.id)).map((x) => [
    `volvagia_empty_in_${x.id}`, `the open face in band A holds at least 4 after the hammer and the most a hammer-kit hit takes is 4 (Master Sword jump); ${ONE_KIT}`,
  ])),
  ...Object.fromEntries(phases.filter((x) => /^f_[ab][cr]_(rise|rocks|dive)$/.test(x.id)).map((x) => [
    `volvagia_empty_in_${x.id}`, 'a flying hit never takes health below 2 (z_boss_fd.c:1308): 2 or 4 from 6 or more, 2 from 4',
  ])),
  ...Object.fromEntries(phases.filter((x) => /^f_a[cr]_(rise|rocks|dive)$/.test(x.id)).map((x) => [
    `volvagia_falls_to_2_in_${x.id}`, `only an ice arrow (4) takes a flying Volvagia from 6 to 2; ${ONE_KIT}`,
  ])),
}

export const bossFd: ActorSpec = {
  overlay: 'ovl_Boss_Fd',
  name: 'Volvagia',
  role: 'boss',
  summary:
    'Volvagia, the whole fight. One health value of 24, the flying body\'s, is drained by both forms. The head pops from the lava holes three times, clawing or breathing fire; ' +
    'a hammer blow on its armored face takes 2 and stuns it, and a hit on the open face then sends it under and the body into the air. The flying body alternates chasing Link with ' +
    'fire and bringing rocks down from the ceiling; any hit on its head takes 2 (ice arrows 4) but never below 2. Only a sword on the open face can finish her.',
  cite: at(231),
  pools: [{
    id: 'volvagia', label: 'Volvagia', hp: { value: 24, cite: at(231) }, then: 'defeated',
    thresholds: [
      { at: 4, to: twin('A', 'B'), cite: at(1305) },
      { at: 2, to: { ...twin('A', 'C'), ...twin('B', 'C') }, cite: at(1307) },
    ],
  }],
  damage: { kind: 'custom', entries: map(ALL, (d) => flyHit('A', d)) },
  phases,
  start: 'h_f_emerge_1',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    BossFd_Fly: 'f_*',
    BossFd_Wait: 'h_*',
  },
  atSources: {
    ...Object.fromEntries(ELEMENTS.map((l) => [`${COL}:${l}`, 'body'])),
    [at(1497)]: 'fire_breath',
  },
  loadouts: standardLoadouts(['adult'], 4),
  expected: { deadVerbs },
}
