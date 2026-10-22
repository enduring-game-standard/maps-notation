import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Reaction, Step } from '../../spec'
import type { DmgType } from '../../inventory'

const F = 'src/overlays/actors/ovl_En_Bw/z_en_bw.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * A lit Torch Slug (flame size unk_248 not 0) takes no damage: func_809D0584 applies damage only when the flame
 * is out, but the hit still puts the flame out and sends it reeling. These are the types its table answers
 * with reaction 0xF or 0x6 (the hammer types are handled with the quake below).
 */
const SHELL_STOPS: DmgType[] = [
  'EXPLOSIVE', 'ARROW_NORMAL', 'SLASH_MASTER', 'SLASH_GIANT', 'ARROW_FIRE', 'ARROW_LIGHT', 'ARROW_UNK1', 'ARROW_UNK2',
  'ARROW_UNK3', 'MAGIC_FIRE', 'MAGIC_LIGHT', 'SPIN_KOKIRI', 'SPIN_GIANT', 'SPIN_MASTER', 'JUMP_KOKIRI', 'JUMP_GIANT',
  'JUMP_MASTER',
]
/** Table damage of the two hammer types (sDamageTable rows 6 and 30). A hammer hitting the floor sets actorCtx.unk_02. */
const HAMMER = { HAMMER_SWING: 2, HAMMER_JUMP: 4 } as const

const LIT = ['crawl_wander', 'crawl_cooldown', 'aim', 'crawl_chase', 'jump_lunge']

type Overrides = NonNullable<Phase['overrides']>
const litOverrides: Overrides = {
  ...Object.fromEntries(SHELL_STOPS.map((d) => [d, { damage: 0, to: 'hurt', cite: at(727) }])),
  HAMMER_SWING: { damage: 0, to: 'flipped', cite: at(761) },
  HAMMER_JUMP: { damage: 0, to: 'flipped', cite: at(761) },
}
const hammer = (to: string, line: number): Overrides => ({
  HAMMER_SWING: { damage: HAMMER.HAMMER_SWING, to, cite: at(line) },
  HAMMER_JUMP: { damage: HAMMER.HAMMER_JUMP, to, cite: at(line) },
})
/** While stunned (unk_23C set), a second stun or ice hit is ignored, damage and all. */
const stunIgnoresIce: Overrides = { ARROW_ICE: { damage: 0, cite: at(719) } }

const phases: Phase[] = [
  { id: 'crawl_wander', label: 'Torch Slug crawls about, aflame', overrides: litOverrides, cite: at(358) },
  { id: 'crawl_cooldown', label: 'Torch Slug crawls about after a chase', frames: { value: 150, cite: at(385) }, overrides: litOverrides, cite: at(360) },
  { id: 'aim', label: 'Torch Slug raises its eyestalks at Link', overrides: litOverrides, cite: at(430) },
  { id: 'crawl_chase', label: 'Torch Slug chases Link', frames: { value: 200, cite: at(446) }, overrides: litOverrides, cite: at(368) },
  { id: 'jump_lunge', label: 'Torch Slug leaps at Link', overrides: litOverrides, cite: at(462) },
  { id: 'hurt', label: 'Torch Slug reels, flame out', frames: { value: 25, cite: at(626) }, overrides: hammer('flipped', 761), cite: at(630) },
  { id: 'crawl_flee', label: 'Torch Slug crawls away from Link, flame out', frames: { value: 600, cite: at(655) }, overrides: hammer('flipped', 761), cite: at(389) },
  { id: 'stunned_upright', label: 'Torch Slug is stunned, flame out', frames: { value: 80, cite: at(721) }, overrides: { ...hammer('flipped', 761), ...stunIgnoresIce }, cite: at(672) },
  { id: 'flipped', label: 'Torch Slug is flipped on its back, flame out', frames: { value: 1000, cite: at(498) }, overrides: hammer('jump_righting', 758), cite: at(508) },
  { id: 'stunned_flipped', label: 'Torch Slug is stunned on its back', frames: { value: 80, cite: at(721) }, overrides: { ...hammer('jump_righting', 758), ...stunIgnoresIce }, cite: at(686) },
  { id: 'jump_righting', label: 'Torch Slug flips itself upright', hittable: 'none', cite: at(713) },
]

const steps: Step[] = [
  { from: 'crawl_wander', to: 'aim', label: 'Torch Slug notices Link', range: 'near', cite: at(362) },
  { from: 'crawl_cooldown', to: 'crawl_wander', label: 'Torch Slug is ready to notice Link again', afterTimer: true, cite: at(360) },
  { from: 'aim', to: 'crawl_chase', label: 'Torch Slug sets off after Link', cite: at(445) },
  { from: 'crawl_chase', to: 'crawl_chase', label: 'Torch Slug crawls toward Link', range: 'far', move: 'near', cite: at(371) },
  { from: 'crawl_chase', to: 'jump_lunge', label: 'Torch Slug leaps at Link', range: 'near', cite: at(376) },
  { from: 'crawl_chase', to: 'crawl_cooldown', label: 'Torch Slug gives up the chase', afterTimer: true, cite: at(384) },
  { from: 'jump_lunge', to: 'crawl_chase', label: 'Torch Slug lands on Link', range: 'near', attack: 'flame', cite: at(471) },
  { from: 'jump_lunge', to: 'crawl_chase', label: 'Torch Slug lands short', range: 'far', cite: at(491) },
  { from: 'hurt', to: 'crawl_flee', label: 'Torch Slug turns to flee', afterTimer: true, cite: at(656) },
  { from: 'crawl_flee', to: 'crawl_flee', label: 'Torch Slug crawls away from Link', range: 'near', move: 'far', cite: at(395) },
  { from: 'crawl_flee', to: 'crawl_wander', label: 'Torch Slug relights and wanders', afterTimer: true, cite: at(409) },
  { from: 'stunned_upright', to: 'crawl_flee', label: 'Torch Slug shakes off the stun and flees', afterTimer: true, cite: at(681) },
  { from: 'flipped', to: 'jump_righting', label: 'Torch Slug kicks itself over', afterTimer: true, cite: at(531) },
  { from: 'stunned_flipped', to: 'jump_righting', label: 'Torch Slug shakes off the stun and kicks itself over', afterTimer: true, cite: at(687) },
  { from: 'jump_righting', to: 'crawl_wander', label: 'Torch Slug lands upright, aflame', cite: at(574) },
]

const stunTo = Object.fromEntries([...LIT, 'hurt', 'crawl_flee'].map((p) => [p, 'stunned_upright']).concat([['flipped', 'stunned_flipped']]))
const hurtTo = Object.fromEntries([...LIT, 'crawl_flee', 'stunned_upright'].map((p) => [p, 'hurt']))
const reactions: Record<string, Reaction> = {
  '0x0': { damage: false, note: 'reaction 0 is ignored: no damage, no reaction', cite: at(713) },
  '0x1': { damage: true, to: stunTo, note: 'stun (blue flash, 80 frames) and put the flame out, unless already stunned; table damage is 0', cite: at(722) },
  '0xE': { damage: true, to: stunTo, note: 'ice: damage, stun, and put the flame out, unless already stunned', cite: at(720) },
  '0xF': { damage: true, to: hurtTo, note: 'damage only with the flame out (lit phases override to 0), then reel unless flipped; dies at zero health', cite: at(749) },
  '0x6': { damage: true, to: hurtTo, note: 'as 0xF (the table damage is 0); the actor also skips its action function that frame', cite: at(779) },
}

const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enBw: ActorSpec = {
  overlay: 'ovl_En_Bw',
  name: 'Torch Slug',
  role: 'enemy',
  summary:
    'A slug wrapped in flame. While lit it takes no damage and burns on contact; any real hit puts the flame out and it flees, and only then can it be hurt. A Deku Nut, Hookshot, or ice arrow stuns it and douses the flame. A hammer quake flips it onto its back.',
  cite: at(148),
  pools: [{ id: 'body', label: 'Torch Slug', hp: { value: 6, cite: at(158) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'crawl_wander',
  range: 'far',
  steps,
  attacks: [{ id: 'flame', label: 'Torch Slug flame', damage: 8, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(78) }],
  actionFuncs: {
    func_809CEA24: 'crawl_*',
    func_809CF7AC: 'aim',
    func_809CF984: 'jump_lunge',
    func_809CE884: 'jump_*',
    func_809CFC4C: 'flipped',
    func_809CFF98: 'jump_righting',
    func_809D0268: 'hurt',
    func_809D0424: 'stunned_*',
    func_809D014C: ex('fade-out after the finishing blow; the encounter has already ended', 605),
    actionFunc: ex('not an action function: the parameter name of EnBw_SetupAction', 144),
  },
  atSources: {
    [at(78)]: 'flame',
    [at(814)]: 'flame',
    [at(794)]: ex('the flame collider is only set while unk_248 > 0.4, and on those frames line 814 has set FIRE, so NONE never reaches Link', 831),
  },
  /** The hammer quake is the only way onto its back, so the adult kits whose weapons should meet a flipped slug carry it. */
  loadouts: standardLoadouts(['child', 'adult'], 2, {
    adult_spin: ['megaton_hammer'],
    adult_giant: ['megaton_hammer'],
    adult_arrows: ['megaton_hammer'],
    adult_dins: ['megaton_hammer'],
  }),
  expected: {
    deadVerbs: {
      hurt_timer_clears: 'hurt is left only by its own timer running out; it lasts one beat, so nothing lands in it to move it early',
      hit_deku_nut__hurt: 'hurt lasts one beat (25 frames) and is entered only by Link\'s own hit, so it is gone before his next move',
      hit_hookshot__hurt: 'as hit_deku_nut__hurt',
      hit_arrow_ice__hurt: 'as hit_deku_nut__hurt',
      hit_hammer_swing__hurt: 'as hit_deku_nut__hurt',
      hit_hammer_jump__hurt: 'as hit_deku_nut__hurt',
      hit_spin_kokiri: 'this verb covers hurt, flipped, and stunned_flipped. Hurt is never hit (see hit_deku_nut__hurt), and only the hammer quake flips the slug, which a child cannot use',
      hit_jump_kokiri: 'as hit_spin_kokiri',
      hit_jump_kokiri_self: 'as hit_spin_kokiri',
    },
  },
}
