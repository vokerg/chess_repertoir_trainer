# ONB-017 — Persist preparation execution boundary and bounded child-job batches

Status: READY

Priority: P0

Order: 77

Delivery class: Implementation

Planning maturity: Decisioned by ONB-003; numeric admission defaults supplied by ONB-007; ready with explicit ONB-011/019 schema coordination

GitHub issue: [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Add the minimal PostgreSQL-backed preparation execution model approved by ONB-003 and the transactional server-side boundary that selects eligible games and creates bounded `ONBOARDING` child jobs without browser-supplied ID arrays.

## Why this task exists

ONB-008 owns user disposition and the public readiness projection, while ONB-009 owns authenticated lifecycle commands. Neither should also decide or implement the physical child-job execution boundary. This task establishes the durable preparation parent, ordered account targets, retained batch history, database-side selection, globally serialized admission, and bounded child-job creation consumed by both.

## Dependencies

- ONB-003 / #150 complete, including the self-review addendum.
- ONB-007 / #154 report for 50/3/10 wave defaults, four-batch/200-task/40-analysis global caps, progress denominators, and performance budgets.
- Coordinate current/latest import links and Prisma/schema edits with ONB-011 / #199 and ONB-019 / #259 before implementation begins.
- Consumed by ONB-018 / #254 and ONB-008 / #193.

## Initial configuration

```text
PREPARATION_FIRST_INDEX_BATCH_SIZE=50
PREPARATION_INDEX_CONTINUATION_BATCH_SIZE=50
PREPARATION_FIRST_ANALYSIS_BATCH_SIZE=3
PREPARATION_ANALYSIS_TAIL_BATCH_SIZE=10
PREPARATION_MAX_NON_TERMINAL_BATCHES=4
PREPARATION_MAX_QUEUED_TASKS=200
PREPARATION_MAX_QUEUED_ANALYSIS_TASKS=40
```

These are configuration defaults backed by ONB-007 CI evidence, not schema constants or public timing promises.

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
- A short global admission critical section using either a locked singleton row or a transaction-scoped PostgreSQL advisory lock.
- Re-counting global non-terminal onboarding batches, total queued onboarding tasks, and queued onboarding analysis tasks after acquiring the admission lock and before creating child work.
- Immutable total-task denominator and terminal snapshots for exact child-stage progress.
- `JobRun.source = ONBOARDING` and ONB-003 lane-priority policy.
- Aggregate batch queue-wait/first-settlement/total-settlement telemetry.
- Focused Prisma, repository, migration, ownership, concurrency, and queue-bound tests.
- Canonical architecture documentation.

## Out of scope

- Provider import execution or provider adapters.
- Periodic preparation reconciliation.
- Public lifecycle command routes.
- User disposition/readiness projection.
- Angular onboarding UI.
- Generic DAG/workflow abstractions.
- Public ETA.
- Holding the admission lock across provider I/O, PGN processing, Stockfish execution, polling waits, or general parent reconciliation.

## Acceptance criteria

- No browser or public route supplies onboarding game ID arrays.
- Selection remains bounded and database-driven; no unbounded Node-side reduction.
- Default index/analysis batch limits are 50/3/10 and remain configurable.
- Concurrent creators cannot produce two active batches for the same run/stage.
- Concurrent creators for different users/parents cannot exceed four non-terminal onboarding batches, 200 queued onboarding tasks, or 40 queued onboarding analysis tasks under the initial configuration.
- Global capacity counting and child creation occur in one serialized, short transaction.
- Child-job creation and batch linkage are atomic under a locked parent.
- Direct user jobs retain higher priority than every preparation lane.
- Child dismissal or retention cleanup cannot erase parent milestones or batch terminal evidence.
- Existing `JobRun`/`JobTask` executors, active-game fence, cancellation, stale recovery, and idempotency remain authoritative.
- Batch telemetry can evaluate the ONB-007 first-value and queue-age budgets without retaining personal payloads.
- Migration tests prove one-active-run and one-active-stage-batch invariants.

## Required validation

- Prisma migration and generated-client validation.
- Focused contracts/repository/service tests.
- Two-creator same-parent concurrency test.
- Two-creator different-parent tests proving all three global caps cannot be exceeded.
- Direct-user race and duplicate-queued-work test.
- Child deletion/dismissal retention test.
- Large-account bounded-query and bounded-created-task tests at 50/200 limits.
- Exact immutable denominator/progress snapshot tests.
- Ownership-isolation test.

## Completion

Report: none

Pull request: none

Completed at: none
