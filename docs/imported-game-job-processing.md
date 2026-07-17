# Persistent imported-game job processing

This document describes the target architecture and staged migration for durable imported-game indexing and analysis jobs.

The feature is under active migration. Sections labeled **Current** describe behavior already present on the feature branch. Sections labeled **Target** describe work that remains in later incremental pull requests.

## Why this exists

Imported-game indexing and analysis currently mix browser-side orchestration with an API-process in-memory analysis queue. That makes accepted work difficult to observe, dependent on the browser or API process lifetime, and unsuitable for fair prioritisation across users and workflows.

The migration replaces that orchestration with PostgreSQL-backed jobs that remain visible across navigation, browser restarts, and API restarts.

## Delivery model

The complete feature accumulates on `feature/persistent-game-jobs`, with a draft pull request targeting `main`.

Each implementation slice is developed on a child branch and reviewed through a smaller pull request targeting the feature branch. The feature pull request remains draft until execution, frontend integration, deployment support, tests, cleanup, and documentation are complete.

## Current foundation

**Current:** `JobRun` and `JobTask` are persisted as a master-detail model. The API can create user-action jobs for owned imported games and read current-user job summaries and ordered tasks.

Creation validates ownership, removes duplicate requested ids, selects owned games in newest-first order, and records stable task ordinals. Non-owned or missing ids are returned together as rejected ids without exposing which case applied.

Current routes are:

```http
POST /api/imported-games/job-runs
GET  /api/job-runs
GET  /api/job-runs/:jobRunId
GET  /api/job-runs/:jobRunId/tasks
```

All routes use shared schemas from `@chess-trainer/contracts/jobs`, Fastify route-schema validation, generated OpenAPI, and current-user ownership checks.

The persisted task counts are aggregated for reads rather than duplicated as counters on each task. The creation response can return its known all-queued count without another aggregate query. Reads fail loudly when persisted task rows do not account for the job's `totalTasks`.

PostgreSQL check constraints guard every persisted job kind, source, run status, and task status. These constraints also apply to raw worker SQL, so invalid lifecycle literals cannot be persisted outside Prisma.

If an imported game is deleted, including through external-account deletion, its task rows are retained and `importedGameId` becomes `null`. This preserves job history and keeps aggregate task counts consistent. Worker maintenance marks queued orphaned tasks as `SKIPPED` with an explanatory error.

## Current worker infrastructure

**Current:** the worker is a separate runtime entry point inside `apps/api`:

```text
apps/api/src/main.ts    HTTP API process
apps/api/src/worker.ts  persistent-job worker process
```

The processes share Prisma repositories and application code but have independent startup, shutdown, and database connections. Local commands are:

```bash
npm run dev:api
npm run dev:worker
```

Production commands are:

```bash
npm run start --workspace=apps/api
npm run start:worker --workspace=apps/api
```

The worker currently owns infrastructure only. Its production executor registry is intentionally empty until PR3, so it performs stale/orphan maintenance but does not claim the queued indexing, analysis, processing, or tag-refresh tasks yet. Existing browser orchestration and the API-process in-memory analysis queue remain active during this migration stage.

## Data model

The operational model is deliberately small and master-detail:

```text
JobRun 1 ──── * JobTask
```

### JobRun

A job is the user-visible or system-visible request. It owns:

- user ownership;
- job kind;
- source;
- priority;
- lifecycle status;
- requested task count;
- force mode;
- timestamps.

Priority belongs only to the job. Tasks inherit effective priority through their parent job.

### JobTask

A task is one imported game inside one job. It owns:

- parent job;
- nullable imported-game reference, retained as `null` after source-game deletion;
- newest-first ordinal;
- lifecycle status;
- optional opaque active-claim key;
- terminal error;
- timestamps.

Tasks do not duplicate move-level analysis progress, configurable retry counters, dependency graphs, or per-task priorities. Existing `GameAnalysisRun.positionsDone` and `positionsTotal` remain the source for live Stockfish progress.

## Job kinds

- `INDEX_GAMES`: index plies and assign a missing opening.
- `ANALYSE_GAMES`: analyse an indexed game and refresh analysis-derived tags after success.
- `PROCESS_GAMES`: run indexing/opening followed by analysis/tag refresh for each game.
- `REFRESH_TAGS`: explicitly recalculate tags without rerunning analysis.

Opening assignment is part of indexing. Tag refresh is part of successful analysis. They are not normally separate persisted tasks.

The current user-action priorities are intentionally defined on job runs only:

```text
INDEX_GAMES   400
PROCESS_GAMES 350
ANALYSE_GAMES 300
REFRESH_TAGS  250
```

Later system-created jobs use the same job-level priority boundary rather than adding task priority.

## Ordering and scheduling

Games are ordered server-side by:

```text
endedAt DESC
id DESC
```

The stable ordinal records that order inside a job.

**Current:** the worker claims runnable work through the parent job using short PostgreSQL transactions and this order:

```text
JobRun.priority DESC
JobRun.updatedAt ASC
JobRun.id ASC
JobTask.ordinal ASC
JobTask.id ASC
```

Candidate rows are locked with `FOR UPDATE ... SKIP LOCKED`; expensive executor work always happens after the claim transaction commits. A worker continues the selected job for at most 25 tasks, checks for higher-priority runnable work between games, then touches `JobRun.updatedAt` and reselects. The slice size is derived behavior, not another persisted model or column.

A job moves to `RUNNING` on its first claim. Task completion reconciles the parent from persisted task states. All-success or success-plus-skipped jobs become `COMPLETED`; all-failed jobs become `FAILED`; all-cancelled jobs become `CANCELLED`; mixed failed/cancelled terminal outcomes become `PARTIALLY_FAILED`.

## Claim safety and duplicate work

Different jobs may contain tasks for the same game so that each job retains understandable progress and terminal results.

**Current:** PostgreSQL has a partial unique index allowing only one `RUNNING` task for an imported game across every job kind. Each successful claim also receives a new opaque `workKey`. Heartbeat, completion, failure, and release writes require the exact task id, job id, `RUNNING` state, and work key. After stale recovery clears the key, an old worker can no longer settle a replacement claim.

Workers heartbeat active tasks. Maintenance returns stale `RUNNING` tasks to `QUEUED`, clears their claim key, and updates the parent scheduler timestamp. This is infrastructure recovery after a lost process, not configurable business retry machinery. PR3 executors must still be idempotent because a crashed process may have performed part of its external work before the stale claim is recovered.

**Target:** after PR3 adds domain executors, a later duplicate task performs an idempotency check and may finish as `SKIPPED` when the requested result is already current.

## Graceful shutdown

**Current:** `SIGINT` and `SIGTERM` stop new claims and abort the active executor through an `AbortSignal`. An executor that observes the signal returns its claim to `QUEUED`; the process waits up to `JOB_WORKER_SHUTDOWN_TIMEOUT_MS` before reporting an unsuccessful shutdown. A process that dies without releasing its claim is handled by heartbeat expiry and stale recovery.

Worker timing settings are documented in `.env.example`. `JOB_WORKER_STALE_AFTER_MS` must be greater than twice `JOB_WORKER_HEARTBEAT_INTERVAL_MS`.

## Frontend direction

**Target:** the Angular application owns a root-scoped job store and a bottom job panel that survives route navigation. It polls only while active work exists and uses `GameAnalysisRun` for move-level analysis progress.

Browser code will no longer control indexing concurrency or mark every accepted game as already running.

## Incremental delivery

### PR1 — persisted foundation and read model

- Add minimal `JobRun` and `JobTask` persistence and migration.
- Add shared job contracts.
- Add authenticated creation and read services/routes with ownership checks.
- Preserve newest-first task order and job-level priority constants.
- Preserve task history after imported-game/account deletion.
- Enforce lifecycle literals at the PostgreSQL boundary and fail loudly on count corruption.
- Add focused API/contract tests and document the foundation.
- Do not execute tasks or remove the old queue yet.

### PR2 — worker runtime and safe claiming

- Add the separate worker entry point and executor registry boundary.
- Claim tasks with short PostgreSQL transactions and `FOR UPDATE SKIP LOCKED`.
- Add active-game exclusion, per-claim fencing, heartbeat, and stale recovery.
- Add 25-task scheduling slices and higher-priority preemption between games.
- Add graceful shutdown and explicit orphan-task reconciliation.
- Document local and hosted worker operation.
- Keep production domain executors empty until PR3.

### PR3 — job executors

- Implement indexing, analysis, complete processing, and explicit tag-refresh executors.
- Reuse existing imported-game services.
- Add idempotency, force behavior, duplicate exclusion, and stale-analysis snapshot protection.
- Retire the in-memory analysis queue after compatibility routing exists.

### PR4 — global frontend progress

- Add the root job store/API and bottom job panel.
- Expose queued/running state without optimistic fake statuses.
- Refresh affected game data when jobs finish.

### PR5 — remove browser orchestration

- Replace Games Explorer and account-page loops with job submission.
- Track single-game full refresh through `PROCESS_GAMES`.
- Remove obsolete client methods and compatibility code.

### PR6 — account refresh, onboarding, retention, and cleanup

- Create processing jobs for newly imported games.
- Add low-priority onboarding.
- Add terminal-job retention, cancellation completion, and retry-by-new-job behavior.
- Remove obsolete queue code, settings, tests, comments, and documentation.

## Documentation rules during migration

Every incremental pull request updates the canonical documentation for behavior that becomes true in that pull request.

- `docs/README.md` indexes this canonical topic.
- `docs/architecture.md` changes only when module/runtime boundaries are implemented.
- `docs/deployment.md` changes when the worker process exists.
- `README.md` stops describing imported-game analysis as synchronous only after the old implementation is retired.
- OpenAPI remains generated from Fastify route schemas.
- The final cleanup searches README, `docs/`, package scripts, environment examples, tests, and code comments for obsolete or contradictory queue descriptions.

## Non-goals

- Redis, BullMQ, or another external broker;
- a generic workflow engine;
- per-task priorities or dependency graphs;
- configurable retry machinery in the initial implementation;
- duplicated task progress counters;
- a separate worker workspace before independent ownership or dependencies justify it;
- SSE or WebSockets in the initial frontend integration.
