import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const DMG_TYPES = [
  'DEKU_NUT', 'DEKU_STICK', 'SLINGSHOT', 'EXPLOSIVE', 'BOOMERANG', 'ARROW_NORMAL', 'HAMMER_SWING', 'HOOKSHOT',
  'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2',
  'ARROW_UNK3', 'MAGIC_FIRE', 'MAGIC_ICE', 'MAGIC_LIGHT', 'SHIELD', 'MIR_RAY', 'SPIN_KOKIRI', 'SPIN_GIANT',
  'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'UNKNOWN_1', 'UNBLOCKABLE', 'HAMMER_JUMP', 'UNKNOWN_2',
] as const
export type DmgType = (typeof DMG_TYPES)[number]

export interface Cite { file: string; line: number }
export interface DamageEntry { damage: number; reaction: string }
export interface DamageTable extends Cite { name: string; entries: DamageEntry[] }
export interface Element extends Cite { atOn: boolean; atFlags: number; atEffect: string; atDamage: number; acOn: boolean; acFlags: number }
export interface Actor {
  overlay: string
  category: string
  inScopeBecause: string[]
  damageTables: DamageTable[]
  health: (Cite & { value: number; via: string })[]
  elements: Element[]
  runtimeAt: (Cite & { text: string })[]
  actionFuncs: string[]
}
export interface Inventory { decompSha: string; dmgTypes: readonly string[]; actors: Actor[] }

const lineOf = (src: string, index: number) => src.slice(0, index).split('\n').length
const literal = (s: string, defines: Map<string, string>, depth = 0): number => {
  const t = s.trim().replace(/^\((.*)\)$/, '$1').trim().replace(/([0-9a-fA-F])[uUlL]+$/, '$1')
  if (/^-?0x[0-9a-f]+$/i.test(t) || /^-?\d+$/.test(t)) return Number(t)
  if (defines.has(t) && depth < 8) return literal(defines.get(t)!, defines, depth + 1)
  throw new Error(`not a number literal: ${s}`)
}

const parseActor = (root: string, overlay: string): Actor | undefined => {
  const dir = join(root, 'src/overlays/actors', overlay)
  const files = readdirSync(dir).filter((f) => f.endsWith('.c')).sort()
  const actor: Actor = { overlay, category: '', inScopeBecause: [], damageTables: [], health: [], elements: [], runtimeAt: [], actionFuncs: [] }
  const funcs = new Set<string>()
  const defines = new Map<string, string>()
  for (const f of readdirSync(dir).filter((f) => /\.[ch]$/.test(f)))
    for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/^#define\s+(\w+)\s+([^\n/]+)/gm)) defines.set(m[1], m[2].trim())
  const num = (s: string) => literal(s, defines)
  for (const f of files) {
    const rel = join('src/overlays/actors', overlay, f)
    const src = readFileSync(join(dir, f), 'utf8')
    for (const m of src.matchAll(/ActorProfile\s+\w+_Profile\s*=\s*\{[^}]*?(ACTORCAT_[A-Z]+)/g)) actor.category ||= m[1]
    for (const m of src.matchAll(/DamageTable\s+(\w+)\s*=\s*\{([\s\S]*?)\};/g)) {
      const entries = [...m[2].matchAll(/DMG_ENTRY\(\s*([^,]+),\s*([^)]+?)\s*\)/g)].map((e) => ({ damage: num(e[1]), reaction: e[2].trim() }))
      if (entries.length !== 32) throw new Error(`${rel}: damage table ${m[1]} has ${entries.length} entries`)
      actor.damageTables.push({ name: m[1], file: rel, line: lineOf(src, m.index!), entries })
    }
    for (const m of src.matchAll(/CollisionCheckInfoInit2?\s+(\w+)\s*=\s*\{\s*([^,}]+)/g))
      actor.health.push({ value: num(m[2]), via: m[1], file: rel, line: lineOf(src, m.index!) })
    for (const m of src.matchAll(/colChkInfo\.health\s*=\s*(-?(?:0x)?[0-9A-Fa-f]+)\s*;/g))
      actor.health.push({ value: num(m[1]), via: 'assignment', file: rel, line: lineOf(src, m.index!) })
    for (const m of src.matchAll(/\{\s*(ELEM_MATERIAL_\w+),\s*\{\s*([^,]+),\s*(HIT_SPECIAL_EFFECT_\w+|[\w]+),\s*([^}]+)\},\s*\{\s*([^,]+),\s*[^,]+,\s*[^}]+\},\s*([^,]+),\s*([^,]+),/g))
      actor.elements.push({
        file: rel, line: lineOf(src, m.index!),
        atFlags: num(m[2]), atEffect: m[3], atDamage: num(m[4]), acFlags: num(m[5]),
        atOn: /ATELEM_ON/.test(m[6]), acOn: /ACELEM_ON/.test(m[7]),
      })
    for (const m of src.matchAll(/[^\n]*atDmgInfo\.(?:damage|effect|dmgFlags)\s*=[^\n]*/g))
      actor.runtimeAt.push({ text: m[0].trim(), file: rel, line: lineOf(src, m.index!) })
    for (const m of src.matchAll(/actionFunc\s*=\s*(\w+)\s*;/g)) funcs.add(m[1])
    for (const m of src.matchAll(/\w+_SetupAction\(\s*this\s*,\s*(\w+)\s*\)/g)) funcs.add(m[1])
    if (/AT_ON\s*\|\s*AT_TYPE_ENEMY|AT_TYPE_ENEMY\s*\|\s*AT_ON/.test(src)) actor.inScopeBecause.push('AT_TYPE_ENEMY collider')
  }
  actor.actionFuncs = [...funcs].filter((f) => f !== 'NULL').sort()
  if (actor.category === 'ACTORCAT_ENEMY' || actor.category === 'ACTORCAT_BOSS') actor.inScopeBecause.unshift(actor.category)
  if (actor.damageTables.length) actor.inScopeBecause.push('DamageTable')
  actor.inScopeBecause = [...new Set(actor.inScopeBecause)]
  return actor.inScopeBecause.length ? actor : undefined
}

export const extract = (root: string): Inventory => {
  const decompSha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const overlays = readdirSync(join(root, 'src/overlays/actors')).filter((d) => d.startsWith('ovl_') && d !== 'ovl_player_actor').sort()
  return { decompSha, dmgTypes: DMG_TYPES, actors: overlays.map((o) => parseActor(root, o)).filter((a): a is Actor => !!a) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [root, out] = process.argv.slice(2)
  if (!root || !out) throw new Error('usage: tsx inventory.ts <oot-decomp> <out.json>')
  const inv = extract(root)
  writeFileSync(out, JSON.stringify(inv, null, 1) + '\n')
  const by = (r: string) => inv.actors.filter((a) => a.inScopeBecause.includes(r)).length
  console.log(`decomp ${inv.decompSha}: ${inv.actors.length} actors in scope; ENEMY ${by('ACTORCAT_ENEMY')}, BOSS ${by('ACTORCAT_BOSS')}, DamageTable ${by('DamageTable')}, AT enemy ${by('AT_TYPE_ENEMY collider')}`)
}
