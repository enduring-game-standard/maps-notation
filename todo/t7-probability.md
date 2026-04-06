# T7: Probability

**Priority:** Medium — many games require it, but Scores for deterministic games can proceed without it  
**Status:** Open  
**Depends on:** T1 (syntax to express probabilistic Arcs), T6 (probability interacts with temporal resolution)  
**Blocks:** Any Score involving loot tables, critical hits, proc chances, hyperspace death risk, dice rolls, card draws, or any mechanic whose outcome is non-deterministic

---

## Problem

MAPS RESEARCH.md lists probability as an open question. The notation deliberately excludes it today. But probability is pervasive in game design — not as an implementation detail but as a *mechanical concept*. A 20% critical hit chance is a design decision that shapes the entire combat feedback loop. The designer who chose 20% over 10% did so because it changes how the system *feels*. That choice must be expressible in the notation.

The challenge: probability is where MAPS comes closest to tension with its own exclusion principles. The README excludes "Probability & RNG" as an "implementation detail" belonging to "specific Processors." But the *existence and weight* of probabilistic outcomes is not implementation — it's the rule. The *algorithm that generates the randomness* is implementation.

Musical notation handles this distinction naturally. A "trill" marking tells the performer "alternate rapidly between these two notes" without specifying the exact number of alternations. The performer's execution varies; the marking captures the intent. MAPS probability must work the same way — express the intent ("this outcome happens roughly 20% of the time") without specifying the PRNG.

## The Design Space

### Weighted Arcs
The simplest model. An Arc carries a probability weight. When a Verb fires and has multiple output Arcs, one is selected according to the weights.

```
(open_chest) --[0.7]--> [common_loot]
(open_chest) --[0.25]--> [rare_loot]
(open_chest) --[0.05]--> [legendary_loot]
```

**Strengths:** Simple, readable, composable. The weights are visible in the graph. A designer reading the diagram sees the probability distribution immediately.

**Weaknesses:** Assumes independent, memoryless draws. Cannot express pity timers (guaranteed rare after N failures), conditional probabilities (chance depends on player state), or pseudo-random distribution (Dota 2's PRD system where probability increases after each failure).

### Mark-Dependent Probability
Arc weights are expressions over current Marks rather than fixed constants.

```
(hyperspace_return) --[1 - risk]--> [ship_active]
(hyperspace_return) --[risk]--> [ship_exploding]
```

Where `risk` is a Mark that accumulates with each hyperspace use. This handles Spacewar!'s escalating death risk and any mechanic where probability depends on game state.

**Strengths:** Expresses the *design relationship* between a resource and an outcome's likelihood. The reader sees "risk goes up, survival goes down" in the graph.

**Weaknesses:** More complex to parse. Requires defining what expressions are valid as probability weights (T1 syntax concern).

### Distribution Types
Rather than raw weights, Arcs reference named distribution patterns.

```
(attack) --[crit: uniform(0.2)]--> [critical_hit]
(attack) --[crit: remainder]--> [normal_hit]
```

Or for pseudo-random distribution:
```
(attack) --[crit: prd(0.2)]--> [critical_hit]
```

**Strengths:** Captures the *kind* of randomness, not just the weight. A designer comparing two combat systems can see "this one uses uniform, that one uses PRD" — a meaningful design distinction.

**Weaknesses:** Requires a vocabulary of distribution types. Where does that vocabulary live — in the MAPS spec, in the Library, or in game-specific definitions?

## Key Design Decisions

### 1. Are probability weights part of the notation or a Pattern?
Should the MAPS primitives natively support probability on Arcs, or should probability be a Pattern that composes with standard Arcs?

If native: Arcs gain a `weight` attribute. The spec defines how weights normalize and resolve.

If Pattern: a `maps:probabilistic-branch` Pattern wraps a Verb with weighted output Arcs.

Native seems right — probability is too fundamental to game design to require importing a Pattern every time. It's akin to guard expressions, which are native to Arcs.

### 2. Where do weights live syntactically?
On the Arc (as an attribute alongside guards and mark effects)? On the Verb (as a property of the transition)? On a separate "outcome" declaration?

Arc-level seems most consistent — weights travel with the directed edge, the same way guards do.

### 3. How do weights interact with guards?
An Arc can have both a guard and a weight. The guard determines *eligibility*; the weight determines *selection among eligible Arcs*. This means weights only matter when multiple output Arcs from the same Verb pass their guards simultaneously.

### 4. Must weights sum to 1?
If a Verb has three output Arcs with weights 0.7, 0.25, and 0.05, they sum to 1.0. But what if a designer writes 0.5 and 0.3? Options:
- Error — weights must sum to 1
- Normalize automatically
- Implicit "remainder" Arc that catches the unspecified probability

An explicit "remainder" keyword avoids both errors and silent normalization.

### 5. How to express "no probability" (deterministic transitions)
When a Verb has a single output Arc, probability is irrelevant. When a Verb has multiple output Arcs with guards but no weights, the first satisfied guard fires (or it's a player choice if multiple are satisfied). Probability only enters when explicitly annotated. Deterministic is the default; probabilistic is opt-in.

## Deliverables

1. **Probability semantics** — formal definition of how weighted Arcs resolve, including interaction with guards
2. **Syntax for probability weights** on Arcs in the T1 textual format — fixed constants, Mark-dependent expressions, remainder keyword
3. **Normalization and validation rules** — when weights must sum to 1, when remainder is allowed
4. **Worked examples:**
   - Spacewar! hyperspace death risk (Mark-dependent escalating probability)
   - Loot table (fixed-weight outcome selection)
   - Critical hit with PRD (if distribution types are adopted)
5. **Boundary definition** — precisely what MAPS probability captures (outcome weights) vs. what it excludes (PRNG algorithm, seed management, replay determinism)

## Open Questions

- Should MAPS express conditional probability (P(B|A)) or only independent weights?
- How does probability interact with multi-agent visibility (T8)? Can one agent's probability distribution be hidden from another?
- Should the notation support "guaranteed after N failures" (pity timer) as a named distribution type, or should that be expressed as a Mark-accumulation Pattern that eventually converts a probabilistic Arc into a deterministic one?
- Is there a meaningful distinction between "random" (unknowable) and "hidden deterministic" (the outcome is decided but unknown to the agent)? Does the notation need to express this?
