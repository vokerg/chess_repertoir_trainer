# Visual Transformation Status

Last updated: 2026-07-29

## Current state

**Program state:** Phase 1 is complete; VT-201 Games modernization is the next deterministic transformation task

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch:** `visual-transformation/vt-104-integration-reconciliation`

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
- [x] PR #162 — evidence-bounded Phase 1 browser disposition and local-development auth return-URL correction.

## VT-101 integrated checkpoint

- [x] Expanded desktop child navigation uses inline in-flow disclosure regions.
- [x] Collapsed desktop child navigation retains popup-menu flyouts and backdrop.
- [x] Existing routes, active prefixes, single-open state, Escape/route cleanup, mobile sheet, account placement, and session-only collapse state are preserved.
- [x] Restrained CSS-only motion, reduced-motion behavior, expanded-rail scrolling, focus treatment, and focused unit coverage were added.
- [x] Direct browser review accepted the expanded/collapsed direction and overall composition.

## VT-102 integrated checkpoint

- [x] Established the Home green-grey canvas and white/muted/quiet surface hierarchy.
- [x] Reduced elevation and retained limited graphite emphasis plus mint signal.
- [x] Preserved Home behavior, routes, loading/data behavior, recommendation logic, and responsive structure.
- [x] Passed CI #1145 and #1152.
- [x] Received direct browser approval for the palette direction.

## VT-103 integrated checkpoint

- [x] Added the namespaced production `--ui-*` layer.
- [x] Preserved the amber-era short-token compatibility layer for unmigrated workflows.
- [x] Locked production canvas, surfaces, graphite, mint, borders, focus, semantic statuses, radii, shadows, and native system typography.
- [x] Migrated global/shared canvas, controls, page headers, common cards, panels, shell actions, and focus.
- [x] Raised the signed-in shell cap from 1600px to 1920px and Home cap from 1240px to 1560px after direct large-screen evidence exposed unused space.
- [x] Passed CI #1240, #1245, #1253, #1257, and #1262.
- [x] PR #158 was squash-merged into `main`; PR #161 reconciled integration state.

## VT-104 integrated checkpoint

Delivered through squash-merged PR #162 as `e3bed0323eedd511f53a04cfd2c14be9b0965c76`:

- [x] Added `transformation/reports/VT_104_SHELL_BROWSER_VALIDATION.md` with explicit evidence levels and per-surface matrices.
- [x] Recorded supplied Home evidence and historical navigation evidence without converting them into blanket completion claims.
- [x] Documented every unobserved direct-browser check with an explicit reason.
- [x] Found that local-development login/signup actions hard-coded `/library` and ignored explicit `returnUrl`.
- [x] Changed both local-development actions to navigate to the resolved return URL.
- [x] Added focused login/signup return-URL tests.
- [x] Corrected the initial test harness provider order after CI exposed the focused failure.
- [x] Corrected-head CI #1270 and final acceptance-head CI #1273 passed the complete repository workflow.
- [x] The user accepted the evidence boundary despite not having access to a large display for a complete post-fix recheck.
- [x] Phase 1 is closed for transformation sequencing.

No Games, Study, Opening Analysis, API, schema, database, backend, dependency, or new navigation-model work was included.

## Acceptance boundary and residual risk

VT-104 approval is evidence-bounded. It does not claim that every browser permutation was observed.

The following remain explicitly unverified because the required display, configured Clerk session, reproducible data state, or direct browser environment was unavailable during final review:

- post-correction large-display Home and representative legacy-route width use;
- landing normal/reduced-motion and responsive boundary permutations;
- configured Clerk login/signup, error, and account-control paths;
- Home loading, warning, error, empty, long-content, and reduced-motion states;
- brand/favicon rasterization at all required small sizes;
- navigation long-label, short-height, viewport-edge, mobile-keyboard, and Clerk account cases;
- job-panel overlap and scrolling with active multi-run data.

These remain verification risks, not represented as passes. Any later reproduced defect should be fixed narrowly in the owning workflow or a focused follow-up.

## Execution disposition

Issues #123–#126 are complete.

Issues #127–#129 are `READY`. Deterministic ordering selects #127 / VT-201 Games modernization first because it is P1 order 100, ahead of #128 order 110 and #129 order 120.

Issues #130–#133 retain their downstream dependencies.

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

- Initial CI #1268 and status-head CI #1269 passed lint, build, both opening audits, architecture checks, and migrations before a focused Angular test-harness route-provider ordering failure.
- The test harness was corrected so its mocked `ActivatedRoute` remains authoritative.
- Corrected-head CI #1270 passed the complete repository workflow.
- Final acceptance-head CI #1273 passed dependency installation, lint, full build, both opening audits, architecture guardrails, migrations, and the complete test suite.
- PR #162 was squash-merged into `main` as `e3bed0323eedd511f53a04cfd2c14be9b0965c76`.

## Open design and product decisions

The decision log remains canonical. The remaining open transformation owner is #131 for final mobile-primary navigation after representative workflow evidence exists.

Production palette, semantic statuses, namespace, compatibility boundary, typography, wide-workspace caps, and the Phase 1 evidence-bounded browser disposition are accepted decisions.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated. Remaining direct rendering permutations are documented risks rather than blockers.

### Phase 1 — shell and entry points

Complete. Public, auth, Home, brand, rail, inline navigation, landing motion, production tokens, typography, wide-workspace foundations, and the evidence-bounded browser disposition are integrated into `main`.

### Phase 2 — representative workflows

Games, Study, and Opening Analysis are dependency-ready. Games is the next deterministic task.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-29 — VT-104 integration

- Final acceptance-head CI #1273 passed the complete repository workflow.
- The user accepted the documented browser-risk boundary and instructed progress.
- Squash-merged PR #162 into `main` as `e3bed0323eedd511f53a04cfd2c14be9b0965c76`.
- Closed Phase 1 for transformation sequencing and released VT-201 as the next task.

### 2026-07-28 — VT-103 integration and wide-screen correction

- Added the production token and typography layer with an explicit legacy compatibility boundary.
- Passed repeated complete repository validation through CI #1262.
- Received direct 2048×1151 Home evidence confirming palette cohesion and exposing conservative width caps.
- Raised signed-in shell/Home caps while preserving copy and mobile constraints.
- Squash-merged PR #158 and reconciled through PR #161.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #142, #143, #144, #141, #155, #158, #161, and #162 are integrated into `main`.