# Synthesis A (coordinator's draft, written before reading synthesis B)

Sources are the six chapter analyses' recurring candidates plus my own views of 2.4, 2.6, 3.2, 3.19, 3.28, 3.29, 4.6.

## The one idea

A Peterson drawing is a picture of **token journeys**. Each journey (a process cycle, or an open path from source to sink) is a straight line read in one direction. Everything that is not on a journey is placed by its relation to journeys: between the journeys it couples, beside the stretch it serves, or outside the line it returns along.

## Vocabulary the engine detects

- **Process.** A state-machine component: a set of places such that every transition touching them takes one token from the set and puts one back (minimal P-semiflow with 0/1 weights whose induced subnet has one input and one output per transition). It carries the initial tokens of one of its places. Cut it open at its marked place.
- **Open journey.** A path from a source (place with no inputs or a transition with no inputs) to a sink, through places that have one input and one output.
- **Shared place.** A place not on the journey being drawn, whose transitions lie on two or more journeys. Two kinds:
  - **resource**: marked at start, taken and given back (3.28 m, 4.6 p4/p5, 3.2 d,g,h);
  - **channel/buffer**: unmarked, written by one journey, read by another (3.29 B, 7.13 p3/p4, 8.12 mailboxes).
- **Side place.** A place whose transitions all lie on one journey: a local resource (3.2 e, f; 3.1 machine idle), a counter, a self-loop condition.
- **Choice.** A place with two or more output transitions on the same journey. **Merge**: a place with two or more inputs.
- **Fork/join.** A transition with two or more outputs/inputs on different journeys.
- **Return arc.** The arc that closes a process back into its marked place.

## Rules, priority order

1. **One flow axis.** Every journey reads in the same direction: down for nets made of processes (3.28, 3.29, 4.3, 4.6), left to right for open start-to-final nets (3.1, 3.2, 6.2, 6.12, 6.13). Bars are perpendicular to the local flow (all good figures; 3.13, 2.22 fail).
2. **A journey is a straight line, cut at its start.** Places and transitions of one process sit on one line, in firing order, starting from the marked place (3.29, 4.3, 4.6, 3.28). An open journey starts at its source (3.1, 6.12).
3. **Peers are parallel and aligned.** Processes sit side by side; the same stage index sits on the same row (3.29, 4.3, 4.6, 3.19, 7.13). Identical processes are drawn identically, mirrored about the axis between them when they share something (3.28, 3.33, 4.3, 4.6), rotated around a center when there are many in a ring (3.32).
4. **Shared goes between.** A shared place sits in the gap between the journeys it couples, at the height midway between the transitions that fill it and those that drain it (3.28 m at the critical-section row; 3.29 B between writer and reader; 4.6 p4, p5; 7.13 p3, p4). Several shared places in one gap keep the order in which the journeys use them (4.6).
5. **Private goes beside, on the outside.** A side place sits beside the stretch of its journey that uses it, on the side away from shared things (3.2 e, f; 3.1; 3.20). A resource used by several stretches of one journey sits farther out, at their midpoint (3.2 g, h).
6. **Returns go around the outside.** A process's closing arc leaves its last transition, runs on the outer side of the line (away from shared places), and enters the start place from before it (3.29, 4.3, 4.6, 3.31). Pure short cycles with nothing shared may be drawn as a ring instead (2.9, 4.13, 5.4, 7.13).
7. **Choice and fork are symmetric fans.** Alternatives (choice) branch symmetrically on both sides of the axis and each continues straight; they rejoin on the axis (3.2, 3.25, 2.21, 6.9). A fork bar spans its lanes; a join bar likewise (3.26, 3.27, 3.37).
8. **Self-loops sit tight.** A place read and returned by one transition sits right beside that bar, perpendicular to the flow, with two short parallel arcs or a small lens (2.4, 2.20, 4.9, 4.18, 6.2, 6.12).
9. **Weights are parallel strokes** along one route; large weights are a labeled bundle (2.5, 2.8, 4.4, 3.33).
10. **Labels on the free side.** A node's label sits on the side no arc uses, mirrored outward in mirrored layouts (3.28, 3.29, 3.19, 7.13).
11. **Same structure, same drawing.** The layout depends only on structure and marking, never on names or declaration order. A variant keeps the positions of what it shares (2.11 to 2.18, 3.29 to 3.31, 4.20/4.21).
12. **Meaningful crossings stay.** If rules 3 and 4 put an X between two processes (opposite acquisition order in 4.6, exchange in a conversation), it stays; it is the content.

## Not rules: what the bad figures do

3.13, 3.14, 3.16: no axis, states stacked across the input/output flow, bars at random angles; position says nothing. 2.22: no flow direction. 8.3: inherits a directionless source layout. 6.7: breaks the start-to-final row.

## Open

- How to choose among overlapping process candidates (a resource cycle like m + critical sections is itself a state-machine component).
- Nets with no marked places and no sources (2.4, 4.15 family): which node starts?
- When to draw a lone cycle as a ring versus a column with a return loop.
