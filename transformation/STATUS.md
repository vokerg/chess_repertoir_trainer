# Visual Transformation Status

Last updated: 2026-07-28

## Current state

**Program state:** VT-103 production tokens and typography are integrated; VT-104 residual browser validation is next

**Integration target:** `main`

**Former integration branch:** `visual_transformation` is retired for new work

**Active checkpoint branch after reconciliation:** none

**Active pull request after reconciliation:** none

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

- [x] Applied a Home-local green-grey workspace canvas rather than changing the global legacy body background.
- [x] Kept important recommendation and metric cards on strong white surfaces.
- [x] Moved the account summary and lower workspace/progress containers to quieter tonal surfaces.
- [x] Reduced large floating shadows and shifted hierarchy toward borders and tonal separation.
- [x] Retained graphite for the Continue action and primary recent-progress metric only.
- [x] Retained mint for signal, interaction, and a Home-scoped focus rule.
- [x] Preserved Home component/template/store behavior, routes, loading/data behavior, recommendation logic, and responsive structure.
- [x] Added `transformation/reports/VT_102_HOME_PALETTE_CALIBRATION.md` with concrete palette evidence for VT-103.
- [x] Passed the complete repository workflow in implementation-head CI #1145 and documentation-head CI #1152.
- [x] Received direct browser feedback that the result feels good and explicit approval to squash-merge PR #141.
- [x] Kept the broader Phase 0–1 browser matrix explicit under issue #126.

## VT-103 integrated checkpoint

Delivered:

- [x] Added `apps/web/src/design-system.css` as the namespaced production `--ui-*` layer.
- [x] Preserved `apps/web/src/styles.css` as the explicit amber-era compatibility layer.
- [x] Loaded the production layer after legacy styles in Angular build and test configuration.
- [x] Locked canvas, strong/muted/quiet surfaces, graphite, mint, borders, radii, shadows, focus, and semantic status roles.
- [x] Selected a native system UI stack and monospaced analytical stack without font files or remote loading.
- [x] Migrated global canvas, form controls, focus, shell buttons, page headers, common cards, shared `app-panel`, and shell actions to production roles.
- [x] Added `docs/frontend/design-tokens.md` and updated Angular architecture, migration, and agent guidance.
- [x] Kept Games, Study, Opening Analysis, workbench UI, and later feature-local amber consumers within their owning migration tasks.
- [x] Received a 2048×1151 Home screenshot confirming palette cohesion and exposing excessive unused horizontal space.
- [x] Raised the signed-in shell cap from 1600px to 1920px and Home cap from 1240px to 1560px while preserving copy constraints and mobile breakpoints.
- [x] Static contrast checks for principal text/background pairs ranged from `5.11:1` to `13.72:1`.
- [x] CI #1240, #1245, #1253, #1257, and final width-corrected CI #1262 passed the complete repository workflow.
- [x] The user explicitly instructed completion and merge.
- [x] PR #158 was squash-merged into `main` as `af450eb860819281ad260db364838b9868205508`.

The user review approves the VT-103 palette, token, typography, and wide-workspace merge boundary. It does not replace the comprehensive residual matrix owned by issue #126.

## Execution disposition

The live queue, not this file, determines task state and sequencing.

Issues #123–#125 are complete. Issue #126 is `READY`, P1, order 40 and is the deterministic next task.

Issues #127–#129 are released to `READY` because the VT-103 dependency is integrated, but they remain later by numeric order. Issues #130–#133 retain their existing downstream dependencies.

Every selected task must branch from current `main`, target `main`, and be squash-merged into `main` only after explicit approval.

## Validation status

### Phase 1D automated validation

- CI #1045 passed the final runtime/test head;
- CI #1047 passed the final documentation head;
- integration CI #1051 passed after squash merge.

### VT-000 validation

Final-head CI #1072 passed the complete repository workflow before PR #134 was approved and integrated.

### VT-101 validation

Runtime/test CI #1112, final documentation-head CI #1118, reconciliation CI #1128, and concurrent-queue reconciliation CI #1140 passed the complete repository workflow.

### VT-102 validation

Implementation-head CI #1145 and documentation-head CI #1152 passed dependency installation, lint, the full repository build, architecture guardrails, database migrations, and the complete test suite.

The user reviewed the visual result and explicitly approved it. This did not replace the comprehensive residual matrix owned by issue #126.

### Main-based delivery correction

Documentation/process PR #155 established the main-based delivery model. CI #1227 passed before approved squash merge.

### VT-103 validation

CI #1240, #1245, #1253, #1257, and #1262 passed:

- dependency installation;
- lint;
- the full repository build;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- the complete test suite.

No local build was run because the execution environment could not resolve `github.com` for a direct checkout; repository inspection and edits used the GitHub connector.

The user supplied direct large-screen Home evidence, confirmed the palette direction, identified the width-cap issue, and explicitly instructed completion and merge. The width-cap correction was included before final CI and merge.

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
- representative signed-in page widths and legacy compatibility surfaces.

## Open design and product decisions

The decision log remains canonical. Current open owners include:

- #126 — Phase 0–1 residual browser-validation disposition;
- #131 — final mobile-primary navigation.

Production palette, semantic status roles, namespace, compatibility boundary, typography, and initial wide-workspace caps are integrated production decisions.

## Program phase state

### Phase 0 — identity and visual proof

Core implementations are integrated into `main`. Residual browser validation remains open.

### Phase 1 — shell and entry points

Public, auth, Home, brand, rail, inline desktop navigation, landing motion, issue-driven execution governance, Home calibration, production tokens, typography, and wide-workspace foundation are integrated into `main`. Public metadata and residual validation remain.

### Phase 2 — representative workflows

Games, Study, and Opening Analysis are released by the VT-103 dependency but remain sequenced after issue #126. Proven shared primitives and final mobile navigation retain their workflow dependencies.

### Phase 3 — rollout and polish

Remaining-page rollout and onboarding/accessibility/responsive polish remain represented by issues #132 and #133.

## Session log

### 2026-07-28 — VT-103 integration and wide-screen correction

- Added the production token and typography layer with an explicit legacy compatibility boundary.
- Passed repeated complete repository validation through final CI #1262.
- Received direct 2048×1151 Home evidence confirming palette cohesion and exposing conservative width caps.
- Raised signed-in shell/Home caps while preserving copy and mobile constraints.
- Received explicit completion and merge instruction.
- Squash-merged PR #158 into `main` as `af450eb860819281ad260db364838b9868205508`.
- Released dependent workflow issues and selected #126 as the deterministic next task.

### 2026-07-28 — Main-based delivery model reconciliation

- Retired `visual_transformation` as an integration target for new work.
- Changed future task creation to branch from current `main` and future pull requests to target `main`.
- Preserved short-lived branches, explicit approval, squash merge, deterministic issue selection, documentation reconciliation, and dependency-release rules.

### 2026-07-28 — VT-102 Home palette calibration integration

- Implemented the Home-local canvas and calibrated surface hierarchy without changing global tokens or Home behavior.
- Passed the complete repository workflow in CI #1145 and #1152.
- Received direct browser feedback and explicit approval to squash-merge PR #141.

### 2026-07-28 — VT-101 integration and concurrent VT-102 handoff

- Implemented and validated the inline navigation accordion through CI #1112 and #1118.
- Received explicit approval and squash-merged PR #137.
- Reconciled completed task and queue records through PRs #142–#144.

### 2026-07-27 — VT-000 issue-driven queue migration

- Created program issue #122 and execution issues #123–#133 with deterministic priority and dependency metadata.
- Locked the hybrid documentation/issues ownership model in D-022.
- Opened and integrated PR #134 after complete final-head CI #1072.

### Earlier integrated checkpoints

PRs #78, #79, #85, #86, #87, #88, #108, #112, #118, #120, #134, #137, #142, #143, #144, #141, #155, and #158 are integrated into `main`.
