# ONB-000 — Merge acceptance addendum

Date: 2026-07-28

Task: ONB-000

Program tracker: [#147](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

Pull request: [#156](https://github.com/vokerg/chess_repertoir_trainer/pull/156)

## Acceptance

The user accepted the program foundation and explicitly authorized a squash merge to `main`.

The master plan is a living plan. Future ONB tasks may revise provisional decisions, ordering, scope, and implementation decomposition through the reviewed mechanisms in:

- `DECISIONS.md`;
- `OPEN_QUESTIONS.md`;
- `ROADMAP.md`;
- `TASKS.md`;
- task completion reports.

Locked foundations may also be revised, but only through an explicit reviewed decision update rather than silent drift.

## Merge boundary

PR #156 contains planning and coordination documentation only under `north-star/onboarding/`.

It does not change:

- application code;
- API behavior;
- Prisma schema or migrations;
- Angular routes or UI;
- provider import behavior;
- worker execution;
- deployment behavior.

## Issue state

The squash merge completes ONB-000 only.

The following remain open:

- #147 — program tracker;
- #148–#154 — research tasks.

The deterministic next task remains ONB-001 / #148.
