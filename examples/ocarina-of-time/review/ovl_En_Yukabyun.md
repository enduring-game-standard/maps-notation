# ovl_En_Yukabyun

Reviewer: Claude Sonnet 5.5

## Verdict

major findings

## Findings

1. Phase `rising`, no attack step. Spec delivers the `tile` attack only from `flying` (`flying->shattered`). Code: the AT, AC and OC colliders are registered in every action function except `func_80B43A94` and `EnYukabyun_Break` (`src/overlays/actors/ovl_En_Yukabyun/z_en_yukabyun.c:145-153`), so the tile is already dangerous while rising (`func_80B43AD4`). Contact with Link in `rising` hits him for 4 (`atDamage` 4, `:56`) and sets AT_HIT, which sends the tile to `EnYukabyun_Break` (`:131-139`). The spec header says only that it is dormant that registers no collider, implying the rest does, but gives rising no way to hurt Link. Missing: a `rising -> shattered` step with `range: 'near'` and `attack: 'tile'`. Severity: major (what can hurt Link, and in which phase).
2. Phase `dormant`, step `dormant->rising` (no `frames`, no `afterTimer`). Spec lets the tile lift off any beat. Code: dormant waits on a timer set in Init to `(u8)params * 0xA + 0x14` after `params++` (`:79-81`), counting down one per frame and leaving at 0 (`:91-97`), so the delay is at least 30 frames (>= 2 beats after rounding) and up to 2570. The spec summary says "waits a params-set delay" but the transition is modeled as untimed and instant-eligible. The type cannot cite scene params (none in checkout), so a mean cannot be chosen; the gap is not reported as such. Severity: minor (timing).
3. Phase `flying`, missing transition. Spec has one step out of `flying`, always delivering the attack. Code: `flying` also ends with `Actor_Kill` when `xzDistToPlayer > 5000.0f` (`:114-116`, Link left the tile behind with no contact), and with a wall hit (`:133`) it breaks with no attack on Link. Neither is modeled; the tile in the spec always strikes Link unless he dodges or blocks. Modeling dodge as the miss is a defensible stand-in for the wall/miss case, but the despawn is a code transition with no counterpart. Severity: minor.
4. Ledger `EnYukabyun_Break: 'shattered'`. AUTHORING says death and despawn functions run after the finishing blow and should be excluded with that reason. `EnYukabyun_Break` (`:121-125`) only spawns fragments and kills the actor. Mapping it to a terminal phase is harmless to the net but contradicts that guidance. Severity: minor (labeling).
5. Phase `shattered` entered from `defeated` semantics: hits use `to: 'defeated'` (`breaks`, cite `:131`) while the attack step goes `flying -> shattered`. On a contact that breaks the tile in `rising` or `flying` from Link's hit, the code runs `EnYukabyun_Break` the same way as after the tile hits Link (`:131-139`); the two exits (Link wins vs. tile spent) are therefore equivalent in code, and the spec treats the hit-by-Link exit as `defeated` (Link wins). Reasonable, no change in numbers. Informational, not scored.

## Checked

- Damage 4: `{ 0xFFCFFFFF, HIT_SPECIAL_EFFECT_NONE, 0x04 }` at `src/overlays/actors/ovl_En_Yukabyun/z_en_yukabyun.c:56`; matches inventory. Effect none correct. Single AT source, mapped.
- No health, no damage table (inventory: none); `pools: []`, `custom` entries: every Link hit breaks it. AC mask 0xFFCFFFFF (`:57`) clears bits 20 and 21 only, i.e. `DMG_SHIELD` and `DMG_MIR_RAY` (`include/collision_check.h:432-433`), so the `breaks` filter is right. Any AC_HIT sends it to Break (`:131-139`).
- `dormant` `hittable: 'none'`: no collider registered while `func_80B43A94` runs (`:145-154`).
- `rising` frames: `unk_150` (s16, `z_en_yukabyun.h`) starts at 0 on leaving dormant (`:94`), gains 0xA0 per frame (`:101`) and the exit test is `>= 0x2000` (`:103`): 51 frames reach 8160, 52 reach 8320, so 52 frames; spec's 52 is right. Launch at `:104-106`.
- `flying` speed 10 and aim at `yawTowardsPlayer` at launch (`:104-105`), so it flies at where Link was; matches summary.
- Shatters on shield, wall, any Link attack: `atFlags & AT_HIT`, `acFlags & AC_HIT`, OC hit with a non-tile actor, or wall in `flying` (`:131-133`). Shield-block break is by AT_HIT, consistent with `blockable: true`.
- C5: all four extracted functions are mapped (`func_80B43A94` `:90`, `func_80B43AD4` `:100`, `func_80B43B6C` `:112`, `EnYukabyun_Break` `:121`) to the right phases.
- Loadouts: quarter heart (4 units) with a 4-unit hit; the two expected dead verbs follow from the model (rising is left only by timer or by a break; the only damage is the one 4-unit hit).
- Cites spot-checked and all show the claimed fact: `:72` (Init), `:96`, `:100`, `:103`, `:106`, `:112`, `:124`, `:131`, `:139`, `:145`.

## Outcomes
1. fixed: added `rising -> shattered`, near, attack `tile`, cite `z_en_yukabyun.c:131` (colliders registered at `:145-153`). `rising_timer_clears` is removed from the ledger, because the near strike now leaves `rising` with timer marks behind and V2 finds it reachable.
2. gap: the delay is (u8)params * 10 + 20 after params++ (`:79-81`), so it runs from 20 to 2570 frames, and the checkout has no scene params to choose a mean. Recorded in the header.
3. gap: Link's leave verb covers the 5000-unit despawn (`:114-116`), and his dodge stands for a miss. The wall break with no strike (`:133`) is not modeled. Recorded in the header.
4. answered: `EnYukabyun_Break` also follows the tile's own strike on Link (AT_HIT at `:131` goes to Break at `:139`), not only a finishing blow. So `shattered` is a real post-attack phase. Noted in the header.
5. answered: informational. The reviewer agrees there is no change in numbers.
