# ONB-014 — Implement bounded Chess.com import adapter

Status: PROPOSED

Priority: P0

Order: 140

Delivery class: Implementation

Planning maturity: Researched; initial operational defaults supplied by ONB-007

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
- ONB-007 report for serial access, monthly units, 100-row writes, cache validators, telemetry, and canary budgets.

## In scope

- UTC range-to-calendar-month planning.
- Archive-index reconciliation.
- One provider request at a time.
- Serial monthly requests and explicit HTTP 429 retry state.
- Exact scope/range filtering.
- Retry-After/backoff/contact User-Agent/AbortSignal.
- `ETag` and `Last-Modified` validators where provider responses support them.
- Bounded duplicate-safe writes, initially 100 games per transaction.
- Empty-month coverage and incomplete-month replay.
- Aggregate request/parse/write/checkpoint timing without raw personal payloads.
- Provider fixtures, one low-volume canary, and restart/cancel tests.

## Out of scope

- Lichess.
- Angular UI.
- Index/analysis orchestration.
- Parallel archive fetching.
- Public ETA or unbenchmarked timing promise.

## Acceptance criteria

- Only intersecting calendar months are requested.
- Forward and historical frontiers remain independent.
- Absent/empty months can become proved coverage.
- Failed listed archives never advance coverage.
- Provider access remains serial, retry-aware, and cache-validator aware.
- Database writes are duplicate-safe and committed in 100-row-or-smaller batches.
- Metrics distinguish queue wait, archive discovery, provider response, parse, write, checkpoint, retry-at, and total month duration.
- One low-volume canary validates large-month memory, exact boundaries, caching, cancellation, and 429 behavior before general release.

## Required validation

- Month-planner tests across year boundaries.
- Empty/absent/archive inconsistency tests.
- 304/404/410/429/5xx tests.
- `ETag`/`Last-Modified` validator tests.
- Exact epoch-second boundary tests.
- Restart/cancellation/duplicate and 100-row write tests.
- Low-volume canary evidence; no provider load test.
- Full API gates.

## Completion

Report: none

Completed at: none
