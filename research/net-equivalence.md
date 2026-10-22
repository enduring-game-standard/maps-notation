# Net reduction, invariants, and equivalence

Research for [issue #21](https://github.com/enduring-game-standard/maps-notation/issues/21), feeding [#14](https://github.com/enduring-game-standard/maps-notation/issues/14). The question: what Petri net theory supports folding, layering, and comparing nets while keeping a flat meaning? This note covers Murata's reduction rules and invariants, coloured-net folding and unfolding, bisimulation, process-mining comparison, and Weisfeiler-Lehman graph kernels. For each one it gives what the method preserves, what it costs, and how it could make two MAPS designs comparable. Composition (hierarchical CPN, open nets, statecharts) is in the sibling note [`research/composing-nets.md`](https://github.com/enduring-game-standard/maps-notation/blob/research/composing-nets/research/composing-nets.md) and is not repeated here.

I tested the claims that touch MAPS by running code, not by reading alone. [`net-equivalence-probe.mts`](net-equivalence-probe.mts) runs every method below on `examples/tic-tac-toe.maps`, on a Number Scrabble design written from scratch, and on the 108 Ocarina encounters. All numbers marked **(probe)** come from it.

## Summary

- **Flat meaning is safe if every fold is finite.** Murata: a high-level net "can be considered as a structurally folded version of a regular Petri net if the number of colors is finite", and it unfolds with one place per (place, colour) and one transition per way of firing. Jensen: every CP-net translates to a PT-net, but "if the CP-net has infinite types... the equivalent PT-net may become infinite." So the rule for MAPS is that folding is shorthand over finite index sets and the flat net stays the meaning. Analysis can then run on the unfolded net, or on the folded net with symmetry reduction.
- **A fold that is also a symmetry shrinks analysis without losing anything.** Jensen's condensed state spaces put one node in each symmetry class of markings and lose no analytic power. The precondition is a static check on arcs: "symmetrical bindings have symmetrical effects." Tic-tac-toe's 8 board symmetries pass that check on the net, and they cut 5,478 positions to 765 and 958 endings to 138 **(probe)**, which match the published counts. Well-formed (symmetric) nets restrict the syntax so this check is always true. Use that as the template for MAPS folding: a family drawn once, over an index set whose members are treated alike.
- **Invariants are cheap and name-free, but they miss half of MAPS.** S-invariants (conservation laws, `y·C = 0`) still hold under MAPS's priorities and `unless` arcs, because those only remove behavior. But the incidence matrix cannot see `need` or `unless`. In tic-tac-toe, 49 of 177 arcs vanish from it, and the 8 "X has a line" verbs have identical columns **(probe)**. The win condition lives entirely in arcs that invariants ignore. Invariants can say what a design conserves, not what it tests.
- **Murata's six reduction rules preserve liveness, safeness, and boundedness only for ordinary nets.** I found no proof that they hold under priority or inhibitor arcs, and MAPS has both. Treat them as a tool for drawing a simpler picture, not as a check that two designs match. Place bisimulation (Autant & Schnoebelen 1992) simplifies a net "in a semantically correct way" in polynomial time. It is the principled version, but I read only the abstract.
- **Bisimulation is the right exact equivalence for "same game", if names are stripped first.** Bisimulation sits at the fine end of van Glabbeek's spectrum: it keeps the moment of choice, which trace equivalence loses, and it is coarser than isomorphism. With verb names reduced to "which seat chose" and outcomes to "who won", tic-tac-toe's 5,478 positions collapse to 219 classes. Number Scrabble's do too, and the two starting positions are bisimilar **(probe)**. Bisimilarity is undecidable for unbounded Petri nets (Jančar 1995). MAPS analysis already needs a finite state space, so this costs nothing new.
- **Process-mining comparison assumes shared names.** Van der Aalst's measures (structural precision and recall, fitness against a log) and Basten and van der Aalst's behavioral inheritance compare activities by label. They fit child Link against adult Link, which share a moveset vocabulary: adult is a subclass of child if blocking or hiding the new verbs leaves child's behavior. The greatest common divisor of two life cycles is "the behavior all variants agree on." These measures do not fit Chess against Shogi.
- **Weisfeiler-Lehman is the cheap, graded, name-free comparison.** It runs in O(hm), linear in arcs. On MAPS designs with names stripped, tic-tac-toe, a renamed and reshuffled copy, and Number Scrabble all get the same WL signature and kernel 1.0. The one-attribute bug from SPEC (line checks at priority 0) drops the kernel to 0.419 **(probe)**. WL's colour classes also suggest folds: it puts the nine squares into {corners}, {edges}, {center} without being told. Across 108 Ocarina encounters it computes 5,778 pairwise kernels in about 3.5 s. But its similarity is dominated by Link's shared scaffolding: the median pair scores 0.75 **(probe)**. WL is a necessary test, not a sufficient one. Equal signatures do not prove isomorphism (Cai, Fürer & Immerman), and no practical kernel is complete.
- **What makes two MAPS designs comparable while keeping a flat meaning:** a ladder of comparisons, all defined on the unfolded flat net with names stripped. From cheap to exact: WL signature and kernel on the design graph, then conservation-law profile, then symmetry-quotiented reachability graph, then bisimulation over seats and outcomes. Shared-vocabulary pairs (variants of one design) add inheritance and GCD. Folding must be declared symmetry over finite index sets so it unfolds by rule and speeds up analysis. See [the last section](#comparable).

## What "flat meaning" means here

A MAPS 2 design's meaning is its conversation: the rules in SPEC.md §"The conversation" run on the flat net of states, verbs, and arcs. The world speaks first in priority order, chance breaks ties, then seats choose. Everything in this note asks one question of a fold, a reduction, or a comparison: is it defined in terms of that flat conversation, and what does it keep?

MAPS is not a plain P/T net. It has inhibitor arcs (`unless`), read arcs (`need`), priorities, and halting outcome states. Murata says inhibitor arcs alone raise "the modeling power of Petri nets to the level of Turing machines" ([Murata 1989](#murata), §II-F). Many P/T-net theorems therefore apply to MAPS only in one direction. I flag each case below.

## 1. Reduction rules (Murata) {#reduction}

[Murata 1989](#murata), §V-C, "Simple Reduction Rules for Analysis":

- Purpose: "To facilitate the analysis of a large system, we often reduce the system model to a simpler one, while preserving the system properties to be analyzed."
- The six rules: Fusion of Series Places (FSP), Fusion of Series Transitions (FST), Fusion of Parallel Places (FPP), Fusion of Parallel Transitions (FPT), Elimination of Self-loop Places (ESP), Elimination of Self-loop Transitions (EST).
- What they preserve: "let (N, M0) and (N′, M′0) be the Petri nets before and after one of the following transformations. Then (N′, M′0) is live, safe, or bounded iff (N, M0) is live, safe, or bounded, respectively."
- What is open: "given a property or a set of properties, it is desired to develop a complete set of transformations which allows transformation between any two nets having the given properties", and "much work remains to be done in this area."

**Preserves:** liveness, safeness, boundedness, all yes-or-no properties. Not reachability counts, not play counts, not which verb is which. FST merges two verbs into one, so a reduced net no longer says what the seats said.

**Cost:** cheap, local pattern matching.

**For MAPS:** the rules are proved for ordinary nets. MAPS priority makes a world verb's enabling depend on every other world verb, so a "series" pair is no longer local. I found no source proving the rules sound with priority or inhibitor arcs, and I did not prove it myself. They are useful for drawing a simpler picture of a design, such as a summary layer, but not as evidence that two designs are the same. The semantically safe tool is **place bisimulation**: "The main practical application of place bisimulation is as a method for the simplification of nets in a semantically correct way. We show how this simplification can be done in polynomial time" ([Autant & Schnoebelen 1992](#autant), abstract only).

## 2. S- and T-invariants {#invariants}

From [Murata 1989](#murata), §V-B and §VIII:

- The incidence matrix entry for a transition and a place is "the number of tokens removed, added, and changed in place j when transition i fires once." The state equation is `Mk = Mk−1 + Aᵀuk`. Murata assumes "a Petri net is pure or is made pure by adding a dummy pair of a transition and a place". A pure net has no self-loops.
- "An m-vector y (n-vector x) of integers is called an S-invariant (T-invariant) if Ay = 0 (Aᵀx = 0)."
- Theorem 33: "An m-vector y is an S-invariant iff Mᵀy = M0ᵀy for any fixed initial marking M0 and any M in R(M0)." Theorem 34: "An n-vector x ≥ 0 is a T-invariant iff there exists a marking M0 and a firing sequence σ from M0 back to M0 with its firing count vector equal to x."
- Invariants are structural: these properties "depend on the topological structures of Petri nets. They are independent of the initial marking."
- Minimal-support invariants generate all invariants: "any invariant can be written as a linear combination of minimal-support invariants."
- Reachability: the state equation gives only a *necessary* condition (Theorem 2).

[Jensen 1993](#jensen93), §7 gives the coloured version. Weights map coloured tokens to a common type. A set of weights is a *place flow* iff every binding removes and adds the same weighted sum. Theorem 7.2: "W is a place flow ⇔ W determines a place invariant. ⇒ is satisfied for all CP-nets. ⇐ is only satisfied when the CP-net does not have dead binding elements."

**Probe on tic-tac-toe (probe §1).** The incidence matrix is 35 × 37 with rank 23, so there are 12 independent S-invariants and a 14-dimensional T-invariant space. Three families check as place flows, and they hold on all 5,478 reachable positions:

| Invariant | Value | Reads as |
|---|---|---|
| `empty_i + x_i + o_i`, for each square i | 1 | each square holds exactly one of empty, X, O |
| `x_to_move + o_to_move + judge_x + judge_o + x_won + o_won + drawn` | 1 | one conversation token: whose turn, or who is judging, or which result |
| `squares_left + Σ(x_i + o_i)` | 9 | the counter tracks the board |

The same probe shows the blind spot. `need` and `unless` arcs change nothing, so they contribute 0 to the matrix: 49 of 177 arcs. All 8 "X has a line" verbs have *the same incidence column* (take `judge_x`, give `x_won`). In incidence-matrix terms, the lines of tic-tac-toe are indistinguishable. That follows from Murata's purity assumption: a test arc and a take-then-give self-loop have the same zero entry.

**Preserves:** conservation laws, which are name-free once you look at the shape of each invariant's support rather than its place names.

**Cost:** linear algebra, polynomial in net size. Minimal-support enumeration can be exponential in the worst case. I did not verify a bound.

**Soundness under MAPS rules (my reasoning, not from a source):** priority, `unless`, and halting on outcomes each only remove firing sequences from the relaxed P/T net. So every MAPS-reachable marking is reachable in the relaxed net, and every S-invariant of the relaxed net holds in MAPS. The converse directions fail. Theorem 34's cycle may be forbidden by priority, and Jensen's "⇐" fails wherever MAPS makes a binding dead. Invariants give MAPS sound facts about what is conserved. They cannot say what the design *tests*, and the win condition is a test.

**For MAPS comparison:** a design's invariant profile is the multiset of minimal-support invariant shapes, for example "9 three-place one-hot groups, 1 seven-place token loop, 1 counter". It is a cheap, name-free, Level-5-style fingerprint of what a design conserves. It cannot replace behavior, because it ignores `need` and `unless`.

## 3. Folding and unfolding (high-level and coloured nets) {#folding}

**The flat meaning.** [Murata 1989](#murata), §IX: "A high-level net can be considered as a structurally folded version of a regular Petri net if the number of colors is finite. Thus, a high-level net can be unfolded into a regular Petri net by unfolding each place p into a set of places, one for each color of tokens which p may hold, and by unfolding each transition t into a set of transitions, one for each way that t may fire."

[Jensen 1993](#jensen93), §1:

- "It can be shown that each CP-net can be translated into a PT-net and vice versa – if the CP-net has infinite types, such as the integers, text strings or reals, the equivalent PT-net may become infinite. Since the expressive power of the two formalisms are the same, there is no theoretical gain by using CP-nets."
- The practical gain includes comparability: "It becomes easier to see the similarities and differences between similar system parts (because they are represented by the same place, transition or subnet)."
- The size gain on his database example: "With 5 managers the PT-net would have 97 places while the CP-net only has 9", and 50 transitions against 4.
- CP-nets also carry guards, "a boolean expression (with variables)" on a transition. MAPS bans guards: "a guard that names a value off the page hides a dependency the picture should show" (SPEC.md).

**Symmetry: analysis on the folded form.** [Jensen 1996](#jensen96), abstract: "The symmetries induce equivalence classes of states and equivalence classes of state changes. It is then possible to construct a condensed state space where each node represents an equivalence class of states while each arc represents an equivalence class of state changes. Such a condensed state space is often much smaller than the full state space and it is also much faster to construct. Nevertheless, it is possible to use the condensed state space to verify the same kind of behavioural properties as the full state space. Hence, we do not lose analytic power."

[Jensen 1993](#jensen93), §6 gives the condition. A symmetry is a permutation of a colour set, and the arc expressions must satisfy `E(a)<φ(b)> = φ(E(a)<b>)`: "symmetrical bindings have symmetrical effects... Property (*) is local and static. It can be determined from the individual transitions without considering the set of all reachable markings." It implies the dynamic property `M′ [b⟩ M″ ⇔ φ(M′) [φ(b)⟩ φ(M″)`. Jensen also warns that "the use of symmetries (and other reduction methods) improves the situation, but it does not remove the problem."

**Well-formed nets make the symmetry check syntactic.** [Chiola et al. 1993](#chiola), abstract: SWNs are "a syntactic restriction of stochastic high-level nets" chosen so that the symbolic reachability graph can cut the cost of analysis, and "any unconstrained high-level net can be transformed into a well-formed net." I read only the abstract, not the restriction itself.

**Probe on tic-tac-toe (probe §2).** I mapped each of the 8 rotations and reflections of the board over states and verbs. All 8 map the arc set onto itself, which is Jensen's static check on the flat net. Quotienting the analysis's reachable positions by them gives **765 classes, and 138 among the 958 endings**. These match the counts usually cited: 765 "essentially different positions" and "138 terminal board positions" ([Wikipedia, Tic-tac-toe](https://en.wikipedia.org/wiki/Tic-tac-toe), which cites Schaefer 2002 and Bolon 2013; I did not open those).

**Preserves:** unfolding preserves everything, by definition. The symmetry quotient preserves every property that respects the symmetry (Jensen), but not the identity of the squares.

**Cost:** unfolding costs the flat net's size. That is the Keese's 430 verbs, and the reason folding is wanted. The symmetry quotient needs a canonical form per marking. My probe computes all 8 images and takes the smallest, which is cheap for a declared group.

**For MAPS:** the open Folding problem in SPEC.md ("write 'a seat marks an empty square' once for all nine squares") is CPN folding. Three findings narrow it:

1. **Fold over finite index sets only.** Then unfolding is a rule and the flat net is the meaning (Murata, Jensen). Counters stay marks, not colours.
2. **Keep MAPS's "no guards" rule by restricting what an arc may say about an index.** The same index, or a fixed relation on the index set, such as "the three squares of a line", drawn as a named table. The SWN idea is to restrict colour functions so symmetry is visible in the syntax. I verified the idea's existence, not its exact rules.
3. **A fold should declare its symmetry.** Tic-tac-toe has two kinds of repetition. The 18 mark verbs are one family over squares × seats. The 16 line verbs are one family over the 8 lines × seats, and the lines are a relation, not the whole index set. If the declared group is checked by the static condition, the analysis can run on the quotient: 765 instead of 5,478 positions here.

## 4. Equivalence: bisimulation and its relatives {#bisim}

**The spectrum.** I did not have Milner 1989 in hand. I used [van Glabbeek 2001](#vg), which surveys the same ground and quotes Milner. In the linear time – branching time spectrum, the coarsest semantics is trace semantics. "The finest one (making less identifications than any of the others) is bisimulation semantics, as presented in Milner [39]. Bisimulation semantics is the standard semantics for the system description language CCS (Milner [37]). The notion of bisimulation was introduced in Park [41]." Definition (§12, after Park): a bisimulation is a relation R where, if pRq and p –a→ p′, then some q –a→ q′ has p′Rq′, and symmetrically. Isomorphism is finer still: "a graph isomorphism can be seen as a bijective bisimulation", but not all bisimilar graphs are isomorphic. (Quotes are from an OCR'd PDF and have been rejoined where ligatures dropped.)

**Why bisimulation, not traces, for games.** [Van der Aalst et al. 2006](#vda06) give the game-relevant reason. Trace-based comparison ignores "the moment of choice", and two nets with the same traces can differ in whether "a token in p2 enabl[es] only B." In a game, *when* a seat learns its options is the design.

**Decidability.** [Jančar 1995](#jancar), abstract: "The main result shows the undecidability of (strong) bisimilarity for labeled (place/transition) Petri nets." The same technique covers trace equivalence and reachability-set equality. For bounded nets the state space is finite and bisimilarity is computable by partition refinement. MAPS analysis already needs a finite exploration ("an exploration that hits its limit reports that it is incomplete", SPEC.md), so this adds no new restriction.

**Relatives that fit MAPS features (leads, abstracts only):**

- *Seats as players.* [Alur, Henzinger, Kupferman & Vardi 1998](#ahkv): in alternating transition systems "each transition corresponds to a possible move in a game between the components". Alternating simulation "can be checked in polynomial time using a fixpoint computation algorithm", and alternating trace containment is 2EXPTIME-complete. The abstract names alternating *simulation*. I did not verify the paper's alternating bisimulation definition.
- *Chance.* Larsen & Skou 1991 (Information and Computation 94) define probabilistic bisimulation. I could not retrieve the paper. Secondary sources say related states must give equal probability to each equivalence class, which is what MAPS's weighted world tiers need.
- *Hidden steps.* Branching bisimilarity, used by [Basten & van der Aalst](#inherit), treats some actions as silent (τ). MAPS analysis already does something similar: `settleAll` in `studio/src/core/analyze.ts` folds every world answer into the next settled position, so the analysis graph has only seat choices as edges.

**Probe (probe §4).** I took the settled conversation graph from `analyze`, labeled each edge only by *which seat chose* (first or second) and each ending only by who won, and computed the coarsest strong bisimulation:

| Design | Positions | Bisimulation classes |
|---|---|---|
| tic-tac-toe | 5,478 | 219 |
| Number Scrabble (written independently, below) | 5,478 | 219; starting positions bisimilar |
| tic-tac-toe, outcomes merged into one "ended" | 5,478 | 171 |

219 is far below the 765 symmetry classes. Bisimulation merges positions whose futures have the same shape even when no board symmetry relates them. That is what "the same game with different dressing" means as a computation.

**Preserves:** the whole branching structure of choice over the chosen labels: who can choose, when, and what results. Labels are the design decision. Keep verb names and only renamings count as the same. Keep only seat and outcome and Number Scrabble equals tic-tac-toe.

**Cost:** needs the reachability graph, which MAPS already builds. Partition refinement is polynomial in the graph's size. I used naive refinement, not Paige–Tarjan.

## 5. Structural and behavioral comparison in process mining (van der Aalst) {#vda}

I used the papers below. I did not read the *Process Mining* book listed in GAME_ABSTRACTION_LEVELS.md.

**Graded comparison.** [Van der Aalst, Alves de Medeiros & Weijters 2006](#vda06), abstract: "most equivalence notions result in a binary answer (i.e., two processes are equivalent or not). This is not very helpful, because, in real-life applications, one needs to differentiate between slightly different models and completely different models. Second, not all parts of a process model are equally important." They propose comparing models "with respect to some typical behavior" recorded in an event log.

- *Structural precision and recall* (Def. 4) count the transition pairs (t1, t2) that share a place, `|C1 ∩ C2| / |C2|` and `|C1 ∩ C2| / |C1|`. The authors show its limits. Two nets with identical connections can differ (concurrency against choice), and two with different connections can have "identical behaviors." They call it a "rough indicator."
- *Behavioral precision and recall over full firing sequences* (Def. 5) need finite, terminating models. They ignore frequency, and "essentially trace equivalence is used as a criterion."
- *Fitness* (Def. 7) is the fraction of logged steps the model allows, weighted by how often each trace occurs.
- Every measure assumes the two models *share transition labels*. Def. 4 intersects sets of label pairs.

**Inheritance and common cores.** [Basten & van der Aalst 2001](#inherit) and [van der Aalst & Basten 2001](#gcd):

- Inheritance is "expressed in terms of blocking and hiding method calls." *Protocol inheritance*: "If it is not possible to distinguish the behaviors of x and y when only methods of x that are also present in y are executed, then x is a subclass of y." *Projection inheritance*: the same, but new methods run and are hidden (renamed to τ). The equivalence is branching bisimilarity.
- The GCD "is the common superclass which preserves as much information about the OLCs as possible... The GCD describes the behavior all variants agree on. The LCM is the most compact OLC which is still a subclass of all variants." The inheritance orders are not lattices, so a GCD may not exist or may not be unique. The paper uses the Dedekind–MacNeille completion, where the GCD may be a "virtual OLC" that "cannot be represented by a single Petri net."

**Graph edit distance.** [Dijkman, Dumas & García-Bañuelos 2009](#dijkman): ranking process models by graph-edit similarity, "the corresponding graph matching problem is NP-complete". A fast greedy matcher came close to the exhaustive one on 100 models. Node similarity uses label string-edit distance.

**For MAPS:** these methods fit pairs that share a verb vocabulary. The map's first comparison is one: child Link against adult Link ([#8](https://github.com/enduring-game-standard/maps-notation/issues/8): "mostly gear filtering plus four hard-coded rules"). Adult Link with adult-only verbs blocked gives protocol inheritance. With them hidden it gives projection inheritance. Their GCD is the shared moveset: a defined object, computed on the flat nets, that answers "what do they have in common?" For designs with unrelated names (Chess against Shogi, Zelda 1 against OoT), label-based process-mining measures do not apply until someone writes a label correspondence. That is a mapping, the thing [Dormans keeps separate](https://github.com/enduring-game-standard/maps-notation/blob/research/composing-nets/research/composing-nets.md).

## 6. Graph similarity: Weisfeiler-Lehman kernels {#wl}

[Shervashidze et al. 2011](#wl):

- The method: "augment the node labels by the sorted set of node labels of neighbouring nodes, and compress these augmented labels into new, short labels," repeated h times. The WL subtree kernel counts shared labels across iterations. "Its runtime scales only linearly in the number of edges of the graphs and the length of the Weisfeiler-Lehman graph sequence", O(hm).
- The limit: if label sets stay equal, "either G and G′ are isomorphic, or the algorithm has not been able to determine that they are not isomorphic (see Cai et al., 1992...)."

[Kriege, Johansson & Morris 2020](#kriege), §4: "computing a complete graph kernel is GI-hard... Therefore, none of the graph kernels used in practice are complete." WL subtree, shortest-path, and graphlet kernels "are not able to distinguish basic graph properties such as planarity or connectedness." Because WL couples labels with structure, "we consider WL-kernels a first choice for applications where vertex labels are important."

**How I encoded a MAPS design.** I drew a graph with one node per state, verb, and seat, and an edge per arc labeled by kind and count. Seat nodes keep each seat's verbs together. Initial labels hold only what MAPS gives meaning to: a state's starting marks, whether it is an outcome, and how many seats see it; a verb's speaker type (seat or world), priority, and weight. No names, labels, positions, or groups. That choice *is* the definition of "same structure", and changing it changes what counts as the same.

**Probe (probe §3, §5).**

| Design | WL signature (h=6) | Kernel vs tic-tac-toe | Positions | Plays |
|---|---|---|---|---|
| tic-tac-toe | `4be941524bf87901` | 1.000 | 5,478 | 255,168 |
| same, every name hashed and every list shuffled | `4be941524bf87901` | 1.000 | 5,478 | 255,168 |
| Number Scrabble: take numbers 1–9, three summing to 15 wins | `4be941524bf87901` | 1.000 | 5,478 | 255,168 |
| tic-tac-toe with line checks at priority 0 (SPEC.md lesson 1) | `7fabe9448ca827fc` | 0.419 | 7,046 | 577,440 |

- Number Scrabble's winning triples are computed as the subsets of 1–9 that sum to 15, not copied from the board. Its states and verbs have different names and a different order. The probe also confirms an explicit isomorphism through the Lo Shu magic square (2 7 6 / 9 5 1 / 4 3 8): arcs, starting marks, speakers, and priorities all map exactly. Wikipedia notes that Number Scrabble is "isomorphic to tic-tac-toe" and cites Juul's *Half-Real* p. 51, which is on the MAPS reading list. I did not open Juul.
- WL colour classes find the board's symmetry unprompted. The nine "empty" states fall into {1,3,7,9}, {2,4,6,8}, {5}: corners, edges, center. In Number Scrabble the classes are again {1,3,7,9}, {2,4,6,8}, {5}. These are the numbers in 2 triples, in 3 triples, and in 4 triples, which the magic square places on edges, corners, and center. The sets look alike by coincidence, but the structural roles are swapped.
- Scale: WL with h=3 over all 108 Ocarina encounters (42,634 nodes, 139,101 arcs) takes about 0.7 s including parsing, and all 5,778 pairwise kernels take about 3.5 s.
- WL classes as fold candidates: the Keese's 430 verbs fall into 369 classes. 57 classes have 2+ members, covering 118 verbs. One class is `hit_deku_stick, hit_hammer_swing, hit_slash_master, hit_jump_kokiri`: four weapons with the same effect, a family a CPN would fold over a "weapon" colour.
- Limits seen at scale: the kernel's median over all encounter pairs is 0.753, and its 10th–90th percentile range is 0.362–0.919. With only iteration-0 label histograms the median is 0.878. Much of the similarity is Link's shared scaffolding. The top pairs mix plausible matches (Rolling spiked log ~ Rolling Goron 0.981, Spirit Temple boulder ~ Spike trap 0.982) with doubtful ones (Deku Baba ~ Lizalfos 0.983). I did not inspect why.

**Preserves:** nothing behavioral. It is a structural fingerprint, invariant under renaming and reordering. Equal signatures are necessary for isomorphism, not sufficient.

**Cost:** linear, by far the cheapest method here. It works on the design itself, so no state space is needed.

## Comparison {#table}

| Method | What it preserves or decides | Cost | Needs shared names? | Sound under MAPS priority, `unless`, `need`? |
|---|---|---|---|---|
| Murata reduction rules | liveness, safeness, boundedness | local, cheap | no | not shown; proved for ordinary nets |
| Place bisimulation (Autant & Schnoebelen) | behavior, "semantically correct" simplification | polynomial (abstract) | no | not verified |
| S-invariants | conservation laws on all reachable markings | linear algebra | no | yes, one direction; blind to `need`/`unless` |
| T-invariants | potential cycles (count vectors) | linear algebra | no | weak: priority can forbid the cycle |
| CPN unfolding | everything (it is the meaning) | flat size | no | yes, if MAPS folds over finite sets |
| Symmetry quotient (Jensen) | all symmetry-respecting behavioral properties | reachability, divided by up to the group size | no | yes, if each symmetry is a net automorphism (checked in probe) |
| Bisimulation on settled graph | branching structure of choice over chosen labels | reachability + partition refinement | chosen by the labels | yes; computed on MAPS semantics |
| Trace or log measures (van der Aalst) | graded fit of behavior | traces or logs | yes | yes, as semantics-based |
| Behavioral inheritance, GCD | sub/super-design, common core | branching bisimulation | yes | yes, as semantics-based |
| Graph edit distance | graded structural match | NP-complete; greedy in practice | uses label similarity | structural only |
| WL signature and kernel | structural fingerprint, graded | O(hm) | no | structural only |

## What would make two MAPS designs comparable while keeping a flat meaning {#comparable}

These are my recommendations from the findings above, not claims from the sources.

1. **The flat net is the only meaning.** Every fold and every layer must unfold, by a fixed rule, to a finite MAPS 2 net. Comparisons are defined on that flat net. Folding is notation, as Jensen says of CP-nets: "no theoretical gain", all practical gain.
2. **Folding is declared symmetry over finite index sets, with no guards.** A family is drawn once over a named finite set (squares, seats, weapons). Its arcs may name only the same index or a fixed relation drawn as a table (the 8 lines). The tool checks Jensen's static condition, so the fold is a net automorphism group. Analysis then runs on the quotient (765, not 5,478) and still answers the same questions. Look to well-formed nets for the exact syntax.
3. **"Same structure" has an explicit, name-free encoding.** Write down which attributes count: starting marks, outcome or not, visibility count, speaker type, priority, weight, arc kind and count. Names, labels, groups, and positions do not count. Everything below uses this one encoding, so changing it is a spec decision, not a tool detail.
4. **Compare on a ladder, cheapest first, and say which rung matched:**
   1. *WL signature and kernel* on the design graph. Instant, graded, and it says "possibly identical" or "this different". Its colour classes double as fold suggestions and as a starting point for "same structure, same shape" layout ([#6](https://github.com/enduring-game-standard/maps-notation/issues/6)'s uniform-layout lesson).
   2. *Isomorphism* when signatures match: WL plus a search for the mapping. A found mapping is a proof (the magic square). Two isomorphic designs are one design.
   3. *Conservation profile:* the multiset of minimal S-invariant support shapes. Name-free. It describes what a design conserves, never what it tests.
   4. *Behavior:* the settled reachability graph, quotiented by declared symmetry, then minimized by bisimulation with edges labeled by seat and ends by outcome. Two designs are *the same game* when their starting positions are bisimilar under this labeling (tic-tac-toe and Number Scrabble, 219 classes each). Chance needs probabilistic bisimulation. Several seats may need the alternating variants. Both are leads to read.
   5. *Variants with shared names* (child and adult Link): protocol and projection inheritance by blocking or hiding the verbs one side adds, and the GCD as the common core.
5. **Do not use structure as a stand-in for behavior.** The probe's priority bug left the WL class count unchanged (34) and changed the game (7,046 against 5,478 positions). Invariants cannot see the win condition. A comparison report should show a structural rung *and* a behavioral rung.
6. **Fix the Level-5 proposal before building on it.** GAME_ABSTRACTION_LEVELS.md's five invariants use MAPS 1 notation: `=>` choice arcs, `visible_to`, `~` weights. MAPS 2 has none of these. Under MAPS 2, decision topology is the settled graph's seat edges, and information gradient is `seen-by`. Its "structurally equivalent... under an appropriate homomorphism of their choice graphs" is most precisely stated as bisimulation over anonymized labels (rung 4).

## Notes on the repo

- GAME_ABSTRACTION_LEVELS.md's reading list cites Kriege, Johansson & Morris as "*Journal of Machine Learning Research* 21(218), pp. 1–64 (2020)". The publisher's records list it as *Applied Network Science* vol. 5 (2020), DOI 10.1007/s41109-019-0195-3. I read the arXiv version (1903.11835v2).
- The Level-5 formalization uses MAPS 1 syntax (see point 6 above).

## What I could not verify {#gaps}

- **Milner 1989**, *Communication and Concurrency*: not read. Every bisimulation claim comes from van Glabbeek's survey, which quotes Milner and Park.
- **Jensen's three volumes and the 1996 FMSD paper:** abstracts only. The coloured invariants, symmetry condition, and PT-net translation come from Jensen 1993 (DAIMI report version).
- **Murata's reduction rules under priority and inhibitor arcs:** no source found. Soundness for MAPS is unknown.
- **The figures for Murata's six rules (Fig. 22):** I relied on the rule names and the text, not the drawings.
- **Autant & Schnoebelen 1992; Chiola et al. 1993; Jančar 1995; Larsen & Skou 1991; Alur et al. 1998:** abstracts or bibliography entries only. I did not see the AHKV alternating *bisimulation* definition or any Larsen–Skou text.
- **Van der Aalst & Basten's GCD paper:** read in an author PDF dated 2001. I did not verify its venue.
- **Van der Aalst's *Process Mining* book:** not read.
- **Tic-tac-toe's 765 and 138:** the cited source (Schaefer 2002) was not opened. The probe reproduces both numbers independently.
- **Juul on Number Scrabble:** not opened. The isomorphism is verified by the probe.
- **The S-invariant soundness argument and every recommendation** are my reasoning, not a source's.
- **WL kernel normalization:** my kernel sums label matches over all iterations, then normalizes. Shervashidze et al. define the unnormalized sum. Other variants weight iterations.

## Reproduce

```sh
cd studio
npm install
npx tsx ../research/net-equivalence-probe.mts
```

## Sources {#sources}

- <a id="murata"></a>T. Murata, "Petri Nets: Properties, Analysis and Applications", *Proc. IEEE* 77(4):541–580, 1989. Read in full text ([course copy](https://elearning.unimib.it/pluginfile.php/1372798/mod_resource/content/2/Petri%20Nets%20analysis%20and%20applications.pdf); [bibliography entry](https://www.informatik.uni-hamburg.de/TGI/pnbib/m/murata_tadao12.html)).
- <a id="jensen93"></a>K. Jensen, "An Introduction to the Theoretical Aspects of Coloured Petri Nets", in *A Decade of Concurrency*, LNCS 803, pp. 230–272, 1993 per the Petri Nets Bibliography ([DAIMI PB version](https://tidsskrift.dk/daimipb/article/view/6949)). Read in full text.
- <a id="jensen96"></a>K. Jensen, "Condensed State Spaces for Symmetrical Coloured Petri Nets", *Formal Methods in System Design* 9:7–40, 1996 ([abstract](https://www.informatik.uni-hamburg.de/TGI/pnbib/j/jensen_k7.html)).
- K. Jensen, *Coloured Petri Nets*, Vols. 1–3, Springer 1992–1997 ([Vol. 2 abstract](https://www.informatik.uni-hamburg.de/TGI/pnbib/j/jensen_k8.html)). Abstracts only.
- K. Jensen, L. M. Kristensen, L. Wells, "Coloured Petri Nets and CPN Tools for modelling and validation of concurrent systems", *STTT* 2007 ([PDF](https://cs.au.dk/fileadmin/site_files/cs/research_areas/centers_and_projects/sttt2007.pdf)). Used for the state-explosion and reduction remarks.
- <a id="chiola"></a>G. Chiola, C. Dutheillet, G. Franceschinis, S. Haddad, "Stochastic Well-Formed Colored Nets and Symmetric Modeling Applications", *IEEE Trans. Computers* 42(11):1343–1360, 1993 ([abstract](https://www2.informatik.uni-hamburg.de/TGI/pnbib/c/chiola_g12.html)).
- <a id="autant"></a>C. Autant, Ph. Schnoebelen, "Place Bisimulations in Petri Nets", ICATPN 1992, LNCS 616, pp. 45–61 ([abstract](https://www2.informatik.uni-hamburg.de/TGI/pnbib/a/autant_c1.html)).
- <a id="vg"></a>R. J. van Glabbeek, "The Linear Time – Branching Time Spectrum I", *Handbook of Process Algebra*, 2001 ([PDF](https://cgi.cse.unsw.edu.au/~rvg/3152/spectrum1.pdf)).
- R. Milner, *Communication and Concurrency*, Prentice Hall, 1989. Not read; see gaps.
- <a id="jancar"></a>P. Jančar, "Undecidability of bisimilarity for Petri nets and some related problems", *TCS* 148(2):281–301, 1995 ([abstract](https://www2.informatik.uni-hamburg.de/TGI/pnbib/j/jancar_p6.html)).
- <a id="ahkv"></a>R. Alur, T. A. Henzinger, O. Kupferman, M. Vardi, "Alternating Refinement Relations", CONCUR 1998, LNCS 1466 ([abstract](https://cis.upenn.edu/~alur/Concur98.html)).
- K. G. Larsen, A. Skou, "Bisimulation through probabilistic testing", *Information and Computation* 94:1–28, 1991. Not retrieved.
- <a id="vda06"></a>W. M. P. van der Aalst, A. K. Alves de Medeiros, A. J. M. M. Weijters, "Process Equivalence: Comparing Two Process Models Based on Observed Behavior", BPM 2006, LNCS 4102 ([PDF](https://www.vdaalst.com/publications/p338.pdf)). Read in full text.
- <a id="inherit"></a>T. Basten, W. M. P. van der Aalst, "Inheritance of Behavior", *J. Logic and Algebraic Programming* 47(2):47–145, 2001 ([PDF](https://www.vdaalst.com/publications/p93.pdf)). Abstract read.
- <a id="gcd"></a>W. M. P. van der Aalst, T. Basten, "Identifying Commonalities and Differences in Object Life Cycles using Behavioral Inheritance" ([PDF](https://www.vdaalst.com/publications/p124.pdf)). Read; venue not verified.
- <a id="dijkman"></a>R. Dijkman, M. Dumas, L. García-Bañuelos, "Graph Matching Algorithms for Business Process Model Similarity Search", BPM 2009 ([PDF](https://lepo.it.da.ut.ee/~dumas/pubs/bpm09.pdf)).
- <a id="wl"></a>N. Shervashidze, P. Schweitzer, E. J. van Leeuwen, K. Mehlhorn, K. M. Borgwardt, "Weisfeiler-Lehman Graph Kernels", *JMLR* 12:2539–2561, 2011 ([PDF](https://www.jmlr.org/papers/volume12/shervashidze11a/shervashidze11a.pdf)). Read in full text.
- <a id="kriege"></a>N. M. Kriege, F. D. Johansson, C. Morris, "A Survey on Graph Kernels", *Applied Network Science* 5, 2020, DOI 10.1007/s41109-019-0195-3 ([arXiv](https://arxiv.org/abs/1903.11835)). Read in full text.
