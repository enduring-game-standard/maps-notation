# MAPS — Textual Notation for Game Mechanics

> **Status**: Draft Specification  
> **Version**: 1.0.0-draft.1  
> **File extension**: `.maps`

## Purpose

MAPS Notation is the textual syntax for describing game mechanics as readable, composable, transmissible artifacts. It defines a graph-based grammar for game structure using four primitives — State, Verb, Arc, Mark — that form a bipartite directed graph equivalent to an extended Petri net.

MAPS is part of the EGS protocol family:

| Protocol | Phonetic | Purpose |
|----------|----------|---------|
| **AEMS** | "he aims" | Asset-Entity-Manifestation-State — what things ARE |
| **RUNS** | "he runs" | Records Update on Neutral Substrate — how things CHANGE |
| **DIGS** | "he digs" | Deterministic Inspectable Game Syntax — how Processors COMPUTE |
| **MAPS** | "he maps" | Mechanics And Play Structures — how rules are DESIGNED |
| **WOCS** | "he wocs" | Work Offered, Claimed, Settled — how things COORDINATE |

MAPS is a design-time artifact — it describes the constitutive rules of a game (what the game IS, structurally) without specifying how those rules are implemented. A MAPS Possibility Space can be studied, compared, forked, and taught independently of any implementation. When a game is implemented in RUNS, MAPS States correspond to Records, MAPS Verbs correspond to Processors, and MAPS Arcs correspond to Network wiring. But a MAPS Possibility Space has independent value as a design object.

Every MAPS unit (Mechanic, System, Possibility Space) is a Nostr event. Nostr is the storage, the database, and the package manager. The textual syntax in this specification is the canonical representation stored in the `content` field of a Nostr event. Visual diagrams are renderings of that text — derived, not authoritative.

Every decision in this specification is driven by one question: *can a game designer in a century read this notation and understand the game's interactive structure, with nothing but this document?*

---

## Design Constraints

The notation is:

1. **Bipartite** — States and Verbs are disjoint node types. Every Arc connects a State to a Verb or a Verb to a State. An Arc never connects two States or two Verbs directly. This bipartite structure is a mandatory invariant inherited from Petri net theory. Violation makes a graph non-compliant.
2. **Constitutive** — The notation describes what a game IS structurally, not how it looks, sounds, or renders. A Possibility Space for DOOM describes "move through space, shoot monsters, find keys, open doors, exit level" — not keybindings, polygon counts, or sprite animations. The right abstraction level reveals strategic structure and feedback loops, not interface mechanics.
3. **Named** — Every State and Verb in the graph has an identifier. There are no anonymous nodes. A reader encountering the notation should never have to infer what a node represents.
4. **Composable** — Subgraphs are defined once and referenced by name. A Mechanic can be composed into any number of Systems. A System can be composed into any number of Possibility Spaces. The same `define`/`use` syntax works at every scale.
5. **Transmissible** — Every `define` block is independently referenceable via Nostr event ID. No unit is private to or contained within another. Composition happens through `use` references, not through nesting.
6. **Tool-independent** — The textual syntax is readable without tooling. A designer reading the text can trace paths, identify choice points, and understand mark flows without a diagram renderer. Visual rendering is a tooling concern; the text is the authoritative form.

---

## Lexical Structure

### Character Set

Source files are UTF-8 encoded. The notation uses only ASCII for keywords, operators, and identifiers. UTF-8 characters outside the ASCII range may appear only in comments.

### Line Structure

Logical lines are terminated by a newline character (U+000A). Carriage return (U+000D) preceding a newline is ignored. A source file must end with a newline.

### Whitespace

Whitespace (space U+0020) separates tokens. Tab characters (U+0009) are legal but carry no structural meaning — unlike DIGS, MAPS does not use indentation for block structure. Block structure is expressed through braces (`{` `}`).

### Comments

A comment begins with `#` and extends to the end of the line. There are no multi-line comment delimiters. Comments carry no semantic meaning.

```maps
# This is a comment
(idle)->[rotate]->(idle)  # self-loop: rotation is free
```

### Keywords

The following identifiers are reserved and may not be used as State, Verb, or Mark names:

```
possibility_space  define  mechanic  system  state  verb  use  import  as
agents  marks  visible_to  temporal  schema
instant  sustained  committed  capability  content
all  none  AND  OR  NOT
```

### Identifiers

An identifier begins with a lowercase letter (a–z), followed by zero or more lowercase letters, digits (0–9), or underscores. Identifiers are case-sensitive. All identifiers must be lowercase.

```
alive
fuel
ship_active
torpedo_fire
hyperspace_return_1
```

Uppercase letters are not permitted in identifiers. This prevents ambiguity with the logical operators `AND`, `OR`, `NOT`.

### Nostr References

A Nostr reference is the string `nostr:` followed by a bech32-encoded Nostr identifier (`naddr1...`, `note1...`, `npub1...`). Nostr references are used in `use` statements to reference MAPS units published on relays.

```
nostr:naddr1qqxnzd3exy6rjv3hx5cnyde5...
```

`naddr` (addressable identifiers) are preferred over `note` (event-id identifiers) because they are human-meaningful and version-replaceable.

---

## Primitives

The four MAPS primitives and their textual representations:

| Primitive | Graph role | Textual | Visual (diagram) | Petri net equivalent |
|-----------|-----------|---------|-------------------|---------------------|
| **State** | Place (node type A) | `(name)` | Circle | Place |
| **Verb** | Transition (node type B) | `[name]` | Rectangle | Transition |
| **Arc** | Directed edge | `-|...|->` or `<-|...|-` or `->` or `=>` | Arrow | Arc |
| **Mark** | Token | `name = quantity` | Dot inside circle | Token |

**State** — represents an observable condition or situation: `(alive)`, `(door_locked)`, `(inventory_full)`. A State may hold Marks (colored tokens with names and quantities).

**Verb** — represents an action or event that transforms the game state: `[thrust]`, `[fire]`, `[open_door]`. A Verb fires when all its input Arcs' guards are satisfied.

**Arc** — the directed connection between a State and a Verb (or vice versa). Arcs carry guards (preconditions), mark consumption/production effects, and probability weights. An Arc from a State to a Verb is an input arc (tokens flow from place to transition). An Arc from a Verb to a State is an output arc (tokens flow from transition to place).

**Mark** — a named, quantified token on a State: `fuel = 8192`, `ammo = 33`. Marks are non-negative integers. Arc guards test mark values; arc effects consume or produce marks.

---

## Path Syntax

The core expression is a **path** — a sequence of alternating States and Verbs connected by Arcs. This is MAPS's primary authoring and reading syntax.

```maps
(idle)-|fuel > 0, −fuel|->[thrust]-|+velocity|->(moving)
```

Read left to right: "From State `idle`, if the guard `fuel > 0` is satisfied, fire Verb `thrust` consuming one fuel. The Verb produces velocity, transitioning to State `moving`."

### Arc Syntax

Arcs come in two forms:

| Syntax | Name | Semantics |
|--------|------|-----------|
| `->` | Flow arc | Simulation-expressed transition. Fires automatically when guards are satisfied. |
| `=>` | Choice arc | Agent-selected transition. The agent chooses among enabled Verbs. |

The `=>` arc is the only MAPS-specific addition to Petri net semantics. It marks the point in the conversation model where the agent has agency — the "think" phase of Crawford's listen → think → speak → listen cycle. Every `=>` is a decision point. Every `->` is a consequence.

Both arc types may carry contents inside pipe delimiters `|...|`:

```maps
(state)-|contents|->[verb]    # flow arc with contents
(state)=>|contents|[verb]     # choice arc with contents
[verb]-|contents|->(state)    # output arc with contents
(state)->[verb]               # bare flow arc (no guards, no effects)
(state)=>[verb]               # bare choice arc
```

### Arc Contents

Inside the `|...|` delimiters, contents follow a fixed ordering — guards first, then effects:

| Element | Syntax | Position | Example |
|---------|--------|----------|---------|
| Guard | Boolean expression | First | `fuel > 0`, `ammo >= 1 AND reload == 0` |
| Consume | `−` prefix | After guards | `−fuel`, `−3 ammo` |
| Produce | `+` prefix | After consumes | `+velocity`, `+1 score` |
| Weight | `~` prefix | Last | `~0.8`, `~risk` |

Multiple elements are comma-separated:

```maps
(alive)-|fuel > 0, −fuel, +exhaust|->[thrust]->(alive)
```

**Ordering rule:** Guards → consumes → produces → weights. A reader knows that everything before the first `−` or `+` is a guard. Everything after is an effect. A parser uses the same rule.

Empty arcs (no guard, no effects) use bare arrows:

```maps
(idle)->[rotate]->(idle)
```

### Guard Expressions

Guard expressions are boolean predicates evaluated against the current marking (mark values on States). Guards check conditions — they do not compute.

#### Comparison Operators

| Operator | Meaning |
|----------|---------|
| `==` | Equal |
| `!=` | Not equal |
| `<` | Less than |
| `>` | Greater than |
| `<=` | Less than or equal |
| `>=` | Greater than or equal |

Comparison operands are mark names and integer literals. A guard compares a mark to a value or a mark to another mark:

```maps
(alive)-|fuel > 0|->[thrust]          # mark vs literal
(ready)-|health > threshold|->[act]   # mark vs mark
```

#### Logical Operators

| Operator | Meaning |
|----------|---------|
| `AND` | Logical conjunction |
| `OR` | Logical disjunction |
| `NOT` | Logical negation |

Logical operators are uppercase to distinguish them from identifiers. They combine comparison predicates:

```maps
(alive)-|ammo > 0 AND reload == 0|->[fire]
(ready)-|keys >= 1 OR strength >= 5|->[open]
```

#### Operator Precedence

From highest to lowest binding:

| Level | Operators | Associativity |
|-------|-----------|---------------|
| 1 | `NOT` | Right |
| 2 | `==`, `!=`, `<`, `>`, `<=`, `>=` | None (no chaining) |
| 3 | `AND` | Left |
| 4 | `OR` | Left |

Parentheses group logical sub-expressions: `(keys >= 1 OR lockpick >= 1) AND near_door > 0`.

> **Design decision: no arithmetic in guards.** Guards observe the current marking — they read marks and compare values. They do not compute. If a game needs a derived quantity ("effective fuel", "total damage"), a Verb computes it and deposits the result as a Mark on a State. The guard reads that Mark. This enforces the conversation model: the "listen" phase reads state, it doesn't calculate. Calculation is the Verb's job. Petri net arc inscriptions work the same way — they test token counts, they don't perform arithmetic on them.

### Self-Loops

A Verb that returns to its origin State:

```maps
(alive)-|fuel > 0, −fuel|->[thrust]->(alive)
```

### Branching

Multiple output Arcs from a single Verb (probabilistic or conditional):

```maps
[hyperspace_return]-|~(1 − risk)|->(alive)
[hyperspace_return]-|~risk|->(exploding)
```

Multiple input paths to the same State:

```maps
(near_door)-|keys >= 1, −1 keys|->[open_door]
(near_door)-|strength >= 5|->[kick_door]
[open_door]->(door_open)
[kick_door]->(door_open)
```

### Choice

When a State has multiple outgoing choice arcs to different Verbs, the agent selects:

```maps
(alive) => [thrust]
(alive) => [fire]
(alive) => [hyperspace]
```

When only flow arcs (`->`) connect to a Verb, it fires by simulation rule when its guards are satisfied:

```maps
(alive)-|distance_to_star < capture|->[star_capture]->(exploding)
```

---

## Declarations

Paths describe topology. Declarations provide metadata. They are separate statements — **path syntax does not support inline declarations.** The path stays pure topology (`()`, `[]`, `|...|`). Properties live in declaration blocks.

### State Declarations

```maps
state (alive) {
  marks: fuel = 8192, ammo = 33, hyperspace_shots = 8
  visible_to: all
}
```

Fields:

| Field | Required | Meaning |
|-------|----------|---------|
| `marks:` | No | Named marks with initial quantities. All mark values are non-negative integers. |
| `visible_to:` | No | Which agents can observe this State's marking. `all` (default), `none`, or a comma-separated list of agent identifiers. |

A State referenced in a path but never declared has no marks and is visible to all agents.

### Verb Declarations

```maps
verb [thrust] {
  temporal: sustained
  schema: capability
}
```

Fields:

| Field | Required | Meaning | Values |
|-------|----------|---------|--------|
| `temporal:` | No | Firing duration semantics. | `instant` (fires once, default), `sustained` (fires continuously while selected), `committed` (fires once and locks out other Verbs until complete) |
| `schema:` | No | Design schema classification. | `capability` (what the agent can do), `content` (what the world affords) |

Temporal semantics describe design intent — they classify how a Verb behaves in play. They do not define implementation. A RUNS implementation of a `sustained` Verb may fire it once per tick for as long as the agent holds the input.

A Verb referenced in a path but never declared has `instant` temporal semantics and no schema tag.

---

## Composition

### Define Blocks

Named subgraphs are defined with the `define` keyword. Each `define` block is an independent unit — a standalone Nostr event.

```maps
define mechanic torpedo_fire {
  (ship_active) => |ammo > 0 AND reload == 0, −1 ammo|[fire]->(ship_active)
  [fire]-|+1 spawn|->(torpedo_active)
}

define system ship_combat {
  use nostr:naddr1abc... as torpedo_fire
  use nostr:naddr1def... as torpedo_lifecycle
  use nostr:naddr1ghi... as collision_destroy
}
```

Three composition levels use `define`:

| Level | Keyword | Scope |
|-------|---------|-------|
| 2 | `define mechanic` | A self-contained interactive unit — a few Cycles with shared States, guards, and mark flows. |
| 3 | `define system` | Multiple interacting Mechanics forming a cohesive behavioral complex. |

Level 4 (Possibility Space) uses the `possibility_space` keyword directly (see below).

**`define` blocks do not nest.** Each unit is defined at file top level. Nesting a Mechanic inside a System would make it private, unreferenceable from outside, and force duplication when a second System needs it. Composition happens through `use`, not containment.

### Use Statements

The `use` statement references another MAPS unit and optionally binds interface States:

```maps
# Canonical form — Nostr-native reference
use nostr:naddr1abc... as torpedo_fire(ship_active = my_ship, torpedo_active = my_torpedo)

# Local form — development convenience
use torpedo_fire(ship_active = my_ship, torpedo_active = my_torpedo)
```

Components of a `use` statement:

| Component | Required | Meaning |
|-----------|----------|---------|
| Reference | Yes | Either `nostr:naddr...` (canonical) or a local identifier (resolved from `import`). |
| `as` alias | No | Local name for the referenced unit. Required when using Nostr references. |
| Bindings `(...)` | No | Maps the referenced unit's interface States to States in the current scope. |

**State binding** is DRY node reuse by ID. When two Mechanics both reference `(ship_active)`, they point to the same node. The binding syntax is a naming bridge: "my `player_location` is your `near_door`."

The interface States of a `define` block are all States that appear in the block's paths. States that appear in bindings are interface States — they connect the defined unit to the surrounding context. States not bound are internal to the unit.

### Possibility Space Declaration

The top-level composition unit:

```maps
possibility_space spacewar {
  agents: player_1, player_2
  use nostr:naddr1jkl... as ship_movement
  use nostr:naddr1mno... as ship_combat
  use nostr:naddr1pqr... as ship_hyperspace
  use nostr:naddr1stu... as match_structure
}
```

Fields:

| Field | Required | Meaning |
|-------|----------|---------|
| `agents:` | Yes | Comma-separated list of agent identifiers. Each agent represents a distinct decision-making role in the game. |
| `use` | Yes (one or more) | References to Systems or Mechanics that compose the Possibility Space. |
| Paths | Optional | A Possibility Space may also contain inline path statements for top-level wiring. |
| State/Verb declarations | Optional | Top-level State and Verb declarations. |

### Import Statements

For local development, `import` makes definitions from other `.maps` files available:

```maps
import "./mechanics/torpedo_fire.maps"
import "./systems/ship_combat.maps"
```

When published to Nostr, each `define` block becomes its own event, and `import` + local `use` resolve to `use nostr:` references with real event IDs. The spec defines Nostr-native composition as canonical; local files are a development convenience.

---

## Composition Hierarchy

| Level | Name | Scope | Example | Analogy |
|-------|------|-------|---------|---------
| 0 | **Primitive** | A single State, Verb, Arc, or Mark | `(alive)`, `[thrust]` | A note |
| 1 | **Cycle** | The smallest closed interaction: one State → one Verb → back to State | `(alive)->[rotate]->(alive)` | An interval |
| 2 | **Mechanic** | A self-contained interactive unit | "Open door" — unlock + open | A motif |
| 3 | **System** | Multiple interacting Mechanics | "Z-targeting" — lock-on + strafe + camera | A theme |
| 4 | **Possibility Space** | The complete interactive grammar of a game | "The Spacewar! Possibility Space" | A complete work |

**Primitive** — the atomic elements. Can't be decomposed further.

**Cycle** — the minimal feedback loop. This is one turn of the Crawford conversation model (listen → think → speak → listen). The smallest unit that has both input and output.

**Mechanic** — the designer's natural unit. "The reload mechanic," "the lock-and-key mechanic." A subnet with declared interface States. A single Nostr event.

**System** — a composition of Mechanics through shared States. "The combat system," "the movement system." Also a single Nostr event, referencing Mechanic events.

**Possibility Space** — the complete game structure. References System events. The root composition unit. A single Nostr event containing the entire game's structural grammar.

---

## Nostr Event Structure

A Possibility Space event's `content` field contains MAPS textual notation. Its `tags` array includes `a` tags for relay-level indexing:

```json
{
  "kind": 30040,
  "content": "possibility_space spacewar {\n  agents: player_1, player_2\n  use nostr:naddr1... as ship_movement\n  ...\n}",
  "tags": [
    ["d", "spacewar"],
    ["a", "30040:<pubkey>:ship_movement", "wss://relay.example.com"],
    ["a", "30040:<pubkey>:ship_combat", "wss://relay.example.com"],
    ["t", "maps"],
    ["t", "possibility_space"]
  ]
}
```

Mechanic and System events follow the same structure — `content` contains the `define` block, `tags` reference any units they `use`.

The event `kind` is provisional. The EGS ecosystem will register a dedicated NIP for MAPS events, or use the `30040`–`30049` range for parameterized replaceable events. The `d` tag provides the addressable identifier.

---

## Mark Semantics

### Values

All Mark values are non-negative integers. The value `0` means the Mark is absent (no tokens). There is no upper bound specified by the notation — implementations may impose platform-specific limits.

### Initial Marking

A State's initial marking is declared in its `state` declaration:

```maps
state (alive) {
  marks: fuel = 8192, ammo = 33
}
```

### Consumption and Production

- `−fuel` consumes 1 fuel (equivalent to `−1 fuel`)
- `−3 ammo` consumes 3 ammo
- `+velocity` produces 1 velocity
- `+1 score` produces 1 score

Consumption that would reduce a Mark below zero is illegal — the arc cannot fire. This is equivalent to an implicit guard `mark >= consumption_amount`.

### Mark Scope

A Mark belongs to the State it is declared on. Guard expressions on arcs reference Marks by name. The Mark name is resolved from the State on the input side of the arc:

```maps
(alive)-|fuel > 0, −fuel|->[thrust]->(alive)
#         ^^^^   ^^^^
#         These reference marks on (alive)
```

When a path crosses multiple States, mark references on an input arc refer to the source State's marks. Mark references on an output arc refer to marks being deposited on the target State.

---

## Formal Grammar

The following grammar is in extended Backus-Naur form (EBNF). Terminals are in double quotes. Nonterminals are in lowercase. `{ ... }` means zero or more repetitions. `[ ... ]` means optional.

```ebnf
(* File structure *)
maps_file         = { import_stmt | definition | comment } ;

import_stmt       = "import" STRING NEWLINE ;

definition        = ps_decl | system_def | mechanic_def ;

(* Possibility Space — Level 4 *)
ps_decl           = "possibility_space" IDENT "{" ps_body "}" ;
ps_body           = { agent_decl | use_stmt | state_decl | verb_decl
                    | path_stmt | comment } ;

(* System — Level 3 *)
system_def        = "define" "system" IDENT "{" system_body "}" ;
system_body       = { use_stmt | state_decl | path_stmt | comment } ;

(* Mechanic — Level 2 *)
mechanic_def      = "define" "mechanic" IDENT "{" mechanic_body "}" ;
mechanic_body     = { state_decl | verb_decl | path_stmt | comment } ;

(* No nesting: all define blocks appear at file top level *)

(* Agent declaration *)
agent_decl        = "agents:" ident_list NEWLINE ;

(* State declaration *)
state_decl        = "state" state_ref "{" { state_field } "}" ;
state_field       = marks_decl | visibility_decl ;
marks_decl        = "marks:" mark_init { "," mark_init } ;
mark_init         = IDENT "=" INTEGER ;
visibility_decl   = "visible_to:" visibility_target ;
visibility_target = "all" | "none" | ident_list ;

(* Verb declaration *)
verb_decl         = "verb" verb_ref "{" { verb_field } "}" ;
verb_field        = temporal_decl | schema_decl ;
temporal_decl     = "temporal:" ( "instant" | "sustained" | "committed" ) ;
schema_decl       = "schema:" ( "capability" | "content" ) ;

(* Use statement *)
use_stmt          = "use" reference [ "as" IDENT ] [ "(" bindings ")" ] NEWLINE ;
reference         = nostr_ref | IDENT ;
nostr_ref         = "nostr:" NADDR ;
bindings          = binding { "," binding } ;
binding           = IDENT "=" IDENT ;

(* Path statements — the core syntax *)
path_stmt         = node ( arc node )+ NEWLINE ;

node              = state_ref | verb_ref ;
state_ref         = "(" IDENT ")" ;
verb_ref          = "[" IDENT "]" ;

(* Arcs *)
arc               = choice_arc | flow_arc ;
choice_arc        = "=>" [ "|" arc_body "|" ] ;
flow_arc          = ( "->" | "<-" ) [ "|" arc_body "|" ]
                  | "-|" arc_body "|->" 
                  | "<-|" arc_body "|-" ;

(* Arc body: strictly ordered — guards, then effects *)
arc_body          = [ guard_list ] [ "," ] [ effect_list ] ;
guard_list        = guard_expr { "," guard_expr } ;
effect_list       = effect { "," effect } ;
effect            = consume | produce | weight ;

consume           = "−" [ INTEGER ] IDENT ;
produce           = "+" [ INTEGER ] IDENT ;
weight            = "~" weight_expr ;
weight_expr       = NUMBER | IDENT | "(" weight_arith ")" ;
weight_arith      = weight_term { ( "+" | "-" ) weight_term } ;
weight_term       = weight_factor { ( "*" | "/" ) weight_factor } ;
weight_factor     = [ "-" ] ( NUMBER | IDENT | "(" weight_arith ")" ) ;

(* Guard expressions — comparisons and logical connectives only, no arithmetic *)
guard_expr        = or_expr ;
or_expr           = and_expr { "OR" and_expr } ;
and_expr          = not_expr { "AND" not_expr } ;
not_expr          = [ "NOT" ] predicate ;
predicate         = operand comp_op operand | "(" or_expr ")" ;
comp_op           = "==" | "!=" | "<" | ">" | "<=" | ">=" ;
operand           = IDENT | INTEGER ;

(* Shared terminals *)
ident_list        = IDENT { "," IDENT } ;
comment           = "#" { ANY_CHAR } NEWLINE ;

(* Lexical rules *)
IDENT             = LOWER { LOWER | DIGIT | "_" } ;
LOWER             = "a" | "b" | ... | "z" ;
DIGIT             = "0" | "1" | ... | "9" ;
INTEGER           = DIGIT { DIGIT } ;
NUMBER            = INTEGER [ "." INTEGER ] ;
NADDR             = (* bech32-encoded Nostr addressable identifier *) ;
STRING            = '"' { ANY_CHAR - '"' } '"' ;
NEWLINE           = U+000A ;
```

### Grammar Notes

1. **No indentation structure.** Unlike DIGS, MAPS uses braces for block structure. This makes the notation viable in Nostr event `content` fields where indentation may not be preserved by all relay implementations.
2. **All identifiers are lowercase.** This prevents ambiguity with the uppercase logical operators `AND`, `OR`, `NOT`.
3. **The `−` in consume effects is the Unicode minus sign (U+2212).** This distinguishes mark consumption from other uses of the minus character. A parser SHOULD accept both U+2212 and U+002D in the consume position for convenience. When written by a tool, U+2212 is canonical.
6. **Guard expressions contain no arithmetic.** Guards test marks against values and combine tests with logical operators. Derived quantities are computed by Verbs and stored as Marks. Weight expressions (`~`) permit arithmetic for probability ratios (e.g., `~(1 − risk)`) because weights describe mathematical relationships between probabilities, not gameplay computation.
4. **Arc syntax is flexible.** Both `(a)-|guard|->[b]` (pipe-delimited inline) and `(a)->|guard|[b]` (pipes after arrow) are valid. The EBNF captures both forms.
5. **State and Verb references are the same in paths and declarations.** `(alive)` in a path and `state (alive) { ... }` in a declaration refer to the same node.

---

## Verification Properties

A compliant tool SHOULD verify the following properties. Violations are warnings at minimum.

### Bipartite Invariant

Every arc in every path connects a State to a Verb or a Verb to a State. A path `(a)->(b)` (State to State) or `[a]->[b]` (Verb to Verb) is a syntax error.

The parser enforces this structurally: the EBNF requires `node (arc node)+` where nodes alternate between `state_ref` and `verb_ref`.

### Name Uniqueness

Within a single `define` block or `possibility_space` declaration, each State name refers to exactly one node and each Verb name refers to exactly one node. Two paths that both mention `(alive)` within the same block refer to the same State node — this is DRY node reuse by name.

Across different `define` blocks, names are independent. A Mechanic `torpedo_fire` and a Mechanic `collision_detect` may both contain a State named `(active)` — these are different nodes. They become the same node only through explicit `use` binding.

### Mark Non-Negativity

No firing sequence should reduce a Mark below zero. An arc that consumes `−3 ammo` implies a guard `ammo >= 3` even if not written explicitly. Tools SHOULD warn if a consume effect has no corresponding explicit guard.

### Agent Completeness

Every `possibility_space` must declare at least one agent. Every `=>` (choice arc) implies an agent is making the choice. If a Possibility Space contains `=>` arcs but declares no agents, the Possibility Space is incomplete.

---

## Deliberate Exclusions

The notation does not and will never express:

| Excluded Feature | Rationale | Where It Belongs |
|------------------|-----------|-----------------|
| Timing / real-time flow | Varies by genre. Turn-based and continuous games share mechanics; timing is orthogonal. | RUNS execution / runtime |
| Random number generation | Implementation detail. Probability weights (`~0.8`) describe the design intent; the RNG algorithm belongs to the runtime. | RUNS Processors |
| Visuals / audio | Presentation layer. | AEMS Manifestations |
| Platform specifics | Keeps rules neutral. | RUNS compilation |
| Play state (current marking during play) | The notation describes the graph and initial marking. Runtime state belongs to the runtime. | RUNS Records |
| Execution order | The notation describes which transitions are possible, not the order they fire in. Scheduling is a runtime concern. | RUNS Network topology |
| Implementation logic | A MAPS Verb says "thrust happens." A RUNS Processor says how. | DIGS expression bodies |
| Arithmetic in guards | Guards observe; they don't compute. Derived quantities are computed by Verbs and stored as Marks. Guards read the result. | Verbs (MAPS) / Processors (DIGS) |
| Memory management | The notation is a graph description, not a program. | N/A |

---

## Versioning

### File Header

Every `.maps` file begins with a version declaration:

```maps
#! maps 1.0
```

This declares which version of the MAPS textual notation the file is written in. A tool must support every version it claims compliance with.

### Evolution Rules

1. **Additive only** — Future versions may add new keywords, new declaration fields, or new arc annotations. They may never remove or change the semantics of existing constructs.
2. **Version 1.0 is forever** — A `.maps` file valid under version 1.0 will be valid under every future version. Its meaning will never change.
3. **No feature flags** — The version number is the only mechanism for feature gating. There are no tool flags, pragmas, or conditional compilation directives.

---

## Reference Implementation Bootstrap

The minimum viable tooling for the first MAPS parser consists of:

### 1. Reference Grammar File

The EBNF grammar in this document, published as a machine-readable PEG file. This file is the canonical syntax definition.

### 2. Reference Parser

A single-file parser that reads `.maps` source text and emits the graph structure as JSON. The JSON representation must capture:
- All State and Verb nodes with their declared properties
- All Arcs with their guards, effects, and weights
- All `define` blocks with their composition level and identifier
- All `use` statements with their references and bindings
- The `possibility_space` declaration with its agents and composition

Estimated size: 400–700 lines.

### 3. Reference Graph Validator

A tool that reads a parsed MAPS graph and verifies the structural properties:
- Bipartite invariant (no State-State or Verb-Verb arcs)
- Name uniqueness within scopes
- Mark non-negativity (consume effects have corresponding guards)
- Agent completeness (Possibility Spaces with choice arcs declare agents)
- Binding completeness (all `use` bindings resolve to existing States)

Estimated size: 200–400 lines.

### 4. Test Vectors

For the first MAPS Possibility Space (Spacewar!), the graph structure expected from parsing:

| Input | Expected Graph |
|-------|---------------|
| Single Mechanic (torpedo_fire) | 2 States, 1 Verb, 2 Arcs, 1 guard, 1 consume, 1 produce |
| Single System (ship_combat) | 3 `use` references resolved to Mechanic events |
| Complete Possibility Space (spacewar) | 2 agents, 5 System references, all cross-System State bindings resolved |

These test vectors verify that a parser's output matches the reference parser's output for the same input.

---

## Relationship to Other EGS Components

```
  MAPS Notation          RUNS Source Files           Compiled Game
  (design artifact)      (enduring artifact)         (platform binary)

  States  ─────────────→ Records (.runs)
  Verbs   ─────────────→ Processors (.runs-prim)  ──→ native functions   ← DIGS governs
  Arcs    ─────────────→ Networks (.runs)          ──→ compiled schedule  ← NETWORK_TOPOLOGY governs
  Marks   ─────────────→ Record fields             ──→ runtime state
  PSpaces ─────────────→ Top-level Networks        ──→ tick entry points
```

### RUNS (Records Update on Neutral Substrate)

RUNS implements MAPS. A MAPS State becomes a RUNS Record schema. A MAPS Verb becomes a RUNS Processor. MAPS Arcs with guards become RUNS Network arcs with guard expressions (using DIGS expression syntax). The relationship is design-to-implementation: MAPS is the notation, RUNS is the source code, the compiled binary is the performance.

MAPS Marks correspond to RUNS Record fields (typed values on Records). MAPS guard expressions correspond to DIGS boolean expressions evaluated in Network dispatch arcs.

### AEMS (Asset-Entity-Manifestation-State)

AEMS defines the things that MAPS rules act upon. A MAPS Mechanic requiring "a key" expects an AEMS Entity with a `key` role. MAPS describes the rules; AEMS holds the things those rules reference.

### WOCS (Work Offered, Claimed, Settled)

WOCS coordinates services around shared MAPS Possibility Spaces. Pattern registries, matchmaking for games described by a given Possibility Space, coordinated playtesting — these are WOCS coordination tasks.

### DIGS (Deterministic Inspectable Game Syntax)

DIGS defines computation within RUNS Processors. MAPS does not use DIGS directly — MAPS guard expressions are pure boolean predicates (comparisons and logical connectives, no arithmetic, no type system). When a MAPS Possibility Space is implemented in RUNS, MAPS guards are compiled into DIGS expressions. Any derived quantity that a MAPS guard tests was computed by a DIGS Processor and stored in a RUNS Record.

---

## The Conversation Model

The Petri net cycle `(state) => [verb] -> (state)` is structurally identical to Crawford's conversation model:

1. **Listen** — the agent reads the current marking (visible Marks on visible States)
2. **Think** — the agent evaluates which Verbs are enabled (which `=>` arcs have satisfied guards)
3. **Speak** — the agent selects and fires one enabled Verb
4. **Listen** — Marks flow, simulation-expressed Verbs (`->`) fire in response, and the next conversation turn begins

This is not a metaphor. It is a structural identity. The MAPS notation encodes the conversation model without translation. Every `=>` arc is a decision point where the agent has agency. Every `->` arc is a consequence the system resolves. A MAPS Possibility Space is a complete description of every conversation the game can have.

---

*MIT License — Open for implementation, extension, critique.*
