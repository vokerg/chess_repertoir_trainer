# Repertoire Builder Task Queue

Last updated: 2026-07-27

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. GitHub Issues execution is governed by [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md).

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89) | P0 | DONE | Deliver Lichess-aligned peer population presets | Dual-use | Merged through PR #84 |
| 20 | RB-002 | [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90) | P0 | DONE | Define multi-account player level resolution | Dual-use | Delivered by the RB-001 normalized peer resolver in PR #84 |
| 30 | RB-003 | [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) | P0 | DONE | Establish named opening classification foundation | Dual-use | Delivered through PR #111 |
| 35 | RB-018 | [#116](https://github.com/vokerg/chess_repertoir_trainer/issues/116) | P1 | READY | Complete opening classification coverage | Dual-use | RB-003; may run in parallel with RB-004 |
| 40 | RB-008 | [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) | P1 | DONE | Prototype visual candidate and coverage choices | North-star | Accepted through PR #110: setup dialog to routed board-first workbench |
| 50 | RB-004 | [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) | P1 | READY | Implement Player Chess Profile calculation | Dual-use | Completed RB-001/RB-002/RB-003; preserve unknown classification coverage while RB-018 expands rules |
| 60 | RB-005 | [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) | P1 | BLOCKED | Deliver Player Chess Profile experience | Standalone | RB-004 |
| 70 | RB-006 | [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94) | P1 | READY | Define repertoire target contract | North-star | Completed RB-003; accepted RB-008 setup requirements |
| 80 | RB-013 | [#101](https://github.com/vokerg/chess_repertoir_trainer/issues/101) | P1 | PROPOSED | Support repertoire personas and profile overrides | Dual-use | RB-005, RB-006 |
| 90 | RB-007 | [#95](https://github.com/vokerg/chess_repertoir_trainer/issues/95) | P1 | BLOCKED | Aggregate and rank candidate evidence explainably | North-star | RB-006; consumes completed RB-003 and accepted RB-008 evidence responsibilities |
| 100 | RB-009 | [#97](https://github.com/vokerg/chess_repertoir_trainer/issues/97) | P1 | BLOCKED | Define builder session, branch queue, and draft lifecycle | North-star | RB-006, accepted RB-008 routed direction, RB-007 contract direction |
| 110 | RB-010 | [#98](https://github.com/vokerg/chess_repertoir_trainer/issues/98) | P1 | BLOCKED | Implement bounded interactive builder MVP | North-star | RB-007, accepted RB-008 dialog/workbench direction, RB-009 |
| 120 | RB-011 | [#99](https://github.com/vokerg/chess_repertoir_trainer/issues/99) | P1 | BLOCKED | Preview and apply builder output to courses | Dual-use | RB-010 |
| 130 | RB-012 | [#100](https://github.com/vokerg/chess_repertoir_trainer/issues/100) | P2 | BLOCKED | Enter builder from existing-course findings | Dual-use | RB-010, RB-011 |
| 140 | RB-014 | [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) | P2 | DONE | Research traps knowledge foundation | Research | Approved and squash-merged through PR #113 |
| 145 | RB-017 | [#114](https://github.com/vokerg/chess_repertoir_trainer/issues/114) | P2 | CLAIMED | Validate curated traps knowledge pilot | Dual-use pilot | RB-014; implementation branch `rb-017/issue-114-curated-traps-pilot` |
| 150 | RB-015 | [#103](https://github.com/vokerg/chess_repertoir_trainer/issues/103) | P3 | PROPOSED | Decide whether an LLM has a justified role | Research | Deterministic evidence and UX sufficiently understood |
| 160 | RB-016 | [#104](https://github.com/vokerg/chess_repertoir_trainer/issues/104) | P2 | BLOCKED | Measure adoption and real-game outcomes | Dual-use | Builder and course materialization in use |

## GitHub Issues program

- Program tracker: [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105).
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
- Follow-up: RB-018 / #116 owns systematic family coverage and actual-game calibration.

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

## Ready work

### RB-018 / #116

- Complete the regex rule coverage without changing the RB-003 contract.
- Prioritize opening families and high-frequency actual-game unknowns.
- Explicitly excludes Stockfish, runtime AI, persistence, API, and UI.

### RB-004 / #92

- Calculate the Player Chess Profile using completed factual level and opening-classification foundations.
- Preserve classified and unknown counts; do not wait for fabricated 100% rule coverage.

### RB-006 / #94

- Define the repertoire target contract using completed RB-003 and accepted RB-008 setup responsibilities.

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

RB-006, RB-007, RB-009 and RB-010 own the downstream production contracts and implementation.

## Critical path

```text
RB-001 and RB-002 factual population/level — DONE
        +
RB-003 opening-classification foundation — DONE
        +
RB-018 coverage expansion — READY, parallel calibration
        ↓
RB-004/005 player profile
        ↓
RB-006 target and setup-dialog contract
        ↓
RB-007 candidate evidence/ranking
        +
RB-008 visual proof — DONE
        ↓
RB-009/010 routed builder
        ↓
RB-011/012 course materialization and adaptation
        ↓
RB-016 feedback
```

RB-014 and RB-017 remain outside the critical path.

## Queue impact

- RB-003 is `DONE`; the Stage 1 foundation is delivered.
- RB-018 is added at order 35, P1, `READY` for systematic regex coverage.
- RB-004 and RB-006 become `READY`.
- RB-007 remains blocked on RB-006 rather than RB-003.
- RB-014 is `DONE`; RB-017 remains the only approved traps implementation scope and is `CLAIMED`.
- No existing priority changes are required.
