# ONB-013 — Implement bounded Lichess import adapter

Status: PROPOSED

Priority: P0

Order: 130

Delivery class: Implementation

Planning maturity: Researched

GitHub issue: [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Provide a restartable, cancellable, bounded Lichess NDJSON adapter that advances exact scope coverage only after complete provider windows.

## Dependencies

- ONB-011.
- ONB-012.
- ONB-007 for final window/batch configuration.

## In scope

- Fixed `since`/`until` window requests.
- Canonical Lichess `perfType` mapping.
- Streaming NDJSON with `AbortSignal`.
- Bounded normalization/write batches.
- Duplicate-safe replay.
- Empty-window coverage.
- Fail-current-window semantics for parse/persistence gaps.
- Exact counters/checkpoints.
- Provider fixtures and restart/cancel tests.

## Out of scope

- Chess.com.
- Angular UI.
- Index/analysis orchestration.
- ETA or unbenchmarked promises.

## Acceptance criteria

- Initial requests cannot scan older than the fixed recipe.
- Incomplete windows replay without duplicate rows or gaps.
- Empty streams advance coverage.
- Cancellation prevents stale completion.
- No per-game existence N+1 remains.
- Rows are visible after committed batches.

## Required validation

- Request-planner tests.
- NDJSON fixture tests.
- Empty/duplicate/malformed/error tests.
- Restart/cancellation/fencing tests.
- Bulk persistence tests.
- Full API gates.

## Completion

Report: none

Completed at: none
