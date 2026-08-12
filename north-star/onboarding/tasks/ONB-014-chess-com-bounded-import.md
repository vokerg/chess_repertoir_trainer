# ONB-014 — Implement bounded Chess.com import adapter

Status: IN_PROGRESS

Priority: P0

Order: 140

Delivery class: Implementation

Planning maturity: Researched; initial operational defaults supplied by ONB-007

GitHub issue: [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202)

Target branch: `main`

Claimed branch: `account-import/onb-014-chess-com-adapter`

Pull request: pending

Claimed by: ChatGPT / account-import implementation session

Claimed at: 2026-08-12

Claim scope: bounded Chess.com calendar-month planning and serial archive traversal, cancellation-aware retry/backoff and validators, shared normalization, provider-neutral guarded batch/window commits, exact checkpoint/coverage progression, worker registration, provider fixtures/canary harness, and focused tests; no Lichess, Angular, account-route cutover, ONB-019 persistence, destructive execution, or preparation orchestration

Promoted at: 2026-08-11 after ONB-012 runtime merge and completion reconciliation PR #354

## Outcome

Provide a serial, restartable, cancellable Chess.com monthly adapter that distinguishes exact empty months from failed/unavailable archives and advances coverage conservatively.

## Dependencies

- ONB-011.
- ONB-012.
- ONB-007 report for serial access, monthly units, 100-row writes, cache validators, telemetry, and canary budgets.
- Coordinate one provider-neutral guarded-commit seam with ONB-019 without making ONB-019 an automatic hard dependency.

## In scope

- UTC range-to-calendar-month and exact epoch-second boundary planning.
- Archive-index reconciliation.
- One provider request at a time.
- Serial monthly requests and explicit HTTP 429 retry state.
- Exact scope/range filtering.
- Retry-After/backoff/contact User-Agent/AbortSignal.
- `ETag` and `Last-Modified` validators where provider responses support them.
- Bounded duplicate-safe writes, initially 100 games per transaction.
- Empty-month coverage and incomplete-month replay.
- Aggregate request/parse/write/checkpoint timing without raw personal payloads.
- One short provider-neutral guarded-commit boundary immediately before persisted game/checkpoint writes.
- Provider fixtures, one low-volume canary, and restart/cancel/fence-race tests.

Provider network, retry delays, parsing, and normalization remain outside database transactions and lifecycle guards. ONB-014 may land before ONB-019 with an explicit allow-all guard implementation, but destructive safety remains incomplete until ONB-019 supplies persisted fence enforcement through the same seam.

## Out of scope

- Lichess.
- Angular UI.
- Index/analysis orchestration.
- Lifecycle-operation persistence or destructive execution.
- Parallel archive fetching.
- Public ETA or unbenchmarked timing promise.

## Acceptance criteria

- Only intersecting calendar months are requested.
- Exact epoch-second filtering excludes games outside the accepted half-open range.
- Forward and historical frontiers remain independent.
- Absent/empty months become proved coverage only after complete successful traversal.
- Failed, partial, or lifecycle-fenced listed archives never advance coverage.
- Provider access remains serial, retry-aware, and cache-validator aware.
- Cancellation or lifecycle fencing prevents stale completion.
- No provider/network work runs while holding the lifecycle guard.
- Exactly one guarded-commit seam exists for ONB-019 integration.
- Database writes are duplicate-safe and committed in 100-row-or-smaller batches.
- Metrics distinguish queue wait, archive discovery, provider response, parse, write, checkpoint, retry-at, and total month duration.
- One low-volume canary validates large-month memory, exact boundaries, caching, cancellation, and 429 behavior before general release.

## Required validation

- Month-planner tests across year boundaries.
- Empty/absent/archive inconsistency tests.
- 304/404/410/429/5xx, Retry-After, User-Agent, and cache-validator tests where applicable.
- `ETag`/`Last-Modified` validator tests.
- Exact epoch-second boundary tests.
- Restart/cancellation/duplicate and lifecycle-fence-race tests.
- 100-row bounded bulk persistence and guarded-commit interface tests.
- Low-volume canary evidence; no provider load test.
- Full API gates.

## Completion

Report: `reports/ONB-014-2026-08-12-chess-com-bounded-import.md` (implementation evidence in progress)

Completed at: none
