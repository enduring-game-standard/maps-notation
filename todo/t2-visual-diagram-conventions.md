# T2: Visual Diagram Conventions

**Priority:** High — essential for the "readable on a napkin" promise  
**Status:** Open  
**Depends on:** T1 (textual syntax informs visual mapping)  
**Blocks:** Practical use of MAPS for design analysis, teaching, and communication

---

## Problem

MAPS is "literally a Petri net in visual style." But no visual conventions have been defined. A designer sketching a game's mechanics on a whiteboard needs to know: what shape is a State? What shape is a Verb? How do I draw an Arc? How do I show Marks? How do I distinguish "the player chooses this" from "the simulation fires this automatically"?

Without conventions, every designer invents their own visual language, and the cumulative craft promise collapses — two designers looking at each other's diagrams can't read them.

## Design Constraints

### Must inherit from Petri net convention where possible
Petri nets have a 60-year tradition of visual representation. Places are circles (or ellipses). Transitions are rectangles (or bars). Arcs are directed arrows. Tokens are dots inside places. Designers who have encountered Petri nets (or Machinations, which uses similar conventions) should recognize the visual grammar immediately. Departing from this tradition without reason discards accumulated understanding.

### Must be drawable by hand
If the notation requires a specialized tool to draw, it cannot serve the napkin-sketch use case. Circles, rectangles, arrows, and text labels are things humans can draw with a pen. Complex custom shapes, color-coding that requires specific tools, and pixel-precise layouts are not.

### Must distinguish the bipartite node types at a glance
A reader scanning a diagram must instantly see which nodes are States and which are Verbs. This is the most important visual property. In Petri nets this is circles vs. bars/rectangles. MAPS should preserve this or offer an equally clear distinction.

### Must scale from napkin to formal publication
A whiteboard sketch uses rough shapes and shorthand labels. A published Score in a journal or Nostr event uses precise layout, complete labeling, and full annotation. The visual conventions should work at both scales — the same shapes and arrows, with more or less annotation detail.

## Prior Art to Study

### Standard Petri Net Diagrams
The original and most widely understood format. Places = circles, transitions = bars or thin rectangles, arcs = arrows, tokens = dots in places.

**What to take:** The basic shapes and the principle that the bipartite structure is visible in shape contrast.

### Machinations (Joris Dormans)
A visual language specifically for game economies. Uses pools (circles with resource quantities), gates (diamonds for chance/logic), sources, drains, converters, traders — each with distinct shapes.

**Strengths:** Purpose-built for game systems. The shape vocabulary communicates function. Interactive simulation built into the tool.

**Weaknesses:** Machinations-specific shapes are not universally recognized. The vocabulary is oriented toward resource flows, not general mechanics. Tight coupling to Dormans' simulation tool.

**What to take:** The idea that shape communicates function beyond just "place" and "transition." The resource-flow visual idiom. Study which Machinations conventions are genuinely more readable than standard Petri net shapes, and which are tool-specific.

### Mark Brown's Boss Keys Notation
Dungeon structure graphs. Simple circles for rooms, simple lines for connections, special symbols for locks and keys.

**Strengths:** Proved that a narrow visual notation makes structural analysis accessible to mass audiences. Minimalist — very few visual elements, all hand-drawable.

**Weaknesses:** Narrow scope — designed for spatial progression, not general mechanics.

**What to take:** The minimalism principle. If Brown could make dungeon structure legible with circles and lines, MAPS should aim for similar economy.

### UML State Diagrams
Rounded rectangles for states, arrows for transitions, guard annotations in brackets.

**Strengths:** Widely understood in software engineering. Guard syntax convention established.

**Weaknesses:** Not bipartite — transitions are arrows, not nodes. This collapses the Verb into the Arc, which loses the ability to name and reference the Verb independently.

**What to take:** The guard annotation convention `[condition]` on transitions. The visual convention for initial and terminal states.

## Key Design Decisions

### 1. Shape vocabulary
The minimum set:
- **State** — circle (or rounded shape). Consistent with Petri net places.
- **Verb** — rectangle (or bar). Consistent with Petri net transitions.
- **Arc** — directed arrow connecting State↔Verb.
- **Mark** — notation inside or beside a State showing token quantity and type.

Should there be additional shapes? A different shape for system-expressed Verbs vs. agent-chosen Verbs? A different arc style for consuming vs. producing marks? Each additional shape adds expressiveness but complicates the hand-drawing constraint.

### 2. Agent-chosen vs. simulation-expressed Verbs
This is a critical readability question. When a designer reads a diagram, they need to know: "does the player decide this, or does the world impose it?" Options:
- Different fill: solid rectangle for agent Verbs, hollow for system Verbs
- Different border: single line vs. double line
- Annotation: a small icon or label (⚡ for agent, ⚙ for system)
- No visual distinction — inferred from topology (a Verb with no competing alternatives at its input States is system-expressed)

The topological inference approach is formally sufficient (it's how Petri nets work) but may sacrifice readability at a glance.

### 3. Guard and Mark annotation placement
Guards on Arcs can be written:
- Along the arrow as a label (standard UML/Petri net convention)
- In a small box attached to the arrow
- Below or beside the arrow in a footnote style

Mark consumption/production on Arcs:
- `−fuel` and `+score` along the arrow
- Special arrowhead styles (e.g., a dot for consumption, a diamond for production)
- Both — abbreviated inline with detailed legend

### 4. Hierarchy and Pattern references
When a Pattern is imported and used, how is it drawn?
- As a collapsed rectangle with the Pattern name (a "black box" with labeled interface States on its border)
- As an expanded subgraph with a containing boundary (like a UML package)
- Both — collapsed by default, expandable for inspection

### 5. Layout conventions
- Should flows generally read left-to-right? Top-to-bottom?
- Should cyclic structures (feedback loops) have a preferred layout direction?
- How should multi-agent diagrams partition space?

## Deliverables

1. **Shape specification** — the exact visual element for each MAPS primitive, with hand-drawable descriptions
2. **Annotation conventions** — how guards, marks, and labels are placed on diagrams
3. **At least three example diagrams** at different scales:
   - A simple Atom (hand-sketch quality)
   - A moderate Pattern with guards and marks
   - A partial Score showing imported Patterns and multi-agent structure
4. **Style guide** — layout recommendations, spacing, label formatting
5. **Tool-agnostic format recommendation** — how diagrams should be authored for publication (SVG? Mermaid subset? Dedicated tool?)

## Open Questions

- Should color be part of the specification, or strictly optional enhancement? (Color fails in black-and-white printing and hand sketches.)
- How to visually represent hidden information (States visible to one agent but not another)?
- How to represent temporal annotations (T6) visually once they're defined?
- Should there be a canonical "MAPS diagram font" or typeface recommendation for published Scores?
