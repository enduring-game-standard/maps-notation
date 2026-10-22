import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Sw/z_en_sw.c'
const at = (line: number): Cite => `${F}:${line}`

const phases: Phase[] = [
  { id: 'wall_idle', label: 'Skullwalltula turns about on its wall', cite: at(850) },
  { id: 'wall_spot', label: 'Skullwalltula laughs and turns toward climbing Link', frames: { value: 20, cite: at(863) }, cite: at(868) },
  { id: 'wall_dash', label: 'Skullwalltula dashes at Link', cite: at(888) },
  { id: 'wall_return', label: 'Skullwalltula stops and crawls home', cite: at(913) },
  { id: 'gold_crawl', label: 'Gold Skulltula crawls on its wall', pool: 'gold', cite: at(567) },
  { id: 'gold_emerge', label: 'Gold Skulltula bursts out and leaps', pool: 'gold', hittable: 'none', frames: { value: 10, cite: at(521) }, cite: at(404) },
]
/** The hammer's ground impact within 400 units sets damage to all of a Skullwalltula's health (type 0 only). */
for (const p of phases.filter((x) => x.id.startsWith('wall_'))) p.overrides = { HAMMER_JUMP: { damage: 1, cite: at(356) } }

const steps: Step[] = [
  { from: 'wall_idle', to: 'wall_spot', label: 'Skullwalltula spots Link climbing near it', range: 'near', cite: at(864) },
  { from: 'wall_spot', to: 'wall_idle', label: 'Link is out of its reach, so it settles', range: 'far', cite: at(879) },
  { from: 'wall_spot', to: 'wall_dash', label: 'Skullwalltula lunges', range: 'near', afterTimer: true, cite: at(872) },
  { from: 'wall_dash', to: 'wall_return', label: 'Skullwalltula rams Link', range: 'near', attack: 'ram', cite: at(896) },
  { from: 'wall_dash', to: 'wall_return', label: 'Skullwalltula reaches where Link was', range: 'far', cite: at(896) },
  { from: 'wall_return', to: 'wall_idle', label: 'Skullwalltula is home', cite: at(919) },
  { from: 'gold_crawl', to: 'gold_crawl', label: 'Link brushes the Gold Skulltula', range: 'near', attack: 'ram_gold', cite: at(410) },
  { from: 'gold_emerge', to: 'gold_crawl', label: 'Gold Skulltula lands on the surface', afterTimer: true, cite: at(560) },
]

const attacks: Attack[] = [
  { id: 'ram', label: 'Skullwalltula ram', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(57) },
  { id: 'ram_gold', label: 'Gold Skulltula contact', damage: 16, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(317) },
]

const MELEE = ['deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master', 'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump']
const deadVerbs: Record<string, string> = {
  wall_spot_timer_clears: 'the spot timer is one beat and ticks before any step out of the phase, so it is always spent when the phase is left',
  gold_emerge_timer_clears: 'the emerge phase is left only when its one-beat timer runs out',
  link_hurt_overkill: 'every hit costs 8 or 16 units, or half that with Double Defense, and Link\'s health stays a multiple of the cost, so a hit never finds less health than it takes',
  ...Object.fromEntries(MELEE.map((k) => [
    `miss_${k}__gold_emerge`, 'gold_emerge is only the opening beat, with Link far, and it ends that beat, so no hit that needs Link near can find it',
  ])),
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enSw: ActorSpec = {
  overlay: 'ovl_En_Sw',
  name: 'Skullwalltula',
  role: 'enemy',
  summary:
    'A spider on a wall with one health point. A Skullwalltula turns about until Link climbs near, then laughs, turns, and dashes into him. A Gold Skulltula has double health and double contact damage and only crawls in place; some burst out of the ground first.',
  cite: at(43),
  pools: [
    { id: 'body', label: 'Skullwalltula', hp: { value: 1, cite: at(80) }, then: 'defeated' },
    { id: 'gold', label: 'Gold Skulltula', hp: { value: 2, cite: at(80), ops: [at(319)] }, then: 'defeated' },
  ],
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(14)',
    reactions: {
      '0x0': { damage: true, note: 'every hit applies its damage; an empty pool starts the death fall or spin', cite: at(365) },
    },
  },
  phases,
  start: 'wall_idle',
  variants: [
    { id: 'skullwalltula', label: 'Skullwalltula', start: 'wall_idle', cite: at(338) },
    { id: 'gold', label: 'Gold Skulltula', start: 'gold_crawl', cite: at(340) },
    { id: 'gold_emerging', label: 'Gold Skulltula that bursts out of the ground', start: 'gold_emerge', cite: at(336) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    func_80B0E5E0: 'wall_idle',
    func_80B0E728: 'wall_spot',
    func_80B0E90C: 'wall_return',
    func_80B0E9BC: 'wall_return',
    func_80B0D590: 'gold_crawl',
    func_80B0D364: 'gold_emerge',
    func_80B0D3AC: 'gold_emerge',
    func_80B0D878: post('Gold Skulltula death spin and token spawn after the finishing blow; the encounter has already ended', 380),
    func_80B0DB00: post('Skullwalltula death fall after the finishing blow; the encounter has already ended', 388),
    func_80B0DC7C: post('despawn and item drop after death; drops are out of scope', 708),
  },
  atSources: {
    [at(57)]: 'ram',
    [at(317)]: 'ram_gold',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
