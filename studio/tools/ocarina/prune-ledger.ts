import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { link } from './data/link'
import { encounter } from './gen'
import { loadInventory } from './build'
import { isExcluded, type Disposition } from './spec'

/**
 * Removes `expected.deadVerbs` entries for verbs the generator no longer emits, after a generator change drops verbs.
 * Usage: `npx tsx tools/ocarina/prune-ledger.ts [actor_file.ts ...]`. An entry whose key is not a plain literal line
 * (built in a loop, say) is reported for the author instead.
 */
const dir = new URL('./data/actors/', import.meta.url)
const inv = loadInventory()
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(dir).filter((f) => f.endsWith('.ts'))
for (const f of files) {
  const url = new URL(f, dir)
  const mod: Record<string, unknown> = await import(url.href)
  const spec = Object.values(mod).find((v): v is Disposition => !!v && typeof v === 'object' && 'overlay' in v)
  if (!spec || isExcluded(spec) || !spec.expected?.deadVerbs) continue
  const verbs = new Set(encounter(spec, link, inv).net.verbs.map((v) => v.id))
  const gone = Object.keys(spec.expected.deadVerbs).filter((k) => !verbs.has(k))
  if (!gone.length) continue
  const lines = readFileSync(url, 'utf8').split('\n')
  const left: string[] = []
  for (const key of gone) {
    const start = lines.findIndex((l) => new RegExp(`^\\s*['"]?${key}['"]?:\\s`).test(l))
    if (start < 0) {
      left.push(key)
      continue
    }
    let end = start
    while (!/[`'"],?\s*$/.test(lines[end]) && end < lines.length - 1) end++
    lines.splice(start, end - start + 1)
  }
  writeFileSync(url, lines.join('\n'))
  console.log(`${spec.overlay}: removed ${gone.length - left.length}${left.length ? `; remove by hand: ${left.join(', ')}` : ''}`)
}
