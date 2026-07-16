# Persistent imported-game job processing

This document describes the target architecture and staged migration for durable imported-game indexing and analysis jobs.

The feature is under active migration. Sections labeled **Current** describe behavior already present on the feature branch. Sections labeled **Target** describe work that remains in later incremental pull requests.

## Why this exists

Imported-game indexing and analysis currently mix browser-side orchestration with an API-process in-memory analysis queue. That makes accepted work difficult to observe, dependent on the browser or API process lifetime, and unsuitable for fair prioritisation across users and workflows.

The migration replaces that orchestration with PostgreSQL-backed jobs that remain visible across navigation, browser restarts, and API restarts.

## Delivery model

The complete feature accumulates on `feature/persistent-game-jobs`, with a draft pull request targeting `main`.

Each implementation slice is developed on a child branch and reviewed through a smaller pull request targeting the feature branch. The feature pull request remains draft until execution, frontend integration, deployment support, tests, cleanup, and documentation are complete.

## Target data model

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
- imported game;
- newest-first ordinal;
- lifecycle status;
- optional active execution key;
- terminal error;
- timestamps.

Tasks do not duplicate move-level analysis progress, configurable retry counters, dependency graphs, or per-task priorities. Existing `GameAnalysisRun.positionsDone` and `positionsTotal` remain the source for live Stockfish progress.

## Target job kinds

- `INDEX_GAMES`: index plies and assign a missing opening.
- `ANALYSE_GAMES`: analyse an indexed game and refresh analysis-derived tags after success.
- `PROCESS_GAMES`: run indexing/opening followed by analysis/tag refresh for each game.
- `REFRESH_TAGS`: explicitly recalculate tags without rerunning analysis.

Opening assignment is part of indexing. Tag refresh is part of successful analysis. They are not normally separate persisted tasks.

## Ordering and scheduling

Games are ordered server-side by:

```text
endedAt DESC
id DESC
```

The stable ordinal records that order inside a job.

The target worker selects runnable work through the parent job:

```text
JobRun.priority DESC
JobRun.updatedAt ASC
JobTask.ordinal ASC
```

Execution groups of 25 are derived from ordered tasks and are not persisted as another model or column. The worker re-evaluates higher-priority work between games and reselects jobs after a scheduling slice.

## Duplicate work

Different jobs may contain tasks for the same game so that each job retains understandable progress and terminal results.

An active execution key prevents two workers from simultaneously performing the same work class for one game. A later duplicate task performs an idempotency check and may finish as `SKIPPED` when the requested result is already current.

## Worker boundary

**Target:** the worker is a separate runtime process with an independent entry point and lifecycle, initially inside `apps/api`:

```text
apps/api/src/main.ts    HTTP API process
apps/api/src/worker.ts  background worker process
```

Keeping both entry points in the API workspace allows the worker to reuse existing application services and Prisma repositories without prematurely extracting another package. Deployment runs the API and worker as separate process types.

## API and frontend direction

**Target:** domain-specific submission endpoints create jobs; authenticated job endpoints expose summaries and task details.

The Angular application owns a root-scoped job store and a bottom job panel that survives route navigation. It polls only while active work exists and uses `GameAnalysisRun` for move-level analysis progress.

Browser code will no longer control indexing concurrency or mark every accepted game as already running.

## Incremental delivery

### PR1 — persisted foundation and read model

- Add minimal `JobRun` and `JobTask` persistence and migration.
- Add shared job contracts.
- Add authenticated creation and read services/routes with ownership checks.
- Preserve newest-first task order and job-level priority constants.
- Add focused API/contract tests and document the foundation.
- Do not execute tasks or remove the old queue yet.

### PR2 — worker runtime and safe claiming

- Add the separate worker entry point.
- Claim tasks with short PostgreSQL transactions and `FOR UPDATE SKIP LOCKED`.
- Add scheduling slices, active execution exclusion, stale-running recovery, and graceful shutdown.
- Document local and hosted worker operation.

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
