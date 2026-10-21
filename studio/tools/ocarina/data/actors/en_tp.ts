import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Tp/z_en_tp.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
/** Actor_UpdateAll skips an actor's update while freezeTimer runs, so it sets no AC or AT collider. */
const FROZEN: Cite = 'src/code/z_actor.c:2495'

/** Phases a Deku Nut can freeze it in, each with its own frozen copy that resumes it. */
const STUNNABLE = ['wait_rising', 'hover', 'attack', 'sink_plunge'] as const
const LABEL: Record<(typeof STUNNABLE)[number], string> = {
  wait_rising: 'rising', hover: 'hovering', attack: 'attacking', sink_plunge: 'diving',
}

const phases: Phase[] = [
  { id: 'wait_buried', label: 'Tailpasaran waits under the floor', hittable: 'none', cite: at(229) },
  { id: 'wait_rising', label: 'Tailpasaran rises out of the floor', frames: { value: 60, cite: at(413) }, cite: at(432) },
  { id: 'hover', label: 'Tailpasaran hovers above Link', frames: { value: [40, 55], cite: at(367) }, cite: at(372) },
  { id: 'attack', label: 'Tailpasaran swoops at Link', frames: { value: 200, cite: at(247) }, cite: at(251) },
  { id: 'sink_plunge', label: 'Tailpasaran dives into the floor', cite: at(523) },
  { id: 'sink_rise', label: 'Tailpasaran rises back under its home', hittable: 'none', frames: { value: 80, cite: at(503) }, cite: at(519) },
  ...STUNNABLE.map((p): Phase => ({
    id: `stunned_${p}`, label: `Tailpasaran is frozen while ${LABEL[p]}`, hittable: 'none', frames: { value: 80, cite: at(582) }, cite: FROZEN,
  })),
]

const steps: Step[] = [
  { from: 'wait_buried', to: 'wait_rising', label: 'Link comes close; Tailpasaran rises', range: 'near', cite: at(425) },
  { from: 'wait_rising', to: 'wait_buried', label: 'Link moves away; Tailpasaran sinks back', range: 'far', cite: at(449) },
  { from: 'wait_rising', to: 'hover', label: 'Tailpasaran takes to the air', range: 'near', afterTimer: true, cite: at(446) },
  { from: 'hover', to: 'attack', label: 'Tailpasaran turns on Link', afterTimer: true, cite: at(404) },
  { from: 'attack', to: 'attack', label: 'Tailpasaran chases Link', range: 'far', move: 'near', cite: at(274) },
  { from: 'attack', to: 'sink_plunge', label: 'Tailpasaran shocks Link and dives away', range: 'near', attack: 'shock', cite: at(260) },
  { from: 'attack', to: 'sink_plunge', label: 'Tailpasaran gives up and dives', afterTimer: true, cite: at(277) },
  { from: 'sink_plunge', to: 'sink_rise', label: 'Tailpasaran is under the floor and returns home', cite: at(503) },
  { from: 'sink_rise', to: 'wait_buried', label: 'Tailpasaran is back at its home', afterTimer: true, cite: at(493) },
  ...STUNNABLE.map((p): Step => ({ from: `stunned_${p}`, to: p, label: 'Tailpasaran thaws', afterTimer: true, cite: FROZEN })),
]

export const enTp: ActorSpec = {
  overlay: 'ovl_En_Tp',
  name: 'Tailpasaran',
  role: 'enemy',
  summary:
    'An electric head trailing seven body segments. It rises from the floor, hovers, then swoops at Link and shocks him. The head cannot be hurt; the segments have one health point each, and killing one kills the whole chain. A Deku Nut freezes every part for 80 frames, during which nothing can hit it.',
  cite: at(4),
  pools: [{ id: 'body', label: 'Tailpasaran body segment', hp: { value: 1, cite: at(159) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      ENTP_DMG_REACT_NO_EFFECT: { damage: false, note: 'no effect', cite: at(565) },
      ENTP_DMG_REACT_STUN: {
        damage: true,
        to: Object.fromEntries(STUNNABLE.map((p) => [p, `stunned_${p}`])),
        note: 'freezes every part for 80 frames (its table damage is 0)',
        cite: at(582),
      },
      ENTP_DMG_REACT_VULNERABLE: { damage: true, note: 'a body segment takes the damage; at 0 health the head dies with it', cite: at(570) },
      ENTP_DMG_REACT_MELEE_BACKLASH: {
        damage: true,
        note: 'a body segment takes the damage like VULNERABLE; the melee backlash shock on Link comes from `backlash`',
        cite: at(570),
      },
    },
  },
  phases,
  start: 'wait_buried',
  range: 'far',
  steps,
  attacks: [
    { id: 'shock', label: 'Tailpasaran shock', damage: 8, effect: { kind: 'shock' }, blockable: true, dodgeable: true, source: at(75) },
    { id: 'backlash', label: 'Tailpasaran electric backlash', damage: 8, effect: { kind: 'shock' }, blockable: false, dodgeable: false, source: at(75) },
  ],
  backlash: { attack: 'backlash', cite: at(76) },
  actionFuncs: {
    EnTp_Head_WaitPlayerAndRise: 'wait_*',
    EnTp_Head_Hover: 'hover',
    EnTp_Head_Attack: 'attack',
    EnTp_Head_SinkIntoGroundAndReappear: 'sink_*',
    EnTp_BodyElem: post('the seven body segments are separate EnTp instances that trail the head; their health is the body pool, since one segment dying kills the head and the chain (z_en_tp.c:576)', 576),
    EnTp_BodyElemRemnant: post('debris a dying segment spawns after the finishing blow', 328),
    EnTp_Dying: post('death sequence after the finishing blow; the encounter has already ended', 296),
    actionFunc: post('the parameter of EnTp_SetupAction, not a function; every real target is ledgered by name', 144),
  },
  atSources: {
    [at(75)]: 'shock',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      sink_rise_timer_clears: 'nothing can hit it under the floor, so it leaves sink_rise only by its timer',
      ...Object.fromEntries(STUNNABLE.map((p) => [`stunned_${p}_timer_clears`, 'nothing can hit a frozen Tailpasaran, so it thaws only by its timer'])),
      link_hurt_overkill: 'the shock costs 8, or 4 with Double Defense, and every kit starts at 32 health, so no hit finds Link with less health than it takes',
      shock_lands_again: 'the Link spec shocks for 20 frames, one beat, which ends before the Tailpasaran can strike again (it dives after every shock)',
      shock_lands_dd_again: 'as shock_lands_again',
      backlash_lands: 'every melee hit that connects drains the one-point body pool, and the pool running out ends the encounter before the backlash resolves, so the shock is never felt',
      backlash_lands_dd: 'as backlash_lands',
      backlash_lands_again: 'as backlash_lands',
      backlash_lands_dd_again: 'as backlash_lands',
      backlash_nayru: 'as backlash_lands',
      link_helpless_shock: 'the shock lasts one beat and wears off at that beat\'s end, before Link\'s next turn',
    },
  },
}
