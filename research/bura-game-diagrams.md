# Stéphane Bura's Game Diagrams (2006)

Research for [issue #4](https://github.com/enduring-game-standard/maps-notation/issues/4).

Primary source: Stéphane Bura, "A Game Grammar", dated March 2006. It first appeared at `http://users.skynet.be/bura/diagrams/`, the URL Raph Koster linked on 2006-03-30. It later moved to `http://www.stephanebura.com/diagrams/`, which now returns 404. This note is based on the Wayback Machine capture of 2007-10-23: <http://web.archive.org/web/20071023234729/http://stephanebura.com:80/diagrams/>. As far as I found, the article is the whole notation. Bura calls it "only a first step" and "an early stab".

## What bears on MAPS

- **Bura's "folding" is seat symmetry, not family folding.** He borrows the term from coloured Petri nets, where one copy of a symmetric process (client/server) stands for all of them. He then draws a symmetric game "as seen from the point of view of one of the players". The opponent appears only where resources move between players. In his words: "One needs as many diagrams as there are players to describe a game state. But you need only one to fully describe the process." In MAPS terms, this folds over **seats**, not over **squares**. Applied to tic-tac-toe it halves the net: 18 mark verbs become 9 and 16 line checks become 8. It does not turn "marks square 1..9" into one verb. SPEC.md's open folding problem is the square kind, so Bura answers a neighboring question, not that one.
- **He does touch family folding, through colored tokens.** He puts Preparation tokens of different "colors" in one box, and says "a more comprehensive diagram should have one preparation box for each color." That is coloured-net folding of a family of places into one place, the move SPEC.md's open problem names. Bura only states it in passing and never draws colored arcs or says how a transition selects a color. No worked example exists.
- **Layering: he draws strategy, not rules.** His diagrams describe *constituative* rules (Salen & Zimmerman), not *operational* ones. Checkers has no squares, pieces, or turns in his diagram. It has abstract resources: Moves, Kings, Preparation, Skill, Luck. He says mapping a diagram onto operational rules is "a mental block that has prevented game notations from flourishing". MAPS draws the operational level. Bura's work is evidence for a second, abstracted layer that sits above an executable net and is not a replacement for it.
- **He proposed an operational layer whose semantics match MAPS world verbs.** Discussing risk-free transitions, he suggests "a layer to the diagram for the operational rules. The transitions in that layer could link from and to all the boxes in the diagram, would have priority over those in the constituative rules layer, and trigger automatically when their inputs are valid." That is MAPS's world speaker: forced, prioritized, fires when enabled. He reached it as a layering idea, not a speaker idea.
- **Composition: sub-diagrams and ludemes, with sources and sinks as the interface.** Blackjack's hand play "can be described elsewhere, as a sub-game … The corresponding sub-diagram would have sources and sinks that represent tokens spent and generated in the main diagram." He also says "Such a sub-diagram isn't the detailed description of a transition. Here, for instance, it would describe both transitions at once." So a sub-diagram does not refine one transition hierarchically; it can stand for several. He names a reusable fragment a *ludeme* ("Decay of preparation in a skill-based game"), which he says belongs in every skill-based game diagram. His wish list includes "a library of ludemes with agreed upon inputs and outputs". This lines up with MAPS's open composition problem (fusing named states).
- **Comparability through abstraction.** One abstract diagram covers "most non-competitive casino games", with only link values and random laws changing between them. Skill, Luck, and Preparation recur across games. Comparing two games means comparing their abstract diagrams. Bura does not offer any computed comparison.
- **Layout carries meaning in a light way.** Boxes are drawn as open-top bins "to emphasize the downward flow of tokens". Flow runs top to bottom from sources to end states. Line thickness gives quantity (thin = small, thick = large), and color gives the owning player (blue = player, red = house or opponent). He gives no layout rules beyond these.
- **Limits, in his own words.** The grammar is "a simple descriptive tool instead of an analytical or even a design tool". Because the diagrams skip operational rules, "one cannot reverse-engineer changes to a game diagram to find corresponding changes in the game rules." Nothing in it can be executed: amounts are "thin" or "thick", and time is a continuous flow.

**Net for MAPS:** Bura gives no ready mechanism for the tic-tac-toe folding problem. He does give two folding ideas worth testing. (1) Fold over seats: draw one seat's half, with the other seat's states as a substitution. This is cheap for symmetric games and unfolds mechanically. (2) Fold over token color: one place holds a family. His stronger contribution is layering. He keeps an abstract strategic diagram (resources such as Skill and Preparation, feedback loops) separate from the operational net, and he notes that the operational layer is the prioritized, automatic one.

## The notation

Bura: "heavily influenced by my experience with Petri Nets and cybernetics. Non-standard Petri Nets (with colored tokens and inhibitors) can describe complex processes … A basic understanding of cybernetics also helps with managing the feedback loops that give structure to almost all balanced games." He adds that the diagrams "end up looking like flowcharts. However, they are not flowcharts of games or rules. They're closer to data-flow representations of processes."

Legend: <http://web.archive.org/web/2013/http://www.stephanebura.com/diagrams/elements.jpg>

| Element | Drawn as | Meaning (Bura) | MAPS counterpart |
|---|---|---|---|
| Resource box | open-top bin (any shape allowed; "Petri Nets use circles") | holds tokens | state |
| Token | (not drawn individually) | resource units, may be colored | mark |
| Atomic transition | gray bar with ruled ends | consumes from all inbound boxes, generates into all outbound boxes; can fire only if every inbound link's cost is paid. "transitions represent discrete game state changes caused by a player's choice" | verb |
| Link | arrow, box to transition or transition to box only; thin = few tokens, thick = many | flow amount | `take` / `give`, with qualitative counts |
| Source | upward triangle | "continuously generates tokens at a rate specified by its outbound link (number of tokens per time unit)"; may link straight to a transition | none (MAPS has no rate or time) |
| Sink | downward triangle | consumes tokens; "just an aesthetic element to avoid having transitions with no outbound links" | none |
| Inhibitor link | line ending in a circle, box to transition | "If the stated amount of tokens is consumed, the transition cannot be triggered during the same time unit." | close to `unless`; Bura phrases it as tokens "consumed" and scopes it to one time unit |
| "If empty" link | diamond at the box end | "generates its specified amount of tokens each time unit said box is empty"; used mostly for victory conditions and for "if empty then inhibit" | `unless` feeding a verb |
| Variable link | dotted line | amount changes each time unit by a function ("often a random law") or by events "outside the magic circle" | chance as weighted world verbs; nothing for outside events |
| End state | filled circle, inbound only | game ends when a link moves tokens into it; its nature gives the outcome | outcome state (`ends`) |

Semantics are informal. There is no firing rule beyond "enough tokens", and no conflict resolution. Time is a series of discrete "time units" in which sources emit, so the model is closer to a continuous flow than to a turn-based net.

### Feedback and control

Control is drawn with inhibitors: one player's Skill flow inhibits the other's transition. Feedback is drawn as loops through Preparation. In Checkers, Preparation feeds Promotion, which feeds Kings and Moves, which feed back into Preparation. In RPS, Preparation loops back into Bluff/Anticipation. The decay ludeme draws negative feedback as an Entropy source that drains Preparation. Bura names no loop types and does not analyze loops formally.

## Worked examples (archived diagram URLs)

All images: `http://web.archive.org/web/2013/http://www.stephanebura.com/diagrams/<name>.jpg`.

- **Legend**: `elements.jpg`. Basic transition: `transa.jpg`. Thin/thick: `thickthin.jpg`. Source and sink: `sourcesink.jpg`. If-empty-then-inhibit: `ifemptyinhibitor.jpg`.
- **Dice game** (`dicegame.jpg`). Player vs. house: roll a P-sided die each turn, reach the target in N turns. Bura's point: "The lonely transition indicates that there are no choices for the player to make." I did not get this image back from the archive.
- **Abstract Blackjack** (`blackjack.jpg`, viewed). Skill and Money for the player, Luck for the house. Gain and Risk transitions inhibit each other. Exit thresholds P and M are set by the player during play. There are no cards, hands, or turns. Bura notes the diagram is nearly symmetric between the two sides.
- **Folded Rock-Paper-Scissors** (`RPS.jpg`, viewed). One player's view. Skill feeds Bluff/Anticipation, which the opponent's Skill inhibits. Luck feeds a Luck transition, which the opponent's Luck inhibits. Both feed Preparation, which leads to "Player wins". The folded diagram includes **both** players' skill sources, because each player's skill also inhibits the other's bluff in the other's diagram: "there is a choice where to allocate the skill tokens." The revision `RPS2.jpg` (retrieved, not viewed) drops the opponent's Luck and replaces it with a thick variable link, under the stated convention that "both players can't be lucky at the same time".
- **Skill-based game** (`skillbased.jpg`) and the **Decay of preparation ludeme** (`decay.jpg`, viewed). The ludeme has Skill, Opponent's Skill, an Entropy source, Defense, Preparation, and a Bad Move transition that the opponent's skill inhibits. Its unnamed transitions are drawn `*`. Bura says it is "part of all diagrams for skill-based games (even non-symmetrical ones)".
- **Risk-free transition** (`riskfree.jpg`). Earns Preparation at no cost beyond time. A dotted inhibitor "clumsily represents" special availability conditions, which is where the operational-layer proposal above comes in. I did not get this image back from the archive.
- **Checkers, napkin version** (`napkincheckers.jpg`, viewed). Folded. The player has Kings, Moves, and Preparation (blue). The opponent's Moves and Kings (orange/red) appear only where captures drain them. "Player wins" hangs off an if-empty link on the opponent's Moves box. The transitions are Promotion, King move, Sacrifice, Default, King capture, and Capture. Bura reads an exploit straight off the diagram: a king move costs no Moves tokens but earns Preparation, so it is nearly risk-free. Captures and the repetition rule counter it, and the repetition rule is "not represented in the diagram".

## What a flat Petri net hides that Bura shows

The issue asks this question. Bura answers it as abstraction, not as notation. His diagrams show resource economies of skill, luck, and preparation: who can inhibit whom, where feedback loops close, and which actions are cheap (exploits, risk-free moves). An operational net would bury all of this under movement and capture rules. The price is that his diagrams cannot be executed, and they cannot be traced back to the rules. Folding by seat also makes the symmetry itself visible: one diagram shows that the process is the same for every player.

## Context

- Bura wrote it as a response to Raph Koster's GDC 2005 talk "A Grammar of Gameplay" (<http://theoryoffun.com/grammar/gdc2005.htm>). It adopts Koster's ingredients (Preparation and others) and his "napkin" goal.
- Koster's post, 2006-03-30: <https://www.raphkoster.com/?p=416>. In the comments, Bura says resource boxes are "the potential covalent bonds" and that "In some of the examples, they're already shared between several sub-graphs". So shared boxes are his composition point, which matches MAPS's fusion idea. Jim Whitehead's comment points out the similarity to Petri nets.

## Not verified

- I did not see the original `users.skynet.be` copy. Wayback CDX queries for that host returned nothing, then the connection failed. The 2007 `stephanebura.com` capture may differ from the March 2006 text.
- I viewed only `elements.jpg`, `RPS.jpg`, `napkincheckers.jpg`, `decay.jpg`, and `blackjack.jpg`. I did not view the others, and `dicegame.jpg` and `riskfree.jpg` did not come back from the archive. Descriptions of those come from the article text only.
- I found no later Bura writing that revises the notation or works out colored-token folding. Bura mentions a reply on "Grouchy Gnome's" site, which I did not trace. Searches turned up no follow-up, but that does not prove there is none.
- I did not verify any lineage from Bura to Dormans's Machinations, whose resource-flow vocabulary looks similar. Dormans's 2011 AIIDE paper, "Simulating Mechanics to Study Emergence in Games", does not cite Bura.
