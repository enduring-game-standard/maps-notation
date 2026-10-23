# Chapter 3, figures 3.24 to 3.40

Analysis per `PROTOCOL.md`. Rule candidates are numbered locally (R1, R2, ...) within each figure; the closing section collects the ones that recur.

## Figure 3.24  (fig-03-24.png, page p-073)

**Kind.** net fragment (two flowchart-node-to-net translations, each shown flowchart left, net right)

**What the text says it models.** The translation rule: "replaces the nodes of the flowchart with transitions in the Petri net and the arcs of the flowchart with places." A computation box becomes one transition; a decision diamond becomes two transitions, labeled T and F, sharing one input place.

**Structure, briefly.** Top: chain a_i, Computation r, a_j. Bottom: a_i feeds two transitions T and F (a free choice), each leading to its own place a_j, a_k. No marking.

**Placement observations.**
1. Each net fragment sits to the right of the flowchart piece it translates, at the same height and the same overall height. *Says:* "this is the same thing in another notation"; the eye matches top to top, bottom to bottom. *R1: when a net is shown next to the artifact it translates, align them so corresponding elements share a row.*
2. The computation chain is vertical: place, bar, place, top to bottom; the bar is horizontal and the arcs are straight and collinear. *Says:* one step of a sequential program, time downward. *R2: a single-input single-output transition sits on the straight segment between its two places, bar perpendicular to the flow.*
3. The transition label ("Computation r") sits to the right of the bar, at bar height, in the space no arc uses. Place labels (a_i, a_j) sit inside the circles. *R3: a place's name goes inside the circle; a transition's name goes beside the bar on the free side.*
4. The choice is a symmetric fan: a_i at the top center, the two transitions below it at equal height, splayed left and right by equal amounts, each with its own output place straight below. The input arcs are diagonal; below the bars the arcs drop vertically. *Says:* two equal alternatives, neither preferred; after the choice, each branch is again a plain sequence. *R4: the transitions in conflict on one place sit side by side at the same depth below it, symmetric about the place's vertical; the branches continue straight down from there.*
5. T is on the left and F on the right in both flowchart and net. The T/F labels sit on the outer end of each bar (T left of the left bar, F right of the right bar). *Says:* the mapping is preserved; branch identity reads from the outside edge. *R5: in a symmetric fan, label each branch transition on its outer side, so labels never sit in the gap between branches.*

**What could be better.** The net's branch transitions are drawn at the same height as the flowchart's diamond corners, which reinforces the mapping but leaves the net's fan quite shallow; that's fine here. Nothing weak.

## Figure 3.25  (fig-03-25.png, page p-074)

**Kind.** net

**What the text says it models.** The program of Figure 3.21 (a loop computing y3 from repeated squaring), translated from the flowchart of Figure 3.22 by the rule of 3.24. Places mean "the program counter is positioned ready to execute the next instruction." Transitions a, b.T, b.F, c.T, c.F, d, e, f are the computations and the two outcomes of each decision.

**Structure, briefly.** Seven places, eight transitions. A chain (a), a loop guarded by decision b (b.T enters the body, b.F exits), inside the body a second decision c whose two branches rejoin (one via d), then e back to the loop head. Exit via b.F to f. No initial marking is drawn (the top place, the entry, is empty).

**Comparison with the flowchart 3.22.** The net keeps the flowchart's skeleton almost exactly. The main spine (a, b, c, merge, e) is one vertical center line in both. In both, the loop-back runs on the left and the loop-exit runs on the right, down past the loop and into the exit node from above. The diamond c is replaced by the place before c plus a symmetric fan of two bars that rejoin in a merge place, making a diamond shape in the net (place top, two bars sides, place bottom). The biggest change is e. In the flowchart, e is a box on the center spine below the merge, with the back arc leaving it. In the net, e is a bar placed *on the back arc itself*, on the left vertical, with its arrow pointing up. The net has one fewer row as a result.

**Placement observations.**
1. Main flow is top to bottom down a single vertical spine; the entry place is the top node, the exit place the bottom node. *Says:* a program reads top to bottom, start at the top. *R1: a sequential process with one entry and one exit runs on a single straight spine, entry first, exit last.*
2. The loop's back edge runs on the left, outside everything, as an orthogonal route: from the merge place left, up the far left, then right into the loop-head place from the side. *Says:* "go back to the test"; the loop is the rectangle bounded by the back edge. *R2: a loop's back edge is an orthogonal detour on one outer side of the spine, entering the loop head from the side, not from above.*
3. The loop exit (b.F) leaves the loop head to the right, runs down the far right, past the whole body, and turns back into the spine above the exit place. *Says:* "skip the body, go to the end." Back edge on one side, forward bypass on the other: the two never compete for a side. *R3: put backward edges and forward bypasses on opposite sides of the spine.*
4. The transition of the back edge (e) sits on the back edge's vertical, and its bar is perpendicular to that vertical, arrow pointing up. Likewise b.F sits on the right bypass's vertical. *Says:* a transition can live on a long return or bypass route; it does not need a node slot on the spine. *R4: a transition whose only role is to carry a return or bypass sits on that route's long straight leg, perpendicular to it.*
5. The decision c is a diamond of four nodes: place on top, c.T bar lower left, the c.F bar plus a place plus d on the right, merge place at the bottom. The two branches are mirror-placed about the spine but unequal in length; the short one (c.T alone) is a straight diagonal, the long one (c.F, place, d) is drawn on a parallel diagonal with its extra place pushed out to the right. *Says:* two alternatives that rejoin; one does more work. *R5: a choice that rejoins draws as a diamond around the spine: split place above, merge place below, one branch each side.*
6. Bars on the spine are horizontal. Bars on the diagonal branches of the diamond (c.F, d) are drawn *tilted*, perpendicular to their diagonal arc, but c.T is horizontal although it sits on a diagonal too. *Says:* bar orientation tracks the local arc direction, not a global axis, but inconsistently. *R6 (weak): a bar is perpendicular to the arc it sits on.*
7. Labels sit beside bars on the right (a, b.T, f, b.F, c.T) or left (e) of the bar, whichever side is open; d's label sits above-left of its tilted bar. *R7: a transition label goes at the free end of its bar.*
8. Spacing on the spine is regular: place, bar, place repeats at a near constant pitch. The diamond takes about two pitches. *Says:* equal steps of the program.

**What could be better.** Two honest weaknesses. First, the branch labels appear swapped relative to the flowchart: in 3.22, c's T branch goes through d, while in the net the branch through d is labeled c.F and the direct branch c.T. Either one figure is mislabeled or the mapping flipped sides; a reader matching the two figures by position is misled. Second, the tilted bars in the diamond are not consistent (c.T horizontal, c.F and d tilted), and the c.F bar's left end almost touches the c.T arc. Also no initial token is shown on the entry place, so where execution starts is read only from position.

## Figure 3.26  (fig-03-26.png, page p-076)

**Kind.** net fragment (two: (a) FORK, (b) JOIN)

**What the text says it models.** Dennis and Van Horn's FORK and JOIN. "FORK (executed at location i, creating two new processes at locations j and k)"; "JOIN (join the two processes which end at locations i and j into one process which continues at location k)."

**Structure, briefly.** (a) One place p_i, one transition FORK, two output places p_j, p_k. (b) Two places p_i, p_j into one transition JOIN, one output place p_k. Exact mirror images of each other. No marking.

**Placement observations.**
1. FORK: p_i directly above a horizontal bar; the two outputs sit below it, symmetric left and right. The two output arcs leave from near the two *ends* of the bar and splay outward. *Says:* one thread of control becomes two simultaneous ones; the bar is the instant of splitting. *R1: a fork is drawn as one input straight above the bar and its outputs fanned symmetrically below, arcs leaving the bar spread along its length.*
2. JOIN is FORK flipped vertically: inputs above, splayed, arcs entering near the bar ends; one output straight below the bar's center. *Says:* two threads become one; synchronization. *R2: a join mirrors a fork: inputs fanned symmetrically above, arriving spread along the bar, output straight below the center.*
3. Compare to the choice in 3.24. The shape is nearly identical (a Y), but in a choice the fan opens *at a place* into two bars, whereas here it opens *at a bar* into two places. Peterson draws no other difference: same symmetry, same splay angle. *Says:* the reader must look at which node the fan grows from to tell "or" from "and". *R3: a fan rooted at a place means choice; a fan rooted at a bar means concurrency. The drawing keeps the node at the root of the fan visually prominent (on the axis of symmetry) so this is readable.*
4. The bar is wider than in a single-input single-output step, roughly wide enough that the two splayed arcs land on separate points of it. *R4: a bar's length grows with the number of arcs on its busier side, so each arc lands on its own point of the bar.*
5. The bar label (FORK, JOIN) goes to the right of the bar at bar height, the side with no arc. Place labels inside circles.

**What could be better.** The two parts are offset diagonally on the page (a upper left, b lower right) for no reason the content gives; placing them side by side would make the mirror relation instant.

## Figure 3.27  (fig-03-27.png, page p-077)

**Kind.** net (with subnets abstracted as boxes)

**What the text says it models.** Dijkstra's "parbegin S1; S2; ...; Sn parend": execute each statement in parallel. "Each of the square boxes represents the Petri net representation of the statements ... This figure also illustrates the hierarchical nature of Petri net modeling."

**Structure, briefly.** Entry place, Parbegin transition forking to n places, each followed by a box S_i and an output place, all joining at Parend into an exit place. An n-way fork and join with a generic count. No marking.

**Placement observations.**
1. Overall shape is a hexagon (or a lozenge): entry at top center, the n branches as parallel vertical columns in the middle, exit at bottom center. *Says:* one thread enters, n run side by side, one comes out. *R1: the parallel branches of a fork/join are vertical columns side by side between the fork bar above and the join bar below.*
2. Every branch column is the same: place, box, place, at identical heights across columns. *Says:* the branches are peers and are in the same stage at the same time. *R2: corresponding nodes of parallel branches share a row.*
3. The branches are labeled S1, S2, then an ellipsis, then Sn. The ellipsis sits in the gap where the omitted columns would go, on both the place rows. *Says:* "and so on, the same". *R3: a generic count of repeated parallel parts is drawn as two at the start, an ellipsis gap, and the last one, each in its own column slot.*
4. The Parbegin and Parend bars are not centered over the branch span. They sit right of center (over the gap between S2 and Sn). The fan arcs are therefore unequal in length and angle: long shallow arcs to S1, steep short arcs to Sn. *Says:* nothing intended, I think; it looks like the bars are placed over the "middle" of the conceptual set S1..Sn where the ellipsis stands for many. Unclear whether deliberate.
5. A subnet is a square box placed exactly where a transition would go in the column: between two places, arcs in from above and out below. *Says:* "this box is a net that behaves like one big transition". *R4: an abstracted subnet with transition-like boundary occupies a transition slot in its column and is drawn as a box.*
6. Bar labels (Parbegin, Parend) sit to the right of the bar, at bar height, clear of the fan arcs.

**What could be better.** The fork and join bars are short compared with the width of the fan, so the n arcs converge into a crowded point near the bar's center and left end; the S1 arc enters the bar almost tangentially. A wider bar centered over the branches would read better and would match R4 of 3.26.
