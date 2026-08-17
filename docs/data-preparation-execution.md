# Data preparation execution

ONB-017 provides the durable PostgreSQL parent/target/batch boundary and atomic child-job admission used by onboarding and later preparation flows. ONB-018 adds the bounded reconciliation/control loop that advances those persisted runs in the existing worker deployment. Neither task adds a public preparation route; authenticated lifecycle commands and product readiness projections remain separate consumers.

## Ownership

`DataPreparationRun` is the durable user-level parent. It stores the immutable recipe snapshot, lifecycle/control state, attention data, milestones, retry lineage, and persisted reconciliation hint.

`DataPreparationTarget` is the ordered account boundary. It stores the immutable account identity snapshot, scope version/hash/JSON, half-open requested range, optional current `ImportRun` link, and account milestones. Account deletion sets the current account link to `NULL` without deleting historical target evidence.

`DataPreparationBatch` is retained execution evidence for one bounded index or analysis wave. It stores the lane, immutable planned limit and total-task denominator, optional child `JobRun` link, terminal counts, and queue/settlement timestamps. Child-job deletion sets the link to `NULL`; database triggers snapshot child counts before retention can remove the job.

ONB-011/012 remain the owners of durable provider-import coverage and import lifecycle. ONB-019 remains the owner of destructive lifecycle operations, resource fences, and audit records. Preparation exposes an admission guard that ONB-019 can replace inside the existing transaction.

## Database invariants

PostgreSQL partial unique indexes enforce:

- one non-terminal preparation run per user;
- one non-terminal batch per preparation run and stage.

The database, rather than the reconciler, is the final concurrency authority for these constraints.

## Admission transaction

`createPreparationRepository().admitNextBatch(...)` performs one short transaction:

1. acquire the transaction-scoped global preparation advisory lock;
2. lock the owned parent and target rows;
3. invoke the lifecycle admission guard;
4. reject a duplicate active stage batch;
5. re-count global active preparation batches, queued onboarding tasks, and queued onboarding analysis tasks;
6. calculate the remaining bounded capacity;
7. select eligible games in PostgreSQL from the immutable target account/scope/range, newest first, with `FOR UPDATE ... SKIP LOCKED` and a hard limit;
8. exclude games already present in queued or running child work, plus any cancelled task whose execution `workKey` has not yet been acknowledged;
9. create the retained batch, `JobRun(source = ONBOARDING)`, and ordered `JobTask` rows atomically;
10. link the child and mark a queued parent as running.

The configured lane size is an upper bound. Internal reconciliation may pass a stricter positive `maxTasks` cap below that lane size; the first-analysis fallback uses this to persist and admit a one-game wave without introducing a second analysis-admission path.

For an explicit preparation retry, the same transaction also increments `retryGeneration`, clears prior attention, and returns the parent to `RUNNING`. A capacity/no-candidate block therefore cannot consume a retry generation, and a committed generation always has a durable retry child job.

The transaction does not execute provider calls, PGN parsing, Stockfish, task polling, or reconciliation. Existing job workers and imported-game executors remain authoritative after commit.

## Defaults and priorities

Environment-backed batch/admission defaults:

```text
PREPARATION_FIRST_INDEX_BATCH_SIZE=50
PREPARATION_INDEX_CONTINUATION_BATCH_SIZE=50
PREPARATION_FIRST_ANALYSIS_BATCH_SIZE=3
PREPARATION_ANALYSIS_TAIL_BATCH_SIZE=10
PREPARATION_MAX_NON_TERMINAL_BATCHES=4
PREPARATION_MAX_QUEUED_TASKS=200
PREPARATION_MAX_QUEUED_ANALYSIS_TASKS=40
```

Reconciliation defaults:

```text
PREPARATION_RECONCILE_ACTIVE_MS=1000
PREPARATION_RECONCILE_IDLE_MS=5000
PREPARATION_RECONCILE_DUE_WARNING_MS=15000
PREPARATION_FIRST_ANALYSIS_MIN_INDEXED=3
PREPARATION_FIRST_ANALYSIS_SMALL_ACCOUNT_FALLBACK=1
```

The fallback size must remain below the normal first-analysis threshold and no larger than the configured `FIRST_ANALYSIS` lane size.

Lane priorities:

```text
FIRST_INDEX=200
FIRST_ANALYSIS=190
INDEX_CONTINUATION=180
ANALYSIS_TAIL=100
```

A retry keeps the normal continuation/tail priority for its stage. Existing direct-user priorities remain 250–400, so every user action can preempt preparation.

## Scope snapshot shape

The repository currently understands these immutable `scopeJson` properties:

```json
{
  "rated": "ANY | RATED | UNRATED",
  "speedCategories": ["BLITZ", "RAPID"],
  "variants": ["STANDARD"]
}
```

Missing or empty arrays mean no restriction for that property. Speed and variant comparisons are case-insensitive so recipe vocabulary matches provider-shaped imported values. A standard variant includes the repository's established `null`, `chess`, and `standard` representations. Candidate selection always applies user ownership, target account, `[requestedFrom, requestedTo)`, stage evidence, retry/error policy, active-work exclusion, newest-first ordering, and the computed hard limit.

Normal index admission selects clean unindexed games; index retry selects only unindexed games with a prior index error. Normal analysis admission selects indexed games without an analysis attempt; analysis retry selects only indexed games whose latest analysis status is `FAILED`. `force` remains an explicit analysis override rather than changing retry into general backlog processing.

## Reconciliation loop

`createPreparationReconciler()` runs beside the imported-game job and account-import workers in the same worker deployment. Each claim is a short PostgreSQL transaction over one due parent using `FOR UPDATE SKIP LOCKED`. The claim advances `reconcileAfter` as a short lease, after which all evidence reads, child admission, control calls, and parent updates happen outside that claim transaction.

The persisted claim/wake timestamp also acts as an optimistic evidence fence. A linked import/child/control event that occurs after a snapshot rewrites `reconcileAfter`; the later parent state write compares the expected lease and refuses to commit stale milestones or terminal state when that durable wake changed.

The loop drains a bounded number of due parents per cycle, then uses the configured one-second active or five-second idle wait. It never holds a database transaction across provider I/O, PGN processing, Stockfish, or task execution.

`reconcileAfter` is the restart-safe wake authority. Database triggers move active parents due immediately when:

- a target is linked to a current import run;
- linked import progress or lifecycle state changes;
- a preparation child `JobRun` changes state or is removed by retention;
- a linked child `JobTask` changes settlement state or releases its `workKey`.

`NEEDS_ATTENTION` is not normally polled. Only recoverable import attention (`IMPORT_PAUSED` / `IMPORT_RETRY_AVAILABLE`) is made due by linked import/relink events, allowing a resumed or replacement current import attempt to return the parent to `RUNNING`. On each such wake, the recoverable attention code/detail is recomputed from the current ordered target imports, so a multi-target run does not preserve an action signal for a blocker that has already recovered. Product attention such as `NO_RECENT_GAMES` and `ALL_INDEXING_FAILED` remains dormant until an explicit lifecycle action.

The in-process `wake()` method is only a latency optimization for local control calls. Persisted PostgreSQL state remains authoritative after process restart or a lost in-memory notification.

## Progressive lanes and fairness

Indexing pipelines directly from committed eligible `ImportedGame` rows; it does not wait for terminal provider coverage. Core readiness still waits for a successfully completed exact import and terminal index outcomes.

The run may have one non-terminal index batch and one non-terminal analysis batch concurrently. Normal first analysis starts when a target has at least three current indexed/unanalysed games, even while indexing continues. Below that threshold, fallback waits for successful terminal import coverage, no clean index candidate, and no active index batch for that target; if at least one current indexed/unanalysed game remains, it admits a bounded one-game `FIRST_ANALYSIS` wave. This also prevents partial indexing failures from stranding the remaining successfully indexed evidence. Failed or cancelled imports do not enter the fallback path.

For multi-account expansion, index and analysis fairness are independent. Each stage chooses the target with the fewest prior normal batches, then immutable target ordinal and target ID. Retry batches are excluded from those normal-stage cursors, so retry activity does not let one account jump the normal round-robin order.

## Evidence, milestones, and completion

Current game evidence is authoritative; historical `JobTask` success is not sufficient on its own.

The reconciler persists first-imported, first-indexed, first-analysed, and core-ready timestamps on the run and affected targets. Core readiness requires:

- every linked target import to be `COMPLETED`;
- no active preparation index batch;
- no current clean unindexed eligible game;
- at least one successfully indexed eligible game.

Index failures are terminal outcomes. They may produce the non-blocking `INDEXING_PARTIAL` warning when at least one game indexed successfully; all-index-failed instead produces `NEEDS_ATTENTION / ALL_INDEXING_FAILED`. A completed import with zero eligible games produces `NEEDS_ATTENTION / NO_RECENT_GAMES`.

Analysis is non-blocking for core readiness. A current analysis status of `RUNNING` remains non-terminal even when the work came from a direct-user job. A preparation run becomes `COMPLETED` only after core readiness and when no requested indexed game is unanalysed or currently analysing and no preparation analysis child remains active. Terminal analysis failures do not revoke core readiness and are retained as `ANALYSIS_PARTIAL` warning evidence.

## Pause, cancel, resume, and retry

Pause is quiescence. `PAUSE_REQUESTED` stops new preparation admission, requests pause on linked mutable imports, lets already admitted child jobs settle, and becomes `PAUSED` only when neither import nor child work can still mutate the preparation state. Preparation does not cancel a child job merely to pause.

Resume transitions the preparation parent to `RUNNING` first, then resumes linked paused imports and schedules immediate reconciliation from current evidence. If the parent transition is rejected because lifecycle state changed concurrently, no child import is restarted. Completed child jobs are never recreated.

Cancellation is acknowledged. `CANCEL_REQUESTED` propagates to linked imports and active child jobs. The parent becomes `CANCELLED` only after imports are terminal with no import claim and no child task retains a `workKey`; terminal child status alone is not sufficient.

Preparation retry is explicit and evidence-based. Within a non-terminal `RUNNING` / `NEEDS_ATTENTION` run, one explicit retry request creates one bounded `RETRY` batch for current failed index or analysis evidence and increments the generation atomically with that child creation. Completed evidence is never reset, a blocked retry consumes no generation, and normal reconciliation never auto-requeues terminal failures. A terminal `COMPLETED` preparation is not reopened by the ONB-018 internal retry method. ONB-008 owns completed-partial action mapping, while ONB-009 owns the authenticated command semantics; ONB-009 explicitly assigns new linked `RECOVERY` runs to terminal cancelled/failed restart rather than silently reopening historical scope. Provider-import retry remains owned by the durable import lifecycle rather than being disguised as a preparation-child retry.

Restarting terminal cancelled/failed preparation and creating expansion runs remain lifecycle-command concerns outside this worker service.

## Operational attention and telemetry

The reconciler logs aggregate run/batch timing only; it does not log provider payloads, PGNs, usernames, or account identity snapshots. Telemetry includes reconcile lag/decision, batch count, maximum queue wait, first-settlement latency, and total-settlement latency.

Persisted operational attention codes include:

- `RECONCILE_DUE_WARNING` after the configured 15-second initial threshold;
- `RECONCILE_DUE_CRITICAL` after 60 seconds;
- `PREPARATION_TASK_START_DELAY` after a queued child waits 30 seconds;
- `INDEX_NO_SETTLEMENT_WARNING` after two minutes without a settled index task;
- `ANALYSIS_NO_SETTLEMENT_WARNING` after five minutes without a settled analysis task.

Queued-start warnings require worker capacity to be available and are suppressed when higher-priority runnable work explains the wait. Once a preparation child is already running, higher-priority queued work does not explain a lack of settlement, so the stage-specific no-settlement warning remains eligible.

## Direct-user races

A direct job that commits before preparation candidate selection is excluded from the preparation batch. When preparation commits first and a direct action is accepted immediately afterward, one duplicate may remain queued. This is safe by the existing worker contract: the direct job has higher priority, the active-game `workKey` fence prevents overlapping execution, and the idempotent executor later skips already-current preparation work.

## Integration points

ONB-009 can consume the internal pause/resume/cancel/retry methods when it adds authenticated lifecycle commands; it must not duplicate the reconciliation state machine. ONB-008 owns user disposition, readiness/presentation projection, and action mapping. ONB-015 owns account-sync/preparation import handoff and can set `currentImportRunId`; recoverable import attention observes that persisted handoff through the database wake path. ONB-019 owns destructive resource fences and replaces the existing admission guard rather than adding a second preparation admission path.
