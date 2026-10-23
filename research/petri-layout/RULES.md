# Placement rules for Petri nets

These rules say where to put every place and transition so a reader grasps a net at a glance. They come from the drawings in J. L. Peterson, *Petri Net Theory and the Modeling of Systems* (1981): 135 net figures analyzed one at a time (`analysis/ch*.md`), then synthesized twice, independently (`analysis/SYNTHESIS-A.md`, `analysis/SYNTHESIS-B.md`). The two syntheses agree on every core rule. `SYNTHESIS-B.md` holds the full evidence for each rule: supporting figures, figures that break it and read worse, and the open conflicts.

Every rule states what a position *means*. None asks for a count to be minimized. A crossing, a bend, or a long arc is fine wherever a rule puts the nodes where they are; a crossing no rule explains means a rule was not applied.

## The idea under all of them

A good Peterson drawing is a picture of **token journeys**. Each actor's sequence of states is a straight line, read in one direction, starting where its token starts. Lines that run at the same time sit side by side, stage against stage. Everything that is not on a line is placed by its relation to lines: between the lines it couples, beside the step it serves, or outside the line it returns along.

## Vocabulary

The engine sees only structure, never meaning. These are computed by `engine/structure.ts`.

- **Lane.** A state-machine component chosen for drawing as one line: a set of places, every transition touching which takes one token from the set and puts one back (or, at an open end, only takes or only gives). Found as minimal P-semiflows. Lanes are chosen as the disjoint set of components that covers the most places, preferring open journeys (source to sink), then single-token threads, then fewer lanes. A **closed** lane is a cycle (a process); an **open** lane runs from a source to a sink (a job, a word, a program).
- **Anchor.** Where a lane starts: its source end if it has one, else its marked place (the one with the most tokens if several). With neither, its choice place, else a structural tiebreak.
- **Return arc.** The arc that closes a cycle into its anchor. A **back-jump** returns to an earlier node other than the anchor (a loop inside a lane).
- **Common start.** A marked place that nothing refills and that starts two lanes. It belongs to neither lane; it is shared.
- **Shared place.** A place on no lane whose transitions lie on two or more lanes. A **resource** is taken and given back by the same lane (marked at start, usually). A **buffer** is written by one lane and read by another. A component whose transitions all lie on other lanes (a full/empty pair, a pool) is not a lane; its places are shared places.
- **Side place.** A place on no lane whose transitions all lie on one lane: a private resource, a counter, a side condition.
- **Choice.** A place with two or more output transitions on its own lane. **Merge**: two or more inputs.
- **Fork / join.** A transition whose outputs / inputs lie on two or more lanes, not counting a resource's take and give-back.
- **Self-loop.** A place that is both input and output of one transition. A bar that self-loops on another lane's place only *reads* that lane: it does not lie on it, and its give-back is not a step forward.

## Rules, in priority order

When two rules disagree about a node, the lower number wins.

### Skeleton

**R1. A lane is one straight line.** Its places and transitions sit on one line, in firing order, evenly spaced. *Reader:* one actor's life, in time order. (3.29, 3.31, 3.33, 4.3, 4.6; horizontal spines 3.1, 3.2, 6.2, 6.12.)

**R2. The anchor comes first.** Cut a cycle open at its anchor and put the anchor at the start of the reading direction. *Reader:* start here; the token and the start coincide. (3.29, 3.33, 4.3, 4.6; 7.6 buries its start and reads worse.)

**R3. One flow direction; lanes side by side, stages aligned.** Every lane reads the same way. With two or more lanes, time runs down and lanes are columns; with one main lane, it runs left to right. The k-th node of one lane is level with the k-th node of its peers. *Reader:* these run at the same time; same row, same stage. (3.29, 4.3, 4.6, 3.19; 2.6 and 2.19 break it and read worse.)

**R4. A shared place sits between the lanes it couples.** Across the flow, in the gap between those lanes. Along the flow, at the level that says how it is used: a resource level with the first state that holds it, just after the bar that takes it; a buffer midway between its writer and its reader, so its two arcs read as one stroke. A start that two lanes share (a marked place nothing refills) sits between them at the top, its bars starting both. Lanes are ordered so each shared place's lanes are adjacent, the giver before the taker. *Reader:* this belongs to neither actor; it is what couples them. (3.28 m, 3.29 B, 3.33, 4.3 p5, 4.6, 7.13. The first-held-state level corrects the synthesis's "midway between take and give-back", which puts both of 4.6's resources at one height; Peterson draws each just after its taker, and that is what makes 4.6's X.)

**R5. Symmetry follows the relation to what is shared.** Two lanes that both take and give back one shared place are mirror images about it. A writer and a reader are translated copies. Three or more peers in a ring of shared places are rotated copies around a center: each lane is a spoke running outward from its anchor, shared places sit on the bisectors between spokes, and each return is a petal around its own spoke. *Reader:* mirror is peers competing; translation is a pipeline; rotation is a ring of equals. (Mirror 3.28, 3.33, 4.3, 4.6; translation 3.29, 7.13; rotation 3.32.)

**R6. Identical structure, identical drawing.** Isomorphic parts get identical geometry (translated, mirrored, or rotated by R5): node order, bar orientation, loop form, return side, label side. Lanes of one shape start at the same role (the place most of them hold their token in), even when one copy is drawn mid-cycle (3.32 draws philosopher 1 eating, and still puts M1 innermost). *Reader:* these are the same thing; any difference is real. (3.19, 3.27, 3.40, 6.13, 7.13.)

**R7. Coupling arcs go inside; returns go outside, and only as wide as needed.** Arcs to shared places attach on the side of the lane facing them. The return arc runs around the far side of the lane and enters the anchor from before it. *Reader:* the inside is where actors touch; the outside loop says "and again". (3.28, 3.29, 3.31, 4.3, 4.6; 3.3's oversized return reads worse.)

**R8. Shared places keep the first lane's order; inversions stay visible.** Several resources between two lanes are ordered along the flow by when the first lane takes them. If the other lane takes them in another order, its arcs cross, and the crossing stays. *Reader:* the X is the opposite order, which is the deadlock. (4.6.)

### Local structure

**R9. Side places sit beside the stretch they serve, outside.** A hub (a side place that serves several bars, loops included) sits among the bars it serves, on the side where its off-lane bars are, centered on its span; its loops are separate curves, not lenses (4.23, 4.24: p3 above, between t1 and t3). A side place used by one step sits beside that step, on the side away from shared places, with a tight loop. One used across several steps sits farther out, centered on the span. *Reader:* near means "used only here"; far and centered means "serves this stretch". (3.1, 3.2 e, f, g, h; thinly supported beyond 3.2.)

**R10. A choice is a row of alternatives that rejoin as a diamond.** The output transitions of a choice share one cross-row just after it, spread symmetrically about the lane; each branch continues as a parallel sub-line, stage against stage, and closes back onto the lane at the merge. *Reader:* one of these; none favored. (3.2, 3.25, 3.40, 2.21, 6.9.) When the competing transitions are on different lanes, each stays in its lane and the shared place reaches to both (R4).

**R11. A fork spans the lanes it starts; a join spans the lanes it closes.** The bar sits across the lanes, centered on them, each lane's arc at its own end; whatever follows continues on the bar's axis. Bars that start two lanes from a common start sit side by side across them, a row before the first node they feed, with the common start above. *Reader:* from here these run together; here they wait for each other. (3.26, 3.27, 3.37, 4.7, 6.9.)

**R12. Pairs sit as pairs.** Two places with the same inputs and outputs are mirrored about the line through those transitions. Complementary places (full/empty, item/slot) sit on one cross-row, either side of their line, or stacked together in the gap when they couple two lanes. *Reader:* two values of one thing. (2.4, 3.19, 3.31, 4.2.)

**R13. Self-loops sit tight.** Only a place whose every arc is a self-loop is pinned to its bar; a hub is placed by R9. A transition that only loops on a lane place sits beside that place, across from the lane, joined by two short parallel arcs; if it also feeds or takes a shared place, it sits on the side facing that place (R7 outranks R9's outside). A place that only loops on a lane transition sits beside that bar, joined by a small lens. *Reader:* "may repeat here" or "needs this and gives it back". (6.2, 6.12, 4.9, 4.18; 3.39, 4.1, 7.11.)

**R14. Skips and back-jumps take opposite sides.** A transition joining two non-adjacent places of one lane bows away from the lane: forward skips on one side, backward jumps on the other. *Reader:* skip ahead versus go back. (3.25, 6.8, 8.19.)

**R15. A lone cycle is a ring.** A net that is one cycle (with side attachments at most) is a regular polygon: places at the corners, transitions at the edge midpoints, the anchor at the top. *Reader:* it just goes around. (2.9, 4.13, 5.4.) A cycle coupled to peers is cut open instead (R1).

**R16. Extra inputs enter at their consumer.** A source place that does not start a lane, or a place made early and used much later, sits beside the transition that consumes it. A by-product sits beside its producer. *Reader:* needed here; leaves here. (3.38, 3.40; 3.13 pins inputs to an edge column and reads worse.)

**R17. An inhibitor's place sits with the other inputs** of its transition; two places that inhibit each other's producers sit near each other so the two inhibitors read as a pair. (7.5, 7.9.)

### Drawing

**R18. Bars cross their own line.** A transition on a lane is a bar perpendicular to the lane; a fork or join bar is perpendicular to the flow; on a ring, perpendicular to the ring. Never tilted for any other reason. (3.1, 3.29, 4.3; 3.13, 3.38, 2.22 read worse.)

**R19. A bar is long enough for its arcs.** Each arc gets its own point on the bar, ordered as their other ends lie across the flow; the lane's arc at the center, coupling arcs at the end facing the shared place. (4.4, 3.26; 4.1's tick and 3.38's pile-up read worse.)

**R20. Straight along a lane, one smooth curve elsewhere.** Arcs between consecutive lane nodes are straight. Every other arc is one smooth curve, routed around the body rather than through it. Weight 2 or 3 is parallel strokes; more is one thick arc with its number.

**R21. Labels on the free side; tokens fixed.** A label goes where no arc leaves its node, away from shared places when there is a choice, mirrored with its node. No label touches another label, a node, or an arc; spacing makes room for it rather than the label giving way: a gap holding shared places is wide enough for a label beside each, and bars side by side across a flow leave a label line between them. On a spoke, "side" is relative to the spoke. Tokens are centered dots in fixed patterns up to five, a numeral above.

**R22. Same net, same drawing.** Layout depends only on structure and marking, never on names or declaration order.

## Decisions on the open conflicts

`SYNTHESIS-B.md` section 3 lists sixteen. The engine takes these defaults.

- **C1 ring or column.** A cycle coupled to anything is a column (R1). Only a net that is one lone cycle is a ring (R15).
- **C7 middle lane.** A lane between two neighbors sends its return around whichever side carries fewer coupling arcs; the outermost lanes always return outside.
- **C9 one place shared by three or more lanes.** It sits centered across the lanes it couples, in front of them along the flow, its arcs fanning to each lane. No figure supports this; it is a guess.
- **C10 lanes of unequal length.** Cut all lanes at once and number every lane node by its longest forward path, so a bar shared by two lanes has one level and the shorter lane waits (a stretch). A node stays right after its producer in the stretch. This is what makes two-phase commit symmetric and conversation a staircase.
- **C12 no lane structure.** Draw the net as its shape. Its longest cycle is a regular polygon in firing order. Every other node sits as far from each node on the page as it is in the net (stress layout), so a loop looks like a loop and a hub sits among what it serves. The whole is turned so arcs run left to right on the whole, and bars stand upright across their local flow. A flattened row was tried first and graded worse: cycles vanished into long returns (4.07, 4.15, 4.27, 8.19).
- **C13, C14.** The engine never duplicates places, and cannot see relations that live only in captions.
