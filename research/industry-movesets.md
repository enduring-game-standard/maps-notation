# Character movesets in industry practice

Answers issue #17. Map: issue #3. Feeds issue #14, "A coherent design for the notation".

Question: how do developers diagram a character's moveset and the circumstances that allow each move? For each practice: how it nests, how it shows what is allowed where, and how it keeps a large moveset readable.

## Summary: what bears on the coherent design

1. **Everyone separates "what the character is doing" from "what is true about the character".** Engines keep one active state per state machine and gate transitions on side values: Unity *parameters* tested by *conditions*, all of which must hold; Unreal *transition rules*. Unreal's Gameplay Ability System makes the gate explicit as tags: an ability has *Activation Required Tags* (all present), *Activation Blocked Tags* (none present), and *Activation Owned Tags* (granted while it runs). Those are MAPS `need`, `unless`, and a `take`/`give` pair, almost word for word. Link's recurring conditions (targeting, hands, shield, medium, age, gear) are this kind of thing: marked states that verbs need or are blocked by, not stances of their own.
2. **Nesting is collapse, with explicit boundary crossings.** A Unity sub-state machine collapses a group of states into one named node; inside, an *Up* node stands for the outside world, and arcs into the group must name a state inside it. Unreal nests further: every state holds its own graph, which can hold another state machine. Neither engine nests for meaning. Both nest so a group can be folded away. That fits MAPS groups if a group can fold to one node and the arcs that cross its border stay drawn.
3. **Concurrent concerns live in parallel layers, not in a product of states.** Unity animation layers (upper body throws while lower body walks), Unreal *Layered blend per bone*, and Swink's Figure 7.18 all keep independent concerns side by side. Swink's figure draws air/ground, left/right, and run as overlapping regions, then lists the ten combined states on the side to show what the overlap saves. Link's three idles crossed with hands, medium, and age is the same blow-up. A layered MAPS drawing should show each condition once, as its own lane, rather than multiplying stances.
4. **Shared fan-in gets a shorthand, not a thicket.** Unity *Any State* is one transition from every state. Unreal *state aliases* draw a stand-in for a set of states "to reduce line clutter", and *conduits* are many-to-many junctions with shared rules. Both are answers to SPEC.md's lesson 5 ("X to move" connects to 9 verbs). The MAPS analog is a state drawn more than once (an alias of one place), which keeps the net unchanged and only changes the picture. Unreal warns that a global alias suits "single-frame input and finite-duration states", so the shorthand has limits.
5. **Same structure, different content, is a first-class idea.** Unity's *Animator Override Controller* keeps "structure, parameters, and logic" and swaps the clips (goblin, ogre, elf). Lyra gives every weapon a child of one base linked-layer Animation Blueprint. For MAPS that is the folding problem again: one verb shape, many fillings (child and adult, each weapon), drawn once.
6. **At scale, fighting games abandon graphs for tables and prefixes.** Tekken notation writes every condition as a prefix on the move: `WS.` while standing, `FC.` full crouch, `BT.` back turned. The community wiki rules that Rage, meter, Heat, and a successful parry are "notated as if they were" stances. Guilty Gear Strive frame data has a gatling table: one row per move, one column per button listing the follow-ups, plus a *Cancel* column of move classes (Jump, Forward Dash, Special, Super). Street Fighter 6 frame data puts cancel rights in one field of class codes (`Chn`, `TC`, `Jmp`, `Sp`, `SA`, `SA3`). The fighting-game lesson is that a cancel goes to a *class* of verbs, not to each verb. In MAPS terms that is one state ("cancel window: special") that a whole family of verbs needs.
7. **Priority resolves one input with several meanings.** Unreal chooses "the one with the smallest priority" when several transitions are true. Unity fires one transition at a time and orders interruptions. Ocarina's handler lists are priority lists. MAPS gives priority only to world verbs. A moveset where one button means different verbs in different circumstances needs either fully exclusive `need`/`unless` arcs or a way to order seat verbs. #14 has to pick one.
8. **Readability is a design property, not only a layout one.** Swink: a state change is fine "as long as the player has a way to conceptualize" it, and Tony Hawk's Underground (six states, twelve buttons, chords) is his case of *state overwhelm*. Counting states and how each remaps the inputs is one of his comparison metrics. A notation built to compare designs at a glance should make that count visible, for example inputs as rows and stances as columns.

What I could not verify is listed at the end.

## 1. Unity Mecanim (Animator Controller)

**Model.** An Animator Controller is a set of layers. Each layer holds one state machine. A state plays a motion, which can be a clip or a blend tree. Transitions join states and fire on conditions over named parameters.

**What is allowed where.**
- A transition "can have a single condition, multiple conditions, or no conditions at all", and "the conditions must all be met before the transition is triggered". A condition is a parameter, an optional predicate, and a value. With *Has Exit Time* on, conditions are checked only after the state's normalized exit time. Unity can "only activate one transition at a given time"; *Interruption Source* and *Ordered Interruption* control which transitions may cut in. ([Unity Manual: Transitions](https://docs.unity3d.com/Manual/class-Transition.html))
- *Any State* "represents all states", and "adding a transition from Any State is an efficient way of adding the same transition from all states". It can't be a destination and can't be the default state. The default state, shown in brown, is where the machine starts. ([Unity Manual: State](https://docs.unity3d.com/Manual/class-State.html))
- OR between conditions is written as two parallel transitions. The transitions page does not say this outright; it is my inference from the AND-only rule.

**Nesting.**
- Sub-state machines "collapse a group of states into a single named item in the state machine diagram". Entering one, "you have to choose which of its states you want to connect to". Inside, the *Up* node represents "the 'outside world'", and leaving prompts for "one of the states of the enclosing machine". ([Unity Manual: Sub-State Machines](https://docs.unity3d.com/Manual/NestedStateMachines.html))
- *Entry* and *Exit* nodes let a sub-state machine be entered as a unit: "the entry node will be evaluated and will branch to the destination state according to the conditions set", and transitions can go "from one statemachine directly to another statemachine". ([Unity Manual: State Machine Transitions](https://docs.unity3d.com/Manual/StateMachineTransitions.html))

**Parallel concerns.**
- "Unity uses Animation Layers for managing complex state machines for different body parts", for example "a lower-body layer for walking-jumping, and an upper-body layer for throwing objects / shooting". A layer is *Override* or *Additive*, and an avatar mask "specifies the body parts on which to apply the animation". ([Unity Manual: Animation Layers](https://docs.unity3d.com/Manual/AnimationLayers.html))
- A *synced* layer "does not have its own state machine definition at all"; it reuses another layer's machine with different clips, as in a "Fatigued" layer. (Same page.)
- An *Animator Override Controller* overrides clips "while retaining the structure, parameters, and logic" of a base controller, so a goblin, an ogre, and an elf share one machine. ([Unity Manual: Animator Override Controller](https://docs.unity3d.com/Manual/AnimatorOverrideController.html))

**Continuous variation.** A blend tree is a special state that mixes similar clips by a numeric parameter (walk to run by speed), in 1D or 2D. A transition switches motions over a set time; a blend tree varies one motion continuously. ([Unity Manual: Blend Trees](https://docs.unity3d.com/Manual/class-BlendTree.html))

**Readability.** Unity's own advice: without sub-state machines the diagram becomes "large and unwieldy"; "you can simplify things somewhat just by separating the groups of states visually with empty space", and collapsing is the stronger fix. ([Sub-State Machines](https://docs.unity3d.com/Manual/NestedStateMachines.html))

## 2. Unreal Engine (AnimGraph, state machines, abilities)

**Model.** "State Machines are subgraphs within the Anim Graph." A state outputs a pose, and "states themselves contain their own Anim Graph layer", so a state can hold another state machine. "All State Machines begin with an entry point." Transitions are "single-direction". The documented example is idle and run linked both ways, with idle as default. ([Unreal: State Machines](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-machines-in-unreal-engine))

**What is allowed where.**
- Each transition has a rule graph returning true or false. "If multiple transitions are true at the same time, the one with the smallest priority is chosen." A rule graph can be shared: "editing the graph for one transition affects all others". A transition can also fire automatically when the source animation nears its end. ([Unreal: Transition Rules](https://dev.epicgames.com/documentation/en-us/unreal-engine/transition-rules-in-unreal-engine))
- *Conduits* "can be used to create 1-to-many, many-to-1, or many-to-many transitions" and "serve as a more advanced and shareable transition resource". *State aliases* exist "to reduce line clutter, consolidate transitions, and improve the readability of your graph"; aliased states "share the same transition rules and properties". A *Global Alias* "is best used in a limited way with single-frame input and finite-duration states". ([State Machines](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-machines-in-unreal-engine))
- Lyra's locomotion machine uses aliases, for example a *JumpSources* alias that names which states may go to Jump. ([Unreal: Animation in Lyra](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-in-lyra-sample-game-in-unreal-engine))

**Gameplay abilities: the design-level gate.** The Gameplay Ability System sits above animation and decides which moves may start. Each ability carries tag lists. ([Unreal: Using Gameplay Abilities](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-gameplay-abilities-in-unreal-engine))

| GAS property | Doc wording | MAPS reading |
|---|---|---|
| Activation Required Tags | "can only be activated if the activating Actor or Component has all of these Tags" | `need` arcs |
| Activation Blocked Tags | "can only be activated if ... does not have any of these Tags" | `unless` arcs |
| Activation Owned Tags | "While this Ability is executing, the owner ... will be granted this set of Tags" | `give` on start, `take` on end |
| Block Abilities With Tag | "Prevents execution of any other Ability with a matching Tag while this Ability is executing" | a state the blocked verbs carry `unless` on |
| Cancel Abilities With Tag | "Cancels any already-executing Ability with Tags matching" | a world verb that ends the other ability |
| Target Required / Blocked Tags | the same tests on the target | `need` / `unless` on the target's states |

The right-hand column is my mapping, not Epic's. It shows that a shipped engine already writes moveset permissions as presence and absence of marks, which MAPS draws directly.

**Parallel concerns and swaps.**
- *Layered blend per bone* blends a montage "starting from the spine_01 bone", so the character can "run around and shoot at the same time"; montages play through named *slots*. ([Unreal: Using Layered Animations](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-layered-animations-in-unreal-engine))
- Linked anim layers enable "dynamic switching between different sub-sections on the Animation Graph". In Lyra, "every weapon has a Child Animation Blueprint that inherits from the ABP_ItemAnimLayersBase", for example *ABP_PistolAnimLayers*. ([Animation in Lyra](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-in-lyra-sample-game-in-unreal-engine))
- Blend spaces plot animations on one or two axes (speed and direction) and blend by input. They are referenced as "a base layer, with secondary animations proceeding from it". ([Unreal: Blend Spaces](https://dev.epicgames.com/documentation/en-us/unreal-engine/blend-spaces-in-unreal-engine))

**Where hand-built graphs stop scaling.** At GDC 2016 Simon Clavet (Ubisoft Montreal) presented motion matching for *For Honor*. Secondary coverage reports his argument that animation state machines had grown "so large and complex" that they were hard to manage, and his remark that it is "sad to ask an animator where the start animation ends and where the loop begins" ([Game Developer, Delannoy 2017](https://www.gamedeveloper.com/programming/most-inspiring-game-animation-tech-talks-of-2016)). That pressure applies to the pose layer. The choice of which moves are available stays rule- or tag-based. I could not reach the GDC Vault page for the talk itself (the vault was in maintenance).

## 3. Fighting games: move lists, notation, cancel tables

Fighting games keep movesets readable at a size no engine graph tries: dozens of moves per character, each with frame-level cancel rights. Their tools are text and tables.

**Numpad notation** (2D games). Directions are numpad digits with the character facing right, `5` is neutral, and buttons are capital letters. Prefixes give the circumstance: `j.` jumping, `c.`/`f.` close or far. Sequence marks separate kinds of follow-up: `>` proceeds to the next move, `,` is a link ("brief pause for recovery"), `->` or `~` cancels a special into a follow-up, and `jc`, `dc`, `adc` name jump, dash, and air-dash cancels. `[X]` is hold, `]X[` release, `(move)` optional, `CH` counter hit. ([Dustloop: Notation](https://www.dustloop.com/w/Notation))

**Tekken notation** (3D games). Buttons are limbs `1`-`4`, directions are letters (`d/f`, `df`), and capitals mean a held direction. A circumstance is a prefix with a dot: `WS.` while standing, `FC.` full crouch, `BT.` back turned, `SS` sidestep, `J` jumping, `H` during Heat, `R` Rage, `P` after a successful parry. The style rule is explicit: "Stances in this context are anything that gives access to new moves. While things like Rage, Meter, Starburst, or a successful parry might not be considered stances, they are notated as if they were." Character stances get their own codes with an entry input (Devil Jin's `FLY` from `3+4`). Move properties are suffixes and frame codes: `i10` active on frame 10, `js9` jumping state from frame 9, `r24 ZEN` recovery into a stance, `h/m/l` hit level. Spacing carries meaning: no spaces inside a string, so that "readers can better gauge the flow of a combo at a glance by the spaces". ([Wavu Wiki: Notation](https://wavu.wiki/t/Notation))

**Guilty Gear Strive gatling tables.** Dustloop's frame-data pages give each character separate *Ground Gatlings* and *Air Gatlings* tables. Columns are `P`, `K`, `S`, `H`, `D`, `Cancel`. Each row is a move, each button cell lists the moves it chains into, and `-` means none. Sol Badguy's `c.S` row reads P `6P`; S `f.S, 2S, 6S`; H `5H, 2H, 6H`; D `5D, 2D`; Cancel `Jump, Forward Dash, Special, Super`. His `5P` row ends `Special, Super`. The frame-data table beside it lists Startup, Active, Recovery, On-Block, On-Hit, Guard, Invuln, and more. ([Dustloop: GGST Sol Badguy frame data](https://www.dustloop.com/w/GGST/Sol_Badguy/Frame_Data))

**Street Fighter 6 cancel field.** SuperCombo's SF6 move template defines `cancel` as "Move's cancel ability; Chn = chain, TC = target combo, Jmp = Jump, Sp = special, SA = any super, SA(N) = Super Art N". Ryu's `5LP` has `cancel = Chn Sp SA` and the note "Chains into 5LP/2LP/2LK"; `5MP` has `Sp SA`; many specials have `SA3` or `SA2 SA3`. ([SuperCombo: SF6 Ryu data](https://wiki.supercombo.gg/w/Street_Fighter_6/Ryu/Data), page wikitext read through the MediaWiki API)

**How they nest and stay readable.**
- Nesting is a single level: a prefix (stance or resource) on a move name. Deeper structure is a chain of prefixes and follow-ups in a string (`f+3,F~2` goes into `FLY`, then `FLY.2`).
- Permission to follow up is written on the *source* move as a list of *classes* (Special, Super, Jump), with exceptions written as notes. A cancel table is a sparse adjacency matrix drawn as a grid, which avoids drawing every edge.
- Timing is part of the permission (link versus cancel, active frames, recovery), so the tables carry frame counts beside the cancel rights.

## 4. Swink, *Game Feel* (2009)

Swink models avatar states as changes in how input is read: "States are artificially constructed changes in circumstance that modify the meaning of incoming signals" (p. 130). His diagrams are small and few.

- **Figure 7.18** (p. 131), "Overlapping states provide additional expressivity": a Venn diagram. A horizontal line splits AIR from GROUND, two circles LEFT and RIGHT overlap, and a RUN bar crosses the middle. Beside it he lists the ten combined states (AIR, AIR RIGHT, ... GROUND RUN LEFT). The picture shows independent conditions once each and leaves the product to the list.
- **Figure 13.17** (p. 220), "States in Mario—stuck and dead are special cases": a hand-drawn graph, IDLE to WALKING, RUNNING, JUMPING, WALKING to RUNNING and JUMPING, no labels on arrows. He defines a state as "a specific set of instructions about how the game will respond to input" and adds that "as long as the relationships are maintained, the implementation is more or less irrelevant".
- **Super Mario 64** (ch. 15, pp. 247-275) has no moveset diagram. Its figures are input, steering, and jump-envelope curves (Figs. 15.1-15.15). The moveset is prose organized by state and button: "When in the air state, the Z-button ... triggers the 'ground pound'"; "From this sliding state, the A-button input triggers the Long Jump"; the Dive Attack "can be triggered from any jump except the Triple Jump and Long Jump". The Wall Kick gets a bullet list of five conditions that must all hold (speed, air state, wall contact within 20 ms, stick pulled away, A) (pp. 260-262). That is a conjunction of `need` arcs in prose.
- **Tony Hawk.** "As many as six separate states, each of which assigns a different value to each button" (p. 131). Under *State Overwhelm* (p. 298), the skater's air, ground, manual, runout, grinding, and lip-trick states times 12 buttons plus chords mean "there are literally dozens of moves mapped to each button", and "when the player does not perceive the state change, inputs begin to feel random".
- Swink proposes cataloging "whether or not the avatars have different states", "how many states do they have and how do the different states cause different input signals to be interpreted" as a comparison metric (p. 131).

I read the book through the Internet Archive scan (`archive.org/details/game-feel`), using the OCR text and page images for pp. 130, 131, 219, and 220. Page numbers are the printed ones.

## 5. Cross-cutting comparison

| Practice | Unit drawn | Nesting | "Allowed where" | Scale tactics |
|---|---|---|---|---|
| Unity Mecanim | state node, transition arrow | sub-state machine with Up, Entry, Exit | AND of parameter conditions on each transition; Any State | layers with masks, synced layers, override controllers, whitespace, collapse |
| Unreal AnimGraph | state, transition, conduit, alias | state contains its own graph | boolean rule per transition, smallest priority wins, shared rules | aliases, conduits, linked anim layers, layered blend per bone |
| Unreal GAS | ability with tag lists | none (tags are flat, hierarchical names) | required, blocked, owned, block-others, cancel-others tags | tags shared across abilities instead of edges |
| Fighting-game wikis | text line per move; grid per character | stance prefix, one level | prefix for circumstance; cancel classes on the source move | tables, class codes, fixed spacing rules |
| Swink | Venn of conditions, small state graph, prose | none | prose and condition lists per state | counts states; warns about state overwhelm |

Patterns across all five:

- **Two kinds of state.** An *activity* (what the character is doing; one at a time per layer) and a *condition* (a fact that persists and gates: targeting, held item, meter, Rage). Engines draw activities as nodes and keep conditions off the graph as parameters or tags. MAPS can draw both as places, which is its edge, but the coherent design should give the two kinds a visual difference.
- **Gates attach to the move, not the edge, at design level.** Animation graphs gate edges. GAS and fighting-game tables gate the move itself (required tags, stance prefix, cancel class). A MAPS verb with `need`/`unless` arcs already matches the design-level form.
- **Classes beat enumerations.** "Cancel into Special", "Block Abilities With Tag", and Any State all say one thing about many targets. MAPS's open folding problem is the same need.

## Could not verify

- Capcom's official SF6 frame-data and command-list pages (`streetfighter.com/6/character/ryu/frame`) returned 403, so I could not confirm Capcom's own cancel legend. The SF6 codes above are SuperCombo's.
- The official Tekken in-game command list format: not checked. The Tekken notation above is the Wavu Wiki community style guide, which says off-wiki sources may differ.
- GDC Vault was in maintenance. Clavet's motion-matching claims come from secondary coverage, not the talk.
- Harel's statecharts (1987), the formal source of hierarchy plus orthogonal regions that Unity layers and sub-state machines resemble, was not retrieved (publisher 403, author PDF failed). I make no claim from it.
- The Unity transition page does not state OR semantics. "OR is parallel transitions" is my inference.
- No developer-published moveset *design* diagram (as opposed to an engine graph or a community table) turned up. That absence was not searched exhaustively.
