# Plan

## Done means

1. Every Petri net figure in Peterson (1981) is clipped to its own PNG, listed in `figures.json` with page, number, and caption. Non-net figures (tuples, trees, graphs, tables) are listed and marked as such.
2. Every net figure has a written analysis in `analysis/`: what the text says the net models, and how each placement choice shows that.
3. `RULES.md` states the placement rules. Each rule cites the figures it comes from.
4. `engine/` lays out a net given with no coordinates (places, transitions, arcs, marking, labels) and renders it in the book's style.
5. Tests: a corpus of the book's nets, transcribed as structure only, plus nets the rules never saw. A rule-conformance check per rule passes on every one. A blind critic, shown each output beside the book's drawing, judges each output on what its placement says.

Counts such as crossings are diagnostics, never targets.

## Phases

A. Extract: rasterize, OCR, clip, classify. Gate: I look at every clip.
B. Analyze: one figure at a time, with the book's text about it. Fan out by chapter.
C. Synthesize rules. Gate: each rule cites at least two figures, or is marked as single-source.
D. Transcribe a test corpus. Gate: each transcription is checked against its figure.
E. Engine, rule by rule, each rule with a conformance check.
F. Verify: render the corpus, critique, blind critic, iterate.
