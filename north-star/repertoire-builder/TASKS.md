# Repertoire Builder Task Queue

Last updated: 2026-07-26

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. Jira execution is governed by [`JIRA.md`](JIRA.md).

| Order | ID | Jira | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | CRT-3 | P0 | BLOCKED | Integrate speed/rating population evidence and weighting | Dual-use | Parallel explorer branch/PR must be identified |
| 20 | RB-002 | CRT-4 | P0 | BLOCKED | Define multi-account player level resolution | Dual-use | Rating normalization available on working base |
| 30 | RB-003 | CRT-5 | P0 | PROPOSED | Establish named opening classification foundation | Dual-use | Independent; planning intentionally blank |
| 40 | RB-008 | CRT-10 | P1 | READY | Prototype visual candidate and coverage choices | North-star | Foundation; may use explicit mock contracts |
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

- Epic: `CRT-2` — Repertoire Builder north-star program.
- Every existing RB task has exactly one Jira Task under the Epic.
- Jira tracks execution status, assignee, branch, pull request and active blockers.
- Repository task files remain the detailed scope and acceptance source.
- Important dependencies must be represented with Jira `Blocks` links as well as documented here.
- New RB tasks require a corresponding Jira issue in the same coordination change.

## Queue notes

### Immediate coordination blockers

RB-001 and RB-002 are high priority but must not duplicate parallel work or assume an unmerged contract. Their first action is repository, PR and Jira inspection.

### Independent work

RB-003 can be planned independently because opening classification was explicitly separated from this program's implementation design.

RB-008 can begin with realistic mock data to reduce visual risk, provided it does not lock production contracts prematurely.

RB-014 can run as low-risk research without affecting core delivery.

### Critical path

The current critical path is:

```text
RB-001 population evidence
        +
RB-002 player level
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