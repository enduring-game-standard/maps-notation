# ovl_En_Vali

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

major findings

## Findings

1. **Lethal melee hit never shocks Link** (phases `spin`/`bury` `overrides: shocks`, reaction `EN_VALI_DMG_REACT_SWORD_SLASH` -> `electrify_slashed`, steps `electrify_slashed->damaged`, `damaged_backlash->recover`). Severity: major.
   - Spec: the shock (`backlash` attack, 8 damage) is delivered by a step one beat after the hit, out of `electrify_slashed` or `damaged_backlash`.
   - Code: the shock is applied by the player on the same contact, independent of the Bari's health. `src/overlays/actors/ovl_player_actor/z_player.c:9146-9148` sets damage 8 and electrifies Link whenever a melee weapon quad hit an element with `atHitBacklash == HIT_BACKLASH_ELECTRIC` (set at `src/code/z_collision_check.c:1732`; the cylinder has it at `z_en_vali.c:90`). Nothing there reads the Bari's health.
   - Bari has 2 health (`z_en_vali.c:98`). Master slash (2, line 119), Giant slash (4, line 120), Master/Giant spin (lines 133-134) and Kokiri/Master/Giant jump (2/4/8, lines 135-137) all deal >= 2, so they kill from full health and still shock Link for 8 (4 with Double Defense). Kokiri slash/spin (1) kill on the second hit and also shock.
   - Generated net confirms the loss: `examples/ocarina-of-time/encounters/en_vali.maps:1335-1352` (`body_empty_in_electrify_slashed`, `body_empty_in_damaged_backlash`) give `link_wins` with no `incoming_backlash`, and these fire before the step that carries the shock. So every killing sword/jump blow is free in the model and costs 8 in the code. A Link at 8 or less health who kills the Bari this way dies in the code and wins in the model.
   - Fix direction: the shock needs to land in the hit verb itself (the `spec.backlash` mechanism in `gen.ts` `effectOf`, which attaches `incoming_<backlash>` to the hit), not in a later step.

2. **Backlash stays off after a stun is interrupted** (phase `stunned`, reactions `NONE`/`SWORD_SLASH` `to.stunned = 'damaged'`, phase `spin` overrides). Severity: minor.
   - Spec: `stunned->spin` restores shocking; `stunned->damaged->recover->spin` is a plain return to `spin`, which carries the `shocks` overrides.
   - Code: `EnVali_SetupStunned` sets `hitBacklash = HIT_BACKLASH_NONE` (`z_en_vali.c:268`). The only restore is `z_en_vali.c:443`, inside `EnVali_Stunned` when its timer runs out. A hit during the stun goes to `EnVali_SetupDamaged` (`z_en_vali.c:509` or `520`) -> `EnVali_Recover` -> `EnVali_SetupSpin` (`z_en_vali.c:389`), which never restores it. After a non-lethal hit in the stun (Kokiri slash or spin, 1 damage) the Bari spins with no backlash for the rest of the fight. Once finding 1 is fixed this matters for the finishing blow.

3. **Spin->bury threshold** (step `spin->bury`, range far). Severity: minor.
   - Spec: the Bari withdraws whenever Link is far (the same band that `buried->appear` uses, 150).
   - Code: it appears at `xzDistToPlayer < 150` (`z_en_vali.c:313`) but only withdraws at `> 250` (`z_en_vali.c:350`). Between 150 and 250 it keeps spinning and stays hittable by ranged attacks (AC is on in `Spin`, `z_en_vali.c:212`).

4. **Damaged/Recover durations absent** (phases `damaged`, `damaged_backlash`, `recover`). Severity: minor. Both run until their animation ends (`z_en_vali.c:378`, `388`) and neither has `frames`, so the model makes each last one beat. The animation lengths are not in this checkout (no extracted assets), so this cannot be settled from the decomp; noted only so the author states it.

## Checked

- Health 2: `z_en_vali.c:98` (`sColChkInfoInit = { 2, ...}`); damage table `z_en_vali.c:109-142`; every reaction value used (NONE, STUN, FIRE, ICE, 0xE, 0xF) is interpreted, and the semantics match `EnVali_CheckCollide` (`z_en_vali.c:483-525`): damage-0 NONE does nothing (487); STUN -> stunned unless already stunned (498-501); SWORD_SLASH -> electrify, or damaged when stunned (503-509); FIRE -> burnt, ICE -> frozen (511-514); SLINGSHOT only sets spinTimer (515-518).
- Fire/ice always defeat: damage 4 (`z_en_vali.c:121,122,127,128`) exceeds 2 health; `EnVali_Burnt` -> `EnVali_SetupDie` (398) and `EnVali_Frozen` -> `EnVali_SetupDie` (470).
- `BACKLASH` values match the table: Kokiri spin 1 (132), Giant spin 4 (133), Master spin 2 (134), Kokiri jump 2 (135), Giant jump 8 (136), Master jump 4 (137). Hammer exempt and unbroken Deku Stick returns first (`z_player.c:9143`, `8999-9011`).
- Phase hittability: AC off in `buried` (188), `electrify` (221), `damaged` (229), `electrify_slashed`/`damaged_backlash` (same functions); `appear` and `recover` never re-enable it (only `EnVali_SetupSpin` does, 212 and `EnVali_Electrify` 362); `bury` keeps AC on (no clear in 282-287), so default hittability there is right.
- Steps with correct cites: buried->appear (314), appear->spin (324), spin->electrify (536), spin->bury (351), electrify->spin (366), electrify_slashed->damaged (364), damaged->recover (380), recover->spin (389), stunned->spin (444), bury->buried (479). Timers: electrify 20 frames (219), stun 80 frames (265).
- Attacks: sting damage 8 (`z_en_vali.c:69`, `89`), effect HIT_SPECIAL_EFFECT_7 = none. Blockable: attack flags 0xFFCFFFFF overlap the shield collider's 0xDFCFFFFF (`z_player.c:10518`). Spin-only AT: `CollisionCheck_SetAT` runs only in `EnVali_Spin` (`z_en_vali.c:542-545`), so no sting from `stunned` is correct.
- Stunned turns the backlash off (268) and it is correctly absent from `stunned`.
- C5: all 11 action functions (Appear, Burnt, Bury, Damaged, Die, Electrify, Frozen, Recover, Spin, Stunned, WaitPlayerNear) are in `actionFuncs`; globs `electrify*` and `damaged*` match their two phases each. Exclusion reasons are true: Burnt/Frozen only end in `EnVali_SetupDie` (398, 470); Die is the split and drop after the finishing blow (249-254, 260).
- C6: both AT elements (`z_en_vali.c:69` quad, `z_en_vali.c:89` cylinder) are in `atSources`; the inventory lists no runtime `atDmgInfo` change or direct hurt call.

## Outcomes
1. fixed: f75bd5b alone did not fix this. Its new priority (gen.ts `P.backlash: 93`, above `poolEmpty: 92`) applies only to `spec.backlash`, and this spec delivered the shock through steps and overrides. The spec now sets `backlash: { attack: 'backlash', cite: z_en_vali.c:90 }`, so the shock rides on the hit verb itself. The `shocks` overrides, the `damaged_backlash` phase, and the backlash on `electrify_slashed -> damaged` are gone. Spins and jumps now go through `EN_VALI_DMG_REACT_NONE` to `damaged` with table damage. Checked on the generated net: `hit_slash_master__spin` gives `incoming_backlash`, and a probe replay of a killing Kokiri slash or spin from 1 health with Link at 32 ends with Link at 30 and "Link wins". Remaining harness gap: with Link at 8 or less, the killing blow's backlash drops him to 0 but the pool empties (92) before he falls (89), so the model still says "Link wins". In the code he dies (z_player.c:9146). The fix belongs in gen.ts and is recorded in the spec header.
2. fixed: added `_quiet` copies of buried, appear, spin, electrify, damaged, recover and bury, each `backlashOff: at(268)`, with the same steps. A damaging hit in `stunned` (NONE 520 or SLASH 509) goes to `damaged_quiet`, and only `stunned -> spin` (443-444) restores the backlash. A quiet Bari has 1 health left, so its next damaging hit kills it with no shock.
3. fixed (labels) and gap: the steps now read "within 150" (313) and "beyond 250" (350). One near/far band carries both, so between 150 and 250 the model withdraws where the code keeps spinning. Recorded in the spec header.
4. gap: `gBariDamagedAnim` and `gBariRecoverAnim` have only offsets in this checkout (assets/xml/objects/object_vali.xml:4-5), so `damaged` and `recover` cannot get cited timers. Recorded in the spec header.
