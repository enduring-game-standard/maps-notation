import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Ganon2/z_boss_ganon2.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Ganon (z_boss_ganon2.c). Reported gaps, none expressible in the types:
 * - Facing is fixed per phase. unk_313 is recomputed from yaw every frame (line 1333), and the head (line 2240) and tail
 *   (line 2273) branches run in every phase not gated at 2233 or 2241. Each phase carries the exposure its turning
 *   implies: idle, walk, the right swing and the post-sword left swing turn to Link (lines 1395, 1527, 1579), so they
 *   show the head; the pre-sword left swing (line 1576), the guard (no turn call, lines 1404-1421) and the stun show the
 *   tail. The other exposure of each phase is left out.
 * - One near band serves the 150-unit swing start (line 1343) and the 250-unit follow-up swing (line 1567).
 * - The wall swing (lines 1348-1350) needs DEMO_GJ scene props (line 1261) the checkout has no scene list for.
 * - After a tail hit every hit is discarded for 60 frames (lines 2277, 2233), across damaged and the walk that follows.
 *   The damaged animation's length is in the object binary, so damaged has no timer and the window is not modeled.
 * - Ganon gets up only while Link is within 784 of the arena center (line 1725); the arena edge has no range band.
 * - In idle, at timer 0 the walk wins over the swing test (lines 1388-1391). Steps have no "before the timer" gate, so a
 *   near Link after the timer sees walk and swing tie.
 * - In down_rising_ms a Master Sword hit costs 2 on the head (line 2256) and 2 or 4 on the tail (line 2285); one phase
 *   holds one cost per type, so the head's 2 is used.
 */

/**
 * What the fight has reached. `pre`: Link has no Master Sword and Ganon's health is above 20, also after Ganon gets up
 * with health 25 (line 1742), since nothing else differs while unk_334 is 0. `ms`: Link has the Master Sword again
 * (unk_334 set, line 1674). `last`: health 1, where only a Master Sword hit still counts (line 2294).
 */
type Band = 'pre' | 'ms' | 'last'
const BANDS: Band[] = ['pre', 'ms', 'last']
const BAND_NAME: Record<Band, string> = { pre: '', ms: ' (Link has the Master Sword)', last: ' (one health left)' }
const POST = (b: Band) => b === 'ms' || b === 'last'

/** Elements 0 and 15 of the body spheres take 0xFFCFFFFF (lines 116 and 281): every type but the shield and reflected light. */
const ALL: DmgType[] = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
const MASTER: DmgType[] = ['SLASH_MASTER', 'SPIN_MASTER', 'JUMP_MASTER']
/**
 * Before the sword is taken back, Master Sword types never connect: the intro's player cutscene action calls
 * Inventory_DeleteEquipment(EQUIP_TYPE_SWORD) (ovl_player_actor/z_player.c:15892), so Link swings no sword.
 */
const tail = (d: DmgType) => (d === 'JUMP_MASTER' ? 4 : MASTER.includes(d) ? 2 : 1)
const tailCite = (d: DmgType) => at(d === 'JUMP_MASTER' ? 2285 : MASTER.includes(d) ? 2287 : 2282)

/** Hits on the tail (element 15), which Ganon shows Link when he is not turning to face him (line 2273). */
const tailHits = (b: Band): Pick<Phase, 'hittable' | 'overrides'> => {
  const types = POST(b) ? ALL : ALL.filter((d) => !MASTER.includes(d))
  return {
    hittable: types,
    overrides: Object.fromEntries(types.map((d) => {
      if (b === 'last' && !MASTER.includes(d)) return [d, { damage: 0, to: 'damaged_last', cite: at(2298) }]
      return [d, { damage: tail(d), to: `damaged_${b}`, cite: tailCite(d) }]
    })),
  }
}
/** Hits on the head (element 0) while Ganon faces Link: a light arrow stuns him, anything else makes him guard (lines 2245-2268). */
const frontHits = (b: Band): Pick<Phase, 'hittable' | 'overrides'> => {
  const types = POST(b) ? ALL : ALL.filter((d) => !MASTER.includes(d))
  return {
    hittable: types,
    overrides: Object.fromEntries(types.map((d) => [d, d === 'ARROW_LIGHT'
      ? { damage: 0, to: `stunned_${b}`, cite: at(2246) }
      : { damage: 0, to: `guard_${b}`, cite: at(2268) }])),
  }
}

const bandPhases = (b: Band): Phase[] => {
  const n = BAND_NAME[b]
  return [
    { id: `idle_${b}`, label: `Ganon stands guard${n}`, ...frontHits(b), frames: POST(b) ? { value: [0, 30], cite: at(1365) } : { value: 40, cite: at(1367) }, cite: at(1362) },
    { id: `walk_${b}`, label: `Ganon stalks Link${n}`, ...frontHits(b), frames: { value: 100, cite: at(1476) }, cite: at(1474) },
    { id: `swing_l_${b}`, label: `Ganon swings his left sword${n}`, ...(POST(b) ? frontHits(b) : tailHits(b)), cite: at(1541) },
    { id: `swing_r_${b}`, label: `Ganon follows with his right sword${n}`, ...frontHits(b), cite: at(1568) },
    /** Head hits are ignored here (line 2241), and the guard never turns (lines 1404-1421), so Link can reach the tail. */
    { id: `guard_${b}`, label: `Ganon guards his face${n}`, ...tailHits(b), frames: { value: 40, cite: at(1401) }, cite: at(1400) },
    { id: `stunned_${b}`, label: `A light arrow stuns Ganon${n}`, ...tailHits(b), frames: { value: 80, cite: at(1439) }, cite: at(1427) },
    { id: `damaged_${b}`, label: `Ganon recoils from a tail hit${n}`, hittable: 'none', cite: at(1460) },
  ]
}

const bandSteps = (b: Band): Step[] => [
  { from: `idle_${b}`, to: `swing_l_${b}`, label: 'Link is close in front: Ganon swings', range: 'near', cite: at(1346) },
  { from: `idle_${b}`, to: `walk_${b}`, label: 'Ganon starts to walk', afterTimer: true, cite: at(1389) },
  { from: `walk_${b}`, to: `swing_l_${b}`, label: 'Link is close in front: Ganon swings', range: 'near', cite: at(1346) },
  { from: `walk_${b}`, to: `walk_${b}`, label: 'Ganon walks Link down', range: 'far', move: 'near', cite: at(1518) },
  { from: `walk_${b}`, to: `idle_${b}`, label: 'Ganon stops walking', afterTimer: true, cite: at(1521) },
  { from: `swing_l_${b}`, to: `swing_r_${b}`, label: 'The left sword cuts at Link', range: 'near', attack: 'sword', cite: at(1568) },
  { from: `swing_l_${b}`, to: `idle_${b}`, label: 'The left sword cuts the air', range: 'far', cite: at(1570) },
  { from: `swing_r_${b}`, to: `idle_${b}`, label: 'The right sword cuts at Link', range: 'near', attack: 'sword', cite: at(1570) },
  { from: `swing_r_${b}`, to: `idle_${b}`, label: 'The right sword cuts the air', range: 'far', cite: at(1570) },
  { from: `guard_${b}`, to: `walk_${b}`, label: 'Ganon lowers his guard', afterTimer: true, cite: at(1411) },
  { from: `stunned_${b}`, to: `walk_${b}`, label: 'Ganon shakes off the stun', afterTimer: true, cite: at(1451) },
  { from: `damaged_${b}`, to: `walk_${b}`, label: 'Ganon recovers', cite: at(1468) },
]

const cut = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const body = (line: number): [Cite, Excluded] => [at(line), cut('a body sphere of unk_424, which is never registered as AT: CollisionCheck_SetAT is called only for the sword spheres unk_444', 2418)]

export const bossGanon2: ActorSpec = {
  overlay: 'ovl_Boss_Ganon2',
  name: 'Ganon',
  role: 'boss',
  summary:
    'Ganon knocks the Master Sword out of Link\'s hand and fights with two great swords. He faces Link and guards his head, so the tail is the target: a light arrow stuns him, or Link slips behind a left-hand swing. At 20 health he falls, and Link can take back the Master Sword. With it, tail hits count double and a jump attack four times; health 1 yields only to the Master Sword, and the last blow lands while Zelda holds Ganon.',
  cite: at(457),
  pools: [{
    id: 'body', label: 'Ganon', hp: { value: 30, cite: at(457) }, then: 'held',
    thresholds: [
      { at: 20, to: { damaged_pre: 'down_collapse' }, cite: at(2293) },
      { at: 1, to: { damaged_ms: 'damaged_last' }, cite: at(2298) },
    ],
  }],
  damage: { kind: 'custom', entries: Object.fromEntries(ALL.map((d) => [d, { damage: tail(d), cite: tailCite(d) }])) },
  phases: [
    /** The first idle after the intro: unk_1A2[1] = 50 (line 1198) gates the swing test past the 40-frame timer. */
    { id: 'idle_intro', label: 'Ganon stands guard after the intro', ...frontHits('pre'), frames: { value: 40, cite: at(1367) }, cite: at(1198) },
    ...BANDS.flatMap(bandPhases),
    { id: 'down_collapse', label: 'Ganon collapses at 20 health', hittable: 'none', cite: at(1584) },
    { id: 'down_lying', label: 'Ganon is down; the Master Sword lies on the floor', hittable: 'none', frames: { value: 300, cite: at(1642) }, cite: at(1586) },
    /**
     * With unk_334 set, hits are no longer cleared (line 2233). A Master Sword hit on the head costs 2 (line 2256); any
     * other type only connects on the tail, for 1 (line 2282), since the head branch ignores it here (line 2267).
     */
    {
      id: 'down_rising_ms', label: 'Ganon gets up as Link raises the Master Sword',
      hittable: ALL,
      overrides: Object.fromEntries(ALL.map((d) => [d, MASTER.includes(d)
        ? { damage: 2, to: 'damaged_ms', cite: at(2256) }
        : { damage: 1, to: 'damaged_ms', cite: at(2282) }])),
      cite: at(1730),
    },
    {
      id: 'held', label: 'Zelda holds Ganon fast for the final blow',
      hittable: MASTER, overrides: Object.fromEntries(MASTER.map((d) => [d, { damage: 0, to: 'defeated', cite: at(1973) }])),
      cite: at(1755),
    },
  ],
  start: 'idle_intro',
  range: 'far',
  steps: [
    { from: 'idle_intro', to: 'walk_pre', label: 'Ganon starts to walk', afterTimer: true, cite: at(1389) },
    ...BANDS.flatMap(bandSteps),
    { from: 'down_collapse', to: 'down_lying', label: 'Ganon lies still; the Master Sword can be reached', cite: at(1710) },
    { from: 'down_lying', to: 'down_rising_ms', label: 'Link takes back the Master Sword', range: 'near', cite: at(3248) },
    {
      from: 'down_lying', to: 'idle_pre', label: 'Ganon gets up with his health restored to 25', range: 'far', afterTimer: true,
      restore: { pool: 'body', to: 25, cite: at(1742) }, cite: at(1740),
    },
    { from: 'down_rising_ms', to: 'idle_ms', label: 'Ganon is back on his feet', cite: at(1740) },
  ],
  attacks: [
    { id: 'sword', label: 'Ganon\'s great sword', damage: 64, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(307) },
  ],
  actionFuncs: {
    func_808FFDB0: 'idle_*',
    func_808FFEBC: 'idle_*',
    func_80900344: 'walk_*',
    func_80900650: 'swing_*',
    func_808FFFE0: 'guard_*',
    func_80900104: 'stunned_*',
    func_8090026C: 'damaged_*',
    func_80900890: 'down_*',
    func_8090120C: 'held',
    func_808FD5F4: cut('the intro cutscene: the tower falls, Ganondorf transforms, and Ganon knocks the Master Sword away. Link is in a cutscene', 491),
  },
  atSources: {
    ...Object.fromEntries([115, 126, 137, 148, 159, 170, 181, 192, 203, 214, 225, 236, 247, 258, 269, 280].map(body)),
    [at(307)]: 'sword',
    [at(318)]: 'sword',
    [at(2193)]: 'sword',
    [at(2220)]: cut('the ring of fire: it burns and knocks Link back only when he stands more than 784 units from the arena center. The fight has no range band for the arena edge, and Link never needs to go there', 2212),
  },
  loadouts: [
    ...standardLoadouts(['adult'], 5),
    { id: 'adult_light_arrows', age: 'adult', hearts: 5, gear: ['deku_nuts', 'master_sword', 'hylian_shield', 'bow', 'fire_arrows', 'ice_arrows', 'light_arrows', 'magic', 'double_magic'] },
  ],
  expected: {
    deadVerbs: {
      body_resets_hp_body: 'Ganon gets up with health 25 only from down_lying, which he reaches at 20 or less (line 2292), so the health above 20 is already empty when the reset runs',
      body_rearms_1: 'the reset runs only before the sword is taken back, where health stays above 20 (line 2292), so the threshold at 1 is still armed',
      body_stands_again: 'the reset runs at health 20 or so, never at 0: before the sword is taken back a hit at 20 or less collapses him (line 2292) and cannot empty the pool',
      body_empty_in_damaged_pre: 'in the pre band health is above 20 and a tail hit costs 1 (no Master Sword yet), so health never runs out there; the threshold at 20 moves him to down_collapse first',
    },
  },
}
