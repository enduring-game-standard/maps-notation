# ovl_En_Shopnuts

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. **`hidden` merges Idle's hittable rise and Burrow's first frames with the unhittable wait** (phase `hidden`, `hittable: ['HAMMER_SWING','HAMMER_JUMP']`). Severity: minor.
   - Spec: while hidden only the hammer quake reaches the scrub (also stated in the `expected.deadVerbs` reason).
   - Code: `EnShopnuts_SetupIdle` clears AC (`z_en_shopnuts.c:111`), but `EnShopnuts_Idle` turns it on at animation frame 9 (`z_en_shopnuts.c:162-163`) and keeps it on until the rise ends and the scrub moves to Peek/LookAround (171-178). `EnShopnuts_Burrow` keeps AC on until frame 4 (`z_en_shopnuts.c:246-247`). Any damage type in the AC mask can connect in those windows, ranged attacks from far included. Whether the windows fall inside a 20-frame beat cannot be settled without the animation lengths (assets are not in this checkout).

2. **Hammer quake works at any distance** (phases `peek`, `throw`, `peek_after`, `look_around`; hammer verbs gated to near). Severity: minor.
   - Spec: hammer verbs need Link near, so while the scrub is up (only when Link is far) the hammer cannot reach it. The `expected.deadVerbs` list covers every other melee reach but not the hammer, and `HAMMER_JUMP`/`HAMMER_SWING` get no far option.
   - Code: `EnShopnuts_ColliderCheck` reacts to `play->actorCtx.unk_02 != 0` with no distance test (`z_en_shopnuts.c:267-268`). The quake is set at `z_player.c:8989` (`func_80842A28`) when the hammer strikes the ground (`z_player.c:9100` and `14720`). A hammer strike from far ends the fight in the code.

3. **Peek/LookAround choice is deterministic, not chance** (steps `hidden->peek`, `hidden->look_around`, no weights). Severity: minor.
   - Code: `EnShopnuts_Idle` picks LookAround only when the timer is 0 and `xzDistToPlayer > 320` (`z_en_shopnuts.c:174-175`), else Peek (177). The timer is `Rand_S16Offset(100, 50)` (109), counting down only while the animation is held (158-160). The model draws between them at equal odds. Also, the engage line is 160 (`z_en_shopnuts.c:181`, speed released only above 160), not the 120 of the duck check (169, 172), so there is a 120-160 band where the scrub stays hidden with Link "far".

4. **Damage entries for types the AC mask excludes** (`damage.entries`, all 32 types at 1, cite 266). Severity: minor. The AC mask is `0xFFCFFFFF` (`z_en_shopnuts.c:60`), which excludes `DMG_SHIELD` (bit 20) and `DMG_MIR_RAY` (bit 21); those two cannot connect, and the damage value is irrelevant anyway because the scrub never reads damage or health (only `AC_HIT`, 263-266). If the generator gates on the inventory mask these entries are inert; flagging the cite (266) only shows the transition, not damage.

## Checked

- Health 1: `z_en_shopnuts.c:68`. No damage table (`CollisionCheck_SetInfo(..., NULL, ...)`, line 87).
- Any `AC_HIT` -> `EnShopnuts_SetupSpawnSalesman` (263-266), and the hammer quake does the same (267-268); `EnShopnuts_SpawnSalesman` spawns En_Dns and kills the actor (253-256), so modeling the hit as defeat is right.
- Steps with right cites: hidden->look_around (175), hidden->peek (177), peek->throw (213), peek->hidden near (211), throw->peek_after far (225), throw->hidden near (223), peek_after->hidden (211, via the 0x1000 timer flag set at 129-130 and tested at 210), look_around->hidden (195). Near/far split at `xzDistToPlayer < 120` is the code's own (169, 194, 210, 222).
- Nut attack: spawned at `z_en_shopnuts.c:231`; nut collider damage 8 (`z_en_nutsball.c:59`), effect none, AT_TYPE_ENEMY (51). Reflection by Deku Shield, or Hylian Shield as adult only (`z_en_nutsball.c:127-128`), requires AT_BOUNCED (129-130) and turns the nut into `DMG_DEKU_STICK` (134). Mirror Shield is correctly absent.
- C5: six action functions (Burrow, Idle, LookAround, Peek, SpawnSalesman, ThrowNut) are all mapped; `peek*` covers `peek` and `peek_after` (Peek serves both: timer set at 129-133). The SpawnSalesman exclusion is true (252-256).
- C6: the only AT is the Nutsball's element (`z_en_nutsball.c:59`); the scrub's own cylinder has `AT_NONE`/`ATELEM_NONE` (`z_en_shopnuts.c:51,61`), consistent with empty `atSources`.

## Outcomes

1. answered: the rise window (AC on at Idle frame 9, `z_en_shopnuts.c:162-163`) always ends in Peek or LookAround (`z_en_shopnuts.c:171-178`), both fully hittable phases in the spec, so the far step hidden->peek/look_around already carries it; Burrow's AC lasts frames 0-3 (`z_en_shopnuts.c:246-247`), under one 20-frame beat, so `hidden` stays hammer-only. Recorded as a sub-beat note in the spec header.
2. gap: the quake check has no distance test (`z_en_shopnuts.c:267-268`, set at `z_player.c:8989`), but Link's hammer attacks carry `melee` reach in shared `data/link.ts:84,115`, and a spec cannot give one Link attack a different reach. Recorded in the spec header.
3. gap: the exit from Idle is set by distance bands (320 at `z_en_shopnuts.c:174`, 160/480 at 181-182) and the held timer (109, 158-160), not by a random draw; the model has one near/far line at 120 (169, 172), so it keeps the two exits at even odds and lets the scrub rise anywhere past 120. Recorded in the spec header.
4. fixed: `damage.entries` now leave out SHIELD and MIR_RAY, matching the AC mask `0xFFCFFFFF` (`z_en_shopnuts.c:60`). They were already inert, because the generator gates hits on the mask (`studio/tools/ocarina/gen.ts:140-142,156`). Cite 266 is kept on purpose. The entry models "any hit ends it", and 266 is the line that shows that (`EnShopnuts_SetupSpawnSalesman` on AC_HIT); damage 1 against health 1 (68) is just the device that drains the pool.
