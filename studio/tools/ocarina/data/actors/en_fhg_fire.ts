import { standardLoadouts } from '../loadouts'
import type { DmgType } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Fhg_Fire/z_en_fhg_fire.c'
const at = (line: number): Cite => `${F}:${line}`
const ex = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/**
 * Only the energy ball calls CollisionCheck_SetAC (line 642), and its AC element accepts the three slashes, DMG_SHIELD,
 * and the giant and master spin and jump attacks (0x0D900700, line 90). Any accepted hit ends the green ball's run at
 * Link: a shield hit makes it burst on the shield (BALL_IMPACT, line 514), any other sends it back toward Phantom Ganon
 * (FHGFIRE_LIGHT_BLUE, line 540). Either way it leaves this encounter, so the hit is the encounter's end.
 */
const sentBack = { damage: 0, to: 'defeated', cite: at(540) }
const entries: Partial<Record<DmgType, { damage: number; to?: string; cite: Cite }>> = {
  SLASH_KOKIRI: sentBack,
  SLASH_MASTER: sentBack,
  SLASH_GIANT: sentBack,
  SPIN_GIANT: sentBack,
  SPIN_MASTER: sentBack,
  JUMP_GIANT: sentBack,
  JUMP_MASTER: sentBack,
  SHIELD: { damage: 0, to: 'defeated', cite: at(514) },
}

const phases: Phase[] = [
  { id: 'ball_launched', label: 'Energy ball leaves the spear tip, aimed at Link', cite: at(164) },
  { id: 'ball_close', label: 'Energy ball is on top of Link', cite: at(547) },
  /** Strike, burst, and shock waves never call CollisionCheck_SetAC, so nothing of Link's connects. */
  { id: 'bolt', label: 'Lightning bolt comes down', hittable: 'none', frames: { value: 7, cite: at(205) }, cite: at(117) },
  { id: 'burst', label: 'Lightning bursts where it struck', hittable: 'none', cite: at(218) },
  { id: 'waves', label: 'Eight shock waves roll out along the floor', hittable: 'none', cite: at(253) },
  { id: 'gone', label: 'The ball or the lightning has spent itself', hittable: 'none', cite: at(633) },
]

const steps: Step[] = [
  { from: 'ball_launched', to: 'ball_close', label: 'Energy ball flies at Link', move: 'near', cite: at(461) },
  { from: 'ball_close', to: 'gone', label: 'Energy ball bursts on Link', range: 'near', attack: 'ball', cite: at(553) },
  /** The ball's heading is fixed at launch (lines 172-174) and only changes when it is sent back; if Link has moved off, it flies on into the floor or a wall. */
  { from: 'ball_close', to: 'gone', label: 'Energy ball misses and fizzles on the floor', range: 'far', cite: at(609) },
  { from: 'bolt', to: 'burst', label: 'Bolt strikes and bursts', afterTimer: true, cite: at(218) },
  /** The burst is spawned with rot.x 500, so its scale is 5.0 > 3.0 and it sets AT (lines 135, 364-367); its cylinder is 65 units around the strike. */
  { from: 'burst', to: 'waves', label: 'The burst catches Link', range: 'near', attack: 'lightning', cite: at(367) },
  { from: 'burst', to: 'waves', label: 'The burst flashes out of reach', range: 'far', cite: at(253) },
  { from: 'waves', to: 'gone', label: 'A shock wave rolls through Link', attack: 'lightning', cite: at(321) },
]

export const enFhgFire: ActorSpec = {
  overlay: 'ovl_En_Fhg_Fire',
  name: "Phantom Ganon's energy ball and lightning",
  role: 'projectile',
  summary:
    "Phantom Ganon's magic. The energy ball flies straight at where Link stood and shocks him with a large electrified knockback if it reaches him; a sword sends it back and a shield bursts it. The lightning bolt the phantom horse calls down bursts where it lands and sends eight shock waves rolling out along the floor. Link cannot touch the lightning.",
  cite: at(4),
  pools: [],
  damage: { kind: 'custom', entries },
  phases,
  start: 'ball_launched',
  variants: [
    { id: 'energy_ball', label: 'Energy ball (params FHGFIRE_ENERGY_BALL), thrown by Phantom Ganon', start: 'ball_launched', cite: at(157) },
    { id: 'lightning', label: 'Lightning strike (params FHGFIRE_LIGHTNING_STRIKE), called down by the phantom horse', start: 'bolt', cite: at(116) },
  ],
  range: 'far',
  steps,
  attacks: [
    {
      id: 'ball',
      label: 'Energy ball',
      damage: 16,
      effect: { kind: 'shock' },
      blockable: true,
      dodgeable: true,
      source: at(553),
      onBlock: { to: 'defeated', cite: at(514) },
    },
    { id: 'lightning', label: 'Lightning', damage: 32, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(89) },
  ],
  actionFuncs: {},
  states: {
    EnFhgFire_EnergyBall: { phase: 'ball_launched', cite: at(164) },
    'EnFhgFire_EnergyBall within 25 units of Link': { phase: 'ball_close', cite: at(547) },
    'EnFhgFire_EnergyBall FHGFIRE_LIGHT_BLUE': ex("the ball sent back, flying at Phantom Ganon: the parent's rally, modeled in Boss_Ganondrof's spec; it has left this encounter", 540),
    'EnFhgFire_EnergyBall FHGFIRE_LIGHT_REFLECT': ex('Phantom Ganon bats the ball back at Link: part of the rally in the parent spec; a ball he returns starts over as a new launched ball', 597),
    'EnFhgFire_EnergyBall kill timer': ex('the 30-frame wait after the ball bursts or fizzles, with draw off and no collider set', 633),
    EnFhgFire_LightningStrike: { phase: 'bolt', cite: at(117) },
    EnFhgFire_LightningBurst: { phase: 'burst', cite: at(129) },
    'EnFhgFire_LightningBurst from the ball': ex('the burst the energy ball leaves on Link is spawned with rot.x 0xC8, scale 2.0, so it never sets AT (needs > 3.0); visual only', 628),
    EnFhgFire_LightningShock: { phase: 'waves', cite: at(125) },
    EnFhgFire_LightningTrail: ex('visual lightning trails: no collider is initialized for this params (only shock, burst, and ball get one)', 108),
    EnFhgFire_SpearLight: ex('glow on the spear tip: no collider', 108),
    EnFhgFire_PhantomWarp: ex('warp portal effect for Phantom Ganon entering and leaving paintings: no collider', 108),
  },
  atSources: {
    [at(89)]: 'lightning',
    [at(553)]: 'ball',
  },
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      bolt_timer_clears: 'the bolt timer is 7 frames, one beat, and the bolt is left only by its afterTimer step, so the timer is always spent when it leaves',
      link_hurt_overkill: 'every attack here is 16 or 32, which divides Link\'s 2 hearts exactly, and Link falls (or a fairy revives him) before a second hit can arrive, so no hit lands on zero health',
      hit_slash_master__ball_launched: 'the launched ball is only the opening phase, with Link far; the beat Link closes in, the ball also flies to him, so no melee or shield hit finds it here',
      hit_slash_giant__ball_launched: 'as hit_slash_master__ball_launched',
      hit_shield__ball_launched: 'as hit_slash_master__ball_launched',
      hit_spin_giant__ball_launched: 'as hit_slash_master__ball_launched',
      hit_spin_master__ball_launched: 'as hit_slash_master__ball_launched',
      hit_jump_giant__ball_launched: 'as hit_slash_master__ball_launched',
      hit_jump_giant_self__ball_launched: 'as hit_slash_master__ball_launched',
      hit_jump_master__ball_launched: 'as hit_slash_master__ball_launched',
      hit_jump_master_self__ball_launched: 'as hit_slash_master__ball_launched',
      ball_lands_again: 'shock lasts 20 frames, one beat, and wears off at the end of the beat it lands, so no second hit finds Link still shocked',
      ball_lands_dd_again: 'as ball_lands_again',
      lightning_lands_again: 'as ball_lands_again',
      lightning_lands_dd_again: 'as ball_lands_again',
      link_helpless_shock: 'as ball_lands_again: the one-beat shock is over before Link\'s next move',
    },
  },
}
