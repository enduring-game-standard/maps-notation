import type { Age, Gear, Loadout } from '../spec'

/** One kit per concern, so each stays small: analysis explores every kit, and the kits add rather than multiply. */
const KITS: Record<string, { age: Age; gear: Gear[] }> = {
  child_blade: { age: 'child', gear: ['kokiri_sword', 'deku_shield', 'deku_sticks', 'deku_nuts', 'slingshot', 'boomerang', 'bombs'] },
  child_spin: { age: 'child', gear: ['kokiri_sword', 'deku_shield', 'magic', 'green_potion'] },
  child_dins: { age: 'child', gear: ['kokiri_sword', 'deku_shield', 'magic', 'dins_fire'] },
  child_nayru: { age: 'child', gear: ['kokiri_sword', 'hylian_shield', 'magic', 'nayrus_love'] },
  child_lens: { age: 'child', gear: ['kokiri_sword', 'deku_shield', 'magic', 'lens_of_truth'] },
  child_bottles: { age: 'child', gear: ['kokiri_sword', 'deku_shield', 'fairy', 'red_potion'] },
  adult_blade: { age: 'adult', gear: ['master_sword', 'hylian_shield', 'hookshot', 'megaton_hammer', 'bow', 'bombs', 'bombchus'] },
  adult_spin: { age: 'adult', gear: ['master_sword', 'mirror_shield', 'magic', 'green_potion'] },
  adult_giant: { age: 'adult', gear: ['biggoron_sword', 'giants_knife', 'magic', 'double_defense'] },
  adult_arrows: { age: 'adult', gear: ['master_sword', 'mirror_shield', 'bow', 'fire_arrows', 'ice_arrows', 'light_arrows', 'magic'] },
  adult_dins: { age: 'adult', gear: ['master_sword', 'hylian_shield', 'magic', 'dins_fire'] },
  adult_nayru: { age: 'adult', gear: ['master_sword', 'hylian_shield', 'magic', 'nayrus_love'] },
  adult_lens: { age: 'adult', gear: ['master_sword', 'hylian_shield', 'magic', 'lens_of_truth'] },
  adult_bottles: { age: 'adult', gear: ['master_sword', 'hylian_shield', 'fairy', 'blue_potion', 'double_defense'] },
}

/** The shared test kits for the ages that meet an actor. `extra` adds gear to a kit, such as a mask the actor reacts to. */
export const standardLoadouts = (ages: Age[], hearts = 2, extra: Partial<Record<string, Gear[]>> = {}): Loadout[] =>
  Object.entries(KITS)
    .filter(([, k]) => ages.includes(k.age))
    .map(([id, k]) => ({ id, age: k.age, hearts, gear: [...k.gear, ...(extra[id] ?? [])] }))
