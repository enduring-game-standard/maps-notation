# ovl_Bg_Hidan_Fwbig

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. Attack `flame` (`src/overlays/actors/ovl_Bg_Hidan_Fwbig/z_bg_hidan_fwbig.c:71`). Burn is carried. On contact the code also knocks Link back with `Actor_SetPlayerKnockbackLargeNoDamage(play, &this->actor, 5.0f, ...)` (`:239`). Not reported in the spec. Severity: minor.
2. Phase `chase_sweep` frames 531 (cite `:201`), and the steps `lower_chase -> rise_chase` (`:175`). A fixed 531 holds only for a sweep from the start angle. After a touch the wall drops, then `shape.rot.y -= direction * 0x1800` (`:169`) and rises again to continue toward the same target `home.rot.y + direction * 0x6390` (`:201`). Progress is kept, so later sweeps are shorter than 531 frames (remaining = (0x6390 - angle)/48). Only a full sweep (`moveState = FWBIG_RESET`, `:202`; reset to `home.rot.y` at `:172`) restarts from zero. The model gives every `rise_chase -> chase_sweep` a full 531. Severity: minor (timing).
3. Missing transition: `Update` kills the chasing wall when the room changes: `if ((this->direction != 0) && (play->roomCtx.prevRoom.num == this->actor.room)) { moveState = FWBIG_KILL; actionFunc = BgHidanFwbig_Lower; }` (`:244-247`), then `Actor_Kill` at the bottom of `Lower` (`:165-166`). Link leaving the room ends the fight, and the spec has no such step. Severity: minor.
4. Phase `chase_sweep` (`BgHidanFwbig_Move`): the sweep only advances while `!Player_InCsMode(play)` (`:200`); not mentioned. Severity: minor.

## Checked

- Damage 4, FIRE, `0x20000000` unblockable (`z_bg_hidan_fwbig.c:71`); no AC element (`:72`), so `pools: []` and `damage: none` are right.
- Collider is live only above `home.y - 200` (`:251-259`), so `wall_open` (down 240) has no attack. Door wall scale 0.1 gives 240 units, 24 frames at 10 a frame (`:116`, `:150`, `:161`). Chase wall scale 0.15 gives 360 units, 36 frames (`:109`, `:114`).
- Door wall chain: `WaitForSwitch` (`:135-140`), `WaitForCs` excluded with a 35 frame timer (`:139`, `:144-145`), `Lower` to `WaitForTimer` with 150 (`:163-164`), `WaitForTimer` to `Rise` (`:185`), `Rise` to `WaitForSwitch` (`:153`). All cites match.
- Chase wall chain: `WaitForPlayer` on player x under 1150 (`:193-194`), `Rise` to `Move` (`:155`), `Move` end to `Lower` (`:203`), `Lower` to `Rise` (`:175`). The touch drops the wall: `if (this->direction != 0) this->actionFunc = BgHidanFwbig_Lower;` (`:240-241`). The door wall is not dropped by a touch (no else), matching the spec.
- 531: `Math_ScaledStepToS` scales 0x20 by `R_UPDATE_RATE * 0.5` (`src/code/z_lib.c:55`, `src/code/game.c:497`); 0x6390 / 48 = 531.
- C5 ledger: all 7 extracted functions are mapped; `lower_*` and `rise_*` globs cover both kinds.

## Outcomes
1. gap: one attack carries one effect. The burn stays, and the knockback (`z_bg_hidan_fwbig.c:239`) is now reported in the header.
2. gap: a phase timer cannot carry the angle the sweep has reached, so a resumed sweep (`:169`, `:201`) cannot be shorter than 531 frames. Recorded in the header.
3. answered: the kill on a room change (`:244-247`, `:165-166`) needs Link to leave the room. That is the beat model's leave verb, which ends the encounter, so no actor step is needed. Noted in the header.
4. gap: cutscene mode (`:200`) is outside the beat model. Recorded in the header.
