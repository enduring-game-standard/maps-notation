# T5: Schema Separation Formalism

**Priority:** High — defines the structural ontology of any MAPS Score  
**Status:** Open  
**Depends on:** T1 (needs a syntax to express schemas in)  
**Blocks:** Any Score that intends to separate what the agent can do from what the world affords

---

## Problem

MAPS RESEARCH.md defines four schema levels: Capability Schema, Content Schema, Content Instance, and Play State. The conceptual definitions are clear. The formal notation for writing, reading, and distinguishing them does not exist.

A designer writing a MAPS Score needs to know: "This part is the Capability Schema. This part is the Content Schema. This part is a Content Instance." A reader studying a Score needs to see those boundaries on the page. A tool analyzing a Score for composability needs to parse which States and Verbs belong to which schema.

Without formalism, the schema separation is a mental model — useful for thinking, useless for notation.

## The Four Levels, Precisely

### Capability Schema
What the agent can do. The full graph of Verbs available to an agent, their preconditions, and their effects. This graph travels with the agent into every situation — Link's moveset is the same in every dungeon. The Capability Schema is the "sphere" in the sphere-on-surface model.

**Properties:**
- Defined per agent type (not per situation)
- Portable across Content Instances
- Contains Verbs, their precondition Arcs (including guards), and their effect Arcs
- Contains the Mark types that the agent carries (health, ammo, inventory)
- Does NOT contain the specific States of the world — it contains *interface points* where the agent's Verbs can connect to world States

### Content Schema
What the world affords. The vocabulary of world elements and how they interface with agent capabilities. "Dungeons contain rooms. Rooms connect via doors. Doors can be locked. Locked doors require keys." This is the "surface" in the sphere-on-surface model.

**Properties:**
- Defined per game (or per game mode)
- Contains world State types and their possible Mark types
- Contains *interface points* where agent Verbs can dock
- Contains simulation-expressed Verbs (world rules: gravity, collision, decay)
- Does NOT contain specific spatial arrangements — that's Content Instance

### Content Instance
A specific authored arrangement of Content Schema elements. "The Deku Tree has 15 rooms, these connections, these enemy placements." A level. A scenario. A particular configuration of the Content Schema's vocabulary.

**Properties:**
- Defined per authored experience (level, scenario, campaign)
- Contains specific States with specific initial Marks
- Contains specific Arcs between specific States
- Authored by a designer, not derived from rules

### Play State
The current token distribution during a session. "Link is in room 3, has 2 hearts, has killed Deku Baba #1." This is runtime-only and excluded from MAPS notation entirely.

## The Hard Design Questions

### 1. How does Capability dock with Content?

The sphere-on-surface model says: the sphere has interface points, the surface has compatible sockets. When Link walks to a bombable wall, his `bomb` Verb becomes "grounded" — its precondition Arc connects to a world State (`wall_intact`) that satisfies the Verb's requirement.

Formally, this means:
- A Capability Schema Verb has precondition Arcs that reference *abstract State types* rather than specific States
- A Content Schema declares States that satisfy those type requirements
- Docking is the process of binding abstract type references to concrete States

This is structurally similar to Pattern interface binding (T3). The Capability Schema is effectively a Pattern with unbound interface States, and the Content Schema provides the bindings.

**Key question:** Is docking the same mechanism as Pattern composition (T3), or does it need its own semantics? If the same, the Capability Schema IS a Pattern, and importing it into a Content Schema IS composition.

### 2. Where do simulation-expressed Verbs live?

Gravity, collision, and decay are world rules — they belong to the Content Schema, not the Capability Schema. But they are Verbs in the Petri net — transitions that fire when their guards are satisfied. They need to be notated somewhere.

The Content Schema seems right: it defines what the world *does*, including things the world does automatically. The Capability Schema defines what the *agent* does by choice. This aligns with the bipartite node distinction — both are Verbs in the graph, but they live in different schemas.

### 3. How does the textual syntax demarcate schemas?

Options:
- **Separate files**: Capability Schema in one file, Content Schema in another, Content Instance in a third
- **Sections within a Score**: labeled blocks (`capability:`, `content:`, `instance:`)
- **Namespace convention**: States/Verbs prefixed by schema (`cap:thrust`, `world:gravity`, `inst:room_3`)
- **Structural inference**: the schema a node belongs to is determined by its topological role (interface State = Capability, world State = Content, specific State = Instance)

### 4. How does schema separation interact with the Petri net?

A composed Score is a single Petri net. But it is *sourced* from three layers. The schema separation must be recoverable from the composed net — given a flat graph, a tool should be able to determine which nodes came from which schema level. This implies that schema membership is an attribute on nodes, not just an authoring convention.

## Deliverables

1. **Formal definition** of each schema level in terms of MAPS primitives — what kinds of States, Verbs, Arcs, and Marks each level contains
2. **Interface specification** — how Capability Schemas declare their docking points, and how Content Schemas declare compatible sockets
3. **Docking semantics** — formally, what happens when a Capability Schema binds to a Content Schema (is it place fusion? Something else?)
4. **Textual syntax** for demarcating schemas within a Score (coordinated with T1)
5. **Worked example** — a Zelda-like Capability Schema (move, sword, bomb, hookshot) docked with a dungeon Content Schema (rooms, locked doors, enemies, puzzles), instantiated as a specific Content Instance (a 5-room dungeon)

## Open Questions

- Can a single Verb belong to both the Capability Schema and the Content Schema? (e.g., "thrust" is a player choice, but its *effect* involves world rules like gravity and inertia)
- Can Content Schemas compose with each other the way Patterns do? (e.g., a dungeon Content Schema + an overworld Content Schema in the same game)
- How does multiplayer work here? Two agents with different Capability Schemas operating on the same Content?
- Should the Play State exclusion be explicitly marked in the notation (e.g., a `runtime:` block that names the Play State Fields without defining their behavior)?
