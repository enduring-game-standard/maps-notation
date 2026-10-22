# ovl_En_Floormas

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

Spec: `studio/tools/ocarina/data/actors/en_floormas.ts`. Source: `src/overlays/actors/ovl_En_Floormas/z_en_floormas.c` (cites below are that file unless a path is given).

## Verdict

major findings

## Findings

1. **Major.** Attack `grab`, `damage: 8` plus the spec comment "the first 8 lands at once and then every 20 frames" (spec lines 71-77). The code does not damage Link at grab contact, and the first hit is 20 frames after the grab starts. `EnFloormas_SetupGrabLink` sets `actionTarget = 0x28` (`:200`, via `:365`) inside the `JumpAtLink` update. The same update's tail then decrements it to 39 (`:1081-1084`, material is already `HARD`). `EnFloormas_GrabLink` damages only when `actionTarget % 20 == 0` (`:827`). It next sees 39, 38, ... , 20, so the first `damagePlayer(play, -8)` (`:833`) is on frame 20 of the hold, then 40 (the counter wraps to 40 at `:1086-1087`), 60. In the best-case 42-frame hold (spec's own number) the code deals 2 hits (16), not the 24 the spec's contact `damage: 8` plus per-beat 8 would charge (gen.ts adds `a.damage` on landing, then `damagePerBeat` per beat). Fix: contact `damage: 0` and let the periodic rate pay, or justify the contact damage with a line.

2. **Minor.** Steps `hurt_{big,s*} -> idle_*` and `frozen_s* -> idle_s*` (spec lines 52, 53, 67, 68), cites `:956` and `:986`. For small hands the return path is `Recover`/`Stand` -> `SmallWalk` (`:970-974`, `:472-481`), and `smallActionTimer` is not reset. It is set to 50 only after `Land` (`:668`) and `Split` end (`:681`), and it counts down only inside `SmallWalk` (`:694`). A hand hit while it was stalking has `smallActionTimer == 0`. On recovery `SmallWalk` immediately goes to `SmallDecideAction` (`:700-701`). The spec sends it to `idle_s*` and makes it wait the full 50 frames again. A hand hit mid-walk should resume with the time left. Timing; the single hurt phase cannot remember where it came from.

3. **Minor.** Ledger `EnFloormas_Merge` reason: "steps cannot see whether the grab connected and pools cannot refill". The second half is not true: `Step.restore` exists for exactly this (`studio/tools/ocarina/spec.ts` Step.restore; AUTHORING.md item 5 "Resets"), and the code restores to full at `:933`. The trigger is also described wrongly as "after the last grab releases". In the code it is the first hand to release whose two siblings are each in `GrabLink` or `SmallWait` (`:812-818`); it becomes the leader and the others followers. With the other two dead, the last hand regrows to health 4 after any grab release. That changes who can win against the last hand and is the real reason the gap matters. The gap itself is reported by the author.

4. **Minor.** Ledger `EnFloormas_SmallWait` reason ("a dead small hand waiting for the others"). `SmallWait` is also the initial state of the two extra hands before the split (`:159-162`) and the end state of a follower that merged into a leader (`:863`). Incomplete, not false for the modeled path.

5. **Minor.** Step `charge_big -> land_big_long` (spec line 55), cite `:623`. The charge also ends on wall contact (`bgCheckFlags & BGCHECKFLAG_WALL`, `:622`) regardless of the timer. The spec only models the timer ending (`afterTimer`, far). Timing/transition omitted; unreported.

6. **Minor.** Step `stalk_s* -> stalk_s*` "runs at Link" (spec line 62), cite `:740`. Line 740 only turns the hand toward Link. Running is the speed set in `EnFloormas_SetupSmallDecideAction` (`:328`); the near threshold (80) is `:741`. The line does not show the run.

7. **Minor.** Attack `grab` `effect.frames` 42 (spec line 74, cite `z_player.c:1867`). Line 1867 is the `+= 5` per press. `func_80832594` also adds a stick-motion term every frame (`z_player.c:1863-1864`), so 21 button presses is not the minimum, and a slow masher is held longer (no cap). The value is a button-only best case, not stated as such at the cite.

## Checked

- Pools: big health 4 at `:93`, small health 2 at `:313` (`sColChkInfoInit.health >> 1`), both match inventory. `then` chain and "all three must die" hold: the last small's `SmallShrink` end kills the rest (`:393-397`).
- Damage table (`:95-128`) matches inventory. Reactions `0x0/0x1/0x2/0x4` read right: `:1019-1021` (1 and 4 -> `SetupFreeze` unless already `Freeze`), `:1024-1028` (2 adds a ring, everything else -> `TakeDamage`). Hookshot on a small hand becomes damage 2, reaction 0 (`:1003-1006`, `isSmall = scale < 0.01`); matches the `overrides`. 0-damage `NONE` entries do nothing in the code (`:997`); Link never emits those types (`data/link.ts:96,113,114`).
- `hover_big` and `charge_big` guarded: `EnFloormas_SetupHover` calls `MakeInvulnerable` (`:270`) and a `HARD` material drops all damage (`:998`); guard set equals AC mask `0xFFCFFFFF` (`:85`). Hardness ends on ground touch in `Land` (`:631-634`).
- `hurt_*` and `split` unhittable: AC skipped for `TakeDamage` and `Split` (`:1069`). `frozen_*` hittable and re-hit goes to `TakeDamage`. Small `jump_*` hittable (`:1068-1071`; only `GrabLink` skips AC).
- Frames: charge 25 `:277`; land 30/45 `:286/:288` (`speed < 0` after the `AT_HIT` bounce gives 30, `:1042-1047`); freeze 80 `:437`; small walk timer 50 `:668`.
- Charge attack: AT element `{0xFFCFFFFF, KNOCKBACK, 0x10}` at `:84` = 16 damage, knockback. AT only armed during `Charge` (`:1064-1066`). Shield bumper mask `0xDFCFFFFF` (`z_player.c:10518`) overlaps the toucher `0xFFCFFFFF`, and `UNBLOCKABLE` is not read in `z_player.c`, so `blockable: true` is right.
- Steps with correct cites: `idle->idle` run `:501`; `idle->hover` `:465`; `hover->charge` `:570`; `charge->land_big` `:1047`; `land->idle` `:667`; `split->idle_s3` `:682`; `idle_s->stalk_s` `:701`; `stalk->jump` `:742`; `jump->land` far `:768`; `hurt->idle` `:956`; `frozen->idle` `:986`.
- Variants: invisible `:154`, visible start `:187`.
- Grab: 8 damage at `:833`; `play->grabPlayer` + `SetupGrabLink` at `:771-772`; the hold ends when `STATE2_7` clears (`:808`), which `Player_InflictDamage` only does if Link dies (`z_player.c:16137`, `Health_ChangeBy` returns false only at 0 health, `z_parameter.c:2279-2283`).
- C5 ledger: all 21 inventory action functions mapped. Mappings correct (`Stand/Turn/Recover -> idle_*`, `Land -> land_*`, etc.). Exclusion reasons true for `GrabLink` (`:776`, status on Link), `SmallFollowerJumpAtLeader` (`:840`, merge jump, `:860-863`), `SmallShrink` (`:747`, death shrink from `Die` `:453`).
- `atSources`: `:84` -> `charge`, `:833` -> `grab`; inventory lists exactly these.

## Outcomes
1. gap: the finding holds (first `damagePlayer(-8)` on frame 20, `:827`/`:833`). Contact `damage: 0` fails V3, which requires an attack sourced at a direct hurt call to deal the call's amount (`studio/tools/ocarina/verify.ts:189-191`: "attack grab damage 0, the call at ...:833 deals 8"). Kept contact 8 plus the cited 8/20-frame drain; the generated file charges 8 on `grab_lands` and 8 per `grab_ticks` over 2 status beats, 24 per full hold against the code's 16. The false comment ("first 8 lands at once") is corrected and the overcharge is recorded in the spec header as a harness gap.
2. fixed (in part): new phases `hurt_s*_hunting` and `frozen_s*_hunting` take hits from `stalk_s*`, `jump_s*` and `land_s*` (where `smallActionTimer` is already 0) and return straight to `stalk_s*` (`:700-701`). A hand hit while it scurries still restarts the 50 frames; phases cannot carry a timer's remainder, recorded in the spec header.
3. fixed (ledger reason) + gap: the reason now names the real trigger (`:812-818`) and refill (`:933`). `Step.restore` can refill the big pool, but it does not make regrowth expressible: the step out of `jump_s*` cannot branch on whether its grab connected (a dodge only cancels the hit, gen.ts `grab_dodged` moves no phase; `onBlock` is for shield blocks and the grab is unblockable), so a dodged leap would regrow too. The regrown Floormaster's split also revives all three hands at 2 health (`:445-447`, `:313`), and a step restores one pool. Recorded in the spec header.
4. fixed: the `EnFloormas_SmallWait` reason now lists the pre-split extra hands (`:159-162`), the dead hand (`:749`) and the merged follower (`:863`).
5. gap: the model has no walls; the wall end of the charge (`:622`) is recorded in the spec header.
6. answered: the step's modeled fact is the hand closing on Link (`move: 'near'`). What makes the motion go at Link is the heading at `:740` (`Math_ApproachS(..., yawTowardsPlayer, ...)`). The speed at `:328` is the same 5.0 the scurry uses (`:320`), so it does not distinguish running at Link from walking away; `:740` is the line that does.
7. fixed: the comment now states 42 frames is the A/B-only best case; the stick term (`z_player.c:1863-1864`, up to 4 a frame with the magnitude capped at 60, `src/code/z_lib.c:233`) and the fast escape that beats the frame-20 hit are recorded in the spec header.
