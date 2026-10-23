# The design space for drawing a MAPS net

PROTOTYPE notes for the notation bakeoff. Six conventions are built, each from a different region of this space, so they differ at the root. The convergence step takes the best of them, reasoned element by element.

## What every design must carry

These come from the user, ticket #14, the map's Notes, and *Enduring Games*. The table and checks are in the verify skill on main (`.claude/skills/verify/SKILL.md`).

- **Conversation.** Who speaks each verb, the world answering by priority until it falls silent, and the world acting with nobody speaking.
- **Possibility.** At a moment: what is open, what closes it, where each choice leads.
- **Actionable.** A designer can find what to change.
- **The #14 decisions.**
  - Each entity is always in one of its states.
  - Content is kept apart from capability.
  - Contact is one entity's verb gated by another's state.
  - Counts are on the map.
  - Designs compare by shape and by name.
- **A readable net** in the tradition of professional Petri figures. The standard is the dining philosophers figure.
  - Each process is a straight spine.
  - Identical parts are drawn identically.
  - Shared places sit between the processes they couple.
  - Returns sweep around the outside.
  - Crossings are few, at wide angles.
  - Verbs are thin bars with their labels beside them.
  - No chrome.
  - No connection is ever hidden.
- **One default for every net.** Examples test a convention and never shape it.
- **Napkin.** A designer can follow the rules by hand.

## The root question: what does position mean?

The canonical-drawing research (#20) found that firm conventions fix one or two axes to a meaning and fill the rest with named idioms. An algorithm alone fails, because Freese found a random correct layout is "very likely to be useless". So the axis of difference that matters most is what position means. The six designs give six different answers.

| design | position means | the governing idea | grounded in |
|---|---|---|---|
| `spines` | which entity. Each entity is one spine or ring of its states. | The dining philosophers idiom: a process per entity, contact places between the spines they couple, returns around the outside. | the dining philosophers figure; #14 "entities are always in a state"; industry movesets (#17), one active state per layer, layers in parallel |
| `exchange` | vertically, the moment in one exchange when a verb can speak. Seats' verbs are on top, then the world's answers in priority order, highest first. | One exchange reads top to bottom as listen, think, speak, then the world thinking, in rule order. States sit in the gaps between the rows that write and read them. | SPEC "The conversation" (the world answers by priority until silent, then seats choose); Crawford; Bura's automatic, prioritized operational layer (#4) |
| `lanes` | horizontally, who speaks. One lane per seat, with the world's lane between them. | Bura folds by seat. Verbs sit in their speaker's lane, and states sit on the boundary between the speakers that touch them. Contact is an arc crossing a lane. | Bura (#4); Crawford's two parties; GAS tags (#17) |
| `noreturn` | vertically, what cannot be undone. | Strongly connected parts (loops play can return to) are drawn as rings at one level. Down is irreversible, and outcomes sit at the bottom. The possibility structure narrows as you go down. | Boss Keys (#5), down means later; GAL's temporal phase structure (SCCs) |
| `score` | fixed lines. A row per state, grouped by entity like staves, and a column per verb, ordered by speaker then priority. | The net drawn as its incidence matrix, as staff notation draws music: fixed lines, glyphs on them, nothing placed by connectivity. No crossings can exist. | Petri's incidence matrix; music's fixed staff (#19); NKS's fixed protocol (#6) |
| `unfold` | horizontally, the earliest exchange in which a verb can first be said. Vertically, the entity. | The possibility structure unfolding over play: what becomes possible when, and what it depends on. | S&Z's space of possibility; GAL state test ("does the set of available actions change?"); the reachability graph as the closest analog (#6) |

## Regions considered and rejected, with reasons

- **Depth rings around a home.** Built in the first round on `prototype/spines`. Two structurally different subjects came out the same shape, so it failed comparison. That was measured.
- **Drawing the reachable moments instead of the net.** It is not the net, and the user wants the net. It also explodes (tic-tac-toe has 5,478 positions). `unfold` keeps its question, "what becomes possible when", while still drawing the net.
- **Views laid over the net** (script, chart, rosette, sheets, inventory staff). The user rejected them. They replace the notation rather than make it readable.
- **Optimizer layouts** (annealing, dagre). They give tidiness without meaning, and the position of a node changes when anything changes.

## Questions every design must answer the same way, so they can be compared

- How a seat's verb differs from the world's.
- How take, give, need, and unless differ.
- Where counts, caps, weights, and starting marks are printed.
- How an outcome looks.
