# Synthesis B: placement rules from Peterson (1981)

Source material: `PROTOCOL.md`, `ch02.md`, `ch03a.md`, `ch03b.md`, `ch04.md`, `ch05-06.md`, `ch07-08.md`. I re-checked these clips against the analyses: 2.22, 3.2, 3.13, 3.19, 3.28, 3.31, 3.32, 3.33, 4.6, 4.15, 4.23, 6.7, 6.8, 7.5, 8.3. One analysis claim failed that check: 7.5's consumer loops do not swing outward. All four process loops in 7.5 sit on the left of their place, so the consumers' loops face the center (see C6).

The engine receives places, transitions, arcs (with weight and inhibitor flag), an initial marking and optional labels. It knows nothing about what the net models. Every rule below is therefore stated over structure the engine can compute. Section 2 defines that structure. Read it first if a term in a rule is unclear.

Every rule says what a position means. None asks the engine to minimize a count. A crossing, a bend, or a long arc is acceptable whenever a rule puts the nodes where they are. 4.6's X and 7.9's X are crossings that carry meaning. A count is only a diagnostic. A crossing that no rule explains is a sign that a rule was not applied.

---

## 1. Rules, in priority order

When two rules disagree about a node's position, the rule with the lower number wins. Rules 1 to 7 fix the skeleton: lines, lanes, and what sits between them. Rules 8 to 16 place local structure inside that skeleton. Rules 17 to 22 set orientation, attachment, routing, labels and stability.

### R1. A process is one straight line

**Rule.** Every process (Section 2.2) is laid out as one straight line of alternating places and transitions, in firing order, with equal spacing between consecutive nodes.

**Tells the reader.** "This is one actor's life, in time order." Position along the line is time. Being on the line means being a state or step of that actor.

**Support.** 3.29, 3.30, 3.31, 3.33, 4.3, 4.6 (process columns). 3.1, 3.2, 4.1, 6.2, 6.8, 6.12, 6.13 (horizontal spines). 3.25 and 7.12 (program counter columns). 3.4 and 7.8 (activity rungs).

**Violations that read worse.** 3.3 bends the job chain into a zigzag around the shared middle, and the analysis finds no gain from the bend. 3.28 zigzags its process columns so the bars lean toward m. 3.33 has the same structure drawn with straight columns and reads at least as well, so the zigzag is unnecessary. 6.7 breaks 6.6's row with copied transitions, and the word order c, a, a, b is lost. 2.4 and 2.15 reverse direction halfway along the line.

**Detection.** Find state-machine components and threads (Section 2.2). Order each component's places and transitions by following arcs inside the component from its anchor (R2). A choice inside a process splits the line into sub-lines (R10). The line itself stays straight up to the choice place and continues straight along the first branch.

**Exception.** A net that consists of one cycle and nothing more, or one cycle plus side attachments only, is drawn as a ring (R15).

### R2. The anchor comes first

**Rule.** Cut each process cycle open at its anchor and put the anchor first in the reading direction. The anchor is the initially marked place of the cycle. The arc that enters the anchor becomes the return arc (R7).

**Tells the reader.** "Start here." The token and the start of the line coincide, so the reader finds the initial state without searching.

**Support.** 3.29, 3.30, 3.31, 3.33, 4.3, 4.6 (marked place at the top of each column). 3.28 and 7.5 (marked place heads each process). 4.17, 4.28, 6.2 (marked place at the left end of the axis). 3.37 (tokens at the start of each lane).

**Violations that read worse.** 7.6 puts the marked places p1 and p2 in the middle of the drawing, and the analysis says "a reader cannot find the start". 6.6 puts the start-and-final place p1 mid-row, so only the caption says where execution starts. 2.6, 2.8, 2.9 have no marking and no visible start.

**Detection.** The anchor is the marked place of the cycle. When the cycle has several marked places, choose the one whose input transition is the release or return transition of the cycle (the transition after which the actor is "idle"). If that test is inconclusive, choose the marked place with the most tokens, then the one with the lowest index. When the cycle has no marked place, choose the place whose input transition is a source transition or a fork from a marked place (4.8's p2 and p7). When nothing qualifies, choose the place that follows the cycle's choice point. For a thread (a path from a source to a sink), the anchor is the source end.

### R3. Lanes across the flow, stages aligned

**Rule.** Fix one flow direction for the figure. Draw processes as parallel lanes side by side across that direction. Corresponding positions in the lanes share one cross-row.

When the net has two or more processes, use vertical flow (time downward) with the processes as columns. When it has one process or one main thread, use horizontal flow (left to right). Sources of the main thread sit at the start edge and its sinks at the end edge.

**Tells the reader.** "These actors run at the same time. Same row means same stage."

**Support.** 3.29, 3.33, 4.3, 4.6 (rows t1/t4, p2/p7 and so on). 3.27, 3.37, 3.40 (choice columns), 6.11, 8.10(b) (stage alignment). 3.1, 3.2, 4.1, 6.6, 6.8 (source at the left end, sink at the right end). 3.36 (start at the top, finish at the bottom).

**Violations that read worse.** 2.6 has two concurrent rows that are not stage-aligned. 2.4 and 2.19 run part of the net right to left. 8.3 has no flow direction at all.

**Detection.** Rows are computed from each lane's position index measured from its anchor. When lanes have different lengths, align the rows of the transitions that touch a shared place first (R4), and pad the remaining positions. The analyses give no evidence on this case (C10). A thread with a source transition is a lane like any other. Its source is at position 0.

### R4. A coupling place sits between the lanes it couples, never on a lane

**Rule.** A shared place (resource, buffer, or complementary pair) is placed in the gap between the lanes whose transitions it connects. Across the flow, it sits at the midpoint between those lanes. Along the flow, it sits at the level that says how it is used.

- A **resource** sits at the level of the held state. That level is the midpoint between the transitions that acquire it and those that release it (3.28 m, 3.33 n, 4.3 p5, 3.34 S).
- A **buffer** sits between the level of its writer and the level of its reader. Its input and output arcs then form one continuous diagonal stroke from writer to reader (3.29 B, 4.5, 7.5 b1, 7.13 p3 and p4).

**Tells the reader.** "This belongs to neither actor. It is what couples them." For a resource, the level also says "held from here to here". For a buffer, the diagonal says "items go from this step of one actor to that step of the other."

**Support.** 3.28, 3.29, 3.31, 3.33, 3.34, 4.3, 4.5, 4.6, 7.5 (b1), 7.13, 3.32 (applied angularly), 3.38 (intermediates between the reaction that makes them and the one that uses them).

**Violations that read worse.** 3.2's d sits on the order axis collinear with a, b and c, so it reads as a stage of the order (analysis 3.2 "What could be better"). 3.20's instruction place sits in the resource column and reads as a fifth resource. 7.5's b2 is pulled up next to b1 and away from the level between d2 and c2, so pair 2's hand-off stops reading as a row. 8.12's L3-READ sits off to the side of its writers, and their arcs cross the program column.

**Tie-break (single source, 3.31).** When two coupling places compete for one position, as B and B' do because they share writer and reader in opposite roles, the forward place keeps the midpoint. The return place moves toward the transition it enables. It enters that transition from the downstream side rather than being routed round to the upstream side.

**Order of lanes.** Put the giver's lane before the taker's lane in reading order (3.29 producer left, 8.12 input device, program, output device). When three or more lanes are coupled, order the lanes so that each coupling place has its two lanes adjacent. Section 3 (C9) covers what happens when no such order exists.

**Detection.** Section 2.3 to 2.5.

### R5. Symmetry follows the relation to the shared place

**Rule.** When two lanes relate to a shared place the same way (both acquire it and release it), draw them as mirror images about the axis through the place. When one lane writes the place and the other reads it, draw them as translated copies with the diagonal of R4 between them. When three or more lanes take the same role around a ring of shared places, each sharing with its two neighbors, draw them as rotated copies around a center with the shared places on the bisectors.

**Tells the reader.** A mirror means "peers competing for one thing". A translation plus a diagonal means "a pipeline". A rotation means "a ring of equals".

**Support.** Mirror: 3.28, 3.33, 4.3, 4.6, 4.8, 3.2 (operators F1 and F2 about the order axis), 6.11, 5.14. Translation: 3.29, 3.30, 3.31, 7.5, 7.13. Rotation: 3.32.

**Violations that read worse.** 4.5 keeps 4.3's mirror frame for a producer and consumer pair, and the analysis notes that it "suggests a symmetry the net lacks".

**Detection.** For each pair of lanes, compare the roles of their transitions toward each shared place (acquire, release, write, read). If the role sequences match, use a mirror. If one lane only writes and the other only reads, use a translation. To detect a ring, build a graph whose nodes are lanes and whose edges are shared places. If that graph is a cycle of three or more lanes with isomorphic lane subnets, use a rotation.

### R6. Identical structure, identical drawing

**Rule.** Isomorphic substructures are drawn with identical geometry. They are translated (or mirrored or rotated, by R5) copies with the same node order, the same bar orientation relative to the line, the same self-loop form, the same return side and the same label sides. Repeated units are spaced evenly.

**Tells the reader.** "These are the same thing." Any difference that remains is real.

**Support.** 3.19 (stacked identical hexagons), 3.27, 3.40 (the three final interactions), 5.11, 5.12, 6.13 (identical arches), 7.13 (two identical circles with the marking in the same spot), 3.32 (identical points with returns on the same rotational side), 8.16.

**Violations that read worse.** 8.10(b) mirrors the last column so its arcs do not cross, and the reader wonders whether m_t differs in kind. 7.5 draws pair 2 differently from pair 1 although the structure differs only by the inhibitor. 3.32's label sides vary across the five philosophers. 2.17 flips one self-loop pair relative to 2.15, 2.16 and 2.18.

**Detection.** Use subgraph isomorphism on lanes and on the local structure around them (lane plus its loops, side places and private resources), while ignoring labels.

### R7. Coupling loops go inside, returns go outside, and returns are short

**Rule.** Arcs between a lane and a coupling place attach to the end of the bar that faces the coupling region. A resource's acquire arc enters the acquiring bar from upstream. Its release arc leaves the releasing bar, dips downstream, and curves back. Together the two arcs bracket the held state. The return arc that closes a process cycle (into the anchor) runs on the opposite side, the outside of the lane. It is only as wide as the nodes it must clear require, and it enters the anchor from upstream.

**Tells the reader.** The inside of a lane is where it touches others. The outside loop says "and again". The size of the return loop says how far back the actor goes, not how important the return is.

**Support.** 3.28, 3.29, 3.31, 3.33, 3.34, 4.3, 4.6 (inner coupling arcs, outer returns). 4.8 (a return that reaches higher means the actor goes further back: retry versus restart). 4.24 (short return close to the spine when nothing is in the way). 6.7, 7.6 and 8.12 also route long control arcs outside, but those figures are weak for other reasons.

**Violations that read worse.** 3.3's processor return drops below the sink and becomes the largest shape in the figure. 4.3 and 4.23 have returns that swing wider than they need to and dominate the outline. 8.12's program is the middle lane, so its return has to run through the interior.

**Detection.** The return arc is the arc that enters the anchor from within the same component. The coupling side of a lane is the side that faces the lanes it shares places with. A lane between two neighbors has no free side (C7).

### R8. Resource order on the axis follows the first lane, and inversions stay visible

**Rule.** When several resources sit between two lanes, order them along the flow by when the first lane (the leftmost or topmost) acquires them. Do not reorder them to suit the second lane. If the second lane acquires them in a different order, its acquire arcs cross, and that crossing stays.

**Tells the reader.** "The other actor takes these in the opposite order." In 4.6 the X is the deadlock.

**Support.** 4.6. 7.9 is related: two mutual inhibitions drawn as a symmetric X between straight row arcs, where the crossing means "and not the other". Two sources, but only 4.6 is about resource order.

**Violations.** None in the book. 4.6 does have two release crossings that carry no meaning and dilute the X. Those are covered by R7, which brings release arcs back from below.

**Detection.** For each resource, take its acquiring transition in each lane and its row index (R3). Sort the resources by the first lane's acquisition rows.

### R9. Resources layer outward by how much of the lane they span

**Rule.** On each side of a lane or axis, place nodes in layers moving outward. The order is the lane's own states, then activity places, then resources used by one activity, then resources used by several activities. A resource used by one activity sits beside that activity, centered on it along the flow, with a tight loop. A resource used by several activities sits at the midpoint of those activities along the flow, outside every narrower layer. A resource shared by two mirrored alternatives sits on the mirror axis, inside the box their start and finish bars form.

**Tells the reader.** Distance from the axis means generality. Being near an activity means "used only here". Being far out and centered over a span means "serves this whole stretch".

**Support.** 3.2 (e and f beside their rungs, g and h outermost at the midpoint of the two stages, d between the stage-1 rungs). 3.1 (the idle place centered under the stretch it brackets). 3.34. 3.20 (the resource column beside acquire and release stacked on one line). Mostly 3.2, so this rule is thinly supported.

**Violations that read worse.** 3.3 places the processor-idle place off-center, beside the acquire transition rather than the held state, and the return grows. 3.2 itself places d collinear with the order places (R4 overrides R9 here: d moves off the axis line if that is needed to stop it reading as a stage).

**Detection.** Span is the set of row indices between a resource's acquisition and its release on the lane. Nest spans: a resource whose span contains another's goes outside it.

### R10. A choice inside a process is a row of alternatives that rejoin as a diamond

**Rule.** When a place has two or more output transitions in the same process, put those transitions on one cross-row immediately after the place, spread symmetrically about the place's line. Each branch continues as a parallel sub-line, and corresponding steps in the branches share rows. Branches that rejoin at a merge place close into a diamond, with the merge place back on the line. When the alternatives differ in their targets, order them across the row so each lies on the side of its targets, and put an alternative that feeds several targets between them.

**Tells the reader.** "One of these." Same row means "same stage, alternatives". Symmetry means no alternative is favored.

**Support.** 3.24, 3.25 (the c diamond), 3.40 (three equal columns), 4.8, 4.17 (ordered by target), 5.15, 7.11, 7.12(c), 8.10(b), 2.21, 6.9 (an eye of two alternatives between one pair of places).

**Violations that read worse.** 2.19 sends the alternative consumers of p2 and p3 in opposite directions along the flow, and "the drawing does not signal that t1 and t3 compete". 2.20 does the same on one line. It reads acceptably at three nodes but would not scale.

**Cross-process conflict (R4 wins).** When the transitions in conflict belong to different processes, as with 3.28's m, 3.32's chopsticks and 3.33's n, each transition stays in its own lane. The shared place reaches out to them symmetrically. Do not gather the transitions under the place.

**Detection.** Use the conflict set of a place (Section 2.6) and partition it by process.

### R11. A fork spawns lanes and a join closes them

**Rule.** A transition whose outputs start two or more threads is a fork bar placed before the lanes and spanning them. Each output arc lands on the lane on its side. A transition whose inputs come from two or more lanes is placed between those lanes on the axis of symmetry. Its bar spans the lanes, and each lane's arc attaches at the end nearest that lane. A join's output continues on the join's axis. A fork that launches whole processes sits at the top center, with the processes hanging below it.

**Tells the reader.** "From here these run at the same time" and "here they wait for each other."

**Support.** 3.26, 3.27, 3.36, 3.37 (c and f on the center line), 4.7 (t0 on the bisector of L and R), 4.8 and 8.12 (initializing fork at the top), 5.2, 3.39, 6.9 and 6.10 (lanes between a shared start and a shared final place).

**Violations that read worse.** 3.27's fork and join bars sit off-center over the branches, so the arcs to S1 arrive almost tangentially. 6.10's cross-lane arcs dominate the drawing and hide that the lanes are independent.

**Detection.** A fork is a transition whose output places fall in two or more distinct threads or processes and are not all release arcs (a release fork, such as 4.3's t3 returning p5, is R7, not R11). A join is the dual.

**Known limit.** Placement draws a choice (fan rooted at a place) and a fork (fan rooted at a bar) as the same shape (3.26 against 3.24, 6.9 against 6.10). Only the node type at the root tells them apart. Section 3 (C8) discusses this.

### R12. Mirror pairs and complementary pairs

**Rule.** Two places with the same input transitions and the same output transitions are a mirror pair placed symmetrically about the axis through those transitions (2.4 p2/p3, 2.22 p5/p6). If they are consecutive stage peers, they sit side by side at the same depth (3.38 e- and H+).

Two places that form a complementary pair (Section 2.5) are placed as follows:

- When both are on the same lane's activity, put them on the same cross-row, mirrored on opposite sides of the lane's axis (3.19).
- When they couple two lanes, stack them adjacent in the coupling region, forward above and return below, so the four arcs read as one circulation (3.31).
- When one is a constructed complement of a lane place, put it directly opposite its partner across the line (4.2).

**Tells the reader.** "These are two values of one thing" (full or empty, item or slot).

**Support.** 2.4, 2.15, 2.22, 3.38, 3.19, 3.31, 4.2, 6.11 (the paired operand places above and below the shared axis).

**Violations.** None directly. 7.7 shows the cost when a related pair (p3 and p7, tied by a constraint) sits far apart: the two inhibitors are routed by different policies and the symmetry is invisible.

**Detection.** Mirror pair: •p = •q and p• = q•. Complementary pair: a P-invariant with support {p, q} and unit weights, with •p = q• and •q = p•.

### R13. Self-loops

**Rule.** There are two cases.

1. **Loop transition on a lane place.** A transition t that self-loops on a lane place p and has no other connection on the lane sits directly beside p, perpendicular to the lane. Its bar is parallel to the lane, and it connects to p by two short parallel arcs, one each way. Put t on the side of the lane away from the coupling layer. If t itself connects to the coupling layer (for example, it writes a counter), put it on the coupling side. A second free loop on the same place goes on the opposite side.
2. **Side condition on a lane transition.** A place p that self-loops on a lane transition t and connects to nothing else (a catalyst, a run place, a tested place) sits beside t, perpendicular to the lane, directly opposite t. It connects by two arcs bowed apart into a lens.

**Tells the reader.** Case 1: "while in this state, this may repeat." Case 2: "this step needs this condition and gives it back."

**Support.** Case 1: 6.2, 6.8, 6.12, 6.13, 4.7, 4.9, 4.18, 4.23, 5.10, 2.5, 2.21, 6.9 (coupled loop above, free loop below), 6.14 (the loop moves below to clear the coupling place). Case 2: 4.1 (p3), 3.39 (Pt), 7.11 (p), 4.23 (p3 and t2), 2.5 (p2 and t3), 6.5 (p_r).

**Violations that read worse.** 6.3, 5.6 and 2.22 mix several self-loop forms in one figure. 2.17 flips the direction of one pair between frames.

**Detection.** p ∈ •t ∩ t•. Case 1 applies when p is on a lane and t is not. Case 2 applies when t is on a lane and p is on none.

### R14. Bypasses and back edges take opposite sides

**Rule.** A transition whose input place and output place are both on one lane but not adjacent is drawn on an arc bowed away from the lane, with its bar at the arc's extreme. Forward bypasses (output later than input) use one side, and back edges (output earlier) use the other. When the lane also carries loop transitions (R13), loops take the coupling side and bypasses take the opposite side.

**Tells the reader.** One side means "skip ahead", the other means "go back". Neither can be mistaken for a lane step.

**Support.** 3.25 (back edge left, loop exit right), 6.8 (loops above, bypasses below), 6.9, 8.19 (t2 under the body), 4.24 (t4's return under the spine).

**Violations.** 7.6 puts both returns outside, one above and one below, and the upper one wraps over the whole net. That fits this rule, but the result is still poor because the anchor is buried (R2).

**Detection.** Use the lane positions of t's input and output places on the same lane. A gap greater than one step means a bypass. A negative gap means a back edge.

### R15. A lone cycle is a ring

**Rule.** When the whole net, or a connected part with no lanes beside it, is a single cycle (with side attachments at most), draw it as a regular polygon. Places sit at the vertices, transitions at the edge midpoints, and labels outside. When the cycle is indexed, put index 1 or the marked place at a fixed position and number clockwise. Chains leaving the ring continue straight outward from their node.

**Tells the reader.** "It just goes around." There is no beginning and no end.

**Support.** 4.13, 5.4, 2.8, 2.9, 2.13, 7.13 (two coupled rings), 4.28 (a two-transition cycle drawn as a diamond around the axis).

**Violations that read worse.** 4.15, 4.20, 4.21 and 4.26 split the pump cycle p3, t3, p4, t2 between the rim of an ellipse and an interior chord, so "this loop feeds p2 without limit" is not visible. The analysis suggests drawing that cycle as a clear ring with p2 as a side place.

**Detection.** The net or component has a single simple cycle, and every other node has degree 1 on the cycle. R1 outranks R15. A cycle that is a process coupled to peers is cut open (C5).

### R16. Places enter at the transition that consumes them

**Rule.** A source place that does not start the main thread, or a place produced early and consumed much later, sits beside its consuming transition, entering from the side. It does not sit at the start edge. A sink that is not the main thread's end (a by-product, or a sink transition) sits beside its producer, off the lane.

**Tells the reader.** "This is needed here", and "this leaves here". The main line stays uncluttered. A long arc from an early producer to a late consumer shows the wait.

**Support.** 3.38 (H2O2 beside reaction 2, CO2 pushed off the chain), 3.40 (M1 and D1 enter at the interaction that needs them, and P2 waits by its consumers on a long margin arc), 3.31 (B' displaced toward Put), 6.3 (sink transitions hang below their input place), 2.8 (exit t4 outside the ring), 4.27 (t3 source directly below p3).

**Violations that read worse.** 3.13 and 3.14 put every input symbol place in a fixed column at the left edge, far from the transitions that use them, and the middle becomes a braid. 3.11's boundary columns work only because the inside is a cloud.

**Detection.** Source place: •p = ∅ and p is not the main thread's anchor. Late consumer: the row of p's consumer minus the row of its producer is large relative to the lane length. This threshold is not grounded in the figures; treat it as a tunable.

### R17. Inhibitor sources sit with the other inputs

**Rule.** Draw an inhibitor arc as an input arc. Its source place sits on the input side of the transition, close to it, next to that transition's normal inputs. When two places inhibit each other's producers, put them near each other so the two inhibitors form a symmetric pair (an X when they cross rows).

**Tells the reader.** "This step also waits for that place to be empty." A pair of mutual inhibitions reads as one relation.

**Support.** 7.5, 7.9, 7.10, 7.12(c).

**Violations that read worse.** 7.7 routes its two inhibitors differently, one around the outside and one through the interior, because 7.6 placed p3 and p7 apart. 7.12(c) puts the jump branch away from the register, and the inhibitor crosses the figure.

**Detection.** Inhibitor flag on an arc. Mutual pair: p inhibits a transition in •q and q inhibits a transition in •p.

### R18. Bars are perpendicular to their own line

**Rule.** A transition on a lane has its bar perpendicular to that lane's line at that point, which is perpendicular to the arc that passes straight through it. A transition between lanes (synchronizer, fork, join) has its bar perpendicular to the main flow, spanning the lanes. On a ring or a radial layout the bar is perpendicular to the ring or the radius. A bar is never tilted for any other reason.

**Tells the reader.** The bar is a gate across a path. A consistent orientation lets the reader tell "along" from "across".

**Support.** 3.1, 3.29, 4.3, 6.8 (perpendicular to the lane). 3.19 (bars are perpendicular to their activity rung and therefore parallel to the pipeline). 3.32, 5.4, 8.17 (tilted on radial and diagonal lines). 2.7 (vertical by default).

**Violations that read worse.** 3.13, 3.14, 3.38, 8.3 and 2.22 tilt bars at angles no line explains. 3.25 tilts some diamond bars and not others.

**Detection.** Use the lane geometry from R1, R3 and R15.

### R19. Bar length and attachment order

**Rule.** A bar is long enough that every arc, and every stroke of a weighted arc, gets its own attachment point. Inputs attach on the upstream face and outputs on the downstream face. Along the bar, arcs are ordered the same way as their other ends lie across the flow. The lane's own arc attaches at the center. Coupling arcs attach at the end facing the coupling region. Side-condition arcs attach at the end facing the side place.

**Tells the reader.** Which arc belongs to which neighbor can be read without tracing.

**Support.** 2.4, 2.6, 3.12, 3.26, 3.36, 4.3, 4.4 (the bar widened inward for doubled arcs), 5.6, 6.13, 7.6.

**Violations that read worse.** 4.1 and 4.2 draw t2 as a near-invisible tick where six arcs meet. 3.27's arcs crowd one point. 3.31's Remove bar overloads its left end. 3.38's reaction 1 has five arcs meeting nearly at one point.

**Detection.** The arc count, with weights expanded where they are drawn as parallel strokes, and the cross-flow coordinates of the arcs' other ends.

### R20. Arc shape follows role

**Rule.** Arcs along a lane are straight. An arc that leaves a lane (coupling, return, bypass, side loop) is one smooth curve. An arc between distant nodes routes around the outside of the body rather than through it, unless a higher rule puts its endpoints where the direct path is the meaning (R8).

**Tells the reader.** Straight means "next step". Curved means "elsewhere". Outside routing keeps the forward flow readable.

**Support.** 3.1, 3.2, 3.19 (all straight, by placement), 3.29, 2.22 (perimeter arcs are the only legible long arcs), 5.10 (orthogonal routing with rounded corners in a dense construction).

**Violations that read worse.** 3.13's arcs run through the whole middle. 6.7's start and end variants tangle under p1.

### R21. Labels and tokens

**Rule.** A label goes on the side of its node that no arc uses at that height. When two sides are free, prefer the side away from the coupling region. Mirrored copies get mirrored labels, and repeated copies get labels on the same side. A transition's label goes at the free end of its bar. Tokens are centered in their place. Each count from 1 to about 4 has one fixed dot arrangement. Larger or symbolic counts are written as a numeral or symbol inside the place, with the name moved outside. Place size never changes.

**Tells the reader.** Labels never sit in the coupling region, and frames that differ only in marking differ only in their dots.

**Support.** 3.28, 3.33 (inner labels where the outer side is taken by returns), 4.3, 3.30, 3.31, 5.9, 2.12, 2.13, 8.16 (mirrored outer labels).

**Violations.** 3.32 (inconsistent sides across copies), 4.15, 4.20, 4.21 (label drift across redraws), 2.12, 2.16, 2.18 (token arrangement varies per frame), 7.10 (port labels e and f swapped relative to 7.2).

### R22. Same net, same drawing

**Rule.** Layout is deterministic. When the engine redraws a net with a different marking, or adds nodes, every existing node keeps its position, and new nodes go into free space next to their connections.

**Tells the reader.** The difference between two frames is exactly the change.

**Support.** 2.15 to 2.18, 3.30, 3.31, 4.2, 4.4, 4.20 and 4.21, 6.3, 6.8 (operands kept intact inside the composite), 7.7.

**Cost.** 7.7 shows that keeping a base layout which ignored a later extension can make that extension unreadable (C11).

---

## 2. Structural vocabulary

Notation: •x is the preset of x and x• is its postset. M0 is the initial marking.

### 2.1 Basic node roles

- **Source transition.** •t = ∅. **Sink transition.** t• = ∅.
- **Source place.** •p = ∅. **Sink place.** p• = ∅.
- **Self-loop.** p ∈ •t ∩ t•. Section R13 splits it into a loop transition and a side condition.
- **Side place.** A place connected to exactly one transition (4.1's p3, 8.3's self-loop places).
- **Weighted arc.** Weight greater than 1. This matters for placement only through bar length (R19) and through weighted invariants (2.2).

### 2.2 Process, thread and lane

The figures support this definition. A **process** is a state-machine (SM) component that carries at least one token. An SM component is the support S of a P-semiflow such that every transition in •S ∪ S• has exactly one input place in S and exactly one output place in S. Tokens move around it one place at a time, so it is one actor's sequence of states.

To capture open chains (3.1's order, 3.36's project, 6.x's language spines), short-circuit the net before the analysis. Add a virtual place from every sink transition to every source transition, or from the final place to the start place when those exist. A **thread** is an SM component through a virtual place. Remove the virtual place before drawing. The thread then becomes a lane from its source to its sink.

A **lane** is a process or thread chosen for drawing as a line (R1). Choosing lanes is the ambiguous step, because SM components overlap. In 3.28, {m, CS1, CS2} is an SM component just like each process. Use this tie-break, which the figures support:

1. For each component, count its **private places** (places in no other component) and the number of other components it overlaps.
2. A component whose private part is one place (or one complementary pair), and whose other places all belong to other components, is a **coupling component**. Its private place is a resource, and its private pair is a complementary buffer. The others are lanes.
3. If two overlapping components both have one private place (3.33 readers {s, Reading} against {n, Reading, Writing}), the one that overlaps more components is the coupling component.
4. If the tie survives (two components that each overlap only each other, as in 3.34 with one process and S), the one with more private places is the lane.

Checked against the figures, this classifies 3.1 (idle as a resource), 3.2 (d, e, f, g, h as resources and the order as the thread), 3.28 (m), 3.33 (n, with weighted invariant n + R + n·W), 4.3 (p5), 4.6 (p4 and p5) and 3.31 ({B, B'} as a complementary buffer). In 3.31, every transition of {B, B'} also belongs to a process, which confirms the classification.

**Main lane.** The thread or process with the most private places. It defines the primary axis when R3 calls for horizontal flow.

**Ambiguous or absent cases.**
- A net with no SM cover: 2.22, 8.3, 2.4, 2.6, 2.8 and most of chapter 4's abstract nets. Fall back to a layered drawing of the graph with feedback arcs removed. Seed the first layer with the marked places and source nodes, then apply R10 to R22 locally. The book's own drawings of such nets are mostly weak, so there is little to imitate (C12).
- 4.8's shared variables b0, b1, k0, k1 are each in many small components. The figure replicates them as local copies, which hides the interaction the text asks about (C13).
- Processes with zero tokens (3.25 has no entry token) are still lanes. R2's fallback chooses their anchor.
- Multiple tokens in one process (3.30 s, 3.33 t) means one lane with a count, not several lanes. Duplicated isomorphic processes are also kept as separate lanes only if the input has them separately.

### 2.3 Shared place, resource and held state

- **Shared place.** A place whose adjacent transitions belong to two or more lanes.
- **Resource.** The private place r of a coupling component (2.2). Its output transitions are **acquirers** and its input transitions are **releasers**. In each lane, every acquirer is followed downstream by a releaser.
- **Held state.** The lane places of the coupling component, meaning the places between acquire and release. R4 places the resource at their level.
- **Private resource.** A resource whose coupling component overlaps only one lane (3.1, 3.2 e and f, 3.34 S). It sits beside its lane rather than between lanes (R9).
- **Weighted resource.** A resource whose invariant weights exceed 1 (3.33 n). It is placed exactly like any other resource.

### 2.4 Buffer, counter and channel

- **Buffer.** A shared place with writers in one lane and readers in another, not covered by any coupling component. Usually it is unbounded (3.29 B, 4.5, 7.5 b1 and b2, 8.12's link places).
- **Counter.** A buffer whose writer and reader are both loop transitions (R13 case 1) on the same lane (6.2, 6.12, 6.13, 4.7's T, 4.9's p2). It is placed above the loops, midway between its writer and its reader, which makes the "arch" of 6.13. This is R4 applied to loops instead of lanes.
- **Channel between cycles.** In a marked graph such as 7.13, a place whose input and output transitions lie on different rings. It is placed midway between the rings at the level of the transitions it joins. Use the top for one direction and the bottom for the other.

### 2.5 Complementary and mirror pairs

- **Complementary pair.** A P-invariant {p, q} with unit weights and •p = q•, •q = p• (3.19 full and empty, 3.31 B and B', 4.2 p and p').
- **Mirror pair.** •p = •q and p• = q• (2.4 p2/p3).

### 2.6 Choice, conflict, fork, join, synchronization

- **Choice (conflict).** A place with two or more output transitions. Split it by lane:
  - **Intra-lane choice.** All outputs are in the same lane, so it is drawn with R10.
  - **Cross-lane conflict.** The outputs are in different lanes, so the place is a shared place and is drawn with R4. Then the transitions stay in their lanes.
- **Merge.** A place with two or more input transitions in the same lane. It closes a choice diamond.
- **Fork.** A transition with output places in two or more lanes or threads, excluding release arcs back to a resource.
- **Join or synchronization.** A transition with input places in two or more lanes, excluding acquire arcs from a resource. A start bar that takes a lane input plus resources (3.2's start bars, 3.32's start-eating bars) is an acquirer, not a join. Its inputs arrive from the direction of their own layers (R9, R19).
- **Interaction.** A transition with one input and one output in each of two lanes (3.40's two-actor steps). It is drawn as an X, with each lane keeping its side across the bar.

### 2.7 Lane-relative structures

- **Return arc.** The arc into the anchor from within its own component.
- **Loop transition.** A transition that self-loops on a lane place and has no other lane connection.
- **Bypass and back edge.** A transition whose input and output places are on the same lane and not adjacent (R14).
- **Generator.** A loop transition that also outputs to a place off the lane (4.9 t1, 6.2 a). Its extra output goes to a counter or buffer.

### 2.8 Ambiguities to flag

1. **Lane choice** with overlapping SM components (2.2). The tie-break works on every figure checked, but it has not been proven in general.
2. **Anchor** when a cycle has several marked places or none (R2 fallbacks).
3. **Late-consumer threshold** in R16 has no grounding in the figures.
4. **Resource versus buffer** when a place is written and read inside one lane and also read by another lane. The book never draws this case.

---

## 3. Conflicts and open questions

**C1. Ring versus column for small coupled cycles.** 7.13 draws two coupled two-transition cycles as circles. 3.29 draws the same kind of structure (a marked graph of two cycles plus coupling) as columns. Structurally they are nearly the same, and the difference comes from the text's purpose (7.13 is about cycles). The engine cannot know the purpose. Default to columns (R1 outranks R15). Offer the ring as an option.

**C2. Straight versus zigzag lane.** 3.3 and 3.28 bend lanes toward the shared region, while 3.33 and 4.3 keep the same structure straight. The straight versions read at least as well. R1 wins.

**C3. Global versus local bar orientation.** 2.4 tilts t3 on a diagonal, while 2.7 straightens every bar. 3.19's bars are perpendicular to the rung, not to the pipeline. R18 resolves this with "perpendicular to its own line". The open question is what to do with a transition that sits on no line (an orphan bar between unrelated nodes). The book's answer in 3.13, 2.22 and 8.3 is arbitrary, and those figures are weak.

**C4. Environment inputs at the boundary or at the consumer.** 3.11 puts input and output places in boundary columns, and that works because the interior is a cloud. 3.13 and 3.14 keep the convention, and the interior becomes a braid. 3.38 and 3.40 attach inputs at their consumer. Resolution: use boundary columns only when each source place feeds one transition and those transitions are themselves in input-to-output order. Otherwise apply R16.

**C5. A marked place in the middle.** 2.20 centers the marked place with its two alternatives going in opposite directions. R2 and R10 would put the anchor first and the alternatives on one cross-row (as in 2.21). The 2.20 layout is compact but does not scale. The rules override it.

**C6. Which side return loops go.** R7 says outside. 7.5 (verified in the clip) puts all four process loops on the left, which puts the consumers' loops on the side facing the buffers. The figure still reads, because each process is one place and one bar and has no other inner arcs. Open question: does R7 matter for one-step processes? Default to R7.

**C7. A middle lane has no outside.** In 8.12 the program sits between two other lanes, so its return runs through the interior. The book gives no answer. Options: give the edge position to the lane with the most returns (8.12's analysis suggests this), at the cost of the giver-before-taker order of R4, or accept interior returns. Unresolved.

**C8. Choice and fork look the same.** 3.24 against 3.26, and 6.9 against 6.10. Placement does not distinguish "or" from "and". Only the root node type does. Open question: should alternatives be drawn on one row (R10) and concurrent branches as full lanes with their own aligned stages (R11)? Both rules already do this, but the silhouettes still coincide for small fans.

**C9. Three or more coupled lanes.** The book draws two lanes coupled (many figures), five in a ring (3.32), and three in a pipeline (8.12). It never draws three lanes all sharing one resource, or a coupling graph that is neither a path nor a cycle. R4 cannot put every coupling place between adjacent lanes then. A guess not grounded in any figure: put a resource shared by all lanes at the center of a radial arrangement (an extension of 3.32), or below the lanes on the axis, joined by a comb (6.7's p_r comb is the only precedent, and it is weak).

**C10. Lanes of unequal length.** Which stages align? The book's peers all have equal length (3.29, 4.3, 4.6). 2.6's unaligned rows read worse, but they give no positive rule. A guess: align on the transitions that touch the shared place.

**C11. Stability against a better layout.** 7.7 keeps 7.6's layout, and the added inhibitors become asymmetric and hard to read. 4.23 and 4.24 move t4 to show the consequence of a changed arc rather than keep a minimal pair. R22 is lowest priority for this reason: when the structure changes, a new layout from R1 to R21 may beat stability. The book does both.

**C12. Nets with no process structure.** 2.22, 8.3 and the abstract nets of chapters 2 and 4. The book has no good example of a large unstructured net. 2.4 and 4.27 are passable at small size. Fallback in 2.2.

**C13. Heavily shared variables.** 4.8 replicates k0, k1, b0 and b1 as local copies beside each user. That makes each step readable but hides the interaction the figure is about. Should the engine replicate places? It would be a rendering choice outside pure placement. Open.

**C14. Place-to-place relations the engine cannot see.** 4.8 pairs p4 and p9 (the places tested for mutual exclusion) and 7.6 leaves p3 and p7 (the constraint pair) apart. 7.11's priority has no spatial expression. These relations live in captions, so the engine cannot place for them unless the input carries them. Inhibitors are visible to the engine, so R17 covers 7.7's case.

**C15. Pipelines that alternate step direction.** 3.19 reverses the direction of every other rung so that each hand-off is a short diagonal. The resulting hexagons are clean, but readers must check arrowheads. This is single-source and is not adopted as a rule. It would apply only to a chain of activities whose hand-offs are complementary pairs.

**C16. Earliest row or the wave it runs with.** 3.36 drops r two rows below its earliest position to align it with the wave it runs alongside. That choice is unexplained and weak. Default to the earliest row.

---

## 4. Anti-rules: what the bad figures do

- **3.13, 3.14** (two-state machines as nets). The state lane (q1 above q2) is perpendicular to the input-to-output flow, so every state-switching transition crosses the flow. Transitions sit at positions derived from nothing, bars are tilted arbitrarily, and the symbol places are pinned to edge columns far from their consumers. Rules broken: R1 (q1 and q2 are one lane and must lie along the flow), R13 (staying-in-state transitions are loop transitions beside their state), R16 (symbol places go beside their consumers), R18. Peterson admits "the state machine description is more understandable."
- **3.16** (serial composition). It keeps 3.13's and 3.14's internal tangles, does not reuse the component layouts, and leaves the shared places unlabeled. The overlapping frames on the shared column are the one good idea. Rules broken: R6 (reused components are drawn identically, as 3.17 does and 6.8 does better), plus every 3.13 and 3.14 problem.
- **2.22** (game board). It has no flow direction, a different bar angle at nearly every transition, and all three self-loop forms in one drawing. Only the central f, p5/p6, i diamond reads. Rules broken: R3, R12 (it keeps the mirror pair, the one part that works), R13, R18. As a game board this may be deliberate.
- **8.3** (computation graph). It inherits a source diagram with no direction, so it has no start, no layering and no consistent bar orientation, and its places are unlabeled. A layered top-down drawing from v1 would show the dataflow. Rules broken: R2, R3, R18. Translating a layout that has no direction is the failure. 8.17 shows the same policy working when the source has a direction.
- **6.7** (standard form). It keeps 6.6's row but breaks it with variants, puts p_s and p_f below and off the row's axis, and runs the start and end variants' arcs in an X under p1. p_r's comb and the original self-loops become indistinguishable. Rules broken: R1 and R3 (p_s and p_f belong at the two ends of the axis, as in 6.5 and 6.9), R16 (first-firing variants beside p_s, last-firing variants beside p_f, each under the transition it copies), R13 (p_r is a side condition on every core transition, so its arcs must be distinguishable from the core's own loops).
- **6.10** (concurrent composition). Cross-lane arcs dominate and three join bars collect arcs from four places, so the lanes no longer read as independent. Rule broken: R11 (the fork and join bars should span the lanes, and cross arcs belong at those bars, not along the lanes).
- **4.15, 4.20, 4.21, 4.26** (one net drawn four times). The pump cycle is split between the ellipse rim and a chord, so the unbounded growth of p2 is invisible. Rules broken: R1 and R15 (the cycle p3, t3, p4, t2 should be one line or ring), R13 (t1 is a side condition with p1), R16 (p2 is a buffer fed from the cycle and should be placed as one). The labels also drift across the four redraws (R21, R22).
- **7.6 and 7.7.** The marked places are buried mid-net (R2). The returns are oversized (R7). The constraint pair is far apart, so the added inhibitors are asymmetric (R17, C11).
- **2.4, 2.15, 2.19, 2.20.** The flow reverses within one figure (R3).
- **3.3 and 3.6.** The return is the largest shape in the figure, and the job chain zigzags for no gain (R1, R7, R9).
- **3.20.** The instruction place sits in the resource column, and the acquire and release arcs braid (R4, R7, R19).
- **3.27.** The fork and join bars are off-center (R11).
- **3.38.** Bars are tilted at arbitrary angles, and five arcs meet at one point (R18, R19).
- **4.1 and 4.2.** The bar is too short to read as a bar (R19).
- **5.6 and 6.5.** The abstraction outline is drawn through the arcs, so membership is unclear (R20). Also, two self-loop forms in one figure (R13).
- **8.10(b).** The last column is mirrored to avoid a crossing, which breaks repetition (R6 outranks R19).
- **2.17, 2.12 to 2.18, 7.10.** The same structure is drawn differently across frames: a flipped loop, varying token arrangement, and swapped port labels (R6, R21, R22).
- **2.11.** Not a placement failure (two arcs are missing), but it shows that fixed positions (R22) make such an error visible.
