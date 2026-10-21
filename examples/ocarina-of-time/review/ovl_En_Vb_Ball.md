# ovl_En_Vb_Ball

Reviewer: Claude Sonnet 5.5

## Verdict

minor findings

## Findings

1. Spec header comment and `steps` (all `near`/`far` pairs). Spec says each generation "lands where the last one did, give or take a few units (spawn offsets of 13 and 10 units, lines 218-224), so each lands near Link exactly when the one before it did." Code: the spawn offset is also copied into the child's velocity (`newActor->actor.velocity = spawnOffset;` `src/overlays/actors/ovl_En_Vb_Ball/z_en_vb_ball.c:235`), and `Actor_UpdatePos` adds velocity to position every frame (`src/code/z_actor.c:989-991`, `z_en_vb_ball.c:192`). Pieces spawn with y velocity 4-11 (`z_en_vb_ball.c:219`, `:223`) and gravity -1 per frame (`:190`), so they stay airborne roughly 8-22 frames, drifting up to 13 (or 10) units per frame in x and z. They land tens to a couple hundred units from the parent, not "a few". The "exactly when" claim is false. The step structure (each generation independently near or far, chosen by Link's range) is still a defensible abstraction, but the stated justification is wrong. Severity: minor.
2. Steps `falling->shards`, `shards->pebbles`, `pebbles->gone` (near, `attack: 'rock'`). Spec cites `z_en_vb_ball.c:304` (`CollisionCheck_SetAT`) as the cite for the transition. Code: line 304 only registers the AT collider every frame. The phase change is the landing check at `:201` plus kill (`:203`, `:294`) and child spawn (`:226-229`). AT_HIT does not kill or change the rock (`:297-302` only plays a sound). Label "The rock lands on Link" is also off: the AT collider is live while the rock is falling and in flight (`:304` runs every non-bones frame), so it can hurt Link before landing. Severity: minor (cite and label).
3. Step `falling->shards` far, cite `:203`. Line 203 is `Actor_Kill`, which does show the rock ends; the successor spawn is at `:226-229`. Acceptable but the cite for `shards`/`pebbles` creation (the fact that matters) is better at `:226-229`. Severity: minor.

## Checked

- Damage 32: `{ 0x00100700, HIT_SPECIAL_EFFECT_NONE, 0x20 }` at `src/overlays/actors/ovl_En_Vb_Ball/z_en_vb_ball.c:55`; matches inventory (atDamage 32). Effect NONE so `{ kind: 'none' }` is right.
- `blockable: true`: AT flags 0x00100700 are bits 8-10 and 20 (`include/collision_check.h:419-421,432`), no `DMG_UNBLOCKABLE` (bit 29, `:441`); the player's shield AC accepts 0xDFCFFFFF (`src/overlays/actors/ovl_player_actor/z_player.c:10518`), which overlaps bits 8-10. Shield can stop it.
- `hittable: 'none'` on all phases: `CollisionCheck_SetAC` is never called in this file (only `SetAT` at `:304`); no damage table, no health. `damage: none`, `pools: []` correct.
- Generation chain: params 100 spawned by Boss_Fd (`src/overlays/actors/ovl_Boss_Fd/z_boss_fd.c:1380-1381`, params 100, at Volvagia's x/z, so "falls where she is" holds); 100 and 101 split on landing into two children with `params + 1` (`z_en_vb_ball.c:202`, `:208-211`, `:229`); 102 takes the else branch and is killed (`:277-294`). Matches phases/states.
- Bones: `params >= 200` branch inits no collider (`:70-77`, collider only in else `:78-80`); Update runs only `EnVbBall_UpdateBones` (`:193-194`). Exclusion reason is true.
- C5: inventory lists no action functions (inventory.json); `states` covers 100/101/102/>=200, all branches of Init/Update on params. No gaps.
- C6: one AT element at `:55`, mapped to `rock`; no runtime atDmgInfo, no directHurt in the inventory.
- Damage is the same for all generations (single collider init, only dimensions scale: `:81-84`), so one `rock` attack for all three steps is right.
- Loadouts adult only: rock is Volvagia's (Boss_Fd, `z_boss_fd.c:1380`); a judgment, consistent with the fight.

## Outcomes
1. fixed: the header no longer makes the "lands where the last one did" claim. It now cites the velocity copy (`z_en_vb_ball.c:235`), the 1.5 position scale (`:192`, `src/code/z_actor.c:989-991`), the rise and gravity (`:219`, `:223`, `:190`), and a drift of up to a couple of hundred units. It states that each generation hits by Link's range band that beat.
2. fixed: the near steps cite the landing check (`:201`) and are labeled "comes down on Link". The header states that the collider is live in flight (`:304`) and that a hit does not stop the rock (`:297-302`).
3. fixed: the far split steps cite the child spawn (`:229`).
