import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compile, settle, type Compiled } from '../../src/core/engine'
import type { Marking } from '../../src/core/model'
import { parse, print } from '../../src/core/text'
import { encounterFile, loadInventory, modeled, OUT } from './build'
import { link } from './data/link'
import { doubleDefense, encounter, linkAttacks, swingKey } from './gen'
import { DMG_TYPES } from './inventory'
import type { ActorSpec } from './spec'

const inventory = loadInventory()

const load = (spec: ActorSpec) => {
  const net = parse(readFileSync(new URL(`encounters/${encounterFile(spec.overlay)}`, OUT), 'utf8'))
  return { net, c: compile(net), unit: Number(/1 mark = (\d+)\//.exec(net.states.find((s) => s.id === 'link_hp')!.label)![1]) }
}

/** The damage the decomp gives this damage type against this actor, read straight from the inventory. */
const decompDamage = (spec: ActorSpec, phase: ActorSpec['phases'][number], dmg: (typeof DMG_TYPES)[number]) => {
  if (spec.damage.kind !== 'decomp') return undefined
  const table = phase.table ?? spec.damage.table
  const entry = inventory.actors.find((a) => a.overlay === spec.overlay)!.damageTables.find((t) => t.name === table)!.entries[DMG_TYPES.indexOf(dmg)]
  return spec.damage.reactions[entry.reaction].damage ? entry.damage : 0
}

const quiet = (c: Compiled, m: Marking) => settle(c, m, () => 0).marking

for (const spec of modeled()) {
  describe(`${spec.name} (${spec.overlay})`, () => {
    const { net, c, unit } = load(spec)
    const has = (id: string) => net.states.some((s) => s.id === id)

    it('the encounter file is what the generator makes from the spec', () => {
      expect(readFileSync(new URL(`encounters/${encounterFile(spec.overlay)}`, OUT), 'utf8')).toBe(print(encounter(spec, link, inventory).net))
    })
    const verbIds = new Set(net.verbs.map((v) => v.id))
    const all = linkAttacks(link).map((x) => x.attack)
    const keys = new Map(all.map((a) => [swingKey(spec, all, a), a]))

    for (const pool of spec.pools)
      for (const p of spec.phases.filter((ph) => (ph.pool ?? spec.pools[0].id) === pool.id))
        for (const [key, attack] of keys) {
          if (!has(`swing_${key}`)) continue
          const vid = [`hit_${key}__${p.id}`, `hit_${key}`].find((x) => verbIds.has(x) && (x.endsWith(`__${p.id}`) || !verbIds.has(`miss_${key}__${p.id}`)))
          if (!vid) continue
          const d = net.arcs.find((a) => a.verb === vid && a.kind === 'give' && a.state === `dmg_${pool.id}`)?.count ?? 0
          if (!d) continue
          const fromDecomp = p.overrides?.[attack.dmg] || p.hittable ? undefined : decompDamage(spec, p, attack.dmg)
          it(`${key} in ${p.id}: ${Math.ceil(pool.hp.value / d)} hits empty ${pool.id} (${pool.hp.value} hp, ${d} each)`, () => {
            if (fromDecomp !== undefined) expect(d).toBe(fromDecomp)
            const base: Marking = Object.fromEntries(net.states.map((s) => [s.id, 0]))
            for (const q of spec.pools) {
              base[`hp_${q.id}`] = q.hp.value
              base[`alive_${q.id}`] = 1
            }
            base.in_fight = 1
            base.link_hp = 1
            base.range_near = 1
            let m: Marking = { ...base, [`phase_${p.id}`]: 1 }
            const need = Math.ceil(pool.hp.value / d)
            for (let i = 1; i <= need; i++) {
              for (const ph of spec.phases) m[`phase_${ph.id}`] = ph.id === p.id ? 1 : 0
              m = quiet(c, { ...m, [`swing_${key}`]: 1 })
              const down = m[`alive_${pool.id}`] === 0 || m.link_wins === 1
              expect(down).toBe(i === need)
            }
          })
        }

    for (const a of spec.attacks) {
      const variants = has('has_double_defense') ? [false, true] : [false]
      for (const dd of variants)
        it(`${a.label} costs Link ${dd ? doubleDefense(a.damage) : a.damage} health${dd ? ' with Double Defense' : ''}`, () => {
          const base: Marking = Object.fromEntries(net.states.map((s) => [s.id, 0]))
          const hp = 40 * 16
          const m = quiet(c, { ...base, in_fight: 1, range_near: 1, link_hp: hp / unit, has_double_defense: dd ? 1 : 0, [`incoming_${a.id}`]: 1 })
          expect((hp / unit - m.link_hp) * unit).toBe(dd ? doubleDefense(a.damage) : a.damage)
        })
      if (a.blockable)
        for (const s of link.shields.filter((x) => has(`guard_with_${x.gear}`)))
          it(`${a.label} is stopped by a raised ${s.gear.replace(/_/g, ' ')}`, () => {
            const base: Marking = Object.fromEntries(net.states.map((st) => [st.id, 0]))
            const m = quiet(c, { ...base, in_fight: 1, range_near: 1, link_hp: 10, link_guard: 1, [`guard_with_${s.gear}`]: 1, [`has_${s.gear}`]: 1, [`incoming_${a.id}`]: 1 })
            expect(m.link_hp).toBe(10)
          })
      for (const r of a.reflect?.shields.filter((x) => has(`guard_with_${x.gear}`)) ?? [])
        it(`${a.label} is sent back by a raised ${r.gear.replace(/_/g, ' ')}`, () => {
          const base: Marking = Object.fromEntries(net.states.map((st) => [st.id, 0]))
          const age = r.ages?.[0] ?? spec.loadouts[0].age
          const m0: Marking = { ...base, in_fight: 1, range_far: 1, link_hp: 10, link_guard: 1, [`age_${age}`]: 1, [`guard_with_${r.gear}`]: 1, [`has_${r.gear}`]: 1, [`incoming_${a.id}`]: 1, [`phase_${spec.start}`]: 1 }
          for (const q of spec.pools) Object.assign(m0, { [`hp_${q.id}`]: q.hp.value, [`alive_${q.id}`]: 1 })
          const m = quiet(c, m0)
          expect(m.link_hp).toBe(10)
          expect(m[`swing_reflect_${a.id}`]).toBe(0)
        })
    }
  })
}
