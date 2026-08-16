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
- Uses the persisted lease/wake timestamp as an optimistic evidence fence: import/child/control wake events invalidate a stale reconciliation decision even when the lifecycle status itself remains `RUNNING`.
- Limits each drain cycle to a bounded number of due parents.
- Keeps provider access, PGN processing, Stockfish, and child execution outside reconciliation transactions.

### Durable wake hints

A trigger-only migration moves preparation parents due immediately when:

- `DataPreparationTarget.currentImportRunId` changes;
- linked `ImportRun` progress or lifecycle state changes;
- linked preparation `JobTask` settlement state or retained `workKey` changes;
- linked child `JobRun` changes state or is removed by retention.

Normal active/control parents are always eligible for those wake hints. `NEEDS_ATTENTION` is not converted into a polling state: only recoverable import-attention codes (`IMPORT_PAUSED` and `IMPORT_RETRY_AVAILABLE`) are woken by import/link events. Deterministic product attention such as `NO_RECENT_GAMES` and `ALL_INDEXING_FAILED` remains dormant until an explicit lifecycle action changes the state.

The existing terminal child snapshot trigger is extended rather than replaced with a second retention path. Polling plus persisted state remains authoritative after restart; no in-memory event is required for correctness.

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

The reconciler persists first imported/indexed/analysed and core-ready milestones. Core readiness requires successful terminal import coverage for all targets, no active preparation index batch, no clean unindexed eligible game, and at least one indexed success. Analysis is non-blocking for core readiness; current `RUNNING` analysis evidence remains non-terminal even when produced by direct-user work.

Terminal partial failures are retained as non-blocking `INDEXING_PARTIAL` / `ANALYSIS_PARTIAL` evidence. `NO_RECENT_GAMES`, `ALL_INDEXING_FAILED`, and terminal linked-import failure/paused states produce deterministic attention instead of an automatic retry loop.

### Controls and import handoff

- Pause is quiescence: new waves stop, linked imports are asked to pause, and existing child jobs are allowed to settle.
- Cancellation propagates to linked imports and child jobs and is not acknowledged while an import claim or child task `workKey` can still mutate state.
- Resume first transitions the preparation parent and only then resumes linked paused imports, so a rejected/racing parent transition cannot restart child work.
- A failed/paused linked import may place the parent in recoverable import attention. When ONB-015 or the durable import lifecycle resumes/retries and relinks the current import attempt, the persisted wake path reclaims that parent and returns it to `RUNNING` once the blocking import state is gone.
- Provider-import retry remains owned by the durable import lifecycle; preparation retry does not masquerade as provider retry.

### Explicit preparation retry

Preparation retry is restricted to a non-terminal `RUNNING` / `NEEDS_ATTENTION` parent and current failed index/analysis evidence. A terminal `COMPLETED` preparation is not reopened; terminal recovery/expansion remains the linked-run command responsibility owned by ONB-009.

One explicit preparation retry request creates one bounded `RETRY` wave, preferring failed indexing evidence before failed analysis evidence. The retry generation increment and the `DataPreparationBatch` / child `JobRun` / `JobTask` creation are committed in the same PostgreSQL transaction. Therefore:

- capacity or no-candidate blocking does not consume a retry generation;
- a committed retry generation always has durable child work;
- a worker/process crash after commit can resume from the persisted child job;
- completed/failed evidence is not automatically requeued indefinitely;
- retry waves do not advance the normal stage fairness cursor.

### Telemetry

Aggregate telemetry records reconciliation lag/decision plus batch queue, first-settlement, and total-settlement timing without provider payloads, PGNs, usernames, or account identity snapshots.

Operational warning thresholds implement the ONB-007 defaults:

- reconcile due: 15 seconds warning / 60 seconds critical;
- queued child start: 30 seconds only when worker capacity is actually free and no higher-priority runnable work explains the wait;
- index no-settlement: two minutes;
- analysis no-settlement: five minutes.

A running child is not treated as “explained by preemption”: higher-priority work can delay the next claim, but cannot explain a task that is already executing and has not settled.

## Thorough self-review — 2026-08-16

The implementation was re-read against ONB-001/003/007/009/015/017/018 and the current job/import worker repositories. The review was performed from the live PR/repository rather than from the original implementation notes. It found and corrected the following issues before review handoff:

1. **Shared-database claim test was asserting the wrong invariant.** The two-reconciler test assumed only one parent could be claimed globally. In the full suite, another due parent can legitimately be claimed concurrently. The test now makes its fixture deterministically due first, proves that fixture is claimed exactly once, and proves all concurrent claim IDs are distinct.
2. **Resume could restart a child import before the parent transition succeeded.** The parent resume now happens first; a rejected/racing parent transition causes no child side effect. A regression test covers valid ordering and the rejection case.
3. **Recoverable import attention could deadlock.** `IMPORT_PAUSED` / `IMPORT_RETRY_AVAILABLE` previously left the parent outside normal polling with no reliable return path after an import retry/relink. Recoverable attention is now event-woken from durable import/link changes and returns to `RUNNING` when the latest linked attempt is no longer blocking. Non-recoverable attention remains dormant.
4. **Retry generation was not restart-safe.** The original draft incremented `retryGeneration` before child admission in a separate transaction. A crash or capacity block could therefore persist a generation with no retry work. Retry generation and bounded child creation are now atomic at the existing ONB-017 admission boundary.
5. **Retry could reopen a terminal completed parent.** ONB-009 defines explicit retry inside non-terminal attention and terminal recovery as a new linked run. Internal preparation retry now accepts only `RUNNING` / `NEEDS_ATTENTION` and does not mutate `COMPLETED` back to running.
6. **A stale reconciliation decision could overwrite newer evidence without a lifecycle-status change.** External import/child/retry events can leave status `RUNNING` while changing evidence. `applyState` now also compares the persisted claim/wake lease; any durable wake invalidates the stale snapshot before milestones or terminal state can be written.
7. **Preparation-specific stale-child restart behavior lacked direct validation.** A new Prisma test claims an index child, makes the claim stale, recovers it through a fresh `JobWorkerRepository`, verifies the parent wake, then reconciles through a fresh preparation service and proves no duplicate stage batch is created.
8. **Attention wake triggers were broader than the claim policy.** Import/link triggers are now scoped so `NEEDS_ATTENTION` rows are touched only for the two recoverable import-attention codes.
9. **First-analysis fallback is restricted to successfully completed import coverage.** A failed import cannot invoke the small-account fallback merely because it is terminal.
10. **Current analysis `RUNNING` evidence is explicitly non-terminal.** This prevents early parent completion during direct-user analysis.
11. **Partial index/analysis failures remain visible after successful core/analysis completion.** They are retained as warning evidence rather than silently disappearing.
12. **Deterministic import attention waits until already-imported clean indexing backlog is drained.** A provider failure or temporary global admission block therefore cannot freeze useful imported work.
13. **The reconcile claim lease is at least the 15-second warning budget.** A second reconciler cannot immediately overlap a legitimately active claim simply because the active poll cadence is one second.
14. **Queued-start stall telemetry now distinguishes actual worker capacity from a busy worker.** Higher-priority preemption suppresses queued-start warnings but not no-settlement warnings for an already-running task.

No further product-state or architectural divergence was found in multi-target core readiness, stage-specific fairness, small-account fallback, direct-user priority ownership, or the child-retention boundary.

## Validation

ONB-018-specific tests added or strengthened by this change cover:

- stage-specific index/analysis fairness with asymmetric histories;
- three-game first-analysis threshold and successful one-game fallback;
- progressive committed-import-to-index admission;
- concurrent index continuation and first-analysis admission;
- core readiness independent of analysis tail;
- admission-block behavior after linked import failure;
- analysis partial failure as a terminal non-core-blocking outcome;
- pause quiescence and cancellation acknowledgement with retained work keys;
- parent-first resume ordering and rejected-resume child fencing;
- explicit retry limited to failed preparation evidence;
- atomic retry generation plus durable retry batch/job/task persistence;
- blocked retry leaving the generation unchanged;
- terminal completed preparation not being reopened by internal retry;
- recoverable import-attention wake/relink and return to running;
- durable wake invalidating a stale same-status reconciliation decision;
- one-second active / five-second idle controlled-clock behavior;
- reconcile/stall warning behavior including capacity and preemption distinctions;
- two-reconciler per-parent claim uniqueness without assuming a globally empty shared test queue;
- persisted wake hints for import handoff/progress and child settlement;
- stale child recovery across fresh job/preparation repository instances without duplicate batch admission;
- retained child snapshots after job retention deletion;
- a 250-game account producing only one configured first-index wave.

Existing ONB-017 tests remain the authority for cross-parent global task caps, serialized admission, newest-first bounded candidate selection, and direct-user/preparation same-game races. Existing job/import worker tests remain the lower-level authority for executor shutdown and generic stale-claim behavior; ONB-018 now additionally proves the preparation parent observes that stale-child recovery correctly.

Local validation performed before and during PR review included strict isolated TypeScript compilation/focused service tests where available. Full repository lint/build, migration application, architecture/hygiene guardrails, and Prisma-backed test execution remain the authoritative merge gate on PR #385. A normal local repository clone could not be used in this environment because `git-mirror.hub.ace-research.openai.org` failed DNS resolution; live GitHub repository inspection and PR CI remain available.

## Program reconciliation

Reassessed for this implementation:

- `STATUS.md`: ONB-018 remains the active preparation runtime slice until PR validation/merge; ONB-019 remains independently READY on the lifecycle path.
- `ROADMAP.md`: no milestone or ownership change is introduced; ONB-018 still feeds ONB-008/009/015.
- `TASKS.md`: ONB-018 is claimed/in progress on #385 until exact-head validation is green; downstream dependency order is unchanged.
- `DECISIONS.md`: no new product-level architecture decision is introduced; implementation follows the accepted preparation/import/job lifecycle contracts.
- `OPEN_QUESTIONS.md`: no new unresolved question is created by this bounded implementation.
- `GITHUB_ISSUES.md`: issue #254 and PR #385 are the execution/review records; no duplicate issue or umbrella is required.

## Residual handoffs

- ONB-009 owns authenticated lifecycle command routes and linked terminal recovery/expansion semantics; it can call the internal pause/resume/cancel/retry service methods where appropriate.
- ONB-008 owns user disposition and readiness/presentation projection.
- ONB-015 owns account-sync/preparation handoff and updates `currentImportRunId`; recoverable attention now observes that handoff through the durable wake path.
- ONB-019 owns destructive lifecycle fences and must replace the existing ONB-017 admission guard rather than add another preparation admission path.
