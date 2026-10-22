import { standardLoadouts } from '../loadouts'
import type { ActorSpec, Attack, Cite, Excluded, Phase, Step } from '../../spec'

const F = 'src/overlays/actors/ovl_En_Skj/z_en_skj.c'
const at = (line: number): Cite => `${F}:${line}`
const NEEDLE: Cite = 'src/overlays/actors/ovl_En_Skjneedle/z_en_skjneedle.c:49'

/**
 * How the beat model reads Skull Kid.
 * - Its one cylinder is both AT and AC, and is set only in actions whose unk_2D3 is 1 (319-346, 1356-1361).
 *   The hit reaction, the backflip, and dying clear it, so those phases cannot be hit and do not touch Link.
 * - Where Link stands (in its view cone, behind it, making noise) is not a beat-model state, so those
 *   tests become even odds between their outcomes. Link behind it is a phase of its own, because a sword
 *   hit from behind while it plays its flute kills it outright (619-624).
 * - Masks do not reach its combat code: Player_GetMask is read only in the stump dialogue (946, 962-967).
 */
/** A sword slash from behind while it plays sets up its death with no damage applied (619-624). */
const backstab = Object.fromEntries(
  (['SLASH_KOKIRI', 'SLASH_MASTER', 'SLASH_GIANT'] as const).map((d) => [d, { damage: 0, to: 'defeated', cite: at(623) }]),
)

const phases: Phase[] = [
  { id: 'idle_forest', label: 'Skull Kid plays its flute', cite: at(741) },
  { id: 'idle_forest_behind', label: 'Skull Kid plays its flute, Link behind it', overrides: backstab, cite: at(621) },
  { id: 'idle_stump', label: 'Skull Kid plays its flute on the stump', cite: at(746) },
  { id: 'idle_stump_behind', label: 'Skull Kid plays on the stump, Link behind it', overrides: backstab, cite: at(621) },
  { id: 'idle_stump_shy', label: "Skull Kid on the stump, before Saria's Song", cite: at(743) },
  { id: 'look', label: 'Skull Kid looks around for Link', frames: { value: 400, cite: at(809) }, cite: at(815) },
  { id: 'stance', label: 'Skull Kid circles Link in its fighting stance', frames: { value: 60, cite: at(825) }, cite: at(833) },
  { id: 'volley', label: 'Skull Kid shoots needles', cite: at(716) },
  { id: 'recover', label: 'Skull Kid lowers its arm', cite: at(881) },
  { id: 'hit', label: 'Skull Kid reels from the hit', hittable: 'none', cite: at(779) },
  { id: 'flee', label: 'Skull Kid backflips away and vanishes', hittable: 'none', cite: at(682) },
]

const contact = (from: string): Step => ({ from, to: from, label: 'Link runs into Skull Kid', range: 'near', attack: 'contact', cite: at(1357) })
const stay = (from: string, line: number): Step => ({ from, to: from, label: 'Skull Kid keeps on', cite: at(line) })

const steps: Step[] = [
  { from: 'idle_forest', to: 'look', label: 'Skull Kid sees Link in front of it', cite: at(756) },
  { from: 'idle_forest', to: 'idle_forest_behind', label: 'Link gets behind Skull Kid', cite: at(621) },
  stay('idle_forest', 755),
  contact('idle_forest'),
  { from: 'idle_forest_behind', to: 'look', label: 'Skull Kid hears Link running close by', range: 'near', cite: at(660) },
  { from: 'idle_forest_behind', to: 'idle_forest', label: 'Link comes around in front', cite: at(621) },
  stay('idle_forest_behind', 755),
  contact('idle_forest_behind'),
  { from: 'idle_stump', to: 'idle_stump_behind', label: 'Link gets behind Skull Kid', cite: at(621) },
  stay('idle_stump', 746),
  contact('idle_stump'),
  { from: 'idle_stump_behind', to: 'idle_stump', label: 'Link comes around in front', cite: at(621) },
  stay('idle_stump_behind', 746),
  contact('idle_stump_behind'),
  { from: 'idle_stump_shy', to: 'flee', label: 'Skull Kid backflips away from Link', range: 'near', cite: at(745) },
  { from: 'look', to: 'stance', label: 'Skull Kid spots Link', cite: at(820) },
  stay('look', 818),
  { from: 'look', to: 'idle_forest', label: 'Skull Kid gives up and plays again', afterTimer: true, cite: at(817) },
  contact('look'),
  { from: 'stance', to: 'volley', label: 'Skull Kid takes aim', afterTimer: true, weight: 2, cite: at(843) },
  stay('stance', 846),
  contact('stance'),
  { from: 'volley', to: 'recover', label: 'Skull Kid shoots its needles', attack: 'needle', cite: at(723) },
  { from: 'recover', to: 'stance', label: 'Skull Kid takes its stance again', cite: at(883) },
  { from: 'hit', to: 'stance', label: 'Skull Kid takes its stance again', cite: at(787) },
]

const attacks: Attack[] = [
  { id: 'contact', label: "Skull Kid's body", damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true, source: at(208) },
  {
    id: 'needle', label: "Skull Kid's needles", damage: 8, effect: { kind: 'none' }, blockable: true, dodgeable: true,
    source: NEEDLE, via: { overlay: 'ovl_En_Skjneedle', spawn: at(535) },
  },
]

const hittable = phases.filter((p) => p.hittable !== 'none').map((p) => p.id)
const swordTo = Object.fromEntries(hittable.map((id) => [id, 'hit']))
const fleeTo = Object.fromEntries(hittable.map((id) => [id, 'flee']))

const talk = (why: string, line: number): Excluded => ({ excluded: why, cite: at(line) })
const MINIGAME = 'the invisible ocarina-game stump actor (type 6): no draw, ACTORCAT_PROP, and its own update with no collider, so it cannot hurt or be hurt'
const SONG = "Saria's Song exchange on the small stump: entered only while Link stands on it (26 units, 500) to talk or play, a dialogue sequence"
const TRADE = 'Skull Mask trade dialogue: unk_2D3 is 0 here, so its collider is not set'

export const enSkj: ActorSpec = {
  overlay: 'ovl_En_Skj',
  name: 'Skull Kid',
  role: 'enemy',
  summary:
    'A flute-playing imp with 10 health that only swords hurt. Once it spots Link it circles him and shoots needle volleys. Any other hit makes it backflip away and vanish, and a sword hit from behind while it plays kills it outright.',
  cite: at(186),
  pools: [{ id: 'body', label: 'Skull Kid', hp: { value: 10, cite: at(456) }, then: 'defeated' }],
  damage: {
    kind: 'decomp',
    table: 'sDamageTable',
    reactions: {
      '0xF': { damage: true, to: swordTo, note: 'a sword slash applies its damage and it reels; from behind while it plays, the phase override kills it at once', cite: at(628) },
      '0x0': { damage: false, to: fleeTo, note: 'any other hit applies no damage; it backflips away and fades out, and the actor is killed', cite: at(646) },
    },
  },
  phases,
  start: 'idle_forest',
  variants: [
    { id: 'forest', label: 'Skull Kid in the woods', start: 'idle_forest', cite: at(452) },
    { id: 'stump_after_song', label: "Skull Kid on the stump, after Saria's Song", start: 'idle_stump', cite: at(746) },
    { id: 'stump_before_song', label: "Skull Kid on the stump, before Saria's Song", start: 'idle_stump_shy', cite: at(743) },
  ],
  range: 'far',
  steps,
  attacks,
  actionFuncs: {
    SKJ_ACTION_SARIA_SONG_IDLE: 'idle_*',
    SKJ_ACTION_RESET_FIGHT: 'look',
    SKJ_ACTION_FIGHT: 'stance',
    SKJ_ACTION_WAIT_TO_SHOOT_NEEDLE: 'volley',
    SKJ_ACTION_NEEDLE_RECOVER: 'recover',
    SKJ_ACTION_PICK_NEXT_FIHGT_ACTION: 'hit',
    SKJ_ACTION_FADE: 'flee',
    SKJ_ACTION_WAIT_FOR_LAND_ANIM: talk(
      'reached only by the dodge backflip after three sword hits within its 60-frame window (632-638, 783-785); each hit takes its AC away for the hit reaction (unk_2D3 is 0, 326), so in 20-frame beats the third hit lands at frame 80 at the earliest, after the window resets (1333-1334)',
      799,
    ),
    SKJ_ACTION_WAIT_FOR_DEATH_ANIM: talk('death animation after the finishing blow; the encounter has already ended', 766),
    SKJ_ACTION_SPAWN_DEATH_EFFECT: talk('fades out and drops a rupee after death; drops are out of scope', 892),
    SKJ_ACTION_SARIA_SONG_WAIT_IN_RANGE: talk(SONG, 928),
    SKJ_ACTION_SARIA_SONG_WAIT_FOR_SONG: talk(SONG, 979),
    SKJ_ACTION_SARIA_SONG_AFTER_SONG: talk(SONG, 1046),
    SKJ_ACTION_SARIA_TALK: talk(SONG, 1058),
    SKJ_ACTION_UNK14: talk(`${SONG}; it hands over the Piece of Heart`, 1076),
    SKJ_ACTION_SARIA_SONG_CHANGE_MODE: talk(SONG, 1089),
    SKJ_ACTION_SARIA_SONG_START_TRADE: talk(TRADE, 328),
    SKJ_ACTION_SARIA_SONG_WAIT_FOR_LANDING: talk(TRADE, 329),
    SKJ_ACTION_SARIA_SONG_WAIT_FOR_LANDING_ANIM: talk(TRADE, 330),
    SKJ_ACTION_SARIA_SONG_WALK_TO_PLAYER: talk(TRADE, 331),
    SKJ_ACTION_SARIA_SONG_ASK_FOR_MASK: talk(TRADE, 332),
    SKJ_ACTION_SARIA_SONG_TAKE_MASK: talk(TRADE, 333),
    SKJ_ACTION_SARIA_SONG_WAIT_MASK_TEXT: talk(TRADE, 334),
    SKJ_ACTION_SARIA_SONG_WRONG_SONG: talk(TRADE, 335),
    SKJ_ACTION_SARIA_SONG_WAIT_FOR_TEXT: talk(TRADE, 336),
    SKJ_ACTION_OCARINA_GAME_WAIT_FOR_PLAYER: talk('ocarina memory game kid (types 1 and 2): unk_2D3 is 0, so its collider is not set', 337),
    SKJ_ACTION_OCARINA_GAME_IDLE: talk('ocarina memory game kid: unk_2D3 is 0, so its collider is not set', 338),
    SKJ_ACTION_OCARINA_GAME_PLAY: talk('ocarina memory game kid: unk_2D3 is 0, so its collider is not set', 339),
    SKJ_ACTION_OCARINA_GAME_LEAVE: talk('ocarina memory game kid: unk_2D3 is 0, so its collider is not set', 340),
    EnSkj_SetupWaitForOcarina: talk(MINIGAME, 410),
    EnSkj_WaitForOcarina: talk(MINIGAME, 410),
    EnSkj_StartOcarinaMinigame: talk(MINIGAME, 410),
    EnSkj_WaitForPlayback: talk(MINIGAME, 410),
    EnSkj_FailedMiniGame: talk(MINIGAME, 410),
    EnSkj_WonOcarinaMiniGame: talk(MINIGAME, 410),
    EnSkj_WaitToGiveReward: talk(MINIGAME, 410),
    EnSkj_GiveOcarinaGameReward: talk(MINIGAME, 410),
    EnSkj_FinishOcarinaGameRound: talk(MINIGAME, 410),
    EnSkj_WaitForNextRound: talk(MINIGAME, 410),
    EnSkj_WaitForOfferResponse: talk(MINIGAME, 410),
    EnSkj_CleanupOcarinaGame: talk(MINIGAME, 410),
  },
  atSources: { [at(208)]: 'contact' },
  loadouts: standardLoadouts(['child', 'adult']),
  expected: {
    deadVerbs: {
      link_hurt_overkill: 'both attacks cost 8 (4 with Double Defense), which divides every starting health, so a hit never finds Link already empty',
      ...Object.fromEntries(
        ['deku_stick', 'hammer_swing', 'slash_kokiri', 'slash_master', 'slash_giant', 'magic_fire', 'spin_kokiri', 'spin_giant', 'spin_master',
          'jump_kokiri', 'jump_kokiri_self', 'jump_giant', 'jump_giant_self', 'jump_master', 'jump_master_self', 'hammer_jump'].map((k) => [
          `hit_${k}__idle_stump_shy`,
          "before Saria's Song the stump kid backflips away on the step Link comes near (743-745), so a hit that needs near never finds it",
        ]),
      ),
    },
  },
}
