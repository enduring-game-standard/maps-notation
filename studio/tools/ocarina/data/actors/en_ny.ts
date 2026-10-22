import { standardLoadouts } from '../loadouts'
import { DMG_TYPES } from '../../inventory'
import type { ActorSpec, Cite, Excluded, Reaction } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Ny/z_en_ny.c'
const at = (line: number): Cite => `${F}:${line}`
const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

/** The element's AC flags 0xFFCFFFFF: everything but DMG_SHIELD and DMG_MIR_RAY. */
const HITTABLE = DMG_TYPES.filter((d) => d !== 'SHIELD' && d !== 'MIR_RAY')

/** Any hit zeroes stoneTimer (z_en_ny.c:347): a stone Spike that is hit skips the rest of its wait and lies dormant. */
const toDormant = { stone: 'dormant' }
const hurts = (note: string, line: number): Reaction => ({ damage: true, to: toDormant, note, cite: at(line) })

const reactions: Record<string, Reaction> = {
  '0x0': { damage: false, to: toDormant, note: 'no case in the switch, so no damage; the hit still cuts the stone wait short', cite: at(347) },
  '0xF': hurts('damage applies while it is stone', 333),
  '0x1': hurts('damage applies while it is stone (Hookshot)', 337),
  '0x2': hurts('damage applies while it is stone (fire)', 342),
  '0xE': hurts('falls through to 0xF: damage applies while it is stone; it only changes the item drop', 330),
}

export const enNy: ActorSpec = {
  overlay: 'ovl_En_Ny',
  name: 'Spike',
  role: 'enemy',
  summary:
    'A spiked ball that rolls at Link with its spikes out, then curls into stone. Only the stone form can be hurt; a hit while it rolls just makes it turn to stone. The Kokiri Sword, Deku Sticks, the Slingshot, and the Boomerang do no damage to it.',
  cite: at(4),
  pools: [{ id: 'body', label: 'Spike', hp: { value: 2, cite: at(129) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases: [
    {
      id: 'roll', label: 'Spike rolls with its spikes out', frames: { value: 180, cite: at(191) },
      overrides: Object.fromEntries(HITTABLE.map((d) => [d, { damage: 0, to: 'stone', cite: at(327) }])),
      cite: at(239),
    },
    { id: 'stone', label: 'Spike is stone', frames: { value: 60, cite: at(202) }, cite: at(283) },
    { id: 'dormant', label: 'Spike lies dormant as stone', cite: at(206) },
    { id: 'waking', label: 'Spike pushes its spikes out', guards: HITTABLE, cite: at(327) },
  ],
  start: 'roll',
  range: 'far',
  steps: [
    { from: 'roll', to: 'roll', label: 'Spike rolls toward Link', range: 'far', move: 'near', cite: at(256) },
    { from: 'roll', to: 'stone', label: 'Spike rams Link and turns to stone', range: 'near', attack: 'spike', cite: at(250) },
    { from: 'roll', to: 'stone', label: 'Spike runs out of roll and turns to stone', afterTimer: true, cite: at(250) },
    { from: 'stone', to: 'dormant', label: 'Spike settles', afterTimer: true, cite: at(297) },
    { from: 'dormant', to: 'waking', label: 'Link comes close; Spike wakes', range: 'near', cite: at(208) },
    { from: 'waking', to: 'roll', label: 'Spike starts rolling', cite: at(234) },
  ],
  attacks: [
    { id: 'spike', label: 'Spike ram', damage: 8, effect: { kind: 'knockback' }, blockable: true, dodgeable: true, source: at(60) },
  ],
  actionFuncs: {
    EnNy_Move: 'roll',
    EnNy_TurnToStone: 'stone',
    func_80ABD11C: 'stone',
    func_80ABCE50: 'dormant',
    func_80ABCE90: 'waking',
    func_80ABCEEC: 'waking',
    EnNy_SetupDie: post('death effect after the finishing blow; the encounter has already ended', 419),
    EnNy_Die: post('death debris and despawn after the finishing blow', 466),
  },
  atSources: {
    [at(60)]: 'spike',
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the ram costs 8, or 4 with Double Defense, and every kit starts at 32 health, so no hit finds Link with less health than it takes',
    },
  },
}
