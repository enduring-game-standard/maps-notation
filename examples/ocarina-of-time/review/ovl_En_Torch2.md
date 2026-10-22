# ovl_En_Torch2

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

Spec: `studio/tools/ocarina/data/actors/en_torch2.ts`. Source: `src/overlays/actors/ovl_En_Torch2/z_en_torch2.c` (decomp), with `z_player.c` where cited. All line numbers below are `z_en_torch2.c` unless a file is named.

## Verdict

major findings

## Findings

1. **Step `duel` near, `slashes` (weight 7) and `holds his swing` (weight 3); cites 204 and 184.** (major)
   - Spec: Dark Link slashes 7 times in 10 and holds 3 times in 10 while near.
   - Code: no 7:3 draw exists. `EnTorch2_SwingSword` (174-208) swings whenever `(gameplayFrames & attackDelay) == 0` and `noAttackChance <= Rand_ZeroOne()` (189). At full Link health `attackDelay` is 7 and `noAttackChance` is 0.0 (175-176), so the roll never refuses. The swing is gated by the frame mask: one frame in 8, so 2 or 3 chances per 20-frame beat.
   - Line 184 is the low-health branch (`health < 0x50`, under 5 hearts: `attackDelay = 15`, `noAttackChance += 0.3`). It is not a general "hold" weight. The only `Rand_ZeroOne() * 7` at 191 picks the stick angle (cases 1/5, 2/6, else), not swing versus no swing.
   - The "hold" is a backflip, not a held swing. When `SwingSword` returns 0 at near range and he is not mid-swing and `sCounterState == 0`, he calls `EnTorch2_Backflip` (440-443, 210-218), which sets `invincibilityTimer = 10`. At full health that happens on most off-frames.
   - The weights do not match the code's odds, and the label and cite of the second step are wrong. The damage rate Link takes is set by these numbers.

2. **Phase `fading`: no attack from Dark Link; summary says "While he fades in he never starts a swing."** (major)
   - Code: the fade check at 186-188 (`noAttackChance += 2.0`) stops only the autonomous swing in `SwingSword`. The reactive counter does not check `sAlpha`: when Link swings, `input->cur.button = BTN_B` at 403, `sCounterState = 1` at 420-423, and 703-714 mirror Link's swing with `meleeWeaponState = 1`. His quads are `AT_ON | AT_TYPE_ENEMY` with damage 8 (127, 130). So a translucent Dark Link can hurt Link with a counter swing.
   - `fading` has no near step and no attack, so the model makes the first 1280 frames (64 beats) harmless to Link. The summary's claim is true of his own initiative only.

3. **Phase `fading` and steps `stunned_faint -> fading`, `hurt_faint -> fading`: timer restart.** (minor)
   - Spec: each re-entry to `fading` starts a new 1280-frame timer (`frames` at 501).
   - Code: the fade is the persistent global `sAlpha`. It rises by 1 every 8 frames only inside the `ENTORCH2_ATTACK` case (501-503). It keeps rising while frozen, because the frozen state is still `ATTACK`. It pauses in `ENTORCH2_DAMAGE` (506-547 has no increment) and keeps its value on return.
   - Result: in the code the total fade is 160 increments of ATTACK-state time. In the spec each nut or hit resets it, so the model's harmless window can be much longer. Direction: favors Link.

4. **Step `stunned_faint -> fading` entered from `wait` (reaction 0x1 map `wait: stunned_faint`).** (minor)
   - Code: a nut in `ENTORCH2_WAIT` sets only the color filter (618-623). `sActionState` stays `ENTORCH2_WAIT`, and the move to `ATTACK` happens only through the 243-259 test. After the thaw (648) he is back in WAIT, not fading.
   - Spec thaws into `fading` regardless of range. If Link threw the nut from beyond 120, the code returns to the waiting state, in which only the 243 triggers apply.

5. **Step `wait -> fading`, range near, cite 258.** (minor)
   - The line is correct and 120 (line 243) is a fair "near". But 243 has two other triggers: `Actor_IsLockedOn(play, &this->actor)` and `attackItem != NULL`. The attackItem trigger is modeled (overrides). The lock-on trigger works at any distance and is not. Link Z-targeting him from far starts the duel.

6. **Steps `hurt -> duel`, `hurt_faint -> fading` (cite 540): no range change.** (minor)
   - Code: on getup he is placed 120 units behind Link (515-516), which is beyond the 100 threshold at 450, or back at the spawn point if that is over 800 away (518-535). The model leaves range unchanged. After a getup Dark Link is far (he runs at Link at 456), not wherever the range was. The label "behind Link" is correct.

7. **Phases `fading` and `duel`, `guards: MELEE, ROLLED` (blanket).** (minor)
   - Code: only the dodge roll (`invincibilityTimer = 20`, 725), the backflip (`= 10`, 216), the sword jump (`= -7`, 389) and the jumpslash counter (`= 10`, 490) give invincibility. A slash counter (403) and a shield (414) are not invincibility. They work by clank or shield collision. Whether a hit lands then depends on the frame the counter is mirrored (703-714) and on 598-600 (no damage while his own quad has `AT_HIT`).
   - The spec stops every melee hit every beat. A stagger path exists (671-689, `sStaggerCount` above a threshold of 6 +/- 1, or 3 +/- 1 under 5 hearts: `skelAnime.playSpeed *= 0.6`, `sStaggerTimer = 0`) that the spec does not mention. I could not trace from these lines alone that stagger lets a hit land, so the claim that melee never connects outside the nut stun is not confirmed or refuted by the cites. Treat as a model approximation to answer in the report.

8. **Step `duel`/`fading` near, Link health below 5 hearts (cite 182-185, 286-289).** (minor)
   - Code: when `playerData.health < 0x50`, `attackDelay = 15` and `noAttackChance += 0.3` (182-185), and the stagger threshold drops to 3 +/- 1 (674-676). Dark Link is easier at low Link health. Not modeled. Link health below 80 is reachable in the kits during the fight.

## Checked

- C5 ledger: `ENTORCH2_WAIT` (36, 237), `ENTORCH2_ATTACK` (37, 262), `ENTORCH2_DEATH` (38, 549), `ENTORCH2_DAMAGE` (39, 506) are the four enum states (35-40) and all four are mapped or excluded. The `ATTACK_fading` and `ATTACK_frozen` keys are phase splits, not real states, which is fine. The DEATH exclusion is true: it is entered only when `Actor_ApplyDamage` returns 0 (602, 611) and the case only fades and kills (549-557).
- `inventory.json` lists no collider elements and no action functions for this overlay, one runtime AT change (130) and health at 135. `atSources` maps 130 to `sword`; the damage 8 matches 130. `z_player.c` has no later write to `atDmgInfo.damage`, only `dmgFlags` (`z_player.c:4501`), so 8 stands.
- Health: `colChkInfo.health = healthCapacity >> 3` at 135 matches `fromLinkHealth: { shift: 3 }`.
- Damage table: all 32 entries at 80-112 agree with the inventory. Reactions used are 0x0, 0x1, 0x6, 0xD, 0xE, all five handled.
- Reaction 0x1 (618-623): blue filter 80 frames, no knockback, no state change; matches. Frozen only when `colorFilterTimer != 0` and the 0x4000 (RED) flag is clear (648). Blue with XLU (0x2000) passes that test (`actor.h` COLORFILTER_COLORFLAG_RED = 0x4000, BUFFLAG_XLU = 0x2000), so `stunned_faint` does freeze him (651-662). 80 frames at 620 and 622 are right.
- Other reactions (624-640): small knockback and `ENTORCH2_DAMAGE`; cites 627 and 634 show it. Death on `!Actor_ApplyDamage` (602-612) comes before the reaction test, so a nut (damage 0) cannot kill.
- Fade timer: `sAlpha` starts at 95 (148), +1 every 8 gameplay frames (501-503), done at 255: 160 x 8 = 1280 frames. `fading -> duel` cite 502 correct.
- Body AC mask: `0xFFCFFFFF` in `z_player.c:10478` clears bits 20 and 21 (Shield, Mirror Ray); `BODY` filter matches. Playerinit at 124, `AC_ON | AC_TYPE_PLAYER` at 126.
- Roll: `attackItem` (arrow or hookshot actor via `Actor_GetProjectileActor`, `z_actor.c:3859-3868`, or an explosion with params 1 in `func_80033684`, `z_actor.c:3823-3826`) sets the roll (246, 307) and `invincibilityTimer = 20` (725). `ROLLED` list matches (nut and boomerang are not those actors).
- Counter branch cites: clank 273, sidestep 319, shield 414, backflip 416 and 418 all show what the spec says. The `wait` override cite 246 is right.
- Sword attack: blockable and dodgeable are fair for an `AT_TYPE_ENEMY` quad (127).
- Far step `run at Link` (cite 456, d > 100 at 450): correct.
- Dead-verb ledger reasons (`link_hurt_overkill` etc.): consistent with sword 8, kit health a multiple of 16, and nut/Din's Fire connecting in all but `hurt*` (hittable `none`).
