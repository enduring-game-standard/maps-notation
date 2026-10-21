import { loadDispositions } from './data/actors'
import { isExcluded } from './spec'
const out = (await loadDispositions()).filter((d) => !isExcluded(d)).map((d) => d.overlay).sort()
const boss = out.filter((o) => /^ovl_Boss_/.test(o)), rest = out.filter((o) => !/^ovl_Boss_/.test(o))
let s = 20261021
const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648
const pool = [...rest], pick: string[] = [], n = Math.ceil(rest.length / 4)
while (pick.length < n) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
console.log(`seed 20261021 (LCG 1103515245/12345 mod 2^31); modeled ${out.length}; bosses ${boss.length}; others ${rest.length}; sample ${n}`)
console.log('bosses: ' + boss.join(' '))
console.log('sample: ' + pick.sort().join(' '))
