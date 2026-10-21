import { readFileSync } from 'node:fs'
import { parse } from '../../src/core/text'
import { dispositions, encounterFile, modeled, OUT } from './build'
import { link } from './data/link'
import { linkAttacks, swingKey } from './gen'
import { DMG_TYPES, type Inventory } from './inventory'
import { isExcluded, type ActorSpec, type Cite, type Gear } from './spec'

/** CONTRACT item 4, as gear: each must be read by an attack, a shield, a Link spec field, or an economy entry. */
export const CONTRACT_GEAR: Gear[] = [
  'kokiri_sword', 'master_sword', 'giants_knife', 'biggoron_sword', 'deku_shield', 'hylian_shield', 'mirror_shield',
  'kokiri_tunic', 'goron_tunic', 'zora_tunic', 'deku_sticks', 'deku_nuts', 'slingshot', 'bow', 'fire_arrows', 'ice_arrows',
  'light_arrows', 'bombs', 'bombchus', 'boomerang', 'hookshot', 'megaton_hammer', 'dins_fire', 'nayrus_love', 'lens_of_truth',
  'double_defense', 'magic', 'fairy', 'red_potion', 'green_potion', 'blue_potion', 'ocarina',
]
export const FIELD_GEAR: Partial<Record<Gear, keyof typeof link>> = {
  double_defense: 'doubleDefense', magic: 'magicMeter', fairy: 'fairyRevive', red_potion: 'potions', green_potion: 'potions',
  blue_potion: 'potions', nayrus_love: 'nayruMagic', lens_of_truth: 'lensDrain', ocarina: 'songs',
}
export const HIT_SPECIAL_EFFECTS = ['NONE', 'FIRE', 'ICE', 'ELECTRIC', 'KNOCKBACK', '7', '8', '9']

/** A state or verb in a generated encounter file, or a field of the Link spec when the item lives only there. */
export type Pointer = { file: string; id: string } | { linkSpec: string }
export type Entry =
  | { item: string; disposition: 'modeled'; at: Pointer[] }
  | { item: string; disposition: 'excluded'; reason: string; cite?: string }
  | { item: string; disposition: 'missing' }

const files = new Map<string, Set<string>>()
const idsInFile = (f: string) => {
  if (!files.has(f)) {
    const net = parse(readFileSync(new URL(`encounters/${f}`, OUT), 'utf8'))
    files.set(f, new Set([...net.states.map((s) => s.id), ...net.verbs.map((v) => v.id)]))
  }
  return files.get(f)!
}
const idsIn = (spec: ActorSpec) => ({ f: encounterFile(spec.overlay), ids: idsInFile(encounterFile(spec.overlay)) })
/** Every pointer to `id` across the modeled encounters, at most a few, so the ledger stays readable. */
const findAll = (ids: (spec: ActorSpec) => string[], cap = 3): Pointer[] => {
  const out: Pointer[] = []
  for (const s of modeled()) {
    const { f, ids: have } = idsIn(s)
    for (const id of ids(s)) if (have.has(id) && out.length < cap) out.push({ file: f, id })
  }
  return out
}
const modeledOrMissing = (item: string, at: Pointer[]): Entry => (at.length ? { item, disposition: 'modeled', at } : { item, disposition: 'missing' })
const fromExcluded = (item: string, x: { excluded: string; cite?: string }): Entry => ({ item, disposition: 'excluded', reason: x.excluded, cite: x.cite })

export const buildLedger = (inv: Inventory) => {
  const byOverlay = new Map(dispositions.map((d) => [d.overlay, d]))
  const all = linkAttacks(link).map((x) => x.attack)

  const actors = inv.actors.map((a): Entry => {
    const d = byOverlay.get(a.overlay)
    if (!d) return { item: a.overlay, disposition: 'missing' }
    if (isExcluded(d)) return fromExcluded(a.overlay, d)
    return { item: a.overlay, disposition: 'modeled', at: [{ file: encounterFile(a.overlay), id: 'choose_age' }] }
  })

  const dmgTypes = DMG_TYPES.map((dmg): Entry => {
    const a = link.attacks[dmg]
    if (!a) return { item: `DMG_${dmg}`, disposition: 'missing' }
    if (isExcluded(a)) return fromExcluded(`DMG_${dmg}`, a)
    return modeledOrMissing(`DMG_${dmg}`, findAll((s) => all.filter((x) => x.dmg === dmg).map((x) => `swing_${swingKey(s, all, x)}`), 1))
  })

  const hitEffects = HIT_SPECIAL_EFFECTS.map((e): Entry => {
    const h = link.hitEffects[`HIT_SPECIAL_EFFECT_${e}`]
    const item = `HIT_SPECIAL_EFFECT_${e}`
    if (!h) return { item, disposition: 'missing' }
    if (isExcluded(h)) return fromExcluded(item, h)
    const used = findAll((s) => s.attacks.filter((a) => a.effect.kind === h.implementedAs).map((a) => `incoming_${a.id}`), 1)
    return { item, disposition: 'modeled', at: used.length ? used : [{ linkSpec: `hitEffects.${item}` }] }
  })

  const perActor = modeled().flatMap((s) => {
    const ia = inv.actors.find((a) => a.overlay === s.overlay)!
    const f = encounterFile(s.overlay)
    const phaseIds = (ref: string) => s.phases.filter((p) => (ref.endsWith('*') ? p.id.startsWith(ref.slice(0, -1)) : p.id === ref)).map((p) => `phase_${p.id}`)
    const tables = ia.damageTables.map((t): Entry => {
      const item = `${s.overlay}.${t.name}`
      if (s.damage.kind !== 'decomp') return { item, disposition: 'missing' }
      const unused = s.damage.unusedTables?.[t.name]
      if (unused) return fromExcluded(item, unused)
      const def = s.damage.table
      const inForce = s.phases.filter((p) => (p.table ?? def) === t.name)
      return modeledOrMissing(item, inForce.length ? [{ file: f, id: `phase_${inForce[0].id}` }] : [])
    })
    const funcs = [...new Set(ia.actionFuncs)].map((fn): Entry => {
      const item = `${s.overlay}.${fn}`
      const v = s.actionFuncs[fn]
      if (v === undefined) return { item, disposition: 'missing' }
      if (typeof v !== 'string') return fromExcluded(item, v)
      return modeledOrMissing(item, phaseIds(v).slice(0, 3).map((id) => ({ file: f, id })))
    })
    const states = Object.entries(s.states ?? {}).map(([k, v]): Entry =>
      isExcluded(v) ? fromExcluded(`${s.overlay}.${k}`, v) : modeledOrMissing(`${s.overlay}.${k}`, phaseIds(v.phase).slice(0, 3).map((id) => ({ file: f, id }))),
    )
    const sources = [...new Set([...ia.elements.filter((e) => e.atOn).map((e) => `${e.file}:${e.line}`), ...ia.runtimeAt.map((r) => `${r.file}:${r.line}`), ...ia.directHurt.map((r) => `${r.file}:${r.line}`)])]
    const at = sources.map((c): Entry => {
      const item = `${s.overlay}@${c}`
      const v = s.atSources[c as Cite]
      if (v === undefined) return { item, disposition: 'missing' }
      if (typeof v !== 'string') return fromExcluded(item, v)
      return modeledOrMissing(item, [{ file: f, id: `incoming_${v}` }])
    })
    const kind = (k: string) => (e: Entry) => ({ actor: s.overlay, kind: k, ...e })
    return [...tables.map(kind('damage table')), ...funcs.map(kind('action function')), ...states.map(kind('state')), ...at.map(kind('attack source'))]
  })

  const economy = CONTRACT_GEAR.map((g): Entry => {
    const inFiles = findAll(() => [`has_${g}`], 1)
    if (inFiles.length) return { item: g, disposition: 'modeled', at: inFiles }
    const field = FIELD_GEAR[g]
    if (field && link[field] !== undefined) return { item: g, disposition: 'modeled', at: [{ linkSpec: field }] }
    const key = Object.keys(link.economy).find((k) => k.includes(g.replace(/_(sword|shield)$/, '')))
    if (!key) return { item: g, disposition: 'missing' }
    const e = link.economy[key] as unknown
    return e && typeof e === 'object' && 'excluded' in e ? fromExcluded(g, e as { excluded: string; cite?: string }) : { item: g, disposition: 'modeled', at: [{ linkSpec: `economy.${key}` }] }
  })

  return {
    actors,
    dmgTypes,
    hitEffects,
    perActor,
    economy,
  }
}

export type Ledger = ReturnType<typeof buildLedger>

/** V5: no item lacks a disposition, and every pointer into a generated file names something that file has. */
export const checkLedger = (ledger: Ledger) => {
  const problems: string[] = []
  const sections = { actors: ledger.actors, dmgTypes: ledger.dmgTypes, hitEffects: ledger.hitEffects, perActor: ledger.perActor, economy: ledger.economy }
  for (const [name, entries] of Object.entries(sections))
    for (const e of entries as Entry[]) {
      if (e.disposition === 'missing') problems.push(`${name}: ${e.item} has no disposition`)
      if (e.disposition === 'modeled')
        for (const p of e.at)
          if ('file' in p && !idsInFile(p.file).has(p.id)) problems.push(`${name}: ${e.item} points at ${p.file}#${p.id}, which does not exist`)
    }
  return problems
}
