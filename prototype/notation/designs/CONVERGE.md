# Converging the six designs

PROTOTYPE notes. Evidence is in `.verify-evidence/2026-10-23-bakeoff/` at the main repo root. It holds the harness report, the critic's review, two rounds of blind reads per design with graded answers, and the combined table.

## What the evidence says

| design | blind read, mean of 2 rounds | reader noise | critic as a picture | crossings, revised duel | shared parts drift / variant moves |
|---|---|---|---|---|---|
| score | **95%** | 0.5 | 1/5 as a net (3 as a table) | 0 | **≤60px / 0.5–2.8%** |
| spines | 92% | 2.5 | 3/5, g09 4/5 | 43 | 134–432px / 2–9% |
| noreturn | 91% | 6.5 | **3/5, ranked first** | 48 | up to 1310px / 4–31% |
| exchange | 89% | 3.5 | 1/5 | 32 | 233–654px / 7–15% |
| lanes | 85% | 5 | 2/5 | 33 | 155–391px / 11–19% |
| unfold | 84% | 1.5 | 2/5 | 33 | 49–671px / 3–6% |

How to read these numbers:

- **Two groups, not a ranking.** Score, spines, and noreturn (91 to 95%) separate from lanes and unfold (84 to 85%). Within the top group the gaps are smaller than one reader's noise, except score's steadiness.
- **The blind read only weakly separates designs.** Labels carry many answers. The generated nets reach the ceiling for almost every design, at 17.5 to 18 out of 18.
- **Where a reader has to trace arcs, routing decides the score.** Possibility questions scored 31/33 on score, 30 on spines, and 25.5 to 28.75 on the rest. Every reader of a routed design said crossing lines were where they guessed.
- **Failures shared by all six designs, from all twelve readers:**
  - No design shows the resting moments. No reader counted the stamina variants' 16 or 17.
  - Turn order is unclear: who speaks first, and in what order the world answers.
  - Marks are undefined on the page: the hollow circle, ×2, w2, an unlabeled count.
  - No reader called the risk-free refill a flaw.
- **Pretty and legible split.** The critic prefers noreturn and spines as pictures, and readers got the most from score. The user wants a net laid out like the dining philosophers figure, and it must also read. So the converged design has to win both.

## Verdict per element

Kept, with the evidence for each:

- **One straight line per state, with an entity's states together as one staff or spine.** Score, spines, and noreturn all grouped an entity's states. Readers answered entity questions best on score (8.25/9) and noreturn (8). This is #14's "an entity is always in a state".
- **Verbs as thin bars, speaker by color, world neutral.** All six designs used them, and every reader said who speaks was easy.
- **Arc ends.** Arrows for take and give, a dot for need, an open ring for unless. Readers learned the dot. The ring needs the key below.
- ~~Connections that never need tracing, zero crossings as the target.~~ **Retracted.** The user never asked for zero crossings, and the dining philosophers figure has crossings. A count is a diagnostic, never a goal. The goal is what each node's placement says, and that every route can be followed. The staffnet, spinenet, and philnet briefs inherited this wrong target.
- **Returns swept around the outside of a spine.** This is the critic's best idea in noreturn, and the dining philosophers idiom.
- **Coupling states between the spines they couple.** This is the critic's best idea in spines, and the dining philosophers idiom again.
- **World answers ordered by priority, highest first.** Exchange's axis. Readers of exchange answered "what resolves first" directly.

New, because every design failed on it:

- **A key** on the page, small and fixed, like a clef: what each mark means.
- **Turn order.** Mark who speaks first, and number the world's answers in the order they are tried.
- **An analysis layer that cites the drawing.** It prints the engine's facts beside the net: resting moments, outcomes, dead verbs, and "only good answer" or "same answer" flags on the verbs they concern. The precedent is the music research (#19). Analytic layers cite the score by address and end in a small fixed vocabulary.
- **Hubs.** A state that feeds many verbs, such as a beat, a turn, or the squares left, is drawn as a repeated copy beside each verb that uses it. This is fusion places in coloured Petri net practice (composing nets, #7). It replaces long fans, and every copy carries the same name.

Dropped:

- **Rotated labels** in score. The critic flagged them, and they are hard to read.
- **Orthogonal circuit routing** in unfold. The critic called it wiring boxes.
- **Crossing-minimizer horizontal order** in exchange and lanes. A small edit reshuffles everything, so comparing by shape fails.
- **Speaker as an axis** in lanes. It splits one entity's cycle across columns, so no spine is possible.
- **Time of first possibility as an axis** in unfold. Contact arcs stretch across the whole page.

## The two convergence candidates

Designed twice, because the open question is a real fork. Can a picture that looks like a Petri figure keep score's zero-tracing legibility?

- **`staffnet`** starts from score's geometry and makes it a net. Entities are horizontal staves of state lines, with a place circle at the head of each line. Verbs are thin bars in columns, and each arc is a short tick with a Petri arc end. Labels are horizontal. It adds the key, turn order, the analysis layer, and fusion copies for hubs.
- **`spinenet`** starts from noreturn and spines. Each entity is a straight spine with returns around the outside, and coupling states sit between spines. Every contact verb is placed in the gap beside the state it reads, so its arc is short. Hubs are fusion copies. It adds the key, turn order, and the analysis layer. The target is zero long arcs.

Both must pass the verify skill in full:
- the harness,
- my written critique of every screenshot,
- an independent critic,
- two rounds of blind reads with fresh readers,
- a napkin reproduction,
- ablation of every new element.

The user decides whether either is the notation.
