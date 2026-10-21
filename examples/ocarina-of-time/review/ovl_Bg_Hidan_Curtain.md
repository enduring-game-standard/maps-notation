# ovl_Bg_Hidan_Curtain

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. Attack `flame` (spec atSources `z_bg_hidan_curtain.c:57`, step cites `:244`). The spec carries burn only. On contact the code also knocks Link back: `if (this->collider.base.atFlags & AT_HIT) { ... Actor_SetPlayerKnockbackLargeNoDamage(play, &this->actor, 5.0f, ...)` (`src/overlays/actors/ovl_Bg_Hidan_Curtain/z_bg_hidan_curtain.c:229`). AUTHORING says the author reports the second effect. Neither the header nor the summary mentions it. Severity: minor.
2. Variants and steps, types 0, 5, 6. Type 5: `TurnOff` ends in `WaitForSwitchOff` (`z_bg_hidan_curtain.c:190-191`), and `WaitForSwitchOff` goes to `TurnOn` (`:170-171`), which then lowers the ring (inverted) back to rest. The spec maps `WaitForSwitchOff` to `rest_up`, but `rest_up` has no step out and no variant reaches it from a type 5 raise. `turnoff_raise_t5` and `turnon_lower` for type 5 are missing, and `turnon_lower` is labeled "(type 4)" only. Types 0 and 6: `TurnOff` ends in `Actor_Kill` (`:188-189`), and the lowering fire burns while it sinks. No `switched` variant covers either. The "switched" variants are only for types 1 to 4. The header says "one variant per timed type", so this is partly disclosed, but type 5's `WaitForSwitchOff`/`TurnOn` return path is a transition the code makes that the spec does not show. Severity: minor.
3. `timer_open_t1` and `rest`/`turnoff` for type 1. `Update` kills a type 1 ring that is out (alpha at or under 50) once its treasure flag is set (`:249-250`). The spec's `timer_open_t1 -> turnon_raise` step (`:210`) always returns the ring. Link's own chest opening sets the flag, so this is outside the beat model, but it is a code transition that is not reported. Severity: minor.

## Checked

- Damage 4, `HIT_SPECIAL_EFFECT_FIRE`, `0x20000000` = `DMG_UNBLOCKABLE` (`include/collision_check.h:441`), so `blockable:false` is right (`z_bg_hidan_curtain.c:57`). AC is `ACELEM_NONE`, so `pools: []` and `damage: none` are right (`:58-60`).
- Burning only when alpha is above 50 (`:242-244`). Inverted types 4 and 5: `:123-125`, `:231-238`. At rest the fire is out (net inversion gives alpha 0).
- Timers: type 2 is 400 (`:194`), type 4 is 200 (`:196`), type 3 is 160 (`:198`), type 1 is 300 (`:200`). They match `OPEN` and `timer_lit_t4`. Step cites `:202` and `:210` show the transitions.
- Lower/raise length: 144/5 = 28.8 and 88/3 = 29.3 frames, so 29 or 30 (`:68`, `:187`). Both round to 1 beat.
- `turnon_*` to rest at `:180`; `TurnOn` for type 4 lowers the ring through the inversion.
- C5 ledger: all 7 extracted action functions are mapped. `WaitForCutscene` exclusion is true (`:144-146`, `:147-150`, timer 50 and 30).

## Outcomes
1. gap: one attack carries one effect (AUTHORING "One effect per attack"). The burn stays, since it costs health. The no-damage knockback (`z_bg_hidan_curtain.c:229`) is now reported in the spec header.
2. fixed: added `turnoff_raise_t5` with variant `switched_t5` (`:190-191`). It burns while rising, then goes to `rest_up`, which stands for `WaitForSwitchOff`. Added `turnoff_lower_t0` with variant `cleared_t0` for types 0 and 6 (`:188-189`). It burns while sinking, then goes to a terminal `gone`. Type 5's return through `TurnOn` waits on Link unsetting the switch (`:170`), which is outside the beat model. That limit is recorded in the header.
3. gap: Link sets the treasure flag by opening a chest, and the beat model has no such action. The kill at `:249-250` is recorded in the header.
