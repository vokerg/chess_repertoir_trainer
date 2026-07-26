# Repertoire Builder Task Queue

Last updated: 2026-07-26

This is the canonical ordered queue. IDs are immutable; `Order` and `Priority` may change through reviewed updates.

Normal claim metadata lives in the individual task file to reduce conflicts between parallel agents. Jira execution is governed by [`JIRA.md`](JIRA.md).

| Order | ID | Jira | Priority | Status | Task | Delivery class | Primary dependencies |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 10 | RB-001 | CRT-3 | P0 | READY | Deliver Lichess-aligned peer population presets | Dual-use | PR #80 and PR #76 merged; compact presets, benchmark-band migration and peer resolver are actionable |
| 20 | RB-002 | CRT-4 | P0 | BLOCKED | Define multi-account player level resolution | Dual-use | Depends on RB-001 Lichess-benchmark profile and shared peer-resolver boundary |
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

- Epic: `CRT-2` — Repertoire Builder north-star program, `In Progress`.
- Every existing RB task has exactly one Jira Task under the Epic.
- Jira tracks execution status, assignee, branch, pull request and active blockers.
- Repository task files remain the detailed scope and acceptance source.
- Important dependencies must be represented with Jira `Blocks` links as well as documented here.
- New RB tasks require a corresponding Jira issue in the same coordination change.
- `READY` repository tasks remain Jira `To Do` until claimed and substantive work begins.

## Queue notes

### Revised population direction

PR #80 remains the reusable rated Lichess evidence baseline:

- shared Opening Explorer API, contracts, cache and source taxonomy;
- one mixed upstream query and one mixed cached snapshot per canonical filter profile;
- Peer games widget consumed by Opening Analysis;
- focused API, contract, repository, service, OpenAPI, store and widget tests.

RB-001 no longer introduces separate per-speed calls, client-side weighting or editable combinations. It now owns:

- product speed presets: `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, `BULLET`;
- rating targets: all players, my peers, my peers plus one higher band, or one explicit group;
- exclusion of ultraBullet;
- server-controlled public-game period with the existing approximately monthly cache lifecycle;
- a new versioned rating-normalization profile aligned to Lichess Explorer groups;
- Chess.com mappings into those benchmark bands;
- a temporary recent-three-month/all-history/default peer-band resolver;
- direct response provenance for the resolved target;
- two compact frontend dropdowns replacing raw month and checkbox filters.

The product deliberately accepts one combined Lichess response for the resolved speed/rating population. Per-speed decomposition and weighting are not required for the north-star MVP.

### Player-level boundary

RB-002 is now `BLOCKED` on the profile/resolver boundary delivered by RB-001. It owns the later durable multi-account projection, persistence/snapshot decision, confidence, exclusions and overrides. It must reuse the RB-001 resolver rather than create a second level formula.

### Rating normalization migration

PR #76 remains the current runtime foundation and historical calibration source. RB-001 must introduce a new profile version rather than silently mutate `2026-07-product-v1`.

The new canonical peer bands are the nine Lichess Explorer groups. Lichess ratings classify directly; Chess.com bullet, blitz and rapid receive versioned approximate ranges into the same bands.

### Actionable P0 work

RB-001 is the next P0 task and should be claimed first.

RB-002 should not begin implementation until the new benchmark profile and shared resolver boundary are available. RB-003 remains independent.

### Independent work

RB-008 may continue visual discovery with verified Peer games responses and explicit mock target presets. It must not assume the current checkbox UI or arbitrary speed combinations are final.

RB-014 can run as low-risk research without affecting core delivery.

### Critical path

```text
RB-001 peer presets + benchmark bands + temporary resolver
        ↓
RB-002 durable player level
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

- RB-001 remains order 10, P0 and `READY`, but its title and delivery scope are revised.
- RB-002 remains order 20 and P0, and changes from `READY` to `BLOCKED` on RB-001's benchmark profile/resolver contract.
- RB-006 must use fixed speed presets and peer-rating targets rather than arbitrary weighted combinations.
- No other order or priority changes are required.
- Jira descriptions and the material CRT-3 → CRT-4 dependency must be synchronized.

## Adding tasks

- Use the next unused `RB-###` ID.
- Never recycle or renumber an ID.
- Create a separate file under `tasks/` from the template.
- Create one Jira Task under `CRT-2` and record its key here.
- Add order, priority, status, class and dependencies here.
- Add material Jira `Blocks` relationships.
- Explain the queue and Jira impact in the report that created the task.

## Reprioritizing

A reprioritization update must state:

- evidence or dependency that changed;
- affected task orders and priorities;
- whether work in progress is disrupted;
- whether Jira priority, links or comments were updated;
- whether the roadmap also changes.
