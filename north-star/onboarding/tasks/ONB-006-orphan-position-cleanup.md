# ONB-006 — Design database-only orphan shared-position cleanup

Status: READY

Priority: P1

Order: 70

Delivery class: Research

Planning maturity: Outlined

GitHub issue: [#153](https://github.com/vokerg/chess_repertoir_trainer/issues/153)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Define a bounded, auditable database maintenance operation that removes shared Position rows only when no imported-game ply references them.

## Why this task exists

Account/game deletion intentionally leaves reusable shared positions and analysis. Without a separate cleanup path, unique positions can accumulate indefinitely. The cleanup must not confuse shared Position data with course MoveNode trees.

## Current repository anchors to inspect

- `apps/api/prisma/schema.prisma`
- migrations affecting `Position`, `PositionAnalysis`, `ImportedGamePly`, and opening-explorer caches
- indexing repositories/services that create Position references
- analysis services that read/write Position analysis
- deployment/runtime and admin action patterns produced by ONB-005
- PostgreSQL integration-test infrastructure

## Dependencies

- ONB-000.
- Coordinate retained-data semantics with ONB-004.
- Coordinate action/audit shape with ONB-005.

## In scope

- Exact orphan predicate and dependent-row inventory.
- Grace-period policy.
- Database query, batching, ordering, locking, and retry alternatives.
- Concurrency behavior with indexing and analysis.
- Dry-run, progress, cancellation, result, and audit contract.
- Manual-first versus scheduled-maintenance decision boundary.
- Performance validation plan.
- Bounded implementation task proposal.

## Out of scope

- Production deletion.
- Course `MoveNode` cleanup.
- Client-provided bulk ID deletion.
- Automatic recurring scheduling before manual behavior is validated.

## Questions owned

See `OPEN_QUESTIONS.md` under ONB-006.

## Acceptance criteria

- Only Position rows with zero imported-game-ply references are eligible.
- Concurrent indexing cannot cause referenced data to be deleted.
- Work is bounded, resumable, and database-driven.
- Dry-run and execution share one eligibility rule.
- Cascaded dependent data and retained data are explicit.
- Course trees are explicitly excluded.
- Follow-up implementation tasks are narrow.

## Required validation

- Reinspect every Position relation in current schema.
- Compare Prisma and explicit SQL options.
- Design concurrency tests with simultaneous indexing.
- Establish representative candidate-volume/performance checks.
- Verify operation behavior under cancellation and retry.

## Completion updates

- Report, decisions, open questions, queue, issue #153, and implementation tasks.

## Completion

Report: none

Completed at: none
