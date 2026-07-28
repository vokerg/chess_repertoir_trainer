# Onboarding and Data Lifecycle Program

Last updated: 2026-07-28

This workspace is the canonical planning area for the product's progressive onboarding, chess-data preparation, operator administration, destructive lifecycle controls, and shared-position maintenance.

Program tracker: [#147 — Onboarding and Data Lifecycle Program](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## Why this is a program

The required outcome cannot be delivered as a single Angular wizard. The current first-use path crosses:

- external-account creation and provider import;
- durable imported-game indexing and analysis;
- progressive insight readiness;
- authenticated routing and the future `/home` entry point;
- account and user reset semantics;
- administrator diagnostics and authorization;
- shared position-analysis retention and cleanup;
- throughput, capacity, recovery, and operational visibility.

The product goal is simple even though the supporting system is not:

> Let a new player start useful preparation quickly, continue using the application while deeper work runs, and always understand what is ready, what is still being prepared, and what they can do next.

## Documents

- [`FOUNDATION.md`](FOUNDATION.md) — stable product and architecture agreements.
- [`MASTER_PLAN.md`](MASTER_PLAN.md) — complete current-state analysis, target experience, architecture, lifecycle, administration, risks, and recommended delivery plan.
- [`ROADMAP.md`](ROADMAP.md) — phases, exits, and dependency order.
- [`TASKS.md`](TASKS.md) — canonical ordered ONB task queue.
- [`GITHUB_ISSUES.md`](GITHUB_ISSUES.md) — issue mapping and execution rules.
- [`STATUS.md`](STATUS.md) — current program state and immediate next work.
- [`DECISIONS.md`](DECISIONS.md) — locked, provisional, rejected, and delegated decisions.
- [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) — unresolved questions and owning tasks.
- [`AGENTS.md`](AGENTS.md) — claim, branch, handoff, report, and completion protocol.
- [`tasks/`](tasks/) — one detailed file per immutable ONB task.
- [`reports/`](reports/) — append-only research and completion evidence.

## Program boundaries

This program owns functional onboarding behavior, server-side lifecycle state, recent-first import, preparation orchestration, readiness contracts, recovery, administration, destructive data operations, and database cleanup.

It coordinates with but does not replace:

- [#122 — Visual Transformation Program](https://github.com/vokerg/chess_repertoir_trainer/issues/122), especially [#133](https://github.com/vokerg/chess_repertoir_trainer/issues/133), which owns final product-wide visual, responsive, empty-state, and accessibility polish;
- [#105 — Repertoire Builder North Star program](https://github.com/vokerg/chess_repertoir_trainer/issues/105), which consumes prepared player evidence and owns repertoire-building decisions;
- current account settings, progress, games, opening, course, analysis, and training capabilities, which remain independent product surfaces.

## Task states

`PROPOSED`, `READY`, `CLAIMED`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, `DONE`, and `SUPERSEDED`.

Research comes first where destructive semantics, cursor behavior, performance, or authorization are unresolved. Production implementation issues must not silently decide questions assigned to a research task.
