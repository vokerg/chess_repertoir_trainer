# ONB-002 — Design bounded recent-first import and historical backfill

Status: READY

Priority: P0

Order: 20

Delivery class: Research

Planning maturity: Outlined

GitHub issue: [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Define durable provider import modes and cursor/coverage invariants that support a recent bounded first import, normal forward sync, and resumable older-history backfill.

## Why this task exists

Current first sync runs inside HTTP and scans full available history when no cursor exists. One high-water timestamp cannot safely describe both current sync and historical coverage.

## Current repository anchors to inspect

- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/services/externalAccountService.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/jobs/`
- `docs/imported-game-job-processing.md`
- provider fixtures/tests and latest migrations

## Dependencies

- ONB-000.
- Consume ONB-001 recipe decisions when available.
- Coordinate purge/delete semantics with ONB-004.

## In scope

- BOUNDED_INITIAL, INCREMENTAL_FORWARD, and HISTORICAL_BACKFILL semantics.
- Provider-specific continuation/checkpoint design.
- Persistence alternatives and recommendation.
- Worker/runtime placement.
- API command/status outline.
- Idempotency, retry, cancellation, partial coverage, duplicate suppression.
- Database write strategy and migration compatibility.
- Implementation task proposal.

## Out of scope

- Production schema or provider changes.
- Imported-game indexing/analysis orchestration.
- Generic workflow infrastructure.

## Questions owned

See `OPEN_QUESTIONS.md` under ONB-002.

## Acceptance criteria

- Three-month import does not scan all history.
- Backfill cannot corrupt forward high-water state.
- Interrupted work resumes without duplicates or silent gaps.
- API request lifetime is decoupled from provider traversal.
- Provider differences and no-game coverage are explicit.
- Handoff to ONB-003 is database/server-based and bounded.
- Purge/account deletion interaction is defined.

## Required validation

- Reinspect current provider and schema code.
- Verify provider request/response assumptions against current official documentation where needed.
- Exercise cursor scenarios with fixtures.
- Compare schema alternatives and migration/backward-compatibility impact.

## Completion updates

- Report, decisions, open questions, queue, issue #149, and bounded implementation tasks.

## Completion

Report: none

Completed at: none
