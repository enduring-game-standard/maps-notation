# ovl_Boss_Fd2

Reviewer: Claude Sonnet 5.5

## Verdict

major findings

## Findings

All code cites are in `src/overlays/actors/ovl_Boss_Fd2/z_boss_fd2.c` (`fd2:`), unless stated.

1. **Pop count (`emerge_2`, `emerge_3`, `afterBurrow` steps cited at 402/404). Severity: major.**
   Spec: three pops per cycle, then the body flies. Code: `HOLE_COUNTER++` runs every time emerge state 0 passes its check, fake-outs included (fd2:270, with the re-entry to state 0 at fd2:296). `BossFd2_Burrow` goes to Wait when `HOLE_COUNTER >= 3` and health < 24 (fd2:399-402). The fake-out count comes from the body's health (fd2:235-243): 0 at health >= 18, 1 at >= 12, 2 at >= 6, 3 below 6. The spec's pool is health 1 (fd2:859), and its own timers use the health < 6 branches (idle 20 at fd2:348). At health 1 the counter is 4 after the first emerge, so the first burrow already goes to Wait (fd2:399-402). Only one pop happens per cycle. `emerge_2`, `emerge_3` and the whole `_2`/`_3` chains are unreachable in this code state. The 3-pop loop only holds at health >= 18 (counter 3), and there the idle and hole times are different.

2. **`emerge_k` `hittable: 'none'` (phase, cite fd2:271). Severity: major.**
   Spec: the head cannot be hit during emerge. Code: `BossFd2_CollisionCheck` is gated only by `INVINC_TIMER == 0` (fd2:1001), and the AC collider is registered every update (fd2:1004). The hit handler checks only `faceExposed` and `DMG_HAMMER` (fd2:851-862), never the action function. Emerge state 2 puts the head up at y=150 (fd2:305), so a hammer blow in that window exposes the face (fd2:861-862). The phase lumps together states 0 and 1 (head at y=-850 and -200, fd2:198, 271) with state 2 (head up); only the first two are plausibly unreachable. I did not verify geometry or reach.

3. **Contact AT is live in most phases (atSources `claw`, attacks list). Severity: major.**
   Spec: the eight AT elements map to `claw`, which only fires on the near idle to strike step (fd2:370), plus `emerge_knock`. Code: `CollisionCheck_SetAT` runs every update unless `disableAT` (fd2:1006). `disableAT` is set only in `BossFd2_Vulnerable` and `BossFd2_Damaged` (fd2:547, 604) and cleared each frame (fd2:981). So all eight elements (damage 0x20 = 32; z_boss_fd2_colchk.inc.c:18, 29, 40, 51, 62, 73, 84, 95) hurt Link by touch during emerge, idle, breathe-fire, claw-swipe and burrow (the burrow leg where the head is still up). The model has no touch damage in `idle_k` or in the breathe branch of `strike_k`, only on the claw step. `BossFd2_ClawSwipe` itself only plays a sound on a hit (fd2:833-841); it does not gate the damage.

4. **Emerge and damaged timing (`emerge_k.frames`, `damaged.frames`). Severity: minor.**
   Spec: emerge 10 frames (fd2:232). Code: that is only the first leg. At health < 6 the emerge is 4 passes of state 0 (10 frames, fd2:232, 297) plus state 1 (holeTime 5, fd2:282-284), then a 15-frame timer plus the emerge animation (fd2:304, 322), about 75 frames or more. Each state-0 pass also needs `player y > 70` (fd2:261). After `Wait`, the entry timer is 20 (fd2:823), not 10. `damaged` is 25 frames (fd2:620) only after two animations (fd2:606-621). `burrow` likewise has an animation leg (fd2:392) before its 25-frame timer.

5. **Vulnerable invincibility (`vuln_k`). Severity: minor.**
   Spec: sword hits land immediately. Code: the hammer hit sets `INVINC_TIMER = 30` (fd2:863), and the collision check does not run until it is 0 (fd2:1001), so about 1.5 beats of no hits. The 60-frame timer starts only after the knockout animation ends (fd2:576-579).

6. **`breath` attack `via` (attack list). Severity: minor.**
   Spec: `via: { overlay: 'ovl_Boss_Fd', spawn: fd2:487 }`, as if a projectile actor. Code: no actor is spawned. `BossFd2_SpawnFireBreath` fills `bossFd->effects` (fd2:487-495), and the damage is applied in Boss_Fd's effect update. It needs distance < 20 to Link and `timers[3] == 0`, then sets `timers[3] = 50` (z_boss_fd.c:1495-1496), a 2.5-beat cooldown. The 48 damage (0x30 at z_boss_fd.c:1497) is right. The burn is set right after, `bodyIsBurning` (z_boss_fd.c:1498+). The cite `FD:1497` does show the damage.

7. **`strike_k` to `burrow_k` cite (steps). Severity: minor.**
   One cite (fd2:532) serves both strikes. That line is the claw-swipe end only. The breath branch ends at fd2:431-432.

8. **Summary and header text. Severity: minor.**
   "The hammer clamps her health to 1 (line 859)": the clamp happens only if `health - 2 <= 2` (fd2:857-859). Above that the hammer takes 2. The encounter starts at the clamped state by design, but the text overstates it. `SWORD` doc comment says `GetSwordDamage` is at z_collision_check.c:3716. The function header is at 3715; the per-damage `SWORD_LINE` cites (3718, 3720, 3722, 3724) are right.

9. **Near thresholds (steps `emerge_k` near, `idle_k` near). Severity: minor.**
   Emerge knockback needs `xzDistToPlayer < 120` and fires only when `timers[0] == 1` (fd2:318). The idle claw/breath split is `< 200` (fd2:369). Both map to the one `near`; the two thresholds differ.

## Checked

- Pool: health 1 at fd2:859, matching the inventory. Death at fd2:903-905. No damage table, so `custom` is right.
- Hit handling: hammer opens the face when `!faceExposed` (fd2:855-862) and `faceExposed` is cleared on emerge (fd2:265). Sword types are only accepted when exposed (fd2:883-895).
- `SWORD` damage map (1/2/4/8) matches `CollisionCheck_GetSwordDamage` (z_collision_check.c:3718-3725). Hammer swing 2, hammer jump 4, Deku Stick 2.
- `OTHER` types: damage 2 (4 for ice arrow) at fd2:888, `canKill` false (fd2:884), no health change at health <= 2 (fd2:895), and still `SetupDamaged` because `damage != 0` (fd2:911-912). Hookshot is damage 0, no reaction (fd2:892-894, 911).
- AC mask 0xFFCDFFFE (colchk:8) clears DEKU_NUT, MAGIC_FIRE, SHIELD and MIR_RAY (bits 0, 17, 20, 21), so those types are correctly absent; MAGIC_ICE and MAGIC_LIGHT are accepted.
- Idle 20 frames (fd2:348), burrow 25 (fd2:394), vuln 60 (fd2:579), damaged 25 (fd2:620). Idle near/far split at 200 (fd2:369-372). Away to emerge on the body's hand-back (fd2:820-822).
- Burrow to emerge/Wait at fd2:402-404; vuln to burrow at fd2:587; `Damaged` to `Wait` at fd2:625-626.
- Attacks: claw 32 from the eight AT elements, `HIT_SPECIAL_EFFECT_NONE` (colchk:18..95); `emerge_knock` 32 (0x20) unblockable knockback at fd2:319; breath 48 burn at z_boss_fd.c:1497. The ninth element (colchk:7) is `ATELEM_NONE`, correctly not an AT source.
- C5 ledger: all nine action functions are keyed and the names are real. `BossFd2_Death` exclusion is true (`SetupDeath` sets it at fd2:635 after the fatal hit at fd2:905). `BossFd2_Wait` to `away` matches fd2:817-826. `BossFd2_BreatheFire`/`ClawSwipe` to `strike_*` matches fd2:370-372.

## Outcomes
1. fixed: at health 1 the head makes 3 fakeouts (`fd2:242`), so the counter reaches 4 on the first pop and every burrow goes to Wait (`fd2:399-402`). The encounter is now one pop per cycle (wake, up, idle, claw or breath, burrow, away). The `_2` and `_3` chains are gone.
2. fixed: emerge is split. `wake` covers states 0 and 1, underground at y -850 or -200 (`fd2:198`, `:271`), and nothing can hit it. `up` covers state 2, head at y 150 (`fd2:305`), and is hittable by the hammer, which sends the head to daze (`fd2:855-862`). I did not verify reach or geometry.
3. fixed: touch (`claw`, 32) is now delivered near in up, idle, claw (the swipe), breath, burrow and the open-face burrow. The AT collider is set at `fd2:1006-1008`. It is not delivered in daze, vuln or damaged, where `disableAT` is set (`fd2:547`, `:604`).
4. fixed: `wake` is 70 frames: 20 after Wait (`fd2:823`), plus 4 hole times of 5 (`fd2:282`), plus 3 re-entries of 10 (`fd2:297`). Remaining gap, recorded in the header: the emerge, burrow, knockout and hit animations run to `Animation_GetLastFrame`, and this checkout has no extracted object data, so their lengths are unknown. The `player y > 70` wait (`fd2:261`) is not modeled either, because the model has no height.
5. fixed: a new `daze` phase (30 frames, no hit lands, `fd2:863`, `:1001`) runs before the 60-frame `vuln` (`fd2:579`). Remaining gap: if the knockout animation (`fd2:576-579`) runs longer than 30 frames, the stun is longer than modeled. Its length is unknown.
6. gap: the breath is an effect in Boss_Fd's array, not an actor (`fd2:487-495`; hurt at `z_boss_fd.c:1491-1497`). Without `via`, the verifier rejects the cross-overlay source (C6: "is not a ledgered AT source"; V3: "neither an element, a runtime change, nor a direct hurt call"). The attack keeps `via` with the effect's spawn line, and the spec header records why. The 50-frame cooldown (`z_boss_fd.c:1496`) does not bind, because the head breathes once per cycle.
7. fixed: claw and breath are separate phases, with exit cites `fd2:532` and `fd2:432`.
8. fixed: the summary now says a hammer from 4 or less leaves health 1 (`fd2:857-859`). The `SWORD` comment now cites `z_collision_check.c:3715`.
9. gap: the knockback needs `xzDistToPlayer < 120` (`fd2:318`) and the claw needs `< 200` (`fd2:369`). The model has one near band. Recorded in the spec header.
