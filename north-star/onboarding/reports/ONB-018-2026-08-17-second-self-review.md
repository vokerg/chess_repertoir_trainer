# ONB-018 — Second self-review

Date: 2026-08-17

Task: [ONB-018](../tasks/ONB-018-preparation-reconciliation-control.md)

Issue: [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254)

Pull request: [#385](https://github.com/vokerg/chess_repertoir_trainer/pull/385)

Branch: `onb-018/issue-254-preparation-reconciliation-control`

## Review scope

This was a fresh review of the live PR against current `main`, the accepted ONB-003/007 orchestration and throughput contracts, ONB-008/009 downstream ownership, and the existing job/imported-game execution paths. The review challenged first-value fallback behavior, multi-target lifecycle state, retry/no-loop guarantees, direct-user interaction, retained failure evidence, and stall telemetry rather than treating the prior green CI result as proof of semantic completeness.

Current `main` changes since the PR's original base are unrelated to preparation; PR #385 remains mergeable and no rebase-specific preparation conflict was found.

## Findings and corrections

### 1. Small-account fallback was not actually a one-game wave

The reconciler previously used `PREPARATION_FIRST_ANALYSIS_SMALL_ACCOUNT_FALLBACK=1` only to decide whether below-threshold analysis could start. Admission still used the normal `FIRST_ANALYSIS` lane size of three, so a quiescent two-game target queued both games.

The existing preparation admission boundary now supports an optional stricter positive `maxTasks` cap below the configured lane size. Below-threshold first analysis passes the fallback cap, so the approved default is a retained one-game batch/job/task wave while normal threshold-triggered first analysis keeps the three-game lane size. The cap remains inside the existing serialized admission transaction; no second analysis-admission path was added.

### 2. Fallback eligibility and index quiescence were tightened

The accepted ONB-003/007 contract treats the fallback population as current indexed/unanalysed analysis-eligible evidence after normal indexing is exhausted. A temporary review hypothesis that it should instead be keyed to total imported-game count was rejected after re-reading those sources because partial indexing failures could otherwise strand one or two successfully indexed games.

The final implementation therefore preserves fallback after partial indexing failure, but only when:

- the linked target import is successfully `COMPLETED`;
- the target has no clean index candidate;
- the target has no active preparation index batch;
- at least one current indexed/unanalysed game remains below the normal first-analysis threshold.

The normal >=3 first-analysis trigger still intentionally pipelines while indexing continues.

### 3. Multi-target recoverable import attention could preserve the wrong action

Recoverable `NEEDS_ATTENTION` previously retained the parent's old `IMPORT_PAUSED` / `IMPORT_RETRY_AVAILABLE` code while waiting for all target imports to recover. In a multi-target run, one target could recover while another blocker remained, leaving the persisted action signal stale.

Recoverable import attention is now recomputed from current ordered target import evidence on every durable wake. For example, a parent previously marked `IMPORT_PAUSED` becomes `IMPORT_RETRY_AVAILABLE` when the paused target resumes but another current target remains failed. Resolved attention still returns the parent to `RUNNING`; unresolved attention becomes dormant again after the current signal is persisted.

### 4. Analysis setup failures could auto-requeue forever as fresh work

`ANALYSE_GAMES` previously loaded batch-analysis configuration and constructed Stockfish before `ImportedGameAnalysisExecutionService.analyseOne()` entered the existing `GameAnalysisRun` lifecycle. A technical failure before that boundary—disabled local batch analysis, configuration load failure, or engine-construction failure—therefore failed the `JobTask` while leaving `ImportedGame.latestAnalysisStatus = NULL`.

Preparation normal analysis selection treats `NULL` as fresh unanalysed evidence. The same game could consequently be admitted again automatically on the next normal wave, violating ONB-018's failed/unprepared explicit-retry and no-infinite-retry requirements.

The common analysis execution lifecycle now exposes setup-failure persistence. An `ANALYSE_GAMES` setup failure records a failed `GameAnalysisRun` before the original job error is returned. Preparation then sees durable `FAILED` game evidence: normal admission excludes it and explicit analysis retry remains the recovery path. A non-forced setup failure does not replace an already-current completed analysis snapshot; forced refresh failure remains a new failed attempt. Controlled aborts do not create failure evidence.

The analogous indexing path was re-read and did not require a change: `ImportedGamePlyIndexService.indexOne()` already catches both PGN parsing and persisted ply-replacement failures and writes `plyIndexError` before returning `FAILED`.

### 5. Configuration validation was kept narrow

The fallback cap must fit inside the configured `FIRST_ANALYSIS` lane size because it is an admission override of that lane. The normal trigger and fallback cap remain independently tunable; an earlier review-time attempt to require `fallback < firstAnalysisMinIndexed` was intentionally removed because that would have created an unnecessary configuration policy not required by the accepted contract.

### 6. Completed-partial retry ownership remains downstream

The review re-checked the apparent tension between terminal `COMPLETED / ANALYSIS_PARTIAL` and ONB-018's non-terminal internal retry. No parent-reopen behavior was added. ONB-008 owns completed-partial disposition/action mapping, and ONB-009 owns authenticated command semantics; ONB-009 explicitly assigns new linked `RECOVERY` runs to terminal cancelled/failed restart. ONB-018 therefore continues to avoid silently mutating a terminal completed preparation back to running.

### 7. First-settlement stall telemetry was verified, not changed

`JobWorkerRepository.settleTask()` reconciles the owning `JobRun` after each task settlement. The existing preparation `JobRun` update trigger recomputes retained task counts plus `MIN(JobTask.settledAt)`, so `DataPreparationBatch.firstSettledAt` advances on the first settled child task rather than waiting for the whole job to finish. The two-minute/five-minute no-settlement warnings therefore have the intended evidence source; no telemetry patch was required.

## Validation added or strengthened

This review adds direct coverage for:

- one- and two-game below-threshold fallback eligibility;
- one-game `FIRST_ANALYSIS` admission cap and retained `plannedLimit` / `totalTasks`;
- newest-first selection under the stricter fallback cap;
- normal three-game first-analysis admission remaining uncapped by the fallback;
- partial indexing failure leaving one/two analysis-eligible games available to fallback;
- below-threshold fallback waiting for terminal import, no clean index candidate, and no active target index batch;
- independent trigger/fallback configuration with fallback constrained only by the lane size;
- recoverable multi-target attention switching from stale pause action to current retry action;
- durable pre-engine analysis setup failure evidence;
- non-forced current completed analysis protection and forced-failure retention;
- propagation of job `force` into setup-failure evidence.

The full repository CI remains the authoritative validation gate after these corrections.

## Program reconciliation

Reassessed against current `main`:

- `STATUS.md`: no milestone/availability change; ONB-018 remains in review on PR #385.
- `ROADMAP.md`: no dependency or sequencing change.
- `TASKS.md`: no new task is required; findings are within ONB-018 scope.
- `DECISIONS.md`: no new product-level architecture decision is introduced.
- `OPEN_QUESTIONS.md`: completed-partial action semantics remain with the existing ONB-008/009 ownership; no new unresolved question is introduced.
- `GITHUB_ISSUES.md`: issue #254 / PR #385 remain the correct implementation and review records.
- `README.md`: no onboarding-program navigation change is required.

## Review disposition

The task remains `REVIEW`, not `COMPLETED`, while PR #385 is open. The implementation should be considered review-ready only after the exact final branch head passes the full repository CI suite following this report/task reconciliation.
