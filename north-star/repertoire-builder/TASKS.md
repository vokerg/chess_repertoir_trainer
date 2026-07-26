# Repertoire Builder Task Queue

Last updated: 2026-07-26

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. GitHub Issues execution is governed by [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md).

| Order | ID | GitHub issue | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | [#89](https://github.com/vokerg/chess_repertoir_trainer/issues/89) | P0 | DONE | Deliver Lichess-aligned peer population presets | Dual-use | Merged through PR #84 |
| 20 | RB-002 | [#90](https://github.com/vokerg/chess_repertoir_trainer/issues/90) | P0 | DONE | Define multi-account player level resolution | Dual-use | Delivered by the RB-001 normalized peer resolver in PR #84 |
| 30 | RB-003 | [#91](https://github.com/vokerg/chess_repertoir_trainer/issues/91) | P0 | PROPOSED | Establish named opening classification foundation | Dual-use | Independent; planning intentionally blank |
| 40 | RB-008 | [#96](https://github.com/vokerg/chess_repertoir_trainer/issues/96) | P1 | READY | Prototype visual candidate and coverage choices | North-star | Foundation; may use verified Peer games plus explicit mocks for unresolved target/profile evidence |
| 50 | RB-004 | [#92](https://github.com/vokerg/chess_repertoir_trainer/issues/92) | P1 | BLOCKED | Implement Player Chess Profile calculation | Dual-use | RB-003; consumes completed RB-001/RB-002 factual level |
| 60 | RB-005 | [#93](https://github.com/vokerg/chess_repertoir_trainer/issues/93) | P1 | BLOCKED | Deliver Player Chess Profile experience | Standalone | RB-004 |
| 70 | RB-006 | [#94](https://github.com/vokerg/chess_repertoir_trainer/issues/94) | P1 | BLOCKED | Define repertoire target contract | North-star | RB-003; input from RB-008; consumes completed RB-001/RB-002 factual level |
| 80 | RB-013 | [#101](https://github.com/vokerg/chess_repertoir_trainer/issues/101) | P1 | PROPOSED | Support repertoire personas and profile overrides | Dual-use | RB-005, RB-006 |
| 90 | RB-007 | [#95](https://github.com/vokerg/chess_repertoir_trainer/issues/95) | P1 | BLOCKED | Aggregate and rank candidate evidence explainably | North-star | RB-003, RB-006; consumes completed RB-001/RB-002 factual level |
| 100 | RB-009 | [#97](https://github.com/vokerg/chess_repertoir_trainer/issues/97) | P1 | BLOCKED | Define builder session, branch queue, and draft lifecycle | North-star | RB-006, RB-008, RB-007 contract direction |
| 110 | RB-010 | [#98](https://github.com/vokerg/chess_repertoir_trainer/issues/98) | P1 | BLOCKED | Implement bounded interactive builder MVP | North-star | RB-007, RB-008, RB-009 |
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
- Closure report: `reports/RB-002-2026-07-26-delivered-by-rb-001.md`
- Completion reason: PR #84 already supplies the versioned provider/speed matrix, multi-account normalized distribution, fallback policy, dominant interval and contribution provenance required by RB-002.
- No second formula, persistence layer or exact universal rating is added.

## Queue notes

### Delivered population and player-level direction

PR #84 provides:

- product speed presets: `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, `BULLET`;
- rating targets: all players, my peers, my peers plus one higher band, or one explicit group;
- exclusion of ultraBullet;
- server-controlled unrestricted public-game period with the existing 30-day cache lifecycle;
- active normalization profile `2026-07-lichess-bands-v1` aligned to Lichess Explorer groups;
- approximate Chess.com mappings into those benchmark bands;
- provider/speed classification before aggregation;
- multi-account game-count-weighted band distribution;
- recent-three-month/all-history/default peer resolution;
- `dominant-contiguous-window-v1` selected interval;
- complete distribution and account/provider/speed provenance;
- direct response provenance for requested/effective populations;
- two compact frontend selects replacing raw month and checkbox controls.

The product deliberately accepts one combined Lichess response for the resolved speed/rating population. Per-speed decomposition and weighting remain rejected for the MVP.

RB-002 is complete because the factual multi-account level is already this normalized resolver result. Persistence, generic confidence, activity caps, overrides and an independent endpoint remain consumer-driven concerns rather than a second foundation formula.

### Independent and next work

- RB-003 remains P0 but `PROPOSED`; it needs discovery before it can be claimed for implementation.
- RB-008 is the first `READY` task after the completed foundations and is the next actionable issue in queue order.
- RB-014 can run as low-risk research without affecting the core delivery path.

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
RB-008 visual proof — READY
        ↓
RB-009/010 builder
        ↓
RB-011 course writing
        ↓
RB-012 adaptation
        ↓
RB-016 feedback
```

RB-013 personas intersects profile and target work and may be split further after RB-006.

## Reprioritization impact

- RB-001 remains order 10, P0, `DONE`.
- RB-002 remains order 20, P0, now `DONE`.
- RB-003 remains order 30, P0, `PROPOSED`.
- RB-008 remains order 40, P1, `READY`, and becomes the next actionable issue.
- No priority or order changes are required.
- No new RB/GitHub issue is required.

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
