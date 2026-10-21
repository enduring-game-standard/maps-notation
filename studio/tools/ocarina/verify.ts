import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { check } from '../../src/core/check'
import type { Net } from '../../src/core/model'
import { parse, print } from '../../src/core/text'
import { dispositions, encounterFile, modeled, OUT } from './build'
import { link } from './data/link'
import { doubleDefense, encounter, linkAttacks, swingKey } from './gen'
import { atlas, ATLAS } from './atlas'
import { buildLedger, checkLedger, CONTRACT_GEAR, FIELD_GEAR, HIT_SPECIAL_EFFECTS } from './ledger'
import { analyzeFile } from './slice'
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
      const carried = new Set([s.damage.table, ...s.phases.flatMap((p) => (p.table ? [p.table] : []))])
      const unused = s.damage.unusedTables ?? {}
      for (const table of carried) {
        const t = ia.damageTables.find((x) => x.name === table)
        if (!t) fail('C4', `${s.overlay}: table ${table} not in inventory`)
        else for (const e of t.entries) if (!(e.reaction in s.damage.reactions)) fail('C4', `${s.overlay}: reaction ${e.reaction} (table ${table}) not interpreted`)
      }
      for (const t of ia.damageTables)
        if (!carried.has(t.name) && !(t.name in unused)) fail('C4', `${s.overlay}: table ${t.name} is neither in force in some phase nor ledgered as unused`)
      for (const t of Object.keys(unused)) if (carried.has(t)) fail('C4', `${s.overlay}: table ${t} is ledgered unused but a phase uses it`)
    }

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
      ...ia.runtimeAt.map((r) => `${r.file}:${r.line}`), ...ia.directHurt.map((r) => `${r.file}:${r.line}`),
    ])
    const ids = new Set(s.attacks.map((a) => a.id))
    for (const c of sources) if (!(c in s.atSources)) fail('C6', `${s.overlay}: AT source ${c} not ledgered`)
    for (const [c, v] of Object.entries(s.atSources)) {
      if (!sources.has(c)) fail('C6', `${s.overlay}: ledger names ${c}, which is not an AT element or runtime atDmgInfo change`)
      if (typeof v === 'string' && !ids.has(v)) fail('C6', `${s.overlay}: ${c} maps to unknown attack ${v}`)
    }
    for (const a of s.attacks) {
      if (a.via) {
        const carrier = inv.actors.find((x) => x.overlay === a.via!.overlay)
        const carried = new Set([...(carrier?.elements.filter((e) => e.atOn).map((e) => `${e.file}:${e.line}`) ?? []), ...(carrier?.runtimeAt.map((r) => `${r.file}:${r.line}`) ?? []), ...(carrier?.directHurt.map((r) => `${r.file}:${r.line}`) ?? [])])
        if (!carried.has(a.source)) fail('C6', `${s.overlay}: attack ${a.id} is carried by ${a.via.overlay}, but ${a.source} is not one of its AT sources`)
      } else if (s.atSources[a.source as Cite] !== a.id && !sources.has(a.source)) fail('C6', `${s.overlay}: attack ${a.id} source ${a.source} is not a ledgered AT source`)
    }
  }

  const read = new Set<string>([
    ...Object.values(link.attacks).flatMap((a) => (isExcluded(a) ? [] : a.flatMap((x) => x.needs))),
    ...link.shields.map((x) => x.gear),
  ])
  for (const g of CONTRACT_GEAR) {
    const field = FIELD_GEAR[g]
    const ok = read.has(g) || (field && link[field] !== undefined) || Object.keys(link.economy).some((k) => k.includes(g.replace(/_(sword|shield)$/, '')))
    if (!ok) fail('C7', `${g} has no disposition in the Link spec`)
  }
  if (!('ammo' in link.economy)) fail('C7', 'ammunition has no disposition')
}

/** V3: the generated net against a fresh extraction, never against the spec's own reading. */
const verifyNumbers = (spec: ActorSpec, ia: Actor, net: Net, inv: Inventory) => {
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
    const { reactions } = spec.damage
    const tableOf = (p: (typeof spec.phases)[number]) => ia.damageTables.find((x) => x.name === (p.table ?? (spec.damage as { table: string }).table))!
    const keys = new Map<string, DmgType>()
    const all = linkAttacks(link).map((x) => x.attack)
    for (const a of all) keys.set(swingKey(spec, all, a), a.dmg)
    for (const [key, dmg] of keys) {
      if (!net.states.some((st) => st.id === `swing_${key}`)) continue
      for (const p of spec.phases) {
        if (p.overrides?.[dmg] || p.guards?.includes(dmg) || p.hittable) continue
        const entry = tableOf(p).entries[DMG_TYPES.indexOf(dmg)]
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
    const carrier = a.via ? inv.actors.find((x) => x.overlay === a.via!.overlay) ?? ia : ia
    const el = carrier.elements.find((e) => `${e.file}:${e.line}` === a.source)
    const rt = carrier.runtimeAt.find((r) => `${r.file}:${r.line}` === a.source)
    if (el && el.atDamage !== a.damage) fail('V3', `${spec.overlay}: attack ${a.id} damage ${a.damage}, element at ${a.source} deals ${el.atDamage}`)
    if (rt && /atDmgInfo\.damage\s*=\s*(\d+|0x[0-9a-f]+)/i.test(rt.text)) {
      const n = Number(/atDmgInfo\.damage\s*=\s*(\d+|0x[0-9a-f]+)/i.exec(rt.text)![1])
      if (n !== a.damage) fail('V3', `${spec.overlay}: attack ${a.id} damage ${a.damage}, runtime change at ${a.source} sets ${n}`)
    }
    const dh = carrier.directHurt.find((r) => `${r.file}:${r.line}` === a.source)
    const direct = dh && directDamage(dh.text)
    if (direct !== undefined && direct !== a.damage) fail('V3', `${spec.overlay}: attack ${a.id} damage ${a.damage}, the call at ${a.source} deals ${direct}`)
    if (!el && !rt && !dh) fail('V3', `${spec.overlay}: attack ${a.id} source ${a.source} is neither an element, a runtime change, nor a direct hurt call`)
    const want = a.damage / unit
    const landed = net.verbs.filter((v) => v.id === `${a.id}_lands` || v.id.startsWith(`${a.id}_lands_n`) || v.id.startsWith(`${a.id}_lands_f`))
    if (!landed.length) fail('V3', `${spec.overlay}: no verb lands attack ${a.id}`)
    for (const v of landed) if (gives(v.id, 'link_dmg') !== want) fail('V3', `${spec.overlay}: ${v.id} costs ${gives(v.id, 'link_dmg')} marks, expected ${want}`)
    for (const v of net.verbs.filter((x) => x.id.startsWith(`${a.id}_lands_dd`)))
      if (gives(v.id, 'link_dmg') * unit !== doubleDefense(a.damage)) fail('V3', `${spec.overlay}: ${v.id} with Double Defense costs ${gives(v.id, 'link_dmg') * unit}, expected ${doubleDefense(a.damage)}`)
  }
}

/** The damage a direct hurt call states as a literal on its own line, or undefined when it is computed or spans lines. */
const directDamage = (text: string) => {
  const lit = (x: string | undefined) => (x && /^-?(0x[0-9a-f]+|\d+)$/i.test(x.trim()) ? Math.abs(Number(x.trim().replace(/^-/, ''))) : undefined)
  const knock = /Actor_SetPlayerKnockback(?:Large|Small)?\((.*)\)/.exec(text)
  if (knock) return lit(knock[1].split(',').pop())
  const hurt = /(?:damagePlayer|Player_InflictDamage\w*|Health_ChangeBy)\(\s*play\s*,\s*([^)]*)\)/.exec(text)
  return hurt ? lit(hurt[1]) : undefined
}

/** Whether the spec gives the actor any way to die: health, or a hit or step that ends in `defeated`. */
const declaresDeath = (spec: ActorSpec) => {
  const dies = (to: string | Record<string, string> | undefined) => to === 'defeated' || (typeof to === 'object' && Object.values(to).includes('defeated'))
  const d = spec.damage
  return (
    spec.pools.length > 0 ||
    (d.kind === 'decomp' && Object.values(d.reactions).some((r) => dies(r.to))) ||
    (d.kind === 'custom' && Object.values(d.entries).some((e) => dies(e?.to))) ||
    spec.phases.some((p) => Object.values(p.overrides ?? {}).some((o) => dies(o?.to))) ||
    spec.steps.some((s) => s.to === 'defeated')
  )
}

const verifyEncounter = async (spec: ActorSpec, inv: Inventory, analyzeLimit: number) => {
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
  verifyNumbers(spec, ia, parsed, inv)

  const slices = await analyzeFile(fileURLToPath(file), analyzeLimit)
  const fired = new Set(slices.flatMap((r) => r.fired))
  const outcomes = new Set(slices.flatMap((r) => Object.keys(r.outcomes)))
  const allDead = parsed.verbs.map((v) => v.id).filter((v) => !fired.has(v))
  const givers = new Map<string, string[]>()
  for (const a of parsed.arcs) if (a.kind === 'give') givers.set(a.verb, [...(givers.get(a.verb) ?? []), a.state])
  const startMarked = parsed.states.filter((st) => st.marks > 0).map((st) => st.id)
  /** A state counts as reached in a slice if it starts marked or a verb that fired there gives it, which catches marks the world spends at once. */
  const markedBy = slices.map((r) => new Set([...startMarked, ...r.fired.flatMap((v) => givers.get(v) ?? [])]))
  const inputsOf = (v: string) => [...new Set(parsed.arcs.filter((a) => a.verb === v && (a.kind === 'take' || a.kind === 'need')).map((a) => a.state))]
  /** Dead only because its inputs never meet in one kit: each input is marked in some slice, all of them in none. */
  const kitSplit = allDead.filter((v) => {
    const ins = inputsOf(v)
    return ins.every((st) => markedBy.some((m) => m.has(st))) && !markedBy.some((m) => ins.every((st) => m.has(st)))
  })
  const deadVerbs = allDead.filter((v) => !kitSplit.includes(v))
  const summary = {
    positions: slices.reduce((n, r) => n + r.positions, 0),
    complete: slices.every((r) => r.complete),
    outcomes: [...outcomes].sort(),
    stalls: slices.reduce((n, r) => n + r.stalls, 0),
    livelocks: slices.reduce((n, r) => n + r.livelocks, 0),
    deadVerbs,
    kitSplit: Object.fromEntries(kitSplit.map((v) => [v, inputsOf(v)])),
    slices: slices.map(({ fired: _f, ...r }) => r).sort((a, b) => `${a.kit}/${a.variant}`.localeCompare(`${b.kit}/${b.variant}`)),
  }
  writeFileSync(new URL(`encounters/${encounterFile(spec.overlay).replace(/\.maps$/, '.analysis.json')}`, OUT), JSON.stringify(summary, null, 1) + '\n')
  if (!summary.complete) {
    line('V2').verdict = line('V2').verdict === 'VERIFIED' ? 'INCONCLUSIVE' : line('V2').verdict
    line('V2').failures.push(`${spec.overlay}: exploration hit the ${analyzeLimit} limit in ${slices.filter((r) => !r.complete).map((r) => `${r.kit}/${r.variant}`).join(', ')}`)
    return
  }
  if (summary.stalls) fail('V2', `${spec.overlay}: ${summary.stalls} stalled positions`)
  if (summary.livelocks) fail('V2', `${spec.overlay}: ${summary.livelocks} positions where the world never falls silent`)
  const expectedDead = spec.expected?.deadVerbs ?? {}
  for (const v of deadVerbs) if (!(v in expectedDead)) fail('V2', `${spec.overlay}: verb ${v} can never be said`)
  for (const v of Object.keys(expectedDead)) if (!deadVerbs.includes(v)) fail('V2', `${spec.overlay}: ledgered dead verb ${v} is reachable after all`)
  const killable = declaresDeath(spec)
  if (killable !== outcomes.has('Link wins')) fail('V2', `${spec.overlay}: Link wins reachable=${outcomes.has('Link wins')} but killable=${killable}`)
  if (spec.attacks.length > 0 !== outcomes.has('Link falls')) fail('V2', `${spec.overlay}: Link falls reachable=${outcomes.has('Link falls')} with ${spec.attacks.length} attacks`)
  note('V2', `${spec.overlay}: ${summary.positions} positions over ${slices.length} slices; ${kitSplit.length} verbs dead only because their gear is in different kits`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2]
  if (!root) throw new Error('usage: tsx verify.ts <oot-decomp> [--only ovl_X] [--limit N]')
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : undefined
  const limit = process.argv.includes('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : 1_000_000
  const fresh = extract(root)
  const committed: Inventory = JSON.parse(readFileSync(new URL('inventory.json', OUT), 'utf8'))
  if (JSON.stringify(fresh) !== JSON.stringify(committed)) fail('V3', 'inventory.json differs from a fresh extraction of the decomp')
  walkCites(root, link, 'link')
  for (const d of dispositions) walkCites(root, d, d.overlay)
  if (process.env.OCARINA_ONLY) note('C1', 'OCARINA_ONLY is set: C1 counts only the loaded actor and cannot pass')
  verifyCompleteness(fresh)
  for (const spec of modeled().filter((s) => !only || s.overlay === only)) await verifyEncounter(spec, fresh, limit)
  if (!only) {
    const want = print(atlas(modeled().map((s) => ({ name: encounterFile(s.overlay).replace(/\.maps$/, ''), net: encounter(s, link, fresh).net }))))
    const have = existsSync(ATLAS) ? readFileSync(ATLAS, 'utf8') : ''
    if (have !== want) fail('V1', 'ocarina-combat.maps is missing or stale; run tools/ocarina/atlas.ts')
    else {
      const errors = check(parse(have)).filter((d) => d.severity === 'error')
      if (errors.length) fail('V1', `ocarina-combat.maps: ${errors.length} checker errors, first: ${errors[0].message}`)
      note('V1', `atlas: ${modeled().length} encounters, ${have.length} bytes`)
    }
  }
  const ledger = buildLedger(fresh)
  writeFileSync(new URL('ledger.json', OUT), JSON.stringify(ledger, null, 1) + '\n')
  for (const p of checkLedger(ledger)) fail('V5', p)
  for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'cites', 'V1', 'V2', 'V3', 'V5']) line(id)
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
