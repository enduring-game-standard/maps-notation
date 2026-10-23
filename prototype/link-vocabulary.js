// Prototype, throwaway. Link's vocabulary in Ocarina of Time, from research/link-moveset.md (the decomp catalog).
// A situation is Link's own condition at rest: { age, stance, hands, medium, shield }. Content is what the level
// offers at that moment, a set of names. Each verb says, for a situation, whether Link's own condition allows it
// (true, false, or '?' where the catalog does not settle it), which content must be there for it, and which
// content shuts it.
//
// A loop goes out from rest and comes back to rest: one short exchange, player speaking and the world answering.
// A turn changes the situation at rest itself: what is in hand, the targeting, the medium.

const MELEE = ['sword', 'stick', 'hammer'];
const ground = s => s.medium === 'ground';
const free = s => s.hands !== 'carrying';
const child = s => s.age === 'child', adult = s => s.age === 'adult';
const childHylian = s => child(s) && s.shield === 'hylian';

const CONTENT = [
  ['enemy', 'an enemy'], ['door', 'a door'], ['chest', 'a chest'], ['liftable', 'something to lift'],
  ['talker', 'someone to talk to'], ['climbable', 'a climbable wall'], ['crawlspace', 'a crawlspace'],
  ['block', 'a pushable block'], ['ledge', 'a ledge'], ['edge', 'an edge to run off'], ['water', 'deep water'],
  ['epona', 'Epona'], ['soil', 'soft soil'], ['hookable', 'a hookable target'], ['indoors', 'an indoor room'],
];

const LOOPS = [
  // fight
  { id: 'swing', family: 'fight', name: 'swing', live: s => ground(s) && ['none', ...MELEE].includes(s.hands), cite: 'P:14635, draws on the same press P:2947',
    steps: s => s.hands === 'stick'
      ? [['p', 'swing the Deku Stick'], ['w', 'every swing a forward slash'], ['w', 'breaks on a hit'], ['w', 'back at rest']]
      : [['p', s.hands === 'none' ? 'draw and swing' : 'swing'], ['w', 'swinging'], ['p', 'again; the 3rd same swing is the finisher'], ['p', 'hold to charge'], ['w', 'charging: 10%, then 85%'],
         ['p', 'release: spin, or great spin past 85%'], ['w', '2 of 48 magic for the magic spin, if there is magic'], ['w', 'back at rest']] },
  { id: 'quickspin', family: 'fight', name: 'quick spin', live: s => ground(s) && ['none', 'sword'].includes(s.hands), cite: 'not a Stick or the Hammer, P:4378',
    steps: () => [['p', 'quick spin'], ['w', 'spin'], ['w', 'back at rest']] },
  { id: 'jump', family: 'fight', name: 'jump attack', live: s => ground(s) && s.stance !== 'free' && MELEE.includes(s.hands), shut: 'indoors', cite: 'P:6402, not indoors P:6388',
    steps: () => [['p', 'jump attack'], ['w', 'in the air, then the landing strike'], ['w', 'back at rest']] },
  // defend
  { id: 'shield', family: 'defend', name: 'raise the shield', live: s => ground(s) && free(s) && s.hands !== 'hammer' && (s.stance === 'free' || childHylian(s)), cite: 'P:6504-6512',
    steps: s => [['p', 'raise the shield'], ['w', 'shield up, standing still'], ...(MELEE.includes(s.hands) && !childHylian(s) ? [['p', 'crouch stab, again and again']] : []), ['w', 'an attack bounces off'], ['p', 'lower it'], ['w', 'back at rest']] },
  { id: 'strafe', family: 'defend', name: 'guard on the move', live: s => ground(s) && s.stance !== 'free' && !childHylian(s) && ['none', ...MELEE].includes(s.hands), cite: 'P:2872-2880',
    steps: () => [['p', 'guard on the move'], ['w', 'shield up, still moving'], ['p', 'lower it'], ['w', 'back at rest']] },
  { id: 'twohand', family: 'defend', name: 'two-handed guard', live: s => ground(s) && adult(s) && s.hands === 'hammer', cite: 'PL:666, PL:1498',
    steps: () => [['p', 'guard with the Hammer'], ['w', 'shield collider on, shield on the back'], ['p', 'lower'], ['w', 'back at rest']] },
  { id: 'roll', family: 'defend', name: 'roll', live: s => ground(s) && (s.stance === 'free' || (s.stance === 'z' && !MELEE.includes(s.hands))) && (free(s) || '?'), cite: 'P:6489, no weapon out while targeting P:6400',
    steps: s => [['p', 'roll'], ['w', 'rolling, safe from hits mid-roll'], ...(MELEE.includes(s.hands) || s.hands === 'none' ? [['p', 'slash, late in the roll']] : []), ['w', 'bonks off a wall at speed'], ['w', 'back at rest']] },
  // move
  { id: 'sidehop', family: 'move', name: 'sidehop', live: s => ground(s) && s.stance !== 'free', shut: 'indoors', cite: 'P:6385-6410',
    steps: s => [['p', 'sidehop'], ['w', 'in the air'], ...(MELEE.includes(s.hands) ? [['p', 'jump attack from the air']] : []), ['w', 'lands, back at rest']] },
  { id: 'backflip', family: 'move', name: 'backflip', live: s => ground(s) && s.stance !== 'free', shut: 'indoors', cite: 'no air attack, P:9588',
    steps: () => [['p', 'backflip'], ['w', 'in the air, no attack'], ['w', 'lands, back at rest']] },
  { id: 'edge', family: 'move', name: 'run off the edge', needs: 'edge', live: s => ground(s), cite: 'no jump button, P:5866',
    steps: s => [['p', 'run at the edge'], ['w', 'jumps on its own'], ...(MELEE.includes(s.hands) ? [['p', 'jump attack from the air']] : []), ['w', 'catches a ledge, or lands'], ['p', 'pull up, or let go'], ['w', 'back at rest']] },
  { id: 'ledge', family: 'move', name: 'climb up the ledge', needs: 'ledge', live: s => free(s) && ((ground(s) && s.stance === 'free') || s.medium === 'swimming'), cite: 'handler 12, P:5003',
    steps: () => [['p', 'climb up'], ['w', 'hop, step, or grab, by height and age'], ['w', 'back at rest']] },
  { id: 'climb', family: 'move', name: 'climb the wall', needs: 'climbable', live: s => ground(s) && s.stance !== 'battle' && free(s), cite: 'P:7490, items off ZP:812',
    steps: () => [['p', 'grab the wall'], ['w', 'climbing, every item off'], ['p', 'climb, or drop off'], ['w', 'back at rest']] },
  { id: 'crawl', family: 'move', name: 'crawl through', needs: 'crawlspace', live: s => child(s) && ground(s) && s.stance !== 'battle' && free(s), cite: 'child only, P:7610',
    steps: () => [['p', 'crawl in'], ['w', 'crawling, every button off'], ['w', 'out the other side, back at rest']] },
  { id: 'dive', family: 'move', name: 'dive', live: s => s.medium === 'swimming', cite: 'P:6862',
    steps: () => [['p', 'dive'], ['w', 'down as deep as the scale allows'], ['w', 'surfaces, back at rest']] },
  { id: 'spur', family: 'move', name: 'spur Epona', live: s => s.medium === 'horseback', cite: 'six carrots, z_en_horse.c:3334',
    steps: () => [['p', 'spur'], ['w', 'a burst of speed, one carrot spent'], ['w', 'back at rest']] },
  // reach out: what the level offers
  { id: 'door', family: 'level', name: 'open the door', needs: 'door', live: s => ground(s) && s.stance !== 'battle' && free(s), cite: 'handler 1 P:5372, nothing carried P:5382',
    steps: () => [['p', 'open the door'], ['w', 'through it'], ['w', 'back at rest']] },
  { id: 'chest', family: 'level', name: 'open the chest', needs: 'chest', live: s => ground(s) && free(s), cite: 'handler 2 P:7331',
    steps: () => [['p', 'open the chest'], ['w', 'takes what is inside'], ['w', 'back at rest']] },
  { id: 'talk', family: 'level', name: 'talk', needs: 'talker', live: s => (ground(s) || s.medium === 'swimming') && free(s), cite: 'blocked while carrying P:6213',
    steps: () => [['p', 'talk'], ['w', 'the other side answers'], ['p', 'finish'], ['w', 'back at rest']] },
  { id: 'push', family: 'level', name: 'push the block', needs: 'block', live: s => ground(s) && s.stance !== 'battle' && free(s), cite: 'P:7808-7835',
    steps: () => [['p', 'grab the block'], ['p', 'push or pull'], ['p', 'let go'], ['w', 'back at rest']] },
  { id: 'bean', family: 'level', name: 'plant a bean', needs: 'soil', live: s => child(s) && ground(s) && free(s), cite: 'KS:805',
    steps: () => [['p', 'plant the bean'], ['w', 'it is planted'], ['w', 'back at rest']] },
  { id: 'look', family: 'level', name: 'look around', live: s => s.stance === 'free' && (ground(s) || s.medium === 'swimming'), cite: 'handler 0 P:6293',
    steps: () => [['p', 'look around'], ['w', 'first person'], ['p', 'stop'], ['w', 'back at rest']] },
  // items
  { id: 'slingshot', family: 'items', name: 'Slingshot', live: s => child(s) && ground(s) && free(s), cite: 'KS:751, carrying blocks items P:2665',
    steps: s => [['p', 'aim the Slingshot'], ['w', s.stance === 'free' ? 'first person, standing still' : 'third person, strafing'], ['p', 'shoot, again and again'], ['p', 'lower it'], ['w', 'back at rest']] },
  { id: 'boomerang', family: 'items', name: 'Boomerang', live: s => child(s) && ground(s) && free(s), cite: 'KS:751',
    steps: () => [['p', 'throw the Boomerang'], ['w', 'it flies and comes back'], ['w', 'back at rest']] },
  { id: 'bow', family: 'items', name: 'Bow', live: s => adult(s) && ((ground(s) && free(s)) || s.medium === 'horseback'), cite: 'KS:751; on horseback B is the Bow ZP:690',
    steps: s => [['p', 'aim the Bow'], ['w', s.medium === 'horseback' ? 'aiming from the saddle' : s.stance === 'free' ? 'first person, standing still' : 'third person, strafing'], ['p', 'shoot; 4 or 8 magic for magic arrows'], ['p', 'lower it'], ['w', 'back at rest']] },
  { id: 'hookshot', family: 'items', name: 'Hookshot', live: s => adult(s) && ((ground(s) && free(s)) || s.medium === 'underwater'), cite: 'KS:751; the one item on the bottom P:3544',
    steps: () => [['p', 'fire the Hookshot'], ['w', 'it catches a hookable target and pulls Link over, or pulls small things to him'], ['w', 'back at rest']] },
  { id: 'nut', family: 'items', name: 'Deku Nut', live: s => ground(s) && free(s), shut: 'indoors', cite: 'not indoors P:6591',
    steps: () => [['p', 'throw a Deku Nut'], ['w', 'a flash stuns what is near'], ['w', 'back at rest']] },
  { id: 'spell', family: 'items', name: "Din's or Nayru's", live: s => ground(s) && free(s), cite: '12 or 24 of 48 magic; cast on the ground P:6036',
    steps: () => [['p', 'cast'], ['w', 'every other verb waits'], ['w', 'back at rest']] },
  { id: 'farore', family: 'items', name: "Farore's Wind", live: s => ground(s) && free(s), cite: '12 magic to set; the warp back is free P:3578',
    steps: () => [['p', 'set a warp point, or warp to it'], ['w', 'the point is set, or Link is back at it'], ['w', 'back at rest']] },
  { id: 'lens', family: 'items', name: 'Lens of Truth', live: s => ground(s) && free(s), cite: 'drains magic P:3559',
    steps: () => [['p', 'look through the Lens'], ['w', 'drains magic while on'], ['p', 'put it away'], ['w', 'back at rest']] },
  { id: 'ocarina', family: 'items', name: 'ocarina', live: s => s.stance !== 'battle' && free(s) && (ground(s) || (s.medium === 'swimming' ? '?' : false)), cite: 'not locked on P:3598',
    steps: () => [['p', 'play'], ['w', 'a song, if it is one the level knows'], ['w', 'back at rest']] },
  { id: 'bottle', family: 'items', name: 'swing the bottle', live: s => s.hands === 'bottle' && (ground(s) || s.medium === 'swimming'), cite: 'P:6614-6630',
    steps: () => [['p', 'swing the bottle'], ['w', 'catches a bug, a fairy, or water'], ['w', 'back at rest']] },
  { id: 'drink', family: 'items', name: 'drink from a bottle', live: s => ground(s) && free(s), cite: 'allowed even when locked on P:3600',
    steps: () => [['p', 'drink'], ['w', 'the potion or fairy works'], ['w', 'back at rest']] },
  { id: 'mask', family: 'items', name: 'a mask', live: s => child(s) && ground(s) && free(s), cite: 'KS:805; no effect on movement P:11799',
    steps: () => [['p', 'put on or take off a mask'], ['w', 'others react to it'], ['w', 'back at rest']] },
];

const TURNS = [
  { id: 'target', name: 'Z-target', live: s => s.stance === 'free' && (ground(s) || '?'), to: s => ({ ...s, stance: 'z' }), cite: 'P:5588' },
  { id: 'lockon', name: 'lock on', needs: 'enemy', live: s => s.stance === 'free' && (ground(s) || '?'), to: s => ({ ...s, stance: 'battle' }), cite: 'a hostile target sets battle stance P:4169' },
  { id: 'letgo', name: 'let go of the target', live: s => s.stance !== 'free', to: s => ({ ...s, stance: 'free' }) },
  { id: 'draw', name: 'draw the sword (by swinging)', live: s => ground(s) && s.hands === 'none', to: s => ({ ...s, hands: 'sword' }), cite: 'P:2947' },
  { id: 'putaway', name: 'put it away', live: s => ground(s) && s.stance !== 'battle' && ['sword', 'stick', 'hammer', 'bottle'].includes(s.hands), to: s => ({ ...s, hands: 'none' }), cite: 'P:6493' },
  { id: 'stick', name: 'take out a Deku Stick', live: s => child(s) && ground(s) && free(s) && s.hands !== 'stick', to: s => ({ ...s, hands: 'stick' }), cite: 'KS:751' },
  { id: 'hammer', name: 'take out the Hammer', live: s => adult(s) && ground(s) && free(s) && s.hands !== 'hammer', to: s => ({ ...s, hands: 'hammer' }), cite: 'KS:751' },
  { id: 'takebottle', name: 'take out a bottle', live: s => ground(s) && free(s) && s.hands !== 'bottle', to: s => ({ ...s, hands: 'bottle' }) },
  { id: 'pickup', name: 'pick it up', needs: 'liftable', live: s => ground(s) && s.hands === 'none', to: s => ({ ...s, hands: 'carrying' }), cite: 'hands empty P:7413' },
  { id: 'bomb', name: 'pull out a bomb', live: s => ground(s) && free(s), to: s => ({ ...s, hands: 'carrying' }), cite: 'at most 3 out P:3553' },
  { id: 'throw', name: 'throw it or set it down', live: s => s.hands === 'carrying', to: s => ({ ...s, hands: 'none' }), cite: 'P:7461-7478' },
  { id: 'wade', name: 'wade in', needs: 'water', live: s => ground(s), to: s => ({ ...s, medium: 'swimming', stance: 'free', hands: 'none' }), cite: 'no items in water P:3544' },
  { id: 'climbout', name: 'climb out', needs: 'ledge', live: s => s.medium === 'swimming', to: s => ({ ...s, medium: 'ground' }) },
  { id: 'iron', name: 'put on the Iron Boots', live: s => adult(s) && s.medium === 'swimming', to: s => ({ ...s, medium: 'underwater' }), cite: 'adult gear KS:778, P:11885' },
  { id: 'ironoff', name: 'take off the Iron Boots', live: s => s.medium === 'underwater', to: s => ({ ...s, medium: 'swimming' }) },
  { id: 'mount', name: 'mount Epona', needs: 'epona', live: s => adult(s) && ground(s) && s.stance !== 'battle' && free(s), to: s => ({ ...s, medium: 'horseback', stance: 'free', hands: 'none' }), cite: 'handler 3 P:7194' },
  { id: 'dismount', name: 'dismount', live: s => s.medium === 'horseback', to: s => ({ ...s, medium: 'ground' }) },
];

const HANDS = { child: ['none', 'sword', 'stick', 'bottle', 'carrying'], adult: ['none', 'sword', 'hammer', 'bottle', 'carrying'] };
const HAND_LABEL = { none: 'nothing in hand', sword: 'sword out', stick: 'Deku Stick', hammer: 'Hammer', bottle: 'bottle', carrying: 'carrying' };
const STANCE_LABEL = { free: 'not targeting', z: 'Z-targeting', battle: 'locked on' };
const MEDIUM_LABEL = { ground: 'on the ground', swimming: 'swimming', underwater: 'on the bottom', horseback: 'on Epona' };

// Every situation at rest an age can be in. On the ground: each targeting with each thing in hand.
const situations = (age, shield) => [
  ...['free', 'z', 'battle'].flatMap(stance => HANDS[age].map(hands => ({ age, shield, stance, hands, medium: 'ground' }))),
  { age, shield, stance: 'free', hands: 'none', medium: 'swimming' },
  ...(age === 'adult' ? [{ age, shield, stance: 'free', hands: 'none', medium: 'underwater' }, { age, shield, stance: 'free', hands: 'none', medium: 'horseback' }] : []),
];

// live: Link's own condition allows it, and the content it needs (if any) is there.
// dock: Link could, if the level offered the content.  shut: content present closes it.  no: Link can't.  '?': unsettled.
function status(verb, s, offered) {
  const own = verb.live(s);
  if (own === false) return 'no';
  if (verb.shut && offered.has(verb.shut)) return 'shut';
  if (verb.needs && !offered.has(verb.needs)) return own === '?' ? '?' : 'dock';
  return own === '?' ? '?' : 'live';
}

if (typeof module !== 'undefined') module.exports = { LOOPS, TURNS, CONTENT, situations, status, HAND_LABEL, STANCE_LABEL, MEDIUM_LABEL };
