import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Test/z_en_test.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * How the beat model reads the Stalfos's code.
 * - Random draws keep the code's odds.
 * - Tests the beat model has no state for (which way Link faces, whether the Stalfos faces him, whether he is
 *   locked on, whether a wall is behind it) become even odds between their outcomes. An outcome that does
 *   nothing makes the code re-test on the next frame, so it is dropped and the rest share its weight.
 * - Near is the melee band (the code's 80-110 units); far is the jumpslash band and beyond (160-220).
 * - Body AC is only set while unk_7C8 >= 0xA (1811), so rising, waiting above, falling, the evasive leap,
 *   and flinching cannot be hit.
 * - The shield collider (AC_HARD, 0xFFC1FFFF, 188) is set while unk_7DE != 0 (1816) and its bounce clears the
 *   body hit (1674-1676). Phases that hold the shield up guard every type both colliders accept: all but magic.
 * - The ceiling Stalfos (params 3) skips every jump back the code guards with `params != STALFOS_TYPE_CEILING`,
 *   so it gets its own copy of the phases, suffixed `_c`.
 */
type Band = 'near' | 'far'
const BANDS: Band[] = ['near', 'far']

const SHIELD_FLAGS = 0xffc1ffff
const BODY_FLAGS = 0xffcfffff
const GUARDS: DmgType[] = DMG_TYPES.filter((_, i) => (SHIELD_FLAGS >>> i) & 1 & (BODY_FLAGS >>> i))
/** Damage types whose reaction stuns; a stunned Stalfos (unk_7C8 == 0xB) ignores them (1698). */
const STUNNERS: DmgType[] = ['DEKU_NUT', 'BOOMERANG', 'HOOKSHOT', 'ARROW_ICE', 'ARROW_LIGHT', 'MAGIC_ICE', 'MAGIC_LIGHT']
const stunImmune = Object.fromEntries(STUNNERS.map((d) => [d, { damage: 0, cite: at(1698) }]))

type Guard = 'o' | 'g'
const GUARD_LABEL: Record<Guard, string> = { o: 'shield down', g: 'shield up' }
const guarded = (g: Guard) => (g === 'g' ? { guards: GUARDS } : {})

const LABEL: Record<string, string> = {
  emerge: 'Stalfos rises', wait_above: 'Stalfos waits', fall: 'Stalfos drops', land: 'Stalfos lands',
  idle_o: 'Stalfos stands guard', idle_g: 'Stalfos stands guard behind its shield',
  turn_o: 'Stalfos turns toward Link', turn_g: 'Stalfos turns toward Link behind its shield',
  circle_o: 'Stalfos circles Link', circle_g: 'Stalfos circles Link behind its shield',
  walk: 'Stalfos advances', sidestep: 'Stalfos sidesteps', block: 'Stalfos blocks', unblock: 'Stalfos lowers its shield',
  slash_down: 'Stalfos slashes down', slash_up: 'Stalfos slashes up', slash_end: 'Stalfos recovers',
  jump_back: 'Stalfos jumps back', recoil: 'Stalfos recoils', jumpslash: 'Stalfos jumpslashes', jump_up: 'Stalfos leaps over Link',
  flinch: 'Stalfos flinches', frozen: 'Stalfos freezes', stunned: 'Stalfos is stunned',
}

/** The phases one kind of Stalfos moves through; the ceiling one never rises from the floor or jumps back. */
const phaseSet = (c: boolean): Phase[] => {
  const s = c ? '_c' : ''
  const who = c ? 'Ceiling Stalfos' : 'Stalfos'
  return [
    ...(c
      ? [
          { id: 'wait_above_c', label: 'Ceiling Stalfos waits above', hittable: 'none' as const, cite: at(482) },
          { id: 'fall_c', label: 'Ceiling Stalfos drops from above', hittable: 'none' as const, cite: at(554) },
        ]
      : [
          { id: 'emerge', label: 'Stalfos rises from the floor', hittable: 'none' as const, frames: { value: 15, cite: at(445) }, cite: at(452) },
          { id: 'jump_back', label: 'Stalfos jumps back', cite: at(1060) },
        ]),
    { id: `land${s}`, label: `${who} lands`, cite: at(567) },
    ...(['o', 'g'] as Guard[]).flatMap((g): Phase[] => [
      { id: `idle_${g}${s}`, label: `${who} stands guard (${GUARD_LABEL[g]})`, frames: { value: [5, 15], cite: at(497) }, ...guarded(g), cite: at(503) },
      { id: `turn_${g}${s}`, label: `${who} turns to face Link (${GUARD_LABEL[g]})`, ...guarded(g), cite: at(735) },
      { id: `circle_${g}${s}`, label: `${who} circles Link (${GUARD_LABEL[g]})`, frames: { value: [25, 40], cite: at(800) }, ...guarded(g), cite: at(807) },
    ]),
    { id: `walk${s}`, label: `${who} advances behind its shield`, guards: GUARDS, cite: at(584) },
    { id: `sidestep${s}`, label: `${who} sidesteps behind its shield`, guards: GUARDS, frames: { value: [20, 40], cite: at(1373) }, cite: at(1380) },
    { id: `block${s}`, label: `${who} stops and blocks`, guards: GUARDS, frames: { value: [11, 21], cite: at(1179) }, cite: at(1185) },
    { id: `unblock${s}`, label: `${who} lowers its shield`, guards: GUARDS, cite: at(1208) },
    { id: `slash_down${s}`, label: `${who} slashes down`, cite: at(925) },
    { id: `slash_up${s}`, label: `${who} slashes up`, cite: at(1024) },
    { id: `slash_end${s}`, label: `${who} recovers from its slash`, cite: at(958) },
    { id: `recoil${s}`, label: `${who} recoils off Link's shield`, cite: at(1621) },
    { id: `jumpslash${s}`, label: `${who} leaps in with a jumpslash`, cite: at(1111) },
    { id: `jump_up${s}`, label: `${who} leaps over Link`, hittable: 'none', cite: at(1151) },
    { id: `flinch${s}`, label: `${who} flinches`, hittable: 'none', cite: at(1235) },
    { id: `frozen${s}`, label: `${who} is frozen`, frames: { value: 36, cite: at(1323) }, overrides: stunImmune, cite: at(1333) },
    { id: `stunned${s}`, label: `${who} is stunned`, frames: { value: 80, cite: at(1320) }, overrides: stunImmune, cite: at(1333) },
  ]
}

const phases: Phase[] = [...phaseSet(false), ...phaseSet(true)]
const PH = new Set(phases.map((p) => p.id))

/** One outcome of a decision, per range band, at a weight. */
interface Opt {
  to: string
  cite: Cite
  attack?: string
  move?: Band
}
type Dist = Record<Band, Map<string, { o: Opt; w: number }>>

const empty = (): Dist => ({ near: new Map(), far: new Map() })
const keyOf = (o: Opt) => `${o.to}|${o.attack ?? ''}|${o.move ?? ''}`
const add = (d: Dist, band: Band, o: Opt, w: number) => {
  const k = keyOf(o)
  const prev = d[band].get(k)
  d[band].set(k, { o: prev?.o ?? o, w: (prev?.w ?? 0) + w })
}
const NOTHING = empty()
/** Outcomes at the code's odds. A part with nothing in a band leaves the others to share it. */
const odds = (...parts: [number, Dist][]): Dist => {
  const d = empty()
  for (const b of BANDS) {
    const live = parts.filter(([, x]) => x[b].size)
    const total = live.reduce((s, [w]) => s + w, 0)
    for (const [w, x] of live) {
      const sub = [...x[b].values()].reduce((s, e) => s + e.w, 0)
      for (const e of x[b].values()) add(d, b, e.o, (w / total) * (e.w / sub))
    }
  }
  return d
}
/** A test the beat model has no state for: each outcome at even odds. */
const tie = (...parts: Dist[]) => odds(...parts.map((p): [number, Dist] => [1, p]))

const steps: Step[] = []
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** Every decision of one kind of Stalfos, as steps. */
const decisions = (c: boolean) => {
  const s = c ? '_c' : ''
  /** An outcome in both bands, or only the one given. Entering a jump back carries the Stalfos away (speed -11, 1054). */
  const go = (base: string, line: number, band?: Band): Dist => {
    const d = empty()
    const o: Opt = { to: `${base}${s}`, cite: at(line), ...(base === 'jump_back' ? { move: 'far' as Band } : {}) }
    for (const b of band ? [band] : BANDS) add(d, b, o, 1)
    return d
  }
  /** The ceiling Stalfos skips this jump back and falls through to what the code does instead. */
  const jumpBack = (line: number) => (c ? NOTHING : go('jump_back', line))
  const decide = (base: string, d: Dist, afterTimer = false) => {
    const from = `${base}${s}`
    if (!PH.has(from)) throw new Error(`no phase ${from}`)
    const norm = (b: Band) => {
      const total = [...d[b].values()].reduce((sum, e) => sum + e.w, 0)
      return [...d[b].entries()].map(([k, e]) => ({ k, o: e.o, w: Math.round((e.w / total) * 1000) })).sort((x, y) => x.k.localeCompare(y.k))
    }
    const near = norm('near')
    const far = norm('far')
    const same = near.length === far.length && near.every((e, i) => e.k === far[i].k && e.w === far[i].w)
    const groups: [Band | undefined, typeof near][] = same ? [[undefined, near]] : [['near', near], ['far', far]]
    const g = groups.flatMap(([, es]) => es.map((e) => e.w)).reduce(gcd, 0) || 1
    for (const [band, es] of groups)
      for (const { o, w } of es) {
        if (!PH.has(o.to)) throw new Error(`no phase ${o.to}`)
        const step: Step = { from, to: o.to, label: LABEL[o.to.replace(/_c$/, '')], cite: o.cite }
        if (es.length > 1 || groups.length > 1) step.weight = w / g
        if (band) step.range = band
        if (o.move && o.move !== band) step.move = o.move
        if (o.attack) step.attack = o.attack
        if (afterTimer) step.afterTimer = true
        steps.push(step)
      }
  }

  /** EnTest_ChooseRandomAction (347-375). The jumpslash needs the 170-220 band, facing, and lock-on (353-354). */
  const randomAction = (): Dist =>
    odds(
      [4, tie(go('jumpslash', 355, 'far'), go('walk', 360))],
      [1, go('walk', 360)],
      [3, go('sidestep', 366)],
      [2, go('block', 372)],
    )
  /** EnTest_ChooseAction (377-440), split by how Link's facing compares with the Stalfos's (384, 408). */
  const chooseAction = (): Dist =>
    tie(
      odds([3, go('block', 389)], [4, go('sidestep', 396)], [3, jumpBack(404)]),
      tie(
        tie(jumpBack(412), tie(go('jumpslash', 415, 'far'), go('walk', 418))),
        odds([8, go('slash_down', 430, 'near')], [2, randomAction()]),
      ),
      randomAction(),
    )
  /** EnTest_Idle after its timer (525-549): facing Link or not (528). */
  const idleExit = (g: Guard): Dist =>
    tie(
      odds(
        [3, tie(go('jumpslash', 532, 'far'), go('sidestep', 534, 'far'))],
        [7, odds([7, go('walk', 538)], [3, go('sidestep', 540)])],
      ),
      odds([3, go(`turn_${g}`, 545)], [7, chooseAction()]),
    )
  const slashed = (base: string, line: number): Dist => {
    const d = empty()
    add(d, 'near', { to: `${base}${s}`, cite: at(line), attack: `slash${s}` }, 1)
    add(d, 'far', { to: `${base}${s}`, cite: at(line) }, 1)
    return d
  }
  const advance = (): Dist => {
    const d = empty()
    add(d, 'far', { to: `walk${s}`, cite: at(604), move: 'near' }, 1)
    return d
  }

  if (c) {
    decide('wait_above', go('fall', 487, 'near'))
    decide('fall', go('land', 563))
  } else {
    decide('emerge', go('jump_back', 1642), true)
    decide('jump_back', tie(tie(go('slash_down', 1073, 'near'), go('jumpslash', 1080, 'far')), go('idle_o', 1075)))
  }
  decide('land', go('idle_o', 569))
  for (const g of ['o', 'g'] as Guard[]) {
    decide(`idle_${g}`, idleExit(g), true)
    decide(`turn_${g}`, odds([8, go('walk', 789)], [2, odds([3, go(`circle_${g}`, 784)], [7, chooseAction()])]))
    decide(`circle_${g}`, chooseAction(), true)
  }
  decide(
    'walk',
    tie(
      go('idle_g', 702),
      odds([8, go('slash_down', 716, 'near')], [2, go('block', 719, 'near')]),
      odds([9, advance()], [1, tie(go('jumpslash', 680, 'far'), tie(go('sidestep', 686, 'far'), chooseAction()), go('circle_g', 692, 'far'))]),
    ),
  )
  decide('sidestep', tie(chooseAction(), tie(go('idle_g', 1484), go('walk', 1486)), go('walk', 1489)), true)
  decide('block', tie(go('unblock', 1196), jumpBack(1192)), true)
  decide('unblock', chooseAction())
  decide('slash_down', tie(slashed('slash_end', 944), slashed('slash_up', 946)))
  decide('slash_up', slashed('slash_down', 1038))
  decide('slash_end', odds([30, go('idle_o', 972)], [21, jumpBack(981)], [49, tie(tie(jumpBack(993), go('slash_down', 996)), go('sidestep', 1006))]))
  {
    const d = empty()
    for (const b of BANDS) add(d, b, { to: `idle_o${s}`, cite: at(1121), attack: `jumpslash${s}`, move: 'near' }, 1)
    decide('jumpslash', d)
  }
  decide('recoil', odds([3, go('idle_o', 1624)], [7, tie(jumpBack(1627), go('sidestep', 1629))]))
  decide('jump_up', go('land', 1170))
  decide('flinch', tie(go('jump_up', 1246, 'near'), chooseAction()))
  decide('frozen', go('stunned', 1982), true)
  decide('stunned', tie(go('jump_up', 1345, 'near'), chooseAction()), true)
}
decisions(false)
decisions(true)

/** Where a reaction sends each phase that can be hit, keeping the ceiling Stalfos in its own phases. */
const toward = (base: string) =>
  Object.fromEntries(phases.filter((p) => p.hittable !== 'none').map((p) => [p.id, p.id.endsWith('_c') ? `${base}_c` : base]))

/** A sword that bounces off Link's raised shield sends the Stalfos into its recoil (AT_BOUNCED, 1822-1826). */
const attacks: Attack[] = ['', '_c'].flatMap((s): Attack[] => [
  {
    id: `slash${s}`, label: 'Stalfos sword slash', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true,
    onBlock: { to: `recoil${s}`, cite: at(1826) }, source: at(918),
  },
  {
    id: `jumpslash${s}`, label: 'Stalfos jumpslash', damage: 32, effect: { kind: 'none' }, blockable: true, dodgeable: true,
    onBlock: { to: `recoil${s}`, cite: at(1826) }, source: at(1104),
  },
])

const MELEE_LATE: DmgType[] = ['HAMMER_SWING', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP']
const deadVerbs: Record<string, string> = {
  emerge_timer_clears: 'rising cannot be hit and is left only by its own step once its one-beat timer has run out',
  ...Object.fromEntries(
    ['idle_g', 'block', 'idle_g_c', 'block_c'].map((p) => [
      `${p}_timer_clears`,
      'the one-beat timer runs out at the tick before any step can leave, and the raised shield guards every hit that could move it sooner',
    ]),
  ),
  ...Object.fromEntries(
    ['circle_g', 'sidestep', 'circle_g_c', 'sidestep_c'].map((p) => [
      `${p}_timer_clears`,
      'the raised shield guards every hit that could move it, and every step out waits for the timer, so the timer always runs out first',
    ]),
  ),
  ...Object.fromEntries(
    MELEE_LATE.flatMap((d) => {
      const k = d.toLowerCase()
      const keys = d.startsWith('JUMP_') ? [k, `${k}_self`] : [k]
      return keys.flatMap((key) => [
        [`hit_${key}__jump_back`, 'every step into the jump back carries the Stalfos far, and it leaves on its next step, so Link spends his only move closing in and no melee hit finds it there'],
        [`hit_${key}__jumpslash`, 'the jumpslash starts only while Link is far and lands on its next step, so Link spends his only move closing in and no melee hit finds it there'],
        [`hit_${key}__jumpslash_c`, 'as the ground jumpslash'],
      ])
    }),
  ),
}

const after = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enTest: ActorSpec = {
  overlay: 'ovl_En_Test',
  name: 'Stalfos',
  role: 'enemy',
  summary:
    'A sword-and-shield skeleton with 10 health. It advances, sidesteps, and blocks behind a shield that stops every frontal hit but magic, slashes when Link is close, and jumps back to leap in with a jumpslash. Hits make it flinch, nuts and boomerangs stun it, and ice freezes it.',
  cite: at(144),
  pools: [{ id: 'body', label: 'Stalfos', hp: { value: 10, cite: at(301) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      STALFOS_DMG_REACT_NORMAL: { damage: true, to: toward('flinch'), note: 'damage applies; it flinches (front or back), or falls when health runs out', cite: at(1704) },
      STALFOS_DMG_REACT_STUN: { damage: true, to: toward('stunned'), note: 'damage (0 for these) applies and it is stunned for 80 frames, unless already stunned', cite: at(1699) },
      STALFOS_DMG_REACT_LIGHT: { damage: true, to: toward('stunned'), note: 'damage applies and it is stunned gray for 80 frames, unless already stunned', cite: at(1318) },
      STALFOS_DMG_REACT_FREEZE: { damage: true, to: toward('frozen'), note: 'damage applies and it is frozen (36 ice frames on top of the 80-frame stun), unless already stunned', cite: at(1323) },
      STALFOS_DMG_REACT_SLING: { damage: false, note: 'slingshot seeds are ignored: no damage applied, no reaction', cite: at(1684) },
      STALFOS_DMG_REACT_FIREMAGIC: { damage: false, note: "Din's Fire is ignored: no damage applied, no reaction", cite: at(1685) },
    },
  },
  phases,
  start: 'emerge',
  variants: [
    { id: 'ground', label: 'Stalfos that rises from the floor', start: 'emerge', cite: at(319) },
    { id: 'invisible', label: 'Invisible Stalfos, seen only through the Lens', start: 'emerge', unseen: true, cite: at(1830) },
    { id: 'ceiling', label: 'Stalfos that drops from the ceiling', start: 'wait_above_c', cite: at(321) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnTest_WaitGround: 'emerge',
    EnTest_Rise: 'emerge',
    EnTest_WaitAbove: 'wait_above_c',
    EnTest_Fall: 'fall_c',
    EnTest_Land: 'land*',
    EnTest_Idle: 'idle_*',
    func_80860C24: 'turn_*',
    func_80860F84: 'circle_*',
    EnTest_WalkAndBlock: 'walk*',
    func_808628C8: 'sidestep*',
    EnTest_StopAndBlock: 'block*',
    EnTest_IdleFromBlock: 'unblock*',
    EnTest_SlashDown: 'slash_down*',
    EnTest_SlashUp: 'slash_up*',
    EnTest_SlashDownEnd: 'slash_end*',
    EnTest_JumpBack: 'jump_back',
    EnTest_Jumpslash: 'jumpslash*',
    EnTest_JumpUp: 'jump_up*',
    func_808621D4: 'flinch*',
    func_80862418: 'flinch*',
    EnTest_Stunned: 'stunned*',
    EnTest_Recoil: 'recoil*',
    func_80863044: after('falls over backwards after the finishing blow; the encounter has already ended', 1569),
    func_8086318C: after('falls over forwards after the finishing blow; the encounter has already ended', 1598),
    func_808633E8: after('body breaks apart and drops an item after death; drops are out of scope', 1646),
    func_80862E6C: after(
      'types 4 and 5 break apart after the finishing blow; a lone type 5 is killed (1548), and type 4 reviving once at 10 health (1528) is a reported gap',
      1517,
    ),
    actionFunc: after('the parameter name of EnTest_SetupAction, not an action function', 269),
  },
  atSources: {
    [at(207)]: 'slash',
    [at(918)]: 'slash',
    [at(1015)]: 'slash',
    [at(1104)]: 'jumpslash',
  },
  loadouts: standardLoadouts(['adult']),
  expected: { deadVerbs },
}
