# Repertoire Builder Task Queue

Last updated: 2026-07-26

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. GitHub Issues execution is governed by [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md).

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89) | P0 | DONE | Deliver Lichess-aligned peer population presets | Dual-use | Merged through PR #84 |
| 20 | RB-002 | [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90) | P0 | DONE | Define multi-account player level resolution | Dual-use | Delivered by the RB-001 normalized peer resolver in PR #84 |
| 30 | RB-003 | [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) | P0 | PROPOSED | Establish named opening classification foundation | Dual-use | Independent; planning intentionally blank |
| 40 | RB-008 | [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) | P1 | REVIEW | Prototype visual candidate and coverage choices | North-star | PR #110; user selection between Direction A, Direction B or hybrid pending |
| 50 | RB-004 | [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) | P1 | BLOCKED | Implement Player Chess Profile calculation | Dual-use | RB-003; consumes completed RB-001/RB-002 factual level |
| 60 | RB-005 | [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) | P1 | BLOCKED | Deliver Player Chess Profile experience | Standalone | RB-004 |
| 70 | RB-006 | [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94) | P1 | BLOCKED | Define repertoire target contract | North-star | RB-003; reviewed outcome from RB-008; completed RB-001/RB-002 factual level |
| 80 | RB-013 | [#101](https://github.com/vokerg/chess_repertoir_trainer/issues/101) | P1 | PROPOSED | Support repertoire personas and profile overrides | Dual-use | RB-005, RB-006 |
| 90 | RB-007 | [#95](https://github.com/vokerg/chess_repertoir_trainer/issues/95) | P1 | BLOCKED | Aggregate and rank candidate evidence explainably | North-star | RB-003, RB-006; RB-008 evidence responsibilities; completed RB-001/RB-002 factual level |
| 100 | RB-009 | [#97](https://github.com/vokerg/chess_repertoir_trainer/issues/97) | P1 | BLOCKED | Define builder session, branch queue, and draft lifecycle | North-star | RB-006, reviewed RB-008 direction, RB-007 contract direction |
| 110 | RB-010 | [#98](https://github.com/vokerg/chess_repertoir_trainer/issues/98) | P1 | BLOCKED | Implement bounded interactive builder MVP | North-star | RB-007, reviewed RB-008 direction, RB-009 |
| 120 | RB-011 | [#99](https://github.com/vokerg/chess_repertoir_trainer/issues/99) | P1 | BLOCKED | Preview and apply builder output to courses | Dual-use | RB-010; current reintegration reinspection |
| 130 | RB-012 | [#100](https://github.com/vokerg/chess_repertoir_trainer/issues/100) | P2 | BLOCKED | Enter builder from existing-course findings | Dual-use | RB-010, RB-011 |
| 140 | RB-014 | [#102](https://github.com/vokerg/chess_repertoir_trainer/issues/102) | P2 | READY | Research traps knowledge foundation | Research | Independent; no MVP dependency |
| 150 | RB-015 | [#103](https://github.com/vokerg/chess_repertoir_trainer/issues/103) | P3 | PROPOSED | Decide whether an LLM has a justified role | Research | Deterministic evidence and UX sufficiently understood |
| 160 | RB-016 | [#104](https://github.com/vokerg/chess_repertoir_trainer/issues/104) | P2 | BLOCKED | Measure adoption and real-game outcomes | Dual-use | Builder and course materialization in use |

## GitHub Issues program

- Program tracker: [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105).
- Every existing RB task has exactly one GitHub issue linked above.
- GitHub Issues track execution status, assignee, branch, pull request and active blockers.
- Repository task files remain the detailed scope and acceptance source.
- Important dependencies must be linked with direct GitHub issue references as well as documented here.
- New RB tasks require a corresponding GitHub issue in the same coordination change.
- `READY` repository tasks remain open and unclaimed until ownership and substantive work are visible.

## Completed delivery

### RB-001 / #89

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/84
- Squash commit: `49dc6499eac9998de864ccb75a607541cd945382`
- Report: `reports/RB-001-2026-07-26-peer-population-presets.md`
- Validation: final PR-head CI run `30212157700` passed.

### RB-002 / #90

- Delivery source: RB-001 implementation in PR #84.
- Closure PR: https://github.com/vokerg/chess_repertoir_trainer/pull/107
- Closure report: `reports/RB-002-2026-07-26-delivered-by-rb-001.md`
- Completion reason: PR #84 supplies the versioned provider/speed matrix, multi-account normalized distribution, fallback policy, dominant interval and contribution provenance required by RB-002.

## Work in review

### RB-008 / #96

- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/110
- Branch: `rb-008/issue-96-visual-candidate-prototype`
- Report: `reports/RB-008-2026-07-26-visual-candidate-prototype-review.md`
- Artifacts: `prototypes/rb-008-visual-candidate-choice/`
- Alternatives: board-first decision desk and candidate landscape.
- Provisional recommendation: board-first default plus optional mini-board compare mode.
- Pending: user visual decision; issue remains open.

## Queue notes

### Delivered population and player-level direction

PR #84 provides the fixed speed/rating presets, active Lichess-band normalization, provider-aware multi-account distribution, recent/all-history/default resolver, direct provenance and compact frontend controls. RB-002 is complete because this is already the factual multi-account player-level result.

### Visual decision direction

PR #110 proves two compositions against the same realistic mock scenario:

- Direction A preserves one readable analytical board and existing workbench continuity;
- Direction B makes structural comparison immediate through simultaneous mini-boards, but introduces board-size and mobile-density costs.

The review report specifies target, candidate, response and session data responsibilities for RB-006, RB-007, RB-009 and RB-010 without defining endpoints.

### Independent and next work

- RB-003 remains P0 but `PROPOSED`; it needs discovery before implementation.
- RB-008 remains active in review until the user chooses a direction.
- RB-014 remains the next independent `READY` task if parallel work is desired.

### Critical path

```text
RB-001 peer population and factual player level — DONE
        +
RB-002 completion reconciliation — DONE
        +
RB-003 opening profile — PROPOSED
        ↓
RB-004/005 player profile
        ↓
RB-006 target presets and overrides
        ↓
RB-007 candidate evidence/ranking
        +
RB-008 visual proof — REVIEW
        ↓
RB-009/010 builder
        ↓
RB-011 course writing
        ↓
RB-012 adaptation
        ↓
RB-016 feedback
```

## Reprioritization impact

- RB-001 remains order 10, P0, `DONE`.
- RB-002 remains order 20, P0, `DONE`.
- RB-003 remains order 30, P0, `PROPOSED`.
- RB-008 remains order 40, P1, now `REVIEW`.
- RB-014 remains order 140, P2, `READY` and independent.
- No priority or order changes are recommended.
- No new RB/GitHub issue is proposed before RB-008 review.

## Adding tasks

- Use the next unused `RB-###` ID.
- Never recycle or renumber an ID.
- Create a separate file under `tasks/` from the template.
- Create one GitHub issue and record its number here.
- Add the issue to program tracker #105.
- Add order, priority, status, class and dependencies here.
- Add material issue dependency references.
- Explain the queue and issue impact in the report that created the task.

## Reprioritizing

A reprioritization update must state:

- evidence or dependency that changed;
- affected task orders and priorities;
- whether work in progress is disrupted;
- whether GitHub issue metadata, links, or comments were updated;
- whether the roadmap also changes.
