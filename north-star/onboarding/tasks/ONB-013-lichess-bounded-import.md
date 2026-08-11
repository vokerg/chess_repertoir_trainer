# ONB-013 — Implement bounded Lichess import adapter

Status: READY

Priority: P0

Order: 130

Delivery class: Implementation

Planning maturity: Researched; initial operational defaults supplied by ONB-007

GitHub issue: [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

Promoted at: 2026-08-11 after ONB-012 runtime merge and completion reconciliation PR #354

## Outcome

Provide a restartable, cancellable, bounded Lichess NDJSON adapter that advances exact scope coverage only after complete provider windows.

## Dependencies

- ONB-011.
- ONB-012.
- ONB-007 report for initial 14-day windows, 100-row writes, serial access, telemetry, stall, and canary budgets.
- Coordinate one provider-neutral guarded-commit seam with ONB-019 without making ONB-019 an automatic hard dependency.

## In scope

- Fixed half-open `since`/`until` windows, initially 14 days.
- Canonical Lichess `perfType` mapping.
- One provider request at a time; full-minute retry cooldown after HTTP 429.
- Streaming NDJSON with `AbortSignal`.
- Bounded normalization and duplicate-safe bulk-write batches, initially 100 games.
- Progressive committed-row visibility before window completion.
- Duplicate-safe replay and exact empty-window coverage.
- Fail-current-window semantics for parse, persistence, or lifecycle-fence gaps.
- Exact counters/checkpoints and aggregate provider/request/parse/write timing.
- One short provider-neutral guarded-commit boundary immediately before persisted game/checkpoint writes.
- Provider fixtures, one low-volume canary, and restart/cancel/fence-race tests.

Provider network, streaming, and normalization remain outside database transactions and lifecycle guards. ONB-013 may land before ONB-019 with an explicit allow-all guard implementation, but destructive safety remains incomplete until ONB-019 supplies persisted fence enforcement through the same seam.

## Out of scope

- Chess.com.
- Angular UI.
- Index/analysis orchestration.
- Lifecycle-operation persistence or destructive execution.
- Parallel Lichess requests.
- Public ETA or unbenchmarked timing promise.

## Acceptance criteria

- Initial requests cannot scan older than the fixed recipe.
- Accepted scope maps to exact provider `perfType` values.
- Default request planning uses replayable 14-day units and remains configurable.
- Incomplete, rate-limited, cancelled, or lifecycle-fenced windows replay without duplicate rows or gaps.
- Empty streams advance coverage only after complete successful traversal.
- Cancellation or lifecycle fencing prevents stale completion.
- No provider/network work runs while holding the lifecycle guard.
- Exactly one guarded-commit seam exists for ONB-019 integration.
- No per-game existence N+1 remains.
- Rows are visible after committed 100-row-or-smaller batches.
- Metrics distinguish queue wait, provider response, parse, write, checkpoint, retry-at, and total window duration without raw personal payloads.
- One low-volume canary validates memory, range boundaries, cancellation, and 429 behavior before general release.

## Required validation

- Request-planner, half-open 14-day boundary, and `perfType` mapping tests.
- NDJSON fixture tests.
- Empty/duplicate/malformed/error tests.
- Restart/cancellation/fencing, guarded-commit, and rate-limit retry tests.
- 100-row bounded bulk persistence tests.
- Low-volume canary evidence; no provider load test.
- Full API gates.

## Completion

Report: none

Completed at: none
