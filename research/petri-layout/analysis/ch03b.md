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

## Figure 3.28  (fig-03-28.png, page p-079)

**Kind.** net (two open process fragments plus a shared place, in labeled boxes)

**What the text says it models.** Mutual exclusion. "The place m represents the permission to enter the critical section. For a process to enter the critical section, it must have a token in p1 or p2 ... and there must be a token in m." If both want in at once, "transitions t1 and t2 are in conflict, and only one of them can fire."

**Structure, briefly.** Each process: a marked place p_i (wants to enter), an entry transition t_i, a "Critical section" place, an exit transition, a following place. The rest of each process is elided with dotted arcs above p_i and below the last place. One shared marked place m: input to t1 and t2 (a conflict across processes), output of both exit transitions. Three tokens: p1, p2, m.

**Placement observations.**
1. Each process is a vertical sequence top to bottom inside a tall rounded box captioned "Process 1" / "Process 2" below. *Says:* each box is one process, read downward in time. Same as 3.29. *R1: a process is a vertical sequence in firing order.*
2. The sequence is not a straight line. Places sit on an outer vertical (left for Process 1, right for Process 2) and the bars are shifted toward the center, so the column zigzags: place out, bar in, place out, bar in. The inner half of each bar sticks out toward m. *Says:* the bars are where the process touches the shared resource, so they lean toward it; the places are private states, so they stay back. *R2: when a process's transitions connect to a shared place beside it, offset those transitions toward the shared place and keep the process's own places on the far line; the zigzag makes the touch points reachable without the shared arcs crossing the process.*
3. m sits on the vertical center line between the two processes, at the height of the critical-section places, which is midway between the entry bars (above) and the exit bars (below). *Says:* m belongs to neither process; it is held for exactly the span of the critical section. Its height says "this resource is in use from here to here". *R3: a resource place shared by several processes sits on the axis between them, at the height midway between the transition that takes it and the transition that returns it.*
4. m's arcs: one arc leaves m's upper side and arches up and over into the inner end of each entry bar, arriving from above; one arc leaves the inner end of each exit bar, dips below the bar and curves up into m's lower side. Together the four arcs make an X-shaped pair of loops, each loop bracketing one critical section. *Says:* take from above, give back from below; the resource's loop on each side visibly wraps the critical section it guards. *R4: a take/return pair on a shared resource is drawn as one loop on the process's inner side: the take arc enters the acquiring bar from above, the return arc leaves the releasing bar downward and curves back; the loop brackets the guarded section.*
5. The two processes are exact mirror images about m's vertical, not translated copies: p1 label left, p2 label right; t1 label left of its bar, t2 label right of its bar; "Critical section" labels on the outer side of each. *Says:* the two processes are peers competing symmetrically for one thing in the middle; neither is first. *R5: peer processes that compete for a shared central resource are drawn mirror-symmetric about the resource's axis, not as translated copies.* (Compare 3.29, where producer and consumer are not peers and are not mirrored.)
6. All labels go on the outer side, away from m: the inner side is reserved for the coupling arcs. *R6: put labels on the side of a node away from the coupling region.*
7. Initial marking: p1, p2 at the top of their processes, and m in the middle. Tokens are single centered dots. The marked places are where reading starts in each column. *R7: a process's marked place goes first in its column; a marked shared resource sits centered between its users.*
8. The rest of each process is shown as short dotted arcs (three converging into p1 from above, two diverging from the bottom place). *Says:* "this is a fragment of a larger process; more comes in and goes out here". *R8: elided context is drawn as short dotted stubs on the node's in-flow and out-flow sides, fanned, not as a box.*
9. The conflict between t1 and t2 (both take from m) is not drawn as a fan below m as in 3.24. It is drawn as two symmetric arcs leaving m's top, one to each side. *Says:* the choice is between processes, not within one, so the competitors stay in their own columns and m reaches out to both. *R9: when transitions in conflict belong to different processes, keep each in its process's column and route the shared place's arcs out to them symmetrically, rather than gathering the transitions under the place.*
10. Arcs inside a process are straight diagonals (because of the zigzag). Coupling arcs are smooth curves.

**What could be better.** The process boxes are crossed by every coupling arc; the boxes add a caption but the arcs passing through their walls make the "inside/outside" claim muddy. The mirror zigzag is clear, but the inner-most points of the arcs from m nearly touch the box walls. The bottom-place stubs are ambiguous: two diverging dotted arcs could read as a choice or a fork; that's presumably deliberate vagueness.

## Figure 3.29  (fig-03-29.png, page p-080)

**Kind.** net

**What the text says it models.** "The producer process creates objects which are put in the buffer; the consumer waits until an object has been put in the buffer, removes it, and consumes it." Place B is the buffer, and "each token represents an item which has been produced but not yet consumed."

**Structure, briefly.** Two cycles of two places and two transitions each, one marked place per cycle. One shared place B, written by the producer's second transition and read by the consumer's first.

**Placement observations.**
1. Each process is a straight vertical column: marked place, bar, place, bar, top to bottom. *Says:* one process is one sequence in time, read downward. *R: a process's places and transitions sit on one straight line in firing order.*
2. The marked place is the top of each column. *Says:* where each process starts. *R: a cycle is cut open at its marked place, which goes first in the reading direction.*
3. The two columns are the same shape, and their corresponding nodes sit at the same heights. *Says:* the two are peers, and same height means same stage. *R: parallel processes run side by side, with their stages aligned across.*
4. The return from the last bar to the first place is a long loop on the outer side of each column, the side away from B. It leaves the bottom bar downward, swings out and up, and enters the top place from above. *Says:* "and then again", without cutting through anything. *R: a cycle's closing arc runs around the outside of its column, on the side away from what the process shares.*
5. B sits in the gap between the columns, at a height between the bar that fills it (the producer's bottom) and the bar that drains it (the consumer's upper). *Says:* B belongs to neither process; it is what couples them. *R: a place shared by two processes sits between them, at the height between its writer and its reader.*
6. Producer is left, consumer is right. *Says:* items go left to right between processes, while time inside each process goes down. *R: across processes, place the giver before the taker in reading order.*
7. Bars are horizontal, across a vertical flow. Labels sit beside the bar, on whichever side no arc uses: "Produce" right, "Consume" left. *R: a bar is perpendicular to its column; a label goes on the free side.*
8. Arcs inside a column are straight. Only the returns and the coupling arcs curve, and each is one smooth stroke. *R: straight within a process, curved only between or back.*

**What could be better.** The enclosing boxes are chrome; the columns already read as processes without them.

*Added note, from re-viewing the clip alongside 3.28 to 3.31.* Two details the worked example does not mention. First, the producer's "Put in buffer" bar has two outputs, and they leave from the bar's two *ends*: the return loop from the left end, the arc to B from the right end, each dipping below the bar before turning. The output that stays inside the process goes to the outer side; the output that leaves the process goes to the inner side. Second, unlike 3.28, the two processes are translated copies with the return loop flipped to the outside of each (left loop for producer, right loop for consumer), so the pair is mirror-symmetric in its loops but not in its labels. Producer and consumer are not peers, and the drawing does not make them look identical: B's arcs go up-right, from the producer's bottom to the consumer's top, a diagonal that reads as "downstream".

## Figure 3.30  (fig-03-30.png, page p-081)

**Kind.** net

**What the text says it models.** The multiple-producer/multiple-consumer problem. "It is the same as Figure 3.29 except" with "s tokens in the initial place of the producer process and t tokens in the initial place of the consumer process. This represents s producers and t consumers executing reentrant, shared bodies of code." The text notes the alternative, duplicating the process nets, gives "the same behavior with a much larger net."

**Structure, briefly.** Identical to 3.29. Only the initial marking changes: s tokens in the producer's top place, t in the consumer's.

**Comparison with 3.29.**
1. Every node and every arc is in the same position as 3.29. The figure is, as far as I can see, the same drawing with the markings changed. *Says:* the structure did not change, so the picture did not change; a reader's eye can diff the two and find exactly the one change. *R1: a variant of a net that changes only the marking keeps every position from the base drawing.*
2. The marking is written as a symbol inside the place (s, t) instead of dots. *Says:* a symbolic or large token count. *R2: a token count that is symbolic or larger than a few is written as a numeral or symbol centered in the place, in the slot where a dot would go.* (This also means place names can't go inside the circle when the place carries a count, so names go outside, as in 3.31's B'.)
3. Multiplicity of processes is shown by multiplicity of tokens, not by repeating the column. The text explicitly prefers this as the smaller net. *R3: n identical processes running the same code are drawn as one column with n tokens, not as n columns.* (Contrast 3.27, where the n branches run *different* statements and so each gets a column.)
4. One label moved: "Remove from buffer" sits above-left of its bar in 3.30 (in the gap between the boxes, just above where B's arc enters), while in 3.29 it sits to the right of the bar. I see no structural reason for the move; it may be a redrawing artifact. It does put the label next to the arc that makes the transition interesting (the one from B). Unclear whether intended.

**What could be better.** Nothing new; the 3.29 critique (boxes are chrome) carries over. The label move between 3.29 and 3.30 breaks R1 slightly.

## Figure 3.31  (fig-03-31.png, page p-082)

**Kind.** net

**What the text says it models.** The bounded-buffer producer/consumer. "The bounded buffer is represented by two places: B represents the number of items which have been produced but not yet consumed (the number of full positions); B' represents the number of empty positions in the buffer. Originally B' has n tokens and B has zero." A full buffer stops the producer because "there is no token in B' to enable that transition."

**Structure, briefly.** 3.29 plus one place B', marked n, with an arc from the consumer's "Remove from buffer" to B' and an arc from B' to the producer's "Put in buffer". B and B' form a complementary pair: together they make a cycle Put, B, Remove, B', Put that crosses between the processes twice.

**Comparison with 3.29 (what changes, what stays).**
- Stays: both process columns, both return loops, B's position and both B arcs, all labels except one, both boxes. The new structure is added into the free space between the processes without moving anything. *R1: adding a place to an existing drawing leaves the existing nodes where they were; the new place goes in the free region nearest its connections.*
- Changes: B' appears in the central gap directly below B, at the height of the producer's Put bar. "Remove from buffer" sits above-left of its bar (as in 3.30, not as in 3.29). The Remove bar and the Put bar each gain one arc.

**Placement observations.**
1. B' sits on the same vertical as B, directly below it. *Says:* B and B' are one thing (the buffer) seen two ways, full slots and empty slots. Stacking them in one column between the processes reads as "the buffer, in two parts". *R2: complementary places (two places whose tokens always sum to a constant, together representing one resource) are stacked adjacent on one line, in the coupling region.*
2. B is above B'. The forward flow (items, producer to consumer) runs through the upper place; the backward flow (empty slots, consumer to producer) through the lower place. B's arcs rise from producer to consumer; B''s arcs descend from consumer to producer. The four arcs together make one clockwise loop: Put, up to B, up to Remove, down and around to B', left and under to Put. *Says:* the buffer is a circulation; items go across over the top, empty slots come back underneath. *R3: when two places carry opposite-direction traffic between the same pair of processes, put the forward one above and the return one below, so the pair reads as one circulation in the reading direction.*
3. 3.29's rule for a coupling place (between the processes, at the height between writer and reader) can no longer hold for both B and B', because their writers and readers are the same two bars in opposite roles, so both midpoints coincide. Peterson keeps B at the midpoint and pushes B' down to the height of the bar it feeds (Put). *R4 (tie-break): when two coupling places compete for the same position, keep the forward one at the midpoint and displace the return one toward the transition it enables.*
4. The arc B' to Put leaves B''s left side, sweeps under the producer box's bottom region, and enters the Put bar *from below*, arrowhead pointing up, near the bar's center. This is the only input arc in 3.29 to 3.31 that enters a bar against the column's flow. *Says:* this is a precondition coming from "after" in the picture's time axis, i.e. a resource that cycles. It is visually distinct, which is right, because it is the bounding condition the figure is about. *R5: an input from a place that sits downstream of the transition enters the bar from the downstream side; don't force it around to the upstream side.*
5. The arc Remove to B' leaves the left end of the Remove bar, goes steeply down through the gap, and enters B' from the right. It runs close to and crosses the B-to-Remove arc near the bar; the two arcs share the bar's left end. *Says:* the Remove bar both takes an item and frees a slot; both touches are on the side facing the buffer. The crowding at the bar's left end is a cost of R1 (nothing moved to make room).
6. B' is labeled outside, above the circle, like B; its marking n is written inside. *R6: when a place carries a marking, its name goes outside (above, for a place in a coupling region), and the marking goes inside.* (B has no marking but is labeled outside too, consistent with B'.)
7. Process-internal arcs remain straight; every coupling arc is a single smooth curve. Same as 3.29.

**What could be better.** The left end of the Remove bar is overloaded: three arcs meet at almost one point (B in, B' out, and the column arc beside it), and the B' arc grazes the B arc. Moving B' slightly further right, or attaching the B' arc to the bar's right end and routing it around the consumer's bottom, would trade a longer arc for a clean touch point; Peterson chose the shorter arc. The Put-from-below arc also runs close to the producer box wall. The underlying idea (forward on top, return below, one circulation) is very clear despite this.

## Figure 3.32  (fig-03-32.png, page p-083)

**Kind.** net

**What the text says it models.** Dijkstra's dining philosophers: five philosophers "seated at a large round table"; "between each philosopher is one chopstick", and a philosopher needs both the left and the right chopstick to eat. "The places C1, ..., C5 represent the chopsticks, and since each is initially free, a token resides in each in the initial marking. Each philosopher is represented by two places M_i and E_i representing the meditating and eating states." To move from meditating to eating "both chopsticks ... must be available."

**Structure, briefly.** Five identical philosopher cycles (M_i, start-eating bar, E_i, stop-eating bar, back to M_i). Five chopstick places on a ring; each C_i is an input to the start bars of the two adjacent philosophers (a conflict between neighbors) and an output of their two stop bars. Each start bar is a three-input synchronization (M_i plus two chopsticks); each stop bar a three-output fork. Marking as drawn: M2 to M5, E1, C2, C3, C4 have one token each; M1, C1, C5 are empty.

**Placement observations.**
1. The whole net is a five-pointed star with five-fold rotational symmetry. Each philosopher is one point of the star; each chopstick sits at an inner corner (valley) between two points. *Says:* this is a round table; philosophers sit around it with a chopstick between each pair of neighbors. The placement copies the physical seating. *R1: when the modeled system has a spatial arrangement the reader already knows (a ring, a table, a pipeline), lay the net out in that arrangement, even at the cost of the usual top-to-bottom flow.*
2. Each philosopher's cycle runs radially outward: M_i innermost, the start bar, E_i, the stop bar at the star's tip. For philosopher 1 (bottom) this is plain top-to-bottom; the others are the same column rotated by multiples of 72 degrees. *Says:* each philosopher is a process, and its time runs from the table's center outward. Rotating the column keeps "same process shape" readable across the five. *R2: when identical processes are arranged around a center, each is a straight column along its own radius, firing order outward, and the copies are exact rotations of each other.*
3. Bars are perpendicular to their philosopher's radius: horizontal for philosopher 1, tilted for the others. *Says:* bar orientation follows the local flow, not the page. *R3: a bar is perpendicular to its process's flow direction, wherever that points.* (Same as 3.25's tilted bars, but here applied consistently.)
4. The chopsticks lie on an inner pentagon, at a smaller radius than the stop bars and roughly at the radius of the M/E places, each exactly between two philosopher axes. *Says:* each chopstick is shared by exactly its two neighbors and belongs to neither. *R4: a resource shared by two adjacent processes in a ring sits on the bisector between their axes.* (This is 3.28/3.29's "between the processes" rule, applied angularly.)
5. Arcs from a chopstick to its two start bars are short and run inward of the star; arcs from the two stop bars (at the tips) back to the chopstick are long straight lines forming the star's outline. *Says:* each chopstick is taken near the table's center and given back from the far end of the eating state, so each philosopher's pair of take and return arcs brackets E_i, as m's loop bracketed the critical section in 3.28. *R5: (same as 3.28 R4) the take and return arcs of a resource bracket the section that holds it.* The star outline is not decoration; it is the set of release arcs.
6. Each philosopher's own return arc (stop bar to M_i) is a long looping curve that leaves the tip bar and swings around to enter M_i from the side or above. The loop always swings to the same rotational side (for philosopher 1 the right, toward C5; checking each of the other four, it goes toward the neighbor at the same rotational offset). *Says:* identical processes keep identical drawing, even for the return. *R6: in rotationally repeated processes, every copy routes its return arc to the same rotational side.*
7. Synchronization: each start bar has three inputs, M_i from the center side straight along the radius, and the two chopsticks from the two sides, arriving at the bar's two ends. *Says:* the bar waits on its own state plus one resource on each side. *R7: a synchronizing bar takes its process input on its axis and its resource inputs at its ends, each from the side where that resource sits.*
8. Tokens are single centered dots. Labels sit beside each place but the side varies without a rotational pattern (M1 left, M2 above, M3 right, M4 right, M5 left; C labels mostly toward the center). Bars are unlabeled.
9. The conflicts (two neighbors both wanting C_i) are drawn exactly as in 3.28 R9: the shared place sends one arc to each competitor, which stays in its own place.

**What could be better.** This is the most crowded figure in the stretch. Every philosopher's return loop crosses the release arcs of a chopstick, and the loops are large, so the star's points are knotted. A reader can see the round table instantly but has to work to trace one philosopher's cycle. Placing the return arc *inside* the point (between M_i and the inner arcs) would be shorter, but the inner region is where the take arcs run. Second, the label sides are inconsistent across the five copies, which weakens the rotational repetition. Third, the marking drawn does not match the text's "initial marking": E1 holds a token and C1, C5, M1 are empty, so the figure shows philosopher 1 eating, not the initial state. A reader matching text to figure is misled.

## Figure 3.33  (fig-03-33.png, page p-084)

**Kind.** net

**What the text says it models.** Readers/writers with at most n readers. "Writer processes must mutually exclude all other reader and writer processes, but multiple reader processes can access the shared data simultaneously." Caption: "There are initially s readers and t writers." The solution: a central place with n tokens; a reader takes one, a writer takes all n.

**Structure, briefly.** Two cycles of two places and two bars, like 3.30 (top places marked s and t). One shared central place marked n. Reader start takes 1 token from it, reader end returns 1. Writer start takes n (arc weight n), writer end returns n (weight n). It is the mutual-exclusion net of 3.28 with weights.

**Placement observations.**
1. Two straight vertical columns, outer return loops, top places marked with symbolic counts: exactly the 3.30 frame. Caption-like labels "Readers" and "Writers" sit under each column; there are no boxes. *Says:* two classes of process, each a cycle read top to bottom, with many instances (s, t) sharing one body of code. *R1: a class of identical processes is one column whose top place carries the instance count; its name goes beneath the column.* The boxes of 3.28 to 3.31 are gone and nothing is lost, which supports the 3.29 critique that the boxes are chrome.
2. The shared place sits on the center line between the columns, at the height of the Reading and Writing places, which is midway between the start bars (which take from it) and the end bars (which return to it). Exactly 3.28's m. *Says:* the resource is held for the span of reading or writing. *R2: (= 3.28 R3) a held resource sits between its users at the height of the state that holds it.*
3. The four coupling arcs form an X (a bow tie): from the center place up and out to each start bar, entering the bar's inner end from above; from each end bar's inner end, dipping down then up into the center place from below. Each side's pair of arcs forms one loop that brackets that side's held state. *Says:* take from above, give back from below; the two loops touching at the center say "readers and writers compete for the same thing". *R3: (= 3.28 R4) a take/return pair is one loop on the process's inner side bracketing the held state.*
4. The layout is mirror-symmetric about the center line even though readers and writers are not peers and behave differently. In 3.29 the producer and consumer are not mirrored in their coupling (B's arcs run diagonally from one's bottom to the other's top). Comparing the three: the mirror appears when both processes do the same thing to the shared place (take then return), and the diagonal appears when one writes and the other reads. *R4: if two processes relate to a shared place the same way (both acquire-release), mirror them about it; if one produces into it and the other consumes from it, place it so the arcs run diagonally from producer's output bar to consumer's input bar.*
5. The difference between readers and writers is carried entirely by arc weight. The weighted arcs are drawn as hollow double lines with a hollow arrowhead, with "n" written alongside, mid-arc, on the outer side of the curve. *Says:* "this arc moves n tokens at once"; the visual weight equals the token weight, and the reader sees at a glance which side is the heavy one. *R5: a weighted arc is drawn visibly heavier than a unit arc, with its weight written beside the middle of the arc, outside the curve.*
6. Place labels "Reading" and "Writing" sit on the *inner* side of their places, facing the center, unlike 3.28 where labels went outer. The outer side here is taken by the return loops, while the inner side at that height is open (the coupling arcs pass above and below it). *Says:* labels go wherever the space at that node's height is free, not to a fixed side. *R6: a label goes on the side of its node that no arc uses at that height; prefer the side facing the related region if both are free.* This is the operative rule; 3.28's "outer side" is a case of it.
7. The central place has no name, only its marking n. *Says:* the text names it nowhere either; the marking is its meaning (the capacity). Unclear whether an unnamed place is a good default; here it works because it is the only shared place.
8. Bars are horizontal and centered on the columns (no zigzag as in 3.28). The coupling arcs still attach at the inner ends of the bars. Bars are unlabeled.

**What could be better.** Bars are unlabeled, so a reader has to infer "start reading", "stop writing" from the places. The weighted arcs are visually heavy and the "n" labels nearly collide with them. Otherwise this is one of the cleanest figures in the chapter: it combines the 3.28 bow tie with the 3.30 multi-instance columns and drops the boxes.

## Figure 3.34  (fig-03-34.png, page p-085)

**Kind.** net fragment

**What the text says it models.** Dijkstra's semaphore operations. "Each semaphore is modeled by a place; the number of tokens in that place indicate the value of the semaphore. A P operation uses the semaphore place as an input; a V operation uses the semaphore as an output."

**Structure, briefly.** A three-place chain with bars P(S) and V(S); a place S that is an input to P(S) and an output of V(S). No marking shown. It is one half of 3.28: one process and its mutex.

**Placement observations.**
1. The process is a straight vertical column at the left: place, P(S), place, V(S), place. *Says:* a fragment of one process's code, top to bottom.
2. S sits well to the right, at exactly the height of the middle place, which is midway between P(S) and V(S). *Says:* the semaphore is held (decremented) during the section between P and V. *R1: (= 3.28 R3) the resource sits beside the process at the height of the state it guards.*
3. The arc S to P(S) leaves S's top, arches up and left, and enters the right end of P(S) from above. The arc V(S) to S leaves the right end of V(S), dips below the bar, and sweeps right and up into S's lower left. The two arcs form a single teardrop loop that encloses the guarded middle place's right side. *Says:* exactly the take/return bracket of 3.28, isolated. *R2: (= 3.28 R4) take from above into the acquiring bar's near end; return from the releasing bar's near end, dipping down, back to the resource.*
4. Transition labels P(S), V(S) sit to the left of their bars, the side away from S. S's label sits to its right, away from the process. *R3: labels go on the side away from the coupling loop.*
5. The resource is placed far from the column, about four place-diameters away, so the loop is large and round. *Says:* S is a separate object, shared with other processes not shown; the empty space on its other side is where those would go. This is my inference; the figure shows only one process. *R4 (tentative): a shared place drawn with only one of its users still sits at the distance it would have between two users, leaving room for the others.*

**What could be better.** The loop is larger than it needs to be for one process, and no marking is shown on S, so the reader cannot tell whether this is a binary semaphore. Otherwise clean.

## Figure 3.35  (fig-03-35.png, page p-087)

**Kind.** not a net (PERT chart: an activity-on-node precedence DAG, from Levy, Thompson and Wiest 1963)

The construction of a house: 22 activities (a, 0 "Start" to x, 0 "Finish"), each a circle holding "letter, duration" with its name as an outside label, and precedence arcs. Analyzed below only as the source for 3.36.

## Figure 3.36  (fig-03-36.png, page p-088)

**Kind.** net

**What the text says it models.** The PERT chart of 3.35 converted to a net: "Each activity in a PERT chart is represented by a place, while the precedence constraints are represented by the transitions." Caption: "some extra nodes have been added. These are necessary to properly reflect the precedence constraints and explicitly represent situations where waiting must occur."

**Structure, briefly.** An acyclic net. 22 activity places named a to x, two small unnamed extra places, and bars that act as forks (after c, d, f, l, t), joins (before v, k, t, s, x), a fork-join (after d: e, i, and an extra place) and plain steps. One token on a (Start). No cycles, no conflicts: every place has at most one output bar.

**Comparison with the PERT chart 3.35.**
- Kept: overall top-to-bottom time, the a-b-c spine at top center, Finish at bottom center. The three-way split after Foundation (c) into a left branch (r, Storm drains), a center branch (d), and a right branch (f). The left branch is a long vertical r down to v, w, then a long diagonal into x. The lower right cluster (l fanning to o, m, n; then t, s, u converging on x) keeps the same left-right order.
- Changed: in 3.35, e (Brickwork) sits on d's row, directly left of d with a horizontal arc; in 3.36 e drops one row below d, into the fan of d's fork bar. The j/k/l spine shifts to the column of f/g in the net (it was under d in 3.35). r drops from just below c to the row of e, i, g. The activity names are gone (only letters remain, plus "Start" and "Finish"). The durations are gone. Places are a uniform small size; the two extra places are visibly smaller.

**Placement observations.**
1. Flow is strictly top to bottom; Start is the top node with the only token, labeled outside to its right; Finish is the bottom node, labeled likewise. *Says:* a project read from start to finish. *R1: in an acyclic net, every arc points down; the single marked source is at top center and the single sink at bottom center.*
2. Every bar is horizontal, and every arc enters a bar from above and leaves it below. A fork bar is a wide bar with its outputs leaving from points spread across its length (c's bar: r from the left end, d from the center, f from the right end). A join bar collects its inputs the same way (k's bar: i from upper left, j from above center, h from upper right). *Says:* the bar is the moment when all predecessors are done, or when several activities start at once. *R2: (= 3.26 R1, R2) a fork or join bar is wide enough to take each arc at its own point, and the left-to-right order of arcs on the bar matches the left-to-right order of the nodes they connect.*
3. Nodes are placed in rows, and siblings released by the same bar share a row (e, i, and the extra place below d's bar; m and n below l's bar). But nodes are not always placed at their earliest row: r, released by c's bar, sits on the row of e/i/g, two rows lower than d. *Says:* r is shown as concurrent with the next wave rather than with d. I think this keeps the left branch straight and short-armed; it is not semantically motivated. Unclear. *R3 (weak): an activity with a long independent run may be pushed down to align with the wave it actually runs alongside, keeping its arcs straight.*
4. Independent threads become columns: r-v-w on the far left, e-p-q next, the k-l spine on the right center, h and u on the far right. Long vertical arcs (r to v's bar) carry a branch with nothing on it across many rows. *Says:* parallel work streams side by side. *R4: concurrent branches from one fork become side-by-side columns; a branch with fewer steps is a long straight vertical arc rather than being compressed upward.*
5. The two extra places are drawn smaller than activity places and unnamed. One sits between d's fork bar and j's join bar; the other between t's fork bar and s's join bar. *Says:* these are bookkeeping, not activities; the size difference tells the reader to discount them. *R5: a place added only to carry a precedence (not a modeled activity) is drawn smaller and unnamed.*
6. Arcs are almost all straight lines, vertical within a column and diagonal between columns. The only curve is q into v's bar, a short hook from the right. Arcs into a join converge from both sides symmetric where possible (m and n into t's bar; s, w, u into x's bar).
7. Names are written inside the circles (single letters), because there are no tokens except on a. Only Start and Finish get outside text labels.

**What could be better.** Dropping the activity names makes the net much harder to read than the PERT chart; a reader must flip back to 3.35 for every letter. Shifting the main spine from d's column to f's column breaks the visual correspondence with 3.35 in the middle of the figure, and e's move from beside d to below d is unexplained. There is a wide empty region in the center-left (between q/v and the k spine) while the right side is crowded (f, g, j, h, the extra place); the drawing is unbalanced. The long w-to-x diagonal is the longest arc in the figure and is fine semantically but looks like a crossing hazard; it crosses nothing.

## Figure 3.37  (fig-03-37.png, page p-089)

**Kind.** net

**What the text says it models.** From Shapiro and Saint's compiler work: a program reduced to "only the minimal sequencing constraints, i.e., allowing maximal parallelism", which when executed generates every legal instruction ordering. This net yields "sequences abcdef, bacdef, abcedf, and bacedf."

**Structure, briefly.** Two parallel threads, each place, bar, place (a on top, b below), synchronized by c, which takes both and releases two new threads (d on top, e below), which are joined by f into one final place. Two initial tokens, on the two leftmost places.

**Placement observations.**
1. Flow is left to right, not top to bottom. Bars are therefore vertical. *Says:* a timeline of instruction issue, read like a sentence. *R1: bar orientation is always perpendicular to the main flow; if the flow is horizontal, bars are vertical.* This is the first horizontal-flow figure in this stretch, and it is no harder to read; the direction is a free choice, held consistent within one figure.
2. The two threads are two horizontal rows, top and bottom, with corresponding nodes at the same x. a and b are aligned, d and e are aligned. *Says:* a and b can happen in either order or at once; so can d and e. Same column means "same stage". *R2: (= 3.29 R3, 3.27 R2) concurrent threads are parallel lanes with stages aligned across.*
3. c sits on the horizontal center line between the two rows, its bar vertical and spanning the gap. Its two inputs arrive diagonally at its two ends (top end from the top row, bottom end from the bottom row), and its two outputs leave diagonally from the same two ends. The result is an X centered on c. *Says:* both threads must reach this point; then both continue. A synchronization point between lanes sits between the lanes. *R3: a transition that synchronizes several lanes sits on the axis between them, its bar spanning them, each lane's arc attached at the end nearest that lane.*
4. f, the final join, sits on the center line too, and the single output place follows it on that line. *Says:* the threads merge into one. *R4: (= 3.26 R2) the output of a join continues on the join's axis.*
5. Initial tokens are on the leftmost places, the start of each lane. *R5: initial marks at the start of each lane.*
6. Labels: top-row bars labeled above (a, d), bottom-row bars below (b, e); c above its bar's top end; f below its bar's bottom end. Places unnamed. *Says:* labels go to the outside of the lane, away from the space between lanes. *R6: (= 3.28 R6) labels go on the side away from the region between lanes.*
7. The whole figure is mirror-symmetric about the horizontal center line. All arcs are straight; spacing between stages is uniform.

**What could be better.** Nothing significant. The places are unnamed, which is fine because the text talks only about transitions. This is a very clean small figure.

## Figure 3.38  (fig-03-38.png, page p-090)

**Kind.** net

**What the text says it models.** Chemical reactions: "Chemical equations are modeled by transitions; reactants are modeled by places. The number of tokens in a place indicate the amount of that reactant." The two equations are H2C2O4 -> 2CO2 + 2H+ + 2e- and 2e- + 2H+ + H2O2 -> 2H2O.

**Structure, briefly.** Two transitions in sequence. The first takes H2C2O4 and produces CO2, H+, e- (each weight 2). The second takes e-, H+ (weight 2 each) and H2O2 and produces H2O (weight 2). Marking: two tokens in H2C2O4, three in H2O2.

**Placement observations.**
1. Overall flow is top-left to bottom: H2C2O4 at top left, reaction 1 just below-right of it, the intermediates e- and H+ in the middle, reaction 2 near the bottom, H2O at the bottom. *Says:* reaction 1 happens first; its products feed reaction 2. *R1: a sequence of transitions linked through intermediate places reads in the main direction, intermediates between producer and consumer.* (= 3.29 R5 in a non-process setting.)
2. The two intermediates e- and H+ sit side by side between the two reactions, each with a straight double arc in from reaction 1 and a straight double arc out to reaction 2. *Says:* both are made by the first and used by the second; they are peers. *R2: places with the same producer and the same consumer sit side by side at the same depth between them.*
3. CO2, a final product of reaction 1 that nothing consumes, is placed at the top right, *above* the reaction that produces it, with its arc running up and right. *Says:* a by-product that leaves the system; it is pushed out of the main flow so the reader's eye follows the chain to H2O. *R3: an output place that feeds nothing else (a sink) may be placed off to the side of the main flow, even against the flow direction, to keep the main chain uncluttered.* (Weak: this is the opposite of R1 in 3.36, where the sink sits at the bottom. The difference is whether the sink is *the* result or a by-product.)
4. H2O2, a reactant needed only by reaction 2, sits at the right at mid height, feeding reaction 2 from the upper right. It is not placed at the top with the other initial reactant. *Says:* this input enters at the stage where it is used. *R4: a marked source place that feeds only a later transition sits near that transition, entering from the side, rather than at the top of the drawing.*
5. Arcs of weight 2 are drawn as double lines with a single arrowhead; unit arcs are single lines. No number is written. *Says:* the stoichiometric coefficient is visible as line weight. Compare 3.33, where weight n is a hollow double line plus the letter n. *R5: (= 3.33 R5) a weighted arc looks heavier than a unit arc; for small weights the line count can stand for the number.*
6. Tokens are drawn as dots placed loosely inside the place (two in H2C2O4, three in a triangle in H2O2). *R6: small token counts are drawn as separate dots arranged in a compact cluster.*
7. Labels (chemical formulas) sit to the right of each place, except e-, which sits left (its right side is used by its outgoing arc). Bars are unlabeled.
8. Both bars are tilted, at angles that do not match any obvious flow axis: reaction 1 is a steep diagonal, reaction 2 nearly horizontal but slanted. Unclear why.

**What could be better.** This is a loose, hand-placed drawing. The bars' tilts look arbitrary; reaction 1's bar is so short and slanted that the five arcs meeting it almost collide at one point, and it is hard to see which side is input and which output. The CO2 double arc runs very close to the H2C2O4 input arc. The overall shape (diagonal top-left to bottom-right) has no stated meaning.

## Figure 3.39  (fig-03-39.png, page p-091)

**Kind.** net

**What the text says it models.** "The combination of hydrogen and ethylene to form ethane (H2 + C2H4 -> C2H6) only occurs in the presence of platinum." Platinum is a catalyst: needed for the reaction, not consumed.

**Structure, briefly.** One transition. Inputs H2 and C2H4, output C2H6, and a self-loop with Pt (input and output). No marking.

**Placement observations.**
1. Flow is left to right; the bar is vertical. The two reactants sit at the left, one above and one below the bar's height, symmetric; their arcs converge on the bar's two ends... more exactly on its lower half and middle. The product sits to the right on the bar's axis. *Says:* two things combine into one. *R1: (= 3.26 R2, 3.37 R3) a join takes its inputs symmetrically from the upstream side and puts its output on its axis downstream.*
2. Pt sits directly above the bar, off the main flow axis, perpendicular to it. Its two arcs (one in, one out) attach at the bar's top end and bow apart into a lens shape. *Says:* platinum is involved but not part of the stream; it is "beside" the reaction, and the closed lens says "it comes back". *R2: a place in a self-loop with a transition (a catalyst, a read-only condition) sits perpendicular to the main flow, beside the transition, joined by two arcs bowed apart into a lens.*
3. Labels sit on the outer side of each place: H2 above, C2H4 below, Pt right of the place, C2H6 below. *R3: labels on the side away from the transition.*
4. Arcs are straight except the self-loop pair, which must be curved to be two arcs.

**What could be better.** The two reactant arcs enter the vertical bar at different points but not at its ends, and the H2 arc arrives close to the Pt arcs, crowding the bar's upper part. The bar could be longer. Otherwise clear.

## Figure 3.40  (fig-03-40.png, page p-092)

**Kind.** net

**What the text says it models.** From Meldman and Holt: legal systems where "several actors (judges, lawyers, defendants, clerks, and so on) may concurrently perform actions"; this net is "a model of the initial stages of a civil action." Places are named by actor letter and step: P plaintiff, C clerk, M marshal, D defendant.

**Structure, briefly.** Four actors, each a short chain of states. Most transitions are two-actor interactions: two inputs (one state per actor) and two outputs (the next state of each). After service, the defendant's state D2 has a three-way choice (answer, motion, let 20 days pass), each followed by a final interaction with the waiting plaintiff P2. No marking drawn. Acyclic.

**Placement observations.**
1. Flow is top to bottom, with transition names as full English sentences to the right of each bar. *Says:* a procedure, read like numbered steps. *R1: when transitions carry long descriptive names, keep the bars in one column region and put the names in a consistent band to the right.*
2. Each two-actor interaction is drawn as an X: the two actors' current states above the bar, one on each side, their arcs converging on the bar; the two actors' next states below, each on the *same side* as that actor's input. Clerk stays left and marshal right in "Clerk delivers summons"; marshal left and defendant right in "Marshal serves". *Says:* two parties meet, act, and each goes on its way; the side tells you who is who. *R2: a transition with one input and one output per participant is an X; each participant keeps its side across the bar.*
3. The interactions form a staircase moving down and to the right: each new actor enters at the upper right of its first interaction (M1 beside C3, D1 beside M2), and the actor that is finished drops out at the lower left (C4, M3 are dead-end places on the left). *Says:* the case is handed from clerk to marshal to defendant; each hand-off moves the action one step right. Actors appear when they are needed and are left behind when done. *R3: in a chain of hand-offs between actors, each actor's initial place enters beside the interaction that first needs it, on the side away from where the action came from; an actor's final state stays on the side it leaves from.* (Same idea as H2O2 entering at its stage in 3.38.)
4. The plaintiff's waiting state P2 is produced by the very first transition, but it is placed far down at the left edge, at the height just above the three final interactions it feeds. Its incoming arc runs as one long vertical line down the left margin. *Says:* the plaintiff files and then waits through the whole middle of the procedure; the long arc *is* the wait. *R4: a place that is produced early and consumed late is placed near its consumer, with a long straight arc from its producer along the margin; the arc's length shows the wait.*
5. The defendant's three-way choice at D2 is a fan of three bars on one row below D2, each with a straight drop to its outcome place (D3, D4, D5), then a long straight column down to a final interaction. The three columns are spaced evenly and their nodes are at the same heights. *Says:* three alternative paths, parallel and equal in standing. *R5: (= 3.24 R4) the alternatives of a choice are bars side by side on one row below the place, each starting a column; corresponding steps in the alternatives align across.*
6. The three final interactions are drawn identically: same X, plaintiff output on the left, defendant output on the right, labels at the same offset. *Says:* the same kind of event closes each alternative. *R6: identical substructures in parallel alternatives are drawn identically.*
7. P2's three output arcs run as long, shallow, nearly parallel diagonals from the left edge to the three final bars, crossing the D3 and D4 columns. *Says:* the plaintiff participates in whichever ending happens. It is clear but crowded.
8. Place labels sit beside each place, mostly on the left; a few on the right (C1, C2, M1, D2) where the left is used by an arc. Labels never sit inside circles even though there are no tokens.

**What could be better.** P2's three arcs cut across two of the defendant's columns, and the arc to "D defaults" is long enough that it is hard to see where it ends. Placing P2 below the three outcome columns, or the plaintiff's line on the left with the final bars stepping toward it, might avoid this, but would break R4's "the long arc is the wait". No initial marking is shown, so a reader must infer that P1, C1, M1, D1 are the starting states (they are the places with no inputs). The staircase leaves a large empty triangle at lower left and pushes the long labels off the right edge ("D defaults" is at the page margin).

## Recurring rule candidates across 3.24 to 3.40

1. **A held resource sits between its users, at the height of the state that holds it; take and return arcs form one loop that brackets that state.** The take arc enters the acquiring bar from above at its near end; the return arc leaves the releasing bar's near end, dips, and curves back. 3.28 (m), 3.32 (chopsticks), 3.33 (n), 3.34 (S); the same between-placement for produced/consumed places in 3.29, 3.31 (B, B').
2. **How two processes relate to a shared place decides their symmetry.** Both acquire and release it: mirror them about it (3.28, 3.33). One produces into it and the other consumes: the arcs run diagonally from producer's output bar to consumer's input bar, producer first in reading order (3.29, 3.30, 3.31). Many peers around one ring: rotational symmetry (3.32).
3. **Concurrent threads are parallel lanes with stages aligned across; a fork or join bar spans the lanes and takes each lane's arc at its own point on the bar.** 3.26, 3.27, 3.36, 3.37, 3.39, 3.40 (choice columns); 3.29 to 3.33 for processes.
4. **The node at the root of a fan tells "or" from "and".** Fan from a place into bars side by side on one row = choice (3.24, 3.25, 3.40). Fan from a bar into places = fork (3.26, 3.27, 3.36). Choices between processes stay in their own columns with the shared place reaching out to both (3.28, 3.32, 3.33).
5. **Bars are perpendicular to the local flow; labels go on whichever side of a node no arc uses at that height, usually away from the coupling region.** 3.24, 3.25, 3.28, 3.32, 3.33, 3.34, 3.37, 3.39, 3.40.
6. **Cycles are cut open at the marked place, which starts the column; the return arc runs on the outer side, away from shared structure; repeated processes route their returns identically.** 3.29, 3.30, 3.31, 3.33, 3.32 (rotationally), 3.25 (loop back on one side, forward bypass on the other).
7. **A place enters the drawing near the transition that consumes it, not at the top; a place produced early and consumed late sits by its consumer with a long straight arc.** 3.31 (B' displaced toward Put), 3.38 (H2O2), 3.40 (M1, D1, P2), 3.36 (r pushed down; weak).
8. **Variants and repetitions keep positions.** A changed marking or added place leaves everything else where it was (3.30, 3.31 vs 3.29); identical substructures are drawn identically (3.27, 3.32, 3.40); n identical processes are one column with n tokens, not n columns (3.30, 3.33).
