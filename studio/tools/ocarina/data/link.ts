import type { Age, Gear, LinkAttack, LinkSpec, Reach } from '../spec'
import type { DmgType } from '../inventory'

const P = 'src/overlays/actors/ovl_player_actor/z_player.c'
const PL = 'src/code/z_player_lib.c'
const K = 'src/overlays/misc/ovl_kaleido_scope/z_kaleido_scope.c'
const MT = 'src/overlays/actors/ovl_En_M_Thunder/z_en_m_thunder.c'
const AR = 'src/overlays/actors/ovl_En_Arrow/z_en_arrow.c'
const ZP = 'src/code/z_parameter.c'
const CC = 'include/collision_check.h'

const meleeOwnDamage = { value: 1, cite: `${P}:10497` } as const
const thunderOwnDamage = { value: 0, cite: `${MT}:62` } as const
const arrowOwnDamage = { value: 1, cite: `${AR}:64` } as const

const attack = (
  dmg: DmgType, label: string, ages: Age[], needs: Gear[], reach: Reach,
  ownDamage: LinkAttack['ownDamage'], cite: LinkAttack['cite'], magic?: LinkAttack['magic'],
): LinkAttack => (magic ? { dmg, label, ages, needs, reach, magic, ownDamage, cite } : { dmg, label, ages, needs, reach, ownDamage, cite })

const swords = [
  { gear: 'kokiri_sword', name: 'Kokiri Sword', ages: ['child'], slash: 'SLASH_KOKIRI', spin: 'SPIN_KOKIRI', jump: 'JUMP_KOKIRI', ageCite: `${K}:865` },
  { gear: 'master_sword', name: 'Master Sword', ages: ['adult'], slash: 'SLASH_MASTER', spin: 'SPIN_MASTER', jump: 'JUMP_MASTER', ageCite: `${K}:866` },
  { gear: 'giants_knife', name: "Giant's Knife", ages: ['adult'], slash: 'SLASH_GIANT', spin: 'SPIN_GIANT', jump: 'JUMP_GIANT', ageCite: `${K}:891` },
  { gear: 'biggoron_sword', name: 'Biggoron Sword', ages: ['adult'], slash: 'SLASH_GIANT', spin: 'SPIN_GIANT', jump: 'JUMP_GIANT', ageCite: `${K}:867` },
] as const

const chargedSpinMagic = { value: 2, cite: `${P}:4432` } as const
const quickSpinMagic = { value: 0, cite: `${MT}:103` } as const

const slashes = (dmg: DmgType) =>
  swords.filter((s) => s.slash === dmg).map((s) =>
    attack(dmg, `${s.name} slash (horizontal, vertical, thrust, combo finishers, and crouch stab fold in here; crouch stab sets no flags of its own and keeps the quads' last dmgFlags, ${P}:8966)`, [...s.ages], [s.gear], 'melee', meleeOwnDamage, `${P}:4511`))

const spins = (dmg: DmgType) =>
  swords.filter((s) => s.spin === dmg).flatMap((s) => [
    attack(dmg, `${s.name} quick spin (stick rotation + B); En_M_Thunder carries the spin flags only when the magic meter is acquired and idle, at no cost; without it the swing hits with slash flags`, [...s.ages], [s.gear, 'magic'], 'self', thunderOwnDamage, `${MT}:114`, quickSpinMagic),
    attack(dmg, `${s.name} charged spin released below 85% charge (params 0x200 >> 8 = 2 magic, requested at 10% charge)`, [...s.ages], [s.gear, 'magic'], 'self', thunderOwnDamage, `${MT}:208`, chargedSpinMagic),
  ])

const jumps = (dmg: DmgType) =>
  swords.filter((s) => s.jump === dmg).flatMap((s) => [
    attack(dmg, `${s.name} jump slash (Z-target + A)`, [...s.ages], [s.gear], 'melee', meleeOwnDamage, `${P}:4552`),
    attack(dmg, `${s.name} great spin: charged spin released at or above 85% charge, En_M_Thunder switches to jump flags (2 magic)`, [...s.ages], [s.gear, 'magic'], 'self', thunderOwnDamage, `${MT}:212`, chargedSpinMagic),
  ])

const shieldAttack = (gear: Gear, name: string, ages: Age[]) =>
  attack('SHIELD', `${name} raised: the shield quad is set as AT with DMG_SHIELD while shielding`, ages, [gear], 'melee', { value: 0, cite: `${P}:10517` }, `${PL}:1511`)

const neverEmitted = (what: string): string =>
  `Player never emits it. Searched src for the DMG_ macro and for its hex bit in every ColliderInit atDmgInfo (grep '{ 0x<bit>, HIT_SPECIAL' and 'dmgFlags = '); ${what}`

export const link: LinkSpec = {
  healthPerHeart: { value: 0x10, cite: `${ZP}:2263` },
  doubleDefense: { rule: 'arithmetic-shift-right-1', cite: `${ZP}:2252` },
  magicMeter: { single: { value: 0x30, cite: 'include/save.h:71' }, double: { value: 0x60, cite: 'include/save.h:72' } },
  statusFrames: {
    burn: { value: [0, 199], cite: `${P}:4798` },
    freeze: { value: [1, 101], cite: `${P}:14452` },
    shock: { value: 20, cite: `${P}:4667` },
  },
  burnDamage: { value: { units: 1, frames: 8 }, cite: `${P}:11564` },
  freezeDamage: { value: { units: 1, frames: 4 }, cite: `${P}:14460` },
  lensDrain: { value: { units: 1, frames: 80 }, cite: `${ZP}:2620` },
  nayruFrames: { value: 1200, cite: 'src/overlays/actors/ovl_Magic_Dark/z_magic_dark.c:120' },
  nayruMagic: { value: 24, cite: `${P}:1692` },
  fairyRevive: { value: 0x140, cite: `${P}:9411` },
  potions: {
    red: { value: 0x140, cite: `${P}:14014` },
    green: { value: 0x60, cite: `${ZP}:2358` },
    blue: { health: { value: 0x140, cite: `${P}:14014` }, magic: { value: 0x60, cite: `${ZP}:2358` } },
  },

  attacks: {
    DEKU_NUT: [attack('DEKU_NUT', 'Deku Nut thrown; on impact it spawns En_M_Fire1, a 200-radius flash cylinder carrying DMG_DEKU_NUT', ['child', 'adult'], ['deku_nuts'], 'ranged', { value: 0, cite: 'src/overlays/actors/ovl_En_M_Fire1/z_en_m_fire1.c:42' }, `${AR}:291`)],
    DEKU_STICK: [attack('DEKU_STICK', 'Deku Stick swing (every swing direction is forced to a forward slash)', ['child'], ['deku_sticks'], 'melee', meleeOwnDamage, `${P}:4512`)],
    SLINGSHOT: [attack('SLINGSHOT', 'Slingshot seed (child only: the projectile type is ARROW_SEED when not adult)', ['child'], ['slingshot'], 'ranged', arrowOwnDamage, `${AR}:100`)],
    EXPLOSIVE: [
      attack('EXPLOSIVE', 'Bomb explosion (8 + rot.z high byte; the player spawns it with rot.z 0); AT_TYPE_ALL, so it also hurts Link', ['child', 'adult'], ['bombs'], 'ranged', { value: 8, cite: 'src/overlays/actors/ovl_En_Bom/z_en_bom.c:72' }, `${P}:2442`),
      attack('EXPLOSIVE', 'Bombchu explosion (spawns an En_Bom with timer 0, so the same 8-damage blast)', ['child', 'adult'], ['bombchus'], 'ranged', { value: 8, cite: 'src/overlays/actors/ovl_En_Bom/z_en_bom.c:72' }, 'src/overlays/actors/ovl_En_Bom_Chu/z_en_bom_chu.c:124'),
    ],
    BOOMERANG: [attack('BOOMERANG', 'Boomerang', ['child'], ['boomerang'], 'ranged', { value: 1, cite: 'src/overlays/actors/ovl_En_Boom/z_en_boom.c:53' }, 'src/overlays/actors/ovl_En_Boom/z_en_boom.c:53')],
    ARROW_NORMAL: [attack('ARROW_NORMAL', 'Bow arrow (also ARROW_NORMAL_HORSE on Epona, same flag)', ['adult'], ['bow'], 'ranged', arrowOwnDamage, `${AR}:99`)],
    HAMMER_SWING: [attack('HAMMER_SWING', 'Megaton Hammer swing', ['adult'], ['megaton_hammer'], 'melee', meleeOwnDamage, `${P}:4512`)],
    HOOKSHOT: [attack('HOOKSHOT', 'Hookshot or Longshot tip (same Arms_Hook actor)', ['adult'], ['hookshot'], 'ranged', { value: 1, cite: 'src/overlays/actors/ovl_Arms_Hook/z_arms_hook.c:51' }, 'src/overlays/actors/ovl_Arms_Hook/z_arms_hook.c:51')],
    SLASH_KOKIRI: slashes('SLASH_KOKIRI'),
    SLASH_MASTER: slashes('SLASH_MASTER'),
    SLASH_GIANT: slashes('SLASH_GIANT'),
    ARROW_FIRE: [attack('ARROW_FIRE', 'Fire Arrow (falls back to a normal arrow if the magic request fails)', ['adult'], ['bow', 'fire_arrows', 'magic'], 'ranged', arrowOwnDamage, `${AR}:99`, { value: 4, cite: `${P}:1696` })],
    ARROW_ICE: [attack('ARROW_ICE', 'Ice Arrow', ['adult'], ['bow', 'ice_arrows', 'magic'], 'ranged', arrowOwnDamage, `${AR}:99`, { value: 4, cite: `${P}:1696` })],
    ARROW_LIGHT: [attack('ARROW_LIGHT', 'Light Arrow', ['adult'], ['bow', 'light_arrows', 'magic'], 'ranged', arrowOwnDamage, `${AR}:100`, { value: 8, cite: `${P}:1696` })],
    ARROW_UNK1: { excluded: `${neverEmitted('bit 0x00004000 appears in no AT init. En_Arrow maps it only to ARROW_0D, which needs PLAYER_IA_BOW_0D; no ITEM_ maps to PLAYER_IA_BOW_0C/0D/0E in sItemActions (z_player.c:1309-1371)')}`, cite: `${AR}:100` },
    ARROW_UNK2: { excluded: `${neverEmitted('bit 0x00008000 appears in no AT init. En_Arrow maps it only to ARROW_0E, which needs PLAYER_IA_BOW_0E; no ITEM_ maps to it in sItemActions')}`, cite: `${AR}:100` },
    ARROW_UNK3: { excluded: `${neverEmitted('bit 0x00010000 appears in no AT init. En_Arrow maps it only to ARROW_0C, which needs PLAYER_IA_BOW_0C; no ITEM_ maps to it in sItemActions')}`, cite: `${AR}:100` },
    MAGIC_FIRE: [attack('MAGIC_FIRE', "Din's Fire; collider damage starts at 1 and is rewritten each frame to actionTimer + 25 while expanding, then actionTimer", ['child', 'adult'], ['dins_fire', 'magic'], 'self', { value: 1, cite: 'src/overlays/actors/ovl_Magic_Fire/z_magic_fire.c:85' }, 'src/overlays/actors/ovl_Magic_Fire/z_magic_fire.c:163', { value: 12, cite: `${P}:1692` })],
    MAGIC_ICE: { excluded: neverEmitted("bit 0x00040000 appears in no AT init and no dmgFlags assignment; the only hits are AC masks (En_Po_Sisters) and freeze checks in z_actor.c. Nayru's Love (Magic_Dark) and Farore's Wind (Magic_Wind) have no collider"), cite: `${CC}:430` },
    MAGIC_LIGHT: { excluded: neverEmitted('bit 0x00080000 appears in no AT init and no dmgFlags assignment; Arrow_Light has no collider (the light arrow hit is En_Arrow with DMG_ARROW_LIGHT)'), cite: `${CC}:431` },
    SHIELD: [
      shieldAttack('deku_shield', 'Deku Shield', ['child']),
      shieldAttack('hylian_shield', 'Hylian Shield', ['child', 'adult']),
      shieldAttack('mirror_shield', 'Mirror Shield', ['adult']),
    ],
    MIR_RAY: [{ ...attack('MIR_RAY', 'Mirror Shield reflecting a scene light beam: Mir_Ray is spawned only by Spirit Temple and Ganon\'s Castle room actors (Bg_Jya_*, Bg_Gnd_Soulmeiro), not by Link', ['adult'], ['mirror_shield'], 'ranged', { value: 0, cite: 'src/overlays/actors/ovl_Mir_Ray/z_mir_ray.c:75' }, 'src/overlays/actors/ovl_Mir_Ray/z_mir_ray.c:271'), room: 'light_beam' }],
    SPIN_KOKIRI: spins('SPIN_KOKIRI'),
    SPIN_GIANT: spins('SPIN_GIANT'),
    SPIN_MASTER: spins('SPIN_MASTER'),
    JUMP_KOKIRI: jumps('JUMP_KOKIRI'),
    JUMP_GIANT: jumps('JUMP_GIANT'),
    JUMP_MASTER: [
      ...jumps('JUMP_MASTER'),
      attack('JUMP_MASTER', 'Deku Stick jump slash: the stick row of the melee table emits DMG_JUMP_MASTER, so a child gets Master Sword jump damage', ['child'], ['deku_sticks'], 'melee', meleeOwnDamage, `${P}:4512`),
    ],
    UNKNOWN_1: { excluded: neverEmitted('bit 0x10000000 appears in no AT init and no dmgFlags assignment; only read in z_actor.c freeze checks'), cite: `${CC}:440` },
    UNBLOCKABLE: { excluded: neverEmitted('bit 0x20000000 appears only in AT_TYPE_ENEMY colliders (En_Ik, En_Fz, Boss_Va, Bg_Hidan_* and others) and in En_Mb\'s attack collider; no AT_TYPE_PLAYER collider carries it'), cite: 'src/overlays/actors/ovl_En_Mb/z_en_mb.c:320' },
    HAMMER_JUMP: [attack('HAMMER_JUMP', 'Megaton Hammer jump attack', ['adult'], ['megaton_hammer'], 'melee', meleeOwnDamage, `${P}:4512`)],
    UNKNOWN_2: { excluded: neverEmitted('bit 0x80000000 appears in no AT init and no dmgFlags assignment'), cite: `${CC}:443` },
  },

  shields: [
    { gear: 'deku_shield', ages: ['child'], cite: `${K}:868`, burnsOnFire: true },
    { gear: 'hylian_shield', ages: ['child', 'adult'], cite: `${K}:869`, burnsOnFire: false },
    { gear: 'mirror_shield', ages: ['adult'], cite: `${K}:870`, burnsOnFire: false },
  ],

  hitEffects: {
    HIT_SPECIAL_EFFECT_NONE: { implementedAs: 'none', cite: `${P}:4952` },
    HIT_SPECIAL_EFFECT_FIRE: { implementedAs: 'burn', cite: `${P}:4805` },
    HIT_SPECIAL_EFFECT_ICE: { implementedAs: 'freeze', cite: `${P}:4945` },
    HIT_SPECIAL_EFFECT_ELECTRIC: { implementedAs: 'shock', cite: `${P}:4947` },
    HIT_SPECIAL_EFFECT_KNOCKBACK: { implementedAs: 'knockback', cite: `${P}:4949` },
    HIT_SPECIAL_EFFECT_7: { implementedAs: 'none', cite: `${CC}:89` },
    HIT_SPECIAL_EFFECT_8: { implementedAs: 'none', cite: `${CC}:90` },
    HIT_SPECIAL_EFFECT_9: { implementedAs: 'none', cite: `${CC}:91` },
    PLAYER_KNOCKBACK_SMALL: { implementedAs: 'knockback', cite: `${P}:4867` },
    PLAYER_KNOCKBACK_LARGE: { implementedAs: 'knockback', cite: `${P}:4868` },
    PLAYER_KNOCKBACK_LARGE_ELECTRIFIED: { implementedAs: 'knockback', cite: `${P}:4875` },
    HIT_BACKLASH_ELECTRIC: { implementedAs: 'shock', cite: `${P}:9148` },
    deku_shield_burn: { implementedAs: 'steal', cite: `${P}:4789` },
    grabbed: { implementedAs: 'grab', cite: `${P}:16093` },
    wallmaster_carried_off: { implementedAs: 'grab', cite: 'src/overlays/actors/ovl_En_Wallmas/z_en_wallmas.c:281' },
    like_like_theft: { implementedAs: 'steal', cite: 'src/overlays/actors/ovl_En_Rr/z_en_rr.c:323' },
    redead_paralysis: { implementedAs: 'paralyze', cite: 'src/overlays/actors/ovl_En_Rd/z_en_rd.c:388' },
    bubble_curse: { excluded: 'No curse or jinx exists in OoT. grep -ri "jinx|curse" over src and include finds nothing combat-related, and En_Bb\'s AT_HIT handling only plays a bite sound and clears the flag', cite: 'src/overlays/actors/ovl_En_Bb/z_en_bb.c:943' },
    ice_trap: { implementedAs: 'freeze', cite: `${P}:13905` },
  },

  economy: {
    hit_intangibility: { note: 'After any hit Link is intangible for 20 frames (no damage, no knockback); the death roll sets unk_A87 = 20 the same way', cite: `${P}:4956` },
    shield_block: { note: 'A hit that bounces off the raised shield quad (AC_BOUNCED) deals no damage and returns before the damage path; a fire hit on a Deku Shield also burns it away', cite: `${P}:4922` },
    child_hylian_shield: { note: 'Child holding the Hylian Shield gets no block recoil and cannot crouch stab; the shield collider sits on his back', cite: `${P}:4893` },
    burning: { note: 'Burning: 21 body-part flame timers rolled 0..199; each frame they drop by speedXZ*0.4+1 (20 in the Goron Tunic, +100 with PLAYER_STATE2_3); 1 health lost every 8 frames (every frame in the Twinrova arena); burning also burns a Deku Shield', cite: `${P}:11517` },
    freezing: { note: 'Frozen: breaks free when actionVar2 passes 100, +1 per frame, +5 per A/B press, plus stick rotation; 1 health lost every 4 frames while frozen (5 per beat)', cite: `${P}:14460` },
    shock: { note: 'Electrified: 20 frames of shock action; the -1 damage call fires only when actionVar2 % 25 == 0, which the 20..1 countdown never reaches; HIT_BACKLASH_ELECTRIC sets damage 8 before the shock', cite: `${P}:14475` },
    grab_escape: { note: 'Held by grabPlayer (Redead, Gibdo, Like Like, Dead Hand, Floormaster, Morpha, Bongo Bongo hand, Mb): escape when mash total passes 100 with no per-frame gain (stick rotation and +5 per A/B press only); holding damage is the grabbing actor\'s', cite: `${P}:14249` },
    redead_scream: { note: 'Redead/Gibdo scream sets player->actor.freezeTimer = 40 (and 60 on a later path), which stops the player updating', cite: 'src/overlays/actors/ovl_En_Rd/z_en_rd.c:641' },
    like_like_steals: { note: 'Like Like eats any shield except the Mirror Shield and any tunic except the Kokiri Tunic', cite: 'src/overlays/actors/ovl_En_Rr/z_en_rr.c:329' },
    death: { note: 'Health reaching 0 fails func_80837B18 and starts the death action; a bottled fairy revives with healthAccumulator 0x140', cite: `${P}:4639` },
    fairy_manual: { note: 'Releasing a bottled fairy by hand also restores 0x140', cite: `${P}:14148` },
    potion_table: { note: 'Bottle drink flags from PLAYER_IA_BOTTLE_POTION_RED: red 1 (0x140 health), blue 3 (0x140 health + Magic_Fill), green 2 (Magic_Fill), milk 4 (0x50 health). Magic_Fill fills to the current capacity, 0x30 or 0x60', cite: `${P}:13991` },
    milk: { note: 'Lon Lon Milk restores 0x50 per drink', cite: `${P}:14022` },
    double_defense: { note: 'Negative health changes are halved by an arithmetic shift right when Double Defense is acquired', cite: `${ZP}:2252` },
    magic_meter: { note: 'Single meter 0x30, double 0x60 magic units', cite: 'include/save.h:72' },
    magic_spell_costs: { note: "sMagicSpellCosts indexed from PLAYER_IA_MAGIC_SPELL_15: Farore's Wind 12, Nayru's Love 24, Din's Fire 12", cite: `${P}:1692` },
    magic_arrow_costs: { note: 'Fire 4, Ice 4, Light 8; a failed request fires a normal arrow', cite: `${P}:1696` },
    spin_attack_magic: { note: 'Charged spin spawns En_M_Thunder with params 0x200: 2 magic requested at 10% charge, consumed on release; quick spin costs 0 but needs the meter acquired', cite: `${P}:4432` },
    dins_fire: { note: "Din's Fire costs 12 magic; collider damage grows to actionTimer + 25 while expanding", cite: 'src/overlays/actors/ovl_Magic_Fire/z_magic_fire.c:163' },
    nayrus_love: { note: "Nayru's Love costs 24 magic and lasts 1200 frames; each frame it sets invincibilityTimer = -100 (invulnerable: no damage, knockback still applies)", cite: 'src/overlays/actors/ovl_Magic_Dark/z_magic_dark.c:129' },
    lens_of_truth: { note: 'Lens of Truth costs 0 to switch on and drains 1 magic every 80 frames (0.25 per beat); it switches off at 0 magic', cite: `${P}:3559` },
    giants_knife_breaks: { note: "Giant's Knife swordHealth starts at 8 and drops by 1 per sword hit; at 0 it breaks and swings with the Kokiri row (SLASH_KOKIRI / JUMP_KOKIRI); Biggoron Sword (bgsFlag) never breaks", cite: `${P}:9017` },
    goron_tunic: { note: 'Goron Tunic burns out body flames 20 per frame, and shields Link from hot-floor damage (the floor-damage path, environmental, out of scope)', cite: `${P}:11517` },
    zora_tunic: { excluded: 'Zora Tunic only bears on underwater breathing; drowning timers are out of scope per CONTRACT', cite: `${K}:873` },
    kokiri_tunic: { note: 'Default tunic; the only tunic a Like Like cannot eat', cite: 'src/overlays/actors/ovl_En_Rr/z_en_rr.c:329' },
    bomb_self_damage: { note: 'Bomb explosions are AT_TYPE_ALL and hit Link too', cite: 'src/overlays/actors/ovl_En_Bom/z_en_bom.c:85' },
    ammo: { excluded: 'Ammunition counts are out of scope per CONTRACT; the player decrements ammo on use (example: Deku Nut)', cite: `${P}:13850` },
    farores_wind: { excluded: "Farore's Wind is a warp point, no combat effect; it shares the spell cost table", cite: `${P}:1692` },
    environment_emitters: { excluded: 'Link can also deal damage with things he does not carry: thrown pots and crates (DMG_DEKU_STICK, 1), reflected Octorok rocks, Deku Scrub nuts, and Anubis fire (switched to AT_TYPE_PLAYER + DMG_DEKU_STICK), thrown Ruto (DMG_DEKU_NUT | DMG_SLASH_KOKIRI, 0). No Gear state expresses "a pot is here" or "an enemy projectile is in reach"; those belong to the actor that owns them', cite: 'src/overlays/actors/ovl_En_Okuta/z_en_okuta.c:508' },
    epona: { excluded: 'Epona\'s cylinder is AT_TYPE_PLAYER with SLASH_GIANT 4 but never AT_ON; grep atFlags in z_en_horse.c finds no write', cite: 'src/overlays/actors/ovl_En_Horse/z_en_horse.c:113' },
    other_songs: { excluded: 'Searched every actor with ACTORCAT_ENEMY/BOSS or a DamageTable for lastPlayedSong, OCARINA_SONG_, ocarinaMode, and sunsSongState. Only En_Rd (Sun\'s Song) reacts in combat; En_Skj (Skull Kid) handles Saria\'s Song as a dialogue/item exchange, and En_Gs, En_Du, En_Ma1, En_Ma2 are NPCs or props', cite: 'src/overlays/actors/ovl_En_Skj/z_en_skj.c:1003' },
  },

  songs: {
    ocarina: { note: "Sun's Song sets sunsSongState (Oceff_Spot); a Redead or Gibdo not already stunned, damaged, or dead is stunned for 600 frames", cite: 'src/overlays/actors/ovl_En_Rd/z_en_rd.c:768' },
  },
}
