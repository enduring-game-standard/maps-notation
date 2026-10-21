import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Fd/z_en_fd.c'
const W = 'src/overlays/actors/ovl_En_Fw/z_en_fw.c'
const T = 'src/code/z_collision_btltbls.c'
const at = (line: number): Cite => `${F}:${line}`
const fw = (line: number): Cite => `${W}:${line}`
const tbl = (line: number): Cite => `${T}:${line}`

/**
 * The fire form has 24 health (z_en_fd.c:216) but never takes damage itself. A hit spawns the core
 * (En_Fw) with 8 health (z_en_fd.c:247); emptying the core takes 8 from the fire form (z_en_fw.c:169),
 * so the fight is three rounds of an 8-health core. A core that gets home is killed (z_en_fw.c:369) and
 * the next one spawns with 8 again, so damage to an escaped core is lost: the step home restores the pool.
 *
 * Reported gaps:
 * - The run lasts `circlesToComplete` circles, 2 to 9 (z_en_fd.c:591), before `spinTimer` even starts counting
 *   (z_en_fd.c:451), and a circle's length follows Link's distance from home (z_en_fd.c:629-636). No line gives
 *   the circles a frame count, so the run carries only the cited 30-149 frame timer, a lower bound. A wall hit
 *   also ends the run at once (z_en_fd.c:445-449); that is room geometry.
 * - After a burn the body AT is off for 30 frames (z_en_fd.c:330, 710). The timer runs alongside the spin and
 *   run timers, and a phase has one timer, so the model lets the body burn on consecutive beats.
 * - Each hit on the core turns its AC off until it lands and 20 more frames pass (z_en_fw.c:253, 284-290), a
 *   per-hit cooldown alongside the core's own timer. It is not modeled.
 */
const ROUNDS = [1, 2, 3] as const
type Round = (typeof ROUNDS)[number]

/**
 * DamageTable_Get(0x10), the core's table (z_en_fw.c:211), for every type the core's AC accepts (0xFFCFFFFE, z_en_fw.c:60).
 * The core is its own actor, so its table is not one of this actor's; the core phases carry its rows as overrides.
 */
const CORE: [DmgType, number, number][] = [
  ['DEKU_STICK', 2, 570], ['SLINGSHOT', 1, 571], ['EXPLOSIVE', 2, 572], ['BOOMERANG', 1, 573],
  ['ARROW_NORMAL', 2, 574], ['HAMMER_SWING', 2, 575], ['HOOKSHOT', 2, 576], ['SLASH_KOKIRI', 1, 577],
  ['SLASH_MASTER', 2, 578], ['SLASH_GIANT', 4, 579], ['ARROW_FIRE', 4, 580], ['ARROW_ICE', 4, 581],
  ['ARROW_LIGHT', 4, 582], ['MAGIC_FIRE', 4, 586], ['SPIN_KOKIRI', 1, 591], ['SPIN_GIANT', 2, 592],
  ['SPIN_MASTER', 4, 593], ['JUMP_KOKIRI', 2, 594], ['JUMP_GIANT', 4, 595], ['JUMP_MASTER', 8, 596],
  ['HAMMER_JUMP', 0, 599],
]

/** What pulls the flame off: an AC hit (bombs on every element, hookshot on element 0) or a nearby hammer quake. */
const exposeBy = (r: Round, withAc: boolean): Phase['overrides'] => ({
  ...(withAc
    ? {
        EXPLOSIVE: { damage: 0, to: `bounce_${r}`, cite: at(313) },
        HOOKSHOT: { damage: 0, to: `bounce_${r}`, cite: at(691) },
      }
    : {}),
  HAMMER_SWING: { damage: 0, to: `bounce_${r}`, cite: at(292) },
  HAMMER_JUMP: { damage: 0, to: `bounce_${r}`, cite: at(292) },
})

const phases: Phase[] = ROUNDS.flatMap((r): Phase[] => [
  { id: `rise_${r}`, label: `Flare Dancer rises from its home (round ${r})`, hittable: 'none', cite: at(498) },
  { id: `jump_${r}`, label: `Flare Dancer leaps (round ${r})`, hittable: 'none', cite: at(526) },
  { id: `land_${r}`, label: `Flare Dancer lands (round ${r})`, hittable: ['HAMMER_SWING', 'HAMMER_JUMP'], overrides: exposeBy(r, false), cite: at(536) },
  {
    id: `spin_${r}`, label: `Flare Dancer spins and casts fire (round ${r})`,
    hittable: ['EXPLOSIVE', 'HOOKSHOT', 'HAMMER_SWING', 'HAMMER_JUMP'], overrides: exposeBy(r, true),
    frames: { value: [60, 149], cite: at(541) }, cite: at(550),
  },
  {
    id: `run_${r}`, label: `Flare Dancer runs circles at Link (round ${r})`,
    hittable: ['EXPLOSIVE', 'HOOKSHOT', 'HAMMER_SWING', 'HAMMER_JUMP'], overrides: exposeBy(r, true),
    frames: { value: [30, 149], cite: at(592) }, cite: at(604),
  },
  { id: `bounce_${r}`, label: `The core bounces free, its AC off (round ${r})`, hittable: 'none', cite: fw(225) },
  {
    id: `core_${r}`, label: `Flare Dancer's core runs loose (round ${r})`, pool: `core${r}`,
    hittable: CORE.map(([d]) => d),
    overrides: Object.fromEntries(CORE.map(([d, damage, line]) => [d, { damage, cite: tbl(line) }])),
    frames: { value: [300, 449], cite: fw(226) }, cite: at(662),
  },
])

const steps: Step[] = ROUNDS.flatMap((r): Step[] => [
  { from: `rise_${r}`, to: `jump_${r}`, label: 'Flare Dancer finishes growing and leaps', cite: at(518) },
  { from: `jump_${r}`, to: `land_${r}`, label: 'Flare Dancer touches down', range: 'far', cite: at(532) },
  { from: `jump_${r}`, to: `land_${r}`, label: 'Flare Dancer leaps into Link and touches down', range: 'near', attack: 'flame_body', cite: at(532) },
  { from: `land_${r}`, to: `spin_${r}`, label: 'Flare Dancer gets up and spins', range: 'far', cite: at(546) },
  { from: `land_${r}`, to: `spin_${r}`, label: 'Flare Dancer burns Link as it gets up and spins', range: 'near', attack: 'flame_body', cite: at(546) },
  { from: `spin_${r}`, to: `spin_${r}`, label: 'Flare Dancer spins into Link', range: 'near', attack: 'flame_body', cite: at(711) },
  { from: `spin_${r}`, to: `run_${r}`, label: 'Flare Dancer stops spinning and runs', afterTimer: true, cite: at(594) },
  { from: `run_${r}`, to: `run_${r}`, label: 'Flare Dancer runs into Link', move: 'near', attack: 'flame_body', cite: at(639) },
  { from: `run_${r}`, to: `jump_${r}`, label: 'Flare Dancer stops running and leaps', afterTimer: true, cite: at(616) },
  { from: `bounce_${r}`, to: `core_${r}`, label: 'The core lands and starts to run', cite: fw(227) },
  {
    from: `core_${r}`, to: `rise_${r}`, label: 'The core gets home and the flame reappears; the next core spawns with 8 health',
    afterTimer: true, restore: { pool: `core${r}`, to: 8, cite: at(247) }, cite: at(669),
  },
])

const attacks: Attack[] = [
  { id: 'flame_body', label: "Flare Dancer's burning body", damage: 4, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(72) },
]

export const enFd: ActorSpec = {
  overlay: 'ovl_En_Fd',
  name: 'Flare Dancer',
  role: 'enemy',
  summary:
    'A dancing flame that spins, runs circles at Link, and burns on contact. Only bombs, the hookshot, or a nearby hammer quake knock its flame off, exposing a core that flees. Three emptied cores defeat it.',
  cite: at(50),
  pools: ROUNDS.map((r) => ({
    id: `core${r}`,
    label: `Core, round ${r}`,
    hp: { value: 8, cite: at(247) },
    then: r === 3 ? 'defeated' : `rise_${r + 1}`,
  })),
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(15)',
    reactions: {
      '0x0': {
        damage: false,
        note: 'every entry of preset 15 is 0 with reaction 0, and the fire form never calls Actor_ApplyDamage: an AC hit (or a hammer quake) only spawns the core, so the phase overrides decide every hit',
        cite: at(313),
      },
    },
  },
  phases,
  start: 'rise_1',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnFd_Reappear: 'rise_*',
    EnFd_SpinAndGrow: 'rise_*',
    EnFd_JumpToGround: 'jump_*',
    EnFd_Land: 'land_*',
    EnFd_SpinAndSpawnFire: 'spin_*',
    EnFd_Run: 'run_*',
    EnFd_WaitForCore: 'core_*',
  },
  atSources: Object.fromEntries([72, 83, 94, 105, 116, 127, 138, 149, 160, 171, 182, 193].map((l) => [at(l), 'flame_body'])),
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      core_3_timer_clears:
        'core_3 is left only when its timer has run out, so no beats remain to clear, or when the last core empties, which defeats the Flare Dancer and ends the encounter',
      ...Object.fromEntries(ROUNDS.map((r) => [`core${r}_stands_again`,
        `the restore fires only on the step home from core_${r}, and a core that empties leaves core_${r} by its pool's then instead, so the restored pool is never an empty one`])),
    },
  },
}
