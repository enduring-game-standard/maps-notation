# MAPS verification map

This directory is the maintained source for verifying MAPS work. Read the index before driving anything, then use the matching feature file as the recipe.

## Baseline preconditions

- Work from the repo root `/home/wscottsh/repos/egs/maps-notation`.
- `cd studio && npx vitest run` passes before any engine result is trusted.
- Every server you drive was started by this run, on a port you checked was free.
- Evidence goes to `.verify-evidence/<YYYY-MM-DD>-<topic>/`.

## Features

- [Studio canvas](studio-canvas.md) loads a `.maps` score, draws it, and lets a user fit, select, and play it.
- [Engine analysis](engine-analysis.md) parses, checks, and explores a score.
- [Drawing prototypes](drawing-prototypes.md) are throwaway HTML renderers of nets on `prototype/*` branches.
- [Convention invariants](convention-invariants.md) check that a renderer behaves like a notation, not a display.
- [Blind read](blind-read.md) has a fresh reader answer designer questions from the image alone.

## Proof and skip reporting

- Name the tier of every claim: mechanical, blind read, or human judgment.
- Keep each helper's JSON line with its screenshot.
- Report an unreachable path with the command tried and the precondition that failed.
- Never report human judgment ("it reads well", "it is coherent") as verified.
