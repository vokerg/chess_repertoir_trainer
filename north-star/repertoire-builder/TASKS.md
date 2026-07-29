# Repertoire Builder Task Queue

Last updated: 2026-07-29

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
| 100 | RB-009 | [#97](https://github.com/vokerg/chess_repertoir_trainer/issues/97) | P1 | READY | Define builder session, branch queue, and draft lifecycle | North-star | Completed RB-006, accepted RB-008 routed direction, integrated RB-007 contract and policy |
| 110 | RB-010 | [#98](https://github.com/vokerg/chess_repertoir_trainer/issues/98) | P1 | BLOCKED | Implement bounded interactive builder MVP | North-star | RB-007, accepted RB-008 dialog/workbench direction, RB-009 |
| 120 | RB-011 | [#99](https://github.com/vokerg/chess_repertoir_trainer/issues/99) | P1 | BLOCKED | Preview and apply builder output to courses | Dual-use | RB-010 |
| 130 | RB-012 | [#100](https://github.com/vokerg/chess_repertoir_trainer/issues/100) | P2 | BLOCKED | Enter builder from existing-course findings | Dual-use | RB-010, RB-011 |
| 140 | RB-014 | [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) | P2 | DONE | Research traps knowledge foundation | Research | Approved and squash-merged through PR #113 |
| 145 | RB-017 | [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114) | P2 | CLAIMED | Validate curated traps knowledge pilot | Dual-use pilot | RB-014; implementation branch `rb-017/issue-114-curated-traps-pilot` |
| 150 | RB-015 | [#103](https://github.com/vokerg/chess_repertoir_trainer/issues/103) | P3 | PROPOSED | Decide whether an LLM has a justified role | Research | Deterministic evidence and UX sufficiently understood |
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
- Delivered: deterministic versioned White/Black opening profiles using ordered regex family rules, modifiers and exact overrides.
- Boundary: explicit unknowns; no database, runtime AI, engine audit, API, UI, or generated-book mutation.

### RB-018 / #116

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/121
- Report: `reports/RB-018-2026-07-27-opening-classification-coverage.md`
- Delivered: `2026-07-rules-v2`, 100% rule-match coverage for the pinned 3,733 generated entries and 3,167 unique names through 114 ordered rules.
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
- Accepted: one bounded 20–50 example curated data/validator pilot.
- Identity: normalized trigger position plus ordered move transitions; opening labels are descriptive only.
- Source policy: CC0 Lichess data and `chess-openings`, original analysis, explicit provenance, and editorial review.
- Production boundary: no schema, API, Angular UI, course writes, or builder integration.

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
- Adds versioned `candidate-decision` contracts, a pure deterministic ranking policy, and authenticated `POST /api/candidate-decisions`.
- Aggregates bounded stored engine, Masters, selected-population, personal, opening-profile, Player Chess Profile, and owned-course evidence through injectable service boundaries.
- Keeps source facts, target fit, profile fit, eligibility, components, reasons, warnings, manual candidates, course conflict/transposition, and opponent coverage separate and inspectable.
- Publishes no opaque aggregate score and adds no persistence, course write, Angular UI, traps, LLM, live engine run, or peer-formula change.
- CI #1281, #1284, and final implementation-head CI #1295 passed lint, build, both opening audits, architecture guardrails, migrations, and complete repository tests.

## Review work

### RB-004 / #92

- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/136
- Report: `reports/RB-004-2026-07-27-player-chess-profile-calculation.md`
- Provides a shared contract and authenticated deterministic profile endpoint with separate preference/performance sections, selected-game baselines, evidence grades, explicit classification/analysis coverage, and bounded supporting evidence.
- Final implementation-head CI #1103 passed lint, build, audits, architecture guardrails, migrations, complete tests, multi-account coverage, and the 1,200-game bounded performance regression.
- Await user review and accepted integration before closing #92.

### RB-005 / #93

- Claim PR: https://github.com/vokerg/chess_repertoir_trainer/pull/138
- Implementation PR: https://github.com/vokerg/chess_repertoir_trainer/pull/139
- Report: `reports/RB-005-2026-07-28-player-chess-profile-experience.md`
- Preserves `/progress` as the default-account dashboard entry, adds `/progress/profile`, and exposes `Account performance` plus `Chess profile` under the existing Progress submenu.
- Provides recalculable context filters, separate preference/performance views, conclusion and row evidence, supporting openings/games, peer and coverage context, responsive states, and focused Angular tests.
- Uses a lazy composition page, page-scoped store with private writable signals, typed HTTP-only data access, feature-local UI view models, and focused pure transformation helpers.
- Corrected review-head CI and hands-on user review are required before integration.
- Remains stacked on RB-004 and must be reconciled only after RB-004 acceptance.

## Active claim

### RB-017 / #114

- Implementation branch: `rb-017/issue-114-curated-traps-pilot`.
- Scope: source-controlled dataset, deterministic validator, reproducible engine/population snapshots, review output, tests, and documentation.
- Exclusions: production persistence, public contracts, frontend, course writes, and builder integration.

## Accepted visual direction

PR #110 establishes:

- setup dialog for side, start, speed, rating, persona and coverage intent;
- routed recursive builder after Start building;
- one readable analytical board as the default;
- candidate switcher and focused evidence;
- opponent-response coverage queue and explicit branch states;
- target/profile separation;
- no simultaneous three-board default.

RB-009 and RB-010 own the downstream production contracts and implementation using completed RB-006 and integrated RB-007.

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
RB-009 session/queue lifecycle — READY
        ↓
RB-010 routed builder — BLOCKED
        ↓
RB-011/012 course materialization and adaptation
        ↓
RB-016 feedback
```

RB-014 and RB-017 remain outside the critical path.

## Queue impact

- RB-003 and RB-018 are `DONE`; opening classification foundation and pinned-book coverage are delivered.
- RB-004 is `REVIEW` through PR #136.
- RB-005 is `REVIEW` through stacked PR #139; it is not integrated until corrected review-head CI, hands-on acceptance, RB-004 acceptance, and stack reconciliation.
- RB-006 is `DONE` through squash-merged PR #157.
- RB-007 is `DONE` through squash-merged PR #166 after final-head CI #1295.
- RB-009 is the next ordered `READY` North Star critical-path task.
- RB-010 remains blocked on RB-009.
- RB-014 is `DONE`; RB-017 remains the only approved traps implementation scope and is `CLAIMED`.
- No new task, issue, priority change or roadmap resequencing is required.