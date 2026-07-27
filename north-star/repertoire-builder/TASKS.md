# Repertoire Builder Task Queue

Last updated: 2026-07-27

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. GitHub Issues execution is governed by [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md).

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89) | P0 | DONE | Deliver Lichess-aligned peer population presets | Dual-use | Merged through PR #84 |
| 20 | RB-002 | [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90) | P0 | DONE | Define multi-account player level resolution | Dual-use | Delivered by the RB-001 normalized peer resolver in PR #84 |
| 30 | RB-003 | [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) | P0 | PROPOSED | Establish named opening classification foundation | Dual-use | Independent; planning intentionally blank |
| 40 | RB-008 | [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) | P1 | DONE | Prototype visual candidate and coverage choices | North-star | Accepted through PR #110: setup dialog to routed board-first workbench |
| 50 | RB-004 | [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) | P1 | BLOCKED | Implement Player Chess Profile calculation | Dual-use | RB-003; consumes completed RB-001/RB-002 factual level |
| 60 | RB-005 | [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) | P1 | BLOCKED | Deliver Player Chess Profile experience | Standalone | RB-004 |
| 70 | RB-006 | [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94) | P1 | BLOCKED | Define repertoire target contract | North-star | RB-003; accepted RB-008 setup requirements |
| 80 | RB-013 | [#101](https://github.com/vokerg/chess_repertoir_trainer/issues/101) | P1 | PROPOSED | Support repertoire personas and profile overrides | Dual-use | RB-005, RB-006 |
| 90 | RB-007 | [#95](https://github.com/vokerg/chess_repertoir_trainer/issues/95) | P1 | BLOCKED | Aggregate and rank candidate evidence explainably | North-star | RB-003, RB-006; accepted RB-008 evidence responsibilities |
| 100 | RB-009 | [#97](https://github.com/vokerg/chess_repertoir_trainer/issues/97) | P1 | BLOCKED | Define builder session, branch queue, and draft lifecycle | North-star | RB-006, accepted RB-008 routed direction, RB-007 contract direction |
| 110 | RB-010 | [#98](https://github.com/vokerg/chess_repertoir_trainer/issues/98) | P1 | BLOCKED | Implement bounded interactive builder MVP | North-star | RB-007, accepted RB-008 dialog/workbench direction, RB-009 |
| 120 | RB-011 | [#99](https://github.com/vokerg/chess_repertoir_trainer/issues/99) | P1 | BLOCKED | Preview and apply builder output to courses | Dual-use | RB-010 |
| 130 | RB-012 | [#100](https://github.com/vokerg/chess_repertoir_trainer/issues/100) | P2 | BLOCKED | Enter builder from existing-course findings | Dual-use | RB-010, RB-011 |
| 140 | RB-014 | [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) | P2 | READY | Research traps knowledge foundation | Research | Independent |
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

### RB-008 / #96

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/110
- Branch: `rb-008/issue-96-visual-candidate-prototype`
- Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`
- Artifacts: `prototypes/rb-008-visual-candidate-choice/`
- Accepted: focused setup dialog launches a routed board-first workbench.
- Rejected default: simultaneous candidate mini-board landscape.

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
RB-003 opening profile — PROPOSED
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

## Queue impact

- RB-008 is `DONE` without order or priority changes.
- RB-003 remains the unresolved P0 foundation.
- RB-014 remains the next independent `READY` task.
- No new RB/GitHub issue is required.
