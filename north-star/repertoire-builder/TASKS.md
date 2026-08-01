# Repertoire Builder Task Queue

Last updated: 2026-08-01

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
| 160 | RB-016 | #104 | P2 | BLOCKED | Adoption and real-game outcomes | Requires sufficient real Builder/course use |
| 165 | RB-021 | #240 | P1 | DONE | Side-aware opening knowledge foundation research | PR #244; `8e4e0ad`; CI #1757 |
| 170 | RB-022 | #241 | P1 | READY | Static side-aware opening knowledge implementation | RB-021 architecture accepted |
| 175 | RB-023 | #242 | P2 | BLOCKED | Opening knowledge in Repertoire Builder | Requires RB-022 reviewed knowledge service |
| 180 | RB-024 | #243 | P3 | BLOCKED | AI game review grounding with opening plans | Requires RB-022 reviewed knowledge service |

## Current execution state

- The deterministic Builder capability chain and prior optional prototypes remain complete.
- RB-016 remains blocked on real usage and follow-up-game evidence.
- RB-021 is complete: the separate deterministic opening-knowledge architecture, hybrid selector, merge semantics and source/editorial policy were accepted on 2026-08-01.
- RB-022 is the next dependency-satisfied P1 task.
- RB-023 and RB-024 remain blocked until RB-022 provides the reviewed service, corpus and stable knowledge identity.

## Recent closure evidence

- RB-004: `reports/RB-004-2026-07-31-closure.md`.
- RB-005: `reports/RB-005-2026-07-31-closure.md`.
- RB-013: `reports/RB-013-2026-07-31-closure.md`.
- RB-017: `reports/RB-017-2026-07-31-closure.md`.
- RB-019: `reports/RB-019-2026-07-30-closure.md`.
- RB-020: `reports/RB-020-2026-07-30-closure.md`.
- RB-021: `reports/RB-021-2026-08-01-closure.md`.

GitHub program tracker: #105. GitHub Issues own execution status; repository task files own detailed scope and acceptance.
