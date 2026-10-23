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

## What this says MAPS placement should mean

These are proposals, inferred from the figures and not yet tested.

- **An entity is one spoke or column.** Its home state, which holds the mark at the start, is innermost. Position along the spoke means how far the entity is from home.
- **A state or verb that couples two entities sits between them.** This covers contact reads, a shared beat, and a pool, and the position itself says "shared".
- **The way home is a loop around the entity's own spoke,** so each entity's cycle is one closed shape.
- **Entities with the same structure are drawn as the same shape,** rotated or mirrored. This covers two duelists, the nine squares, and two players' identical moves. Sameness then reads before labels, which is #14's comparison by shape.
- **Crossings are allowed where rule 3 forces them.** Each line stays one smooth curve, and no crossing sits on a node or meets another line at a shallow angle.

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
