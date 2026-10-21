import { WORLD, type Arc, type ArcKind, type Net, type State, type Verb } from '../../src/core/model'
import { DMG_TYPES, type Actor, type DmgType, type Inventory } from './inventory'
import {
  isExcluded,
  type ActorSpec,
  type Attack,
  type Effect,
  type Frames,
  type Gear,
  type LinkAttack,
  type LinkSpec,
  type Phase,
  type Rate,
  type Step,
} from './spec'

export const BEAT_FRAMES = 20
export const LINK = 'link'

export const beatsOf = (f: Frames) => {
  const v = f.value
  const mean = Array.isArray(v) ? (v[0] + v[1]) / 2 : v
  return Math.max(1, Math.round(mean / BEAT_FRAMES))
}
export const doubleDefense = (n: number) => Math.ceil(n / 2)
/** A rate as a whole amount every so many beats: [amount, beats], in lowest terms. */
export const beatRate = (r: Rate): [number, number] => {
  const num = r.value.units * BEAT_FRAMES
  const den = r.value.frames
  const g = gcd(num, den)
  return [num / g, den / g]
}
export const dmgBit = (d: DmgType) => 2 ** DMG_TYPES.indexOf(d)
const low = (d: DmgType) => d.toLowerCase()
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
const gcdAll = (xs: number[]) => xs.filter((x) => x > 0).reduce(gcd, 0) || 1

/** Priorities of the world's answers, highest first. One order for every encounter. */
const P = {
  timerCleanup: 99,
  heal: 98,
  refill: 97,
  drain: 96,
  overkill: 95,
  linkDrain: 94,
  linkOverkill: 93,
  poolEmpty: 92,
  revive: 90,
  fall: 89,
  hit: 80,
  tick: 71,
  ready: 70,
  step: 69,
  hold: 68,
  attack: 60,
  steal: 59,
  stance: 50,
  beatChain: 48,
  helpless: 40,
  variant: 30,
} as const

const STATUS = ['burn', 'freeze', 'shock', 'grab', 'paralyze', 'curse', 'nayru'] as const
type Status = (typeof STATUS)[number]
const HELPLESS: Status[] = ['freeze', 'shock', 'grab', 'paralyze']
const SWORDS: Gear[] = ['kokiri_sword', 'master_sword', 'giants_knife', 'biggoron_sword']

interface Built {
  net: Net
  /** Health units per mark of Link's health, and magic units per mark of magic. */
  healthUnit: number
  magicUnit: number
}

class NetBuilder {
  net: Net
  private columns = new Map<string, number>()
  constructor(title: string) {
    this.net = { title, seats: [{ id: LINK, name: 'Link', color: '#3a7d44' }], groups: [], states: [], verbs: [], arcs: [] }
  }
  private place(group: string) {
    if (!this.net.groups.some((g) => g.id === group)) this.net.groups.push({ id: group, label: group.replace(/_/g, ' ') })
    const col = this.net.groups.findIndex((g) => g.id === group)
    const row = this.columns.get(group) ?? 0
    this.columns.set(group, row + 1)
    return { x: 120 + col * 320 + (row % 2) * 140, y: 80 + Math.floor(row / 2) * 70 }
  }
  has(id: string) {
    return this.net.states.some((s) => s.id === id)
  }
  state(id: string, label: string, group: string, extra: Partial<State> = {}) {
    if (this.has(id)) throw new Error(`state ${id} twice`)
    this.net.states.push({ id, label, marks: 0, seenBy: 'all', group, ...this.place(group), ...extra })
    return id
  }
  ensure(id: string, label: string, group: string, extra: Partial<State> = {}) {
    return this.has(id) ? id : this.state(id, label, group, extra)
  }
  verb(id: string, label: string, by: string, group: string, priority: number, arcs: [ArcKind, string, number?][], weight = 1) {
    if (this.net.verbs.some((v) => v.id === id)) throw new Error(`verb ${id} twice`)
    const v: Verb = { id, label, by, priority: by === WORLD ? priority : 0, weight: by === WORLD ? weight : 1, group, ...this.place(group) }
    this.net.verbs.push(v)
    const merged = new Map<string, Arc>()
    for (const [kind, state, count = 1] of arcs) {
      if (count === 0) continue
      const k = `${kind}|${state}`
      const prev = merged.get(k)
      if (prev && kind === 'unless') prev.count = Math.min(prev.count, count)
      else if (prev) prev.count += count
      else merged.set(k, { kind, state, verb: id, count })
    }
    this.net.arcs.push(...merged.values())
  }
  done() {
    const ids = new Set(this.net.states.map((s) => s.id))
    for (const a of this.net.arcs) if (!ids.has(a.state)) throw new Error(`verb ${a.verb} ${a.kind}s unknown state ${a.state}`)
    return this.net
  }
}

const statusBeats = (link: LinkSpec, s: 'burn' | 'freeze' | 'shock') => beatsOf(link.statusFrames[s])

export const linkAttacks = (link: LinkSpec) =>
  DMG_TYPES.flatMap((d) => {
    const a = link.attacks[d]
    if (isExcluded(a)) return []
    return a.map((attack, i) => ({ id: a.length > 1 ? `${low(d)}_${i + 1}` : low(d), attack }))
  })

const usable = (a: LinkAttack, spec: ActorSpec) =>
  (!a.room || !!spec.room?.includes(a.room)) && spec.loadouts.some((lo) => a.ages.includes(lo.age) && a.needs.every((g) => lo.gear.includes(g)))

/** Damage types some AC element of the actor accepts: the default for what can connect. */
const accepted = (actor: Actor | undefined) => {
  const out = new Set<DmgType>()
  for (const e of actor?.elements ?? []) if (e.acOn) for (const d of DMG_TYPES) if ((e.acFlags >>> 0) & dmgBit(d)) out.add(d)
  return out
}

export interface HitRule {
  connects: boolean
  guarded: boolean
  damage: number
  to?: string
}

/** What a Link attack does to the enemy in one phase. The single place the damage rules are read. */
export const hitRule = (spec: ActorSpec, inv: Actor | undefined, phase: Phase, a: LinkAttack): HitRule => {
  const d = a.dmg
  const hittable = phase.hittable === 'none' ? new Set<DmgType>() : phase.hittable ? new Set(phase.hittable) : accepted(inv)
  if (spec.damage.kind === 'none' || !hittable.has(d)) return { connects: false, guarded: false, damage: 0 }
  if (phase.guards?.includes(d)) return { connects: true, guarded: true, damage: 0 }
  const over = phase.overrides?.[d]
  if (over) return { connects: true, guarded: false, damage: over.damage, to: over.to }
  switch (spec.damage.kind) {
    case 'own':
      return { connects: true, guarded: false, damage: a.ownDamage.value }
    case 'custom': {
      const e = spec.damage.entries[d]
      return { connects: true, guarded: false, damage: e?.damage ?? 0, to: e?.to }
    }
    case 'decomp': {
      const { table, reactions } = spec.damage
      const t = inv?.damageTables.find((x) => x.name === table)
      if (!t) throw new Error(`${spec.overlay}: no damage table ${table} in the inventory`)
      const entry = t.entries[DMG_TYPES.indexOf(d)]
      const r = reactions[entry.reaction]
      if (!r) throw new Error(`${spec.overlay}: reaction ${entry.reaction} (for ${d}) is not interpreted`)
      const to = typeof r.to === 'string' ? r.to : r.to?.[phase.id]
      return { connects: true, guarded: false, damage: r.damage ? entry.damage : 0, to }
    }
  }
}

export const NOTHING = 'nothing'
interface Effect_ {
  sig: string
  damage: number
  pool?: string
  to?: string
}
/** What a hit rule changes: damage to a pool and a phase change. Rules that change nothing are all the same. */
export const effectOf = (spec: ActorSpec, p: Phase, r: HitRule): Effect_ => {
  const pool = spec.pools.find((x) => x.id === (p.pool ?? spec.pools[0]?.id))?.id
  const damage = r.connects && !r.guarded && pool ? r.damage : 0
  const to = r.connects && !r.guarded ? r.to : undefined
  return damage ? { sig: `${pool}:${damage}`, damage, pool, to } : { sig: NOTHING, damage: 0, to }
}

/**
 * Attacks that resolve the same way share one swing state: same damage type, and for actors without a
 * table the same own damage, and the same reach where reach decides whether it lands.
 */
export const swingKey = (spec: ActorSpec, all: LinkAttack[], a: LinkAttack) => {
  const same = all.filter((x) => x.dmg === a.dmg)
  const own = spec.damage.kind === 'own' && new Set(same.map((x) => x.ownDamage.value)).size > 1 ? `_${a.ownDamage.value}` : ''
  const self = new Set(same.map((x) => x.reach === 'self')).size > 1 && a.reach === 'self' ? '_self' : ''
  return `${low(a.dmg)}${own}${self}`
}

const DMG_NAMES: Partial<Record<DmgType, string>> = {
  DEKU_NUT: 'Deku Nut flash', DEKU_STICK: 'Deku Stick', SLINGSHOT: 'Slingshot seed', EXPLOSIVE: 'Explosion', BOOMERANG: 'Boomerang',
  ARROW_NORMAL: 'Arrow', HAMMER_SWING: 'Hammer swing', HOOKSHOT: 'Hookshot', SLASH_KOKIRI: 'Kokiri Sword slash',
  SLASH_MASTER: 'Master Sword slash', SLASH_GIANT: 'Two-handed sword slash', ARROW_FIRE: 'Fire arrow', ARROW_ICE: 'Ice arrow',
  ARROW_LIGHT: 'Light arrow', MAGIC_FIRE: "Din's Fire", SHIELD: 'Shield', MIR_RAY: 'Reflected light', SPIN_KOKIRI: 'Kokiri spin attack',
  SPIN_GIANT: 'Two-handed spin attack', SPIN_MASTER: 'Master Sword spin attack', JUMP_KOKIRI: 'Kokiri jump attack',
  JUMP_GIANT: 'Two-handed jump attack', JUMP_MASTER: 'Master Sword jump attack', HAMMER_JUMP: 'Hammer jump attack',
}

const effectStatus = (e: Effect): Status | undefined =>
  e.kind === 'burn' || e.kind === 'freeze' || e.kind === 'shock' || e.kind === 'grab' || e.kind === 'paralyze' || e.kind === 'curse' ? e.kind : undefined

const effectBeats = (link: LinkSpec, e: Effect) =>
  e.kind === 'burn' || e.kind === 'freeze' || e.kind === 'shock' ? statusBeats(link, e.kind)
  : e.kind === 'grab' || e.kind === 'paralyze' || e.kind === 'curse' ? beatsOf(e.frames)
  : 0

/** Build one encounter: Link against one actor, from the spec, the Link spec, and the decomp inventory. */
export const encounter = (spec: ActorSpec, link: LinkSpec, inventory: Inventory): Built => {
  const inv = inventory.actors.find((a) => a.overlay === spec.overlay)
  const b = new NetBuilder(`Ocarina of Time combat: Link vs ${spec.name}`)
  const ages = [...new Set(spec.loadouts.map((lo) => lo.age))]
  if (!ages.length) throw new Error(`${spec.overlay}: no loadouts`)
  const phase = new Map(spec.phases.map((p) => [p.id, p]))
  const attackById = new Map(spec.attacks.map((a) => [a.id, a]))
  const needPhase = (id: string, where: string) => {
    if (id !== 'defeated' && !phase.has(id)) throw new Error(`${spec.overlay}: ${where} names unknown phase ${id}`)
  }
  for (const s of spec.steps) {
    needPhase(s.from, `step ${s.label}`)
    needPhase(s.to, `step ${s.label}`)
    if (s.attack && !attackById.has(s.attack)) throw new Error(`${spec.overlay}: step ${s.label} names unknown attack ${s.attack}`)
  }
  needPhase(spec.start, 'start')
  if (spec.damage.kind === 'decomp')
    for (const [k, r] of Object.entries(spec.damage.reactions))
      for (const t of typeof r.to === 'string' ? [r.to] : Object.entries(r.to ?? {}).flatMap(([f, t]) => (needPhase(f, `reaction ${k} source`), [t])))
        needPhase(t, `reaction ${k}`)
  if (spec.damage.kind === 'custom') for (const [d, e] of Object.entries(spec.damage.entries)) if (e?.to) needPhase(e.to, `custom ${d}`)
  for (const p of spec.phases) for (const [d, o] of Object.entries(p.overrides ?? {})) if (o?.to) needPhase(o.to, `override ${p.id} ${d}`)
  for (const v of spec.variants ?? []) needPhase(v.start, `variant ${v.id}`)
  for (const p of spec.pools) needPhase(p.then, `pool ${p.id}`)

  const gearAll = new Set(spec.loadouts.flatMap((lo) => lo.gear))
  const has = (g: Gear) => gearAll.has(g)
  const attacks = linkAttacks(link).filter(({ attack }) => usable(attack, spec))
  const hasMagic = has('magic')
  const maxHearts = Math.max(...spec.loadouts.map((lo) => lo.hearts))
  const maxHealth = maxHearts * link.healthPerHeart.value

  const enemyAttacks = spec.attacks
  /** Healing past a full bar is lost, so a heal larger than the bar is the bar. */
  const heal = (n: number) => Math.min(n, maxHealth)
  const healthDeltas = [
    maxHealth,
    ...spec.loadouts.map((lo) => lo.hearts * link.healthPerHeart.value),
    ...enemyAttacks.flatMap((a) => [a.damage, doubleDefense(a.damage)]),
    ...enemyAttacks.flatMap((a) => (a.effect.kind === 'grab' ? [a.effect.damagePerBeat, doubleDefense(a.effect.damagePerBeat)] : [])),
    ...(enemyAttacks.some((a) => a.effect.kind === 'burn') ? [beatRate(link.burnDamage)[0]] : []),
    ...(enemyAttacks.some((a) => a.effect.kind === 'freeze') ? [beatRate(link.freezeDamage)[0]] : []),
    ...(has('fairy') ? [heal(link.fairyRevive.value)] : []),
    ...(has('red_potion') ? [heal(link.potions.red.value)] : []),
    ...(has('blue_potion') ? [heal(link.potions.blue.health.value)] : []),
  ]
  const healthUnit = gcdAll(healthDeltas)
  const H = (n: number) => {
    if (n % healthUnit) throw new Error(`health ${n} is not a multiple of unit ${healthUnit}`)
    return n / healthUnit
  }
  const meter = has('double_magic') ? link.magicMeter.double.value : link.magicMeter.single.value
  const magicCosts = [
    ...attacks.map(({ attack }) => attack.magic?.value ?? 0),
    ...(has('nayrus_love') ? [link.nayruMagic.value] : []),
    ...(has('green_potion') ? [Math.min(link.potions.green.value, meter)] : []),
    ...(has('blue_potion') ? [Math.min(link.potions.blue.magic.value, meter)] : []),
    link.magicMeter.single.value,
  ]
  const magicUnit = hasMagic ? gcdAll([meter, ...magicCosts, ...(has('lens_of_truth') ? [beatRate(link.lensDrain)[0]] : [])]) : 1
  const M = (n: number) => {
    if (n % magicUnit) throw new Error(`magic ${n} is not a multiple of unit ${magicUnit}`)
    return n / magicUnit
  }

  b.state('choose_age', 'Link sets out', 'setup', { marks: 1 })
  for (const age of ages) b.state(`age_${age}`, `Link is a ${age}`, 'setup')
  if (spec.variants?.length) b.state('choose_variant', `Which ${spec.name}`, 'setup')
  const mayBeUnseen = !!spec.variants?.some((v) => v.unseen)
  if (mayBeUnseen) b.state('enemy_unseen', `${spec.name} is invisible without the Lens`, 'enemy')
  b.state('link_turn', "Link's move", 'beat')
  b.state('enemy_turn', `${spec.name} answers`, 'beat')
  b.state('enemy_act', `${spec.name} acts`, 'beat')
  b.state('beat_end', 'End of the beat', 'beat')
  b.state('range_near', 'Near', 'range')
  b.state('range_far', 'Far', 'range')
  b.state('link_hp', `Link's health (1 mark = ${healthUnit}/${link.healthPerHeart.value} heart)`, 'link_state')
  b.state('link_missing', "Link's lost health", 'link_state')
  b.state('link_dmg', 'Damage to Link', 'link_state')
  b.state('link_heal', 'Healing for Link', 'link_state')
  if (hasMagic) {
    b.state('magic', `Magic (1 mark = ${magicUnit} units)`, 'link_state')
    b.state('magic_spent', 'Magic spent', 'link_state')
    b.state('magic_refill', 'Magic coming back', 'link_state')
  }
  b.state('in_fight', 'The fight is on', 'setup')
  b.state('link_wins', `${spec.name} defeated`, 'outcomes', { ends: 'Link wins' })
  b.state('link_falls', 'Link falls', 'outcomes', { ends: 'Link falls' })
  b.state('link_withdraws', 'Link withdraws', 'outcomes', { ends: 'Link withdraws' })
  for (const g of gearAll) b.state(`has_${g}`, `Has ${g.replace(/_/g, ' ')}`, 'gear')

  const enter = (to: string): [ArcKind, string, number?][] => {
    if (to === 'defeated') return [['give', 'link_wins']]
    const p = phase.get(to)!
    return [['give', `phase_${to}`], ...(p.frames ? ([['give', `timer_${to}`, beatsOf(p.frames)]] as [ArcKind, string, number][]) : [])]
  }
  /** Leave `from` for `to`; a phase re-entering itself keeps its timer running. */
  const move = (from: string, to: string): [ArcKind, string, number?][] =>
    from === to ? [['need', `phase_${from}`]] : [['take', `phase_${from}`], ...enter(to)]

  for (const p of spec.phases) {
    b.state(`phase_${p.id}`, p.label, 'enemy', p.invisible ? {} : {})
    if (p.frames) {
      b.state(`timer_${p.id}`, `${p.label}: beats left`, 'enemy')
      b.verb(`${p.id}_timer_clears`, `${p.label} is over`, WORLD, 'enemy', P.timerCleanup, [['take', `timer_${p.id}`], ['unless', `phase_${p.id}`]])
    }
  }
  for (const pool of spec.pools) {
    b.state(`hp_${pool.id}`, `${pool.label}: health`, 'enemy_health', { marks: pool.hp.value })
    b.state(`alive_${pool.id}`, `${pool.label}: standing`, 'enemy_health', { marks: 1 })
    b.state(`dmg_${pool.id}`, `${pool.label}: damage`, 'enemy_health')
  }

  const startArcs = (): [ArcKind, string, number?][] =>
    spec.variants?.length ? [['give', 'choose_variant']] : [...enter(spec.start), ['give', `range_${spec.range}`], ['give', 'link_turn']]
  for (const lo of spec.loadouts) {
    const hp = lo.hearts * link.healthPerHeart.value
    b.verb(`fight_${lo.id}`, `Fight as ${lo.age} Link: ${lo.id.replace(/_/g, ' ')} (${lo.hearts} hearts)`, LINK, 'setup', 0, [
      ['take', 'choose_age'],
      ['give', `age_${lo.age}`],
      ['give', 'link_hp', H(hp)],
      ['give', 'link_missing', H(maxHealth - hp)],
      ['give', 'in_fight'],
      ...lo.gear.map((g): [ArcKind, string] => ['give', `has_${g}`]),
      ...(hasMagic && lo.gear.includes('magic') ? ([['give', 'magic', M(lo.gear.includes('double_magic') ? link.magicMeter.double.value : link.magicMeter.single.value)], ['give', 'magic_spent', M(meter - (lo.gear.includes('double_magic') ? link.magicMeter.double.value : link.magicMeter.single.value))]] as [ArcKind, string, number][]) : []),
      ...startArcs(),
    ])
  }
  for (const v of spec.variants ?? [])
    b.verb(`variant_${v.id}`, v.label, WORLD, 'setup', P.variant, [
      ['take', 'choose_variant'], ...enter(v.start), ['give', `range_${spec.range}`], ['give', 'link_turn'],
      ...(v.unseen ? ([['give', 'enemy_unseen']] as [ArcKind, string][]) : []),
    ])

  const statuses = new Set<Status>()
  for (const a of enemyAttacks) {
    const s = effectStatus(a.effect)
    if (s) statuses.add(s)
  }
  if (has('nayrus_love')) statuses.add('nayru')
  for (const s of statuses) b.state(`status_${s}`, `Link: ${s} (beats left)`, 'link_state')
  if (has('lens_of_truth')) b.state('lens_on', 'Lens of Truth on', 'link_state')
  b.state('link_guard', 'Link holds up his shield', 'link_state')
  b.state('link_dodge', 'Link dodges', 'link_state')

  b.verb('link_heals', 'Link heals', WORLD, 'link_state', P.heal, [['take', 'link_heal'], ['take', 'link_missing'], ['give', 'link_hp']])
  b.verb('link_heal_overflows', 'Link is at full health', WORLD, 'link_state', P.heal, [['take', 'link_heal'], ['unless', 'link_missing']])
  if (hasMagic) {
    b.verb('magic_refills', 'Magic refills', WORLD, 'link_state', P.refill, [['take', 'magic_refill'], ['take', 'magic_spent'], ['give', 'magic']])
    b.verb('magic_refill_overflows', 'Magic is full', WORLD, 'link_state', P.refill, [['take', 'magic_refill'], ['unless', 'magic_spent']])
  }
  b.verb('link_hurt', 'Link loses health', WORLD, 'link_state', P.linkDrain, [['take', 'link_dmg'], ['take', 'link_hp'], ['give', 'link_missing']])
  b.verb('link_hurt_overkill', 'Link has no health left to lose', WORLD, 'link_state', P.linkOverkill, [['take', 'link_dmg'], ['unless', 'link_hp']])
  if (has('fairy'))
    b.verb('fairy_revives_link', 'A bottled fairy revives Link', WORLD, 'link_state', P.revive, [['need', 'in_fight'], ['unless', 'link_hp'], ['take', 'has_fairy'], ['give', 'link_heal', H(heal(link.fairyRevive.value))]])
  b.verb('link_fell', 'Link falls', WORLD, 'outcomes', P.fall, [['need', 'in_fight'], ['unless', 'link_hp'], ...(has('fairy') ? ([['unless', 'has_fairy']] as [ArcKind, string][]) : []), ['give', 'link_falls']])

  for (const pool of spec.pools) {
    b.verb(`${pool.id}_hurt`, `${pool.label} loses health`, WORLD, 'enemy_health', P.drain, [['take', `dmg_${pool.id}`], ['take', `hp_${pool.id}`]])
    b.verb(`${pool.id}_overkill`, `${pool.label} has no health left to lose`, WORLD, 'enemy_health', P.overkill, [['take', `dmg_${pool.id}`], ['unless', `hp_${pool.id}`]])
    for (const p of spec.phases)
      b.verb(`${pool.id}_empty_in_${p.id}`, `${pool.label} runs out (${p.label})`, WORLD, 'enemy_health', P.poolEmpty, [
        ['unless', `hp_${pool.id}`], ['take', `alive_${pool.id}`], ...move(p.id, pool.then),
      ])
  }

  const spend = (n: number): [ArcKind, string, number?][] => (n && hasMagic ? [['take', 'magic', M(n)], ['give', 'magic_spent', M(n)]] : [])
  const ageArcs = (a: LinkAttack): [ArcKind, string][][] => a.ages.filter((age) => ages.includes(age)).map((age) => [['need', `age_${age}`]])
  const ready = (): [ArcKind, string, number?][] => [
    ['take', 'link_turn'],
    ...[...statuses].filter((s) => HELPLESS.includes(s)).map((s): [ArcKind, string] => ['unless', `status_${s}`]),
  ]
  const swingOf = new Map<string, string>()
  const swings = new Map<string, LinkAttack>()
  for (const { id, attack } of attacks) {
    const key = swingKey(spec, attacks.map((x) => x.attack), attack)
    swingOf.set(id, key)
    if (!swings.has(key)) swings.set(key, attack)
  }
  for (const { id, attack } of attacks) {
    const sword = attack.needs.some((g) => SWORDS.includes(g))
    for (const [k, ageArc] of ageArcs(attack).entries())
      b.verb(`link_${id}${ageArcs(attack).length > 1 ? `_${k + 1}` : ''}`, attack.label, LINK, 'link_moves', 0, [
        ...ready(),
        ...ageArc,
        ...attack.needs.map((g): [ArcKind, string] => ['need', `has_${g}`]),
        ...(attack.reach === 'melee' ? ([['need', 'range_near']] as [ArcKind, string][]) : []),
        ...spend(attack.magic?.value ?? 0),
        ...(sword && statuses.has('curse') ? ([['unless', 'status_curse']] as [ArcKind, string][]) : []),
        ['give', `swing_${swingOf.get(id)}`],
        ['give', 'enemy_turn'],
      ])
  }
  const lensOk = has('lens_of_truth')
  for (const [key, rep] of swings) {
    const name = DMG_NAMES[rep.dmg] ?? rep.label
    b.state(`swing_${key}`, `${name} on its way`, 'hits')
    const swing: [ArcKind, string] = ['take', `swing_${key}`]
    const effects = spec.phases.map((p) => ({ p, e: effectOf(spec, p, hitRule(spec, inv, p, rep)) }))
    const counts = new Map<string, number>()
    for (const { e } of effects) if (!e.to) counts.set(e.sig, (counts.get(e.sig) ?? 0) + 1)
    const fallback = [...counts].sort((a, b) => b[1] - a[1] || (a[0] === NOTHING ? -1 : b[0] === NOTHING ? 1 : 0))[0]?.[0] ?? NOTHING
    const dmgArcs = (e: Effect_): [ArcKind, string, number?][] => (e.pool ? [['give', `dmg_${e.pool}`, e.damage]] : [])
    const fallbackEffect = effects.find(({ e }) => e.sig === fallback)?.e ?? { sig: NOTHING, damage: 0 }
    b.verb(fallback === NOTHING ? `miss_${key}` : `hit_${key}`, `${name} ${fallback === NOTHING ? 'has no effect' : 'hits'}`, WORLD, 'hits', P.hit - 1, [swing, ...dmgArcs(fallbackEffect)])
    for (const { p, e } of effects) {
      if (e.sig === fallback && !e.to) continue
      const nothing = e.sig === NOTHING && !e.to
      b.verb(`${nothing ? 'miss' : 'hit'}_${key}__${p.id}`, `${name} ${nothing ? 'has no effect' : 'hits'} (${p.label})`, WORLD, 'hits', P.hit, [
        swing, ...(e.to ? move(p.id, e.to) : ([['need', `phase_${p.id}`]] as [ArcKind, string][])), ...dmgArcs(e),
      ])
    }
    if (rep.reach === 'self') b.verb(`miss_${key}_far`, `${name} misses: too far`, WORLD, 'hits', P.hit + 1, [swing, ['need', 'range_far']])
    if (mayBeUnseen)
      b.verb(`unseen_${key}`, `${name} misses: the enemy is unseen`, WORLD, 'hits', P.hit + 1, [swing, ['need', 'enemy_unseen'], ...(lensOk ? ([['unless', 'lens_on']] as [ArcKind, string][]) : [])])
    for (const p of spec.phases.filter((x) => x.invisible))
      b.verb(`unseen_${key}__${p.id}`, `${name} misses: unseen (${p.label})`, WORLD, 'hits', P.hit + 1, [swing, ['need', `phase_${p.id}`], ...(lensOk ? ([['unless', 'lens_on']] as [ArcKind, string][]) : [])])
  }

  const shields = link.shields.filter((s) => has(s.gear))
  for (const s of shields) b.state(`guard_with_${s.gear}`, `Shield up: ${s.gear.replace(/_/g, ' ')}`, 'link_state')
  for (const s of shields)
    for (const age of s.ages.filter((a) => ages.includes(a)))
      b.verb(`link_guards_${s.gear}${s.ages.length > 1 ? `_${age}` : ''}`, `Link raises the ${s.gear.replace(/_/g, ' ')}`, LINK, 'link_moves', 0, [
        ...ready(), ['need', `age_${age}`], ['need', `has_${s.gear}`], ['give', 'link_guard'], ['give', `guard_with_${s.gear}`], ['give', 'enemy_turn'],
      ])
  b.verb('link_dodges', 'Link backflips or sidehops', LINK, 'link_moves', 0, [...ready(), ['give', 'link_dodge'], ['give', 'enemy_turn']])
  b.verb('link_closes_in', 'Link closes in', LINK, 'link_moves', 0, [...ready(), ['take', 'range_far'], ['give', 'range_near'], ['give', 'enemy_turn']])
  b.verb('link_backs_off', 'Link backs off', LINK, 'link_moves', 0, [...ready(), ['take', 'range_near'], ['give', 'range_far'], ['give', 'enemy_turn']])
  b.verb('link_leaves', 'Link leaves the fight', LINK, 'link_moves', 0, [...ready(), ['need', 'range_far'], ['give', 'link_withdraws']])
  const potion = (g: Gear, label: string, health: number, magic: number) => {
    if (!has(g)) return
    b.verb(`link_drinks_${g}`, label, LINK, 'link_moves', 0, [
      ...ready(), ['take', `has_${g}`],
      ...(health ? ([['give', 'link_heal', H(heal(health))]] as [ArcKind, string, number][]) : []),
      ...(magic && hasMagic ? ([['give', 'magic_refill', M(Math.min(magic, meter))]] as [ArcKind, string, number][]) : []),
      ['give', 'enemy_turn'],
    ])
  }
  potion('red_potion', 'Link drinks a red potion', link.potions.red.value, 0)
  potion('green_potion', 'Link drinks a green potion', 0, link.potions.green.value)
  potion('blue_potion', 'Link drinks a blue potion', link.potions.blue.health.value, link.potions.blue.magic.value)
  if (has('nayrus_love') && hasMagic)
    b.verb('link_casts_nayrus_love', "Link casts Nayru's Love", LINK, 'link_moves', 0, [
      ...ready(), ['need', 'has_nayrus_love'], ['unless', 'status_nayru'], ...spend(link.nayruMagic.value),
      ['give', 'status_nayru', beatsOf(link.nayruFrames)], ['give', 'enemy_turn'],
    ])
  if (has('lens_of_truth') && hasMagic) {
    b.verb('link_lens_on', 'Link looks through the Lens of Truth', LINK, 'link_moves', 0, [['take', 'link_turn'], ['unless', 'lens_on'], ['need', 'has_lens_of_truth'], ['need', 'magic', M(beatRate(link.lensDrain)[0])], ['give', 'lens_on'], ['give', 'link_turn']])
    b.verb('link_lens_off', 'Link puts the Lens away', LINK, 'link_moves', 0, [['take', 'link_turn'], ['take', 'lens_on'], ['give', 'link_turn']])
  }

  b.verb('enemy_ready', `${spec.name} gets ready`, WORLD, 'enemy', P.ready, [['take', 'enemy_turn'], ['give', 'enemy_act']])
  for (const p of spec.phases) {
    if (p.frames)
      b.verb(`${p.id}_ticks`, `${p.label}: a beat passes`, WORLD, 'enemy', P.tick, [['take', 'enemy_turn'], ['need', `phase_${p.id}`], ['take', `timer_${p.id}`], ['give', 'enemy_act']])
    const out = spec.steps.filter((s) => s.from === p.id)
    out.forEach((s, i) => stepVerbs(s, i))
    const unconditional = out.some((s) => !s.range && !s.afterTimer)
    if (!unconditional) b.verb(`${p.id}_holds`, `${p.label}: nothing changes`, WORLD, 'enemy', P.hold, [['take', 'enemy_act'], ['need', `phase_${p.id}`], ['give', 'beat_end']])
  }
  function stepVerbs(s: Step, i: number) {
    const base: [ArcKind, string, number?][] = [
      ['take', 'enemy_act'],
      ...move(s.from, s.to),
      ...(s.afterTimer ? ([['unless', `timer_${s.from}`]] as [ArcKind, string][]) : []),
      ...(s.attack ? ([['give', `incoming_${s.attack}`]] as [ArcKind, string][]) : []),
      ['give', 'beat_end'],
    ]
    const gearArcs: [ArcKind, string][] = []
    for (const g of s.gear ?? []) {
      if (g.has && !has(g.gear)) return
      if (has(g.gear)) gearArcs.push([g.has ? 'need' : 'unless', `has_${g.gear}`])
    }
    base.push(...gearArcs)
    const id = `${s.from}_step_${i + 1}`
    const ranges: ('near' | 'far' | undefined)[] = s.range ? [s.range] : s.move ? ['near', 'far'] : [undefined]
    for (const r of ranges) {
      const rangeArcs: [ArcKind, string][] = []
      if (r && s.move && s.move !== r) rangeArcs.push(['take', `range_${r}`], ['give', `range_${s.move}`])
      else if (r) rangeArcs.push(['need', `range_${r}`])
      b.verb(ranges.length > 1 ? `${id}_${r}` : id, s.label, WORLD, 'enemy', P.step, [...base, ...rangeArcs], s.weight ?? 1)
    }
  }

  for (const a of enemyAttacks) attackVerbs(a)
  function attackVerbs(a: Attack) {
    b.state(`incoming_${a.id}`, `${a.label} incoming`, 'attacks')
    const inc: [ArcKind, string] = ['take', `incoming_${a.id}`]
    if (a.blockable)
      for (const s of shields) {
        const burns = a.effect.kind === 'burn' && s.burnsOnFire
        b.verb(`${a.id}_blocked_${s.gear}`, `${a.label}: blocked by the ${s.gear.replace(/_/g, ' ')}${burns ? ', which burns' : ''}`, WORLD, 'attacks', P.attack, [
          inc, ['need', `guard_with_${s.gear}`], ...(burns ? ([['take', `has_${s.gear}`]] as [ArcKind, string][]) : []),
        ])
      }
    if (a.dodgeable) b.verb(`${a.id}_dodged`, `${a.label}: dodged`, WORLD, 'attacks', P.attack, [inc, ['need', 'link_dodge'], ...(a.blockable ? ([['unless', 'link_guard']] as [ArcKind, string][]) : [])])
    if (statuses.has('nayru'))
      b.verb(`${a.id}_nayru`, `${a.label}: Nayru's Love holds`, WORLD, 'attacks', P.attack, [
        inc, ['need', 'status_nayru'],
        ...(a.blockable ? ([['unless', 'link_guard']] as [ArcKind, string][]) : []),
        ...(a.dodgeable ? ([['unless', 'link_dodge']] as [ArcKind, string][]) : []),
      ])
    const open: [ArcKind, string][] = [
      inc,
      ...(a.blockable ? ([['unless', 'link_guard']] as [ArcKind, string][]) : []),
      ...(a.dodgeable ? ([['unless', 'link_dodge']] as [ArcKind, string][]) : []),
      ...(statuses.has('nayru') ? ([['unless', 'status_nayru']] as [ArcKind, string][]) : []),
    ]
    const st = effectStatus(a.effect)
    const effectArcs: [ArcKind, string, number?][] = []
    if (st) effectArcs.push(['give', `status_${st}`, effectBeats(link, a.effect)])
    if (a.effect.kind === 'steal') effectArcs.push(['give', `steal_${a.id}`])
    if (a.effect.kind === 'grab' && a.effect.release === 'carried_off') effectArcs.push(['give', `carried_${a.id}`])
    const dd = has('double_defense')
    const variants: [string, number, [ArcKind, string][]][] = dd
      ? [['lands', a.damage, [['unless', 'has_double_defense']]], ['lands_dd', doubleDefense(a.damage), [['need', 'has_double_defense']]]]
      : [['lands', a.damage, []]]
    const knock = a.effect.kind === 'knockback'
    for (const [suffix, dmg, ddArcs] of variants) {
      const arcs: [ArcKind, string, number?][] = [...open, ...ddArcs, ['give', 'link_dmg', H(dmg)], ...effectArcs]
      if (st) arcs.push(['unless', `status_${st}`])
      if (knock) {
        b.verb(`${a.id}_${suffix}_near`, `${a.label} hits Link, knocking him back`, WORLD, 'attacks', P.attack, [...arcs, ['take', 'range_near'], ['give', 'range_far']])
        b.verb(`${a.id}_${suffix}_far`, `${a.label} hits Link`, WORLD, 'attacks', P.attack, [...arcs, ['need', 'range_far']])
      } else b.verb(`${a.id}_${suffix}`, `${a.label} hits Link`, WORLD, 'attacks', P.attack, arcs)
      if (st)
        b.verb(`${a.id}_${suffix}_again`, `${a.label} hits Link again`, WORLD, 'attacks', P.attack, [...open, ...ddArcs, ['give', 'link_dmg', H(dmg)], ['need', `status_${st}`]])
    }
    if (a.effect.kind === 'steal') {
      b.state(`steal_${a.id}`, `${a.label}: taking gear`, 'attacks')
      const order = a.effect.gear.filter(has)
      order.forEach((g, i) =>
        b.verb(`${a.id}_takes_${g}`, `${a.label} takes the ${g.replace(/_/g, ' ')}`, WORLD, 'attacks', P.steal + order.length - i, [['take', `steal_${a.id}`], ['take', `has_${g}`]]),
      )
      b.verb(`${a.id}_takes_nothing`, `${a.label} finds nothing to take`, WORLD, 'attacks', P.steal, [['take', `steal_${a.id}`], ...order.map((g): [ArcKind, string] => ['unless', `has_${g}`])])
    }
    if (a.effect.kind === 'grab' && a.effect.release === 'carried_off') {
      b.state(`carried_${a.id}`, `${a.label}: Link held`, 'attacks')
      b.ensure('link_carried_off', 'Link is carried off', 'outcomes', { ends: 'Link is carried off' })
      b.verb(`${a.id}_carries_link_off`, `${a.label} carries Link off`, WORLD, 'attacks', P.stance, [['need', `carried_${a.id}`], ['unless', 'status_grab'], ['take', `carried_${a.id}`], ['give', 'link_carried_off']])
    }
  }

  b.verb('link_lowers_shield', 'Link lowers his shield', WORLD, 'beat', P.stance, [['need', 'beat_end'], ['take', 'link_guard']])
  for (const s of shields) b.verb(`link_lowers_${s.gear}`, `Link lowers the ${s.gear.replace(/_/g, ' ')}`, WORLD, 'beat', P.stance, [['need', 'beat_end'], ['take', `guard_with_${s.gear}`]])
  b.verb('link_lands', 'Link lands from his dodge', WORLD, 'beat', P.stance, [['need', 'beat_end'], ['take', 'link_dodge']])

  const grabRates = new Set(enemyAttacks.flatMap((a) => (a.effect.kind === 'grab' ? [a.effect.damagePerBeat] : [])))
  if (grabRates.size > 1) throw new Error(`${spec.overlay}: grabs with different damage per beat`)
  const perBeat = (s: Status): [number, number] =>
    s === 'burn' ? beatRate(link.burnDamage) : s === 'freeze' ? beatRate(link.freezeDamage) : s === 'grab' ? [[...grabRates][0] ?? 0, 1] : [0, 1]
  const chain = [...statuses, ...(has('lens_of_truth') && hasMagic ? (['lens'] as const) : [])]
  const link_ = (i: number) => (i === 0 ? 'beat_end' : i === chain.length ? 'link_turn' : `tick_${chain[i - 1]}`)
  chain.forEach((s, i) => {
    if (i < chain.length - 1) b.state(`tick_${s}`, `Beat ends: ${s} checked`, 'beat')
  })
  if (!chain.length) b.verb('beat_passes', 'The beat passes', WORLD, 'beat', P.beatChain, [['take', 'beat_end'], ['give', 'link_turn']])
  /** A cost of p every q beats: a counter that runs to q - 1, then pays and starts over. */
  const periodic = (id: string, label: string, pr: number, from: string, to: string, on: [ArcKind, string, number?][], [p, q]: [number, number], pay: (n: number) => [ArcKind, string, number?][]) => {
    if (!p) {
      b.verb(`${id}_ticks`, `${label} wears on`, WORLD, 'beat', pr, [['take', from], ...on, ['give', to]])
      return
    }
    if (q === 1) {
      b.verb(`${id}_ticks`, `${label} wears on`, WORLD, 'beat', pr, [['take', from], ...on, ['give', to], ...pay(p)])
      return
    }
    b.state(`${id}_count`, `${label}: beats toward the next cost`, 'beat')
    b.verb(`${id}_ticks`, `${label} wears on`, WORLD, 'beat', pr, [['take', from], ...on, ['unless', `${id}_count`, q - 1], ['give', `${id}_count`], ['give', to]])
    b.verb(`${id}_costs`, `${label} takes its toll`, WORLD, 'beat', pr, [['take', from], ...on, ['take', `${id}_count`, q - 1], ['give', to], ...pay(p)])
  }
  chain.forEach((s, i) => {
    const from = link_(i)
    const to = link_(i + 1)
    const pr = P.beatChain - i
    if (s === 'lens') {
      const [p, q] = beatRate(link.lensDrain)
      periodic('lens', 'The Lens', pr, from, to, [['need', 'lens_on'], ['need', 'magic', M(p)]], [p, q], spend)
      b.verb('lens_fades', 'The Lens runs out of magic', WORLD, 'beat', pr, [['take', from], ['take', 'lens_on'], ['unless', 'magic', M(p)], ['give', to]])
      b.verb('lens_idle', 'The Lens is off', WORLD, 'beat', pr, [['take', from], ['unless', 'lens_on'], ['give', to]])
      if (q > 1) b.verb('lens_count_clears', 'The Lens count resets', WORLD, 'beat', P.timerCleanup, [['take', 'lens_count'], ['unless', 'lens_on']])
      return
    }
    const rate = perBeat(s)
    periodic(s, `Link: ${s}`, pr, from, to, [['take', `status_${s}`]], rate, (n) => [['give', 'link_dmg', H(n)]])
    if (rate[1] > 1) b.verb(`${s}_count_clears`, `Link: ${s} count resets`, WORLD, 'beat', P.timerCleanup, [['take', `${s}_count`], ['unless', `status_${s}`]])
    b.verb(`${s}_idle`, `Link: no ${s}`, WORLD, 'beat', pr, [['take', from], ['unless', `status_${s}`], ['give', to]])
  })

  for (const s of [...statuses].filter((x) => HELPLESS.includes(x)))
    b.verb(`link_helpless_${s}`, `Link cannot act: ${s}`, WORLD, 'beat', P.helpless, [['take', 'link_turn'], ['need', `status_${s}`], ['give', 'enemy_turn']])

  return { net: b.done(), healthUnit, magicUnit }
}
