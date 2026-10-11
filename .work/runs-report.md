# RUNS in practice: report for the MAPS redesign

Sources read in full: runs-spec (README, NETWORK_TOPOLOGY, DIGS_EXPRESSION_LANGUAGE, CONVERSION_PROCESS), runs-library/README, spacewar-runs (INTENT, todo, decisions.tsv, every `runs/*` file, `tools/runs.py` key parts), RUNS-Spacewar (CONTEXT, all ADRs, teaching/*), spacewar-c (README, grounding, synthesis, lift-playbook), `.github/profile/CORRESPONDENCE.md`. Skimmed only (headings plus grep, no RUNS/MAPS content found): spacewar-c candidate-*/rationale+compiler, trace examples, RUNS-Spacewar `.sandcastle` prompts and skills. I did not read maps-notation.

Recency: runs-spec last touched 2026-06-10. RUNS-Spacewar 2026-07-06. spacewar-c 2026-10-09. spacewar-runs 2026-10-10 (newest, the only executed RUNS).

## 1. Core data model as practiced (spacewar-runs)

Source kinds, parsed by `tools/runs.py` `load()` (runs.py:423-463):

- **type**. A numeric type. Today it is only `word`: 18-bit ones' complement, sign compare (spacewar.runs:8-11). The parser skips `type` lines (runs.py:430). The word semantics are hard-coded (runs.py:29-158).
- **enum**. Named members with no visible encoding (spacewar.runs:16-23). `match` must cover every member (runs.py:619).
- **record** `name[N]`. A struct of arrays: typed fields with initial values (`Record` dataclass, runs.py:379-384). Examples are `objects[030]` (spacewar.runs:26) and the singletons `random` and `frame`. There are no IDs. Identity is the slot index. "A Record is anything the game remembers... no separate category for global data" (INTENT.md:19).
- **stream**. An ordered output that leaves the game. `display` (spacewar.runs:66), written with `emit` (objects.runs-prim:44).
- **processor** `name(params)`. One rule. Its header is `reads:`, `writes:`, `requires:` (`Routine`, runs.py:387-396). The body has `let`, `set` (it mutates locals and Record fields in place), `if/elif/else`, `loop at most N` with `break`/`continue`/`return`, and `emit` (INTENT.md:126). Params are indices, not Records. Records are global names, gated at runtime by `Scope.check` (runs.py:753-762). Purity holds "at the boundary" (INTENT.md:20).
- **network** `name(params)`. Pure control. It can use `run`, `if`, `for i in a..b`, `match`, `loop at most N` (which needs an `if <guard>: break`), `stop`, `unreachable`, `requires:`, and the contract `reads:`/`writes:` (INTENT.md:127-128). It writes nothing. `shape()` rejects let/set/emit/return (runs.py:472-486). Guards are any expression that writes nothing (INTENT.md:21).
- **Composition.** A top Network (one nothing fires) is the whole game and must declare its boundary contract (INTENT.md:25, `check_contracts` runs.py:803-833). `frame` is the top Network and declares `writes: display` (frame.runs:12-13). Dispatch on the object's state is `network calc(slot)` with a `match` (frame.runs:49-57).
- **Execution.** `Machine.run` fires routines depth-first in declared order. Each write is visible at once (runs.py:545-561). "Concurrency... is not part of the model" (INTENT.md:102). One frame is one `run frame`.
- **Values between rules.** These go only through Records. AC/IO hand-offs become fields of `record handoff` (spacewar.runs:86-93). The only calls allowed are word operators (`rcl`, `scr`, `popcount`). Any other call is an error (runs.py:264).
- **Binding.** A second artifact maps Records to core addresses and enums to words. It holds only what play cannot observe (pdp1.py:1-11, INTENT.md:118).

Spec model, for contrast: Processor = typed `inputs:`/`outputs:`, immutable `let`, `output` exactly once (DIGS:665-669, 489-498). The Network has `requires:/produces:/state:/phases:` (NETWORK_TOPOLOGY:59-66). Phases are processor | network | dispatch(order, guarded arcs, `skip`) | iterate (NETWORK_TOPOLOGY:141-279).

## 2. Docs contradicted or abandoned by practice

1. **Sub-Processor calls.** DIGS:418-438 lets bodies call Processors (`let s = spacewar:sqrt(x)`). The library bundle `wires: mul_vec3_scalar(...)` is the same kind of call (runs-library README:117-121). This was removed in commit b6aad1a: "functions are gone" (INTENT.md:23). It is now an evaluator error (runs.py:264).
2. **Immutability and single assignment.** DIGS has immutable `let`, `output` exactly once, `with` (DIGS:474-498, 440-450). Practice uses `set` with in-place, repeated writes and early `return` (arithmetic.runs-prim:7-29).
3. **Loops.** DIGS has no break/continue/return, and `loop` is excluded (DIGS:532, 848). Practice uses `loop at most N` with break, continue and return. "Totality comes from the bound... not from forbidding break" (INTENT.md:141).
4. **Concurrency.** The spec says independent Processors are concurrent and declaration order is only canonical (NETWORK_TOPOLOGY:29, 283-313). Practice is strictly sequential. Moving collisions into their own phase, as the spec's own Spacewar example does (NETWORK_TOPOLOGY:326-339, 645-647), changed 294 of 300 frames (decisions.tsv:11; INTENT.md:100).
5. **Network grammar.** requires/produces/state/phases/dispatch/arcs/skip/iterate is replaced by structured control: run/if/for/match/loop/stop. Nested `for` is used (frame.runs:32-38). The spec bans nested iterate (NETWORK_TOPOLOGY:279). A data-dependent, bounded-exit loop is close to the excluded `until_converged` (NETWORK_TOPOLOGY:278, 540).
6. **Records.** "Generic containers (entities) with IDs" (README:38) became anything remembered, globals included, with slot identity and no IDs. The spec passes Records as args, with `.` as the current entity (NETWORK_TOPOLOGY:213-237). Practice passes `slot` and names Records globally.
7. **Boundary.** `requires:/produces:` blocks that are fresh each tick (NETWORK_TOPOLOGY:61-66) became a top-Network `reads:/writes:` contract plus `stream`. Neither exists in the spec. Presentation used to mean "opaque runtime bundles" (README:42). It is now decided "by what its effects reach" (INTENT.md:31-50), and presentation code stays in place in a verbatim port (INTENT.md:50).
8. **Faults.** A precondition violation is undefined behavior (DIGS:673). Practice: halts and hangs are rules, and a failed `requires` means the port is wrong (INTENT.md:64).
9. **Memory.** DIGS excludes pointers and allocation (DIGS:851). Practice states the layout in the text where play reads it and ports the game's own allocator (INTENT.md:52-62, 154).
10. **Types.** `fixed18` with `binary_point` (DIGS:205-219) is replaced by `word` with `bits/complement/compare`. The binary point is documentation only (arithmetic.runs-prim:4-6).
11. **Status claims are stale.** "No parser, no evaluator" (runs-spec README:5) and "there is no DIGS evaluator" (RUNS-Spacewar ADR-0016:10) are both out of date. `tools/runs.py` exists and is graded against SIMH: 65,536/65,536 for sqrt, 12,000/12,000 for the calc routines, 1,500/1,500 frames (INTENT.md:162-171).
12. **CONVERSION_PROCESS.md.** It was explicitly ignored (decisions.tsv:3). ADR-0016:73 says it "has since been removed", but it is still tracked in runs-spec. It cites artifacts that do not exist (24 Processors, a PICO-8 runtime).
13. **Mark mapping conflict.** Marks map to Annotations (NETWORK_TOPOLOGY:662, DIGS:927) but to Field in CORRESPONDENCE.md:41. Library:196 says "MAPS States and Verbs target Library Fields."
14. **Unused spec features.** `source:` AEMS annotations (NETWORK_TOPOLOGY:118-135), dispatch `order:`, guard-exclusivity warnings, and Tier-2 `hints:` (runs-library:150-174) are not used.
15. **What "Petri" means in practice.** It means only bipartite place/transition data flow. There are no tokens, markings or enabling. Firing is driven by Network control flow (inference from runs.py `Machine`).

## 3. Every MAPS mention in the RUNS corpus

| Location | Claimed correspondence |
|---|---|
| runs-spec README:41 | Guarded Arcs "mirror MAPS notation, where Arcs carry guard expressions" |
| runs-spec README:81 | Guarded Arcs are "the RUNS implementation of MAPS guard expressions" |
| runs-spec README:121 | design-to-implementation. MAPS is the blueprint and RUNS is the source. The mapping is owned by CORRESPONDENCE |
| runs-spec README:150 | "RUNS source implements MAPS Scores" |
| NETWORK_TOPOLOGY:656-662 | States→Records, Verbs→Processors, Arcs→Networks, Marks→Annotations |
| NETWORK_TOPOLOGY:675-677 | Network arcs with guards implement MAPS arc guards. A MAPS Score is the blueprint and a Network is its wiring |
| DIGS:18, 921-927 | MAPS = "how rules are DESIGNED". Same diagram as NETWORK_TOPOLOGY |
| runs-library:184-186, 196 | Library Fields are the shapes MAPS States/Verbs target |
| CORRESPONDENCE.md:36-45 | State↔Record, Verb↔Processor, Arc (guards)↔Network wiring, Mark↔Field. Labeled "**aspirational**: no real MAPS Score has been translated" |

Neither spacewar-runs, RUNS-Spacewar nor spacewar-c mentions MAPS. "Place/transition/token" vocabulary appears only in RUNS itself: CONVERSION_PROCESS:165 ("Processors are transitions and Records are places; tokens never move transition-to-transition"), INTENT.md:23 and 102, and runs.py:7. No document maps a MAPS place, transition or token to anything.

## 4. What MAPS should hand to RUNS (inference)

These are inferences from the practice above. None of them is tested.

- **Refinement, not a term table.** The handoff should be a refinement relation, not term-for-term. One design rule becomes several Processors, a hand-off Record and a Network. For example, hyperspace exit is 11 runs plus `handoff` fields (objects.runs:44-58). MAPS should give each element a stable identity that RUNS elements trace to. House rules need that identity (INTENT.md:15).
- **State inventory.** Hand off named state with cardinality bounds (fixed collections), the enum-valued state that dispatch reads, and initial conditions. Leave numeric representation, layout and binding to RUNS, because RUNS owns exactness (INTENT.md:52-62).
- **Rules as read/write sets.** Each MAPS rule should declare what state it reads and writes. This is the only Processor contract RUNS keeps (INTENT.md:13). MAPS should not hand off expressions or bodies.
- **Ordering is gameplay.** RUNS fires sequentially, and order changed 98% of frames. MAPS must either state the order and per-entity iteration rules, or mark them as free choices for RUNS to fix. Token-style nondeterministic enabling does not map onto RUNS execution.
- **Guards.** Guards are side-effect-free predicates over state, which matches RUNS directly (INTENT.md:21). Choice should be exhaustive over an enum, matching `match` coverage (runs.py:619).
- **Boundary.** Declare inputs (controls, clocks, power-on values) and outputs (streams). Classify each one as gameplay or presentation by what its effects reach (INTENT.md:31-38).
- **Shared randomness is state.** A draw from a shared RNG is a rule even inside presentation (INTENT.md:44-46).
- **Terminal states.** Halts and hangs are design outcomes, not errors (INTENT.md:64).
- **Verification vocabulary.** MAPS state names could share the address-free Portable Oracle field vocabulary (RUNS-Spacewar ADR-0015:9-13), so design, source and oracle grade field-for-field.
