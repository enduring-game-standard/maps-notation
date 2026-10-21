# ovl_En_Po_Sisters

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

major findings

## Findings

1. **Unseen sister strikes once per beat** (step `roam_hidden->roam_hidden`, attack `spin`, cite 1236; phase `roam_hidden` frames 100). Severity: major (how much hurts).
   - Spec: while invisible (5 beats), the sister strikes Link every beat he is near. The generated net has it (`examples/ocarina-of-time/encounters/en_po_sisters.maps:1348-1354`), with no windup or recoil, so up to 5 strikes in the window.
   - Code: an unseen sister is the same roam -> windup -> dash -> recoil cycle as the visible one, which the spec itself models as four steps (`roam_sis`, `windup_sis`, `dash_sis`, `recoil_sis`). Windup lasts `lastFrame*3+3` frames (`z_en_po_sisters.c:294,672-681`), the dash runs 5 animation loops (306,689-690), and the recoil lasts until speed decays from 5.0 to 0 at 0.1 per frame, at least 50 frames (300, 711). The AT is set only while dashing (1234-1237). That is well over 2.5 beats per strike, so a 100-frame unseen window holds one or two strikes, not five. The 100-frame timer keeps counting during attacks (1136-1140); only the appear check waits (1141-1145).

2. **Z-targeting a visible sister makes her vanish: missing transition** (phases `wait_jb`, `roam_sis`, `windup_sis`..`recoil_sis`, `flee_sis` -> `vanishing_sis`). Severity: minor.
   - Code: `func_80ADC034` counts `unk_197` down from 20 frames while the sister is locked on and fully visible (`z_en_po_sisters.c:1129-1131`, reset 1134, init 220); at 0, outside windup/dash/damaged, she calls `func_80AD9718` and vanishes (1141-1143). It runs when `unk_199 & 4` is set (1202-1203), which `func_80AD93C4` (279) and `func_80ADA028` (530) set. Meg never has that bit. The spec reaches `vanishing_sis` only from `flee_sis` at a wall (756), so the model cannot make a sister invisible by targeting. Z-targeting is out of scope as a camera aid, but here it changes the enemy's behavior and the spec does not say so.

3. **Illusions: circle can be cut short** (phase `circle_meg`, step `circle_meg->dash_meg` afterTimer 300). Severity: minor.
   - Code: each illusion hit decrements the real Meg's `unk_19C` (`z_en_po_sisters.c:1156-1157`; set to 3 at 507). When it reaches 0, `func_80ADB770` sets -15 and then attacks (1001-1006). A sword hit on the real Meg with `unk_19C == 0` sets -45 and she attacks after 45 frames (1175-1179). Without all three illusions down the swords are ignored (guard is right), but with them down a sword hit triggers her attack early. Also, if Link goes more than 600 from home she vanishes out of the circle (986-988), another missing exit. The spec has only the 300-frame timer path (989-991).

4. **Dash with no contact has no exit** (phases `dash_meg`, `dash_sis`). Severity: minor.
   - Code: `func_80ADA8C0` also ends without hitting Link: Meg vanishes (699-700), a sister returns to roam (694-697). The spec has only the AT_HIT step (1197-1199). The destinations equal those after the recoil, so the net effect is a dodged strike, but the transition is not a step and the cite for it is not in the spec.

5. **Duration of `swirl_meg`, `windup_*`, `dash_*` not modeled** (no `frames`, no `afterTimer`). Severity: minor. Meg rises over the animation and `unk_19A = lastFrame*7+7` (+1 for no parent) (`z_en_po_sisters.c:489,495`), so the swirl lasts several loops; windup and dash timers are given in item 1. Animation lengths are not in this checkout. Also `appear_sis` is `hittable: 'none'` but AC is on again once the fade completes, for the 15-frame countdown (780-789); the net moves on to `roam_sis` at once (hittable), so this is only a timing note.

6. **Two exclusion cites do not show the reason** (`actionFuncs` `func_80ADAFC0`, `func_80ADB17C`; cites 801, 832). Severity: minor. The cites are the function headers. The fact "entered only after the finishing blow" is at 732-733 (`health == 0` -> `func_80AD99D4`, which sets `func_80ADAFC0`, 402) and 411 (`func_80ADB17C` set in `func_80AD9A54`).

## Checked

- Health 10: `z_en_po_sisters.c:117`. Damage table lines 119-152; reactions: 0x0 normal damage, 0xE swords/spins/jumps, 0xF nut. Guard list equals exactly the 0xE entries (128-130, 142-147). Real Meg's guard: `1175-1179` (`unk_194 == 0 && reaction == 0xE && actionFunc == func_80ADB770`). Sisters (194 != 0) take sword damage normally.
- Shell: `func_80AD944C` (289-290) and `func_80AD94E0` (302-303) set METAL/AC_HARD; hits on METAL do nothing (1166-1169). Sisters drop the shell in recoil (315-317) but Meg keeps it (no clear for 194 == 0), so `recoil_meg` shelled and `recoil_sis` not is right.
- Din's Fire entry is 0 damage/reaction 0 and is dropped (`1167`); `MAGIC_ICE` is not emitted by Link.
- Unseen sister: after vanishing, `dmgFlags = MAGIC_ICE | MAGIC_FIRE | DEKU_NUT` (768); nut reaction 0xF reappears her (1171-1174); timer 100 (350) counted only while alpha is 0 (1136-1140).
- AC availability per phase: home_jb off (`unk_199` bit 1 never set, 522), wait_jb on (530), damaged off (`&= ~0xB`, 332), vanishing off (`&= ~5`, 352), roam on (279), flee on (341), Meg circle on (508); appear/vanish/swirl/wait off. Flag set restored on appear (781-782) equals the initial mask 0x4FC7FFEA bit for bit.
- Hurt destinations: damaged -> flee (726), Meg damaged -> vanish (730), flee -> wall vanish (753-756) / far roam (757-759), vanishing -> hidden roam (768-769), hidden -> appear (1145), appear -> roam (788), appear -> circle for Meg (791).
- Attack: `spin` damage 8, effect none (`z_en_po_sisters.c:108`); AT set only in the dash (1234-1237); shield mask overlap as for other 0xFFCFFFFF attackers.
- Variants: Meg 0 / Joelle,Beth 1,2 / Amy 3 from `unk_194` (215, 227, 467, 1017); fakes are `unk_195` 1-3 spawned at 416-421.
- C5: all 25 action functions are keyed in `actionFuncs`. The flame-theft exclusions (params bit 12) are true: `func_80ADA094` makes the actor a prop with `unk_199 = 128` so the collider never runs (539-542, 1206); `func_80ADBF58` ends in `Actor_Kill` (1124).
- C6: only the one AT element (`z_en_po_sisters.c:108`) exists; the inventory lists no runtime AT change or direct hurt call.

## Outcomes

1. fixed: the `roam_hidden` self-strike is gone. The unseen sister now runs the same cycle as the visible one: `roam_hidden` (near, 665) -> `windup_hidden` (681) -> `dash_hidden` (strike, 1199) -> `recoil_hidden` (50 frames). Windup is unshelled while unseen, because the METAL set is gated on alpha (`z_en_po_sisters.c:288`). All three new phases take only Nut/magic (768), and a Nut fades her in from any of them (1171-1174). The types reset a phase timer on entry, so they cannot carry the 100-frame counter through the strike (1136-1140). The closest honest choice is that `recoil_hidden` fades her in (1145) after its timer, which allows one unseen strike per window. A second strike would need a short `gPoeSistersAttackAnim`, and its length is not in this checkout. This is recorded in the spec header.
2. gap: Z-target vanish (`z_en_po_sisters.c:1129-1131, 1141-1143`). Lock-on is not a Link action in the beat model. Recorded in the spec header.
3. fixed in part. Added `circle_meg -> vanish_meg` on range far (`z_en_po_sisters.c:986-988`). Meg rings Link at radius 110-170 (`z_en_po_sisters.c:365,367,373-374`), so the only way Link gets away from her is leaving her area. gap: the early attack after all three illusions are struck (1157, 1001-1005) is not modeled, because the illusions are separate actors with no phase here. On the -45 path: the sword guard sets -45 only while `unk_19C == 0` (1177-1178), and on the next frame the action func turns that 0 into -15 (1001-1002). So the window is a single frame, and swords are otherwise ignored, as the guard says. Recorded in the spec header.
4. answered: a dash that misses is the beat model's dodge or block of the `spin` step. Where it goes next matches the recoil's next step. The sister goes to roam (`z_en_po_sisters.c:694-697`, as at 714), and Meg vanishes (699-700, as at 717). The only difference is the recoil's drift time. A separate miss step would need odds the code does not draw, because contact is geometry, not `Rand`.
5. fixed in part. Recoil is now timed: speed 5.0 from the dash (`z_en_po_sisters.c:300`) decays at 0.1 a frame (711), which gives 50 frames. `recoil_meg`, `recoil_sis` and `recoil_hidden` carry it, and their exits are `afterTimer`. gap: the swirl (489), windup (294) and dash (306) timers are animation lengths, and the checkout has only offsets for them (`assets/xml/objects/object_po_sisters.xml:3,7`), so those phases last one beat. Recorded in the spec header. answered for `appear_sis`: AC comes back only when the fade ends (780), and it stays on for a 15-frame countdown (783-788). That is under one beat, and the next phase (`roam_sis`) is hittable, so a hit on that beat lands with the same result.
6. fixed: `func_80ADAFC0` now cites `z_en_po_sisters.c:402` (set in `func_80AD99D4`, which is reached only when health is 0, 733). `func_80ADB17C` now cites 411 (set in `func_80AD9A54`, which is reached only from the end of the death spiral, 821).
