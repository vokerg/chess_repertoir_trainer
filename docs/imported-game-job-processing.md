# Persistent imported-game job processing

This document describes the durable imported-game indexing and analysis architecture.

## Why this exists

Imported-game processing previously mixed browser-side indexing and whole-game Stockfish orchestration with an API-process in-memory queue. Accepted work depended on browser or API process lifetime and was difficult to observe consistently.

User-requested indexing, analysis, full processing, and explicit tag refresh now run through PostgreSQL-backed jobs that remain visible across navigation, browser reloads, and API restarts.

## Delivery model

The complete feature accumulates on `feature/persistent-game-jobs`, with a pull request targeting `main`.

Implementation was delivered through reviewed child pull requests for persistence, worker infrastructure, domain executors, frontend migration, and lifecycle completion.

Onboarding and automatic processing immediately after account imports are deliberately deferred to separate product stories.

## Runtime boundary

The API and worker are separate runtime entry points inside `apps/api`:

```text
apps/api/src/main.ts    HTTP API process
apps/api/src/worker.ts  persistent-job worker process
```

They share Prisma repositories and application services but have independent startup, shutdown, and database connections.

Local commands:

```bash
npm run dev:api
npm run dev:worker
```

Production commands:

```bash
npm run start --workspace=apps/api
npm run start:worker --workspace=apps/api
```

The API process does not run an imported-game processing queue. A deployed environment that accepts imported-game jobs must run the worker.

## HTTP surface

Current authenticated routes are:

```http
POST /api/imported-games/job-runs
GET  /api/job-runs
GET  /api/job-runs/:jobRunId
GET  /api/job-runs/:jobRunId/tasks
POST /api/job-runs/:jobRunId/cancel
POST /api/job-runs/:jobRunId/retry
```

All routes use shared schemas from `@chess-trainer/contracts/jobs`, Fastify route validation, generated OpenAPI, and current-user ownership checks.

Job creation validates ownership, removes duplicate requested ids, selects owned games in newest-first order, and records stable task ordinals. Missing and non-owned ids are returned together as rejected ids without exposing which case applied.

Cancellation and retry are ownership-scoped. A job belonging to another user is reported as not found.

## Data model

The operational model is deliberately small:

```text
JobRun 1 ──── * JobTask
```

### JobRun

A job owns:

- user ownership;
- job kind;
- source;
- job-level priority;
- lifecycle status;
- requested task count;
- force mode;
- timestamps.

### JobTask

A task represents one imported game inside one job. It owns:

- parent job;
- nullable imported-game reference;
- newest-first ordinal;
- lifecycle status;
- optional opaque active-claim key;
- terminal error;
- timestamps.

If an imported game is deleted, including through external-account deletion, task history remains and `importedGameId` becomes `null`. Worker maintenance marks queued orphaned tasks `SKIPPED` with an explanatory error.

Tasks do not duplicate move-level analysis progress, configurable retry counters, dependency graphs, or per-task priorities. `GameAnalysisRun.positionsDone` and `positionsTotal` remain the live Stockfish progress source.

Persisted task counts are aggregated for reads rather than duplicated on the job. Reads fail loudly if task rows do not account for `totalTasks`.

PostgreSQL check constraints guard persisted job kinds, sources, run statuses, and task statuses, including raw worker SQL.

## Job kinds and execution

The worker executor registry maps persisted job kinds to domain services:

- `INDEX_GAMES`: index plies and assign a missing opening;
- `ANALYSE_GAMES`: analyse an already-indexed standard-speed game and refresh analysis-derived tags after success;
- `PROCESS_GAMES`: run indexing/opening followed by analysis/tag refresh;
- `REFRESH_TAGS`: explicitly recalculate tags without running Stockfish.

Opening assignment remains part of indexing. Tag refresh remains part of successful analysis. `REFRESH_TAGS` exists only for an explicit recalculation request.

Each analysis or processing task owns one Stockfish engine instance and disposes it on completion, failure, or abort. Indexing and tag-only tasks are engine-free.

Analysis-backed jobs use the existing batch Stockfish configuration. `LOCAL_BATCH_STOCKFISH_ANALYSIS_ENABLED` must be enabled in the worker environment, and the selected local or WASM engine must be available there.

## Frontend integration

Angular owns one root-scoped imported-game job API/store and a bottom job panel mounted by `AppComponent`.

The store:

- restores active jobs and game ids after authentication and reload;
- polls only while active jobs exist;
- exposes persisted queued/running state instead of optimistic row patches;
- detects terminal transitions and publishes affected game ids;
- discards stale responses after sign-out or account-session changes;
- keeps progress visible across route navigation;
- submits cancellation and retry actions.

The panel shows job kind, status, task totals, settled progress, running count, failures, and cancellations. Active jobs expose **Cancel**. Terminal jobs containing failed or cancelled tasks expose **Retry failed**.

Games Explorer preserves per-game **Index** and **Analyse** actions and submits one durable job for a single game or the currently visible games. Visible-game tag refresh submits one `REFRESH_TAGS` job.

Account workflow actions submit one durable job for the confirmed account batch instead of calling one processing endpoint per game from the browser.

Single-game review preserves **Full refresh** and submits a forced `PROCESS_GAMES` job. While analysis is active, the page reads `GameAnalysisRun.positionsDone` and `positionsTotal` and reloads game data when the job settles.

Interactive analysis of the currently selected board position remains browser-side. The browser no longer controls imported-game indexing concurrency, whole-game Stockfish loops, classifications, or tag workflows.

## Priorities and ordering

User-action priorities belong to job runs:

```text
INDEX_GAMES    400
PROCESS_GAMES  350
ANALYSE_GAMES  300
REFRESH_TAGS   250
```

Games are ordered server-side by:

```text
endedAt DESC
id DESC
```

The stable task ordinal records that order inside the job.

Worker claim order is:

```text
JobRun.priority DESC
JobRun.updatedAt ASC
JobRun.id ASC
JobTask.ordinal ASC
JobTask.id ASC
```

Candidate rows are locked with `FOR UPDATE ... SKIP LOCKED`. Expensive executor work always runs after the claim transaction commits.

A worker continues the selected job for at most 25 tasks, checks for higher-priority runnable work between games, then updates the job scheduler timestamp and reselects. A global claim also advances that timestamp so another worker can select another equal-priority job rather than opening a second slice on the same job.

## Claim safety and idempotency

Different jobs may contain tasks for the same game so each job retains understandable progress and terminal results.

A PostgreSQL partial unique index allows only one `RUNNING` task for an imported game across all job kinds. Each successful claim receives a new opaque `workKey`.

Heartbeat, completion, failure, and release writes require the exact task id, job id, `RUNNING` state, and work key. Once stale recovery or cancellation clears the key, an old worker cannot settle that claim.

Workers heartbeat active tasks. Maintenance returns stale `RUNNING` tasks to `QUEUED`, clears their claim key, and updates the parent scheduler timestamp. This is infrastructure recovery after a lost process, not configurable business retry machinery.

Domain execution remains idempotent at existing service boundaries:

- indexing skips when plies are current and opening work is complete or unmatched;
- non-forced analysis skips when plies and the latest completed run are current, while still refreshing tags;
- processing composes those checks;
- forced work reruns requested indexing and analysis behavior.

A PostgreSQL freshness guard prevents an older `GameAnalysisRun` from replacing a newer denormalized latest-analysis snapshot on `ImportedGame`.

## Cancellation

Cancellation is a persisted state transition, not an in-memory worker signal.

The cancel transaction:

1. locks and ownership-checks the job;
2. changes every queued or running task to `CANCELLED`;
3. clears active `workKey` values;
4. records a cancellation error on affected tasks;
5. reconciles the parent job to `CANCELLED` or `PARTIALLY_FAILED`.

Clearing a running task's key causes its next heartbeat to lose the fenced claim. The worker aborts the executor through its existing `AbortSignal`, and the stale executor cannot later write completion or failure.

Cancellation is idempotent for an already-terminal owned job.

## Retry

Retry never mutates the original run and does not add retry counters.

`POST /api/job-runs/:jobRunId/retry` creates a new `USER_ACTION` job containing only existing owned games whose source tasks ended `FAILED` or `CANCELLED`. The new job preserves the source kind and force mode and receives the current user-action priority.

Active jobs and terminal jobs with no failed or cancelled games return `JOB_RUN_NOT_RETRYABLE`.

Deleted games are omitted naturally because their task references are `null`. Any game that disappears between retry selection and new-job creation is reported in the new job's rejected ids.

## Terminal history retention

The worker removes terminal jobs whose `completedAt` is older than the configured retention window. `JobTask` rows are removed through the existing cascade.

```text
JOB_WORKER_TERMINAL_RETENTION_DAYS=30
```

Cleanup runs at worker startup and hourly. It never deletes queued or running jobs and never uses `updatedAt` as the retention boundary.

## Graceful shutdown

`SIGINT` and `SIGTERM` stop new claims and abort the active executor through an `AbortSignal`. Executors check the signal between domain steps and analysis chunks. Engine-backed executors dispose Stockfish on abort.

During shutdown, the worker releases an active claim back to `QUEUED` when possible and waits up to `JOB_WORKER_SHUTDOWN_TIMEOUT_MS`. A process that dies without releasing its claim is handled by heartbeat expiry and stale recovery.

`JOB_WORKER_STALE_AFTER_MS` must remain greater than twice `JOB_WORKER_HEARTBEAT_INTERVAL_MS`.

## Deferred product stories

The durable job foundation does not automatically process games after an account import and does not enqueue an onboarding backlog. Those behaviors require separate product decisions about eligibility, history range, user consent, and capacity.

## Non-goals

- Redis, BullMQ, or another external broker;
- a generic workflow engine;
- per-task priorities or dependency graphs;
- mutable or configurable retry counters;
- duplicated task progress counters;
- a separate worker workspace before independent ownership or dependencies justify it;
- SSE or WebSockets for initial progress delivery;
- automatic onboarding or post-import processing in this delivery.
