# Studio canvas

The Studio is the repo's editor for MAPS scores. A user opens a score, sees it drawn on the canvas, fits it to the screen, selects nodes, and plays it.

## Sub-features

- `canvas-load` restores the last score from local storage, or loads an example from the menu.
- `canvas-fit` fits the drawing to the stage.
- `canvas-select` selects a node and shows it in the inspector.
- `canvas-play` plays the score in the Play mode tab.

## How to get to it (user POV)

- Open `http://21.0.0.3:<port>/` from the user's Chrome.
- Choose an example from the menu's `Examples` list.
- Use the **Fit** button in the zoom controls.

## Driving it with scripts/studio.mjs

Preconditions:

- Studio is running on a port this run started, per the skill's Launch section, on a free `$PORT`.

- **Load and draw.** Run `STUDIO_URL=http://127.0.0.1:$PORT/ node .claude/skills/verify/scripts/studio.mjs examples/call-the-coin.maps .verify-evidence/<run>/coin.png`. The JSON shows `title` `"Call the coin"`, `nodes` 16, and empty `errors`.
- **Cross-check.** Run the engine helper on the same file. Its `states + verbs` equals `nodes`.
- **Phone layout.** Run `STUDIO_URL=http://127.0.0.1:$PORT/ node studio/e2e/phone.mjs .verify-evidence/<run>/phone`. It prints PASS or FAIL lines for the touch flows.

## Gotchas

- The Studio restores whatever is in `maps-studio:net`. A stale score from an earlier run will draw instead of yours unless the helper overwrites it, which it does.
- Positions come from the `at x y` coordinates in the `.maps` text. The Studio does not lay out a score by convention. It draws where the text says.
- A very large score, such as the Ocarina atlas, exceeds the storage quota and does not persist across reloads.
