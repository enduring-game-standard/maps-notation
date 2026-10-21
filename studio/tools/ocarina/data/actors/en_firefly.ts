import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Reaction, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Firefly/z_en_firefly.c'
const at = (line: number): Cite => `${F}:${line}`

type Element = 'fire' | 'fire_p' | 'normal' | 'normal_p' | 'ice'
const ELEMENTS: Element[] = ['fire', 'fire_p', 'normal', 'normal_p', 'ice']
const NAME: Record<Element, string> = {
  fire: 'fire Keese',
  fire_p: 'fire Keese (can perch)',
  normal: 'Keese',
  normal_p: 'Keese (perches)',
  ice: 'ice Keese',
}
/** Hitting Link puts a fire Keese out (`EnFirefly_SetElementNormal`); Din's Fire lights a normal one. */
const OUT: Record<Element, Element> = { fire: 'normal', fire_p: 'normal_p', normal: 'normal', normal_p: 'normal_p', ice: 'ice' }
const LIT: Partial<Record<Element, Element>> = { normal: 'fire', normal_p: 'fire_p' }
const BITE: Record<Element, string> = { fire: 'bite_fire', fire_p: 'bite_fire', normal: 'bite', normal_p: 'bite', ice: 'bite_ice' }

const phases: Phase[] = [
  ...ELEMENTS.flatMap((e): Phase[] => [
    { id: `idle_${e}`, label: `${NAME[e]} circles`, frames: { value: [70, 169], cite: at(221) }, cite: at(387) },
    { id: `attack_${e}`, label: `${NAME[e]} dives at Link`, frames: { value: [70, 169], cite: at(261) }, cite: at(470) },
    { id: `home_${e}`, label: `${NAME[e]} flies home`, frames: { value: 150, cite: at(273) }, cite: at(527) },
    { id: `stunned_${e}`, label: `${NAME[e]} is stunned`, frames: { value: 80, cite: at(280) }, cite: at(555) },
  ]),
  ...ELEMENTS.map((e): Phase => ({
    id: `stay_${e}`, label: `${NAME[e]} bounces off`, frames: { value: 18, cite: at(252) }, cite: at(513),
  })),
  { id: 'perched', label: 'Keese hangs on its perch', cite: at(585) },
  { id: 'from_perch_normal', label: 'Keese drops from its perch at Link', frames: { value: 50, cite: at(318) }, cite: at(600) },
  { id: 'from_perch_fire', label: 'Lit Keese drops from its perch at Link', frames: { value: 50, cite: at(318) }, cite: at(600) },
]

const steps: Step[] = [
  ...ELEMENTS.flatMap((e): Step[] => [
    { from: `idle_${e}`, to: `attack_${e}`, label: `${NAME[e]} spots Link and dives`, range: 'near', afterTimer: true, gear: [{ gear: 'skull_mask', has: false }], cite: at(431) },
    { from: `attack_${e}`, to: `stay_${OUT[e]}`, label: `${NAME[e]} strikes`, range: 'near', attack: BITE[e], cite: at(679) },
    { from: `attack_${e}`, to: `home_${e}`, label: `${NAME[e]} gives up`, afterTimer: true, cite: at(508) },
    { from: `home_${e}`, to: `idle_${e}`, label: `${NAME[e]} is home`, afterTimer: true, cite: at(535) },
    { from: `stunned_${e}`, to: `idle_${e}`, label: `${NAME[e]} recovers`, afterTimer: true, cite: at(568) },
  ]),
  ...ELEMENTS.map((e): Step => ({
    from: `stay_${e}`, to: `home_${e}`, label: `${NAME[e]} turns for home`, afterTimer: true, cite: at(522),
  })),
  { from: 'idle_normal_p', to: 'perched', label: 'Keese returns to its perch', range: 'far', cite: at(331) },
  { from: 'perched', to: 'from_perch_normal', label: 'Keese drops at Link', range: 'near', cite: at(595) },
  { from: 'from_perch_normal', to: 'from_perch_normal', label: 'Keese strikes from its perch', range: 'near', attack: 'bite', cite: at(679) },
  { from: 'from_perch_fire', to: 'from_perch_normal', label: 'Lit Keese strikes from its perch', range: 'near', attack: 'bite_fire', cite: at(679) },
  { from: 'from_perch_normal', to: 'idle_normal_p', label: 'Keese flies off', afterTimer: true, cite: at(619) },
  { from: 'from_perch_fire', to: 'idle_fire_p', label: 'Lit Keese flies off', afterTimer: true, cite: at(619) },
]

const attacks: Attack[] = [
  { id: 'bite', label: 'Keese bite', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(68) },
  { id: 'bite_fire', label: 'Fire Keese bite', damage: 8, effect: { kind: 'burn' }, blockable: true, dodgeable: true, source: at(68) },
  { id: 'bite_ice', label: 'Ice Keese bite', damage: 8, effect: { kind: 'freeze' }, blockable: true, dodgeable: true, source: at(68) },
]

const stunTo: Record<string, string> = {}
const dinsTo: Record<string, string> = {}
for (const p of phases) {
  const e = ELEMENTS.find((x) => p.id.endsWith(`_${x}`) && !p.id.endsWith(`_${x}_p`))
  if (p.id === 'perched' || p.id.startsWith('from_perch')) {
    stunTo[p.id] = 'stunned_normal_p'
    if (p.id === 'perched') dinsTo[p.id] = 'idle_fire_p'
    if (p.id === 'from_perch_normal') dinsTo[p.id] = 'from_perch_fire'
    if (p.id === 'from_perch_fire') stunTo[p.id] = 'stunned_fire_p'
    continue
  }
  if (!e) throw new Error(`no element for ${p.id}`)
  const kind = p.id.slice(0, p.id.length - e.length - 1)
  if (kind !== 'stunned') stunTo[p.id] = `stunned_${e}`
  if (e === 'ice') dinsTo[p.id] = 'defeated'
  const lit = LIT[e]
  if (lit) dinsTo[p.id] = `${kind}_${lit}`
}

const reactions: Record<string, Reaction> = {
  EN_FIREFLY_DMG_REACT_NONE: { damage: true, note: 'any damage kills it: health is 1 and every damaging hit reaches EnFirefly_SetupDie', cite: at(669) },
  EN_FIREFLY_DMG_REACT_STUN: { damage: true, to: stunTo, note: 'Deku Nut stuns unless already stunned', cite: at(660) },
  EN_FIREFLY_DMG_REACT_DINS_FIRE: { damage: true, to: dinsTo, note: "Din's Fire kills an ice Keese and lights a normal one; a lit one is unchanged", cite: at(642) },
  EN_FIREFLY_DMG_REACT_ICE: { damage: true, to: 'defeated', note: 'ice kills it, frozen unless it is an ice Keese', cite: at(654) },
  EN_FIREFLY_DMG_REACT_FIRE_ARROW: { damage: true, to: 'defeated', note: 'fire arrows kill it, melting an ice Keese', cite: at(665) },
}

const post = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })

export const enFirefly: ActorSpec = {
  overlay: 'ovl_En_Firefly',
  name: 'Keese',
  role: 'enemy',
  summary: 'A bat with one health point. It circles, dives at Link when he is close, and flies home after striking. Fire Keese burn and lose their flame on contact; ice Keese freeze.',
  cite: at(162),
  pools: [{ id: 'body', label: 'Keese', hp: { value: 1, cite: at(91) }, then: 'defeated' }],
  damage: { kind: 'decomp', table: 'sDamageTable', reactions },
  phases,
  start: 'idle_normal',
  variants: [
    ...(
      [
        ['fire', 'Fire Keese', 'idle_fire', 177],
        ['fire_p', 'Fire Keese that can perch', 'idle_fire_p', 177],
        ['normal', 'Keese', 'idle_normal', 191],
        ['normal_p', 'Perched Keese', 'perched', 191],
        ['ice', 'Ice Keese', 'idle_ice', 195],
      ] as const
    ).flatMap(([id, label, start, line]) => [
      { id, label, start, cite: at(line) },
      { id: `${id}_unseen`, label: `${label}, visible only through the Lens`, start, unseen: true, cite: at(172) },
    ]),
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    EnFirefly_Idle: 'idle_*',
    EnFirefly_Attack: 'attack_*',
    EnFirefly_Stay: 'stay_*',
    EnFirefly_FlyTowardsHome: 'home_*',
    EnFirefly_Stunned: 'stunned_*',
    EnFirefly_Perched: 'perched',
    EnFirefly_AttackFromPerched: 'from_perch_*',
    EnFirefly_Die: post('death animation after the finishing blow; the encounter has already ended', 436),
    EnFirefly_DieFrozen: post('frozen death fall after the finishing blow; the encounter has already ended', 572),
    EnFirefly_Disappear: post('despawn and item drop after death; drops are out of scope', 457),
  },
  atSources: {
    [at(68)]: 'bite',
    [at(144)]: 'bite',
    [at(156)]: 'bite_fire',
    [at(196)]: 'bite_ice',
    [at(199)]: 'bite',
  },
  loadouts: [
    ...standardLoadouts(['child', 'adult']),
    { id: 'child_skull_mask', age: 'child', hearts: 2, gear: ['kokiri_sword', 'deku_shield', 'skull_mask'] },
  ],
  expected: {
    deadVerbs: {
      stunned_fire_timer_clears: 'a lit Keese only leaves its stun when the stun runs out; nothing it can be hit with moves it to another phase',
      stunned_fire_p_timer_clears: 'as stunned_fire_timer_clears, for the Keese that can perch',
      stunned_ice_timer_clears: 'a stunned ice Keese only leaves by recovering or dying, and dying ends the encounter',
      stay_fire_timer_clears: 'stay_fire is entered only by Din\'s Fire during the one-beat bounce, and it ends on that same beat',
      stay_fire_p_timer_clears: 'as stay_fire_timer_clears',
      hit_deku_nut__stay_fire: 'the bounce lasts one beat (18 frames), so a phase Link enters it into with his own move is gone before his next move',
      hit_deku_nut__stay_fire_p: 'as hit_deku_nut__stay_fire',
      hit_deku_nut__from_perch_fire: 'Din\'s Fire lights a Keese dropping from its perch only while Link is near, and the Keese then strikes on that same beat',
      hit_magic_fire__perched: 'a perched Keese drops the beat Link comes near, and Din\'s Fire reaches only near',
      body_empty_in_stay_fire: 'no hit can land in stay_fire (see hit_deku_nut__stay_fire)',
      body_empty_in_stay_fire_p: 'as body_empty_in_stay_fire',
      body_empty_in_from_perch_fire: 'no hit can land in from_perch_fire (see hit_deku_nut__from_perch_fire)',
      from_perch_fire_step_2: 'from_perch_fire always strikes on the beat it starts, since Link is near, so its timer never runs out',
      from_perch_fire_holds: 'as from_perch_fire_step_2',
      bite_fire_lands_again: 'a fire Keese loses its flame when it bites, so it cannot burn Link while he still burns',
      bite_fire_lands_dd_again: 'as bite_fire_lands_again',
      bite_ice_lands_again: 'after a bite an ice Keese bounces, flies home, and circles before it can bite again, longer than the freeze lasts',
      bite_ice_lands_dd_again: 'as bite_ice_lands_again',
    },
  },
}
