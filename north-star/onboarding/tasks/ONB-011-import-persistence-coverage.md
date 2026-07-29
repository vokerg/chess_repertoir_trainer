# ONB-011 — Persist durable account-import runs and scope coverage

Status: PROPOSED

Priority: P0

Order: 110

Delivery class: Implementation

Planning maturity: Researched

GitHub issue: [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Provide the provider-neutral schema, shared contracts, migration, and repository boundary for durable account import and exact account/scope coverage.

## Dependencies

- ONB-002 accepted and merged.
- Consume ONB-004 active-work deletion protocol before destructive cutover.

## In scope

- Extend `ImportRun` with mode/source/scope/range/status/retry/checkpoint/claim/counter fields.
- Add `AccountImportCoverage` with exact contiguous half-open UTC interval semantics.
- Enforce one non-terminal import run per account.
- Add versioned scope hashing and check constraints.
- Preserve ownership/account cascades.
- Conservative legacy `syncCursorTime` migration.
- Shared Zod contracts and repository primitives.
- Focused migration, ownership, and concurrency tests.

## Out of scope

- Provider HTTP calls.
- Worker loop.
- Angular UI.
- Index/analysis orchestration.
- Final destructive delete/reset behavior.

## Acceptance criteria

- Initial, forward, and backfill modes are distinguishable.
- Empty ranges can be recorded as proved coverage.
- Forward and historical frontiers cannot overwrite each other.
- Active-run uniqueness is database-enforced.
- Migration does not invent legacy coverage.
- Reads/writes remain user/account scoped.

## Required validation

- Prisma migration apply/rollback assessment.
- Check/unique constraint integration tests.
- Concurrent create tests.
- Ownership and cascade tests.
- Contract build/tests.

## Completion

Report: none

Completed at: none
