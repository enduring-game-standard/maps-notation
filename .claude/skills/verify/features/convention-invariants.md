# Convention invariants

A notation draws by rule, so anyone drawing the same text gets the same shape and the shape carries the meaning. These checks separate a convention from a display.

## Sub-features

- `inv-deterministic` means the same text gives the same geometry.
- `inv-name-blind` means renaming ids and labels changes no geometry.
- `inv-same-structure` means an identical subnet draws identically wherever it appears.
- `inv-local-delta` means a one-arc change between variants stays local in the drawing.

## How to get to it (user POV)

- A designer redraws a colleague's score by hand from its text and gets the same picture.
- A designer sees one familiar shape in two different games' scores.

## Driving it with a renderer's layout(net)

Preconditions:

- The renderer exposes a pure `layout(net)` that returns node positions and arc routes. A renderer without one cannot be checked, and that is a finding in itself.

- **Deterministic.** Lay out the same net twice. Positions and routes are deep-equal.
- **Name-blind.** Relabel every id with a fixed permutation, lay it out, and map it back. Deep-equal to the original.
- **Same structure.** Build two nets that share one subnet. Normalize that subnet's positions by translation in each. Deep-equal.
- **Local delta.** Lay out a base and a one-arc variant. Report how many nodes moved and how far. A convention keeps that number small. Record the number; there is no fixed threshold yet.

## Gotchas

- Pixel-identical screenshots can hide different geometry under identical labels. Compare layout output, not only PNGs.
- An annealer or optimizer with a seed passes determinism but usually fails name-blindness and local delta. That is expected and is the point of the check.
