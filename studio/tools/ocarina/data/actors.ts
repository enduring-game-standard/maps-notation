import { readdirSync } from 'node:fs'
import type { Disposition } from '../spec'

/**
 * Every actor file under `actors/`, each exporting one disposition. No registry to edit: a new file is picked up.
 * `OCARINA_ONLY=ovl_X` loads just that actor's file, so one author's half-written file never breaks another's run.
 */
export const loadDispositions = async (only = process.env.OCARINA_ONLY): Promise<Disposition[]> => {
  const dir = new URL('./actors/', import.meta.url)
  const out: Disposition[] = []
  const wanted = only ? `${only.replace(/^ovl_/, '').toLowerCase()}.ts` : undefined
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts') && (!wanted || x === wanted)).sort()) {
    const mod: Record<string, unknown> = await import(new URL(f, dir).href)
    const found = Object.values(mod).filter((v): v is Disposition => !!v && typeof v === 'object' && 'overlay' in v)
    if (found.length !== 1) throw new Error(`${f} must export exactly one disposition, found ${found.length}`)
    out.push(found[0])
  }
  return out
}
