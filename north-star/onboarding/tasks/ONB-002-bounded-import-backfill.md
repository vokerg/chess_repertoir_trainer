# ONB-002 — Design bounded recent-first import and historical backfill

Status: REVIEW

Priority: P0

Order: 20

Delivery class: Research

Planning maturity: Researched

GitHub issue: [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149)

Claimed by: ChatGPT coding/research session for vokerg

Claim branch: `onb-002/issue-149-bounded-import-backfill`

Claimed at: 2026-07-29

Claim scope: re-inspect current Lichess/Chess.com provider import, route, schema, tests, worker/runtime, account deletion, and ONB-001 contracts; verify current provider APIs; produce the ONB-002 report; reconcile decisions/open questions/queue/status; allocate bounded implementation tasks; no production implementation

## Outcome

Define durable provider import modes and cursor/coverage invariants that support a recent bounded first import, normal forward sync, and resumable older-history backfill.

## Why this task exists

Current first sync runs inside HTTP and scans full available history when no cursor exists. One high-water timestamp cannot safely describe both current sync and historical coverage.

## Current repository anchors inspected

- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/services/externalAccountService.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/0002_imported_games/migration.sql`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `apps/api/src/worker.ts`
- `docs/imported-game-job-processing.md`
- current provider tests, account Angular flow, planning files, and official provider/API documentation

## Dependencies

- ONB-000 — complete.
- ONB-001 recipe/lifecycle — complete.
- Handoff decisions recorded for ONB-003, ONB-004, and ONB-007.

## Delivered decisions

- Extend existing `ImportRun` and add exact `AccountImportCoverage`.
- Use half-open UTC ranges and canonical scope hashes.
- Separate `BOUNDED_INITIAL`, `INCREMENTAL_FORWARD`, and `HISTORICAL_BACKFILL`.
- Enforce one non-terminal import run per account.
- Use a separate import claim loop in the existing worker deployment.
- Advance coverage only after complete/empty replayable provider windows.
- Fail/replay windows containing parse or persistence gaps.
- Use Lichess bounded streaming and Chess.com serial monthly archives.
- Use bounded duplicate-safe bulk writes.
- Hand preparation a database selection boundary, not ID arrays.
- Treat legacy cursors conservatively and replace raw cursor reset with explicit backfill/reset semantics.
- Assign one provider-neutral owner for rating-stat refresh.

## Acceptance criteria result

- Three-month import can be provider-bounded without full history: satisfied by the fixed range/window contract.
- Backfill cannot corrupt forward high-water: satisfied by independent `coveredFrom`/`coveredThrough` semantics.
- Interrupted work resumes without duplicates or silent gaps: satisfied by window replay, duplicate-safe writes, and no advancement across failure.
- API request lifetime is decoupled: satisfied by durable acceptance and worker claim lifecycle.
- Provider differences/no-game coverage are explicit: satisfied by adapter contracts and exact empty-window coverage.
- ONB-003 handoff is database/server-based and bounded: satisfied.
- Purge/account deletion interaction is defined at the import boundary and handed to ONB-004 for final acknowledged destructive protocol.

## Validation

Performed:

- direct repository inspection through GitHub;
- official Lichess, Chess.com, and Prisma contract verification;
- state-machine and cursor/coverage scenario walkthrough;
- failure/restart/cancel/delete/migration/expansion analysis;
- canonical document reconciliation;
- implementation issue allocation #199–#203.

Skipped because documentation-only:

- build;
- tests;
- lint;
- migrations;
- provider calls;
- worker/browser/load/deployment execution.

## Completion

Report: `../reports/ONB-002-2026-07-29-bounded-import-backfill.md`

Implementation tasks: ONB-011 through ONB-015 / issues #199 through #203

Pull request: [#204](https://github.com/vokerg/chess_repertoir_trainer/pull/204)

Completed at: pending review/merge
