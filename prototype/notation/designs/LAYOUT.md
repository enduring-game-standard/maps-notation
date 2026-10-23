# What placement says in the reference figures

PROTOTYPE notes. The source is Chen, Fang and Chang, "Neural simulation of Petri nets" (1999), figures 3, 4 and 6, as shown on ResearchGate. I studied figure 6, the user's dining philosophers reference, and two simpler figures from the same paper. No count is a goal here. Each principle says what a reader learns from where something sits.

## Figure 6: the dining philosophers, 25 places and 20 transitions

1. **Angle means which process.** The five philosophers are one drawing rotated five times. A reader sees one thing, five times, before reading a label.
2. **Distance from the center means how far along.** Every spoke runs outward from its marked starting place to its last transition. Places at the same radius are at the same stage in different processes, so you compare stages by looking around a circle.
3. **Between two processes means shared by them.** Each fork place sits in the gap between the two philosophers that use it. Its position states the coupling before any arc is read.
4. **A cycle is a closed shape.** The return from a spoke's outer end to its start is one long loop that wraps around its own spoke, a petal. Each process reads as one enclosed figure. The loop goes around the spoke and never cuts across it.
5. **The marking shows the starting moment.** The tokens sit on the inner ring. That reads as every philosopher thinking and every fork free.
6. **Crossings are the price of rule 3, and they stay legible.**
   - A petal crosses its neighbors' fork arcs. The figure has many crossings.
   - Each line is one smooth curve, so the eye carries straight through a crossing.
   - Crossings happen away from places and bars.
   - Crossing lines meet at a steep angle, never a shallow one.
7. **A transition is a short bar across the flow, with its label beside it.** The bar's orientation shows which way the process runs.

## Figure 4: two processes and two shared resources

8. **Two parties for one resource is a mirror.** The two processes are vertical columns on the left and right. The shared places sit in the middle column between them.
9. **Direction separates kinds of cycle.** The processes flow down, and the resource cycle in the middle flows up.
10. **The return is a rounded loop on the outer side of its column,** the side away from what it shares.

## Figure 3: a small net

11. **A loop that returns to the same transition sits beside it,** small and close, so it reads as part of that transition.

## The user's conversation net (notes.scottshepp.com/201909101104, 2019)

This is Crawford's conversation modeled as a Petri net by the user. It has two people, three states each (listen, think, speak), one idle start, and six transitions. The linked notes say what it is for: "I speak, you listen / You process what I said and formulate a response / You speak, I listen", and a game is a party that "can only 'hear' the registered inputs" and has "responses pre-programmed to 'speak back'".

12. **Left and right mean which party.** Person 1's states are on the left, and Person 2's mirror them on the right.
13. **Height means the phase of the conversation.** Listen is the top row, think the middle row, and speak the bottom row, for both people. Two states at the same height are the same phase in each party.
14. **The start sits between the parties.** The idle place and the two "who starts" transitions are on the center line, before either side owns the conversation.
15. **The exchange is the crossing.** The handoff transitions, at the top outer corners, take one party's speaking and the other's listening and swap them. Their arcs run diagonally across the center line, so each X reads as "my speaking becomes your listening". Here a crossing is not a cost. It is the conversation itself.
16. **Private steps stay on their own side.** Thinking into speaking happens on each party's outer edge. One's own deliberation never crosses the middle.
17. **Symmetry makes state readable.** The user's own description says that after one exchange "we are now at a mirror reflection of the first marking". The mirrored placement is what lets a reader see that.

The note's tag is `#toolong` and it calls itself "the most simplified net I could think to model". I take it as the meaning to carry, not as finished craft. The straight diagonals and the box transitions came from the tool it was drawn in.

## Dan Cook's loop (notes.scottshepp.com, linked from the conversation note)

Decision, action, simulation, feedback, modeling. In MAPS terms:
- the decision is a resting moment where a seat must choose;
- the action is the seat's verb;
- the simulation is the world answering by priority until it falls silent;
- the feedback is what changed and who can see it;
- the modeling happens in the player's head and is not drawn.

## What this says MAPS placement should mean

These are proposals, inferred from the figures and not yet tested.

- **An entity is one spoke or column.** Its home state, which holds the mark at the start, is innermost. Position along the spoke means how far the entity is from home.
- **A state or verb that couples two entities sits between them.** This covers contact reads, a shared beat, and a pool, and the position itself says "shared".
- **The way home is a loop around the entity's own spoke,** so each entity's cycle is one closed shape.
- **Entities with the same structure are drawn as the same shape,** rotated or mirrored. This covers two duelists, the nine squares, and two players' identical moves. Sameness then reads before labels, which is #14's comparison by shape.
- **Two sides, mirrored: a seat on one side and the world on the other**, or one seat on each side. In a one-seat game the world is the other party in the conversation ("conversing with the world"). An entity sits on the side of the party it belongs to.
- **Contact crosses the middle, and that crossing is the conversation.** A verb on one side that reads or moves a state on the other side is an exchange between parties, so its arcs cross the center line on purpose. Private moves stay on their own side's outer edge.
- **Open question.** Some entities are moved by both parties. Link's roll is ended by the world, for example. The lanes design failed because it split an entity by who speaks each verb. Placing the whole entity with its owner and marking each verb's speaker by color avoids that, but this is untested.
- **Crossings are allowed where rule 3 or rule 15 puts them.** Each line stays one smooth curve, and no crossing sits on a node or meets another line at a shallow angle.

## What my candidates got wrong against this

- **spinenet:**
  - Its returns were orthogonal buses into one state, not a loop around the spoke.
  - Its coupling states were scattered as copies instead of sitting between the entities.
- **staffnet:** position meant "row in a table". No cycle was a closed shape, and nothing shared sat between what shares it.
- **philnet:**
  - Shared things sat at the mean of their neighbors, not between the two entities.
  - Returns nested as arches above the line, not around the spoke.
  - Long reads ran straight across the page, through other parts.
- **All three:** each layout followed a count I chose to minimize, not a meaning.
