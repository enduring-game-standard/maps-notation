import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Fz/z_en_fz.c'
const at = (line: number): Cite => `${F}:${line}`

/** Out of the ice, or shrinking into it, the Freezard sets no AC collider (`isFreezing` is false). */
const hidden = { hittable: 'none' as const }

const phases: Phase[] = [
  { id: 'wait', label: 'Freezard hides in the ice', frames: { value: 100, cite: at(428) }, ...hidden, cite: at(708) },
  { id: 'appear', label: 'Freezard rises out of the ice', frames: { value: 20, cite: at(443) }, ...hidden, cite: at(448) },
  { id: 'aim_move', label: 'Freezard turns toward Link', frames: { value: 40, cite: at(463) }, cite: at(471) },
  { id: 'move', label: 'Freezard slides toward Link', cite: at(487) },
  { id: 'aim_freeze', label: 'Freezard turns to breathe on Link', frames: { value: 40, cite: at(497) }, cite: at(501) },
  { id: 'blow', label: 'Freezard breathes freezing mist', frames: { value: 80, cite: at(511) }, cite: at(516) },
  { id: 'disappear', label: 'Freezard sinks back into the ice', ...hidden, cite: at(412) },
  { id: 'still_turn', label: 'Rooted Freezard turns toward Link', frames: { value: 192, cite: at(636) }, cite: at(637) },
  { id: 'still_blow', label: 'Rooted Freezard breathes freezing mist', frames: { value: 64, cite: at(636) }, cite: at(667) },
]

const steps: Step[] = [
  { from: 'wait', to: 'appear', label: 'Freezard senses Link and rises', afterTimer: true, cite: at(437) },
  { from: 'appear', to: 'aim_move', label: 'Freezard is up', afterTimer: true, cite: at(456) },
  { from: 'aim_move', to: 'move', label: 'Freezard starts sliding', afterTimer: true, cite: at(475) },
  { from: 'move', to: 'aim_freeze', label: 'Freezard slides up to Link and stops', move: 'near', cite: at(489) },
  { from: 'aim_freeze', to: 'blow', label: 'Freezard starts breathing', afterTimer: true, cite: at(505) },
  { from: 'blow', to: 'blow', label: 'Freezing mist reaches Link', range: 'near', attack: 'breath', cite: at(857) },
  { from: 'blow', to: 'disappear', label: 'Freezard stops breathing and sinks', afterTimer: true, cite: at(525) },
  { from: 'disappear', to: 'wait', label: 'Freezard is hidden again', cite: at(420) },
  { from: 'still_turn', to: 'still_blow', label: 'Rooted Freezard starts breathing', afterTimer: true, cite: at(636) },
  { from: 'still_blow', to: 'still_blow', label: 'Freezing mist reaches Link', range: 'near', attack: 'breath', cite: at(857) },
  { from: 'still_blow', to: 'still_turn', label: 'Rooted Freezard stops breathing', afterTimer: true, cite: at(636) },
]

const reactions: Record<string, Reaction> = {
  '0x0': { damage: false, note: 'no case in EnFz_ApplyDamage: the hit does nothing', cite: at(393) },
  '0xF': { damage: true, note: 'damage; at zero health the Freezard shatters (EnFz_SetupDespawn)', cite: at(362) },
  '0x2': { damage: true, note: 'fire damage; at zero health the Freezard melts (EnFz_SetupMelt)', cite: at(383) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enFz: ActorSpec = {
  overlay: 'ovl_En_Fz',
  name: 'Freezard',
  role: 'enemy',
  summary: 'An ice statue with six health that breathes a freezing mist the shield cannot stop. A roaming Freezard rises from hiding, slides at Link, breathes, and sinks again; a rooted one turns and breathes on a cycle. Fire melts it; the Kokiri Sword does nothing.',
  cite: at(174),
  pools: [{ id: 'body', label: 'Freezard', hp: { value: 6, cite: at(179) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'wait',
  variants: [
    { id: 'roaming', label: 'Freezard that hides and slides (params below 0)', start: 'wait', cite: at(212) },
    { id: 'rooted', label: 'Freezard that stays in place (params 0 and up)', start: 'still_blow', cite: at(215) },
  ],
  range: 'far',
  steps,
  attacks: [
    { id: 'breath', label: 'Freezing mist', damage: 8, effect: { kind: 'freeze' }, blockable: false, dodgeable: true, source: at(124) },
  ],
  actionFuncs: {
    EnFz_Wait: 'wait',
    EnFz_Appear: 'appear',
    EnFz_AimForMove: 'aim_move',
    EnFz_MoveTowardsPlayer: 'move',
    EnFz_AimForFreeze: 'aim_freeze',
    EnFz_BlowSmoke: 'blow',
    EnFz_Disappear: 'disappear',
    EnFz_BlowSmokeStationary: 'still_*',
    EnFz_Melt: post('melting after a fire hit empties its health; the encounter has already ended', 387),
    EnFz_Despawn: post('shatter, item drop, and despawn after its health is gone; the encounter has already ended', 378),
  },
  atSources: {
    [at(86)]: post('the body cylinder (collider1) is never passed to CollisionCheck_SetAT: only the breath cylinder is, so the body never hits Link (and deals 0 if it did)', 857),
    [at(124)]: 'breath',
  },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: Object.fromEntries(
      ['wait', 'appear', 'aim_move', 'aim_freeze', 'blow', 'still_turn', 'still_blow'].map((p) => [
        `${p}_timer_clears`,
        'no hit changes a Freezard\'s phase (EnFz_ApplyDamage only drains health or kills), so a timed phase is left only when its timer has run out',
      ]),
    ),
  },
}
