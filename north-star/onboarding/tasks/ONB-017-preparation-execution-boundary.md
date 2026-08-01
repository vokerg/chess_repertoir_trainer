# ONB-017 — Persist preparation execution boundary and bounded child-job batches

Status: PROPOSED

Priority: P0

Order: 77

Delivery class: Implementation

Planning maturity: Allocated by ONB-003; blocked on ONB-003 acceptance

GitHub issue: [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Add the minimal PostgreSQL-backed preparation execution model approved by ONB-003 and the transactional server-side boundary that selects eligible games and creates bounded `ONBOARDING` child jobs without browser-supplied ID arrays.

## Why this task exists

ONB-008 owns user disposition and the public readiness projection, while ONB-009 owns authenticated lifecycle commands. Neither should also decide or implement the physical child-job execution boundary. This task establishes the durable preparation parent, ordered account targets, retained batch history, database-side selection, and bounded child-job creation consumed by both.

## Dependencies

- ONB-003 / #150 accepted orchestration contract.
- Coordinate the current/latest import-run link with ONB-011 / #199.
- Consumed by ONB-018 / #254 and ONB-008 / #193.
- ONB-007 / #154 may tune numeric defaults without changing the model.

## In scope

- Shared internal preparation lifecycle, purpose, attention, stage, and lane types.
- `DataPreparationRun`, ordered account target, and preparation batch persistence.
- Immutable recipe/scope/range snapshot owned by the run/target boundary.
- One non-terminal run per user through a PostgreSQL partial unique index.
- At most one non-terminal index batch and one non-terminal analysis batch per run.
- Nullable links to current import runs and child `JobRun` rows.
- Terminal batch snapshots that survive child dismissal or retention deletion.
- Database-side candidate selection by ownership, account, immutable scope/range, current evidence, error policy, active work, newest-first ordering, and configured limit.
- Transactional parent lock, candidate selection, batch creation, `JobRun` creation, and `JobTask` creation.
- `JobRun.source = ONBOARDING` and ONB-003 lane-priority policy.
- Focused Prisma, repository, migration, ownership, concurrency, and queue-bound tests.
- Canonical architecture documentation.

## Out of scope

- Provider import execution or provider adapters.
- Periodic preparation reconciliation.
- Public lifecycle command routes.
- User disposition/readiness projection.
- Angular onboarding UI.
- Generic DAG/workflow abstractions.
- Production wave-size tuning before ONB-007.

## Acceptance criteria

- No browser or public route supplies onboarding game ID arrays.
- Selection remains bounded and database-driven; no unbounded Node-side reduction.
- Concurrent creators cannot produce two active batches for the same run/stage.
- Child-job creation and batch linkage are atomic under a locked parent.
- Direct user jobs retain higher priority than every preparation lane.
- Child dismissal or retention cleanup cannot erase parent milestones or batch terminal evidence.
- Existing `JobRun`/`JobTask` executors, active-game fence, cancellation, stale recovery, and idempotency remain authoritative.
- Migration tests prove one-active-run and one-active-stage-batch invariants.

## Required validation

- Prisma migration and generated-client validation.
- Focused contracts/repository/service tests.
- Two-creator concurrency test.
- Direct-user race and duplicate-queued-work test.
- Child deletion/dismissal retention test.
- Large-account bounded-query and bounded-created-task test.
- Ownership-isolation test.

## Completion

Report: none

Pull request: none

Completed at: none
