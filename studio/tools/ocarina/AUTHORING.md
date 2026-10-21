# Authoring an Ocarina of Time actor spec

You are writing one or more `ActorSpec` files, one per actor overlay, so the generator can turn each into a MAPS encounter: Link against that actor. Read these before you write anything:

1. `examples/ocarina-of-time/CONTRACT.md`. It defines complete and verified. Your spec must satisfy C1, C3 through C6, and V1 through V3 for your actors.
2. `studio/tools/ocarina/spec.ts`. These are the types you fill. Read every doc comment.
3. `studio/tools/ocarina/data/actors/en_firefly.ts`. This is the worked example (Keese). Copy its shape.
4. `studio/tools/ocarina/gen.ts`, sections `encounter`, `hitRule`, and `effectOf`. Read them to learn how your phases, steps, and attacks become verbs.

The decomp at `/home/wscottsh/repos/oot-decomp` (commit `14759abf`) is the only source. Do not use wikis, guides, or memory for any number or behavior. `examples/ocarina-of-time/inventory.json` is what the extractor found for your actor: damage tables, health values, collider elements, runtime `atDmgInfo` changes, and action functions. The verifier holds you to all of it.

## What you may touch

- Create `studio/tools/ocarina/data/actors/<overlay_lowercase>.ts` for each of your actors, for example `en_test.ts` for `ovl_En_Test`. Export one `ActorSpec` named in camelCase (`enTest`).
- To exclude an actor, export `{ overlay, excluded, cite }` from the same kind of file. Exclude only an actor that cannot hurt Link and cannot be hurt by Link in play. The cite must show why.
- Do not edit `spec.ts`, `gen.ts`, `verify.ts`, `inventory.ts`, `link.ts`, `loadouts.ts`, `data/actors.ts`, or anything outside your own files. If the types cannot express what the code does, stop modeling that part. Model the closest honest thing, and report the gap with the decomp cite. The coordinator changes shared files. Actor files are discovered automatically from `data/actors/`, so there is no registry to edit.

## The beat model, in one paragraph

Each beat, Link chooses one action: an attack (per damage type), raising a shield, dodging, closing in, backing off, drinking, casting, or leaving when far. Then the world answers in a fixed priority order. Link's hit resolves against the actor's current phase. Damage drains a pool, and an empty pool sends the actor to its `then`. The actor takes one step out of its current phase: steps out of a phase tie by chance at their weights, and a phase with no possible step holds. A step can deliver an attack, which resolves against Link's stance (shield, dodge, Nayru's Love) and then costs health and applies an effect. Status effects tick at the end of the beat. A phase with `frames` has a timer, counted in beats of 20 frames. A random range uses its mean. Steps marked `afterTimer` wait for it, and steps without it can fire any beat.

## How to read an actor into a spec

1. **Phases come from action functions.** List every action function in the inventory entry. Group them into phases by what matters to combat: can Link hurt it here, with what, what can it do to Link next, and where does it go. Death, despawn, and drop functions run after the finishing blow, so exclude them with that reason. Cutscene-only or intro-only functions get excluded with a reason too. When state the code tracks alongside the action function changes combat (an element, a held shield, a mask check, a variant from params), make phases the product of the two, as Keese does with its element. Every key of `actionFuncs` must be an extracted name. A value is a phase id, a prefix glob such as `idle_*`, or an exclusion.
2. **Actors without action functions** (the inventory lists none) drive behavior some other way, usually a state enum and a `switch`. List those states in `states` with cites, mapped to phases or excluded.
3. **Steps come from the code that changes the action function.** Cite the line where the change happens: the `Setup` call, or the `actionFunc =` line. For a distance check, decide which side is `near`. Near means within the actor's engagement distance, where Link's melee also reaches. If the code waits on a timer, set the phase's `frames` from the timer line and mark the step `afterTimer`. Use `weight` only when the code draws a random number between outcomes, and make the weights the code's odds.
4. **Hits.** If the inventory has a damage table, use `damage: { kind: 'decomp', table, reactions }`. Interpret every reaction value the table uses by reading the actor's damage handling, often a `CheckDamage` or `UpdateDamage` function. A reaction says whether the table's damage applies and which phase the hit sends the actor to (a map from phase to phase when it depends on the phase), or `defeated`. With no table, damage is the attack's own damage: use `kind: 'own'`. When the actor computes damage itself, use `custom` and cite every entry. Use `hittable`, `guards`, and `overrides` on a phase when the code makes a phase immune, guarded, or special, for example a Stalfos blocking frontal sword hits, or a body that is only hittable while stunned. Each one needs a cite.
5. **Health.** `pools[].hp.cite` must be exactly the `file:line` of a health value in the inventory, and the value must match. Several pools model parts or phases with their own health.
6. **Attacks on Link.** Map every collider element with `atOn: true`, and every runtime `atDmgInfo` change in the inventory, in `atSources`, keyed by the inventory's `file:line`. Map each to an attack id, or exclude it with a reason, for example a collider used only against other actors. An attack's `source` is one of those cites. Its `damage` must equal the element's damage, or the runtime value it sets. `effect` follows the element's hit special effect: FIRE is `burn`, ICE is `freeze`, ELECTRIC is `shock`, KNOCKBACK is `knockback`, and NONE or 7/8/9 is `none`. It can also be an actor-specific effect the code applies (grab, paralyze, steal), each cited. Set `blockable` false only when the code shows the shield does not stop it, for example `DMG_UNBLOCKABLE` in the element's flags or a grab. Set `dodgeable` false when nothing about a backflip avoids it in the code, for example a room-wide effect.
7. **Variants.** Spawn params that change behavior become `variants`, each with its own start phase. The world picks one at even odds. An invisible-unless-Lens params bit is an `unseen` variant.
8. **Loadouts.** Use `standardLoadouts(ages, hearts, extra)` from `../loadouts`. Pass the ages that meet the actor in the game, cited from the scene or the actor's own age checks. Use `extra` to add gear the actor reacts to, such as a mask. Pick hearts so Link can both win and fall: 2 by default, more if the actor's single hit takes more than 2 hearts.
9. **Room.** Add `room: ['light_beam']` only if the actor's code reacts to `DMG_MIR_RAY` and it appears in a room with a light beam.

## The cite rule

Every `cite` is `path/from/repo/root.c:line`, and the line must show the fact. A line that is blank or only punctuation fails the verifier. Read each cited line back before you finish. If you cannot find the line that shows a fact, you do not know the fact. Leave it out and report it.

## Done for one actor

From `studio/`, run each of these and read the output:

```sh
OCARINA_ONLY=ovl_Your_Actor npx tsx tools/ocarina/build.ts
OCARINA_ONLY=ovl_Your_Actor npx tsx tools/ocarina/verify.ts /home/wscottsh/repos/oot-decomp --only ovl_Your_Actor
```

Only your actor's lines matter, and `C1` fails until every actor is disposed. Your actor is done when the verifier shows no failure that names it under C3 through C6, cites, V1, V2, or V3. Every `deadVerbs` or `warnings` entry in `expected` needs a reason a reviewer would accept: the verb really cannot happen under any kit, and here is why. Do not add expected dead verbs to make the check pass. A verb that can never be said usually means a missing step or a wrong phase.

## Report

For each actor, give its phases and what each groups, every exclusion with its reason, the verifier output for your actor, the analysis size (positions), and every place you were uncertain or the types could not express the code. Name each such place with a cite.
