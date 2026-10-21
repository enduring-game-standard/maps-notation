import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Anubice/z_en_anubice.c'
const at = (line: number): Cite => `${F}:${line}`

/** `player->meleeWeaponState != 0` (line 240): any melee swing, hit or miss, sets off a fireball. */
const MELEE: DmgType[] = [
  'DEKU_STICK', 'HAMMER_SWING', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER',
  'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'HAMMER_JUMP',
]

export const enAnubice: ActorSpec = {
  overlay: 'ovl_En_Anubice',
  name: 'Anubis',
  role: 'enemy',
  summary: 'A mummy that rises when Link enters its area and mirrors his movement. Swinging a melee weapon makes it shoot a fireball. Its damage table has no health behind it: only fire, a fire arrow or Din\'s Fire, kills it; every other hit only knocks it back.',
  cite: at(45),
  pools: [],
  damage: {
    kind: 'custom',
    entries: {
      ARROW_FIRE: { damage: 2, to: 'defeated', cite: at(404) },
      MAGIC_FIRE: { damage: 3, to: 'defeated', cite: at(404) },
    },
  },
  phases: [
    { id: 'buried', label: 'Anubis lies under the floor', hittable: 'none', cite: at(481) },
    {
      id: 'idle',
      label: 'Anubis hovers, mirroring Link',
      overrides: Object.fromEntries(MELEE.map((d) => [d, { damage: 0, to: 'shoot', cite: at(240) }])),
      cite: at(226),
    },
    { id: 'shoot', label: 'Anubis shoots a fireball', cite: at(303) },
    { id: 'go_home', label: 'Anubis sinks back home', hittable: 'none', cite: at(258) },
  ],
  start: 'buried',
  range: 'far',
  steps: [
    { from: 'buried', to: 'idle', label: 'Link enters its area and Anubis rises', range: 'near', cite: at(213) },
    { from: 'idle', to: 'go_home', label: 'Link leaves its area and Anubis sinks', range: 'far', cite: at(245) },
    { from: 'shoot', to: 'idle', label: 'Anubis throws a fireball at Link', attack: 'fireball', cite: at(308) },
    { from: 'go_home', to: 'buried', label: 'Anubis is back under the floor', cite: at(277) },
  ],
  attacks: [
    {
      id: 'fireball',
      label: 'Anubis fireball',
      damage: 4,
      effect: { kind: 'burn' },
      blockable: true,
      dodgeable: true,
      source: 'src/overlays/actors/ovl_En_Anubice_Fire/z_en_anubice_fire.c:59',
      via: { overlay: 'ovl_En_Anubice_Fire', spawn: at(303) },
      reflect: {
        shields: [{ gear: 'mirror_shield' }],
        as: 'DEKU_STICK',
        damage: 4,
        cite: 'src/overlays/actors/ovl_En_Anubice_Fire/z_en_anubice_fire.c:126',
      },
    },
  ],
  actionFuncs: {
    EnAnubice_FindFlameCircles: 'buried',
    EnAnubice_SetupIdle: 'idle',
    EnAnubice_Idle: 'idle',
    EnAnubice_GoToHome: 'go_home',
    EnAnubice_SetupShootFireball: 'shoot',
    EnAnubice_ShootFireball: 'shoot',
    EnAnubice_SetupDie: { excluded: 'set by the finishing blow (Enemy_StartFinishingBlow); the encounter has already ended', cite: at(409) },
    EnAnubice_Die: { excluded: 'burning death fall after the finishing blow; the encounter has already ended', cite: at(332) },
  },
  atSources: {},
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        ['fireball_blocked_deku_shield', 'fireball_blocked_hylian_shield', 'fireball_blocked_mirror_shield', 'fireball_dodged', 'fireball_reflected_mirror_shield', 'miss_reflect_fireball', 'hit_reflect_fireball__idle'].map((v) => [
          v,
          'the fireball is thrown only on the beat Link swings a melee weapon (line 240), so it always arrives on a beat whose move was the swing: his shield is never up and he is never dodging, and no reflected fireball exists',
        ]),
      ),
      hit_arrow_fire__shoot: 'shoot is entered only by Link\'s own melee swing and returns to idle on that same beat, so no later hit finds it',
      hit_magic_fire__shoot: 'as hit_arrow_fire__shoot',
    },
  },
}
