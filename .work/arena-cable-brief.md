# Arena brief: cable management for MAPS Studio arcs

## The user's request, verbatim

> okay, lets shift to UI fixes. right now the connections look like a rats nest. this is the big failure of every node based graph system of any complexity and it's terrible. perform default cable management. not just to make things clean looking, but genuinely laid out in a way that is useful. make the arcs locations first class citizens in the way that the nodes locations are.

## Grounding (read before writing code)

- `SPEC.md`. MAPS 2 is a visual notation: states (circles holding marks), verbs (boxes, spoken by a seat or the world), arcs of four kinds (take, give, need, unless). Read the arc table and the new paragraph after the text-format table about `via`.
- `studio/src/ui/Canvas.tsx` draws everything. Today an arc is one quadratic curve (`arcCurve` in `studio/src/ui/geometry.ts`). `studio/src/ui/edit.ts` has the pure edit operations; `App.tsx` owns history (onCheckpoint/onLive/onCommit); `Inspector.tsx` edits a selected arc; `Phone.tsx` is the phone shell; `styles.css` styles arcs (`.arc-take`, `.arc-need` dashed, etc.).
- `examples/tic-tac-toe.maps` is the stress case: 35 states, 37 verbs, 177 arcs. Open the studio and look at it. It is a rat's nest. `examples/call-the-coin.maps` is the small case.
- `studio/tools/cable-metrics.ts` is the gate. Run `npx tsx tools/cable-metrics.ts curves` for the baseline and `npx tsx tools/cable-metrics.ts route` for yours. Do not edit it. If you think a metric is wrong, say so in your rationale.

Baseline, today's curves, tic-tac-toe: 216 node intrusions, 48 arcs over a state label, 1381 crossings, 67,707 px of ink.

## Fixed data shape (already committed, do not change)

`Arc.via?: Point[]` in `studio/src/core/model.ts`: bend points placed by hand, ordered from the state end to the verb end, for every arc kind (a give arc still lists the state end first). Absent means the editor routes the arc. The text form is `take x_to_move via 120 300 400 300`. Parse and print already round-trip it. Moving a node never rewrites `via`.

## The contract you must implement

`studio/src/ui/route.ts` exports `routeArcs(net: Net, shapes: Map<string, Shape>): Map<string, Pt[]>`, keyed `${kind}|${state}|${verb}`. Each value is a polyline in drawing order from the state end to the verb end: the first point on the state's border, the last on the verb's border. Pure and deterministic. An arc with `via` passes through every via point in order. The canvas, the token-flight animation in play mode, and the metrics harness all read this function. You may export more from it (cable trees, junctions) for the renderer.

## What to build

1. **Default cable management.** Route every arc without `via` automatically, live as nodes move. What "useful" means here, in priority order:
   - No arc passes through a node or over a state's label.
   - Arcs that leave one state with the same kind, or arrive at one state with the same kind, read as one cable: a shared trunk that branches, with a junction dot at each branch, so "X to move feeds every X move" is visible as one thing. Different cables never overlap collinearly, since an overlap makes it impossible to tell which goes where; they run as parallel tracks.
   - A verb's inputs and outputs are distinguishable from where they attach.
   - Few crossings, little ink, few bends.
   - Arc kinds stay legible: arrowheads for take and give, the dashed line and dot of need, the open circle of unless, and the count badge where it cannot be mistaken for another arc's.
2. **Arc positions as first-class as node positions.** A user can grab an arc and move its route; the result is stored as `via`, saved in the file, shown in the text pane, survives undo/redo and reload. Where arcs share a trunk, moving the trunk moves it for all of them. The inspector for a selected arc shows whether its route is automatic or hand-placed, with a way to return it to automatic. Provide one action that returns every arc to automatic routing.
3. **Everything that worked keeps working.** Hover and selection focus (fade the rest, highlight the node's arcs), arc selection by click, the touch rules on phones (tap selects; only something already selected drags; a drag on anything unselected pans), the token flight in play mode following the new paths, the phone e2e (`studio/e2e/phone.mjs`), unit tests, build.
4. **Speed.** Dragging a node in tic-tac-toe must stay smooth. Report the route time from the harness. If a full re-route is too slow for every pointer move, route incrementally or defer, and say what you chose.

Keep the node positions in the example files as they are, so routers are compared on the same layout. If you believe the tic-tac-toe node layout is what limits the result, say so in your rationale with evidence, but do not change it.

## How to verify

- `npm test`, `npm run build` in `studio/`.
- `npx tsx tools/cable-metrics.ts route` and `curves`. Put both tables in your rationale.
- Unit tests for the router that would fail on a real defect: an arc routed through a node, a via point not honored, nondeterminism, two cables overlapping.
- Run your own dev server: `npx vite --host 0.0.0.0 --port <PORT> --strictPort` from `studio/`, and screenshot with Playwright (installed as a devDependency; chromium is cached) at 1440x900: tic-tac-toe at Fit, the same with `x_to_move` hovered, a dragged trunk, and an iPhone 13 view. Look at the screenshots yourself and iterate until a stranger could read the board's wiring.
- `STUDIO_URL=http://localhost:<PORT>/ npm run e2e:phone` passes.

## Rules

- Work only in your worktree. Commit there on your branch as you go; end commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.
- No new runtime dependency unless you justify it in the rationale (license, size, why hand-rolled is worse). The repo is MIT.
- Comments only for a non-obvious why. No phase-narrating comments in tests or scripts.
- Write `.work/arena-cable-<your label>.md` in your worktree: the approach, the alternatives you considered and rejected and why, the metrics tables, screenshot paths, the route time, and known weaknesses.
