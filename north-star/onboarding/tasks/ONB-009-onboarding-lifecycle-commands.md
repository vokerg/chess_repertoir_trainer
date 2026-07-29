# ONB-009 — Implement onboarding lifecycle commands

Status: PROPOSED

Priority: P0

Order: 90

Delivery class: Implementation

Planning maturity: Decisioned by ONB-001; blocked on durable import and preparation implementations

GitHub issue: [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Implement authenticated, idempotent commands that start and control first-run or expansion preparation using the approved recipe and durable server-side import/preparation boundaries.

## Why this task exists

The read model alone cannot accept a recipe, coordinate work, distinguish skip from cancellation, or recover failed preparation. These transitions must be server-owned and continue without a browser session.

## Dependencies

- ONB-001 / #148 lifecycle and default recipe.
- ONB-002 / #149 and its durable import implementation tasks.
- ONB-003 / #150 and its preparation orchestration implementation tasks.
- ONB-007 / #154 progress policy.
- ONB-008 / #193 persistence/readiness foundation.
- Coordinate reset and destructive behavior with ONB-004 / #151.

## In scope

- Start the default first-run recipe for one owned selected account.
- Persist immutable recipe snapshot, version, and run purpose.
- Enforce one active run per user and command idempotency.
- Skip guidance without silently cancelling accepted work.
- Pause, resume, cancel, retry, and expansion commands.
- Core-readiness completion transition while analysis may continue.
- Shared command contracts and thin OpenAPI-backed Fastify routes.
- Ownership, restart, failure/recovery, and concurrency tests.

## Out of scope

- Provider-specific import internals owned by ONB-002 follow-ups.
- Imported-game wave executor internals owned by ONB-003 follow-ups.
- Angular UI.
- Destructive purge/reset before ONB-004 approval.
- Automated repertoire or course generation.

## Acceptance criteria

- Start returns after durable acceptance and does not hold one request through provider, indexing, or analysis work.
- Skip and cancel have distinct persisted semantics.
- Cancellation cannot report terminal success while child work can still mutate the run.
- Core onboarding completion does not require full engine analysis.
- Commands are idempotent, ownership-scoped, and restart-safe.
- A browser session is not required to advance work.
- Expansion creates a new bounded run rather than mutating historical recipe scope ambiguously.

## Required validation

- Focused command contract and service tests.
- Duplicate/concurrent start tests.
- Pause/resume/cancel acknowledgment tests.
- Partial failure and retry tests.
- Process-restart/reconciliation scenarios.
- Ownership-isolation tests.

## Completion

Report: none

Pull request: none

Completed at: none