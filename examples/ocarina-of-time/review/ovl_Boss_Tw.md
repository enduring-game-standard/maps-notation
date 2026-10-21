# ovl_Boss_Tw

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

All cites below are `src/overlays/actors/ovl_Boss_Tw/z_boss_tw.c` unless noted.

## Verdict

major findings

## Findings

1. **major** - `attacks[beam_fire]`, `attacks[beam_ice]`: `blockable: false`.
   Spec: the beams are unblockable (no cite for the choice).
   Code: a raised non-mirror shield facing the beam stops it. `BossTw_CheckBeamReflection` returns 2 ("diverted backwards") for any shield when the beam passes in front of Link (`:919`). On the first contact it also cuts the beam to 10 frames (`this->timers[0] = 10`, `:913`). `BossTw_ShootBeam` only calls `BossTw_BeamHitPlayerCheck` when the result is 0 (`:1152`), so a result of 2 never hurts Link. The 10-frame cap is spent before `sBeamDivertTimer > 10` (`:904`) could let the beam through, because the divert counter rises 1 per frame (`:917`). The shield-vs-beam test needs `PLAYER_STATE1_SHIELDING` and facing within 0x2000 (`:869-873`), which is what a raised shield means. Hylian and Deku shields therefore block both beams. Only the Mirror Shield reflects (`:895-902`, return 1). The AUTHORING rule says `blockable: false` only when the code shows the shield does not stop it; here the code shows the opposite. Changes what hurts: every kit with a non-mirror shield can stop the sister beams.

2. **major** - Shield charge ledger, phases `tw_done_*_<c>` and `tw_fly_*_<c>` (the five charge states).
   Spec: a charge (`cf1`, `cf2`, `ci1`, `ci2`) is kept until the same or opposite element is soaked up, or the stun releases it. A blast that lands on Link leaves the charge unchanged.
   Code: `BossTw_TwinrovaUpdate` wipes a held charge when Link is hurt by the opposite element. While Link burns, any ice charge is set to 4 (`:3197-3198`). When Link is frozen (`sFreezeState == 1`), any fire charge is set to 4 (`:3186-3193`). `BossTw_ShieldChargeDraw` decays 4 to 0 and zeroes both counters (`:3714-3717`). A non-mirror shield block also zeroes both (`:4380-4381`). So an unblocked fire blast (burn) clears ice charges and an unblocked ice blast (ground ice freeze, `:3553-3555`) clears fire charges. The model lets Link carry 2 fire charges through an unshielded ice blast and still win with one more soak; the code does not. Changes who can win and how fast (the stun that makes Twinrova hurtable).

3. **minor** - `attacks[blast_ice]`, `effect: { kind: 'freeze' }`, `source: at(174)`.
   Spec: the ice blast's contact freezes Link.
   Code: the ice blast collider is `HIT_SPECIAL_EFFECT_NONE` (`:174`), and unlike fire no code sets a special effect on it (only `:496` for fire). Freezing comes from the ground ice the blast leaves, which sets `sFreezeState = 1` when Link stands on the ground inside it (`:3553-3555`). The effect label is sourced to the wrong line; a direct blast hit does 48 damage with no freeze of its own.

4. **minor** - `phaseOne` steps `shoot_beam_*` / beam hit gate (steps `shoot_charge_*` to `shoot_beam_*`, attack `beam_*`).
   Spec: each beam can land on Link.
   Code: a beam only hurts and burns/freezes Link when `sTwinrovaPtr->timers[2] == 0`, and the hit then sets it to 150 frames (`:833-834`). A beam within 150 frames (7.5 beats) of a previous beam hit does nothing. Ground fire and ground ice also set it to 100 (`:3556`, `:4072`). The spec's own fly (3) plus charge (4) beats make a repeat beam at least 8 beats later, so the omission has no effect on current timing, but the rule is not modeled and the `beam_*_lands_again` deadVerb reasons argue from burn length only.

5. **minor** - `fly_k` out-steps (missing transition).
   Spec: `fly_k` always ends in a charge (afterTimer 60 frames, cite `:644`, step cite `:663`).
   Code: `BossTw_TurnToPlayer` goes to `BossTw_SetupShootBeam` only if the other sister is not shooting and `CAN_SHOOT` is set (`:661-666`). `CAN_SHOOT` is set only on the pillar branch of `BossTw_SetupFlyTo` (`:694-701`), reached by chance. Otherwise it calls `BossTw_SetupFlyTo` again (`:666`) and loops. The timer is 60 only when the other sister is not shooting; 40 when she is (`:641-644`). `BossTw_FlyTo` itself runs 50-100 or 200 frames before `TurnToPlayer` (`:704-735`). The spec drops the fly-again loop and the FlyTo duration, so sisters shoot far more often than the code does. Timing and frequency, not damage.

6. **minor** - `fly_k` attack `sister_body`, `atSources[at(194)]`.
   Spec: only `fly_k` carries the body attack.
   Code: `BossTw_Update` sets the sister's AT cylinder every update except `BossTw_Wait` and while `INVINC_TIMER != 0` (`:2915-2932`). It is on in charge, beam, hit, spin (radius doubled, `:2921-2923`), finish and laugh phases too. The body can hurt Link in any sister phase when near; the spec limits it to `fly_k`.

7. **minor** - Spin coverage. Steps/overrides `fly_k`, `tw_done_*`.
   Spec: `FIRED` spins a sister from `fly_k` and Twinrova from `tw_done_*` only.
   Code, sisters: spin triggers in FlyTo, Spin and TurnToPlayer (`:2902-2906`); `fly_*` covers all three, so this part is correct. `BossTw_Spin` leaves when the spin animation ends, not at 20 frames (`:1462-1476`; timer set `:1459`), so the 20-frame figure is a lower bound.
   Code, Twinrova: spin triggers whenever she is visible, not stunned (`unk_5F8 == 0`), and not in Charge/Shoot blast (`:3026-3031`). That includes `TwinrovaFly`, `ArriveAtTarget`, `GetUp` and `Laugh`. The spec marks `tw_fly_*` and `tw_getup_*` as `hittable: 'none'`, so those spins are absent. They all lead back to `BossTw_TwinrovaSetupFly` (`:5352-5378`), so the outcome matches the phase they come from; only a missing no-op transition.

8. **minor** - Stun release, `tw_done_*` override `ABSORB[el]` with `soak.to === 'release'` (cite `:4662`).
   Spec: the third soak stuns Twinrova at once, from `tw_done`.
   Code: the third soak puts the blast in state 10 for 80 frames (`:4363-4366`: `timers[0] = 80`, `csState1 = 10`); a `TWEFF_SHLD_BLST` effect then flies from Link's shield and stuns her only if it comes within 60 units of her and she is not already stunned (`:4641-4662`). Twinrova keeps acting for those 4 beats (flying, shooting, laughing). The stun is not instant and needs the aim. The cite does show `twinrovaStun = 1`; the delay and the aim condition are not described in the spec.

9. **minor** - Step `hit_4` to `tw_fly_r_c0`, cite `:1504`.
   Spec: fusion when the 53-frame hit timer ends.
   Code: `BossTw_Wait` fuses only when both sisters are in `BossTw_FlyTo` and the combined health is at least 4 (`:1500-1502`). The shooter may still be in `ShootBeam`/`FinishBeamShoot`/`Laugh`, or `TurnToPlayer`, which delays the fusion past the 53 frames.

## Checked

- Health 24: `:579` (`colChkInfo.health = 24`), matches inventory and `pools[0].hp`.
- Sister body 32 (`0x20`) at `:194`; blast 48 (`0x30`) at `:174`; Twinrova's cylinder `:214` never registers AT (only `CollisionCheck_SetAT` calls are `:2932`, sisters, and `:4430`, blasts; `:3148-3150` is AC and OC only), so the `atSources[at(214)]` exclusion is true.
- Beam damage 32 and fire/ice hit: `Actor_SetPlayerKnockbackLarge(..., 0x20)` at `:836` (damage param confirmed in `src/code/z_actor.c:1993`); fire sets `bodyIsBurning` (`:845-855`); Kotake sets `sFreezeState = 1` (`:839-840`). Fire blast burn: `:496`. `atSources[at(4821)]` is the freeze damage tick (`damagePlayer(-1)`).
- Blast and body are blockable: AT mask `0xFFCFFFFF` overlaps the shield quad's AC mask `0xDFCFFFFF` (`z_player.c:10506-10520`); the blast shield check reflects only with the Mirror Shield and block-resets otherwise (`:4320-4382`).
- Mirror beam reflection `:1126`; reflected beam hits the other sister via `BossTw_SetupHitByBeam(otherTw)` and `health++` (`:1336-1340`); four hits fuse (`:1502`, sum of both sisters' health at least 4); hit timer 53 at `:1368`; recover to FlyTo `:1426`.
- Sister immunity: `BossTw_Update` clears `AC_HIT` with no damage (`:2926-2928`); Link cannot damage sisters. Fired items set `unk_A73` (`z_player.c:3131`, `:3390`), and the facing test spins them (`:2902-2906`), spin to FlyTo `:1475`.
- Charge logic: first/second soak adds one (`:4346`, `:4357`), opposite element zeroes the charge without adding (`:4342`, `:4352`), release at 3 (`:4363`), so `absorb()` (c0 to cf1 to cf2 to release; opposite to c0) is right.
- Stun damage: only while stunned (`:3123`); damage `CollisionCheck_GetSwordDamage` or 2 (`:3130-3133`; sword table `src/code/z_collision_check.c:3718-3724` matches `SWORD`/`SWORD_LINE`); hookshot none (`:3138`); health below 3 zeroes non-sword damage (`:3139`), so threshold `at: 2` and the `l` override list are right. Stun timer 150 (`:5243`), get-up 50 (`:5334`), stun to getup (`:5326`), getup to fly (`:5347`).
- Blast spawn cite `:5189`; blast coin flip below 10 health (`:5141`) and runs of three at 10 or more (`:5143-5148`), matching the header note; `DoneBlastShoot` 60 frames (`:5222`), to Fly `:5230`.
- C5 ledger: all 26 inventory action functions are keyed (16 mapped, 10 excluded). Mapped phases match the code (`FinishBeamShoot`/`Laugh` after the beam, `TwinrovaLaugh` after the blast, `TwinrovaSpin` and the charge/shoot/arrive/fly group). Exclusion reasons checked true: `Wait` hidden `:1492-1497`, `CSWait` start in FlyTo `:547`/`:565`, `TwinrovaIntroCS` ends sending sisters to FlyTo `:2283-2284`, `TwinrovaMergeCS` ends in `TwinrovaSetupFly` `:1745`, `DeathCS` set up from Twinrova's death `:2402-2403`, `BlastFire`/`BlastIce` are the projectile actor's own funcs (`:495`, `:498`).

## Coordinator findings

10. major. The author's gap 1: the arena burns Link at 1 health per frame (z_player.c:11558-11564, `SCENE_SPIRIT_TEMPLE_BOSS`), not the default 1 per 8. This is now expressible with `linkRules.burnDamage` (d53006d).
11. major. The author's gap 2: Twinrova's own freeze lasts 100 frames (z_boss_tw.c:346) and costs 1 every 2 frames (:4820-4821). This is now expressible with `linkRules` (statusFrames.freeze and freezeDamage), if no other freeze in this fight runs at the default rate. Check the ground ice freeze (:3553-3556) first.
12. note. Finding 2, the charge lost when Link is hurt, is now expressible with `Attack.onLand` (this commit).

## Outcomes
1. fixed: `beam_fire` and `beam_ice` are `blockable: true`. A raised non-mirror shield diverts the beam (`:904-919`, return 2), and `BossTw_ShootBeam` hurts Link only on 0 (`:1152`). The Mirror Shield still reflects first (`:898`), so `beam_*_blocked_mirror_shield` is ledgered as dead with that reason.
2. fixed: each blast has `onLand`. A landed fire blast takes every `tw_done_*f_ci1/ci2` to `c0` (`:3198`), a landed ice blast every `tw_done_*i_cf1/cf2` to `c0` (`:3193`). The non-mirror block reset (`:4380-4381`) is moot, since only Mirror Shield kits reach phase two. gap: an ice blast soaked up while Link still burns keeps its charge; burning persists across beats, which the types cannot read. Recorded in the spec header.
3. gap: the freeze comes from the ground ice the blast leaves (`:3553-3555`), not the blast's collider (`:174`). The blast is aimed at Link, so `blast_ice` carries the freeze; a dodge that lands in the ice is not modeled. Recorded in the spec header.
4. gap: the 150-frame beam gate (`:833-834`) has no type. The model's beams are at least 11 beats apart (fly 4, turn 3, charge 4), past it. The `beam_*_lands_again` reasons now state those beat counts against the 5-beat burn and freeze. Recorded in the spec header.
5. fixed: new `turn_<k>` phases for TurnToPlayer (60 frames, `:644`). A turn shoots with weight 1 per sister (`:663`) or flies on with weight 2 (`:666`). `fly_<k>` now carries the FlyTo timer 50-100 frames (`:693`). gap: the 200-frame pillar flight (`:699`, `:733`) and the 40-frame turn when the other sister shoots (`:641`) are not carried. Recorded in the spec header.
6. fixed: a near self-step delivering `sister_body` in every sister phase (fly, turn, spin, charge, hit), and a near exit from `shoot_beam_*` delivering it (`:2932`).
7. fixed: `tw_getup_*` is hittable by fired items and spins her into `tw_fly_<q>_c0` (`:3031`). gap: a spin during TwinrovaFly changes nothing, since her flight has no timer; the sister spin's animation tail (`:1462-1476`) is asset data. Both recorded in the spec header.
8. fixed: the third soak goes to `tw_done_aim_<q>` (30-80 frames, `:4364`), where she keeps hovering, and its timer leads to `tw_stun_<q>` (`:4662`). The release cite moved to `:4363`. gap: the 60-unit aim condition (`:4647`) is assumed met. Recorded in the spec header.
9. gap: the fusion waiting for both sisters in FlyTo (`:1500-1502`) is not carried; `hit_4` fuses when its 53-frame timer ends. Recorded in the spec header.
10. fixed: `linkRules.burnDamage` is 1 unit a frame (`z_player.c:11559`). With it, a landed fire blast costs 48 plus a 5-beat burn of 100, so the loadouts went from 4 to 10 hearts, the fewest above 148 health (comment at `loadouts`). With Link surviving, `blast_ice_lands_again` became reachable (the 5-beat freeze outlasts the 4 beats between blasts) and left the ledger; the getup timer entries left it too, since a fired item now ends getup early. The runs-of-three blast sequence (`:5143-5148`) was tried and dropped: at 10 hearts adult_spin hit the 1M position limit. Recorded in the spec header.
11. fixed: `linkRules.statusFrames.freeze` 100 frames (`:343`) and `freezeDamage` 1 every 2 frames (`:4820-4821`). The ground ice sets `sFreezeState = 1` (`:3554`), which `BossTw_TwinrovaUpdate` turns into the same effect (`:3186-3188`, freeze effect with no target, 100 frames at `:343`), so every freeze in this fight runs at that rate.
12. fixed: carried by `onLand`, see 2.
