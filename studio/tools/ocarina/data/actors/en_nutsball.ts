import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Nutsball/z_en_nutsball.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * The nut a Deku Scrub spits (spawned by En_Dekunuts, En_Hintnuts, En_Shopnuts, En_Dnt_Nomal).
 * Any hit its collider accepts destroys it (AC_HIT, line 123, then Actor_Kill at line 148): that is Link's win.
 * A nut that breaks on Link, a shield, or the ground is gone too, but not by Link's hit, so it ends in `gone`.
 *
 * A shield stops it either way. With the Deku Shield, or the Hylian Shield as an adult (lines 127-128), the
 * blocked nut is turned around as a player attack that can hit the scrub (lines 131-134); with any other
 * shield it breaks (line 148). Either way it is no longer a threat to Link, so both end in `gone`. The
 * reflected nut strikes the scrub, not this nut, so `Attack.reflect` (which resolves against this actor)
 * belongs on the scrub's own `via` attack, not here.
 *
 * Both ages meet it: the reflect test reads Link's age (line 128).
 * One nut hits once for 8, so the kits carry half a heart: the only way one nut can fell Link.
 */
const breaks = Object.fromEntries(
  DMG_TYPES.map((d): [DmgType, { damage: number; to: string; cite: Cite }] => [d, { damage: 0, to: 'defeated', cite: at(148) }]),
)

export const enNutsball: ActorSpec = {
  overlay: 'ovl_En_Nutsball',
  name: 'Deku Scrub nut',
  role: 'projectile',
  summary:
    'A nut a Deku Scrub spits at Link. It flies straight for 30 frames, then drops, and breaks on the first thing it meets. It hits Link once for half a heart; a raised shield stops it (a Deku Shield, or a Hylian Shield held by adult Link, sends it back at the scrub), and any attack knocks it out of the air.',
  cite: at(109),
  pools: [],
  damage: { kind: 'custom', entries: breaks },
  phases: [
    { id: 'flying', label: 'The nut flies at Link', frames: { value: 30, cite: at(103) }, cite: at(109) },
    { id: 'gone', label: 'The nut has broken or been sent back', hittable: 'none', cite: at(148) },
  ],
  start: 'flying',
  range: 'near',
  steps: [
    { from: 'flying', to: 'gone', label: 'The nut strikes Link', range: 'near', attack: 'nut', cite: at(123) },
    { from: 'flying', to: 'gone', label: 'The nut misses, drops, and breaks on the ground', range: 'far', afterTimer: true, cite: at(122) },
  ],
  attacks: [{ id: 'nut', label: 'Deku nut', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(59) }],
  actionFuncs: {
    EnNutsball_Projectile: 'flying',
    EnNutsball_WaitForObject: {
      excluded: "waits for the spawning scrub's object to load before it flies; the object is the scrub's own (sObjectIds), so this ends before the nut is drawn",
      cite: at(99),
    },
  },
  atSources: {
    [at(59)]: 'nut',
    [at(134)]: {
      excluded: 'set when a shield reflects the nut: the collider becomes AT_TYPE_PLAYER (line 132), which can hit enemies but not Link',
      cite: at(132),
    },
  },
  loadouts: standardLoadouts(['child', 'adult'], 0.5),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the nut hits once for 8 (4 with Double Defense) and every kit starts with 8 health, so a hit never takes more than Link has left',
    },
  },
}
