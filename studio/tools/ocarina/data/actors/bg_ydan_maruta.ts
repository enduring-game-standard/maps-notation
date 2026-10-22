import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Excluded } from '../../spec'

const F = 'src/overlays/actors/ovl_Bg_Ydan_Maruta/z_bg_ydan_maruta.c'
const at = (line: number): Cite => `${F}:${line}`
const ladder = (line: number): Excluded => ({
  excluded: 'falling-ladder variant (params 1): it never registers an AT collider, and a Slingshot hit only sets a switch flag and drops the ladder into place, a puzzle trigger that costs neither side anything',
  cite: at(line),
})

// Losing these verbs loses no play: the rolling log never calls CollisionCheck_SetAC (func_808BEFF4), so melee there does nothing.
const NEVER_NEAR = 'Link is never near on his own turn: closing in spends it, then the log\'s only step fires every beat he is near (AT set every frame, z_bg_ydan_maruta.c:152), is unblockable, and knocks him far even under Nayru\'s Love, which stops only the damage'

export const bgYdanMaruta: ActorSpec = {
  overlay: 'ovl_Bg_Ydan_Maruta',
  name: 'Rolling spiked log',
  role: 'hazard',
  summary: 'A spiked log in the Deku Tree that rolls in place forever. It cuts Link and throws him back. It registers no AC collider while rolling, so Link cannot hurt it.',
  cite: at(147),
  pools: [],
  damage: { kind: 'none' },
  phases: [{ id: 'rolling', label: 'The spiked log rolls', cite: at(151) }],
  start: 'rolling',
  range: 'far',
  steps: [{ from: 'rolling', to: 'rolling', label: 'The log spikes catch Link', range: 'near', attack: 'spikes', cite: at(152) }],
  attacks: [
    { id: 'spikes', label: 'Log spikes, with Actor_SetPlayerKnockbackLargeNoDamage on contact', damage: 4, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(48) },
  ],
  actionFuncs: {
    func_808BEFF4: 'rolling',
    func_808BF078: ladder(157),
    func_808BF108: ladder(161),
    func_808BF1EC: ladder(175),
    BgYdanMaruta_DoNothing: ladder(114),
  },
  atSources: {
    [at(48)]: 'spikes',
    [at(59)]: 'spikes',
  },
  loadouts: standardLoadouts(['child']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'the only damage is the 4-unit hit (2 with Double Defense), and every kit starts and heals Link in multiples of 4, so a hit never finds less health left than it costs',
      ...Object.fromEntries(
        [
          'link_deku_stick', 'link_slash_kokiri', 'link_shield_1', 'link_shield_2', 'link_jump_kokiri_1', 'link_jump_master_3',
          'miss_deku_stick', 'miss_slash_kokiri', 'miss_shield', 'miss_spin_kokiri', 'miss_jump_kokiri', 'miss_jump_master',
          'miss_magic_fire', 'miss_jump_kokiri_self', 'link_backs_off',
        ].map((v) => [v, NEVER_NEAR]),
      ),
      spikes_dodged: `${NEVER_NEAR}; a dodge is a turn Link spends far, where the log has no step, so no spikes are ever incoming while he dodges`,
    },
  },
}
