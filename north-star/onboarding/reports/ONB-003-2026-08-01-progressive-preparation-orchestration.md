# ONB-003 — Progressive indexing and analysis orchestration

Date: 2026-08-01

Task: [ONB-003](../tasks/ONB-003-progressive-preparation-orchestration.md)

GitHub issue: [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150)

Branch: `onb-003/issue-150-progressive-preparation-orchestration`

Repository base inspected: `main` at the branch point visible through GitHub as `f95693bd9e1e6c83c947cc754a89340e356dfe24`.

## 1. Question and outcome

ONB-003 owns the physical orchestration boundary between durable provider import and the existing imported-game `JobRun`/`JobTask` executor.

The recommended direction is deliberately small:

1. persist one user-owned `DataPreparationRun` parent with ordered account targets, immutable recipe facts, lifecycle/control state, attention state, and real milestone timestamps;
2. persist bounded `DataPreparationBatch` rows that link the parent to separate index or analysis `JobRun` children and retain terminal snapshots after child dismissal or retention cleanup;
3. keep provider import separate and link each preparation target to its current `ImportRun` chain;
4. create a separate `JobRun` per bounded preparation batch rather than one unbounded run or one task graph;
5. select candidates in PostgreSQL under a locked preparation parent and create the batch, `JobRun`, and `JobTask` rows atomically;
6. allow at most one non-terminal index batch and one non-terminal analysis batch per preparation run, plus a configurable global admission limit for onboarding batches/tasks;
7. reconcile preparation through a short, idempotent PostgreSQL polling loop in the existing worker deployment; never execute provider or chess work inside the reconcile transaction;
8. pipeline indexing from every committed imported-game batch, without waiting for a complete provider window or terminal import, while withholding core completion until exact import coverage is terminal;
9. select analysis candidates only from current successfully indexed evidence;
10. unlock one bounded first-analysis lane before the lower-priority analysis tail;
11. keep every preparation priority below the current lowest direct-user priority;
12. model pause as quiescence, cancellation as acknowledged child shutdown, retry as explicit failed-evidence selection, restart as a new linked recovery run, and expansion as a new immutable run;
13. derive exact readiness/counts from current import/game evidence and active children rather than treating child task status as the product truth;
14. keep Angular onboarding state separate from the technical global job store and poll one server-owned onboarding/readiness projection.

This resolves the ONB-003-owned topology, lifecycle, selection, dependency, source/priority, pipelining, control, retention, and frontend-boundary questions. Numeric wave sizes, global admission limits, polling intervals, and stalled-work thresholds remain evidence inputs from ONB-007.

The work allocates two bounded implementation tasks:

- ONB-017 / [#253](https://github.com/vokerg/chess_repertoir_trainer/issues/253) — preparation persistence, bounded server-side selection, and atomic child-job creation;
- ONB-018 / [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254) — progressive reconciliation, first-analysis lane, import pipelining, and control acknowledgement.

## 2. Files and GitHub records inspected

Repository files actually opened/read:

- `AGENTS.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260716111500_harden_persistent_job_foundation/migration.sql`
- `apps/api/src/worker.ts`
- `apps/api/src/modules/jobs/job-run.routes.ts`
- `apps/api/src/modules/jobs/job-run.service.ts`
- `apps/api/src/modules/jobs/job-run.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-task-executor.ts`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `apps/api/src/modules/jobs/job-worker.repository.prisma.ts`
- `apps/api/src/modules/imported-games/imported-game-processing.service.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-candidates.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`
- `apps/web/src/app/core/jobs/imported-game-job.store.ts`
- `apps/web/src/app/features/accounts/state/accounts.store.ts`
- `packages/contracts/src/jobs/job-run.schemas.ts`
- `docs/imported-game-job-processing.md`
- `north-star/onboarding/AGENTS.md`
- `north-star/onboarding/README.md`
- `north-star/onboarding/FOUNDATION.md`
- `north-star/onboarding/MASTER_PLAN.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/GITHUB_ISSUES.md`
- `north-star/onboarding/tasks/ONB-003-progressive-preparation-orchestration.md`
- `north-star/onboarding/tasks/ONB-007-throughput-progress-benchmark.md`
- `north-star/onboarding/tasks/ONB-008-onboarding-disposition-readiness.md`
- `north-star/onboarding/tasks/ONB-009-onboarding-lifecycle-commands.md`
- `north-star/onboarding/tasks/ONB-016-lightweight-onboarding-experience-blueprint.md`
- `north-star/onboarding/reports/ONB-002-2026-07-29-bounded-import-backfill.md`

GitHub records actually opened/read:

- #147 — Onboarding and Data Lifecycle program;
- #150 — ONB-003 task and comments;
- #154 — ONB-007 task state through the repository mapping;
- #193 — ONB-008 task state through the repository mapping;
- #194 — ONB-009 task state through the repository mapping;
- #224 and PR #225 integration references through current onboarding documents;
- open branches and pull requests matching ONB-003/issue #150;
- newly allocated #253 and #254.

The branch was inspected and modified through the connected GitHub API. A local clone attempt failed because the runtime could not resolve `github.com`; no local build or test execution is claimed.

## 3. Verified current repository state

### 3.1 The imported-game executor is already durable and safe

The existing worker provides the hard parts that preparation must reuse:

- PostgreSQL task claims with `FOR UPDATE ... SKIP LOCKED`;
- run-level priority ordering;
- stable newest-first task ordinals;
- a 25-task scheduling slice with higher-priority preemption checks between games;
- one active same-game lease through `workKey`;
- fenced heartbeat, completion, failure, release, and cancellation acknowledgement;
- stale recovery and graceful shutdown;
- idempotent index and analysis services;
- persisted task progress and terminal state.

The parent therefore does not need another imported-game executor, per-task dependency graph, broker, or engine lifecycle.

### 3.2 Current scheduling is run-based, not workflow-based

Current claim order is:

```text
JobRun.priority DESC
JobRun.updatedAt ASC
JobRun.id ASC
JobTask.ordinal ASC
JobTask.id ASC
```

The worker stays on a selected run for at most its configured slice and reselects when higher-priority work exists or the slice ends.

This is sufficient for direct-user responsiveness if every preparation priority remains below direct-user priorities. It is not sufficient to express import dependency, bounded visible waves, first-analysis value, pause, expansion, or parent milestones.

### 3.3 `JobRun.source = ONBOARDING` already exists

The shared contract and database check allow:

```text
USER_ACTION
ACCOUNT_REFRESH
ONBOARDING
MAINTENANCE
```

No new job source is required. ONB-003 should use the existing `ONBOARDING` value rather than introduce a second source vocabulary.

### 3.4 Current public job creation is browser-ID driven

`POST /api/imported-games/job-runs` accepts up to 1,000 game IDs. `JobRunRepository.createQueued` ownership-checks those IDs and creates newest-first tasks.

The account store currently loads account workflow candidate arrays into Angular and submits explicit IDs for indexing or analysis.

That is acceptable for current advanced user actions but is explicitly unsuitable for onboarding because it:

- makes the browser a handoff coordinator;
- can load unbounded account candidates;
- cannot continue while no browser is open;
- cannot atomically bind candidate selection to a durable parent;
- cannot prevent two parent reconcilers from independently planning the same batch.

Preparation requires a separate internal repository method that selects and creates work server-side.

### 3.5 Child history is not durable enough to be the parent

Terminal jobs may be user-dismissed and are eventually deleted by retention cleanup. Dismissal hides the child from user job reads before deletion.

Therefore a preparation parent cannot derive all historical lifecycle state from retained child `JobRun`/`JobTask` rows. It needs:

- durable parent milestones;
- durable batch/job links;
- terminal batch count snapshots;
- readiness derived from current imported-game and analysis evidence.

### 3.6 Task status alone is not stage evidence

A child task may be `SKIPPED` because the game was already current, including when a higher-priority direct-user job completed it first. Conversely, a task may settle while the game was deleted or while opening/analysis evidence is incomplete.

Parent reconciliation must inspect canonical game evidence:

- indexing: current ply index state, index error, and the existing opening-assignment semantics;
- analysis: current completed analysis coverage and the existing freshness rules;
- active execution: current child tasks/work keys.

It must not equate `JobTask.COMPLETED` with ready or `JobTask.SKIPPED` with failure.

### 3.7 Indexing and analysis are already idempotent

Indexing skips when current, assigns missing openings, and throws on real index/opening failures. Analysis skips when current, protects latest-analysis freshness, refreshes derived data, and cleans abandoned analysis runs on abort.

This allows safe duplicate avoidance plus harmless late skips when a direct-user job wins a race. The parent should reduce duplicate queueing, but correctness does not require a new global reservation system.

### 3.8 The worker deployment is the correct host for another loop

`apps/api/src/worker.ts` already owns the imported-game worker lifecycle, terminal retention, shutdown budget, and Prisma disconnection.

A small preparation reconcile loop can run under the same deployment/supervision boundary, as ONB-002 also intends for a separate provider-import loop. This reuses deployment and shutdown behavior without making preparation a `JobTask` kind.

## 4. Constraints inherited from accepted onboarding decisions

The design must preserve these locked contracts:

- a preparation run starts only after explicit recipe acceptance;
- the initial recipe is one selected account, standard blitz/rapid, rated and unrated, fixed recent range;
- provider import is account-level durable work and not a `JobTask`;
- indexing/opening assignment precedes analysis;
- core onboarding completion requires terminal import and terminal indexing outcomes with at least one indexing success;
- full analysis is not a core completion gate;
- exact counts are allowed; ETA and fabricated weighted progress are not;
- skip is distinct from cancel;
- Home and `/onboarding` consume one server-owned projection;
- the technical job panel remains the child-job surface, not the product lifecycle owner;
- existing `JobRun`/`JobTask` remains the game executor;
- preparation selects games from PostgreSQL rather than receiving import/browser ID arrays;
- a first meaningful indexed reveal and a bounded first-analysis reveal must be possible before the full tail completes;
- additional accounts are explicit expansion after first value.

## 5. Alternatives considered

### 5.1 One `JobRun` containing the entire selected scope — rejected

Advantages:

- no new batch model;
- simple task creation.

Problems:

- creates an account-sized queue immediately;
- cannot pipeline safely with progressive import without mutating a run's task set;
- pause/cancel affects the entire tail at once;
- first-analysis dependency is not represented;
- retained child history still cannot represent the parent after cleanup;
- one huge run obscures visible wave milestones.

### 5.2 One mutable `JobRun` with appended checkpoints — rejected

Advantages:

- fewer run rows.

Problems:

- current `totalTasks` and task-count integrity assume a stable run;
- appending tasks changes fixed denominators and complicates terminal reconciliation;
- retry, cancellation, retention, and user-visible task ordering become ambiguous;
- it silently turns `JobRun` into a workflow parent.

### 5.3 A generic DAG/workflow model — rejected

The product needs a fixed import/index/analysis recipe with two game stages, bounded lanes, and explicit controls. A generic node/edge engine adds abstractions, migrations, and failure semantics without demonstrated reuse.

### 5.4 A `DataPreparationGame` row for every selected game — rejected initially

This would make per-game stage state explicit but duplicates `ImportedGame`, `JobTask`, index errors, and analysis evidence. It increases write volume and requires continuous reconciliation between three per-game state stores.

Reopen only if future recipes require immutable per-game inclusion independent of the actual game evidence. The current fixed range/scope plus database predicates does not require it.

### 5.5 Browser-controlled next-wave commands — rejected

The browser would remain required for continuation and could create duplicate or missing waves after reload/network failure. This violates server authority and restart safety.

### 5.6 Event-only advancement from import/job settlement — rejected for the first implementation

Direct events can reduce latency but create tight coupling between import, jobs, and preparation. A bounded polling reconciler is simpler and restart-safe. Import and child settlement may set `reconcileAfter`/wake hints later, but polling remains authoritative.

### 5.7 One short PostgreSQL reconciler plus bounded child jobs — recommended

This fits the existing modular monolith and worker deployment, keeps all expensive work outside transactions, and makes every transition recoverable by re-reading persisted state.

## 6. Recommended persistence model

Field names are conceptual; ONB-017 owns exact Prisma naming while preserving these semantics.

### 6.1 `DataPreparationRun`

```text
DataPreparationRun
- id
- userId
- purpose: ONBOARDING | EXPANSION | RECOVERY
- status:
    QUEUED
    RUNNING
    PAUSE_REQUESTED
    PAUSED
    CANCEL_REQUESTED
    NEEDS_ATTENTION
    COMPLETED
    CANCELLED
    FAILED
- recipeVersion
- recipeJson
- retryOfRunId?
- retryGeneration
- attentionCode?
- attentionDetail?
- reconcileAfter?
- firstImportedAt?
- firstIndexedAt?
- firstAnalysedAt?
- coreReadyAt?
- analysisCompletedAt?
- completedAt?
- createdAt
- updatedAt
```

Important rules:

- `coreReadyAt` is a milestone, not a lifecycle status. The run may remain `RUNNING` while analysis continues.
- `NEEDS_ATTENTION` is non-terminal and retains the one-active-run lock. It covers no recent games, all indexing failed, exhausted import failure, or another state requiring a deterministic user action.
- `FAILED` is reserved for an unrecoverable orchestration/invariant failure, not normal partial game failures.
- `retryGeneration` advances only on an explicit retry command. Normal reconciliation never retries failed games indefinitely.
- restart after a terminal cancellation/failure creates a new `RECOVERY` run linked through `retryOfRunId`.
- expansion creates a new `EXPANSION` run with a new immutable recipe snapshot.

Enforce at most one non-terminal run per user through a PostgreSQL partial unique index covering:

```text
QUEUED
RUNNING
PAUSE_REQUESTED
PAUSED
CANCEL_REQUESTED
NEEDS_ATTENTION
```

### 6.2 `DataPreparationTarget`

A run owns one or more ordered account targets:

```text
DataPreparationTarget
- id
- preparationRunId
- accountId
- ordinal
- scopeVersion
- scopeHash
- scopeJson
- requestedFrom
- requestedTo
- currentImportRunId?
- firstImportedAt?
- firstIndexedAt?
- firstAnalysedAt?
- coreReadyAt?
- createdAt
- updatedAt

unique(preparationRunId, accountId)
unique(preparationRunId, ordinal)
```

The initial onboarding run has exactly one target. Expansion may have several targets. The target is the correct account-specific progress boundary without changing the first-run contract.

`currentImportRunId` points to the active/latest import attempt for this target. Import retry history remains in `ImportRun.retryOfImportRunId`; preparation does not duplicate provider checkpoints.

### 6.3 `DataPreparationBatch`

```text
DataPreparationBatch
- id
- preparationRunId
- targetId
- stage: INDEX | ANALYSIS
- lane:
    FIRST_INDEX
    FIRST_ANALYSIS
    INDEX_CONTINUATION
    ANALYSIS_TAIL
    RETRY
- ordinal
- status:
    QUEUED
    RUNNING
    COMPLETED
    PARTIALLY_FAILED
    FAILED
    CANCELLED
- plannedLimit
- jobRunId?
- totalTasks
- completedTasks
- skippedTasks
- failedTasks
- cancelledTasks
- startedAt?
- settledAt?
- error?
- createdAt
- updatedAt
```

The `jobRunId` relation is nullable and unique with `onDelete: SetNull`. Terminal counts are copied when the child settles so retention cannot erase preparation history.

The parent does not infer feature readiness from these snapshots. They are execution/audit evidence. Current game/import evidence remains authoritative.

### 6.4 Active-batch constraints

Use PostgreSQL partial unique indexes so one run cannot have:

- two non-terminal `INDEX` batches;
- two non-terminal `ANALYSIS` batches.

This is stronger than an application check and protects concurrent reconcilers.

### 6.5 No per-game preparation table

The selected game set remains represented by:

- immutable account/scope/range targets;
- current `ImportedGame` evidence;
- tasks in each bounded child job;
- retained terminal batch summaries.

This avoids copying every game into another workflow table.

## 7. Atomic server-side batch creation

ONB-017 should add an internal repository operation conceptually equivalent to:

```text
createNextPreparationBatch(runId, stage, lane, targetId, limit, priority)
```

One transaction must:

1. lock the `DataPreparationRun` row;
2. verify lifecycle/control state and the active-stage-batch invariant;
3. verify global onboarding admission limits;
4. select eligible `ImportedGame` rows in PostgreSQL with a hard limit;
5. exclude relevant non-terminal same-game child work where practical;
6. create `DataPreparationBatch`;
7. create `JobRun` with `source = ONBOARDING`;
8. create ordered `JobTask` rows;
9. link the batch and job;
10. commit before worker execution begins.

Candidate selection uses:

- `userId` and target `accountId`;
- half-open target range `[requestedFrom, requestedTo)`;
- canonical scope predicates;
- stage evidence predicates;
- retry-generation/error policy;
- `endedAt DESC NULLS LAST, id DESC`;
- `LIMIT` from policy/configuration.

The repository should use SQL/Prisma patterns that avoid unbounded `findMany` plus Node filtering. Supporting indexes must follow the final predicates.

A direct-user job may still race after selection. That is safe because:

- direct-user priority wins;
- the active-game fence prevents simultaneous execution;
- the later preparation task idempotently skips if the evidence is current.

Do not modify current public user-action job creation merely to eliminate this harmless race.

## 8. Wave topology and queue bounds

### 8.1 Separate job per batch

Each batch creates one immutable child run:

- index batches use `INDEX_GAMES`;
- analysis batches use `ANALYSE_GAMES`;
- preparation does not use `PROCESS_GAMES`, because index and analysis must remain separately observable and dependency-gated.

### 8.2 Per-run bound

At most two preparation child runs are non-terminal at once:

- one index batch;
- one analysis batch.

Each is bounded by its configured stage/lane size.

### 8.3 Global admission bound

Per-run limits do not bound a multi-user deployment. Before creating new child work, the reconciler must enforce configurable global limits such as:

```text
PREPARATION_MAX_NON_TERMINAL_BATCHES
PREPARATION_MAX_QUEUED_TASKS
```

When the limit is reached, reconciliation still updates milestones, acknowledges controls, and settles parents, but does not admit more child work.

ONB-007 owns numeric defaults and scaling triggers. The existence of a hard global admission policy is locked by ONB-003.

### 8.4 Numeric wave sizes

Keep separate configuration for:

```text
PREPARATION_INDEX_WAVE_SIZE
PREPARATION_FIRST_ANALYSIS_SIZE
PREPARATION_ANALYSIS_TAIL_WAVE_SIZE
PREPARATION_FIRST_ANALYSIS_MIN_INDEXED
```

The current planning assumption of approximately 50 index games is not a production constant. ONB-007 must validate the defaults.

## 9. Source and priority policy

Use the existing source:

```text
ONBOARDING
```

Current direct-user priorities are 250–400. Use these initial preparation priorities:

```text
FIRST_INDEX          200
FIRST_ANALYSIS       190
INDEX_CONTINUATION   180
ANALYSIS_TAIL        100
```

An explicit retry keeps the normal lane priority; retry is not boosted above direct user work.

Consequences:

- every direct-user job, including `REFRESH_TAGS` at 250, preempts preparation;
- the first indexed batch is delivered before general continuation;
- once enough indexed evidence exists, the first-analysis lane can preempt subsequent index continuation;
- the engine-heavy analysis tail remains lowest priority.

ONB-007 may tune the exact numbers only while preserving this strict ordering and the direct-user floor.

## 10. Import pipelining

### 10.1 Start indexing after committed rows, not after terminal import

The reconciler queries persisted `ImportedGame` rows. It may create an index batch as soon as a bounded provider write commits.

It does not need to wait for:

- a whole provider window to become covered;
- the full requested range;
- terminal `ImportRun` status.

This is safe because replayed provider windows use duplicate-safe writes. A later provider failure does not invalidate already persisted valid games.

### 10.2 Core completion still waits for exact terminal import

Progressive indexing must not imply complete coverage.

`coreReadyAt` can be set only when:

1. every target's bounded initial import is terminal with exact requested coverage;
2. the final eligible denominator is known;
3. every eligible game has a terminal indexing outcome;
4. at least one game is successfully indexed;
5. no required import/index work remains active.

This preserves ONB-001 while improving time to first value.

### 10.3 No event dependency

Import commits and child settlements may update `reconcileAfter` or issue an in-process wake hint, but correctness relies on persisted state plus periodic reconciliation. Process restart therefore cannot lose an event.

## 11. Index-to-analysis dependency and first-analysis lane

### 11.1 Evidence predicate

Normal analysis selection requires the canonical current indexed state and excludes current index failures. It does not rely solely on a completed index `JobTask`.

### 11.2 First-analysis trigger

Create the first-analysis batch when:

- at least `PREPARATION_FIRST_ANALYSIS_MIN_INDEXED` current indexed, unanalysed games exist; or
- no more normal index candidates currently exist and at least one indexed game exists.

This fallback supports small accounts without weakening the normal evidence threshold.

The reconciler may start first analysis while the current index batch is still active if the threshold has already been reached. The one-index/one-analysis bound permits this pipeline.

### 11.3 Deterministic selection

Select newest successfully indexed unanalysed games:

```text
endedAt DESC NULLS LAST
id DESC
```

Reject representative sampling, newest-month special cases, and randomization for the first implementation. Newest-first:

- matches current job ordering;
- aligns with the recent-first recipe;
- gives recognizable current games;
- is deterministic and cheap;
- avoids another recommendation policy.

ONB-007 decides only the sample size and budget, not the ordering.

### 11.4 Analysis tail

After the first-analysis batch, continue with bounded `ANALYSIS_TAIL` batches until every requested eligible indexed game has a terminal analysis outcome or the parent is paused/cancelled/needs attention.

Analysis failures do not revoke core readiness.

## 12. Multi-account expansion ordering

The initial run remains one account.

For a multi-account expansion run:

- targets have an immutable ordinal from the accepted recipe;
- candidate ordering is newest-first within each target;
- batch admission is account-round-robin by the lowest completed batch count, then target ordinal;
- the global run still has at most one active index and one active analysis batch.

This gives every added account a first indexed wave before one large account monopolizes the run. It also produces understandable account-specific progress without mixing account ranges or coverage.

Do not merge same-game identities across providers inside preparation. Cross-provider deduplication remains a separate evidence/readiness concern.

## 13. Parent reconciliation loop

ONB-018 should add a small loop alongside the imported-game and future import loops in the existing worker deployment.

Each iteration:

1. selects one due non-terminal parent with `FOR UPDATE SKIP LOCKED` or an equivalent short claim;
2. reconciles linked import and child batch status;
3. copies newly terminal child counts into batches;
4. updates real milestone timestamps from canonical evidence;
5. acknowledges pause/cancel when child work is quiescent;
6. sets attention/core/completion state when conditions are met;
7. creates at most one next batch transactionally when admission permits;
8. commits and releases the row;
9. moves to another parent.

No provider request, PGN processing, Stockfish execution, or long wait occurs inside this loop.

A crash before commit changes nothing. A crash after commit leaves a durable child job that the existing worker can execute. The next reconciliation observes it.

## 14. Pause, resume, cancel, retry, restart, and expansion

### 14.1 Pause is quiescence

`PAUSE_REQUESTED` means:

- stop creating new import windows and preparation batches;
- request provider-import pause through its approved lifecycle;
- do not cancel current game tasks merely to pause;
- allow active child jobs to settle;
- transition to `PAUSED` only when no child/import work can still mutate preparation state.

This avoids throwing away completed engine work and avoids adding a paused state to current `JobRun`.

### 14.2 Resume

Resume changes `PAUSED` to `RUNNING`, schedules immediate reconciliation, and continues from current evidence. It does not recreate completed jobs.

### 14.3 Cancel is acknowledged shutdown

`CANCEL_REQUESTED` propagates cancellation to:

- the current import run;
- every non-terminal child `JobRun`.

The parent becomes `CANCELLED` only after:

- import cancellation is terminal/acknowledged;
- no child task retains an active work key;
- all child runs are terminal;
- terminal batch snapshots are persisted.

This uses the current child cancellation fence rather than inventing another signal.

### 14.4 Retry

Retry is explicit and increments `retryGeneration`.

Normal wave selection excludes games with current terminal index/analysis failure evidence. Retry selection includes only failed or still-unprepared evidence for the requested stage and never selects current completed evidence.

A failed child is not reset. Retry creates a new batch and new child `JobRun`.

### 14.5 Restart

Restarting a terminal cancelled/failed run creates a new `RECOVERY` `DataPreparationRun` linked through `retryOfRunId`, using a new immutable recipe snapshot and current evidence. The historical run remains terminal.

### 14.6 Expansion

Older history, bullet, or additional accounts create a new `EXPANSION` run. They do not mutate the initial run's account/range/scope.

## 15. Progress and readiness semantics

### 15.1 Exact counts before percentages

Before provider import is terminal, the final eligible denominator can still grow. Show exact counts such as:

- imported;
- indexed;
- analysed;
- queued;
- running;
- failed.

Do not show an index/analysis percentage against a moving denominator.

After every target import is terminal and exact coverage is proved, the eligible denominator is fixed and stage fractions are valid.

### 15.2 Authoritative sources

Use:

- import counters/coverage from `ImportRun` and target links;
- eligible/imported/indexed/analysed counts from bounded database aggregates over `ImportedGame` and current analysis evidence;
- queued/running counts from current linked child jobs/tasks;
- milestones from persisted parent/target timestamps;
- batch snapshots for historical execution/audit.

Do not sum historical batch task totals to infer current readiness because retries and direct-user work can overlap.

### 15.3 Core readiness and full completion

`coreReadyAt` is set according to ONB-001. User disposition may become completed at that milestone while the parent stays `RUNNING` for analysis.

The run becomes `COMPLETED` when all requested analysis work has terminal outcomes, or immediately after core readiness when analysis was not requested.

Partial analysis failures produce warnings/readiness evidence but do not revoke core readiness.

### 15.4 Attention states

Use bounded attention codes, not arbitrary status strings, including at least:

```text
NO_RECENT_GAMES
ALL_INDEXING_FAILED
IMPORT_FAILED
INDEXING_PARTIAL
ANALYSIS_PARTIAL
ORCHESTRATION_STALLED
```

ONB-008 maps these to server-allowed actions and presentation. ONB-007 supplies stalled thresholds.

## 16. Angular integration boundary

The existing root `ImportedGameJobStore` remains the technical child-job surface. It may show onboarding-source jobs and their task progress, cancellation, or terminal history according to the existing job UX.

The functional onboarding/Home flow must use a separate onboarding store and API projection that owns:

- disposition;
- parent lifecycle;
- target progress;
- milestones;
- readiness;
- warnings;
- server-allowed actions.

The onboarding store may refresh opportunistically when the technical store publishes settled-game or terminal-job batches, but those browser events are never required for server advancement.

The initial transport remains polling. No SSE/WebSocket dependency is introduced by ONB-003.

## 17. Security and privacy

- Every run, target, import link, child job, and candidate query is user-owned.
- The server resolves account ownership; clients cannot name arbitrary game IDs for preparation.
- A non-owned target or child is reported through the same not-found/validation conventions as current authenticated resources.
- Recipe JSON stores scope facts, not provider credentials or access tokens.
- Parent errors should retain bounded operational context and avoid raw PGN/provider payloads.
- Existing provider-token storage and worker authentication boundaries remain unchanged.

## 18. Failure and recovery

### 18.1 Import failure

Already imported valid games may remain indexed/analysed, but core readiness is withheld. The run enters `NEEDS_ATTENTION` with retry/cancel/expansion actions after provider retries are exhausted.

### 18.2 Individual index failure

Record existing game index error, continue unrelated candidates, and do not auto-retry the failed game. When import is terminal and no normal candidates remain:

- at least one indexed success permits core readiness with a partial warning;
- zero successes enters `NEEDS_ATTENTION` with `ALL_INDEXING_FAILED`.

### 18.3 Individual analysis failure

Continue unrelated analysis, preserve core readiness, and expose a partial warning plus explicit retry.

### 18.4 Worker/reconciler crash

Child work and parent transitions are durable. Stale game tasks recover through the existing worker. A later reconcile tick repairs parent/batch projections.

### 18.5 Child deletion or dismissal

The batch link becomes null only on deletion; terminal snapshots and current game evidence preserve parent correctness. Dismissal affects technical visibility only.

### 18.6 Account deletion

ONB-004 must define the acknowledged destructive protocol. Preparation cancellation must be requested and acknowledged before target/account deletion can settle. ONB-003 does not authorize current direct deletion races.

## 19. Performance and operational impact

The design adds:

- small parent/target/batch tables;
- bounded candidate and aggregate queries;
- one lightweight reconcile loop;
- no new engine, queue, deployment, or network dependency.

Required indexes should cover:

- active preparation run per user;
- due/non-terminal parent selection;
- active batch per run/stage;
- target account/range selection;
- existing imported-game evidence predicates;
- linked child/import lookups.

The critical capacity controls are:

- index wave size;
- first-analysis size and minimum indexed threshold;
- analysis-tail wave size;
- global non-terminal batch limit;
- global queued-task limit;
- reconcile poll cadence;
- stalled thresholds.

ONB-007 must measure and set their production defaults. Until then, exact counts are valid but no ETA or speed promise is accepted.

## 20. Migration and backward compatibility

- Additive models and nullable relations preserve current account, import, job, and frontend behavior.
- Existing user-created `JobRun` rows remain unchanged.
- Existing `ONBOARDING` job source requires no contract migration.
- Current public job routes keep their request/response shapes.
- Current account workflow candidate endpoints remain for advanced account management until later cutover; onboarding never depends on them.
- Existing users are adopted by ONB-008 disposition migration, not by fabricating historical preparation runs.
- No existing job history is backfilled into preparation batches.
- ONB-011 coordinates the target-to-current-import relation when extending `ImportRun`.

## 21. Required implementation validation

### Persistence and selection

- migration constraints and generated client;
- one-active-run concurrent insert;
- one-active-stage-batch concurrent creation;
- ownership and target-account isolation;
- bounded candidate selection on large fixtures;
- newest-first stable order;
- active child-work exclusion;
- child retention/dismissal survival.

### Scheduling and dependency

- direct user priority preempts every preparation lane;
- first index precedes first analysis;
- analysis never selects an unindexed game;
- first analysis can start before the index/import tail;
- global and per-run queue limits hold under large/many-user fixtures;
- equal-priority runs remain fair through current worker scheduling.

### Import handoff

- committed rows create index work before terminal import;
- incomplete provider window never permits core completion;
- successful empty coverage creates `NO_RECENT_GAMES` attention, not failure;
- duplicate provider replay does not duplicate preparation tasks beyond harmless idempotent races.

### Control and recovery

- pause stops admission and settles to quiescence;
- resume continues from evidence;
- cancellation waits for provider and retained task-work-key acknowledgement;
- retry selects only failed/unprepared evidence;
- restart creates a linked recovery run;
- process crash at each transaction boundary is idempotently reconciled;
- stale task recovery repairs parent state;
- child dismissal/deletion does not regress milestones.

### Projection

- fixed denominator only after terminal exact import;
- core readiness with partial index failure and at least one success;
- all-index-failed attention;
- analysis failure after core readiness;
- multi-account account-round-robin progress;
- no unbounded payload or task list required by the onboarding projection.

## 22. Decisions finalized

ONB-003 finalizes these directions:

- use `DataPreparationRun` plus ordered account targets and retained child-job batches;
- create separate immutable `JobRun` children per bounded index/analysis batch;
- keep provider import linked but physically separate;
- use short PostgreSQL reconciliation in the existing worker deployment;
- permit indexing after every committed import batch;
- gate core readiness on terminal exact import coverage;
- allow one active index batch and one active analysis batch per run;
- add global onboarding admission limits;
- use existing `ONBOARDING` source;
- use priority order 200/190/180/100 below all direct-user work;
- select newest-first within an account;
- use account-round-robin batches for multi-account expansion;
- make first-analysis size configurable but selection/order deterministic;
- make pause quiescent and cancellation acknowledged;
- make retry explicit and failed-evidence-only;
- preserve parent correctness after child cleanup;
- keep Angular product lifecycle separate from the technical job store.

## 23. Rejected alternatives

- one unbounded preparation `JobRun`;
- mutable appended-task runs;
- generic DAG/workflow platform;
- browser-triggered next waves;
- a per-game preparation mirror table;
- treating task status as readiness;
- waiting for terminal import before any indexing;
- starting analysis from task completion without current index evidence;
- boosting preparation retry above direct user work;
- random or representative first-analysis sampling without evidence;
- using child job history as the only durable parent state.

## 24. Remaining open questions

ONB-003 no longer owns unresolved architecture questions.

Delegated numeric/operational questions remain with ONB-007:

- production wave sizes;
- first-analysis minimum indexed threshold;
- global batch/task admission limits;
- reconcile cadence;
- stall thresholds;
- resource/scaling triggers;
- whether any ETA is defensible.

Implementation-local naming remains with ONB-017/018:

- exact Prisma field names;
- exact SQL index names;
- whether terminal count snapshots are scalar columns or a constrained JSON payload;
- exact internal module/repository names;
- exact wake-hint implementation.

Cross-program questions remain with their existing owners:

- destructive account/user cancellation acknowledgement — ONB-004;
- public readiness payload and action codes — ONB-008;
- authenticated lifecycle command shapes/idempotency keys — ONB-009;
- Angular decomposition/polling — ONB-010;
- provider import persistence and handoff — ONB-011 through ONB-015;
- final visual/accessibility treatment — Visual Transformation #133.

## 25. Queue and task impact

Allocate:

1. ONB-017 / #253 at order 77 — preparation execution persistence, server-side selection, and atomic child-job batches.
2. ONB-018 / #254 at order 78 — progressive reconcile loop, first-analysis lane, pipelining, and control acknowledgement.

Narrow ONB-008 so it consumes the preparation execution schema rather than owning it. ONB-008 remains responsible for user disposition, legacy adoption, readiness projection, feature readiness, and the authenticated read endpoint.

ONB-009 remains responsible for authenticated start/skip/pause/resume/cancel/retry/restart/expansion commands and delegates internal execution to ONB-017/018.

The next deterministic research task after ONB-003 review/merge becomes ONB-004 by queue order. ONB-007 remains parallel and is the performance dependency for production defaults.

## 26. Validation performed and limitations

Performed:

- verified canonical queue and claim state;
- checked ONB-003 branches, open PRs, and issue comments for collision;
- inspected current schema, contracts, routes, repositories, worker scheduling, fencing, cancellation, stale recovery, execution services, Angular job polling, and account workflow submission;
- inspected ONB-001/002/016 decisions and ONB-007/008/009 boundaries;
- modelled large-account queueing, direct-user preemption, progressive import, first-analysis, multi-account expansion, child retention, pause, cancel, retry, and restart scenarios;
- created branch and issue claim metadata;
- allocated issues #253 and #254 with bounded scopes.

Not performed:

- local repository build, lint, tests, migration validation, or benchmark execution, because the runtime could not resolve `github.com` for cloning;
- provider or Stockfish benchmarks, which belong to ONB-007;
- production code/schema changes, which are out of scope for this research task.

This is documentation-only research. CI on the pull request remains the repository-level validation available for the branch.
