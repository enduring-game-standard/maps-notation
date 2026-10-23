---
name: verify
description: Drive and prove MAPS work in this repo. MAPS is the notation; the surfaces are the Studio web app (studio/, Vite + React canvas), the engine (studio/src/core, parse/check/analyze a .maps file), and throwaway drawing prototypes (static HTML on prototype/* branches). Use it to render a net and capture a screenshot, run the engine on a score, check that a drawing convention behaves like a convention (deterministic, independent of names, same shape for same structure), and run a blind-read probe, before claiming that a MAPS drawing reads or compares.
---

# Verify MAPS work

MAPS is meant to be a durable written form for game design: a score a trained reader can read on the page, without playing the game and without its author, and compare against another score (Enduring Games 11:73-75, 11:53). Proof has three tiers, and a claim says which tier backs it.

1. **Mechanical.** Scripts measure these. A render has no errors. The engine accepts the score and reports what it can reach. Same text gives the same drawing. Renaming changes no geometry. Structurally identical parts draw identically. A variant's change shows up where the variant changed.
2. **Blind read.** A fresh agent that sees only the image answers designer questions, graded against engine truth. This is the closest agent-checkable proxy for "readable at a glance". It is not the human verdict.
3. **Human judgment.** Whether it feels coherent, and whether it is the notation. Only the user decides this. Never report it as verified.

Everything below runs from the repo root, `/home/wscottsh/repos/egs/maps-notation`. Helpers live in `.claude/skills/verify/scripts/` and resolve Playwright from `studio/node_modules`. Headless Chromium is installed locally under `~/.cache/ms-playwright`, so screenshots never need the user's browser.

## Launch

**Studio.** Pick a free port first, because other projects on this machine run Vite servers too (port 5180 belonged to `cs-pod-editor` at the time of writing): `PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("",0)); print(s.getsockname()[1])')`. Then run `cd studio && npm run dev -- --port $PORT --strictPort` in the background. The script already passes `--host 0.0.0.0`. It is ready when `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$PORT/` prints `200`. Never use 5173, which may be a Studio the user has open. Give the user `http://21.0.0.3:$PORT/`, never a localhost URL; their Chrome runs on another machine (confirm the IP with `ip -4 -o addr show eno1`). Teardown: stop the background task you started.

**Prototype pages.** These are static HTML in `prototype/` on a `prototype/*` branch, checked out in a worktree under `.claude/worktrees/<name>`. Serve with `python3 -m http.server <port> --bind 0.0.0.0 --directory <worktree>/prototype` in the background, on a port nobody holds (`ss -ltnp | grep :<port>` prints nothing). Ready when curl returns `200`. Ports 8140, 8141, 8142, and 8765 have been in use by earlier sessions; check before taking one.

**Engine.** Nothing to launch. Run `cd studio && npx tsx ../.claude/skills/verify/scripts/engine.ts <path.maps>`.

## Doctor

Run these before driving anything, and again whenever a result looks off.

- `cd studio && npx vitest run` passes. At the last check this was 6 files and 10640 tests. A red suite means the engine itself is suspect.
- `curl -s -o /dev/null -w '%{http_code}' <url>` prints `200` for the exact URL you will drive.
- `ss -ltnp | grep :<port>` shows a process you started. If someone else owns the port, do not drive it; start your own on another port.
- On a prototype branch, `git -C <worktree> log --oneline -1` matches the commit you mean to verify.

## Drive

**Render a page.** Run `node .claude/skills/verify/scripts/shot.mjs <url> <out.png> [--selector <css>] [--width 1600] [--height 1000] [--wait 800]`. It prints JSON `{url, status, out, errors}` and exits 1 on any page or console error, or an HTTP status of 400 or above. Use `--selector` to crop to the drawing, such as `svg` or `.canvas`.

**Render a score in Studio.** Run `STUDIO_URL=http://127.0.0.1:$PORT/ node .claude/skills/verify/scripts/studio.mjs <file.maps> <out.png>`. It loads the file the same way a user's saved work loads (the `maps-studio:net` localStorage key), clicks **Fit**, and screenshots `.canvas`. It prints `{title, nodes, errors}`. `nodes` counts `[data-node]` elements; compare it with the engine's state and verb counts.

**Engine truth.** `engine.ts` prints the counts, `check` problems, reachable positions, play counts by outcome, stalls, livelocks, and dead verbs. Blind-read answers are graded against this.

**Layout metrics for Studio routing.** Run `cd studio && npx tsx tools/cable-metrics.ts route <example-name>`. Prototype renderers must ship their own counter (crossings, arcs through nodes, crowding) as a script. A number with no script behind it is not evidence.

**Drawing-convention invariants.** A convention, unlike a display, must pass these. Each prototype renderer exposes a pure `layout(net)` so a script can run them:

- **Deterministic.** Render the same text twice. The geometry is identical, and so are the PNG bytes once labels are hidden.
- **Name-blind.** Rename every id and label consistently. The geometry is identical.
- **Same structure, same shape.** Embed one subnet, such as a two-verb loop, in two different scores. It draws with the same relative geometry in both.
- **Local delta.** Change one arc between two variants. The drawn change stays near that arc instead of reflowing the page.

**Blind read.** Spawn a fresh subagent that has seen nothing else this session. Give it only the PNG path and a fixed question list written before rendering. Example questions: who can speak here; what the player can do while the enemy winds up; where the punish window is; which of two images has an answer that is always right; what changed between image A and image B. It must not get the text, the code, or your notes. Grade every answer against `engine.ts` output or the prototype's own engine. Report the score as k/n with the wrong answers quoted. For a comparison claim, run the same questions across every variant.

## Evidence

Write proof under `.verify-evidence/<YYYY-MM-DD>-<topic>/` at the repo root. That directory is gitignored. Cleanup never touches it. Each proof keeps:

- each screenshot and the JSON line its helper printed,
- the engine JSON for every score rendered,
- invariant script output with pass or fail per check,
- blind-read questions, answers, and grades, as written,
- the commit SHA of whatever branch rendered it.

Standards:

- Exercise the real path: the page the user would open, the file the user would load. Never use internal setters.
- Capture before and after for any interaction.
- When a helper prints `errors`, the proof failed, whatever the picture looks like.
- A screenshot proves a render happened. It does not prove readability. Look at it and say what you see before claiming anything. Measure clutter with the counter, not by eye.

## Cleanup

Stop only the background tasks and servers you started, by their task or PID. Never use `pkill` by name; the user's own servers share names. Remove scratch worktrees you created, if they hold nothing unpushed. Leave `.verify-evidence/` alone.

## Helpers

- `scripts/shot.mjs` screenshots any URL headlessly, reports console errors, and exits nonzero on errors.
- `scripts/studio.mjs` loads a `.maps` file into a running Studio, fits it, and screenshots the canvas.
- `scripts/engine.ts` parses, checks, and analyzes a `.maps` file with the real engine and prints JSON. Run it from `studio/` with `npx tsx`.

The feature map is in `features/README.md`.
