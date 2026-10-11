# Arena runner a: cable management

## Approach

Every arc is an orthogonal polyline on a 5 px grid. `studio/src/ui/route.ts` owns the grid, the search, and the cable trees.

- **Obstacles.** Each state circle (with its outcome ring), its label, its private badge, each verb box with its priority badge, and each group hull's title claim grid cells, inflated by 4 px. Cells exactly 4 px from an edge count as blocked. Without that, arcs threaded the 8 px gaps between the stacked line verbs.
- **Ports.** A state has ports on its left, right and top sides; its label blocks the bottom. A verb takes its inputs (take, need, unless) on its top or left edge and gives its outputs from its bottom or right edge, so a verb's inputs and outputs can be told apart by where they attach. A short straight stub joins each port to the node's border.
- **Cables.** Arcs with the same state and kind form one cable, which is grown as a tree. The first arc runs from the state's ports. Each later arc is a multi-source A* search from every cell already in the tree, so it branches where the tree comes closest. Junction dots are found afterwards from the finished polylines: a point that one cable leaves in three or more directions. Hand-placed routes therefore get dots too.
- **Tracks.** Each grid cell records which cable holds it horizontally and which holds it vertically. A cable may never share an axis of a cell with another cable, may not turn on a foreign cell, and pays a cost to cross one. Different cables therefore never overlap. They run as parallel tracks at least 5 px apart, and a small cost for running right beside another cable spreads them out where there is room.
- **Costs.** Step 5, bend 24, crossing 45, beside 3, plus port preference. The search is weighted A* (heuristic times 1.3) with a bend-aware Manhattan heuristic.
- **Two passes.** Pass one routes every cable, shortest first, with a cheap crossing cost of 10. Pass two rips each cable up and routes it again at the full cost, now knowing where the others went. On tic-tac-toe this cut distinct crossings from 435 to about 380.
- **Via.** An arc with `via` is routed leg by leg: state to via 1, then via 1 to via 2, and so on to the verb. It always passes through every via point, and the exact via coordinates are kept in the polyline. Its cells join the cable's tree, so automatic cable-mates can branch off a hand-placed trunk.
- **Fallbacks.** If the strict search fails, a lenient search treats walls and overlaps as large costs instead. If that also fails, the arc is drawn straight. Neither fallback fires on the two examples.

### Making arc positions first-class

- Click an arc on desktop and it is selected; drag it and the nearest segment slides sideways, snapped to the grid. On a phone, a tap selects an arc and only an already-selected arc drags; a drag on an unselected arc pans the view. `moveSegment` in `edit.ts` shifts that segment in every arc of the same cable that runs along it, then writes each arc's bend points to `via`. Dragging a shared trunk therefore moves it for all of them.
- The drag goes through the same `onCheckpoint`/`onLive` path as a node drag, so one drag is one undo step. `via` is printed in the text pane, autosaved, and survives reload.
- The inspector shows "Automatic" or "Placed by hand · N bends". It offers "Route automatically" for the selected arc and "Whole cable (n)" when its cable-mates are also hand-placed. With nothing selected, the design panel offers "Route all automatically" and a count of hand-placed arcs.

### Speed: what I chose

- A full route of tic-tac-toe takes about 470 ms (harness median), which is too slow for the main thread on every change. `useRoutes` posts the net to a Web Worker (`route.worker.ts`) once the net has been still for 120 ms and shows the worker's result when it arrives for the current net.
- Between full routes the canvas routes incrementally on the main thread with `routeArcs(net, shapes, prior)`. Every arc that does not touch a moved node and that no node now sits on keeps its previous path exactly. Stale arcs are routed again as branches off whatever of their cable still stands. Only a moved state re-routes its whole cable.
- Incremental searches use a greedier heuristic (times 3) and a budget of 12,000 expansions per arc. On the budget they fall back to a straight segment until the worker settles. That never showed up in my runs.
- Search buffers are reused across calls (`scratch`), because allocating 4 MB per frame showed up in the profile.

Measured incremental cost in Node (warm, median of 10 moves, including junctions): `x_line_159` 9 ms, `x_5` 10 to 12 ms, `x_to_move` 10 to 13 ms, `judge_x` 12 ms, `x_marks_5` 14 to 18 ms, `squares_left` 16 to 26 ms. Runs varied this much.

Measured frame intervals in headless Chromium on the production build, with one pointer move per frame (`vite preview`): `x_to_move`, `x_marks_5`, `judge_x` and `x_line_159` have a 16.7 ms median, so 60 fps. The two worst hubs, `squares_left` (18 arcs that all re-route because the state moves) and `x_5` (needs that cross the whole board), have a median of 16.8 to 33 ms, so 30 to 60 fps.

## Alternatives considered and rejected

- **Better curves (spline bundling or force-directed edge bundling).** Rejected. Bundled curves still pass through nodes unless they are routed around them, and a curved bundle does not give the hard guarantee that different cables never overlap. The brief puts "never through a node or label" first, which a grid makes easy to guarantee.
- **A sparse orthogonal visibility graph with a nudging pass (libavoid-style).** It would be far fewer nodes and so faster. But separating tracks would need a separate nudging stage that can still produce overlaps and crowding, and libavoid itself is LGPL C++. The dense grid gets track separation for free from per-axis occupancy. I paid for that in speed and handled it with the worker plus incremental routing.
- **A 10 px pitch.** It would be about 4 times faster, but a 22 px verb has only 2 rows of ports on a side. The line verbs each need 4 inputs from the left, because their top and bottom are blocked by their neighbors.
- **No direction state in the search (cell-only A*).** Cheaper, but bend costs would be approximate. I kept the cell-by-direction state.
- **Penalizing crossings by how many arcs share the trunk.** That would lower the harness's crossings number, but it would game the metric without changing what a reader sees. I did not do it.
- **No new runtime dependencies.** Everything is hand-rolled, about 900 lines in `route.ts`.

## Metrics

`npx tsx tools/cable-metrics.ts curves` (baseline) and `... route` (mine), at the final commit.

tic-tac-toe:

| metric | curves | route |
|---|---|---|
| arcs | 177/177 | 177/177 |
| node intrusions | 216 | **0** |
| arcs over a label | 48 | **0** |
| crossings (arc pairs) | 1381 | 1803 |
| overlap px (different cables) | 0 | 0 |
| crowded px (<5 px apart) | 0 | 0 |
| ink px | 67,707 | **40,063** |
| bends | 4071 | 754 |
| diagonal segments | 4248 | 0 |
| route ms (median of 5) | 0.7 | 468.4 (full, in a worker) |

call-the-coin:

| metric | curves | route |
|---|---|---|
| arcs | 20/20 | 20/20 |
| node intrusions | 4 | **0** |
| arcs over a label | 3 | **0** |
| crossings (arc pairs) | 5 | 9 |
| overlap px | 0 | 0 |
| crowded px | 0 | 0 |
| ink px | 3167 | **2617** |
| bends | 460 | 31 |
| diagonal segments | 480 | 0 |
| route ms | 0.1 | 4.8 |

### Where I think the crossings metric misleads

The harness counts crossings per pair of arcs. When two bundled trunks cross once, it counts one crossing for every arc on one times every arc on the other; for example, the 18-arc `squares_left` trunk crossing a 9-arc trunk counts 162. Bundling, which the brief asks for, inflates this number even when the picture has fewer crossings.

I counted distinct points where two different cables cross, deduplicating segments shared within a cable. The script is `distinct.mts` in my scratchpad and is not committed.

| | curves | route |
|---|---|---|
| tic-tac-toe distinct crossing points | 1333 | **382** |
| call-the-coin distinct crossing points | 5 | 6 |

The "bends" row for curves counts the 23 interior sample points of each sampled curve, so it is not comparable with the router's bends.

### Is the layout the limit?

Partly, in one region. 209 of the 382 distinct crossings (55%) lie right of x = 1000, the judge column, which is about a quarter of the canvas width. The cause is that the eight line verbs per seat are stacked 30 px apart, which leaves 8 px gaps. Their tops and bottoms are therefore unreachable, and all 32 inputs per seat (24 needs and 8 takes from the judge) must enter from the left. Every need cable has to cross the judge's take trunk and the other need trunks in one narrow bus. Spreading the line verbs out, or giving them room above and below, would let inputs arrive from two sides. I did not change the layout.

## Verification

- `npm test`: 66 pass, including 10 new tests in `studio/src/ui/route.test.ts`. They check that no arc passes through a node, that endpoints sit on the borders, that different cables never overlap collinearly, that routing is deterministic, that the `x_to_move` cable shares one root and has junctions, that via points are honored in order, that via round-trips through text, that incremental rerouting keeps untouched cables while avoiding nodes, and that a trunk drag sets `via` on exactly the arcs on that segment and `autoRoute` clears it.
- I checked each defect class by mutating `route.ts`. Removing the node obstacles failed 6 tests. Letting cables share track failed 3. Ignoring `via` failed 2. A random tie order failed the determinism test.
- `npm run build` passes.
- `STUDIO_URL=http://localhost:5181/ npm run e2e:phone`: 23 PASS, 0 FAIL.
- A Playwright script in my scratchpad checks the following on the dev server; all pass: hover focus, a trunk drag places 3 arcs, the inspector says "Placed by hand", the text pane shows `via`, undo, redo, reload, "Route all automatically", and play tokens on the routed paths. A second script on an iPhone 13 checks that a drag on an unselected arc pans, a tap selects, and a drag on the selected arc moves its route without moving the view.
- I fixed a bug that predates this work in the flight animation: a frame timestamp earlier than `t0` read frame -1 and threw. Tokens now also read the routes on screen, not the ones from when the flight started.

## Screenshots (1440x900 unless noted)

- `.work/arena-cable-a/1-fit.png`: tic-tac-toe at Fit.
- `.work/arena-cable-a/2-hover-x_to_move.png`: `x_to_move` hovered; one trunk branching to all nine X moves, with junction dots.
- `.work/arena-cable-a/3-dragged-trunk.png`: a shared trunk of the `x_to_move` cable dragged left; the inspector shows "Placed by hand" and "Whole cable (3)".
- `.work/arena-cable-a/5-dragging-node-live.png`: mid-drag of `squares_left`, its 18-arc cable re-routing live.
- `.work/arena-cable-a/6-after-node-drag-settled.png`: the same after the worker settles.
- `.work/arena-cable-a/7-play-flight.png`: play mode, tokens on routed arcs.
- `.work/arena-cable-a/8-iphone13-fit.png`: iPhone 13 at Fit.
- `.work/arena-cable-a/9-iphone13-arc-dragged.png`: iPhone 13 after tapping and dragging an arc.
- `.work/arena-cable-a/10-call-the-coin.png`: call-the-coin with a count badge (`take 2 heads`) on its own branch.

## Known weaknesses

- At Fit, tic-tac-toe is still dense. Nothing crosses a node or label, but the judge column is a bus of parallel dashed needs that is hard to follow without hovering. Hover focus is what makes it readable.
- A few long arcs take detours around the board edge, for example `pass_to_x` giving to `x_to_move` and some needs. This is the crossing cost of 45 choosing ink over crossings.
- The full route takes about 470 ms. After a pause the worker's result replaces the incremental one about 0.6 s later, and paths can visibly re-settle.
- Hub drags run at 30 to 60 fps, not a steady 60.
- When a drag exhausts an arc's search budget, the arc shows as a straight line until the settle. That never showed up in my runs, but it can happen.
- Clicking a shared trunk selects whichever arc is drawn on top. The trunk drag still moves the whole trunk, but the inspector names only one arc.
- Via points are absolute. When a node moves, the router reconnects it to the first via point, which can add a detour near a hand-placed route.
- Port side rules (inputs top or left, outputs bottom or right) suit left-to-right layouts. A design that flows right to left gets U-turns.
- The count badge can sit close to a junction when the arc's own branch is short.
