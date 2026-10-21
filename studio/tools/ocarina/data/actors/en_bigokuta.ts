import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Reaction } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Bigokuta/z_en_bigokuta.c'
const at = (line: number): Cite => `${F}:${line}`

/** The reaction-0x0 entries with nonzero damage: the only hits that can hurt it, and only from behind (z_en_bigokuta.c:780). */
const WOUNDING: [DmgType, number, number][] = [
  ['DEKU_STICK', 2, 135],
  ['SLASH_KOKIRI', 1, 142],
  ['SPIN_KOKIRI', 1, 156],
  ['JUMP_KOKIRI', 2, 159],
  ['JUMP_MASTER', 4, 161],
]
const FACING: DmgType[] = WOUNDING.map(([d]) => d)

/** Facing Link, it shrugs off blade hits (no damage unless Link is behind it), but a nut or boomerang stuns it either way. */
const front: Pick<Phase, 'guards' | 'overrides'> = {
  guards: FACING,
  overrides: {
    DEKU_NUT: { damage: 0, to: 'stunned_nut', cite: at(360) },
    BOOMERANG: { damage: 0, to: 'stunned_boomerang', cite: at(363) },
  },
}
/** Stunned, it stays put and Link walks round behind it. */
const behind: Phase['overrides'] = Object.fromEntries(WOUNDING.map(([d, damage, line]) => [d, { damage, to: 'damaged', cite: at(line) }]))

const phases: Phase[] = [
  { id: 'wait', label: 'Big Octo surfaces', frames: { value: 40, cite: at(320) }, ...front, cite: at(486) },
  { id: 'circle', label: 'Big Octo circles the pool', ...front, cite: at(499) },
  { id: 'turn_wait', label: 'Big Octo reels from ramming Link, then turns', hittable: 'none', frames: { value: 40, cite: at(760) }, cite: at(347) },
  { id: 'turn', label: 'Big Octo turns around', hittable: 'none', cite: at(347) },
  { id: 'stunned_nut', label: 'Big Octo is dazed by a Deku Nut', overrides: behind, frames: { value: 20, cite: at(360) }, cite: at(595) },
  { id: 'stunned_boomerang', label: 'Big Octo is stunned by the Boomerang', overrides: behind, frames: { value: 80, cite: at(363) }, cite: at(595) },
  { id: 'spin', label: 'Big Octo spins back into action', hittable: 'none', frames: { value: [24, 28], cite: at(389) }, cite: at(401) },
  { id: 'damaged', label: 'Big Octo reels from a wound', hittable: 'none', frames: { value: 24, cite: at(371) }, cite: at(373) },
  { id: 'dive', label: 'Big Octo dives from a blast and crashes back up', hittable: 'none', frames: { value: 16, cite: at(336) }, cite: at(337) },
]

const reactions: Record<string, Reaction> = {
  '0x0': {
    damage: true,
    note: 'entries with 0 damage do nothing; a damaging hit wounds it only when it is not facing Link, so the phases guard or route it',
    cite: at(780),
  },
  '0x1': { damage: false, note: 'stun unless already stunned; the nut and boomerang durations differ, so the phases route each', cite: at(775) },
  '0xF': {
    damage: false,
    to: { wait: 'dive', circle: 'dive', stunned_nut: 'dive', stunned_boomerang: 'dive' },
    note: 'an explosion makes it dive and resurface, whichever way it faces',
    cite: at(779),
  },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enBigokuta: ActorSpec = {
  overlay: 'ovl_En_Bigokuta',
  name: 'Big Octo',
  role: 'enemy',
  summary:
    "Jabu-Jabu's miniboss. It circles the pool and rams Link with an unblockable, knockback body. Blade hits only wound it from behind: Link stuns it with a Deku Nut or the Boomerang, walks round, and strikes its back. A bomb makes it dive.",
  cite: at(179),
  pools: [{ id: 'body', label: 'Big Octo', hp: { value: 4, cite: at(131) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'wait',
  range: 'far',
  steps: [
    { from: 'wait', to: 'circle', label: 'Big Octo starts to circle', afterTimer: true, cite: at(495) },
    { from: 'circle', to: 'turn_wait', label: 'Big Octo rams Link', range: 'near', attack: 'body', cite: at(759) },
    { from: 'turn_wait', to: 'turn_wait', label: 'Big Octo knocks Link aside as it turns', range: 'near', attack: 'body', cite: at(742) },
    { from: 'turn_wait', to: 'circle', label: 'Big Octo circles the other way', afterTimer: true, cite: at(591) },
    { from: 'turn', to: 'circle', label: 'Big Octo circles the other way', cite: at(591) },
    { from: 'stunned_nut', to: 'spin', label: 'Big Octo comes to', afterTimer: true, cite: at(617) },
    { from: 'stunned_boomerang', to: 'spin', label: 'Big Octo comes to', afterTimer: true, cite: at(617) },
    { from: 'spin', to: 'spin', label: 'Big Octo spins into Link', range: 'near', attack: 'body', cite: at(742) },
    { from: 'spin', to: 'circle', label: 'Big Octo circles again', afterTimer: true, cite: at(691) },
    { from: 'damaged', to: 'turn', label: 'Big Octo turns around', afterTimer: true, cite: at(628) },
    { from: 'dive', to: 'circle', label: 'Big Octo crashes back up and circles', afterTimer: true, cite: at(577) },
  ],
  attacks: [
    { id: 'body', label: 'Big Octo body', damage: 8, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(105) },
  ],
  actionFuncs: {
    func_809BD84C: post('intro: params 0 waits as an ACTORCAT_PROP for the room to start the fight', 202),
    func_809BD8DC: post('intro: the leap into the pool, before it becomes ACTORCAT_ENEMY', 478),
    func_809BDAE8: post('intro: turning into place, which ends by making it ACTORCAT_ENEMY', 478),
    func_809BDB90: 'wait',
    func_809BDC08: 'circle',
    func_809BDFC8: 'turn*',
    func_809BE058: 'stunned_*',
    func_809BE3E4: 'spin',
    func_809BE180: 'damaged',
    func_809BDF34: 'dive',
    func_809BE26C: post('death animation after health reaches 0; the encounter has already ended', 380),
    func_809BE4A4: post(
      'sinks only after Link has stayed within 250 units and behind it for 80 frames; the near/far band does not hold which side Link is on. It can neither hurt nor be hurt while under: cylinder AT is off, so no AC is registered',
      550,
    ),
    func_809BE518: post('resurfacing after func_809BE4A4, also untouchable and harmless until it circles again', 709),
  },
  atSources: {
    [at(71)]: 'body',
    [at(105)]: 'body',
    [at(122)]: 'body',
  },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        ['deku_stick', 'explosive', 'slash_kokiri', 'spin_kokiri', 'jump_kokiri', 'jump_kokiri_self', 'jump_master'].map((k) => [
          `hit_${k}__stunned_nut`,
          'the Deku Nut daze is 20 frames (one beat), entered only by Link\'s own nut, so it is over before his next move',
        ]),
      ),
      ...Object.fromEntries(
        ['turn_wait', 'stunned_nut', 'spin', 'damaged', 'dive'].map((p) => [
          `${p}_timer_clears`,
          `${p} is left only when its timer runs out (no hit lands there to move it), so no timer marks are ever stranded`,
        ]),
      ),
      link_hurt_overkill: 'the body costs 8, and Link starts and heals in multiples of 16, so a hit never takes more health than he has',
    },
  },
}
