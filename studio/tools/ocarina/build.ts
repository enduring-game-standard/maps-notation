import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { print } from '../../src/core/text'
import { loadDispositions } from './data/actors'
import { link } from './data/link'
import { encounter } from './gen'
import type { Inventory } from './inventory'
import { isExcluded, type ActorSpec } from './spec'

export const OUT = new URL('../../../examples/ocarina-of-time/', import.meta.url)
export const loadInventory = (): Inventory => JSON.parse(readFileSync(new URL('inventory.json', OUT), 'utf8'))
export const encounterFile = (overlay: string) => `${overlay.replace(/^ovl_/, '').toLowerCase()}.maps`
export const dispositions = await loadDispositions()
export const modeled = () => dispositions.filter((d): d is ActorSpec => !isExcluded(d))

if (import.meta.url === `file://${process.argv[1]}`) {
  const inv = loadInventory()
  mkdirSync(new URL('encounters/', OUT), { recursive: true })
  const only = process.argv[2]
  for (const spec of modeled().filter((s) => !only || s.overlay === only)) {
    const { net } = encounter(spec, link, inv)
    writeFileSync(new URL(`encounters/${encounterFile(spec.overlay)}`, OUT), print(net))
    console.log(`${spec.overlay}: ${net.states.length} states, ${net.verbs.length} verbs`)
  }
}
