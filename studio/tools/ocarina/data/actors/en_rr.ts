import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Gear, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Rr/z_en_rr.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * `retreat` is set when a release eats something (lines 326, 333) and cleared when the retreat ends (line 766).
 * It decides where the next reach leads (line 266), so every phase it can outlive comes in both kinds.
 */
type Fed = '' | '_fed'
const FED: Fed[] = ['', '_fed']
const who = (f: Fed) => (f ? 'Like Like (it has eaten gear)' : 'Like Like')
/** What `Inventory_DeleteEquipment` can take: any shield but the Mirror Shield, any tunic but the Kokiri Tunic. */
const EDIBLE: Gear[] = ['deku_shield', 'hylian_shield', 'goron_tunic', 'zora_tunic']

const phases: Phase[] = [
  ...FED.flatMap((f): Phase[] => [
    { id: `approach${f}`, label: `${who(f)} creeps toward Link`, cite: at(603) },
    { id: `reach${f}`, label: `${who(f)} stretches up to swallow Link`, frames: { value: 20, cite: at(242) }, cite: at(613) },
    { id: `gape${f}`, label: `${who(f)} closes its gaping mouth`, frames: { value: 20, cite: at(638) }, cite: at(643) },
    { id: `approach_spat${f}`, label: `${who(f)} has just spat Link out and cannot grab yet`, frames: { value: 110, cite: at(316) }, cite: at(531) },
    { id: `damage${f}`, label: `${who(f)} reels from a wound`, hittable: 'none', frames: { value: 40, cite: at(478) }, cite: at(832) },
    { id: `stunned${f}`, label: `${who(f)} is stunned`, frames: { value: 80, cite: at(526) }, cite: at(777) },
  ]),
  /** A reach ends in a retreat once it has eaten (line 268), so only the unfed Like Like waits out this timer. */
  { id: 'approach_wait', label: 'Like Like creeps toward Link after a reach', frames: { value: 60, cite: at(270) }, cite: at(606) },
  { id: 'retreat', label: 'Like Like backs away with its meal', frames: { value: 100, cite: at(267) }, cite: at(764) },
]

/**
 * Contact swallows Link (line 540); the release up to 100 frames later (lines 278, 659) eats what it can (lines 322-335),
 * throws him with 8 damage (line 349), and decides `retreat` by whether it ate. One attack carries the whole swallow,
 * landing on the contact beat, so the step reads Link's gear before the theft resolves.
 */
const grabFrom = (from: string, fed: boolean): Step[] => {
  const base = { from, range: 'near' as const, move: 'far' as const, attack: 'swallow' }
  if (fed) return [{ ...base, to: 'approach_spat_fed', label: 'Like Like swallows Link and spits him out', cite: at(540) }]
  return [
    ...EDIBLE.map((g): Step => ({ ...base, to: 'approach_spat_fed', label: `Like Like swallows Link and keeps his ${g.replace(/_/g, ' ')}`, gear: [{ gear: g, has: true }], cite: at(326) })),
    { ...base, to: 'approach_spat', label: 'Like Like swallows Link and finds nothing to eat', gear: EDIBLE.map((g) => ({ gear: g, has: false })), cite: at(351) },
  ]
}

const steps: Step[] = [
  ...FED.flatMap((f): Step[] => [
    { from: `approach${f}`, to: `approach${f}`, label: 'Like Like creeps closer', range: 'far', move: 'near', cite: at(609) },
    { from: `approach${f}`, to: `reach${f}`, label: 'Like Like rears up to swallow', range: 'near', cite: at(607) },
    ...grabFrom(`approach${f}`, !!f),
    ...grabFrom(`reach${f}`, !!f),
    { from: `reach${f}`, to: `gape${f}`, label: 'Like Like gapes, then closes its mouth', afterTimer: true, cite: at(640) },
    ...grabFrom(`gape${f}`, !!f),
    { from: `gape${f}`, to: f ? 'retreat' : 'approach_wait', label: f ? 'Like Like settles and backs away' : 'Like Like settles', afterTimer: true, cite: at(f ? 268 : 271) },
    { from: `approach_spat${f}`, to: `approach_spat${f}`, label: 'Like Like creeps closer', range: 'far', move: 'near', cite: at(609) },
    { from: `approach_spat${f}`, to: `approach${f}`, label: 'Like Like can grab again', afterTimer: true, cite: at(531) },
    { from: `damage${f}`, to: `approach${f}`, label: 'Like Like recovers', afterTimer: true, cite: at(673) },
    { from: `stunned${f}`, to: `approach${f}`, label: 'Like Like recovers', afterTimer: true, cite: at(783) },
  ]),
  { from: 'approach_wait', to: 'approach_wait', label: 'Like Like creeps closer', range: 'far', move: 'near', cite: at(609) },
  { from: 'approach_wait', to: 'reach', label: 'Like Like rears up to swallow', range: 'near', afterTimer: true, cite: at(607) },
  ...grabFrom('approach_wait', false),
  { from: 'retreat', to: 'retreat', label: 'Like Like backs away', range: 'near', move: 'far', cite: at(772) },
  ...grabFrom('retreat', true),
  { from: 'retreat', to: 'approach', label: 'Like Like stops backing away', afterTimer: true, cite: at(767) },
]

const attacks: Attack[] = [
  {
    id: 'swallow',
    label: 'Like Like swallows Link',
    damage: 8,
    effect: { kind: 'steal', gear: EDIBLE },
    blockable: false,
    dodgeable: true,
    source: at(349),
  },
]

const allTo = (to: (f: Fed) => string) => {
  const m: Record<string, string> = {}
  for (const f of FED)
    for (const p of ['approach', 'reach', 'gape', 'approach_spat', 'damage', 'stunned']) m[`${p}${f}`] = to(f)
  m.approach_wait = to('')
  m.retreat = to('_fed')
  return m
}

const reactions: Record<string, Reaction> = {
  RR_DMG_REACT_NONE: { damage: false, note: 'reaction 0 matches no case of the switch', cite: at(458) },
  RR_DMG_REACT_NORMAL: { damage: true, to: allTo((f) => `damage${f}`), note: 'damage, 40 frames of invincibility, then EnRr_SetupDamage', cite: at(484) },
  RR_DMG_REACT_LIGHT_ARROW: { damage: true, to: allTo((f) => `damage${f}`), note: 'falls through to the NORMAL case; only the drop differs', cite: at(459) },
  RR_DMG_REACT_SHDW_ARROW: { damage: true, to: allTo((f) => `damage${f}`), note: 'falls through to the NORMAL case', cite: at(462) },
  RR_DMG_REACT_WIND_ARROW: { damage: true, to: allTo((f) => `damage${f}`), note: 'falls through to the NORMAL case', cite: at(465) },
  RR_DMG_REACT_SPRT_ARROW: { damage: true, to: allTo((f) => `damage${f}`), note: 'falls through to the NORMAL case', cite: at(468) },
  RR_DMG_REACT_FIRE: {
    damage: true,
    note: 'both fire rows deal 4, its whole health (line 194), so fire always kills; the red-flash stun it would start (line 497) is never lived through',
    cite: at(491),
  },
  RR_DMG_REACT_ICE: { damage: true, to: allTo((f) => `stunned${f}`), note: 'damage and a blue flash, then stunned', cite: at(514) },
  RR_DMG_REACT_LIGHT_MAGIC: { damage: true, to: allTo((f) => `stunned${f}`), note: 'damage and a gray flash, then stunned', cite: at(522) },
  RR_DMG_REACT_STUN: { damage: false, to: allTo((f) => `stunned${f}`), note: 'Boomerang and Hookshot stun under a blue flash', cite: at(527) },
}

export const enRr: ActorSpec = {
  overlay: 'ovl_En_Rr',
  name: 'Like Like',
  role: 'enemy',
  summary:
    'A tube that creeps at Link and swallows him on contact. It holds him for up to 100 frames, then spits him out with a large knockback that costs 8 health and eats his shield (unless it is the Mirror Shield) and his tunic (unless it is the Kokiri Tunic). Having eaten, it backs away after its next reach.',
  cite: at(187),
  pools: [{ id: 'body', label: 'Like Like', hp: { value: 4, cite: at(194) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'approach',
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnRr_Approach: 'approach*',
    EnRr_Reach: 'reach*',
    EnRr_GrabPlayer: {
      excluded:
        'the hold is folded into the swallow attack: grabPlayer leaves Link helpless and nothing else happens until the release steals and throws him (line 660); the grab has no AT source to carry its own attack, and one attack carries one effect, so the theft is carried and the up-to-100-frame hold is not',
      cite: at(659),
    },
    EnRr_Damage: 'damage*',
    EnRr_Stunned: 'stunned*',
    EnRr_Retreat: 'retreat',
    EnRr_Death: { excluded: 'death animation and drops after the finishing blow; the encounter has already ended', cite: at(685) },
  },
  atSources: {
    [at(349)]: 'swallow',
    [at(118)]: {
      excluded: "the body cylinder's base is AT_NONE and EnRr never calls CollisionCheck_SetAT, so this element never strikes; touching the body starts the swallow instead (line 533)",
      cite: at(111),
    },
    [at(137)]: {
      excluded: "the mouth cylinder's base is AT_NONE and EnRr never calls CollisionCheck_SetAT, so this element never strikes; touching the mouth starts the swallow instead (line 533)",
      cite: at(130),
    },
  },
  loadouts: [
    ...standardLoadouts(['child', 'adult']),
    { id: 'adult_tunic', age: 'adult', hearts: 2, gear: ['deku_nuts', 'master_sword', 'hylian_shield', 'goron_tunic'] },
  ],
  expected: {
    deadVerbs: {
      damage_timer_clears: 'the reel after a wound is left only when its timer runs out, since nothing can hit it then',
      damage_fed_timer_clears: 'as damage_timer_clears',
      link_hurt_overkill: 'the swallow costs 8 (4 with Double Defense), which divides the 2-heart bar, so it never costs more than Link has left',
      approach_wait_holds: 'far it creeps closer and near it can always swallow, so it always acts',
      ...Object.fromEntries(
        ['slash_giant', 'spin_giant', 'jump_giant', 'jump_giant_self'].map((k) => [
          `miss_${k}`,
          "a two-handed sword hit deals 4, the Like Like's whole health, so in the kit that carries one it never lives to reel from a wound, the only phase that ignores a hit",
        ]),
      ),
      ...Object.fromEntries(
        ['arrow_ice', 'arrow_light', 'spin_master', 'jump_master_self'].map((k) => [
          `hit_${k}__stunned`,
          'only the Boomerang and Hookshot stun without killing, and no kit that carries this attack (magic arrows, or magic spins) carries either',
        ]),
      ),
      body_empty_in_stunned_fed:
        'only an ice arrow both wounds it and leaves it stunned, and the one kit with ice arrows has the Mirror Shield and no tunic, so its Like Like never eats',
    },
  },
}
