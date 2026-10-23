# Critic 2: placement readability of 61 engine drawings

Calibrated on Peterson figs 3.2, 3.28, 3.29, 3.32, 4.6. Judged from the PNGs (pair images for book nets) and the JSON notes. No engine source, rules, or other critiques read.
Grade: 5 = as readable as Peterson's best, 1 = unreadable. vs Peterson: B = engine better, = = about equal, W = engine worse.

## Book nets (37)

| net | grade | vs Peterson | works | worst problem |
|---|---|---|---|---|
| fig-02-04 | 2 | W | p1→t1→p5 bottom row reads as the start. | p4 sits far left of t4, so t3's output arc loops back over the top to reach it. p3 is parked above everything, and t1's arc to p3 cuts through t4's bar. Peterson's left-to-right diamond is lost. |
| fig-02-06 | 2 | W | The p8→t2→p1→t1→p3→t4→p4→t6 spine is one clear column. | The parallel branch (p2/p5→t3→p6→t5→p9) is strung below t6, so it reads as coming after the join. p2 and p7 float mid-right, with long arcs dropping to t3/t5. Peterson's fork/join shape is gone. |
| fig-02-09 | 4 | = | The p1/p3/p2 cycle is a tight triangle, with t4→p4→t5 as a tail. | t3 is a stub bar sticking out left of the cycle, and the p3–t4 self-loop strands nearly overlap. |
| fig-02-19 | 2 | W | Marked places are visible. | The whole net is tumbled: t1 and t3 are slanted bars, p1 is top-left, p4 is at the bottom, and t2 sticks out right. The weight-2 t3→p4 arcs run a long diagonal. Peterson's left-flowing layout is far clearer. |
| fig-02-21 | 4 | W | p1 choosing t1/t2, then the p2→t4→p3→t5 row, reads quickly. | t2 hangs bottom-left alone, and its arc climbs diagonally to p3, so the two routes into p3 lose Peterson's mirror symmetry. |
| fig-03-01 | 5 | = | Straight order chain, with the idle-shop place above as a resource loop. | Only the "An order arrives" label floating above the source bar. |
| fig-03-02 | 4 | = | Two operator rows, a centered M1 idle, and the M2/M3 split mirror Peterson's structure. | F2 idle (bottom center) and M3 idle (lower right) have long arcs that cross each other under the lower row, and the transition labels crowd the bars. |
| fig-03-03 | 5 | B | Linear job chain, processor-idle loop above, no long return arc. | None of note. |
| fig-03-19 | 3 | W | Each unit's cycle is its own column. | The hand-off between units (Input of k full/empty) forms an X of crossing arcs in the gap. Input of k+1 empty/full dangle off the right column. Peterson's ladder shows the repeating pipeline stage, and this doesn't. |
| fig-03-20 | 2 | W | Unit u's cycle along the bottom is clear. | Registers i/j/k are stacked in a tall column far above Instruction completed, giving six long near-parallel arcs. The "Register i is free" label sits on those arcs. |
| fig-03-25 | 4 | = | Left-to-right flowchart, with the b.T/b.F split at p2. | c.T is perched high above p3, with a long arc to p5 that shares the top band with the e→p2 loop-back arch, so the inner choice and the outer loop blur. |
| fig-03-28 | 5 | = | Two process columns with m centered between them, as in the book. | None of note. |
| fig-03-29 | 5 | = | Producer/consumer columns with B between them, as in the book. | None of note. |
| fig-03-31 | 3 | W | Producer column is clean. | B and B' are jammed side by side between the two bottom bars, and their arcs cross underneath. The consumer column is rotated (p4 at top, Remove from buffer at the bottom), so the consumer cycle starts mid-column. |
| fig-03-32 | 4 | = | Pentagon star with forks on the inner ring, as in the book. | M2/M5 sit inward of their arms, and put-down return arcs sweep across the arms (same weakness as Peterson's). |
| fig-03-33 | 5 | = | Readers, n, and Writers in three columns, as in the book. | None of note. |
| fig-03-34 | 5 | = | P/V chain with S above. | None of note. |
| fig-03-36 | 4 | = | The PERT spine reads left to right, with the r→v→w branch below. | g is stacked above h at the top, and g's arc to t6 crosses h's arc to t7. The e→p→q chain shares a row with r, which implies a lane that doesn't exist. |
| fig-03-37 | 4 | W | Two input lanes into c and two output lanes into f. | The b lane is stacked above the a lane, and c's second output drops below, so the symmetric two-in/two-out X becomes a staircase. |
| fig-03-38 | 2 | W | Reactants on the right, products on the left. | H+ and e- are squeezed into the narrow gap between t1 and t2, and their double (weight-2) arcs overlap each other. The bars are slanted, and the flow runs right to left. |
| fig-03-39 | 4 | = | Star around t1, with the Pt catalyst loop above. | The labels "Pt" and "t1" stack beside the bar, and C2H4 comes up from below instead of from the left. |
| fig-04-03 | 5 | = | Two loops with shared p5 centered, as in the book. | None of note. |
| fig-04-06 | 4 | = | Process a and b columns with resources q/r centered. | Release arcs from t3 and t6 curl out of the bar ends and cross in a bundle under r (Peterson has the same tangle). |
| fig-04-07 | 2 | W | p1 marked as the start. | The net is rotated about 45 degrees, with slanted t1/t2/t3 bars, p1 at the bottom, and p4 off to the left. Peterson's rectangle with t0 below is unrecognizable. |
| fig-04-09 | 3 | W | p1→t2→p3 row at the bottom. | t1 is perched up-left of p1, its self-loop strands nearly overlap, and t2's arc to p2 climbs past t1. Peterson's symmetric arch reads instantly. |
| fig-04-15 | 2 | W | p3→t3→p4→t2 cycle is partly visible. | The net is tumbled vertically: t1 is a slanted bar between p3 and p1, p1 is at the bottom, and p2 is off right. Neither cycle reads, and the p1 self-loop is buried. |
| fig-04-18 | 3 | W | p1→t2→p3 row. | t1 sits diagonally above-right of p1, and p4 floats right with no alignment to t3. |
| fig-04-23 | 3 | W | p1→t2→p2→t4 row with the loop back is clear. | The t2–p3 self-loop is drawn as two long strands slanting up beside t1's double arc into p3, so four or more strands converge on p3. Peterson's central loop is clearer. |
| fig-04-24 | 3 | W | Same row and loop-back as 4.23. | Same t2–p3 strands tangled with t1's arcs into p3. |
| fig-04-27 | 2 | W | The p3→t6→p4/p5→p2 ring hints at the cycle. | t1 is a long slanted bar at the top with p1 above-right, and its double arc to p2 runs past p5 inside the ring. t3 and t2 are slanted stubs at the edges. The p1 fan-out to {p2, p3} doesn't read. |
| fig-06-02 | 4 | = | Main row with the p2 arch over it. | The a/b self-loops are angled double strands instead of Peterson's clean verticals. |
| fig-06-12 | 4 | = | Language chain with the p3 counter arch. | p3's arc to the final b cuts past the second b's loop bar. |
| fig-06-13 | 4 | W | a and b counter arches over the chain. | The c self-loop is a vertical bar right of p_f instead of above it, so the a/b/c repeat pattern breaks at the last step. |
| fig-07-05 | 2 | W | b1 and b2 are near the center. | Pinwheel of slanted bars: c2 is a long horizontal bar mid-picture with the inhibitor from b1 a tiny hook at its end. p1–p4 are scattered at the four corners. Peterson's two mirrored d→b→c rows are lost. |
| fig-07-06 | 4 | B | Two clean vertical cycles (p2…t1, p1…t2) show the structure better than Peterson's tangle. | p4 sits outside the right lane between t3 and t2, with its arcs looping around the lane. |
| fig-07-13 | 4 | W | Two loops as columns. | p3 and p4 are stacked in the middle gap, and t3→p4 crosses t2→p3, forming an X. Peterson's "top link, bottom link" symmetry is gone. |
| fig-08-19 | 2 | W | None beyond grouping. | p4 (the sink fed by t2/t3/t4) is buried in the middle of a tilted ring, p3 is top-left, p1 bottom-right, and all bars are slanted. Peterson's p1→p2→p3→p4 left-to-right order is gone. |

## Heldout nets (12)

| net | grade | vs Peterson | works | worst problem |
|---|---|---|---|---|
| conversation | 2 | | A's lane down the left reads. | B's lane is split: B listens is top-right, but B thinks/B forms reply/B speaks are at the bottom-right. B speaks' arc climbs the full height to the "B speaks to A" bar, and the A starts/B starts arcs cross into the other's lane. |
| fork-join | 5 | | Three parallel task lanes between the fork and join bars. | None of note. |
| guarded-retry | 3 | | ready→send→request sent→ack/time-out reads, with the retry loop under it. | tries left is wedged between the send and give-up bars, and gave up's inhibitor arc climbs back diagonally to send, so the send/give-up choice isn't framed. |
| intersection | 5 | | Two signal columns with the crossing token centered (the 3.28 pattern). | None of note. |
| irregular | 3 | | The a→…→e ring is visible. | All bars are slanted, and t3 is a slanted bar beside f with bunched arcs, so the side input looks like debris. |
| philosophers-3 | 4 | | Three-arm star with forks on the ring, like 3.32. | Return arcs from "1 puts down" and "2 puts down" sweep across the arms, and arcs strike through the labels "2 picks up" and "0 picks up". |
| pipeline | 4 | | Four identical stage loops make the repetition obvious. | Buffer/slot-free pairs hang between stages at uneven heights. The buffer→start k+1 arc runs long and crosses the slot arc, and stage 3's slot sits differently from the others. |
| robot-cell | 4 | | Two mirrored machine rows, a shared robot between them, and idles outside. | The start 1/start 2 arcs back to robot free curl, and they cross the raw-parts and robot-loads arcs at the left. |
| traffic-light | 5 | | Simple ring. | None of note. |
| turn-taking | 4 | | X and O alternation on one row, with the shared board above. | empty squares and marks on board are stacked in one column over O to move, and X moves' arcs to marks and to O to move nearly overlap. |
| two-phase-commit | 3 | | Participant/coordinator/participant columns. | Participant 2's side does not mirror participant 1: the arcs to 2 voted and decision to 2 swirl in loops. The commit bar stretches the full width, with 1 voted and 2 voted at its ends. |
| vending | 4 | | Insert coin → choice fan → brew → dispense reads left to right. | Three return loops (tea, coffee, refund) circle the whole picture back to ready as near-parallel strands, and the refund bar's label collides with the choose coffee label. |

## Blind nets (12)

| net | grade | vs Peterson | works | worst problem |
|---|---|---|---|---|
| assembly-cell | 5 | | Two feeder lanes merge into one assembly line, with resource places (idle, free slots) above. | Minor: free bin slots' arcs curl around the Place bar. |
| bank-account | 3 | | Deposit and withdraw columns with the lock between them. | The Reject bar sits in the middle at Commit-withdraw height, its inhibitor from balance units is tiny, and the lock/balance arcs swirl under it. The withdraw choice (reject vs. commit) doesn't read as a branch off withdrawing. |
| blind-irregular | 2 | | Nodes are spread out. | No flow direction: kite, lumen, quill, and prism are slanted at random angles, mire is at the bottom with a doubled heron arc, and an inhibitor hook runs near garnet/fjord. |
| boss-fight | 2 | | The boss phase column on the left is a clean sequence. | The player machine is wrapped in huge looping return lanes (two near-parallel) back to player idle. The link places (boss attack incoming, damage on boss) send triple strands into the boss column. Boss hits mid-swing, Swing lands, Attack evaded, and player hurt pile up with overlapping labels. |
| card-game-turns | 3 | | Bob's row above, Alice's below, piles at the sides. | The turn tokens (Bob's turn, Alice's turn) sit in the middle column, and the hand-off arcs (Bob plays→Alice's turn, Alice plays→Bob's turn) slash diagonally through the other player's row. Each turn sequence runs vertically while the hands run horizontally. |
| ci-build | 4 | | Fork into four lanes, join, and a retry loop under them. | lint clean and compiled bunch into Publish, and tests pending sits lower than the other three pending places, so the four parallel tasks don't line up. |
| coffee-shop | 4 | | Cashier column, barista column, queues between them. | customers in line is wedged against cashier free into Greet, and barista free's loop sits outside to the right. |
| elevator | 2 | | The floor column at 1/2/3 on the left reads. | door closed is a top-right hub fanning about 10 arcs across the whole picture. The call places sit in a diagonal through that fan, and door open is far bottom-right. |
| print-spooler | 3 | | Submit→queue→print/cancel reads left to right. | Clear jam's return arc loops over the entire top and crosses printer idle's arc down to Start printing, so the jam recovery cycle is hard to see. |
| semaphore-cs | 4 | | Three identical process columns. | semaphore permits sits between B and C instead of centered, so A's P/V arcs run long across B's lane. |
| tcp-connection | 2 | | Client and server columns with the handshake order top to bottom. | The client lane is hijacked: SYN in flight, SYN-ACK in flight, client FIN in flight, and server ACK of FIN sit inline in the client's column, while the client's own states (SYN_SENT, FIN_WAIT_1) are bumped out to the left. Messages are not placed between the lanes. |
| traffic-intersection | 3 | | The light cycle is one vertical column. | walk requested's arcs to Walk on and NS to green run as long diagonals the whole height. The walk-vs-skip choice at all red after EW is a small side jog, and the cycle return wraps far right. |

## Recurring placement problems (most damaging first)

1. **Tumbled small nets.** Nets with no obvious lanes get rotated, slanted bars, no flow direction, and the start/end placed arbitrarily. Every one is clearly worse than Peterson. 02-19, 04-07, 04-15, 04-27, 07-05, 08-19, 03-38, blind-irregular, irregular; partly 02-04.
2. **Hub places placed off to one side, fanning long arcs across the picture.** elevator (door closed), 03-20 (register stack), boss-fight (damage/attack links), traffic-intersection (walk requested), semaphore-cs (off-center permits), 02-06 (p9).
3. **Actor lanes broken or hijacked.** Message or other places are inlined into a lane while the actor's own states are pushed aside, or one actor's lane is split. tcp-connection, conversation, card-game-turns, 03-31 (rotated consumer), 03-19, 02-06 (parallel branch after the join).
4. **Self-loops on "shoulder" transitions.** These are drawn as slanted, near-overlapping double strands, often with the bar perched diagonally. 04-09, 04-18, 04-23, 04-24, 02-21, 06-02, 06-13, 07-05, 02-09.
5. **Mirror symmetry lost.** Twin halves are drawn unevenly. 03-37, 07-13, two-phase-commit, 06-13, 02-21, 04-23/24, 03-31.
6. **Return loops wrapping the whole drawing.** boss-fight, vending, conversation, print-spooler, traffic-intersection.
7. **Labels struck by arcs or colliding.** 03-20, philosophers-3, vending, boss-fight.

## 5 worst

1. boss-fight (2)
2. elevator (2)
3. fig-08-19 (2)
4. fig-03-38 (2)
5. tcp-connection (2)

(Also 2: 07-05, 04-27, 04-15, 04-07, 02-19, conversation, blind-irregular.)

## Means

- book: 129/37 = **3.49** (B 2, = 15, W 20)
- heldout: 46/12 = **3.83**
- blind: 37/12 = **3.08**
