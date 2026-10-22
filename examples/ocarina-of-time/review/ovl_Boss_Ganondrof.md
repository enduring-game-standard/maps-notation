# ovl_Boss_Ganondrof

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

Scope: `studio/tools/ocarina/data/actors/boss_ganondrof.ts` against `ovl_Boss_Ganondrof/z_boss_ganondrof.c`, with the horse (`ovl_En_fHG/z_en_fhg.c`, "hg") and the energy ball (`ovl_En_Fhg_Fire/z_en_fhg_fire.c`, "ff") read wherever the spec cites them. Paths below are relative to `src/overlays/actors/`; "boss" = `ovl_Boss_Ganondrof/z_boss_ganondrof.c`.

## Verdict

minor findings

No finding changes who can win, what hurts, or how much. Every damage number, health value, threshold, reaction and rally branch I traced matches the code. The findings are timing, one missing transition class, a few unsupported weights, labeling, and cites.

## Findings

1. **minor** - `paint_leap` hittable window (phase `paint_leap`, `frames` 50 at hg:522).
   The spec makes Phantom Ganon hittable for the whole 50-frame leap. In code the horse clears `bossGndInPainting` at hg:516 and sets it back to true once within 350 of the target painting (`dxz < 350`, hg:573-575). `body` AC is only registered while `!bossGndInPainting` (boss:1355-1357). The leap covers its whole path in about 50 frames (speed is `|delta| * 2 * 0.01` per frame, hg:452, 457). Opposite paintings are 1.3 * 630 = 819 units apart on the z axis (hg:79-81, 449-451). So the window closes after about 57% of the path, around 29 frames, not 50. Only the timing is off. One hit per cycle is still all that can land.

2. **minor** - step `paint_leap -> paint_retreat` (cite hg:540) and the lightning.
   hg:540 is the lightning spawn, not the transition. The real transition is the horse reaching its target (`dxz == 0`, hg:587-592). The spawn fires mid-leap, at `timers[1] == 24`, and only when `hitTimer == 0` (hg:538-542). A hit landing after that (still before the 350 line) goes to `EnfHG_Damage` at hg:560 with the lightning already thrown. The model makes a hit and the lightning mutually exclusive: a hit always diverts to `paint_hit` before the end-of-leap step, so Link never takes the lightning and also gets the hit.

3. **minor** - phase `ball_back*`, cite ff:517.
   The line is `} else {`. The facts the phase claims (ball re-aimed at Ganon, mode set to LIGHT_BLUE) are at ff:537-540 (single throw) and ff:557-565 (the BLUE case).

4. **minor** - steps `ball_back* -> stun*` and `ball_back* -> neutral` (cites ff:575, ff:632), no weights.
   The two steps tie at even odds, and no cited line gives that. For a single throw the code has no probability. It adds a random aim error of up to +/-0x2000 on both axes and speed 15 (ff:518-521), and the ball counts as a hit only if it enters Ganon's box (`|dx|<30, |dz|<30, |dy|<45`, ff:573). The coin flip in `rally_back_coin` (weight 1:1) is right: `Rand_ZeroOne() < 0.5f` at ff:526. The single-throw 50/50 is an unsupported choice and should be reported as one.

5. **minor** - `neutral*` phase `frames` after stun, block and charge.
   After stun the code sets `timers[0] = 30` (boss:781). After block it sets 10 (boss:809). After a charge it sets 30 (boss:902). The spec uses the random 30..93 mean (cite boss:505) for every return to `neutral*`. Only the post-throw and post-return returns use the random range (SetupNeutral sets it at boss:505, and neither caller overrides it). The post-stun delay is 30 frames, which is 2 beats by the contract's rounding, against 3 beats for the mean 61.5.

6. **minor** - missing transition: the volley/rally timeout.
   In `GND_FLY_RETURN`, `timers[0]` is set to 80 on each throw (boss:575) and each return (boss:588, 737). When it reaches 0, `flyMode` goes back to `GND_FLY_NEUTRAL` (boss:591-593). A ball hit after that takes the single-throw branch (random aim, speed 15, no Ganon return; ff:518-521). The spec's rally has no such exit. The window is 80 frames (4 beats), so it matters only when a ball takes long to reach Link.

7. **minor** - missing variant: the slow throw.
   With `Rand_ZeroOne() <= 0.1f`, `GND_THROW_COUNT >= 10` and `flyMode == GND_FLY_NEUTRAL`, the throw is `THROW_SLOW` (boss:650-653): a longer wind-up (throw frame 1000 until anim frame 21, then 10; boss:676-680) and a speed-3 ball (ff:163). The spec has one throw timing (25, cite boss:656). Only timing differs, but the branch exists and is reachable after ten throws.

8. **minor** - missing way to reflect the ball: the bottle.
   `canBottleReflect1` (a swinging bottle, facing Ganon within 0x2000, ball within 25 units; ff:490-496) reflects the ball like a sword hit, and it bypasses the shield branch (`!canBottleReflect2`, ff:513). The spec's ball phases accept only the `BALL_*` damage types and `SHIELD`. A bottle swing is not a Link verb here. It cannot win the fight (a bottle swing carries no sword damage, and non-sword hits cannot finish; boss:1279-1280), so the loss is only in how Ganon gets stunned.

9. **minor** - the neutral loop keeps running during a throw (phases `throw*`, `ball*`, steps `throw* -> ball*`).
   `BossGanondrof_Throw` returns to `Neutral` at the end of the throw animation (boss:672-673), not when the ball resolves. So while the ball is in flight Ganon is in `Neutral`: a fired item still triggers Block (boss:636) and his decision timer (boss:522) can run. The model parks the actor in `ball*` (hittable only by `BALL_HITS`) until the ball resolves. This is an abstraction. It should be stated, because it drops the Block-during-ball path.

10. **minor** - phases `charge_windup*`, `charge_finish*` (no attack), step `charge -> charge_finish` (cite boss:878).
    Both AT colliders are registered whenever `actionFunc == BossGanondrof_Charge` (boss:1363-1366), so the windup and finish states can hurt Link too, not only the lunge. The two attacks (`spear` 48, `charge_body` 16) also sit on separate steps at even odds. In code both colliders are active at once, and neither has a cited probability. Both are geometry choices that should be reported. The numbers are right (see Checked).

11. **minor** - C5 ledger labels: `actionFuncs`.
    - `BossGanondrof_Neutral: 'neutral*'` omits `volley_wait*` and `charge_wait*`. Those are `Neutral` with `flyMode` VOLLEY or CHARGE (boss:564, 595), and the actionFunc is still `Neutral` (boss:502).
    - `BossGanondrof_Charge: 'charge*'` wrongly claims `charge_wait*`, which is `Neutral` (see above); the real Charge states start at SetupCharge (boss:603, 814).
    - `BossGanondrof_Throw: 'throw*'` omits `rally_throw*`, which call the same `SetupThrow` (boss:574).
    - `BossGanondrof_Return: 'rally_back_*'` is acceptable (the Return anim starts at boss:587).
    Every extracted action function is mapped, and both exclusions are true (see Checked), so nothing is dropped.

12. **minor** - header summary: "His body takes no hits except while stunned".
    A non-ranged hit during Block also damages him and stuns him (boss:1361-1362, 1269-1290). The spec models it (`blockHits`). Only the prose is wrong.

## Checked

- Health 30 (boss:310, matches `inventory.json`). Painting hits subtract a flat 2, no finishing-blow rule (boss:1300-1302), for `DMG_RANGED` = arrows, hookshot, slingshot (`include/collision_check.h:452`). Painting hits need the rider out of the painting (boss:1355-1357; hg:516).
- Threshold 24: at the end of `EnfHG_Damage`, health 24 or less sets `flyMode = NEUTRAL` (hg:637-641) and Ganon's `Paintings` immediately `SetupNeutral`s with `timers[0] = 100` (boss:483-485). Matches `thresholds[0]` and `neutral_p0` frames.
- Body AC mask `0xFFCFFFFE` (boss:120) rejects only bit 0 (nut), 20 (shield), 21 (mirror ray). `OTHER` + `SWORD` + `HOOKSHOT` = the other 32 - 3 types, none missing.
- Sword damages 1/2/4/8 and the sword-type assignment match `CollisionCheck_GetSwordDamage` (`src/code/z_collision_check.c:3719, 3721, 3723, 3725`). Non-sword = 2, never the finishing blow (`health > 2 || canKill`, boss:1279-1282). Hookshot returns without damage (boss:1275-1276). Health 4 or less is the `< 5` check (boss:524). Health 2 or less is `crit` (boss:1280).
- Ranged hits are ignored unless Ganon is Stunned (boss:1265-1266); so in Stunned they do 2 (spec OTHER), in Block they are guarded (`guards: RANGED`), in Charge and Neutral nothing connects.
- Block: entered from `Neutral` when `player->unk_A73 != 0` (boss:636); `unk_A73` is set for arrows/slingshot/hookshot (`ovl_player_actor/z_player.c:3131`, outside the hookshot `if`) and boomerang (z_player.c:3390). `timers[0] = 10` (boss:795), exit to Neutral (boss:808), and a non-ranged hit during Block does damage then `SetupStunned` (boss:1290) with `timers[0] = 50` (boss:745).
- Stun: 50 frames (boss:745); `returnCount >= 2` gives 120 (boss:1291-1292); ball strike skips damage (`returnCount != 0`, boss:1270).
- Decision weights: below 5 health, 0.25 throw / 0.20 charge / 0.55 volley (boss:525-533), i.e. weights 5/4/11; above 4, `rand < 0.5` or fewer than five throws is a throw, else volley (boss:538-541); `GND_THROW_COUNT` increments in `SetupThrow` (boss:664). Charge-wait 60 (boss:529), windup 20 (boss:818), finish 20 (boss:879), volley wait 60 (boss:542).
- Energy ball: AC mask `0x0D900700` (ff:90) = slashes, `SPIN_MASTER/GIANT`, `JUMP_MASTER/GIANT`, shield; excludes `SPIN_KOKIRI`, `JUMP_KOKIRI`. Shield sets BALL_IMPACT and `flyMode = NEUTRAL` (ff:513-514, 632). Rally branch: `RETURN_COUNT++`, coin flip above 3 sets 100 (ff:525-528), spin sets count 4 (ff:530-532; `PLAYER_MWA_SPIN_ATTACK_1H` = 24 so jump slashes do not count, `include/player.h:257`); `rally_ball_c` c<3 plain, c>=3 coin is correct. Returned ball strikes Ganon with `returnCount = count + 1` (ff:575).
- Attacks: energy ball damage 16 via `Actor_SetPlayerKnockback(..., 0x10)` (ff:553-554); the large-electrified type's extra `bodyShockTimer = 40` is cosmetic (`z_player.c:4874-4875`, 11729), so `knockback` is the right single effect. Lightning 32, electric (ff:89). Spear 48 (boss:139), body 16 (boss:119), both effect NONE. `blockable: true` on spear and body is correct: the shield quad accepts `0xDFCFFFFF` (`z_player.c:10518`) and the attacks carry `0xFFCFFFFF`, which overlaps on all but bits 20, 21, 29.
- Lightning spawn at hg:540; energy ball spawn at boss:695 (the statement starting there; args on 696).
- Cites read back and correct: boss:119, 139, 310, 485, 505, 508, 524, 526, 528, 529, 533, 539, 541, 542, 564, 574, 595, 603, 636, 637, 656, 668, 745, 758, 780, 795, 799, 808, 818, 832, 846, 862, 878, 882, 901, 1275, 1279, 1280, 1290, 1292, 1302; hg:462, 478, 503, 505, 516, 521, 522, 588, 596, 635, 640, 646, 681; ff:433, 514, 525, 526, 532, 540, 553, 557, 561, 575, 632; `z_collision_check.c:3719-3725`.
- C5: all 9 extracted names (`Block`, `Charge`, `Death`, `Intro`, `Neutral`, `Paintings`, `Return`, `Stunned`, `Throw`) are keys in `actionFuncs`. `Intro` exclusion is true: it ends in `SetupPaintings` on `FHG_START_FIGHT` (boss:439-440) and registers no colliders. `Death` exclusion is true: `SetupDeath` is entered at the finishing blow (boss:1284-1286) and the CollisionCheck is skipped in it (boss:1348-1349).
- C6: both extracted AT elements (boss:119, 139) are mapped to attacks with the right damage; no `runtimeAt` entries exist. The only direct hurt (ff:553) and the En_Fhg_Fire element (ff:89) are carried as `via` attacks.
- `analysis.json`: complete, 51,242 positions, 0 stalls, 0 livelocks; outcomes include Link falls, Link wins, Link withdraws. Not re-run by me.

## Outcomes
1. fixed (partly): `paint_leap` now lasts 26 frames (hittable) and ends with the lightning at `timers[1] == 24` (z_en_fhg.c:539). A new `paint_leap_late` (24 frames, hittable none, cite z_en_fhg.c:574) follows. gap: the window really closes about 2 frames after the lightning (350-unit line, z_en_fhg.c:573, opposite paintings 780-819 apart). Recorded in the spec header.
2. fixed: the lightning step now goes `paint_leap -> paint_leap_late` at z_en_fhg.c:540. The transition to `paint_retreat` is a separate step cited at z_en_fhg.c:589 (`actionFunc = EnfHG_Retreat`). A hit before frame 26 still diverts with no lightning (hitTimer gate, z_en_fhg.c:538). gap: the ~2-frame hit-after-lightning window is dropped (see 1).
3. fixed: `ball_back*` cite moved to z_en_fhg_fire.c:540 (`FIRE_MODE = FHGFIRE_LIGHT_BLUE`).
4. gap: the strike/miss tie is geometry (aim error z_en_fhg_fire.c:519-520, box test 573); even odds are a stated modeling choice. Recorded in the spec header.
5. fixed: each hover phase now has `_t10` (after Block, 10 frames, line 809) and `_t30` (after a stun or charge, 30 frames, lines 781, 902) copies with the same decisions. Block, stun, stun_long and charge_finish return into them. `neutral_p0_t30` is entered only from the unreachable `stun_p0`; its verbs are ledgered with that reason.
6. gap: the 80-frame rally timeout (lines 575, 588, 591-593) depends on ball flight time. Recorded in the spec header.
7. gap: the slow throw (line 650) needs the throw count to reach 10; only timing and ball speed change. Recorded in the spec header.
8. gap: a bottle swing is not one of Link's attacks in the harness (z_en_fhg_fire.c:490-496). Recorded in the spec header.
9. gap: the abstraction (Neutral resumes at lines 672-673 while the ball flies) is now stated in the spec header, including the dropped Block-during-ball path.
10. fixed: `charge_windup*` and `charge_finish*` now have near self-steps that deliver `spear` (line 1366) and `charge_body` (line 1365). gap: which collider touches Link is geometry, so the two tie at even odds. Recorded in the spec header.
11. fixed: renamed `volley_wait*` to `neutral_volley*`, `charge_wait*` to `neutral_charge*`, and `rally_throw*` to `throw_rally*`. The globs `neutral*`, `charge*` and `throw*` now match exactly the Neutral, Charge and Throw states.
12. fixed: the summary now says a melee hit during Block also damages and stuns him (lines 1269-1290).
