# Blind read

The book's test for MAPS is that a reader can "read the system instead of reverse-engineering it from play" and "read the structural difference on the page" (Enduring Games 11:73, 11:75). A blind read checks that proxy with a reader who has nothing but the image.

## Sub-features

- `read-single` answers designer questions about one drawing.
- `read-compare` names the structural difference between two drawings.
- `read-variants` ranks three variants and says why one differs.

## How to get to it (user POV)

- A designer who never saw the game, its code, or its author is handed the page.

## Driving it with a fresh subagent

Preconditions:

- Screenshots exist in `.verify-evidence/<run>/`.
- The question list and the engine's answers are written down before any reader sees an image.

- **Questions.** Write 5 to 10 questions a designer would ask. Examples: who speaks at each point; what the player can say while the enemy winds up; where the punish window is; which answer is always right; what one variant changed and what it does to the fight. Each answer must be checkable against the engine output.
- **Reader.** Spawn a new subagent that shares no context. Give it only the PNG paths and the questions. Forbid reading any file other than the PNGs.
- **Grade.** Compare each answer with the engine truth. Report k/n correct, quote each wrong answer, and keep the reader's full answers.
- **Compare designs.** Give every candidate design the same questions with a fresh reader each. Report the scores side by side.

## Gotchas

- A reader who saw an earlier design is primed. Use a new one for each design.
- Labels can carry the answer ("punish window" printed on the page). Ask at least one question that needs the structure, not a label.
- A high blind-read score is evidence the drawing transmits structure. It is not the user's verdict on whether it is the notation.
