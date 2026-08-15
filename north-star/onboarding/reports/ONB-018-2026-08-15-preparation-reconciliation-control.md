# ONB-018 — Progressive preparation reconciliation and control

Date: 2026-08-15

Task: [ONB-018](../tasks/ONB-018-preparation-reconciliation-control.md)

Issue: [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254)

Pull request: [#385](https://github.com/vokerg/chess_repertoir_trainer/pull/385)

Branch: `onb-018/issue-254-preparation-reconciliation-control`

## Outcome

ONB-018 adds the bounded PostgreSQL preparation reconciliation/control runtime on top of the ONB-017 durable run/target/batch and child-job admission boundary. The reconciler runs in the existing API worker deployment, advances preparation from current import/index/analysis evidence, and does not require a browser session.

No public lifecycle route, readiness projection, provider traversal, Angular UI, generic workflow framework, or ONB-019 destructive fence is added by this change.

## Implementation

### Reconciliation loop

- Claims one due preparation parent with `FOR UPDATE SKIP LOCKED` and a persisted `reconcileAfter` lease.
- Uses the existing worker deployment with a one-second active / five-second idle cadence.
- Uses at least the 15-second reconcile-warning budget as the parent claim lease so a second reconciler cannot immediately overlap a still-active claim.
- Limits each drain cycle to a bounded number of due parents.
- Keeps provider access, PGN processing, Stockfish, and child execution outside reconciliation transactions.

### Durable wake hints

A trigger-only migration moves active preparation parents due immediately when:

- `DataPreparationTarget.currentImportRunId` changes;
- linked `ImportRun` progress or lifecycle state changes;
- linked preparation `JobTask` settlement state or retained `workKey` changes;
- linked child `JobRun` changes state or is removed by retention.

The existing terminal child snapshot trigger is extended rather than replaced with a second retention path. Polling remains authoritative after restart.

### Progressive admission

The reconciler reuses `PreparationRepository.admitNextBatch(...)`; there is no second child-job admission implementation.

- Indexing can start from committed eligible `ImportedGame` rows before the linked import is terminal.
- Each run keeps at most one non-terminal index batch and one non-terminal analysis batch.
- First analysis starts when at least three current indexed/unanalysed games exist.
- A successfully completed, index-quiescent small account may use the configured one-game fallback.
- Index and analysis account fairness use separate counts of prior normal stage batches, then immutable target ordinal and ID.
- Retry batches are excluded from normal fairness cursors.
- Existing ONB-017 global preparation/task/analysis caps and direct-user priority ordering remain the admission authority.

### Evidence and milestones

Current imported-game evidence is authoritative for parent state.

The reconciler persists first imported/indexed/analysed and core-ready milestones. Core readiness requires successful terminal import coverage, no active preparation index batch, no clean unindexed eligible game, and at least one indexed success. Analysis is non-blocking for core readiness; current `RUNNING` analysis evidence remains non-terminal even when produced by direct-user work.

Terminal partial failures are retained as non-blocking `INDEXING_PARTIAL` / `ANALYSIS_PARTIAL` evidence. `NO_RECENT_GAMES`, `ALL_INDEXING_FAILED`, and terminal linked-import failure/paused states produce deterministic attention instead of an automatic retry loop.

### Controls

- Pause is quiescence: new waves stop, linked imports are asked to pause, and existing child jobs are allowed to settle.
- Cancellation propagates to linked imports and child jobs and is not acknowledged while an import claim or child task `workKey` can still mutate state.
- Resume restarts linked paused imports and makes the parent due immediately.
- Preparation retry increments the retry generation and creates bounded `RETRY` batches only for current failed index/analysis evidence. Provider-import retry remains owned by the durable import lifecycle.

### Telemetry

Aggregate telemetry records reconciliation lag/decision plus batch queue, first-settlement, and total-settlement timing without provider payloads, PGNs, usernames, or account identity snapshots.

Operational warning thresholds implement the ONB-007 defaults:

- reconcile due: 15 seconds warning / 60 seconds critical;
- queued child start: 30 seconds only when worker capacity is actually free and no higher-priority runnable work explains the wait;
- index no-settlement: two minutes;
- analysis no-settlement: five minutes.

A running child is not treated as “explained by preemption”: higher-priority work can delay the next claim, but cannot explain a task that is already executing and has not settled.

## Self-review corrections

The implementation was re-read against ONB-001/003/007/017 and the current job/import worker behavior before review handoff. That review produced these corrections before final validation:

1. first-analysis small-account fallback is restricted to successfully completed import coverage rather than any terminal import;
2. current analysis `RUNNING` evidence is explicitly non-terminal, preventing early parent completion during direct-user analysis;
3. partial index/analysis failures remain visible as persisted warning evidence after successful core/analysis completion;
4. deterministic import attention waits until already-imported clean indexing backlog is drained, so a temporary global admission block cannot freeze useful imported work;
5. the reconcile claim lease is at least the 15-second warning budget rather than only the active/idle poll interval;
6. queued-start stall telemetry verifies real single-worker capacity, and higher-priority preemption suppresses queued-start warnings but not no-settlement warnings for an already-running task.

## Validation

ONB-018-specific tests added by this change cover:

- stage-specific index/analysis fairness with asymmetric histories;
- three-game first-analysis threshold and successful one-game fallback;
- progressive committed-import-to-index admission;
- concurrent index continuation and first-analysis admission;
- core readiness independent of analysis tail;
- admission-block behavior after linked import failure;
- analysis partial failure as a terminal non-core-blocking outcome;
- pause quiescence and cancellation acknowledgement with retained work keys;
- explicit retry limited to failed preparation evidence;
- one-second active / five-second idle controlled-clock behavior;
- reconcile/stall warning behavior including capacity and preemption distinctions;
- two-reconciler single-parent claiming;
- persisted wake hints for import handoff/progress and child settlement;
- retained child snapshots after job retention deletion;
- a 250-game account producing only one configured first-index wave.

Existing ONB-017 tests remain the authority for cross-parent global task caps, serialized admission, newest-first bounded candidate selection, and direct-user/preparation same-game races. Existing job/import worker tests remain the authority for stale claim recovery and executor shutdown behavior; ONB-018 does not add a second executor.

Local validation performed before PR CI:

- strict isolated TypeScript compilation of the new preparation config/repository/service;
- focused emitted reconciler service tests;
- Node syntax checks for the new `.mjs` test files.

Full repository lint/build, migration application, and Prisma-backed test execution are the merge gate on PR #385. A normal local repository clone could not be used in this environment because `git-mirror.hub.ace-research.openai.org` failed DNS resolution; live GitHub repository inspection and PR CI remain available.

## Program reconciliation

Reassessed for this implementation:

- `STATUS.md`: ONB-018 remains the active preparation runtime slice until PR validation/merge; ONB-019 remains independently READY on the lifecycle path.
- `ROADMAP.md`: no milestone or ownership change is introduced; ONB-018 still feeds ONB-008/009/015.
- `TASKS.md`: ONB-018 is claimed/in progress on #385; downstream dependency order is unchanged.
- `DECISIONS.md`: no new architecture/product decision is introduced; implementation follows D-053, D-055 through D-063, and D-066.
- `OPEN_QUESTIONS.md`: no new unresolved question is created by this bounded implementation.
- `GITHUB_ISSUES.md`: issue #254 and PR #385 are the execution/review records; no duplicate issue or umbrella is required.

## Residual handoffs

- ONB-009 owns authenticated lifecycle command routes that can call the internal pause/resume/cancel/retry service methods.
- ONB-008 owns user disposition and readiness/presentation projection.
- ONB-015 owns account-sync/preparation handoff and can link `currentImportRunId`; the new database wake trigger makes that handoff immediately due.
- ONB-019 owns destructive lifecycle fences and must replace the existing ONB-017 admission guard rather than add another preparation admission path.
