# ONB-011 — Persist durable account-import runs and scope coverage

Status: IN_PROGRESS

Priority: P0

Order: 110

Delivery class: Implementation

Planning maturity: Researched; operational persistence requirements supplied by ONB-007; ONB-017/ONB-019 schema ownership reconciled on 2026-08-10

GitHub issue: [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199)

Claimed by: ChatGPT / onboarding recovery session

Claim branch: `onb-011/issue-199-import-persistence-coverage`

Claimed at: 2026-08-10

Claim scope: durable `ImportRun` evolution, `AccountImportCoverage`, canonical scope hashing/contracts, ownership-scoped repository primitives, focused migration/tests, and schema handoff documentation; no worker/provider/UI/destructive execution

## Outcome

Provide the provider-neutral schema, shared contracts, migration, and repository boundary for durable account import and exact account/scope coverage.

## Dependencies

- ONB-002 accepted and merged.
- ONB-007 report for initial 100-row write configuration, fixed-window progress denominators, timing/queue telemetry, and no-public-ETA policy.
- Consume accepted ONB-004 purge/delete/import-history invariants.
- Coordinate Prisma schema, migration order, relations, and indexes with ONB-017 and ONB-019 before implementation.

## Resolved schema coordination

The 2026-08-10 current-main inspection resolves the former coordination gate without creating a completion dependency between ONB-011 and ONB-019:

- ONB-017 already owns `DataPreparationTarget.currentImportRunId` / `currentImportRun` with `onDelete: SetNull`; ONB-011 preserves that relation and keeps retry/checkpoint/coverage authority on `ImportRun`/`AccountImportCoverage`.
- ONB-011 owns changes to the existing `ImportRun` model, the new `AccountImportCoverage` model, their account/user relations and indexes, canonical import scope semantics, and the ONB-011 migration.
- ONB-019 owns new destructive lifecycle operation, resource-fence, mutation-audit, opening-provenance, and deleted-identity persistence. It must integrate through ONB-011 admission/guard seams later rather than adding competing import lifecycle or coverage fields.
- ONB-011 does not add lifecycle-fence persistence or claim destructive safety. It leaves a stable admission seam for ONB-019 and exact active-claim/drain queries for ONB-020/ONB-012 integration.
- Active PRs #335, #337 and #338 were collision-checked before claim; none changes Prisma, onboarding task records, or the account-import module boundary.

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
