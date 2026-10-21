# ovl_En_GeldB

Reviewer: claude-sonnet-5-5

## Verdict

major findings

## Findings

Cites without a path are `src/overlays/actors/ovl_En_GeldB/z_en_geldb.c`.

1. **Phase `roll_back` (hittable default).** Major.
   - Spec: Link can hit her in `roll_back`. The phase has no `hittable`, and the dead-verb ledger never mentions `hit_*__roll_back`, so those hit verbs exist.
   - Code: the body collider joins the AC list only when `this->action >= GELDB_READY` (z_en_geldb.c:1445-1447).
   - The enum puts `GELDB_ROLL_BACK = 4` (z_en_geldb.c:38) below `GELDB_READY = 5` (z_en_geldb.c:39), and `EnGeldB_SetupRollBack` sets `GELDB_ROLL_BACK` (z_en_geldb.c:1009).
   - Nothing connects in `roll_back`. The author already applied this rule to `jump` (3) and `damaged` (2) with `hittable: 'none'` citing 1445. Same cite, same fix: `roll_back` needs `hittable: 'none'`.
   - Effect: Link can land hits on her mid-flip. That includes the flip that follows every `damaged` and `spin_dodge` exit, and every shield-bounced slash.
2. **Attacks `slash` and `spin`, no `onBlock`.** Minor.
   - Spec: a blocked slash or spin changes nothing.
   - Code: a shield bounce on `Slash` sets `AT_BOUNCED`, which sends her to `EnGeldB_SetupRollBack` (z_en_geldb.c:891-894).
   - A bounced `SpinAttack` sets `spinAttackState = 1` (z_en_geldb.c:940-943) and then flips back at the end (z_en_geldb.c:976-977). The spin cannot grab Link after it is bounced (z_en_geldb.c:944-955 runs only when not bounced).
   - So `onBlock: { to: 'roll_back' }` is missing on both attacks. The spec has her follow the normal 30/21/49 reset instead.
3. **Overrides `reacts` (SWINGS to `block`).** Minor.
   - Spec: a frontal swing always sends her to `block` (cite 309).
   - Code: block happens only when `gameplayFrames & 1` (z_en_geldb.c:308). On an even frame it falls to the second `func_800354B4` check, which ends in `EnGeldB_SetupRollBack` (z_en_geldb.c:313-328). That check has a narrower Link-facing window (0x2AA8 vs 0x3E80, z_en_geldb.c:304 vs 313).
   - So about half of reacted swings are a flip away (also hit-proof per finding 1), not a block. Damage is 0 either way. Only the next phase differs.
4. **Phase `block` guard window.** Minor.
   - Spec: `block` is guarded for its whole phase (5-15 frames from z_en_geldb.c:1154).
   - Code: the block tris collider is set only while `action == GELDB_BLOCK && curFrame == 0.0f` (z_en_geldb.c:1449-1451). The animation is held at speed 0 for `timer` frames and plays on after (z_en_geldb.c:1155, 1165-1169). Once it plays, the body collider alone is up and normal hits land (z_en_geldb.c:1447).
   - The phase therefore has a 5-15 frame guard and then unguarded frames until the animation ends. The phase exits at timer end in the spec (afterTimer).
5. **Missing transition: ready to circle without the timer.** Minor.
   - Code: if Link has a weapon out within 100 units and is not facing her, she goes straight to `EnGeldB_SetupCircle` regardless of the timer (z_en_geldb.c:472-475).
   - The spec's `ready` steps all wait for the timer (z_en_geldb.c:476 onward).
6. **Missing transition: circle to slash.** Minor. When Link's back is turned and she is within 45 units, `Circle` goes to `EnGeldB_SetupSlash` (z_en_geldb.c:751-753). The spec's `circle` only has the timed exit to `ready` (z_en_geldb.c:754-758).
7. **Missing transition: roll_forward to ready.** Minor.
   - Code: when the flip ends and she is not facing Link, she goes to `EnGeldB_SetupReady` (z_en_geldb.c:606-611).
   - The spec has only `slash` and `advance` out of `roll_forward`, at weight 1:1 (cites 614, 616).
   - The code's slash vs advance split is `Rand > 0.5 || angle < 0x3FFC` (z_en_geldb.c:612-613). The 1:1 weight is not the code's odds.
8. **Step `sidestep` to `slash` (near, no weight) and the missing `advance` (near).** Minor.
   - Spec: from near she always slashes (cite 1317).
   - Code: slash needs `xzDist <= 45`, not locked on by others, and `(!(frames & 3) || angle < 0x38E0)` (z_en_geldb.c:1315-1317). Otherwise `EnGeldB_SetupAdvance` (z_en_geldb.c:1326-1328). That `advance` exit exists from near too.
   - There is also `sidestep` to `ready` when Link faces away, `angleFacingPlayer >= 0x3A98` (z_en_geldb.c:1307-1309).
9. **Step `slash` to `slash`, weight 49.** Minor. Cite 914 calls `EnGeldB_ReactToPlayer(play, this, 1)`. That function can pick sidestep, slash, circle (z_en_geldb.c:351-366), block, spin dodge, or roll back (z_en_geldb.c:304-349). The 49 branch also reaches `circle` directly at 912 and 917. Slash-again is the main outcome, not the only one. `slash` to `ready` at 903 also fires when she is not facing Link (z_en_geldb.c:896-897), which is a different gate than the spec's far gate.
10. **Attack `spin`, label and summary.** Minor.
    - Spec summary and attack label say she "throws him in the cell".
    - Code: after the 30-frame timer the destination is `ENTR_GERUDO_VALLEY_1` if Link lacks the Hookshot or Longshot (z_en_geldb.c:1600-1601). It is the fortress (17 or 18) only when he has both (z_en_geldb.c:1602-1605).
    - Game-end effect is the same: Link is carried off. Only the label is wrong.
11. **Ledger `EnGeldB_Pivot` to `ready`.** Minor.
    - Pivot has no timer. It runs until she faces Link within 30 degrees, then goes to circle (20%) or advance (80%) (z_en_geldb.c:648-654).
    - `ready` instead carries the `[5,15]` frame timer and a 0.3/0.7 split (z_en_geldb.c:440, 486-489).
    - The grouping is acceptable as an approximation, but the phase conflates two states.

## Checked

- Health 20 at z_en_geldb.c:248; matches the inventory.
- Sword AT element at z_en_geldb.c:172-178: damage 8 (0x08), effect NONE, `0xFFCFFFFF` so the shield stops it. No runtime `atDmgInfo` writes. `atSources` has the one element.
- Damage table at z_en_geldb.c:192-225: the author reads the reactions correctly.
  - `GELDB_DMG_REACT_STUN` and `FREEZE` skip damage if already stunned (z_en_geldb.c:1400-1406).
  - `UNK_6` skips the whole reaction (z_en_geldb.c:1396). The frame-skip at z_en_geldb.c:1433 lasts one update only, because `CollisionCheck_ResetDamage` runs after every update (z_actor.c:2515).
  - `NORMAL`, `UNK_D`, `UNK_E` all go to `EnGeldB_SetupDamaged` (z_en_geldb.c:1408-1423).
- Stun length 80 frames: `Actor_SetColorFilter(... 80)` at z_en_geldb.c:1403, with exit when `colorFilterTimer == 0` at z_en_geldb.c:1057. A blue filter (0x0000, actor.h:169) keeps the body on the AC list (z_en_geldb.c:1446), so `stunned` is hittable.
- `damaged` and `jump` unhittable (action 2 and 3 are below READY, z_en_geldb.c:1445).
- Block tris mask 0xFFC1FFFF (z_en_geldb.c:130): bits 17-21 clear, which are MAGIC_FIRE, MAGIC_ICE, MAGIC_LIGHT, SHIELD, MIR_RAY. Matches `BLOCKED`.
- Timers: ready `Rand*10+5` (z_en_geldb.c:440), circle `Rand*30+30` (z_en_geldb.c:668), sidestep `Rand*10+5` (z_en_geldb.c:1231), block `(Rand-0.5)*10 + 10` giving 5-15 (z_en_geldb.c:1154), spin dodge 6 (z_en_geldb.c:782).
- Weights: ready far 15/15/49/21 (z_en_geldb.c:479-489); advance near slash 97 / circle 3 (z_en_geldb.c:550-555); roll_back 2/4/4 (z_en_geldb.c:1018-1024); damaged slash 7 / roll_back 1 (z_en_geldb.c:1101-1105); stunned slash 7 / circle 1 (via `ReactToPlayer(…,1)` z_en_geldb.c:1061, 359-363).
- `DodgeRanged`: En_Arrow and Hookshot only. The player's Deku Nut is an En_Arrow (z_player.c:13851-13853), and the function reads `ACTOR_ARMS_HOOK` and `ACTOR_EN_ARROW` (z_actor.c:3868). The Hookshot jumps (z_en_geldb.c:1659-1660), everything else blocks (z_en_geldb.c:1662).
- Ledger exclusions: Wait (below READY, no AC, z_en_geldb.c:383-384, 1445), Flee (kills itself, z_en_geldb.c:431-432), Defeated (after the finishing blow, z_en_geldb.c:1357). All 18 extracted names are mapped.

## Outcomes

Cites without a path are `src/overlays/actors/ovl_En_GeldB/z_en_geldb.c`. The spec now states its facing assumption in its header: she faces Link and Link faces her (Z-targeted duel), which the existing ready, spin, and stunned weights already used.

1. fixed: `roll_back` is `hittable: 'none'` (cite 1445; action 4 < READY 5, z_en_geldb.c:38-39). The 21 `miss_*` ledger entries are removed, because misses on the flip are now reachable.
2. fixed: `slash` has `onBlock: { to: 'roll_back' }` (894). `spin` has `onBlock: { to: 'roll_back' }` (977, the facing branch after `spinAttackState = 1` at 942).
3. gap: an override carries one outcome per damage type, so the even-frame flip-away (326), and the circle-on-swing exits past the narrower window (472-475, 529-533), are not modeled. Every reacted swing is the block. This is recorded in the spec header.
4. fixed: new phase `block_lower` (cite 1168) follows `block` after its timer. The block collider is off there (1449-1450), so non-swing hits land. Swings re-block (1206) and jump slashes spin-dodge (1197) via overrides. The slash and circle exits moved from `block` to `block_lower`. The tail's length depends on the block animation's length (1170), which is in the asset, not the source, so it is modeled as one beat. Gap recorded in the header.
5. gap: the exit fires only while Link swings (`meleeWeaponState`, 472). In the beat model that is Link's own hit, which the `reacts` override already resolves, and an override carries one outcome. Recorded in the header with finding 3.
6. fixed: added the near step `circle` to `slash` (753). Its back-turned test (751) is geometry the model lacks, so near circling always ends in a slash before the timer runs out. Recorded in the header.
7. answered for the weights, gap for the Ready exit. With Link facing her, `facingAngleToLink` is near 0x8000, so the `< 0x3FFC` term at 613 is false and the split is `Rand > 0.5`, which is the spec's 1:1. The Ready exit (606-607) needs her not facing Link after a flip aimed at him (593). The model lacks facing, so this is recorded in the header.
8. fixed: once Link faces her, `angleFacingPlayer >= 0x3A98` holds (1306-1307), so the timed exit is always Ready (1308). The sidestep's steps are now one `afterTimer` step to `ready`. The old slash, flip, spin, and advance steps belonged to the back-turned branch (1311-1328), which is now recorded as unmodeled in the header.
9. fixed: with Link facing her, `angleFacingLink <= 0x2710` (909) fails, so the 49% branch is `EnGeldB_SetupCircle` (917), not `ReactToPlayer` (914). The step is now `slash` to `circle`, weight 49, cite 917, which matches the spin attack's own 49 to circle (998). Part answered: the far step's cite 902 is the `Rand > 0.7 || xzDist >= 120` gate. The not-facing exit (896-897) is excluded by the facing assumption.
10. fixed: the label and summary now say she carries him off to Gerudo Valley without a Hookshot, else to the fortress cell (1600-1605). The Hookshot and Longshot share one slot (src/code/z_inventory.c:237-238), so the test at 1600 means "has no hookshot".
11. answered: `EnGeldB_Pivot` is entered only at 492, when `Actor_IsFacingPlayer` fails at Ready's timer end. The facing assumption excludes that case, so grouping it with `ready` changes no modeled path. The header records it as an unmodeled branch.
