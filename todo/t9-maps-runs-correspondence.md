# T9: MAPS↔RUNS Correspondence

**Priority:** High — defines the relationship between the two most mature EGS protocols  
**Status:** Open  
**Depends on:** T1 (MAPS needs a syntax before the correspondence can be specified), T5 (schema separation determines what MAPS expresses, which bounds what the correspondence covers)  
**Blocks:** Tooling that generates RUNS scaffolding from MAPS Scores, verification that a RUNS implementation conforms to a MAPS Score, and the broader EGS promise that "MAPS is the blueprint, RUNS is the source"

---

## Problem

The RUNS spec states: "States are implemented as Records, Verbs as Processors, Arcs as Network wiring." The MAPS README says: "A designer writing a combat system in MAPS notation writes the blueprint from which RUNS source is built." The EGS framing doc says the relationship is "design-to-implementation."

These statements are directionally correct but formally underspecified. The correspondence is not a mechanical translation — it's a relationship between two fundamentally different descriptions of the same game. Formalizing what that relationship *preserves* and what it *leaves free* is essential for:

1. **Designer-developer communication** — a designer hands a MAPS Score to a developer and says "build this." What exactly has been specified, and what is the developer free to decide?
2. **Conformance checking** — given a MAPS Score and a RUNS implementation, how do you verify that the implementation "conforms to" the Score? What does conformance even mean?
3. **Tooling** — a build tool that scaffolds RUNS Networks from MAPS Scores needs precise rules for what to generate and what to leave as stubs.

## The Nature of the Relationship

### What it is NOT

It is not a translation. You cannot mechanically convert a MAPS Score into a complete RUNS implementation, because:
- MAPS deliberately excludes numerical specifics (how much gravity, what fixed-point format, what collision radius). RUNS must specify these exactly.
- MAPS deliberately excludes execution ordering. RUNS Networks define strict phase sequencing when ordering affects outcomes.
- MAPS may describe a Verb ("thrust") that corresponds to an entire RUNS sub-Network of multiple Processors (rotation → gravity → thrust → integration → wrapping).
- A RUNS implementation may contain Processors invisible to MAPS entirely — numerical primitives (sin, cos, sqrt, divide), platform arithmetic types, PRNG state management — because these are implementation concerns the design notation doesn't care about.

It is not a compilation — a MAPS Score is not "compiled into" RUNS the way DIGS source is compiled into platform binaries.

### What it IS

It is a *structural correspondence with specified invariants*. The correspondence says: "these elements in the MAPS Score map to these elements in the RUNS implementation, and certain structural properties are preserved." Everything not addressed by the correspondence is free for the implementer to decide.

The analogy that fits best: the relationship between a *building program* (the architect's description of what spaces the building must contain, how they connect, what activities they support) and the *construction documents* (the engineer's specification of every beam, pipe, and circuit). The program constrains the documents — the building must contain these spaces with these relationships. The documents exceed the program — they specify structural and mechanical details the program deliberately ignores.

## What the Correspondence Must Specify

### 1. Element mapping

| MAPS | RUNS | Cardinality | Notes |
|------|------|-------------|-------|
| State | Record (or Fields on a Record) | 1:many | A single MAPS State may correspond to multiple RUNS Fields or a compound Record |
| Verb (agent-chosen) | Processor or sub-Network | 1:many | A Verb may require multiple Processors to implement |
| Verb (simulation-expressed) | Processor or sub-Network | 1:many | Gravity, collision, decay — world rules implemented as Processors |
| Arc (with guard) | Network wiring with guarded transition | 1:1 | Guards on Arcs correspond directly to guard expressions in Network dispatch |
| Mark | Field (numeric) on a Record | 1:1 | Mark types map to Field types; Mark quantities map to Field values |
| Pattern | Sub-Network or Network bundle | 1:1 | A composed Pattern maps to a composed sub-Network |

The 1:many cardinality is the critical point. A single MAPS Verb ("thrust") may expand into an entire RUNS pipeline. This is not a defect — it's the nature of the design-to-implementation relationship.

### 2. Structural invariants (what must be preserved)

- **Reachability**: If a MAPS Score says State A can transition to State B via some path of Verbs and Arcs, the RUNS implementation must preserve that reachability. You can't add a RUNS guard that blocks a transition the MAPS Score says is possible.
- **Precondition satisfaction**: If a MAPS Verb has a guard `fuel > 0`, the corresponding RUNS Processor(s) must enforce the same condition. The guard cannot be weakened (allowing thrust with empty fuel) or strengthened (requiring fuel > 10 when MAPS says > 0) without deviating from the Score.
- **Mark flow conservation**: If a MAPS Arc consumes 1 fuel and produces 1 score, the RUNS implementation must consume and produce the same quantities on the corresponding Fields. Marks cannot appear or vanish in ways the Score doesn't describe.
- **State coverage**: Every MAPS State must correspond to a distinguishable RUNS configuration. If MAPS says entities can be in states {active, exploding, hyperspace, dead}, the RUNS implementation must have a mechanism that distinguishes these states.
- **Verb completeness**: Every MAPS Verb (both agent-chosen and simulation-expressed) must have a corresponding RUNS implementation. You can't drop a Verb and claim conformance.

### 3. Implementation freedoms (what need NOT be preserved)

- **Execution order**: MAPS says nothing about whether gravity computes before thrust or after. RUNS determines this.
- **Numerical representation**: MAPS says "fuel > 0." RUNS decides whether fuel is an int, a fixed-point value, or a float, and what overflow behavior it has.
- **Internal decomposition**: MAPS says "thrust." RUNS can implement it as one Processor or ten. The decomposition is invisible to the Score.
- **Performance optimization**: RUNS can fuse Processors, batch entity updates, parallelize phases — none of which MAPS constrains.
- **Platform specifics**: Display resolution, input mapping, tick rate, rendering pipeline — all RUNS/runtime territory.
- **Additional Processors**: RUNS can include Processors that have no MAPS counterpart (sin/cos lookup tables, PRNG state management, debug visualization) as long as they don't violate the structural invariants.

## Key Design Decisions

### 1. Is conformance binary or graded?

Does a RUNS implementation either conform to a MAPS Score or not? Or can it "partially conform" (preserves some invariants, relaxes others)?

Binary conformance is cleaner formally but may be too rigid for practical use. A game that follows the MAPS Score for 95% of its mechanics but adds one unlisted Verb shouldn't be "non-conforming" — it's an *extension*. Conformance should probably mean "preserves all invariants of the Score and may additionally include elements not described by the Score."

### 2. How to express the correspondence formally

Options:
- A separate "correspondence document" that maps each MAPS element to its RUNS counterpart, published alongside both artifacts
- Annotations in the RUNS source that reference MAPS elements (`# implements maps:thrust`)
- Annotations in the MAPS Score that hint at expected RUNS decomposition (probably undesirable — couples the notation to implementation)
- Tooling that infers the correspondence from naming conventions and structural matching

### 3. Can the correspondence be verified automatically?

Given a MAPS Score and a RUNS implementation with correspondence annotations, can a tool verify conformance? This requires:
- Parsing both artifacts
- Checking reachability preservation
- Checking guard equivalence (MAPS guard expressions vs. RUNS guard expressions)
- Checking mark flow conservation

This is potentially decidable for finite-state games. For games with unbounded marks (integer quantities), some checks may require approximation.

### 4. Where does this specification live?

Options:
- In the MAPS spec (defines what conformance means from the notation side)
- In the RUNS spec (defines what it means to "implement a MAPS Score")
- A separate bridge document owned by both
- In the EGS overview (protocol-level relationship specification)

## Deliverables

1. **Formal correspondence definition** — element mapping table with cardinality and constraints
2. **Structural invariant specification** — the precise list of properties a RUNS implementation must preserve to "conform to" a MAPS Score
3. **Implementation freedom specification** — the precise list of decisions left to the RUNS implementer
4. **Conformance definition** — what it means for a RUNS implementation to conform, including handling of extensions
5. **Worked example** — the Spacewar! MAPS Score (once written) alongside the existing `runs-spacewar` implementation, with the correspondence explicitly mapped and invariants verified
6. **Tooling requirements** — what a conformance-checking tool would need to verify, and which checks are decidable

## Open Questions

- Should MAPS Scores be publishable without any RUNS implementation? (Yes — the Score has independent value as a design artifact. But should the spec say so explicitly?)
- Can a single RUNS implementation conform to multiple MAPS Scores? (e.g., a game that implements both a combat Score and an exploration Score)
- How does correspondence interact with Pattern composition (T3)? If a Score imports a Pattern, does the RUNS implementation need to preserve the Pattern boundary, or can it flatten everything?
- Should the correspondence specification be versioned independently from both MAPS and RUNS specs?
- How does this relate to AEMS? A MAPS Score references entities (the things Marks represent). Those entities are defined in AEMS. Does the correspondence extend to a three-way MAPS↔RUNS↔AEMS relationship?
