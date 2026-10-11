# MAPS greenfield — run todolist

- [x] Read the Principles section of the poteto-mode skill
- [x] Phase A: Frame (definition of done, scope, rigor)
- [x] Phase B: Design the workflow
- [x] Phase C: Run the loop
  - [x] C1 core model types + text format (parse/print round-trip)
  - [x] C2 engine: conversation semantics (world-urgent, priority, seats, read/inhibit, outcomes, visibility)
  - [x] C3 tic-tac-toe generator (lever) + reachability harness: 5478 positions / 958 terminal / 255168 games
  - [x] C4 gap log from tic-tac-toe -> spec decisions
  - [x] C5 studio UI: canvas edit, play (token game per seat lens), transcript, text pane, analysis
  - [x] C6 drive UI in Chrome over LAN, fix what breaks
  - [x] C7 SPEC.md + README rewrite; delete superseded docs; RUNS seam section
  - [x] C8 independent review (interrogate) of spec+engine
- [x] Phase D: Keep the audit trail (.work/decisions.tsv, row per decision)
- [ ] Phase E: Verify and hand back

# Cable management (Feature playbook)

- [x] 1. `how` over the affected subsystem. (read Canvas/geometry/edit/text directly; subsystem is mine from earlier in session)
- [x] 2. `architect` for parallel design exploration. (arena with 2 runners, opus + sonnet, each its own worktree)
- [x] 3. Throughput checkpoint
  - Blocking first steps: Arc.via data shape + text round-trip + cable-metrics gate (c2ac53a), done by lead as the gate
  - Independent workstreams: n/a beyond the arena; router, renderer, editing all touch Canvas.tsx, one owner per candidate
  - Shared mutable state: split by worktree (maps-cable-a, maps-cable-b), ports 5181/5182
  - Smallest safe decomposition: one owner per candidate, since route.ts and Canvas.tsx are coupled
- [x] 4. Delegate via arena (brief .work/arena-cable-brief.md); base A, grafts from B
- [x] 5. Verify on the matching surface (Chrome at 21.0.0.3, desktop + phone e2e, metrics)
- [x] 6. Rebase into small, ordered commits (kept candidate history via merge commit)
- [x] 7. interrogate if contested: skip, arena cross-judge already reviewed; not contested
- [ ] 8. Opening a PR: skip: user has not asked to push or open a PR

Arena rubric: (1) a stranger can read tic-tac-toe wiring at Fit; (2) metrics: 0 intrusions, 0 different-cable overlap, low crossings/label hits; (3) first-class routes: drag trunk -> via stored, text, undo, reload, inspector auto/hand + reset, reset all; (4) smooth node drag; (5) maintainable pure router + defect-detecting tests; (6) no regressions (phone e2e, tests, build).
