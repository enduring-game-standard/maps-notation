import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_Boss_Ganon2/z_boss_ganon2.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * What the fight has reached. `pre`: Link has no Master Sword and Ganon's health is above 20. `re`: Ganon got up
 * without Link taking the sword back. `ms`: Link has the Master Sword again (unk_334 set, line 1674). `last`: health 1,
 * where only a Master Sword hit still counts (line 2294).
 */
type Band = 'pre' | 're' | 'ms' | 'last'
const BANDS: Band[] = ['pre', 're', 'ms', 'last']
const BAND_NAME: Record<Band, string> = { pre: '', re: ' (risen without the sword taken back)', ms: ' (Link has the Master Sword)', last: ' (one health left)' }
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
      if (b === 're') return [d, { damage: 0, to: 'collapse', cite: at(2293) }]
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
    { id: `guard_${b}`, label: `Ganon guards his face${n}`, hittable: 'none', frames: { value: 40, cite: at(1401) }, cite: at(1400) },
    { id: `stunned_${b}`, label: `A light arrow stuns Ganon${n}`, ...tailHits(b), frames: { value: 80, cite: at(1439) }, cite: at(1427) },
    ...(b === 're' ? [] : [{ id: `damaged_${b}`, label: `Ganon recoils from a tail hit${n}`, hittable: 'none' as const, cite: at(1460) }]),
  ]
}

const bandSteps = (b: Band): Step[] => [
  { from: `idle_${b}`, to: `swing_l_${b}`, label: 'Link is close in front: Ganon swings', range: 'near', cite: at(1346) },
  { from: `idle_${b}`, to: `walk_${b}`, label: 'Ganon starts to walk', range: 'far', afterTimer: true, cite: at(1389) },
  { from: `walk_${b}`, to: `swing_l_${b}`, label: 'Link is close in front: Ganon swings', range: 'near', cite: at(1346) },
  { from: `walk_${b}`, to: `walk_${b}`, label: 'Ganon walks Link down', range: 'far', move: 'near', cite: at(1518) },
  { from: `walk_${b}`, to: `idle_${b}`, label: 'Ganon stops walking', afterTimer: true, cite: at(1521) },
  { from: `swing_l_${b}`, to: `swing_r_${b}`, label: 'The left sword cuts at Link', range: 'near', attack: 'sword', cite: at(1568) },
  { from: `swing_l_${b}`, to: `idle_${b}`, label: 'The left sword cuts the air', range: 'far', cite: at(1570) },
  { from: `swing_r_${b}`, to: `idle_${b}`, label: 'The right sword cuts at Link', range: 'near', attack: 'sword', cite: at(1570) },
  { from: `swing_r_${b}`, to: `idle_${b}`, label: 'The right sword cuts the air', range: 'far', cite: at(1570) },
  { from: `guard_${b}`, to: `walk_${b}`, label: 'Ganon lowers his guard', afterTimer: true, cite: at(1411) },
  { from: `stunned_${b}`, to: `walk_${b}`, label: 'Ganon shakes off the stun', afterTimer: true, cite: at(1451) },
  ...(b === 're' ? [] : [{ from: `damaged_${b}`, to: `walk_${b}`, label: 'Ganon recovers', cite: at(1468) }]),
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
      { at: 20, to: { damaged_pre: 'collapse' }, cite: at(2293) },
      { at: 1, to: { damaged_ms: 'damaged_last' }, cite: at(2298) },
    ],
  }],
  damage: { kind: 'custom', entries: Object.fromEntries(ALL.map((d) => [d, { damage: tail(d), cite: tailCite(d) }])) },
  phases: [
    ...BANDS.flatMap(bandPhases),
    { id: 'collapse', label: 'Ganon collapses at 20 health', hittable: 'none', cite: at(1584) },
    { id: 'downed', label: 'Ganon is down; the Master Sword lies on the floor', hittable: 'none', frames: { value: 300, cite: at(1642) }, cite: at(1586) },
    {
      id: 'rising_ms', label: 'Ganon gets up as Link raises the Master Sword',
      hittable: MASTER, overrides: Object.fromEntries(MASTER.map((d) => [d, { damage: 2, to: 'damaged_ms', cite: at(2256) }])),
      cite: at(1730),
    },
    {
      id: 'held', label: 'Zelda holds Ganon fast for the final blow',
      hittable: MASTER, overrides: Object.fromEntries(MASTER.map((d) => [d, { damage: 0, to: 'defeated', cite: at(1973) }])),
      cite: at(1755),
    },
  ],
  start: 'idle_pre',
  range: 'far',
  steps: [
    ...BANDS.flatMap(bandSteps),
    { from: 'collapse', to: 'downed', label: 'Ganon lies still; the Master Sword can be reached', cite: at(1710) },
    { from: 'downed', to: 'rising_ms', label: 'Link takes back the Master Sword', range: 'near', cite: at(3248) },
    { from: 'downed', to: 'idle_re', label: 'Ganon gets up with his health restored to 25', range: 'far', afterTimer: true, cite: at(1742) },
    { from: 'rising_ms', to: 'idle_ms', label: 'Ganon is back on his feet', cite: at(1740) },
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
    func_80900890: 'downed',
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
      guard_pre_timer_clears: 'no hit moves Ganon out of a guard (line 2241), so he leaves it only by the step that waits for its timer',
      guard_re_timer_clears: 'as guard_pre_timer_clears',
      guard_ms_timer_clears: 'as guard_pre_timer_clears',
      guard_last_timer_clears: 'as guard_pre_timer_clears',
      body_empty_in_damaged_pre: 'in the pre band health is above 20 and a tail hit costs 1 (no Master Sword yet), so health never runs out there; the threshold at 20 moves him to collapse first',
    },
  },
}
