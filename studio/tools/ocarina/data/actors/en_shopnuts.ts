import { standardLoadouts } from '../loadouts'
import { DMG_TYPES } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Shopnuts/z_en_shopnuts.c'
const at = (line: number): Cite => `${F}:${line}`

export const enShopnuts: ActorSpec = {
  overlay: 'ovl_En_Shopnuts',
  name: 'Business Scrub',
  role: 'enemy',
  summary: 'A scrub that hides in the ground, pops up when Link keeps his distance, and spits Deku Nuts at him. It ducks when Link comes close. Any hit that connects, or the quake of a Megaton Hammer striking the ground, makes it give up and turn into a salesman.',
  cite: at(36),
  pools: [{ id: 'scrub', label: 'Business Scrub', hp: { value: 1, cite: at(68) }, then: 'defeated' }],
  damage: {
    kind: 'custom',
    entries: Object.fromEntries(DMG_TYPES.map((d) => [d, { damage: 1, cite: at(266) }])),
  },
  phases: [
    {
      id: 'hidden',
      label: 'Scrub hides in the ground',
      hittable: ['HAMMER_SWING', 'HAMMER_JUMP'],
      cite: at(268),
    },
    { id: 'peek', label: 'Scrub peeks out and turns to Link', cite: at(199) },
    { id: 'throw', label: 'Scrub spits a Deku Nut', cite: at(231) },
    { id: 'peek_after', label: 'Scrub watches after spitting', cite: at(130) },
    { id: 'look_around', label: 'Scrub looks around', cite: at(187) },
  ],
  start: 'hidden',
  range: 'far',
  steps: [
    { from: 'hidden', to: 'peek', label: 'Scrub pops up', range: 'far', cite: at(177) },
    { from: 'hidden', to: 'look_around', label: 'Scrub pops up and looks around', range: 'far', cite: at(175) },
    { from: 'peek', to: 'throw', label: 'Scrub takes aim', range: 'far', cite: at(213) },
    { from: 'peek', to: 'hidden', label: 'Link comes close and the scrub ducks', range: 'near', cite: at(211) },
    { from: 'throw', to: 'peek_after', label: 'Scrub spits a nut', range: 'far', attack: 'nut', cite: at(225) },
    { from: 'throw', to: 'hidden', label: 'Link comes close and the scrub ducks', range: 'near', cite: at(223) },
    { from: 'peek_after', to: 'hidden', label: 'Scrub ducks back down', cite: at(211) },
    { from: 'look_around', to: 'hidden', label: 'Scrub ducks back down', cite: at(195) },
  ],
  attacks: [
    {
      id: 'nut',
      label: 'Spat Deku Nut',
      damage: 8,
      effect: { kind: 'none' },
      blockable: true,
      dodgeable: true,
      source: 'src/overlays/actors/ovl_En_Nutsball/z_en_nutsball.c:59',
      via: { overlay: 'ovl_En_Nutsball', spawn: at(231) },
      reflect: {
        shields: [{ gear: 'deku_shield' }, { gear: 'hylian_shield', ages: ['adult'] }],
        as: 'DEKU_STICK',
        damage: 8,
        cite: 'src/overlays/actors/ovl_En_Nutsball/z_en_nutsball.c:134',
      },
    },
  ],
  actionFuncs: {
    EnShopnuts_Idle: 'hidden',
    EnShopnuts_Burrow: 'hidden',
    EnShopnuts_Peek: 'peek*',
    EnShopnuts_ThrowNut: 'throw',
    EnShopnuts_LookAround: 'look_around',
    EnShopnuts_SpawnSalesman: { excluded: 'after the hit that beats it: it spins, spawns the En_Dns salesman, and removes itself, so the fight is over', cite: at(256) },
  },
  atSources: {},
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_heals: 'the nut lands only on a far beat Link spends neither guarding, dodging, nor attacking (a Deku Nut or any ranged hit ends the fight); in the two bottle kits the only such move is the red potion, which then finds him at full health',
      fairy_revives_link: 'as link_heals: in the bottle kits Link can never be hit, so the fairy is never needed',
      link_hurt_overkill: 'the nut costs 8, or 4 with Double Defense, and every kit\'s health and heal stays a multiple of that',
      miss_reflect_nut__hidden: 'the reflected nut resolves on the beat it was spat, while the scrub is still in peek_after, never after it has ducked',
      nut_blocked_deku_shield: 'a raised Deku Shield always sends the nut back (z_en_nutsball.c:129), and the reflection outranks the plain block',
      scrub_overkill: 'every connecting hit deals 1 against 1 health and ends the fight, so no damage arrives after it is empty',
      ...Object.fromEntries(
        [
          'hit_deku_stick', 'hit_slash_kokiri', 'hit_slash_master', 'hit_slash_giant', 'hit_magic_fire', 'hit_spin_kokiri',
          'hit_spin_giant', 'hit_spin_master', 'hit_jump_kokiri', 'hit_jump_kokiri_self', 'hit_jump_giant',
          'hit_jump_giant_self', 'hit_jump_master', 'hit_jump_master_self',
        ].map((v) => [
          v,
          'this reach needs Link near, and the scrub is up only while Link is far: it ducks on the beat he comes near (lines 211, 223), and while hidden only the hammer quake reaches it',
        ]),
      ),
    },
  },
}
