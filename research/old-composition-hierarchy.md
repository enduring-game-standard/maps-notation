# The old MAPS composition hierarchy

Research for [issue #16](https://github.com/enduring-game-standard/maps-notation/issues/16), feeding [issue #14](https://github.com/enduring-game-standard/maps-notation/issues/14). The question: what did the earlier MAPS design (MAPS 1) define for its composition hierarchy, and for composition and folding? What was decided, what was tried, and what was left open?

Sources are this repo's history and the sibling EGS repos. `7313cd4^1` is main just before the fold commit `7313cd4`, which deleted `MAPS_TEXTUAL_NOTATION.md`, `RESEARCH.md`, and `todo/`. The greenfield branch had already deleted them in `f32f5a3`. `GAME_ABSTRACTION_LEVELS.md` survived the fold unchanged and is still on main.

## Summary: what bears on the coherent design

- **The hierarchy was named three times and never reconciled.** Atom → Pattern → Score (January 2026). Then Cycle → Mechanic → System → Form (todo/t1). Then Cycle → Mechanic → System → Possibility Space (the textual spec). At the fold, the README still said Atom/Pattern/Score while the spec said Possibility Space. `maps-library` still says Pattern/Score.
- **Decided: compose by reference, never by nesting.** Each unit was a flat top-level `define` block, published as its own Nostr event. A parent `use`s a child and binds the child's states to its own. That binding is place fusion by explicit name. Unbound states stay private to their block. This is the most worked-out part of MAPS 1, and it matches the composing-nets survey (#7): glue places, unfold to one flat net.
- **The levels had no rule that separated them.** In the grammar, a Mechanic is a block with no `use`. A System is a block with `use` but no verb declarations. A Possibility Space is a block with `agents:`. Nothing said when a cluster of Mechanics stops being a Mechanic and becomes a System. **Cycle and Primitive had no syntax at all.** In practice the hierarchy was a fixed three-tier depth with names attached to it.
- **Decided: the flat net is the truth and the hierarchy is a view.** t3 required that "a composed Score must be reducible to a single flat Petri net". t5 required that schema membership be recoverable from the flat net. t1 says a System "renders as a single labeled rectangle … expandable into its constituent Mechanics". That is CPN-style folding: collapse a unit to a box, expand it in place.
- **Never tried.** No document defines interface declaration, mark conflicts on fused states, extension or override, diamond dependencies, or nested-versus-inlined drawing. All of these sit as open options in `todo/t3` and `todo/t2`. No composed example was ever written past Spacewar! fragments. The spec's own test vector expects "5 System references" for a Possibility Space example that lists 4.
- **Folding in the colored-token sense was never designed.** t1 maps Bura's folding (colored tokens for symmetric roles) to "agent declaration + schema separation", which is not a construct. MAPS 2 reopened it as the Folding gap: tic-tac-toe writes one rule 18 times.
- **`GAME_ABSTRACTION_LEVELS.md` on main still claims the hierarchy as MAPS's zoom mechanism.** It maps System zoom to Level 4 (strategic) and Possibility Space to Level 5 (structural). It calls the hierarchy "the prerequisite" for strategic analysis. That merges two different axes: part-whole composition and interpretive abstraction. The coherent design should either keep that claim and back it, or retire it. Leaving it on main contradicts SPEC.md, which has no hierarchy.
- **MAPS 2 dropped the hierarchy without a decision.** The greenfield decision log has no row about Cycle, Mechanic, System, or Possibility Space. What survives is `group` (a drawing-only outline), studio "also at" place copies (UI only), and two open items in SPEC.md: Folding and Composition by fusing named states.
- **The sibling model to weigh: RUNS is scale-free.** "There is no privileged 'sub-network' entity … only regions at different zoom levels". Bundling and unbundling are free, and the bundle is "the unit of manageability" (`.github/CONTEXT.md`). MAPS 1 picked fixed named tiers instead. The coherent design has to choose between the two.

## Timeline

| Date | Commit | What changed |
|---|---|---|
| 2026-01-16 | `cfea69c` | `RESEARCH.md` added: Primitive → Atom → Pattern → Score on a POSIX analogy, with YAML `dependencies:` and `extends:` |
| 2026-01-16 | `6ee254b` | README: Atom / Pattern / Score table |
| 2026-03-29 | `f196300` | `MAPS_TEXTUAL_NOTATION.md` v1.0.0-draft.1: Primitive / Cycle / Mechanic / System / Possibility Space; `define`/`use`; EBNF |
| 2026-03-30 | `63716c5` | `GAME_ABSTRACTION_LEVELS.md`: the hierarchy as "the zoom mechanism" |
| 2026-04-06 | `63d9fbc` | `todo/t1`–`t9` committed. t1 still uses **Form** for level 4; t3 still uses Atom / Pattern / Score |
| 2026-10-10 | `f32f5a3` | Greenfield MAPS 2 deletes all MAPS 1 docs (on `greenfield/conversation-net`) |
| 2026-10-11 | `2f5a190` | `GAME_ABSTRACTION_LEVELS.md` restored verbatim at the owner's request (decisions.tsv row: "it still uses MAPS 1 notation in ~14 lines") |
| 2026-10-22 | `7313cd4` | Fold into main; the deletions land on main |

The todo files were committed a week after the spec but use older names. My inference is that they were drafted before the spec and committed later without updates. The commit history does not show this directly.

## Generation 1: Atom, Pattern, Score

Source: `RESEARCH.md@7313cd4^1` lines 99–150, `README.md@7313cd4^1` lines 55–65.

| Level | Definition | Analog |
|---|---|---|
| Primitive | State, Verb, Arc, Mark | Syscalls |
| Atom | "Minimal complete loop: State → Verb → State" | read, write |
| Pattern | "Named, reusable cluster of atoms", versioned (`maps:open-door@1.0`) | grep, sed |
| Score | "Complete game structure" | Full application |

What it decided:
- Patterns are versioned packages. A Score imports them.
- Extension is a fork. You can "take `maps:locked-transition@1.0`, add a new Verb (e.g., `kick`), and publish the variant" (README line 63).

What it tried: YAML sketches of `dependencies:` and `extends:` with `modifications:` (RESEARCH lines 110–135). The README's "Concrete Example" says it imports `locked-transition`. Its YAML lists the import and then writes out both verbs inline. It never binds the Pattern's states.

What it left open: everything formal. `todo/t3` (below) was written against this vocabulary.

The same document introduced **schema separation**: Capability Schema, Content Schema, Content Instance, and Play State. It also introduced the **sphere-on-surface** model, using Link's moveset as the capability sphere (RESEARCH lines 52–97). Schema separation is a second, orthogonal way to cut a design. `todo/t5` lines 55–65 asks whether "docking" capability onto content "is the same mechanism as Pattern composition". If it is, then "the Capability Schema IS a Pattern". That question was never answered. It bears directly on the Link moveset proof.

## Generation 2: Cycle, Mechanic, System, Form or Possibility Space

Sources: `todo/t1-textual-graph-syntax.md@7313cd4^1` lines 158–269, and `MAPS_TEXTUAL_NOTATION.md@7313cd4^1` lines 29–38, 319–427, 504–519, and 702–710.

| Level | Name | Scope (spec lines 411–417) | Analogy |
|---|---|---|---|
| 0 | Primitive | A single State, Verb, Arc, or Mark | A note |
| 1 | Cycle | "The smallest closed interaction: one State → one Verb → back to State" | An interval |
| 2 | Mechanic | "A self-contained interactive unit" (e.g. open door) | A motif |
| 3 | System | "Multiple interacting Mechanics" (e.g. Z-targeting: lock-on + strafe + camera) | A theme |
| 4 | Possibility Space | "The complete interactive grammar of a game" | A complete work |

Naming rationale (t1 lines 259–269):
- **Cycle** replaced Atom because it is "a closed path in the graph … the minimal feedback loop". The name aligns with Dan Cook's skill atoms ("which are actually cycles") and with Crawford's model.
- **Mechanic** is "the designer's natural unit … a subnet with declared interface States".
- **System** was kept despite the engineering overload, with "a precise formal definition (a subnet composed of Mechanics with internal State sharing)". That formal definition was never written.
- **Form** replaced Score (music's "sonata form"). Topology, Grammar, and Blueprint were considered and rejected.
- The spec then shipped **Possibility Space** in place of Form, borrowing Juul's term. No document records why.

### What was decided

1. **No nesting. Composition happens through `use`.** "`define` blocks do not nest. … Nesting a Mechanic inside a System would make it private, unreferenceable from outside, and force duplication when a second System needs it" (spec line 347; t1 line 162; design constraints 4–5 at spec lines 36–37).
2. **Every unit is addressable.** Each `define` is its own Nostr event. `use nostr:naddr… as alias(bindings)` is the canonical form, and `import "./file.maps"` is the development form (spec lines 349–405, 431–451).
3. **Binding is place fusion by explicit name.** "State binding is DRY node reuse by ID … 'my `player_location` is your `near_door`'" (spec line 369). Names in different blocks are independent and "become the same node only through explicit `use` binding" (spec line 622). t1 line 181 names the lineage: CPN substitution transitions, fusion places, and port/socket, described as "CPN heritage, not CPN compatibility".
4. **Interface states are implicit.** "The interface States of a `define` block are all States that appear in the block's paths. States that appear in bindings are interface States" (spec line 371). These two sentences conflict. The first makes every state public. The second makes only bound states public. t3 lines 46–54 preferred an explicit `interface:` section, but none was added.
5. **The levels differ only in what the grammar allows in each body** (spec lines 504–519):
   - `mechanic_body` holds state declarations, verb declarations, and paths. It has no `use`.
   - `system_body` holds `use`, state declarations, and paths. It has no verb declarations.
   - `ps_body` adds `agents:`. It is the only level with seats.
   Nothing defines the boundary between a large Mechanic and a small System. A Mechanic cannot reuse another Mechanic. The depth is fixed at three.
6. **Folding means collapsing to a box.** "In visual tooling, `ship_combat` renders as a single labeled rectangle at the Form level, expandable into its constituent Mechanics" (t1 line 243). Drawing a unit as a rectangle, a verb shape, is the CPN substitution-transition convention.

### What was tried

- Only Spacewar! fragments: `torpedo_fire`, the `ship_combat` System as three `use` lines, and the `spacewar` Possibility Space as four `use` lines (spec lines 325–336, 378–384).
- No composed design was expanded into its flat net. No bindings were exercised across units.
- The test-vector table (spec lines 704–710) expects "2 agents, 5 System references, all cross-System State bindings resolved". The example above it has 4 references and no bindings.
- t1 lines 350–358 list six stress-test games (Spacewar!, chess, Poker, Dark Souls stamina, a Zelda dungeon, DOOM enemy AI) that the syntax had to handle. None was written out in the repo.

### What was left open (`todo/t3-composition-semantics.md@7313cd4^1`, status "Open")

t3 framed composition as place fusion and required four definitions: interface declaration, binding, fusion, and scoping of internal states (lines 18–28). Constraints:
- The composed net must reduce to one flat Petri net. Conflicts must be detected or ordered (line 33).
- Versioning must say what counts as a breaking change in a graph (line 36).
- Extension may add, override, remove, or rename (lines 38–39, 70–77).
- Independent authors need scoped internals and explicit binding, "not automatic name-matching" (line 42).

None of the six deliverables was produced (lines 85–92). The open questions (lines 94–99):
- Transitive composition and depth limits
- Diamond dependencies: fuse the shared unit or duplicate it
- "Abstract Patterns" with arcs left for the importer to fill
- Composition across temporal modes (t6)

Related open items:
- `todo/t2` lines 95–99: draw an imported Pattern as a collapsed black box with interface states on its border, as an expanded subgraph with a boundary, or "collapsed by default, expandable".
- `todo/t9` line 49: Pattern ↔ RUNS Sub-Network, 1:1. Line 117 asks whether RUNS must keep Pattern boundaries or may flatten them.
- `todo/t4`: Library Patterns must be discovered by writing 5–10 Scores and extracting the recurring subgraphs. None was written.

### Folding in the colored-token sense

t1 line 30 lists Bura's "folding (colored tokens for symmetric roles)". It maps folding to "agent declaration + schema separation", so it never became a construct. MAPS 1 had named marks inside states (`marks: fuel = 8192, ammo = 33`). That is a partial coloring, and it removed some repetition. MAPS 2 removed named marks, because "old guards read marks by name off-diagram" (`.work/decisions.tsv@7313cd4` line 4). Removing them brought the repetition back as GAP 4: "one rule written 34 times". It is open in `SPEC.md@7313cd4` lines 172 and 206.

## The hierarchy as a zoom lens (`GAME_ABSTRACTION_LEVELS.md@7313cd4`, still on main)

- Line 13: "The MAPS composition hierarchy — Cycle → Mechanic → System → Possibility Space — is the zoom mechanism that makes the Level 3 substrate legible at higher levels."
- Lines 299–309: a zoom table. Cycle and Mechanic sit at Level 3 (mechanical), System at Level 4 (strategic, "interpreted"), and Possibility Space at Level 5 (structural, "computed").
- Line 354: "Without the Mechanic → System → Possibility Space hierarchy, Level 3 graphs are flat and the topological substrate for Level 4 is illegible."

My analysis: the table puts a part-whole axis on the same ladder as an interpretation axis. A System is a larger piece of the same Level 3 net. A Level 4 reading such as "Preparation" or "Risk" is a different kind of description of that net. The document admits this for Level 4: it "requires its own notation … independently authored" (line 13). The zoom table still pins Level 4 to System zoom. For #14, the narrower claim is safer: grouping or folding makes the substrate legible, and the strategic and structural layers are separate overlays. The coherent design should keep that claim or retire it explicitly. The decisions log says the file "still uses MAPS 1 notation".

## What MAPS 2 kept

From `SPEC.md@7313cd4` and `.work/decisions.tsv@7313cd4`:
- `group name "label"` and `in group`. "Groups only organize the drawing" (SPEC line 23). Groups have no semantics, no interface, and no reuse.
- GAP 5: the whose-turn place fans out to 18 verbs. Place copies ("also at", the CPN fusion-place idiom) were added to the studio only: "Laziness: solve on screen without new notation until paper use demands it" (decisions lines 17 and 22).
- Open: **Folding**, which is "the smallest version of [colored tokens] a designer can draw by hand, and the analysis must still unfold it" (SPEC line 206). Also open: **Composition**, "reuse mechanics from other designs by fusing named states … a way to import a design and bind its states" (SPEC line 207). The second item restates MAPS 1's `use` with bindings, without the tiers.
- Deferred: "nest arcs inside Verb" (decisions line 32).
- No decision row mentions Cycle, Mechanic, System, or Possibility Space. The hierarchy was dropped by deleting the files, not by a recorded decision.

## Other branches and sibling repos

- `origin/feature/maps-rename` (`e78776b`), `origin/feature/readme-rewrite` (`1411867`), `origin/critique/ecosystem-shoring` (`647fdcc`), `origin/fix/guard-formalism-claims` (`8ad237f`), and `reconcile-aems-intent` (`8ce2cde`) are all README-era branches with Atom/Pattern/Score. Their hierarchy text matches the README. None adds composition semantics.
- `arena/cable-a`, `arena/cable-b`, and `greenfield/conversation-net` are MAPS 2. They contain no hierarchy, only the same `group` and decisions rows as main.
- `maps-library@ddb7acb` README: four placeholder Patterns (`resource-acquire`, `resource-consume`, `locked-transition`, `basic-exchange`). It says "Scores SHOULD import and extend these Patterns exactly" (line 78), and calls itself "Layer 2 in the MAPS architecture" between Primitives (Layer 1) and the Ecosystem (Layer 3) (line 98). That is a third, unrelated use of "layer". It also excludes timing and probability, which the spec and MAPS 2 later reversed.
- `aems-conventions@3f1420e` `entity-abstraction.md` lines 22 and 34: mechanics such as `consumable`, `pickup`, and the Knight's move "are MAPS Patterns". AEMS depends on the word Pattern meaning a reusable mechanic.
- `.github@0a2bc15` `CONTEXT.md` lines 117–130 and 218–237 describe RUNS. Granularity "is a spectrum, and decomposition is convention — not compliance". "Network is scale-free … no privileged 'sub-network' entity … only regions at different zoom levels". "Language and tooling must assume free bundling/unbundling". A bundle "is never severed from its constituent parts". This is the model MAPS 1 did not adopt. RUNS has one bundling construct at any depth. MAPS 1 had three fixed named tiers.
- `runs-spec@0e97d3c` has no MAPS hierarchy terms.

## Implications for #14

These are inferences from the record above, not decisions.

1. Keep from MAPS 1:
   - Composition by reference.
   - Explicit place-fusion binding.
   - Private-by-default internals.
   - "The flat net is the truth; hierarchy is a view that unfolds."

   All four agree with the composing-nets survey on `research/composing-nets` (#7).
2. Fix what MAPS 1 left inconsistent:
   - Declare interfaces explicitly. The spec's two sentences at line 371 contradict each other.
   - Decide whether a unit may `use` another unit at the same level.
3. The named tiers carried no structural rule. Two choices:
   - Treat Mechanic, System, and game as conventional labels on a single scale-free unit, the RUNS model.
   - Find a test that separates them. One candidate: the Cycle as a closed path, which can be detected in the graph, unlike the other tiers.
4. The Capability-docks-onto-Content question (t5) is the Link-versus-world question for Ocarina. MAPS 1 suspected docking is ordinary composition but never tested it.
5. Folding needs both meanings handled: collapsing a unit to a box, and colored families of states. MAPS 1 designed neither beyond one sentence each.
6. `GAME_ABSTRACTION_LEVELS.md` and `maps-library` still teach the old hierarchy. Whatever #14 decides, those two need a follow-up edit.

## Gaps

- I did not find why Form became Possibility Space between t1 and the spec. No commit message or document says.
- I did not search chat transcripts or the book manuscript for the hierarchy's rationale. Only git and the EGS repos were read.
- `maps-notation-greenfield` (a sibling worktree directory) was not read separately. Its branch `greenfield/conversation-net` was read through git.
