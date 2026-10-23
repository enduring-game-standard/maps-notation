# How to analyze one figure

The goal is a set of placement rules that an automatic layout engine can follow to draw an arbitrary Petri net the way Peterson's figures are drawn: easy to grasp at a glance. Only *placement* matters here. That means where each place and transition sits, which way the flow runs, how the bars are oriented, where arcs bend and go around, where labels and tokens sit, and how big things are and how far apart. The net's logic does not matter, and neither does anything a program checks trivially, such as whether two arcs cross.

## Inputs

- The figure's PNG.
- The page PNG(s) the figure sits on, and the one or two pages before it. Read the text that introduces the figure. It tells you what the net models, and that is what the placement has to show.

## Write one section per figure

```
## Figure N.M  (fig-NN-MM.png, page p-XXX)

**Kind.** net | net fragment | not a net (tuple, tree, graph, table, other). For not-a-net, stop after this line and one line of description.

**What the text says it models.** One to three sentences, quoting the text where it helps.

**Structure, briefly.** Places, transitions, initial marking, and the shape: a chain, a cycle, a fork and join, a choice, parallel processes, a shared resource, a self-loop, a hierarchy, and so on.

**Placement observations.** A numbered list. Each item has three parts:
  1. What is placed where, concretely: "p1 is top-left, p2 directly below it, t1 between them as a horizontal bar".
  2. What that placement says to a reader, tied to the modeled meaning: "the vertical column reads as one process's sequence of states, top to bottom in time".
  3. A rule candidate, phrased so a program could follow it: "R?: a process's states form a straight column in firing order; the transition between two consecutive states sits on the segment between them, bar perpendicular to the column".

Cover at least:
  - main flow direction, and how a reader finds where to start;
  - where the initially marked places sit;
  - how cycles and returns are drawn: which side the back arc runs on, and how wide it swings;
  - how concurrent branches are laid out relative to each other: side by side, symmetric, aligned by stage;
  - where shared or coupling places sit relative to what they couple;
  - how a choice or conflict (one place feeding two transitions) is drawn;
  - how synchronization (one transition with several inputs) is drawn;
  - bar orientation relative to the flow;
  - label placement for places and for transitions, and token placement;
  - spacing: is it uniform? Do related things cluster?
  - symmetry and repetition: are identical parts drawn identically?
  - arc shape: straight, curved, orthogonal; where arcs bend and why.

**What could be better.** One or two places where the drawing is weaker, if any. Be honest. Not every figure is good.
```

Ground every statement in the image. If you cannot see something clearly, say so. Don't invent structure.

## Worked example

## Figure 3.29  (fig-03-29.png, page p-080)

**Kind.** net

**What the text says it models.** "The producer process creates objects which are put in the buffer; the consumer waits until an object has been put in the buffer, removes it, and consumes it." Place B is the buffer, and "each token represents an item which has been produced but not yet consumed."

**Structure, briefly.** Two cycles of two places and two transitions each, one marked place per cycle. One shared place B, written by the producer's second transition and read by the consumer's first.

**Placement observations.**
1. Each process is a straight vertical column: marked place, bar, place, bar, top to bottom. *Says:* one process is one sequence in time, read downward. *R: a process's places and transitions sit on one straight line in firing order.*
2. The marked place is the top of each column. *Says:* where each process starts. *R: a cycle is cut open at its marked place, which goes first in the reading direction.*
3. The two columns are the same shape, and their corresponding nodes sit at the same heights. *Says:* the two are peers, and same height means same stage. *R: parallel processes run side by side, with their stages aligned across.*
4. The return from the last bar to the first place is a long loop on the outer side of each column, the side away from B. It leaves the bottom bar downward, swings out and up, and enters the top place from above. *Says:* "and then again", without cutting through anything. *R: a cycle's closing arc runs around the outside of its column, on the side away from what the process shares.*
5. B sits in the gap between the columns, at a height between the bar that fills it (the producer's bottom) and the bar that drains it (the consumer's upper). *Says:* B belongs to neither process; it is what couples them. *R: a place shared by two processes sits between them, at the height between its writer and its reader.*
6. Producer is left, consumer is right. *Says:* items go left to right between processes, while time inside each process goes down. *R: across processes, place the giver before the taker in reading order.*
7. Bars are horizontal, across a vertical flow. Labels sit beside the bar, on whichever side no arc uses: "Produce" right, "Consume" left. *R: a bar is perpendicular to its column; a label goes on the free side.*
8. Arcs inside a column are straight. Only the returns and the coupling arcs curve, and each is one smooth stroke. *R: straight within a process, curved only between or back.*

**What could be better.** The enclosing boxes are chrome; the columns already read as processes without them.
