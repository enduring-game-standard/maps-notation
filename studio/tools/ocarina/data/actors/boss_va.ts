import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

/*
 * Reported gaps (z_boss_va.c):
 * - A body touch in phase 2 pushes the sway/pause cycle on by 24 frames and clears its low bits
 *   (`sPhase2Timer = (sPhase2Timer + 0x18) & 0xFFF0`, 1192). A step cannot shorten a phase timer, so the model keeps the 256-frame halves.
 * - The phase 3 stun lets the zappers fire only until the body timer falls under 35 (1295-1296, checked at 2036);
 *   a beat-model phase has one step set, so lightning stays possible for the whole 131-frame stun.
 * - C5 takes one phase glob per action function. BossVa_ZapperAttack runs wherever the body is still in phases 1-3
 *   (p1, p2_pause, p3_act_halt, p3_stun: 2028-2031, 2416-2418) and BossVa_ZapperHold wherever it moves (p2_move, p3_act_move: 2028-2029);
 *   the ledger names the first of each.
 * - A hit that overkills by 3 (a 4-damage Deku Stick jump slash, table line 393, on the last point of a round) leaves sPhase4HP at 0
 *   after the refill (1414), so the next round ends on its first hit, whatever its damage. The one-pool model ends that round on its
 *   stun with no hit, and the hit's damage lands in the round after, so the stuns and hits still add up, except after round 2: there the
 *   code needs one more hit in round 3, and the model ends the fight on round 3's stun.
 */
const F = 'src/overlays/actors/ovl_Boss_Va/z_boss_va.c'
const at = (line: number): Cite => `${F}:${line}`

/** A Bari's AC element accepts every type but the shield and the reflected light (0xFFCFFFFF). */
const BARI_TAKES: DmgType[] = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
/** The stunned body opens its AC to `DMG_SWORD | DMG_BOOMERANG | DMG_DEKU_STICK`. */
const BODY_OPEN: DmgType[] = [
  'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_MASTER', 'SPIN_GIANT',
  'JUMP_KOKIRI', 'JUMP_MASTER', 'JUMP_GIANT', 'BOOMERANG', 'DEKU_STICK',
]
const N = [5, 4, 3, 2, 1] as const
const ROUNDS = [1, 2, 3] as const
/** A boomerang on the open core restarts the stun (1424); two stun phases alternate so the re-stun starts a fresh timer. */
const STUNS = ['p4_stun', 'p4_restun'] as const

/** Every hit that connects does nothing but move the fight on to `to`. */
const all = (types: DmgType[], to: string, line: number): Phase['overrides'] =>
  Object.fromEntries(types.map((d) => [d, { damage: 0, to, cite: at(line) }]))

const nextP2 = (n: number, kind: 'pause' | 'stun') => (n > 1 ? `p2_${kind}_${n - 1}` : 'p3_act_move_5')
const nextP3 = (n: number) => (n > 1 ? `p3_stun_${n - 1}` : 'p4_roam_1')

const phases: Phase[] = [
  ...[3, 2, 1].map((n): Phase => ({
    id: `p1_${n}`, label: `Barinade hangs from the ceiling by ${n} umbilical cord${n > 1 ? 's' : ''}`,
    hittable: ['BOOMERANG'], overrides: all(['BOOMERANG'], n > 1 ? `p1_${n - 1}` : 'p2_move_5', 1773), cite: at(1087),
  })),
  ...N.flatMap((n): Phase[] => [
    {
      id: `p2_move_${n}`, label: `Barinade sways, ${n} Bari circling and sparking`, frames: { value: 256, cite: at(1215) },
      hittable: ['BOOMERANG'], overrides: all(['BOOMERANG'], `p2_stun_${n}`, 1170), cite: at(1217),
    },
    {
      id: `p2_pause_${n}`, label: `Barinade pauses, ${n} Bari hanging still`, frames: { value: 256, cite: at(1215) },
      hittable: BARI_TAKES,
      overrides: { ...all(BARI_TAKES, nextP2(n, 'pause'), 2731), ...all(['BOOMERANG'], `p2_stun_${n}`, 1170) },
      cite: at(1220),
    },
    {
      id: `p2_stun_${n}`, label: `Barinade is stunned, ${n} Bari left`, frames: { value: 160, cite: at(1170) },
      hittable: BARI_TAKES, overrides: all(BARI_TAKES, nextP2(n, 'stun'), 1173), cite: at(1171),
    },
  ]),
  ...N.flatMap((n): Phase[] => [
    {
      id: `p3_act_move_${n}`, label: `Barinade roams the floor, ${n} Bari spinning around it`, frames: { value: 384, cite: at(2612) },
      hittable: ['BOOMERANG'], overrides: all(['BOOMERANG'], `p3_stun_${n}`, 1281), cite: at(1258),
    },
    {
      id: `p3_act_halt_${n}`, label: `Barinade halts, ${n} Bari holding it still`, frames: { value: 128, cite: at(2617) },
      hittable: ['BOOMERANG'], overrides: all(['BOOMERANG'], `p3_stun_${n}`, 1281), cite: at(1315),
    },
    {
      id: `p3_stun_${n}`, label: `Barinade is stunned, ${n} Bari stunned with it`, frames: { value: 131, cite: at(1281) },
      hittable: BARI_TAKES, overrides: all(BARI_TAKES, nextP3(n), 2770), cite: at(2764),
    },
  ]),
  ...ROUNDS.flatMap((k): Phase[] => [
    { id: `p4_roam_${k}`, label: `Barinade spins after Link (round ${k})`, frames: { value: [300, 450], cite: at(1370) }, hittable: ['BOOMERANG'], cite: at(1445) },
    ...STUNS.map((s): Phase => ({ id: `${s}_${k}`, label: `Barinade is stunned, its core open (round ${k}${s === 'p4_restun' ? ', stunned again' : ''})`, frames: { value: [140, 180], cite: at(1424) }, hittable: BODY_OPEN, cite: at(1464) })),
    { id: `p4_dive_${k}`, label: `Barinade dives under the floor (round ${k})`, frames: { value: [220, 420], cite: at(1439) }, hittable: ['BOOMERANG'], guards: ['BOOMERANG'], cite: at(1477) },
    ...(k < 3
      ? [{ id: `p4_sink_${k}`, label: `Barinade sinks away after a beating (round ${k})`, frames: { value: [170, 320], cite: at(1421) }, hittable: ['BOOMERANG'] as DmgType[], guards: ['BOOMERANG'] as DmgType[], cite: at(1420) }]
      : []),
  ]),
]

const zappers = (from: string, zap: number, charge: number): Step[] => [
  { from, to: from, label: 'A zapper fires its beam', attack: 'lightning', cite: at(zap) },
  { from, to: from, label: 'The zappers are still charging', cite: at(charge) },
]
const touch = (from: string, line: number): Step => ({ from, to: from, label: 'Barinade\'s body shocks Link', range: 'near', attack: 'body_touch', cite: at(line) })
const bari = (from: string, sphere: number, arc: number): Step[] => [
  { from, to: from, label: 'A Bari touches Link', range: 'near', attack: 'bari_touch', cite: at(sphere) },
  { from, to: from, label: 'A Bari\'s arc shocks Link', range: 'near', attack: 'lightning', cite: at(arc) },
]

const steps: Step[] = [
  ...[3, 2, 1].flatMap((n) => [...zappers(`p1_${n}`, 2120, 2113), touch(`p1_${n}`, 1131)]),
  ...N.flatMap((n): Step[] => [
    { from: `p2_move_${n}`, to: `p2_pause_${n}`, label: 'Barinade stops swaying', afterTimer: true, cite: at(1220) },
    ...bari(`p2_move_${n}`, 2715, 2714),
    touch(`p2_move_${n}`, 1240),
    { from: `p2_pause_${n}`, to: `p2_move_${n}`, label: 'Barinade sways again', afterTimer: true, cite: at(1217) },
    ...zappers(`p2_pause_${n}`, 2120, 2113),
    touch(`p2_pause_${n}`, 1240),
    { from: `p2_stun_${n}`, to: `p2_move_${n}`, label: 'Barinade recovers', afterTimer: true, cite: at(1161) },
  ]),
  ...N.flatMap((n): Step[] => [
    { from: `p3_act_move_${n}`, to: `p3_act_halt_${n}`, label: 'The Bari stop and hold Barinade still', afterTimer: true, cite: at(2617) },
    ...bari(`p3_act_move_${n}`, 2621, 2620),
    touch(`p3_act_move_${n}`, 1356),
    { from: `p3_act_move_${n}`, to: `p3_act_move_${n}`, label: 'The zappers hold while Barinade moves', cite: at(2029) },
    { from: `p3_act_halt_${n}`, to: `p3_act_move_${n}`, label: 'The Bari let Barinade move again', afterTimer: true, cite: at(2615) },
    ...bari(`p3_act_halt_${n}`, 2621, 2620),
    touch(`p3_act_halt_${n}`, 1356),
    ...zappers(`p3_act_halt_${n}`, 2120, 2113),
    { from: `p3_stun_${n}`, to: `p3_act_move_${n}`, label: 'Barinade and its Bari recover', afterTimer: true, cite: at(2793) },
    touch(`p3_stun_${n}`, 1356),
    ...zappers(`p3_stun_${n}`, 2120, 2113),
  ]),
  ...ROUNDS.flatMap((k): Step[] => [
    { from: `p4_roam_${k}`, to: `p4_dive_${k}`, label: 'Barinade dives', afterTimer: true, cite: at(1439) },
    touch(`p4_roam_${k}`, 1532),
    ...zappers(`p4_roam_${k}`, 2379, 2371),
    ...STUNS.flatMap((s): Step[] => [
      { from: `${s}_${k}`, to: `p4_roam_${k}`, label: 'Barinade spins up again', afterTimer: true, cite: at(1445) },
      ...zappers(`${s}_${k}`, 2379, 2371),
    ]),
    { from: `p4_dive_${k}`, to: `p4_roam_${k}`, label: 'Barinade surfaces', afterTimer: true, cite: at(1488) },
    touch(`p4_dive_${k}`, 1532),
    ...zappers(`p4_dive_${k}`, 2379, 2371),
    ...(k < 3
      ? [
          { from: `p4_sink_${k}`, to: `p4_roam_${k + 1}`, label: 'Barinade surfaces, faster', afterTimer: true, cite: at(1488) },
          touch(`p4_sink_${k}`, 1532),
          ...zappers(`p4_sink_${k}`, 2379, 2371),
        ]
      : []),
  ]),
]

const attacks: Attack[] = [
  { id: 'body_touch', label: 'Barinade\'s electrified body', damage: 8, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(240) },
  { id: 'bari_touch', label: 'Bari contact', damage: 4, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(280) },
  { id: 'lightning', label: 'Lightning beam', damage: 4, effect: { kind: 'shock' }, blockable: false, dodgeable: true, source: at(314) },
]

const stunTo = Object.fromEntries(
  ROUNDS.flatMap((k) => [[`p4_roam_${k}`, `p4_stun_${k}`], [`p4_stun_${k}`, `p4_restun_${k}`], [`p4_restun_${k}`, `p4_stun_${k}`]]),
)
const roundEnds = (k: number, to: string) => Object.fromEntries(STUNS.map((s) => [`${s}_${k}`, to]))
const reactions: Record<string, Reaction> = {
  '0x0': { damage: true, note: 'a hit on the opened body lowers sPhase4HP by the table damage', cite: at(1410) },
  '0x1': { damage: false, to: stunTo, note: 'the boomerang stuns the body and opens it to swords and sticks, and on the open core restarts the stun', cite: at(1424) },
  '0xE': { damage: true, note: 'Din\'s Fire: reaction other than 1 takes the damage branch, but its 0 damage never reaches the body, whose AC accepts only the boomerang, swords and sticks', cite: at(1406) },
  '0x6': { damage: true, note: 'unused magic type, damage branch with 0 damage', cite: at(1406) },
  '0xD': { damage: true, note: 'unused magic type, damage branch with 0 damage', cite: at(1406) },
}

const excl = (excluded: string, line: number): Excluded => ({ excluded, cite: at(line) })
const intro = 'intro cutscene before the fight starts'
const death = 'death cutscene after the finishing blow; the encounter has already ended'

export const bossVa: ActorSpec = {
  overlay: 'ovl_Boss_Va',
  name: 'Barinade',
  role: 'boss',
  summary:
    'A jellyfish-like parasite in Jabu-Jabu\'s belly. Link cuts its three umbilical cords with the boomerang, stuns it to pick off its two rings of Bari, then stuns the bare body with the boomerang and slashes it over three rounds, while its zappers fire lightning.',
  cite: at(603),
  // One s8 counter starts at 4 (1372) and gains 3 each time a hit empties it (1411-1414), so overkill carries into the next
  // round: round r ends on the hit that brings total damage to 4 + 3(r - 1) or more. That is one pool of 4 + 3 + 3 + 3 (the third
  // refill runs at 1414 just before the death check at 1415) whose round ends are thresholds, with defeat when only the last 3 remain.
  pools: [
    {
      id: 'core', label: 'Barinade\'s core', hp: { value: 13, cite: at(1372), ops: [at(1414), at(1414), at(1414)] }, then: 'defeated',
      thresholds: [
        { at: 9, to: roundEnds(1, 'p4_sink_1'), cite: at(1411) },
        { at: 6, to: roundEnds(2, 'p4_sink_2'), cite: at(1411) },
        { at: 3, to: roundEnds(3, 'defeated'), cite: at(1415) },
      ],
    },
  ],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'p1_3',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    BossVa_BodyIntro: excl(intro, 793),
    BossVa_BodyPhase1: 'p1_*',
    BossVa_BodyPhase2: 'p2_*',
    BossVa_BodyPhase3: 'p3_*',
    BossVa_BodyPhase4: 'p4_*',
    BossVa_BodyDeath: excl(death, 1556),
    BossVa_SupportIntro: excl(intro, 1725),
    BossVa_SupportAttached: 'p1_*',
    BossVa_SupportCut: 'p1_*',
    BossVa_Stump: excl('the stump a cut cord leaves only animates; it has no collider', 1893),
    BossVa_ZapperIntro: excl(intro, 1912),
    BossVa_ZapperAttack: 'p1_*',
    BossVa_ZapperDamaged: 'p*',
    BossVa_ZapperHold: 'p2_move_*',
    BossVa_ZapperEnraged: 'p4_*',
    BossVa_ZapperDeath: excl(death, 2183),
    BossVa_BariIntro: excl(intro, 2437),
    BossVa_BariPhase2Attack: 'p2_*',
    BossVa_BariPhase3Attack: 'p3_act_*',
    BossVa_BariPhase3Stunned: 'p3_stun_*',
    BossVa_BariDeath: excl('a killed Bari fades out and despawns; its kill already counted in BossVa_KillBari', 2807),
    BossVa_Door: excl('the boss-room door; it has no collider', 2822),
    func: excl('not a function: the parameter of the BossVa_SetupAction helper', 422),
  },
  atSources: {
    [at(240)]: 'body_touch',
    [at(280)]: 'bari_touch',
    [at(314)]: 'lightning',
  },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        ['p4_dive_1', 'p4_sink_1', 'p4_dive_2', 'p4_sink_2', 'p4_dive_3'].map((p) => [
          `${p}_timer_clears`,
          'Barinade under the floor deflects the boomerang and nothing else reaches it, so it leaves only when its timer runs out',
        ]),
      ),
      ...Object.fromEntries(
        ['p4_stun_1', 'p4_restun_1', 'p4_stun_2', 'p4_restun_2'].map((p) => [
          `core_empty_in_${p}`,
          'rounds 1 and 2 keep the core above 6 and no child hit deals more than 4 (Deku Stick jump, table line 393), so it cannot empty there',
        ]),
      ),
      core_overkill: 'Barinade falls once the core is down to 3, so a hit always finds at least 4 left, and no child hit deals more than 4 (Deku Stick jump, table line 393)',
      body_touch_lands_again: 'the shock lasts 20 frames, one beat, and wears off at the end of the beat it lands, so no attack finds Link still shocked',
      bari_touch_lands_again: 'as body_touch_lands_again',
      lightning_lands_again: 'as body_touch_lands_again',
      link_helpless_shock: 'the shock lasts one beat and wears off at the end of the beat it lands, before Link\'s next move, so he never loses a move to it',
    },
  },
}
