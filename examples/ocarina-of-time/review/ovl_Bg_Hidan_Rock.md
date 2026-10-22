# ovl_Bg_Hidan_Rock

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. Phase `falling_lift` (frames 48, cite `:273`) and step `falling_lift -> resting_lift` (cite `:260`). The header says the rest of the fall with the pillar out "is folded into the next phase". It is not: `resting_lift` has 60 frames from `:259`, which starts only after landing. The fall itself ends on `BGCHECKFLAG_GROUND_TOUCH` (`:257`). With gravity -0.6 (`:80`) and `minVelocityY` -20 (`src/code/z_actor.c:950, 1001-1004`), the fall from 1820 units takes about 108 frames, not 48 (I simulated it). The remaining 60 frames of non-burning time are dropped. The same applies to `falling_block` (14 frames): a fall from 480 takes about 41 frames. Pillar timing is correct, but the cycle is about 60 frames (type 0) and 27 frames (type 1) short before the next burn. Severity: minor (timing, no burning in the gap).
2. Phase `vent_quiet` frames 256 (cite `:199`). Past frame 255 the pillar hits 0 at about frame 250 (20 frames of decay from 230, `:205-207`), so zero-height time is 6 frames of tail plus the 256 frames of `gameplayFrames & 0x100` (`:199-200`) = 262. Both round to 13 beats, so the model is unchanged. Severity: minor (labeling).
3. Missing transition: `vent_*` to `falling_lift` when Link finishes pushing the block (`sp2C < 0.5` sets the switch and `actionFunc = func_8088B79C`, `:186-195`). The author reports this as a gap ("Pushing is a Link action the beat model lacks") and models the pushed block as a variant, so this is not counted as a finding. The `pushed` variant start is right: `Init` sets `timer = 60` (`:103`) then `timer = 0` (`:119`), so `func_8088B5F4` falls through to rising next frame (`:220-221`).

## Checked

- Damage 4, FIRE, `0x20000000` unblockable (`src/overlays/actors/ovl_Bg_Hidan_Rock/z_bg_hidan_rock.c:69`); no AC element (`:70`, `AC_NONE` `:62`). No `AT_HIT` handler exists, so no knockback to report.
- The collider is live whenever `unk_16C > 0` (`:353-356`), so `BURNING` omits `idle_block`, `shaking_block`, `settling_block`, `resting_lift`, `vent_quiet`. Correct.
- Rise simulation: `Math_SmoothStepToF(0.25, 20, 0.5)` over 1820 and 480 units (`:317-319`) takes 101 and 34 frames (I simulated against `src/code/z_lib.c:416-450`). Matches `rising_lift` and `rising_block`. Top hold is 20 (`:324`), `top -> falling` at `:303`.
- Fall pillar decay: `unk_16C` starts at (rise+90)/80 (`:328`) and drops 0.5 a frame (`:273`): 47.75 (type 0) and 14.25 (type 1) frames, giving 48 and 14.
- Type 1 chain: `IsPlayerOnTop` sets timer 20 and goes to the shake (`:226-229`), shake end to rise (`:246`), landing to settle (`:262-263`), settle to idle at 15 frames (`:292-293`). All cites match.
- C5 ledger: all 8 extracted functions are mapped, and the globs (`vent_*`, `falling_*`, `top_*`, `rising_*`) match the right phases for both types.

## Outcomes
1. fixed: added `falling_lift_dark` (29 frames) and `falling_block_dark` (19 frames). These are the part of the fall after the pillar dies (`:273-274`) and before ground touch (`:257`). The fall was simulated with gravity -0.6 (`z_bg_hidan_rock.c:80`), minimum velocity -20 (`src/code/z_actor.c:950`, `1003-1004`), and position moving velocity times R_UPDATE_RATE * 0.5 = 1.5 a frame (`src/code/z_actor.c:989-991`, `src/code/game.c:497`). It takes 77 frames from 1820 and 33 from 480. The reviewer's 108 and 41 left out the 1.5 position scale. The `falling_*` glob still covers `func_8088B79C`.
2. answered: 262 and 256 frames both round to 13 beats, so the model is the same. The header now states the 6-frame tail (`:199`, `:205-207`).
3. answered: the reviewer did not count this, and it stays a reported gap in the header (`:186-195`).
