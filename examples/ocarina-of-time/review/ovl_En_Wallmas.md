# ovl_En_Wallmas

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

Spec: `studio/tools/ocarina/data/actors/en_wallmas.ts`. Source: `src/overlays/actors/ovl_En_Wallmas/z_en_wallmas.c` (cites below are that file unless a path is given).

## Verdict

major findings

## Findings

1. **Major.** Phase `up_{timer,prox,flag}` (`hittable: 'none'`, spec line 25). The spec says Link cannot hit the hand while it rises to the ceiling. The code says it can for the first part of the rise. `EnWallmas_Update` sets the hurtbox (`CollisionCheck_SetAC`) for every action except `EnWallmas_TakeDamage` whenever the hand is on the ground and not frozen (`z_en_wallmas.c:588-590`). `EnWallmas_ReturnToCeiling` is not excluded there. It also skips gravity (`:570`) and only starts raising `world.pos.y` after the animation passes frame 20 (`:385-388`). Until then the hand is still on the floor with the ground flag set, so AC is armed. A hit in that window runs the normal reaction (`:531-553`): damage then `TakeDamage`, or `Stun` (`:544-545`). The window is a fraction of a beat (animation plays at 3.0x, `:232`; I could not measure the animation length from the decomp source). Cooldown ends in `ReturnToCeiling` (`:426`), so a follow-up hit right after a hit is the realistic case. Fix: make `up_*` hittable for the early part, or split it (grounded `up` vs risen `up`).

2. **Minor.** Step `drop_k -> land_k` (spec line 45), cite `:345`. Line 345 is `EnWallmas_SetupTakePlayer`, the grab. The miss path (landing) is `EnWallmas_SetupLand` in `EnWallmas_Update` at `:581` (`pos.y <= yTarget`). One step carries both transitions under the grab cite; the landing has no cite that shows it.

3. **Minor.** Missing transition in `wait_*` (`EnWallmas_WaitToDrop`, `:323-328`). The code re-arms `timer = 0x82` every frame while Link is in `PLAYER_STATE1_20` or `PLAYER_STATE1_27`, is off the ground, or (when `params == 1`, the proximity kind, `:325`) is more than 320 units from home. So the drop timer can restart mid-wait. The spec has no restart edge; `wait_prox` can never be reset by Link wandering off. Timing only, and the types may not express it, but the author did not report it, and the dead-verb reason `wait_*_timer_clears` ("leaves its wait only when the timer runs out") is true only if resets are ignored.

4. **Minor.** Attack `grab`, `effect.frames` (`{ value: 0x1e, cite: at(275) }`, spec line 64). Line 275 is `timer = -0x1E`, the start value only. The 30 frames come from the `+= 2` per frame (`:484`) and the exit at `timer == 0x1E` (`:492`). That count also starts only after the hover animation finishes (`SkelAnime_Update`, `:455`), so the hold is longer than 30 frames. Numerically 30 is the counted part; the cite does not show it alone.

## Checked

- Pool: health 4 at `:84` (`sColChkInfoInit = { 4, 30, 40, 150 }`), matches inventory.
- Damage table (`:93-126`) matches the inventory; reaction values `NONE/STUN_BLUE/BURN/STUN_WHITE` are read right at `:542-553` (stun for 1 and 4 unless already `EnWallmas_Stun`; fire adds a visual ring; everything else goes to `TakeDamage`, including out of a stun). 0-damage `NONE` entries (Ice magic, Unknown 1/2, Unblockable) do nothing in the code (`:531`) but the generator would send the actor to `hurt`; Link never emits those types (`data/link.ts:96,113,114`), so no effect.
- `hurt_*` unhittable: `:588` skips AC for `EnWallmas_TakeDamage`. `drop_*` unhittable: `:584` skips the collider for `EnWallmas_Drop`. `wait_*` and `dormant`: early return before any collider (`:565-567`). Land/stand/walk/rise/cooldown/stun hittable: ground AC at `:588-590`.
- Frames: `0x82` at `:173` (TimerInit), `0x51` at `:508` (switch-flag), `0x50` stun at `:307`.
- Steps with correct cites: `wait->drop` `:335`; `land->stand` `:351`; `stand->walk` `:357`; `walk->rise` `:365`; `rise->up` `:378`; `hurt->cooldown` `:414` (health != 0); `cooldown->up` `:426`; `stun->up` `:522`; `up_timer->wait` `:402`; `up_prox` near/far `:402/:404` (home distance < 200); `up_flag->gone` `:396`; `dormant->wait_prox` `:501`.
- Variants: flag `:148`, prox `:155`, timer `:158`; flag init also kills if the switch is already set (`:149-152`), consistent with the flag-kind wait.
- Grab damage 16: `Play_TriggerRespawn` at `:494` -> `Play_LoadToLastEntrance` sets `respawnFlag = -1` (`src/code/z_play.c:1939`) -> `Player_Init` sets `unk_A86 = -2` (`z_player.c:10743`) -> `func_808382DC` inflicts -16 (`z_player.c:4824`). No collider (AT_NONE, `:67`), so `blockable: false` is right. Direct-hurt inventory entry matches `:494`.
- C5 ledger: all 14 inventory action functions are mapped. Mappings are correct. Exclusions are true: `WaitForSwitchFlag` (`:506`), `TakePlayer` (`:441`, the carry-off), `Die` (`:430`, after the finishing blow).
- `atSources`: the only AT source in the inventory (none; AT_NONE) plus the direct hurt at `:494`, mapped to `grab`.

## Outcomes
1. fixed: `up_*` is now hittable (no `hittable: 'none'`), and the hurt and stun reactions map `up_k` to `hurt_k` / `stun_k`. Confirmed AC is armed there: `EnWallmas_ReturnToCeiling` is not excluded at `:588-590` and the hand stays grounded until `curFrame > 20` (`:385`). The beat model makes the whole beat hittable where the code allows about 20 animation frames at 3x speed (`:232`); recorded in the spec header.
2. fixed: the drop step now cites the landing `EnWallmas_SetupLand` at `:581`, which is where the step's destination comes from; the grab trigger `:345` is noted beside the attack, whose source stays the respawn call `:494`.
3. gap: no step can reset a phase's timer, and a self-step keeps it running (gen.ts `move`, "a phase re-entering itself keeps its timer running"), so the restart at `:323-326` cannot be expressed. Recorded in the spec header; the `wait_*_timer_clears` reason now says the countdown-only exit holds in the model and points at the gap.
4. fixed: `effect.frames` cites `:492` (`timer == 0x1E`, the exit); the count from `-0x1E` (`:275`) by 2 (`:484`) and the hover-animation wait (`:455`) that makes 30 a lower bound are recorded in the spec header.
