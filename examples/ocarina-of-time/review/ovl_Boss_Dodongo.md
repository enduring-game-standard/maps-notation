# ovl_Boss_Dodongo

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

Paths: spec is `studio/tools/ocarina/data/actors/boss_dodongo.ts`; `Z` = `src/overlays/actors/ovl_Boss_Dodongo/z_boss_dodongo.c` in `/home/wscottsh/repos/oot-decomp`.

## Verdict

minor findings

No major findings. Who can win, what hurts, and how much all match the code. The problems are timing (the roll), two wrong step cites, and range-band mapping on the walk.

## Findings

1. **Phase `roll` (frames 27) and steps `roll -> walk_free` (both), minor, timing.** The spec treats the roll as a 27-frame windup (1 beat) and leaves it by `afterTimer`. The code's 27 frames is only the delay before he moves (`Z:524`, `if (this->unk_1DA == 0)` at `Z:785`). He leaves the roll when `numWallCollisions >= 2` (`Z:814`, `Z:821`). That means reaching two corners of `sCornerPositions` (`Z:683-688`, 1000 units apart) at speed ramping to 15 per frame (`Z:783`, `Z:786`). My estimate is well over 100 frames of travel, so about 7 to 9 beats in total, not 1. The AT collider is live for the whole roll (`Z:1056-1057`), not just at its end. The `*_timer_clears` dead verb for `roll` ("the roll windup is left only by its timer") describes a timer the exit does not use. Not a major: Link cannot hurt him in `roll` in either version and the roll attack is still 4. The beats between attacks and the V2 "fire_lands_again" argument get stronger with a longer roll, not weaker. The distance figures are my arithmetic from the corner coordinates, not a quoted line.

2. **Step cites, minor, wrong cite.**
   - `roll -> walk_free` (near, attack `roll`) cites `Z:1057`. That line is `CollisionCheck_SetAT`. It shows the roll is hostile, not the transition to Walk. The transition is `Z:821` (`BossDodongo_SetupWalk`), which the far step cites.
   - `inhale -> blow` (near, attack `fire`) cites `Z:651`. That is `BossDodongo_SpawnFire` inside BlowFire. The transition is `Z:672` (`BossDodongo_SetupBlowFire`), which the far step cites. Line 651 is the right cite for the attack, not for the step.

3. **Steps `walk_free -> inhale` (near) and `walk_free -> roll` (far), minor, range mapping.** The code at `Z:752-761` is:
   - Inhale needs `xzDistToPlayer < 500`, `unk_1A4 != 0` and `!playerPosInRange`. `unk_1A4` is a narrow column in front of him: lateral under 150, 100 to 2000 ahead (`Z:1200`). `playerPosInRange` is Dodongo himself within 200 of a corner (`Z:1249-1252`; the name is misleading).
   - Roll needs `!playerPosInRange && !playerYawInRange`. Link is outside the roughly 80-degree frontal cone (`Z:1233`).
   - If Link is far ahead, or in the cone but outside the column, he neither inhales nor rolls and keeps walking. The spec's `far -> roll` fires there. If Link is within 500 but behind him, the code rolls and the spec's `near -> inhale` fires.
   - Neither branch fires while he is within 200 of a corner (`Z:1249-1252`). The spec has no such hold.
   - The step label "Link is off to the side" matches the yaw check. The `near`/`far` band is a coarse stand-in.

4. **Phase `inhale`, hit `EXPLOSIVE` override, minor, timing and window.**
   - The code swallows a bomb only while `unk_1AC > 20 && unk_1AC < 82` (`Z:676`), i.e. frames 21 to 81 of the 100. The spec makes `EXPLOSIVE` hittable for the whole `inhale` phase.
   - It also needs an `ACTORCAT_EXPLOSIVE` actor within 40 units of the mouth on all three axes (`Z:207`). That is a position fact the range band cannot hold.
   - The 2 damage is applied at the end of the Explode timer (`Z:591`, gated by `Z:568`). The spec applies it at the hit (override `damage: 2`, `to: 'explode'`). Net health is the same; the drain is about 2 beats early. The `explode` phase is `hittable: 'none'`, so nothing can observe the difference.

5. **Phase `down` (frames 100), minor, unmodeled duration.** `BossDodongo_LayDown` (`Z:600-611`) runs until its animation ends, then sets `actionFunc = Vulnerable` and `unk_1DA = 100` (`Z:608-609`). The spec's `explode -> down` step goes straight to the 100-frame phase. The LayDown animation length is not in the spec. Hits are legal during LayDown (`Z:1296`), so the spec gets the hit rule right but the stun is longer than the 5 beats given. I could not read the animation length from the decomp source, so I cannot say how much longer.

## Checked

- **Health.** `hp` 12 at `Z:231`. The only other inventory health value, `1` at `Z:595`, is the bomb floor (see below).
- **Damage rule.** `custom` is correct: no DamageTable. Damage is `CollisionCheck_GetSwordDamage` (`Z:1297`) on element 0 only (`Z:1293`), and only in Vulnerable or LayDown (`Z:1296`), so `down` is the sole hittable phase. A hit also needs `unk_1C0 == 0` (`Z:1275`). All 12 `SWORD` entries match `src/code/z_collision_check.c:3718-3725`: Kokiri slash and spin 1; Kokiri jump, Master spin and slash, hammer swing, Deku stick 2; hammer jump, Master jump, Giant spin and slash 4; Giant jump 8. Each cite lands on the flag-mask line for its tier. Non-sword types return 0 and do nothing (`Z:1299`).
- **Hit transition.** A hit goes to Damaged (`Z:1301`, `Z:1303`), which has 5 frames of invulnerability, so one sword hit per knock-down. Damaged leaves for Roll (`Z:551-552`). Death at `health <= 0` (`Z:1269-1272`) matches `then: 'defeated'`.
- **Inhale breakers.** `SLINGSHOT` and `BOOMERANG` in Inhale, damage 0, go to Walk with `unk_1DA = 0x32` (`Z:1281-1286`). That is `walk_recover`, 50 frames, which the spec cites at `Z:1285` and `Z:1286`. This applies on any of the 19 elements (`Z:1277-1278`), so the spec's inhale `hittable` list is right. No other type does anything in `inhale`.
- **Other phases.** `walk_*`, `blow`, `explode`, `getup`, `damaged`, `roll` are `hittable: 'none'`: no hit handling exists in those action functions (`Z:1275-1306`).
- **Timers.** `inhale` 100 (`Z:541`), `blow` 50 (`Z:532`), `explode` 35 (`Z:505`), `down` 100 (`Z:609`), `walk_recover` 50 (`Z:1286`, `Z:458`), `roll` 27 (`Z:524`) all match their lines. The `afterTimer` flags on `walk_recover`, `inhale`, `blow`, `explode`, `down` match the `unk_1DA == 0` checks (`Z:752`, `Z:671`, `Z:656`, `Z:568`, `Z:620`). `getup` and `damaged` leave on animation end (`Z:630`, `Z:551`), so no timer is right.
- **Transition cites.** `Z:587`, `Z:623`, `Z:631`, `Z:552`, `Z:657`, `Z:672`, `Z:754`, `Z:759`, `Z:821` each show the claimed `actionFunc` change or setup call. No transition is missing from the action functions: the only ones out of Walk are Inhale and Roll; out of Inhale, BlowFire, Explode, and Walk; out of Roll, Walk.
- **Attack `roll`.** All 19 AT elements are `{0xFFCFFFFF, HIT_SPECIAL_EFFECT_NONE, 0x04}` (damage 4, no effect) at `Z:` data lines 19 through 217. The AT is registered only while `actionFunc == BossDodongo_Roll` (`Z:1056-1057`), as the summary says. `blockable: true` is correct: the shield quad bumper is `0xDFCFFFFF` (`z_player.c:10516`), which intersects `0xFFCFFFFF`.
- **Attack `fire`.** Spawn at `Z:1258` (`ACTOR_EN_BDFIRE`); called from BlowFire at `Z:651`. En_Bdfire sets Link burning (`z_en_bdfire.c:185-187`) and calls `Actor_SetPlayerKnockbackLarge(..., 8)` (`z_en_bdfire.c:188`), so damage 8, burn, `blockable: false` (a distance test, no collider). The skip when already burning is at `z_en_bdfire.c:178`. The `params < 0` light spawned on entering Inhale (`Z:755`) has no damage (`z_en_bdfire.c:98-134`).
- **C5 ledger.** All 11 extractor action functions are mapped. `Vulnerable` and `LayDown` -> `down`, `Walk` -> `walk_*`, and the rest map one to one. `IntroCutscene` exclusion is true: it ends in `BossDodongo_SetupWalk` with `unk_1DA = 50` (`Z:457-458`). `DeathCutscene` exclusion is true: it starts at `Z:1269-1270` once health is 0.
- **C6 `atSources`.** The 19 `ELEMENT_LINES` match the 19 inventory elements. There are no runtime `atDmgInfo` changes and no direct-hurt entries in the inventory for this overlay.
- **Declared floor.** The bomb clamp (`Z:594-595`) is in CONTRACT.md's list of declared floors. The spec does not mention it. In the model six bombs alone can reach 0 and win; in the code the sixth leaves 1 and a sword hit is still needed. This is the contract's declared gap, not a spec error.
- **Ages.** Loadouts are child only. `Z` contains no `LINK_IS_ADULT` or age check (grep of the file), and the checkout has no scene actor list, so I cannot confirm or refute the choice. The adult sword entries in `SWORD` are unreachable in the model. Not a finding: no cite can show the age.

## Outcomes
1. fixed: the roll is now three phases. `roll` is the 27-frame windup (`Z:524`), `roll_1` runs to the first corner (`Z:812`) and `roll_2` to the second (`Z:821`). All three carry a near self-step that delivers the roll attack, since the AT collider is live for the whole Roll (`Z:1056-1057`). Gap: the legs are distance-driven, so their length in beats is a chance, not the code's travel time. Recorded in the spec header.
2. fixed: the near roll steps cite `Z:1057` for the attack and `Z:821` for the move to Walk. Both inhale-to-blow steps cite `Z:672`.
3. fixed in part: near now goes to either inhale or roll (Link beside or behind him, `Z:758-759`), far goes to either roll or walking on, and a walk-on step with no range covers Link ahead but off the column or Dodongo near a corner (`Z:753`). A new `walk_corner` phase follows every roll, because the roll ends at a corner (`Z:1249-1252`). Gap: his walk clear of the corner (about 2.8 units a frame, `Z:726`) gets one beat. Recorded in the spec header.
4. fixed in part: the inhale is split at the swallow window (`Z:676`) into `inhale_early` (20), `inhale_open` (61) and `inhale_late` (19), and only `inhale_open` takes `EXPLOSIVE`. Gap: the 40-unit mouth test (`Z:207`), the 2 damage landing at the end of Explode (`Z:591`), and the health floor of 1 (`Z:594-595`). Recorded in the spec header.
5. gap: the LayDown animation length is not in this source (`Z:605-609`). Recorded in the spec header.
