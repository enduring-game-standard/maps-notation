# ovl_En_Bom

Reviewer: Claude Sonnet 5.5

## Verdict

minor findings

## Findings

1. **Variant `enemy_bomb`, cite `src/overlays/actors/ovl_En_Dodojr/z_en_dodojr.c:600`.** The variant claims the bomb is spawned with its timer at 0 and goes off at once. Line 600 is `if (bomb != NULL) {`. The assignment `bomb->timer = 0;` is at line 601, and the spawn is at 597. Severity: minor (wrong cite; the fact is true one line down).
2. **Header and `damage.entries` cite `at(287)`: "Any accepted hit zeroes the timer."** There is a second trigger the spec does not mention. An enemy overlapping the bomb also zeroes the timer: `(this->bombCollider.ocFlags1 & OC1_HIT) && (this->bombCollider.base.oc->category == ACTORCAT_ENEMY)` at `src/overlays/actors/ovl_En_Bom/z_en_bom.c:285-287`. It cannot occur in a one-actor encounter, but the description of what sets the bomb off is incomplete. A bomb in water at depth 20 or more is killed without a blast (360-364); also environmental. Severity: minor (labeling and unreported transition, no effect in a Link-versus-bomb fight).
3. **Ledger `EnBom_WaitForRelease` (exclusion cite `at(178)`).** The reason "held by Link until he lets go; lifting and throwing are not Link verbs" is true. The ledger does not say that the fuse and the blast still run while the bomb is held. The timer decrements in `EnBom_Update` before the action function (249-250, 262) and the detonation block (317-342) runs for any action function, with an extra `Actor_HasParent` offset at 321-323. Link's own bomb can therefore blow up in his hands. The model reaches the same blast through `fuse -> blast_normal` near, so the numbers hold. Severity: minor (labeling of what the exclusion hides).

## Checked

- Blast element: `{ 0x00000008, HIT_SPECIAL_EFFECT_NONE, 0x08 }`, `ATELEM_ON`, `AT_ON | AT_TYPE_ALL` at `z_en_bom.c:72,74,85`. Attack `explosion` damage 8, effect `none`, source 72 is right.
- Runtime damage change `damage += (rot.z & 0xFF00) >> 8` at `z_en_bom.c:119`. Spawn sites pass the rot.z argument: En_Vm `0x6FF` (`z_en_vm.c:393`) and `0x601` (`z_en_vm.c:423`), En_Peehat `0x602` (`z_en_peehat.c:889`), En_Fw `0x600` (`z_en_fw.c:273`). High byte 6 gives 8+6 = 14, matching `explosion_strong`. Dodojr, Dodongo (`6`), Am (`2`), Bom_Chu and En_Go all have high byte 0, so 8. Spec list of callers is correct (En_Go2 at `z_en_go2.c:1384` and En_Heishi2 at `z_en_heishi2.c:680` are not named; the first also spawns with timer 0 and 8 damage, the second a normal fuse bomb; not claimed as exhaustive).
- Body hurtbox mask `0x0003F828` (`z_en_bom.c:60`) decodes to EXPLOSIVE, ARROW_NORMAL, ARROW_FIRE, ARROW_ICE, ARROW_LIGHT, ARROW_UNK1-3, MAGIC_FIRE (bits 3, 5, 11-17 in `include/collision_check.h`). The `DETONATE` list matches exactly. `AC_TYPE_PLAYER | AC_TYPE_OTHER` at line 52. Sword, stick, slingshot, boomerang do not detonate.
- Fuse: `timer = 70` (113), decrement 249-250, detonation `timer == 0` at 317, `SetupAction(EnBom_Explode)` at 342; hit sets `timer = 0` at 287 and the same update runs the detonation block. Blast lasts `timer = 10` (340) then `Actor_Kill` (232), one beat.
- `AT` is set only in `EnBom_Explode` when `params == BOMB_EXPLOSION` (194-196); `BOMB_BODY` is 0 (`z_en_bom.h:24`). Supports step cite 195 and the `blast_*` glob.
- Link's own bomb: `Actor_SpawnAsChild(... 0, rotY, 0, 0)` at `src/overlays/actors/ovl_player_actor/z_player.c:2441-2442`, so params 0 and rot.z 0: timer 70, damage 8.
- `blockable: true`: blast `dmgFlags` 8 overlaps the shield quad mask `0xDFCFFFFF` (`z_player.c:10518`). Effect `none` matches hit special effect NONE (72).
- C5: inventory lists four names. `EnBom_Move -> fuse`, `EnBom_Explode -> blast_*`, `EnBom_WaitForRelease` excluded (true, see finding 3), `actionFunc` excluded: it is the parameter name at line 101-102, not an action function.
- C6: sources 72 and 119 both mapped; cylinder element 59 has `ATELEM_NONE`.
- Burning Deku Stick note: `(this->timer > 100) && Player_IsBurningStickInRange` at 292, and `timer = 70` at init, so it never fires. True.

## Outcomes
1. fixed: the `enemy_bomb` variant cites `z_en_dodojr.c:601` (`bomb->timer = 0;`).
2. fixed: the header now names the enemy-overlap trigger (z_en_bom.c:285-286) and the underwater removal with no blast (360-363), and says neither can happen with Link alone against one bomb.
3. fixed: the header and the `EnBom_WaitForRelease` exclusion now say the fuse (249-250, before the action function at 262) and the blast (317-342) still run while Link holds the bomb, and that `fuse` reaches the same blast near Link.
