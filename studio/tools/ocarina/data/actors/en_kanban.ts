import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Kanban/z_en_kanban.c'
const at = (line: number): Cite => `${F}:${line}`
const piece = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * A square signpost. It never registers its AT collider (only CollisionCheck_SetAC and SetOC, lines 436-437),
 * so it cannot hurt Link. It can be hit: any hit its AC accepts, past a 6-frame grace (line 316), cuts a piece
 * off and sends it flying (lines 314-320). A slash cuts along the swing (line 327), anything else cuts the post
 * (line 329); the model keeps one cut phase, since every further hit cuts again until nothing is left.
 * The sign has no health and no defeat. It is whole again once Link is more than 500 units away (lines 438-440),
 * or when Zelda's Lullaby calls the pieces back (line 760); the model has no verb for playing a song, so only
 * the first is carried.
 *
 * Both ages meet it: the sign reads Link's age for its text and height (lines 242, 254).
 */
const cuts = Object.fromEntries(
  DMG_TYPES.map((d): [DmgType, { damage: number; to: string; cite: Cite }] => [d, { damage: 0, to: 'sign_cut', cite: at(314) }]),
)

export const enKanban: ActorSpec = {
  overlay: 'ovl_En_Kanban',
  name: 'Signpost',
  role: 'hazard',
  summary:
    'A square signpost Link can cut to pieces. Every hit it accepts cuts part of it away; it cannot hurt Link and cannot be destroyed for good, since it stands whole again once Link walks off.',
  cite: at(290),
  pools: [],
  damage: { kind: 'custom', entries: cuts },
  phases: [
    { id: 'sign_whole', label: 'The sign stands whole', cite: at(301) },
    { id: 'sign_cut', label: 'The sign has been cut', cite: at(338) },
  ],
  start: 'sign_whole',
  range: 'far',
  steps: [{ from: 'sign_cut', to: 'sign_whole', label: 'Link is far off and the sign is whole again', range: 'far', cite: at(440) }],
  attacks: [],
  actionFuncs: {},
  states: {
    ENKANBAN_SIGN: { phase: 'sign_*', cite: at(301) },
    ENKANBAN_AIR: piece('a cut piece flying off; pieces never initialize a collider (line 235)', 457),
    ENKANBAN_UNUSED: piece('never assigned; shares the flying-piece case', 458),
    ENKANBAN_GROUND: piece('a cut piece lying on the ground; pieces never initialize a collider (line 235)', 616),
    ENKANBAN_WATER: piece('a cut piece floating in water; pieces never initialize a collider (line 235)', 617),
    ENKANBAN_REPAIR: piece('a cut piece flying back to the post after Zelda\'s Lullaby; pieces never initialize a collider (line 235)', 768),
  },
  atSources: {
    [at(121)]: { excluded: 'the sign never calls CollisionCheck_SetAT: its update registers only AC and OC', cite: at(436) },
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt: 'the sign has no attack (it never registers AT), so Link never takes damage here',
      link_hurt_overkill: 'as link_hurt',
      link_heals: 'Link is never hurt, so a potion or fairy never has missing health to fill',
      fairy_revives_link: 'Link is never hurt, so he never reaches zero health',
      link_fell: 'as fairy_revives_link',
    },
  },
}
