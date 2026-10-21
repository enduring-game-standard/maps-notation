import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyze } from '../../src/core/analyze'
import { check } from '../../src/core/check'
import type { Net } from '../../src/core/model'
import { parse, print } from '../../src/core/text'
import { dispositions, encounterFile, modeled, OUT } from './build'
import { link } from './data/link'
import { doubleDefense, encounter, linkAttacks, swingKey } from './gen'
import { DMG_TYPES, extract, type Actor, type DmgType, type Inventory } from './inventory'
import { isExcluded, type ActorSpec, type Cite } from './spec'

type Verdict = 'VERIFIED' | 'NOT VERIFIED' | 'INCONCLUSIVE'
const results = new Map<string, { verdict: Verdict; failures: string[]; notes: string[] }>()
const line = (id: string) => {
  if (!results.has(id)) results.set(id, { verdict: 'VERIFIED', failures: [], notes: [] })
  return results.get(id)!
}
const fail = (id: string, msg: string) => {
  const r = line(id)
  r.verdict = 'NOT VERIFIED'
  r.failures.push(msg)
}
const note = (id: string, msg: string) => line(id).notes.push(msg)

const CONTRACT_ECONOMY = [
  'hearts', 'double_defense', 'magic_meter', 'magic_costs', 'fairy', 'potions', 'swords', 'shields', 'tunics',
  'deku_sticks', 'deku_nuts', 'slingshot', 'bow', 'magic_arrows', 'bombs', 'bombchus', 'boomerang', 'hookshot',
  'megaton_hammer', 'dins_fire', 'nayrus_love', 'lens_of_truth', 'ammo',
]
const HIT_SPECIAL_EFFECTS = ['NONE', 'FIRE', 'ICE', 'ELECTRIC', 'KNOCKBACK', '7', '8', '9']

/** Every cite must name a real decomp line that carries content, not a bare brace. */
const checkCite = (root: string, cite: string, where: string) => {
  const m = /^(.*):(\d+)$/.exec(cite)
  if (!m) return fail('cites', `${where}: malformed cite ${cite}`)
  const path = join(root, m[1])
  if (!existsSync(path)) return fail('cites', `${where}: no file ${m[1]}`)
  const text = readFileSync(path, 'utf8').split('\n')[Number(m[2]) - 1]
  if (text === undefined || !/[A-Za-z0-9]/.test(text)) fail('cites', `${where}: ${cite} is blank or only punctuation`)
}
const walkCites = (root: string, x: unknown, where: string) => {
  if (Array.isArray(x)) x.forEach((v, i) => walkCites(root, v, `${where}[${i}]`))
  else if (x && typeof x === 'object')
    for (const [k, v] of Object.entries(x)) {
      if ((k === 'cite' || k === 'source') && typeof v === 'string') checkCite(root, v, `${where}.${k}`)
      else if (k === 'atSources' && v && typeof v === 'object') for (const c of Object.keys(v)) checkCite(root, c, `${where}.atSources key`)
      walkCites(root, v, `${where}.${k}`)
    }
}

const phaseRef = (spec: ActorSpec, ref: string) =>
  ref.endsWith('*') ? spec.phases.some((p) => p.id.startsWith(ref.slice(0, -1))) : spec.phases.some((p) => p.id === ref)

const verifyCompleteness = (inv: Inventory) => {
  const byOverlay = new Map(dispositions.map((d) => [d.overlay, d]))
  for (const a of inv.actors) if (!byOverlay.has(a.overlay)) fail('C1', `${a.overlay} has no disposition`)
  for (const d of dispositions) if (!inv.actors.some((a) => a.overlay === d.overlay)) fail('C1', `${d.overlay} is not in the inventory`)
  note('C1', `${dispositions.length}/${inv.actors.length} actors disposed: ${modeled().length} modeled, ${dispositions.length - modeled().length} excluded`)

  for (const d of DMG_TYPES) if (!(d in link.attacks)) fail('C2', `DMG_${d} has no disposition`)

  for (const e of HIT_SPECIAL_EFFECTS) if (!(`HIT_SPECIAL_EFFECT_${e}` in link.hitEffects)) fail('C3', `HIT_SPECIAL_EFFECT_${e} has no disposition`)
  const implemented = new Set(Object.values(link.hitEffects).flatMap((h) => (isExcluded(h) ? [] : [h.implementedAs])))
  for (const s of modeled()) for (const a of s.attacks) if (!implemented.has(a.effect.kind)) fail('C3', `${s.overlay} ${a.id} uses effect ${a.effect.kind}, which the Link spec does not implement`)

  for (const s of modeled()) {
    const ia = inv.actors.find((a) => a.overlay === s.overlay)!
    if (ia.damageTables.length && s.damage.kind !== 'decomp') fail('C4', `${s.overlay} has a DamageTable but its spec uses ${s.damage.kind}`)
    if (s.damage.kind === 'decomp') {
      const table = s.damage.table
      const t = ia.damageTables.find((x) => x.name === table)
      if (!t) fail('C4', `${s.overlay}: table ${table} not in inventory`)
      else for (const e of t.entries) if (!(e.reaction in s.damage.reactions)) fail('C4', `${s.overlay}: reaction ${e.reaction} not interpreted`)
    }
    if (ia.damageTables.length > 1) note('C4', `${s.overlay} has ${ia.damageTables.length} tables; spec carries ${s.damage.kind === 'decomp' ? s.damage.table : 'none'}`)

    const funcs = new Set(ia.actionFuncs)
    for (const f of funcs) if (!(f in s.actionFuncs)) fail('C5', `${s.overlay}: action function ${f} not ledgered`)
    for (const [f, v] of Object.entries(s.actionFuncs)) {
      if (!funcs.has(f)) fail('C5', `${s.overlay}: ledger names ${f}, which the extractor did not find`)
      if (typeof v === 'string' && !phaseRef(s, v)) fail('C5', `${s.overlay}: ${f} maps to unknown phase ${v}`)
    }
    if (!funcs.size && !Object.keys(s.states ?? {}).length) fail('C5', `${s.overlay}: no action functions found and no states listed`)
    for (const [k, v] of Object.entries(s.states ?? {})) if (!isExcluded(v) && !phaseRef(s, v.phase)) fail('C5', `${s.overlay}: state ${k} maps to unknown phase ${v.phase}`)

    const sources = new Set<string>([
      ...ia.elements.filter((e) => e.atOn).map((e) => `${e.file}:${e.line}`),
      ...ia.runtimeAt.map((r) => `${r.file}:${r.line}`),
    ])
    const ids = new Set(s.attacks.map((a) => a.id))
    for (const c of sources) if (!(c in s.atSources)) fail('C6', `${s.overlay}: AT source ${c} not ledgered`)
    for (const [c, v] of Object.entries(s.atSources)) {
      if (!sources.has(c)) fail('C6', `${s.overlay}: ledger names ${c}, which is not an AT element or runtime atDmgInfo change`)
      if (typeof v === 'string' && !ids.has(v)) fail('C6', `${s.overlay}: ${c} maps to unknown attack ${v}`)
    }
    for (const a of s.attacks) if (s.atSources[a.source as Cite] !== a.id && !sources.has(a.source)) fail('C6', `${s.overlay}: attack ${a.id} source ${a.source} is not a ledgered AT source`)
  }

  for (const k of CONTRACT_ECONOMY) if (!(k in link.economy)) fail('C7', `economy item ${k} has no disposition`)
}

/** V3: the generated net against a fresh extraction, never against the spec's own reading. */
const verifyNumbers = (spec: ActorSpec, ia: Actor, net: Net) => {
  const verbs = new Map(net.verbs.map((v) => [v.id, v]))
  const gives = (verb: string, state: string) => net.arcs.find((a) => a.verb === verb && a.kind === 'give' && a.state === state)?.count ?? 0
  const unit = Number(/1 mark = (\d+)\//.exec(net.states.find((s) => s.id === 'link_hp')!.label)![1])
  for (const pool of spec.pools) {
    const h = ia.health.find((x) => `${x.file}:${x.line}` === pool.hp.cite)
    if (!h) fail('V3', `${spec.overlay}: pool ${pool.id} cites ${pool.hp.cite}, which is not an extracted health value`)
    else if (h.value !== pool.hp.value) fail('V3', `${spec.overlay}: pool ${pool.id} hp ${pool.hp.value} but decomp says ${h.value}`)
    if (net.states.find((s) => s.id === `hp_${pool.id}`)?.marks !== pool.hp.value) fail('V3', `${spec.overlay}: generated hp_${pool.id} does not start at ${pool.hp.value}`)
  }
  if (spec.damage.kind === 'decomp') {
    const { table, reactions } = spec.damage
    const t = ia.damageTables.find((x) => x.name === table)!
    const keys = new Map<string, DmgType>()
    const all = linkAttacks(link).map((x) => x.attack)
    for (const a of all) keys.set(swingKey(spec, all, a), a.dmg)
    for (const [key, dmg] of keys) {
      if (!net.states.some((st) => st.id === `swing_${key}`)) continue
      const entry = t.entries[DMG_TYPES.indexOf(dmg)]
      for (const p of spec.phases) {
        if (p.overrides?.[dmg] || p.guards?.includes(dmg) || p.hittable) continue
        const vid = [`hit_${key}__${p.id}`, `miss_${key}__${p.id}`, `hit_${key}`, `miss_${key}`].find((x) => verbs.has(x))
        if (!vid) {
          fail('V3', `${spec.overlay}: no verb resolves ${key} in ${p.id}`)
          continue
        }
        const accepts = ia.elements.some((e) => e.acOn && ((e.acFlags >>> 0) & 2 ** DMG_TYPES.indexOf(dmg)))
        const expected = accepts && reactions[entry.reaction].damage && spec.pools.length ? entry.damage : 0
        const pool = p.pool ?? spec.pools[0]?.id
        const got = pool ? gives(vid, `dmg_${pool}`) : 0
        if (got !== expected) fail('V3', `${spec.overlay}: ${vid} deals ${got} in ${p.id}, decomp table entry ${dmg} is ${entry.damage} (${entry.reaction})`)
      }
    }
  }
  for (const a of spec.attacks) {
    const el = ia.elements.find((e) => `${e.file}:${e.line}` === a.source)
    const rt = ia.runtimeAt.find((r) => `${r.file}:${r.line}` === a.source)
    if (el && el.atDamage !== a.damage) fail('V3', `${spec.overlay}: attack ${a.id} damage ${a.damage}, element at ${a.source} deals ${el.atDamage}`)
    if (rt && /atDmgInfo\.damage\s*=\s*(\d+|0x[0-9a-f]+)/i.test(rt.text)) {
      const n = Number(/atDmgInfo\.damage\s*=\s*(\d+|0x[0-9a-f]+)/i.exec(rt.text)![1])
      if (n !== a.damage) fail('V3', `${spec.overlay}: attack ${a.id} damage ${a.damage}, runtime change at ${a.source} sets ${n}`)
    }
    if (!el && !rt) fail('V3', `${spec.overlay}: attack ${a.id} source ${a.source} is neither an element nor a runtime change`)
    const want = a.damage / unit
    const landed = net.verbs.filter((v) => v.id === `${a.id}_lands` || v.id.startsWith(`${a.id}_lands_n`) || v.id.startsWith(`${a.id}_lands_f`))
    if (!landed.length) fail('V3', `${spec.overlay}: no verb lands attack ${a.id}`)
    for (const v of landed) if (gives(v.id, 'link_dmg') !== want) fail('V3', `${spec.overlay}: ${v.id} costs ${gives(v.id, 'link_dmg')} marks, expected ${want}`)
    for (const v of net.verbs.filter((x) => x.id.startsWith(`${a.id}_lands_dd`)))
      if (gives(v.id, 'link_dmg') * unit !== doubleDefense(a.damage)) fail('V3', `${spec.overlay}: ${v.id} with Double Defense costs ${gives(v.id, 'link_dmg') * unit}, expected ${doubleDefense(a.damage)}`)
  }
}

const verifyEncounter = (spec: ActorSpec, inv: Inventory, analyzeLimit: number) => {
  const ia = inv.actors.find((a) => a.overlay === spec.overlay)!
  const { net } = encounter(spec, link, inv)
  const file = new URL(`encounters/${encounterFile(spec.overlay)}`, OUT)
  const text = print(net)
  if (!existsSync(file) || readFileSync(file, 'utf8') !== text) fail('V1', `${spec.overlay}: ${encounterFile(spec.overlay)} is missing or stale; run build.ts`)
  const parsed = parse(text)
  if (print(parsed) !== text) fail('V1', `${spec.overlay}: does not print back identically`)
  const problems = check(parsed)
  for (const p of problems.filter((x) => x.severity === 'error')) fail('V1', `${spec.overlay}: ${p.message}`)
  for (const p of problems.filter((x) => x.severity === 'warning'))
    if (!Object.keys(spec.expected?.warnings ?? {}).some((k) => p.message.includes(k))) fail('V1', `${spec.overlay}: unexpected warning: ${p.message}`)
  verifyNumbers(spec, ia, parsed)

  const t0 = Date.now()
  const a = analyze(parsed, analyzeLimit)
  const summary = {
    positions: a.nodes.size,
    complete: a.complete,
    outcomes: Object.fromEntries(a.outcomes),
    stalls: a.stalls.length,
    livelocks: a.livelocks.length,
    deadVerbs: a.deadVerbs,
    ms: Date.now() - t0,
  }
  writeFileSync(new URL(`encounters/${encounterFile(spec.overlay).replace(/\.maps$/, '.analysis.json')}`, OUT), JSON.stringify(summary, null, 1) + '\n')
  if (!a.complete) {
    line('V2').verdict = line('V2').verdict === 'VERIFIED' ? 'INCONCLUSIVE' : line('V2').verdict
    line('V2').failures.push(`${spec.overlay}: exploration hit the ${analyzeLimit} limit`)
    return
  }
  if (a.stalls.length) fail('V2', `${spec.overlay}: ${a.stalls.length} stalled positions`)
  if (a.livelocks.length) fail('V2', `${spec.overlay}: ${a.livelocks.length} positions where the world never falls silent`)
  const expectedDead = spec.expected?.deadVerbs ?? {}
  for (const v of a.deadVerbs) if (!(v in expectedDead)) fail('V2', `${spec.overlay}: verb ${v} can never be said`)
  for (const v of Object.keys(expectedDead)) if (!a.deadVerbs.includes(v)) fail('V2', `${spec.overlay}: ledgered dead verb ${v} is reachable after all`)
  const killable = spec.pools.length > 0 || (spec.damage.kind === 'decomp' && Object.values(spec.damage.reactions).some((r) => r.to === 'defeated' || Object.values(typeof r.to === 'object' ? r.to : {}).includes('defeated')))
  if (killable !== a.outcomes.has('Link wins')) fail('V2', `${spec.overlay}: Link wins reachable=${a.outcomes.has('Link wins')} but killable=${killable}`)
  if (spec.attacks.length > 0 !== a.outcomes.has('Link falls')) fail('V2', `${spec.overlay}: Link falls reachable=${a.outcomes.has('Link falls')} with ${spec.attacks.length} attacks`)
  note('V2', `${spec.overlay}: ${a.nodes.size} positions in ${summary.ms} ms`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2]
  if (!root) throw new Error('usage: tsx verify.ts <oot-decomp> [--only ovl_X] [--limit N]')
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : undefined
  const limit = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : 3_000_000
  const fresh = extract(root)
  const committed: Inventory = JSON.parse(readFileSync(new URL('inventory.json', OUT), 'utf8'))
  if (JSON.stringify(fresh) !== JSON.stringify(committed)) fail('V3', 'inventory.json differs from a fresh extraction of the decomp')
  walkCites(root, link, 'link')
  for (const d of dispositions) walkCites(root, d, d.overlay)
  if (process.env.OCARINA_ONLY) note('C1', 'OCARINA_ONLY is set: C1 counts only the loaded actor and cannot pass')
  verifyCompleteness(fresh)
  for (const spec of modeled().filter((s) => !only || s.overlay === only)) verifyEncounter(spec, fresh, limit)
  for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'cites', 'V1', 'V2', 'V3']) line(id)
  let ok = true
  for (const [id, r] of results) {
    console.log(`${id}: ${r.verdict}`)
    for (const f of r.failures.slice(0, 40)) console.log(`  - ${f}`)
    if (r.failures.length > 40) console.log(`  ... ${r.failures.length - 40} more`)
    for (const n of r.notes) console.log(`  . ${n}`)
    if (r.verdict !== 'VERIFIED') ok = false
  }
  process.exit(ok ? 0 : 1)
}
