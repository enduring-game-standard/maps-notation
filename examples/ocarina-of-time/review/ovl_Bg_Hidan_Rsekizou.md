# ovl_Bg_Hidan_Rsekizou

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. Steps `turning -> arm_over -> turning` and `expected.deadVerbs.flame_lands_again`. The code turns 0x180 a frame (`src/overlays/actors/ovl_Bg_Hidan_Rsekizou/z_bg_hidan_rsekizou.c:179`) and the two arms are 180 degrees apart (elements at +z `:51,62,73`, -z `:84,95,106`), so an arm passes a spot every 0x8000/0x180 = 85.3 frames = 4.27 beats. The spec rounds `turning` to 4 beats and adds 1 beat in `arm_over`, a 5-beat period. The dead-verb reason ("an arm reaches Link only every 5 beats, and the burn lasts 5 beats") is true in the model but not in the code: the real gap is about 4.3 beats, so a second arm can land while Link still burns (burn mean 100 frames, `link.ts`, cite `z_player.c:4798`). The model undercounts the burn damage of a standing Link by about 15 percent. Severity: minor (timing).
2. `states` (`arm_away`, `arm_over`, cites `:179`, `:194`). The code has no state variable or switch. The actor has only `Update`, with the AT collider set every frame (`:194`). Keys are invented labels, not code states. C5 asks for states the code tracks. This is harmless but mislabeled. Severity: minor (labeling).

## Checked

- All six elements are `ATELEM_ON`, damage 4, FIRE, `0x20000000` unblockable: `z_bg_hidan_rsekizou.c:45, 56, 67, 78, 89, 100`. The `atSources` keys match the inventory exactly.
- No AC, no health, so `pools: []` and `damage: none` are right (AC flags 0, `ACELEM_NONE`, `:46-49`).
- The elements are always live: `CollisionCheck_SetAT` runs every Update with no gate (`:194`), so the attack is unconditional on phase, as modeled.
- No `AT_HIT` handler, so no knockback or other effect is missed. The inventory lists no action functions, so `actionFuncs: {}` is right.

## Outcomes
1. fixed: `turning` is now 65 frames (85 - 20), which rounds to 3 beats. With the beat of `arm_over`, the period is 4 beats (80 frames), the nearest whole number of beats to 85 (`z_bg_hidan_rsekizou.c:179`). The ledgered `flame_lands_again` and `flame_lands_dd_again` are removed. V2 passes without them, so a second arm now lands while Link still burns.
2. fixed: the `states` keys are renamed to the two `shape.rot.y` ranges. Yaw (`:179`) is the only state the code tracks. Both cite `:179`, and the header says so.
