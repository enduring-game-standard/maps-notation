# ovl_En_Peehat

Reviewer: claude-sonnet-5-5

## Verdict

major findings

## Findings

Cites without a path are `src/overlays/actors/ovl_En_Peehat/z_en_peehat.c`.

1. **Phases `stunned_g` and `stunned_fs`: hits do not end the stun.** Major.
   - Spec: the stun lasts 80 frames (4 beats). The `ATTACK` reaction has no `to`, so Link can land repeated damaging hits during the stun.
   - Code: `EnPeehat_StateBoomerangStunned` leaves as soon as `colorFilterTimer == 0` (z_en_peehat.c:811-813). A damaging hit calls `Actor_SetColorFilter(RED, 255, OPA, 8)` (z_en_peehat.c:927), which sets `colorFilterTimer = 8` (z_actor.c:4207).
   - So the first damaging hit shortens the stun to 8 frames, and she rises (z_en_peehat.c:812) on the next beat. The stun was the whole reason to use the Boomerang.
   - Fix: the `ATTACK` reaction (and `FIRE`, below) should send `stunned_*` to `rise_*` (or the real shorter timer).
2. **Reaction `PEAHAT_DMG_REACT_FIRE`: no follow-up hits for 100 frames.** Major.
   - Spec: the fire hit takes the table damage (4 or 3) and nothing else.
   - Code: a fire reaction also calls `Actor_SetColorFilter(RED, 200, OPA, 100)` (z_en_peehat.c:940). The root sphere joins the AC list only when `colorFilterTimer == 0 || !(colorFilterParams & 0x4000)` (z_en_peehat.c:993-995), and RED is 0x4000 (actor.h:168). So she cannot be hit again for 100 frames (5 beats).
   - With 6 health, two fire arrows (4+4) kill her in two beats in the spec. In the code the second arrow within 100 frames cannot connect.
   - The same 8-frame window after every other damaging hit is under one beat, so only the fire case matters.
3. **Attack `blade` from the larva, no `onBlock`.** Major.
   - Spec: Link can only defeat a larva with a Slingshot or arrow (LARVA_HIT, header and summary).
   - Code: when the larva's AT is bounced (a raised shield, `AC_HARD`), `Larva_StateSeekPlayer` sets `health = 0` and goes to `EnPeehat_SetStateAttackRecoil` (z_en_peehat.c:584-587). For a larva the recoil ends in `Actor_Kill` (z_en_peehat.c:774-784).
   - So blocking with a shield kills the larva. The spec's `blockable: true` attack has no `onBlock: { to: 'defeated' }`, and the shield is not listed as a way to win.
   - The same applies to the flying Peahat's larvae (the `fly` to `fly_veer` step).
4. **Larva: ground contact kills it.** Minor. `bgCheckFlags & BGCHECKFLAG_GROUND` takes the same branch as a cylinder hit and ends in `Actor_Kill` (z_en_peehat.c:588-589, 599, 610-617). No step for it; it only matters if Link stands on low ground long enough.
5. **Phases `rise_g`, `rise_fs`, `rise_f`: no timer.** Minor.
   - Spec: no `frames`, so the phase lasts one beat.
   - Code: the blade spin-up ramps `bladeRotVel` at 800 per frame to 4000 (z_en_peehat.c:445), then counts `animTimer = lastFrame` (z_en_peehat.c:436, 446-447), then up to 40 more frames of animation (z_en_peehat.c:450-451). The anim length is in the unextracted assets, but the total is more than 45 frames.
   - The window matters because the quad (the hard blade) is off in state 8 (z_en_peehat.c:1006-1011), so melee connects with the root.
6. **Phase `seek_fs` frames.** Minor. 400 frames (z_en_peehat.c:376) holds only for the first cycle. After a landing, `Ground_SetStateGround` resets `seekPlayerTimer = 600` (z_en_peehat.c:338, 632), so later cycles of `seek_fs` are 600.
7. **Guards vs ranged types.** Minor, needs the author's geometry.
   - Spec: arrows, Slingshot, Hookshot, Boomerang bypass the hard blade (`PROJECTILE`).
   - Code: the blade quad (`AC_HARD`, z_en_peehat.c:126) takes the same `0xFFCFFFFF` mask as the root (z_en_peehat.c:134), and `CollisionCheck_SetATvsAC` bounces any AT that touches an `AC_HARD` collider (z_collision_check.c:1722-1724). Nothing in the code separates projectiles from melee. Whether an arrow clears the quad is geometry the decomp does not hold here.
   - Same for `rise_f`, `fly`, and `fly_veer` being `hittable: PROJECTILE` only: no cite shows melee cannot reach.
8. **Ledger `EnPeehat_StateExplode`.** Minor.
   - Spec: the death explosion happens after the encounter ends.
   - Code: it spawns an En_Bom with rot.z 0x602 and timer 0 (z_en_peehat.c:888-891). En_Bom adds `(rot.z & 0xFF00) >> 8` = 6 to the 8 base damage (z_en_bom.c:72, 119), a `AT_TYPE_ALL` sphere (z_en_bom.c:94), so Link takes 14 if close. The reason is written as if no damage follows.
9. **Ledger `EnPeehat_Ground_StateReturnHome`.** Minor. The reason says it is entered only when Link is beyond xzDistMax. It is also entered at night (`IS_DAY &&` at z_en_peehat.c:534, 710).
10. **Step `fly` to `fly_veer`, attack `blade`.** Minor.
    - The flying Peahat has no attack of its own: the quad is never set for `PEAHAT_TYPE_FLYING` (z_en_peehat.c:1008-1011). The hurt comes from larvae it spawns (z_en_peehat.c:415-424).
    - The step has no range and no gate for the spawn conditions (`xzDistToPlayer < xzDistMax`, `unk_2FA < MAX_LARVA`, `(gameplayFrames & 7) == 0`, z_en_peehat.c:414-415), and the attack has no `via`, as AUTHORING.md asks for spawned attackers.

## Checked

- Health 6 at z_en_peehat.c:221; inventory entries at 585 and 919 are the larva kill and Hookshot kill (health = 0).
- Blade AT element z_en_peehat.c:133: damage 16 (0x10), effect NONE, `0xFFCFFFFF` blockable. No runtime `atDmgInfo`.
- Types: GROUNDED -1, FLYING 0, LARVA 1 (z_en_peehat.h:8-10). Adults are `params <= 0` (z_en_peehat.c:958). The quad is set only for `params != FLYING` and only in states 15, 14, 5, 12, 1 (z_en_peehat.c:1006-1011). That matches `guards` on `seek_g` only, not on `rise`, `recoil`, `landing`, `landed`, `stunned`, or any `fs` phase.
- Root sphere: sole damaging collider for adults; reaction handling at z_en_peehat.c:911-945 matches the spec. `NUT` and `LIGHT_ICE_ARROW` return early (z_en_peehat.c:914-917); `HOOKSHOT` sets health 0 and goes to `SetStateDie` (z_en_peehat.c:918-919, 942-943); `BOOMERANG` stuns unless already stunned (z_en_peehat.c:920-924); others take `Actor_ApplyDamage` (z_en_peehat.c:926).
- Larva: cylinder rewritten to take only `DMG_ARROW | DMG_SLINGSHOT` (z_en_peehat.c:254); `DMG_ARROW` includes UNK1-3 (collision_check.h:451); quad AT damage kept 16 (z_en_peehat.c:255). Adult-only collision check (z_en_peehat.c:958-960) means a larva has no health pool path.
- Timers: seek 600/400 (z_en_peehat.c:338, 376), landed 40 (z_en_peehat.c:530), stun 80 (z_en_peehat.c:803), larva veer 40 (z_en_peehat.c:598).
- Recoil: `AT_HIT` on the player sends non-flying adults into `AttackRecoil` (z_en_peehat.c:999-1003); recoil ends at speed 0 into `Ground_SetStateSeekPlayer` (z_en_peehat.c:772, 786). 18 frames, under one beat.
- Ledger: all 16 extracted names mapped. Exclusion reasons for Flying_StateLanding (z_en_peehat.c:412), Adult_StateDie (z_en_peehat.c:942-943), `actionFunc` (z_en_peehat.c:207) are true.

## Outcomes
1. fixed: `PEAHAT_DMG_REACT_ATTACK` now sends `stunned_g` to `rise_g` and `stunned_fs` to `rise_fs` (8-frame red filter replaces the stun timer, z_en_peehat.c:927, 811). `FIRE` from a stun goes to the new `stunned_burn_*` phases (below). The stale ledger entries `stunned_g_timer_clears` and `stunned_fs_timer_clears` were removed, since the verifier now reaches them.
2. gap (partly fixed): from a stun the fire window is modeled exactly. `FIRE` sends `stunned_*` to `stunned_burn_*`, which lasts 100 frames (z_en_peehat.c:940), is `hittable: 'none'` (z_en_peehat.c:993), and rises after its timer (z_en_peehat.c:812). The 100-frame filter is the stun's own timer there. In every other phase the window would have to run beside that phase's own timer (seek, landed, veer), and a phase holds one timer, so it is recorded in the spec header. `child_dins` gets the Boomerang so the stun-plus-fire path is reachable in some kit.
3. fixed: the larva's attack is now `larva_blade` with `onBlock: { to: 'defeated', cite: z_en_peehat.c:585 }`. The flying Peahat's larva attack is `dropped_larva_blade` with `onBlock: { to: 'fly' }`, since the blocked larva dies and the parent flies on. The adult `blade` keeps no `onBlock`, because a shield block also sets AT_HIT with `at` = Link (src/code/z_collision_check.c:1726-1727), so the adult goes to recoil (z_en_peehat.c:999-1002), which is the step's own target. The summary now names the shield.
4. gap: the time to touch the ground depends on the larva's spawn height above the floor, which is scene data. An always-possible step to `defeated` would kill it at chance odds every beat. Recorded in the spec header (z_en_peehat.c:589, 599, 616).
5. gap: the rise length is 5 frames + the rising animation's last frame + up to 40 frames (z_en_peehat.c:445, 436, 450). The animation length exists only as XML in this checkout (assets/xml/objects/object_peehat.xml:77), so there is no line to cite. Recorded in the spec header.
6. fixed: `landed_fs` now rises into the new `rise_fs2` and `seek_fs2` phases. `seek_fs2` has 600 frames (z_en_peehat.c:338, via the landing at 632). `seek_fs` keeps 400 for the first cycle after the stun (z_en_peehat.c:376). Seek timers still restart on each entry, while the code keeps the count across a stun. That is recorded in the header.
7. gap: confirmed that no decomp line separates projectiles from melee at the quad (z_en_peehat.c:134, 100; src/code/z_collision_check.c:1722). The `PROJECTILE` split stays as a geometry judgment. The supporting evidence is the lock-on point on the root sphere (z_en_peehat.c:976-978) and the flying kind's climb at 18 units a frame (z_en_peehat.c:503). This is recorded as a judgment in the spec header.
8. fixed: the exclusion reason now says the En_Bom blast (8 + 6 = 14, src/overlays/actors/ovl_En_Bom/z_en_bom.c:72, 119) can hurt a close Link, but only after the finishing blow. The header records that the types have no attack after defeat.
9. fixed: the reason now covers night entry (IS_DAY at z_en_peehat.c:534, 710). The header records that the encounter models the daytime fight only.
10. fixed: the step now delivers `dropped_larva_blade` with `via: { overlay: 'ovl_En_Peehat', spawn: z_en_peehat.c:416 }` instead of the adult quad's `blade`. Gap: the spawn gate xzDistToPlayer < 1400 (z_en_peehat.c:244, 414) falls inside the far band, which the model cannot split, so the step stays ungated by range. The every-8-frames gate (z_en_peehat.c:415) fires within one beat. Both are recorded in the header.
