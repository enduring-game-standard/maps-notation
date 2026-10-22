# ovl_Boss_Fd

Reviewer: Claude Sonnet 5.5

Spec reviewed: `studio/tools/ocarina/data/actors/boss_fd.ts` (carries the flying body from `z_boss_fd.c` and the head phases from `z_boss_fd2.c`). Decomp paths below are relative to `src/overlays/actors/` unless they start with `src/`.

## Verdict

major findings

## Findings

1. **Head phases, "three pops" (`headPhases`/`headSteps`, `h_*_emerge_k`, the `after()` step citing `ovl_Boss_Fd2/z_boss_fd2.c:399-404`).** Severity: major.
   Spec: every head turn has exactly three pops (hole counter, line 270) before the body flies, in every band.
   Code: the pop counter `FD2_HOLE_COUNTER` is incremented in Emerge state 0 (`ovl_Boss_Fd2/z_boss_fd2.c:270`) on every entry, and a fakeout re-enters state 0 (`:291-297`), so each fakeout counts as a pop. The fakeout count is read from Volvagia's current health in `BossFd2_SetupEmerge` (`:235-243`): 0 at health 18 or more, 1 at 12-17, 2 at 6-11, 3 below 6. Flight starts at the first burrow end where the counter is 3 or more and health is under 24 (`:399`). Walking the code gives:
   - health 18-23: 3 real emerges;
   - health 12-17: 2 real emerges;
   - health below 12: 1 real emerge.
   Band B (health 4) and band C (health 2) always have 1 real emerge, and band A (6 or more) mixes 3, 2 and 1. The spec gives 3 attack-and-hammer windows per head turn in every band, which overstates how often the head claws, breathes, and can be hammered in the low bands.
   The counter is reset by `BossFd2_Wait` (`:824`), so the head turn really does start from 0 each time; only the fakeout accounting is missing.

2. **Rocks (`f_*r_rocks`, attack `rock`, step cite `z_boss_fd.c:1379`).** Severity: major.
   Spec: rocks fall only in the rocks phase (150 frames, `z_boss_fd.c:670`), as a self-loop on `f_*r_rocks`.
   Code: `BFD_ROCK_TIMER` is set to 300 at each ceiling bounce (`z_boss_fd.c:696`) and decremented in `BossFd_Update`, which spawns a rock every 16 frames while it runs (`:1376-1381`). `BossFd_Update` runs whatever the action state, so the timer keeps counting after the rocks phase ends (`:703`). Up to 300 frames (15 beats) of rocks follow the last bounce, through the dive (`f_*_dive`), the underground wait (`f_*_burrow`), and into the start of the next head turn. The spec lets rocks fall only in `f_*r_rocks`.

3. **Contact damage is not gated to the modeled steps (attacks `claw`, `body`; steps out of `h_*_idle_k`, `f_*c_chase`).** Severity: major.
   Spec: the head hurts Link only through the claw step (idle to strike, near) and the emerge knockback. The body hurts Link only in the chase, near.
   Code (head): `BossFd2_Update` sets `disableAT = false` every frame (`ovl_Boss_Fd2/z_boss_fd2.c:981`) and registers the AT collider unless `disableAT` is set (`:1006-1008`). Only `BossFd2_Vulnerable` (`:547`) and `BossFd2_Damaged` (`:604`) set it. The 8 AT elements (32 damage, `z_boss_fd2_colchk.inc.c:18-95`) are therefore live in idle, breathe, burrow and emerge too. `BossFd2_ClawSwipe` does not turn AT on; its collision code only plays a sound on an AT hit (`:833-841`). So `claw` is a standing hurtbox, not a step that only the idle-to-strike near step delivers. In `h_*_idle_k` and the other unhittable-by-Link phases, near Link takes no damage in the spec.
   Code (body): `CollisionCheck_SetAT` runs every frame while the state is below DEATH_START (`z_boss_fd.c:1339-1345`), so the 16-damage body AT (`z_boss_fd_colchk.inc.c:7-205`) is also live in `f_*_rise` and `f_*_dive`. The spec delivers `body` only from the chase.

4. **Hammer floor on the hidden face (`hidden()` overrides, bands B and C).** Severity: minor.
   Spec: the hammer takes 2 in bands A and B (health 4 to 2) and 0 in band C, with cite `z_boss_fd2.c:857/859`.
   Code: `health -= 2`, then `if (health <= 2) health = 1` (`ovl_Boss_Fd2/z_boss_fd2.c:857-860`). A hammer from 4 leaves health 1 (not 2), and a hammer from 2 leaves 1 (not 2 or 0). The `<= 2` test runs on the result, so band B is clamped as well as band C.
   In the adult kits the result is the same, because every adult sword hit does 2 or more and kills from either 1 or 2. It would differ for a 1-damage hit (Kokiri sword, child only).

5. **Colchk cite in the header comment.** Severity: minor.
   Spec comment: "Damage types the head's AC element accepts (0xFFCDFFFE, colchk line 7)".
   Code: line 7 is the AT info (`{0xFFCFFFFF, NONE, 0x10}`). The AC mask is on line 8: `ovl_Boss_Fd/z_boss_fd_colchk.inc.c:8` (same for `ovl_Boss_Fd2/z_boss_fd2_colchk.inc.c:8`). The mask excludes `DMG_DEKU_NUT` (bit 0), `DMG_MAGIC_FIRE` (bit 17), `DMG_SHIELD` and `DMG_MIR_RAY` (bits 20, 21), which matches the `ALL` list.

6. **C5 ledger, `actionFuncs`.** Severity: minor.
   Spec: `BossFd_Fly` maps to the glob `f_*`, and `BossFd_Wait` to `h_*`.
   Code: `BossFd_Fly` also holds the intro cutscene (`z_boss_fd.c:320-565`, introState set to `BFD_CS_WAIT` at `:210`) and the whole death sequence: DEATH_START, SKIN_BURN, BONES_FALL, SKULL_PAUSE, SKULL_FALL and SKULL_BURN (`:730-928`). `BossFd_Wait` also handles `FD2_SIGNAL_DEATH` (`:1063-1073`). AUTHORING.md says to exclude death and cutscene code with a reason. The glob lumps it into the fight phases with no exclusion and no list of the `BOSSFD_*` states the switch at `:573` runs. The `BossFd2_*` functions are ledgered in `boss_fd2.ts`, so only the body's states are at issue.

7. **Chase fire breath has no pacing (`f_*c_chase`, step `fire_breath`, cite `:718`).** Severity: minor.
   Spec: a self-loop step with no timer and no weight, so breath can land every beat of the 15-beat chase.
   Code: the breath fires only when `timers[0] % 64 == 0` and the body is facing Link (`z_boss_fd.c:715-719`), so at most 5 times in 300 frames. The effect that hurts Link also has a 50-frame cooldown (`:1495-1496`, `timers[3] = 50`). The model reads that as a cooldown of 3 beats, not none.

8. **Chase exit conditions (step `f_*c_chase` to `f_*c_dive`).** Severity: minor.
   Spec: the chase ends after its timer (cite `:723`) or on a hit.
   Code: it also ends when Link's y is under 70 (`z_boss_fd.c:721-722`). Not modeled.

9. **Head idle times by health (`idle` in `headPhases`).** Severity: minor.
   Spec: band A uses 40 frames (`z_boss_fd2.c:342`).
   Code: idle is 50 at health 24, 40 at 12-23, 30 at 6-11, 20 below 6 (`ovl_Boss_Fd2/z_boss_fd2.c:339-348`). Band A also covers 6-11, where idle is 30. The emerge and hole times (`holeTime` 30/25/20/10/5, `:273-283`; the 20-frame start after a flight, `:823`) are not modeled either, and the emerge phase uses 10 throughout (`:232`).

10. **Strike to burrow cite covers only the claw (steps `h_*_strike_k` to `h_*_burrow_k`, cite `z_boss_fd2.c:532`).** Severity: minor.
    Line 532 is the claw's `SetupBurrow`. The breath path ends at `:432`. The step has no range, so one cite stands for both.

## Checked

- Body health 24 at `z_boss_fd.c:231`. The head's AC element does `health -= 2` (`:1303`), an extra 2 for `DMG_ARROW_ICE` (`:1304-1306`), and the floor `<= 2` sets health to 2 (`:1307-1308`). That agrees with `flyHit` for bands A, B and C, including an ice arrow from 4 landing on 2.
- The flying head is hit by any type the mask admits, and a hit starts `BFD_DAMAGE_FLASH_TIMER` (`:1310`), which ends the chase (`:721-725`). The spec's chase-to-dive on a hit is correct. `rise`, `rocks` and `dive` do not read the flash timer, so they hold on a hit.
- Flight parity: flight 1 is the chase (odd, `:607-609`), flight 2 is the ceiling (`:615`), and the head turn leading to a flight takes the same parity. The spec's `c`/`r` alternation and `OTHER_PAR` follow the code.
- Chase 300 frames (`:610`), rocks phase 150 frames (`:670`), dive 20 (`:600`), underground wait 150 (`:627`), rise 50 (`:654`).
- Dive to burrow (`:623`) and burrow to the head (`:636-637`).
- `faceHit`: after the face is exposed, the sword damage table comes from `CollisionCheck_GetSwordDamage` (`src/code/z_collision_check.c:3718-3724`: 1/2/4/8), non-sword damage is 2, or 4 for an ice arrow (`ovl_Boss_Fd2/z_boss_fd2.c:887-888`), and the hookshot does 0 (`:892-894`). Health above 2, or a sword hit, is required to drain (`:895`). A non-sword hit at health 2 or less still sends the head to `damaged` (`:911-912`). A hookshot with 0 damage does not (`:911`).
- A hammer on the hidden face exposes it and starts the stun (`ovl_Boss_Fd2/z_boss_fd2.c:855-862`); other types do nothing while it is hidden (`hittable: HAMMER`).
- Head timers: stunned 60 frames (`:579`), sinking 25 frames (`:394`), damaged 25 frames (`:620`), `damaged` to `Wait` with `FD2_SIGNAL_FLY` (`:624-626`). The `Wait` handler starts the flight with `BFD_START_ATTACK` (`z_boss_fd.c:1042-1061`).
- Idle goes to the claw when Link is within 200 and to the fire breath otherwise (`z_boss_fd2.c:368-373`), matching near/far.
- `fire_breath` damage 48 (`0x30`) with burn at `z_boss_fd.c:1497-1504`, unblockable as a direct knockback call. `emerge_knock` 32 (`0x20`) at `z_boss_fd2.c:319`. `claw` 32 (`z_boss_fd2_colchk.inc.c:18-95`, 8 AT elements). `body` 16 (`z_boss_fd_colchk.inc.c:7`, 19 AT elements at lines 7-205). `rock` 32 (`src/overlays/actors/ovl_En_Vb_Ball/z_en_vb_ball.c:55`), spawned at `z_boss_fd.c:1379`.
- `atSources` keys match the inventory: 19 body elements and the breath direct hurt at `z_boss_fd.c:1497`. The head's colliders are in `boss_fd2.ts`.
- The start state is right: the first flight needs health under 24 (`z_boss_fd2.c:399`), so band F loops on pops until a hammer lands.
- The `expected.deadVerbs` kit claims hold against `loadouts.ts`: `adult_blade` is the only adult kit with the hammer, and it has no ice arrows, no Biggoron Sword and no Double Defense.
- Not verified: whether Link's attacks can reach the body at the ceiling (rocks phase, y above 700, `z_boss_fd.c:660-672`). I found no line for or against. The only related lines are the targeting flag at `:1289-1293` and the collider, which stays live below DEATH_START.

## Outcomes
1. fixed: health now splits into bands F (24), A1 (18-22), A2 (12-16), A3 (6-10), B (4) and C (2 or less), each with its fakeout count (`ovl_Boss_Fd2/z_boss_fd2.c:235-243`). Head phases carry the hole counter after each pop (1 to 3, capped), and a pop adds fakeouts + 1 (`:270`, `:291-297`). A burrow hands off at counter 3 (`:399-402`). The head now shows 3 times per turn in A1, 2 in A2, and 1 in A3, B and C. F keeps popping. A reachability walk over (phase, health) prunes phases no hit sequence reaches.
2. fixed: rocks now also fall in the rocks parity's dive and burrow, and in the first emerge of the next head turn (`z_boss_fd.c:696`, `:1376-1379`). Remaining gap, recorded in the spec header: the last bounce can come anywhere in the 150-frame rocks phase, so the code does not fix how far the 300-frame tail runs past that emerge (up to 130 frames). Also recorded: a self-step ties with the timed exit once the timer runs out, so these phases can run a beat or two long.
3. fixed: the head's touch (`claw`, 32) is now delivered near in `up` (emerge state 2, head at y 150, `ovl_Boss_Fd2/z_boss_fd2.c:305`), idle, claw, breath, burrow and the open-face burrow. The AT collider is set at `:1006-1008`. The touch is left out where the code turns AT off: daze, vuln and damaged (`:547`, `:604`). It is also left out underground, where the head sits at y -850 or -200 (`:198`, `:271`). The body's touch (`body`, 16) is now delivered near in rise and dive as well as the chase (`z_boss_fd.c:1339-1345`). It is not added in the body's burrow, which targets the hole's y - 70 (`:624`), or at the ceiling (y above 700, `:667`). I inferred from those positions that Link cannot reach it there. I did not check the geometry.
4. fixed: a hammer in band B takes 3 (4 to 1, `ovl_Boss_Fd2/z_boss_fd2.c:859`), and threshold 2 moves the head to band C. Band C's hammer takes 0. Remaining gap, recorded in the header: a hammer from 2 leaves 1, and a flying hit at 1 sets 2 (`z_boss_fd.c:1308`). Band C carries both as 0, so its pool can sit at 1 where the game has 2, or the reverse. Every adult sword hit takes 2 or more, so the kill does not change.
5. fixed: the header comment now cites colchk line 8.
6. fixed: added `states` for the `BOSSFD_*` switch at `z_boss_fd.c:573`. They map to rise, chase, rocks, dive and burrow. `BOSSFD_WAIT_INTRO` (`:331`) and the six death states (`:578`, `:753`, `:822`, `:837`, `:844`, `:895`) are excluded, and `BOSSFD_FLY_UNUSED` is excluded because it is never assigned (`:941`). `BossFd_Fly` still maps to `f_*`, because each `actionFuncs` key takes one value. The header records that the function also runs the intro (`:320-565`) and death (`:730-928`).
7. fixed: the chase is now 5 timed segments, 44 frames and then 64 frames four times (`z_boss_fd.c:610`, `:715`), with one breath at each segment end (`:718`) and a last breath at the exit (`:723`). The breath's 50-frame cooldown (`:1495-1496`) is shorter than 64, so it adds no limit. The breath step no longer needs far range, because the code checks facing (`:717`), not distance.
8. gap: the chase also ends when Link's y is under 70 (`z_boss_fd.c:721-722`). The model has no height. Recorded in the spec header.
9. fixed: idle times are now 50, 40, 40, 30 and 20 (`ovl_Boss_Fd2/z_boss_fd2.c:340-348`), and hole times are 30, 25, 20, 10 and 5 (`:274-282`). Underground time per pop is the first pass + hole + fakeouts × (10 + hole). The first pass is 20 for the first pop after a hand-back (`:823`, new `wake` phase) and 10 for later pops (`:232`). Remaining gap, recorded in the header: the emerge, strike, burrow, knockout and hit animations run to `Animation_GetLastFrame`, and this checkout has no extracted object data, so their lengths are unknown.
10. fixed: the strike phase is split into claw (exit cite `:532`) and breath (exit cite `:432`).

Also fixed: the rise timer cite moves from `z_boss_fd.c:654` (intro branch) to `:656` (fight branch). The hammer's stun now starts with a 30-frame `daze`, in which no hit lands (`ovl_Boss_Fd2/z_boss_fd2.c:863`, `:1001`), before the 60-frame open face. The fight starts at the head's first pop after the intro hand-back (`:822-823`), because `introState` is always `BFD_CS_WAIT` (`z_boss_fd.c:210`).
