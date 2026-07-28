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
- PR #144 — stable queue wording while VT-102 remained active;
- PR #141 — VT-102 signed-in Home canvas and surface calibration.

VT-102 keeps the change route-local to Home, preserves behavior and global legacy styling, and records concrete palette evidence for VT-103. Implementation-head CI #1145 and documentation-head CI #1152 passed the complete repository workflow. The user reviewed the result in the browser, confirmed that it feels good, and explicitly approved squash merge.

The accepted Home direction does not close the broader residual browser matrix. Authentication, public motion, brand rasterization, navigation edge cases, comprehensive Home states, Clerk controls, imported-game job-panel spacing, and representative responsive widths remain owned by issue #126.

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

Issues #123 and #124 are complete. Issues #125 and #126 are dependency-free and `READY`; #125 / VT-103 is the deterministic next task because both are P1 and it has the lower order (30 before 40).

## Current checkpoint

VT-102 is integrated through PR #141. Home now uses a deliberate green-grey workspace canvas, clear strong/muted/quiet surface roles, restrained elevation, white important cards, and limited graphite emphasis. Home data, routes, component/template structure, navigation behavior, global tokens, typography, APIs, schemas, databases, and backend behavior are unchanged.

The next session must inspect the live queue and, while its state remains unchanged, claim issue #125 before creating `visual-transformation/vt-103-production-tokens-typography` from the current `visual_transformation` head. Issue #126 may proceed only through the same claim rules and an explicit collision check if parallel execution is considered.

Do not bypass the issue queue, commit directly to `visual_transformation` or `main`, or merge a transformation pull request without explicit approval.