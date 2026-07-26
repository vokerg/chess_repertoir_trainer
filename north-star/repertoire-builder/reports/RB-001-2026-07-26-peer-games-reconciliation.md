# RB-001 reconciliation report — merged Peer games foundation

Date: 2026-07-26

Task: `RB-001`

Jira: `CRT-3`

Branch: `north-star/rb-001-peer-games-reconciliation`

Target branch: `main`

This is a status and dependency reconciliation report, not an RB-001 completion report.

## Purpose

Reconcile the Repertoire Builder north-star plan and Jira execution mirror after the rated Lichess Peer games integration merged to `main` through PR #80.

The reconciliation determines which RB-001 acceptance criteria are already delivered, which remain, whether the task is still blocked, and whether any Jira issue qualifies for completion.

## Delivered by the merged baseline

PR #80 delivers:

- shared Opening Explorer backend ownership;
- separate Masters and rated Lichess public endpoints and source identities;
- rated position evidence filtered by optional month range, rating groups, and selected speeds;
- arbitrary non-empty combinations of upstream Lichess speed buckets;
- shared API/web contracts for position, move, dataset, and cache evidence;
- source-wide normalized-position caching with stale fallback, request deduplication, throttling, and 429 backoff;
- Fastify route schemas and OpenAPI coverage;
- focused contract, client, service, repository, route, store, and widget tests;
- a reusable Peer games Angular widget consumed by Opening Analysis;
- canonical implementation documentation in `docs/opening-explorer.md`.

## Intentionally not credited as complete

PR #80 does not deliver all RB-001 requirements:

- no controlled product-level General weighting;
- no explicit weighting model for combined speeds;
- no per-speed component evidence behind the raw combined result;
- no normalized-grade target mapping;
- no direct response-level echo/provenance for selected month, rating, and speed filters;
- no explicit sparse or unsupported-bucket policy;
- no RB-001 completion report or final validation covering those remaining semantics.

The raw Lichess aggregate is useful evidence, but it is not equivalent to the north-star's controlled General policy.

## Files and architecture areas

### Inspected

- `apps/api/src/modules/opening-explorer/opening-explorer.routes.ts`
- `packages/contracts/src/opening-explorer/opening-explorer.schemas.ts`
- `docs/opening-explorer.md`
- PR #80 changed-file list
- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/DECISIONS.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/JIRA.md`
- `north-star/repertoire-builder/tasks/RB-001-population-evidence.md`
- Jira Epic `CRT-2` and Tasks `CRT-3` through `CRT-18`, including all returned fields

### Changed

- `north-star/repertoire-builder/STATUS.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/ROADMAP.md`
- `north-star/repertoire-builder/OPEN_QUESTIONS.md`
- `north-star/repertoire-builder/tasks/RB-001-population-evidence.md`
- this reconciliation report
- Jira `CRT-2` description, labels, and status
- Jira `CRT-3` description and labels

No runtime application code changed in this reconciliation.

## Acceptance assessment

| RB-001 criterion | Assessment after PR #80 |
| --- | --- |
| Query one speed | Delivered |
| Query a multi-speed combination | Delivered as one raw Lichess aggregate |
| Distinct Masters evidence | Delivered |
| Opening Analysis consumer without builder imports | Delivered |
| Shared workspace contracts | Delivered |
| Fastify/OpenAPI schemas | Delivered |
| Source identity, W/D/L, SAN/UCI, cache metadata | Delivered |
| Controlled General policy | Missing |
| Explicit combined-speed weighting | Missing |
| Explainable per-speed components | Missing |
| Direct selected-filter provenance in response | Missing |
| Normalized-grade targeting | Missing; depends on RB-002 semantics |
| Sparse/missing/unsupported policy | Incomplete |
| Focused tests for remaining semantics | Missing |

## Status decision

RB-001 changes from `BLOCKED` to `READY`.

Rationale:

- the parallel implementation is identified and merged;
- its contract, source limits, cache behavior, supported filters, tests, documentation, and Angular consumer are inspectable on `main`;
- the remaining weighting, provenance, component, and sparse-data work can start without duplicating the explorer;
- only the normalized-grade slice remains dependent on RB-002.

RB-001 is not moved to `DONE` because material acceptance criteria and the completion protocol remain unmet.

## Jira synchronization

- `CRT-2` moved from `To Do` to `In Progress` because the program now has merged runtime foundation work and an active implementation queue.
- `CRT-2` description and labels now record PR #80, PR #81, the current program state, and the remaining RB-001 gaps.
- `CRT-3` remains `To Do`, matching repository state `READY` and the absence of an active claim.
- `CRT-3` description and labels now record the exact merged implementation, remaining scope, dependencies, and status rationale.
- `CRT-3` retains Highest priority, parent `CRT-2`, existing dependency links, reporter, and unassigned state.
- `CRT-4` through `CRT-18` remain unchanged after full-field inspection because PR #80 does not satisfy their task outcomes.
- No Jira issue moved to `Done`.

## Decisions and evidence

Existing decision RB-D005 remains valid: target speed selection is combinable.

Existing decision RB-D006 remains valid and is not satisfied merely by the upstream raw aggregate: General mode must use controlled, explicit weighting.

Existing decision RB-D007 remains open: the exact weighting formula still requires evidence.

No new locked product or architecture decision is introduced by this reconciliation.

## Validation

### Performed

- inspected merged PR #80 metadata and changed-file list;
- inspected the current shared contracts, route registration, OpenAPI metadata, implementation documentation, and product consumer;
- compared implementation evidence against every RB-001 acceptance criterion;
- inspected all fields returned for `CRT-2` through `CRT-18`;
- verified available Jira workflow transitions before changing `CRT-2`;
- reconciled repository status, queue, roadmap, open questions, task scope, and Jira descriptions.

### Skipped

- application build;
- test execution;
- lint;
- architecture checks;
- browser validation.

These were skipped because this reconciliation changes planning and Jira metadata only. It does not modify PR #80's runtime implementation.

## Limitations and residual risks

- Lichess can aggregate selected speeds upstream, but the result cannot explain each speed's contribution.
- Current response dataset metadata exposes a profile version rather than the selected filter values directly.
- Adding component evidence may require separate source calls and therefore changes to cache profile and throttling considerations.
- Normalized-grade mapping remains coupled to unresolved multi-account/player-level work.
- Sparse buckets could distort a weighted result unless sample and fallback rules are explicit.

## Standalone product impact

The merged Peer games widget already improves Opening Analysis independently of the future builder. Completing RB-001 should strengthen that existing feature by making combined populations explainable and reproducible.

## North-star impact

The primary Stage 1 population dependency is now actionable. Downstream target and candidate-ranking work remains blocked until the remaining RB-001 semantics, RB-002, and RB-003 are available.

## New tasks proposed

None. The remaining work fits the existing RB-001 scope.

## Queue assessment

Reprioritization is limited to status/dependency state:

- RB-001 remains order 10 and P0;
- RB-001 changes from `BLOCKED` to `READY`;
- RB-002 remains order 20 and P0;
- no other order or priority changes are recommended;
- RB-008 may use verified Peer games data earlier but retains its existing order and priority.

## Planning documents updated

- `STATUS.md` — records merged foundation, current Jira state, remaining gaps, and next coordination.
- `TASKS.md` — changes RB-001 to `READY` and updates queue/critical-path notes.
- `ROADMAP.md` — marks Stage 0 complete on `main` and Stage 1 active with partial population delivery.
- `OPEN_QUESTIONS.md` — separates resolved PR #80 facts from remaining weighting/provenance questions.
- `tasks/RB-001-population-evidence.md` — replaces the discovery blocker with the verified implementation baseline and remaining acceptance criteria.

`DECISIONS.md` was inspected but not changed because PR #80 does not resolve the exact weighting decision.

## Recommended next checkpoint

Claim RB-001 / CRT-3 for a bounded design and implementation slice covering direct filter provenance, controlled combined-speed weighting, component explainability, and sparse-data behavior. Keep normalized-grade mapping as a coordinated slice with RB-002 rather than blocking all RB-001 progress.
