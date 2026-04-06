# T1: MAPS Textual Graph Syntax — Specification Draft

**Priority:** Critical — blocks all other work  
**Status:** Active — specification in progress

---

## Research Synthesis

Ten domains were studied for structural insight. None are MAPS. All contribute something.

### What each domain teaches

**SMILES (chemistry)** — Encodes molecular graphs as linear strings using a depth-first traversal. Atoms are characters, bonds are implied by adjacency, branches use `()`, ring closures use matching digits. The critical insight: **graphs can be linearized into readable text if the encoding preserves traversal order.** SMILES proves that humans can learn to read graph structure from punctuation conventions.

**Cypher (Neo4j)** — Expresses graph patterns as `(node)-[edge]->(node)`. The topology IS the syntax. Direction is embedded in the arrow character. Properties are inline in `{}`. The critical insight: **path-tracing syntax makes small graphs immediately legible.** The `()` and `[]` distinction between node types is exactly the bipartite visual separation MAPS needs.

**Process algebras (CCS/CSP)** — Express concurrent systems as algebraic compositions. `P | Q` for parallel, `P + Q` for choice, `a.P` for "do action a then become P." Critical insight: **choice and concurrency are first-class operators, not annotations.** CSP's explicit distinction between internal choice (`⊓`) and external choice (`□`) maps directly to MAPS's need to distinguish simulation-expressed Verbs from agent-chosen Verbs.

**GDL (General Game Playing)** — Datalog-derived. Defines games through `role`, `init`, `legal`, `next`, `terminal`, `goal` predicates. GDL-II adds `sees` for hidden information and `random` for chance. Critical insight: **a tiny set of reserved keywords can specify arbitrary games.** But GDL is designed for machine reasoning, not human readability. MAPS must be both.

**Ludii** — S-expression syntax: `(game "Chess" (players 2) (equipment ...) (rules ...))`. Ludemes are atomic conceptual units that compose into a tree. Critical insight: **the ludeme IS the compositional unit at every scale.** A ludeme can be a single rule or an entire game. This is the same scale-invariant composition MAPS needs.

**Christopher Alexander (pattern languages)** — 253 patterns organized by scale (city → building → room → detail), forming a network where each pattern references the larger patterns it completes and the smaller patterns that complete it. Critical insight: **composition hierarchy is a network, not a tree.** Patterns reference up and down in scale. And the design *process* is experienced as a sequence from large to small, even though the language itself is a network.

**Labanotation (dance)** — Uses a vertical staff with columns for body parts, symbol shapes for direction, shading for level, length for duration. Critical insight: **a notation system can encode multiple dimensions (body, direction, level, time) through distinct visual channels without conflating them.** MAPS encodes topology, agency, marks, and guards through distinct syntactic channels (`()`, `[]`, `=>`, `|...|`).

**Music notation (LilyPond)** — Textual encoding of musical scores. The text is canonical; the rendered visual score is derived. Critical insight: **the authoritative representation is plain text; the human-facing form is a rendering.** MAPS follows the same pattern — text in Nostr events, visual diagrams rendered by tools.

**Stéphane Bura — Game Diagrams (2006)** — The closest direct ancestor to MAPS. Petri-net-inspired game grammar focused on constitutive rules, not operational rules. His Blackjack diagram has no mention of cards, hitting, or 21 — it shows Skill vs. Luck resource management with dynamic exit thresholds. His Checkers diagram has no coordinates — it shows spending Moves tokens to accumulate Preparation tokens, with sacrifice as the most efficient but costly strategy. Critical insight: **the right abstraction level for game design notation reveals strategic structure and feedback loops, not interface mechanics.** His notation introduces inhibitor links (blocks transition while tokens present), variable links (flow depends on function/randomness), sources/sinks (boundary inflows/outflows), and folding (colored tokens for symmetric roles). All map to existing T1 constructs: negated guards, `~expression` prefix, interface States, and agent declaration + schema separation respectively. His 2006 conclusion reads as the MAPS roadmap: "we'd need rules about how to break down a game into sub-diagrams, a library of ludemes with agreed upon inputs and outputs, techniques to link operational and constitutive rules." MAPS is building each of these twenty years later.

**Joris Dormans — Machinations** — Runnable simulation tool for game economies. Six node types (Pool, Source, Drain, Converter, Trader, Gate) all expressible as MAPS States and Verbs with specific arc configurations — MAPS shouldn't multiply primitive types. Distinguishes resource connections (move tokens) from state connections (modify behavior/enable-disable nodes). Critical insight: **arcs that carry Marks and arcs that carry guards/triggers serve different functions.** T1 currently conflates both on the same arc (guards and mark effects in `|...|`). Worth monitoring whether this causes readability problems as real Forms are written. Machinations is tool-coupled (SaaS) and economy-centric (weak at spatial structure, temporal commitment, hidden information) — MAPS must be broader and tool-independent.

---

## The Conversation Model

`listen → think → speak → listen` maps directly to `see state → planning arc → perform verb → computer calculates → see state`. This is not a metaphor — it's a structural identity. The Petri net cycle `(state) → [verb] → (state)` IS one turn of the Crawford conversation:

1. **See State** — the player reads the current marking (token distribution) of visible States
2. **Plan (Arc)** — the player evaluates which Verbs are enabled (which outgoing Arcs have satisfied guards)
3. **Perform Verb** — the player selects and fires one enabled Verb (the transition fires)
4. **System resolves** — Marks flow along Arcs, simulation-expressed Verbs fire in response, marking changes propagate
5. **See new State** — the next conversation turn begins

The `=>` arc in T1 marks exactly the point where the conversation model's "think" phase happens. Every `=>` is a decision point. Every `->` is a consequence. No additional syntax is needed to express the conversation model — the Petri net IS the conversation model. MAPS's contribution isn't adding new semantics to Petri nets; it's providing a textual syntax, a visual convention, and a composition hierarchy that make the conversation model *readable and transmissible as game design notation*.

---

## Core Syntax Design

### Primitives

The four MAPS primitives have distinct textual representations derived from their visual forms:

| Primitive | Visual (diagram) | Textual | Rationale |
|-----------|------------------|---------|-----------|
| **State** | Circle | `(name)` | Parentheses suggest roundness. Cypher convention. |
| **Verb** | Rectangle | `[name]` | Square brackets suggest corners/edges. Cypher convention. |
| **Arc** | Arrow | `-|...|->` or `<-|...|-` | Pipe-delimited channel carrying guards/effects. Direction in arrow. |
| **Mark** | Token inside circle | `name: quantity` inside State or Arc | Inline annotation. |

### Path Syntax

The core expression is a **path** — a sequence of alternating States and Verbs connected by Arcs:

```
(idle)-|fuel > 0, -fuel|->[thrust]-|+velocity|->(moving)
```

Read left to right: "From State `idle`, if the guard `fuel > 0` is satisfied, fire Verb `thrust` consuming one fuel. The effect produces velocity, transitioning to State `moving`."

#### Arc contents

Inside the `|...|` delimiters, contents follow a fixed ordering — guards first, then effects:
- **Guards** — boolean expressions: `fuel > 0`, `ammo >= 1 AND reload == 0`
- **Consume** — prefix `−`: `−fuel`, `−3 ammo`
- **Produce** — prefix `+`: `+velocity`, `+1 score`
- **Probability weight** — prefix `~`: `~0.8`, `~risk` (Mark-dependent)
- **Multiple elements** — comma-separated: `fuel > 0, −fuel, +exhaust`

> **Design decision:** Enforce ordering inside `|...|`: guards → consumes → produces → weights. A reader knows that everything before the first `−` or `+` is a guard, everything after is an effect. Guards and effects stay on the same arc — splitting them into separate arc types would sacrifice path-tracing readability for a marginal clarity gain. The syntax already distinguishes them (comparison operators for guards, `+`/`−` for effects).

Empty arcs (no guard, no effects) use bare arrows: `(idle)->[rotate]->(idle)`

Comments use `#`:

```
(alive)-|fuel > 0, −fuel|->[thrust]->(alive)  # sustained engine burn
```

#### Self-loops

A Verb that returns to its origin State:

```
(alive)-|fuel > 0, −fuel|->[thrust]->(alive)
```

#### Branching

Multiple output Arcs from a single Verb:

```
[hyperspace_return]-|~(1 − risk)|->(alive)
[hyperspace_return]-|~risk|->(exploding)
```

Multiple input Arcs to a single Verb:

```
(near_door)-|keys >= 1, −1 keys|->[open_door]
(near_door)-|strength >= 5|->[kick_door]
[open_door]->(door_open)
[kick_door]->(door_open)
```

### Choice

Petri nets already handle concurrency natively — a place with multiple outgoing arcs to different transitions presents a choice, and when multiple transitions are enabled, standard Petri net semantics resolve firings. MAPS doesn't need to reinvent concurrency operators. What MAPS DOES need to mark syntactically is the *source of choice*: does the agent select, or does the system resolve? Borrowing from CSP's distinction between external and internal choice:

**Agent choice** — when a State has multiple outgoing Arcs to different Verbs, and the agent selects:

```
(alive) => [thrust]     # The `=>` arrow indicates "agent selects"
(alive) => [fire]
(alive) => [hyperspace]
```

**Simulation rule** — a Verb that fires automatically when its guard is satisfied:

```
(alive)-|distance_to_star < capture|->[star_capture]->(exploding)
```

The syntax distinguishes these structurally: standard Arcs `->` indicate flow. Choice Arcs `=>` indicate agent selection points. When multiple `=>` Arcs leave the same State, the agent chooses among enabled Verbs. When only `->` Arcs connect to a Verb, it fires when enabled without choice.

> **Design decision:** `=>` for agent choice, `->` for simulation flow. This is the MAPS equivalent of CSP's external vs. internal choice. The distinction is visible in the syntax itself — a reader scanning for `=>` immediately sees every point where the agent has agency.

### Declarations

Paths describe topology. Declarations provide metadata. They are separate statements — **path syntax does not support inline declarations.**

```
state (alive) {
  marks: fuel = 8192, ammo = 33, hyperspace_shots = 8
  visible_to: all
}

verb [thrust] {
  temporal: sustained    # fires continuously while selected
  schema: capability     # belongs to Capability Schema
}
```

> **Design decision:** Topology and metadata live in separate statements. The path syntax stays pure — `()`, `[]`, and `|...|` only. A reader tracing a path shouldn't have to parse property bags. SMILES (chemistry) handles this the same way: the molecular string is pure topology, properties live in a separate data block.

### Composition and Referencing

Every MAPS unit — every Mechanic, every System, every Form — is its own Nostr event floating on relays. Nostr IS the database. Nostr IS the package manager. Composition via event references is the default state, not a feature to be added.

Named subgraphs are defined with `define` and referenced with `use`. Each `define` block is an independent unit — **`define` blocks do not nest.** A Mechanic exists to be referenced, shared, studied, and composed by anyone. Nesting a Mechanic inside a System would make it private, unreferenceable from outside, and force duplication when a second System needs it. Composition happens through `use`, not containment.

```
# Each define block is its own Nostr event
define mechanic open_door {
  (near_door)-|keys >= 1, −1 keys|->[unlock]->(unlocked)
  (unlocked)->[open]->(door_open)
}
```

The `use` statement references another unit by Nostr identifier and binds interface States:

```
# Canonical form — Nostr-native reference
use nostr:naddr1abc... as open_door(near_door = player_location, door_open = next_room)
```

The binding syntax is DRY node reuse by ID — when two Mechanics both reference `(ship_active)`, they're pointing to the same node. The binding is a naming bridge: "my `ship_active` and your `ship_active` are the same thing."

This arrives at structurally similar mechanisms to CPN's hierarchical modules (substitution transitions ≈ bundling, fusion places ≈ DRY node references, port/socket ≈ interface binding) because both systems solve the same underlying problem — hierarchical decomposition of Petri net graphs. But MAPS has different goals (designer readability, Nostr publication, game-specific semantics) and different constraints. CPN heritage, not CPN compatibility.

> **Design decision:** Every `[]` must contain an identifier. Every `()` must contain an identifier. Anonymous nodes are not supported. If a State or Verb exists in the graph, it has a name. A reader encountering the notation should never have to infer what a node represents.

### Nostr Event Structure

A Form event's `content` field contains MAPS textual notation. Its `tags` array includes `a` tags for relay-level indexing of referenced events:

```json
{
  "kind": ...,
  "content": "form spacewar { ... }",
  "tags": [
    ["a", "<kind>:<pubkey>:ship_movement", "wss://relay.example.com"],
    ["a", "<kind>:<pubkey>:ship_combat", "wss://relay.example.com"]
  ]
}
```

Tooling resolves all references, fetches the events from relays, and presents the composed graph.

`naddr` (addressable identifiers) are preferable to `note` (event-id identifiers) because they're human-meaningful and replaceable — if the author publishes an updated version of `ship_combat`, the `naddr` resolves to the latest version while maintaining the same logical identity.

### Local Development

Before publication, a designer working on disk may author multiple units in local `.maps` files. The `import` statement makes locally-defined units available by name:

```
import "./mechanics/torpedo_fire.maps"
import "./systems/ship_combat.maps"
```

When published, each `define` block becomes its own Nostr event, and `import` + local `use` statements compile to `use nostr:` references with real event IDs. The spec defines Nostr-native composition as canonical; local files are a development convenience.

### Bundling in Practice

Each level can be referenced as a single node at the next level up:

```
# Level 2: Mechanic — its own Nostr event
define mechanic torpedo_fire {
  (ship_active) => |ammo > 0 AND reload == 0, −1 ammo|[fire]->(ship_active)
  [fire]-|spawn|->(torpedo_active)
}

# Level 3: System — references Mechanic events
define system ship_combat {
  use nostr:naddr1abc... as torpedo_fire
  use nostr:naddr1def... as torpedo_lifecycle
  use nostr:naddr1ghi... as collision_destroy
}

# Level 4: Form — references System events
form spacewar {
  agents: player_1, player_2
  use nostr:naddr1jkl... as ship_movement
  use nostr:naddr1mno... as ship_combat
  use nostr:naddr1pqr... as ship_hyperspace
  use nostr:naddr1stu... as match_structure
}
```

In visual tooling, `ship_combat` renders as a single labeled rectangle at the Form level, expandable into its constituent Mechanics. The tooling fetches the referenced events from relays and composes the graph.

---

## Composition Hierarchy

The naming hierarchy satisfies four constraints: each level has a clear scope, names are intuitive to game designers, they scale from sketch to specification, and they don't collide with existing EGS terminology.

| Level | Name | Scope | Example | Analogy |
|-------|------|-------|---------|---------
| 0 | **Primitive** | A single State, Verb, Arc, or Mark | `(alive)`, `[thrust]` | A single note |
| 1 | **Cycle** | The smallest closed interaction: one State, one Verb, back to State | `(alive)->[rotate]->(alive)` | A single interval |
| 2 | **Mechanic** | A self-contained interactive unit — a few Cycles with shared States, guards, and mark flows | "Open door" — unlock + open. "Fire torpedo" — check ammo, consume, spawn. | A motif |
| 3 | **System** | Multiple interacting Mechanics forming a cohesive behavioral complex | "Z-targeting" — lock-on + strafe + camera + attack-while-locked. "Hyperspace" — entry + transit + breakout + death risk. | A theme / subject |
| 4 | **Form** | The complete interactive grammar of a game | "The Spacewar! Form" — all Systems composed, all agents defined, all world rules included | A complete work |

**Primitive** — already used in MAPS, well-understood, correctly scoped.

**Cycle** — replaces "Atom" for the minimal loop. A Cycle is a closed path in the graph — the smallest unit that has both input and output, the minimal feedback loop. Aligns with Dan Cook's "skill atoms" (which are actually cycles) and the Crawford conversation model (listen → think → speak → listen).

**Mechanic** — the designer's natural unit. "The reload mechanic," "the lock-and-key mechanic." In Petri net terms, a Mechanic is a subnet with declared interface States. In Alexander's pattern language, it's a single pattern — self-contained but referencing its context.

**System** — despite engineering overloading, "system" is the natural game design term. "The combat system," "the crafting system." A System is a composition of Mechanics that interact through shared States and Marks. MAPS Systems have a precise formal definition (a subnet composed of Mechanics with internal State sharing) that disambiguates from casual use.

**Form** — replaces "Score." In music, "form" means the large-scale structural template: sonata form, rondo form. "The Spacewar! Form" is the complete structural description of Spacewar!'s interactive grammar — structural, complete, studyable, but not the implementation.

> Alternative considered: **Topology** — precise but too mathematical. **Grammar** — implies generative rules, not a specific composition. **Blueprint** — implies something to be built from, coupling MAPS to RUNS.

---

## Formal Grammar (Sketch)

```ebnf
(* A MAPS file contains one or more top-level definitions *)
file         = { import_stmt | definition } ;
import_stmt  = "import" STRING ;                        # local dev convenience

definition   = form | system_def | mechanic_def ;

form         = "form" IDENT "{" form_body "}" ;
form_body    = { agent_decl | use_stmt | state_decl | path | comment } ;

system_def   = "define" "system" IDENT "{" system_body "}" ;
system_body  = { use_stmt | state_decl | path | comment } ;

mechanic_def = "define" "mechanic" IDENT "{" mechanic_body "}" ;
mechanic_body = { state_decl | verb_decl | path | comment } ;

(* No nesting: define blocks appear only at file top level *)

(* Paths — the core syntax *)
path         = node ( arc node )+ ;
node         = state_ref | verb_ref ;
state_ref    = "(" IDENT ")" ;                          # every State must be named
verb_ref     = "[" IDENT "]" ;                          # every Verb must be named
arc          = choice_arc | flow_arc ;
choice_arc   = "=>" [ "|" arc_body "|" ] ;
flow_arc     = "->" [ "|" arc_body "|" ] | "<-" [ "|" arc_body "|" ] ;

(* Arc body: guards first, then effects — strictly ordered *)
arc_body     = { guard } [","] { consume } [","] { produce } [","] { weight } ;
guard        = expression ;
consume      = "−" [ NUMBER ] IDENT ;
produce      = "+" [ NUMBER ] IDENT ;
weight       = "~" ( NUMBER | IDENT ) ;

(* Declarations *)
state_decl   = "state" state_ref "{" { mark_decl | visibility } "}" ;
mark_decl    = "marks:" IDENT "=" value { "," IDENT "=" value } ;
visibility   = "visible_to:" ( "all" | "none" | IDENT { "," IDENT } ) ;

verb_decl    = "verb" verb_ref "{" { temporal | schema_tag } "}" ;
temporal     = "temporal:" ( "instant" | "sustained" | "committed" ) ;
schema_tag   = "schema:" ( "capability" | "content" ) ;

(* Composition *)
agent_decl   = "agents:" IDENT { "," IDENT } ;
use_stmt     = "use" ( nostr_ref | IDENT ) [ "as" IDENT ] [ "(" bindings ")" ] ;
nostr_ref    = "nostr:" NADDR ;
bindings     = IDENT "=" IDENT { "," IDENT "=" IDENT } ;

(* Comments *)
comment      = "#" { any_char } NEWLINE ;
```

This is a working sketch, not a final grammar. It will be refined through stress-testing against real Forms.

---

## Design Principles (Summary)

1. **The Petri net IS the notation.** MAPS doesn't layer new abstractions on Petri nets — it IS a Petri net with named places (States), named transitions (Verbs), directed arcs, and colored tokens (Marks). Everything Petri nets already handle (concurrency, resource competition, mutual exclusion, liveness) is inherited, not reinvented.
2. **The conversation model is native.** Every `(state) => [verb] -> (state)` cycle IS one turn of the player-system conversation. No mapping required.
3. **Constitutive over operational.** The right abstraction level reveals strategy and feedback loops, not interface mechanics. A Form for DOOM doesn't describe key bindings — it describes "move through space, shoot monsters, find keys, open doors, exit level."
4. **Agent choice is the only new semantic.** The `=>` arc is the only MAPS-specific addition to Petri net semantics. Everything else — guard expressions, token flow, inhibition, concurrency — is standard.
5. **Topology in the text.** The path syntax makes graph structure visible. You read the graph by reading the lines.
6. **Bipartite enforcement.** `()` and `[]` alternate. A syntactically valid path is always a valid Petri net fragment.
7. **Everything is named.** Every State and Verb must have an identifier. MAPS is for making game structure readable — anonymous nodes defeat the purpose.
8. **Topology and metadata are separate.** Path syntax stays pure (`()`, `[]`, `|...|`). Declarations handle properties.
9. **Arc contents are ordered.** Guards → consumes → produces → weights inside `|...|`. Guards and effects on the same arc — no splitting.
10. **Flat definitions, composed by reference.** `define` blocks do not nest. Each unit is independently referenceable. Composition happens through `use` + Nostr event references.
11. **Nostr is canonical.** Every MAPS unit is a Nostr event. Nostr is the storage, the database, and the package manager.
12. **Graph integrity over visual simplicity.** The textual form preserves complete graph structure. Visual simplification is the job of tooling.
13. **Readable without tooling.** A designer reading the text can trace paths, identify choice points, and understand mark flows without a diagram renderer.

---

## Stress Tests Needed

Before finalizing, the syntax must be validated against:

1. **Spacewar!** — real-time physics, entity state machines, entity spawning, escalating risk
2. **Chess** — turn-based, complete information, large discrete state space
3. **Poker** — hidden information, probabilistic draws, bluffing as emergent mechanic
4. **Dark Souls stamina** — T6 temporal concerns (commitment, recovery windows, interruptibility)
5. **Zelda dungeon** — Capability/Content separation, keyed progression, spatial structure
6. **DOOM enemy AI** — multi-state entity behavior, complex dispatch

If the syntax handles all six without requiring ad-hoc extensions, the grammar is sound.

---

## Storage, Rendering, and Conventions

MAPS is fundamentally visual — Petri nets are visual formalisms, and designers think in diagrams. But the canonical form must be plain text in a Nostr event. Visual diagrams are renderings of that text, the way a web page is a rendering of HTML. The text is authoritative. The diagram is derived.

The spec defines one notation. One syntax. One complete format. The graph is the graph, with all its metadata. If a State has marks, those marks are part of the State's definition. You can't strip metadata and claim you have the same graph — you have a different, incomplete graph that a tool could not render equivalently because the information isn't there.

Napkin sketching is a separate human activity, not a spec concern. The spec should be ergonomic enough that a familiar designer naturally sketches things that map recognizably to the notation. But that's an outcome of good design, not a feature to engineer.

| Convention | Decision | Rationale |
|------------|----------|-----------|
| **File extension** | `.maps` | Matches protocol name. No conflicts. Consistent with `.runs`. |
| **Comments** | `# comment` | Convention for notation/data formats (YAML, TOML). Keeps `//` free. |
| **Nesting** | `define` blocks do not nest | Transmissibility — every unit is independently referenceable. |
| **Inline declarations** | Not supported | Paths stay pure topology. Declarations are separate. |
| **Anonymous nodes** | Not supported | Every State and Verb must be named. |
| **Arc ordering** | Guards → consumes → produces → weights | Predictable parsing. No separate arc types needed. |
| **Canonical composition** | `use nostr:naddr...` | Nostr is the storage and package manager. |
| **Local composition** | `import "./file.maps"` | Development convenience; compiles to Nostr refs on publication. |
