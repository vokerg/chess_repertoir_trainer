# ONB-003 — Design progressive indexing and analysis orchestration

Status: READY

Priority: P0

Order: 30

Delivery class: Research

Planning maturity: Outlined

GitHub issue: [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

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

See `OPEN_QUESTIONS.md` under ONB-003.

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

- Report, decisions, open questions, queue, issue #150, and implementation tasks.

## Completion

Report: none

Completed at: none
