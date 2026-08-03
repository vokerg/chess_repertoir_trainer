# ONB-014 — Implement bounded Chess.com import adapter

Status: PROPOSED

Priority: P0

Order: 140

Delivery class: Implementation

Planning maturity: Researched

GitHub issue: [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Provide a serial, restartable, cancellable Chess.com monthly adapter that distinguishes exact empty months from failed/unavailable archives and advances coverage conservatively.

## Dependencies

- ONB-011.
- ONB-012.
- ONB-007 for final batch configuration.
- Coordinate one provider-neutral guarded-commit seam with ONB-019 without making ONB-019 an automatic hard dependency.

## In scope

- UTC range-to-month and exact epoch-second boundary planning.
- Archive-index reconciliation.
- Serial monthly requests.
- Exact scope/range filtering.
- Retry-After/backoff/User-Agent/AbortSignal.
- Optional cache validators.
- Bounded duplicate-safe bulk writes.
- Empty-month coverage and incomplete-month replay.
- One short provider-neutral guarded-commit boundary immediately before persisted game/checkpoint writes.
- Provider fixtures and restart/cancel/fence-race tests.

Provider network, retry delays, parsing, and normalization remain outside database transactions and lifecycle guards. ONB-014 may land before ONB-019 with an explicit allow-all guard implementation, but destructive safety remains incomplete until ONB-019 supplies persisted fence enforcement through the same seam.

## Out of scope

- Lichess.
- Angular UI.
- Index/analysis orchestration.
- Lifecycle-operation persistence or destructive execution.
- Parallel archive fetching.

## Acceptance criteria

- Only intersecting months are requested.
- Exact epoch-second filtering excludes games outside the accepted half-open range.
- Forward and historical frontiers remain independent.
- Absent/empty months become proved coverage only after complete successful traversal.
- Failed, partial, or lifecycle-fenced listed archives never advance coverage.
- Provider access remains serial and retry-aware.
- Cancellation or lifecycle fencing prevents stale completion.
- No provider/network work runs while holding the lifecycle guard.
- Exactly one guarded-commit seam exists for later ONB-019 integration.
- Database writes are bounded and duplicate-safe.

## Required validation

- Month-planner tests across year boundaries.
- Empty/absent/archive inconsistency tests.
- 404/410/429/5xx, Retry-After, User-Agent, and cache-validator tests where applicable.
- Exact epoch-second boundary tests.
- Restart/cancellation/duplicate and lifecycle-fence-race tests.
- Bulk persistence and guarded-commit interface tests.
- Full API gates.

## Completion

Report: none

Completed at: none
