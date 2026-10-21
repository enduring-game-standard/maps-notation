# ovl_Bg_Hidan_Firewall

Reviewer: Claude Sonnet 5.5 (claude-sonnet-5-5)

## Verdict

minor findings

## Findings

1. Attack `flame` (`src/overlays/actors/ovl_Bg_Hidan_Firewall/z_bg_hidan_firewall.c:58`). Burn is carried, but contact also triggers `BgHidanFirewall_Collide`, which calls `Actor_SetPlayerKnockbackLargeNoDamage(play, &this->actor, 5.0f, phi_a3, 1.0f)` (`:146`, called from `:192-195`). The second effect is not reported in the spec. Severity: minor.
2. Step `erupting -> dormant` (cite `:130`). The spec leaves the phase the beat Link is far. In the code the flame shrinks by 0.01 a frame from 0.1 to 0.01 (`:128`), up to 9 frames, and `actionFunc` stays `Erupt` meanwhile, so the AT collider stays live (`:198-200`). If Link comes near again during the shrink, the scale grows again and the phase never reaches `Wait` (`:125-126`). The model drops the flame at once. Severity: minor (timing, under 1 beat).

## Checked

- Damage 4, FIRE, `0x20000000` unblockable (`z_bg_hidan_firewall.c:58`); no AC (`:59`), so no health or damage table (`pools: []`) is right.
- Proximity box: |x| under 100 and |z| under 120 (`:100`). `Wait -> Countdown` at `:110`, with `params = 5` at `:109`; `Countdown` ticks it down one per frame and moves to `Erupt` at 0 (`:116-120`). That is 5 frames, one beat.
- AT is set only while `actionFunc == BgHidanFirewall_Erupt` (`:198-201`); not set during `Wait` or `Countdown`. Matches the attack step only from `erupting` (cite `:200`).
- The collider follows Link along the width, clamped to x of 70 and z of 25 (`:159-179`), so the step `range: near` is a fair abstraction.
- C5 ledger: `Wait`, `Countdown`, `Erupt` are all three extracted functions. `Collide` and `ColliderFollowPlayer` are helpers, not action functions.
- Expected dead verb `countdown_timer_clears` is true (one-beat phase, left only by its timer step).

## Outcomes
1. gap: one attack carries one effect. The burn stays, and the knockback (`z_bg_hidan_firewall.c:146`, called from `:194`) is now reported in the header.
2. answered: the shrink lasts at most 9 frames (`:128`, 0.1 to 0.01 at 0.01 a frame). A phase lasts whole beats of 20 frames, so 9 frames rounds to no beat. A `dying` phase would be one full beat, which would overstate the shrink. The header now states this.
