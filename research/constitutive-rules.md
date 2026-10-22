# Constitutive rules, at the source

Research for issue #15. It feeds issue #14, "A coherent design for the notation".

Question: What exactly do Salen & Zimmerman (constitutive, operational, and implicit rules), Parlett (foundational rules), and Juul (*Half-Real*) define, in their own words? Does `GAME_ABSTRACTION_LEVELS.md` (GAL) represent them faithfully? Which of their distinctions bear on what MAPS draws and how it layers?

## Summary: what bears on MAPS's coherent design

1. **MAPS's anchored core is the constituative layer, and the sources support it.** Salen & Zimmerman (S&Z) define constituative rules as the abstract logic beneath the instructions, and they illustrate them with Tic-Tac-Toe, which shares its logic with 3-to-15. For digital games, they limit constituative rules to *internal events*, the processing of a choice. They exclude *external events*, the representation of a choice (pp. 130, 146–147). This matches MAPS 2's split, in which "RUNS chooses ... rendering, and input devices" (SPEC.md).
2. **Operational rules are a second, many-to-one layer.** S&Z say "the same set of constituative rules can be expressed in many different operational forms" (p. 133). For digital games, they put input devices and on-screen feedback in the operational layer (p. 147). For Link's moveset, this means button mapping, context prompts, and sound or visual cues are operational. They belong in a separate layer above the net, not inside the net. One MAPS core can then sit under several control schemes.
3. **Representation counts only when it is a game event.** S&Z (pp. 144–147) say a visual or audio element is part of the rules only when it communicates a formal game event or carries information, as with Thief's shadows or sprite size in Berzerk. This gives the "look" layer a test. Look is free styling, except where it carries a `seen-by` or hidden-information fact. Those facts are already in MAPS's model.
4. **Formal identity is not constituative alone.** S&Z's summary says formal identity "emerges from the relationship between the game's constituative rules and operational rules" (p. 139). GAL Level 5 places structural identity on the Level 3 graph alone. This is a real tension for "comparable at a glance". Comparing nets compares constituative cores, which is S&Z's 3-to-15 sense of "same game". The S&Z notion of identity also needs the operational layer. Juul gives the matching criterion: an *implementation* has "an unambiguous correspondence between the possible game states", and an *adaptation* does not (Half-Real p. 51 snippet; 2003 paper).
5. **Juul's vocabulary is state machine and game tree, not "state engine".** Half-Real p. 60 says the rules "provide a *state machine*", and that the game tree "visualizes the dynamic possibilities of a game as a map that players travel through". His emergence/progression split comes from his 2002 paper. Emergence means few rules combine into a large game tree. Progression means challenges presented one after another, as in a walkthrough. Link's moveset is an emergence-type structure inside a progression game. MAPS could show this as the moveset net versus the gating of states and verbs that the dungeons unlock.
6. **Feedback loops sit inside S&Z's Rules unit.** "Games as Cybernetic Systems" (pp. 214–227) appears under "Unit 2: RULES". S&Z do not set feedback apart as a level above the constituative rules. GAL's Level 4 split is a MAPS move, not an S&Z one.

## GAL fidelity check

| GAL claim | Verdict | Evidence |
|---|---|---|
| S&Z constitutive rules are "The underlying formal structures that exist 'below the surface' of the rules presented to players. These formal structures are logical and mathematical." | **Accurate quote, wrong spelling.** S&Z spell it *constituative* throughout. | RoP p. 130 (viewed). |
| S&Z taxonomy is constitutive / operational / implicit | Accurate | RoP pp. 130, 139. |
| "David Parlett (1999), who called them 'foundational rules'" | **Wrong source and date.** Parlett coined "foundational rules" in a 2005 paper, in reply to S&Z, as a replacement for their word. I could not verify that *The Oxford History of Board Games* (1999) uses the term. | Parlett, "Rules OK" (2005). |
| Parlett's foundational rules are "the mathematical state machine beneath the operational rules" | **Paraphrase, not Parlett's words.** He says "the deep, underlying mathematical rules". He also classes them as *implicit* ("unconsciously known"), which conflicts with S&Z's use of *implicit* for etiquette. | Parlett 2005. |
| Juul defined games as "state engines" | **Wrong term.** Juul says "state machine". The search for "state engine" in Half-Real returned no results. | Half-Real p. 60 (viewed), Google Books search. |
| Juul's rules are "algorithmic, decontextualized" | **Roughly right.** Juul ties rules to Knuth's features of an algorithm and says that what can be a rule "hinges on a decontextualization". | Half-Real pp. 62–63 (snippets only). |
| Juul's "possibility space is the set of all actions available to the player at any given moment" | **Not supported.** Juul uses "possibility space" in passing, about The Hobbit (pp. 69, 71, snippets). His moment-to-moment concept is the game state in the game tree. The defined term "space of possibility" belongs to S&Z and is broader: "the space of all possible actions that might take place in a game, the space of all possible meanings" (RoP p. 67). | Half-Real snippets; RoP p. 67 (viewed). |
| Juul "defines ... the distinction between emergence and progression" | Accurate. First published in 2002 and reused in Half-Real ch. 3 (pp. 67–75). | Juul 2002; Half-Real snippets. |
| S&Z "never distinguished between the mechanical structure (states and transitions) and the strategic topology (feedback loops)" | **Half-true.** S&Z do treat feedback loops, but as another lens on rules within Unit 2, not as a separate level. | RoP p. 216 (viewed). |
| Level 3 is labeled "(Salen / MAPS)", and two implementations of the same game "have the same Level 3 graph" | Consistent with S&Z's 3-to-15 argument and with Juul's implementation criterion. Juul's *adaptation* case, where states are lost, is the exception that GAL does not name. | RoP p. 133; Juul 2003. |

## Detail and citations

### Salen & Zimmerman, *Rules of Play* (MIT Press, 2004)

Source: the publisher-permitted Google Books preview (id `UM-xyczrZuQC`, "Pages displayed by permission of MIT Press"). I read the page images for pp. 67, 130, 132–133, 136–139, 143–147, and 216. Pages 134–135 and 141–142 are not in the preview.

The three definitions, quoted directly from p. 130 (Chapter 12, "Rules on Three Levels"):

- Operational: "Operational rules are the 'rules of play' of a game. They are what we normally think of as rules: the guidelines players require in order to play."
- Constituative: "The constituative rules of a game are the underlying formal structures that exist 'below the surface' of the rules presented to players. These formal structures are logical and mathematical. In the case of Tic-Tac-Toe, the constituative rules are the underlying mathematical logic that Tic-Tac-Toe shares with the game 3-to-15."
- Implicit: "Implicit rules are the 'unwritten rules' of a game. These rules concern etiquette, good sportsmanship, and other implied rules of proper game behavior."

On how the layers relate, quoted directly:

- "Constituative rules are sets of logical relationships that are not necessarily embodied in a material form or in a set of behavioral guidelines for the player." (p. 132)
- They restate Chutes and Ladders as four number rules, then ask: "Is there a one-to-one relationship?" (p. 132). Their answer: "There is not, therefore, an intrinsic relationship between a game's operational and constituative rules. The same set of constituative rules can be expressed in many different operational forms." (p. 133)
- "The operational rules are not merely an expression of the constituative rules of a game. The relationship is more of a two-way street." (p. 136)
- From the chapter summary: "The formal identity of a game allows us to distinguish a game as formally unique and distinct from other games. This identity emerges from the relationship between the game's constituative rules and operational rules." (p. 139)

My paraphrase of p. 137 ("Designing Elegant Rules"): the board in Chutes and Ladders does two operational jobs at once. It tracks the score and shows each jump. That makes the outcome of an action easy to see and understand. The operational form is a design choice about legibility, made on top of a fixed constituative core. A MAPS drawing makes the same kind of choice.

Chapter 13, "The Rules of Digital Games", quoted directly:

- "The elements of the game code that address these concerns help construct the rules of a digital game ... The parts of the code that manage the use of memory storage, for instance, do not directly involve the player and are not part of the core 'rules of the game.'" (p. 143)
- They "hesitate to apply the three-part model of rules directly to the actual functioning of a computer program". The model is "a conceptual framework". (p. 146)
- "Constituative rules are concerned only with the internal functioning of the game logic. ... constituative rules are concerned with internal events (events related to the processing of a choice) and not with external events (events relating to the representation of a choice)." (p. 147)
- "The operational rules of a digital game ... include the use of input devices such as the mouse and keyboard or a game controller." (p. 147)
- "because the voice audio communicates a formal game event to the player, it is part of the operational rules." (p. 147)

My paraphrase of pp. 144–145 ("Rules and Not Rules", "Wheels Within Wheels"): visual and audio code is not part of the rules unless it affects the formal structure. Examples are sprite size in Berzerk and the shadow and visibility rules in Thief, which separate private from public information. Menus, options screens, and "game over" screens can also count as rules, depending on how the designer frames the game.

Space of possibility, quoted directly from p. 67: "We call the space of future action implied by a game design the *space of possibility*. It is the space of all possible actions that might take place in a game, the space of all possible meanings that can emerge from a game design."

Feedback loops: p. 216 carries the running head "Unit 2: RULES | Games as Cybernetic Systems". Search hits for that chapter title span pp. 214–227.

### Parlett, "Rules OK, or: Hoyle on troubled waters" (2005)

Source: the author's own site, https://www.parlettgames.uk/gamester/rulesOK.html. The page describes it as "A paper presented at the 8th annual colloquium of the Board Game Studies Association, Oxford, 2005".

- Parlett takes the term "operational rules" from S&Z ("Following Salen and Zimmerman, I refer to these as the operational rules"). He defines them as "what you apply to the hardware of gaming equipment to produce an instance of play".
- On implicit rules: "there are also at least two types of rules that are unconsciously known or implicit. I'll call these respectively (a) foundational rules and (b) behavioural rules". His diagram is "Foundational rules > operational rules < behavioural rules", with equipment and play below.
- On the term itself: S&Z "describe these as the deep, underlying mathematical rules shorn of any reference to a board, dice, counters, or snakes, ladders ... Salen and Zimmerman call these the constituative rules; but no such word appears in the Oxford English Dictionary, and I think a more sensible term is foundational rules."
- His conclusion also adds "Laws" (sanction and correction), "advisory rules (rules of strategy)", and feedback that keeps modifying the operational rules.
- My note: Parlett's "advisory rules", the rules of strategy, are the nearest source concept to GAL's Level 4.
- He says the essay is based on the rules chapter of *The Oxford Guide to Card Games* (1990, p. 48), and that S&Z quote that chapter on p. 134. I could not view p. 134.

Not verified: I found no evidence that *The Oxford History of Board Games* (1999) uses "foundational rules". I could not search that book's text. GAL's bibliography entry for it describes the book in general terms and does not cite a page.

### Juul, *Half-Real* (MIT Press, 2005; Google Books id `pyo3AgAAQBAJ`, the 2011 paperback)

Source: the publisher preview. I viewed p. 60 as a page image. The other quotes below are Google Books search snippets. They are the publisher's text, but I could not see them in page context.

- Quoted from p. 60 (viewed): "To borrow from computer science, the rules of a game provide a *state machine*. Briefly stated, a state machine is a machine that has an *initial state*, accepts a specific amount of *input events*, changes state in response to inputs using a *state transition function* (i.e., rules), and produces outputs using an *output function*."
- Also from p. 60: "We can visualize the state machine of the game as a *game tree* ... the game tree is most useful as a way of understanding the large number of possibilities that a few simple rules can establish". The game tree "visualizes the dynamic possibilities of a game as a map that players travel through".
- p. 56 (snippet): "To play a game is to interact with the state machine and to explore the game tree."
- p. 51 (snippet): the difference between "an implementation and an adaptation concerns whether there is an unambiguous correspondence between the possible game states in the two game versions. Nevertheless, two games that appear completely unrelated can turn out to be equivalent".
- p. 63 (snippet): "what can qualify as an algorithm—and therefore what can be made a rule in a game—hinges on a decontextualization".
- p. 83 (snippet): "the gameplay is not the rules themselves".
- p. 73 (snippet): emergence is "a large number of game variations that the players deal with by designing strategies".
- Searches for "state engine" and "constitutive" in Half-Real returned no results.

### Juul's papers, from the author's site

- "The Open and the Closed: Games of Emergence and Games of Progression" (2002), https://www.jesperjuul.net/text/openandtheclosed.html. Quoted directly: "emergence (a number of simple rules combining to form interesting variation) and that of progression (separate challenges presented serially)". Also: "Progression games have walkthroughs". He splits emergence into rule interaction, combination ("The variety of possible states and game sessions that a game's rules allow"), and emergent strategies.
- "The Game, the Player, the World" (2003), https://www.jesperjuul.net/text/gameplayerworld/. Quoted directly: "Card games on computers should be considered implementations since it is possible to unambiguously map one-to-one correspondences between all the possible game states ... Sports games on computers are better described as adaptations". He also says game media support games through "Computation", "Game state", and "Interface".

## What I could not verify

- *Rules of Play* pp. 134–135 and 141–142, where Parlett may be cited.
- *Half-Real* pages other than p. 60 in full page context.
- Any use of "foundational" in Parlett's 1999 *Oxford History of Board Games*.
- Whether the 2004 first printing of *Rules of Play* has the same pagination as the Google Books edition. Parlett cites pp. 118–139 for the rules chapters, which is consistent with it.
