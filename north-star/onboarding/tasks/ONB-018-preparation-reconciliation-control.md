# ONB-018 — Implement progressive preparation reconciliation and control

Status: PROPOSED

Priority: P0

Order: 78

Delivery class: Implementation

Planning maturity: Allocated by ONB-003; blocked on ONB-003/017 and durable import delivery

GitHub issue: [#254](https://github.com/vokerg/chess_repertoir_trainer/issues/254)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Run the approved preparation state machine as a bounded PostgreSQL reconciliation loop in the existing worker deployment, progressively creating index and analysis jobs, exposing first value early, and quiescing or cancelling safely without a browser session.

## Why this task exists

The durable parent and batch boundary alone does not advance work. A restart-safe reconciler must observe import progress and current game evidence, create only bounded child jobs, preserve direct-user responsiveness, unlock a first analysed sample, and acknowledge pause/cancellation without becoming a second imported-game executor.

## Dependencies

- ONB-003 / #150 accepted orchestration contract.
- ONB-017 / #253 preparation persistence and child-job creation.
- ONB-011/012 durable import lifecycle and ONB-015 preparation handoff for complete import pipelining.
- ONB-007 / #154 supplies production wave sizes, polling budgets, and stalled-work thresholds.
- Consumed by ONB-008 / #193 and ONB-009 / #194.

## In scope

- Bounded preparation reconciler loop in the existing worker deployment.
- Short PostgreSQL claims/row locks and idempotent transactional transitions; no provider or engine work inside the reconcile transaction.
- Progressive selection of committed imported rows before import termination.
- Core-completion gating on terminal exact import coverage and terminal indexing outcomes.
- At most one non-terminal index batch and one non-terminal analysis batch per run.
- First-index, first-analysis, index-continuation, analysis-tail, and explicit-retry lane behavior.
- Analysis restricted to successfully indexed games.
- Newest-first ordering within one account.
- Deterministic account-round-robin batch ordering for multi-account expansion.
- Exact milestone persistence and terminal batch reconciliation.
- Pause as quiescence: stop new waves, allow active child/import work to settle, then mark paused.
- Cancel propagation and acknowledgement across current import and child jobs.
- Explicit retry generation that includes failed/unprepared evidence and never auto-requeues completed or failed work indefinitely.
- Worker bootstrap, graceful shutdown, restart, stale-child, child-retention, preemption, and queue-bound tests.
- Canonical architecture documentation.

## Out of scope

- Authenticated lifecycle command routes owned by ONB-009.
- User disposition and readiness projection owned by ONB-008.
- Provider adapters owned by ONB-013/014.
- Angular UI owned by ONB-010.
- ETA or production sizing before ONB-007.
- Generic workflow/DAG infrastructure.

## Acceptance criteria

- Useful indexed evidence can appear before all selected games are imported or indexed.
- A bounded first-analysis lane can complete before the lower-priority analysis tail.
- Direct user jobs always remain schedulable ahead of preparation work.
- Queue backlog is bounded independently of account size.
- Browser presence is not required to advance work.
- Pause/cancel/retry are restart-safe and do not duplicate completed work.
- Parent state remains correct after child dismissal or retention cleanup.
- Core readiness follows ONB-001 and does not wait for full analysis.
- Failed games do not block unrelated games and are not automatically retried forever.

## Required validation

- Two-reconciler concurrency test.
- Progressive import-commit-to-index test.
- Index-success-to-first-analysis dependency test.
- Direct-user preemption and same-game race test.
- Pause quiescence test.
- Cancellation acknowledgement test with retained child work keys.
- Retry-only-failed-evidence test.
- Process restart and stale-child reconciliation test.
- Child dismissal/retention cleanup test.
- Large-account queue-bound test.

## Completion

Report: none

Pull request: none

Completed at: none
