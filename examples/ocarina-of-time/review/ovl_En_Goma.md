# ovl_En_Goma

Reviewer: claude-sonnet-5-5

## Verdict

major findings

## Findings

Cites without a path are `src/overlays/actors/ovl_En_Goma/z_en_goma.c`.

1. **Attacks and `atSources[92]`: the body attack is limited to the leap.** Major.
   - Spec: the only way the larva hurts Link is the `headbutt` on the `jump` to `land` step (cite 640).
   - Code: the AT cylinder (`D_80A4B7A0`, `AT_ON | AT_TYPE_ENEMY`, damage 8, z_en_goma.c:81-98) is submitted every update in every state of an egg or larva, as long as `invincibilityTimer == 0` (z_en_goma.c:765-770). Nothing in `EnGoma_Update` ties it to `EnGoma_Jump`.
   - The jump check at z_en_goma.c:639-643 only decides whether a hit ends the leap. It does not gate the damage.
   - So every phase that has a collider (egg, hatch, stand, chase, prepare_jump, land, flee, stunned) can cost Link 8 on contact. `land` and `stand` follow the headbutt with Link still next to the larva.
   - Gap: `stand`, `land`, `chase` and `hatch` have no attack step.
2. **Cites for the sword table.** Minor.
   - The `SWORD` table cites `CollisionCheck_GetSwordDamage` at z_collision_check.c:3718/3720/3722/3724.
   - Those lines are the `if` conditions (flags). The damage values are on 3719, 3721, 3723, 3725. The conditions do match the table, but the cited lines do not show the values.
3. **`entries.SHIELD` cite 662.** Minor. z_en_goma.c:662 sets `invincibilityTimer = 5`. The shield-branch condition is on 652 and the damage-free result is the absence of any `health -=`, so 652-663 is the cite. The facts are right. The line is not.
4. **Phase `egg_fall_boss` timing.** Minor.
   - Spec: 80 frames (z_en_goma.c:271).
   - Code: touchdown, two 3-frame timers, then 80 (z_en_goma.c:249-251, 258-259, 270-271). That is 86 frames. Rounds to 4 beats either way.
   - `invincibilityTimer = 10` on spawn (z_en_goma.c:170) turns all colliders off for the first 10 frames; the spec treats the egg as hittable from the start.
5. **Phase `chase` timer.** Minor. `EnGoma_SetupChasePlayer` sets `actionTimer = Rand_S16Offset(70, 110)` (z_en_goma.c:467), but `EnGoma_ChasePlayer` never reads it. The spec correctly gives `chase` no timer. This is a note that the dead timer is not a missing step.

## Checked

- Health 2 at z_en_goma.c:166; the sole pool.
- AT element z_en_goma.c:92: damage 8, `0xFFCFFFFF` so blockable. No runtime `atDmgInfo` writes. The AC element at z_en_goma.c:112 has `atOn: false`, so it is correctly not an attack source.
- Damage handling at z_en_goma.c:645-693.
  - For `ENGOMA_NORMAL`, shield does no damage and lands a leaping larva (z_en_goma.c:652-656), Deku Nut stuns (z_en_goma.c:664-668), anything else deals `GetSwordDamage` or 1 (z_en_goma.c:670-678).
  - For an egg, any connecting hit kills it (z_en_goma.c:683-692).
  - `CONNECTS` excludes only MIR_RAY (AC mask `0xFFDFFFFF`, z_en_goma.c:113).
- Sword damage table by flag (z_collision_check.c:3718-3725) matches `SWORD`.
- Timers: stand `Rand_S16Offset(10,30)` = 10-39 (z_en_goma.c:457; z_lib.c:239-240), prepare_jump 30 (z_en_goma.c:474), land 10 (z_en_goma.c:497), hurt 10 (z_en_goma.c:352), flee 20 (z_en_goma.c:209), stun 100 (z_en_goma.c:576), hatch 5 (z_en_goma.c:328). `hurtTimer` 13 after a hit and 8 after a nut (z_en_goma.c:667, 681), so the `hurt` phase is unhittable for its 10 frames.
- Steps: egg to fall at 10 consecutive frames within 100 xz (z_en_goma.c:298-301), room egg hatches at touchdown (z_en_goma.c:246-247), boss egg hatches after its timers (z_en_goma.c:280), chase to prepare_jump at xz <= 150 (z_en_goma.c:569-570), jump to land on contact or touchdown (z_en_goma.c:529-530, 639-643), hurt to flee (z_en_goma.c:375), flee/land/stunned to stand (z_en_goma.c:226, 507, 601).
- Variants: params < 3 boss (z_en_goma.c:168-171), room 6-9 (z_en_goma.c:172-177).
- Ledger: all 15 extracted names mapped. Debris (params 10-99, no colliders, z_en_goma.c:147-160, 199, 743) and BossLimb (params >= 100, z_en_goma.c:140-146) reasons are true. BossLimb is spawned on Gohma's death (z_boss_goma.c:2113 with `sDeadLimbLifetime + 100`).

## Outcomes
1. fixed: the attack is now `contact` (cylinder 1, 8 damage, z_en_goma.c:92; SetAT every frame with invincibilityTimer 0, z_en_goma.c:765-770). Near steps deliver it out of every phase where Link can be near: near self-steps (cite z_en_goma.c:770) in `egg_fall_boss`, `stand`, `prepare_jump` and `stunned`; near/far splits of floor egg->fall, fall->hatch, hatch->stand, chase->prepare_jump, land->stand, hurt->flee and flee->stand; the leap keeps it on jump->land. The room egg variant is split into `ceiling_egg` (params 8, 9, z_en_goma.c:179, no contact while resting on the ceiling) and `floor_egg` (params 6, 7, z_en_goma.c:182). The 10-frame spawn invincibility (z_en_goma.c:170) and 5-frame shield-bash invincibility (z_en_goma.c:662) are under one beat and recorded in the spec header.
2. fixed: SWORD cites moved to the value lines z_collision_check.c:3719/3721/3723/3725.
3. fixed: SHIELD entry cite 662 -> 652 (`if (dmgFlags & DMG_SHIELD)`).
4. answered: 80 and 86 frames are both 4 beats (`Math.round(mean / 20)`, studio/tools/ocarina/gen.ts:25), so the model is unchanged. The 10-frame spawn invincibility (z_en_goma.c:170) is half a beat and falls inside the egg's fall; noted in the spec header.
5. answered: agrees with the spec; `chase` has no timer because `EnGoma_ChasePlayer` never reads actionTimer (z_en_goma.c:551-572). No change.
