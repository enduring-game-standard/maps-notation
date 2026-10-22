import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Reaction } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Am/z_en_am.c'
const at = (line: number): Cite => `${F}:${line}`

const bits = (mask: number) => DMG_TYPES.filter((_, i) => (mask >>> i) & 1)
/** sHurtCylinderInit takes 0xFFCFFFFF (z_en_am.c:84); the AC_HARD sBlockCylinderInit takes 0x00400106 (z_en_am.c:104). */
const HURT = bits(0xffcfffff)
const BLOCK = new Set<DmgType>(bits(0x00400106))
/** Din's Fire only pauses the update for the frame it lands (z_en_am.c:862), and the AC_HIT is reset before EnAm_Sleep reads it. */
const PAUSE = new Set<DmgType>(['MAGIC_FIRE', 'MAGIC_LIGHT'])

/**
 * A hit on the sleeping statue never damages it (UpdateDamage needs behavior >= AM_BEHAVIOR_5), but any AC_HIT left on the
 * hurt cylinder wakes it. Hits the hard block cylinder bounces have that AC_HIT cleared first (z_en_am.c:807).
 */
const wake: Phase['overrides'] = Object.fromEntries(
  HURT.filter((d) => !BLOCK.has(d) && !PAUSE.has(d)).map((d) => [d, { damage: 0, to: 'lunge', cite: at(394) }]),
)

const phases: Phase[] = [
  { id: 'sleep', label: 'Armos stands as a statue', overrides: wake, cite: at(385) },
  { id: 'lunge', label: 'Armos hops at Link', cite: at(620) },
  { id: 'cooldown', label: 'Armos pauses after three hops', frames: { value: 40, cite: at(323) }, cite: at(581) },
  { id: 'ricochet', label: 'Armos recoils from a deflected hit', cite: at(769) },
  { id: 'stunned', label: 'Armos is stunned', frames: { value: 100, cite: at(738) }, cite: at(749) },
  { id: 'home', label: 'Armos hops back to its post', cite: at(523) },
]

const ACTIVE = ['lunge', 'cooldown', 'ricochet', 'home'] as const
const all = (to: string) => Object.fromEntries(ACTIVE.map((p) => [p, to]))

const reactions: Record<string, Reaction> = {
  AM_DMG_REACT_NONE: {
    damage: false,
    to: { ...all('ricochet'), stunned: 'defeated' },
    note: 'a hit that cannot kill makes an active Armos ricochet; on a stunned Armos any such hit sets health to 0',
    cite: at(841),
  },
  AM_DMG_REACT_NUT: { damage: false, to: all('stunned'), note: 'a Deku Nut stuns an Armos that is not already stunned', cite: at(824) },
  AM_DMG_REACT_STUN: { damage: false, to: all('stunned'), note: 'Boomerang and Hookshot stun; on a stunned Armos they only spark', cite: at(824) },
  AM_DMG_REACT_ICE: {
    damage: false,
    to: all('defeated'),
    note: 'ice stuns and sets health to 0, so the Armos dies when the stun ends; on a stunned Armos ice does nothing',
    cite: at(827),
  },
  AM_DMG_REACT_MAGIC_FIRE_LIGHT: { damage: false, note: 'skipped by UpdateDamage; it only pauses the update for that frame', cite: at(815) },
  AM_DMG_REACT_KILL: { damage: true, note: 'health is set to 0 and the death recoil starts, in any active or stunned phase', cite: at(837) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enAm: ActorSpec = {
  overlay: 'ovl_En_Am',
  name: 'Armos',
  role: 'enemy',
  summary:
    'A statue that wakes when Link touches or hits it, then hops at him three times and pauses. Child weapons glance off its hard shell unless a Deku Nut, Boomerang, or Hookshot has stunned it; any killing hit or ice finishes it. It goes back to its post when it gives up.',
  cite: at(224),
  pools: [{ id: 'body', label: 'Armos', hp: { value: 1, cite: at(251) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'sleep',
  range: 'far',
  steps: [
    { from: 'sleep', to: 'lunge', label: 'Link touches the statue and it wakes', range: 'near', cite: at(408) },
    { from: 'lunge', to: 'cooldown', label: 'Armos lands its hops on Link', range: 'near', attack: 'lunge_hop', cite: at(668) },
    { from: 'lunge', to: 'lunge', label: 'Armos hops toward Link', range: 'far', move: 'near', cite: at(626) },
    { from: 'lunge', to: 'home', label: 'Armos gives up and turns for home', range: 'far', cite: at(652) },
    { from: 'cooldown', to: 'lunge', label: 'Armos turns to Link and lunges again', afterTimer: true, cite: at(608) },
    { from: 'ricochet', to: 'lunge', label: 'Armos recovers and lunges', cite: at(781) },
    { from: 'stunned', to: 'lunge', label: 'Armos shakes off the stun', afterTimer: true, cite: at(762) },
    { from: 'home', to: 'sleep', label: 'Armos settles back into a statue', cite: at(517) },
  ],
  attacks: [
    { id: 'lunge_hop', label: 'Armos hop', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(123) },
  ],
  actionFuncs: {
    EnAm_Sleep: 'sleep',
    EnAm_Lunge: 'lunge',
    EnAm_Cooldown: 'cooldown',
    EnAm_Ricochet: 'ricochet',
    EnAm_Stunned: 'stunned',
    EnAm_RotateToHome: 'home',
    EnAm_MoveToHome: 'home',
    EnAm_RotateToInit: 'home',
    EnAm_RecoilFromDamage: post('entered only once health is 0 (z_en_am.c:764, 839); it is the death recoil, ending in a dying lunge and a bomb, after the finishing blow', 366),
    EnAm_Statue: post('the ARMOS_STATUE params variant is a pushable block: it gets no damage table, no attack collider, and turns into ACTORCAT_BG, and UpdateDamage is skipped for it (z_en_am.c:858)', 238),
    actionFunc: post('the parameter name of EnAm_SetupAction, not an action function', 183),
  },
  atSources: { [at(123)]: 'lunge_hop' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      ...Object.fromEntries(
        ['deku_nut', 'deku_stick', 'slingshot', 'boomerang', 'slash_kokiri', 'spin_kokiri', 'jump_kokiri', 'jump_kokiri_self'].map((k) => [
          `hit_${k}__ricochet`,
          'the ricochet is 8 frames, entered only by a hit or the bounce of a hop, and its step back to lunge fires on the same beat, so no later swing finds it',
        ]),
      ),
      body_empty_in_ricochet: 'no hit can land in ricochet (see hit_deku_stick__ricochet)',
      ...Object.fromEntries(
        ['deku_stick', 'slash_kokiri', 'spin_kokiri', 'jump_kokiri', 'jump_kokiri_self'].map((k) => [
          `hit_${k}__home`,
          'home is entered only while Link is far and is left on the next beat; a melee swing needs near, and closing in spends that beat',
        ]),
      ),
      stunned_timer_clears: 'stunned is left only when its timer runs out or by defeat, which ends the encounter, so no timer marks are ever stranded',
      link_hurt_overkill: 'the hop costs 8 (4 with Double Defense), and Link starts and heals in multiples of 16, so a hit never takes more health than he has',
    },
  },
}
