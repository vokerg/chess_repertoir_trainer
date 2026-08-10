# Repertoire Builder Task Queue

Last updated: 2026-08-10

This is the canonical ordered queue. Detailed scope, acceptance and implementation history live in the individual task and report files.

| Order | ID | Issue | Priority | Status | Task | Delivery evidence |
| ---: | --- | ---: | --- | --- | --- | --- |
| 10 | RB-001 | #89 | P0 | DONE | Lichess-aligned peer population presets | PR #84 |
| 20 | RB-002 | #90 | P0 | DONE | Multi-account player level resolution | PR #84; closure #107 |
| 30 | RB-003 | #91 | P0 | DONE | Named opening classification foundation | PR #111 |
| 35 | RB-018 | #116 | P1 | DONE | Opening classification coverage | PR #121 |
| 40 | RB-008 | #96 | P1 | DONE | Visual candidate and coverage proof | PR #110 |
| 50 | RB-004 | #92 | P1 | DONE | Player Chess Profile calculation | #136 → #135; `07299fd`; CI #1103 |
| 60 | RB-005 | #93 | P1 | DONE | Player Chess Profile experience | #139 → #138 → #135; `07299fd`; CI #1208 |
| 70 | RB-006 | #94 | P1 | DONE | Repertoire target contract | PR #157; `9d833d9` |
| 80 | RB-013 | #101 | P1 | DONE | Profile personas and overrides | PR #232; `4d57e14`; CI #1696 |
| 90 | RB-007 | #95 | P1 | DONE | Explainable candidate evidence/ranking | PR #166; `25d37b4`; CI #1295 |
| 100 | RB-009 | #97 | P1 | DONE | Builder session and branch queue | PR #177; `00c8f1a`; CI #1360 |
| 110 | RB-010 | #98 | P1 | DONE | Bounded interactive Builder MVP | PR #184; `ea5b2be`; CI #1417 |
| 120 | RB-011 | #99 | P1 | DONE | Builder preview/apply to courses | PR #189; `01b36f9`; CI #1488 |
| 130 | RB-012 | #100 | P2 | DONE | Existing-course Builder entry points | PRs #205/#208; `1583b15`; CI #1597 |
| 140 | RB-014 | #102 | P2 | DONE | Traps knowledge foundation research | PR #113; `d53ff6e` |
| 145 | RB-017 | #114 | P2 | DONE | Curated traps knowledge pilot | PR #117; `38bf745`; CI #1725 |
| 150 | RB-015 | #103 | P3 | DONE | LLM role decision | PR #216; `9a4e616` |
| 152 | RB-019 | #218 | P3 | DONE | Builder candidate explanation prototype | PR #223; `ee389cb`; CI #1634 |
| 154 | RB-020 | #219 | P3 | DONE | Post-apply Builder summary prototype | PR #228; `d795572`; CI #1652 |
| 160 | RB-016 | #104 | P2 | BLOCKED | Adoption and real-game outcomes | Requires post-V2 real Builder/course use |
| 165 | RB-021 | #240 | P1 | DONE | Side-aware opening knowledge foundation research | PR #244; `8e4e0ad`; CI #1757 |
| 170 | RB-022 | #241 | P1 | DONE | Static side-aware opening knowledge implementation | PR #255 |
| 175 | RB-023 | #242 | P2 | DONE | Opening knowledge in Repertoire Builder | PR #262 |
| 180 | RB-024 | #243 | P3 | DONE | AI game review grounding with opening plans | PR #268 |
| 185 | RB-025 | #290 | P1 | DONE | Scale opening knowledge toward comprehensive coverage | PRs #302/#304; runtime `997d1ecc`; reconciliation PR #300 |
| 190 | RB-026 | #310 | P1 | DONE | Reintegrate the Builder Cockpit workspace | Runtime PR #311; `fe0a5ada`; completion PR #314 |
| 200 | RB-027 | #317 | P0 | DONE | Empirical persona ranking V2 | Runtime PR #325; `34dadd25`; CI #2392 |
| 210 | RB-028 | #318 | P1 | IN_PROGRESS | Factual personal move evidence | PR #327 |
| 220 | RB-029 | #319 | P1 | READY | Opponent preparation and computed coverage V2 | Planned |
| 230 | RB-030 | #320 | P1 | READY | Single-dialog Builder setup V2 | Planned |
| 240 | RB-031 | #321 | P1 | PROPOSED | Cockpit evidence hierarchy V2 | Depends on RB-027–RB-029 semantics |

## Current execution state

- The deterministic Builder capability chain, opening-knowledge service, course integration and RB-026 Cockpit are complete in runtime.
- RB-027 / #317 is complete in runtime. Preset `USER_MOVE` personas now use versioned empirical selected-population, Masters and bounded objective evidence with exact-position baselines and V3 explanation semantics.
- RB-028 / #318 is in progress on PR #327 and can consume the stabilized V3 population/Masters evidence while keeping factual personal evidence distinct from persona authority.
- RB-029 / #319 is the next unclaimed policy task: opponent turns become preparation priority and coverage becomes computed feedback rather than setup/persona intent.
- RB-030 / #320 simplifies normal launch to one dialog with side/scope, speed, rating target and persona exactly once; it should coordinate with target-contract changes from RB-029.
- RB-031 / #321 integrates the final evidence semantics into the existing Cockpit after RB-028–RB-029 stabilize.
- RB-016 remains blocked; its useful cohort is post-V2 real usage rather than the semantics being replaced.

## Queue recommendation

1. RB-028 / #318 — active implementation; finish V3 personal-evidence integration without restoring personal history as preset persona authority.
2. RB-029 / #319 — next unclaimed shared candidate-policy change; preserve RB-009 reducer/queue semantics.
3. RB-030 / #320 — simplify setup after V2 target/coverage compatibility is clear.
4. RB-031 / #321 — final Cockpit integration over the settled V2 contracts.
5. RB-016 / #104 — remain blocked until sufficient post-V2 training and follow-up-game evidence exists.

GitHub program tracker: #105. GitHub Issues own execution status; repository task files own detailed scope and acceptance.
