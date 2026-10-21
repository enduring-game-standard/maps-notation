# ovl_Bg_Haka_Tubo

Reviewer: Claude Sonnet 5.5

## Verdict

minor findings

## Findings

1. **Attack `flames` (spec step `idle -> idle`, `atSources` at 78).** The spec carries only the burn. The same contact also knocks Link down: `if (this->flamesCollider.base.atFlags & AT_HIT) { ... Actor_SetPlayerKnockbackLargeNoDamage(...)` at `src/overlays/actors/ovl_Bg_Haka_Tubo/z_bg_haka_tubo.c:129-131` (large knockback, damage 0, defined at `src/code/z_actor.c:1993,2006`). The spec neither carries it nor reports it as the dropped second effect that the one-effect-per-attack rule requires. Severity: minor (burn and the 4 damage are right; the knockback is unreported).
2. **`damage.entries.EXPLOSIVE` cite `at(138)`.** The line is the 50-unit distance test, which is a real condition, but the break itself (state change to `BgHakaTubo_DropCollectible`) is at `z_bg_haka_tubo.c:149`. The cite shows the gate, not the transition. The summary and the entry do not say that the blast must be within 50 units XZ and under 50 units above the jar (138-139). Severity: minor (cite and labeling).

## Checked

- Flame collider: damage 4, `HIT_SPECIAL_EFFECT_FIRE`, `AT_ON | AT_TYPE_ENEMY`, `ATELEM_ON` at `z_bg_haka_tubo.c:70,78,80`. Spec `damage: 4`, `burn` is right.
- `blockable: false` is right. Flame `dmgFlags` is `0x20000000` (`DMG_UNBLOCKABLE`, `include/collision_check.h:441`). The Player shield quad accepts `0xDFCFFFFF` (`src/overlays/actors/ovl_player_actor/z_player.c:10518`), and the AND is 0, so the shield never meets it (rule at `src/code/z_collision_check.c:1419`).
- Jar hurtbox accepts only `0x00000008` = `DMG_EXPLOSIVE` with `AC_TYPE_PLAYER` (`z_bg_haka_tubo.c:51,59`). The En_Bom blast is `AT_TYPE_ALL` (`z_en_bom.c:85`), so it connects. Nothing else breaks the jar. `pools: []` and the single explosion-to-`defeated` entry are right.
- The ring burns only while `BgHakaTubo_Idle` runs: `CollisionCheck_SetAT` is at line 155 inside the `else` of the `AC_HIT` test (151-157). After the break the action function is `DropCollectible`, which never sets AT. This supports the step cite 155 and the `idle` phase.
- C5 ledger: inventory lists `BgHakaTubo_Idle` and `BgHakaTubo_DropCollectible`; both are mapped. The exclusion reason is true: `dropTimer` = 5 (146), decrement at 167, drop or Keese spawn (191-193, 218), `Actor_Kill` at 224. The jar no longer sets AT in that function.
- C6: the only `atOn` element (78) is mapped; the pot element (58) has `ATELEM_NONE`.
- The spec's room-12 spinning behavior (123-127) does not change combat. The Keese spawn (191) is a separate encounter.

## Outcomes
1. gap: one attack carries one effect. `flames` keeps the burn, which costs health. The no-damage knockback on the same contact (z_bg_haka_tubo.c:129-131) is now recorded as the dropped effect in the spec header.
2. fixed: the `EXPLOSIVE` entry cites line 149 (`actionFunc = BgHakaTubo_DropCollectible`), and the summary names the 50-unit XZ and height gate (138-139).
