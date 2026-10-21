import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Rd/z_en_rd.c'
const PL = 'src/overlays/actors/ovl_player_actor/z_player.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * `plain` is every Gibdo or Redead that is not crying; mourning another Redead needs a second Redead, so in a
 * one-actor encounter those types behave alike. `crying` stands up before it screams and crouches when home.
 * `silent` carries rdFlags bit 0x80, which keeps every scream from freezing Link.
 */
type Line = 'plain' | 'crying' | 'silent'
const LINES: Line[] = ['plain', 'crying', 'silent']
const NAME: Record<Line, string> = { plain: 'Redead', crying: 'Crying Redead', silent: 'Silent Redead' }
const SCREAMS: Record<Line, boolean> = { plain: true, crying: true, silent: false }

/** How long Link stays caught: the player breaks free once his mash counter passes 100, at 5 per A or B press. */
const GRAB_FRAMES = { value: 21, cite: `${PL}:14249` as Cite }

const phases: Phase[] = [
  { id: 'rise', label: 'Gibdo rises out of its coffin', hittable: 'none', cite: at(842) },
  ...LINES.flatMap((l): Phase[] => [
    { id: `idle_${l}`, label: `${NAME[l]} stands still`, cite: at(267) },
    ...(l === 'crying' ? [{ id: `stand_up_${l}`, label: `${NAME[l]} stands up`, cite: at(659) }] : []),
    { id: `attempt_${l}`, label: `${NAME[l]} turns to face Link`, cite: at(632) },
    { id: `walk_${l}`, label: `${NAME[l]} shuffles toward Link, ready to scream`, cite: at(363) },
    { id: `walk_cd_${l}`, label: `${NAME[l]} shuffles toward Link after screaming`, frames: { value: 60, cite: at(403) }, cite: at(363) },
    { id: `grab_${l}`, label: `${NAME[l]} clings to Link`, frames: GRAB_FRAMES, hittable: 'none', cite: at(919) },
    { id: `released_${l}`, label: `${NAME[l]} lets go of Link`, frames: { value: 15, cite: at(619) }, cite: at(620) },
    { id: `home_${l}`, label: `${NAME[l]} walks home`, cite: at(444) },
    ...(l === 'crying' ? [{ id: `crouch_${l}`, label: `${NAME[l]} crouches down`, cite: at(676) }] : []),
    { id: `damaged_${l}`, label: `${NAME[l]} reels from a hit`, hittable: 'none' as const, cite: at(922) },
    { id: `stunned_${l}`, label: `${NAME[l]} is stunned`, frames: { value: 80, cite: at(776) }, cite: at(782) },
  ]),
]

const steps: Step[] = [
  { from: 'rise', to: 'idle_plain', label: 'Gibdo is out of its coffin', cite: at(337) },
  ...LINES.flatMap((l): Step[] => [
    l === 'crying'
      ? { from: `idle_${l}`, to: `stand_up_${l}`, label: `${NAME[l]} notices Link`, range: 'near', cite: at(310) }
      : { from: `idle_${l}`, to: `attempt_${l}`, label: `${NAME[l]} notices Link`, range: 'near', cite: at(308) },
    ...(l === 'crying' ? [{ from: `stand_up_${l}`, to: `attempt_${l}`, label: `${NAME[l]} is up`, cite: at(664) }] : []),
    { from: `attempt_${l}`, to: `walk_${l}`, label: `${NAME[l]} faces Link and screams`, ...(SCREAMS[l] ? { attack: 'scream_long' } : {}), cite: at(649) },
    { from: `walk_${l}`, to: `walk_cd_${l}`, label: `${NAME[l]} screams`, range: 'near', ...(SCREAMS[l] ? { attack: 'scream' } : {}), cite: at(403) },
    { from: `walk_${l}`, to: `grab_${l}`, label: `${NAME[l]} grabs Link`, range: 'near', attack: 'grab', cite: at(420) },
    { from: `walk_cd_${l}`, to: `grab_${l}`, label: `${NAME[l]} grabs Link`, range: 'near', attack: 'grab', cite: at(420) },
    { from: `walk_cd_${l}`, to: `walk_${l}`, label: `${NAME[l]} can scream again`, afterTimer: true, cite: at(897) },
    { from: `walk_${l}`, to: `home_${l}`, label: `${NAME[l]} loses Link and turns home`, range: 'far', cite: at(379) },
    { from: `walk_cd_${l}`, to: `home_${l}`, label: `${NAME[l]} loses Link and turns home`, range: 'far', cite: at(379) },
    { from: `grab_${l}`, to: `released_${l}`, label: `Link breaks free of the ${NAME[l]}`, afterTimer: true, cite: at(572) },
    { from: `released_${l}`, to: `walk_${l}`, label: `${NAME[l]} reaches for Link again`, afterTimer: true, cite: at(415) },
    { from: `home_${l}`, to: `walk_${l}`, label: `${NAME[l]} turns back toward Link`, range: 'near', cite: at(472) },
    l === 'crying'
      ? { from: `home_${l}`, to: `crouch_${l}`, label: `${NAME[l]} is home`, range: 'far', cite: at(457) }
      : { from: `home_${l}`, to: `idle_${l}`, label: `${NAME[l]} is home`, range: 'far', cite: at(455) },
    ...(l === 'crying' ? [{ from: `crouch_${l}`, to: `idle_${l}`, label: `${NAME[l]} settles`, cite: at(678) }] : []),
    { from: `damaged_${l}`, to: `walk_${l}`, label: `${NAME[l]} recovers toward Link`, range: 'near', cite: at(713) },
    { from: `damaged_${l}`, to: `home_${l}`, label: `${NAME[l]} recovers and turns home`, range: 'far', cite: at(711) },
    { from: `stunned_${l}`, to: `damaged_${l}`, label: `${NAME[l]} comes out of the stun`, afterTimer: true, cite: at(802) },
  ]),
]

const attacks: Attack[] = [
  { id: 'scream_long', label: 'Redead scream (first)', damage: 0, effect: { kind: 'paralyze', frames: { value: 60, cite: at(641) } }, blockable: false, dodgeable: false, source: at(641) },
  { id: 'scream', label: 'Redead scream', damage: 0, effect: { kind: 'paralyze', frames: { value: 40, cite: at(388) } }, blockable: false, dodgeable: false, source: at(388) },
  { id: 'grab', label: 'Redead grab and bite', damage: 8, effect: { kind: 'grab', frames: GRAB_FRAMES, damagePerBeat: 8, release: 'escape' }, blockable: false, dodgeable: true, source: at(563) },
]

const lineOf = (id: string) => LINES.find((l) => id.endsWith(`_${l}`))
const damagedTo: Record<string, string> = {}
const stunTo: Record<string, string> = {}
for (const p of phases) {
  const l = lineOf(p.id)
  if (!l) continue
  damagedTo[p.id] = `damaged_${l}`
  stunTo[p.id] = p.id === `stunned_${l}` ? `damaged_${l}` : `stunned_${l}`
}

const reactions: Record<string, Reaction> = {
  REDEAD_DMG_REACT_NONE: { damage: false, note: 'no interaction', cite: at(848) },
  REDEAD_DMG_REACT_ICE_MAGIC: { damage: false, note: 'no interaction (and the actor stops updating, but Link never emits ice magic)', cite: at(849) },
  REDEAD_DMG_REACT_DAMAGE: { damage: true, to: damagedTo, note: 'damage, then the damaged reel (or death at zero health)', cite: at(875) },
  REDEAD_DMG_REACT_FIRE_MAGIC: { damage: true, to: damagedTo, note: 'damage with a fire filter, then the damaged reel', cite: at(863) },
  REDEAD_DMG_REACT_HOOKSHOT: { damage: true, to: stunTo, note: 'stuns unless already stunned; a stunned one takes the hit as damage and reels', cite: at(854) },
  REDEAD_DMG_REACT_LIGHT_MAGIC: { damage: true, to: stunTo, note: 'as the Hookshot', cite: at(854) },
}

/** Link's swings that reach only near (melee, or centered on Link). */
const NEAR_ONLY = [
  'deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master',
  'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump',
]
/** Swings no Nayru's Love kit carries: in walk_cd only Nayru's Love keeps Link free to swing. */
const NOT_IN_NAYRU_KITS = ['deku_stick', 'hammer_swing', 'hookshot', 'slash_giant', 'magic_fire', 'spin_giant', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master_self', 'hammer_jump']
const ledger = (verbs: string[], why: string) => verbs.map((v) => [v, why] as const)
const deadVerbs: Record<string, string> = Object.fromEntries([
  ...LINES.flatMap((l) => [
    ...ledger(NEAR_ONLY.map((k) => `hit_${k}__home_${l}`), `the ${NAME[l]} walks home only while Link is far and turns back the beat he comes near, and this attack reaches only near`),
    ...ledger([`grab_${l}_timer_clears`], 'the grab phase cannot be hit and is left only when its timer runs out'),
    ...ledger([`walk_cd_${l}_step_2`], 'after a scream the Redead grabs on its next beat if Link is near and turns home if he is far, so its 60-frame scream timer never runs out'),
  ]),
  ...ledger(['link_hurt_overkill'], 'Link starts and heals in whole hearts (even marks), every cost is 2 marks without Double Defense and 1 mark with it, so no cost is ever larger than the health left'),
  ...ledger(NEAR_ONLY.map((k) => `hit_${k}__crouch_crying`), 'the crouch is entered only from home while Link is far and lasts one beat, so a near-only attack never finds it'),
  ...ledger(NEAR_ONLY.map((k) => `hit_${k}__idle_silent`), 'a silent Redead stands idle only at the start or after walking home, both while Link is far, and wakes the beat he comes near'),
  ...(['plain', 'crying'] as const).flatMap((l) =>
    ledger(NOT_IN_NAYRU_KITS.map((k) => `hit_${k}__walk_cd_${l}`), `walk_cd is entered only by a scream, which freezes Link while the ${NAME[l]} grabs him; only Nayru's Love keeps him free, and no Nayru kit carries this attack`),
  ),
  ...ledger(['scream_long_lands_again', 'scream_long_lands_dd_again'], 'the first scream comes only out of idle or standing up, before Link has been frozen'),
  ...ledger(['grab_lands_again', 'grab_lands_dd_again'], 'the Redead cannot grab Link while it already holds him'),
  ...ledger(['link_helpless_grab'], "the fastest escape (21 frames) is one beat, so the grab ends at that beat's end before Link's next move"),
])

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enRd: ActorSpec = {
  overlay: 'ovl_En_Rd',
  name: 'Redead / Gibdo',
  role: 'enemy',
  summary: 'A shambling corpse with eight health. When Link comes close it screams, freezing him in place, then shuffles up, grabs him, and bites until he mashes free. The Hookshot stuns it; swords and Din\'s Fire hurt it.',
  cite: at(166),
  pools: [{ id: 'body', label: 'Redead', hp: { value: 8, cite: at(177) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'idle_plain',
  variants: [
    { id: 'standing', label: 'Gibdo or Redead standing in the room', start: 'idle_plain', cite: at(201) },
    { id: 'coffin', label: 'Gibdo rising out of a coffin', start: 'rise', cite: at(203) },
    { id: 'crying', label: 'Crying Redead', start: 'idle_crying', cite: at(257) },
    { id: 'invisible', label: 'Redead visible only through the Lens', start: 'idle_plain', unseen: true, cite: at(209) },
    { id: 'silent', label: 'Redead whose scream does not freeze Link (rdFlags 0x80)', start: 'idle_silent', cite: at(387) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnRd_RiseFromCoffin: 'rise',
    EnRd_Idle: 'idle_*',
    EnRd_StandUp: 'stand_up_*',
    EnRd_AttemptPlayerFreeze: 'attempt_*',
    EnRd_WalkToPlayer: 'walk_*',
    EnRd_Grab: 'grab_*',
    EnRd_WalkToHome: 'home_*',
    EnRd_Crouch: 'crouch_*',
    EnRd_Damaged: 'damaged_*',
    EnRd_Stunned: 'stunned_*',
    EnRd_WalkToParent: post('walks to mourn another Redead that died; the parent is set only by a second Redead dying, which a one-actor encounter cannot hold', 244),
    EnRd_Dead: post('death animation and fade after the finishing blow; the encounter has already ended', 727),
    actionFunc: post('not an action function: the extractor read the parameter name of EnRd_SetupAction', 163),
  },
  atSources: {
    [at(388)]: 'scream',
    [at(641)]: 'scream_long',
    [at(563)]: 'grab',
    [at(599)]: 'grab',
    [at(417)]: post('sets Link\'s freezeTimer to 0, ending a scream\'s freeze the moment the grab starts; it inflicts nothing', 417),
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: { deadVerbs },
}
