# ovl_En_Goroiwa

Reviewer: claude-sonnet-5-5

## Verdict

minor findings

## Findings

Cites without a path are `src/overlays/actors/ovl_En_Goroiwa/z_en_goroiwa.c`.

1. **Step range `near` (all attack steps).** Minor.
   - Spec: "near" is the 300-unit AT registration gate (header, z_en_goroiwa.c:778).
   - Code: 300 only decides whether the collider is submitted. A hit needs Link's body to touch the 58-radius sphere (z_en_goroiwa.c:86, 130). `near` then makes the hit certain every beat Link stands anywhere inside 300 units.
   - The spec's `near` choice is documented but is looser than "within reach". It maps the sphere gate, not the contact. A Link at 150 units is hit in the model and not in the game.
2. **Missing transitions: slope and roll switching.** Minor.
   - Code: `Roll` goes to `MoveUp` or `MoveDown` per waypoint (z_en_goroiwa.c:651-657), and both return to `Roll` at each waypoint (z_en_goroiwa.c:723-725, 748-750).
   - The spec splits these into separate variants (`ground` vs `slope`) with no step between them. A real ground boulder moves between them and the spec has no such step.
3. **Ledger `EnGoroiwa_Wait` to `stop*` only.** Minor.
   - The pause variants (`home.rot.z & 1`) also run `Wait` (6 frames, z_en_goroiwa.c:695) before `Roll` with AT off. Their phases (`pause_t`, `pause_bt`) do not appear in the Wait mapping.
   - The 50-frame window is right (z_en_goroiwa.c:639, 780). The ledger label is incomplete.
4. **Slope hit damage.** Minor, already reported by the author as a gap.
   - Author says the extra 4 (z_en_goroiwa.c:718, 743) is added by the player at z_player.c:4878. That is right: `colChkInfo.damage += knockbackDamage`.
   - The collider's own 4 also applies, so a slope contact is 8 total, not 4. The description is correct. Listed because the attack's `damage: 4` stays wrong on the slope variants (8 in the code).

## Checked

- Collider (z_en_goroiwa.c:80): dmgFlags `0x20000000` = `DMG_UNBLOCKABLE` (collision_check.h:441), damage 4, effect NONE, `AT_TYPE_ENEMY`. Shield quad mask `0xDFCFFFFF` excludes bit 29 (z_player.c:10518), so `blockable: false` is right.
- Nothing can hurt it: `AC_NONE` / `ACELEM_NONE` (z_en_goroiwa.c:79-84, 92-94), health 0 (z_en_goroiwa.c:103). `damage: { kind: 'none' }` is right.
- The three `directHurt` sources (z_en_goroiwa.c:632, 718, 743) are mapped; 632 passes damage 0, the other two pass 4.
- Waits: `{20, 6}` by `home.rot.z & 1` (z_en_goroiwa.c:690, 695). Collision disabled 50 frames after a hit when the bit is set (z_en_goroiwa.c:638-640, 720-722, 745-747); gate at z_en_goroiwa.c:780.
- Hit dispatch: `onHitSetupFuncs[bit10]` is `SetupWait` or `SetupMoveAndFallToGround` (z_en_goroiwa.c:615, 636). `MoveAndFallToGround` goes to `Wait` on landing (z_en_goroiwa.c:680-685). AT is off in `Wait` and while falling (`UpdateFlags` with OC only, z_en_goroiwa.c:670, 694).
- Variants match the bit tests at z_en_goroiwa.c:627, 638, 641, 655, 720.
- Ledger: all five extracted action names are mapped.

## Outcomes

1. fixed: header now defines near as contact with the 58-unit sphere (z_en_goroiwa.c:85, 130), with the 300 gate (z_en_goroiwa.c:778) only containing it. The steps stay `near`, because in the beat model near is the band where Link touches the actor. A Link 150 units off the path is in the far band, not near.
2. fixed: merged the `slope` and `slope_pause` variants into `ground` and `ground_pause`. Added `roll`→`slope` and `roll_t`→`slope_t` (z_en_goroiwa.c:655), and `slope`→`roll` and `slope_t`→`roll_t` (z_en_goroiwa.c:725). These are `far` because the AT_HIT branch runs before the move branch (z_en_goroiwa.c:621 before 641, 716 before 723). Waypoint spacing is path data the code does not fix, so a far boulder switches every beat. That approximation is in the header.
3. fixed: renamed `pause_t`/`pause_bt` to `stop_t`/`stop_bt`, so `EnGoroiwa_Wait: 'stop*'` now covers every phase that starts with Wait. The header says these timed phases also span Roll and MoveAndFallToGround with AT off, because the ledger maps each function to one glob.
4. gap: the slope contact totals 8 (collider 4 at z_en_goroiwa.c:80, plus knockback 4 at z_en_goroiwa.c:718/743, added at z_player.c:4878). An attack has one `source`, and verify.ts:184/191 requires its damage to equal that source's (80 gives 4, 718 gives 4). So no single attack can carry 8. It is recorded in the spec header. Also recorded there, not raised by the review: round-trip boulders wait at path ends with AT off (z_en_goroiwa.c:650). That is unmodeled.
