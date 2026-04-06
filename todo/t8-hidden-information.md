# T8: Hidden Information

**Priority:** Medium — critical for any game involving bluffing, fog of war, or asymmetric knowledge  
**Status:** Open  
**Depends on:** T1 (syntax), T5 (schema separation — visibility is a schema-level property)  
**Blocks:** Any Score for poker, fog-of-war strategy, stealth games, hidden-role games, or any mechanic where agents have asymmetric knowledge

---

## Problem

MAPS RESEARCH.md notes: "Visibility rules can mask information for hidden states (fog of war, concealed cards)" and lists "Hidden information: Visibility masks are per-agent, but how to notate cleanly?" as an open question.

Hidden information is not a peripheral feature. It is one of the most powerful design tools in the medium. Poker without hidden cards is arithmetic. Fog of war is what makes scouting a meaningful Verb. The entire stealth genre exists because the player knows things the enemies don't and vice versa. Bluffing, deduction, suspense, surprise — all emerge from asymmetric visibility of the game's States and Marks.

The MAPS README acknowledges this: "Visibility rules can mask information for hidden states." But no formal mechanism exists for declaring, composing, or reasoning about visibility.

## What Hidden Information Means in Petri Net Terms

In a standard Petri net, all places and their token counts are globally visible. Hidden information means restricting *which agents can observe which places and token counts*. Each agent has a *visibility mask* — a function that maps States to `{visible, hidden}` for that agent.

This extends naturally:
- A **visible State** is one whose Marks an agent can read before choosing a Verb
- A **hidden State** is one whose Marks an agent cannot read — the agent may know the State *exists* but not what it contains
- A **secret State** is one whose *existence* is unknown to the agent (they don't even know there's something to know)
- **Partial visibility** — an agent can see that a State has *some* Marks but not the exact count or type

## The Design Space

### Per-State Visibility Declarations
Each State declares which agents can see it.

```
[hand_p1] visible_to: player_1
[hand_p2] visible_to: player_2
[community_cards] visible_to: all
[deck] visible_to: none
```

**Strengths:** Simple, declarative. A reader scanning the Score sees exactly what each player knows.

**Weaknesses:** Static — doesn't handle information that *becomes* visible during play (e.g., a card is flipped face-up). Doesn't handle *partial* visibility (you can see the State exists but not its Marks).

### Visibility as a State Property That Changes
Visibility itself is a Mark or a State attribute that can be modified by Verbs.

```
[enemy_position] visible_to: none
(scout) --> [enemy_position] set_visible_to: player_1
```

Scouting reveals enemy positions. The Act of scouting changes the visibility mask. This handles fog-of-war reveal mechanics.

**Strengths:** Dynamic visibility as a first-class mechanic. The graph shows *how* information flows, not just what's hidden.

**Weaknesses:** More complex. Visibility changes are themselves transitions that need to be notated without cluttering the mechanical graph.

### Information Sets (Game Theory Approach)
Borrow from game theory: an *information set* groups decision points that an agent cannot distinguish. When a poker player decides to bet, they cannot distinguish between states where the opponent holds a pair vs. a flush — those two States are in the same information set for the betting player.

**Strengths:** Formally rigorous. Enables game-theoretic analysis (Nash equilibria, dominant strategies).

**Weaknesses:** Heavyweight for design notation. Designers think "the player can't see this" more naturally than "these decision points form an information set."

## Key Design Decisions

### 1. Static vs. dynamic visibility
Should visibility be:
- A fixed property of States (declared once, never changes during play)
- A mutable property that Verbs can modify
- Both — fixed default with specific Verbs that can reveal/conceal

Both seems necessary. A card game's deck is always hidden by default, but specific Verbs (draw, reveal, peek) change what's visible.

### 2. Granularity of visibility
What can be hidden?
- **State existence** — the agent doesn't know the State is there (secret rooms, hidden mechanics)
- **Mark presence** — the agent knows the State exists but not what Marks it holds (face-down cards)
- **Mark quantity** — the agent knows Marks exist but not how many (hidden HP in some games)
- **Verb availability** — the agent doesn't know a Verb exists until a discovery condition is met

### 3. How visibility interacts with Verb preconditions
If a Verb's precondition Arc references a hidden State, the agent cannot evaluate the guard. This creates *information uncertainty* — the agent doesn't know if the Verb will succeed. This is mechanically important: a poker player doesn't know if their bluff will work because they can't see the opponent's hand.

The notation needs to express: "this Verb's precondition guard references States the agent cannot see — firing the Verb is a decision under uncertainty."

### 4. Notation syntax for visibility
Options:
- Attribute on States: `[state] { visible_to: [agent_list] }`
- Separate visibility declaration block in the Score
- Overlay notation — a "visibility layer" drawn on top of the base graph in diagrams

### 5. How visibility interacts with the schema separation (T5)
Visibility masks likely belong to the Content Schema — they describe what the world *reveals* to each agent, not what the agent *can do*. A Capability Schema is the same regardless of what information the agent has — the agent's available Verbs don't change, just their knowledge about precondition satisfaction.

But the Capability Schema needs to declare which of its Verbs involve hidden-information decisions, so that a designer reading it understands the agent is acting under uncertainty.

## Deliverables

1. **Visibility model** — formal definition of visibility levels (visible, hidden, secret) and what each means for agent decision-making
2. **Static visibility syntax** — how States declare their default visibility per agent
3. **Dynamic visibility mechanics** — how Verbs can reveal or conceal States/Marks, expressed as Arc effects
4. **Integration with schema separation** (T5) — where visibility declarations live in the Capability/Content/Instance hierarchy
5. **Worked examples:**
   - Poker — hidden hands, shared community cards, reveal on showdown
   - Fog of war — hidden map States revealed by scouting Verbs
   - Spacewar! — fully visible (trivial case, validating that the notation handles "everything visible" cleanly)

## Open Questions

- How does hidden information interact with probability (T7)? A card draw is both probabilistic (which card?) and hidden (only the drawing player sees it).
- Can an agent's *Capability Schema* be hidden from other agents? (Secret abilities, unknown movesets.)
- How does the notation express *deduction* — an agent inferring hidden State information from observable consequences? (This may be beyond notation scope — it's a player skill, not a rule.)
- Should the notation distinguish between "fog of war" (hidden but revealable) and "private" (never revealable to other agents)?
- How does hidden information interact with the visual notation (T2)? Standard practice in game theory is dashed lines for information sets. What's the MAPS equivalent?
