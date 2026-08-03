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
- Coordinate one provider-neutral guarded-commit seam with ONB-019 without making ONB-019 an automatic hard dependency.

## In scope

- Fixed `since`/`until` window requests.
- Canonical Lichess `perfType` mapping.
- Streaming NDJSON with `AbortSignal`.
- Bounded normalization and duplicate-safe bulk-write batches.
- Duplicate-safe replay and exact empty-window coverage.
- Fail-current-window semantics for parse, persistence, or lifecycle-fence gaps.
- Exact counters/checkpoints.
- One short provider-neutral guarded-commit boundary immediately before persisted game/checkpoint writes.
- Provider fixtures and restart/cancel/fence-race tests.

Provider network, streaming, and normalization remain outside database transactions and lifecycle guards. ONB-013 may land before ONB-019 with an explicit allow-all guard implementation, but destructive safety remains incomplete until ONB-019 supplies persisted fence enforcement through the same seam.

## Out of scope

- Chess.com.
- Angular UI.
- Index/analysis orchestration.
- Lifecycle-operation persistence or destructive execution.
- ETA or unbenchmarked promises.

## Acceptance criteria

- Initial requests cannot scan older than the fixed recipe.
- Accepted scope maps to exact provider `perfType` values.
- Incomplete or lifecycle-fenced windows replay without duplicate rows or gaps.
- Empty streams advance coverage only after complete successful traversal.
- Cancellation or lifecycle fencing prevents stale completion.
- No provider/network work runs while holding the lifecycle guard.
- Exactly one guarded-commit seam exists for later ONB-019 integration.
- No per-game existence N+1 remains.
- Rows are visible after committed batches.

## Required validation

- Request-planner and `perfType` mapping tests.
- NDJSON fixture tests.
- Empty/duplicate/malformed/error tests.
- Restart/cancellation/fencing and lifecycle-fence-race tests.
- Bulk persistence and guarded-commit interface tests.
- Full API gates.

## Completion

Report: none

Completed at: none
