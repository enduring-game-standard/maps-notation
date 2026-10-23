// Prototype, throwaway. The #14 design as data, drawn two ways by display.html.
//
// A verb has two voices, as in the glossary. Its state-to-verb arcs are the controller observing and deciding,
// so `gates` lists what is observed. Its verb-to-state arcs are the world processing what was said, so `to` and
// `effects` are what the world applies. `by` says who speaks: the entity's controller, or the world on its own.
// Gates name where the condition lives:
//   ['self', text]                 another part of the same entity (targeting, what is in hand)
//   ['content', text]              a content condition from the content schema
//   ['contact', sheetKey, stateId] another entity's state: one entity's verb gated by another's state
//   ['meter', meter, test]         a count on this entity
//   ['instance', sheetKey, stateId] a state of the content instance both entities stand in
// Effects: ['meter', sheetKey, meter, delta].

const GOOMBA = {
  key: 'goomba', title: 'Goomba', game: 'Super Mario Bros. (1985)', kind: 'capability schema',
  controller: { who: 'computer', note: 'never chooses: every verb is the world\'s' },
  home: 'walking', start: 'dormant',
  numbers: ['dies to 1 stomp', 'walks at ½ Mario\'s walking speed (#14\'s example, unverified)'],
  states: [['dormant', 'off screen'], ['walking', 'walking'], ['falling', 'falling'], ['squashed', 'squashed'], ['flipped', 'flipped'], ['gone', 'gone']],
  verbs: [
    { name: 'wake', from: 'dormant', to: 'walking', by: 'world', gates: [['content', 'the screen reaches it']] },
    { name: 'turn around', from: 'walking', to: 'walking', by: 'world', gates: [['content', 'a wall or an enemy ahead']] },
    { name: 'walk off', from: 'walking', to: 'falling', by: 'world', gates: [['content', 'no floor ahead']] },
    { name: 'land', from: 'falling', to: 'walking', by: 'world', gates: [['content', 'floor below']] },
    { name: 'fall out', from: 'falling', to: 'gone', by: 'world', gates: [['content', 'below the screen']] },
    { name: 'despawn', from: 'walking', to: 'gone', by: 'world', gates: [['content', 'off the left edge']] },
    { name: 'stomped', from: 'walking', to: 'squashed', by: 'world', gates: [['contact', 'mario', 'falling']], count: '1 stomp' },
    { name: 'knocked over', from: 'walking', to: 'flipped', by: 'world', gates: [['contact', 'mario', 'star']] },
    { name: 'knocked over', from: 'walking', to: 'flipped', by: 'world', gates: [['content', 'a fireball, a sliding shell, or a bumped block']] },
    { name: 'fade', from: 'squashed', to: 'gone', by: 'world', gates: [] },
    { name: 'fall away', from: 'flipped', to: 'gone', by: 'world', gates: [] },
  ],
};

const MARIO = {
  key: 'mario', title: 'Mario (only what the Goomba touches)', game: 'Super Mario Bros. (1985)', kind: 'capability schema',
  controller: { who: 'player', note: '' }, home: 'running', hidden: true,
  states: [['running', 'on the ground'], ['falling', 'falling'], ['star', 'invincible']],
  verbs: [
    { name: 'get hurt', from: 'running', to: 'running', by: 'world', gates: [['contact', 'goomba', 'walking']] },
  ],
};

const OCTOROK = {
  key: 'octorok', title: 'Red Octorok', game: 'The Legend of Zelda (1986)', kind: 'capability schema',
  controller: { who: 'computer', note: 'picks a direction, and when to spit' },
  home: 'roaming',
  numbers: ['dies to 1 sword hit (from memory)', 'its touch costs Link ½ heart (from memory)'],
  states: [['roaming', 'roaming'], ['defeated', 'defeated']],
  verbs: [
    { name: 'wander', from: 'roaming', to: 'roaming', by: 'controller', gates: [] },
    { name: 'spit a rock', from: 'roaming', to: 'roaming', by: 'controller', gates: [] },
    { name: 'turn around', from: 'roaming', to: 'roaming', by: 'world', gates: [['content', 'a wall or the screen edge']] },
    { name: 'struck', from: 'roaming', to: 'defeated', by: 'world', gates: [['contact', 'z1link', 'stabbing']], count: '1 hit' },
    { name: 'struck', from: 'roaming', to: 'defeated', by: 'world', gates: [['contact', 'z1link', 'beam']], count: '1 hit' },
  ],
};

const Z1LINK = {
  key: 'z1link', title: 'Link', game: 'The Legend of Zelda (1986)', kind: 'capability schema',
  controller: { who: 'player', note: '' }, home: 'ready',
  meters: [['hearts', 6, 'half hearts, at the start']],
  states: [['ready', 'ready'], ['stabbing', 'stabbing'], ['beam', 'beam in flight'], ['over', 'game over']],
  verbs: [
    { name: 'stab', from: 'ready', to: 'stabbing', by: 'controller', gates: [['instance', 'reach', 'close']] },
    { name: 'stab ends', from: 'stabbing', to: 'ready', by: 'world', gates: [] },
    { name: 'fire a beam', from: 'ready', to: 'beam', by: 'controller', gates: [['meter', 'hearts', 'full']] },
    { name: 'beam ends', from: 'beam', to: 'ready', by: 'world', gates: [] },
    { name: 'get hurt', from: 'ready', to: 'ready', by: 'world', gates: [['contact', 'octorok', 'roaming'], ['instance', 'reach', 'close']], effects: [['meter', 'z1link', 'hearts', -1]] },
    { name: 'fall', from: 'ready', to: 'over', by: 'world', gates: [['meter', 'hearts', 'empty']] },
  ],
};

const REACH = {
  key: 'reach', title: 'Link and one Red Octorok', game: 'The Legend of Zelda (1986)', kind: 'content instance',
  controller: { who: 'both controllers', note: 'Link\'s player and the Octorok\'s computer' }, home: 'apart',
  states: [['apart', 'apart'], ['close', 'close']],
  verbs: [
    { name: 'close in', who: 'Link', from: 'apart', to: 'close', by: 'controller', gates: [] },
    { name: 'wander close', who: 'Octorok', from: 'apart', to: 'close', by: 'controller', gates: [] },
    { name: 'back off', who: 'Link', from: 'close', to: 'apart', by: 'controller', gates: [] },
  ],
};

// Link's sword chain in Ocarina of Time, from research/link-moveset.md. `age` marks a verb only one age has.
const SWORD_VERBS = [
  { name: 'swing', from: 'idle', to: 'swinging', by: 'controller', gates: [['self', 'a sword in hand (drawn on the same press)']] },
  { name: 'swing the Deku Stick', age: 'child', from: 'idle', to: 'swinging', by: 'controller', gates: [['self', 'a Deku Stick in hand']], count: 'every swing a forward slash' },
  { name: 'swing the Hammer', age: 'adult', from: 'idle', to: 'swinging', by: 'controller', gates: [['self', 'the Megaton Hammer in hand']], count: 'overhead swing sends a shockwave' },
  { name: 'swing again', from: 'swinging', to: 'swinging', by: 'controller', gates: [], count: 'the 3rd same swing is the finisher, same damage' },
  { name: 'the Stick breaks', age: 'child', from: 'swinging', to: 'idle', by: 'world', gates: [['self', 'a Deku Stick'], ['content', 'it hits something']] },
  { name: 'swing ends', from: 'swinging', to: 'idle', by: 'world', gates: [] },
  { name: 'hold to charge', from: 'swinging', to: 'charging', by: 'controller', gates: [['self', 'not a Deku Stick']] },
  { name: 'let go early', from: 'charging', to: 'idle', by: 'controller', gates: [], count: 'under 10% charged' },
  { name: 'release', from: 'charging', to: 'spin', by: 'controller', gates: [], count: '10% to 85%; 2 of 48 magic for the magic spin' },
  { name: 'release', from: 'charging', to: 'great', by: 'controller', gates: [], count: '85% or more' },
  { name: 'spin ends', from: 'spin', to: 'idle', by: 'world', gates: [] },
  { name: 'great spin ends', from: 'great', to: 'idle', by: 'world', gates: [] },
  { name: 'quick spin', from: 'idle', to: 'spin', by: 'controller', gates: [['self', 'a sword, not the Stick or the Hammer']] },
  { name: 'jump attack', from: 'idle', to: 'jump', by: 'controller', gates: [['self', 'targeting'], ['self', 'a weapon out'], ['content', 'not indoors']] },
  { name: 'land it', from: 'jump', to: 'strike', by: 'world', gates: [] },
  { name: 'recover', from: 'strike', to: 'idle', by: 'world', gates: [] },
  { name: 'raise the shield', from: 'idle', to: 'shield', by: 'controller', gates: [['self', 'a shield'], ['self', 'not targeting']] },
  { name: 'raise the Hylian Shield', age: 'child', from: 'idle', to: 'shield', by: 'controller', gates: [['self', 'the Hylian Shield'], ['self', 'targeting']] },
  { name: 'two-handed guard', age: 'adult', from: 'idle', to: 'shield', by: 'controller', gates: [['self', "Biggoron's Sword or the Hammer"], ['self', 'a shield equipped']] },
  { name: 'crouch stab', from: 'shield', to: 'shield', by: 'controller', gates: [['self', 'a weapon out'], ['self', 'not a child with the Hylian Shield']] },
  { name: 'lower', from: 'shield', to: 'idle', by: 'controller', gates: [] },
  { name: 'guard on the move', from: 'idle', to: 'moving', by: 'controller', gates: [['self', 'a shield'], ['self', 'targeting'], ['self', 'not a child with the Hylian Shield']] },
  { name: 'lower', from: 'moving', to: 'idle', by: 'controller', gates: [] },
  { name: 'roll', from: 'idle', to: 'rolling', by: 'controller', gates: [['self', 'not locked on']] },
  { name: 'slash out of it', from: 'rolling', to: 'swinging', by: 'controller', gates: [], count: 'late in the roll' },
  { name: 'roll ends', from: 'rolling', to: 'idle', by: 'world', gates: [] },
];
const SWORD_STATES = [['idle', 'idle'], ['swinging', 'swinging'], ['charging', 'charging a spin'], ['spin', 'spin'], ['great', 'great spin'],
  ['jump', 'jump attack'], ['strike', 'landing strike'], ['shield', 'shield up'], ['moving', 'shield on the move'], ['rolling', 'rolling']];
const swordFor = age => ({
  key: `sword-${age}`, title: `${age === 'child' ? 'Child' : 'Adult'} Link's sword`, game: 'Ocarina of Time (1998)', kind: 'capability schema',
  controller: { who: 'player', note: '' }, home: 'idle',
  note: 'Idle means whichever of the three idles targeting picks.',
  states: SWORD_STATES,
  verbs: SWORD_VERBS.filter(v => !v.age || v.age === age),
});

const DEKU_SCHEMA = {
  key: 'deku-schema', title: 'What the Deku Tree is made of', game: 'Ocarina of Time (1998)', kind: 'content schema',
  things: [
    ['deep water', 'puts Link into swimming: no items'],
    ['a web over a hole', 'a long fall onto it breaks it and drops Link to the floor below; fire burns it'],
    ['a torch', 'lights a Deku Stick'],
    ['a vine wall', 'puts Link into climbing'],
    ['a pushable block', 'puts Link into pushing; pushed into water, it becomes a bridge'],
    ['a Deku Scrub', 'shoots nuts; Link with the shield up sends them back'],
    ['a Skullwalltula on a vine', 'blocks the climb; the Slingshot knocks it off'],
    ['a chest', 'gives Link an item'],
  ],
};

const DEKU = {
  key: 'deku', title: 'Inside the Deku Tree', game: 'Ocarina of Time (1998)', kind: 'content instance',
  controller: { who: 'player', note: 'a walkthrough of Link\'s verbs in this arrangement' }, home: 'L0',
  homes: ['L0', 'SL1', 'B1P', 'B1PB', 'B2P'],
  partNames: { L0: 'before the Slingshot', SL1: 'has the Slingshot', B1P: '1F web broken', B1PB: 'block pushed in', B2P: 'B1 floor web burnt' },
  note: 'Unverified: where each vine lands; the rooms off the B1 pool after the block is in are left out.',
  states: [
    ['L0', 'Lobby 1F'], ['F2_0', '2F'], ['SL0', 'Slingshot room'],
    ['SL1', 'Slingshot room'], ['F2_1', '2F'], ['L1', 'Lobby 1F'], ['F3_1', '3F'], ['CP1', 'Compass room'],
    ['B1P', 'B1 pool'], ['L1W', 'Lobby 1F'], ['B1H', 'Scrub hint room'], ['B1R', 'roller water room'],
    ['B1T', 'torch room'], ['LV', 'Larva room'], ['B1L', 'B1 high ledge'], ['B1PB', 'B1 pool'], ['B1LB', 'B1 high ledge'],
    ['B2P', 'B2 pool'], ['B1P2', 'B1 pool'], ['B2S', 'Scrub trio'], ['LAIR', "Gohma's lair"], ['WIN', 'Gohma defeated'],
  ],
  verbs: [
    ['climb', 'L0', 'F2_0', ['a vine wall']], ['drop', 'F2_0', 'L0'], ['open the map chest', 'L0', 'L0', ['a chest']],
    ['send the nuts back', 'F2_0', 'SL0', ['a Deku Scrub']], ['open the chest', 'SL0', 'SL1', ['a chest']],
    ['shoot the ladder down', 'SL1', 'F2_1'], ['go back in', 'F2_1', 'SL1'], ['drop', 'F2_1', 'L1'], ['climb', 'L1', 'F2_1', ['a vine wall']],
    ['shoot the Skulltulas', 'F2_1', 'F3_1', ['a Skullwalltula on a vine']], ['drop', 'F3_1', 'F2_1'],
    ['enter', 'F3_1', 'CP1'], ['burn the way out', 'CP1', 'F3_1', ['a torch']],
    ['jump onto the web', 'F3_1', 'B1P', ['a web over a hole']], ['climb the vine', 'B1P', 'L1W', ['a vine wall']], ['drop in the hole', 'L1W', 'B1P'],
    ['burn the door web', 'B1P', 'B1H', ['a torch']], ['back', 'B1H', 'B1P'], ['shoot the eye', 'B1H', 'B1R'], ['back', 'B1R', 'B1H'],
    ['push the block', 'B1R', 'B1T', ['a pushable block']], ['back', 'B1T', 'B1R'], ['light the torches', 'B1T', 'LV', ['a torch']], ['back', 'LV', 'B1T'],
    ['burn the web, crawl', 'LV', 'B1L', ['a torch']], ['push the block in', 'B1L', 'B1PB', ['a pushable block']],
    ['cross the bridge', 'B1PB', 'B1LB'], ['cross back', 'B1LB', 'B1PB'],
    ['burn the floor web', 'B1L', 'B2P', ['a web over a hole', 'a torch']], ['burn the floor web', 'B1LB', 'B2P', ['a web over a hole', 'a torch']],
    ['climb the vine', 'B2P', 'B1P2', ['a vine wall']], ['drop in the hole', 'B1P2', 'B2P'],
    ['walk on', 'B2P', 'B2S'], ['back', 'B2S', 'B2P'], ['stun them 2-3-1', 'B2S', 'LAIR', ['a Deku Scrub']],
    ['eye, then sword', 'LAIR', 'WIN'],
  ].map(([name, from, to, things]) => ({ name, from, to, by: 'controller', gates: (things || []).map(t => ['content', t]) })),
};

const ALL = [GOOMBA, MARIO, OCTOROK, Z1LINK, REACH, swordFor('child'), swordFor('adult'), DEKU_SCHEMA, DEKU];
