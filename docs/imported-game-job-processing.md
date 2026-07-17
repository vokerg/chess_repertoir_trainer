# Persistent imported-game job processing

This document describes the target architecture and staged migration for durable imported-game indexing and analysis jobs.

The feature is under active migration. Sections labeled **Current** describe behavior already present on the feature branch. Sections labeled **Target** describe work that remains in later incremental pull requests.

## Why this exists

Imported-game indexing and analysis currently mix browser-side orchestration with an API-process compatibility queue. Accepted work is therefore difficult to observe and parts of the old flow still depend on the browser or API process lifetime.

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

Persisted task counts are aggregated for reads rather than duplicated as counters on each task. Reads fail loudly when persisted task rows do not account for the job's `totalTasks`.

PostgreSQL check constraints guard every persisted job kind, source, run status, and task status. These constraints also apply to raw worker SQL.

If an imported game is deleted, including through external-account deletion, its task rows are retained and `importedGameId` becomes `null`. Worker maintenance marks queued orphaned tasks as `SKIPPED` with an explanatory error.

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

The worker registers all four imported-game domain executors. The existing API-process in-memory queue remains temporarily for compatibility, but it delegates to the same imported-game processing and analysis services as the persistent worker rather than owning a second analysis implementation.

Analysis-backed jobs use the existing batch Stockfish configuration. `LOCAL_BATCH_STOCKFISH_ANALYSIS_ENABLED` must be enabled in the worker environment, and the selected local or WASM engine configuration must be usable there.

## Current domain execution

The worker executor registry maps persisted job kinds to the existing imported-game services:

- `INDEX_GAMES`: index plies and assign a missing opening;
- `ANALYSE_GAMES`: analyse an already-indexed standard-speed game and refresh analysis-derived tags after success;
- `PROCESS_GAMES`: run indexing/opening followed by analysis/tag refresh;
- `REFRESH_TAGS`: explicitly recalculate tags without running Stockfish.

Opening assignment remains part of indexing. Tag refresh remains part of successful analysis. They are not normally separate persisted tasks; `REFRESH_TAGS` exists for an explicit recalculation request.

Each analysis or processing task owns one Stockfish engine instance. The executor disposes it on completion, failure, or abort. Indexing and tag-only tasks do not create an engine.

The old batch queue now calls the same `ImportedGameProcessingService`, so migration compatibility does not duplicate the analysis algorithm.

## Data model

The operational model is deliberately small and master-detail:

```text
JobRun 1 ──── * JobTask
```

### JobRun

A job owns:

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

## Job priorities

Current user-action priorities are defined on job runs only:

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

Candidate rows are locked with `FOR UPDATE ... SKIP LOCKED`; expensive executor work always happens after the claim transaction commits. A worker continues the selected job for at most 25 tasks, checks for higher-priority runnable work between games, then touches `JobRun.updatedAt` and reselects. A global claim advances the selected job's scheduler timestamp so another worker can select the next equal-priority job instead of opening another slice on the same job.

A job moves to `RUNNING` on its first claim. Task completion reconciles the parent from persisted task states. All-success or success-plus-skipped jobs become `COMPLETED`; all-failed jobs become `FAILED`; all-cancelled jobs become `CANCELLED`; mixed failed/cancelled terminal outcomes become `PARTIALLY_FAILED`.

## Idempotency, freshness, and duplicate work

Different jobs may contain tasks for the same game so that each job retains understandable progress and terminal results.

**Current:** PostgreSQL has a partial unique index allowing only one `RUNNING` task for an imported game across every job kind. Each successful claim receives a new opaque `workKey`. Heartbeat, completion, failure, and release writes require the exact task id, job id, `RUNNING` state, and work key. After stale recovery clears the key, an old worker can no longer settle a replacement claim.

Workers heartbeat active tasks. Maintenance returns stale `RUNNING` tasks to `QUEUED`, clears their claim key, and updates the parent scheduler timestamp. This is infrastructure recovery after a lost process, not configurable business retry machinery.

Domain execution is idempotent at the existing service boundaries:

- indexing returns `SKIPPED` when plies are already indexed and the opening is already present or cannot be matched;
- non-forced analysis returns `SKIPPED` when all plies and the latest completed run are already current, while still refreshing tags so tag logic changes can be repaired;
- processing composes those checks;
- forced work reruns the requested indexing and analysis behavior.

During migration, analysis can still arrive from both the legacy client workflow and the persistent worker. A PostgreSQL guard prevents an older `GameAnalysisRun` from overwriting the denormalized latest-analysis snapshot of a newer run on `ImportedGame`.

## Graceful shutdown

**Current:** `SIGINT` and `SIGTERM` stop new claims and abort the active executor through an `AbortSignal`. Executors check the signal between domain steps and analysis chunks. Engine-backed executors dispose Stockfish on abort. The worker releases an aborted claim back to `QUEUED` and waits up to `JOB_WORKER_SHUTDOWN_TIMEOUT_MS` before reporting an unsuccessful shutdown. A process that dies without releasing its claim is handled by heartbeat expiry and stale recovery.

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
- Do not execute tasks or remove the old queue yet.

### PR2 — worker runtime and safe claiming

- Add the separate worker entry point and executor registry boundary.
- Claim tasks with short PostgreSQL transactions and `FOR UPDATE SKIP LOCKED`.
- Add active-game exclusion, per-claim fencing, heartbeat, and stale recovery.
- Add 25-task scheduling slices and higher-priority preemption between games.
- Add graceful shutdown and explicit orphan-task reconciliation.
- Document local and hosted worker operation.

### PR3 — job executors

- Implement indexing, analysis, complete processing, and explicit tag-refresh executors.
- Reuse one shared imported-game processing and analysis path from both worker and compatibility queue.
- Add idempotency, force behavior, abort propagation, isolated engine lifecycle, and stale-analysis snapshot protection.
- Keep the in-memory queue only as a compatibility wrapper until later API/frontend routing removes it.

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
- `docs/deployment.md` changes when worker runtime requirements change.
- `README.md` stops describing imported-game analysis as synchronous only after the old implementation is retired.
- OpenAPI remains generated from Fastify route schemas.
- Final cleanup searches README, `docs/`, package scripts, environment examples, tests, and code comments for obsolete or contradictory queue descriptions.

## Non-goals

- Redis, BullMQ, or another external broker;
- a generic workflow engine;
- per-task priorities or dependency graphs;
- configurable retry machinery in the initial implementation;
- duplicated task progress counters;
- a separate worker workspace before independent ownership or dependencies justify it;
- SSE or WebSockets in the initial frontend integration.
