# Repertoire Builder Task Queue

Last updated: 2026-07-30

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. GitHub Issues execution is governed by [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md).

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89) | P0 | DONE | Deliver Lichess-aligned peer population presets | Dual-use | Merged through PR #84 |
| 20 | RB-002 | [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90) | P0 | DONE | Define multi-account player level resolution | Dual-use | Delivered by the RB-001 normalized peer resolver in PR #84 |
| 30 | RB-003 | [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) | P0 | DONE | Establish named opening classification foundation | Dual-use | Delivered through PR #111 |
| 35 | RB-018 | [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116) | P1 | DONE | Complete opening classification coverage | Dual-use | Delivered through PR #121; RB-003 method preserved |
| 40 | RB-008 | [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) | P1 | DONE | Prototype visual candidate and coverage choices | North-star | Accepted through PR #110: setup dialog to routed board-first workbench |
| 50 | RB-004 | [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) | P1 | REVIEW | Implement Player Chess Profile calculation | Dual-use | PR #136; final-head CI #1103 passed; awaiting review and integration |
| 60 | RB-005 | [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) | P1 | REVIEW | Deliver Player Chess Profile experience | Standalone | Stacked PR #139 on RB-004; corrected navigation/architecture review awaiting final CI and hands-on acceptance |
| 70 | RB-006 | [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94) | P1 | DONE | Define repertoire target contract | North-star | Squash-merged through PR #157 |
| 80 | RB-013 | [#101](https://github.com/vokerg/chess_repertoir_trainer/issues/101) | P1 | PROPOSED | Support repertoire personas and profile overrides | Dual-use | RB-005, completed RB-006 contract |
| 90 | RB-007 | [#95](https://github.com/vokerg/chess_repertoir_trainer/issues/95) | P1 | DONE | Aggregate and rank candidate evidence explainably | North-star | Squash-merged through PR #166; final-head CI #1295 passed |
| 100 | RB-009 | [#97](https://github.com/vokerg/chess_repertoir_trainer/issues/97) | P1 | DONE | Define builder session, branch queue, and draft lifecycle | North-star | Squash-merged through PR #177; final-head CI #1360 passed |
| 110 | RB-010 | [#98](https://github.com/vokerg/chess_repertoir_trainer/issues/98) | P1 | DONE | Implement bounded interactive builder MVP | North-star | Squash-merged through PR #184; final tested-head CI #1417 passed |
| 120 | RB-011 | [#99](https://github.com/vokerg/chess_repertoir_trainer/issues/99) | P1 | DONE | Preview and apply builder output to courses | Dual-use | Squash-merged through PR #189 as `01b36f9`; final review-package CI #1488 passed |
| 130 | RB-012 | [#100](https://github.com/vokerg/chess_repertoir_trainer/issues/100) | P2 | DONE | Enter builder from existing-course findings | Dual-use | Course endings merged through PR #205; Opponent gaps merged through PR #208 as `1583b15` |
| 140 | RB-014 | [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) | P2 | DONE | Research traps knowledge foundation | Research | Approved and squash-merged through PR #113 |
| 145 | RB-017 | [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114) | P2 | CLAIMED | Validate curated traps knowledge pilot | Dual-use pilot | RB-014; implementation branch `rb-017/issue-114-curated-traps-pilot` |
| 150 | RB-015 | [#103](https://github.com/vokerg/chess_repertoir_trainer/issues/103) | P3 | DONE | Decide whether an LLM has a justified role | Research | Squash-merged through PR #216 as `9a4e616`; RB-019/#218 and RB-020/#219 created |
| 152 | RB-019 | [#218](https://github.com/vokerg/chess_repertoir_trainer/issues/218) | P3 | PROPOSED | Prototype advisory candidate explanation in Builder | North-star prototype | Stretch goal after completed RB-015; integrated RB-006/RB-007/RB-010 |
| 154 | RB-020 | [#219](https://github.com/vokerg/chess_repertoir_trainer/issues/219) | P3 | PROPOSED | Prototype post-apply Builder course summary | North-star prototype | Stretch goal after completed RB-015; integrated RB-009/RB-011/RB-012 |
| 160 | RB-016 | [#104](https://github.com/vokerg/chess_repertoir_trainer/issues/104) | P2 | BLOCKED | Measure adoption and real-game outcomes | Dual-use | Builder and course materialization in use |

## GitHub Issues program

- Program tracker: [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), open.
- GitHub Issues track execution status, assignee, branch, pull request and active blockers.
- Repository task files remain the detailed scope and acceptance source.
- New RB tasks require a corresponding GitHub issue in the same coordination change.

## Completed delivery

### RB-001 / #89

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/84
- Report: `reports/RB-001-2026-07-26-peer-population-presets.md`

### RB-002 / #90

- Delivery source: RB-001 implementation in PR #84.
- Closure PR: https://github.com/vokerg/chess_repertoir_trainer/pull/107
- Report: `reports/RB-002-2026-07-26-delivered-by-rb-001.md`

### RB-003 / #91

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/111
- Report: `reports/RB-003-2026-07-27-opening-classification-rules.md`
- Delivered deterministic versioned White/Black opening profiles using ordered regex family rules, modifiers and exact overrides.
- Boundary: explicit unknowns; no database, runtime AI, engine audit, API, UI or generated-book mutation.

### RB-018 / #116

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/121
- Report: `reports/RB-018-2026-07-27-opening-classification-coverage.md`
- Delivered `2026-07-rules-v2`, 100% rule-match coverage for the pinned 3,733 generated entries and 3,167 unique names through 114 ordered rules.
- Added generated and game-weighted audits, grouped unknown-family backlogs and focused family/exception regressions.
- Boundary: rule-match coverage does not fabricate semantic certainty; rare families retain low confidence or explicit unknown dimensions.

### RB-008 / #96

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/110
- Branch: `rb-008/issue-96-visual-candidate-prototype`
- Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`
- Artifacts: `prototypes/rb-008-visual-candidate-choice/`
- Accepted: focused setup dialog launches a routed board-first workbench.
- Rejected default: simultaneous candidate mini-board landscape.

### RB-014 / #102

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/113
- Squash commit: `d53ff6e2b6eedcbf5f3abcea137373baa0102397`
- Report: `reports/RB-014-2026-07-27-traps-foundation-discovery.md`
- Accepted one bounded 20–50 example curated data/validator pilot.
- Identity: normalized trigger position plus ordered move transitions; opening labels are descriptive only.
- Source policy: CC0 Lichess data and `chess-openings`, original analysis, explicit provenance and editorial review.
- Production boundary: no schema, API, Angular UI, course writes or builder integration.

### RB-006 / #94

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/157
- Squash commit: `9d833d910205f687b87f3c54e2ff4ea71ced3cb5`
- Report: `reports/RB-006-2026-07-28-repertoire-target-contract.md`
- Adds `@chess-trainer/contracts/repertoire-target` with requested/effective population, factual peer snapshot, target-specific intent, per-field default provenance, explicit override validation and mutability/recalculation helpers.
- Includes canonical new-course, existing-course, profile-override and alternate-persona examples plus invalid-combination and pure-helper tests.
- Adds no API, UI, persistence, ranking, course write, traps or LLM behavior.
- PRs #145 and #146 were superseded and closed without merge.

### RB-007 / #95

- Claim PR: https://github.com/vokerg/chess_repertoir_trainer/pull/164
- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/166
- Squash commit: `25d37b44c273afe0b7e5838a4fb0a00cee89d88a`
- Implementation report: `reports/RB-007-2026-07-29-candidate-evidence-ranking.md`
- Closure report: `reports/RB-007-2026-07-29-closure.md`
- Adds versioned `candidate-decision` contracts, a pure deterministic ranking policy and authenticated `POST /api/candidate-decisions`.
- Aggregates bounded stored engine, Masters, selected-population, personal, opening-profile, Player Chess Profile and owned-course evidence through injectable service boundaries.
- Keeps source facts, target fit, profile fit, eligibility, components, reasons, warnings, manual candidates, course conflict/transposition and opponent coverage separate and inspectable.
- Publishes no opaque aggregate score and adds no persistence, course write, Angular UI, traps, LLM, live engine run or peer-formula change.
- CI #1281, #1284 and final implementation-head CI #1295 passed the complete repository workflow.

### RB-009 / #97

- Claim PR: https://github.com/vokerg/chess_repertoir_trainer/pull/173
- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/177
- Squash commit: `00c8f1abff4403d4fe5996cbb41759a1608a9cf9`
- Implementation report: `reports/RB-009-2026-07-29-builder-session-lifecycle.md`
- Closure report: `reports/RB-009-2026-07-29-closure.md`
- Adds a pure, serializable and versioned builder-session domain with owner/revision checks, retained target and evidence provenance, path-stable branches, normalized-position transpositions, explicit branch states, decision history and a lazy bounded queue.
- Deterministic transitions cover accept/replace, defer/reopen, stale restart, ignore, branch completion, target/evidence invalidation, queue reorder, session completion/abandonment and snapshot resume.
- Hard bounds are 256 branches, 128 queued branches, 8 selected moves and 256 preview nodes.
- Adds no Prisma model, API, Angular UI or storage adapter.
- CI #1328 and final implementation-head CI #1360 passed the complete repository workflow.

### RB-010 / #98

- Claim PR: https://github.com/vokerg/chess_repertoir_trainer/pull/182
- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/184
- Squash commit: `ea5b2bef4cdc0fa37024213b2e00b9da589b9718`
- Final tested implementation head: `b3a0076bdc75ea8035b3999a8e10a12d24992c6f`
- Implementation report: `reports/RB-010-2026-07-29-interactive-builder-mvp.md`
- Closure report: `reports/RB-010-2026-07-29-closure.md`
- Adds authenticated `/builder` route and top-level navigation entry.
- Composes schema-valid RB-006 target setup, the existing RB-007 candidate API and RB-009 session reducer in one page-scoped Angular workflow.
- Provides one board, visual candidate switching, manual legal-move inclusion, opponent-response selection, inspectable evidence, bounded queue/defer/reopen/ignore/stop/stale controls and structural preview.
- Bounds the route to initial-position starts, 6 candidates per request and 24 accepted decisions while preserving RB-009 hard limits.
- Accepts route-local lifetime for the first MVP: refresh starts over; no Prisma model, builder-session API or browser storage is added.
- Adds no course write; RB-011 owns mandatory preview/apply.
- Final CI #1417 passed lint, builds, both opening audits, architecture guardrails, migrations and complete repository tests.
- Merge-readiness review restored pre-existing collapsed-navigation, Escape, route-change and mobile-menu regression tests before integration.
- PR #184 had no review comments or unresolved inline threads at merge time.

### RB-011 / #99

- Claim PR: https://github.com/vokerg/chess_repertoir_trainer/pull/187
- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/189
- Squash commit: `01b36f9503ccfbb3dced55d56589b89cfd163867`
- Final tested implementation head: `fa0bda406404a85138acb4c9cbf0ea5b79d6e13e`
- Final review-package head: `30b077377cb5e9337dd455f9f8a8a7a38a152cec`
- Implementation report: `reports/RB-011-2026-07-29-course-reintegration.md`
- Closure report: `reports/RB-011-2026-07-29-closure.md`
- Projects completed builder sessions into the existing analysis merge tree and keeps unresolved branches explicit but outside writes.
- Adds mandatory preview and exact-preview transactional apply into one owned existing chapter, with reviewed new-line or existing-line-anchor targets.
- Reuses existing conflict planning, move-node writing, ownership, stale-anchor, legal-move and course revision behavior.
- Adds strict no-conflict behavior, explicit counts, equivalent-line/repeated-apply safety, shared contracts, Fastify routes and a feature-local Angular review dialog/store.
- Adds no Prisma model, migration, whole-course orchestration, durable builder persistence or existing-course finding entry point.
- CI #1479 and final review-package CI #1488 passed lint, builds, audits, architecture guardrails, migrations and complete repository tests.
- Issue #99 is closed; the accepted boundary unblocks RB-012.

### RB-012 / #100

- Course endings implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/205
- Course endings squash commit: `c2266c9a8ffca00696da264abb3476f36ec82b50`
- Opponent gaps implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/208
- Opponent gaps squash commit: `1583b153a2bc674c649b2500769be997a8f4474e`
- Final Opponent gaps review-package head: `d542a9bf084d3738adfaddcfa5be5c95683591e2`
- Final Opponent gaps CI: run `30517656919` / #1597 — success
- Course endings report: `reports/RB-012-2026-07-29-course-ending-entry.md`
- Opponent gaps report: `reports/RB-012-2026-07-30-opponent-gaps-entry.md`
- Closure report: `reports/RB-012-2026-07-30-closure.md`
- Delivers exact Course ending and Opponent gap entry points into the existing builder with source evidence, applied scope, observed-move inclusion and exact RB-011 destination locking.
- Supports terminal `NODE`, pre-gap `LINE_START` and pre-gap `NODE` anchors with safe stale-source behavior.
- Adds no API route, Prisma model, migration, persistence layer, worker, automatic write or second recommendation engine.
- My deviations is not residual RB-012 work; any future replace/alternate/keep-course flow requires a new task with explicit consequence semantics.
- Issue #100 is closed as completed.

### RB-015 / #103

- Research PR: https://github.com/vokerg/chess_repertoir_trainer/pull/216
- Squash commit: `9a4e6166c9a874b8cb5b5efb04a2a4661e848d45`
- Final research head: `7e7495485969c8dca1c515066c41df472817b6e8`
- Final research CI: run `30526417275` / #1617 — success
- Report: `reports/RB-015-2026-07-30-llm-role-discovery.md`
- Verifies the existing AI provider/capability/validation boundary and the deterministic RB-007/RB-009/RB-011 authorities.
- Locks generated interpretation to optional, on-demand, read-only leaf panels consuming immutable deterministic snapshots.
- Creates RB-019/#218 for candidate explanation and RB-020/#219 for post-apply summary as independent P3 stretch goals.
- Defers profile narrative until RB-004/RB-005 acceptance demonstrates a concrete deterministic-copy gap.
- Adds no production AI endpoint, prompt, contract, Angular widget, schema, migration, persistence, ranking change, reducer change or course mutation.
- Issue #103 closes after closure reconciliation.

## Review work

### RB-004 / #92

- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/136
- Report: `reports/RB-004-2026-07-27-player-chess-profile-calculation.md`
- Provides a shared contract and authenticated deterministic profile endpoint with separate preference/performance sections, selected-game baselines, evidence grades, explicit classification/analysis coverage and bounded supporting evidence.
- Final implementation-head CI #1103 passed lint, build, audits, architecture guardrails, migrations, complete tests, multi-account coverage and the 1,200-game bounded performance regression.
- Await user review and accepted integration before closing #92.

### RB-005 / #93

- Claim PR: https://github.com/vokerg/chess_repertoir_trainer/pull/138
- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/139
- Report: `reports/RB-005-2026-07-28-player-chess-profile-experience.md`
- Preserves `/progress` as the default-account dashboard entry, adds `/progress/profile`, and exposes `Account performance` plus `Chess profile` under the existing Progress submenu.
- Provides recalculable context filters, separate preference/performance views, conclusion and row evidence, supporting openings/games, peer and coverage context, responsive states and focused Angular tests.
- Uses a lazy composition page, page-scoped store with private writable signals, typed HTTP-only data access, feature-local UI view models and focused pure transformation helpers.
- Corrected review-head CI and hands-on user review are required before integration.
- Remains stacked on RB-004 and must be reconciled only after RB-004 acceptance.

## Active claim

### RB-017 / #114

- Implementation branch: `rb-017/issue-114-curated-traps-pilot`.
- Scope: source-controlled dataset, deterministic validator, reproducible engine/population snapshots, review output, tests and documentation.
- Exclusions: production persistence, public contracts, frontend, course writes and builder integration.

## Stretch goals

### RB-019 / #218

- Candidate explanation appears only after deterministic candidate selection beside the existing Focused evidence panel.
- It is on demand, transient, separately feature toggled, and implemented through AI-specific page state outside `RepertoireBuilderStore`.
- It cannot rank, select, accept, defer, reorder, cover, or write moves.

### RB-020 / #219

- Completion summary appears only after RB-011 apply succeeds and the authoritative result exists.
- It is on demand, transient, separately feature toggled, and implemented through AI-specific dialog state outside `RepertoireBuilderCourseStore`.
- It cannot choose destinations, review targets, approve conflicts, apply, or mutate courses.

Both remain `PROPOSED` after RB-015 completion. They are not critical-path work.

## Accepted visual direction

PR #110 establishes the setup dialog, routed board-first workbench, one readable board, candidate switcher, focused evidence, opponent-response queue, explicit branch states and target/profile separation.

Squash-merged PR #184 implements this direction. Squash-merged PR #189 adds mandatory reviewed course preview/apply. Squash-merged PRs #205 and #208 connect exact Course ending and Opponent gap findings to those integrated boundaries.

## Critical path

```text
RB-001 and RB-002 factual population/level — DONE
        +
RB-003 opening-classification foundation — DONE
        +
RB-018 coverage expansion — DONE
        ↓
RB-004 calculation — REVIEW
        +
RB-005 experience — REVIEW (stacked)
        ↓
RB-006 target contract — DONE
        ↓
RB-007 candidate evidence/ranking — DONE
        +
RB-008 visual proof — DONE
        ↓
RB-009 session/queue lifecycle — DONE
        ↓
RB-010 routed builder — DONE
        ↓
RB-011 course preview/apply — DONE
        ↓
RB-012 existing-course adaptation — DONE
        ↓
RB-016 feedback
```

RB-014, RB-015, RB-017, RB-019 and RB-020 remain outside the critical path.

## Queue impact

- RB-003 and RB-018 are `DONE`; opening classification foundation and pinned-book coverage are delivered.
- RB-004 is `REVIEW` through PR #136.
- RB-005 is `REVIEW` through stacked PR #139; it is not integrated until corrected review-head CI, hands-on acceptance, RB-004 acceptance and stack reconciliation.
- RB-006 is `DONE` through squash-merged PR #157.
- RB-007 is `DONE` through squash-merged PR #166 after final-head CI #1295.
- RB-009 is `DONE` through squash-merged PR #177 after final-head CI #1360.
- RB-010 is `DONE` through squash-merged PR #184 after final tested-head CI #1417.
- RB-011 is `DONE` through squash-merged PR #189 after final review-package CI #1488.
- RB-012 is `DONE` through squash-merged PRs #205 and #208; issue #100 is closed.
- RB-013 remains blocked on RB-004/RB-005 acceptance and integration.
- RB-014 is `DONE`; RB-017 remains an approved claimed traps pilot.
- RB-015 is `DONE` through squash-merged PR #216; issue #103 closes with closure reconciliation.
- RB-019 and RB-020 remain separate P3 `PROPOSED` stretch goals with issues #218 and #219.
- RB-016 remains blocked on real builder/course usage.
- No critical-path priority or roadmap resequencing is required.
