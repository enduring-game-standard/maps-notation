import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Fw/z_en_fw.c'
const at = (line: number): Cite => `${F}:${line}`
const FD = 'src/overlays/actors/ovl_En_Fd/z_en_fd.c'

/**
 * The core's health is the Flare Dancer's health mod 8, or 8 (z_en_fd.c:244), and the dancer starts at 24 and loses
 * exactly 8 per drained core, so the core always holds 8. Draining it either costs the dancer 8 and sends the core
 * home, or, when the dancer has 8 or less, deals the finishing blow.
 */
type Fate = 'more' | 'last'
const FATES: Fate[] = ['more', 'last']
const LABEL: Record<Fate, string> = { more: 'the Flare Dancer has health to spare', last: "the Flare Dancer's last core" }

const phases: Phase[] = [
  ...FATES.flatMap((f): Phase[] => [
    { id: `bounce_${f}`, label: `The core bounces free (${LABEL[f]})`, hittable: 'none', cite: at(224) },
    { id: `run_${f}`, label: `The core runs circles (${LABEL[f]})`, pool: `core_${f}`, frames: { value: [300, 449], cite: at(226) }, cite: at(231) },
  ]),
  { id: 'returning', label: 'The core runs back and leaps into the Flare Dancer', hittable: 'none', cite: at(351) },
]

const steps: Step[] = FATES.flatMap((f): Step[] => [
  { from: `bounce_${f}`, to: `run_${f}`, label: 'The core lands and starts to run', cite: at(227) },
  { from: `run_${f}`, to: 'returning', label: 'The core turns back to the Flare Dancer', afterTimer: true, cite: at(294) },
])

export const enFw: ActorSpec = {
  overlay: 'ovl_En_Fw',
  name: "Flare Dancer's core",
  role: 'part',
  summary:
    "The Flare Dancer's core, spat out when its flames go out. It bounces three times, then runs circles of radius 200 for 300 to 449 frames before leaping back into the dancer. It never attacks: its only element has no AT. Hits drain its 8 health by the shared preset table 16; once drained it costs the dancer 8 health and heads home, or ends the dancer when the dancer has 8 or less. Only while running does it register its AC collider.",
  cite: `${FD}:239`,
  pools: [
    { id: 'core_more', label: 'Core', hp: { value: 8, cite: at(82) }, then: 'returning' },
    { id: 'core_last', label: 'Last core', hp: { value: 8, cite: at(82) }, then: 'defeated' },
  ],
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(16)',
    reactions: {
      '0x0': { damage: true, note: 'every entry of preset 16 has reaction 0: Actor_ApplyDamage drains the core, and an emptied core costs the dancer 8', cite: at(164) },
    },
  },
  phases,
  start: 'bounce_more',
  variants: [
    { id: 'more', label: 'The Flare Dancer has more than 8 health: a drained core costs it 8 and runs home', start: 'bounce_more', cite: at(169) },
    { id: 'last', label: 'The Flare Dancer has 8 health or less: draining the core finishes it', start: 'bounce_last', cite: at(165) },
  ],
  range: 'far',
  steps,
  attacks: [],
  actionFuncs: {
    EnFw_Bounce: 'bounce_*',
    EnFw_Run: 'run_*',
    EnFw_TurnToParentInitPos: 'returning',
    EnFw_JumpToParentInitPos: 'returning',
  },
  atSources: {},
  loadouts: standardLoadouts(['adult']),
  expected: {
    deadVerbs: {
      run_last_timer_clears: "the last core leaves its run only when the timer has run out or when it is drained, which ends the encounter, so no timer marks are left behind",
      link_heals: 'the core never hurts Link, so a potion always finds him at full health',
      link_hurt: 'the core has no AT element (ATELEM_NONE at line 61), so nothing in this encounter hurts Link',
      link_hurt_overkill: 'as link_hurt',
      fairy_revives_link: 'as link_hurt: Link never reaches zero health',
      link_fell: 'as link_hurt: Link never reaches zero health',
    },
  },
}
