# ONB-018 — Implement progressive preparation reconciliation and control

Status: IN_PROGRESS

Priority: P0

Order: 78

Delivery class: Implementation

Planning maturity: Allocated by ONB-003; numeric reconciliation and first-value defaults supplied by ONB-007; ONB-017 and durable import/provider delivery are complete; promoted to unclaimed READY through ONB-014 completion self-review on PR #383

GitHub issue: [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254)

Claimed by: ChatGPT

Claim branch: `onb-018/issue-254-preparation-reconciliation-control`

Claimed at: 2026-08-15

Claim scope: bounded preparation reconciliation/control in the existing worker deployment, progressive index/analysis admission, persisted wake hints, milestone/control reconciliation, explicit failed-evidence retry, operational telemetry, focused tests, and architecture documentation; no public lifecycle routes, readiness projection, provider traversal, Angular UI, generic workflow framework, or ONB-019 destructive fences

Promoted at: 2026-08-15 through ONB-014 completion self-review on PR #383

## Outcome

Run the approved preparation state machine as a bounded PostgreSQL reconciliation loop in the existing worker deployment, progressively creating index and analysis jobs, exposing first value early, and quiescing or cancelling safely without a browser session.

## Why this task exists

The durable parent and batch boundary alone does not advance work. A restart-safe reconciler must observe import progress and current game evidence, create only bounded child jobs, preserve direct-user responsiveness, unlock a first analysed sample, and acknowledge pause/cancellation without becoming a second imported-game executor.

## Dependencies

- ONB-003 / #150 accepted orchestration contract and self-review addendum.
- ONB-007 / #154 report for 1-second/5-second reconciliation, three-indexed first-analysis threshold, one-game fallback, exact progress, stall, and first-value budgets.
- ONB-017 / #253 preparation persistence, globally serialized admission, and child-job creation — complete.
- ONB-011/012 durable import persistence and worker/API lifecycle plus ONB-013/014 provider adapters — complete.
- Coordinate the complete account-sync/preparation handoff with ONB-015 / #203. ONB-015 consumes this reconciler for its final handoff and is not a hard readiness blocker for the bounded reconciler implementation itself.
- Consumed by ONB-008 / #193 and ONB-009 / #194.

## Initial configuration

```text
PREPARATION_RECONCILE_ACTIVE_MS=1000
PREPARATION_RECONCILE_IDLE_MS=5000
PREPARATION_RECONCILE_DUE_WARNING_MS=15000
PREPARATION_FIRST_ANALYSIS_MIN_INDEXED=3
PREPARATION_FIRST_ANALYSIS_SMALL_ACCOUNT_FALLBACK=1
```

Persist an immediate wake hint after committed import batches, import transitions, child settlement, and control acknowledgement. Polling remains authoritative after restart.

## In scope

- Bounded preparation reconciler loop in the existing worker deployment.
- Short PostgreSQL claims/row locks and idempotent transactional transitions; no provider or engine work inside the reconcile transaction.
- One-second active and five-second idle scanning with persisted due/wake state.
- Progressive selection of committed imported rows before import termination.
- Core-completion gating on terminal exact import coverage and terminal indexing outcomes.
- At most one non-terminal index batch and one non-terminal analysis batch per run.
- First-index, first-analysis, index-continuation, analysis-tail, and explicit-retry lane behavior.
- First-analysis admission when three current indexed/unanalysed games exist; when import/index is quiescent and only one or two eligible games exist, admit the configured one-game fallback.
- Analysis restricted to successfully indexed games.
- Newest-first ordering within one account.
- Deterministic stage-specific account-round-robin ordering for multi-account expansion.
- Index admission compares prior normal `INDEX` batches per target; analysis admission compares prior normal `ANALYSIS` batches per target; immutable target ordinal breaks ties.
- Retry batches do not distort the normal stage fairness cursor unless they explicitly replace the failed normal slot.
- Exact milestone persistence, immutable child-stage denominators, and terminal batch reconciliation.
- Pause as quiescence: stop new waves, allow active child/import work to settle, then mark paused.
- Cancel propagation and acknowledgement across current import and child jobs.
- Explicit retry generation that includes failed/unprepared evidence and never auto-requeues completed or failed work indefinitely.
- Aggregate reconcile lag/decision, batch queue wait, first settlement, total settlement, and stall telemetry without personal payloads.
- Warning/attention codes for due reconciliation above 15/60 seconds, task start above 30 seconds when capacity exists, index no-settlement above two minutes, and analysis no-settlement above five minutes, excluding explained higher-priority preemption.
- Worker bootstrap, graceful shutdown, restart, stale-child, child-retention, preemption, and queue-bound tests.
- Canonical architecture documentation.

## Out of scope

- Authenticated lifecycle command routes owned by ONB-009.
- User disposition and readiness projection owned by ONB-008.
- Provider adapters owned by ONB-013/014.
- Angular UI owned by ONB-010.
- Public ETA or one weighted overall percentage.
- Generic workflow/DAG infrastructure.

## Acceptance criteria

- Useful indexed evidence can appear before all selected games are imported or indexed.
- The reconciler normally reacts within five seconds and emits warning telemetry when an active due run waits more than 15 seconds.
- First analysis starts from three indexed games, with the one-game quiescent small-account fallback.
- A three-game first-analysis batch can complete before the lower-priority analysis tail.
- Direct user jobs always remain schedulable ahead of preparation work.
- Queue backlog is bounded independently of account size and concurrent parent count.
- Multi-account fairness is deterministic and independent for index and analysis stages.
- Browser presence is not required to advance work.
- Pause/cancel/retry are restart-safe and do not duplicate completed work.
- Parent state remains correct after child dismissal or retention cleanup.
- Core readiness follows ONB-001 and does not wait for full analysis.
- Failed games do not block unrelated games and are not automatically retried forever.
- Product state exposes exact counts/milestones and no public ETA.

## Required validation

- Two-reconciler parent-claim test.
- One-second active/five-second idle controlled-clock tests and immediate wake-hint tests.
- Cross-parent admission-cap test through the ONB-017 serialized admission boundary.
- Progressive import-commit-to-index test.
- Three-indexed first-analysis and one-game fallback dependency tests.
- Stage-specific multi-account round-robin test with asymmetric index and analysis histories.
- Retry fairness-cursor test.
- Direct-user preemption and same-game race test.
- Pause quiescence test.
- Cancellation acknowledgement test with retained child work keys.
- Retry-only-failed-evidence test.
- Process restart and stale-child reconciliation test.
- Child dismissal/retention cleanup test.
- Stall-code tests that exclude higher-priority preemption.
- Large-account queue-bound test.

## Completion

Report: none

Pull request: none

Completed at: none
