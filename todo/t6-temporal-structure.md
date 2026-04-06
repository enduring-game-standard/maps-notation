# T6: Temporal Structure

**Priority:** High — affects the semantics of every Verb and Arc in the notation  
**Status:** Open  
**Depends on:** T1 (needs syntax), T5 (temporal mode is a Content Schema property)  
**Blocks:** Any Score describing a real-time game, a turn-based game with simultaneous resolution, or any game that mixes temporal modes

---

## Problem

MAPS RESEARCH.md lists this as the first open question: "How to notate real-time vs. discrete turns? Simultaneity? Interruptibility?"

The nature of time in a game is a *design decision*, not an implementation detail. A turn-based stamina system and a real-time stamina system with identical States, Verbs, Marks, and guards produce entirely different experiences because of *when* and *how fast* Verbs can fire. This is a mechanical property — it belongs in the notation.

MAPS currently has no temporal semantics. Every Verb is abstractly "enabled or not," with no specification of when it can fire relative to other Verbs, how long it takes, or whether multiple Verbs can fire simultaneously.

## Why This Is Not a RUNS Concern

RUNS handles tick rates, frame timing, and execution order. Those are implementation concerns. But the *design* distinction between "you take turns" and "you act simultaneously in real time" is not about tick rates — it's about the fundamental shape of player interaction. Chess and boxing have different temporal structures, and that difference is visible in the rules (you alternate moves vs. you act continuously), not in how a computer schedules code.

MAPS must express this distinction at the *rules* level, the way musical notation distinguishes 4/4 time from 3/4 time without specifying BPM.

## The Design Space

### Discrete Sequential
Players alternate. Each turn, the active player selects from enabled Verbs. After firing, control passes. Chess, Go, most board games.

**Notation need:** Turn order, whose turn it is, when turns rotate.

### Discrete Simultaneous
All players select Verbs simultaneously, then all fire. Rock-paper-scissors, simultaneous-reveal games, some war games.

**Notation need:** Simultaneity — all selected Verbs resolve at once, potentially conflicting.

### Continuous
Verbs can fire at any time, bounded only by preconditions and possibly by cooldowns. Spacewar!, DOOM, most action games. Player-chosen Verbs compete with simulation-expressed Verbs — everything happens at once.

**Notation need:** Concurrency — multiple Verbs firing in the same "moment." No turn structure. Marks flow continuously.

### Phase-Based
Play proceeds through defined phases within a turn. Many card games: draw phase → action phase → discard phase → end turn. Different Verbs are enabled in different phases.

**Notation need:** Phase sequence, which Verbs are enabled in which phase, phase transitions.

### Mixed
Many games combine modes. A real-time exploration phase transitions to a turn-based combat phase (*Final Fantasy*). A real-time game pauses for menu-driven decisions (*Baldur's Gate*). The temporal *mode* itself is a State that changes during play.

**Notation need:** Temporal mode as a State, with transitions between modes.

## Key Design Decisions

### 1. Is temporal structure a property of the Score, the Content Schema, or individual Verbs?

Options:
- **Score-level declaration**: "This game is real-time" or "This game is turn-based." Simple, but precludes mixed-mode games.
- **Content Schema property**: Temporal mode is part of the world, not the agent's capabilities. A Content Schema declares its temporal structure, and Capability Schemas dock into it regardless of temporal mode. This allows the same Capability Schema (Link's moveset) to operate in both real-time exploration and phase-based combat.
- **Per-Verb annotation**: Each Verb declares its temporal semantics — instant, sustained, channeled, cooldown-gated. This is the most granular but risks overwhelming the notation.

Content Schema property with per-Verb annotations for special cases seems like the most productive compromise.

### 2. How to express "sustained" vs. "instantaneous" Verbs

In Spacewar!, thrust is *held* — the player holds a button and the Verb fires continuously. Fire torpedo is *pressed* — a single action that fires once. This distinction changes the mechanic fundamentally.

In Petri net terms:
- An instantaneous Verb fires once when enabled and selected
- A sustained Verb fires *repeatedly* as long as it remains enabled and selected — effectively a self-loop that the agent maintains

### 3. How to express Verb duration and commitment

In Dark Souls, attacking commits stamina and locks the player into an animation. The Verb takes time. During that time, other Verbs (dodge) are disabled. This is the "commitment" mechanic that makes the stamina system work.

Notation needs: Verb duration, mutual exclusion during firing, and possibly interruptibility (can the Verb be cancelled before completion?).

### 4. Concurrent resolution semantics

When two Verbs fire simultaneously (two players in a real-time game, or simulation Verbs firing alongside player Verbs), how do Mark conflicts resolve?

If Verb A produces `+1 health` and Verb B consumes `−2 health`, and both fire in the same moment, what's the result? Petri net theory has defined semantics for this (transitions fire concurrently if they don't compete for the same tokens), but MAPS may need to make the resolution explicit for designer readability.

## Deliverables

1. **Taxonomy of temporal modes** — discrete sequential, discrete simultaneous, continuous, phase-based, mixed — with formal definitions in Petri net terms
2. **Temporal annotation syntax** in the T1 textual format — how a Content Schema declares its temporal mode
3. **Sustained/instantaneous/committed Verb annotations** — how individual Verbs declare their temporal properties
4. **Concurrent resolution rules** — formal semantics for what happens when multiple Verbs fire simultaneously
5. **Worked examples:**
   - A turn-based game (chess or similar)
   - A real-time game (Spacewar! or similar)
   - A mixed-mode game (real-time exploration → phase-based combat)

## Open Questions

- Does "real-time" in MAPS mean anything formal, or is it simply "no turn structure — Verbs fire when enabled"?
- How does temporal structure interact with schema separation (T5)? If temporal mode lives in the Content Schema, can a Capability Schema be genuinely temporal-mode-agnostic?
- Should cooldowns be temporal annotations on Verbs, or separate Patterns (T4) that compose with Verbs?
- How does interruptibility interact with the Petri net formalism? A Verb that can be cancelled mid-firing has no clean Petri net analogue — partially fired transitions don't exist in standard Petri net theory.
