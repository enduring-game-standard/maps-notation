# MAPS

MAPS writes down a game's design as a conversation between players and a world, so that it can be read, played, compared, and passed on.

## Language

### The conversation

**Conversation**:
The structure of a game: a player and the world take turns to listen, think, and speak (Crawford).
_Avoid_: game loop, interaction loop

**World**:
The game as modeled: all of its state, and the processing that keeps changing it, with or without a player speaking.
_Avoid_: system, simulation, engine

**State**:
How some part of the world currently is. A piece's position and every enemy's condition are state.
_Avoid_: place, condition, flag, status

**Verb**:
What moves an entity from one state to another.
_Avoid_: action, move, ability, transition

**Arc**:
A connection between a state and a verb, and the place where thinking happens. An arc from a state to a verb is the controller thinking: observing, processing, deciding. An arc from a verb to a state is the world processing what was said and applying it to its state.
_Avoid_: edge, link, transition

### Entities and control

**Entity**:
Something in the world that is always in a state, and that only verbs move out of it: Link, a Goomba, a door.
_Avoid_: actor, agent, object, character

**Controller**:
Whoever chooses which verb an entity says: a human, or the computer. A controller chooses among the verbs an entity's capability schema allows; it never adds to them.
_Avoid_: agent, AI, brain

### Schemas

**Capability schema**:
The states an entity can be in and the verbs that move it between them, the same whoever controls it. It is everything the entity could do, before any world is applied.
_Avoid_: moveset, kit, ability set

**Content schema**:
The kinds of things a world can contain (water, a ledge, a locked door) and the conditions they put on an entity's states and verbs. Being in water is a content condition that moves Link into a different state, not a part of his capability.
_Avoid_: ruleset, environment

**Content instance**:
One arrangement of a content schema with entities placed in it, such as a level. One content schema can produce many content instances. It is where what could happen becomes what does happen, and it reads as a walkthrough.
_Avoid_: scenario, map, stage
