# Repertoire Builder Task Queue

Last updated: 2026-07-26

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. Jira execution is governed by [`JIRA.md`](JIRA.md).

| Order | ID | Jira | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | CRT-3 | P0 | READY | Integrate speed/rating population evidence and weighting | Dual-use | PR #80 merged; remaining weighting, provenance, component, and sparse-data semantics are unblocked; own-level/grade-offset slice depends on RB-002 |
| 20 | RB-002 | CRT-4 | P0 | READY | Define multi-account player level resolution | Dual-use | PR #76 merged; normalization profile and helpers available; multi-account formula remains |
| 30 | RB-003 | CRT-5 | P0 | PROPOSED | Establish named opening classification foundation | Dual-use | Independent; planning intentionally blank |
| 40 | RB-008 | CRT-10 | P1 | READY | Prototype visual candidate and coverage choices | North-star | Foundation; may use verified Peer games and rating-grade evidence plus explicit mock extensions |
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

- Epic: `CRT-2` — Repertoire Builder north-star program, `In Progress`.
- Every existing RB task has exactly one Jira Task under the Epic.
- Jira tracks execution status, assignee, branch, pull request and active blockers.
- Repository task files remain the detailed scope and acceptance source.
- Important dependencies must be represented with Jira `Blocks` links as well as documented here.
- New RB tasks require a corresponding Jira issue in the same coordination change.
- `READY` repository tasks remain Jira `To Do` until claimed and substantive work begins.

## Queue notes

### Population evidence baseline

PR #80 is merged to `main` and establishes the reusable rated Lichess evidence baseline:

- shared Opening Explorer API, contracts, cache, and source taxonomy;
- optional month, rating-group, and speed filters;
- arbitrary selected speed combinations supported by the upstream Lichess query;
- Peer games widget consumed by Opening Analysis;
- focused API, contract, repository, service, OpenAPI, store, and widget tests.

RB-001 is therefore `READY`, not `BLOCKED`. It is not `DONE`: controlled General weighting, explainable per-speed components, direct response-level filter provenance, own-level/grade-offset targeting, and sparse-data semantics remain.

### Rating normalization baseline

PR #76 is merged to `main` and establishes the reusable parity vocabulary:

- versioned profile ID and stable grade IDs;
- 13 product-facing grades;
- Chess.com and Lichess bullet, blitz, and rapid ranges;
- FIDE Standard as reference-only;
- source confidence and soft padding;
- one-rating classification and grade-to-source-range helpers;
- API exposure, lab reference table, tests, and canonical documentation.

RB-002 is therefore `READY`, not `BLOCKED`. It is not `DONE`: account inclusion, period/recency selection, activity weighting, same-provider account handling, per-speed/overall resolution, contribution evidence, confidence aggregation, exclusions, no-data/conflict behavior, and override projection remain.

### Actionable P0 work

RB-001 and RB-002 can now both be claimed independently for bounded slices. Coordinate their shared own-level population-targeting boundary:

- RB-002 owns factual player-level resolution and grade-offset source ranges;
- RB-001 owns application of a selected target to population evidence and explainable population aggregation.

Neither task should duplicate the merged `opening-explorer` or `rating-normalization` domains.

### Independent work

RB-003 can be planned independently because opening classification was explicitly separated from this program's implementation design.

RB-008 can begin with verified Peer games responses and rating-grade metadata plus explicit mock extensions for unresolved player-level, weighting, and component evidence. It must not treat current raw multi-speed aggregation or one-account classification as final product policy.

RB-014 can run as low-risk research without affecting core delivery.

### Critical path

The current critical path is:

```text
RB-001 population evidence (READY; partial foundation on main)
        +
RB-002 player level (READY; normalization foundation on main)
        +
RB-003 opening profile
        ↓
RB-004/005 player profile
        ↓
RB-006 target
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

## Completion assessment for PR #80 and PR #76

No RB task is moved to `DONE` by this reconciliation.

PR #80 satisfies a substantial subset of RB-001 but not its complete acceptance criteria or completion protocol.

PR #76 satisfies the prerequisite normalization domain and some primitive operations required by RB-002, but it does not resolve a player from multiple owned accounts and therefore does not satisfy RB-002's outcome or acceptance criteria.

No order or priority changes are recommended. The change is dependency/status only:

- RB-001 remains order 10, P0, `READY`;
- RB-002 remains order 20, P0, and changes from `BLOCKED` to `READY`;
- downstream dependency links and blocked states remain valid.

## Adding tasks

- Use the next unused `RB-###` ID.
- Never recycle or renumber an ID.
- Create a separate file under `tasks/` from the template.
- Create one Jira Task under `CRT-2` and record its key here.
- Add order, priority, status, class, and dependencies here.
- Add material Jira `Blocks` relationships.
- Explain the queue and Jira impact in the report that created the task.

## Reprioritizing

A reprioritization update must state:

- evidence or dependency that changed;
- affected task orders and priorities;
- whether work in progress is disrupted;
- whether Jira priority, links or comments were updated;
- whether the roadmap also changes.
