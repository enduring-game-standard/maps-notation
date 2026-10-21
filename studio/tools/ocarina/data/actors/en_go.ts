import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Go/z_en_go.c'
const at = (line: number): Cite => `${F}:${line}`

const NPC = 'belongs to a Goron variant other than the rolling one (params 0x30), which never hurts Link and that Link cannot hurt (AC_NONE, line 71)'

/**
 * Only params 0x30 hurts Link: it waits until Link is within 1200 units, then rolls along its path in
 * EnGo_StopRolling, where touching Link costs 4 and knocks him back. At the path's end it spawns a
 * bomb and curls up. Every other variant is a talking Goron. The collider is AC_NONE (line 71) and
 * registered only for OC (line 1045), so nothing Link has touches any Goron, and the shared table
 * DamageTable_Get(0x16) is never reached.
 *
 * The rolling variant spawns only for child Link on Death Mountain Trail (line 385-387).
 */
export const enGo: ActorSpec = {
  overlay: 'ovl_En_Go',
  name: 'Rolling Goron (Death Mountain Trail)',
  role: 'hazard',
  summary:
    'A Goron that rolls down its path once Link is within range. Rolling into Link costs him 4 and knocks him back. At the end of its path it drops a lit bomb and curls up. Link cannot hurt or stop it.',
  cite: at(696),
  pools: [],
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(22)',
    reactions: {
      '0x0': { damage: false, note: 'never read: the collider is AC_NONE, so no hit reaches the table', cite: at(71) },
    },
  },
  phases: [
    { id: 'wait', label: 'The Goron waits for Link to come within 1200 units', cite: at(722) },
    { id: 'roll', label: 'The Goron rolls along its path', cite: at(728) },
    { id: 'curled', label: 'The Goron has stopped and sits curled up', cite: at(759) },
  ],
  start: 'wait',
  range: 'far',
  steps: [
    { from: 'wait', to: 'roll', label: 'Link comes within 1200 units and the Goron starts rolling', cite: at(724) },
    { from: 'roll', to: 'roll', label: 'The Goron rolls into Link', range: 'near', attack: 'roll', cite: at(734) },
    { from: 'roll', to: 'curled', label: 'The Goron reaches the end of its path, drops a bomb, and stops', cite: at(749) },
  ],
  attacks: [
    { id: 'roll', label: 'Rolling Goron', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(734) },
  ],
  actionFuncs: {
    func_80A3FEB4: 'wait',
    EnGo_StopRolling: 'roll',
    func_80A4008C: 'curled',
    EnGo_CurledUp: 'curled',
    EnGo_WakeUp: 'curled',
    func_80A40494: 'curled',
    func_80A405CC: 'curled',
    EnGo_BiggoronActionFunc: 'curled',
    func_80A408D8: 'curled',
    EnGo_GoronLinkRolling: { excluded: `Goron Link rolling (params 0x00) ${NPC}; it calls no hurt function`, cite: at(678) },
    EnGo_FireGenericActionFunc: { excluded: `an empty function ${NPC}`, cite: at(785) },
    func_80A40A54: { excluded: `talk step of the params 0x40 Goron; it ${NPC}`, cite: at(960) },
    func_80A40B1C: { excluded: `talk step of the params 0x40 Goron; it ${NPC}`, cite: at(870) },
    EnGo_GetItem: { excluded: `item giving, reached only for params 0x90 or 0x00 (lines 887-900); it ${NPC}`, cite: at(893) },
    func_80A40C78: { excluded: `after-item talk, reached only from EnGo_GetItem; it ${NPC}`, cite: at(974) },
    EnGo_Eyedrops: { excluded: `Biggoron (params 0x90) eyedrops trade; it ${NPC}`, cite: at(887) },
    func_80A40DCC: { excluded: `Biggoron (params 0x90) eyedrops trade; it ${NPC}`, cite: at(1026) },
    actionFunc: { excluded: 'not an action function: the parameter name of EnGo_SetupAction', cite: at(104) },
  },
  /**
   * The touch also calls Actor_SetPlayerKnockbackLargeNoDamage (line 735), which is the knockback the
   * attack carries. The bomb spawned at the path's end (line 742) is ovl_En_Bom, which is not in the inventory.
   */
  atSources: { [at(734)]: 'roll' },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: "every kit's health is a multiple of the roll's 4, so a hit never takes more than Link has left",
    },
  },
}
