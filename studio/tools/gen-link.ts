import { writeFileSync } from 'node:fs'
import { WORLD, type Arc, type Net, type State, type Verb } from '../src/core/model'
import { print } from '../src/core/text'

// Link's capability schema in Ocarina of Time, from research/link-moveset.md (zeldaret/oot at 14759abf).
// P = ovl_player_actor/z_player.c, PL = z_player_lib.c, ZP = z_parameter.c, KS = z_kaleido_scope.c.
// Read as a designer reads it: what Link can do and what allows it. Buttons are left out (they are the
// operational layer above the net), and so are feel and frame data. Three choices are written down here:
// - A combo finisher has the same damage type as a slash and differs only in animation and sound (P:2509),
//   so it is not a separate state. Slash kinds (horizontal, vertical, thrust) share damage the same way.
// - Durations race against Link's choices, so the clock is its own speaker. A world verb would fire at once.
// - What surrounds Link (water, a door, an enemy) is content. The level speaks for it at the open interface.

const states: State[] = []
const verbs: Verb[] = []
const arcs: Arc[] = []
const cites = new Map<string, string>()
const groups: Net['groups'] = []

const facet = (group: string, label: string, list: [string, string][]) => {
  groups.push({ id: group, label })
  list.forEach(([id, l], i) => states.push({ id, label: l, marks: i === 0 ? 1 : 0, seenBy: 'all', group, x: 0, y: 0 }))
}
const count = (id: string, label: string, marks: number) => states.push({ id, label, marks, seenBy: 'all', x: 0, y: 0 })

let n = 0
const verb = (label: string, by: string, cite: string, ...a: string[]) => {
  const id = `v${++n}_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`.slice(0, 48)
  verbs.push({ id, label, by, priority: 0, weight: 1, x: 0, y: 0 })
  cites.set(id, cite)
  for (const s of a) {
    const [kind, state, c] = s.split(' ')
    arcs.push({ kind: kind as Arc['kind'], state, verb: id, count: c ? Number(c) : 1 })
  }
}
const L = 'link'
const LEVEL = 'level'
const CLOCK = 'clock'
const move = (from: string, to: string) => [`take ${from}`, `give ${to}`]

facet('act', 'What Link is doing', [
  ['on_foot', 'On foot'],
  ['airborne', 'In the air'], ['backflip', 'Backflipping'], ['hanging', 'Hanging from a ledge'],
  ['climbing', 'Climbing'], ['crawling', 'Crawling'], ['rolling', 'Rolling'], ['bonked', 'Bonked'],
  ['swimming', 'Swimming'], ['diving', 'Diving'], ['sunk', 'Walking underwater'], ['riding', 'Riding Epona'],
  ['swinging', 'Swinging'], ['charging', 'Charging a spin'], ['charged', 'Spin ready'], ['full', 'Great spin ready'],
  ['spinning', 'Spinning'], ['great_spin', 'Great spinning'], ['jump_attack', 'Jump attack'], ['finish', 'Landing strike'],
  ['guarding', 'Guarding'], ['guard_moving', 'Guarding on the move'], ['crouch_stab', 'Crouch stab'],
  ['looking', 'Looking around'], ['aim_slingshot', 'Aiming the Slingshot'], ['aim_bow', 'Aiming the Bow'],
  ['aim_hookshot', 'Aiming the Hookshot'], ['hooked', 'Pulled by the Hookshot'], ['boomerang', 'Boomerang in flight'],
  ['ocarina', 'Playing the ocarina'], ['door', 'Going through a door'], ['chest', 'Opening a chest'],
  ['talking', 'Talking'], ['pushing', 'Holding a block'], ['knocked', 'Knocked back'],
])
facet('tgt', 'Targeting', [['free', 'Not targeting'], ['z', 'Z-targeting, no enemy'], ['battle', 'Locked onto an enemy']])
facet('hand', 'In hand', [
  ['empty', 'Nothing in hand'], ['sword', 'Sword out'], ['big_sword', "Biggoron's Sword out"], ['stick', 'Deku Stick out'],
  ['hammer', 'Megaton Hammer out'], ['object', 'Carrying something'], ['bottle', 'Bottle out'],
])
facet('shield', 'Shield', [['no_shield', 'No shield'], ['deku', 'Deku Shield'], ['hylian', 'Hylian Shield'], ['mirror', 'Mirror Shield']])
facet('age', 'Age', [['child', 'Child'], ['adult', 'Adult']])
facet('boots', 'Boots', [['kokiri_boots', 'Kokiri Boots'], ['iron', 'Iron Boots'], ['hover', 'Hover Boots']])
facet('str', 'Strength', [['no_str', 'No bracelet'], ['bracelet', "Goron's Bracelet"], ['silver', 'Silver Gauntlets'], ['gold', 'Golden Gauntlets']])
facet('lens', 'Lens of Truth', [['lens_off', 'Lens away'], ['lens_on', 'Looking through the Lens']])
facet('mask', 'Mask', [['no_mask', 'No mask'], ['mask', 'Wearing a mask']])
facet('farore', "Farore's Wind", [['no_point', 'No warp point'], ['point', 'Warp point set']])
facet('place', 'Place', [['outdoors', 'Not an indoor room'], ['indoors', 'In an indoor room']])
facet('enemy', 'Enemy', [['no_enemy', 'No enemy near'], ['enemy', 'An enemy near']])
facet('front', 'In front of Link', [
  ['nothing', 'Nothing in front'], ['door_front', 'A door'], ['chest_front', 'A chest'], ['ledge_front', 'A ledge'],
  ['wall_front', 'A climbable wall'], ['crawl_front', 'A crawlspace'], ['block_front', 'A pushable block'],
  ['talker_front', 'Someone to talk to'], ['lift_front', 'Something to lift'], ['rock_front', 'A silver rock'],
  ['giant_front', 'A giant block'], ['horse_front', 'Epona'], ['pedestal_front', 'The Master Sword pedestal'], ['soil_front', 'Soft soil'],
])
count('magic', 'Magic', 48)
count('explosives', 'Explosives out', 0)

// Held items Link swings with. Carrying, a bottle, and empty hands are the rest.
const MELEE = ['unless empty', 'unless object', 'unless bottle']
const SWORD = [...MELEE, 'unless stick', 'unless hammer']
const FREE_HANDS = ['unless object']

// Movement
verb('Run off an edge', LEVEL, 'auto-jump: speed > 3, 20 units above the floor (P:5866-5870); Link has no jump button', ...move('on_foot', 'airborne'))
verb('Land', CLOCK, 'P:9615', ...move('airborne', 'on_foot'))
verb('Catch a ledge', LEVEL, 'ledge under 150 units up (P:9615)', ...move('airborne', 'hanging'))
verb('Ease off an edge', LEVEL, 'func_8083A6AC', ...move('on_foot', 'hanging'))
verb('Pull up', L, 'P:12750', ...move('hanging', 'on_foot'))
verb('Let go', L, 'P:12750', ...move('hanging', 'airborne'))
verb('Climb onto the ledge', L, 'handler 12; height picks hop, step, or grab (P:11280-11291)', 'need on_foot', 'need ledge_front', ...FREE_HANDS)
verb('Grab the wall', L, 'climbable wall, ledge at least 79 up (P:7490)', ...move('on_foot', 'climbing'), 'need wall_front', ...FREE_HANDS)
verb('Drop off', L, 'P:10950', ...move('climbing', 'on_foot'))
verb('Climb over the top', LEVEL, 'P:7490', ...move('climbing', 'on_foot'))
verb('Crawl in', L, 'child only (P:7610)', ...move('on_foot', 'crawling'), 'need crawl_front', 'need child')
verb('Crawl out', LEVEL, 'P:7610', ...move('crawling', 'on_foot'))
verb('Roll', L, 'handler Roll (P:6489); not in battle stance (P:4169)', ...move('on_foot', 'rolling'), 'need free')
verb('Roll while Z-targeting', L, 'only with no melee weapon in hand (P:6400-6405)', ...move('on_foot', 'rolling'), 'need z', 'unless sword', 'unless big_sword', 'unless stick', 'unless hammer')
verb('Roll ends', CLOCK, 'i-frames from frame 8 for 10 frames (P:9701)', ...move('rolling', 'on_foot'))
verb('Slash out of the roll', L, 'from frame 15 (P:9749)', ...move('rolling', 'swinging'), ...MELEE)
verb('Draw and slash out of the roll', L, 'P:9749, P:2947-2955', ...move('rolling', 'swinging'), ...move('empty', 'sword'))
verb('Bonk into a wall', LEVEL, 'speed 7 or more (P:9716-9745)', ...move('rolling', 'bonked'))
verb('Recover', CLOCK, 'P:9716', ...move('bonked', 'on_foot'))
verb('Sidehop', L, 'Z-targeting, not indoors (P:6385-6410)', ...move('on_foot', 'airborne'), 'unless free', 'unless indoors')
verb('Backflip', L, 'Z-targeting, not indoors; no air attack (P:9588)', ...move('on_foot', 'backflip'), 'unless free', 'unless indoors')
verb('Land', CLOCK, 'P:9588', ...move('backflip', 'on_foot'))
verb('Wade into deep water', LEVEL, 'P:3544', ...move('on_foot', 'swimming'), 'unless iron')
verb('Sink to the bottom', LEVEL, 'Iron Boots ignore buoyancy (P:11885)', ...move('on_foot', 'sunk'), 'need iron')
verb('Dive', L, 'not with Iron Boots (P:6862)', ...move('swimming', 'diving'))
verb('Surface', CLOCK, 'depth by scale (P:10889)', ...move('diving', 'swimming'))
verb('Climb out of the water', LEVEL, 'handler 12 while swimming (P:4169)', ...move('swimming', 'on_foot'))
verb('Walk out of the water', LEVEL, 'P:11885', ...move('sunk', 'on_foot'))
verb('Mount Epona', L, 'handler 3 (P:7194); no age check found, the child has no horse (z_en_horse.c:876)', ...move('on_foot', 'riding'), 'need horse_front', 'need adult')
verb('Dismount', L, 'P:7194', ...move('riding', 'on_foot'))
verb('Spur Epona', L, 'six carrots (z_en_horse.c:3334)', 'need riding')
verb('Shoot from the saddle', L, 'riding forces the Bow onto B (ZP:679-735)', 'need riding')

// Targeting
verb('Z-target', L, 'P:5588', ...move('free', 'z'))
verb('Lock onto the enemy', L, 'a hostile target sets battle stance (P:4169)', ...move('free', 'battle'), 'need enemy')
verb('Stop targeting', L, 'P:5588', ...move('z', 'free'))
verb('Stop targeting', L, 'P:5588', ...move('battle', 'free'))
verb('Lose the lock', WORLD, 'no target left', ...move('battle', 'free'), 'unless enemy')
verb('An enemy comes near', LEVEL, 'content', ...move('no_enemy', 'enemy'))
verb('The enemy leaves or dies', LEVEL, 'content', ...move('enemy', 'no_enemy'))
verb('Look around', L, 'handler 0, free stance only (P:6293)', ...move('on_foot', 'looking'), 'need free')
verb('Stop looking', L, 'P:6293', ...move('looking', 'on_foot'))

// Shield
verb('Raise the shield', L, 'R, shield equipped, not targeting (P:6504-6512)', ...move('on_foot', 'guarding'), 'need free', 'unless no_shield')
verb('Raise the Hylian Shield while targeting', L, 'a child with the Hylian Shield guards standing even when targeting (P:6510)', ...move('on_foot', 'guarding'), 'unless free', 'need child', 'need hylian')
verb('Guard on the move', L, 'Z + R, not a child with the Hylian Shield (P:2872-2880)', ...move('on_foot', 'guard_moving'), 'unless free', 'unless no_shield', 'need adult')
verb('Guard on the move', L, 'P:2872-2880', ...move('on_foot', 'guard_moving'), 'unless free', 'need child', 'need deku')
verb('Lower the shield', L, 'P:6504', ...move('guarding', 'on_foot'))
verb('Lower the shield', L, 'P:2872', ...move('guard_moving', 'on_foot'))
verb('Crouch stab', L, 'B with a melee weapon (P:8962)', ...move('guarding', 'crouch_stab'), ...MELEE, 'need adult')
verb('Crouch stab', L, 'not a child with the Hylian Shield (P:8963)', ...move('guarding', 'crouch_stab'), ...MELEE, 'need child', 'unless hylian')
verb('Back to guarding', CLOCK, 'repeatable (P:8962)', ...move('crouch_stab', 'guarding'))
verb('Block a hit', LEVEL, 'bounce, no damage (P:4892-4920)', 'need guarding')
verb('Block a hit', LEVEL, 'P:4892-4920', 'need guard_moving')
verb('Fire burns the Deku Shield', LEVEL, 'P:4922', ...move('deku', 'no_shield'), 'need guarding')

// Sword and melee
verb('Slash', L, 'handler 7 (P:14635); slash kinds share damage', ...move('on_foot', 'swinging'), ...SWORD)
verb('Draw and slash', L, 'one press draws and swings (P:2947-2955)', ...move('on_foot', 'swinging'), ...move('empty', 'sword'))
verb('Swing the Deku Stick', L, 'every direction is a forward slash (P:4487-4489)', ...move('on_foot', 'swinging'), 'need stick')
verb('Swing the Megaton Hammer', L, 'overhead swing sends a shockwave (P:14702-14720)', ...move('on_foot', 'swinging'), 'need hammer')
verb('Swing again', L, 'the third same-direction swing is the combo finisher, same damage (P:4527-4533)', 'need swinging', ...MELEE)
verb('The Deku Stick breaks', LEVEL, 'breaks on a hit (P:9000)', ...move('stick', 'empty'), 'need swinging')
verb('Recover', CLOCK, 'P:14635', ...move('swinging', 'on_foot'))
verb('Hold to charge a spin', L, 'hold B after a swing; not a Deku Stick (P:6573-6582); the Hammer is not excluded in code, unconfirmed in play', ...move('swinging', 'charging'), ...MELEE, 'unless stick')
verb('Charge passes 10%', CLOCK, '2% a frame (P:9873)', ...move('charging', 'charged'))
verb('Charge passes 85%', CLOCK, 'P:9829', ...move('charged', 'full'))
verb('Let go too soon', L, 'below 10% cancels (P:9897-9901)', ...move('charging', 'on_foot'))
verb('Release a spin with magic', L, '2 magic, asked at 10% and spent on release (P:4432)', ...move('charged', 'spinning'), 'take magic 2')
verb('Release a spin', L, 'without magic it is a spin with slash damage (z_en_m_thunder.c:103-108)', ...move('charged', 'spinning'), 'unless magic 2')
verb('Spin the stick and release', L, 'rotating the stick during the charge (P:9829)', ...move('charged', 'great_spin'), 'take magic 2')
verb('Spin the stick and release', L, 'z_en_m_thunder.c:103-108', ...move('charged', 'great_spin'), 'unless magic 2')
verb('Release a great spin', L, '85% charge or more, jump damage (P:9829)', ...move('full', 'great_spin'), 'take magic 2')
verb('Release a great spin', L, 'z_en_m_thunder.c:103-108', ...move('full', 'great_spin'), 'unless magic 2')
verb('Spin ends', CLOCK, '8 i-frames on release (P:9836)', ...move('spinning', 'on_foot'))
verb('Spin ends', CLOCK, 'P:9836', ...move('great_spin', 'on_foot'))
verb('Quick spin', L, 'stick rotation then B; not a Stick or the Hammer (P:4378)', ...move('on_foot', 'spinning'), ...SWORD)
verb('Draw and quick spin', L, 'P:4378, P:2947', ...move('on_foot', 'spinning'), ...move('empty', 'sword'))
verb('Jump attack', L, 'Z + A with a melee weapon, not indoors (P:6402-6403, P:6388)', ...move('on_foot', 'jump_attack'), 'unless free', ...MELEE, 'unless indoors')
verb('Jump attack from the air', L, 'B while airborne (P:9588)', ...move('airborne', 'jump_attack'), ...MELEE)
verb('Land the jump attack', CLOCK, 'JUMPSLASH_FINISH (P:9814-9817)', ...move('jump_attack', 'finish'))
verb('Recover', CLOCK, 'P:9817', ...move('finish', 'on_foot'))

// What is in hand
verb('Put away the sword', L, 'A standing still (P:6493-6497)', ...move('sword', 'empty'), 'need on_foot')
verb("Ready the Biggoron's Sword", L, 'two-handed (PL:886), adult gear (KS:778)', ...move('empty', 'big_sword'), 'need on_foot', 'need adult')
verb("Put away the Biggoron's Sword", L, 'P:6493', ...move('big_sword', 'empty'), 'need on_foot')
verb('Ready a Deku Stick', L, 'child item (KS:751)', ...move('empty', 'stick'), 'need on_foot', 'need child')
verb('Put away the Deku Stick', L, 'P:6493', ...move('stick', 'empty'), 'need on_foot')
verb('Ready the Megaton Hammer', L, 'adult item (KS:751)', ...move('empty', 'hammer'), 'need on_foot', 'need adult')
verb('Put away the Megaton Hammer', L, 'P:6493', ...move('hammer', 'empty'), 'need on_foot')
verb('Take out a bottle', L, 'P:6614', ...move('empty', 'bottle'), 'need on_foot')
verb('Put away the bottle', L, 'P:6493', ...move('bottle', 'empty'), 'need on_foot')
verb('Swing the bottle', L, 'catch a bug or fairy (P:6614-6630)', 'need bottle', 'need on_foot')
verb('Drink from the bottle', L, 'allowed even when locked on (P:3600)', 'need bottle', 'need on_foot')
verb('Pick up', L, 'hands empty (P:7413)', ...move('empty', 'object'), 'need on_foot', 'need lift_front')
verb('Lift the silver rock', L, 'Silver Gauntlets or better (P:7430-7433); a child is capped at the bracelet (PL:816)', ...move('empty', 'object'), 'need on_foot', 'need rock_front', 'need adult', 'unless no_str', 'unless bracelet')
verb('Lift the giant block', L, 'Golden Gauntlets (P:7821-7824); a child is capped at the bracelet (PL:816)', ...move('empty', 'object'), 'need on_foot', 'need giant_front', 'need gold', 'need adult')
verb('Pull out a bomb', L, 'at most 3 explosives out (P:3553)', ...move('empty', 'object'), 'need on_foot', 'unless explosives 3', 'give explosives')
verb('Throw', L, 'moving (P:7461-7468)', ...move('object', 'empty'), 'need on_foot')
verb('Set it down', L, 'standing still (P:7476-7478)', ...move('object', 'empty'), 'need on_foot')
verb('Set down a Bombchu', L, 'always set down (P:7465), cap of 3 (P:3553)', 'need on_foot', ...FREE_HANDS, 'unless explosives 3', 'give explosives')
verb('An explosive goes off', CLOCK, 'P:3553', 'take explosives')

// Items
verb('Ready the Slingshot', L, 'child item (KS:751); carrying blocks items (P:2665)', ...move('on_foot', 'aim_slingshot'), 'need child', ...FREE_HANDS)
verb('Fire a seed', L, 'first-person or Z-aim (P:3055)', 'need aim_slingshot')
verb('Lower the Slingshot', L, 'P:3055', ...move('aim_slingshot', 'on_foot'))
verb('Ready the Bow', L, 'adult item (KS:751)', ...move('on_foot', 'aim_bow'), 'need adult', ...FREE_HANDS)
verb('Shoot an arrow', L, 'P:3055', 'need aim_bow')
verb('Shoot a fire or ice arrow', L, '4 magic (P:1696)', 'need aim_bow', 'take magic 4')
verb('Shoot a light arrow', L, '8 magic (P:1696)', 'need aim_bow', 'take magic 8')
verb('Lower the Bow', L, 'P:3055', ...move('aim_bow', 'on_foot'))
verb('Ready the Hookshot', L, 'adult item (KS:751)', ...move('on_foot', 'aim_hookshot'), 'need adult', ...FREE_HANDS)
verb('Fire the Hookshot', L, 'pulls small things to Link', 'need aim_hookshot')
verb('The hook catches', LEVEL, 'hookable surface (PL:624)', ...move('aim_hookshot', 'hooked'))
verb('Fire the Hookshot from the bottom', L, 'the one item usable in water (P:3544)', ...move('sunk', 'hooked'))
verb('Arrive', CLOCK, 'PLAYER_STATE3_FLYING_WITH_HOOKSHOT (PL:624)', ...move('hooked', 'on_foot'))
verb('Lower the Hookshot', L, 'P:3055', ...move('aim_hookshot', 'on_foot'))
verb('Throw the Boomerang', L, 'child item (KS:751)', ...move('on_foot', 'boomerang'), 'need child', ...FREE_HANDS)
verb('The Boomerang comes back', CLOCK, 'PLAYER_STATE1_USING_BOOMERANG', ...move('boomerang', 'on_foot'))
verb('Throw a Deku Nut', L, 'not indoors (P:6591)', 'need on_foot', 'unless indoors', ...FREE_HANDS)
verb("Cast Din's Fire", L, '12 magic (P:1692); C buttons are off in water and on horseback (ZP:679, P:3544)', 'need on_foot', 'take magic 12', ...FREE_HANDS)
verb("Cast Nayru's Love", L, '24 magic (P:1692)', 'need on_foot', 'take magic 24', ...FREE_HANDS)
verb("Cast Farore's Wind", L, '12 magic (P:1692)', ...move('no_point', 'point'), 'need on_foot', 'take magic 12', ...FREE_HANDS)
verb("Warp to Farore's point", L, 'no magic (P:3578)', ...move('point', 'no_point'), 'need on_foot', ...FREE_HANDS)
verb('Look through the Lens', L, 'free to switch on (P:3559)', ...move('lens_off', 'lens_on'), 'need magic', ...FREE_HANDS)
verb('Put the Lens away', L, 'P:3559', ...move('lens_on', 'lens_off'))
verb('The Lens drains magic', CLOCK, '1 every 80 frames (P:3559)', 'need lens_on', 'take magic')
verb('The Lens closes', WORLD, 'off at 0 magic (P:3559)', ...move('lens_on', 'lens_off'), 'unless magic')
verb('Play the ocarina', L, 'not under hostile lock-on (P:3598-3605)', ...move('on_foot', 'ocarina'), 'unless battle', ...FREE_HANDS)
verb('Stop playing', L, 'P:6030', ...move('ocarina', 'on_foot'))
verb('Put on a mask', L, 'child item (KS:805); no movement effect (P:11799)', ...move('no_mask', 'mask'), 'need child')
verb('Take off the mask', L, 'P:3588-3594', ...move('mask', 'no_mask'))
verb('Plant a magic bean', L, 'child item (KS:805)', 'need on_foot', 'need soil_front', 'need child')

// What is in front of Link
verb('Open the door', L, 'handler 1 (P:5372); not when hostile-locked (P:4169)', ...move('on_foot', 'door'), 'need door_front', 'unless battle', ...FREE_HANDS)
verb('Through the door', CLOCK, 'P:5372', ...move('door', 'on_foot'))
verb('Open the chest', L, 'handler 2 (P:7331)', ...move('on_foot', 'chest'), 'need chest_front', ...FREE_HANDS)
verb('Take what was inside', CLOCK, 'P:7331', ...move('chest', 'on_foot'))
verb('Talk', L, 'blocked while carrying (P:6213-6220)', ...move('on_foot', 'talking'), 'need talker_front', ...FREE_HANDS)
verb('Finish talking', L, 'P:6176', ...move('talking', 'on_foot'))
verb('Grab the block', L, 'A held, ledge at least 39 up (P:7808-7835); not when hostile-locked (P:4169)', ...move('on_foot', 'pushing'), 'need block_front', 'unless battle', ...FREE_HANDS)
verb('Push or pull', L, 'P:7808', 'need pushing')
verb('Let go of the block', L, 'P:7808', ...move('pushing', 'on_foot'))
verb('Draw the Master Sword', L, 'seven years pass (P:7414)', ...move('child', 'adult'), 'need on_foot', 'need pedestal_front')
verb('Return the Master Sword', L, 'P:7414', ...move('adult', 'child'), 'need on_foot', 'need pedestal_front')
for (const [id] of [['door_front'], ['chest_front'], ['ledge_front'], ['wall_front'], ['crawl_front'], ['block_front'], ['talker_front'], ['lift_front'], ['rock_front'], ['giant_front'], ['horse_front'], ['pedestal_front'], ['soil_front']]) {
  const l = states.find((s) => s.id === id)!.label
  verb(`Come up to ${l.toLowerCase()}`, LEVEL, 'content', ...move('nothing', id))
  verb('Move away', LEVEL, 'content', ...move(id, 'nothing'))
}
verb('Enter an indoor room', LEVEL, 'indoor rooms block jumps and nuts (include/room.h:110)', ...move('outdoors', 'indoors'))
verb('Go outside', LEVEL, 'content', ...move('indoors', 'outdoors'))
verb('Pick up a magic jar', LEVEL, 'content', 'unless magic 48', 'give magic')

// Equipment, chosen on the pause screen. The age tables decide what each age may wear (KS:778-801).
const equip = (facetStates: [string, string, string?][], what: string) => {
  for (const [to, label, age] of facetStates)
    for (const [from] of facetStates) if (from !== to) verb(`Equip the ${label}`, L, `${what} by age (KS:784-801)`, ...move(from, to), ...(age ? [`need ${age}`] : []))
}
equip([['deku', 'Deku Shield', 'child'], ['hylian', 'Hylian Shield'], ['mirror', 'Mirror Shield', 'adult']], 'shields')
verb('Equip the Deku Shield', L, 'KS:784', ...move('no_shield', 'deku'), 'need child')
verb('Equip the Hylian Shield', L, 'KS:784', ...move('no_shield', 'hylian'))
equip([['kokiri_boots', 'Kokiri Boots'], ['iron', 'Iron Boots', 'adult'], ['hover', 'Hover Boots', 'adult']], 'boots')
verb("Find the Goron's Bracelet", LEVEL, 'content', ...move('no_str', 'bracelet'))
verb('Find the Silver Gauntlets', LEVEL, 'content', ...move('bracelet', 'silver'))
verb('Find the Golden Gauntlets', LEVEL, 'content', ...move('silver', 'gold'))

// Getting hit applies almost everywhere: Harel's "hurt from anywhere". Not while rolling or spinning (i-frames,
// P:9701, P:9836), and a raised shield blocks instead.
for (const s of ['on_foot', 'swinging', 'charging', 'charged', 'full', 'finish', 'crouch_stab', 'looking', 'aim_slingshot', 'aim_bow', 'aim_hookshot', 'ocarina', 'pushing', 'boomerang'])
  verb('Take a hit', LEVEL, 'knockback (P:4892)', ...move(s, 'knocked'))
verb('Get up', CLOCK, 'P:4892', ...move('knocked', 'on_foot'))

const net: Net = {
  title: "Link's moveset (Ocarina of Time)",
  seats: [
    { id: L, name: "Link's controller", color: '#2a7d3f' },
    { id: LEVEL, name: 'The level', color: '#8a5a00' },
    { id: CLOCK, name: 'The clock', color: '#5b6b8c' },
  ],
  groups,
  states,
  verbs,
  arcs,
}

const text = print(net)
  .split('\n')
  .flatMap((line) => {
    const m = /^verb (\S+)/.exec(line)
    return m ? [`# ${cites.get(m[1])}`, line] : [line]
  })
  .join('\n')
const out = process.argv[2] ?? '../examples/link-moveset.maps'
writeFileSync(out, text)
console.log(`${states.length} states, ${verbs.length} verbs, ${arcs.length} arcs -> ${out}`)
