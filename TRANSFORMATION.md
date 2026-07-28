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
- PR #137 — VT-101 expanded-rail inline navigation accordions with collapsed-rail flyouts retained.

PR #137 was squash-merged as `033d05ededc03e114a4b02655de91a6313c4d902`. Runtime/test CI run #1112 and final documentation-head CI run #1118 passed dependency installation, lint, the full repository build, architecture guardrails, database migrations, and the complete test suite before merge.

Direct browser validation for authentication, Home, brand rasterization, favicon, navigation edge cases, Clerk controls, imported-game job-panel spacing, representative responsive widths, and Phase 1D motion remains residual work until issue #126 records it. VT-101 navigation checks remain in that matrix rather than being falsely marked complete from static inspection or CI alone.

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

Issue #123 / VT-101 is complete through PR #137. Issue #124 / VT-102 is now the deterministic next task because it is the highest-priority open `READY` issue and has order 20. Issue #126 remains blocked until #124 is integrated; its #123 dependency is already satisfied.

## Current checkpoint

VT-101 is integrated into `visual_transformation`. Expanded desktop child navigation now uses inline disclosure groups in normal rail flow, while collapsed desktop child navigation retains anchored popup-menu flyouts and the backdrop. The navigation model, parent routes, active prefixes, single-open transient state, Escape cleanup, route cleanup, mobile sheet, account placement, and session-only collapse behavior remain unchanged.

The next implementation session must inspect the live queue and, while its recorded state is unchanged, claim issue #124 before creating `visual-transformation/vt-102-home-palette-calibration` from the current `visual_transformation` head.

Do not start issue #126 before #124 is integrated, bypass the issue queue, commit directly to `visual_transformation` or `main`, or merge a transformation pull request without explicit approval.
