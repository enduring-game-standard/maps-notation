import type { DmgType } from '../../inventory'
import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Ssh/z_en_ssh.c'
const at = (line: number): Cite => `${F}:${line}`

/** The body cylinder takes these, and a hit on it stuns (`EnSsh_CheckHitBack`). */
const BODY: DmgType[] = [
  'DEKU_NUT', 'EXPLOSIVE', 'HAMMER_SWING', 'HOOKSHOT', 'MAGIC_FIRE',
  'ARROW_NORMAL', 'ARROW_FIRE', 'ARROW_ICE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2', 'ARROW_UNK3',
]
/** The legs cylinder that faces Link takes the rest of DMG_DEFAULT, and a hit on it only sways (`EnSsh_CheckHitFront`). */
const FRONT: DmgType[] = [
  'DEKU_STICK', 'SLINGSHOT', 'BOOMERANG', 'SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT', 'MAGIC_ICE', 'MAGIC_LIGHT',
  'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT', 'JUMP_MASTER', 'UNKNOWN_1', 'UNBLOCKABLE', 'UNKNOWN_2',
]
/** The hammer's ground impact sets `actorCtx.unk_02`, which stuns every Ssh in the room whatever it struck. */
const QUAKE: DmgType[] = ['HAMMER_JUMP']
const STUNS = [...BODY, ...QUAKE]
const HITTABLE = [...STUNS, ...FRONT]

type Pos = 'hang' | 'drop' | 'down' | 'rise'
const POSES: Pos[] = ['hang', 'drop', 'down', 'rise']
const POS_LABEL: Record<Pos, string> = {
  hang: 'hangs at its ceiling',
  drop: 'drops toward Link',
  down: 'hangs at Link\'s height',
  rise: 'climbs back to its ceiling',
}
const POS_CITE: Record<Pos, number> = { hang: 667, drop: 755, down: 683, rise: 772 }
const arm = (armed: boolean) => (armed ? '_armed' : '')
const armLabel = (armed: boolean) => (armed ? ', primed to spin into Link' : '')

const STUN_FRAMES = { value: 120, cite: at(276) }
const SWAY_FRAMES = { value: 60, cite: at(507) }

const stunTo = (to: string): Phase['overrides'] =>
  Object.fromEntries(STUNS.map((d) => [d, { damage: 0, to, cite: at(QUAKE.includes(d) ? 548 : 537) }]))
const swayTo = (to: string): Phase['overrides'] => Object.fromEntries(FRONT.map((d) => [d, { damage: 0, to, cite: at(507) }]))

const phases: Phase[] = [
  ...POSES.flatMap((p) =>
    [false, true].map((armed): Phase => ({
      id: `${p}${arm(armed)}`,
      label: `Cursed Skulltula person ${POS_LABEL[p]}${armLabel(armed)}`,
      hittable: HITTABLE,
      overrides: { ...stunTo(`stunned_${p}`), ...swayTo(`sway${arm(armed)}`) },
      cite: at(POS_CITE[p]),
    })),
  ),
  ...[false, true].map((armed): Phase => ({
    id: `sway${arm(armed)}`,
    label: `Cursed Skulltula person sways from a hit to its front${armLabel(armed)}`,
    hittable: HITTABLE,
    overrides: stunTo('stunned_down'),
    frames: SWAY_FRAMES,
    cite: at(507),
  })),
  ...POSES.map((p): Phase => ({
    id: `stunned_${p}`,
    label: `Cursed Skulltula person is stunned (${POS_LABEL[p]})`,
    hittable: HITTABLE,
    frames: STUN_FRAMES,
    cite: at(831),
  })),
  ...[false, true].map((armed): Phase => ({
    id: `ground${arm(armed)}`,
    label: `Grounded cursed Skulltula person waits by Link${armLabel(armed)}`,
    hittable: HITTABLE,
    overrides: { ...stunTo('ground_stunned'), ...swayTo(`ground_sway${arm(armed)}`) },
    cite: at(375),
  })),
  ...[false, true].map((armed): Phase => ({
    id: `ground_sway${arm(armed)}`,
    label: `Grounded cursed Skulltula person sways from a hit to its front${armLabel(armed)}`,
    hittable: HITTABLE,
    overrides: stunTo('ground_stunned'),
    frames: SWAY_FRAMES,
    cite: at(507),
  })),
  { id: 'ground_stunned', label: 'Grounded cursed Skulltula person is stunned', hittable: HITTABLE, frames: STUN_FRAMES, cite: at(831) },
]

const steps: Step[] = [
  ...[false, true].flatMap((armed): Step[] => {
    const a = arm(armed)
    return [
      { from: `hang${a}`, to: `drop${a}`, label: 'It drops at Link', range: 'near', cite: at(670) },
      { from: `drop${a}`, to: `down${a}`, label: 'It lands at Link\'s height', range: 'near', cite: at(765) },
      { from: `drop${a}`, to: `rise${a}`, label: 'Link is gone, so it climbs back', range: 'far', cite: at(761) },
      { from: `down${a}`, to: `rise${a}`, label: 'Link is gone, so it climbs back', range: 'far', cite: at(705) },
      { from: `rise${a}`, to: `drop${a}`, label: 'Link is back, so it drops again', range: 'near', cite: at(780) },
      { from: `rise${a}`, to: `hang${a}`, label: 'It reaches its ceiling', range: 'far', cite: at(783) },
      { from: `sway${a}`, to: `down${a}`, label: 'It stops swaying', afterTimer: true, cite: at(432) },
      { from: `ground_sway${a}`, to: `ground${a}`, label: 'It stops swaying', afterTimer: true, cite: at(432) },
    ]
  }),
  ...POSES.map((p): Step => ({ from: `stunned_${p}`, to: `${p}_armed`, label: 'The stun wears off and it spins', afterTimer: true, cite: at(316) })),
  { from: 'ground_stunned', to: 'ground_armed', label: 'The stun wears off and it spins', afterTimer: true, cite: at(316) },
  { from: 'down_armed', to: 'down', label: 'It spins into Link', range: 'near', attack: 'spin', cite: at(489) },
  { from: 'sway_armed', to: 'sway', label: 'It spins into Link', range: 'near', attack: 'spin', cite: at(489) },
  { from: 'ground_armed', to: 'ground', label: 'It spins into Link', range: 'near', attack: 'spin', cite: at(489) },
  { from: 'ground_sway_armed', to: 'ground_sway', label: 'It spins into Link', range: 'near', attack: 'spin', cite: at(489) },
]

/**
 * Not a collider hit: `EnSsh_CheckHitPlayer` calls `damagePlayer(play, -8)` when its OC cylinders touch Link,
 * then knocks him back. OC contact is not stopped by a shield.
 */
const attacks: Attack[] = [
  { id: 'spin', label: 'Cursed Skulltula person spins into Link', damage: 8, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(489) },
]

const NEAR_HITS = ['deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master', 'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump']
const STUN_HITS = ['arrow_normal', 'arrow_fire', 'arrow_ice', 'arrow_light', 'hammer_swing', 'hookshot', 'magic_fire', 'hammer_jump']
const deadVerbs: Record<string, string> = {
  ...Object.fromEntries(['stunned_hang', 'stunned_drop', 'stunned_down', 'stunned_rise', 'ground_stunned'].map((p) => [
    `${p}_timer_clears`, 'a stun is left only when its timer runs out, and no hit changes the phase during a stun, so no timer is ever left behind',
  ])),
  link_hurt_overkill: 'the spin costs 8 units, or 4 with Double Defense, and Link\'s health stays a multiple of that cost, so a hit never finds less health than it takes',
  ...Object.fromEntries(NEAR_HITS.flatMap((k) => ['hang', 'rise'].map((p) => [
    `hit_${k}__${p}`, `this hit needs Link near, and the unprimed ${p} phase is entered only while Link is far and is left (it drops at him) the beat he comes near`,
  ]))),
  ...Object.fromEntries(STUN_HITS.flatMap((k) => ['sway_armed', 'ground_sway_armed'].map((p) => [
    `hit_${k}__${p}`, `${p} is entered only by Link's near melee hit, and with Link near it spins into him and drops to the unprimed sway that same beat, so no later hit finds it`,
  ]))),
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enSsh: ActorSpec = {
  overlay: 'ovl_En_Ssh',
  name: 'Cursed Skulltula person',
  role: 'enemy',
  summary:
    'A cursed member of the House of Skulltula family, hanging on a thread. It drops to Link\'s height when he is near and climbs back when he leaves. It has no way to die. A hit to its body stuns it, and when the stun ends it spins and primes itself to bump Link for half a heart with a knockback. A hit to the legs facing Link only sways it.',
  cite: at(51),
  pools: [],
  damage: {
    kind: 'custom',
    entries: Object.fromEntries([
      ...BODY.map((d) => [d, { damage: 0, cite: at(220) }]),
      ...QUAKE.map((d) => [d, { damage: 0, cite: at(548) }]),
      ...FRONT.map((d) => [d, { damage: 0, cite: at(228) }]),
    ]),
  },
  phases,
  start: 'hang',
  variants: [
    { id: 'hanging', label: 'Cursed Skulltula person hanging from the ceiling', start: 'hang', cite: at(813) },
    { id: 'grounded', label: 'Cursed Skulltula person spawned near the floor, which never climbs away', start: 'ground', cite: at(817) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnSsh_Start: post('first-frame dispatcher: it hands off to Wait (hanging) or Land (grounded) the same frame; the variants carry the choice', 812),
    EnSsh_Wait: 'hang',
    EnSsh_Drop: 'drop',
    EnSsh_Land: 'drop',
    EnSsh_Idle: 'down',
    EnSsh_Return: 'rise',
    EnSsh_Talk: post('conversation after Link talks to it; the beat model has no talk move and talking changes nothing in combat', 676),
    actionFunc: post('not an action function: the parameter name in EnSsh_SetupAction', 131),
  },
  atSources: {
    [at(72)]: post('this cylinder\'s base is AT_NONE (line 64) and it is only ever registered with CollisionCheck_SetAC (lines 565, 573, 576), so its ATELEM_ON never touches Link', 64),
    [at(107)]: post('the JntSph AT collider is registered only when colChkInfo.health is 0; health starts at 1 (line 81) and nothing in the actor lowers it', 608),
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
