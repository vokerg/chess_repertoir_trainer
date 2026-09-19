# ONB-000 — Onboarding and Data Lifecycle Program Foundation

Date: 2026-07-28

Task: ONB-000

GitHub issue: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Branch: `onb-000/issue-147-program-foundation`

Pull request: none

Final commit: recorded after final reconciliation

## Outcome

Established a repository-grounded program for progressive onboarding, durable recent-first game preparation, operator administration, destructive data lifecycle controls, and shared-position maintenance.

The work converts a broad product request into:

- a stable product/architecture foundation;
- a complete master plan;
- a phased roadmap;
- an immutable task queue;
- GitHub issue coordination;
- agent claim/release/report rules;
- a decision and open-question ledger;
- seven bounded research tasks and issues;
- explicit boundaries with the Visual Transformation and Repertoire Builder programs.

No production implementation was included.

## Scope delivered

Created `north-star/onboarding/` with:

- `README.md`;
- `FOUNDATION.md`;
- `MASTER_PLAN.md`;
- `ROADMAP.md`;
- `TASKS.md`;
- `GITHUB_ISSUES.md`;
- `STATUS.md`;
- `DECISIONS.md`;
- `OPEN_QUESTIONS.md`;
- `AGENTS.md`;
- task and report templates;
- task files ONB-000 through ONB-007;
- this foundation report.

Created GitHub issues:

- #147 — program tracker;
- #148 — lifecycle/default recipe;
- #149 — bounded import/backfill;
- #150 — progressive preparation orchestration;
- #151 — destructive lifecycle invariants;
- #152 — administrator architecture;
- #153 — orphan shared-position cleanup;
- #154 — throughput/progress benchmarks.

Created branch:

- `onb-000/issue-147-program-foundation` from `main`.

## Files inspected

### Repository and program guidance

- `AGENTS.md`
- `.agents/skills/api-feature/SKILL.md`
- `north-star/repertoire-builder/README.md`
- `north-star/repertoire-builder/AGENTS.md`
- `north-star/repertoire-builder/FOUNDATION.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/GITHUB_ISSUES.md`
- `north-star/repertoire-builder/tasks/_TEMPLATE.md`
- `transformation/MASTER_PLAN.md` on branch `visual_transformation`

### API, authentication, routing, and deployment

- `apps/api/src/app.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/auth/auth.config.ts`
- `apps/api/src/auth/auth.plugin.ts`
- `apps/api/src/auth/current-app-user.service.ts`
- `docs/deployment.md`
- `docs/imported-game-job-processing.md`
- `docs/player-chess-profile.md`

### Prisma and lifecycle

- `apps/api/prisma/schema.prisma`
- `apps/api/src/services/externalAccountService.ts`

### Provider import and eligibility

- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-eligibility.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-candidates.service.ts`

### Durable jobs and processing

- `apps/api/src/modules/jobs/job-run.routes.ts`
- `apps/api/src/modules/jobs/job-run.service.ts`
- `apps/api/src/modules/jobs/job-run.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-worker.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `apps/api/src/modules/jobs/job-worker.config.ts`
- `apps/api/src/modules/jobs/job-task-executor.ts`
- `apps/api/src/modules/jobs/imported-game-job-executors.ts`
- `apps/api/src/modules/imported-games/imported-game-processing.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`

### Angular

- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/auth/auth.guard.ts`
- `apps/web/src/app/core/auth/auth.service.ts`
- `apps/web/src/app/core/jobs/imported-game-job.store.ts`
- `apps/web/src/app/core/jobs/imported-game-job-panel.component.html`
- `apps/web/src/app/features/accounts/data-access/accounts-api.service.ts`
- `apps/web/src/app/features/accounts/state/accounts.store.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.html`

### Courses

- `apps/api/src/modules/courses/courses.routes.ts`

## Current-state findings

### Import is the first architectural blocker

A first Lichess sync without a cursor does not apply a lower date bound. A first Chess.com sync without a cursor traverses all archives. Both provider imports execute inside the account-sync HTTP request.

This directly conflicts with the target experience of recent-first value and background continuation.

### The per-game worker should be retained

The current JobRun/JobTask worker already provides the difficult execution mechanics:

- durable PostgreSQL task state;
- per-game claims and fencing;
- priority;
- cancellation and retry;
- heartbeat and stale recovery;
- process restart behavior;
- API/worker separation;
- Angular progress polling.

The missing piece is a small parent orchestration and an account-level import boundary, not a replacement queue.

### Worker slices are not onboarding batches

`JOB_WORKER_SLICE_SIZE=25` is a scheduling fairness setting. It should not be exposed or reused as the product wave contract.

A visible wave of approximately 50 games is retained only as a provisional policy to benchmark and validate.

### Indexing is the best first-value stage

Indexing is engine-free, links game plies to shared positions, and assigns missing openings. It can unlock useful opening and navigation evidence before Stockfish analysis completes.

The recommended sequence is import, index, then analyse, with separately observable stages.

### Data deletion has a useful cascade base but unsafe partial semantics

Deleting an external account already cascades much of the account-owned game data. Shared Position and PositionAnalysis rows survive, which is useful for reuse.

However, un-index, un-analyse, account purge while retaining configuration, and whole-user deletion require a detailed model matrix and active-worker protocol. They must not be implemented as raw table deletes.

### Administration is a separate operator control plane

There is no administrator guard, read model, audit record, or UI. The preferred direction is to reuse verified existing identity with server-side administrator authorization and an environment-defined grant, not introduce credentials in source or browser code.

Read-only diagnostics should precede mutations.

### Shared-position cleanup is distinct from course data

A shared Position is referenced by ImportedGamePly. Course MoveNode is a separate course-tree model and must not be treated as an unused shared move.

Cleanup should use a database `NOT EXISTS` eligibility rule, bounded batches, a grace period, audit, and concurrency testing.

### Program coordination is required

Visual Transformation #133 already owns eventual onboarding visual/accessibility polish. This program owns functional state, contracts, orchestration, recovery, and lifecycle.

Repertoire Builder #105 consumes prepared evidence but retains ownership of repertoire decisions and course-generation behavior.

## Alternatives considered

### One synchronous import-and-analysis request

Rejected. It couples provider traversal, database writes, engine work, and browser/API lifetime and delays all value.

### Full history first

Rejected. It maximizes cost and wait before the product demonstrates value.

### Client-side batching

Rejected. It is not durable across navigation/session/device and would move orchestration into the wrong layer.

### Replace the current job worker

Rejected. Existing durable per-game mechanics are already suitable.

### Generic workflow platform

Rejected for now. The program needs one bounded account-import mechanism and one small preparation parent, not arbitrary DAG infrastructure.

### Hardcoded administrator access

Rejected. It is difficult to rotate, unattributable, and risks exposure in source or browser code.

### Delete shared positions during every account purge

Rejected. Shared chess analysis is reusable and has a separate cleanup lifecycle.

### Build final onboarding visuals immediately

Rejected. Functional states and data semantics need research first, and final presentation belongs with #133.

## Recommendation

### Functional architecture

- Persist a user-owned onboarding/data-preparation run.
- Persist account-level import commands.
- Model bounded initial import, forward sync, and historical backfill separately.
- Reuse existing imported-game JobRuns for index and analysis.
- Create bounded preparation waves only when they improve first value, queue control, or recovery.
- Expose server-derived readiness and exact counts.
- Let Angular consume one lifecycle projection and existing technical job state.
- Support leaving/re-entering the flow.

### Default product direction

- one selected account initially;
- standard blitz and rapid;
- recent three-month scope;
- import first;
- indexing/opening preparation second;
- engine analysis in the background;
- optional older-history and additional-account expansion.

The exact date/rated/wave policy remains delegated to research.

### Administration and lifecycle

- use server-authorized operator identity;
- add paginated database read models;
- add audit/idempotency/preview before mutations;
- define a complete model lifecycle matrix;
- coordinate active workers before destructive success;
- keep shared-position cleanup separate and database-only.

## Decisions

The foundation locked these decisions:

- onboarding is progressive server-side preparation;
- recent-first rather than full-history-first;
- standard blitz+rapid default;
- import → index → analysis;
- reuse JobRun/JobTask;
- no client-side bulk processing;
- no ETA without measurements;
- no credentials embedded in source/client;
- read-only administration first;
- audited domain lifecycle operations;
- separate shared-position cleanup;
- explicit Visual Transformation and Repertoire Builder boundaries.

Provisional decisions are recorded in `DECISIONS.md` and assigned to ONB-001 through ONB-007.

## Validation performed

- Opened and read current repository implementation files directly through the GitHub connector.
- Traced account sync from route to provider service to Prisma models.
- Traced job creation, task claims, worker execution, cancellation, stale recovery, and Angular progress display.
- Inspected Prisma ownership and cascade relationships.
- Inspected authentication and route registration.
- Inspected current course ownership routes.
- Inspected Repertoire Builder task/agent/issue conventions.
- Inspected Visual Transformation onboarding overlap.
- Searched existing open issues for onboarding, administration, purge, and cleanup overlap.
- Created program and research issues.
- Created and populated the planning branch.

## Validation skipped

- No application code changed.
- No Prisma migration changed.
- No build, lint, test, browser, database, provider, Stockfish, load, or deployment validation was run.
- No pull request was opened.
- No branch was merged.

These omissions are appropriate for a documentation-only foundation task and are recorded rather than implied complete.

## Security, privacy, and lifecycle impact

No runtime security or data behavior changed.

The plan explicitly requires:

- server-side administrator authorization;
- no source/client authority material;
- audit and idempotency;
- active-worker safety;
- privacy/data-control wording;
- exact retained/deleted semantics;
- minimal audit snapshots;
- separate shared anonymous chess-computation policy review.

## Performance and operational impact

No runtime impact.

The plan identifies a performance dependency before implementation:

- import, indexing, analysis, engine startup, and first-value throughput must be benchmarked;
- visible waves must be policy/configuration, not copied from worker slice size;
- exact progress is available before ETA;
- worker scaling or engine reuse is deferred until a demonstrated bottleneck.

## Residual risks

- The exact onboarding state machine is not approved.
- The date/rated/default recipe policy is not approved.
- The provider import persistence and cursor design are not approved.
- The preparation parent/wave schema is not approved.
- Throughput and wave size are unmeasured.
- Partial reset lifecycle remains unresolved.
- Administrator authorization/audit shape remains unresolved.
- Shared-position cleanup concurrency remains unresolved.
- Visual Transformation branch integration requires active coordination.
- Mobile-native onboarding scope remains open.

These are intentional research tasks, not omissions to be silently solved in implementation.

## Follow-up tasks

Deterministic next task:

- ONB-001 / #148.

Parallel-safe research after collision review:

- ONB-002 / #149;
- ONB-003 / #150;
- ONB-004 / #151;
- ONB-007 / #154.

Supporting research:

- ONB-005 / #152;
- ONB-006 / #153.

Implementation issues should be opened only after the owning research report defines bounded contracts.

## Queue and roadmap impact

- A new standalone program exists without changing the Repertoire Builder queue.
- Visual Transformation #133 remains the final visual/accessibility integration owner.
- Seven research tasks are READY.
- No production implementation task is READY yet.
- ONB-001 is the deterministic next task.

## Handoff

Review the foundation branch and master plan. After acceptance, merge only through the repository's normal reviewed process and explicit user instruction.

An agent picking up ONB-001 should claim #148 and create a separate task branch according to `north-star/onboarding/AGENTS.md`.
