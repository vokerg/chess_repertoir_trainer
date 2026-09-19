# Onboarding and Data Lifecycle Program

Last updated: 2026-08-07

This workspace is the canonical planning and execution area for progressive onboarding, chess-data preparation, operator administration, destructive lifecycle controls, and shared-position maintenance.

Program tracker: [#147 — Onboarding and Data Lifecycle Program](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## Current checkpoint

Program state is `IMPLEMENTATION_IN_PROGRESS`.

Accepted and completed program work includes:

- ONB-001 lifecycle/readiness contract;
- ONB-002 bounded recent-first import and resumable historical backfill contract;
- ONB-003 progressive preparation orchestration design;
- ONB-004 destructive lifecycle invariants and implementation allocation;
- ONB-005 administrator authorization and diagnostics architecture;
- ONB-006 orphan shared-position cleanup architecture;
- ONB-007 throughput benchmarks, bounded defaults, exact progress, and no-ETA policy;
- ONB-016 lightweight progressive-disclosure experience blueprint;
- ONB-017 durable preparation run/target/batch execution boundary;
- ONB-022 administrator authorization and bounded read-only diagnostics foundation.

The current next unclaimed `READY` task is recorded in [`STATUS.md`](STATUS.md); do not duplicate that volatile value here. ONB-025 / #276 is canonically allocated as a post-cutover stale-account-refresh follow-up and remains `PROPOSED` behind ONB-015.

Planning and accepted contracts are ahead of the complete first-use runtime. This workspace must distinguish implemented code from approved target behavior.

## Why this is a program

The required outcome crosses:

- external-account creation and provider import;
- durable imported-game indexing and analysis;
- progressive insight readiness;
- authenticated routing and `/home`;
- account and user reset semantics;
- administrator diagnostics and authorization;
- shared position-analysis retention and cleanup;
- throughput, capacity, recovery, and operational visibility.

The product goal is:

> Let a new player start useful preparation quickly, continue using the application while deeper work runs, and understand what is ready, what is still being prepared, and what they can do next.

The interaction standard is:

> Present one dominant action at a time, expose real progress rather than internal machinery, and reveal useful personal evidence before the full preparation tail completes.

## Read in this order

1. [`STATUS.md`](STATUS.md) — current implementation, completed contracts, active work, and next queue state.
2. [`AGENTS.md`](AGENTS.md) — claim, branch, issue, handoff, report, and completion protocol.
3. [`TASKS.md`](TASKS.md) — canonical ordered ONB task queue.
4. [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md) and program/child issues — live readiness, ownership, branch, PR, blocker, and completion state.
5. [`FOUNDATION.md`](FOUNDATION.md) — stable product and architecture agreements.
6. [`MASTER_PLAN.md`](MASTER_PLAN.md) — complete current-state analysis, target architecture, lifecycle, administration, risks, and delivery plan.
7. [`EXPERIENCE_BLUEPRINT.md`](EXPERIENCE_BLUEPRINT.md) — first-value journey, progress/reveal semantics, and Angular interaction contract.
8. [`ROADMAP.md`](ROADMAP.md), [`DECISIONS.md`](DECISIONS.md), and [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

Immutable work items live under [`tasks/`](tasks/). Research and completion evidence lives under [`reports/`](reports/).

## Program boundaries

This program owns functional onboarding behavior, server-side lifecycle state, recent-first import, preparation orchestration, readiness contracts, recovery, administration, destructive data operations, and database cleanup.

It coordinates with but does not replace:

- the [Visual Transformation program](../../TRANSFORMATION.md), which owns product-wide visual, responsive, empty-state, and accessibility polish;
- the [Repertoire Builder program](../repertoire-builder/README.md), which consumes prepared player evidence and owns repertoire-building decisions;
- the [Activity Feed program](../activity-feed/README.md), which owns the daily activity ledger and Today-goal consumer;
- current account settings, progress, games, opening, Player Chess Profile, tactical training, courses, analysis, and training capabilities, which remain reusable product surfaces.

## Execution rules

Only dependency-satisfied `READY` tasks may be claimed unless the user explicitly authorizes another action. Live claims and queue state belong in GitHub issues and `STATUS.md`; this README remains a stable route into those sources.

Research must resolve its acceptance criteria before production tasks silently adopt its decisions. Implementation follows current repository module, contract, repository, Angular, job, security, and validation conventions described in the scoped [`AGENTS.md`](AGENTS.md) and root [`AGENTS.md`](../../AGENTS.md).
