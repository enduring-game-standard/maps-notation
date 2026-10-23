---
name: verify
description: Verify a MAPS drawing-convention prototype before the user sees it. MAPS is a written form for game designs; the prototypes are candidate conventions for drawing a MAPS net, built on prototype/* branches for the map "Wayfinder: the shape of MAPS" (Spine prototypes, Feedback on a rules map). Use before handing any prototype drawing to the user, to check it against the user's criteria (conversation, possibility structure, actionable, the coherent-design decisions, one default for every net, a readable net, napkin, every element earns its place, radical difference) and to say which claims only the user can judge.
---

# Verify a MAPS drawing prototype

The user judges prototypes. Everything checkable without them is checked first, so what reaches them is already self-critiqued. A prototype the user has to diagnose is a failed handoff.

## What is being verified, and where it comes from

Each criterion comes from the user's own words, the map, the coherent-design ticket (#14), or *Enduring Games* (book). Each names its check. A check marked **proxy** supports the criterion and never proves it.

| id | Criterion | Source | Check |
|---|---|---|---|
| `conversation` | The drawing visibly shows a Crawford conversation: who speaks each verb, what the world answers and in what order, the world acting with nobody speaking. | user ("neither feels like a visualization of a crawford conversation"); #14 "the conversation is the anchor" | blind read |
| `possibility` | It visualizes a possibility structure: at a moment, what is open, what closes it, where each choice leads. | user ("games are possibility structures"); S&Z p.67 | blind read |
| `actionable` | A designer can act on it: find the flaw the engine finds, say why a variant plays differently. | user ("not actionable as a design tool"); book 11:75 | blind read graded against engine flaws |
| `entity` `content` `contact` `counts` | #14's decisions are readable: each entity is always in one of its states; content conditions are apart from capability; contact is one entity's verb gated by another's state; counts and ratios are on the map. | #14 | blind read; `entity` silhouette and printed numbers (proxy) |
| `compare-shape` `compare-name` | Same structure gives the same shape; named variants show what changed. | #14, map Notes, book 11:75 | blind read on pairs; deterministic, name-blind, order-blind, position-blind, local delta (proxy) |
| `loop` | A feedback loop jumps out. | #22 | blind read |
| `default` | One convention draws every net, with no per-subject tuning, like staff notation for all music. | user | harness runs every design on every corpus and generated net; the worst net counts |
| `readable` | A readable net, not a tangle: nodes placed with intent, lines routed with care, no connection hidden. The dining philosophers figure is the standard. | user | written screenshot critique of what each placement and route says, independent critic; coverage (no hidden arc); clutter counts only as a diagnostic, never a target |
| `napkin` | A designer can draw it by hand from its rules. | #11, #14 | hand-reproduction by a fresh reader given only the rules |
| `earns-place` | Every element exists for a stated reason; removing it costs a reader something. | user | declared purpose per element; ablation blind read |
| `radical` | The six designs differ at the root, not in styling. | user | declared axes; rank correlation of placements between designs; critic |
| human | Would a designer use it? Is it boring, confusing, or trying too hard? Is it the notation? | user | **only the user.** Never reported as verified. |

Hard rules the user already gave. Breaking one fails the prototype without further checks:

- Never optimize a number. Counts (crossings, drift, napkin agreement, blind-read totals) are diagnostics that point at a place to look, never goals or targets. The goal is what each node's placement says: every position and every route has a stated meaning a reader can see. A brief, a design note, or a verdict that names a count as the target is a failure. Crossings are allowed; the dining philosophers figure has them.
- Never test against or design from the Ocarina atlas (`examples/ocarina-of-time/`).
- Examples never shape a design. A convention is designed from the criteria and the sources, then tested across many nets. Never tune a design to one subject (Goomba, Link, a dungeon, stamina, the duel).
- Every claim to the user carries its evidence or is labeled inference. Never pass on a caveat you cannot explain.
- The user opens prototypes at `http://21.0.0.3:<port>/...`, never localhost.

## Where things live

- Harness, contract, corpus, generated nets, designs: branch `prototype/notation`, worktree `.claude/worktrees/notation`, folder `prototype/notation/`. Read `harness/contract.ts` before writing a design: it is the interface every design implements (`draw`, `rules`, `elements`, `axes`).
- Engine truth: `studio/src/core` (parse, check, analyze). `scripts/engine.ts` here prints it as JSON. Corpus answers are in `corpus/questions.json`.
- Tools: tsx is `studio/node_modules/.bin/tsx` in the main checkout (the worktree has no node_modules). Playwright and headless Chromium resolve from `studio/`.

## Run

1. **Harness.** From `prototype/notation/harness/`, run `/home/wscottsh/repos/egs/maps-notation/studio/node_modules/.bin/tsx run.ts [design ...]`. It writes `out/report.md`, `out/report.json`, `out/gallery.html`, and one SVG per design and net. Per net it reports coverage, deterministic, position-blind, name-blind, order-blind, crossings, arcs through nodes, overlaps, numbers printed, and entity silhouette. Per design it reports conformance to the contract, same-shape deviation for shared subnets, local delta between variants, and pairwise diversity. Any **no**, a nonzero coverage gap, or a conformance problem must be fixed or reported.
2. **Serve and screenshot.** Serve `harness/out/` with `python3 -m http.server <free port> --bind 0.0.0.0 --directory <path>` in the background. Check the port first with `ss -ltnp | grep :<port>`. Run `node /home/wscottsh/repos/egs/maps-notation/.claude/skills/verify/scripts/shot.mjs "http://21.0.0.3:<port>/gallery.html?d=<design>&s=<net>" <png> --selector figure`. It exits 1 on any page error.
3. **Look and write.** Open every PNG. Before claiming anything, write for each one what it shows, what a reader sees first, and every defect: tangles, arcs through nodes, crowding, labels colliding, connections that are hard to follow. Compare it with the dining philosophers lessons. Each process is a straight spine. Identical parts are drawn identically. Shared places sit between the processes they couple. Returns sweep around the outside. Crossings are few and at wide angles. Bars are thin, labels sit beside them, and there is no chrome. A defect you saw and didn't fix goes into the handoff.
4. **Critic.** Spawn a fresh subagent with only the PNGs and the readability standard above. Ask it to list defects. Do not tell it which design you prefer.
5. **Blind read.** For each design, spawn a fresh subagent that has seen nothing. Give it only the PNG paths and the questions from `corpus/questions.json` (question text only, no answers, no `derived`). Forbid reading other files. Grade its answers against the key with a separate grader subagent that sees the key and the answers, but not the images. Report k/n per criterion, with each wrong answer quoted. Use a new reader for every design.
6. **Napkin.** Spawn a fresh subagent with only the design's `rules` and one generated net's text. It returns node positions as JSON. `harness/repro.ts` compares the result with the renderer's layout by rank agreement of x and y. Report the agreement.
7. **Ablation.** For each element of a finalist, render with `WITHOUT=<element>` and blind-read again. An element whose removal changes no score has not earned its place. Report that.

## Evidence

Write proof under `.verify-evidence/<YYYY-MM-DD>-<topic>/` at the main repo root, which is gitignored. Keep:
- the report,
- the PNGs,
- your written critique,
- the critic's list,
- reader answers and grades,
- napkin JSON,
- the commit SHA of `prototype/notation`.

Cleanup stops only servers you started, by PID, and never touches the evidence.

## Hand to the user

Give them the LAN URL. For each design, give the scores per criterion with evidence. List the defects you saw and didn't fix. Say plainly that the human row is theirs.

## Helpers

- `scripts/shot.mjs <url> <out.png> [--selector css] [--width] [--height] [--wait]` screenshots headlessly and prints `{url,status,out,errors}`.
- `scripts/engine.ts <file.maps>` (run from `studio/` with tsx) prints the engine's truth for a net.
