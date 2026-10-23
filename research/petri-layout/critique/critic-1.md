# Critic 1: placement readability of 61 engine drawings

Scale: 5 = as readable as Peterson's best; 1 = a reader can't follow it. I viewed every PNG. I read no engine source, RULES, analysis files or decision log.
Verdict on the book nets: B = better than Peterson, = = about equal, W = worse.

## Book nets (37)

| net | grade | vs P | what works | worst placement problem |
|---|---|---|---|---|
| fig-02-04 | 2 | W | p1/t1 entry reads left to right | Tiny and cramped. p4 sits far left, so t4's arcs run right to left over the t1 row. t3 sits off to the right with a back arc hooked over p2. Peterson's p1→…←p4 mirror symmetry and the p2/p3 diamond are gone. |
| fig-02-06 | 2 | W | p8→t2→p1→t1→p3→t4→p4→t6 reads as one spine | p2 and p7 float in the gap between the two columns. Long S-curves run from them to t3/t5 at the bottom right, and p9's arc drops straight through the long t6 bar. Peterson's left-to-right fan is far clearer. |
| fig-02-09 | 3 | W | cycle p3→t2→p2→t3→p1→t1 is in order | The triangle cycle is flattened into a row with a long return arc underneath, so the loop no longer looks like a loop. The t4 self-loop pair is squashed into two near-touching curves. |
| fig-02-19 | 2 | W | t1 and t3 joins are visible as fat bars | p3 is parked top-left, and t4's return to p3 is a long arc sweeping over the whole drawing. p6→t1 and p3→t3 cross p2's arcs just left of t1. Peterson's p3/p4 bottom return is easy to read. |
| fig-02-21 | 3 | W | t1→p2→t4→p3→t5 spine is a clean row | t2 is dropped below and left of p1, and its arc to p3 is a long diagonal. The t3 self-loop on p2 is two crushed curves. Peterson's symmetric fork of p1 is clearer. |
| fig-03-01 | 5 | = | single process line plus shop-idle resource above | Labels are tight under the row. Otherwise matches Peterson. |
| fig-03-02 | 3 | = / slightly W | order flow left to right, F1 idle top and F2 idle bottom, as in Peterson | The middle place "order processed by M1" has crowded labels with arcs through them. M2-idle/M3-idle sit off the corners with hooked return arcs. F1/F2-idle arcs fan across the full width. |
| fig-03-03 | 5 | = / B | job line plus processor-idle resource loop above, very clear | none of note |
| fig-03-19 | 3 | W | each unit (k-1, k) is its own vertical cycle | The "Input of k full/empty" handshake places float in the gutter. t3→"Input of k full"→t5 is a long diagonal crossing the "Input of k empty"→t4 arc. The k+1 handshake places hang off the right column as stubs. Peterson's ladder shows the repeating stage. |
| fig-03-20 | 2 | W | Issue → Unit operating → Completed row at the bottom reads | The three Register-free places are stacked in a tall tower far above the row. Long arcs fan up and down, and arcs run through the "Register i is free" label. Peterson's compact fan beside the transitions is much better. |
| fig-03-25 | 3 | W | a→p2 entry and b.T/b.F choice are visible | c.T is lifted above p3, and its arc to p5 sweeps across c.F/p4/d. The e loop back to p2 is a giant arc over everything. Peterson's nested loop (inner c-choice inside outer b-loop) is lost. |
| fig-03-28 | 5 | = | two process columns, m between them, no clutter | No grouping boxes. Placement matches Peterson. |
| fig-03-29 | 5 | = | producer/consumer columns, B between them, compact | B sits slightly low. Equal to Peterson. |
| fig-03-31 | 3 | W | the two process columns hold | B and B' are jammed side by side between the bottom transitions. Their arcs to "Put in buffer"/"Remove from buffer" interweave under them. The consumer column is rotated (Consume at top, Remove at bottom), so the buffer handshake happens at one corner. |
| fig-03-32 | 4 | = / slightly W | the pentagon of forks and philosophers survives, philosopher 1 is textbook-clean | Release transitions t7/t8/t9/t10 are pushed to the outer rim. Long swooping arcs return to M3/M4/M5 across the inner ring (M3 from t8, M5 from t10), which is busier than Peterson's tight loops. |
| fig-03-33 | 4 | = | readers/writers columns, n place in the middle | The weight-3 arcs are three parallel strands bunched into a dark rope at t3/t4. Fine otherwise. |
| fig-03-34 | 4 | = | P→V row with S above, as a loop | The S label is wedged under the circle between the two arcs. Trivial. |
| fig-03-36 | 3 | W | the left-to-right PERT spine Start→…→Finish is legible | Branch places leave the spine at odd heights: g above f, i above z1. g→t6 drops back down across h→t7, and i→t7 crosses too. r's lane runs a long arc to t10. Peterson's top-down tree is clearer. |
| fig-03-37 | 4 | W | a/d and e rows read as sequences | The b row (p2/p4) sits above the a row instead of mirroring e below. The c join/fork is lopsided, and p6/p8 drop down. Peterson's symmetric diamond shows the merge and split at a glance. |
| fig-03-38 | 3 | W | reactant→t1→products→t2→H2O flows left to right | H2O2 sits under H2C2O4, so it reads as a t1 input. Its arc then snakes past t1's tall bar to reach t2, and CO2 dangles below. |
| fig-03-39 | 4 | = | catalyst Pt above, inputs left, product right | C2H4 is placed below the bar instead of left, so the inputs look unequal. The Pt label sits between the loop arcs. |
| fig-04-03 | 5 | = | identical structure to Peterson | none |
| fig-04-06 | 4 | = | two process columns with q and r stacked between them | The t3/t6 release arcs to q and r cross in a tall X through the middle. Peterson has the same X. |
| fig-04-07 | 2 | W | p1 start on the left | The self-loops t3/p1 and t2/p2 are crushed into overlapping curves. The p1→t0 arc runs right across past p2. The 4-place diamond is lost, and p4 hangs off the right end. |
| fig-04-09 | 3 | W | p1→t2→p3 row plus p2 above | Self-loop pairs (t1/p1, t3/p3) are squashed. t2→p2 rises steeply through the t1 loop area. Peterson's rectangle is clearer. |
| fig-04-15 | 2 | W | p3→t3→p4→t2 is in order | The whole cycle is flattened into one row. p3→t1 is a long arc over the top and t2→p3 a long arc under the bottom, and p1 is perched on t1's top end. The diamond of two loops through t1 is unreadable. |
| fig-04-18 | 3 | W | p1→t2→p3 row with p2 and p4 above | Same as 04-09: the self-loops are crushed, and p4 hangs off t3 at an odd angle. |
| fig-04-23 | 1 | W | p1→t2→p2 row is there | p3, the hub of six arcs (two double arcs), is dropped below the row. A sheaf of 6+ strands fans up to t1 and t3, which float above. A huge empty oval from t4 back to p1 surrounds nothing. Peterson's p3-on-top is far better. |
| fig-04-24 | 2 | W | p1→t2→p2 row | Same layout as 04-23: p3 below with a fan to t1/t3 above and the giant empty oval t4→p1. |
| fig-04-27 | 3 | W | p1 start, t1 fork into p2/p3, t6 join | The p2→p4→p5→t5→p2 cycle is a row with a long double arc returning over the top. t3 (source) sits bottom-left and reads like a second start. Peterson's diamond shows the cycle. |
| fig-06-02 | 4 | = | spine p1→c→p3→d→p4 with p2 above | Self-loop pairs a/p1 and b/p3 are squeezed. Otherwise matches Peterson. |
| fig-06-12 | 3 | = / slightly W | a/b spine plus counter p3 above | The p3→final b arc cuts through the b self-loop pair on p2. |
| fig-06-13 | 4 | = / slightly W | spine plus two counters above, the a/b pattern repeats visibly | The c self-loop on p_f is drawn low at the far right instead of above like a and b, which breaks the visible repetition. |
| fig-07-05 | 2 | W | four self-loop processes exist | Everything is crammed into a narrow block. p3/p4 are at the top and p1/p2 at the bottom, with crushed self-loops. The b1→c2 inhibitor climbs between rows. You can't see the two producer→buffer→consumer chains. |
| fig-07-06 | 4 | B | two clean cycles as columns (p2 chain, p1 chain), easier than Peterson's tangle | p4 hangs right of the second column, with arcs t2→p4→t3 running beside it. The t4 cross-link goes sideways between columns. |
| fig-07-13 | 4 | = / slightly W | two loops as two columns | p3 and p4 are packed in the gutter, and their arcs cross in an X. Peterson's two circles with p3 on top and p4 below have no crossing. |
| fig-08-19 | 3 | W | p1 fork to t1/t2 on the left, p4 sink on the right | The p2⇄p3 cycle is a row with a return arc underneath. Three arcs into p4 converge on one point. Peterson's ellipse is clearer. |

## Heldout (12)

| net | grade | what works | worst placement problem |
|---|---|---|---|
| conversation | 2 | A's column listens→thinks→forms reply→speaks is straight | B's column is torn apart. "B listens" is at the top right, while "B thinks/B forms reply/B speaks" are at the bottom, below A's whole column. Long arcs run from B starts to B speaks and from B speaks up to the "B speaks to A" bar. The two parties don't read as mirror images. |
| fork-join | 5 | three lanes between fork and join, lengths visible | none |
| guarded-retry | 3 | send → request sent → ack/time-out choice and the retry loop read | "tries left" is wedged between send and give up. Inhibitor and return arcs from gave up / tries left converge on send's top end, and the "tries left" label sits in the arcs. |
| intersection | 5 | two signal columns with "crossing free" between them, Peterson mutex style | none |
| irregular | 4 | fork/merge/back-arc/side-input all visible | The t5→a back arc runs underneath, grazing f and t3. |
| philosophers-3 | 3 | triangle ring, phil 0 is clean | Phil 2's arm: "2 picks up" label collides with an arc. phil 2 thinks sits below phil 2 eats, and the return from "2 puts down" loops back across. Phil 1's return sweeps across the top past fork 2. |
| pipeline | 4 | four identical stage columns, the repetition is obvious | buffer/slot pairs sit in the gutters with X-crossing arcs (buffer k → start k+1 above, slot free ← start k+1). |
| robot-cell | 4 | symmetric machine rows, robot free in the middle, idles above and below | The robot-free arcs to robot loads 1/2 cross the raw-parts arcs. The start 1/start 2 returns to robot free hook back on themselves. |
| traffic-light | 5 | a true circle | none |
| turn-taking | 3 | X/O alternation as a row with a loop | "marks on board" is stacked directly above "O to move" in the middle, and "empty squares" arcs cross it. Its label is pushed off to the right, so it reads as belonging to O moves. |
| two-phase-commit | 3 | coordinator in the center column, participants on the sides, requests between them | "1 voted"/"2 voted" are pushed sideways off the participant columns onto the full-width commit bar. 2 votes yes→2 voted→decision curls into self-crossing loops, which breaks each participant's sequence. |
| vending | 3 | insert → coin in → tea/coffee/refund choice fan | Three long return arcs to ready (two along the bottom, nearly coincident, one over the top) wrap the whole drawing. cups' arc to choose coffee cuts through choose tea's bar. |

## Blind (12)

| net | grade | what works | worst placement problem |
|---|---|---|---|
| assembly-cell | 4 | two feeder rows merge into the assembly line, resources above | The free-bin-slots arcs hook awkwardly into the Place/Unload bars. Minor. |
| bank-account | 3 | deposit and withdraw columns, lock in the middle | "Reject" is jammed onto the same row just left of "Commit withdraw". The balance-units inhibitor and arcs to both, plus lock returns, tangle under the lock, and the Reject label floats above. |
| blind-irregular | 2 | main row amber→…→garnet | Four long back arcs (garnet→amber, garnet→prism, quill→dune, lumen→cobalt) sweep over and under the row and cross each other. onyx is stranded at the top. |
| boss-fight | 1 | boss phases form a column | The player side is wrapped by three huge oval return loops. "damage on boss"/"boss attack incoming" send rope-like bundles of 4-5 parallel arcs into the phase transitions. The telegraph transitions are wedged left of the boss column. The player state machine (idle/attack/dodge/hurt) can't be seen. |
| card-game-turns | 2 | draw pile left, hands in the middle, discard right | Bob's turn and Alice's turn are in the middle column between draw and play. The turn hand-off arcs (Bob plays → Alice's turn, Alice plays → Bob's turn) cross diagonally, and Bob has drawn sits above Bob's turn. The alternation isn't visible. |
| ci-build | 4 | fork into four lanes, join, tests pass/fail choice | Join arcs from lint/compiled/tests bunch into one point. The retry loop is a wide arc around the bottom. |
| coffee-shop | 4 | cashier column, barista column, queue places between them | "clean cups" heads the barista column, so it reads as the barista's start state, while "barista free" hangs off to the side with a hook loop. |
| elevator | 1 | floors stacked vertically | "door closed" sends about 10 strands to every move/open transition, and "door open" gets a second sheaf. Labels collide ("Go down 2 to 1" with "Open door at 2", "Go up 2 to 3" with "at floor 3"), and two giant left-side loops wrap everything. Pure spaghetti. |
| print-spooler | 3 | submit → queue → start/cancel choice reads | "printer idle" is placed above, and the Clear jam→printing return is a huge arc over the top. The printer's own cycle (idle→printing→finish→idle) is never shown as a loop. |
| semaphore-cs | 4 | three identical process columns, the repetition is obvious | The semaphore sits in the B–C gutter, so A's P/V arcs run across the full width of B's column and loop. |
| tcp-connection | 2 | client and server columns | The "in flight" message places sit inside the client spine. The client's real states (SYN_SENT, FIN_WAIT_1) are pushed out as side bulges, and server FIN/ACK in flight sit inside the server column. The note asks for messages in the middle, and a reader takes "SYN in flight" for a client state. |
| traffic-intersection | 2 | light cycle as one column | The pedestrian side is split: "pedestrians waiting" is at the top left and "Pedestrian crosses" at the bottom left, joined by a long vertical arc. walk requested's inhibitor arcs are long diagonals. "NS to green" sits off to the side with a doubled return loop. |

## Recurring placement problems, most damaging first

1. **Hub place parked to the side, so its arcs become a fan or rope.** A shared place with many arcs goes below, above or off to one side, and its arcs fan across the drawing or bundle into parallel strands. This is the biggest reader-killer. Nets: elevator, boss-fight, fig-04-23, fig-04-24, fig-03-20, bank-account, fig-03-33 (mild), ci-build (mild).
2. **An actor's sequence isn't kept in one column or lane.** Its states are displaced sideways or split apart, or foreign places (messages, turn tokens) take over its spine. Nets: tcp-connection, conversation, card-game-turns, two-phase-commit, traffic-intersection, fig-03-31, fig-02-06, coffee-shop (mild).
3. **Small cyclic nets flattened into a single row with long return arcs.** The loop shape Peterson draws as a triangle, diamond or ellipse disappears. Nets: fig-02-09, fig-04-15, fig-04-07, fig-04-27, fig-08-19, fig-02-19, fig-02-04, blind-irregular, fig-03-25.
4. **Giant wraparound return loops that enclose empty space or run in parallel.** Nets: boss-fight, fig-04-23/24, vending, traffic-intersection, print-spooler, elevator, ci-build.
5. **Paired places in a gutter whose arcs cross in an X.** Paired handshake or buffer places are packed in the gutter between actors. Nets: fig-03-19, fig-07-13, pipeline, fig-03-31, fig-04-06.
6. **Label collisions.** Labels overlap arcs or neighboring labels. Nets: elevator, fig-03-20, philosophers-3, turn-taking, fig-03-02, guarded-retry.
7. **Self-loop pairs crushed into two near-coincident curves.** Nets: fig-04-07, fig-04-09, fig-04-18, fig-06-02, fig-06-12, fig-07-05, fig-02-21. This is mild alone but adds up on small nets.

What the engine does well: two or three actor columns with a shared resource between them (fig-03-28, 03-29, 04-03, 04-06, intersection, semaphore-cs, pipeline) and linear flows (fig-03-01, 03-03, fork-join, traffic-light). These are at Peterson's level. fig-07-06 beats Peterson.

## 5 worst drawings

1. elevator (1): door-closed hub spaghetti with label collisions.
2. boss-fight (1): player state machine buried under oval loops and arc ropes.
3. fig-04-23 (1): p3 hub below with a 6-strand fan and an empty oval. Far worse than Peterson.
4. conversation (2): party B's column torn apart, so the two parties don't mirror.
5. tcp-connection (2): message places occupy the client spine and actor states get pushed out.
(Close behind: card-game-turns, traffic-intersection, fig-03-20, fig-04-15.)

Grade tally: book mean ~3.3 (5s: 03-01, 03-03, 03-28, 03-29, 04-03). heldout ~3.7. blind ~2.7. Book nets: about 7 equal or better than Peterson, 30 worse or slightly worse.
