# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 2 is active; VT-201 through VT-204 are complete and VT-205 final mobile-primary navigation is in progress.

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-205-mobile-navigation`

**Active pull request:** draft PR #191

**Live execution queue:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)

Repository documents own integrated history, architecture, decisions, validation, residual risks, and reports. Issue #122 and child issues #123–#133 own live readiness, order, dependencies, claims, branches, pull requests, blockers, and completion state.

All transformation work uses short-lived branches from the current `main` head, pull requests to `main`, explicit approval, and squash merge. The former `visual_transformation` branch remains historical only.

## Integrated checkpoints

- [x] PR #78 — public landing page.
- [x] PR #79 — shared authentication shell.
- [x] PR #85 — Phase 0B reconciliation.
- [x] PR #86 — signed-in Home discovery.
- [x] PR #87 — signed-in Angular `/home` and post-auth fallback.
- [x] PR #88 — production Node Branch assets, favicon, and shared lockups.
- [x] PR #108 — desktop navigation discovery.
- [x] PR #112 — production navigation rail and disclosure correction.
- [x] PR #118 — Phase 1C integration-state reconciliation.
- [x] PR #120 — restrained public landing scroll reveal.
- [x] PR #134 — issue-driven execution queue and Phase 1D reconciliation.
- [x] PR #137 — expanded-rail inline navigation accordions with collapsed flyouts retained.
- [x] PRs #141–#144 — Home calibration, VT-101 completion, and queue reconciliation.
- [x] PR #155 — main-based transformation delivery correction.
- [x] PR #158 — production tokens, typography, shared visual foundations, and wide workspace correction.
- [x] PR #161 — VT-103 integration reconciliation.
- [x] PR #162 — evidence-bounded Phase 1 browser disposition and local auth return-URL correction.
- [x] PR #165 — VT-104 integration reconciliation.
- [x] PR #167 — VT-201 Games modernization.
- [x] PR #176 — VT-201 completion reconciliation.
- [x] PR #178 — VT-202 Study modernization.
- [x] PR #180 — VT-202 completion reconciliation.
- [x] PR #183 — VT-203 Opening Analysis modernization.
- [x] PR #185 — VT-203 completion reconciliation.
- [x] PR #188 — VT-204 proven shared UI primitives.
- [x] PR #190 — VT-204 completion reconciliation.

## Phase 1 completion

VT-101 through VT-104 established production navigation, Home calibration, the `--ui-*` token and typography contract, the wide signed-in shell, and evidence-bounded browser disposition. Phase 1 is complete for sequencing; unreproduced browser permutations remain documented risks rather than passes.

## Representative workflow checkpoints

### VT-201 Games

Issue #127 is complete through PR #167 and reconciliation PR #176. Games retained route, filter/query, API/store, pagination, durable job, semantic table, and command ownership while gaining production-token filters/results and responsive evidence cards.

### VT-202 Study

Issue #128 is complete through PR #178 and reconciliation PR #180. Study retained route, store, API, selection, eligibility, marathon, and launcher ownership while gaining explicit workflow hierarchy, derived context, accessible selection, and separated scope/mode presentation.

### VT-203 Opening Analysis

Issue #129 is complete through PR #183 and reconciliation PR #185. Opening Analysis composes through the shared workbench while retaining route, store, API, board, engine, filter, history, stale-response, widget, and navigation ownership.

### VT-204 Proven shared primitives

Issue #130 is complete through PR #188 and reconciliation PR #190. It promoted only:

- `app-context-strip` for Study and Opening Analysis derived context;
- `app-fact-grid` for Games responsive evidence and Study line health.

Feature-owned cards, workflow steps, launchers, workbench evidence, state, commands, and responsive composition remain feature-owned.

## VT-205 active checkpoint

Issue #131 is active through draft PR #191 on `visual-transformation/vt-205-mobile-navigation`.

Selected model below the shared 760px breakpoint:

1. Home;
2. Study;
3. Games;
4. Openings;
5. More.

Evidence and ownership:

- Home is the signed-in default and product-wide next-action entry;
- Study, Games, and Openings are the representative workflows and first three Home workspace shortcuts;
- persistent destinations are filtered by stable id from `MainNavigationComponent.mainNavItems`;
- More renders the same complete route/account hierarchy;
- secondary active routes mark More active;
- the desktop rail, routes, account actions, feature stores/APIs/workflows, board/training behavior, and backend remain unchanged.

Implementation delivered on the branch:

- safe-area-aware fixed mobile-primary navigation;
- native modal destination dialog with Escape/focus behavior;
- complete route/account access through More;
- application-content clearance above the navigation;
- imported-game job-panel clearance above the navigation;
- production-token navigation and dialog presentation;
- focused route-order, overflow, closure, active-state, and desktop-regression tests;
- D-314, navigation/responsive documentation, migration ledger, and implementation report.

## Deferred browser feedback

The user explicitly approved VT-202, VT-203, and VT-204 without direct browser review and will provide feedback later in one consolidated pass. Those checklists are deferred product-review inputs, not observed passes.

VT-205 adds its own required mobile review matrix in `transformation/reports/VT_205_MOBILE_NAVIGATION.md`, covering safe areas, short viewport heights, account access, active state, Home, Games/job panel, Study launcher, Opening Analysis board/workbench, focus, zoom, and reduced motion.

## Execution disposition

Issues #123–#130 are complete.

Issue #131 is `IN_PROGRESS` through draft PR #191. Issue #132 remains `READY` but must not be selected while the lower-order VT-205 task is active. Issue #133 remains blocked by #132.

## Validation status

- VT-202 CI #1372, #1374, and reconciliation CI #1379 passed.
- VT-203 CI #1392, #1394, and reconciliation CI #1419 passed.
- VT-204 CI #1425, #1432, #1448, and #1453 passed the complete repository workflow.
- VT-205 implementation-head CI #1461 passed the complete repository workflow on commit `752cb8c137f58ea0baadff214e5ef1e5d682e90b`.

CI #1461 covered dependency installation, lint, full repository build and Angular template/type compilation, both opening audits, architecture guardrails, migrations, and the complete test suite including updated navigation tests.

The exact documentation head must pass the same workflow. Direct browser review and explicit approval remain pending; PR #191 stays draft and unmerged.

## Open design and product decisions

- #132 — remaining-page and Labs rollout using the production token, shell, final mobile navigation, context, fact, and feature-owned patterns;
- #133 — onboarding, empty-state, accessibility, and responsive polish after rollout.

D-314 locks the final mobile-primary model and resolves D-304. D-026 continues to lock the evidence-based shared presentation boundary.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining rendering permutations are documented risks.

### Phase 1 — shell and entry points

Complete and integrated.

### Phase 2 — representative workflows

VT-201 through VT-204 are complete and integrated. VT-205 is active through draft PR #191.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-205 final mobile-primary navigation

- Verified current `main` at `3860c7b63a96a20484e44b87dbe00041306b142c` and claimed issue #131.
- Created `visual-transformation/vt-205-mobile-navigation` from that exact head.
- Inspected the single navigation model, desktop/mobile rendering, route taxonomy, app shell, imported-game job panel, breakpoints, Home shortcut order, representative completion reports, Angular rules, token contract, and prior navigation decisions.
- Selected Home, Study, Games, Openings, and More from actual product/workflow evidence.
- Retained the complete grouped route/account hierarchy behind More without adding a second route source.
- Implemented native modal behavior, active-state delegation, safe-area/content/job-panel clearance, production-token presentation, and focused tests.
- Opened draft PR #191.
- Implementation-head CI #1461 passed the complete repository workflow.
- Added D-314, navigation/responsive/migration documentation, and the VT-205 implementation report.
- Exact documentation-head CI and direct browser review remain pending.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #141–#144, #155, #158, #161, #162, #165, #167, #176, #178, #180, #183, #185, #188, and #190 are integrated into `main`.
