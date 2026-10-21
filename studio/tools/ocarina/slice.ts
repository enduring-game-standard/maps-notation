import { spawn } from 'node:child_process'
import { cpus } from 'node:os'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { analyze } from '../../src/core/analyze'
import type { Net } from '../../src/core/model'
import { parse } from '../../src/core/text'

export interface SliceResult {
  kit: string
  variant: string
  positions: number
  complete: boolean
  outcomes: Record<string, number>
  stalls: number
  livelocks: number
  fired: string[]
  ms: number
}

/**
 * One branch of the encounter's opening choices, cut from the generated file itself: every other
 * kit and variant verb is removed, so the exploration is exactly that branch of the whole file's.
 */
export const slice = (net: Net, kit: string, variant: string): Net => {
  const drop = new Set(
    net.verbs.filter((v) => (v.id.startsWith('fight_') && v.id !== `fight_${kit}`) || (v.id.startsWith('variant_') && variant && v.id !== `variant_${variant}`)).map((v) => v.id),
  )
  return { ...net, verbs: net.verbs.filter((v) => !drop.has(v.id)), arcs: net.arcs.filter((a) => !drop.has(a.verb)) }
}

export const branches = (net: Net) => {
  const kits = net.verbs.filter((v) => v.id.startsWith('fight_')).map((v) => v.id.slice('fight_'.length))
  const variants = net.verbs.filter((v) => v.id.startsWith('variant_')).map((v) => v.id.slice('variant_'.length))
  return kits.flatMap((kit) => (variants.length ? variants : ['']).map((variant) => ({ kit, variant })))
}

const runOne = (file: string, kit: string, variant: string, limit: number): Promise<SliceResult> =>
  new Promise((resolve, reject) => {
    const p = spawn('npx', ['tsx', fileURLToPath(import.meta.url), file, kit, variant, String(limit)], { stdio: ['ignore', 'pipe', 'inherit'] })
    let out = ''
    p.stdout.on('data', (d) => (out += d))
    p.on('close', (code) => (code === 0 ? resolve(JSON.parse(out)) : reject(new Error(`slice ${kit}/${variant} of ${file} exited ${code}`))))
  })

/** Analyze every branch of an encounter file in parallel processes. */
export const analyzeFile = async (file: string, limit: number, parallel = Math.max(1, cpus().length - 2)) => {
  const todo = branches(parse(readFileSync(file, 'utf8')))
  const results: SliceResult[] = []
  let next = 0
  const worker = async () => {
    while (next < todo.length) {
      const { kit, variant } = todo[next++]
      results.push(await runOne(file, kit, variant, limit))
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, todo.length) }, worker))
  return results
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, kit, variant, limit] = process.argv.slice(2)
  const net = slice(parse(readFileSync(file, 'utf8')), kit, variant)
  const t0 = Date.now()
  const a = analyze(net, Number(limit))
  const r: SliceResult = {
    kit, variant, positions: a.nodes.size, complete: a.complete, outcomes: Object.fromEntries(a.outcomes),
    stalls: a.stalls.length, livelocks: a.livelocks.length, fired: [...a.firedVerbs], ms: Date.now() - t0,
  }
  process.stdout.write(JSON.stringify(r))
}
