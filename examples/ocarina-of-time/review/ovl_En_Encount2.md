# ovl_En_Encount2

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

major findings

## Findings

1. **Whole actor / `summary` / phases (spec scoped to Death Mountain only).** `EnEncount2` has a second mode the spec does not model and does not report. When the scene is not Death Mountain (`isNotDeathMountain`, z_en_encount2.c:56-58), the spawner activates on `xzDistToPlayer < 700` and switch flag 0x37 in the Ganon collapse scenes (z_en_encount2.c:91-98, 171-179). In that mode `EnEncount2_SpawnRocks` allows 1 rock (`maxRocks = 1`, z_en_encount2.c:177), one every 50 frames (z_en_encount2.c:234), with a quarter landing near Link (`Rand_ZeroFloat(3.99f) < 1.0f`, z_en_encount2.c:240-243). It never returns to `Wait` (the 200/100 frame timer swap is inside the Death Mountain branch only, z_en_encount2.c:156-161), so there is no quiet phase. The spec's 200-frame eruption / 100-frame rest cycle and "up to two at once" describe only the Death Mountain branch. The spec's `cite`, name and summary say Death Mountain, but no comment or expected entry says the other branch is left out. The rock damage (8) is the same, the rate and rest pattern are not. Severity: major (what hurts and how much, unreported).
2. **`attacks.rock` / `atSources` (rock fragments).** The falling rock does not stop at one hit. On landing it spawns two `FIRE_ROCK_BROKEN_PIECE1` rocks (z_en_fire_rock.c:227 landing sets `EnFireRock_SpawnMoreBrokenPieces`, 252 `nextRockType = FIRE_ROCK_BROKEN_PIECE1`, 260 spawn loop of 2). Those use the same AT collider, damage 8 (`D_80A12CA0`, z_en_fire_rock.c:58, 140), and set AT while falling (z_en_fire_rock.c:364, 375, 393 `setCollision` then `CollisionCheck_SetAT` for `FIRE_ROCK_BROKEN_PIECE1`). A rock that lands on Link therefore leaves two more 8-damage contacts around him; the spec says "Each rock deals 8" and models one contact per rock. Severity: minor (damage multiplicity; the one-contact-per-beat abstraction may be intended but is not stated).
3. **Step `quiet -> eruption` and `eruption` (age).** The age branch is not modeled. In the Death Mountain branch a child's rock lands near Link half the time (`Rand_ZeroFloat(1.99f) < 1.0f && !LINK_IS_ADULT`, z_en_encount2.c:216-219); for an adult it lands near him only if he stands still (`player->speedXZ != 0.0f`, z_en_encount2.c:221-230), otherwise it falls 300-600 units ahead of the camera. The spec uses one unweighted `rock` step for both ages with `standardLoadouts(['child','adult'])`. Severity: minor.
4. **Step `quiet -> eruption` (cite 126).** The step is only possible while Link is inside the trigger box: the `deathMountainSpawnerTimer == 0` test sits inside `case ENCOUNT2_ACTIVE_DEATH_MOUNTAIN` (z_en_encount2.c:109-127), reached only when the box test at 86-90 passes. The spec's `range: 'near'` start folds this in; the fall-through to `Wait` forever outside the box is not stated. Severity: minor (labeling).

## Checked

- Phase mapping: `EnEncount2_Wait` -> quiet (z_en_encount2.c:78), `EnEncount2_SpawnRocks` -> eruption (z_en_encount2.c:132). These are the two extractor entries; ledger is complete.
- Timers: 200 frames set at z_en_encount2.c:124 (Wait -> SpawnRocks at 126), 100 frames at z_en_encount2.c:158 (SpawnRocks -> Wait at 159). The timer decrements once per update (z_en_encount2.c:266-268). 10 and 5 beats. Correct.
- `maxRocks = 2` (z_en_encount2.c:166), 4-frame gap (z_en_encount2.c:214), rock spawn as child (z_en_encount2.c:246-247); the spawner's count is freed in `EnFireRock_Destroy` (z_en_fire_rock.c:169, `numSpawnedRocks--`). "At most two at a time, each replaced as it breaks" is right.
- Attack: AT damage 8 at z_en_fire_rock.c:58 (element `{ 0xFFCFFFFF, HIT_SPECIAL_EFFECT_9, 0x08 }`), effect 9 maps to `none`. `blockable:true` is right: a shield bounce sets `AT_BOUNCED` and the rock breaks (z_en_fire_rock.c:365-370). `via` spawn cite z_en_encount2.c:246 shows the spawn.
- No collider, no health, no damage table in `EnEncount2` (inventory empty; the file has no `Collider_` or `colChkInfo` use), so `pools: []`, `damage: none`, `atSources: {}` are correct.
- Dead-verb claim: 8 and 4 (Double Defense) both divide 32 (2 hearts) evenly; true.

## Outcomes
1. fixed: added variant `ganons_tower` (`z_en_encount2.c:91`). Its phases are `eruption_collapse_wait`, 30 frames, and `eruption_collapse_fall`. That makes a 3-beat cycle for the 50-frame spawn gap (`:234`). The rock lands on Link at weight 1 against 3 (`:240`, `Rand_ZeroFloat(3.99f) < 1.0f`), and there is no return to Wait. `EnEncount2_SpawnRocks` now maps to `eruption*`. The strike step carries age adult, so a child kit in this variant is never hit. Gating every collapse step by age stalled 37 child positions, because `gen.ts:570` (`always`) ignores `age` when it decides whether a phase gets a hold verb. That is a harness gap. The summary and name now cover both modes.
2. gap: the two `FIRE_ROCK_BROKEN_PIECE1` pieces keep the 8-damage collider (`z_en_fire_rock.c:252`, `364`, `393`). The model gives one contact per rock. Recorded in the header.
3. gap: a step's `dodgeable` belongs to the attack, not the age. A moving child is hit half the time (`:216`), and the model cannot express that. Recorded in the header.
4. fixed: the header now states that the eruption runs only inside the box (`:86-90`, `:163-167`) and that the start range is near.
