import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Part/z_en_part.c'
const at = (line: number): Cite => `${F}:${line}`
const debris = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * En_Part is the shared body-part debris actor, and one other job: the ground shockwave a club Moblin's smash sends
 * out (En_Mb spawns it through func_800358DC with a 20-frame timer, z_en_mb.c:894; func_800358DC sets action 2,
 * src/code/z_actor.c:4844). Only that shockwave hurts Link: within 40 units it deals 8 through damagePlayer and
 * knocks him down. The debris actions never touch Link, so they are ledgered out.
 *
 * It has no collider at all, so no shield stops the shockwave and Link cannot hit it. It lives one beat: it reaches
 * Link if he is still near, and dies out if he has backed off. Both ages meet club Moblins (see En_Mb).
 * One shockwave hits once for 8, so the kits carry half a heart: the only way one shockwave can fell Link.
 */
export const enPart: ActorSpec = {
  overlay: 'ovl_En_Part',
  name: 'Moblin shockwave',
  role: 'projectile',
  summary:
    "The shockwave a club Moblin's ground smash sends along the floor. It runs for 20 frames; if it passes within 40 units of Link it costs him 8 and knocks him down, then vanishes. No shield stops it and nothing Link carries can hit it.",
  cite: at(192),
  pools: [],
  damage: { kind: 'none' },
  phases: [
    { id: 'wave', label: 'The shockwave runs along the ground at Link', cite: at(192) },
    { id: 'gone', label: 'The shockwave has spent itself', hittable: 'none', cite: at(197) },
  ],
  start: 'wave',
  range: 'near',
  steps: [
    { from: 'wave', to: 'gone', label: 'The shockwave reaches Link', range: 'near', attack: 'shockwave', cite: at(202) },
    { from: 'wave', to: 'gone', label: 'The shockwave runs out before it reaches Link', range: 'far', cite: at(196) },
  ],
  attacks: [
    { id: 'shockwave', label: 'Moblin shockwave', damage: 8, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(210) },
  ],
  actionFuncs: {},
  states: {
    '0': debris('body-part debris setup (func_80ACDDE8): picks a fall arc for a dead enemy\'s piece; no Link check', 53),
    '1': debris('body-part debris falling (func_80ACE13C) until its timer runs out and it despawns; no Link check', 180),
    '2': { phase: 'wave', cite: at(189) },
    '3': { phase: 'wave', cite: at(192) },
    '4': debris('a dead enemy\'s piece sliding back home while its parent lies at 0 health (func_80ACE7E8); no Link check', 253),
  },
  atSources: { [at(210)]: 'shockwave' },
  loadouts: standardLoadouts(['child', 'adult'], 0.5),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the shockwave hits once for 8 (4 with Double Defense) and every kit starts with 8 health, so a hit never takes more than Link has left',
    },
  },
}
