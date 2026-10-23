# Engine analysis

The engine is the source of truth for what a score means: whether it is well formed, which positions are reachable, which outcomes occur, and which verbs never fire.

## Sub-features

- `engine-parse` reads `maps 2` text into a net.
- `engine-check` reports structural problems.
- `engine-analyze` explores every reachable position and reports outcomes, play counts, stalls, livelocks, and dead verbs.

## How to get to it (user POV)

- In the Studio, open the Analysis drawer ("Does the game mean what you think?").
- From a terminal, run the engine helper.

## Driving it with scripts/engine.ts

- **Analyze.** From `studio/`, run `npx tsx ../.claude/skills/verify/scripts/engine.ts ../examples/call-the-coin.maps`. Exit code 0. JSON shows 8 states, 8 verbs, 20 arcs, `complete: true`, outcomes `Caller wins` and `Caller loses`, and empty `deadVerbs`.
- **Ground truth for a blind read.** Save the JSON next to the screenshot it grades.

## Gotchas

- `analyze` stops at 250,000 positions. `complete: false` means the counts are lower bounds.
- Prototype engines on `prototype/*` branches (for example `prototype/duel.js`) are not this engine. Name which engine produced a fact.
