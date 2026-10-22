# ovl_Boss_Sst

Reviewer: Claude Sonnet 5.5 (spec: `studio/tools/ocarina/data/actors/boss_sst.ts`; code: `src/overlays/actors/ovl_Boss_Sst/z_boss_sst.c` and `z_boss_sst_colchk.inc.c`; lines below are in `z_boss_sst.c` unless a file is named)

## Verdict

major findings

## Findings

1. **major** - `attacks.grab.effect` (`damagePerBeat` 8 per 20 frames, `release: 'escape'`) and the `atk_grab` -> `atk_retreat` step. After a successful grab the hand picks Crush or Swing at even odds (`Rand_ZeroOne() < 0.5f`, 1854-1858). Only Crush deals the 8 per 20 frames (`damagePlayer(play, -8)`, 1914). Swing (1942-1996) has no damage call at all, resets `actionVar2` to 0 every frame so Link cannot struggle free (1975), and ends by releasing him with a no-damage knockback (1988-1991). The spec treats every successful grab as a crush Link can escape. Half of grabs do only the 32 from the grab hit (`HandSetDamage(0x20)`, 1834), and those holds cannot be escaped. The swing branch is missing from the spec.

2. **major** - `down1_3_retreat` -> `drum` step ("The shaking hand gives up and slams back into place", cite 2087). The spec gives it no attack. The code runs `BossSst_HandSetupSlam` (2085-2087), which sets hand AT damage 0x20 (1506) and spawns the shockwave on landing (1539, cylinder AT damage 0x10, `col(309)`). Link can take 32 under the falling hand or 16 from the ring. This slam also differs from the healthy slam in two ways. The shaking hand's AC was cleared when it was hit (2559), so it cannot be hit during the slam. After the 30 frame timer it goes to `HandSetupWait` (1526-1527), not to EndSlam and Retreat (1523-1525). The step's cite 2087 does show the slam, but the spec labels it as harmless.

3. **minor** - `attacks.clap` (`effect: knockback`). A clap hit calls `BossSst_HandGrabPlayer` (1755-1758). `grabPlayer` sets the same held state as the grab (2443-2444). Link is carried with the hand (1785-1788) through the closing swing and the 30 frame timer (1762), then released with a no-damage drop (1751, 2463). Link cannot act while held, and the spec shows a plain knockback. Hitting a clapping hand releases him (2561-2563) and sends the other hand to retreat (2564). The 32 damage (1730) is right.

4. **minor** - `down2_charge` -> `down2_end` carries only `charge` (head, 48). `HeadSetupCharge` also sets both hands' AT damage to 0x20 (748-749). A hand hit on Link is handled in `HandReadyCharge` (2109-2115) and clears the head's AT too (2112). Contact with a hand deals 32, not 48, and which one connects first depends on geometry. I did not resolve which. The spec has no 32-damage path in the charge.

5. **minor** - `stun_open` (hookshot). `HeadSetupVulnerable` makes jnt-sphere element 10 hookable (907). While `ACTOR_FLAG_HOOKSHOT_ATTACHED` is set, the timer rises by 2 per frame, capped at 50, and does not count down (922-924). A hookshot hit holds the stun window open. The spec treats the 50-frame timer (cite 910) as always running out. The hookshot does no damage (the head code reads only the cylinder's `AC_HIT`, 2586), so only timing changes.

6. **minor** - `stun_open` hittability after a hit. A hit in Vulnerable goes to `HeadSetupDamage`, which turns the cylinder's AC off (946). AC stays off until the damage animation ends and `HeadSetupVulnerable` turns it back on (956-958, 904). The spec keeps `stun_open` fully hittable. The 50-frame timer keeps counting through Damage (952-954, and 909-911 does not reset it), so the window is not extended.

7. **minor** - `down2_ready` (eye hittable from entry). Hitting the second hand runs `HeadSetupDamagedHand(true)`, which plays the eye-open animation (707) in `BossSst_HeadDamagedHand`. `ReadyCharge`, which sets the cylinder's `AC_ON` (731), starts only when that animation ends (714-717). The cylinder starts with `AC_NONE` (`colchk.inc.c:282`). So the eye cannot be hit during that flinch. The spec handles the same flinch for ice (`ice_open`, `hittable: 'none'`) but not for the two-hand case. The flinch length is an animation length, which I did not look up.

8. **minor** - C5 ledger mappings that do not match where the function runs:
   - `BossSst_HeadWait: 'atk_*'`. HeadWait also runs through the whole one-hand-down window, since `HeadDamagedHand` ends in `HeadSetupWait` (723). It runs through the retreat until both hands are in `HAND_WAIT` (662). So it covers `down1_*` and `atk_retreat` as well.
   - `BossSst_HandStunned: 'stun_knockout'`. The hands stay in HandStunned through `stun_open` (2144-2146 sets `ready` once the head is Vulnerable, and HandDamage returns to Stunned at 2178). They leave only at `HandSetupRecover` (931).
   - `BossSst_HandWait: 'drum'`. HandWait also runs as the other hand's 20-frame wait in `down1_*` (1271-1281).
   - `BossSst_HeadDamagedHand: 'down1_*'` also runs the flinch for `down2_ready` and `ice_open`.

9. **minor** - `BossSst_HeadLurk` exclusion (cite 381). The reason says "no collider is checked", but line 381 is only the `yDistToPlayer < 1000` wait. The fact is at 2705 (the `!= HeadLurk && != HeadIntro` guard). That guard sits in the `NTSC_1_2` and later branch. The earlier branch (2699-2703) always calls `SetAC` on the sphere. `HeadIntro` already cites 2705.

10. **minor** - Slam strike step (`END_CITE.slam`, `at(1532)`). Line 1532 is `this->timer = 30` after landing. The AT-hit handler that knocks Link 100 units away is at 1546-1554. The cite does not show the claimed hit.

11. **minor** - `invisible: true` phases (`down2_ready`, `down2_charge`, `ice_ready`, `ice_break`) and the Lens. The code uses the Lens only for drawing and z-target attention: `vVanish` toggles `ACTOR_FLAG_REACT_TO_LENS` (2687-2693), and the draw skips the display list (2823). The eye cylinder's AC is set whenever `acFlags & AC_ON` (2706-2708), with no Lens test. So a hit can connect without the Lens. The spec's rule "attacks need the Lens to connect" is a modeling assumption from `spec.ts`, not a code rule. The dead-verb entries rest on it (`expected.deadVerbs`, "no kit that carries this attack carries the Lens"). Flagged for a decision.

12. **minor** - Sweep damage condition. `HandSweep` keeps AT on only while `player->cylinder.dim.height > 40.0f || player->actor.world.pos.y > 1.0f`, and turns it off after the first hit (1608-1628). The spec's `sweep` is a plain dodgeable attack. This matches only if low-profile states are counted as a dodge.

## Checked

- Damage table: all 32 entries of `TABLE` match `sDamageTable` (`colchk.inc.c:321-352`), including the three reaction values (ice arrow and ice magic reaction 3 at 333 and 339; light magic reaction 4 at 340). `TABLE` follows the `DMG_TYPES` bit order.
- Health 36: `sColChkInfoInit = { 36, ... }` (`colchk.inc.c:318`). Head damage applies only in Vulnerable (`Actor_ApplyDamage`, 2589-2590). Hands never apply damage (2552-2583).
- Hand hit rule: a counting hit needs `damageReaction != 0 || damage != 0` (2557). Reaction 3 goes to Frozen (2568-2569). Everything else goes to Reel (2571). That matches `handHits`, and the `0x4` note (no case of its own) is true.
- Eye outside Vulnerable: any counting hit goes to `HeadSetupStunned` with no damage (2588, 2599-2600), as `eyeHits` does. Vulnerable accepts `DMG_SWORD | DMG_DEKU_STICK` (905). `DMG_SWORD` is slash, spin and jump (`collision_check.h:445-448`), which matches `SWORD_STICK`.
- `AC_TYPES` mask 0xFFCFFFFF on all 11 hand elements and on the eye cylinder (`colchk.inc.c:9, 290`). All 11 hand elements have `ACELEM_ON`.
- Attack damages: slam 0x20 (1506), sweep 0x10 (1589), punch 0x10 (1653), clap 0x20 (1730), grab 0x20 (1834), charge 0x30 = 48 on all 11 head elements (`colchk.inc.c:145-255`), shockwave 0x10 (`colchk.inc.c:309`), crush -8 every 20 frames (1889, 1898, 1906-1914). All attacks are unblockable through `0x20000000` (`DMG_UNBLOCKABLE`), so `blockable: false` is right.
- Attack odds: `rand * 6`, or `rand * 5/6` capped at 4 when the other hand is Damaged (2504-2514). Slam 0, sweep 1, punch 2, grab 3 and 4, clap 5 (2515-2525). Weights 1/1/1/2/1 are right, and clap is absent in the one-hand-down cycles.
- Punch is hardened (1651) and un-hardened only by Retreat (1432), so `guards: AC_TYPES` for the punch is right. `ReadyPunch` is not hardened (1640-1646).
- Other cites confirmed: 668 (timer 127), 673, 663, 714-719, 735-739, 757, 773, 807-815, 824, 852, 898, 905, 910, 933, 963, 993, 1266, 1438, 1455, 1478, 1486, 1512, 1517-1524, 1539, 1569, 1581, 1598, 1607, 1640, 1644, 1657, 1674, 1697, 1704, 1734, 1752, 1816, 1824, 1838, 1862, 2001 (reel timer 36), 2392, 2402, 2434, 2516-2524, 2533, 2557-2571, 2588-2600.
- Shockwave near and far split: the cylinder AT is cleared when Link is inside the inner ring (`xzDistToPlayer < ...`, 2621-2623), so the `range: 'far'` shockwave and `range: 'near'` slam split is right.
- Ice: the second hand turns invulnerable at `ReadyBreakIce` (2376). The frozen hand's AC is already off (2559). The head's AC comes on in `FrozenHand` (824) and goes off in `UnfreezeHand` (837). `ice_ready` and `ice_break` are eye-only, as `eyeHits` says.
- Stun: head AC is off in `Stunned` and `Recover` (852, 963) and the hands are hardened with AC on (2125-2126), so `stun_knockout` and `stun_recover` are `hittable: 'none'`.
- C5: every `actionFunc =` target in `z_boss_sst.c` (56 functions) has a ledger entry. The ten death-sequence exclusions cite the right function lines (1065, 1107, 1126, 1162, 1180, 1204, 2198, 2236, 2250, 2266, 2287). The cutscene reason for `HeadIntro` is true. Mapping gaps are in finding 8.

## Coordinator finding

13. major. The eye phases are marked `invisible`, so the model lets Link hit the eye only with the Lens of Truth. The code registers the head's AC colliders with no Lens check (z_boss_sst.c:2705-2710, debug branch :2700-2703). The Lens gates only Z-targeting and drawing (`vVanish` with ACTOR_FLAG_REACT_TO_LENS, :2718). A Link without the Lens can still hit the eye, so kits without it can win.

## Outcomes
1. fixed: a grab now splits at even odds (z_boss_sst.c:1854-1858) into `grab` (crush: 8 per 20 frames, escapable, step cite :1855) and `grab_swing` (32 on contact, then `paralyze` for about 92 frames, no drain, no escape, step cite :1857). The 92 frames are derived from the swing steps at :1946 (scale 1.5, src/code/z_lib.c:55) and assume the hand starts level. The spec header records this.
2. fixed: `down1_3_retreat` now delivers the shaking hand's slam (near `slam` 32, cite :1546; far `shockwave` 16, cite :1539) into a new `down1_slam` phase. That phase has a 30-frame timer (:1532), the fallen hand is unhittable, and hits on the other hand send it reeling. The phase goes to `drum` after the timer (:1527), not through EndSlam and Retreat.
3. fixed: `clap` is now `paralyze` for 30 frames (:1762), released with a no-damage drop (:1751, :2463), in place of knockback. The closing swing before the timer depends on geometry and is left out. The spec header records this.
4. fixed: a second step `down2_charge` -> `down2_end` delivers `fist_charge` (32, HAND_RUNTIME, cite :2109). It ties with the head's 48 because the code has no draw and which one connects depends on geometry. The spec header records this.
5. fixed (approx.): `stun_open` accepts HOOKSHOT (element 10 hookable, :907). A hookshot hit goes to a one-beat `stun_hooked` phase that re-enters `stun_open` with a full timer (:922-924). A short pull refills the timer less than this. The spec header records this.
6. gap: a phase timer cannot carry across phases, so a hurt phase would restart the 50-frame window, and the damage animation's length is not in the decomp source. `stun_open` stays hittable. The spec header records this.
7. fixed: hitting the second hand now goes to `down2_flinch` (`hittable: 'none'`, :707), which steps to `down2_ready` when the eye-open animation ends (:717), matching `ice_open`.
8. gap, with one fix: renamed `stun_recover` to `recover`, so `BossSst_HandStunned` now maps to `stun_*` (knockout, open, hooked) and HandRecover and HeadRecover map to `recover`. An actionFuncs value is one phase or one prefix glob, so HeadWait (also down1_*), HandWait (also down1_*_wait) and HeadDamagedHand (also down2_flinch and ice_open) keep their main group. The spec header records this.
9. fixed: the HeadLurk exclusion now cites :2705 and says that from NTSC 1.2 on the AC colliders are not checked while the head lurks.
10. fixed: the slam strike now cites the AT-hit handler at :1546.
11. fixed: through 13.
12. gap: the model's dodge is its only low-profile stance. Crouching under the sweep (:1622) is not a stance the model has. The spec header records this.
13. fixed: removed `invisible` from every eye phase, because the Lens only gates drawing and z-targeting (:2687-2693, :2718) and the AC registers without it (:2705-2710). Removed the Lens dead-verb entries and the `adult_ice_lens` kit. Every sword kit can now win.

Coordinator note (crush contact): the grab's contact deals 32, because `HandSetDamage(this, 0x20)` (:1834) arms the AT before any crush, so the contact damage stays 32 with source HAND_RUNTIME (:2533). The 8 every 20 frames (:1914) is the drain, cited as `damagePerBeat`.
