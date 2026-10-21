# Ocarina of Time combat in MAPS: what complete and verified mean

This file was written before any modeling started. It fixes the target so the run cannot move it. A later change to this file gets its own commit and a row in `decisions.tsv` that says why.

## The source of truth

The game is *The Legend of Zelda: Ocarina of Time* (N64, 1998) as decompiled by the zeldaret project, pinned at commit `14759abf9abb4295de142cdc1452998630ea70fb` of `https://github.com/zeldaret/oot`. Every number in the map cites a decomp `file:line`. Wikis, guides, and memory are not sources. When they disagree with the decomp, the decomp wins.

## What "combat" covers

Combat is every rule by which Link and the world hurt each other. The decomp decides membership mechanically, so nobody picks the list by taste.

1. **Actors.** `studio/tools/ocarina/inventory.ts` lists every actor overlay (except the player) that meets at least one of these:
   - its profile category is `ACTORCAT_ENEMY` or `ACTORCAT_BOSS`;
   - it declares a `DamageTable`, so Link's attacks have defined effects on it;
   - it has a collider with `AT_ON | AT_TYPE_ENEMY`, so it can hurt Link.

   At the pinned commit that is 111 actors, with 48 damage tables, 323 collider elements, and 946 action functions. The extracted list is `inventory.json`.
2. **Link's attacks.** Every one of the 32 `DMG_*` damage types in `include/collision_check.h`.
3. **What happens to Link when hit.** Every `HIT_SPECIAL_EFFECT_*` value, and every way the player code responds to damage: knockback, burning, freezing, shock, grabs, theft of shield or tunic, curses, and death.
4. **Link's combat economy.** Hearts and the health unit, Double Defense, the magic meter and every magic cost, bottled fairies and potions, every sword, shield, and tunic as it bears on damage given or taken, and every combat item: Deku Sticks, Deku Nuts, Slingshot, Bow and its three magic arrows, Bombs, Bombchus, Boomerang, Hookshot and Longshot, Megaton Hammer, Din's Fire, Nayru's Love, the Lens of Truth, and any ocarina song the decomp shows affecting an enemy.

## What the map leaves out, on purpose

MAPS is the mechanical graph, level 3 in `GAME_ABSTRACTION_LEVELS.md`. It is not the running game. These are abstracted, and the abstraction is the same everywhere.

- **Time becomes beats.** Each beat, Link chooses one action, and then the world answers: hits resolve, the enemy takes one step of its behavior, and its attacks resolve against what Link did. A timing window in the game becomes a phase in which some actions work and others do not. A duration becomes a count of beats or a per-beat chance, and each such choice is written down with its citation.
- **Space becomes range.** Positions, angles, and physics become a small range state (near or far) that Link and the enemy can change. Facing is folded into "blockable" on each attack.
- **Behavior becomes phases.** An enemy's action functions are grouped into phases that matter to combat: when it can be hurt, by what, what it can do to Link, and what it does next. Animation-only and cutscene-only action functions are listed and excluded with a reason.
- **One encounter is one actor.** Link faces one instance of one actor per encounter. Rooms with several enemies are compositions of encounters, and MAPS has no composition yet (SPEC.md, open problems). Actors that spawn parts or projectiles, such as Dead Hand's hands or Volvagia's rocks, model them as attacks or phases of the parent, and the spawned actor also gets its own encounter if it is in the inventory.
- **Out of scope entirely:** item drops, ammunition counts, rupees, environmental heat and drowning timers, Z-targeting as a camera aid (the attacks it enables are in), frame data, rendering, sound, and Master Quest room layouts (same actors, same rules).

## Declared rules of the abstraction

These rules hold for every encounter. The generator applies them, so no author chooses them per actor.

- **A beat is 20 frames.** A duration of n frames becomes round(n / 20) beats, at least 1. A random duration uses the mean of its range.
- **A rate becomes a whole amount every so many beats.** A rate of u units per f frames becomes 20u/f per beat, reduced to lowest terms p every q beats, and a counter fires it on every q-th beat. Burning, freezing, and the Lens drain follow this rule.
- **Double Defense halves damage, rounding up.** `Health_ChangeBy` shifts the negative amount right by one (`src/code/z_parameter.c:2252`), which rounds the loss toward the larger magnitude.
- **Heals stop at the bar.** A potion or fairy fills Link's health only up to his hearts, and magic refills only up to the meter.
- **Near is engagement distance.** Near means the actor's own distance check for engaging Link has passed, which is also where Link's melee reaches. Everything else is far.
- **Link fights with a kit.** A kit is an age, a heart count, a gear list, and a starting magic amount. Each encounter declares its kits, and the world opens the fight by choosing one. The standard kits are in `studio/tools/ocarina/data/loadouts.ts`. Each one carries one magic item, so that magic timers do not multiply. A worn mask is gear Link keeps for the whole fight, so it is its own kit.
- **An encounter is analyzed one branch at a time.** `verify.ts` cuts each generated file into one net per kit and variant, by deleting the other opening verbs, and analyzes each net exhaustively. Together the branches cover every position of the whole file. A verb that never fires in any branch is dead. It is reported, not failed, only when every state it reads is reached in some kit but none of them in the same kit. Every other dead verb fails V2 unless the spec ledgers it with its reason.

## The artifacts

- `studio/tools/ocarina/inventory.ts` extracts the inventory from the decomp.
- `studio/tools/ocarina/data/` holds one typed spec per actor plus the Link spec. Each spec carries its citations and its ledger of action functions.
- `studio/tools/ocarina/gen.ts` turns specs into `.maps` files. Nobody edits a generated `.maps` file by hand.
- `examples/ocarina-of-time/encounters/<actor>.maps` is one playable, analyzable net per in-scope actor.
- `examples/ocarina-of-time/ocarina-combat.maps` is the whole atlas in one net: Link chooses an encounter, then fights it.
- `examples/ocarina-of-time/ledger.json` is the completeness ledger, written by the generator.
- `examples/ocarina-of-time/decisions.tsv` is the decision trail.

## Complete means

Every line below holds, and `studio/tools/ocarina/verify.ts` checks each mechanically and exits nonzero if any fails.

- **C1. Every inventory actor has a disposition.** Each of the 111 actors is either *modeled* (it has a spec and an encounter file) or *excluded* with a reason and a decomp citation showing the reason. An exclusion is allowed only when the actor cannot hurt Link and cannot be hurt by Link in play, for example a damage table used only for a scripted reaction. The count of actors with no disposition is zero.
- **C2. Every damage type has a disposition.** Each of the 32 `DMG_*` types is either a Link verb, with the item, age, and magic cost that gate it, or excluded because the decomp shows the player never emits it (grep evidence cited).
- **C3. Every hit effect and damage response has a disposition.** Each `HIT_SPECIAL_EFFECT_*` value and each actor-specific effect on Link that a modeled actor uses is implemented by the Link spec. The generator refuses an attack whose effect the Link spec does not implement.
- **C4. Every damage table is carried in full.** For each modeled actor with a damage table, all 32 entries appear in the spec with their damage and reaction, interpreted per that actor's code (a reaction value means different things in different actors).
- **C5. Every action function is ledgered.** For each modeled actor, every action function the extractor found is mapped to a phase or excluded with a reason. Where an actor drives behavior some other way (a state enum and a switch), the spec lists those states instead, with citations, and the review in V6 checks that list.
- **C6. Every attack on Link is carried.** For each modeled actor, every collider element with `ATELEM_ON`, and every runtime change to `atDmgInfo`, is mapped to an attack with its damage and effect, or excluded with a reason.
- **C7. Link's economy is carried.** Each item in "What combat covers" item 4 is in the Link spec with its decomp numbers, or excluded with a reason.

## Verified means

Every line below holds on the real generated files.

- **V1. Well-formed.** Every generated `.maps` file parses, prints back to the identical text, and the checker reports zero errors. Warnings are allowed only when the ledger names the warning and the reason, such as a hidden-information leak that matches the game.
- **V2. Sound under exhaustive play.** Each encounter, analyzed in every kit and variant it declares, finishes below the analysis limit with zero stalls, zero places where the world never falls silent, and zero verbs that can never be said (or each such verb ledgered with the reason it is unreachable under that loadout). "Link wins" is reachable exactly when the decomp gives the actor a way to die. "Link falls" is reachable whenever the actor can hurt Link.
- **V3. Faithful numbers, checked independently.** `verify.ts` re-extracts the inventory from the pinned decomp and compares it with every spec: hit points, all 32 damage-table entries, every attack's damage and effect, and every magic cost. The specs are written by people and agents reading code; the extractor is a separate parser. They must agree on every value. A disagreement fails the run.
- **V4. Faithful dynamics.** For each modeled actor and each attack type that damages it in a vulnerable phase, a generated test replays a transcript against the encounter net and checks that exactly ceil(hit points / damage) hits defeat it, and one fewer does not. For each attack on Link, a test checks the health lost, with and without Double Defense, against the decomp's `Health_ChangeBy` rule.
- **V5. The ledger closes.** `ledger.json` lists every item in C1 through C7, and the count of items with no disposition is zero. Every "modeled" pointer names a state or verb that exists in the generated file.
- **V6. Independent review.** A reviewer on a different model from the author reads the decomp for every boss and for a random sample of at least a quarter of the other modeled actors, and checks the phases, the transitions, and the C5 ledger against the code. Each finding is fixed or answered with evidence. The sample, the findings, and the outcomes are recorded.
- **V7. It works in the tool.** `npm test` and `npm run build` pass in `studio/`. The atlas file opens in the studio, plays, and analyzes one encounter in a real browser.

A verdict on each line is VERIFIED, NOT VERIFIED, or INCONCLUSIVE. Inconclusive is not a pass. The run is done when C1 through C7 and V1 through V7 are all VERIFIED. It is not done because time ran out or a plateau was reached, and the predicate is not relaxed to declare victory.

## What a verified map does not claim

It does not claim the map plays like the game. Beats and range bands are an abstraction, so a fight's feel, its difficulty, and its frame-tight strategies are not in it. It claims that every combat rule the decomp states, every number, every vulnerability, and every way to hurt or be hurt, is on the page, checked against the code, and sound when played out.
