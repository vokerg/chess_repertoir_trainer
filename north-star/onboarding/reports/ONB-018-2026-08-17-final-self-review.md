# ONB-018 final self-review — 2026-08-17

## Outcome

Fresh merge-readiness review found one additional failure-atomicity defect in the pre-engine analysis setup-failure path. The defect was fixed on the ONB-018 branch before merge. No additional orchestration, lifecycle, queueing, fairness, or deployment blockers were found in the re-read critical paths.

## Finding and fix

The prior setup-failure implementation persisted a failed analysis attempt in two transactions: first create a `RUNNING` `GameAnalysisRun`, then transition it to `FAILED`. If the second persistence step failed after the first committed, the preparation job task could still settle `FAILED` while `ImportedGame.latestAnalysisStatus` remained `RUNNING`. That orphan current-running evidence could prevent preparation analysis completion indefinitely.

The fix moves setup-failure persistence into `recordGameAnalysisSetupFailure(...)` in the existing analysis lifecycle repository. It now:

- locks the owned `ImportedGame` row;
- re-reads current analysis evidence while holding that lock;
- preserves a current completed analysis for non-forced work;
- creates the failed `GameAnalysisRun` directly as `FAILED`;
- updates the imported-game latest-analysis snapshot in the same PostgreSQL transaction.

The executor continues to surface the original engine/configuration error to the job worker. The preparation reconciler therefore receives durable terminal failed evidence without introducing ONB-specific failure storage or automatic retry behavior.

## Regression coverage

Added `apps/api/test/analysis/analysis-setup-failure.repository.test.mjs` covering:

- atomic failed-run plus latest-snapshot persistence for fresh work;
- preservation of a current completed analysis for non-forced setup failure;
- forced setup failure retained as a distinct failed attempt;
- owned-game validation for missing input.

The existing executor setup-failure test remains the boundary check that pre-engine failure is forwarded to lifecycle persistence and the original execution error is retained.

## Merge-readiness re-check

Re-read the current branch versions of the preparation reconciler, preparation claim repository, bounded admission repository, imported-game job executor, guarded analysis execution service, and analysis lifecycle repository. Re-checked current `main`, PR mergeability, review threads, and production worker Stockfish configuration from the previous review. No new conflict or ownership issue was found.

## Validation

Final exact-head CI must pass after this report commit before squash merge. The merge must use the current expected PR head SHA and ONB-018 remains `REVIEW` until the implementation PR is merged. Program `DONE` reconciliation is a post-merge closeout step per `north-star/onboarding/AGENTS.md`.

## Files inspected

- `apps/api/src/modules/preparation/preparation-reconciler.service.ts`
- `apps/api/src/modules/preparation/preparation-reconciler.repository.prisma.ts`
- `apps/api/src/modules/preparation/preparation.repository.prisma.ts`
- `apps/api/src/modules/jobs/imported-game-job-executors.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`
- `apps/api/src/modules/analysis/analysis-run-lifecycle.repository.prisma.ts`
- `apps/api/src/modules/analysis/analysis.repository.prisma.ts`
- `apps/api/test/analysis/imported-game-analysis-setup-failure.test.mjs`
- `apps/api/test/analysis/latest-analysis-snapshot.test.mjs`
- `north-star/onboarding/tasks/ONB-018-preparation-reconciliation-control.md`
- `north-star/onboarding/AGENTS.md`
- live PR #385 and current `main`
