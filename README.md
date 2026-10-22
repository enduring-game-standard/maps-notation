# MAPS: Mechanics and Play Structures

🏠 **[EGS Overview](https://github.com/enduring-game-standard)** · 📦 **[AEMS](https://github.com/enduring-game-standard/aems-schema)** · 🎯 **[AEMS Conventions](https://github.com/enduring-game-standard/aems-conventions)** · 🔧 **[RUNS](https://github.com/enduring-game-standard/runs-spec)** · 📖 **[RUNS Library](https://github.com/enduring-game-standard/runs-library)** · ⚡ **[WOCS](https://github.com/enduring-game-standard/wocs-protocol)** · 🎼 **[MAPS](https://github.com/enduring-game-standard/maps-notation)** · 🎶 **[MAPS Library](https://github.com/enduring-game-standard/maps-library)** · ❓ **[FAQ](https://github.com/enduring-game-standard/.github/blob/main/profile/FAQ.md)** · 🔤 **[Glossary](https://github.com/enduring-game-standard/.github/blob/main/profile/README.md#glossary)**

> Status: draft. Version: `maps 2`.

A game is a conversation. A player acts, the game answers by its rules, and the answer changes what the player can do next. MAPS is a way to draw that conversation so another designer can read it, play it, and build on it.

Music could not build a tradition until Guido d'Arezzo put pitch on a staff. A monk could then learn a chant composed a thousand miles away without hearing it sung. Game design has no staff yet. Its knowledge lives in the heads of designers and inside closed code, and it scatters when a studio closes. MAPS is an attempt at the staff.

A MAPS design is a Petri net with one addition: every action names who says it, a player or the world. Circles are states that hold marks. Boxes are verbs. Arcs show what a verb takes, gives, needs, or is blocked by. The world answers first, in priority order, with chance where its answers tie. When the world falls silent, the players choose. The [specification](SPEC.md) gives the full rules on one page.

MAPS describes what a game is, not how a program runs it. [RUNS](https://github.com/enduring-game-standard/runs-spec) runs games. A MAPS design tells a RUNS author what state exists, what each rule reads and writes, which order the rules resolve in, where chance enters, and when the game ends.

## Try it

```sh
cd studio
npm install
npm run dev
```

The studio opens tic-tac-toe. Switch to Play and take X's turn. Switch the viewer to a seat to see what that player sees. Press Analyze to play every game out at once: the studio reports 5,478 positions, 958 endings, and 255,168 distinct games, which are tic-tac-toe's known counts.

`npm test` in `studio/` runs the same check.

## Files

- [SPEC.md](SPEC.md) is the notation: the model, the conversation rules, the text form, and what tic-tac-toe taught.
- [GAME_ABSTRACTION_LEVELS.md](GAME_ABSTRACTION_LEVELS.md) states MAPS among five levels of game description, from the running performance to structural identity.
- [examples/tic-tac-toe.maps](examples/tic-tac-toe.maps) is a complete game, written by `studio/tools/gen-tictactoe.ts`.
- `studio/src/core/` is the reference implementation: parser and printer, the conversation engine, the checker, and the analysis.
- `studio/src/ui/` is the design tool.

MIT License.
