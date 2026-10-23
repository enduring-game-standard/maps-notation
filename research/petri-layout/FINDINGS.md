# Findings

This study derives placement rules from the 89 Petri net figures in Peterson (1981), *Petri Net Theory and the Modeling of Systems*. It then tests whether an engine that follows only those rules can draw nets it was given without coordinates. `RULES.md` states the rules (R1 to R22) and the decisions for when they conflict (C1, C7, C9, C10, C12 to C14). Every rule cites the figures it comes from.

## The rules in one paragraph

A net reads as the actors it models. Find each actor as a state-machine lane, using a minimal place invariant. Draw every lane as one straight line in firing order, starting at its anchor: the place where the actor rests (R1, R2). Put the lanes side by side, reading the same way, with stage k of each lane level with stage k of the others (R3). A place the lanes share sits in the gap between them, level with the first state that holds it (R4). Symmetry follows the sharing:

- peers competing for one resource are mirror images;
- a pipeline is translated copies;
- a ring of peers is a wheel of spokes;
- two lanes that hand tokens to each other run counterflow (R5).

Identical parts are drawn identically (R6). Returns go round the outside, and coupling arcs stay inside (R7). Choices fan out into diamonds (R10), forks and joins span the lanes they start or close (R11), and self-loops sit tight (R13). A net with no lanes is drawn as its shape: the longest cycle becomes a polygon, and everything else sits as far from each node as it is in the net (C12). Every placement states a relation. No rule tries to minimize a count.

## How the result was checked

**Rule checks.** `harness/run.ts` draws 61 nets and checks each against every rule that applies, with structural tests on top. Those tests cover hygiene (no overlaps, arcs ending on their nodes, labels clear), order- and name-blindness, and determinism.

| Set | Nets | What it tests |
|---|---|---|
| book | 37 | Peterson's nets, transcribed as structure only |
| heldout | 12 | nets I wrote after reading the figures, before the engine existed |
| blind | 12 | real systems written by a separate agent that never saw the rules or the engine |

The blind set first ran after the engine was built: 58 of 61 passed, but only 5 of the 12 blind drawings looked good. Fixes made after that point used critic feedback on all 61 nets, blind included. Each fix was a general rule checked across the whole corpus. The blind set is therefore no longer untouched, and a fresh blind set is the honest next test.

The engine passes 57 of 61. Two controls show the checks measure placement:

- Peterson's own coordinates for 3.29 and 4.6 pass (`tools/positive-control.ts`).
- A baseline that puts every node on a circle passes 0 of 61.

**Blind critics.** Their reports are in `critique/`. Two opus agents, briefed separately, graded every render from 1 to 5. Neither saw the rules or the code. Book nets were graded beside Peterson's figure.

| Set | Critic 1 | Critic 2 (after fixes) |
|---|---|---|
| book | 3.3 | 3.49 |
| heldout | 3.7 | 3.83 |
| blind | 2.7 | 3.08 |

On critic 2's book nets, the engine was judged better than Peterson on 2, about equal on 15, and worse on 20. Grades of 5 went to 3.1, 3.3, 3.28, 3.29, 3.33, 3.34, 4.3, fork-join, intersection, traffic-light and assembly-cell. These are nets whose actors fall into lanes.

## Where it falls short

The label and R7 failures come from the checks. The rest come from the critics' reports in `critique/`.

- **Labels.** Four nets fail the checks, all on labels (an arc through a label, or labels touching): philosophers-3, bank-account, boss-fight and elevator. Boss-fight also fails R7, because one return runs on the shared side.
- **One place serving many bars.** In elevator, the place "door closed" fans about ten arcs across the drawing. R9 puts a hub among the bars it serves, but here they span every lane.
- **Lanes the invariants do not separate.** In tcp-connection, the minimal invariants put message places into one actor's lane. The lane that results is not an actor. Critic 2 also saw an actor split in conversation, card-game-turns and 3.31. A cover that prefers lanes of a single actor broke four other nets, so it was reverted.
- **Self-loops on raised bars.** The two strands are drawn close and at a slant. Critic 2 saw this in 4.9, 4.18, 4.23 and 6.2, even where the placement matches Peterson's.
- **Small nets with no lanes.** These now read left to right with upright bars. Critic 2 graded them before that change and gave them 2. They have not been regraded.
- **Long returns.** Critic 2 saw returns wrap the whole drawing in boss-fight, vending and print-spooler. This follows from R7 (returns outside). Peterson's nets are small enough that the cost never shows.

## Files

- `RULES.md` gives the rules, the conflict decisions, and the figures behind each.
- `analysis/` holds one written analysis per figure, by chapter.
- `engine/` holds structure analysis (lanes, roles, cuts) and the renderer.
- `designs/peterson/` holds the layout plans: lanes, wheel, counterflow, ring and shape.
- `harness/` holds the checks and the corpus loader. `tools/` holds the extraction and control scripts.
- `decisions.tsv` logs every decision, with its reason, its evidence and its result.

To run the checks, run `npm run run -- peterson` from this directory. Renders go to `out/peterson/`. To render PNGs, run `node harness/png.mjs peterson`.
