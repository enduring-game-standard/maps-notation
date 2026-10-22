# Prior art for composing nets

Research for [issue #7](https://github.com/enduring-game-standard/maps-notation/issues/7). The question: how do established formalisms nest and compose state/transition structures? For each formalism, this note gives the composition mechanism, whether the result unfolds to a flat net, how it is drawn, and what it costs. Sources are primary: the papers, theses, and tool manuals that own each formalism. The last section lists what I could not verify.

## Summary: what bears on MAPS

- **Every Petri-net school composes by gluing places or gluing transitions, and nothing else.** CPN port/socket assignment and fusion sets glue places ([Jensen, Kristensen & Wells 2007](#cpn)). Open nets glue along a shared subnet that can contain both open places and shared transitions ([Baldan et al. 2001](#open)). Kindler's components glue input places to output places only ([Kindler 1997](#kindler)). Christensen and Petrucci's modular nets share places and share transitions ([2000](#modular)). The MAPS spec's "fuse named states" is the place-gluing half. The user's "contact points" between Link and a Keese have two readings. Read as a shared state (Link's sword is out and the Keese is in range), they are place gluing. Read as a shared verb (one hit that both entities take part in), they are transition gluing. MAPS has only the first today. The second clashes with "every verb has one speaker".
- **Hierarchy in CPN is notation, not semantics.** A port and its socket are "two different views of a single place". A substitution transition never fires; only its submodule's transitions do. Module instances are fixed before simulation ([Jensen et al. 2007](#cpn)). So a CPN hierarchy always unfolds to a flat net. Jensen's books each have a section on doing exactly that (titles verified; content not, see [gaps](#gaps)). MAPS can get CPN-style layering and keep every check it has now by unfolding before analysis. The price is that analysis still sees the full flat state space.
- **Fixed instances are a real limit for games.** CPN Tools cannot create module instances during a run. Keese that spawn, or a room that loads a new set of enemies, need either a fixed pool of instances or a coloured token per entity, which is MAPS's open Folding problem.
- **Statecharts have the two things the Ocarina atlas lacks: depth and high-level transitions.** Harel names a gap in Petri nets: "the kind of high-level encompassing events that are applicable at once in many lower-level states (or places) are not naturally specifiable" ([Harel 1987](#harel)). In Link's moveset, "take a hit" applies in almost every state. A flat net writes it once per state. A statechart draws one arrow out of a superstate. Orthogonal regions avoid the product blow-up in the drawing, and Harel says depth and orthogonality "can be dealt with by a translation into ordinary automata". Analysis still pays the product. Harel calls broadcast communication "not a crucial feature"; the central concepts are depth and orthogonality.
- **Dormans keeps the level as a separate graph and maps it onto the mission. He does not fuse them.** Mission graph and space graph are two structures. "The same mission can be mapped to many different spaces, and one space can support multiple different missions" ([Dormans 2010](#dormans)). His mission-graph edges are MAPS arcs under other names: a strong requirement is a `need`, and inhibition is an `unless`, drawn the same way, as a line ending in an open circle. A lock is a space node with two states, locked and unlocked. That fits the user's idea that a door is its own small design.
- **Machinations had no composition, and its author was wary of adding it.** In 2012 Dormans proposed letting users "embed diagrams in user defined elements" and warned that "by allowing embedded diagrams, the focus on the larger structure might be lost" ([Dormans 2012, §8.7](#dormans)). He also says Petri nets for whole games "can become the equivalent of a game's source code". The Ocarina atlas confirms that warning. Micro-Machinations later added type definitions, instances, and in/out/inout interfaces. It flattens them before model checking: "We bind references to definitions and transform the model to core MM" ([Klint & van Rozen 2013](#mm)).
- **The likely shape for MAPS, from this survey:** take entities as modules with typed interface states (CPN ports, MM interfaces). Compose them by place fusion, plus a decision on transition fusion for contact. Take depth and superstate transitions from statecharts for the loop around idle. Model the level as a separate space net that the entity's position token moves through (Dormans). Always unfold before analysis. If whole-game reachability becomes too big, modular state-space analysis is the known escape (Christensen & Petrucci), but I did not verify its method.

## Comparison

| Formalism | Composition mechanism | Unfolds to flat? | Drawn as | Main cost |
|---|---|---|---|---|
| Hierarchical CPN | Substitution transition with port/socket places; fusion sets; reused module instances | Yes; the hierarchy is views of one net | Double-lined box with a submodule tag; In/Out/I/O tags on ports; fusion tags; one page per module | Instances fixed before the run; analysis is on the flat net |
| Open Petri nets (Baldan et al.) | Pushout: glue two nets along a shared subnet of open places and shared transitions | Yes; the composite is an ordinary net, and the open places are an interface | Open places shown by dangling in/out arcs | Interface must be declared up front; theory is category-heavy |
| Petri net components (Kindler) | Input places of one component meet output places of another | Yes (closed composite) | Not checked | Message passing only; no shared transitions |
| Modular PT/CP-nets (Christensen & Petrucci) | Shared places and shared transitions | Yes; modular analysis avoids building the product | Not checked | Analysis method not verified |
| Harel statecharts | OR-states (depth), AND-states (orthogonal regions), inter-level arrows, broadcast events | Yes, into an ordinary automaton; Harel calls the full semantics "delicate" | Nested rounded boxes; dashed lines split regions; default arrows; H for history; stub arrows when zoomed out | Product blow-up returns in analysis; Harel's own text admits semantic puzzles |
| Dormans mission/space | Two separate graphs, related by a mapping and generated by graph and shape grammars | No single flat net in the sources I read | Two graphs side by side; gray lines join corresponding nodes; lock icons; game elements drawn inside places | The mapping is informal; no joint execution semantics |
| Machinations (Dormans) | None in 2012; color-coded resources share one pool | n/a | Pools, gates, converters, and similar nodes | No reuse; whole-game diagrams grow |
| Micro-Machinations | Type definitions, instances, in/out/inout interfaces, `ref` bindings, nested instances with dotted names | Yes; references are bound and the model reduced to core MM before Promela/Spin | Reference is a circle with a dashed line; interface arrows in the node's corner; `=` bindings as dashed arrows | State explosion: 10.5M states and 2.5 GB for one SimWar check |

## Hierarchical coloured Petri nets {#cpn}

**Mechanism.** Huber, Jensen and Shapiro introduced five hierarchy constructs: substitution transitions, substitution places, invocation transitions, place fusion, and transition fusion. They "allow to structure large CP-nets as a set of interrelated subnets" ([Huber, Jensen & Shapiro 1989/1991, abstract](https://www2.informatik.uni-hamburg.de/tgi/pnbib/h/huber_p2.html)). CPN Tools kept two of the five, substitution transitions and place fusion sets ([Jensen, Kristensen & Wells 2007](https://cs.au.dk/fileadmin/site_files/cs/research_areas/centers_and_projects/sttt2007.pdf), §2.4, §3.3).

From Jensen, Kristensen & Wells (2007, §2.4):

- A substitution transition is associated with a submodule, which is "a more detailed view of the behaviour represented by the substitution transition—in a similar way as the implementation of a procedure provides a more detailed view of the effect of a procedure call."
- Its surrounding places are sockets, and "the socket places of a substitution transition constitute the interface". The submodule's port places carry In, Out, or I/O tags, and a port assignment maps ports to sockets.
- "When a port is assigned to a socket, the two places constitute two different views of a single place." They share one marking, one colour set, and one initial marking.
- "Substitution transitions do not have guards", and enabling and occurrence do not apply to them. Only the submodule's transitions fire.
- One module can serve several substitution transitions. "Each instance of a module has its own marking."
- "Fusion sets allow a number of places (which may belong to different modules) to be glued together into one compound place across the hierarchical structure of the model."
- "Instantiation of modules is done prior to simulation... the number of instances of modules is fixed throughout the simulation... it is not possible to dynamically instantiate new modules during the simulation" (§3.3).
- Larger industrial models "typically have up to 10 abstraction levels."

The CPN Tools manual adds a restriction: a place can join a fusion set only "if the place is neither a socket nor a port" ([cpntools.org, fusion places help](https://cpntools.org/?p=524), via search excerpt).

**Unfolding.** Yes. Port and socket are one place, and substitution transitions never fire, so the hierarchical net is a flat net drawn on several pages. Jensen's Vol. 1 has §3.5 "Equivalent Non-Hierarchical CP-nets" (p. 115). Jensen & Kristensen 2009 has §5.3 "Instance Folding and Module Parameterisation" and §5.6 "Unfolding Hierarchical CPN Models" (p. 124), plus a formal chapter with §6.3 "Instances and Compound Places". I have verified these from published tables of contents ([TOC 1](https://obalkyknih.cz/file/toc/324516/pdf), [TOC 2](https://obalkyknih.cz/file/toc/440245/pdf)), not from the text. CPN Tools "supports full state spaces for hierarchical and timed CPN models" (2007, §5).

**Drawing.** Substitution transitions are "rectangular boxes with double lines" with a submodule tag. Port places have rectangular In/Out/I/O tags. Fusion places have fusion-set tags. A module overview lists the hierarchy as an indented tree with instance counts (2007, §2.4, §3.3).

**Cost for MAPS.** The cost is low, because this is layout over the same net, and it matches the spec's "fuse named states". But it does not reduce the state space, and it cannot spawn entities. §5.3's "instance folding" sounds like the bridge to MAPS's Folding problem: several instances become one module with coloured tokens. That is a lead to read, not a verified claim.

## Open nets and module nets {#open}

**Baldan, Corradini, Ehrig & Heckel, open nets** ([TR-01-21, 2001](https://user.tu-berlin.de/lieske/tfs/publikationen/Papers05/BCEH05.pdf); journal version MSCS 15, 2005, not read).

- "An open net is a P/T Petri net with a distinguished set of places which are intended to represent the interface of the net towards the external world." An open place is an input, an output, or both. The environment may put tokens into an input place and remove them from an output place.
- Composition: "Two open nets Z1 and Z2 can be composed by specifying a common subnet Z0 which embeds both in Z1 and Z2. Then the two nets can be glued along the common part. This is permitted only if... the places of Z1 and Z2 which are used when connecting the two nets are actually open." Formally this is a pushout. It covers "both interaction through open places and synchronization of transitions"; in their example the `reserve` transition is common to both nets.
- Compositional semantics: deterministic processes of the parts that "agree" on the common subnet amalgamate into a process of the whole, and the correspondence is bijective.
- Flat form: the "closure" of an open net is an ordinary net with one extra transition per open place, producing or consuming tokens for the environment. A component can therefore be analyzed on its own, against an environment that can do anything at its interface.
- Drawing: "Places with incoming/outgoing dangling arcs are open."

**Bearing.** This is the closest formal match to "a lock-and-key mechanic published once and used in many games": the interface is declared, and gluing is checked against it. The closure also gives MAPS a way to check a published entity, such as a Keese, without the rest of the game.

**Kindler, Petri net components** ([LNCS 1248, 1997, abstract](https://www2.informatik.uni-hamburg.de/TGI/pnbib/k/kindler_e38.html); full text not read). "A component communicates with its environment via distinguished input and output places, which formalizes communication by message passing." The semantics is "fully abstract with respect to the behaviour of closed components", and "composition of components corresponds to conjunction." There are no shared transitions, so contact would be asynchronous.

**Christensen & Petrucci, modular nets** ([Computer Journal 43(3), 2000, abstract](https://www2.informatik.uni-hamburg.de/tgi/pnbib/c/christensen_s5.html)). Modules "interact via shared places and shared transitions". Invariants of the whole net can be built from module invariants. The abstract says that for state spaces "it is possible to decide behavioral properties" in a modular way, but the indexed abstract cuts off there, and I have not read the method.

**Baez & Master, open Petri nets** ([arXiv 1808.05415](https://arxiv.org/abs/1808.05415); MSCS 30, 2020). Places serve as inputs and outputs, and nets compose by gluing outputs to inputs. They give an operational semantics and a reachability semantics. I read the abstract only.

**Modular PNML** (Kindler & Weber 2001). This is an import/export module concept for the Petri net interchange format, the closest prior art to "the text form needs a way to import a design and bind its states." I could not retrieve the paper (the pnml.org PDF timed out), so this is unverified.

## Harel statecharts {#harel}

Source: [Harel, "Statecharts: a visual formalism for complex systems", Sci. Comput. Programming 8 (1987) 231-274](https://web.archive.org/web/2015id_/https://www.inf.ed.ac.uk/teaching/courses/seoc/2006_2007/resources/statecharts.pdf) (archived copy of the published paper).

**Mechanism.** "statecharts = state-diagrams + orthogonality + depth + broadcast-communication." The kernel is "AND/OR decomposition of states together with inter-level transitions, and a broadcast mechanism for communication between concurrent components."

- **Depth (OR).** Clustering is bottom-up and refinement is top-down, and "both give rise to the or-relationship between a state's substates". One arrow leaving a superstate applies to every substate. Default arrows pick the entry substate, and the H connector re-enters the last-visited substate (history).
- **Orthogonality (AND).** Two components of two and three states replace a flat diagram of six. "Two components with one thousand states each would result in one million states in the product... orthogonality is our way of avoiding it." Components can test each other's state with conditions like "in G".
- **Broadcast.** "One part generates an event... and all other parts sense it." Harel contrasts this with rendezvous, which "enforces synchronization between a single sender and a single receiver." He adds that broadcast "is not a crucial feature" and that a rendezvous version could keep "the more central concepts of depth and orthogonality."
- **Parameterized states (§6.1).** These are for states with "identical internal structure", for example "a thousand individual telephones." Harel lists them as tentative, without a final syntax or semantics, and notes that "an underlying programming language... is the best tool for specifying complex kinds of parameterization." This is MAPS's Folding problem, raised and left open in 1987.

**On Petri nets.** Harel says their drawback is "the unavailability of a satisfactory hierarchical decomposition. Consequently, there is only one level of concurrency, and the kind of high-level encompassing events that are applicable at once in many lower-level states (or places) are not naturally specifiable." He suggests "introducing depth into the definition of a place in a Petri net, with transitions connected to places on all levels."

**Unfolding.** Depth and orthogonality "can be dealt with by a translation into ordinary automata, although even there delicate problems arise". He goes on: "Defining the formal semantics of these action-enriched statecharts is quite a delicate matter", and §7 shows examples where the intended next configuration is unclear.

**Drawing.** States are rounded rectangles nested inside each other, and dashed lines split a state into orthogonal regions. Default arrows mark entry, and an H marks history. A zoomed-out view uses stubbed arrows for transitions that cross a hidden boundary. Harel wants zooming "for moving easily back and forth between levels of abstraction."

**Bearing.** The user's image of "closed verb loops around idle" is an OR-state with idle as its default. "Hurt from anywhere" is one superstate arrow. A Petri-net version of the superstate arrow needs a design choice in MAPS: a state that is marked whenever the entity is in any substate, or a superstate place that the verbs can `need`. Harel's suggestion of depth in places points the same way. I have not checked how the 430 Keese verbs in the atlas break down, so whether this is their cause is a hypothesis.

## Dormans: mission and space graphs {#dormans}

Sources: [Dormans, "Adventures in level design" (PCGames 2010)](https://www.pcgworkshop.com/archive/dormans2010adventures.pdf); [Dormans, *Engineering Emergence*, PhD thesis, UvA 2012](https://eprints.illc.uva.nl/id/eprint/2118/), chapters 5-7.

**Mechanism.** "A level generally consists of a mission and a space", and the two are best generated separately (2010). The mission is "a directed graph indicating which tasks are made available by the completion of a preceding task", which is "independent of the geometric lay-out". "The same mission can be mapped to many different spaces, and one space can support multiple different missions" (2010).

From the thesis, §5.4 and §5.5:

- **Mission graph.** A task is available, unavailable, or completed. A strong requirement (double arrow) means the prerequisite must be completed. A weak requirement (single arrow) means completed *or available* is enough. Inhibition is "a solid line that ends in an open circle". Entrances and goals are special tasks, and a goal works like a MAPS `ends` state.
- **Space graph.** It has places, locks, and game elements. "A lock... is not accessible until the player has activated or acquired the correct key or keys. A lock can be in two states: locked and unlocked." Game elements (entrance, goal, key, trigger) "are embedded within the circle of the place they are located in." The edges are path, valve (one-way; it can also be a trap or teleporter), window (can see, cannot reach), unlock, and lock.
- **Constructions.** The named constructions are pathway, open space, locked short-cut, hub, set-back, and force-ahead.
- **Linking the two.** In the Forest Temple analysis, the mission graph and space graph are drawn separately, and "the gray lines connect the corresponding fights in both graphs" (Fig. 5.19). Chapter 7 generates the space from the mission with graph and shape grammars, and §7.6 is "Example Transformation: Locks and Keys".
- **Locks and keys as mechanics (§6.6).** Dormans builds Machinations versions of lock-and-key with a dynamic engine, then adds dynamic friction (enemies that consume keys).

**Unfolding.** In the parts I read, the mission/space pair is never compiled into one executable net. The relation is a design mapping and a generation pipeline, not a fused semantics.

**Bearing.** The level as its own net, with the entity's position as a token that moves between place-states, matches the space graph. Locks as two-state places with unlock/lock arcs fit MAPS directly. Each door is a small design whose interface is "position token on either side" plus "key held". The separation also says that composing entity with level is a different relation from composing entity with entity.

## Machinations and Micro-Machinations {#mm}

**Machinations (Dormans 2012, ch. 4; Adams & Dormans 2012 not consulted).** Dormans says "just like tokens in a Petri net can move between places, resources in a Machinations diagram can move between nodes." Nodes fire in one of three modes: automatic, interactive (a player's choice), or passive (fires only when triggered by another element) (§4.2). Diagrams run in synchronous, asynchronous, or turn-based time. Artificial players run scripted choices. "Color-coding" lets one pool hold several resource types, and only matching resources flow through a connection of that color. That is a hand-drawable form of typed tokens, relevant to Folding. The 2012 tool has no embedding. Future work item 2 proposes it and gives the risk: "One of the strengths of the current framework is the level of abstraction it enforces. By allowing embedded diagrams, the focus on the larger structure might be lost" (§8.7). Dormans also criticizes Petri nets directly: they "can model a complete game with a high level of detail, but this frequently leads to quite complex diagrams which try to capture a game in its entirety. Petri nets can become the equivalent of a game's source code, and just as inaccessible to a non-programmer" (§3.6).

**Micro-Machinations** ([Klint & van Rozen, SLE 2013](https://ir.cwi.nl/pub/21923/21923B.pdf)).

- MM formalizes a subset of Machinations and "adds several new features most notably modularization." The motivation is that mirrored structure in a diagram "corresponds to code duplication", and the stated goal is "modular constructs for reuse, encapsulation, scaling views, partial analysis and testing, and embedding MM in games."
- "A type definition is a named diagram that functions as parameterized module." Internal nodes marked `in`, `out`, or `inout` "become interfaces on the instances". A `ref` is "an alias that refers to a node that is defined externally", drawn as a circle with a dashed line. Bindings are dashed arrows marked `=`. Instances nest, and the names form a namespace (`a.p`).
- Interfaces are drawn as an arrow in a node's top-right corner, pointing in, out, or both ways.
- MM adds priorities "to reduce non-determinism". MAPS reached the same answer independently for its world verbs.
- **Unfolding.** "We bind references to definitions and transform the model to core MM" before translating to Promela for Spin.
- **Cost.** "Non-deterministic choices lead to a combinatorial explosion... a state explosion in the model checker." A SimWar check stored "10.5M states of 220 bytes" in 2500 MB, ran for 56 s, and found the assertion violation. Partial analysis by limiting pool capacities is their mitigation.

**Bearing.** MM is the nearest working precedent for MAPS composition: a game-design net with typed interfaces, reference binding, nesting, a flattening step, and model checking. Its reference/binding drawing is a tested answer to how an interface looks on the page.

## What I could not verify {#gaps}

- **Jensen's unfolding and instance-folding text.** I verified the section titles (Vol. 1 §3.5; Jensen & Kristensen 2009 §5.3, §5.6, ch. 6) only from tables of contents. The book that TOC 1 belongs to is inferred from its chapter layout. I did not read the Huber/Jensen/Shapiro paper; only its abstract.
- **The CPN Tools fusion-place restriction** comes from a search excerpt of cpntools.org, not a fetched page. One search summary also said "fusion places are not supported in CPN Tools at this time". That contradicts the 2007 STTT paper, which describes fusion sets in CPN Tools, so I treat the summary as unreliable. The 2007 paper and the 2009 TOC (§5.5 "Fusion Sets") support fusion sets being present.
- **Christensen & Petrucci's modular state-space method.** I read the abstract only, and it is truncated.
- **Kindler 1997, Baez & Master 2020, and the Baldan et al. 2005 journal version.** I read abstracts only. For Baldan I read the 2001 technical report.
- **Modular PNML** (Kindler & Weber 2001; pnml.org paper). I could not retrieve it.
- **Adams & Dormans, *Game Mechanics: Advanced Game Design* (2012).** I did not consult it; the Machinations claims come from Dormans' thesis. I also did not check the current machinations.io tool for composition features; it may have added some since 2012.
- **Dormans & Bakkes 2011 (IEEE TCIAIG)** I did not read.
- **Statecharts after 1987** (Harel & Naamad's STATEMATE semantics, UML, SCXML) I did not survey; the 1987 paper is the only statecharts source here.
- **How the 430 Keese verbs in `examples/ocarina-of-time/` break down.** I did not check it, so the claim that missing superstate transitions cause the blow-up is a hypothesis.
