# Notation bakeoff corpus

This folder holds the MAPS 2 scores that every competing drawing convention draws, and the questions a blind reader answers from each drawing. Every answer is graded against the engine in `studio/src/core/`.

No file has an `at` position, a `group`, or a `via` route. The parser accepts a state or verb without `at` and places it at 0,0, so a convention must derive placement from structure alone.

## Files

| File | What it tests |
|------|---------------|
| `duel-first.maps` | Link against one armed enemy, first draft. Strike from guard, and a strike that breaks the wind-up. A block makes the enemy reel. |
| `duel-revised.maps` | The revision. Both strikes into the wind-up are gone, and a block pushes Link back. The only punish window follows an evade. |
| `duel-held.maps` | The revision plus a held swing. The enemy swings (weight 3) or holds back (weight 2) at one priority, a chance tie. A strike catches the held swing. |
| `stamina-souls.maps` | Souls-like sketch. Strike costs 1, roll costs 2, and only holding recovers stamina. |
| `stamina-hunter.maps` | Hunter-like sketch. Strike is free, roll costs 2, and every beat recovers 1. |
| `stamina-third.maps` | An original variant. Strike and roll cost 1 each, and only a clean evade recovers, 2 at a time. At 0 stamina Link can never win. |
| `call-the-coin.maps` | Hidden information and chance. Copied from `examples/` without positions. |
| `tic-tac-toe.maps` | Scale, two seats, and priority. Copied from `examples/` without positions or groups. |
| `shared.json` | Subnets that appear under identical ids in several files. |
| `questions.json` | 67 blind-read questions: 6 to 9 per file, plus 10 comparison questions. 59 need structure, 8 need one label or one arc. |
| `crosscheck-duel.ts` | Proves the three duel ports behave like `prototype/duel.js` at commit a48d305. |
| `check-shared.ts` | Proves the sharing that `shared.json` claims. |
| `probe.ts` | Prints every resting moment of a score, with each seat choice, the world's answers, the odds, and the outcomes still reachable. The answers in `questions.json` are read off this output. |

The stamina sketches are inspired by the book's example. They are not transcriptions of Dark Souls or Monster Hunter, and each title says so. All three use the revised duel's enemy, stances, and contacts under the same ids, and add one `stamina` state (3 marks, capped by `unless 3 stamina` on `catch_breath`) and one `breath` state. The variants differ only in the `take n stamina` counts and in which verb gives `breath`.

## Porting the duel

The duel drafts are ported from `git show a48d305:prototype/duel.js` (drafts `first`, `revised`, and `mixup`, here `duel-held`).

- **Priority.** duel.js answers with world verbs in array order. The port gives one priority order to the whole family: punish 15, interrupt 14, catch 13, hit 12, block 11, evade 10, whiff 9, tick 8, tell 7, swing and feint 6, late 5, steady 4, rollend 3, end 2. The stamina verbs come last, `catch_breath` at 1 and `breath_spent` at 0. Gaps are harmless because only the order matters.
- **Outcomes.** A hit ends the play. `hit` gives `link_hit` (ends "Link takes a hit") in place of the -1 outcome. `punish`, `interrupt`, and `catch` give `enemy_hit` (ends "Link lands a hit") in place of +1. The original arcs to `idle` stay.
- **Renamed states.** MAPS forbids a state and a verb with one name, so the places `guard`, `strike`, and `roll` became `guarding`, `striking`, and `rolling`. The verb `gstrike` became `guard_strike`. Every other id is kept.
- **Quiet verbs.** `tick` is "The beat passes" and `end` is "The beat is over".
- **1-safety.** duel.js refuses a verb that would give a mark to a place already marked. The port omits that rule. The crosscheck shows that it never changes an answer at any moment duel.js explores.

## Engine summary

From `studio/`, `npx tsx ../.claude/skills/verify/scripts/engine.ts <file>`. Every file parses, has no check problems (no errors and no warnings), analyzes complete, and has no stalls, livelocks, or dead verbs. "Ending positions" counts distinct markings with an outcome.

| File | States | Verbs | Arcs | Positions | Ending positions | Plays | Plays by outcome |
|------|-------:|------:|-----:|----------:|------------------|-------|------------------|
| `duel-first.maps` | 13 | 18 | 53 | 8 | takes a hit 1, lands a hit 1 | endless | n/a |
| `duel-revised.maps` | 13 | 16 | 46 | 7 | takes a hit 1, lands a hit 1 | endless | n/a |
| `duel-held.maps` | 14 | 19 | 56 | 9 | takes a hit 1, lands a hit 1 | endless | n/a |
| `stamina-souls.maps` | 15 | 18 | 53 | 25 | takes a hit 8, lands a hit 1 | endless | n/a |
| `stamina-hunter.maps` | 15 | 18 | 52 | 17 | takes a hit 3, lands a hit 2 | endless | n/a |
| `stamina-third.maps` | 15 | 18 | 53 | 23 | takes a hit 4, lands a hit 2 | endless | n/a |
| `call-the-coin.maps` | 8 | 8 | 20 | 4 | Caller loses 1, Caller wins 1 | 4 | wins 2, loses 2 |
| `tic-tac-toe.maps` | 35 | 37 | 177 | 5,478 | X 626, O 316, Draw 16 | 255,168 | X 131,184, O 77,904, Draw 46,080 |

Plays are `endless` for the duel and stamina files because Link can hold the shield and block forever, and the analysis does not count plays when a seat can repeat a position. Positions are finite, so the analysis is still complete.

## Crosscheck

From `studio/`, `npx tsx ../prototype/notation/corpus/crosscheck-duel.ts`. For every resting moment that duel.js's `explore` finds, the script builds the matching marking and checks three things against the engine. The engine must offer the same Link verbs. For each verb, the engine's settled results must be the same next moments (or the same outcome where duel.js scores a hit) with the same odds. The engine must reach no resting moment that duel.js lacks.

```
duel-first.maps: ok, same seat verbs, next moments, and odds. 6 duel.js resting moments, 21 seat options; engine reaches 6 of them before a hit ends play
duel-revised.maps: ok, same seat verbs, next moments, and odds. 5 duel.js resting moments, 16 seat options; engine reaches 5 of them before a hit ends play
duel-held.maps: ok, same seat verbs, next moments, and odds. 7 duel.js resting moments, 22 seat options; engine reaches 7 of them before a hit ends play
```

The check fails on a real defect. Setting the held swing to weight 2 gives 6 mismatches (0.5 against 0.6), and dropping `punish` to priority 1 gives 1 mismatch.

## Sharing

From `studio/`, `npx tsx ../prototype/notation/corpus/check-shared.ts`. For each subnet, every listed id must exist in every listed file, with the same speaker and priority, and the same arcs among the listed ids.

```
enemy clock: ok, 5 states, 3 verbs, 9 arcs identical in 6 files
the beat: ok, 3 states, 2 verbs, 4 arcs identical in 6 files
Link's stances: ok, 6 states, 6 verbs, 17 arcs identical in 6 files
contacts: ok, 8 states, 4 verbs, 13 arcs identical in 6 files
block that pushes Link back: ok, 3 states, 1 verbs, 3 arcs identical in 5 files
stamina recovery: ok, 2 states, 2 verbs, 4 arcs identical in 3 files
```

The check does not compare weights. `swing` has weight 3 in `duel-held.maps` and weight 1 elsewhere. The stamina files add arcs from shared verbs to `stamina` and `breath`, which are outside the stance, beat, and contact subnets.
