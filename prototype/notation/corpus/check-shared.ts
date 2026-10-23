// Verify shared.json: every listed id exists in every listed file, with the same speaker, priority, and arcs among the listed ids.
// Usage (from studio/): npx tsx ../prototype/notation/corpus/check-shared.ts
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '../../../studio/src/core/text'

const here = dirname(fileURLToPath(import.meta.url))
const subnets: { name: string; files: string[]; states: string[]; verbs: string[] }[] = JSON.parse(readFileSync(join(here, 'shared.json'), 'utf8'))
let failures = 0
for (const s of subnets) {
  const problems: string[] = []
  const shapes = s.files.map((f) => {
    const net = parse(readFileSync(join(here, f), 'utf8'))
    const states = new Set(net.states.map((p) => p.id))
    for (const id of s.states) if (!states.has(id)) problems.push(`${f} has no state ${id}`)
    const verbs = net.verbs.filter((v) => s.verbs.includes(v.id))
    for (const id of s.verbs) if (!verbs.some((v) => v.id === id)) problems.push(`${f} has no verb ${id}`)
    const arcs = net.arcs.filter((a) => s.verbs.includes(a.verb) && s.states.includes(a.state)).map((a) => `${a.verb} ${a.kind} ${a.count} ${a.state}`)
    return [...verbs.map((v) => `${v.id} by ${v.by} priority ${v.priority}`), ...arcs].sort().join('\n')
  })
  shapes.forEach((sh, i) => { if (sh !== shapes[0]) problems.push(`${s.files[i]} differs from ${s.files[0]}`) })
  const arcCount = shapes[0].split('\n').filter((l) => / (take|give|need|unless) /.test(l)).length
  failures += problems.length
  console.log(`${s.name}: ${problems.length ? 'FAIL' : 'ok'}, ${s.states.length} states, ${s.verbs.length} verbs, ${arcCount} arcs ${problems.length ? 'checked' : 'identical'} in ${s.files.length} files` + (problems.length ? '\n  ' + problems.join('\n  ') : ''))
}
process.exit(failures ? 1 : 0)
