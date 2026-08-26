# ONB-009 — Implement onboarding lifecycle commands

Status: IN_PROGRESS

Priority: P0

Order: 90

Delivery class: Implementation

Planning maturity: Decisioned by ONB-001/003; durable import, ONB-017/018 execution, and ONB-008 projection are delivered; ready for claim after a fresh collision check

GitHub issue: [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194)

Claimed by: ChatGPT / onboarding implementation session

Claim branch: `onb-009/issue-194-lifecycle-commands`

Claimed at: 2026-08-26

Claim scope: authenticated onboarding start/skip/pause/resume/cancel/retry/restart/expansion commands over delivered account-import, preparation reconciliation, and onboarding projection boundaries; shared contracts, thin Fastify routes, focused ownership/concurrency/recovery tests; no Angular UI or destructive lifecycle execution

Promoted at: 2026-08-26 through merged-task completion reconciliation

## Outcome

Implement authenticated, idempotent commands that start and control first-run, recovery, or expansion preparation using the approved recipe and durable server-side import/preparation boundaries.

## Why this task exists

The read model alone cannot accept a recipe, coordinate work, distinguish skip from cancellation, or recover failed preparation. These transitions must be server-owned and continue without a browser session.

ONB-017/018 own the physical run/batch persistence and internal reconciliation semantics. This task exposes validated commands over those boundaries rather than embedding worker orchestration in routes.

## Dependencies

- ONB-001 / #148 lifecycle and default recipe — complete.
- ONB-002 / #149 and its durable import implementation tasks — complete.
- ONB-003 / #150 preparation orchestration contract — complete.
- ONB-017 / #253 preparation execution persistence — complete.
- ONB-018 / #254 progressive reconciliation and acknowledged control state — complete.
- ONB-007 / #154 progress/operational policy — complete.
- ONB-008 / #193 disposition/readiness projection — complete through PR #398.
- ONB-016 / #224 expansion/action experience requirements — complete.
- Coordinate reset and destructive behavior with ONB-004 / #151 and delivered ONB-019 foundation; destructive execution remains ONB-020/021-owned.

## In scope

- Start the default first-run recipe for one owned selected account.
- Persist immutable recipe snapshot, version, target order, and run purpose through ONB-017 services.
- Enforce one active run per user and command idempotency.
- Skip guidance without silently cancelling accepted work.
- Request quiescent pause and resume.
- Request acknowledged cancellation.
- Explicit retry of failed/unprepared evidence within a non-terminal attention run.
- Restart terminal cancelled/failed work as a linked `RECOVERY` run.
- Create immutable `EXPANSION` runs for older history, bullet, or additional accounts.
- Core-readiness disposition transition while analysis may continue.
- Shared command contracts and thin OpenAPI-backed Fastify routes.
- Ownership, restart, failure/recovery, and concurrency tests.

## Out of scope

- Provider-specific import internals owned by ONB-011 through ONB-014.
- Preparation persistence, candidate selection, child-job creation, or reconcile-loop internals owned by ONB-017/018.
- Angular UI.
- Destructive purge/un-index/un-analyse/account/user delete commands owned by ONB-019/020/021.
- Automated repertoire or course generation.

## Acceptance criteria

- Start returns after durable acceptance and does not hold one request through provider, indexing, or analysis work.
- Skip and cancel have distinct persisted semantics.
- Pause returns after the request is persisted; projection distinguishes requested from fully quiescent paused state.
- Cancellation cannot report terminal success while import or child work can still mutate the run.
- Retry does not mutate historical child jobs and does not select completed evidence.
- Restart and expansion create new linked immutable runs rather than reopening historical scope.
- Core onboarding completion does not require full engine analysis.
- Commands are idempotent, ownership-scoped, and restart-safe.
- A browser session is not required to advance work.

## Required validation

- Focused command contract and service tests.
- Duplicate/concurrent start tests.
- Pause request/quiescence/resume tests.
- Cancellation acknowledgement tests.
- Partial failure and retry-generation tests.
- Terminal restart lineage tests.
- Multi-account/history/bullet expansion tests.
- Process-restart/reconciliation scenarios.
- Ownership-isolation tests.

## Claim rule

Before claim, re-inspect live branches/PRs and the current ONB-008/017/018/019 APIs for collisions. Do not duplicate destructive command semantics owned by ONB-020/021.

## Completion

Report: none

Pull request: none

Completed at: none