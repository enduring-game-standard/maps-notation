# T3: Composition Semantics

**Priority:** High — required for the Pattern/Score architecture to function  
**Status:** Open  
**Depends on:** T1 (needs a syntax to express composition in)  
**Blocks:** T4 (Library Patterns can't be formalized without composition rules), any Score that imports Patterns

---

## Problem

MAPS Notation is built on the promise that mechanics are composable: Atoms compose into Patterns, Patterns compose into Scores. Patterns are versioned, importable, and extensible. A designer imports `maps:locked-transition@1.0`, wires its interface States into their own Score, and the mechanics snap together.

None of this has been formally defined. The README describes the hierarchy (Atom → Pattern → Score) and shows a YAML import statement, but the actual semantics of composition — how graphs merge, how interfaces bind, how extension works, how conflicts resolve — are unspecified.

Without composition semantics, Patterns are aspirational labels rather than functional units.

## What "Composition" Actually Means in Petri Net Terms

When two Petri net subnets compose, specific places (States) in one subnet are *identified* with specific places in the other — they merge into a single shared place. This is called *place fusion*. The result is a single net where tokens in the fused place are visible to transitions from both original subnets.

MAPS composition is fundamentally place fusion: a Pattern exposes interface States, and the importing Score binds those interface States to its own States. After binding, they are the same State — Marks placed there by one Pattern's Verbs are visible to another Pattern's Verbs.

This means composition semantics must define:
1. **Interface declaration** — how a Pattern declares which of its States are exposed for binding
2. **Binding** — how a Score connects its own States to a Pattern's interface States
3. **Fusion** — the formal result of binding: two States become one, all Arcs are redirected
4. **Scoping** — what happens to a Pattern's internal (non-interface) States: are they hidden, namespaced, or flattened?

## Design Constraints

### Must be semantically precise
Place fusion is well-defined in Petri net theory. MAPS composition must preserve this formal foundation — a composed Score must be reducible to a single flat Petri net with unambiguous token semantics. If composition introduces ambiguity (e.g., two Patterns writing to the same fused State in conflicting ways), the semantics must detect and reject the conflict or define a resolution order.

### Must support versioning
Patterns are versioned (`@1.0`, `@2.1`). A Score that imports `@1.0` must not break if `@2.0` exists. Versioning semantics must define what constitutes a breaking change (adding a new interface State? Removing one? Changing a guard?). Semver is a reasonable starting point but must be adapted to graph composition rather than API signatures.

### Must support extension
A designer should be able to take `maps:locked-transition@1.0`, add a new Verb (`kick`), and publish the result as a new Pattern. Extension semantics must define: does the extended Pattern inherit the original's interface? Can it add new interface States? Can it override guards on existing Arcs?

### Must support independent authorship
Two Pattern authors who have never communicated should be able to publish Patterns that a third designer imports into the same Score without conflicts. This means internal States must be scoped by Pattern identity, and interface binding must be explicit (not automatic name-matching).

## Key Design Decisions

### 1. Interface declaration syntax
How does a Pattern declare its interface States?

Options:
- Explicit `interface:` section listing exposed States
- Convention: States named with a specific prefix (e.g., `@idle`) are interface States
- All States are exposed by default; internal States must be explicitly marked private

The explicit interface section is clearest. It separates the Pattern's public contract from its internal topology.

### 2. Binding syntax
How does a Score connect its States to a Pattern's interface States?

The conceptual operation is: "my State `near_door` IS Pattern's State `location`." Options:
- Assignment syntax: `maps:locked-transition@1.0 { location = near_door, opened = door_open }`
- Positional: `use maps:locked-transition@1.0(near_door, door_open)`
- Declaration block with named bindings

### 3. Mark conflict resolution
If two Patterns both produce Marks on a fused State, what happens? Options:
- Additive by default (both contribute Marks to the shared pool)
- Error — conflicting mark types on a fused State must be resolved by the Score author
- Explicit merge strategy declared at binding time

### 4. Extension mechanics
When extending a Pattern, what operations are allowed?
- **Add** — new States, Verbs, Arcs, Marks (always safe)
- **Override** — replace a guard on an existing Arc (potentially breaking for downstream dependents)
- **Remove** — delete an existing Verb or Arc (breaking change)
- **Rename** — rename internal elements (non-breaking if interfaces unchanged)

A clear taxonomy of safe vs. breaking operations feeds directly into versioning rules.

### 5. Hierarchical vs. flat composition
When a Score imports a Pattern, is the Pattern:
- **Inlined** — its topology is flattened into the Score's graph, with interface States fused and internal States namespaced
- **Nested** — it remains a visually and structurally distinct subgraph within the Score, with interface connections crossing the boundary
- **Either** — the composer chooses, with inlined being the default for analysis and nested for readability

## Deliverables

1. **Formal specification** of place fusion semantics adapted for MAPS (States, Marks, guards)
2. **Interface declaration syntax** in the T1 textual format
3. **Binding syntax** for connecting imported Pattern interfaces to Score States
4. **Extension rules** — taxonomy of safe/breaking operations with versioning implications
5. **Conflict detection rules** — when does composition produce an invalid net, and how is the error reported?
6. **Worked example** — a Score that imports two Patterns, binds their interfaces to shared States, extends one with an additional Verb, and the resulting flat net shown alongside the composed form

## Open Questions

- Can a Pattern import other Patterns? (Transitive composition.) If so, how deep can nesting go?
- How should diamond dependencies be handled? (Score imports Pattern A and Pattern B, both of which import Pattern C — should C be fused or duplicated?)
- Should there be a concept of "abstract Patterns" — Patterns that declare interface States and Verbs but leave some Arcs unspecified, to be filled in by the importer? (Like abstract classes.)
- How does composition interact with temporal structure (T6)? If Pattern A is turn-based and Pattern B is real-time, what does their composition mean?
