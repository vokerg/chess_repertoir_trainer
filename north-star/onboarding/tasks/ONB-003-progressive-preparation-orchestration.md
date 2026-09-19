# ONB-003 — Design progressive indexing and analysis orchestration

Status: DONE

Priority: P0

Order: 30

Delivery class: Research

Planning maturity: Completed through squash-merged PR #256

GitHub issue: [#150](https://github.com/vokerg/chess_repertoir_trainer/issues/150)

Claimed by: ChatGPT/Codex research session for `vokerg`

Claim branch: `onb-003/issue-150-progressive-preparation-orchestration`

Claimed at: 2026-08-01

Claim scope: orchestration research, decisions, reports, queue reconciliation, and bounded implementation-task allocation only

## Outcome

Define the smallest durable parent/wave orchestration that progressively turns imported games into indexed and analysed evidence while reusing `JobRun`/`JobTask`.

## Why this task exists

The existing worker is strong per game but does not represent an onboarding recipe, import handoff, stage dependencies, visible waves, readiness milestones, or expansion.

## Current repository anchors inspected

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
- Coordinated lifecycle with ONB-001, import handoff with ONB-002, and capacity with ONB-007.

## In scope

- Parent aggregate alternatives.
- Wave/checkpoint model and policy-driven size.
- INDEX-to-ANALYSE dependency.
- Job source/priority/fairness.
- Server-side eligible selection.
- Import pipelining.
- Parent/child progress, pause, resume, retry, cancel, restart, and expansion.
- Angular job-store integration boundary.
- Schema/API outline and implementation tasks.

## Out of scope

- Production schema, worker, routes, or Angular changes.
- Provider import internals.
- Generic DAG/workflow platform.

## Questions owned

Resolved in `reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md` and the self-review addendum.

Numeric wave sizes, polling budgets, admission limits, and stalled thresholds are delegated to ONB-007.

## Acceptance criteria result

- Existing imported-game worker remains the executor: satisfied.
- Useful indexed results are available before all selected games finish: satisfied by committed-import pipelining and bounded index batches.
- Analysis is limited to successfully indexed games: satisfied by evidence-based analysis selection.
- Direct user jobs remain responsive: satisfied by lower preparation priorities and existing preemption.
- Parent state survives restart and child dismissal: satisfied by durable parent/target/batch state and terminal snapshots.
- Queue backlog is bounded: satisfied by per-run bounds plus globally serialized admission caps.
- Failure/retry/cancel semantics do not duplicate completed work: satisfied by evidence-based selection, immutable child jobs, explicit retry, and acknowledged cancellation.
- Follow-up tasks are narrow: satisfied by ONB-017 / #253 and ONB-018 / #254.

## Required validation result

- Worker claims, priority, stale recovery, cancellation, task creation, and Angular polling re-inspected.
- Large-account, concurrent-parent admission, and direct-user preemption scenarios modelled.
- ONB-007 numeric inputs remain explicit pending assumptions.
- Concurrency and integration tests are specified in ONB-017/018.
- Self-review found and corrected cross-parent global-admission serialization and stage-specific multi-account fairness gaps.
- Final PR CI run `30714419045` passed lint, build, architecture guardrails, migrations, audits, and the full test suite.

## Completion updates

- Main report and self-review addendum added.
- ONB-017 / #253 and ONB-018 / #254 allocated and corrected.
- Queue, status, roadmap, decisions/open-question handoffs, issue mapping, and dependent task boundaries reconciled.
- Production code, schema, worker, provider, and Angular behavior unchanged.

## Completion

Report: `reports/ONB-003-2026-08-01-progressive-preparation-orchestration.md`

Self-review addendum: `reports/ONB-003-2026-08-01-self-review-addendum.md`

Implementation tasks: ONB-017 / #253 and ONB-018 / #254

Pull request: [#256](https://github.com/vokerg/chess_repertoir_trainer/pull/256)

Squash commit: `d41f75c080cd19ad106b2143acecd3b0606adacb`

Completed at: 2026-08-01
