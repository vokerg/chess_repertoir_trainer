# Visual Transformation Program

This file is the stable entry point for every ChatGPT, Copilot, Codex, or human session working on the product-wide visual transformation.

## Branch model

- Long-running integration branch: `visual_transformation`
- Base branch: `main`
- Do not commit transformation work directly to `main`.
- Every meaningful implementation or documentation slice uses a short-lived branch created from `visual_transformation`.
- Merge transformation pull requests into `visual_transformation` with squash merge only after explicit approval.
- The transformation branch reaches `main` only through an explicitly reviewed pull request when the program is ready.

## Read before doing transformation work

Read these sources in order:

1. [`AGENTS.md`](./AGENTS.md)
2. [Angular frontend skill](./.agents/skills/angular-frontend/SKILL.md) for Angular work
3. [Angular architecture](./docs/frontend/angular-architecture.md)
4. [`transformation/MASTER_PLAN.md`](./transformation/MASTER_PLAN.md)
5. [`transformation/DECISIONS.md`](./transformation/DECISIONS.md)
6. [`transformation/STATUS.md`](./transformation/STATUS.md)
7. [`transformation/WORKING_RULES.md`](./transformation/WORKING_RULES.md)
8. [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)
9. the selected execution issue and the current implementation it owns.

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

The following slices are squash-merged into `visual_transformation`:

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
- PR #144 — stable queue wording while VT-102 remained active.

PR #137 was squash-merged as `033d05ededc03e114a4b02655de91a6313c4d902`. Runtime/test CI #1112 and final documentation-head CI #1118 passed the complete repository workflow before merge. PR #142 was squash-merged as `d1222a205966b10e7b4747adac9e4ff6fc7a116d`; reconciliation CI #1128 passed the same workflow. PR #143 recorded the concurrent VT-102 claim after CI #1140, and PR #144 stabilized the queue wording as `9b4160e73cad296c3534b3628a8e92e3ac70b26d`.

Direct browser validation for authentication, Home, brand rasterization, favicon, navigation edge cases, Clerk controls, imported-game job-panel spacing, representative responsive widths, and Phase 1D motion remains residual work until issue #126 records it. VT-101 navigation checks remain in that matrix rather than being represented as complete from static inspection or CI alone.

## Live execution queue

Use [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122).

Task selection is deterministic:

1. consider only open issues with `Repository state: READY`;
2. exclude unresolved dependencies and already claimed issues;
3. choose the highest priority;
4. within that priority, choose the lowest numeric order;
5. comment to claim the issue before implementation;
6. create the issue's recorded branch from `visual_transformation`;
7. keep branch, PR, blockers, and completion state in the issue;
8. close the issue only after squash merge and documentation reconciliation.

Issue #123 / VT-101 is complete through PR #137 and reconciliation PRs #142–#144. Issue #124 / VT-102 is `IN_PROGRESS` through draft PR #141. Issue #125 remains blocked until #124 is integrated. Issue #126 remains blocked only by #124 because its #123 dependency is satisfied.

## Current checkpoint

VT-102 is active on `visual-transformation/vt-102-home-palette-calibration` through draft PR #141 into `visual_transformation`.

The branch is refreshed onto current integration commit `9b4160e73cad296c3534b3628a8e92e3ac70b26d`, preserving the integrated VT-101 and queue-reconciliation records. Its runtime change is limited to Home-local CSS: a green-grey workspace canvas, clearer strong/muted/quiet surface roles, restrained elevation, white important cards, and limited graphite emphasis. Home data, routes, component/template structure, navigation behavior, global tokens, typography, APIs, schemas, databases, and backend behavior are unchanged.

Review `transformation/reports/VT_102_HOME_PALETTE_CALIBRATION.md`, the Home stylesheet diff, current CI, and `/home` in populated, loading, empty/error, desktop, tablet, and mobile states. Issue #124 is authoritative for live validation, blocker, and review state.

Do not start issue #125 or #126 before #124 is integrated, claim another overlapping transformation task without a new collision check, commit directly to `visual_transformation` or `main`, or merge PR #141 without explicit approval.
