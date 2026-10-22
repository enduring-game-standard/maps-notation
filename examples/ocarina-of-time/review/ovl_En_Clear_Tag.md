# ovl_En_Clear_Tag

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. **Ledger `CLEAR_TAG_STATE_DEMO`, cite `z_player.c:13897`.** Spec cites 13897 as the line showing the dead spawn (`getItemId != GI_ICE_TRAP` nested in `== GI_ICE_TRAP`). Line 13897 is `this->stateFlags1 &= ~(...)` (src/overlays/actors/ovl_player_actor/z_player.c:13897). The two conditions are at :13896 and :13899, the spawn at :13900. The claim itself is true; only the cite is off. Severity: minor.

2. **Phase `flying`, `frames: [100, 199]` (cite :459).** Line 459 sets ENTER_LOCKED_ON to `Rand_ZeroFloat(100)+100`, which is 100..199, so the range is right as the lower bound. But the exit to `locked` needs both timers at 0: UPDATE_STATE must also be 0 (:387-389). UPDATE_STATE is re-armed to 20..69 each time it expires while ENTER_LOCKED_ON is nonzero (:393). So after ENTER_LOCKED_ON reaches 0 the Arwing waits up to 69 more frames for the current UPDATE_STATE timer. Real flying duration is about 100..~268 frames, mean above the 150 the spec implies. Severity: minor (timing).

3. **Step `locked -> flying`, `range: 'near'`, `attack: 'ram'`, label "flies into Link" (cite :461).** Line 461 only shows the state change when the Arwing is within 150 of Link's chest point (:426, :456). That is far outside body contact (AT cylinder radius 20, :524). After :461 the target is re-picked (:387-402), so the Arwing turns away. The code does not show the Arwing striking Link at this transition. The body AT is live in every non-landed Arwing state because `CollisionCheck_SetAT` runs in the shared block (:530), including `flying`. The spec's `flying` phase has no ram attack on any step. Contact damage (4, :64) can happen in `flying` when Link stands near its path, and the spec only places it on the locked-exit step. Severity: minor (placement of the attack, not its damage or blockability).

4. **Step `flying -> flying` (cite :400), `range: 'near'`, `move: 'far'`; no far-to-near move.** The code re-picks the flying target whenever the UPDATE_STATE timer expires (:387, :393) regardless of range, and also when within 100 of the target (:456-457). The target is a point 400 units from Link scattered by +-350 per axis (`Rand_CenteredFloat(700)`, :400-404), with height 150..350 above Link (:402). So a re-pick can bring the Arwing near Link again. The spec only moves flying from near to far, so after the first fly-off the Arwing is never near in `flying` and cannot ram from there. Severity: minor (missing range transition, interacts with finding 3).

## Checked

- Health 3: src/overlays/actors/ovl_En_Clear_Tag/z_en_clear_tag.c:272. Every AC hit does `health--` and nothing else, :377. The third hit sets CRASHING, :378-379, and jumps to `state_crashing` (:381, :514), so hits are not read again.
- AC mask 0xFFDFFFFF at :65 excludes only bit 21; `DMG_MIR_RAY` is `1 << 21` (include/collision_check.h:433). So `entries` covering every type but MIR_RAY with damage 1 is right.
- Attack damage 4 for body (:64) and laser (:84), `HIT_SPECIAL_EFFECT_NONE`, so `effect: none` is right. AT mask 0xFFCFFFFF keeps bit 29, `DMG_UNBLOCKABLE` (collision_check.h:441), so `blockable: false` is right for both. Arwing AT is ATELEM_ON (:66).
- Laser spawn at :507 (params CLEAR_TAG_STATE_LASER = 100 = CLEAR_TAG_LASER, header). Fires only when `frameCounter % 4 == 0`, `Rand_ZeroOne() < 0.75`, state TARGET_LOCKED, and facing within 0x1000 (:477, :482-483). The spec comment matches.
- `locked` entry at :389 (UPDATE_STATE and ENTER_LOCKED_ON both 0). `locked` has no timed exit: expiry at :387-390 only re-locks (300 frames), so omitting `frames` on `locked` is right. `flying` entry at :392 / :461. Exit from locked uses the 150 radius (:426, :456).
- Start state: debug spawn is 100 above Link with params 1 (src/code/z_actor.c:2437, in `DEBUG_FEATURES`). Within 150 of the target (Link +40, :422), so the first update goes locked (:389) then flying (:461) with ENTER_LOCKED_ON 100..199. `start: 'flying'`, `range: 'near'` is right.
- Ledger is complete: `actionFuncs` empty is right (state enum + switch, :353). All five states in `z_en_clear_tag.h` (FLYING, TARGET_LOCKED, DEMO, CRASHING, LASER) are listed.
- CRASHING exclusion: ground/wall explosion at :550-551, hits unread (:381), no fall duration in code, body AT still set (:530) all true. Cite :379 shows the entry.
- DEMO exclusion: set only for params 0 (:275-278); only non-debug spawn site is z_player.c:13900 (params 0), inside a condition that contradicts its parent (:13896 vs :13899). `grep ACTOR_EN_CLEAR_TAG` finds only that and z_actor.c:2437 (no scene lists in the checkout, as the author says).
- LASER exclusion: laser case (:564-591) calls only `CollisionCheck_SetAT` (:577), never `SetAC`, so Link cannot hit it. Cite :577 shows this.
- `atSources` keys :64 and :84 are the two AT elements.
- Circling target 400 units from Link, scattered by 700, :397-404.
