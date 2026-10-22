import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Anubice_Fire/z_en_anubice_fire.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * One fireball is one strike. A shield bounce ends it (exploding, or reflected back at Anubis by the Mirror Shield),
 * and a hit on Link leaves it flying on with Link already hurt, so it never strikes twice.
 * Link starts at half a heart so the strike and its burn can make him fall.
 */
export const enAnubiceFire: ActorSpec = {
  overlay: 'ovl_En_Anubice_Fire',
  name: "Anubis's fireball",
  role: 'projectile',
  summary:
    'A fireball Anubis spits at 15 units a frame. Its AT collider is live for 30 frames once it has grown, dealing 4 and setting Link on fire. A raised shield makes it explode; the Mirror Shield instead sends it back as a player attack that hurts Anubis. It has no health and nothing reads its AC hits, so Link cannot destroy it.',
  cite: 'src/overlays/actors/ovl_En_Anubice/z_en_anubice.c:303',
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'flying', label: 'The fireball flies at Link', cite: at(218) },
    { id: 'spent', label: 'The fireball has burst or burned out', hittable: 'none', cite: at(211) },
  ],
  start: 'flying',
  range: 'far',
  steps: [{ from: 'flying', to: 'spent', label: 'The fireball reaches Link', attack: 'fireball', cite: at(218) }],
  attacks: [{ id: 'fireball', label: 'Fireball', damage: 4, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(59) }],
  actionFuncs: {
    func_809B26EC: 'flying',
    func_809B27D8: 'flying',
    func_809B2B48: 'spent',
  },
  atSources: {
    [at(59)]: 'fireball',
    [at(130)]: {
      excluded: 'after a Mirror Shield bounce the fireball turns AT_TYPE_PLAYER with DMG_DEKU_STICK and flies back: it can hurt Anubis, not Link',
      cite: at(129),
    },
  },
  loadouts: standardLoadouts(['child', 'adult'], 0.5),
  expected: {
    deadVerbs: {
      fireball_lands_again: 'one fireball strikes at most once, so it never finds Link still burning from an earlier strike',
      fireball_lands_dd_again: 'as fireball_lands_again',
    },
  },
}
