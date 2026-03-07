# MAPS Notation — Mechanics and Play Structures

🏠 **[Overview](https://github.com/enduring-game-standard)** · 🔧 **[RUNS](https://github.com/enduring-game-standard/runs-spec)** · 📦 **[AEMS](https://github.com/enduring-game-standard/aems-schema)** · ⚡ **[WOCS](https://github.com/enduring-game-standard/wocs-protocol)** · 🎼 **[MAPS Notation](https://github.com/enduring-game-standard/maps-notation)** · ❓ **[FAQ](https://github.com/enduring-game-standard/.github/blob/main/profile/FAQ.md)**

> **Status**: Draft / RFC  
> **Version**: 0.1.0

---

Games are structured conversations between agent and world. Chris Crawford named the principle in 1984; Raph Koster showed that the conversations teach through their mechanics; Jonathan Blow demonstrated that they can carry philosophical argument. The medium's expressive power has never been in doubt. What has been missing is a way to write the conversation down.

Music faced the same problem for centuries. Melodies passed from teacher to student by ear, mutating with each generation, vanishing when lineages broke. Then Guido d'Arezzo placed notes on a staff, and music gained a written form — portable across languages, analyzable by anyone who could read, preservable beyond any single performer's lifetime. Five centuries of cumulative composition followed. The staff did not compose music. It made composition *transmissible*.

Games today fuse their mechanics into executable code — opaque, fragile, and locked to one implementation. When a studio closes, the rules themselves disappear with the codebase. Genres evolve through imitation rather than study, because there is no way to read a mechanic apart from its rendering. Each generation of designers starts nearly from scratch.

The **MAPS Notation** provides a neutral, implementation-agnostic notation for describing game mechanics as open rulebooks. While [RUNS](https://github.com/enduring-game-standard/runs-spec) defines *the game* — how it executes each frame through data flow — and [AEMS](https://github.com/enduring-game-standard/aems-schema) defines *the things* that participate, MAPS defines *the rules*: the states, actions, transitions, and resources that shape play.

Think of it as sheet music for gameplay: sufficient to convey the interactive structure clearly, leaving performance — execution, visuals, timing — to specialized interpreters.

## A Converging Lineage

The four primitives described below did not emerge from a single design session. They represent a convergence across decades of independent work on formalizing interactive systems.

Carl Adam Petri introduced Petri nets in 1962 — a mathematical formalism for modeling concurrent, discrete-event systems using places, transitions, and tokens. Stéphane Bura applied Petri-net thinking directly to game design, mapping places to game states and transitions to player actions. Joris Dormans extended this approach into Machinations, a visual language for diagramming and simulating game economies as resource flows between nodes. Cameron Browne's Ludii system, developed under the Digital Ludeme Project at Maastricht University, decomposed over a thousand traditional strategy games into fundamental conceptual units called ludemes — proving that a common grammar could describe games spanning millennia of human history.

These projects, alongside contributions from Raph Koster, Daniel Cook, and the work surveyed in the book's Chapter 13, point to the same structural insight: interactive systems share a small set of recurring formal elements. MAPS Notation distills that convergence into four primitives — State, Verb, Arc, Mark — designed to be the minimal sufficient vocabulary for describing game mechanics as readable, composable artifacts.

## Core Primitives

These four primitives form the atomic units of any interactive structure.

| Primitive | Purpose                              | Key Attributes                                      | Notes                              |
|-----------|--------------------------------------|-----------------------------------------------------|-------------------------------------|
| **State** | Observable condition or situation    | ID, description, visibility rules                   | The "nouns" of position in play    |
| **Verb**  | Available action or affordance       | ID, preconditions (Arcs in), effects (Arcs out)      | The bridge from observation to agency |
| **Arc**   | Directed transition or requirement   | Source → Target, min Marks, guard expressions, consume/produce Marks | The "rules" governing flow         |
| **Mark**  | Token or quantifiable resource       | Type, quantity (numeric or structured)              | Tracks progress, inventory, score  |

### Detailed Definitions

**State**  
Represents any distinguishable situation — `door_locked`, `player_alive`, `inventory_full`. A door is either locked or unlocked; a player is either alive or defeated. Visibility rules can mask information for hidden states (fog of war, concealed cards).

**Verb**  
Represents an action the agent can attempt — `open`, `attack`, `trade`. A Verb is enabled when all precondition Arcs are satisfied, including any guards. When multiple Verbs are simultaneously enabled, the player faces a meaningful choice.

**Arc**  
The directional link defining legality and consequences. An Arc may require a minimum quantity of Marks, include a **guard** (a boolean expression evaluated over current Marks, e.g., `strength >= 5` or `inventory.keys >= 1`), and consume or produce Marks upon firing. Guards enable compact representation of ranged conditions without state explosion, while remaining decomposable to pure Petri-net forms.

**Mark**  
Quantifiable resources or tokens placed on States — `health=3`, `ammo=10`, `strength=7`. Marks support numeric values and accessor syntax in guards (e.g., `inventory.bombs >= 1`), allowing future extension to structured data without changing primitives.

## Composition Hierarchy

Primitives combine into higher-level reusable units.

| Level      | Definition                           | Purpose                                             | Example                            |
|------------|--------------------------------------|-----------------------------------------------------|-------------------------------------|
| **Atom**   | Minimal closed interactive loop      | Smallest meaningful unit (often State → Verb → State)| A lever that opens a gate           |
| **Pattern**| Named, versioned cluster of Atoms/primitives | Reusable mechanic with defined interface            | `maps:locked-transition` (a keyed door with precondition) |
| **Score**  | Root composition importing Patterns  | Full game ruleset, defining complete Capability/Content split | A dungeon-crawl ruleset importing locked-transition, resource-acquire, and basic-exchange |

A designer composes a Score by importing Patterns from the [MAPS Library](https://github.com/enduring-game-standard/ludic-notation-library), the community-maintained vocabulary of reusable mechanics. Patterns support extension and forking: a designer can take `maps:locked-transition@1.0`, add a new Verb (e.g., `kick`), and publish the variant as a new versioned Pattern.

## Schema Separation

MAPS Notation enforces a clean division:

- **Capability Schema** — What the agent can do (Verbs and preconditions).
- **Content Schema** — What the world affords (States, Arcs, Marks available).
- **Content Instance** — Specific arrangement (e.g., a level layout placing Marks on States).
- **Play State** — Runtime-only (current position) — excluded from notation.

This separation prevents conflating rules with specific playthroughs. A Score describes a game's mechanics; a Content Instance describes a particular level or scenario; Play State belongs to the runtime. The notation captures the first two. The third is a matter for [RUNS](https://github.com/enduring-game-standard/runs-spec) execution.

## Concrete Example

The following Score describes a door that can be opened with a key or kicked open with sufficient strength. It imports the `locked-transition` Pattern from the MAPS Library and adds an alternative Verb.

```yaml
version: 1.0
imports:
  - maps:locked-transition@1.0

states:
  - id: near_door
  - id: door_open

marks:
  - type: strength
    default: 3
  - type: inventory.keys
    default: 0

verbs:
  - id: open_door
    preconditions:
      - arc:
          source: near_door
          guard: inventory.keys >= 1
          consume: { inventory.keys: 1 }
    effects:
      - arc:
          target: door_open

  - id: kick_door
    preconditions:
      - arc:
          source: near_door
          guard: strength >= 5
    effects:
      - arc:
          target: door_open
```

A reader can trace both paths: an agent at `near_door` with `inventory.keys >= 1` can fire `open_door`, consuming one key and transitioning to `door_open`. Alternatively, an agent with `strength >= 5` can fire `kick_door` without consuming a resource. Both Verbs lead to the same State, but through different mechanical constraints. The Score is complete enough to analyze for fairness, simulate for balance, or export to a RUNS Network for execution.

**Guards in practice.** Guards are evaluated at enablement time using current Marks. Supported operations include comparisons (`>=`, `==`, etc.), arithmetic, and logical connectors. This keeps the notation compact for gradients (health ranges, inventory counts) while preserving non-deterministic choice when multiple Verbs are enabled.

## What the Notation Deliberately Excludes

| Excluded                | Why                                          | Where It Belongs                     |
|-------------------------|----------------------------------------------|--------------------------------------|
| Timing / real-time flow | Varies by genre (turn-based vs. continuous)  | RUNS execution / runtime             |
| Probability & RNG       | Implementation detail                        | Specific Processors                  |
| Visuals / audio         | Presentation layer                           | AEMS Manifestations define; RUNS Processors render |
| Hidden implementation   | Notation must be complete and transparent    | Forbidden                            |
| Platform specifics      | Keeps rules neutral                          | Runtime bindings                     |

These exclusions follow the same discipline that governs TCP/IP (no opinion on content), SMTP (no opinion on rendering), and MIDI (no opinion on timbre). The notation remains a true abstract grammar rather than a biased framework.

## Integration with the Enduring Game Standard

MAPS Notation does not exist in isolation. It is one layer of a jointly necessary architecture.

**MAPS → RUNS.** A Score becomes executable when its primitives map to RUNS components. States become Records. Verbs become Processors. Arcs become the wiring that connects them. The notation is the design-time blueprint; RUNS is the execution-time substrate. A designer writes a Score; a developer implements the corresponding Processors; the RUNS Network executes the result.

**MAPS → AEMS.** AEMS defines the things that MAPS rules act upon. A `maps:locked-transition` Pattern requires something with a `keys` property — that thing is defined in AEMS as an Entity (the named role `key`) with a Manifestation carrying game-specific properties. MAPS describes the rules; AEMS holds the things those rules reference.

**MAPS → WOCS.** WOCS coordinates services around shared Patterns and Scores. A community Pattern registry, matchmaking for games described by a given Score, or coordinated playtesting across implementations — these are WOCS coordination tasks. The notation defines what the game *is*; WOCS enables the ecosystem around it.

### Why Nostr

Scores and Patterns are plain-text artifacts published as Nostr events. This is not a distribution convenience. Nostr provides the commons that makes cumulative craft possible.

When a designer publishes a Pattern as a Nostr event, it becomes discoverable by any relay query, forkable by any other designer, and inheritable across generations without permission from any gatekeeper. A student can query a relay for every Pattern tagged `maps:locked-transition`, study the variants that other designers have published, and build on that accumulated work. When musical staff notation was confined to monastery scriptoria, composition accumulated slowly. When printing made scores widely available, the pace compounded. Nostr is the printing press for game notation: the transmission medium that turns individual Scores into a growing, searchable body of knowledge.

This is what distinguishes MAPS from a file format specification. A JSON schema can describe mechanics. A Nostr event makes them part of a living commons.

## Summary

MAPS Notation turns mechanics into open, composable artifacts — readable as text, analyzable by tools, preservable beyond any single engine or company. The four primitives (State, Verb, Arc, Mark) provide the minimal grammar. [Patterns](https://github.com/enduring-game-standard/ludic-notation-library) provide the shared vocabulary. Nostr provides the commons.

A teenager in Dortmund pulls the combat Patterns from a game whose studio dissolved three years ago, drops them into her own project, swaps the visual layer, and publishes a variant that a competitive community in São Paulo picks up for tournaments. No permission required. The mechanics survived because they were written in notation, not locked in a binary. That is what composable craft looks like.

Contribute a Pattern. Read a Score. Fork a mechanic.

**MIT License** — Open for implementation, extension, critique.