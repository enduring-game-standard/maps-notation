# Drawing prototypes

Prototypes are throwaway HTML pages that draw a net in a candidate convention. Each lives in `prototype/` on its own `prototype/*` branch, in a worktree under `.claude/worktrees/`.

## Sub-features

- `proto-render` draws the net with no page errors.
- `proto-variants` switches between drafts or designs through URL parameters.
- `proto-play` fires a verb and shows the world's answer, where the prototype supports it.

## How to get to it (user POV)

- The user opens `http://21.0.0.3:<port>/<page>.html?<params>` in their Chrome.

## Driving it with scripts/shot.mjs

Preconditions:

- The worktree is on the commit being verified.
- A static server this run started serves its `prototype/` folder on a free port.

- **Render each variant.** For every parameter combination the page offers, run `node .claude/skills/verify/scripts/shot.mjs "http://127.0.0.1:<port>/<page>.html?<params>" .verify-evidence/<run>/<name>.png --selector svg`. Each JSON line has empty `errors`.
- **Look before claiming.** Open each PNG and write one sentence on what it shows. Count crossings with the prototype's own counter script, not by eye.

## Gotchas

- The remote Chrome extension has frozen on first load several times this session. Use the headless helper for evidence, and the user's Chrome only to show them.
- A prototype that stores positions by hand is a display, not a convention. Check it with the convention invariants.
