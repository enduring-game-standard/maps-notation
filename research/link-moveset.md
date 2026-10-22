# Link's moveset in Ocarina of Time, read as a designer reads it

Answers issue #8. Map: issue #3.

## Summary

- Link's moves share one hub. Every verb starts from a resting stance and returns to it, and the stance depends on targeting: free idle, Z-target idle (parallel or friendly lock-on), or battle stance (hostile lock-on). The decomp says this directly. Each player action runs an *action handler list*, a priority list of the verbs it can start (`z_player.c:4169-4231`), and every action ends by calling one of three idles, picked by targeting (`func_80839FFC`, `z_player.c:5588`).
- Targeting is the biggest gate. Sidehop, backflip, and jump attack exist only while Z-targeting. Under hostile lock-on Link loses doors, climbing, pushing, mounting, and C-up look. The battle-stance list has none of those handlers (`z_player.c:4169`).
- The hands are the second gate. What Link holds (nothing, a one-handed sword, a two-handed weapon, a ranged item, a carried object, a bottle) decides what B does, whether R puts the shield in hand, and whether he can grab, climb, or open things.
- The medium is the third gate: ground, air, water surface, underwater, climbing, crawling, or horseback. Off the ground almost every item button goes dark. The HUD code turns buttons off by medium (`z_parameter.c:679`, `:774`, `:812`), and `Player_UseItem` refuses every item in water except a Hookshot fired while standing on the bottom (`z_player.c:3544`).
- Age is a global layer. It mostly gates gear: the age tables (`z_kaleido_scope.c:751`, `:778`, `:805`) give each age its own weapon, shield, and tool set. Four rules are hard-coded besides: crawlspaces are child-only (`z_player.c:7610`), strength is capped at the Goron's Bracelet for a child (`z_player_lib.c:816`), the child is about 11/17 the adult's size for ledges and steps (`sAgeProperties`), and a child holding the Hylian Shield gets a separate, more limited shield verb.
- Combat chains are short and readable. Three swings in the same direction make a combo finisher. Holding B after a swing charges a spin. A jump attack lands with a finishing strike. A roll can turn into a slash. A raised shield turns B into a crouch stab. Released early, the spin is a normal spin; at 85% charge or more, or with the stick rotated, it is the great spin.
- The existing Link spec (`studio/tools/ocarina/data/link.ts`) covers the combat *economy*: damage types, magic costs, health, and hit effects. It does not cover stance, targeting, hands, or medium. Those are the states this catalog adds.

Sources: the zeldaret/oot decomp at `14759abf9abb4295de142cdc1452998630ea70fb`. `P` means `src/overlays/actors/ovl_player_actor/z_player.c`, `PL` means `src/code/z_player_lib.c`, `ZP` means `src/code/z_parameter.c`, and `KS` means `src/overlays/misc/ovl_kaleido_scope/z_kaleido_scope.c`. A citation appears where it settles whether or when a verb is available. Behavior with no citation is standard game knowledge that no source here contradicts. Items marked **unverified** were not confirmed in code.

## How the decomp structures the moveset

Each frame, the current action runs an action handler list. A handler is one "can I start verb X now?" check, and the first handler that succeeds wins (`P:4285`, `Player_TryActionHandlerList`). So "which verbs are available in which circumstance" is written down as data:

| Handler | Verb(s) it starts |
|---|---|
| 0 | C-up: first-person look, or Navi talk (`P:6293`) |
| 1 | Open door (A) (`P:5372`) |
| 2 | Open chest, pick up, lift, collect a get-item (A) (`P:7331`) |
| 3 | Mount Epona (A) (`P:7194`) |
| Talk | Speak / Check (A), or C-up Navi (`P:6176`) |
| 5 | Climb wall or ladder, enter crawlspace, grab block for push/pull (A held) (`P:7799`) |
| Roll | Roll (A + stick forward); otherwise put away the held item, or toggle Navi (`P:6489`) |
| 7 | B attack: sword swing, quick spin, bottle swing, fishing cast (`P:14635`) |
| 8 | Hold B after a swing: start spin charge (`P:6573`) |
| 9 | Throw or set down a carried object (A/B/C) (`P:7472`) |
| 10 | Z + A: jump attack, sidehop, backflip (`P:6385`) |
| 11 | Hold R: raise shield, standing (`P:6504`) |
| 12 | Climb up a ledge in front (`P:5003`) |
| 13 | Perform a queued item use: spell, ocarina, bottle drink, item exchange (`P:6030`) |

The lists, by stance (`P:4169-4231`):

| Stance (action) | Handlers in priority order | Missing, so impossible here |
|---|---|---|
| Free idle (`Player_Action_Idle`) | 0, 11, 1, 2, 3, 5, Talk, 9, 8, 7, Roll | 10 (no sidehop, backflip, or jump attack) |
| Free run (`Player_Action_80842180`) | 0, 11, 1, 2, 3, 12, 5, Talk, 9, 8, 7, Roll | 10 |
| Z-target idle, parallel or friendly (`Player_Action_808407CC`) | 13, 1, 2, 5, 3, Talk, 9, 10, 11, 7, 8, Roll | 0 (C-up talks to Navi or the target instead), 12 |
| Z-target run (`Player_Action_8084227C`) | 13, 1, 2, 3, 12, 5, Talk, 9, 10, 11, 8, 7, Roll | 0 |
| Battle stance, hostile lock-on (`Player_Action_80840450`) | 13, 2, Talk, 9, 10, 11, 8, 7 | 1 door, 3 mount, 5 climb/push/crawl, 12 ledge, Roll, 0 |
| Back-walk brake (`Player_Action_8084251C`) | 10, 8, 7 | almost everything |
| Swimming (`Player_Action_8084D610` and kin) | 0, 12, 5, Talk | every attack, item, and shield |

## The catalog

Notation: **[C]** child only, **[A]** adult only, **[C/A]** both. "Needs" lists the enabling circumstances, and "Chains to" lists what can follow without first returning to idle.

### Movement

| Verb | Age | Needs | Chains to / notes |
|---|---|---|---|
| Walk / run | C/A | Grounded. Indoor rooms cap run speed (`PL:619`). | Running into a ledge starts a step-up or climb (handler 12). Running off an edge is an auto-jump. |
| Turn in place | C/A | Grounded, stick flicked away from facing | Its list holds only handler 7, so a swing is the one option. |
| Auto-jump | C/A | Leave the ground at speed > 3, facing roughly forward, at least 20 units above the floor, not in water, not mid-swing, and not on an edge flagged no-jump (`P:5866-5870`). Link has no jump button. | Airborne: B gives a jump attack (`P:9588`). Can grab a ledge on contact (`P:9615`). |
| Fall / drop | C/A | Walking slowly off an edge. Link may grab and hang instead (`func_8083A6AC`). | Hang. |
| Ledge hang | C/A | Fall against a ledge less than 150 units up (`P:9615`), or ease off an edge | Stick up: pull up. A: let go (`P:12750`). |
| Step / climb up a ledge | C/A | Grounded, nothing carried, ledge in front. The height decides the move: hop, step, big step, or "250 jump" grab (`P:11280-11291`, `P:5044-5063`). The thresholds scale with age (see Child vs adult). | Returns to idle. |
| Climb wall or ladder | C/A | Climbable wall flag, ledge at least 79 units up, moving into it (`P:7490`) | All item buttons are off while climbing (`ZP:812`). A drops off ("Down" label, `P:10950`). |
| Crawl through crawlspace | **C** | Crawlspace wall flag, not in water, and `!LINK_IS_ADULT` (`P:7610`) | All buttons are off while crawling (`ZP:812`). |
| Roll | C/A | A with the stick forward. Not on floor type 7 (`P:6357`). From Z-target idle it also needs no melee weapon (`P:6400-6405`). | Invulnerable from frame 8 for 10 frames (`P:9701`). Bonks off walls, trees, and crates at speed 7 or more; a tree may drop an item and a crate breaks (`P:9716-9745`). From frame 15, B swings (`P:9749`). |
| Sidehop L/R | C/A | **Z-targeting**, A with the stick left or right, not in an indoor room, not on floor type 7 (`P:6385-6410`). Works with any held item. | Mid-air B gives a jump attack (`P:9588`). |
| Backflip | C/A | **Z-targeting**, A with the stick back, same room and floor limits | Mid-air B is blocked during a backflip; the check skips `actionVar1 == 2` (`P:9588`). |
| Strafe / back-walk | C/A | Z-targeting while moving | The brake out of a back-walk offers only 10, 8, and 7 (`P:4220`). |
| Swim | C/A | In water without Iron Boots | No items. A: dive. |
| Dive | C/A | Swimming, A, not wearing Iron Boots (`P:6862`, `func_8083D12C`). Holding A goes deeper, down to 120, 240, or 360 by scale tier (`P:10889`, `P:13638`). | A collects underwater items (handler 2). The A label counts down the depth left (`P:10968`). |
| Walk underwater | **A** | Iron Boots (adult-only equipment, `KS:778`). Sinks to the bottom and ignores conveyors (`P:11885`). | Only the Hookshot or Longshot fires on the bottom (`P:3544`, `ZP:774-790`). |
| Hover | **A** | Hover Boots: about 19 frames of hover after leaving ground (`P:11032-11052`), with ice-like traction (`P:7012-7030`) | |
| Ride Epona | **A** in practice | A next to the horse (`P:7194`). Riding turns B into the Bow and turns off the C buttons (`ZP:679-735`). A spends one of six carrot boosts (`z_en_horse.c:3334`). | Horseback arrows (`P:2771`). **Unverified:** I found no explicit age check on mounting; in the stable, the horse is removed for a child (`z_en_horse.c:876`). |
| Hookshot flight | **A** | Hookshot or Longshot tip hits a hookable surface | Player is in `PLAYER_STATE3_FLYING_WITH_HOOKSHOT` and counts as in a cutscene (`PL:624`). |

### Targeting and defense

| Verb | Age | Needs | Chains to / notes |
|---|---|---|---|
| Z-target, parallel | C/A | Z with no target in range | Enables the Z verbs (sidehop, backflip, jump attack) and third-person aiming. |
| Z-target, lock-on | C/A | Z with a target. A hostile target sets battle stance. | Battle stance strips doors, climbing, pushing, mounting, and C-up (see the lists above). Ocarina, letters, and trade items can't be used while hostile-locked; potions and fairies can (`P:3598-3605`). |
| C-up look / Navi | C/A | Free stance: first-person look (`P:6293`). Locked onto something with Navi data: Navi talks about it. | |
| Shield, standing | C/A | A shield equipped (`currentShield != NONE`), R held, not in a shooting gallery, and not Z-targeting, except a child with the Hylian Shield, who shields this way even while targeting (`P:6504-6512`). **No shield means no guard**; the same handler is the only full-body guard. | Link stops moving. The stick tilts the shield (`P:9175-9210`). B gives a crouch stab. A bounce off the shield takes no damage and pushes Link back (`P:4892-4920`), except a child with the Hylian Shield, who gets no recoil. Fire burns up a Deku Shield (`P:4922`). |
| Shield, strafing | C/A | Z-targeting, R, a shield equipped, **not** a child with the Hylian Shield, not on horseback, not mid item swap (`P:2872-2880`). Works with nothing in hand, a sword, Sticks, the Hammer, or a ranged item, because those items' upper-body updates include the shield check (`P:1374-1441`). | Upper-body only, so Link keeps moving. |
| Crouch stab | C/A | Standing shield, then B, holding a melee weapon (sword, Stick, or Hammer), and not a child with the Hylian Shield (`P:8962`) | Can repeat. Damage type is whatever the last swing set (`link.ts` notes `P:8966`). |
| Two-handed guard | **A** | R while holding the Biggoron Sword or Giant's Knife (or the Hammer). The shield stays on Link's back, since `Player_SetModelsForHoldingShield` skips the hand swap for two-handed weapons (`PL:666`), but the shield collider is still active whenever `PLAYER_STATE1_SHIELDING` is set (`PL:1498`). It still needs an equipped shield. | |

### Sword and melee

Melee weapons are the Master Sword, Kokiri Sword, Biggoron Sword or Giant's Knife, Deku Stick, and Megaton Hammer (`PL:872`). The Biggoron, Stick, and Hammer count as **two-handed** (`PL:886`). The Deku Stick is in that range.

| Verb | Age | Needs | Chains to / notes |
|---|---|---|---|
| Draw + slash | C/A | B with the sword sheathed. Drawing and swinging happen on one press (`P:2947-2955`). | Any slash. |
| Horizontal slash | C/A | B with the stick neutral and not Z-targeting, or the stick left, back, or right (`P:4466-4490`, table `P:4440`) | Combo. |
| Vertical slash | C/A | B while Z-targeting with the stick neutral, or B with the stick forward and not targeting (`P:4470-4485`) | Combo. |
| Thrust (stab) | C/A | B with the stick forward **while Z-targeting** (`P:4480-4484`) | Combo; lunges forward (`P:14665-14668`). |
| Combo finisher | C/A | The third consecutive swing of the same type uses the `*_COMBO` animation (`P:4527-4533`). Same damage type, different animation and sound (`P:2509`). | The counter resets after the finisher. |
| Deku Stick swing | **C** | Stick in hand. Every direction becomes a forward slash (`P:4487-4489`). | No spin, quick or charged (`P:4386`, `P:6576`). It does jump attack, at Master-sword jump damage (`P:4510`). Breaks on a hit (`link.ts`). |
| Hammer swing | **A** | Hammer in hand. Stick forward or neutral: overhead; left or right: side (`P:4458-4464`). | Ground shockwave on the overhead swing and the jump finisher (`P:14702-14720`). No quick spin (the hammer branch skips `Player_CanSpinAttack`). |
| Jump attack | C/A | **Z-targeting** + A, stick neutral or forward, melee weapon in hand, items usable (`P:6402-6403`). Also B while airborne from an auto-jump or sidehop (`P:6341`, `P:9588`). | Lands into the `JUMPSLASH_FINISH` strike (`P:9814-9817`). Uses the jump damage row, so it hits harder (`P:4551`). |
| Spin charge | C/A | B **held** right after a swing (`unk_844 == 1`, `P:6576`), not shielding, not a Deku Stick, not a broken Giant's Knife | Link can walk while charging (`P:9903-9910`). Releasing below 10% charge cancels (`P:9897-9901`). The charge rises 2% per frame (`P:9873`). |
| Spin attack | C/A | Release the charge below 85% | Invulnerable for 8 frames on release (`P:9836`). Magic adds the spin effect at 2 magic (`link.ts`); without magic it's still a spin with slash damage. |
| Great spin | C/A | Release at 85% charge or more, or rotate the stick during the charge (`P:9829`) | Jump damage row (`link.ts`). |
| Quick spin | C/A | Rotate the stick, then B (`P:4466`, `Player_CanSpinAttack` `P:4378`). Not with a Stick, a broken Knife, or the Hammer. | |
| Put away | C/A | A standing still with an item in hand (`P:6493-6497`, label `P:10988`) | |

**Open:** handler 8 (`P:6573-6582`) does not exclude the Hammer from the hold-B charge. I did not confirm in play whether a hammer charge or spin really happens.

The `FLIPSLASH` and `BACKSLASH` animations (`include/player.h:249-254`) exist in the table, but no player code path selects them. Every `func_80837948` call passes a computed or jump-attack animation (`P:6343`, `P:6403`, `P:9815`, `P:9835`, `P:14640`). Only En_Skb and En_Kanban read them.

### Items (C buttons, sometimes B)

The global rules apply first (`Player_UseItem`, `P:3532`):
- **In water**, only putting away works, plus the Hookshot or Longshot while standing on the bottom (`P:3544`).
- **Explosives** are capped at 3 active at once outside Bombchu Bowling (`P:3553`).
- **Shielding** blocks swapping to a non-melee item (`P:3539-3541`).
- **Carrying an object** blocks every item button (`P:2665`).
- **Ranged aiming** happens in third person, with strafing, if Z-targeting. Otherwise it is first-person aim and Link stands still (`func_80834EB8`, `P:3055`). The aim camera differs by age (`P:5907`).

| Verb | Age | Needs | Notes |
|---|---|---|---|
| Deku Nut flash | C/A | Grounded, **not an indoor room**, ammo (`P:6591`) | |
| Slingshot | **C** | Age table | First-person or Z-aim. |
| Bow (+ Fire, Ice, Light) | **A** | Age table; magic for magic arrows (`link.ts`) | Horseback Bow forced to B (`ZP:690-700`). |
| Boomerang | **C** | Age table | Its own throw and catch state (`PLAYER_STATE1_USING_BOOMERANG`). |
| Hookshot / Longshot | **A** | Age table | Pulls Link to hookable surfaces, or pulls small things to Link. Works underwater on the bottom. |
| Bombs | C/A | Ammo, cap of 3 | Pulled into the hands, which puts Link in the carrying state; throw or set down (see Contextual). |
| Bombchus | C/A | Ammo, cap of 3 | Always set down, never thrown (`P:7465`). |
| Megaton Hammer | **A** | Age table | See melee. |
| Din's Fire, Nayru's Love, Farore's Wind | C/A | Enough magic, meter idle (`P:3576-3581`). The cast happens only on the ground, swimming, or on horseback (`P:6036-6037`). Farore's warp-back needs no magic (`P:3578`). | Costs 12, 24, and 12 (`link.ts`). |
| Lens of Truth | C/A | Magic | Toggles on and off and drains magic (`P:3559`). |
| Ocarina | C/A | Not under hostile lock-on (`P:3598-3605`); grounded or swimming for the queued use (`P:6036`) | Songs are content, not moveset. Only Sun's Song touches combat (`link.ts`). |
| Bottle: swing / catch | C/A | Empty bottle in hand; land and water swings differ (`P:6614-6630`) | |
| Bottle: drink / release | C/A | Potions and fairies are allowed even when hostile-locked (`P:3600`) | |
| Masks | **C** | Age table. Wearing toggles (`P:3588-3594`). | **No movement effect.** The Bunny Hood appears only in drawing code and NPC reactions (`P:11799`, `P:12194`, `z_en_niw_girl.c:174`); the OoT decomp has no speed bonus. |
| Magic Bean | **C** | Age table | Planting. |
| Trade items | C or A by chain | Age table | Shown to NPCs (handler 13 exchange). |

### Contextual verbs (A button)

The A label follows a fixed priority (`Player_UpdateInterface`, `P:10896-10990`): Open door, then Open chest or Grab item (Drop, for an adult at the Master Sword pedestal), then Grab block, then Climb or mount, then Faster on horseback, then Speak or Check, then Down from a ledge or ladder, then Enter, then Throw or Drop a carried object, then Dive, then Attack (roll or jump attack), then Jump (sidehop or backflip, Z-targeting only), then Put away.

| Verb | Age | Needs | Notes |
|---|---|---|---|
| Open door | C/A | Door in front. Nothing carried, unless carrying Ruto (`P:5382-5384`). | A locked or ajar door gives text instead (`P:5388`). Not under hostile lock-on. |
| Open chest | C/A | Chest in front, nothing carried | |
| Talk / check | C/A | Talk offer in range | Blocked while carrying an object, unless it's the object being talked to (`P:6213-6220`). |
| Pick up / lift | C/A | Object in range, hands empty or holding a Hookshot (`P:7413`). Silver rocks need `PLAYER_STR_SILVER_G` (`P:7430-7433`). | |
| Lift giant block | **A** | `ACTOR_BG_HEAVY_BLOCK` needs the Gold Gauntlets (`P:7821-7824`) | |
| Carry | C/A | Holding an object | Most handlers are off. A cucco gives a flutter: A, B, or C while airborne (`P:9571-9577`). |
| Throw | C/A | Carrying while moving, or carrying a throw-only object (`P:7461-7468`) | |
| Set down | C/A | Carrying while standing still (`P:7476-7478`) | |
| Push / pull block | C/A | A **held** against a pushable wall, grounded, ledge at least 39 units up (`P:7808-7835`) | |
| Pull Master Sword | **A** | `ACTOR_BG_TOKI_SWD && LINK_IS_ADULT` (`P:7414`) | The child side is a cutscene. |
| Mount horse | **A** in practice | See Ride Epona | |

### Magic as a layer

Magic gates these verbs: spin-attack magic, magic arrows, the three spells, and the Lens (all costs are in `link.ts`). Each request needs the meter acquired and in its idle state (`P:3579-3580`). A spell in progress also counts as cutscene mode (`PL:623-626`), which freezes the other verbs. The spin is the only verb that degrades instead of failing: with no magic it still swings, just without the magic damage (`z_en_m_thunder.c:103-108`).

## Child vs adult

| Area | Child | Adult | Source |
|---|---|---|---|
| Sword | Kokiri Sword only | Master Sword, Giant's Knife, Biggoron Sword (two-handed) | `KS:778-783` |
| Shield | Deku (burns), or Hylian, worn on the back | Hylian, Mirror | `KS:784-789` |
| Hylian Shield behavior | Stationary full-cover crouch even while targeting. No strafing shield, no crouch stab, no block recoil. | Normal | `P:6510`, `P:2878`, `P:8963`, `P:4893` |
| Melee extras | Deku Stick: forward slash only, no spins, jump attack at Master-sword damage | Hammer: overhead or side swing, shockwave, no quick spin. Giant's Knife breaks after 8 hits (`P:9016-9017`). | `P:4487`, `P:4458` |
| Ranged | Slingshot, Boomerang | Bow plus magic arrows, Hookshot, Longshot | `KS:751-776` |
| Both ages | Nuts, Bombs, Bombchus, Ocarina, Din's, Farore's, Nayru's, Lens, bottles | same | `KS:751-776` |
| Masks, beans | yes | no | `KS:805` |
| Tunics, boots | Kokiri Tunic and Kokiri Boots only | Goron and Zora Tunics, Iron and Hover Boots | `KS:790-801` |
| Strength | Capped at the Goron's Bracelet, whatever the upgrade level | Bracelet, Silver, or Gold by upgrade | `PL:816-826` |
| Scale (diving depth) | same | same | `KS:798` (both ages) |
| Crawlspaces | yes | **no** | `P:7610` |
| Master Sword pedestal | cutscene | pull with A | `P:7414` |
| Ledge and step heights | Auto-hop below 27, step to 39, big step to 47, "250 jump" grab above 47 | 41, 59, 79.4 | `sAgeProperties` `P:420-422` (adult), `P:472-474` (child), used at `P:11280-11291` |
| Body size | 11/17 scale of motion (`unk_08`); child root motion ×0.64 | 1.0 | `P:469`, `P:2103` |
| Spin effect size | Kokiri spin scale 2 | 4 | `z_en_m_thunder.c:116` |
| Aim camera | `CAM_MODE_AIM_CHILD` | `CAM_MODE_AIM_ADULT` | `P:5907-5911` |
| Horse | the stable horse is removed for a child (**unverified** for other scenes) | rideable once Epona is obtained | `z_en_horse.c:876-881` |
| Shooting gallery | B becomes the Slingshot | B becomes the Bow | `ZP:700-703` |

## Circumstances that recur: candidate states or layers

Each row is a condition that shows up in many verbs' "needs". The ones marked **state** change within a fight beat by beat. The ones marked **layer** are fixed for a stretch of play, like a kit.

1. **Targeting mode: free, parallel, friendly lock-on, hostile lock-on** (state). It picks the idle (`P:5588`) and the handler list, so it decides the Z verbs, aimed versus first-person items, the strafing shield, the thrust and the vertical slash, and the doors, climbing, and pushing that battle stance gives up. This is the strongest candidate for a MAPS state.
2. **Hands: empty, one-handed sword, two-handed weapon, ranged item, carried object, bottle, sheathed** (state). It decides what B does, whether the shield is in hand, whether grab, climb, and door work, and whether items can be swapped.
3. **Shield posture: down, raised standing, raised strafing** (state), plus the child-Hylian variant (layer). Raised standing turns B into the crouch stab and locks movement.
4. **Medium: ground, air, water surface, underwater free, underwater on the bottom, climbing or hanging, crawling, horseback, hookshot flight** (state). Leaving the ground turns off most verbs. Air allows only the jump attack and the cucco flutter. Water allows only dive, talk, and climb-out.
5. **Age** (layer). Mostly it filters gear (the age tables). A few hard rules: crawl, strength cap, ledge heights, and child-Hylian.
6. **Equipment worn: sword, shield, tunic, boots, mask, strength, scale** (layer). Boots change movement verbs (Iron: sink, walk underwater, Hookshot only; Hover: float). Strength and scale set lift and dive limits.
7. **Magic meter: acquired, amount, idle** (state). It gates spells, magic arrows, the Lens, and the spin's magic effect.
8. **Place: indoor room type, floor type 7, no-jump edges, shooting gallery, per-scene button restrictions** (layer). An indoor room blocks Z-jumps, the jump attack, and Deku Nuts (`P:6388`, `P:6591`; `include/room.h:110` says indoors "blocks player from attacking or jumping"). The roll handler itself has no indoor check (`P:6489`).
9. **Timing windows** (state, as phases). The combo counter (`unk_845`), the post-swing hold-B window (`unk_844`), spin-charge level (`unk_858`, with thresholds at 10% and 85%), the roll's slash-ready frame (15), and i-frames on roll and spin release. Under the beat abstraction in `CONTRACT.md` these become phases.
10. **Ammo and caps** (state). Out of ammo means no use, and at most 3 explosives at once. `CONTRACT.md` declares ammo out of scope for combat; the cap still bounds bombs.

## Chains at a glance

```
idle ──B──> slash ──B(same dir)──> slash ──B──> combo finisher ──> idle
  │           └─hold B──> spin charge ──release <85%──> spin ──> idle
  │                            ├──release ≥85% / stick spin──> great spin
  │                            └──release <10%──> cancel ──> idle
  ├─stick-spin+B──> quick spin
  ├─A(fwd, moving)──> roll ──(frame≥15) B──> slash
  │                    └─wall at speed≥7──> bonk
  ├─R──> shield ──B──> crouch stab (repeatable)
  ├─run off edge──> auto-jump ──B──> jump attack ──land──> finish strike
  │                     └─wall──> ledge hang ──up──> climb up / A──> drop
  └─Z──> target idle ──A(neutral/fwd, melee)──> jump attack ──land──> finish strike
            ├─A(left/right)──> sidehop ──B──> jump attack
            ├─A(back)──> backflip (no air attack)
            ├─R──> strafing shield (keeps moving)
            ├─B(fwd)──> thrust   B(neutral)──> vertical slash
            └─C(ranged)──> third-person aim ──release──> shot
```
