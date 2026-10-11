# MAPS 2 specification

> Status: draft. Version: `maps 2`. File extension: `.maps`.

MAPS writes down a game's design as a picture you can read, play, and check. The picture is a Petri net. Petri named his 1962 thesis *Kommunikation mit Automaten*, communication with automata, and MAPS reads every net the same way, as Chris Crawford's conversation between players and a world. A player speaks with an action. The world listens, thinks, and answers by its rules. The answer changes what each player can say next.

MAPS describes what a game is. It does not describe how a program runs it. RUNS owns execution. A MAPS design has value on its own, the way a score has value before anyone plays it: you can study it, compare it with another design, fork it, and play it by hand.

The diagram is the design. The `.maps` text is a faithful, diffable copy of the diagram, including where each node sits on the page, so that a design can travel as plain text and come back as the same picture.

## The model

A MAPS design is a net with these parts.

| Part | Drawn as | Meaning |
|------|----------|---------|
| Seat | a color | A decision-making role: X, O, the dealer's opponent, player 2. A seat is a role, never a person. |
| World | gray | The rules themselves. The world is the other side of every conversation. |
| Place | circle | Somewhere marks can be. "X to move", "square 5 empty", "cards in Ann's hand", "gold". |
| Mark | dot inside a circle | One token in a place. A place holds a whole number of marks, zero or more. |
| Verb | rounded box in its speaker's color | Something that can be said: a seat's action or a world's response. Every verb names its speaker. |
| Arc | line between a place and a verb | How a verb depends on or changes a place. Arcs never join two places or two verbs. |
| Group | soft labeled outline | A named region of the page, such as "the board" or "the judge". Groups only organize the drawing. |

### Arcs

An arc always joins one place and one verb. Its kind fixes its direction, so a net that breaks the place-verb alternation cannot be written.

| Kind | Drawn as | The verb can be said when | Saying it |
|------|----------|---------------------------|-----------|
| `take n` | arrow from place to verb | the place holds at least n marks | removes n marks |
| `give n` | arrow from verb to place | always | adds n marks |
| `need n` | line from place to verb, ending in a small dot | the place holds at least n marks | changes nothing there |
| `unless n` | line from place to verb, ending in a small ring | the place holds fewer than n marks | changes nothing there |

The count `n` defaults to 1. `unless` with the default count reads "unless this place has a mark", the inhibitor arc of Petri net practice. Every condition a verb depends on is a drawn arc. MAPS has no guard expressions, because a guard that names a value off the page hides a dependency the picture should show.

### Verbs and speakers

A verb's speaker is a seat or `world`.

- A seat's verb is a choice. When it is possible, the seat may say it.
- A world verb is a consequence. When it is possible, the world must say it.

World verbs carry two more numbers. `priority` orders the world's responses, and the highest wins. `weight` sets the odds when several world verbs of the same priority are possible at once. That tie is chance. A die roll is a set of world verbs at one priority, weighted by how often each face comes up.

### Outcomes

A place with `ends "text"` is an outcome. When any outcome place holds a mark, the game is over, nobody speaks again, and the text names the result: "X wins", "Draw".

### Hidden information

A place is seen by everyone unless it says `seen-by` and lists seats. `seen-by none` hides it from every seat. A seat that cannot see a place sees that it exists but not its marks.

Revealing information is moving a mark. A card flips face up when a verb takes it from a private place and gives it to a public one. MAPS needs no rules about visibility changing, because places never change who sees them.

A seat acts blind when one of its own verbs depends on a place it cannot see. The seat can try the verb, but it cannot know beforehand whether the verb is possible. Bluffing and guessing games live here.

## The conversation

These rules decide who may speak. They are the whole meaning of a net.

1. Start with each place holding its starting marks.
2. If an outcome place holds a mark, the conversation is over.
3. If any world verb is possible, the world speaks. Take the possible world verbs with the highest priority. If there is one, say it. If there are several, chance picks one, each in proportion to its weight. Saying a verb applies its arcs. Go to step 2.
4. The world is silent. Every seat with a possible verb may choose one of them. Saying a verb applies its arcs. Go to step 2.
5. If no world verb and no seat verb is possible and no outcome holds a mark, the conversation stalls. A stall in a finished design is almost always a missing rule.

Turn order is not a separate concept. It is a mark in a place such as "X to move", and the seat's verbs take it. A real-time game or a game of simultaneous moves is a net where more than one seat can speak at the same moment. Step 4 allows that.

A transcript is the list of what was said, in order: the speaker, the verb, and the odds for a chance result. A transcript is to a MAPS design what a recorded chess game is to the rules of chess.

## The text form

A `.maps` file starts with the line `maps 2`. After that, each line is one statement. A `#` that starts a word begins a comment that runs to the end of the line. Names use lowercase letters, digits, and `_`, and start with a letter. Labels are in double quotes.

```maps
maps 2
title "Tic-Tac-Toe"

seat x "X" color "#e4572e"
seat o "O" color "#2e86ab"
group turn "Whose turn"
group board "The board"
group judge "The judge"

place x_to_move "X to move" marks 1 in turn at 120 260
place squares_left "Squares left" marks 9 in turn at 120 400
place empty_5 "5 empty" marks 1 in board at 560 355
place x_5 "X on 5" in board at 505 450
place judge_x "Judge X's move" in judge at 1080 260
place x_won "X wins" ends "X wins" in judge at 1360 260

verb x_marks_5 "X marks 5" by x in board at 505 395
  take x_to_move
  take empty_5
  take squares_left
  give x_5
  give judge_x

verb x_line_456 "X has 4-5-6" by world priority 2 in judge at 1220 65
  need x_4
  need x_5
  need x_6
  take judge_x
  give x_won
```

| Statement | Attributes, all optional, in any order |
|-----------|----------------------------------------|
| `title "text"` | |
| `seat name "label"` | `color "#rrggbb"` |
| `group name "label"` | |
| `place name "label"` | `marks n`, `seen-by all` or `seen-by none` or `seen-by a,b`, `ends "text"`, `in group`, `at x y` |
| `verb name "label"` | `by seat-or-world` (default `world`), `priority n`, `weight n`, `in group`, `at x y` |
| `  take n place` | an indented arc belongs to the verb above it; `n` is optional |

The reference implementation is `studio/src/core/text.ts`. Printing a parsed file gives back the same file.

## What the checker reports

A design tool must report these structural problems.

- A name used twice, or a seat named `world`.
- A verb spoken by a seat that does not exist, or an arc to a place that does not exist.
- Two identical arcs on one verb. Use a count instead.
- A verb with no inputs. It is always possible, and a world verb with no inputs never lets the world fall silent.
- Priority or weight on a seat's verb. They only order the world.

A design tool should also play the whole conversation out and report what it finds: how many positions are reachable, how many end in each outcome, how many distinct complete plays exist, where the conversation stalls, which verbs can never be said, and which places grow without limit. `studio/src/core/analyze.ts` does this.

## Worked example: tic-tac-toe

`examples/tic-tac-toe.maps` is tic-tac-toe in MAPS. `studio/tools/gen-tictactoe.ts` writes it. The net has 35 places and 37 verbs:

- 27 board places, one each for "empty", "X on", and "O on" per square, plus "X to move", "O to move", and a counter "squares left" that starts at 9;
- 18 seat verbs, "X marks 5" and the like, each taking the turn, the empty square, and one square left, then giving the mark and a mark in "judge X's move";
- 16 world verbs at priority 2, one per line per seat, that need three marks in a row and end the game;
- 1 world verb at priority 1, "board full", that fires unless any square is left and ends the game in a draw;
- 2 world verbs at priority 0 that pass the turn.

Playing every conversation out reaches 5,478 positions, 958 of them endings (X wins 626, O wins 316, draws 16), across 255,168 distinct games. Those are tic-tac-toe's known counts, and `studio/src/core/tictactoe.test.ts` checks them on every run.

Writing tic-tac-toe exposed five things that MAPS 1 could not say or did not notice.

1. **The world's answers need an order.** Completing a line must end the game before the turn passes. With every world verb at one priority, the judge and the turn-passer race, and the net reaches 7,046 positions and 577,440 games, with play continuing after a win. Priority fixes it, and analysis shows the difference.
2. **A draw is a test for absence.** "The board is full" is the absence of empty squares, an `unless` arc on the counter. Leave the draw rule out and the analysis reports 16 stalled positions, which are the 16 draws with no rule to end them.
3. **The world's thinking deserves a place.** The "judge X's move" place sits between X speaking and O's turn. It is where the world listens and decides, and it makes Crawford's listen, think, and speak loop visible on the page. It also gives RUNS an explicit point where order matters.
4. **One idea is written many times.** "A seat marks an empty square" is written 18 times, and "three in a row wins" is written 16 times. MAPS needs a way to fold repeated structure into one verb over a family of places. This is open; see below.
5. **Shared places tangle the drawing.** "X to move" connects to 9 verbs. On paper that is a thicket of arcs. The studio fades every arc that does not touch the node under the cursor, so a dense net stays readable on screen.

## What MAPS hands to RUNS

RUNS runs games. Its working implementation runs rules in a declared sequence, passes every value between rules through a Record, and treats order as part of gameplay. A MAPS design gives a RUNS author these things and leaves the rest to them.

| MAPS | What RUNS receives |
|------|--------------------|
| Places and their starting marks | Named state with known initial values and, after analysis, known bounds |
| Each verb's `take`, `need`, and `unless` arcs | The verb's read set and its preconditions |
| Each verb's `take` and `give` arcs | The verb's write set |
| Seat verbs | The boundary inputs: the moments the game waits for a player |
| World verb priority | The order RUNS must respect when several rules could apply |
| World verbs tied at one priority, with weights | The places RUNS must draw from a random source, and the odds |
| Outcome places | The halting conditions and the result each one reports |
| `seen-by` | What each player's view may show |

RUNS chooses number representations, data layout, timing, rendering, and input devices. MAPS has no opinion about them. Two RUNS games built from one MAPS design should produce the same transcripts for the same choices and chance results. That is the test that a RUNS game implements a MAPS design.

## Changes from MAPS 1

MAPS 1 described itself as a Petri net but did not behave like one. MAPS 2 starts again from the intent.

- **Speakers.** MAPS 1 marked choice on arcs (`=>` against `->`) and never said which agent was choosing. Two arcs into one verb could disagree. MAPS 2 gives every verb one speaker.
- **Places instead of states.** MAPS 1 states held named counters (`fuel = 8192, ammo = 33`), and guards read those names off the page. A MAPS 2 place holds marks and nothing else, and every dependency is a drawn arc. "State" also means something else in AEMS, so MAPS no longer uses the word.
- **No guard language.** Thresholds are arc counts. Absence is an `unless` arc. Derived values are places some verb fills.
- **Chance is design.** MAPS 1 excluded randomness and then added probability weights to arcs. In MAPS 2 chance is the world choosing among tied responses, and the odds are part of the design.
- **Hidden information is per place.** Revealing is moving a mark, so no visibility rules change during play.
- **Play is in scope.** MAPS 1 excluded play state. A notation is learned by playing it, so MAPS 2 defines the conversation rules precisely and treats transcripts as part of the notation.
- **The diagram is primary.** MAPS 1 called diagrams derived and non-authoritative. MAPS 2 stores the layout in the text, and the studio is the main way to write a design.

## Open problems

- **Folding.** Tic-tac-toe shows the need to write "a seat marks an empty square" once for all nine squares. Coloured Petri nets solve this with typed marks. MAPS needs the smallest version of that idea a designer can draw by hand, and the analysis must still unfold it.
- **Composition.** Designs should reuse mechanics from other designs by fusing named places, so a lock-and-key mechanic can be published once and used in many games. The text form needs a way to import a design and bind its places.
- **Publishing.** Each design should be a signed Nostr event. The provisional kind `30040` that MAPS 1 named collides with an existing Nostr specification (NKBIP-01), so MAPS needs a different kind.
- **Time.** Real-time games are nets where several seats can speak at once. Whether MAPS needs durations or rates beyond that is undecided.
- **Strategic analysis.** Feedback loops, choice density, and structural comparison between two games can be computed from the reachability graph. The analysis does not compute them yet.
