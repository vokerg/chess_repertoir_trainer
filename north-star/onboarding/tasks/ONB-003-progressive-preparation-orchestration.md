# ONB-003 — Design progressive indexing and analysis orchestration

Status: REVIEW

Priority: P0

Order: 30

Delivery class: Research

Planning maturity: Research complete; review and merge pending

GitHub issue: [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-003/issue-150-progressive-preparation-orchestration`

Claimed at: 2026-08-01

Claim scope: orchestration research, decisions, reports, queue reconciliation, and bounded implementation-task allocation only

## Outcome

Define the smallest durable parent/wave orchestration that progressively turns imported games into indexed and analysed evidence while reusing `JobRun`/`JobTask`.

## Why this task exists

The existing worker is strong per game but does not represent an onboarding recipe, import handoff, stage dependencies, visible waves, readiness milestones, or expansion.

## Current repository anchors to inspect

- `apps/api/src/modules/jobs/`
- `apps/api/src/modules/imported-games/imported-game-processing.service.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-candidates.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/app/core/jobs/`
- `apps/web/src/app/features/accounts/state/accounts.store.ts`
- `docs/imported-game-job-processing.md`

## Dependencies

- ONB-000.
- Coordinate lifecycle with ONB-001, import handoff with ONB-002, and capacity with ONB-007.

## In scope

- Parent aggregate alternatives.
- Wave/checkpoint model and policy-driven size.
- INDEX-to-ANALYSE dependency.
- Job source/priority/fairness.
- Server-side eligible selection.
- Import pipelining.
- parent/child progress, pause, resume, retry, cancel, restart, and expansion.
- Angular job-store integration boundary.
- Schema/API outline and implementation tasks.

## Out of scope

- Production schema, worker, routes, or Angular changes.
- Provider import internals.
- Generic DAG/workflow platform.

## Questions owned

Resolved in `reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md`.

Numeric wave sizes, polling budgets, admission limits, and stalled thresholds are delegated to ONB-007.

## Acceptance criteria

- Existing imported-game worker remains the executor.
- Useful indexed results are available before all selected games finish.
- Analysis is limited to successfully indexed games.
- Direct user jobs remain responsive.
- Parent state survives restart and child dismissal.
- Queue backlog is bounded.
- Failure/retry/cancel semantics do not duplicate completed work.
- Follow-up tasks are narrow.

## Required validation

- Reinspect worker claims, priority, stale recovery, cancellation, task creation, and Angular polling.
- Model large-account and preemption scenarios.
- Use ONB-007 measurements or explicit pending assumptions.
- Identify concurrency/integration tests required by implementation.

## Completion updates

- Main report added.
- ONB-017 / #253 and ONB-018 / #254 allocated.
- Queue, status, roadmap, decisions, open questions, issue mapping, and dependent task boundaries reconciled.
- Production code, schema, worker, provider, and Angular behavior unchanged.

## Completion

Report: `reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md`

Pull request: pending

Completed at: review pending
