import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Go2/z_en_go2.c'
const at = (line: number): Cite => `${F}:${line}`

/**
 * Three Goron kinds roll (params bits 0-4): GORON_CITY_ROLLING_BIG, GORON_CITY_LINK, and
 * GORON_DMT_ROLLING_SMALL (lines 1592-1614). While one rolls (ContinueRolling, SlowRolling,
 * ReverseRolling), touching Link costs 4 and knocks him back (func_80A44AB0, lines 904-926).
 * The other kinds only curl up, wake, and talk.
 *
 * The collider's AC accepts only DMG_EXPLOSIVE (0x00000008, line 100), and its element starts
 * ACELEM_NONE (line 102). SetupRolling turns it on for the big and Link kinds only (line 1366), and a
 * bomb hit then stops the roll (line 912), which turns it off again (line 1391). The small Death
 * Mountain kind never takes a hit; it stops where its path loops back to waypoint 0 (line 1767).
 * There is no damage table (NULL, line 1543) and no health, so no Goron can be defeated.
 *
 * No code line gates these kinds by age, and the decomp has no scene lists, so both ages are kept (a judgment).
 */
const notCombat = (what: string, line: number): Excluded => ({
  excluded: `${what}; no rolling Goron enters it before its roll is stopped, and it neither hurts Link nor takes a hit`,
  cite: at(line),
})

export const enGo2: ActorSpec = {
  overlay: 'ovl_En_Go2',
  name: 'Rolling Goron (Goron City, Death Mountain Trail)',
  role: 'hazard',
  summary:
    'A Goron rolling along a path. Rolling into Link costs him 4 and knocks him back. The big Goron City roller and Goron Link stop when a bomb hits them; the small Death Mountain roller cannot be hit and stops on its own at the end of its path. None can be defeated.',
  cite: at(1739),
  pools: [],
  damage: { kind: 'own' },
  phases: [
    {
      id: 'roll_big',
      label: 'The big Goron City Goron rolls',
      hittable: ['EXPLOSIVE'],
      overrides: { EXPLOSIVE: { damage: 0, to: 'stopped_big', cite: at(912) } },
      cite: at(1366),
    },
    {
      id: 'roll_link',
      label: 'Goron Link rolls, turning back when Link stands in his way',
      hittable: ['EXPLOSIVE'],
      overrides: { EXPLOSIVE: { damage: 0, to: 'stopped_link', cite: at(912) } },
      cite: at(1366),
    },
    { id: 'roll_small', label: 'The small Death Mountain Goron rolls', hittable: 'none', cite: at(1364) },
    { id: 'stopped_big', label: 'The big Goron has stopped, woken, and sits', hittable: 'none', cite: at(1789) },
    { id: 'stopped_link', label: 'Goron Link has stopped and talks', hittable: 'none', cite: at(1786) },
    { id: 'stopped_small', label: 'The small Goron has stopped and sits curled up', hittable: 'none', cite: at(1792) },
  ],
  start: 'roll_big',
  variants: [
    { id: 'rolling_big', label: 'Big Goron City roller (GORON_CITY_ROLLING_BIG)', start: 'roll_big', cite: at(1611) },
    { id: 'goron_link', label: 'Goron Link (GORON_CITY_LINK)', start: 'roll_link', cite: at(1607) },
    { id: 'rolling_small', label: 'Small Death Mountain roller (GORON_DMT_ROLLING_SMALL)', start: 'roll_small', cite: at(1612) },
  ],
  range: 'far',
  steps: [
    { from: 'roll_big', to: 'roll_big', label: 'The Goron rolls into Link', range: 'near', attack: 'roll', cite: at(925) },
    { from: 'roll_link', to: 'roll_link', label: 'Goron Link rolls into Link', range: 'near', attack: 'roll', cite: at(925) },
    { from: 'roll_small', to: 'roll_small', label: 'The Goron rolls into Link', range: 'near', attack: 'roll', cite: at(925) },
    { from: 'roll_small', to: 'stopped_small', label: 'The Goron reaches the end of its path and stops', cite: at(1767) },
  ],
  attacks: [
    { id: 'roll', label: 'Rolling Goron', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(925) },
  ],
  actionFuncs: {
    EnGo2_ContinueRolling: 'roll_*',
    EnGo2_SlowRolling: 'roll_*',
    EnGo2_ReverseRolling: 'roll_link',
    EnGo2_GroundRolling: 'stopped_*',
    EnGo2_GoronLinkStopRolling: 'stopped_link',
    EnGo2_CurledUp: 'stopped_*',
    func_80A46B40: 'stopped_*',
    EnGo2_GoronRollingBigContinueRolling: {
      excluded:
        'the big Goron rolls again only after Link finishes talking to it (talk state NPC_TALK_STATE_ACTION); talking is not a beat action, so the stopped phase holds',
      cite: at(1436),
    },
    EnGo2_SetupGetItem: notCombat('item offer after a talk', 352),
    EnGo2_SetGetItem: notCombat('item hand-over after a talk', 1826),
    EnGo2_BiggoronEyedrops: notCombat('Biggoron (GORON_DMT_BIGGORON) eyedrops trade', 649),
    EnGo2_GoronDmtBombFlowerAnimation: notCombat('GORON_DMT_BOMB_FLOWER walk after a talk', 1425),
    EnGo2_GoronFireGenericAction: notCombat('GORON_FIRE_GENERIC freed-Goron cutscene', 1927),
  },
  /**
   * The touch also calls Actor_SetPlayerKnockbackLargeNoDamage (line 926), the knockback the attack carries.
   * The small roller's stop spawns a bomb with its timer at 0 (line 1384); that is ovl_En_Bom, which is not in the inventory.
   */
  atSources: {
    [at(925)]: 'roll',
    [at(1907)]: {
      excluded: 'freezeTimer = 10 holds Link while Goron Link opens his textbox after being stopped; no damage',
      cite: at(1906),
    },
    [at(1917)]: {
      excluded: 'freezeTimer = 10 refreshed each frame until that textbox closes, then the Goron curls up (line 1923); no damage',
      cite: at(1916),
    },
  },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: "every kit's health is a multiple of the roll's 4 (2 with Double Defense), so a hit never takes more than Link has left",
    },
  },
}
