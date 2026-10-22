# ovl_Boss_Ganon2

Reviewer: Claude Sonnet 5.5

## Verdict

major findings

## Findings

All code cites are in `src/overlays/actors/ovl_Boss_Ganon2/z_boss_ganon2.c` (`g2:`), unless stated. Spec lines are in `studio/tools/ocarina/data/actors/boss_ganon2.ts` (`spec:`).

1. **Band `re`, tail override and step `downed -> idle_re` (spec:34, spec:118). Severity: major.**
   Spec: in the `re` band any tail hit costs 0 and sends Ganon to `collapse` at once (cite g2:2293). The step label says "health restored to 25", but the pool is never restored and the `re` hit rule ignores it. Code: getting up without the sword sets health to 25 (g2:1742, `unk_334 == 0`). A tail hit then costs 1 (g2:2282, g2:2290; the Master Sword types cannot connect in this band by the spec's own rule). The collapse test is `health <= 20 && unk_334 == 0` (g2:2292). So 25 -> 24 goes to `damaged` (g2:2300), and it takes 5 tail hits to reach 20 and collapse. The spec makes it 1 hit, and it has no `damaged_re` phase (spec:60) for the 4 hits in between. Link wins by a different path length. The 25 is in the inventory (health value at g2:1742) and the spec uses it only in a label.

2. **Phase `guard_*` `hittable: 'none'` (spec:58), dead verbs `guard_*_timer_clears` (spec:149-152). Severity: major.**
   Spec: nothing connects in a guard, and no hit moves Ganon out of it (cite g2:2241). Code: g2:2241 gates only the head branch, which sits inside `if (this->unk_313)` (g2:2240). The tail branch (g2:2273-2303) has no action-function check. The guard function never turns Ganon (g2:1404-1421, no `func_808FFBBC` call), so for its 40 frames (g2:1401) Link can stand behind him (`unk_313` is recomputed every frame from yaw, g2:1333-1339). A tail hit in a guard costs health (g2:2290) and calls `func_80900210`, which moves him to the damaged state (g2:2300, g2:1460). The spec's own reasoning for `stunned` (no turning, so the tail is available) applies equally here. The dead-verb reasons are false for tail hits.

3. **Facing is fixed per phase, but the code recomputes it every frame (phases `idle_*`, `walk_*`, `swing_*`, `stunned_*`). Severity: minor.**
   Spec: `idle`, `walk`, `swing_r` and (post) `swing_l` take head hits only (`frontHits`). Pre/re `swing_l` and `stunned` take tail hits only (`tailHits`). Code: `unk_313` is set each Update from the yaw difference (g2:1333-1339), and the head branch (g2:2240-2271) and tail branch (g2:2273-2303) each run in every action function except where g2:2241 or g2:2233 gates them. Idle turns only if `unk_313` is already true (g2:1394-1395, g2:1312), and so does the right swing (g2:1574, g2:1579). So a Link behind Ganon in idle or the right swing hits the tail. A Link in front during the pre left swing still hits the head: a light arrow stuns (g2:2245-2246) and anything else makes him guard (g2:2267-2268). The same holds in `stunned`: a head hit there restarts the stun or makes him guard (g2:2245, g2:2267). The spec's convention is a defensible abstraction (the left swing does not turn in the pre bands, g2:1576-1577; the stun does not turn). But it removes the other exposure from each phase, and the summary states it as fact.

4. **Step `collapse -> downed`, cite g2:1710 (spec:116). Severity: minor.**
   Line 1710 is `this->unk_1AC = 1;` inside the downed action function (the lying-still loop). The change of action function is g2:1586 (`this->actionFunc = func_80900890`), which is also the cite of the `downed` phase.

5. **Step `idle_* -> walk_*`, `range: 'far'` (spec:66). Severity: minor.**
   Code: at timer 0 the idle function goes to the walk function with no distance test (g2:1388-1389). The swing test is the `else if` branch (g2:1390-1391), so it never runs on the beat the timer expires. Near does not block the walk step. The spec's near/far split lets Ganon swing, and not walk, on that beat.

6. **Step `downed -> idle_re`, `range: 'far'` and `afterTimer` (spec:118). Severity: minor.**
   Code: Ganon gets up when the timer is 0 (or `unk_334 != 0`) and Link is within 784 of the arena center (g2:1718-1727). Neither depends on Link's distance to Ganon. The spec means that a Link standing near him keeps him down (only `downed -> rising_ms` is available near). The 784 test (Ganon waits while Link is outside the ring) is not modeled.

7. **Swing range (steps at spec:65, 67, 70). Severity: minor.**
   Both swing starts use `xzDistToPlayer < 150` and a facing test (g2:1343-1344). The follow-up right swing uses `< 250` and `unk_313` (g2:1567). One `near` serves both distances, so `swing_l -> swing_r` fires as if 150 reached. A Link between 150 and 250 away gets the right swing in the code, and the spec gives it `swing_l -> idle (far)`.

8. **Missing transition: wall swing (g2:1348-1350). Severity: minor.**
   Idle and walk also start a swing, ignoring range and facing, when Ganon touches a wall (`BGCHECKFLAG_WALL`) within 200 units of a `DEMO_GJ` prop with params 0x10, 0x11 or 0x16 (g2:1261-1282). It depends on scene actors that the checkout does not have, so it may be out of scope. The spec does not mention it.

9. **Invulnerability after a hit (phases `damaged_*`, `stunned_*`). Severity: minor.**
   Code: a tail hit sets `unk_316 = 60` (g2:2277; a Master Sword head hit does too, g2:2252), and while it is nonzero every body hit is discarded (g2:2233-2237). That is 3 beats. The spec only makes `damaged` unhittable and lets `damaged -> walk` fire on any beat (spec:76, no frames), so Link can hit again as soon as Ganon is out of `damaged`, and a light arrow can stun him during the window. The damaged animation length is in the binary object and is not available, so the real window is at least the anim and at most 60 frames.

10. **Ledger: `func_80900890 -> 'downed'` (spec:132). Severity: minor.**
    The same function runs `rising_ms` (the get-up half, `unk_1AC == 2`, g2:1736-1746, and g2:1730 is what the spec cites for the phase). `rising_ms` is not in the ledger. In `rising_ms` (and in `downed` once `unk_334 != 0`) a tail hit connects with any type (g2:2233 only clears hits when `unk_334 == 0`), so `hittable: MASTER` (spec:103) leaves out tail hits, which cost 1, 2 or 4 (g2:2282-2290).

11. **Idle start gate (phase `idle_pre`, spec:54). Severity: minor.**
    After the intro, `unk_1A2[1] = 50` (g2:1198) and the idle swing test runs only when it is 0 (g2:1390). The first idle of the fight cannot start a swing for 50 frames. The walk function has no such gate (g2:1523). The spec starts in `idle_pre` with `near -> swing` possible at beat 1.

## Checked

- Health 30 at g2:457; `then: held` and the two thresholds (g2:2293, g2:2298) match `func_80900818` / floor-at-1 behavior. Pre band: 30 -> 20 takes 10 tail hits of 1.
- Tail damage by type: 1 (g2:2282), 2 for slash/spin Master (g2:2287), 4 for jump Master (g2:2285). Master Sword head hit in the downed state costs 2 (g2:2256) and sends him to damaged or held (g2:2261-2264).
- Hit mask `0xFFCFFFFF` on elements 0 and 15 (g2:115, g2:280): everything except SHIELD and MIR_RAY (include/collision_check.h:432-433). `ALL` is right.
- Light arrow on the head stuns (g2:2245-2246) except while downed; any other head hit makes him guard (g2:2267-2268); no response while he already guards (g2:2241).
- Sword attack: damage `0x40` = 64 at g2:307 and g2:318, both elements AT_ON. The AT collider is registered only for `unk_444` (g2:2418). The sword spheres are moved to y = -2000 except during the swing window (g2:3155-3157, g2:2965-2975, `unk_312` set at g2:1555 and g2:1559). `blockable: true` is right: `0xFFCFFFFF` includes bit 29, but the shield accepts `0xDFCFFFFF` (z_player.c:10517), which still overlaps. Knockback 15 at g2:2193 is the direct hurt call.
- Body spheres exclusion (16 elements, g2:115-280): `unk_424` is never passed to `CollisionCheck_SetAT` (grep: only g2:2418, for `unk_444`). Ring of fire exclusion (g2:2212): burn and knockback only past 784 of (-200,-200) and while `unk_324 > 0`; the ring fades in downed (g2:1649).
- Master Sword removed before the fight: g2:1036 uses `PLAYER_CSACTION_86`, whose handler is `func_80852648`, which calls `Inventory_DeleteEquipment` (z_player.c:15892, z_player.c:15199). Master Sword comes back at `unk_334 = 1` (g2:1674).
- Phase cites: g2:1362, 1400, 1427, 1460, 1474, 1541, 1586, 1730, 1755 each show the `actionFunc =` change. Timers: 40 (g2:1367), 0-30 (g2:1365), 100 (g2:1476), 40 (g2:1401), 80 (g2:1439), 300 (g2:1642). Step cites 1346, 1389, 1411, 1451, 1468, 1518, 1521, 1568, 1570, 1740, 3248 each show the call named.
- `held` kill: needs Link within 70, facing, melee state on, Master Sword in hand (g2:1972-1973); the collision check is skipped in that state (g2:2412).
- C5 ledger: all 10 extracted action functions are keyed. `func_808FD5F4` is the intro with Link in cutscene (g2:491, g2:513, g2:1194); `func_808FFDB0` is a one-frame setup into idle (g2:1362). Hits during `downed` before the sword is taken are all cleared (g2:2233), so `downed` unhittable is right.
- Loadouts: adult only, 5 hearts, enough to survive one 64-damage hit (4 hearts).

## Outcomes
1. fixed: the `re` band is removed. The get-up without the sword is `down_lying -> idle_pre` with `restore: { pool: 'body', to: 25, cite: z_boss_ganon2.c:1742 }`. While unk_334 is 0, nothing else separates the two bands, so tail hits cost 1 again (2282, 2290). The re-armed threshold at 20 (2292) collapses him after 5 hits. New ledger entries `body_resets_hp_body`, `body_rearms_1` and `body_stands_again` record that the reset only ever runs at health 20 or less (above 0).
2. fixed: `guard_*` now takes tail hits (`tailHits`), because 2241 gates only the head branch and the guard never turns (1404-1421). The four `guard_*_timer_clears` ledger entries are removed. They are live now.
3. gap: there is no facing band. Each phase carries the exposure its turning implies. Recorded in the spec header with 1333, 1395, 1527, 1576-1579, 2240 and 2273.
4. answered: `down_collapse` and `down_lying` are both sub-states of `func_80900890` (1586). `down_collapse` is unk_1AC 0, the downed-start animation, and 1708-1710 is where it becomes unk_1AC 1, lying still. So 1710 shows this transition. 1586 is the entry into `down_collapse` and stays that phase's cite.
5. fixed: `idle_* -> walk_*` no longer has `range: 'far'` (1388-1389). Steps have no "only before the timer" gate, so after the timer a near Link sees walk and swing tie. Recorded in the header.
6. answered: in `down_lying`, near means Link is at the fallen sword. He picks it up the frame he comes within 25 of it (3245-3248), so a near Link takes `down_lying -> down_rising_ms` before any get-up. The 784-unit ring test (1725) is the arena edge, which has no band. Recorded in the header.
7. gap: one near band serves both 150 (1343) and 250 (1567). Recorded in the header.
8. gap: the wall swing (1348-1350) needs DEMO_GJ scene props (1261-1282), and the checkout has no scene actor list. Recorded in the header.
9. gap: the 60-frame no-hit window (2277, 2233) spans `damaged` and the walk after it. The damage animation's length is not in the source, and a timer on `damaged` would also stall the walk's swing. Recorded in the header.
10. fixed: the ledger now has `func_80900890: 'down_*'`, covering `down_collapse`, `down_lying` and `down_rising_ms`. `down_rising_ms` now also takes non-Master tail hits for 1 into `damaged_ms` (2282). Master types keep the head cost of 2 (2256). The tail cost of a Master jump, 4 (2285), is folded into the head cost, because one phase holds one cost per type.
11. fixed: a new start phase `idle_intro` (40 frames, 1367; gate 1198) has only the timed step to `walk_pre`, so the first idle never swings.
