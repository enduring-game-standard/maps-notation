# EGS docs vs. MAPS: read-only report

Scope read in full: `.github` (CONTEXT, README, profile/*), `aems-schema` (INTENT, CONTEXT, README, ADR-0001..0009, verify skill), `aems-conventions` (all), `wocs-protocol/README`, `maps-library/README`, `.aems-reconcile/*`. Not read: `maps-notation`, `runs-*` (out of scope). Anything below about those repos is secondhand from the audits. Checkouts: `.github` on `reconcile-aems-intent-stacked` (5791846), aems-* on `reconcile-aems-intent`, wocs/maps-library on `main`.

## 1. What each layer is for

- **Framing.** Four independent protocols, each severing one "weld": logic/engine (RUNS), objects/server (AEMS), design knowledge/studio (MAPS), coordination/company (WOCS) (`.github/profile/README.md:9-14`; `profile/WHY.md:47-49`). "Each is useful alone; none requires the others" (`profile/README.md:14`).
- **AEMS.** Most authoritative is `aems-schema/INTENT.md` (it overrides README/glossary/ADRs, `:3`). Purpose: "a game object outlives the game and the company that made it... Physical reality is the reference implementation" (`INTENT.md:9`). Four signed claim events, three parent edges, nothing else (`INTENT.md:13-21`). "Describe AEMS as a part of RUNS or MAPS, or as data those protocols import" is forbidden (`INTENT.md:32`).
- **RUNS.** "*the game*: The plain-text source format for game logic. Not an engine" (`.github/CONTEXT.md:27-30`). A RUNS Network "is a **colored Petri net**: places = Records, tokens = field values (the colors), transitions = Processors, guarded arcs = gates" (`CONTEXT.md:186-187`). Verb/noun split "is the petri-net transition/place distinction" (`CONTEXT.md:104-105`).
- **MAPS.** "*the rules*: The design-time notation for game mechanics. The blueprint RUNS source is built from" (`CONTEXT.md:55-56`). That is the entire glossary entry. Public framing: "**design knowledge** from any studio" (`profile/README.md:11`); requires only "That game mechanics are worth writing down in a formal notation", no Nostr or other protocol (`profile/README.md:42`). WHY's diagnosis fits the owner's intent best: "Game design has no such notation in common use. The mechanics live inside executable code, inseparable from one implementation" (`WHY.md:35`).
- **WOCS.** "**purely optional for everything**... Not yet formally grilled — this is a placeholder" (`CONTEXT.md:58-63`); three events Offer/Fulfill/Ack on Lightning (`wocs-protocol/README.md:36-40`).

## 2. Everything said about MAPS

**Purpose and analogies.**
- Staff notation: "Guido's staff did not compose music, it made composition transmissible" (`profile/README.md:82`). "Notate a mechanic today with a text editor. No infrastructure" (`profile/README.md:30`).
- "comparable to Machinations diagrams or formal state machine definitions" (`profile/README.md:75`). "MAPS defines interactive grammar, not execution timing" (`profile/README.md:114`).
- "The notation describes structure and rules; it does not execute them", any game "from Pong to a 200-player MMO" (`profile/FAQ.md:65`).
- DIGS is "not used to write MAPS (which has its own notation)" (`CONTEXT.md:36-37`).

**Primitives.** State ("An observable condition"), Verb ("An available action"), Arc ("A directed transition linking States through Verbs, carrying conditions/effects"), Mark ("A quantifiable resource") (`CONTEXT.md:428-438`; `profile/README.md:77-80`). STATUS also claims a "composition hierarchy, and a small pattern library, specified" (`profile/STATUS.md:14`). Library tiers: Primitives L1, Library L2, Ecosystem L3 (`maps-library/README.md:98`). Nouns used without definition: Pattern, Score, Agent (`maps-library/README.md:12-16, 46`).

**Relation to RUNS / correspondence map.**
- `CORRESPONDENCE.md:7-9` claims to own all inter-protocol relations: "this map wins". Its stack puts MAPS on top: "MAPS notation → Design blueprint ↓ RUNS source" (`:14-16`). Table: State→Record, Verb→Processor, "Arc (with guard expressions)"→"Network wiring (guarded transitions)", Mark→Field (`:36-41`). It is "**aspirational**: no real MAPS Score has been translated" (`:43-45`). Metaphor: "MAPS is the written score, RUNS is the composition built from that score, and the compiled binary is the performance" (`:32-34`).
- `CONTEXT.md:446-457` is stronger. The correspondence is "**not canon and not highlighted**", and the encoding question, "whether a MAPS State becomes a *color*... or a *place*", is "**parked**".
- The Guard is "the RUNS implementation of a MAPS Arc condition" (`CONTEXT.md:349-350`). A Network arc "*implements*" the MAPS Arc (`CONTEXT.md:465-466`).
- The library claims Scores importing Patterns are "more readily exportable to RUNS Networks" (`maps-library/README.md:98`), and puts "Timing or sequencing" in "RUNS execution" (`:90`).

**Relation to AEMS.**
- "AEMS Entities define named roles (a sword, a key, a monster); MAPS Patterns describe the structural relationships those roles participate in" (`CORRESPONDENCE.md:58-61`).
- The conventions say the Manifestation "names the role MAPS describes — without notating the mechanic (MAPS) or executing it (RUNS)" (`aems-conventions/CONTEXT.md:71-75`).
- Mechanics are Patterns, not Entities. "The chess piece is the Entity; the L-shaped Knight move is a Pattern" (`entity-abstraction.md:22, 34-35`). "Thin AEMS layer... richer its MAPS layer" (`:113-115`).
- Agent and ability "behavior" is "owned by MAPS/RUNS" (`aems-conventions/docs/adr/0002...:53-54`). Open question on constitutive identity, "A chess Knight's identity is arguably its movement rule (a MAPS Pattern)" (`entity-abstraction.md:119-121`).
- "No AEMS layer **is** a RUNS Record or a MAPS noun" (`aems-schema/docs/adr/0003...:30-31`).

**Petri nets.** In-scope docs apply Petri nets only to RUNS. No doc calls MAPS a Petri net or a "conversation model". The nearest is the library's last line, "Small Patterns enable vast conversations" (`maps-library/README.md:104`). That MAPS primitives echo Petri structure (Mark ≈ token/marking, Arc ≈ arc) is my inference, not a doc claim.

**Players, participants, hidden information.**
- MAPS docs name no player or participant model. The library uses "Agent" vs "world" (`maps-library/README.md:41, 46`).
- Hidden information appears only in PWNS: "a mystery's revelation structure — the sequencing of acts, the dependency graph of disclosures... can be notated spoiler-abstracted, structure without payload" (`profile/PWNS.md:95`; also `:136`).
- The library excludes "Probability or variance" to keep "Patterns deterministic", and "Timing or sequencing" because "Notation is turn-agnostic" (`maps-library/README.md:90-91`).

**Other.**
- WOCS funds "MAPS pattern documentation, balance analysis, design audits, and Score notation" (`wocs-protocol/README.md:26, 161`).
- Scores signed on Nostr: "every artifact... notation scores — is cryptographically signed" (`profile/README.md:120`).
- Library governance says "Scores **SHOULD** import and extend these Patterns exactly" (`maps-library/README.md:78`). The library is "Draft / RFC 0.1.0" (`:5-6`).

## 3. Contradictions and drift about MAPS

1. **Independent vs. upstream blueprint.** "none requires the others" (`profile/README.md:14`; `CORRESPONDENCE.md:27-28`) vs "The blueprint RUNS source is built from" (`CONTEXT.md:56`) and a top-down stack (`CORRESPONDENCE.md:14-16`). The owner's "pure design abstracted from execution" fits the first. The stack diagram encodes a compile pipeline.
2. **Correspondence status.** CONTEXT says "not canon and not highlighted" and the encoding is parked (`CONTEXT.md:453-457`). CORRESPONDENCE highlights the table, and its State→Record row picks "place", which prejudges the parked question (`CORRESPONDENCE.md:38`). The profile README calls it "the term-for-term MAPS↔RUNS mapping" (`:100`). CONTEXT `:349-350` and `:465-466` assert "implements" as fact.
3. **Arc guards.** The MAPS column carries "guard expressions" (`CORRESPONDENCE.md:40`). But guards are DIGS (`CONTEXT.md:34-35`), and DIGS is "not used to write MAPS" (`CONTEXT.md:36-37`).
4. **Score metaphor.** "score → composition → performance" (`CORRESPONDENCE.md:32-34`) is internally odd, since in music the score *is* the composition. It also conflicts with staff notation making "composition transmissible" (`profile/README.md:82`).
5. **AEMS edge is wrong.** "AEMS Entities define named roles" (`CORRESPONDENCE.md:58`) contradicts conventions ADR-0002 (Entity = object-identity; role = Manifestation tags) and `aems-conventions/CONTEXT.md:71-75`. The audit flags this as "wrong" (`audit-cross-corpus.md:29`, row 15; X15 `audit-archaeology.md:125`). It is still present on the current branch.
6. **maps-notation → AEMS (secondhand).** `maps-notation/README.md:140` "defined in AEMS as an Entity (the named role `key`)" and `MAPS_TEXTUAL_NOTATION.md:737` "expects an AEMS Entity with a `key` role" are both rated wrong. `README.md:128` / `:642` on "AEMS Manifestations define" visuals is overstated. `todo/t9-maps-runs-correspondence.md:119` is drift-risk (`audit-cross-corpus.md:54-57`, rows 40-43).
7. **Nostr dependency.** MAPS needs no Nostr (`profile/README.md:42`) vs Scores signed on Nostr (`:120`). A provisional MAPS kind `30040` collides with NKBIP-01 (`audit-cross-corpus.md:104`, citing `MAPS_TEXTUAL_NOTATION.md:437, :451`).
8. **Determinism and chance.** The library bans probability (`maps-library/README.md:91`), which makes chance-based and hidden-information games unnotatable. That conflicts with the "any game" claim (`FAQ.md:65`). Determinism is a RUNS/DIGS property (`CONTEXT.md:129-133`) leaking into design notation.
9. **Behavior ownership blurred.** "behavior owned by MAPS/RUNS" (`aems-conventions ADR-0002:54`) vs MAPS "does not execute" (`FAQ.md:65`).
10. **Governance.** The library is open to proposals (`GOVERNANCE.md:17`) and versions "via RFC" (`maps-library/README.md:83`), while MAPS primitives are closed (`GOVERNANCE.md:9`). The `maps:` prefix has no stated reservation rule like `runs:` (`CONTEXT.md:237-251`).
11. **Public/private.** maps-library is PRIVATE yet linked from every nav bar (`audit-archaeology.md:159`, D5).

**Audit context.**
- The `.aems-reconcile` audits are AEMS-focused. MAPS hits are rows 15 and 40-43 plus the `30040` aside.
- They cite older `.github` line numbers. On the current branch some rows look fixed (by my reading: FAQ `:77` no longer chains MAPS→AEMS→RUNS, EGS-AI-FRAMING no longer has AEMS layer rows, WHY.md exists). Others remain (`CONTEXT.md:413-424` AEMS defs, `CORRESPONDENCE.md:58`).
- Audit-found pattern relevant to MAPS: duplicate glossaries drift. `.github/CONTEXT.md` claims to be "single source of truth" (`:4`) yet diverges from `aems-schema/CONTEXT.md` (`audit-cross-corpus.md:19`, row 5). The same risk applies to MAPS terms in `CONTEXT.md:426-438`, `profile/README.md:77-80`, and maps-notation.

## 4. Glossary MAPS must stay consistent with

- **Entity.** A signed *naming* of a concept, "a dictionary entry, not the word" (`aems-schema/CONTEXT.md:26-33`). It names object-identity (a noun, mechanic-free) (`aems-conventions/CONTEXT.md:26-37`). Never a role. Lowercase "entity" is reserved for AEMS (`.github/CONTEXT.md:96`). Avoid "entity" for MAPS agents and participants.
- **Manifestation.** A game's interpretation. It carries use-classification and role tags; it is "the pillar seam" toward MAPS (`aems-conventions/CONTEXT.md:39-47, 71-75`). Avoid "variant", "skin", "implementation" (`aems-schema/CONTEXT.md:39`).
- **Asset / State (AEMS).** A possession claim and a claimed condition. Not runtime objects; "AEMS is the shelf; RUNS is the board" (`aems-schema/CONTEXT.md:76-78`). "State" is overloaded three ways (AEMS / MAPS / object state); always qualify (`.github/CONTEXT.md:461-465`).
- **Claim.** Every event is a claim, never adjudicated (`INTENT.md:15`; ADR-0009). Truth is decided by "whoever is asked to act". Relevant if MAPS Scores are published as signed artifacts.
- **Use-classification vs object-identity** (`aems-conventions/CONTEXT.md:26-47`). Mechanics such as `consumable` or `pickup` are MAPS Patterns (`entity-abstraction.md:22`).
- **RUNS terms MAPS maps onto.** Record, Field, Processor (verb), Network (colored Petri net), Guard (thinness and totality laws), Precondition, Boundary Record, Rules vs Realization (`.github/CONTEXT.md:86-382`). "Arc" is overloaded (MAPS Arc vs Network arc) (`:466-467`).
- **Asserted vs verified; conceptual example vs reference implementation** (`CONTEXT.md:472-485`). The MAPS↔RUNS correspondence is *asserted at most*.
- **Umbrella prefix / reserved namespace.** `runs:` is governed; prefixes are never identity (`CONTEXT.md:253-268`). `maps:` needs the same decision.
- **Phonetic acronyms.** Expansions are mnemonic only (`profile/README.md:134-135`), so "Mechanics and Play Structures" need not constrain the design.
