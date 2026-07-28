# Visual Transformation Program

This file is the stable entry point for every ChatGPT, Copilot, Codex, or human session working on the product-wide visual transformation.

## Branch model

- Integration target: `main`.
- Do not commit transformation work directly to `main`.
- Every meaningful implementation or documentation slice uses a short-lived branch created from the current `main` head.
- Open transformation pull requests against `main`.
- Refresh the task branch from current `main` before final review when concurrent integration has moved the base.
- Squash-merge into `main` only after explicit approval.
- The former long-running `visual_transformation` integration branch is retired; do not create new work from it or target new pull requests at it.

## Read before doing transformation work

Read these sources in order:

1. [`AGENTS.md`](./AGENTS.md)
2. [Angular frontend skill](./.agents/skills/angular-frontend/SKILL.md) for Angular work
3. [Angular architecture](./docs/frontend/angular-architecture.md)
4. [Frontend design tokens](./docs/frontend/design-tokens.md) for styling and transformed UI
5. [`transformation/MASTER_PLAN.md`](./transformation/MASTER_PLAN.md)
6. [`transformation/DECISIONS.md`](./transformation/DECISIONS.md)
7. [`transformation/STATUS.md`](./transformation/STATUS.md)
8. [`transformation/WORKING_RULES.md`](./transformation/WORKING_RULES.md)
9. [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)
10. the selected execution issue and the current implementation it owns.

The repository code and tests are the source of truth for runtime behavior. Repository transformation documents own visual direction, architecture, decisions, detailed acceptance criteria, and reports. GitHub Issues own the live execution queue, priority, readiness, blockers, claim, branch, pull request, and completion state.

## Documentation contract

Every meaningful transformation change must update the relevant repository records in the same branch:

- update `MASTER_PLAN.md` when scope, architecture, phases, or target outcomes change;
- update `DECISIONS.md` when a design, product, or process decision is locked, revised, or rejected;
- update `STATUS.md` after each integrated checkpoint or meaningful review;
- add the required report for the slice;
- keep unresolved questions and residual validation explicit.

Do not use `STATUS.md` as a manually maintained live task queue. The ordered execution queue is issue #122 and its child issues.

## Integrated checkpoints

The following slices are integrated into `main` through the visual-transformation program history:

- PR #78 — public Angular landing page at `/`;
- PR #79 — shared authentication shell for `/login` and `/signup`;
- PR #85 — Phase 0B checkpoint reconciliation;
- PR #86 — signed-in `/home` discovery and visualization;
- PR #87 — guarded Angular `/home`, post-auth fallback, and deterministic recommendations;
- PR #88 — production Node Branch assets, shared brand components, favicon, and lockups;
- PR #108 — Phase 1B desktop rail and interim mobile-navigation discovery;
- PR #112 — Phase 1C production navigation rail and submenu-discoverability correction;
- PR #118 — Phase 1C integration-state reconciliation;
- PR #120 — Phase 1D restrained landing-page scroll reveal;
- PR #134 — VT-000 issue-driven execution queue and Phase 1D integration reconciliation;
- PR #137 — VT-101 expanded-rail inline navigation accordions with collapsed-rail flyouts retained;
- PR #142 — VT-101 post-merge decision, status, report, and queue reconciliation;
- PR #143 — concurrent VT-102 claim reconciliation after VT-101 completion;
- PR #144 — stable queue wording while VT-102 remained active;
- PR #141 — VT-102 signed-in Home canvas and surface calibration;
- PR #158 — VT-103 production token, typography, shared-surface, focus, and wide-workspace foundation.

The earlier checkpoints were originally developed through the former transformation integration branch and were subsequently reintegrated into `main`. Their historical commit and CI records remain valid; the delivery model for all new work is short-lived branch to `main`, squash merge.

VT-103 promotes the approved Home palette evidence into the production `--ui-*` contract, keeps the amber-era short tokens as an explicit compatibility layer for unmigrated workflows, uses native system typography without font assets, and raises the signed-in shell/Home caps after direct large-screen review. Final CI #1262 passed before the approved squash merge as `af450eb860819281ad260db364838b9868205508`.

The accepted foundation does not close the broader residual browser matrix. Authentication, public motion, brand rasterization, navigation edge cases, comprehensive Home states, Clerk controls, imported-game job-panel spacing, representative responsive widths, keyboard/focus behavior, and reduced motion remain owned by issue #126.

## Live execution queue

Use [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122).

Task selection is deterministic:

1. consider only open issues with `Repository state: READY`;
2. exclude unresolved dependencies and already claimed issues;
3. choose the highest priority;
4. within that priority, choose the lowest numeric order;
5. comment to claim the issue before implementation;
6. create the issue's recorded branch from the current `main` head;
7. target the pull request at `main` and keep branch, PR, blockers, and completion state in the issue;
8. close the issue only after approved squash merge into `main` and documentation reconciliation.

Issues #123–#125 are complete. Issue #126 / VT-104 is `READY`, P1, order 40 and is the deterministic next task. Issues #127–#129 are released to `READY` after VT-103 integration but remain later by numeric order.

## Current checkpoint

VT-103 is integrated into `main` through squash-merged PR #158. The production token and typography layer is now the foundation for transformed UI, while existing feature-local amber consumers remain migration debt owned by their explicit workflow tasks.

The next session must claim issue #126 before implementation. It should complete and record the residual Phase 0–1 browser matrix without redesigning Games, Study, Opening Analysis, or other Phase 2 workflows.

Do not bypass the issue queue, commit directly to `main`, target the retired `visual_transformation` branch, or merge a transformation pull request without explicit approval.
