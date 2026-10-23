# Chapter 3, part a: figures 3.1 to 3.20

Placement analysis per `PROTOCOL.md`. Positions are given in the clip's pixel coordinates (x right, y down) where precision helps.

## Figure 3.1  (fig-03-01.png, page p-049)

**Kind.** net

**What the text says it models.** A simple machine shop: "The machine shop waits until an order appears and then machines the ordered part and sends it out for delivery." Conditions are a (shop waiting), b (order waiting), c (shop working on the order), d (order complete). Events are 1 order arrives, 2 shop starts, 3 shop finishes, 4 order sent for delivery.

**Structure, briefly.** A chain source bar, place, bar, place, bar, place, sink bar (the order's life). One extra place, "The machine shop is idle", is a self-contained resource: output of "Processing is complete", input of "Processing starts". So the shop forms a cycle start, processing, complete, idle, start, whose top half is shared with the order chain. No token is drawn anywhere, including the idle place. The text does not say what the initial marking is.

**Placement observations.**
1. The order's chain is one straight horizontal line at y about 1045, running left to right from the source bar "An order arrives" (x 110) to the sink bar "The order is sent for delivery" (x 1330). Spacing between successive nodes is near uniform. *Says:* one order's life, read left to right in time; the source bar at the far left is where to start, the sink at the far right is where it ends. *R: the main object's sequence of states sits on one straight line in firing order; a source transition is the first element of the line and a sink transition the last.*
2. The idle place sits below the chain at x about 725, centered between "Processing starts" (x 520) and "Processing is complete" (x 930), directly under "The order is being processed". *Says:* the shop's idleness is the complement of "being processed"; it hangs under the span of the line where the shop is busy, bracketing that span. *R: a resource place that a stretch of the main line acquires and releases sits off the line, centered under the stretch, at the midpoint between its acquiring and releasing transitions.*
3. The two resource arcs form a symmetric ellipse: "complete" to idle leaves the lower end of the bar, swings out right and down, enters idle from the right; idle to "starts" leaves left, swings up left, enters the lower end of the bar. *Says:* "busy, then idle, then busy again" as one closed ring of which the chain is the top. The resource's cycle reads as a loop around the thing it serves. *R: a resource's return runs on the far side of the resource place from the main line, as one smooth loop; the loop's two halves mirror each other.*
4. Bars are vertical across a horizontal flow. Arcs within the chain attach at the bar's midpoint; the resource arcs attach to the bar's lower end, the end facing the resource. *R: a bar is perpendicular to the main flow; an arc to an off-line node attaches at the end of the bar that faces that node.*
5. Labels. Most labels sit above their node in a row at y about 930 ("An order arrives", "An order is waiting", "Processing starts", "Processing is complete", "The order is complete"). Two sit below: "The order is being processed" and "The order is sent for delivery". The below ones seem to alternate to avoid long labels colliding in the top row; I infer this from spacing, the drawing does not say why. The idle label sits below its place, away from the chain. *R: labels go in a band on the side of the line away from attached loops; when adjacent labels would collide, alternate one to the other side.*
6. All chain arcs are straight; only the resource arcs curve. *R: straight on the main line, curved only for side loops.*

**What could be better.** No token marks where the system starts. The label alternation above and below the line is uneven and makes "being processed" look like it belongs to the resource loop below.

## Figure 3.2  (fig-03-02.png, page p-051)

**Kind.** net

**What the text says it models.** A machine shop with three machines M1, M2, M3 and two operators F1, F2. "Operator F1 can operate machines M1 and M2 while operator F2 can operate machines M1 and M3. Orders require two stages of machining. First they must be machined by machine M1 and then by either machine M2 or M3." Places: a order waiting for M1, b order waiting for M2 or M3, c order complete, d M1 idle, e M2 idle, f M3 idle, g F1 idle, h F2 idle, i M1 operated by F1, j M1 operated by F2, k M2 operated by F1, l M3 operated by F2. Transitions: 1 order arrives, 2/3 F1 starts/finishes on M1, 4/5 F2 starts/finishes on M1, 6/7 F1 starts/finishes on M2, 8/9 F2 starts/finishes on M3, 10 sent for delivery.

**Structure, briefly.** The order flows 1, a, choice {2 or 4}, {i or j}, {3 or 5}, b, choice {6 or 8}, {k or l}, {7 or 9}, c, 10. Each start transition synchronizes three inputs: the order place, a machine-idle place, an operator-idle place. Each finish transition releases machine and operator. Resources: d is shared by both operators; e is used only with F1, f only with F2; g serves stage 1 and stage 2 for F1, h likewise for F2. Initial marking: one token each in d, e, f, g, h (all resources idle), order places empty.

**Placement observations.**
1. The order flow runs left to right along a horizontal axis at y about 665: bar 1 (x 30), a (185), b (800), c (1410), bar 10 (1560). The source bar is at the far left, the sink at the far right. *Says:* an order enters on the left, leaves on the right; this is the story's spine. *R: the main object's flow defines the primary axis; source at its start, sink at its end, its waiting places on the axis.*
2. The whole drawing is mirror-symmetric about that axis. The upper half holds everything F1 does (2, i, 3, 6, k, 7, e, g); the lower half holds everything F2 does (4, j, 5, 8, l, 9, f, h). Corresponding nodes sit at exactly mirrored positions: 2 and 4 both at x 385, 3 and 5 at x 670, 6 and 8 at x 930, 7 and 9 at x 1210, i at y 490 and j at y 845, g at y 80 and h at y 1255. *Says:* the two operators are interchangeable peers doing the same kind of work; above the axis is F1's world, below is F2's. A reader sees the alternatives as alternatives because they are reflections. *R: when one place chooses between alternatives that do the same kind of work, the alternatives are drawn as mirror images on either side of the main axis, node for node.*
3. Each choice is a symmetric fork off the axis: a sends one curved arc up to 2 and one down to 4; b sends one up to 6 and one down to 8. *Says:* "either this way or that", with neither favored. *R: a choice place sits on the axis and its competing transitions sit symmetrically above and below it, at the same distance along the flow.*
4. Stages align across the halves. Stage 1 (machining on M1) occupies x 385 to 670; stage 2 (M2 or M3) occupies x 930 to 1210. Within each stage the activity is a horizontal rung: start bar, "operated by" place, finish bar (2, i, 3 and 4, j, 5 and 6, k, 7 and 8, l, 9). *Says:* each rung is one operator using one machine on one order; equal x means equal stage. *R: an activity (start, in-progress place, finish) is a short straight rung parallel to the main axis; parallel alternatives' rungs share the same x span.*
5. d (M1 idle), shared by both operators, sits on the axis at x 540, between the two stage-1 rungs and centered on them. Its four arcs form an X: d to 2 (up-left), d to 4 (down-left), 3 to d (from up-right), 5 to d (from down-right). *Says:* M1 belongs to neither operator; it is what both stage-1 rungs compete for. Being inside the diamond formed by 2, 3, 4, 5 makes it read as the hub that both rungs borrow from and give back to. *R: a resource shared by mirrored alternatives sits on the mirror axis, centered between the alternatives' rungs, inside the box their start and finish transitions form.*
6. e (M2 idle) and f (M3 idle), each used by only one operator, sit in their own half, just outside their rung: e at (1050, 285), above k at (1050, 490); f at (1050, 1050), below l at (1050, 845). Their loops are tight: 7 to e and e to 6 are short arcs, as are 9 to f and f to 8. *Says:* a private resource belongs to its half and stays next to the one activity that uses it. *R: a resource used by only one activity sits beside that activity's rung, on the side away from the main axis, centered on the rung, with a short tight loop.*
7. g (F1 idle) is at the top extreme, h (F2 idle) at the bottom extreme. Horizontally, both sit at x 800, between stage 1 (x 385 to 670) and stage 2 (x 930 to 1210), and directly above/below b. *Says:* an operator serves both stages, so the operator place sits at the horizontal middle of the two stages it serves, as far from the axis as possible because it is the outermost, most general resource of that half. *R: a resource used by several activities sits at the horizontal midpoint of those activities, on the outer side of everything else in its half; the more activities a resource spans, the farther out it sits.*
8. The ordering outward from the axis is therefore: order flow (axis), activity places (i, k / j, l), machine resources (e / f), operator resources (g / h). d is the exception because both halves share it. *Says:* distance from the axis encodes how specific vs. general a condition is, and which half owns it. *R: in each half, layer outward from the axis: the main object's states, then activity places, then single-use resources, then multi-use resources.*
9. Resource returns. The operator returns are the widest arcs in the drawing. 7 to g leaves bar 7's top, swings out right past e (x up to 1290) and comes back left into g's right side. 9 to h mirrors it below. 3 to g and 5 to h are short near-vertical arcs. g to 2 is a long arc down-left; g to 6 a shorter arc down-right. *Says:* "the operator is free again" closes a cycle; the far return swings around the outside of everything in that half rather than through it. *R: a return arc to an outer resource runs on the outside of the half, swinging around any nearer nodes, never between the axis and the resource.*
10. Synchronization. Each start bar collects three inputs from three different directions: for 2, a from lower-left (the axis), d from lower-right (the axis), g from above (outside). For 6: b from lower-left, e from right, g from above. *Says:* the three things that must coincide come from three different layers of the drawing, and the direction of approach tells the reader which layer: from the axis means the order or the shared machine, from outside means a resource. *R: a synchronizing transition sits where its inputs' layers meet; each input arrives from the direction of its own layer.*
11. Bars are vertical throughout, perpendicular to the horizontal flow. Transition labels (numbers) sit just below the bar (1, 2, 3, 4, 5, 6, 7, 8, 10) or, for 9, also below; none collide with arcs. Place labels are letters placed just outside the circle on the side free of arcs: right for a, d, b, e, k, l, f; left for c (its right side has the arc to 10); above for i, below for j; lower-left for g, upper-left for h. Tokens are centered dots. *R: a bar is perpendicular to the main flow; a place's label sits on the side of the circle no arc uses, mirrored with its counterpart in the other half.*
12. Arc shape. Inside each rung, arcs are straight horizontals. All arcs that change layer (axis to rung, resource to bar) are single smooth curves. *R: straight within an activity rung, one smooth curve for any arc that leaves the rung.*

**What could be better.** d sits on the axis in line with a, b and c, so a reader can mistake it for a stage of the order (a, d, b, c collinear) though no order ever passes through it. The empty middle of stage 2 (where a shared machine would sit if there were one) makes stage 2 look looser than stage 1. The 7 to g and 9 to h loops are long and pass close to e and f; a reader has to trace them.

## Figure 3.3  (fig-03-03.png, page p-052)

**Kind.** net

**What the text says it models.** A computer system: "Jobs appear on the input device. When the processor is free and there is a job on the input device, the processor starts to process the job. When the job is complete, it is sent to the output device; the processor either continues with another job if one is available or waits."

**Structure, briefly.** Job chain: source bar "A job is put in input queue", place "A job is waiting", bar "A job is started", place "A job is being processed", bar "A job is completed", place "A job is waiting to be output", sink bar "A job is output". Resource "The processor is idle" (one token) feeds "started" and is refilled by "completed". Same shape as 3.1, drawn vertically.

**Placement observations.**
1. Flow is top to bottom. Bars are horizontal. The source bar is at the top, the sink at the bottom. *Says:* time goes down. *R: same as 3.1, rotated; flow direction is a free choice but every bar is perpendicular to it.*
2. The job's chain is not one column. Its first two nodes (source, waiting) are at x about 305; the middle three (started, processed, completed) at x about 510; the last two (waiting for output, output) back at x about 300. The job zig-zags right and back. *Says:* the middle column is where job and processor meet; the job's own queue states are pushed left. I read the intent as: the shared part sits in the center, each actor's private parts sit on its own side (job left, processor right). *R candidate: when two cycles share a stretch, the shared stretch is a central column, and each actor's private states sit on that actor's side of it.*
3. The marked "processor is idle" place is at upper right (x 710, y 505), above and to the right of "started". It feeds "started" with a short curve into the bar's right end. *Says:* the processor waits beside the start of the work it gates. *R: a resource place sits beside its acquiring transition, on the resource's side.*
4. The return from "completed" to "idle" is the largest element of the figure: it leaves the right end of the completed bar downward, drops to nearly the bottom of the figure (y 1375), swings right to x 1040 and climbs to enter idle from the right. *Says:* "and then the processor is free again". It does convey the loop, but its size suggests it is the main event. *R (negative): a return arc's size should match its importance; a one-step resource return should not be the largest shape in the drawing.*
5. Two inputs enter "started" at distinct points along the bar: the job arc at its left part, the processor arc at its right part. Two outputs leave "completed" from its left end (to output queue) and right end (to idle). *R: the attachment point along a bar is chosen by the side the arc's other end lies on; arcs never share an attachment point.*
6. Labels: left-column labels sit left of their nodes ("A job is waiting", "A job is waiting to be output"); center-column labels for places sit right ("A job is being processed"), for bars left ("A job is started", "A job is completed"). Source and sink labels sit right of their bars. *R: a label goes on the side away from the arcs that attach to the node.*

**What could be better.** The return loop is oversized and swings below the sink. Placing idle to the right of "being processed", level with it, would give the short ellipse of 3.1. The zig-zag of the job chain costs straightness for no visible gain beyond freeing the center.

## Figure 3.4  (fig-03-04.png, page p-054)

**Kind.** net fragment

**What the text says it models.** "A nonprimitive event can be decomposed into two primitive events, 'The nonprimitive event starts' and 'The nonprimitive event finishes,' and a condition, 'The nonprimitive event is occurring.'"

**Structure, briefly.** Bar, place, bar. Any number of inputs to the first bar, any number of outputs from the second, shown with vertical ellipsis dots.

**Placement observations.**
1. The three nodes are one horizontal straight line, start bar left, place center, finish bar right. Bars vertical. *Says:* one activity with a duration, read left to right. *R: an activity is a straight rung start, in-progress, finish, along the flow.*
2. Inputs fan into the start bar from the left at three angles (from upper-left, straight left, lower-left), with dots between the lower two; outputs fan out to the right symmetrically. The fans mirror each other about the place. *Says:* "any number in, any number out". *R: multiple inputs to a bar fan in from the input side, spread along the bar's length and symmetric about the flow line; outputs mirror on the other side.*
3. Labels: place label above, bar labels below. *R: when a rung's node labels would crowd, alternate place label and bar labels to opposite sides.*

**What could be better.** Nothing notable; it is a schematic.

## Figure 3.5  (fig-03-05.png, page p-054)

**Kind.** net fragment

**What the text says it models.** "A box is sometimes used to represent a nonprimitive event", as an alternative to Figure 3.4.

**Structure, briefly.** A tall rectangle (a nonprimitive transition) with three input places on the left and three output places on the right, dots for "more".

**Placement observations.**
1. Inputs are a column on the left, outputs a column on the right, the box between, its height spanning the whole column. Arcs are straight and slant to spread along the box's side. *Says:* left is "before", right is "after", the box is the thing that takes time. *R: inputs of a transition stack on its input side, outputs on its output side; a box's extent along the bar direction grows to cover its stacked neighbors.*
2. "Inputs" and "Outputs" captions sit below each column. *R: group labels go under the group, not on each member.*

**What could be better.** Nothing notable.

## Figure 3.6  (fig-03-06.png, page p-055)

**Kind.** net

**What the text says it models.** Figure 3.3 redrawn with the box notation: "This net is equivalent to the Petri net of Figure 3.3." The box "A job is processed" replaces started, being processed, completed.

**Structure, briefly.** Same as 3.3 with the three central nodes collapsed into one box.

**Placement observations.**
1. Every surviving node keeps its 3.3 position; the box occupies the vertical span the three replaced nodes occupied. *Says:* abstraction does not move anything else; the reader recognizes the same system. *R: replacing a subnet by an abstract node keeps every other node where it was; the abstract node fills the replaced span.*
2. Arc attachment on the box follows 3.3: job input enters the top-left part of the box's top edge, processor input the top-right part; outputs leave the bottom edge left (to the output queue) and right (the return to idle). *R: attachment points on a box preserve the left/right order of the arcs' other ends.*
3. The processor return loop is still oversized, going below the sink.

**What could be better.** Same as 3.3. With the box, the zig-zag of the job chain has even less reason: the box is wide enough that the job could pass straight through it.

## Figure 3.7  (fig-03-07.png, page p-055)

**Kind.** net (two disconnected subnets)

**What the text says it models.** Concurrency: "the two enabled transitions do not affect one another in any way, and the possible sequences of events include some in which one transition occurs first, and some in which the other occurs first."

**Structure, briefly.** t_j: one marked input, one output. t_k: two marked inputs, three outputs, one of which is already marked.

**Placement observations.**
1. The two subnets are stacked vertically with a large empty gap (about 280 px, more than the width of t_j's subnet) and share the same x positions: inputs at x 450, bars at x 685, outputs at x 915. *Says:* two things happening side by side in parallel, each read left to right, sharing nothing. The aligned columns say "same stage"; the gap says "independent". *R: independent parts are separated by a gap larger than any internal spacing; parts at the same stage share x positions.*
2. t_k's two inputs sit symmetrically above and below its centerline; its three outputs fan to top, middle, bottom. Arcs are straight. *R: a bar's inputs and outputs are spread symmetrically about its center.*
3. Labels t_j and t_k sit below their bars.

**What could be better.** Nothing notable for a schematic.

## Figure 3.8  (fig-03-08.png, page p-056)

**Kind.** net

**What the text says it models.** Conflict: "Transitions t_j and t_k are in conflict since firing either will remove the token from p_i, disabling the other transition."

**Structure, briefly.** Three marked places on the left, two bars, two output places. p_i (middle) feeds both bars. The top place feeds only t_j, the bottom only t_k.

**Placement observations.**
1. p_i is at mid-height (y 410), exactly between t_j (y 240) and t_k (y 575), and its two arcs leave symmetrically up-right and down-right. *Says:* p_i is the one thing both want; neither is favored. *R: a place shared by competing transitions sits on the bisector between them, with symmetric arcs.*
2. Each competitor's private input sits on the outside: top place above t_j, bottom place below t_k. *Says:* what is private is outside, what is contested is between. *R: in a conflict, the shared input is between the competitors and each competitor's private inputs are on its outer side.*
3. Flow left to right; inputs column, bars column, outputs column. Bars vertical. Straight arcs. p_i labeled on its left, the only free side. Bar labels below.

**What could be better.** Nothing notable.

## Figure 3.11  (fig-03-11.png, page p-058)

**Kind.** net fragment (with a cloud standing for an unspecified net)

**What the text says it models.** Communication between a Petri net and the outside world: "Each input symbol will be represented by a place, and each output symbol will also be represented by a place. We assume that the outside world will deposit a token in the place corresponding to" the input symbol.

**Structure, briefly.** Three input places, a cloud labeled "Petri net representation of a finite state machine", three output places.

**Placement observations.**
1. Input places form a column at the left edge, output places a column at the right edge, the cloud between. Captions "Inputs" and "Outputs" head the columns. *Says:* the interface to the outside world is the boundary of the drawing; input enters from the left, output leaves to the right. *R: places that model the environment's inputs form a column on the input edge of the drawing; outputs form a column on the output edge.*
2. Arcs are straight, cross the cloud boundary, and end inside it at no node. Different input places have different numbers of arcs (2, 2, 3). *Says:* each input symbol may be consumed by several internal transitions.

**What could be better.** Nothing notable for a schematic. This boundary-column convention is what 3.13 and 3.14 then follow, with poor results (see there).

## Figure 3.12  (fig-03-12.png, page p-059)

**Kind.** net fragment

**What the text says it models.** "An alternative approach to modeling the inputs and outputs of the outside world would select an input transition and fire it. The Petri net would respond by (eventually) firing the appropriate one of a set of output transitions."

**Structure, briefly.** Three input bars on the left, the cloud, two output bars on the right.

**Placement observations.**
1. Same layout as 3.11 with bars in place of circles. Bars are vertical, perpendicular to the left-to-right flow. The input and output bars are long, and several arcs attach at distinct points along one bar (the bottom-right output bar receives three). *R: a bar's length grows with the number of arcs attached to it so that each arc gets its own attachment point.*
2. Input bars are not evenly spaced (the top one is far from the middle one, the lower two are close). Unclear whether this means anything.

**What could be better.** The uneven spacing of the input bars has no visible reason.

## Figure 3.13  (fig-03-13.png, page p-060)

**Kind.** net

**What the text says it models.** "A Petri net equivalent to the state machine of Figure 3.9", a machine that computes the two's complement of a binary number fed low-order bit first. Each state is a place (q1, q2), each input symbol and each output symbol is a place (0, 1, R in; 0, 1, R out), and "for each pair of state and input symbol, we define a transition whose input places are the places corresponding to the state and input symbol and whose output places are the next state and the output symbol." Peterson himself concedes: "The state machine description is more understandable than the Petri net description with its 6 transitions, 24 arcs and 7 or 8 places. This is admitted."

**Structure, briefly.** Six transitions, each with exactly two inputs (a state, an input symbol) and two outputs (a state, an output symbol). Three transitions per state. Four are self-loops on their state (q1 on 0, q1 on R, q2 on 0, q2 on 1); two switch state (q1 on 1 to q2, q2 on R to q1), per the state diagram 3.9. No token is drawn, although the text says "The current state is marked by a token".

**Placement observations.**
1. The one convention that holds: input-symbol places are a column at the far left (x 125: 0, 1, R from top), output-symbol places a column at the far right (x 1440: 0, 1, R), states in the middle (q1 top at (780, 265), q2 bottom at (790, 1110)). Labels on the outer side (input labels upper-left, output labels upper-right, state names inside the circle). *Says:* input enters left, output leaves right, as in 3.11. This part reads.
2. Transitions are not placed by any visible principle. They sit at (780, 455) below q1, (970, 270) right of q1, (510, 710) center-left, (1070, 800) center-right, (850, 885) above q2, (585, 1270) below q2. None is aligned with the row of its input symbol, the column of its state, or any other transition. *Says:* nothing. A reader cannot tell from position which state or which symbol a transition belongs to. Contrast 3.2, where x position means "stage" and above/below means "which operator". *R (from the failure): a transition's position must be derivable from what it belongs to; when a transition is defined by a pair (state, symbol), put it on the intersection of the state's band and the symbol's band.*
3. Bar orientation is arbitrary: vertical, near-horizontal, and two at about 45 degrees (the one at (510, 710) is drawn as an X with its arcs). In 3.1, 3.2, 3.19 every bar is perpendicular to one global flow. Here no flow exists inside the middle, so the bars just sit across whatever arcs pass. *Says:* there is no direction of reading. *R (from the failure): every bar is perpendicular to the drawing's one flow direction; if a net has no single flow, pick one (input side to output side) and orient bars to it anyway.*
4. Arcs from the side columns travel the full width and height of the figure. The 0 input (top-left) reaches the transition near q2 at (1070, 800) through a long S-curve; the R input (bottom-left) reaches up to (970, 270) by a straight diagonal through the center; the transition below q2 sends its new-state arc to q1 by a loop that goes down to y 1395, left to x 245, and up the whole height to enter q1 from the top. Many of these cross each other in the middle. *Says:* the reader cannot follow any arc by eye; the middle is a braid. The cause is placement, not arc routing: q1 and q2 sit in a vertical line, perpendicular to the left-to-right input/output flow, so every transition that switches state must cross the flow, and every symbol place has to reach transitions at both the top and the bottom. *R (from the failure): the axis along which the main thing changes (here, state q1 to q2) must not be perpendicular to the axis along which everything else flows; put the states along the flow, or put the symbols along the state axis.*
5. The self-loop transitions are the only legible local structures: the transition directly below q1 at (780, 455) with a tight two-arc loop, the one above q2 at (850, 885) likewise. They match the self-loops of the state diagram 3.9. Their extra arcs (from the input column and to the output column) still cross the whole figure. *R: a transition whose input and output include the same place sits right next to that place with a tight loop.*
6. Compare 3.9: two states side by side, self-loops outside each state, switching arcs between them. That drawing has an implicit rule this net drops: a state's own events cluster around it. *R (from the contrast): cluster each state with all transitions that consume it; the symbol places then sit as close as possible to the cluster rows that use them, not at a fixed outer column.*

**What could be better.** Nearly everything except the input/output columns. The text's own verdict ("The state machine description is more understandable") is fair. The missing initial token also hides where the machine starts.

## Figure 3.14  (fig-03-14.png, page p-061)

**Kind.** net

**What the text says it models.** "A Petri net equivalent to the state machine of Figure 3.10", a machine that computes the parity of a binary number. Same construction as 3.13; input symbols 0, 1, R, output symbols only 0 and 1.

**Structure, briefly.** Six transitions, states q1, q2, input places 0, 1, R, output places 0, 1. Per the state diagram 3.10, three are self-loops (q1 on 0, q1 on R, q2 on 0) and three switch state (q1 on 1 to q2, q2 on 1 to q1, q2 on R to q1). No token drawn.

**Placement observations.**
1. Same frame as 3.13: input column left (x 120), output column right (x 1145, but only two places: 0 at top, 1 at bottom), q1 top center (630, 285), q2 bottom center (630, 1035). The output places are spaced to the top and bottom extremes, not aligned with any input row. *Says:* input left, output right, still. Nothing else.
2. This drawing does have a partial structure 3.13 lacks: the q1-on-0 self-loop is drawn directly above q1 (vertical bar at (630, 120)), the q2-on-0 self-loop directly below q2 (vertical bar at (630, 1250)), and the other four transitions sit in the band between q1 and q2, as diagonal bars at about (520, 490), (850, 330), (520, 800), (750, 815). So along the vertical center line the order is: self-loop of q1, q1, switching transitions, q2, self-loop of q2. One of the four middle bars, at (850, 330), has arcs both from and to q1, so I read it as the q1-on-R self-loop; it breaks the pattern by sitting in the middle band. *Says:* a weak echo of 3.10's state diagram turned vertical: what happens between the states sits between them, what stays in a state mostly sits on its far side. *R: transitions that move between two states sit between them; transitions that stay in a state sit on that state's far side.*
3. That ordering puts the state axis vertical, perpendicular to the left-to-right symbol flow, with the same consequence as 3.13: the 0 input at the top-left must reach the self-loop below q2 at the very bottom (a long arc down the whole left side), and the 0 output at top-right is fed from the bottom self-loop by a long arc up the right side. The center becomes a braid of arcs between the switching transitions and both states. *R (from the failure): as in 3.13.*
4. The four switching bars are diagonal, each perpendicular to the arc that happens to pass through it. *Says:* bar angle follows local geometry, not the flow, so it carries no meaning.

**What could be better.** The center is unreadable. The partial "between states / beyond states" logic is visible only after the reader already knows the state machine.

## Figure 3.16  (fig-03-16.png, page p-063)

**Kind.** net (printed sideways; rotated mentally so the caption reads horizontally, inputs end up on the left). The clip is cut off at the bottom of the printed page; the input places 0, 1, R are missing from the clip and I read them from the full page `figures/pages/p-063.png`.

**What the text says it models.** "The composite Petri net machine which is a serial composition of the Petri nets of Figures 3.13 and 3.14." "For a Petri net machine ... the composition is simply the overlapping of the output places of the first net with the input places of the second net."

**Structure, briefly.** Net 3.13 (twos complement) followed by net 3.14 (parity), with 3.13's output places 0, 1, R identified with 3.14's input places 0, 1, R. Twelve transitions, four state places, three external inputs, three shared places, two external outputs.

**Placement observations.**
1. After rotation, the reading order is left to right: external inputs 0, 1, R (column at the left edge), first machine in a rectangle, the shared column of three places, second machine in a rectangle, external outputs 0, 1 (column at the right edge). The two rectangles overlap, and the overlap holds exactly the shared column. *Says:* "the output of the first is the input of the second" is shown literally as two frames that overlap on the places they share. This is the figure's one strong placement idea. *R: in a serial composition, the components are laid along the flow, and the places they share sit in the overlap of the components' frames.*
2. The shared places carry no labels, though both machines' own figures label them 0, 1, R. *Says:* the reader cannot tell which symbol each shared place carries without counting from the other figures.
3. Inside each frame, the drawing repeats the problems of 3.13 and 3.14: states q1 and q2 stacked perpendicular to the flow, transition bars at arbitrary angles, arcs from the boundary columns crossing the whole frame. The first frame's internal arrangement does not look like a copy of 3.13 (q1 has two lobed self-loops here, and transitions sit in different spots), so the reader gets no help from recognizing the earlier figure. I could not verify node for node whether any internal position matches 3.13.
4. The figure is so wide that it needs a landscape page. *Says:* serial composition multiplies width, and the internal tangles cost more space than the structure needs.

**What could be better.** Everything inside the frames. Label the shared places. Reuse the component layouts verbatim so the reader can map them, as 3.17 does.

## Figure 3.17  (fig-03-17.png, page p-064)

**Kind.** net. `figures.json` marks it rotated, but both the clip and the page image `figures/pages/p-064.png` display upright, caption horizontal at the bottom. I read it as displayed.

**What the text says it models.** "A parallel composition of the Petri net machines of Figures 3.13 and 3.14. A duplicator subnet is needed to provide inputs for both component Petri nets." Parallel composition "involves simply duplicating the input tokens which represent the input symbols, feeding these into each component Petri net machine."

**Structure, briefly.** External inputs 0, 1, R, each into a duplicator transition that outputs to the corresponding input place of each component. Top frame holds the parity machine (3.14: outputs 0, 1); bottom frame holds the twos-complement machine (3.13: outputs 0, 1, R).

**Placement observations.**
1. The two frames are stacked vertically and touch, each the same width, both spanning the same x range. *Says:* the two machines run side by side in parallel, at the same stage. Compare 3.16, where serial composition puts frames one after the other along the flow. *R: parallel components stack perpendicular to the flow, aligned at the same stage; serial components sit one after another along the flow.*
2. The frame contents are the earlier figures copied nearly exactly: the top frame matches 3.14 (q1 top center with its self-loop above, q2 below with its self-loop below, diagonal bars between), the bottom frame matches 3.13 (q1 top center, X-shaped bar center-left, horizontal bar at the bottom). *Says:* "this is 3.14, this is 3.13"; a reader who knows the parts recognizes them immediately. *R: a reused component is drawn with its original internal layout, unchanged.*
3. The duplicator sits outside both frames on the left: external input places in a column at x 85, at y 525, 955, 1355, each with a straight horizontal arc to a vertical bar at x 240. Each bar sends one arc up-right and one down-right into the corresponding input place of each frame. The three external inputs are evenly spaced over the full height of both frames, aligned to neither frame's rows. *Says:* the duplicator is the shared front end of both machines. The even spacing over both frames says it serves both equally. *R: a subnet that feeds several parallel components sits before them along the flow, spread over the components' combined extent.*
4. Because each duplicator bar must reach the same symbol in two frames whose input columns are offset by a full frame height, the duplicator arcs are long and cross each other near the frame boundary (the 0 duplicator's lower arc crosses the 1 and R duplicators' upper arcs). *Says:* tangle at the seam. Reordering would not remove it, because the frames' internal orders are fixed by reuse.
5. Inside the frames, all the defects of 3.13 and 3.14 remain.

**What could be better.** The frames are unreadable for the reasons given at 3.13 and 3.14. The duplicator is clean at its left end and tangled at its right end.

## Figure 3.19  (fig-03-19.png, page p-067)

**Kind.** net (a repeating fragment with open ends)

**What the text says it models.** The control of an asynchronous pipeline: "The results of stage k of the pipeline can be sent on to stage (k+1) as soon as stage k is done and stage (k+1) is free." Each unit "uses the values in its input (buffer) register to produce values in its output (buffer) register. It must then wait until (1) its output register has been emptied by copying its contents to the input register of the next stage, and (2) a new input is available in its input register." Conditions: input register full/empty, output register full/empty, unit busy, copying taking place. Figure 3.18, a block diagram, is the same pipeline drawn as one vertical column: Unit k-1, Output register k-1, Input register k, Unit k, Output register k, Input register k+1. "We have modeled the actual execution of the units of the pipeline as nonprimitive events."

**Structure, briefly.** Four activities, each a start bar, an in-progress place, and a finish bar: Unit k-1 busy, Copy k-1 to k, Unit k busy, Copy k to k+1. Each register has two complementary places (full, empty). Unit k starts when "Input of k full" and "Output of k empty"; it finishes into "Input of k empty" and "Output of k full". Copy k to k+1 starts on "Output of k full" and "Input of k+1 empty", finishes into "Output of k empty" and "Input of k+1 full". Initial marking: Output of k-1 empty, Input of k empty, Output of k empty, Input of k+1 empty (every register empty). Dashed arcs at top and bottom continue to stages k-2 and k+2.

**Placement observations.**
1. The pipeline axis is vertical, stage k-1 at top, k+1 at bottom, exactly the order of the block diagram 3.18. The rows, top to bottom, are: Unit k-1 busy (y 450), Output of k-1 (y 610), Copy k-1 to k (y 785), Input of k (y 945), Unit k busy (y 1115), Output of k (y 1280), Copy k to k+1 (y 1450), Input of k+1 (y 1610). Each block in 3.18 becomes one row, and each arrow between registers in 3.18 becomes a Copy row. *Says:* the reader can lay this net over the block diagram; down means downstream. *R: when a net models a physical sequence that has its own diagram, the net's main axis follows that diagram's order, one row per component.*
2. Each activity is a horizontal rung across the center: start bar at x 610 or 965, in-progress place at x 790, finish bar at the other side. All four in-progress places sit on one vertical center line. *Says:* the center column is "what is happening now", one activity per row. *R: activities that the pipeline performs in turn are rungs whose in-progress places form one column on the main axis.*
3. Each register's two complementary places sit on the same row, mirrored across the center: "Output of k-1 empty" (x 480) and "Output of k-1 full" (x 1095) at y 610; "Input of k full" (x 480) and "Input of k empty" (x 1095) at y 945; and so on. *Says:* the two places are the two values of one register; same row means same thing, opposite sides means opposite values. A reader sees "this row is register Output k" at a glance. *R: two places that are complementary states of one object sit on the same row, mirrored on opposite sides of the main axis.*
4. The rung directions alternate. Unit rungs run left to right (start bar left, finish right), Copy rungs run right to left (start bar right, finish left). Consequently full places alternate sides: "Output full" places are on the right, "Input full" places on the left. Data (the full condition) moves down the drawing in a zig-zag: Unit k-1 (to the right) to Output k-1 full (right) to Copy (leftward) to Input k full (left) to Unit k (rightward) to Output k full (right), and so on. *Says:* data snakes down; each bar sits at the corner where the zig turns. *R: when a sequence alternates between two kinds of step that hand off across the axis, alternate the step direction so each hand-off is a short diagonal rather than a long return.*
5. Every bar has exactly four arcs, all straight: one along the rung, and diagonals at about 45 degrees to the two side places above and below. The result is a column of identical hexagons (two bars on each side, the side places at the hexagon's left and right vertices). *Says:* each hexagon is one hand-off between two consecutive activities; repetition is visibly regular. *R: identical subnets in a repeating structure are drawn identically and stacked at equal spacing; all their arcs are straight.*
6. Spacing is uniform: rung rows about 330 px apart, side places centered between rungs vertically, columns at x 480, 610, 790, 965, 1095 for every row. *R: in a repeating structure, a node's position is a function of its stage index and its role only.*
7. Initial marking: tokens in "Output of k-1 empty" (left), "Input of k empty" (right), "Output of k empty" (left), "Input of k+1 empty" (right). The marked places alternate sides like the full ones. *Says:* at start, every register is empty; the empties sit on the side opposite their fulls. The marking carries no special position; it falls out of the complementary pairing.
8. Open ends: dashed arcs leave the top bars upward (into Unit k-1 start from upper-left, out of Unit k-1 finish to upper-right) and leave the bottom side places downward. *Says:* the pipeline continues beyond the drawn stages. *R: a fragment of a repeating structure shows its continuation as dashed arcs heading in the direction the next repetition would sit.*
9. Bars are vertical, perpendicular to the rungs they belong to (and parallel to the pipeline axis). This is the one figure in this set where bars are perpendicular to the local flow (the rung) rather than the global flow (downstream). It reads correctly because each activity is local. *R: a bar is perpendicular to its own activity's rung.*
10. Labels: rung labels sit directly below the in-progress place, centered. Side-place labels sit outward: left places labeled on the left, right places on the right, all horizontal text. Bars are unlabeled; the rung label names the activity, so start/finish bars need no names. *R: in an activity rung, the in-progress place carries the activity's name; its start and finish bars need no labels.*
11. No arc crosses another, and no arc curves. This follows from the placement, not from any routing effort.

**What could be better.** The alternating rung direction is the price of the straight hexagons: a reader must check arrowheads to see that Copy runs right to left. The "Unit idle" condition from the text's list is not drawn as a place (it is implied); the drawing is consistent, just not a full transcription of the list.

## Figure 3.20  (fig-03-20.png, page p-069)

**Kind.** net (a portion)

**What the text says it models.** A reservation-based control unit. "An instruction for functional unit u using registers i, j, and k can be issued only if all four of these components are not reserved; when the instruction is issued, all four of them become reserved." "To each functional unit and each register, we associate a place. If the unit or register is free, a token will be in the place."

**Structure, briefly.** Place "Instruction uses unit u and registers i, j, and k" feeds bar "Issue instruction", which also takes Unit u free, Register i free, Register j free, Register k free (all four marked). Issue outputs "Ready to decode next instruction" and "Unit u operating with registers i, j, k". Bar "Instruction completed" takes the operating place and returns all four resources.

**Placement observations.**
1. The instruction's control flow runs along the top, left to right: instruction place (395, 180), Issue bar (720, 360), Ready to decode (1085, 180). *Says:* the decoder moves on; this is the line a reader follows first.
2. The four resource places form one evenly spaced column on the left (x 395, y 385 to 770), all marked, directly below the instruction place. *Says:* these are the reservable components, a uniform set. *R: a set of resources of the same kind sits as one evenly spaced column.*
3. Issue and Completed are vertically aligned bars at x 720, Issue above Completed. The operating place sits to their right at (900, 445). Issue to operating to Completed forms a small loop on the right. Resources leave toward Issue and return from Completed on the left. *Says:* reserve on top, hold on the right, release below, return on the left: one clockwise cycle per resource. *R: acquire and release transitions of the same resources stack vertically on one line; the resources sit on one side, the held state on the other.*
4. All five inputs to Issue enter its left side at distinct points along the bar; Completed's four outputs leave its left side at distinct points. Issue's two outputs leave its right side; Completed's input enters from the right. *Says:* for Issue, left is in and right is out; for Completed, right is in and left is out, so the release reads as flowing back. *R: a bar takes inputs on one side and gives outputs on the other; for a release transition, the side facing the resources is its output side.*
5. The acquire arcs (resource to Issue, rising) and release arcs (Completed to resource, descending) interleave and cross, forming a braid between the column and the bars. *Says:* the reader has to trace which arc belongs to which register; the crossing carries no meaning.
6. Labels: resource labels on the left (outside), operating label below-right, Issue label above its bar, Completed label below its bar, instruction and ready labels above their places. *R: labels go outside the cluster, on the side facing away from arcs.*

**What could be better.** The instruction place sits in the same column as the resources (x 395), so it can read as a fifth resource; only its missing token and the wider gap above "Unit u is free" set it apart. The acquire/release braid could be avoided by sending acquire arcs from the top of each resource and release arcs into the bottom, but as drawn it is a braid.
