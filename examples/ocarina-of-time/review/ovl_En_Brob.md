# ovl_En_Brob

Reviewer: Claude Sonnet 5.5

## Verdict

major findings

## Findings

1. **Missing `backlash` (spec level).** Severity: major (changes what hurts Link). Both colliders use `{ 0xFFCFFFFF, HIT_BACKLASH_ELECTRIC, 0x00 }` as the hurtbox (`src/overlays/actors/ovl_En_Brob/z_en_brob.c:59`). Collision copies it onto the attacker (`src/code/z_collision_check.c:1732`), and the player code shocks Link for 8 on any connecting melee-weapon hit except the hammer (`src/overlays/actors/ovl_player_actor/z_player.c:9139-9150`). The spec has no `backlash` and no backlash attack (compare `studio/tools/ocarina/data/actors/en_bx.ts:16`). The hurtbox is live in `wobble` and `shock` (`SetAC` at `z_en_brob.c:310-311`), so every sword strike there, including the Kokiri slash the spec uses to "set off its shock", also shocks Link. The summary lists the Kokiri slash as the only sword interaction. Boomerang is not melee and does not backlash.
2. **Step `move_up -> wobble` "Block rises into Link", cite `at(291)`.** Severity: minor. In the code an AT contact during `EnBrob_MoveUp` does not change the action function: it only calls `Actor_SetPlayerKnockbackLargeNoDamage` (`z_en_brob.c:289-292`) and clears the flags. `SetupShock` is skipped by the `!= EnBrob_MoveUp` test (293). The phase ends only when the rise animation finishes (178-179). Line 291 shows a knockback call, not a transition to `wobble`. The knockback (and the one at 164 when Link stands on the pillar) is also not carried or reported.
3. **Phase `shock` has no `frames`, step `shock -> wobble` ("The lightning dies down") has no `afterTimer`.** Severity: minor (timing). `SetupShock` sets `timer = 10` (154), and the timer drops by 1 only on animation frame 0 (`Animation_OnFrame(&this->skelAnime, 0)`, line 238), so `shock` lasts ten passes of the shock loop. `EnBrob_SetupWobble` runs at `timer == 0` (263-264). The spec lets the phase end at once with equal chance against `shock -> shock`. The animation length is not in this checkout, so I cannot give the beat count. A new contact or Kokiri slash resets the timer to 10 (294, `SetupShock`).
4. **Range thresholds in `idle`/`wobble` steps.** Severity: minor (labeling). The rise needs `xzDistToPlayer < 300` (167) but the sink needs `xzDistToPlayer > 500` (200). The spec uses one `near`/`far` for both, which leaves 300 to 500 out. This follows the model's single-band rule and is not wrong, but the step labels do not say it.

## Checked

- Attack `zap`: damage 8, `HIT_SPECIAL_EFFECT_ELECTRIC`, `AT_ON | AT_TYPE_ENEMY` at `z_en_brob.c:50,58,60`. `blockable: true` is right: `0xFFCFFFFF` overlaps the shield mask `0xDFCFFFFF` (`z_player.c:10518`).
- Health 0 at `z_en_brob.c:67`; no code calls `Actor_ApplyDamage` or `Actor_Kill` for hits, so `pools: []` and no death are right.
- Boomerang hit goes to `EnBrob_SetupStunned` (276-284). Kokiri slash goes to `SetupShock` unless in `MoveUp` (286-294). The boomerang test comes first. Only `DMG_SLASH_KOKIRI`, not spin or jump, so the two entries are complete.
- Hurtbox liveness: AT and AC are both off in `Idle` and `MoveDown` (305), AT only (no AC) in `MoveUp` (309-311), neither in `Stunned` (306). `idle`, `idle_recover`, `move_up`, `stunned`, `move_down` are `hittable: 'none'`; right.
- Timers: wobble 1200 (133), idle after stun 200 (118), rise when `timer == 0` and `xzDistToPlayer < 300` (162,167-168), sink when `timer == 0` and `> 500` (200-201), `Stunned -> SetupIdle` (206-207), `MoveDown -> SetupIdle` (217-218), `SetupMoveUp` to `SetupWobble` (178-179). All step cites show the transition claimed.
- C5: six inventory names; `idle*` covers `EnBrob_Idle` in both `idle` and `idle_recover`. No exclusions. `atSources` lists the single AT element (58); both colliders share it.

## Outcomes
1. fixed: added `backlash: { attack: 'backlash', cite: z_en_brob.c:59 }` and the 8-damage unblockable, undodgeable `backlash` shock (source line 58). AC is registered only in wobble and shock (310-311), which the existing `hittable: 'none'` on the other phases already gates, so no `backlashOff` is needed. The summary now says every melee hit on the standing block shocks Link.
2. fixed: `move_up -> wobble` "rises into Link" became the self-step `move_up -> move_up` with the zap (cite 291). The AT is registered in MoveUp (307-308) so the contact still shocks, and the phase still ends only through `move_up -> wobble` (179). gap: the large no-damage knockback on that contact (291) and when Link stands on the block (164) are dropped under the one-effect rule, and standing on top has no range band. Both recorded in the spec header.
3. fixed and gap: the phase (renamed `crackle`, since `shock` collides with Link's shock-status verbs) now has `frames: 10` (line 154) and `crackle -> wobble` is `afterTimer`. The code ticks once per loop of `gBrobShockAnim` (238), whose length is not in this checkout (assets/xml/objects/object_brob.xml:35), so 10 frames is a lower bound of one beat. Recorded in the spec header.
4. fixed: step labels now name the bands, "within 300" for the rise (167) and "beyond 500" for the sink (200). One near/far band carries both, per the model.
