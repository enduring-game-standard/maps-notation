# Game Abstraction Levels

> **Status:** Foundational theory  
> **Author:** Scott + AI synthesis  
> **Date:** 2026-03-30

## The Problem

Every attempt to diagram, notate, or formalize games conflates at least two of five distinct abstraction levels. This conflation has prevented game notation from progressing beyond napkin sketches for twenty years.

Stéphane Bura (2006) explicitly warned that mapping diagram elements one-to-one onto operational rules is "a mental block that has prevented game notations from flourishing." But his solution — replacing operational elements with analyst-chosen meta-resources like "Skill" and "Luck" — jumped to a different abstraction level without acknowledging the jump. Salen and Zimmerman (2004) defined "constitutive rules" as the underlying formal structure but never distinguished between the mechanical structure (states and transitions) and the strategic topology (feedback loops and risk/reward). Nobody has formalized the deepest level — what makes two games feel structurally identical despite different mechanics.

This document identifies the five levels, traces their intellectual lineage, and defines their relationships. Levels 1–3 form a deterministic derivation chain. Level 4 requires its own notation — grounded in Level 3 but independently authored, like harmonic analysis grounded in a musical score. Level 5 defines the structural invariants that identify when two games share the same interactive architecture. The MAPS composition hierarchy — Cycle → Mechanic → System → Possibility Space — is the zoom mechanism that makes the Level 3 substrate legible at higher levels.

---

## The Five Levels

```
Level 1    The Performance         (Swink)
Level 2    The Score               (RUNS)
Level 3    The Mechanical Graph    (Salen / MAPS)
Level 4    The Strategic Topology  (Bura / Koster)
Level 5    The Structural Identity (novel)
```

### The Derivation Direction

Derivation always flows from detail toward abstraction. Every more-detailed level has a unique representation at the next more-abstract level. But a single abstract representation can correspond to many detailed ones. Information is lost monotonically. You can always compress. You can never uniquely decompress.

This is a general property of representational systems — not unique to games. A musical score can always be compressed to a harmonic analysis, but a harmonic analysis cannot uniquely reconstruct a score. A C program can always be compiled to assembly, but assembly cannot uniquely be decompiled to C. The principle is information-theoretic: abstraction discards detail deterministically, while concretization requires choosing among many possibilities.

The five game abstraction levels follow this pattern.

---

## Level 1: The Performance

### What It Is

The compiled binary running on hardware. Frames rendering, inputs polling, speakers outputting. The game as it is experienced in real time by a human perceiver.

### What You See

Input latency. Frame timing. "Juice" — screen shake, particle effects, hit-stop. The tactile sensation of control. The thing people mean when they say a game "feels good."

### Who Defined It

**Steve Swink** (2009), *Game Feel: A Game Designer's Guide to Virtual Sensation*. His formal definition of game feel: "Real-time control of virtual objects in a simulated space, with interactions emphasized by polish." Swink is explicit that this is a structural, non-aesthetic interactive quality — distinct from graphics or narrative, residing in the mechanics of interaction.

### Why It's Its Own Level

You cannot evaluate game feel from source code. You cannot predict it from a design document. It emerges from the interaction between implementation, hardware, and human perception. Two implementations of the same RUNS source — one running at 60fps with careful input buffering, one running at 15fps with laggy controls — produce different Level 1 experiences despite identical Level 2 source.

A board game has no Level 1. The physical sensation of moving chess pieces is tactile but is not "game feel" in Swink's sense — there is no simulated space, no real-time control.

### Formal Analog

The physical performance of a musical work. Two orchestras playing the same score produce different performances. The score (Level 2) is the same; the performance (Level 1) is not.

### Relationship to MAPS

MAPS does not and cannot operate here. Level 1 is the domain of platform engineering, rendering pipelines, input systems, and audio design. It is a performance of the RUNS source, not a property of the game's rules.

---

## Level 2: The Score

### What It Is

The complete implementation source code — platform-independent, deterministic, and fully specified. Every function, every data structure, every dispatch rule, every computational detail made explicit. Nothing hidden. The graph explodes in complexity — that is expected and correct. This is the full score for the entire orchestra.

### What You See

Source files specifying computation (logic, arithmetic, state mutation), data schemas (typed fields, record structures), and control flow (dispatch order, guards, wiring). For EGS specifically: RUNS source files, DIGS processor bodies, Network topology. But Level 2 as a concept is not EGS-specific — it is any platform-neutral source representation of a game's complete logic.

### Who Defined It

The concept of platform-independent source code is as old as high-level programming itself. **John Backus** and the FORTRAN team (1957) first demonstrated that a single source text could compile to different machine architectures. **Dennis Ritchie** and C (1972) made portable source the default for systems programming.

For games specifically: **Infocom's Z-machine** (1979) was among the first platform-neutral game source representations — a virtual machine specification that allowed interactive fiction to run on any platform with an interpreter. **LucasArts' SCUMM** (1987) extended this to graphical adventure games. **Java** (1995) and **LLVM IR** (2003) generalized portable compilation.

EGS's RUNS/DIGS is one specific instantiation of Level 2 for games — using Petri net topology for dispatch and a deterministic expression language for computation. But the LEVEL itself — "platform-independent source code" — was defined by the history of computing, not by any single project.

### Why It's Its Own Level

Level 2 is implementation-specific. A board game has no source code. The concept of a processor computing 18-bit fixed-point inverse-square gravity is implementation — it specifies HOW the game works, not WHAT the game IS structurally.

But Level 2 is NOT the binary. It is platform-agnostic source. The same source compiles to PDP-1, PICO-8, or WebAssembly. Level 2 is the enduring artifact — the thing that survives platform death.

### Formal Analog

The musical score. The complete, authoritative specification of what every instrument plays, when, and how. Not a performance (Level 1). Not a harmonic analysis (Level 3). The score.

### Relationship to MAPS

MAPS States correspond to RUNS Records. MAPS Verbs correspond to RUNS Processors. MAPS Arcs correspond to RUNS Network wiring. The relationship is design-to-implementation. Level 2 implements Level 3.

Going from Level 2 to Level 3 is abstraction: strip away the computational detail (DIGS processor bodies, fixed-point arithmetic, record field types) and retain the structural skeleton (which states exist, which transitions connect them, which resources gate them).

Going from Level 3 to Level 2 is implementation: choose datatypes, write processor logic, decide tick rates, define record schemas. This direction requires design decisions that Level 3 does not constrain.

---

## Level 3: The Mechanical Graph

### What It Is

The bipartite directed graph of the game's possibility space. States, Verbs, Arcs, Marks — as the game defines them. This is the Petri net, extended with the choice arc (`=>`), using game-defined resources (health, ammo, keys, fuel) as marks and game-defined actions (thrust, fire, open_door) as transitions.

### What You See

Every node, every edge, every guard, every mark flow. The complete graph of what is POSSIBLE — every legal state of the game, every legal transition between states, every resource constraint that enables or prevents a transition.

### Who Defined It

**Katie Salen and Eric Zimmerman** (2004), *Rules of Play: Game Design Fundamentals*. Their definition of constitutive rules: "The underlying formal structures that exist 'below the surface' of the rules presented to players. These formal structures are logical and mathematical."

Also: **David Parlett** (1999), who called them "foundational rules" — the mathematical state machine beneath the operational rules.

Also: **Jesper Juul** (2005), *Half-Real*, who defined games as "state engines" — rule-based systems that process input to produce state changes through algorithmic, decontextualized rules. His "possibility space" is the set of all actions available to the player at any given moment, as determined by the rules.

Also: Standard **Petri net** analysis, originating with Carl Adam Petri (1962). The bipartite structure (places and transitions connected by arcs, never place-to-place or transition-to-transition) is the foundational invariant. The linguistic decomposition method (nouns → places, verbs → transitions, quantities → tokens) is the standard modeling methodology.

### Why It's Its Own Level

Level 3 is the most detailed level that is still **platform-independent**. Two different implementations (RUNS sources) of the same game have the same Level 3 graph. A board game and a video game with the same rules have the same Level 3 graph.

A board game designer can derive functional rules from this level. A software developer can use it as a specification to build an implementation. It is both human-readable and machine-parseable.

### What MAPS Captures

This is what MAPS notation directly encodes. The `.maps` file IS a Level 3 description:

```maps
(ship_active) => |fuel > 0, −fuel|[thrust] -> (ship_active)
(ship_active) => |ammo > 0 AND reload == 0, −1 ammo|[fire] -> (ship_active)
[fire] -|+1 spawn|-> (torpedo_active)
(ship_active) -|distance_to_star < capture|-> [star_capture] -> (exploding)
```

### Formal Analog

The musical score. Not a *performance* of the score (that's Level 2/RUNS), but a *harmonic reduction* of it — the structural skeleton stripped of orchestration, voicing, and dynamics. Also comparable to a circuit schematic: every component and connection visible, but no physical layout or manufacturing specification.

> **Note on game theory:** Game theory's *extensive form* (the game tree) superficially resembles Level 3, but the correspondence is inexact. The extensive form is a **tree** — sequential, branching, time-ordered. A MAPS graph is a **Petri net** — concurrent, cyclic, time-independent. Extensive forms model one-shot sequential decisions between rational utility-maximizing agents. MAPS models ongoing concurrent interactions between human players who are emotional, learning, and irrational. Game theory is a branch of mathematics that models strategic decision-making; game design theory is a craft discipline that creates interactive experiences. The ontological difference matters: game theory asks "what should a rational agent do?"; MAPS asks "what does this game's interactive structure look like?" The abstraction direction (detail → compression) is shared, but the mathematical objects are different.

### The Decomposition Method

To produce a Level 3 graph from an operational understanding of a game, apply four tests:

**The State Test** — "Does the set of available actions change?" If the agent's action vocabulary is different in two situations, a State boundary exists. A character idle vs. attacking = two States (different Verbs available). A character at position (100,200) vs. (105,210) = NOT different States (same Verbs available).

**The Verb Test** — "Does this action change which State the agent is in, or which Marks exist?" Swinging a sword = a Verb (enters recovery state, consumes stamina). Walking forward = NOT a Verb (doesn't change what's possible) unless it crosses a proximity threshold that gates a transition.

**The Mark Test** — "Does this quantity enable or prevent a transition?" Health = a Mark (heath ≤ 0 triggers death). A pixel coordinate = NOT a Mark (doesn't gate any transition) unless it represents proximity, in which case the design should use a named mark like `near_door`.

**The Arc Test** — "Is this the agent choosing, or the system resolving?" Agent choosing = `=>` (choice arc). System resolving = `->` (flow arc).

---

## Level 4: The Strategic Topology

### What It Is

The feedback structure. Which resources amplify which choices. Where risk concentrates. Where skill differentiates. How prior choices accumulate into future advantage. The risk/reward topology of the game.

### What You See

Feedback loops — positive (snowball) and negative (rubber-band). Resource flow direction. Choice density (how many choice arcs fan out). Information asymmetry. Temporal commitment. Risk/reward ratios.

Not individual marks or arcs. Patterns. "This system creates a depleting-resource pressure that forces engagement." "This mechanic is a preparation pattern — spend cheap choices now to enable expensive choices later." "This is a skill-vs-luck allocation problem."

### Who Defined It

**Stéphane Bura** (2006), *A Game Grammar*. Bura explicitly rejected operational isomorphism ("If we were to try to describe Checkers operational rules, we'd end up with an unwieldy diagram") and instead used abstract meta-resources:

- **Skill** — the player's total cognitive/dexterity budget
- **Luck** — randomness working for or against the player
- **Preparation** — accumulated positional/informational advantage from prior choices
- **Moves** — available legal actions (a depleting resource)

His Blackjack diagram contains no cards, no hitting, no standing, no 21. It captures: "Blackjack is a game of resource and risk management where the player spends Skill to gain Money and inhibit Risk."

Also: **Raph Koster** (2005), *A Grammar of Gameplay* (GDC), who sought the "atoms" of game design and argued that stripping away aesthetics and narrative reveals the game's mathematical topology. Bura's work is a direct response to Koster's presentation.

Also: **Joris Dormans**, *Machinations* (2012), which models game economies as feedback systems. Dormans operates between Level 3 and Level 4 — his diagrams use game-defined resources (like Level 3) but focus on feedback loops and flow dynamics (like Level 4).

### Why It's Its Own Level

Level 4 captures something that Level 3 does not make obvious: the strategic *character* of the game. Two Level 3 graphs can produce the same Level 4 topology — a sacrifice in Checkers and a sacrifice in Chess are the same Level 4 pattern (spend material now to gain positional advantage later) despite completely different Level 3 mechanics.

Level 4 is where a designer recognizes "this game is about risk management" or "this system creates a death spiral." These are not properties of individual arcs or marks — they are emergent properties of feedback loops and resource flow patterns.

### Why It's Not Enough On Its Own

Bura himself acknowledged the limitation: "Since [the grammar] does not take into account the operational rules of the game, one cannot reverse-engineer changes to a game diagram to find corresponding changes in the game rules." His diagrams are descriptive, not generative. You cannot build a game from a Bura diagram. You cannot compose Bura diagrams. The abstract resources (Skill, Luck) are analyst-chosen — two analysts produce different diagrams for the same game.

### Relationship to MAPS

Level 4 is NOT derivable from Level 3 by an algorithm. It requires a **separate design act** — the act of recognizing and naming the strategic patterns in a mechanical graph.

The music theory precedent makes this clear. In music, there are two independent notations at different levels:

- **The score** (notes, rhythms, dynamics) — mechanical, generative, complete. Level 3.
- **Roman numeral analysis** (I–IV–V–I) — strategic, interpretive, abstract. Level 4.

Roman numerals are not "derived from" the score by an algorithm. An analyst READS the score and WRITES the analysis. The analysis requires judgment — what counts as a passing tone, where phrase boundaries fall, whether a chord functions as dominant or borrowed. Two analysts can produce different analyses of the same passage.

But Roman numerals are also not free-floating. They are GROUNDED in the score. You can always point back and say "this V comes from these three notes in measure 12."

Level 4 needs the same relationship to Level 3:

- **Grounded** in the Level 3 graph (not free-floating like Bura's diagrams)
- **Directly written** by a designer (not pretending to "emerge")
- **Standardized vocabulary** (not analyst-dependent)

The topological substrate — feedback loops, resource flows, cycle structures — IS visible in the Level 3 graph at System zoom. But interpreting this topology as strategic concepts (Preparation, Skill, Luck) is an independent design act that requires its own vocabulary and methodology.

**Direction.** Three approaches to a direct Level 4 notation:

1. **Annotation layer** — metadata tags on Level 3 graph elements (e.g., `@pattern(preparation)`, `@feedback(positive)`) written by the designer alongside the `.maps` file. Grounded but not derived.
2. **Standardized strategic vocabulary** — a fixed set of strategic pattern names (like Roman numerals) with formal definitions tied to Level 3 graph structures.
3. **Derivation algorithm** — specific graph operations (cycle detection, feedback classification) that produce a Level 4 description algorithmically.

This is the next major design problem after the Level 3 notation is stable.

### Formal Analog

Harmonic analysis in music theory. A harmonic analysis of a symphony captures the chord progressions, modulations, and structural form — the "why it works" — without specifying individual notes. Two different pieces with the same harmonic analysis share strategic character. This is what Bura's diagrams do for games.

> **Note on game theory:** Game theory's *strategic/normal form* (the payoff matrix) compresses an extensive form by enumerating all complete strategies. This is a superficially similar abstraction — detail compressed to strategic essence — but the objects are different. A payoff matrix is a mathematical tool for computing Nash equilibria between rational agents. Bura's strategic topology is a design tool for understanding feedback loops and risk/reward in interactive experiences. Game theory doesn't care about "fun" or engagement; game design theory doesn't care about equilibria. Both compress detail into strategic overview, but they are answering fundamentally different questions.

---

## Level 5: The Structural Identity

### What It Is

What two games share when they "feel the same" despite different mechanics, themes, and platforms. The mathematical skeleton of the possibility space. The graph invariants that survive when you strip away naming, theming, and specific resource identities.

### What You See

Decision topology — the shape of choice in the game. Uncertainty profile — which sources of uncertainty drive engagement. Feedback polarity — whether the game converges, diverges, or oscillates. Information gradient — who knows what. Temporal phase structure — the rhythm of the game.

### Who Has NOT Defined It

Nobody, formally. Raph Koster gestured at it: "the same game with different dressing." Every designer has the intuition — Chess and Shogi share *something* despite being mechanically distinct. Dark Souls and Monster Hunter share *something* despite different settings and controls. But nobody has written formal definitions for what that something is.

Several thinkers have provided vocabulary without formalization:

**Greg Costikyan** (2013), *Uncertainty in Games*, identified eleven types of uncertainty that drive player engagement: performative, solver's, player unpredictability, randomness, analytic complexity, hidden information, narrative anticipation, development anticipation, perception, meta-uncertainty, schedule. These are components of a game's uncertainty profile — part of Level 5.

**Christopher Alexander** (1977), *A Pattern Language*, established the pattern methodology — recurring structural solutions to recurring design problems at multiple scales. His "levels of scale" property (smaller parts support larger ones in a nested, recursive hierarchy) maps directly to the MAPS composition hierarchy. His concept of "the quality without a name" — an objective physical quality of life/wholeness in architecture — is the closest analog to Level 5 for buildings.

**Keith Burgun** has proposed a hierarchy of interactive forms (toy → puzzle → contest → game), which is a Level 5 classification — it categorizes by structural properties (determinism, competition, decision-making) rather than by theme or mechanics.

### Why It Matters

Level 5 is why game design knowledge is currently non-transferable. A designer who deeply understands Dark Souls combat cannot currently PROVE that insight transfers to a new game with a similar structure, because there is no formal definition of "similar structure." Level 5 provides the framework for that definition.

Level 5 is also why game clones are hard to identify legally. Copyright protects expression (Level 2 and below), not structure (Level 3 and above). But designers know when a game has been structurally cloned. Level 5 formalizes this intuition.

### Proposed Formalization: Five Invariants

Given a MAPS Possibility Space, the following five properties characterize its structural identity. They fall into two categories: properties computable from graph topology alone, and properties that also depend on MAPS notation annotations.

#### Topological (from graph structure)

**1. Decision Topology.** The subgraph containing only choice arcs (`=>`). Measured by choice density (fan-out per State), choice depth (sequential choice points), and choice symmetry (whether all agents have isomorphic choice graphs).

**2. Feedback Polarity.** For each cycle in the graph (a path returning to its start State), classify as positive (produces more marks than consumed — snowball), negative (consumes more — rubber-band), or neutral. The ratio characterizes the game's dynamic trajectory.

**3. Temporal Phase Structure.** The graph's strongly connected components and their connectivity. Single-phase (fully connected), multi-phase (distinct phases connected by irreversible transitions), hierarchical (nested phase structure).

#### Semantic (from MAPS annotations)

**4. Information Gradient.** Distribution of `visible_to` declarations. Perfect information (all `visible_to: all`), hidden information (some restricted), asymmetric (different agents see different States).

**5. Uncertainty Signature.** Which Costikyan uncertainty types are present, detectable from graph features and notation annotations:

| Uncertainty type | Source |
|-----------------|--------|
| Randomness | Arcs with `~` weight expressions |
| Hidden information | States with `visible_to` restrictions |
| Player unpredictability | Multiple agents with `=>` arcs |
| Analytic complexity | Choice density × choice depth (threshold TBD) |

**Definition:** Two Possibility Spaces are **structurally equivalent** if they share the same values for all five invariants under an appropriate homomorphism of their choice graphs. Validating this definition against designer-perceived similarity is a key empirical milestone.

### Formal Analog

Graph invariants and Petri net behavioral equivalence. In Petri net theory, P-invariants (place invariants — linear combinations of tokens that remain constant during any firing) and T-invariants (transition invariants — firing sequences that return to the original marking) are properties of the net's structure, not its naming. Two nets with the same invariants exhibit the same behavioral class.

Also: bisimulation equivalence — two systems are bisimilar if they can simulate each other's moves in a matching way. For games, structural equivalence at Level 5 is a form of behavioral bisimulation over the choice graph.

---

## The Zoom Mechanism

| Zoom Level | Composition Unit | What's Visible | Abstraction Level | Relationship |
|------------|-----------------|---------------|-------------------|-------------|
| Assembly | — | Machine instructions, memory addresses | Level 1: Performance | Compiled from Level 2 |
| Source | Record/Processor/Network | Every computation, every field | Level 2: Score | Implements Level 3 |
| Close-up | Cycle / Mechanic | Individual States, Verbs, Marks, Arcs | Level 3: Mechanical | Written directly |
| Mid-range | System | Interacting Mechanics, feedback topology | Level 4: Strategic | Interpreted from Level 3 (separate design act) |
| Wide | Possibility Space | Structural shape, invariants | Level 5: Structural | Computed from Level 3 (validation ongoing) |

MAPS's composition hierarchy — Primitive → Cycle → Mechanic → System → Possibility Space — is the zoom mechanism. The `.maps` file is written at Level 3. The composition hierarchy makes the Level 3 substrate legible at higher zoom levels. Level 4 interpretation and Level 5 computation both operate on this same substrate.

### The Derivation Cascade

```
Level 1 (Performance)    ← compile + run Level 2 on hardware
    ↑ cannot reverse
Level 2 (Score / RUNS)   ← implement Level 3 with computation
    ↑ not unique
Level 3 (Mechanical / MAPS)  ← MAPS is written here
    ↓ interpret (designer recognizes strategic patterns)
Level 4 (Strategic)      ← separate notation, grounded in Level 3
    ↓ extract (compute graph invariants)
Level 5 (Structural)     ← computed from Possibility Space
```

- **Level 3 → Level 2:** Implementation. Requires choosing datatypes, writing DIGS processor bodies, deciding tick rates. Not unique — many Level 2 implementations can satisfy the same Level 3 graph.
- **Level 2 → Level 1:** Compilation + execution. Requires choosing a platform, rendering pipeline, input system. Not unique — many binaries from the same source.
- **Level 3 → Level 4:** Interpretation. The topological substrate (feedback loops, resource flows) is visible in the Level 3 graph. Naming those patterns as strategic concepts (Preparation, Risk, Skill) is a separate design act — analogous to writing a harmonic analysis of a musical score. The topology is there; the interpretation is grounded in it but independently authored.
- **Level 4 → Level 5:** Invariant extraction. The topological invariants (decision density, feedback polarity, phase structure) are computable from the graph. Validating that these invariants correspond to designer-perceived structural similarity is ongoing work.

---

## Summary Table

| Level | Name | What It Captures | Who Defined It | Can Build From? | Can Feel From? | EGS Protocol |
|-------|------|-----------------|----------------|-----------------|---------------|-------------|
| 1 | Performance | Compiled binary, game feel, real-time sensation | Swink (2009) | — | ✅ | — (platform) |
| 2 | Score | Complete implementation source | Backus (1957), Ritchie (1972), Infocom (1979) | ✅ Compile | ❌ | RUNS + DIGS |
| 3 | Mechanical | States, Verbs, Arcs, Marks — the possibility graph | Salen (2004), Parlett (1999), Juul (2005), Petri (1962) | ✅ Implement | ❌ (on its own) | **MAPS** |
| 4 | Strategic | Feedback loops, risk/reward, Skill/Luck/Preparation | Bura (2006), Koster (2005), Dormans (2012) | ❌ | ✅ Strategic soul | Future: Level 4 notation |
| 5 | Structural | Graph invariants, decision topology, structural equivalence | (Novel) | ❌ | ✅ "Same game" recognition | Future: invariant tooling |

---

## Implications for MAPS

1. **MAPS writes at Level 3.** The `.maps` file is a mechanical graph. Level 3 is the most detailed platform-independent level and the foundation from which all other levels are reached.

2. **Level 4 needs its own notation.** The strategic topology is a separate representation — grounded in the Level 3 graph but independently authored, like harmonic analysis grounded in a musical score. The MAPS composition hierarchy makes strategic patterns visible at System zoom; a Level 4 notation captures and names them. This will take the form of a strategic annotation layer, a standardized pattern vocabulary, or a derivation algorithm.

3. **Level 5 defines structural comparison.** The five invariants (decision topology, feedback polarity, temporal phase structure, information gradient, uncertainty signature) characterize a game's structural identity. Tooling will compute and display these invariants, enabling structural comparison between games. Validating the definition against designer-perceived similarity is a key empirical milestone.

4. **MAPS does not touch Levels 1 or 2.** RUNS/DIGS handle Level 2 (the score). Platform engineering handles Level 1 (the performance). MAPS is the design artifact, not the implementation artifact.

5. **The composition hierarchy is the prerequisite.** Without the Mechanic → System → Possibility Space hierarchy, Level 3 graphs are flat and the topological substrate for Level 4 is illegible. The hierarchy is the zoom lens that makes strategic patterns visible and structural invariants computable. Composition discipline is a prerequisite for strategic analysis, not a substitute for it.

---

## Reading List

Twenty-five works across the five levels. Selected for what a researcher would need to understand the taxonomy and approach the open problems at Levels 4 and 5. Books preferred; blogs and papers included only when they are THE canonical source.

### Level 1: The Performance

*What a researcher needs: understand what Level 1 IS and why it's irreducible to source code.*

| # | Reference | Format | Why |
|---|-----------|--------|-----|
| 1 | **Steve Swink**, *Game Feel: A Game Designer's Guide to Virtual Sensation* (2008) | Book | The definitive work. Defines game feel as "real-time control of virtual objects in a simulated space, with interactions emphasized by polish." Provides perceptual thresholds, ADSR input envelope model, and diagnostic vocabulary. |
| 2 | **Stuart Card, Thomas Moran, Allen Newell**, *The Psychology of Human-Computer Interaction* (1983) | Book | The Model Human Processor — the quantitative perceptual/cognitive/motor model that Swink builds on. Defines the processing cycle (~240ms) and latency thresholds that make game feel measurable rather than subjective. |
| 3 | **Mihaly Csikszentmihalyi**, *Flow: The Psychology of Optimal Experience* (1990) | Book | Flow is the psychological state that Level 1 produces when the mechanical and strategic layers are well-tuned. Understanding flow helps a researcher see what the higher levels are ultimately FOR — generating engagement at Level 1. |
| 4 | **Jason Gregory**, *Game Engine Architecture*, 3rd ed. (2018) | Book | The engineering between Level 2 (source) and Level 1 (performance). Game loop, rendering pipeline, input handling, physics integration, audio mixing. Defines what happens in the gap between writing source and running a game. |
| 5 | **Richard Terrell**, *Game Design and Game Feel* — "Critical-Gaming" blog series (2008–2015) | Blog | The most granular empirical application of Swink's framework — systematic per-mechanic feel analysis across hundreds of games. Useful for understanding the RANGE of Level 1 phenomena a notation must correctly exclude. |

### Level 2: The Score

*What a researcher needs: understand what platform-independent source code IS as a representational system.*

| # | Reference | Format | Why |
|---|-----------|--------|-----|
| 1 | **Harold Abelson & Gerald Jay Sussman**, *Structure and Interpretation of Computer Programs* (1996) | Book | Defines what programs ARE: specifications of computational processes built through abstraction layers. The Level 2 insight is SICP's central thesis — source code is structured thought, not just instructions. Introduces stratified design (building systems as layers of abstraction) which directly parallels the five-level hierarchy. |
| 2 | **Alfred Aho, Monica Lam, Ravi Sethi, Jeffrey Ullman**, *Compilers: Principles, Techniques, and Tools* ("The Dragon Book"), 2nd ed. (2006) | Book | How source becomes executable. Lexing, parsing, semantic analysis, code generation. The pipeline from Level 2 to Level 1 — the deterministic transformation that connects the two. |
| 3 | **Graham Nelson**, *The Z-Machine Standards Document*, v1.1 (2006; documenting 1979–1989 architecture) | Spec | The first platform-neutral game source architecture. Infocom's Z-machine demonstrated that a single game image could run on any platform with an interpreter — Level 2 for interactive fiction. The proof that game-specific Level 2 representations are viable. |
| 4 | **Niklaus Wirth**, *Algorithms + Data Structures = Programs* (1976) | Book | Foundational articulation of the principle that source code is the union of logic and data representation. The Level 2 insight: programs are structures, not just instructions. |
| 5 | **Chris Lattner**, *The Architecture of Open Source Applications: LLVM* (2012) | Book chapter | LLVM IR as the modern canonical example of platform-neutral intermediate representation. Demonstrates how a single source can target arbitrary hardware — the Level 2 → Level 1 pipeline generalized across architectures. |

### Level 3: The Mechanical Graph

*What a researcher needs: understand the mathematical and ludological foundations of the MAPS graph.*

| # | Reference | Format | Why |
|---|-----------|--------|-----|
| 1 | **Katie Salen & Eric Zimmerman**, *Rules of Play: Game Design Fundamentals* (2004) | Book | The definition of constitutive rules: "the underlying formal structures that exist 'below the surface' of the rules." The taxonomic foundation (constitutive / operational / implicit) that Level 3 builds on. |
| 2 | **Jesper Juul**, *Half-Real: Video Games between Real Rules and Fictional Worlds* (2005) | Book | Games as "state engines." Defines possibility space, decontextualization, and the distinction between emergence and progression. The theoretical grounding for treating Level 3 graphs as the "real" half of games. |
| 3 | **Tadao Murata**, "Petri Nets: Properties, Analysis and Applications," *Proceedings of the IEEE* 77(4), pp. 541–580 (1989) | Paper | THE canonical survey of Petri net theory. Defines places, transitions, arcs, tokens; behavioral properties (reachability, liveness, boundedness); structural analysis (invariants, siphons, traps). The mathematical foundation beneath MAPS. |
| 4 | **Kurt Jensen**, *Coloured Petri Nets: Basic Concepts, Analysis Methods and Practical Use*, 3 vols. (1992–1997) | Book | Extends Petri nets with typed tokens ("colors"), enabling modeling of complex systems without state explosion. Directly relevant to MAPS marks (typed resources flowing through the graph). |
| 5 | **David Parlett**, *The Oxford History of Board Games* (1999) | Book | Comprehensive catalog of game rule structures across cultures and centuries. Implicitly Level 3 throughout: Parlett describes games by their state spaces, move structures, and win conditions — not by theme or aesthetics. The empirical foundation for mechanical decomposition. |

### Level 4: The Strategic Topology

*What a researcher needs: understand the problem of creating a grounded strategic notation, and learn from domains that have solved it.*

| # | Reference | Format | Why |
|---|-----------|--------|-----|
| 1 | **Stéphane Bura**, "A Game Grammar" — stephanebura.com/diagrams (2006) | Blog | THE canonical source for Level 4 specifically. The first attempt at direct strategic notation for games. Demonstrates what works (abstract meta-resources capture "soul"), what fails (analyst-chosen vocabulary, not grounded, not composable), and what's needed (linking strategic and mechanical layers). |
| 2 | **Allen Forte**, *The Structure of Atonal Music* (1973) | Book | The closest solved precedent for the Level 4 problem. Forte created a standardized, formal vocabulary for naming structural patterns in music (pitch-class sets, prime forms, interval vectors) that is grounded in the score but independent of it. This is exactly what Level 4 needs for games: a fixed vocabulary for naming strategic patterns grounded in the Level 3 graph. |
| 3 | **Ernest Adams & Joris Dormans**, *Game Mechanics: Advanced Game Design* (2012) | Book | The practical application of Level 4 thinking through the Machinations framework. Bridges Levels 3 and 4 by using game-defined resources in feedback diagrams. The closest existing tool for the Level 3→4 bridge. |
| 4 | **Raph Koster**, *A Theory of Fun for Game Design*, 2nd ed. (2013; 1st ed. 2004) | Book | The theoretical motivation for Level 4. Argues that games are "fun" because they present learnable patterns, and that stripping away aesthetics reveals the underlying pattern structure. Bura's direct inspiration. |
| 5 | **Norbert Wiener**, *Cybernetics: Or Control and Communication in the Animal and the Machine*, 2nd ed. (1961; 1st ed. 1948) | Book | The foundational theory of feedback systems. Level 4 IS cybernetic analysis — positive feedback (snowball), negative feedback (rubber-band), homeostasis (balance). Bura explicitly cites cybernetics as a primary influence. A researcher cannot approach strategic topology without understanding what feedback IS formally. |

### Level 5: The Structural Identity

*What a researcher needs: the mathematical tools and design-theoretic vocabulary to define and compute structural invariants.*

| # | Reference | Format | Why |
|---|-----------|--------|-----|
| 1 | **Greg Costikyan**, *Uncertainty in Games* (2013) | Book | Defines eleven types of uncertainty that drive engagement. These uncertainty types are components of the Level 5 uncertainty signature — the structural fingerprint of a game's engagement architecture. The most developed existing vocabulary for one of the five invariants. |
| 2 | **Christopher Alexander**, *The Nature of Order*, 4 vols. (2002–2005) | Book | Formalizes fifteen structural properties that create "life" in built environments. "Levels of scale," "strong centers," "boundaries," and "roughness" are structural invariants — the architectural Level 5. The closest existing formalization of structural identity in any design discipline. Demonstrates that structural identity CAN be formalized. |
| 3 | **Robin Milner**, *Communication and Concurrency* (1989) | Book | The definitive text on bisimulation equivalence — when two systems are behaviorally indistinguishable despite different internal structures. The mathematical foundation for defining when two Possibility Spaces are structurally equivalent. Defines the spectrum from "too fine" (isomorphism) to "too coarse" (trace equivalence). |
| 4 | **Wil van der Aalst**, *Process Mining: Data Science in Action* (2016) | Book | Applies Petri net analysis to real-world process structures — discovery, conformance checking, and structural comparison. Demonstrates how to extract invariants from Petri nets in practice, not just in theory. The methodological bridge between Murata's abstract Petri net theory (Level 3) and the Level 5 goal of computing game graph invariants. |
| 5 | **Nils Kriege, Fredrik Johansson, Christopher Morris**, "A Survey on Graph Kernels," *Journal of Machine Learning Research* 21(218), pp. 1–64 (2020) | Paper | The computational methodology for comparing graph structures. Graph kernels decompose graphs into substructures and compute similarity scores — exactly the operation Level 5 structural comparison requires. Covers Weisfeiler-Lehman refinement, graphlet counting, and the hierarchy of distinguishing power among different comparison methods. |
