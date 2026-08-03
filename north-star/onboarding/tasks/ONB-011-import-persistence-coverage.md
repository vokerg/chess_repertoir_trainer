# ONB-011 — Persist durable account-import runs and scope coverage

Status: PROPOSED

Priority: P0

Order: 110

Delivery class: Implementation

Planning maturity: Researched; operational persistence requirements supplied by ONB-007

GitHub issue: [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Provide the provider-neutral schema, shared contracts, migration, and repository boundary for durable account import and exact account/scope coverage.

## Dependencies

- ONB-002 accepted and merged.
- ONB-007 report for initial 100-row write configuration, fixed-window progress denominators, timing/queue telemetry, and no-public-ETA policy.
- Consume ONB-004 active-work deletion protocol before destructive cutover.
- Coordinate schema/migration edits with ONB-017 and ONB-019.

## In scope

- Extend `ImportRun` with mode/source/scope/range/status/retry/checkpoint/claim/counter fields.
- Add `AccountImportCoverage` with exact contiguous half-open UTC interval semantics.
- Enforce one non-terminal import run per account.
- Add versioned scope hashing and check constraints.
- Persist enough provider-window/archive plan state to expose a fixed denominator when the plan is known.
- Persist aggregate queue wait, provider request, parse, bounded-write, checkpoint, first/last progress, retry-at/rate-limit, heartbeat, and terminal duration facts without raw personal payloads.
- Support configurable duplicate-safe normalized write batches, initially 100 games per transaction; do not make 100 a schema invariant.
- Preserve ownership/account cascades.
- Conservative legacy `syncCursorTime` migration.
- Shared Zod contracts and repository primitives.
- Focused migration, ownership, telemetry-shape, and concurrency tests.

## Out of scope

- Provider HTTP calls.
- Worker loop.
- Angular UI.
- Index/analysis orchestration.
- Public ETA or weighted overall progress.
- Final destructive delete/reset behavior.

## Acceptance criteria

- Initial, forward, and backfill modes are distinguishable.
- Empty ranges can be recorded as proved coverage.
- Forward and historical frontiers cannot overwrite each other.
- Active-run uniqueness is database-enforced.
- Migration does not invent legacy coverage.
- Reads/writes remain user/account scoped.
- Known provider-window plans expose exact immutable counts; unknown streamed record totals do not fabricate percentages.
- Repository primitives support 100-row-or-smaller duplicate-safe writes and replay without per-game existence N+1.
- Operational timing/counter fields can drive ONB-007 stall/backlog diagnostics without retaining PGN, username, provider URL, token, or raw provider payload.

## Required validation

- Prisma migration apply/rollback assessment.
- Check/unique constraint integration tests.
- Concurrent create tests.
- Ownership and cascade tests.
- 100-row bounded write/replay tests and configuration override test.
- Fixed-window denominator and unknown-record-total progress tests.
- Telemetry privacy/shape tests.
- Contract build/tests.

## Completion

Report: none

Completed at: none
