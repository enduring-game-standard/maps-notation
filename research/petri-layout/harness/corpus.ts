import { readFileSync, readdirSync } from 'node:fs'
import { parseNet, type Net } from '../engine/net.ts'

export type Entry = { key: string; set: 'book' | 'heldout'; net: Net; figure?: string }

export function loadCorpus(root: string): Entry[] {
  const out: Entry[] = []
  for (const set of ['book', 'heldout'] as const)
    for (const f of readdirSync(`${root}/corpus/${set}`).filter((f) => f.endsWith('.json')).sort()) {
      const net = parseNet(JSON.parse(readFileSync(`${root}/corpus/${set}/${f}`, 'utf8')))
      const key = f.replace('.json', '')
      out.push({ key, set, net, figure: set === 'book' ? `${key}.png` : undefined })
    }
  return out
}
