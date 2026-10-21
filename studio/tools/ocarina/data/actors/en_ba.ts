import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Ba/z_en_ba.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

const phases: Phase[] = [
  { id: 'idle', label: 'Tentacle sways', cite: at(157) },
  { id: 'swing_windup', label: 'Tentacle rears back over Link', frames: { value: 20, cite: at(239) }, cite: at(247) },
  { id: 'swing_lash', label: 'Tentacle lashes down', frames: { value: 10, cite: at(262) }, cite: at(287) },
  /** Recoil sets unk_14C = 1, and the AC collider is only set while unk_14C >= 2. */
  { id: 'recoil', label: 'Tentacle recoils out of reach', hittable: 'none', frames: { value: 20, cite: at(348) }, cite: at(487) },
]

const steps: Step[] = [
  { from: 'idle', to: 'swing_windup', label: 'Tentacle reaches for Link', range: 'near', cite: at(206) },
  { from: 'swing_windup', to: 'swing_lash', label: 'Tentacle swings down at Link', range: 'near', afterTimer: true, attack: 'lash', cite: at(288) },
  { from: 'swing_windup', to: 'idle', label: 'Link is out of reach', range: 'far', cite: at(337) },
  { from: 'swing_lash', to: 'swing_windup', label: 'Tentacle rears back again', range: 'near', afterTimer: true, cite: at(314) },
  { from: 'swing_lash', to: 'idle', label: 'Tentacle settles', range: 'far', afterTimer: true, cite: at(312) },
  { from: 'recoil', to: 'idle', label: 'Tentacle recovers', afterTimer: true, cite: at(398) },
]

export const enBa: ActorSpec = {
  overlay: 'ovl_En_Ba',
  name: 'Parasitic Tentacle',
  role: 'enemy',
  summary:
    'A tentacle hanging inside Lord Jabu-Jabu. It swings at Link when he comes within reach and knocks him back. Only the Boomerang can hurt it; each hit takes one of its four health and sends it recoiling out of reach.',
  cite: at(4),
  pools: [{ id: 'body', label: 'Tentacle', hp: { value: 4, cite: at(135) }, then: 'defeated' }],
  /** Any AC hit takes exactly one health, whatever the attack's damage. The AC element accepts only 0x10, DMG_BOOMERANG (line 62). */
  damage: { kind: 'custom', entries: { BOOMERANG: { damage: 1, to: 'recoil', cite: at(476) } } },
  phases,
  start: 'idle',
  range: 'far',
  steps,
  attacks: [
    /** The element's effect is NONE, but on AT_HIT the code knocks Link back itself (line 331). */
    { id: 'lash', label: 'Tentacle lash', damage: 4, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(72) },
  ],
  actionFuncs: {
    EnBa_Idle: 'idle',
    EnBa_SwingAtPlayer: 'swing_*',
    EnBa_RecoilFromDamage: 'recoil',
    EnBa_Die: post('death flail after the fourth hit sets health to 0; the encounter has already ended', 478),
    EnBa_FallAsBlob: post('the pink blobs spawned as EN_BA_DEAD_BLOB when a tentacle dies; they have no collider and despawn', 413),
    actionFunc: post('the parameter name in EnBa_SetupAction, not an action function', 95),
  },
  atSources: { [at(72)]: 'lash' },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      recoil_timer_clears: 'recoil is left only once its timer runs out, or by defeat, which ends the encounter',
      miss_boomerang: 'the Boomerang misses only in recoil, which lasts one beat and is entered by Link\'s own hit, so it is over before his next move',
      link_hurt_overkill: 'every lash costs exactly one health mark, so Link\'s health reaches zero exactly and is never overshot',
      body_overkill: 'each hit takes exactly one health, so the pool reaches zero exactly',
    },
  },
}
