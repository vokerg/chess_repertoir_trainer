# Repertoire Builder Task Queue

Last updated: 2026-07-26

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. Jira execution is governed by [`JIRA.md`](JIRA.md).

| Order | ID | Jira | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | CRT-3 | P0 | DONE | Deliver Lichess-aligned peer population presets | Dual-use | Merged through PR #84 |
| 20 | RB-002 | CRT-4 | P0 | READY | Define provider-aware multi-account player rating | Dual-use | RB-001 profile/resolver plus existing imported-game `averageUserRating` on `main` |
| 30 | RB-003 | CRT-5 | P0 | PROPOSED | Establish named opening classification foundation | Dual-use | Independent; planning intentionally blank |
| 40 | RB-008 | CRT-10 | P1 | READY | Prototype visual candidate and coverage choices | North-star | Foundation; may use verified Peer games plus explicit mocks for unresolved target/profile evidence |
| 50 | RB-004 | CRT-6 | P1 | BLOCKED | Implement Player Chess Profile calculation | Dual-use | RB-002, RB-003; RB-001 for population-relative claims |
| 60 | RB-005 | CRT-7 | P1 | BLOCKED | Deliver Player Chess Profile experience | Standalone | RB-004 |
| 70 | RB-006 | CRT-8 | P1 | BLOCKED | Define repertoire target contract | North-star | RB-001, RB-002, RB-003; input from RB-008 |
| 80 | RB-013 | CRT-15 | P1 | PROPOSED | Support repertoire personas and profile overrides | Dual-use | RB-005, RB-006 |
| 90 | RB-007 | CRT-9 | P1 | BLOCKED | Aggregate and rank candidate evidence explainably | North-star | RB-001, RB-002, RB-003, RB-006 |
| 100 | RB-009 | CRT-11 | P1 | BLOCKED | Define builder session, branch queue, and draft lifecycle | North-star | RB-006, RB-008, RB-007 contract direction |
| 110 | RB-010 | CRT-12 | P1 | BLOCKED | Implement bounded interactive builder MVP | North-star | RB-007, RB-008, RB-009 |
| 120 | RB-011 | CRT-13 | P1 | BLOCKED | Preview and apply builder output to courses | Dual-use | RB-010; current reintegration reinspection |
| 130 | RB-012 | CRT-14 | P2 | BLOCKED | Enter builder from existing-course findings | Dual-use | RB-010, RB-011 |
| 140 | RB-014 | CRT-16 | P2 | READY | Research traps knowledge foundation | Research | Independent; no MVP dependency |
| 150 | RB-015 | CRT-17 | P3 | PROPOSED | Decide whether an LLM has a justified role | Research | Deterministic evidence and UX sufficiently understood |
| 160 | RB-016 | CRT-18 | P2 | BLOCKED | Measure adoption and real-game outcomes | Dual-use | Builder and course materialization in use |

## Jira program

- Epic: `CRT-2` — Repertoire Builder north-star program, last known `In Progress`.
- Every existing RB task has exactly one mapped Jira Task.
- Repository task files remain the detailed scope and acceptance source.
- Jira is intended to track execution status, assignee, branch, pull request and active blockers while the Jira mirror remains in use.
- Important dependencies should be represented with Jira `Blocks` links as well as documented here.
- New RB tasks require a corresponding Jira issue only while Jira remains the approved execution mirror.
- `READY` repository tasks remain Jira `To Do` until claimed and substantive work begins.

Current connector clarification: the Atlassian/Rovo connector returns HTTP 403 with `The app is not installed on this instance`. Current Jira state therefore cannot be verified or changed from this session. See [`JIRA.md`](JIRA.md).

## Completed delivery

- Task: RB-001 / CRT-3
- PR: https://github.com/vokerg/chess_repertoir_trainer/pull/84
- Squash commit: `49dc6499eac9998de864ccb75a607541cd945382`
- Report: `reports/RB-001-2026-07-26-peer-population-presets.md`
- Validation: final PR-head CI run `30212157700` passed.

## Queue notes

### Delivered population direction

PR #84 provides:

- product speed presets: `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, `BULLET`;
- rating targets: all players, my peers, my peers plus one higher band, or one explicit group;
- exclusion of ultraBullet;
- server-controlled unrestricted public-game period with the existing 30-day cache lifecycle;
- active normalization profile `2026-07-lichess-bands-v1` aligned to Lichess Explorer groups;
- approximate Chess.com mappings into those benchmark bands;
- temporary recent-three-month/all-history/default peer resolution;
- direct response provenance for requested/effective populations;
- two compact frontend selects replacing raw month and checkbox controls.

The product deliberately accepts one combined Lichess response for the resolved speed/rating population. Per-speed decomposition and weighting remain rejected for the MVP.

### Existing average-rating direction

The imported-game summary already calculates `averageUserRating` for the applied filter using available game-recorded user ratings. This is a reusable descriptive metric across account, provider, speed and period filters.

It does not by itself define a provider-neutral player level when Chess.com and Lichess rows are mixed.

### Reconciled player-rating boundary

RB-002 is `READY`. It now owns the bounded composition of:

- the existing selected-game raw average;
- RB-001 provider/speed normalization and dominant-band resolution;
- visible source contributions, evidence quality, exclusions and conflicts;
- a reusable on-demand player-rating result.

Persistence is no longer presumed. A stored snapshot requires demonstrated product or performance need. Repertoire-specific manual overrides belong to RB-006.

### Independent work

RB-008 may continue visual discovery with verified Peer games responses and explicit mocks for unresolved player/profile evidence.

RB-014 can run as low-risk research without affecting core delivery.

### Critical path

```text
RB-001 peer population foundation — DONE
        ↓
RB-002 provider-aware player rating — READY
        +
RB-003 opening profile
        ↓
RB-004/005 player profile
        ↓
RB-006 target presets and overrides
        ↓
RB-007 candidate evidence/ranking
        +
RB-008 visual proof
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

- RB-001 remains order 10 and P0, `DONE`.
- RB-002 remains order 20 and P0, `READY` as the next actionable task.
- RB-002 scope is smaller: reuse existing raw-average and peer-band foundations; do not presume persistence.
- No other order or priority changes are required.
- No new RB task is required for the scope reconciliation.
- The execution-tracker choice requires clarification but does not change the product queue yet.

## Adding tasks

- Use the next unused `RB-###` ID.
- Never recycle or renumber an ID.
- Create a separate file under `tasks/` from the template.
- Create the corresponding execution-tracker item under the currently approved coordination system.
- Add order, priority, status, class and dependencies here.
- Add material dependency relationships in the execution tracker.
- Explain the queue and tracker impact in the report that created the task.

## Reprioritizing

A reprioritization update must state:

- evidence or dependency that changed;
- affected task orders and priorities;
- whether work in progress is disrupted;
- whether execution-tracker priorities, links or comments were updated;
- whether the roadmap also changes.
