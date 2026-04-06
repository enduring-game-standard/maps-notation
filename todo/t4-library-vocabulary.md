# T4: MAPS Library Vocabulary

**Priority:** Low — the Library is a palette, not a prerequisite  
**Status:** Open  
**Depends on:** T1, T3, T5 (Patterns need syntax, composition rules, and schema formalism before they can be published)  
**Blocks:** Nothing directly — Scores can inline Pattern topology without Library imports

---

## Problem

The MAPS Library currently contains four placeholder Patterns: `resource-acquire`, `resource-consume`, `locked-transition`, `basic-exchange`. These are conceptual sketches of common mechanics, not formal definitions in a specified syntax. The Library cannot be populated until the textual syntax (T1), composition semantics (T3), and schema separation (T5) are defined.

However: the Library's *purpose* is clear and its eventual contents matter for ecosystem design. This ticket captures the design intent and the discovery process — what Patterns the Library should eventually contain, and how that set should be determined — without blocking anything on its completion.

## Design Constraints

### The Library is the shared vocabulary, not an exhaustive dictionary
The Library provides the smallest neutral set of Patterns required for basic cross-genre interoperability. It should contain patterns so universal that omitting them would force every Score author to reinvent them. It should NOT contain genre-specific patterns (no `maps:fps-headshot`, no `maps:deckbuilder-draw`).

### Patterns must be discovered, not prescribed
The right set of Library Patterns emerges from writing real Scores for real games. Premature standardization will produce Patterns that don't match how designers actually think. The process should be:
1. Write Scores for diverse games (Spacewar!, DOOM, chess, Slay the Spire, Dark Souls stamina, Zelda dungeons)
2. Identify recurring subgraphs that appear across multiple Scores
3. Extract those subgraphs as candidate Patterns
4. Evaluate which are genuinely universal vs. which are genre conventions
5. Publish the universal ones as Library Patterns

### Each Pattern must be a well-defined Petri net subgraph
Not a prose description. Not a YAML template. A Pattern is a graph fragment with declared interface States, internal topology, guard expressions, and mark schemas. It must be expressible in the T1 textual syntax and visualizable with the T2 conventions.

## Work Items

1. **Write 5–10 Scores** for structurally diverse games spanning genres and eras
2. **Identify recurring subgraphs** across those Scores
3. **Draft candidate Patterns** with formal interface declarations
4. **Evaluate universality** — does this Pattern appear in ≥3 structurally different genres?
5. **Publish vetted Patterns** as versioned Library entries with Nostr event format

## Candidate Patterns (Hypothetical, Pending Validation)

These are *hypotheses* about what recurring structures the Score-writing process will surface. None should be formalized until Scores validate them.

- **Depletion loop** — finite resource consumed by repeated Verb firing
- **Cooldown** — Verb disabled for N ticks after firing
- **Spawn** — Verb instantiating a new entity subnet
- **Collision** — overlapping entities trigger system transition
- **Timeout** — entity transitions state after countdown expires
- **Accumulation threshold** — Marks build until crossing a threshold fires a transition
- **Match structure** — rounds, scoring, win/loss determination
- **Gated progression** — state transition requiring a prerequisite Mark

## Open Questions

- How many Scores need to be written before Pattern extraction is reliable?
- Should the Library version independently from the MAPS spec version?
- Should deprecated Patterns be removed or preserved with a deprecation marker?
- How do community-contributed Patterns relate to the official Library? Is there a curation process, or is the official Library fixed and community Patterns live in the ecosystem namespace?
