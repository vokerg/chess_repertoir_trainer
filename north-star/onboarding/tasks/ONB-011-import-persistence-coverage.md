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
- Consume accepted ONB-004 purge/delete/import-history invariants.
- Coordinate Prisma schema, migration order, relations, and indexes with ONB-017 and ONB-019 before implementation.

## In scope

- Extend `ImportRun` with mode/source/scope/range/status/retry/checkpoint/claim/counter fields.
- Add `AccountImportCoverage` with exact contiguous half-open UTC interval semantics.
- Enforce one non-terminal import run per account.
- Add versioned scope hashing and database check constraints.
- Persist enough provider-window/archive plan state to expose a fixed denominator when the plan is known.
- Persist aggregate queue wait, provider request, parse, bounded-write, checkpoint, first/last progress, retry-at/rate-limit, heartbeat, and terminal duration facts without raw personal payloads.
- Support configurable duplicate-safe normalized write batches, initially 100 games per transaction; do not make 100 a schema invariant.
- Preserve ownership and account cascades.
- Conservative legacy `syncCursorTime` migration without invented coverage.
- Support a nullable current/latest `ImportRun` link from preparation without transferring import history ownership.
- Support ONB-004 semantics: account-data purge retains terminal import history while clearing authoritative coverage/current pointers/frontiers; audited account deletion may remove account-owned history through ONB-020.
- Shared Zod contracts and ownership-scoped repository primitives.
- Focused migration, ownership, telemetry-shape, constraint, cascade, purge-retention, and concurrency tests.

## Out of scope

- Provider HTTP calls.
- Worker loop and claim execution.
- Angular UI.
- Index/analysis orchestration.
- Public ETA or weighted overall progress.
- Lifecycle-operation/fence persistence owned by ONB-019.
- Destructive phase execution owned by ONB-020.

## Acceptance criteria

- Initial, forward, and backfill modes are distinguishable and immutable.
- Empty ranges can be recorded as proved coverage.
- Forward and historical frontiers cannot overwrite or jump across incomplete work.
- Active-run uniqueness and valid range/lifecycle combinations are database-enforced where practical.
- Migration does not invent legacy coverage.
- Reads/writes remain user/account scoped.
- Account-data purge can retain terminal execution history while clearing current coverage/frontiers.
- Known provider-window plans expose exact immutable counts; unknown streamed record totals do not fabricate percentages.
- Repository primitives support 100-row-or-smaller duplicate-safe writes and replay without per-game existence N+1.
- Operational timing/counter fields can drive ONB-007 stall/backlog diagnostics without retaining PGN, username, provider URL, token, or raw provider payload.
- Existing imported-game `JobRun`/`JobTask` behavior is unchanged.
- Schema and migration ownership is explicitly reconciled with ONB-017 and ONB-019 before the implementation branch is claimed.

## Required validation

- Prisma format/generate and migration apply/rollback assessment.
- Check/unique constraint integration tests.
- Concurrent create tests.
- Ownership, cascade, and purge-retention tests.
- Coverage-boundary tests.
- 100-row bounded write/replay tests and configuration override test.
- Fixed-window denominator and unknown-record-total progress tests.
- Telemetry privacy/shape tests.
- Contract build/tests.
- Full API, architecture, and migration gates.

## Completion

Report: none

Completed at: none
