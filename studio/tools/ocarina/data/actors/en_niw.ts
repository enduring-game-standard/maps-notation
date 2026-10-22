import { standardLoadouts } from '../loadouts'
import { DMG_TYPES, type DmgType } from '../../inventory'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Niw/z_en_niw.c'
const at = (line: number): Cite => `${F}:${line}`
const SWARM = 'src/overlays/actors/ovl_En_Attack_Niw/z_en_attack_niw.c'

/**
 * The ordinary cucco. It has no health: Link's hits only count down a fuse of 5 to 8 hits drawn at spawn (line 204).
 * Each hit makes it flee for 100 frames (func_80AB747C, lines 886-898). When the fuse runs out it rages: a camera
 * cutscene (100 frames), a cry (60 frames), and then for good it chases Link, knocking him down for 16 within 20
 * units (line 1097) while it calls down a swarm of En_Attack_Niw (line 386), whose own knock-down (16) shares a
 * 70-frame cooldown on this cucco (z_en_attack_niw.c:385). Once angry its AC is no longer set (line 1115), so Link
 * cannot touch it again; he can only leave.
 *
 * Only the default cucco is modeled. Params 4, 0xA, 0xD, and 0xE never register AC (line 1118) and never anger
 * (lines 887, 1066), so Link cannot provoke them.
 */
const MASK = 0xffcfffff
const HITS: DmgType[] = DMG_TYPES.filter((_, i) => (MASK >>> 0) & 2 ** i)
const FUSE = [1, 2, 3, 4, 5, 6, 7, 8]

const hitTo = (to: string) => Object.fromEntries(HITS.map((d) => [d, { damage: 0, to, cite: at(892) }]))
const next = (k: number) => (k === 1 ? 'rage' : `flee_${k - 1}`)

const phases: Phase[] = [
  ...FUSE.map((k): Phase => ({ id: `calm_${k}`, label: `The cucco wanders (${k} hits from rage)`, overrides: hitTo(next(k)), cite: at(500) })),
  ...FUSE.slice(0, 7).map((k): Phase => ({
    id: `flee_${k}`,
    label: `The cucco flees Link (${k} hits from rage)`,
    overrides: hitTo(next(k)),
    frames: { value: 100, cite: at(896) },
    cite: at(857),
  })),
  { id: 'rage', label: 'The cucco rages (camera cutscene)', hittable: 'none', frames: { value: 100, cite: at(793) }, cite: at(1115) },
  { id: 'cry', label: 'The cucco cries out', hittable: 'none', frames: { value: 60, cite: at(802) }, cite: at(1115) },
  { id: 'chase_ready', label: 'The cucco and its swarm chase Link', hittable: 'none', cite: at(835) },
  { id: 'chase_cooldown', label: 'The cucco chases Link; the swarm waits', hittable: 'none', frames: { value: 70, cite: `${SWARM}:385` }, cite: at(835) },
]

const steps: Step[] = [
  ...FUSE.slice(0, 7).flatMap((k): Step[] => [
    { from: `flee_${k}`, to: `calm_${k}`, label: 'The cucco calms down', afterTimer: true, cite: at(860) },
  ]),
  { from: 'rage', to: 'cry', label: 'The cutscene ends and the cucco cries', afterTimer: true, cite: at(801) },
  { from: 'cry', to: 'chase_ready', label: 'The cucco turns on Link', afterTimer: true, cite: at(825) },
  ...(['chase_ready', 'chase_cooldown'] as const).flatMap((p): Step[] => [
    { from: p, to: p, label: 'The cucco hops after Link', range: 'far', move: 'near', cite: at(844) },
    { from: p, to: p, label: 'The cucco knocks Link down', range: 'near', attack: 'peck', cite: at(1097) },
  ]),
  { from: 'chase_ready', to: 'chase_cooldown', label: 'A swarm cucco knocks Link down', range: 'near', attack: 'swarm_peck', cite: `${SWARM}:384` },
  { from: 'chase_cooldown', to: 'chase_ready', label: 'The swarm is ready again', afterTimer: true, cite: `${SWARM}:377` },
]

const attacks: Attack[] = [
  { id: 'peck', label: 'Angry cucco knock-down', damage: 16, effect: { kind: 'knockback' }, blockable: false, dodgeable: true, source: at(1097) },
  {
    id: 'swarm_peck',
    label: 'Cucco swarm knock-down',
    damage: 16,
    effect: { kind: 'knockback' },
    blockable: false,
    dodgeable: true,
    source: `${SWARM}:384`,
    via: { overlay: 'ovl_En_Attack_Niw', spawn: at(386) },
  },
]

const off = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enNiw: ActorSpec = {
  overlay: 'ovl_En_Niw',
  name: 'Cucco',
  role: 'enemy',
  summary:
    'A cucco. Hitting it does no damage; it flees for 100 frames. After 5 to 8 hits it rages, and from then on it and a swarm it calls down chase Link and knock him down for a heart each, with no shield to stop them. It cannot be hurt any more once angry, and it never calms down; Link can only leave.',
  cite: at(886),
  pools: [],
  damage: { kind: 'custom', entries: Object.fromEntries(HITS.map((d) => [d, { damage: 0, cite: at(892) }])) },
  phases,
  start: 'calm_5',
  variants: [5, 6, 7, 8].map((k) => ({ id: `fuse_${k}`, label: `A cucco that rages after ${k} hits`, start: `calm_${k}`, cite: at(204) })),
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnNiw_ResetAction: 'calm_*',
    func_80AB6570: 'calm_*',
    func_80AB7290: 'flee_*',
    func_80AB7328: 'flee_*',
    func_80AB70A0: 'rage',
    func_80AB70F8: 'rage',
    func_80AB714C: 'cry',
    func_80AB7204: 'chase_*',
    func_80AB6324: off('params 0xD cucco only (ResetAction, line 444); that cucco never registers AC (line 1118) and never angers (line 1066)', 444),
    func_80AB63A8: off('params 0xD cucco only, the hop after func_80AB6324; never hittable (line 1118)', 456),
    func_80AB6EB4: off('params 0xD cucco flying off after Link throws it (line 666); it despawns above y 400', 666),
    func_80AB6450: off('params 4 cucco only (ResetAction, line 441); AC is never set for params 4 (line 1118) and hits are ignored in this function (line 887)', 441),
    func_80AB6A38: off('params 0xA path walker only (line 529); hits on params 0xA are ignored (line 887) and its AC is never set (line 1118)', 529),
    func_80AB6BF8: off('Link is carrying the cucco (Actor_HasParent, line 514); lifting and throwing are not Link verbs in the combat spec, and carrying does not count down the fuse', 514),
    func_80AB6D08: off('the cucco flutters after Link throws it (line 674), then flees (line 711); throwing is not a Link combat verb', 674),
    func_80AB6F04: off('the cucco swims after falling into deep water (line 1062); room water is environment, out of scope', 1062),
    func_80AB7420: off('the cucco fell out of bounds and is reset to its home (line 1046), a level-geometry fallback', 1046),
  },
  atSources: { [at(1097)]: 'peck' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      rage_timer_clears: 'rage is left only once its timer has run out, so no timer marks are ever left behind',
      cry_timer_clears: 'as rage_timer_clears, for the cry',
      chase_cooldown_timer_clears: 'as rage_timer_clears, for the swarm cooldown',
      link_hurt_overkill: 'both knock-downs deal 16 (8 with Double Defense) and every kit starts with 32 health, a multiple of both, so a hit never takes more than Link has left',
    },
  },
}
