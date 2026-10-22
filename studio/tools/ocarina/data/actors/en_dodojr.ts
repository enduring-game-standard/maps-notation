import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Cite } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Dodojr/z_en_dodojr.c'
const at = (line: number): Cite => `${F}:${line}`
export const enDodojr: ActorSpec = {
  overlay: 'ovl_En_Dodojr',
  name: 'Baby Dodongo',
  role: 'enemy',
  summary:
    'A small Dodongo that bursts from the ground when Link comes within 320 units, crawls at him, and leaps at him from 40 units. Any damaging hit kills it, a Deku Nut stuns it, and it eats any bomb it reaches. It dies by blowing up as a bomb that hurts Link if he is close.',
  cite: at(81),
  pools: [{ id: 'body', label: 'Baby Dodongo', hp: { value: 1, cite: at(79) }, then: 'dying' }],
  damage: {
    kind: 'decomp',
    table: 'DamageTable_Get(4)',
    reactions: {
      '0x0': {
        damage: true,
        note: 'nonzero damage with reaction 0 is a finishing blow, which its 1 health already gives; a zero-damage row does nothing',
        cite: at(364),
      },
      '0x1': { damage: true, to: 'stunned', note: 'the Deku Nut row (0 damage) stuns it unless it is already stunned', cite: at(371) },
    },
  },
  phases: [
    { id: 'underground', label: 'Baby Dodongo waits underground', hittable: 'none', cite: at(387) },
    { id: 'emerge', label: 'Baby Dodongo bursts from the ground', cite: at(427) },
    {
      id: 'crawl',
      label: 'Baby Dodongo crawls at Link, or at a bomb',
      overrides: { EXPLOSIVE: { damage: 0, to: 'swallowing', cite: at(453) } },
      cite: at(444),
    },
    { id: 'leap', label: 'Baby Dodongo leaps at Link', cite: at(550) },
    { id: 'stunned', label: 'Baby Dodongo is stunned', frames: { value: 120, cite: at(374) }, cite: at(530) },
    {
      id: 'swallowing',
      label: 'Baby Dodongo swallows a bomb',
      hittable: 'none',
      frames: { value: 24, cite: at(484) },
      cite: at(393),
    },
    { id: 'dying', label: 'Baby Dodongo flips, flashes, and turns into a bomb', hittable: 'none', cite: at(337) },
    { id: 'blast', label: 'The body bomb goes off', hittable: 'none', cite: at(597) },
  ],
  start: 'underground',
  range: 'far',
  steps: [
    { from: 'underground', to: 'emerge', label: 'Link comes within 320 units and it bursts out', cite: at(422) },
    { from: 'emerge', to: 'crawl', label: 'Baby Dodongo is out and starts crawling', cite: at(440) },
    { from: 'crawl', to: 'crawl', label: 'Baby Dodongo crawls closer', range: 'far', move: 'near', cite: at(445) },
    { from: 'crawl', to: 'leap', label: 'Link is within 40 units and it leaps', range: 'near', cite: at(464) },
    { from: 'leap', to: 'crawl', label: 'Baby Dodongo lands on Link', range: 'near', attack: 'leap', cite: at(556) },
    { from: 'leap', to: 'crawl', label: 'Baby Dodongo lands and crawls on', range: 'far', cite: at(556) },
    { from: 'stunned', to: 'crawl', label: 'Baby Dodongo shakes off the stun', afterTimer: true, cite: at(546) },
    { from: 'swallowing', to: 'dying', label: 'The swallowed bomb goes off inside it', afterTimer: true, cite: at(495) },
    { from: 'dying', to: 'blast', label: 'Baby Dodongo blows up next to Link', range: 'near', attack: 'death_blast', cite: at(597) },
    { from: 'dying', to: 'defeated', label: 'Baby Dodongo blows up away from Link', range: 'far', cite: at(597) },
    { from: 'blast', to: 'defeated', label: 'Only smoke is left', cite: at(605) },
  ],
  attacks: [
    { id: 'leap', label: 'Baby Dodongo leap', damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(70) },
    {
      id: 'death_blast',
      label: 'Baby Dodongo death blast',
      damage: 8,
      effect: { kind: 'none' },
      blockable: true,
      dodgeable: true,
      source: 'src/overlays/actors/ovl_En_Bom/z_en_bom.c:72',
      via: { overlay: 'ovl_En_Bom', spawn: at(597) },
    },
  ],
  actionFuncs: {
    EnDodojr_WaitUnderground: 'underground',
    EnDodojr_EmergeFromGround: 'emerge',
    EnDodojr_CrawlTowardsTarget: 'crawl',
    EnDodojr_JumpAttackBounce: 'leap',
    EnDodojr_StunnedBounce: 'stunned',
    EnDodojr_Stunned: 'stunned',
    EnDodojr_EatBomb: 'swallowing',
    EnDodojr_SwallowBomb: 'swallowing',
    EnDodojr_WaitFreezeFrames: 'dying',
    EnDodojr_StandardDeathBounce: 'dying',
    EnDodojr_DeathSequence: 'dying',
    EnDodojr_SwallowedBombDeathBounce: 'dying',
    EnDodojr_SwallowedBombDeathSequence: 'dying',
    EnDodojr_DropItem: { excluded: 'item drop after the body bomb has gone off; drops are out of scope', cite: at(611) },
    EnDodojr_Despawn: {
      excluded: 'entered only when the crawl runs into a wall, then the actor burrows and is killed; room geometry is out of scope',
      cite: at(467),
    },
  },
  atSources: { [at(70)]: 'leap' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      swallowing_timer_clears: 'swallowing is one beat (24 frames) and its timer always runs out on that beat, so none is left to clear',
      link_hurt_overkill: 'both attacks cost 8 (4 with Double Defense), which divides the 2-heart bar, so a hit never costs more than Link has left',
      death_blast_blocked_mirror_shield:
        "the blast follows a killing hit on the same beat, so Link's shield can be up for it only after a swallowed bomb, and no kit with the Mirror Shield carries bombs",
    },
  },
}
