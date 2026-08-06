# ONB-017 — Persist preparation execution boundary and bounded child-job batches

Status: DONE

Priority: P0

Order: 77

Delivery class: Implementation

Planning maturity: Decisioned by ONB-003; numeric admission defaults supplied by ONB-007; implementation validated and squash-merged; completion reconciliation completed through PR #293

GitHub issue: [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253)

Claimed by: ChatGPT

Implementation branch: `onb-017/issue-253-preparation-execution-boundary`

Reconciliation branch: `onb-017/issue-253-completion-reconciliation`

Claimed at: 2026-08-04

Claim scope: preparation schema/migration, internal configuration and types, bounded PostgreSQL candidate selection, globally serialized child-job admission, focused tests, and architecture documentation; no public routes, reconciler loop, provider execution, Angular changes, or ONB-011/019-owned persistence

## Outcome

Add the minimal PostgreSQL-backed preparation execution model approved by ONB-003 and the transactional server-side boundary that selects eligible games and creates bounded `ONBOARDING` child jobs without browser-supplied ID arrays.

## Why this task exists

ONB-008 owns user disposition and the public readiness projection, while ONB-009 owns authenticated lifecycle commands. Neither should also decide or implement the physical child-job execution boundary. This task establishes the durable preparation parent, ordered account targets, retained batch history, database-side selection, globally serialized admission, and bounded child-job creation consumed by both.

## Dependencies

- ONB-003 / #150 complete, including the self-review addendum.
- ONB-007 / #154 report for 50/3/10 wave defaults, four-batch/200-task/40-analysis global caps, progress denominators, and performance budgets.
- Coordinate current/latest import links and Prisma/schema edits with ONB-011 / #199 and ONB-019 / #259 before implementation begins.
- Consumed by ONB-018 / #254 and ONB-008 / #193.

## Schema coordination recorded at claim

- ONB-017 owns `DataPreparationRun`, `DataPreparationTarget`, and `DataPreparationBatch`, their constraints/indexes, and nullable relations to current `ImportRun` and child `JobRun` rows.
- ONB-011 remains owner of durable import-run/coverage expansion and must preserve the nullable target relation introduced here.
- ONB-019 remains owner of destructive lifecycle operation, fence, and audit tables. ONB-017 exposes an admission-guard seam without inventing those tables.
- No active ONB-011 or ONB-019 branch or pull request existed at claim time. The additive migration order is ONB-017 first, followed by coordinated ONB-011 and ONB-019 migrations.

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

Implementation report: `north-star/onboarding/reports/ONB-017-2026-08-04-self-review-addendum.md`

Implementation pull request: [#282](https://github.com/vokerg/chess_repertoir_trainer/pull/282)

Implementation head: `c226f15b9c75c6fb4cea3072828842d728b9eb5a`

Squash commit: `885ef785bdac1b0c77cc500e3345745b0e723912`

Final implementation CI: run 1994 (`30898278426`), passed lint, build, architecture guardrails, the complete PostgreSQL migration chain, audits, and the full test suite

Completion reconciliation pull request: [#293](https://github.com/vokerg/chess_repertoir_trainer/pull/293)

Final reconciliation CI: run 2114 (`31077878915`) on head `e315eee560adfa9ba9a88e6baa2a212d1a86244e`, passed dependency installation, lint, the full monorepo build, opening and imported-game audits, architecture guardrails, the complete PostgreSQL migration chain, the full test suite, and artifact upload

Completed at: 2026-08-04

Reconciled at: 2026-08-06 through PR #293

## Completion self-review

The first reconciliation draft was incomplete: it changed only this task file, removed the original scope/acceptance/validation contract, left the canonical queue and status ledger stale, and recorded an incorrect implementation-head SHA. A second pass also found that reduced configurable capacity tests existed but the required large-candidate/default-200-task validation was not explicit.

The corrected reconciliation preserves the full task contract, records the exact implementation evidence, synchronizes the canonical queue and status records, and adds focused regression coverage using a 250-game candidate set, four bounded 50-game waves, the exact default 200 queued-task ceiling, and a blocked fifth parent. PR #293 completed the reconciliation, and issue #253 was closed as completed after its squash merge.