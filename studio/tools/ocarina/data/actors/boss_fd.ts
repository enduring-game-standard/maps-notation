import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Pool, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Fd/z_boss_fd.c'
const at = (line: number): Cite => `${F}:${line}`
const COL = 'src/overlays/actors/ovl_Boss_Fd/z_boss_fd_colchk.inc.c'
const F2 = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2.c'
const at2 = (line: number): Cite => `${F2}:${line}`
const COL2 = 'src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2_colchk.inc.c'
const CC = 'src/code/z_collision_check.c'

/**
 * One health value, the body's (line 231), drained by both forms. The head reads it to set its fakeouts, idle time
 * and hole time (z_boss_fd2.c:235-243, 273-283, 339-349), and the flying head's floor of 2 (lines 1307-1308) and the
 * hammer's clamp to 1 (z_boss_fd2.c:858-859) read it too. Every hit deals an even amount until the hammer's clamp, so
 * six bands of it decide behavior:
 * F is 24, where the head never hands off to the body (z_boss_fd2.c:399);
 * A1 is 18-22, A2 12-16 and A3 6-10, with 0, 1 and 2 fakeouts per pop;
 * B is exactly 4, with 3 fakeouts, where an ice arrow on the flying head would cross the floor of 2 (lines 1305-1308);
 * C is 2 or less, where flying hits do nothing and only a sword on the open face still lands (z_boss_fd2.c:895).
 *
 * Reported gaps (the types or the decomp checkout cannot express them):
 * - The head's animation legs: the emerge rise, the claw and breath strikes, the burrow before its 25-frame timer
 *   (z_boss_fd2.c:392), the knockout before the 60-frame stun (:576-579) and the two hit animations before the
 *   25-frame sink (:606-620) all run to `Animation_GetLastFrame`, and this checkout has no extracted object data, so
 *   their lengths are unknown. Those phases carry only the stated timers, or none.
 * - The head's two near distances differ: the emerge knockback needs 120 (z_boss_fd2.c:318), the claw 200 (:369).
 *   The model has one near band.
 * - Each emerge pass also waits for Link's y above 70 (z_boss_fd2.c:261), and the chase ends when Link's y falls under
 *   70 (line 722). The model has no height.
 * - Rocks keep falling for 300 frames after the last ceiling bounce (lines 696, 1376-1379). The model lets them fall
 *   through the dive, the burrow and the next head turn's first emerge. The bounce time within the 150-frame rocks
 *   phase is not fixed by the code, so a tail past that emerge (up to 130 frames) is left out.
 * - Self-steps (rocks, touch) tie with a timed exit once the timer runs out, so such a phase can last a beat or two
 *   past its timer.
 * - The floors: a hammer from 2 leaves 1 (z_boss_fd2.c:859), and a flying hit at 1 sets 2 (line 1308). Band C carries
 *   both as 0, so its pool sits at 1 or 2 where the game would have the other; every adult sword hit takes 2 or more,
 *   so the kill is the same.
 * - `BossFd_Fly` (C5) also runs the intro flight (introState, lines 320-565) and the death sequence (lines 730-928).
 *   The function maps to `f_*`; its states are listed in `states` with the intro and death ones excluded.
 */
type Band = 'F' | 'A1' | 'A2' | 'A3' | 'B' | 'C'
type FlyBand = Exclude<Band, 'F'>
const FLY_BANDS: FlyBand[] = ['A1', 'A2', 'A3', 'B', 'C']
interface BandRow {
  fakeouts: number
  idle: { value: number; cite: Cite }
  hole: { value: number; line: number }
  /** What the hammer on the hidden face takes here (z_boss_fd2.c:857-859). */
  hammer: { damage: number; cite: Cite }
}
const BAND: Record<Band, BandRow> = {
  F: { fakeouts: 0, idle: { value: 50, cite: at2(340) }, hole: { value: 30, line: 274 }, hammer: { damage: 2, cite: at2(857) } },
  A1: { fakeouts: 0, idle: { value: 40, cite: at2(342) }, hole: { value: 25, line: 276 }, hammer: { damage: 2, cite: at2(857) } },
  A2: { fakeouts: 1, idle: { value: 40, cite: at2(344) }, hole: { value: 20, line: 278 }, hammer: { damage: 2, cite: at2(857) } },
  A3: { fakeouts: 2, idle: { value: 30, cite: at2(346) }, hole: { value: 10, line: 280 }, hammer: { damage: 2, cite: at2(857) } },
  B: { fakeouts: 3, idle: { value: 20, cite: at2(348) }, hole: { value: 5, line: 282 }, hammer: { damage: 3, cite: at2(859) } },
  C: { fakeouts: 3, idle: { value: 20, cite: at2(348) }, hole: { value: 5, line: 282 }, hammer: { damage: 0, cite: at2(859) } },
}
/** The attack of the body's next flight: odd flights chase Link, even ones bring the ceiling down (lines 607-616). */
type Par = 'c' | 'r'
const PARS: Par[] = ['c', 'r']
const OTHER_PAR: Record<Par, Par> = { c: 'r', r: 'c' }
/** The hole counter after a pop (z_boss_fd2.c:270), capped at 3, where a burrow hands off to the body (line 399). */
const K = [1, 2, 3] as const
/** The chase's breath ticks: 300 frames (line 610), a breath each time the timer is a multiple of 64 (line 715). */
const CHASE: number[] = [44, 64, 64, 64, 64]

/** Damage types the head's AC element accepts (0xFFCDFFFE, colchk line 8) that Link emits. */
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
const flyHit = (b: FlyBand, d: DmgType, to?: string) => {
  const raw = d === 'ARROW_ICE' ? 4 : 2
  const low = b === 'B' || b === 'C'
  const dmg = !low ? raw : b === 'B' ? 2 : 0
  const cite = !low ? at(d === 'ARROW_ICE' ? 1305 : 1303) : at(1308)
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

const tag = (b: Band, p: Par) => (b === 'F' ? 'f' : `${b.toLowerCase()}${p}`)
const h = (kind: string, t: string, k?: number) => `h_${kind}_${t}${k ? `_${k}` : ''}`
const fl = (kind: string, t: string, s?: number) => `f_${kind}_${t}${s ? `_${s}` : ''}`

/** The head turn's first band after a hammer on F (24 to 22): A1, chase parity, the first flight being a chase. */
const hammerBand = (b: Band): Band => (b === 'F' ? 'A1' : b)

/** The counter a pop leaves: it counts each fakeout pass too (z_boss_fd2.c:270, 291-297). */
const popTo = (b: Band, before: number) => Math.min(3, before + BAND[b].fakeouts + 1)
/** Frames a pop spends underground: the first pass, then the hole time, once per fakeout and once more. */
const underground = (b: Band, first: number) => first + BAND[b].hole.value + BAND[b].fakeouts * (10 + BAND[b].hole.value)

/** The head turn: a first pop out of the body's dive, then pops until the hole counter reaches 3 (line 399). */
const headPhases = (b: Band, p: Par): Phase[] => {
  const t = tag(b, p)
  const row = BAND[b]
  const hidden = (id: string, label: string, cite: Cite, k: number, frames?: Phase['frames']): Phase => ({
    id, label, cite, hittable: HAMMER,
    overrides: map(HAMMER, () => ({ ...row.hammer, to: h('daze', tag(hammerBand(b), p), k) })),
    ...(frames ? { frames } : {}),
  })
  const damaged = h('damaged', t)
  const open = (id: string, label: string, cite: Cite, frames: Phase['frames']): Phase => ({ id, label, cite, frames, overrides: map(ALL, (d) => faceHit(b, d, damaged)) })
  return [
    { id: h('wake', t), label: `Head waits under a hole and bursts out (${t}, first pop)`, hittable: 'none', frames: { value: underground(b, 20), cite: at2(823) }, cite: at2(822) },
    ...K.flatMap((k): Phase[] => [
      { id: h('emerge', t, k), label: `Head waits under another hole (${t}, counter ${k})`, hittable: 'none', frames: { value: underground(b, 10), cite: at2(row.hole.line) }, cite: at2(271) },
      hidden(h('up', t, k), `Head rears up out of the hole (${t}, counter ${k})`, at2(301), k),
      hidden(h('idle', t, k), `Head turns to Link, face armored (${t}, counter ${k})`, at2(337), k, row.idle),
      hidden(h('claw', t, k), `Head swipes its claw (${t}, counter ${k})`, at2(521), k),
      hidden(h('breath', t, k), `Head breathes fire (${t}, counter ${k})`, at2(412), k),
      hidden(h('burrow', t, k), `Head sinks into its hole (${t}, counter ${k})`, at2(381), k, { value: 25, cite: at2(394) }),
      ...(b === 'F'
        ? []
        : [
            { id: h('daze', t, k), label: `Head is knocked out, still shaking off the blow (${t}, counter ${k})`, hittable: 'none' as const, frames: { value: 30, cite: at2(863) }, cite: at2(539) },
            open(h('vuln', t, k), `Head lies stunned, face open (${t}, counter ${k})`, at2(539), { value: 60, cite: at2(579) }),
            open(h('oburrow', t, k), `Stunned head sinks, face still open (${t}, counter ${k})`, at2(587), { value: 25, cite: at2(394) }),
          ]),
    ]),
    ...(b === 'F' ? [] : [{ id: damaged, label: `Head reels and sinks away (${t})`, hittable: 'none' as const, frames: { value: 25, cite: at2(620) }, cite: at2(596) }]),
  ]
}

const touch = (from: string, label = 'The head is up beside Link and he touches it'): Step =>
  ({ from, to: from, label, range: 'near', attack: 'claw', cite: at2(1007) })
const rockStep = (from: string): Step => ({ from, to: from, label: 'A rock from the ceiling falls on Link', attack: 'rock', cite: at(1379) })

const headSteps = (b: Band, p: Par): Step[] => {
  const t = tag(b, p)
  const fly = b === 'F' ? undefined : fl('rise', t)
  const after = (k: number, from: string): Step => {
    if (fly && k >= 3) return { from, to: fly, label: 'Counter at 3: the body takes to the air', afterTimer: true, cite: at2(402) }
    const next = popTo(b, k)
    return { from, to: h('emerge', t, next), label: 'Head moves to another hole', afterTimer: true, cite: at2(404) }
  }
  const rise = (from: string, k: number): Step[] => [
    { from, to: h('up', t, k), label: 'Head bursts up beside Link, knocking him back', range: 'near', afterTimer: true, attack: 'emerge_knock', cite: at2(319) },
    { from, to: h('up', t, k), label: 'Head bursts up', range: 'far', afterTimer: true, cite: at2(305) },
  ]
  const first = popTo(b, 0)
  return [
    ...rise(h('wake', t), first),
    // The head turn after a rocks flight (this parity is chase) still has rocks falling (lines 696, 1376-1379).
    ...(b !== 'F' && p === 'c' ? [rockStep(h('wake', t))] : []),
    ...K.flatMap((k): Step[] => [
      ...rise(h('emerge', t, k), k),
      { from: h('up', t, k), to: h('idle', t, k), label: 'Head rises beside Link, touching him', range: 'near', attack: 'claw', cite: at2(323) },
      { from: h('up', t, k), to: h('idle', t, k), label: 'Head is up', range: 'far', cite: at2(323) },
      touch(h('idle', t, k)),
      { from: h('idle', t, k), to: h('claw', t, k), label: 'Head rears to swipe its claw', range: 'near', afterTimer: true, cite: at2(370) },
      { from: h('idle', t, k), to: h('breath', t, k), label: 'Head breathes fire', range: 'far', afterTimer: true, attack: 'fire_breath', cite: at2(372) },
      { from: h('claw', t, k), to: h('burrow', t, k), label: 'The claw swipe lands', range: 'near', attack: 'claw', cite: at2(532) },
      { from: h('claw', t, k), to: h('burrow', t, k), label: 'Head finishes its swipe and burrows', range: 'far', cite: at2(532) },
      { from: h('breath', t, k), to: h('burrow', t, k), label: 'Head finishes its breath beside Link, touching him', range: 'near', attack: 'claw', cite: at2(432) },
      { from: h('breath', t, k), to: h('burrow', t, k), label: 'Head finishes its breath and burrows', range: 'far', cite: at2(432) },
      touch(h('burrow', t, k)),
      after(k, h('burrow', t, k)),
      ...(fly
        ? [
            { from: h('daze', t, k), to: h('vuln', t, k), label: 'Head lies still, open to hits', afterTimer: true, cite: at2(1001) },
            { from: h('vuln', t, k), to: h('oburrow', t, k), label: 'Head comes to and burrows', afterTimer: true, cite: at2(587) },
            touch(h('oburrow', t, k)),
            after(k, h('oburrow', t, k)),
          ]
        : []),
    ]),
    ...(fly ? [{ from: h('damaged', t), to: fly, label: 'Head gone: the body takes to the air', afterTimer: true, cite: at2(626) }] : []),
  ]
}

/** The body's turn: rise, its attack (chase or rocks by `p`), fly to a hole, dive in. */
const flyPhases = (b: FlyBand, p: Par): Phase[] => {
  const t = tag(b, p)
  const hits = (to?: string) => map(ALL, (d) => flyHit(b, d, to))
  return [
    { id: fl('rise', t), label: `Volvagia bursts out and soars (${t})`, frames: { value: 50, cite: at(656) }, cite: at(643), overrides: hits() },
    ...(p === 'c'
      ? CHASE.map((n, i): Phase => ({
          id: fl('chase', t, i + 1), label: `Volvagia chases Link (${t}, breath ${i + 1})`, frames: { value: n, cite: at(i === 0 ? 610 : 715) },
          cite: at(609), overrides: hits(fl('dive', t)),
        }))
      : [{ id: fl('rocks', t), label: `Volvagia rams the ceiling, raining rocks (${t})`, frames: { value: 150, cite: at(670) }, cite: at(668), overrides: hits() }]),
    { id: fl('dive', t), label: `Volvagia flies for a hole (${t})`, frames: { value: 20, cite: at(600) }, cite: at(603), overrides: hits() },
    { id: fl('burrow', t), label: `Volvagia dives into the hole (${t})`, hittable: 'none', frames: { value: 150, cite: at(627) }, cite: at(624) },
  ]
}

const flySteps = (b: FlyBand, p: Par): Step[] => {
  const t = tag(b, p)
  const body = (from: string): Step => ({ from, to: from, label: 'Volvagia flies into Link', range: 'near', attack: 'body', cite: at(1344) })
  const chase: Step[] = CHASE.flatMap((_, i): Step[] => {
    const from = fl('chase', t, i + 1)
    const last = i === CHASE.length - 1
    return [
      body(from),
      {
        from, to: last ? fl('dive', t) : fl('chase', t, i + 2), label: last ? 'Volvagia breathes a last time and gives up the chase' : 'Volvagia breathes fire at Link',
        afterTimer: true, attack: 'fire_breath', cite: at(last ? 723 : 718),
      },
    ]
  })
  const rocks: Step[] = [rockStep(fl('rocks', t)), { from: fl('rocks', t), to: fl('dive', t), label: 'Volvagia leaves the ceiling', afterTimer: true, cite: at(703) }]
  return [
    p === 'c'
      ? { from: fl('rise', t), to: fl('chase', t, 1), label: 'Volvagia turns on Link', afterTimer: true, cite: at(609) }
      : { from: fl('rise', t), to: fl('rocks', t), label: 'Volvagia climbs to the ceiling', afterTimer: true, cite: at(615) },
    body(fl('rise', t)),
    ...(p === 'c' ? chase : rocks),
    { from: fl('dive', t), to: fl('burrow', t), label: 'Volvagia dives past Link, touching him', range: 'near', afterTimer: true, attack: 'body', cite: at(623) },
    p === 'r'
      ? { from: fl('dive', t), to: fl('burrow', t), label: 'Volvagia dives as a rock falls on Link', range: 'far', afterTimer: true, attack: 'rock', cite: at(623) }
      : { from: fl('dive', t), to: fl('burrow', t), label: 'Volvagia dives', range: 'far', afterTimer: true, cite: at(623) },
    ...(p === 'r' ? [rockStep(fl('burrow', t))] : []),
    { from: fl('burrow', t), to: h('wake', tag(b, OTHER_PAR[p])), label: 'Volvagia is under: the head takes over', afterTimer: true, cite: at(637) },
  ]
}

const combos = FLY_BANDS.flatMap((b) => PARS.map((p) => [b, p] as const))
const allPhases: Phase[] = [...headPhases('F', 'c'), ...combos.flatMap(([b, p]) => [...headPhases(b, p), ...flyPhases(b, p)])]
const allSteps: Step[] = [...headSteps('F', 'c'), ...combos.flatMap(([b, p]) => [...headSteps(b, p), ...flySteps(b, p)])]

/** Threshold maps: every phase in a band above `to` to its twin in `to`. The band tag is an id's third token. */
const bandOf = (id: string) => id.split('_')[2].slice(0, -1).toUpperCase()
const twin = (from: FlyBand[], to: FlyBand) =>
  Object.fromEntries(allPhases.filter((x) => from.includes(bandOf(x.id) as FlyBand)).map((x) => {
    const parts = x.id.split('_')
    parts[2] = `${to.toLowerCase()}${parts[2].slice(-1)}`
    return [x.id, parts.join('_')]
  }).filter(([, y]) => allPhases.some((x) => x.id === y)))

const START = h('wake', 'f')
const thresholds: NonNullable<Pool['thresholds']> = [
  { at: 16, to: twin(['A1'], 'A2'), cite: at2(235) },
  { at: 10, to: twin(['A1', 'A2'], 'A3'), cite: at2(237) },
  { at: 4, to: twin(['A1', 'A2', 'A3'], 'B'), cite: at2(239) },
  { at: 2, to: twin(['A1', 'A2', 'A3', 'B'], 'C'), cite: at(1307) },
]

/**
 * Keep only the phases the fight can reach, walking (phase, health) from the start: steps keep health, and every hit
 * this spec lists (for any kit) drains it, moves the phase, then applies each threshold it crosses. Also note each
 * (threshold, phase) pair a hit crosses in.
 */
const HP = 24
const reach = (() => {
  const byId = new Map(allPhases.map((p) => [p.id, p]))
  const out = new Map<string, string[]>()
  for (const s of allSteps) out.set(s.from, [...(out.get(s.from) ?? []), s.to])
  const seen = new Set<string>()
  const phasesSeen = new Set<string>()
  const crossed = new Set<string>()
  const todo: [string, number][] = [[START, HP]]
  const visit = (p: string, hp: number) => {
    const key = `${p}@${hp}`
    if (!seen.has(key)) { seen.add(key); todo.push([p, hp]) }
  }
  seen.add(`${START}@${HP}`)
  while (todo.length) {
    const [p, hp] = todo.pop()!
    phasesSeen.add(p)
    for (const n of out.get(p) ?? []) visit(n, hp)
    for (const o of Object.values(byId.get(p)!.overrides ?? {})) {
      if (!o) continue
      const left = hp - o.damage
      if (left <= 0) continue
      // Thresholds crossed by one hit fire in either order, so each may find any phase of the chain.
      const chain = [o.to ?? p]
      for (const th of thresholds)
        if (hp > th.at && left <= th.at) {
          for (const c of chain) crossed.add(`${th.at}:${c}`)
          const last = chain[chain.length - 1]
          chain.push((th.to as Record<string, string>)[last] ?? last)
        }
      visit(chain[chain.length - 1], left)
    }
  }
  return { phases: phasesSeen, crossed }
})()
const phases = allPhases.filter((p) => reach.phases.has(p.id))
const steps = allSteps.filter((s) => reach.phases.has(s.from))
/** A threshold names only the phases some hit crosses it in. */
for (const th of thresholds) th.to = Object.fromEntries(Object.entries(th.to as Record<string, string>).filter(([a]) => reach.crossed.has(`${th.at}:${a}`)))

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
    id: 'claw', label: "The head's claws and jaws (live whenever it is up and not stunned)", damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true,
    source: `${COL2}:18`, via: { overlay: 'ovl_Boss_Fd2', spawn: at(245) },
  },
]

const ELEMENTS = [7, 18, 29, 40, 51, 62, 73, 84, 95, 106, 117, 128, 139, 150, 161, 172, 183, 194, 205]

const out = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const ONE_KIT = 'only the hammer opens the face and so starts any flight, and the one kit with it (adult_blade) has no ice arrows or Biggoron Sword'
const ids = (re: RegExp) => phases.filter((x) => re.test(x.id)).map((x) => x.id)
const hitTargets = new Set(phases.flatMap((p) => Object.values(p.overrides ?? {}).flatMap((o) => (o?.to && o.damage > 0 ? [o.to] : []))))
const named = new Set(thresholds.flatMap((th) => Object.keys(th.to as Record<string, string>)))
/** A timed phase no step leaves early, no hit moves, and no threshold names: its timer is always spent when it is left. */
const spent = phases.filter((p) =>
  p.frames &&
  steps.every((s) => s.from !== p.id || s.afterTimer || s.to === p.id) &&
  Object.values(p.overrides ?? {}).every((o) => !o?.to) &&
  !named.has(p.id))
const deadVerbs: Record<string, string> = {
  fire_breath_lands_dd_again: 'breath lands on a still-burning Link only in the chase, which needs a flight, which needs the hammer; the hammer kit has no Double Defense',
  ...Object.fromEntries(spent.map((p) => [`${p.id}_timer_clears`, 'no step leaves this phase before its timer, no hit here moves it, and no threshold names it, so the timer is always spent'])),
  ...Object.fromEntries(ids(/^h_breath_/).flatMap((id) => HAMMER.map((d) => [
    `hit_${d.toLowerCase()}__${id}`, 'breath is entered only by the idle step that needs Link far, and every step out of it fires the next beat at either range, so Link\'s melee hammer never finds it',
  ]))),
  ...Object.fromEntries(ids(/^f_(rise|rocks|dive)_(a[123]|b)[cr]$/).map((id) => [
    `volvagia_empty_in_${id}`, 'a flying hit never takes health below 2 (z_boss_fd.c:1308): 2 or 4 from 6 or more, 2 from 4',
  ])),
  ...Object.fromEntries(ids(/^h_daze_/).filter((id) => hitTargets.has(id)).map((id) => [
    `volvagia_empty_in_${id}`, 'the hammer that leads here takes 2 from 6 or more, 3 from 4 (to 1) and nothing at 2 or less, so it never empties the pool',
  ])),
  ...Object.fromEntries(ids(/^h_damaged_a[123][cr]$/).map((id) => [
    `volvagia_empty_in_${id}`, `the open face in band A holds 6 or more and the most a hammer-kit hit takes is 4 (Master Sword jump); ${ONE_KIT}`,
  ])),
  ...Object.fromEntries([...ids(/^h_damaged_a1[cr]$/).map((id) => `volvagia_falls_to_10_in_${id}`), ...ids(/^h_damaged_a2[cr]$/).map((id) => `volvagia_falls_to_4_in_${id}`)].map((v) => [
    v, `only the Biggoron Sword jump (8) takes the open face past two bands in one hit; ${ONE_KIT}`,
  ])),
  ...Object.fromEntries(ids(/^f_(rise|rocks|dive)_a3[cr]$/).map((id) => [
    `volvagia_falls_to_2_in_${id}`, `only an ice arrow (4) takes a flying Volvagia from 6 to 2; ${ONE_KIT}`,
  ])),
}

export const bossFd: ActorSpec = {
  overlay: 'ovl_Boss_Fd',
  name: 'Volvagia',
  role: 'boss',
  summary:
    "Volvagia, the whole fight. One health value of 24, the flying body's, is drained by both forms. The head pops from the lava holes, each pop also counting " +
    'its fakeout passes, so it shows three times at full health and once below 12; it claws or breathes fire, and hurts by touch whenever it is up. ' +
    'A hammer blow on its armored face takes 2 and stuns it, and a hit on the open face then sends it under and the body into the air. The flying body alternates chasing Link with ' +
    'fire and bringing rocks down from the ceiling; any hit on its head takes 2 (ice arrows 4) but never below 2. Only a sword on the open face can finish her.',
  cite: at(231),
  pools: [{ id: 'volvagia', label: 'Volvagia', hp: { value: 24, cite: at(231) }, then: 'defeated', thresholds }],
  damage: { kind: 'custom', entries: map(ALL, (d) => flyHit('A1', d)) },
  phases,
  start: START,
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    BossFd_Fly: 'f_*',
    BossFd_Wait: 'h_*',
  },
  states: {
    BOSSFD_FLY_MAIN: { phase: 'f_rise_*', cite: at(574) },
    BOSSFD_EMERGE: { phase: 'f_rise_*', cite: at(640) },
    BOSSFD_FLY_CHASE: { phase: 'f_chase_*', cite: at(708) },
    BOSSFD_FLY_CEILING: { phase: 'f_rocks_*', cite: at(660) },
    BOSSFD_DROP_ROCKS: { phase: 'f_rocks_*', cite: at(674) },
    BOSSFD_FLY_HOLE: { phase: 'f_dive_*', cite: at(621) },
    BOSSFD_BURROW: { phase: 'f_burrow_*', cite: at(633) },
    BOSSFD_WAIT_INTRO: out('intro cutscene only: set while the intro camera runs (introState, line 331)', 331),
    BOSSFD_FLY_UNUSED: out('never assigned; only compared against here', 941),
    BOSSFD_DEATH_START: out('entered when health is 0 (line 577), after the finishing blow', 578),
    BOSSFD_SKIN_BURN: out('death sequence, after the finishing blow', 753),
    BOSSFD_BONES_FALL: out('death sequence, after the finishing blow', 822),
    BOSSFD_SKULL_PAUSE: out('death sequence, after the finishing blow', 837),
    BOSSFD_SKULL_FALL: out('death sequence, after the finishing blow', 844),
    BOSSFD_SKULL_BURN: out('death sequence, after the finishing blow', 895),
  },
  atSources: {
    ...Object.fromEntries(ELEMENTS.map((l) => [`${COL}:${l}`, 'body'])),
    [at(1497)]: 'fire_breath',
  },
  loadouts: standardLoadouts(['adult'], 4),
  expected: { deadVerbs },
}
