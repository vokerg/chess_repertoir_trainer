# Visual Transformation Status

Last updated: 2026-07-28

## Current state

**Program state:** the visual-transformation baseline is reintegrated into `main`; production tokens/typography and residual shell validation are next

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch after reconciliation:** none

**Active pull request after reconciliation:** none

**Live execution queue:** [Visual Transformation Program issue #122](https://github.com/vokerg/chess_repertoir_trainer/issues/122)

Repository documents retain integrated history, visual direction, decisions, residual risks, meaningful review checkpoints, and reports. Issue #122 and child issues #123–#133 remain authoritative for live priority, order, readiness, dependencies, claim, branch, pull request, blockers, and completion state.

All future visual-transformation tasks use short-lived branches from the current `main` head, open pull requests against `main`, and reach `main` through approved squash merge. Historical reports may describe the former `visual_transformation` branch because that was the delivery model at the time; those records do not authorize new work against the retired branch.

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
- [x] The complete visual-transformation history above was reintegrated into `main` on 2026-07-28.

## VT-101 integrated checkpoint

Delivered:

- [x] Expanded desktop child navigation uses inline in-flow disclosure regions.
- [x] Collapsed desktop child navigation retains popup-menu flyouts and backdrop.
- [x] Existing navigation model, routes, active prefixes, single-open state, Escape/route cleanup, mobile sheet, account placement, and session-only collapse state are preserved.
- [x] Restrained CSS-only motion, reduced-motion behavior, expanded-rail scrolling, focus treatment, and focused unit coverage were added.
- [x] Runtime/test CI #1112 and final documentation-head CI #1118 passed the complete repository workflow.
- [x] PR #137 was explicitly approved and squash-merged under the former integration model, then reintegrated into `main`.
- [x] PRs #142–#144 reconciled the completed task and concurrent VT-102 claim.
- [x] Issue #123 was closed as completed.

The remaining direct navigation/browser matrix is owned by issue #126.

## VT-102 integrated checkpoint

Delivered:

- [x] Selected and claimed issue #124 through the deterministic queue rules.
- [x] Limited runtime ownership to `apps/web/src/app/features/home/home-page.component.css`.
- [x] Applied a Home-local green-grey workspace canvas rather than changing the global legacy body background.
- [x] Kept important recommendation and metric cards on strong white surfaces.
- [x] Moved the account summary and lower workspace/progress containers to quieter tonal surfaces.
- [x] Reduced large floating shadows and shifted hierarchy toward borders and tonal separation.
- [x] Retained graphite for the Continue action and primary recent-progress metric only.
- [x] Retained mint for signal, interaction, and a Home-scoped focus rule with sufficient specificity to override the legacy shell amber button focus rule.
- [x] Preserved Home component/template/store behavior, routes, loading/data behavior, recommendation logic, and responsive structure.
- [x] Added `transformation/reports/VT_102_HOME_PALETTE_CALIBRATION.md` with concrete palette evidence for VT-103.
- [x] Refreshed the branch onto the integrated VT-101/queue baseline before review.
- [x] Passed dependency installation, lint, the full repository build, architecture guardrails, database migrations, and the complete test suite in implementation-head CI #1145 and documentation-head CI #1152.
- [x] Received direct browser feedback that the result feels good and explicit approval to squash-merge PR #141.
- [x] Kept the broader Phase 0–1 browser matrix explicit under issue #126 rather than overclaiming comprehensive validation from one approval checkpoint.
- [x] Reintegrated the accepted checkpoint into `main` with the rest of the visual-transformation baseline.

## Execution disposition

The live queue, not this file, determines task state and sequencing.

Issues #123 and #124 are complete. Issue #125 is `READY`, P1, order 30. Issue #126 is `READY`, P1, order 40. Issue #125 is the deterministic next task because it has the lower order.

No later blocked issue may start until its numbered dependency contract is satisfied and its issue is changed to `READY`. Parallel execution still requires an explicit file and decision collision check.

Every selected task must branch from current `main`, target `main`, and be squash-merged into `main` only after explicit approval.

## Validation status

### Phase 1D automated validation

- CI #1045 passed dependency installation, lint, full monorepo build, architecture guardrails, migrations, and all tests for the final runtime/test head;
- CI #1047 passed the same complete workflow for the final documentation head;
- integration CI #1051 passed after squash merge.

### VT-000 validation

VT-000 was a documentation/process-only checkpoint. Final-head CI #1072 passed the complete repository workflow before PR #134 was approved and integrated.

### VT-101 validation

Runtime/test CI #1112, final documentation-head CI #1118, reconciliation CI #1128, and concurrent-queue reconciliation CI #1140 passed the complete repository workflow before their associated merges.

### VT-102 validation

Implementation-head CI #1145 and documentation-head CI #1152 passed:

- dependency installation;
- lint;
- the full repository build;
- architecture guardrails;
- database migrations;
- the complete test suite.

The runtime change is CSS-only. No focused component test was added because DOM, state, routes, data flow, and behavior are unchanged. Existing Home and complete repository tests remain the regression boundary.

The user reviewed the visual result and explicitly approved it. This approves the VT-102 direction and merge boundary; it does not replace the comprehensive residual matrix owned by issue #126.

### Main reintegration and documentation correction

The existing visual-transformation history was reintegrated into `main` before this documentation checkpoint. This checkpoint changes documentation and execution governance only; it does not modify application runtime, configuration, APIs, schemas, or dependencies.

## Residual browser validation

These remain open until issue #126 records completion or an explicit reason they cannot be reproduced:

- public landing timing, reduced motion, stacked workflow steps, focus into pending content, and absence of layout shift;
- authentication desktop/mobile layouts, configured Clerk, local development auth, and explicit return URLs;
- comprehensive Home populated, loading, empty/error, desktop, tablet, mobile, long-content, focus, and reduced-motion states;
- brand rasterization, favicon, lockup proportions, contrast, and small sizes;
- long navigation labels and long user names;
- inline/collapsed child navigation, viewport heights, collapsed flyout placement, and keyboard behavior;
- grouped mobile navigation at boundary widths;
- Clerk account interaction;
- imported-game job-panel spacing;
- representative signed-in page widths.

## Open design and product decisions

The decision log remains canonical. Current issue owners include:

- #125 — production palette tokens and typography;
- #126 — Phase 0–1 residual browser-validation disposition;
- #131 — final mobile-primary navigation.

The Home-local VT-102 palette values are accepted as evidence for #125, not yet as a silent global replacement of the legacy amber system.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated into `main`. Residual browser validation remains open.

### Phase 1 — shell and entry points

Public, auth, Home, brand, rail, inline desktop navigation, landing motion, issue-driven execution governance, and Home palette calibration are integrated into `main`. Production tokens/typography, public metadata, and residual validation remain.

### Phase 2 — representative workflows

Games, Study, Opening Analysis, proven shared primitives, and final mobile navigation are represented by issues #127–#131 and remain blocked by Phase 1 dependencies.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish are represented by issues #132 and #133.

## Session log

### 2026-07-28 — Main-based delivery model reconciliation

- Confirmed the visual-transformation history had been reintegrated into `main`.
- Retired `visual_transformation` as an integration target for new work.
- Changed future task creation to branch from current `main` and future pull requests to target `main`.
- Preserved short-lived branches, explicit approval, squash merge, deterministic issue selection, documentation reconciliation, and dependency-release rules.
- Kept historical branch references valid only as records of how already-integrated checkpoints were originally delivered.

### 2026-07-28 — VT-102 Home palette calibration integration

- Inspected the live queue, issue #124, current Home implementation, app shell, global styles, and transformation records.
- Claimed #124 and implemented the Home-local canvas and calibrated surface hierarchy without changing global tokens or Home behavior.
- Reduced elevation, retained limited graphite emphasis, and added a Home-scoped mint focus treatment.
- Added the VT-102 report and palette evidence for VT-103.
- Preserved and reconciled the integrated VT-101/queue baseline.
- Passed the complete repository workflow in CI #1145 and #1152.
- Received direct browser feedback that the result feels good and explicit approval to squash-merge PR #141.
- Completed #124 and moved #125 and #126 to `READY`; #125 is next by numeric order.

### 2026-07-28 — VT-101 integration and concurrent VT-102 handoff

- Implemented and validated the inline navigation accordion through CI #1112 and #1118.
- Received explicit approval and squash-merged PR #137.
- Reconciled completed task and queue records through PRs #142–#144 while preserving the active VT-102 claim.
- Left direct browser evidence owned by #126 after #124 integration.

### 2026-07-27 — VT-000 issue-driven queue migration

- Squash-merged Phase 1D through PR #120 and verified successful integration CI #1051.
- Created program issue #122 and execution issues #123–#133 with deterministic priority and dependency metadata.
- Locked the hybrid documentation/issues ownership model in D-022.
- Opened and integrated PR #134 after complete final-head CI #1072.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #142, #143, #144, and #141 are integrated into `main` through the visual-transformation reintegration.
