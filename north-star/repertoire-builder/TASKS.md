# Repertoire Builder Task Queue

Last updated: 2026-08-11

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
| 210 | RB-028 | #318 | P1 | DONE | Factual personal move evidence | PR #327; runtime head `9d0a65a5`; CI #2409 |
| 220 | RB-029 | #319 | P1 | DONE | Opponent preparation and computed coverage V2 | PRs #331/#333; policy `2026-08-opponent-preparation-v1` |
| 230 | RB-030 | #320 | P1 | DONE | Single-dialog Builder setup V2 | PR #335; `9bfcf3f5`; CI #2478 |
| 240 | RB-031 | #321 | P1 | DONE | Cockpit evidence hierarchy V2 | PR #336; `e6c024af`; CI #2486 |

## Current execution state

- The deterministic Builder capability chain, opening-knowledge service, course integration and RB-026 Cockpit are complete in runtime.
- Builder V2 is integrated through RB-027–RB-031: empirical preset `USER_MOVE` personas, factual exact-position personal evidence, opponent preparation/computed coverage, the single-dialog setup, and the final Cockpit evidence hierarchy are all delivered.
- RB-029's corrected opponent authority uses `2026-08-opponent-preparation-v1`, recommends before final truncation, defaults the recommended set selected, and reports selected target-population coverage without treating coverage as setup intent.
- RB-030 keeps one normal setup dialog with side/scope, speed, rating target and one persona; common first-move/custom exact roots reuse the existing start/session path while V1 coverage/theory fields remain fixed compatibility data rather than user choices.
- RB-031 preserves the RB-026 three-zone Cockpit while foregrounding authoritative V2 evidence and removing normal ECO plus obsolete Target/Profile-fit presentation.
- RB-016 remains blocked; its useful cohort is now explicitly post-V2 real usage rather than semantics still being replaced.

## Queue recommendation

There is no unclaimed READY Builder implementation task at this checkpoint.

1. RB-016 / #104 remains BLOCKED until sufficient post-V2 Builder/course material has been built, trained and encountered in later games.
2. Do not fabricate a replacement calibration task merely because RB-027–RB-031 are complete; new work requires new evidence and a new immutable RB task/issue.
3. If real usage satisfies the RB-016 gate, re-check its task contract and promote it through the normal claim protocol before implementation/research.

GitHub program tracker: #105. GitHub Issues own execution status; repository task files own detailed scope and acceptance.
