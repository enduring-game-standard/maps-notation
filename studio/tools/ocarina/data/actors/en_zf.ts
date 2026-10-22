import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Zf/z_en_zf.c'
const at = (line: number): Cite => `${F}:${line}`

type Kind = 'lizalfos' | 'dinolfos' | 'paired'
const KINDS: Kind[] = ['lizalfos', 'dinolfos', 'paired']
const NAME: Record<Kind, string> = { lizalfos: 'Lizalfos', dinolfos: 'Dinolfos', paired: 'Paired Lizalfos' }

/** The body cylinder accepts every type but the shield bash and the reflected light ray (0xFFCFFFFF). */
const BODY: DmgType[] = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')
/** Every attack that sets the player's meleeWeaponState, which func_800354B4 reads. */
const MELEE: DmgType[] = [
  'DEKU_STICK', 'HAMMER_SWING', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER',
  'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP',
]

const id = (phase: string, k: Kind) => `${phase}_${k}`

/** EnZf_CheckCollide only reads a hit while action <= ENZF_ACTION_STUNNED; Damaged and JumpAttack sit above it. */
const ignored = { guards: BODY, cite: at(1969) }
/** EnZf_DinolfosPickAction: Link swinging within 100 makes a Dinolfos jump back (or jump-attack at a wall or 50% inside 90). */
const evades = Object.fromEntries(MELEE.map((d) => [d, { damage: 0, to: id('jump_back', 'dinolfos'), cite: at(673) }]))
/** EnZf_ReactToProjectile: a Hookshot on its way makes it jump-attack, and hits are ignored in the jump attack. */
const hookshotDodge = (k: Kind) => ({ HOOKSHOT: { damage: 0, to: id('jump_attack', k), cite: at(2259) } })
const reactsIn = (k: Kind, line: number) => ({ overrides: { ...(k === 'dinolfos' ? evades : {}), ...hookshotDodge(k) }, cite: at(line) })
/** A stunned EnZf ignores another stun or freeze: Actor_ApplyDamage is skipped when already stunned. */
const stunHeld = { ARROW_ICE: { damage: 0, cite: at(1977) } }

const phases: Phase[] = KINDS.flatMap((k): Phase[] => [
  { id: id('idle', k), label: `${NAME[k]} stands ready`, frames: { value: [5, 15], cite: at(757) }, ...reactsIn(k, 763) },
  { id: id('walk', k), label: `${NAME[k]} walks at Link`, ...reactsIn(k, 835) },
  { id: id('circle', k), label: `${NAME[k]} circles Link`, frames: { value: [5, 15], cite: at(1743) }, ...(k === 'dinolfos' ? { overrides: evades } : {}), cite: at(1751) },
  { id: id('attack', k), label: `${NAME[k]} slashes`, cite: at(1206) },
  { id: id('jump_forward', k), label: `${NAME[k]} leaps at Link`, cite: at(978) },
  { id: id('jump_attack', k), label: `${NAME[k]} jump-attacks`, ...ignored },
  { id: id('damaged', k), label: `${NAME[k]} reels from a hit`, ...ignored },
  { id: id('stunned', k), label: `${NAME[k]} is stunned`, frames: { value: 80, cite: at(1978) }, overrides: stunHeld, cite: at(1329) },
  ...(k === 'dinolfos' ? [{ id: id('jump_back', k), label: 'Dinolfos jumps back', cite: at(1286) }] : []),
  ...(k === 'paired'
    ? [{ id: id('away', k), label: 'Paired Lizalfos retreats while its partner fights', hittable: 'none' as const, frames: { value: 90, cite: at(2043) }, cite: at(2072) }]
    : []),
])

const stepsFor = (k: Kind): Step[] => {
  const p = (x: string) => id(x, k)
  const s: Step[] = [
    { from: p('idle'), to: p('walk'), label: `${NAME[k]} walks in`, range: 'near', afterTimer: true, weight: 70, cite: at(805) },
    { from: p('idle'), to: p('circle'), label: `${NAME[k]} starts circling`, range: 'near', afterTimer: true, weight: 30, cite: at(807) },
    ...(k === 'dinolfos'
      ? [
          { from: p('idle'), to: p('jump_forward'), label: 'Dinolfos leaps in from mid range', range: 'far' as const, afterTimer: true, weight: 30, cite: at(800) },
          { from: p('idle'), to: p('walk'), label: 'Dinolfos walks in', range: 'far' as const, afterTimer: true, weight: 49, cite: at(805) },
          { from: p('idle'), to: p('circle'), label: 'Dinolfos starts circling', range: 'far' as const, afterTimer: true, weight: 21, cite: at(807) },
        ]
      : [
          { from: p('idle'), to: p('circle'), label: `${NAME[k]} circles from mid range`, range: 'far' as const, afterTimer: true, weight: 51, cite: at(802) },
          { from: p('idle'), to: p('walk'), label: `${NAME[k]} walks in`, range: 'far' as const, afterTimer: true, weight: 49, cite: at(805) },
        ]),
    { from: p('walk'), to: p('attack'), label: `${NAME[k]} reaches Link and raises its sword`, range: 'near', weight: 190, cite: at(921) },
    { from: p('walk'), to: p('circle'), label: `${NAME[k]} sidesteps instead`, range: 'near', weight: 5, cite: at(923) },
    { from: p('walk'), to: p('idle'), label: `${NAME[k]} stops short`, range: 'near', weight: 5, cite: at(925) },
    { from: p('walk'), to: p('walk'), label: `${NAME[k]} closes in`, range: 'far', move: 'near', weight: 9, cite: at(893) },
    { from: p('walk'), to: p('idle'), label: `${NAME[k]} pauses`, range: 'far', weight: 1, cite: at(930) },
    ...(k === 'dinolfos' ? [{ from: p('walk'), to: p('jump_forward'), label: 'Dinolfos leaps in', range: 'far' as const, weight: 1, cite: at(940) }] : []),
    { from: p('circle'), to: p('attack'), label: `${NAME[k]} turns in to slash`, range: 'near', afterTimer: true, weight: 1, cite: at(1855) },
    { from: p('circle'), to: p('walk'), label: `${NAME[k]} walks in`, range: 'near', afterTimer: true, weight: 3, cite: at(1861) },
    { from: p('circle'), to: p('jump_forward'), label: `${NAME[k]} leaps in`, range: 'far', afterTimer: true, weight: 1, cite: at(1859) },
    { from: p('circle'), to: p('walk'), label: `${NAME[k]} walks in`, range: 'far', afterTimer: true, weight: 1, cite: at(1861) },
    { from: p('attack'), to: p('idle'), label: `${NAME[k]} slashes and steps back`, range: 'near', attack: 'slash', weight: 30, cite: at(1222) },
    { from: p('attack'), to: p('circle'), label: `${NAME[k]} slashes and circles`, range: 'near', attack: 'slash', weight: 21, cite: at(1227) },
    { from: p('attack'), to: p('attack'), label: `${NAME[k]} slashes again`, range: 'near', attack: 'slash', weight: 49, cite: at(1245) },
    { from: p('attack'), to: p('idle'), label: `${NAME[k]} slashes at air`, range: 'far', cite: at(1221) },
    k === 'dinolfos'
      ? { from: p('jump_forward'), to: p('attack'), label: 'Dinolfos lands slashing', move: 'near', cite: at(1004) }
      : { from: p('jump_forward'), to: p('walk'), label: `${NAME[k]} lands`, move: 'near', cite: at(995) },
    { from: p('jump_attack'), to: p('attack'), label: `${NAME[k]} lands its jump attack`, move: 'near', cite: at(1713) },
  ]
  if (k === 'dinolfos')
    s.push(
      { from: p('jump_back'), to: p('circle'), label: 'Dinolfos lands and circles', move: 'far', weight: 1, cite: at(1301) },
      { from: p('jump_back'), to: p('idle'), label: 'Dinolfos lands', move: 'far', weight: 1, cite: at(1303) },
      { from: p('damaged'), to: p('attack'), label: 'Dinolfos recovers and slashes', range: 'near', cite: at(1677) },
      { from: p('damaged'), to: p('idle'), label: 'Dinolfos recovers', range: 'far', cite: at(1679) },
      { from: p('stunned'), to: p('attack'), label: 'Dinolfos shakes off the stun and slashes', range: 'near', afterTimer: true, cite: at(1359) },
      { from: p('stunned'), to: p('idle'), label: 'Dinolfos shakes off the stun', range: 'far', afterTimer: true, cite: at(1361) },
    )
  else
    s.push(
      { from: p('damaged'), to: p('jump_attack'), label: `${NAME[k]} recovers with a jump attack`, range: 'near', cite: at(k === 'paired' ? 1652 : 1669) },
      { from: p('damaged'), to: p('idle'), label: `${NAME[k]} recovers`, range: 'far', cite: at(652) },
      { from: p('stunned'), to: p('attack'), label: `${NAME[k]} shakes off the stun and slashes`, range: 'near', afterTimer: true, weight: 7, cite: at(650) },
      { from: p('stunned'), to: p('idle'), label: `${NAME[k]} shakes off the stun`, range: 'near', afterTimer: true, weight: 1, cite: at(652) },
      { from: p('stunned'), to: p('idle'), label: `${NAME[k]} shakes off the stun`, range: 'far', afterTimer: true, cite: at(652) },
    )
  if (k === 'paired')
    s.push({ from: p('away'), to: p('idle'), label: 'Paired Lizalfos jumps back in when its partner retreats', move: 'far', afterTimer: true, cite: at(2056) })
  return s
}

const steps: Step[] = KINDS.flatMap(stepsFor)

const attacks: Attack[] = [
  { id: 'slash', label: 'Sword slash', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(184) },
]

const phasesOf = (k: Kind) => phases.filter((x) => x.id.endsWith(`_${k}`)).map((x) => x.id)
const mapTo = (target: (k: Kind) => string, skip: (ph: string, k: Kind) => boolean = () => false) =>
  Object.fromEntries(KINDS.flatMap((k) => phasesOf(k).filter((ph) => !skip(ph, k)).map((ph) => [ph, target(k)])))

const toDamaged = mapTo((k) => id('damaged', k))
const toStunned = mapTo((k) => id('stunned', k), (ph, k) => ph === id('stunned', k))
const toFlee = mapTo((k) => (k === 'paired' ? id('away', k) : id('damaged', k)))

const reactions: Record<string, Reaction> = {
  ENZF_DMG_REACT_NONE: { damage: true, to: toDamaged, note: 'damage and a red flash, then it reels; at zero health it dies', cite: at(2000) },
  ENZF_DMG_REACT_STUN: { damage: true, to: toStunned, note: 'blue flash for 80 frames and a stun unless already stunned; the table damage is 0', cite: at(1980) },
  ENZF_DMG_REACT_ICE: { damage: true, to: toStunned, note: 'damage and a freeze-stun unless already stunned', cite: at(1980) },
  ENZF_DMG_REACT_FLEE: {
    damage: true,
    to: toFlee,
    note: 'damage like any hit; a paired Lizalfos then retreats and its partner takes over (sPairedActiveFleeFlag)',
    cite: at(1647),
  },
  ENZF_DMG_REACT_6: { damage: false, note: 'reaction 6 is skipped entirely by EnZf_CheckCollide: no damage, no reaction', cite: at(1972) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enZf: ActorSpec = {
  overlay: 'ovl_En_Zf',
  name: 'Lizalfos',
  role: 'enemy',
  summary:
    'Lizalfos (6 health) and Dinolfos (12 health), lizard swordsmen that circle, walk in, and slash. A Dinolfos jumps back from Link\'s swings. A hit makes either reel, and neither can be hurt while reeling or jump-attacking. A paired Lizalfos in Dodongo\'s Cavern retreats on slingshot, fire, or light arrow hits while its partner takes over.',
  cite: at(141),
  pools: [
    { id: 'lizalfos', label: 'Lizalfos', hp: { value: 6, cite: at(397) }, then: 'defeated' },
    { id: 'dinolfos', label: 'Dinolfos', hp: { value: 12, cite: at(392) }, then: 'defeated' },
    {
      id: 'paired',
      label: 'Paired Lizalfos',
      hp: { value: 6, cite: at(397) },
      then: 'defeated',
      thresholds: [{ at: 3, to: Object.fromEntries(phasesOf('paired').filter((ph) => ph !== id('away', 'paired')).map((ph) => [ph, id('away', 'paired')])), cite: at(1997) }],
    },
  ],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases: phases.map((ph) => ({ ...ph, pool: KINDS.find((k) => ph.id.endsWith(`_${k}`)) })),
  start: id('idle', 'lizalfos'),
  variants: [
    { id: 'lizalfos', label: 'Lizalfos', start: id('idle', 'lizalfos'), cite: at(407) },
    { id: 'dinolfos', label: 'Dinolfos', start: id('idle', 'dinolfos'), cite: at(409) },
    { id: 'paired_a', label: 'Paired Lizalfos that fights first', start: id('idle', 'paired'), cite: at(747) },
    { id: 'paired_b', label: 'Paired Lizalfos that waits its turn', start: id('away', 'paired'), cite: at(745) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnZf_Idle: 'idle_*',
    EnZf_MainWalk: 'walk_*',
    EnZf_TurnTowardsPlayer: 'walk_*',
    EnZf_CirclePlayer: 'circle_*',
    EnZf_Sidestep: 'circle_*',
    EnZf_Attack: 'attack_*',
    EnZf_AttackBounced: 'attack_*',
    EnZf_JumpForwards: 'jump_forward_*',
    EnZf_JumpBackwards: 'jump_back_dinolfos',
    EnZf_JumpAttack: 'jump_attack_*',
    EnZf_Damaged: 'damaged_*',
    EnZf_Stunned: 'stunned_*',
    EnZf_Paired_JumpAwayStartTurnAround: 'away_paired',
    EnZf_Paired_JumpAway: 'away_paired',
    EnZf_Paired_IdleHop: 'away_paired',
    EnZf_Paired_EngageCombat: 'away_paired',
    EnZf_WaitAppear: post('intro: it waits invisible 300 units up until Link comes within 160 (or 10 frames for a pair); at alpha 0 its body is never put on the AC list, and its sword only strikes in the attack action', 2067),
    EnZf_Die: post('death animation and fade after the finishing blow; the encounter has already ended', 1917),
    actionFunc: post('the action function pointer field, set through EnZf_SetupAction; not an action function', 264),
  },
  atSources: { [at(184)]: 'slash' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      away_paired_timer_clears: "the retreat is left only when its timer runs out, so no timer is ever left behind",
      link_hurt_overkill: "every change to Link's health is a multiple of the 8-unit slash, so his health reaches zero exactly and never overshoots",
      hit_deku_nut__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_deku_stick__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_deku_stick__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_deku_stick__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_deku_stick__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slingshot__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_explosive__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_boomerang__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_arrow_normal__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_hammer_swing__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_hammer_swing__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_hammer_swing__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_hammer_swing__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_hookshot__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_slash_kokiri__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_kokiri__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_kokiri__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_slash_kokiri__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_master__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_master__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_master__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_slash_master__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_giant__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_giant__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_slash_giant__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_slash_giant__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_arrow_fire__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_arrow_ice__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_arrow_light__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_spin_kokiri__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_kokiri__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_kokiri__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_spin_kokiri__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_giant__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_giant__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_giant__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_spin_giant__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_master__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_master__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_spin_master__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_spin_master__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_kokiri__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_kokiri__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_kokiri__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_jump_kokiri__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_kokiri_self__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_kokiri_self__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_kokiri_self__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_jump_kokiri_self__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_giant__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_giant__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_giant__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_jump_giant__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_giant_self__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_giant_self__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_giant_self__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_jump_giant_self__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_master__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_master__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_master__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_jump_master__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_master_self__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_master_self__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_jump_master_self__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_jump_master_self__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_hammer_jump__jump_forward_lizalfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_hammer_jump__jump_forward_dinolfos: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      hit_hammer_jump__jump_back_dinolfos: "the jump back is entered only by Link's own swing, and the Dinolfos lands out of it on that same beat, so no later hit finds it",
      hit_hammer_jump__jump_forward_paired: "the leap forward is entered only from far and its one step lands it near, so Link is far on the only beat he can hit it, and this hit needs near",
      jump_back_dinolfos_step_1_far: "the jump back is entered only by Link's melee swing, which needs near, and it is left on that same beat",
      jump_back_dinolfos_step_2_far: "the jump back is entered only by Link's melee swing, which needs near, and it is left on that same beat",
    },
  },
}
