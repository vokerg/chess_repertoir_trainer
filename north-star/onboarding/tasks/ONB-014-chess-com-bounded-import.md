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

## In scope

- UTC range-to-month planning.
- Archive-index reconciliation.
- Serial monthly requests.
- Exact scope/range filtering.
- Retry-After/backoff/User-Agent/AbortSignal.
- Optional cache validators.
- Bounded duplicate-safe writes.
- Empty-month coverage and incomplete-month replay.
- Provider fixtures and restart/cancel tests.

## Out of scope

- Lichess.
- Angular UI.
- Index/analysis orchestration.
- Parallel archive fetching.

## Acceptance criteria

- Only intersecting months are requested.
- Forward and historical frontiers remain independent.
- Absent/empty months can become proved coverage.
- Failed listed archives never advance coverage.
- Provider access remains serial and retry-aware.
- Database writes are bounded and duplicate-safe.

## Required validation

- Month-planner tests across year boundaries.
- Empty/absent/archive inconsistency tests.
- 404/410/429/5xx tests.
- Exact epoch-second boundary tests.
- Restart/cancellation/duplicate tests.
- Full API gates.

## Completion

Report: none

Completed at: none
