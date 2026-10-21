import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Okuta/z_en_okuta.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enOkuta: ActorSpec = {
  overlay: 'ovl_En_Okuta',
  name: 'Octorok',
  role: 'enemy',
  summary:
    'A water-dwelling octopus with one health point. It surfaces when Link is at a distance, spits rocks at him, and sinks when he comes close. Any damaging hit kills it; an ice arrow freezes it first.',
  cite: at(37),
  pools: [{ id: 'body', label: 'Octorok', hp: { value: 1, cite: at(89) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      '0x0': { damage: true, note: 'a hit with damage starts the finishing blow; a hit with no damage and no reaction (Deku Nut, magic) does nothing', cite: at(574) },
      '0x3': { damage: true, to: 'defeated', note: 'ice arrows freeze it, and the freeze ends in death', cite: at(579) },
    },
  },
  phases: [
    { id: 'submerged', label: 'Octorok waits under the water', hittable: 'none', cite: at(645) },
    { id: 'appear', label: 'Octorok surfaces', cite: at(305) },
    { id: 'float', label: 'Octorok floats and aims', cite: at(349) },
    { id: 'shoot', label: 'Octorok rears up to spit a rock', cite: at(374) },
    { id: 'hide', label: 'Octorok sinks', cite: at(330) },
  ],
  start: 'submerged',
  range: 'far',
  steps: [
    { from: 'submerged', to: 'appear', label: 'Octorok surfaces at Link', range: 'far', cite: at(301) },
    { from: 'appear', to: 'hide', label: 'Octorok sees Link close and sinks', range: 'near', cite: at(310) },
    { from: 'appear', to: 'float', label: 'Octorok settles to aim', range: 'far', cite: at(312) },
    { from: 'float', to: 'hide', label: 'Link comes close and the Octorok sinks', range: 'near', cite: at(364) },
    { from: 'float', to: 'shoot', label: 'Octorok faces Link and rears up', range: 'far', cite: at(369) },
    { from: 'shoot', to: 'float', label: 'Octorok spits a rock', range: 'far', attack: 'rock', cite: at(381) },
    { from: 'shoot', to: 'hide', label: 'Link comes close and the Octorok sinks', range: 'near', cite: at(402) },
    { from: 'hide', to: 'submerged', label: 'Octorok is under', cite: at(337) },
  ],
  attacks: [{ id: 'rock', label: 'Octorok rock', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(60) }],
  actionFuncs: {
    EnOkuta_WaitToAppear: 'submerged',
    EnOkuta_Appear: 'appear',
    EnOkuta_WaitToShoot: 'float',
    EnOkuta_Shoot: 'shoot',
    EnOkuta_Hide: 'hide',
    EnOkuta_WaitToDie: post('hit reaction after the finishing blow (health is set to 0); the encounter has already ended', 576),
    EnOkuta_Die: post('death animation and item drop after the finishing blow; the encounter has already ended', 448),
    EnOkuta_Freeze: post('frozen after an ice arrow already dealt the finishing blow; it only counts down to death', 471),
    EnOkuta_ProjectileFly: post('the rock is a second En_Okuta instance (params != 0) that runs this function; it is carried as the rock attack', 169),
  },
  atSources: {
    [at(60)]: 'rock',
    [at(508)]: post(
      'a rock bounced off a Deku Shield (or an adult Hylian Shield) turns into a player attack (AT_TYPE_PLAYER, DMG_DEKU_STICK) that can hit the Octorok, never Link. The spec types have no way to say a blocked attack becomes a hit on the enemy, so the reflection is not modeled',
      507,
    ),
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the rock is the only damage, and in every kit Link starts at 32 health and loses 8 (4 with Double Defense) per rock, so his health reaches exactly 0 and never has damage left over',
    },
  },
}
