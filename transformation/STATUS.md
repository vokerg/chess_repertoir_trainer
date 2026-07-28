# Visual Transformation Status

Last updated: 2026-07-28

## Current state

**Program state:** VT-104 residual shell and entry-point browser validation is in progress

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-104-shell-browser-validation`

**Active pull request:** draft PR #162

**Live execution queue:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)

Repository documents retain integrated history, visual direction, decisions, residual risks, meaningful review checkpoints, and reports. Issue #122 and child issues #123–#133 remain authoritative for live priority, order, readiness, dependencies, claim, branch, pull request, blockers, and completion state.

All visual-transformation tasks use short-lived branches from the current `main` head, open pull requests against `main`, and reach `main` through approved squash merge. Historical reports may describe the former `visual_transformation` branch because that was the delivery model at the time; those records do not authorize new work against the retired branch.

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
- [x] PR #134 — issue-driven execution queue and Phase 1D integration reconciliation.
- [x] PR #137 — expanded-rail inline navigation accordions with collapsed-rail flyouts retained.
- [x] PRs #142–#144 — VT-101 completion and concurrent VT-102 queue reconciliation.
- [x] PR #141 — signed-in Home canvas and surface calibration.
- [x] PR #155 — main-based transformation delivery correction.
- [x] PR #158 — production tokens, typography, shared visual foundations, and wide signed-in workspace correction.
- [x] PR #161 — VT-103 integration and queue reconciliation.

## VT-101 integrated checkpoint

Delivered:

- [x] Expanded desktop child navigation uses inline in-flow disclosure regions.
- [x] Collapsed desktop child navigation retains popup-menu flyouts and backdrop.
- [x] Existing navigation model, routes, active prefixes, single-open state, Escape/route cleanup, mobile sheet, account placement, and session-only collapse state are preserved.
- [x] Restrained CSS-only motion, reduced-motion behavior, expanded-rail scrolling, focus treatment, and focused unit coverage were added.
- [x] Runtime/test CI #1112 and final documentation-head CI #1118 passed the complete repository workflow.
- [x] Direct browser review accepted the expanded/collapsed direction and overall composition.

The remaining current-state navigation matrix is owned by VT-104.

## VT-102 integrated checkpoint

Delivered:

- [x] Applied a Home-local green-grey workspace canvas.
- [x] Established strong white, muted secondary, and quiet tonal surface roles.
- [x] Reduced elevation and retained limited graphite emphasis.
- [x] Preserved Home component/template/store behavior, routes, loading/data behavior, recommendation logic, and responsive structure.
- [x] Added `transformation/reports/VT_102_HOME_PALETTE_CALIBRATION.md`.
- [x] Passed the complete repository workflow in CI #1145 and #1152.
- [x] Received direct browser feedback that the result feels good and explicit approval to squash-merge PR #141.

The approval established palette direction but did not complete every Home state and responsive permutation.

## VT-103 integrated checkpoint

Delivered:

- [x] Added the namespaced production `--ui-*` layer.
- [x] Preserved the amber-era short-token compatibility layer for unmigrated workflows.
- [x] Locked production canvas, surfaces, graphite, mint, borders, focus, semantic statuses, radii, shadows, and native system typography.
- [x] Migrated global/shared canvas, controls, page headers, common cards, panels, shell actions, and focus.
- [x] Added the canonical frontend token contract and migration guidance.
- [x] Received a 2048×1151 Home screenshot confirming palette cohesion and exposing excessive unused horizontal space.
- [x] Raised the signed-in shell cap from 1600px to 1920px and Home cap from 1240px to 1560px while preserving copy constraints and mobile breakpoints.
- [x] CI #1240, #1245, #1253, #1257, and final width-corrected CI #1262 passed the complete repository workflow.
- [x] PR #158 was squash-merged into `main` as `af450eb860819281ad260db364838b9868205508`.
- [x] PR #161 reconciled integration state and released issues #127–#129.

The user review approves the VT-103 palette, token, typography, and wide-workspace merge boundary. Post-correction browser observation and the broader cross-state matrix remain with VT-104.

## VT-104 active checkpoint

Implemented on draft PR #162:

- [x] Selected and claimed issue #126 through the deterministic queue.
- [x] Inspected the current public landing, auth, Home, brand, navigation, app shell, job panel, production-token, and historical browser-review implementations.
- [x] Added `transformation/reports/VT_104_SHELL_BROWSER_VALIDATION.md` with explicit evidence levels and per-surface matrices.
- [x] Recorded current direct Home evidence and historical direct navigation evidence without treating them as blanket completion.
- [x] Separated automated/static support from checks that still require direct browser observation.
- [x] Found that local-development login/signup actions hard-coded `/library` and ignored explicit `returnUrl`.
- [x] Changed both local-development actions to navigate to the resolved return URL.
- [x] Added focused login/signup return-URL tests.
- [ ] Initial CI result recorded.
- [ ] Remaining direct browser checkpoints observed or left open with a reason.
- [ ] Final Phase 1 disposition recorded.
- [ ] Explicit approval and squash merge into `main`.
- [ ] Issue and queue reconciliation after merge.

No Games, Study, Opening Analysis, API, schema, database, backend, dependency, or new navigation-model work is included.

## Execution disposition

The live queue, not this file, determines task state and sequencing.

Issues #123–#125 are complete. Issue #126 is `IN_PROGRESS`, P1, order 40, through draft PR #162.

Issues #127–#129 are `READY` but remain later in numeric order. Issues #130–#133 retain their downstream dependencies. Do not begin a later workflow task in place of active VT-104.

## Validation status

### Prior checkpoints

- Phase 1D CI #1045, #1047, and integration CI #1051 passed.
- VT-000 final-head CI #1072 passed.
- VT-101 CI #1112, #1118, #1128, and #1140 passed.
- VT-102 CI #1145 and #1152 passed.
- Main-delivery correction CI #1227 passed.
- VT-103 CI #1240, #1245, #1253, #1257, and #1262 passed.
- VT-103 reconciliation CI #1266 passed.

### VT-104 validation

GitHub Actions CI #1268 is running the complete repository workflow on the initial implementation/report head.

No local build was run because the execution environment could not resolve `github.com` for a direct checkout; repository inspection and edits use the GitHub connector.

Direct browser access is not available through the connector. VT-104 therefore records only supplied/historical direct evidence as direct, keeps unreproduced checks open, and relies on focused tests/static inspection only for their stated evidence level.

## Residual browser validation

The dedicated VT-104 report is canonical for the detailed matrix. Current open direct checks include:

- landing normal/reduced motion, stacked workflow, skip-link/focus, and layout-shift observation;
- auth desktop/mobile, configured Clerk, local-development handoff after correction, error state, and explicit return URLs;
- post-width Home desktop, loading, warning, error, empty, tablet, mobile, long-content, focus, and reduced motion;
- brand/favicon rasterization, contrast, proportions, wrapping, and required small sizes;
- current navigation long labels/names, short heights, collapsed flyout placement, keyboard behavior, mobile boundaries, and Clerk account interaction;
- job-panel overlap/scrolling with active jobs;
- representative legacy-route compatibility and wide signed-in page use.

Every check must be recorded as observed or remain open with an explicit reason. No blanket browser-complete claim is permitted.

## Open design and product decisions

The decision log remains canonical. Current open owners include:

- #126 — Phase 0–1 residual browser-validation and final Phase 1 disposition;
- #131 — final mobile-primary navigation.

Production palette, semantic statuses, namespace, compatibility boundary, typography, and initial wide-workspace caps are integrated production decisions.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated into `main`. Residual direct rendering evidence remains under VT-104.

### Phase 1 — shell and entry points

Public, auth, Home, brand, rail, inline navigation, landing motion, production tokens, typography, and wide-workspace foundations are integrated. Phase 1 remains open until VT-104 records the residual browser disposition.

### Phase 2 — representative workflows

Games, Study, and Opening Analysis are dependency-ready but remain sequenced after active VT-104. Proven shared primitives and final mobile navigation retain their workflow dependencies.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-28 — VT-104 browser-validation matrix and auth correction

- Claimed issue #126 after VT-103 integration and reconciliation.
- Inspected the actual public, auth, Home, brand, navigation, app-shell, job-panel, and token implementations.
- Created the explicit evidence-level browser matrix.
- Preserved the supplied Home screenshot and earlier navigation review as direct evidence only within their actual boundaries.
- Found and corrected local-development auth actions that bypassed explicit `returnUrl` and the `/home` default.
- Added focused return-URL tests and opened draft PR #162.

### 2026-07-28 — VT-103 integration and wide-screen correction

- Added the production token and typography layer with an explicit legacy compatibility boundary.
- Passed repeated complete repository validation through final CI #1262.
- Received direct 2048×1151 Home evidence confirming palette cohesion and exposing conservative width caps.
- Raised signed-in shell/Home caps while preserving copy and mobile constraints.
- Squash-merged PR #158 and reconciled through PR #161.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #142, #143, #144, #141, #155, #158, and #161 are integrated into `main`.
