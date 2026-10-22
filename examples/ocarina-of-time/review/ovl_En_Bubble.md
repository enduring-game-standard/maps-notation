# ovl_En_Bubble

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. **Step `drift -> drift` "Shabom drifts toward Link" (`move: 'near'`, cite z_en_bubble.c:289).** Label only. The code has no Link-seeking: the start direction is random (z_en_bubble.c:354-357), velocity changes only by wall or water-surface reflection (z_en_bubble.c:253, 272) and by pushes from seeds/arrows (z_en_bubble.c:228-230). Line 289 sets `actor.velocity` from those terms, not toward Link. The step is a range abstraction; "toward Link" reads as chasing, which the spec summary itself says it does not do. Severity: minor (labeling).

## Checked

- Health: `sColChkInfoInit2 = { 1, ...}` at z_en_bubble.c:79; spec has no pool. Correct, because nothing reads `colChkInfo.health` or damage in the file (grep: no `Actor_ApplyDamage`, no health reads). Reaction `0x0` with `damage:false, to:popping` matches `func_809CC648` returning true at z_en_bubble.c:310-311.
- Hit partition: element 1 mask `0x00002824` = bits 2, 5, 11, 13 = SLINGSHOT, ARROW_NORMAL, ARROW_FIRE, ARROW_LIGHT (z_en_bubble.c:57; bit values collision_check.h:414-425). Those only push (z_en_bubble.c:302-308, returns false). Element 0 mask `0xFFCFD753` (z_en_bubble.c:46) shares no bit with element 1, so everything else it accepts pops (z_en_bubble.c:310-311). `PUSHES` list is correct. EXPLOSIVE (bit 3) and HOOKSHOT (bit 7) are in neither mask, so bombs and hookshot cannot connect; spec defaults `hittable` to the AC union, which matches.
- Touch attack: `EnBubble_DetectPop` calls `EnBubble_DamagePlayer` on `OC2_HIT_PLAYER` (z_en_bubble.c:318-320); `play->damagePlayer` with element 0 `atDmgInfo.damage` = 4 (z_en_bubble.c:45, 129, 131), then small knockback (z_en_bubble.c:132). `blockable:false` is right: a direct `damagePlayer` call, no collider. `source: at(131)` matches the inventory `directHurt` entry. Pop follows (`return true` at line 322, Wait switches to Pop at 373-374).
- Popping phase: `func_809CBCBC` returns 6 (z_en_bubble.c:119) and is stored in `explosionCountdown` (z_en_bubble.c:373); `EnBubble_Explosion` counts it down (z_en_bubble.c:148) and `EnBubble_Pop` kills at 386. 6 frames rounds to 1 beat. `hittable:'none'` correct: `EnBubble_Pop` never calls `CollisionCheck_SetAC` (z_en_bubble.c:383-388) while `EnBubble_Wait` does (z_en_bubble.c:378).
- C6 exclusions at 114/115/116: pop sets AT damage fields (z_en_bubble.c:114-117), but no `CollisionCheck_SetAT` appears anywhere in the file, and `DetectPop` returns false once `actionFunc == EnBubble_Pop` (z_en_bubble.c:315). True.
- C5: `EnBubble_Wait` -> drift, `EnBubble_Pop` -> popping. `EnBubble_Regrow` exclusion is true: only `EnBubble_Disappear` assigns it (z_en_bubble.c:398), and nothing assigns `EnBubble_Disappear` (grep: it appears only at the definition 391 and in the Draw checks 427, 444). Cite 402 is the `// unused` comment line; it supports the claim.
- Quarter-heart kit: one touch is 4 units (z_en_bubble.c:129); a 0.25-heart Link (4 units at 16 per heart) falls to one touch, as the spec says.

## Outcomes
1. fixed: relabeled both drift self-steps as random bounce ("Shabom's random bounce carries it into Link's reach" / "... out of reach"). Finding holds: start direction is random (z_en_bubble.c:354-357), velocity changes only on wall/water reflection (z_en_bubble.c:253, 272) and pushes (z_en_bubble.c:228-230), set at z_en_bubble.c:289. Model unchanged; the near/far steps stay as the range abstraction of that drift.
