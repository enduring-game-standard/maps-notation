import { readFileSync, readdirSync } from 'node:fs'
import { parseNet } from '../engine/net.ts'
import { analyze } from '../engine/structure.ts'
for (const dir of ['corpus/book', 'corpus/heldout']) for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const net = parseNet(JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')))
  const t0 = Date.now()
  const s = analyze(net)
  const roles: Record<string, string[]> = {}
  for (const [p, r] of s.placeRole) if (r.kind !== 'spine') (roles[r.kind] ??= []).push(p)
  console.log(`${f.padEnd(26)} ${Date.now() - t0}ms spines: ${s.spines.map((sp) => `${sp.open ? 'open' : 'cyc'}[${sp.places.join(' ')}]`).join(' ')}  ${Object.entries(roles).map(([k, v]) => `${k}: ${v.join(' ')}`).join('  ')}`)
}
