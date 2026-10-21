import type { DmgType } from './inventory'

/** A decomp location, `path/relative/to/repo.c:line`, at the pinned commit. */
export type Cite = `${string}:${number}`

export interface Cited<T> {
  value: T
  cite: Cite
}

/** Why something in the inventory is not on the page. The cite shows the reason in the code. */
export interface Excluded {
  excluded: string
  cite: Cite
}

export const isExcluded = (x: object): x is Excluded => 'excluded' in x

export type Age = 'child' | 'adult'

/** Everything Link can carry or have that a combat rule reads. Each is a state in an encounter. */
export const GEAR = [
  'kokiri_sword', 'master_sword', 'giants_knife', 'biggoron_sword',
  'deku_shield', 'hylian_shield', 'mirror_shield',
  'kokiri_tunic', 'goron_tunic', 'zora_tunic',
  'deku_sticks', 'deku_nuts', 'slingshot', 'boomerang',
  'bow', 'fire_arrows', 'ice_arrows', 'light_arrows',
  'bombs', 'bombchus', 'hookshot', 'megaton_hammer',
  'dins_fire', 'nayrus_love', 'lens_of_truth',
  'double_defense', 'magic', 'double_magic',
  'fairy', 'red_potion', 'green_potion', 'blue_potion',
  'ocarina',
  'skull_mask', 'spooky_mask', 'keaton_mask', 'bunny_hood', 'gerudo_mask', 'mask_of_truth', 'goron_mask', 'zora_mask',
] as const
export type Gear = (typeof GEAR)[number]

/**
 * How Link reaches the enemy. `melee` needs the near range band, `ranged` works from either band.
 * `self` is centered on Link and connects with anything near.
 */
export type Reach = 'melee' | 'ranged' | 'self'

export interface LinkAttack {
  dmg: DmgType
  label: string
  ages: Age[]
  /** Every gear state listed must hold a mark. Alternatives (any of these swords) are separate attacks. */
  needs: Gear[]
  reach: Reach
  /** Magic units spent, in the decomp's magic unit. */
  magic?: Cited<number>
  /** Only possible where the room provides this, such as a light beam for the Mirror Shield. */
  room?: string
  /**
   * The attack's own collider damage, used when the target has no damage table
   * (`CollisionCheck_ApplyDamage`, src/code/z_collision_check.c:3090).
   */
  ownDamage: Cited<number>
  cite: Cite
}

/** `units` every `frames` frames. The generator turns it into a whole amount every so many beats. */
export type Rate = Cited<{ units: number; frames: number }>

/** A duration in frames. A random range is modeled by its mean. */
export type Frames = Cited<number | [number, number]>

/**
 * What a hit does to Link beyond lost health. Each kind is implemented once by the generator.
 * Burn, freeze, and shock durations belong to the player code, so they live in `LinkSpec.statusFrames`.
 */
export type Effect =
  | { kind: 'none' }
  | { kind: 'knockback' }
  | { kind: 'burn' }
  | { kind: 'freeze' }
  | { kind: 'shock' }
  | { kind: 'grab'; frames: Frames; damagePerBeat: number; release: 'escape' | 'carried_off' }
  | { kind: 'paralyze'; frames: Frames }
  | { kind: 'curse'; frames: Frames }
  | { kind: 'steal'; gear: Gear[] }
export type EffectKind = Effect['kind']

export interface LinkSpec {
  /** Health units per heart (`gSaveContext` health is 0x10 per heart). */
  healthPerHeart: Cited<number>
  /** Damage after Double Defense, applied to a negative health change. */
  doubleDefense: { rule: 'arithmetic-shift-right-1'; cite: Cite }
  magicMeter: { single: Cited<number>; double: Cited<number> }
  /** How long the player code keeps Link burning, frozen, or shocked, and what burning costs per beat. */
  statusFrames: { burn: Frames; freeze: Frames; shock: Frames }
  /** Health lost while burning or frozen, and magic the Lens of Truth drains while on. */
  burnDamage: Rate
  freezeDamage: Rate
  lensDrain: Rate
  /** How long Nayru's Love protects Link, and what casting it costs in magic units. */
  nayruFrames: Frames
  nayruMagic: Cited<number>
  /** Health restored when a bottled fairy revives Link at zero health. */
  fairyRevive: Cited<number>
  potions: { red: Cited<number>; green: Cited<number>; blue: { health: Cited<number>; magic: Cited<number> } }
  /** Every one of the 32 damage types: the attacks that emit it, or why the player never does. */
  attacks: Record<DmgType, LinkAttack[] | Excluded>
  /** Shield blocks: which shields stop which incoming attacks when raised, and which burn. */
  shields: { gear: Gear; ages: Age[]; cite: Cite; burnsOnFire: boolean }[]
  /** Every hit effect the player code implements, by `HIT_SPECIAL_EFFECT_*` name or actor-specific name. */
  hitEffects: Record<string, { implementedAs: EffectKind; cite: Cite } | Excluded>
  /** C7 items: every economy rule, with numbers, or excluded with a reason. */
  economy: Record<string, { note: string; cite: Cite } | Excluded>
  /** Songs or items whose effect on enemies the decomp shows, keyed by gear. */
  songs: Record<string, { note: string; cite: Cite } | Excluded>
}

export interface Loadout {
  id: string
  age: Age
  hearts: number
  gear: Gear[]
  /** Magic units Link arrives with, when less than a full meter. Small amounts keep the analysis small. */
  magic?: number
}

export type Role = 'enemy' | 'boss' | 'hazard' | 'projectile' | 'part'

/** A combat-relevant mode of an enemy's behavior: a group of action functions. */
export interface Phase {
  id: string
  label: string
  /** Damage types that can connect in this phase. Defaults to every type an AC element accepts. */
  hittable?: DmgType[] | 'none'
  /** Damage types that connect but are stopped by a guard (no damage, no reaction). */
  guards?: DmgType[]
  /** Which health pool hits in this phase drain. Defaults to the first pool. */
  pool?: string
  /** Hits in this phase that do something other than the damage table says. */
  overrides?: Partial<Record<DmgType, { damage: number; to?: string; cite: Cite }>>
  /** The enemy is out of Link's sight here: Link's attacks need the Lens of Truth to connect. */
  invisible?: boolean
  /** How long the phase's timer runs, in frames; steps marked `afterTimer` wait for it. A random range uses its mean. */
  frames?: Frames
  cite: Cite
}

/** One step the enemy can take from a phase in one beat. Steps out of one phase tie by chance at their weights. */
export interface Step {
  from: string
  to: string
  label: string
  weight?: number
  /** Only possible when Link is in this range band. */
  range?: 'near' | 'far'
  /** The enemy closes to near, or backs off to far, as part of this step. */
  move?: 'near' | 'far'
  /** The attack this step delivers. */
  attack?: string
  /** Only possible once the phase's timer has run out. */
  afterTimer?: boolean
  /** Only possible when Link has (or lacks) this gear, such as a mask he wears. */
  gear?: { gear: Gear; has: boolean }[]
  cite: Cite
}

export interface Attack {
  id: string
  label: string
  /** Health units, before Double Defense. */
  damage: number
  effect: Effect
  /** A raised shield stops it. */
  blockable: boolean
  /** Link dodging this beat avoids it. */
  dodgeable: boolean
  /** The collider element (from the inventory) or runtime `atDmgInfo` assignment this attack is. */
  source: Cite
}

/** How this actor's code reads a reaction value from its damage table. */
export interface Reaction {
  /** The damage in the table entry is applied. */
  damage: boolean
  /** The phase the hit sends the enemy to, `defeated`, or a map from the phase hit to the phase it goes to. Absent keeps the phase. */
  to?: string | Record<string, string>
  note: string
  cite: Cite
}

export interface Pool {
  id: string
  label: string
  hp: Cited<number>
  /** Where the enemy goes when the pool empties: another phase, or defeat. */
  then: string | 'defeated'
}

export interface ActorSpec {
  overlay: string
  name: string
  role: Role
  summary: string
  cite: Cite
  /** Empty when the actor cannot be killed by damage. */
  pools: Pool[]
  /**
   * `decomp`: hits use the actor's DamageTable from the inventory, read with `reactions`.
   * `own`: no table; hits deal the attack's own damage minus nothing (src/code/z_collision_check.c:3090).
   * `custom`: the actor computes damage in code; every connecting type is listed with its damage.
   * `none`: Link cannot hurt it.
   */
  damage:
    | { kind: 'decomp'; table: string; reactions: Record<string, Reaction> }
    | { kind: 'own' }
    | { kind: 'custom'; entries: Partial<Record<DmgType, { damage: number; to?: string; cite: Cite }>> }
    | { kind: 'none' }
  phases: Phase[]
  start: string
  /** Kinds of this actor set by its spawn params. The world picks one at even odds; each starts in its own phase. */
  variants?: { id: string; label: string; start: string; unseen?: boolean; cite: Cite }[]
  /** What the actor's room provides to Link's attacks, matched against `LinkAttack.room`. */
  room?: string[]
  /** Starting range band. */
  range: 'near' | 'far'
  steps: Step[]
  attacks: Attack[]
  /** C5: every action function the extractor found, mapped to a phase or excluded. */
  actionFuncs: Record<string, string | Excluded>
  /** C5 for actors that drive behavior without action functions: their state values, mapped. */
  states?: Record<string, { phase: string; cite: Cite } | Excluded>
  /** C6: every collider element with ATELEM_ON and every runtime atDmgInfo change, by cite, mapped to an attack or excluded. */
  atSources: Record<Cite, string | Excluded>
  /**
   * The kits Link can start the encounter with, one per setup choice. Keep each small: analysis
   * explores every kit, so the encounter's size is the sum of the kits. Together they cover every
   * gear that matters to this actor, for every age that meets it in the game.
   */
  loadouts: Loadout[]
  /** Checker warnings and dead verbs this design expects, with why. */
  expected?: { warnings?: Record<string, string>; deadVerbs?: Record<string, string> }
}

export type Disposition = ActorSpec | (Excluded & { overlay: string })
