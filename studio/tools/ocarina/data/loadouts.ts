import type { Age, Gear, Loadout } from '../spec'

/**
 * One kit per concern, so each stays small: analysis explores every kit, and the kits add rather than multiply.
 * Magic kits arrive with enough magic for a cast or two, which bounds the meter's states.
 */
const KITS: Record<string, { age: Age; gear: Gear[]; magic?: number }> = {
  child_blade: { age: 'child', gear: ['kokiri_sword', 'deku_shield', 'deku_sticks', 'deku_nuts', 'slingshot', 'boomerang', 'bombs'] },
  child_spin: { age: 'child', gear: ['deku_nuts', 'kokiri_sword', 'deku_shield', 'magic', 'green_potion'], magic: 4 },
  child_dins: { age: 'child', gear: ['deku_nuts', 'kokiri_sword', 'deku_shield', 'magic', 'dins_fire'], magic: 12 },
  child_nayru: { age: 'child', gear: ['deku_nuts', 'kokiri_sword', 'hylian_shield', 'magic', 'nayrus_love'], magic: 24 },
  child_lens: { age: 'child', gear: ['deku_nuts', 'kokiri_sword', 'deku_shield', 'magic', 'lens_of_truth'], magic: 4 },
  child_bottles: { age: 'child', gear: ['deku_nuts', 'kokiri_sword', 'deku_shield', 'fairy', 'red_potion'] },
  adult_blade: { age: 'adult', gear: ['deku_nuts', 'master_sword', 'hylian_shield', 'hookshot', 'megaton_hammer', 'bow', 'bombs', 'bombchus'] },
  adult_spin: { age: 'adult', gear: ['deku_nuts', 'master_sword', 'mirror_shield', 'magic', 'green_potion'], magic: 4 },
  adult_giant: { age: 'adult', gear: ['deku_nuts', 'biggoron_sword', 'giants_knife', 'magic', 'double_defense'], magic: 4 },
  adult_arrows: { age: 'adult', gear: ['deku_nuts', 'master_sword', 'mirror_shield', 'bow', 'fire_arrows', 'ice_arrows', 'light_arrows', 'magic'], magic: 8 },
  adult_dins: { age: 'adult', gear: ['deku_nuts', 'master_sword', 'hylian_shield', 'magic', 'dins_fire'], magic: 12 },
  adult_nayru: { age: 'adult', gear: ['deku_nuts', 'master_sword', 'hylian_shield', 'magic', 'nayrus_love'], magic: 24 },
  adult_lens: { age: 'adult', gear: ['deku_nuts', 'master_sword', 'hylian_shield', 'magic', 'lens_of_truth'], magic: 4 },
  adult_bottles: { age: 'adult', gear: ['deku_nuts', 'master_sword', 'hylian_shield', 'fairy', 'blue_potion', 'double_defense'] },
}

/** The shared test kits for the ages that meet an actor. `extra` adds gear to a kit, such as a mask the actor reacts to. */
export const standardLoadouts = (ages: Age[], hearts = 2, extra: Partial<Record<string, Gear[]>> = {}): Loadout[] =>
  Object.entries(KITS)
    .filter(([, k]) => ages.includes(k.age))
    .map(([id, k]) => ({ id, age: k.age, hearts, gear: ['deku_nuts', ...k.gear, ...(extra[id] ?? [])], ...(k.magic !== undefined ? { magic: k.magic } : {}) }))
