# Angular migration ledger

This document tracks existing frontend debt while `angular-architecture.md` remains the stable target. Remove entries as components are migrated; do not weaken architecture rules to match legacy code.

Old page-heavy code is intentionally allowed to remain until touched. New features must not copy it. Changes to legacy pages should be narrow, or should explicitly include the relevant feature-local refactor.

## Completed

- Application shell: external template/styles, OnPush, and app-specific navigation extracted to `core/layout/main-navigation`.
- Production token foundation: `design-system.css` owns namespaced `--ui-*` colour, typography, radius, shadow, focus, and semantic-status roles; the shared page header, panel, shell actions, global controls, and application canvas consume the production layer.
- Games explorer store: immutable row patching without row-action list reloads.
- Game detail: feature-local route page, signal store, typed data access, pure tree helpers, presentational summary/workbench components, and built-in control flow.
- Move tree: OnPush, signal inputs/outputs, built-in control flow, and stable tracking.
- Opening analysis: feature-local route page, signal store, typed data access, pure query/label helpers, external template/styles, and built-in control flow.
- Accounts: feature-local route page, signal store, typed data access, immutable row updates, external template/styles, and built-in control flow.
- Library browser: feature-local route page, signal store, typed data access, computed filtering/selection, stale-request guards, and built-in control flow.
- Course detail: feature-local route page, signal store, typed data access, immutable chapter updates, external template/styles, and lifecycle-safe route handling.
- Line training and marathon: feature-local pages/stores, shared presentational session UI within the lines feature, typed training APIs, and no HTTP-owning child component.
- Courses: feature-local OnPush pages, signal stores, typed data access, external templates/styles, immutable updates, and built-in control flow.
- Games table presentation: external templates/styles, built-in control flow with stable row tracking, signal-based action-menu state, and tested feature-local display helpers.
- Lab: composition-only shell with isolated experiment components, page-scoped signal stores, typed experiment data access, external templates/styles, and built-in control flow.
- Opening struggles: standalone Openings page with feature-local state, data access, query helpers, responsive criteria UI, and no Lab dependency.
- Study planner refactor: `/library` now uses feature-local presentational components for scope columns, line selection, and the training basket, with selected-line marathon navigation owned by the store.
- Chapter line health table: chapter lines now use feature-local table/status/action components, store-owned expanded row state, selected line ids, selected subline hashes, and typed subline status data access.
- Free analysis: `/analysis` now uses a composition-focused route page, feature-local workbench and my-games panel components, signal store workflow state, typed route-query helpers, and built-in control flow.
- Game detail analysis: `/games/:gameId` now uses `components`, `state`, and `helpers` folders for the route header, summary, shared workbench wrapper, signal store, labels, and game-tree helpers.
- Representative workflow modernization: Games, Study, and Opening Analysis consume production roles while preserving route, store, data-access, and domain workflow ownership.
- Proven shared presentation primitives: `shared/ui/context-strip` serves Study and Opening Analysis derived context; `shared/ui/fact-grid` serves Games responsive evidence and Study line health. Both remain typed, OnPush, semantic, and feature-agnostic.
- Mobile-primary navigation: `core/layout/main-navigation` derives Home, Study, Games, and Openings from the existing hierarchical model, uses More for complete grouped route/account access, delegates secondary active state to More, and coordinates safe-area/content/job-panel clearance without changing routes or feature ownership.
- VT-301 Batch 2: Player Chess Profile presentation is integrated through PR #206 while retaining its store, API, filter, recalculation, evidence-selection, and route contracts.
- VT-301 Batch 3: Settings presentation is integrated through PR #209 for `/settings/accounts`, `/settings/lichess`, and `/settings/appearance`; account/OAuth/sound behavior remains feature-owned, expensive template filtering is moved to a tested helper, account management is separated from primary workflows, and rendered accessibility regressions are covered.
- VT-301 Batch 4a: marathon and focused line-training presentation is integrated through PR #211 while retaining stores, APIs, scoring, board mechanics, persistence, and mistake review.
- VT-301 Batch 4b: Courses and Course Review presentation is integrated through PR #215 while retaining stores, APIs, filters, chapter commands, and exact RB-012 Builder launch contracts.
- VT-301 Batch 4c: repertoire-authoring presentation is integrated through PR #221 while retaining chapter/line CRUD, transfer, PGN, editor-tree, notes, board, engine, and training ownership.
- VT-301 Batch 4d: Lichess puzzle and tactical-scenario presentation is integrated through PR #221 while retaining puzzle rating/sync, scenario selection/evaluation, attempts, engine behavior, board mechanics, and persistence ownership.
- VT-301 Batch 7a: Lab discovery, Top Opponents, Monthly Games, and Training Log use the production panel/table patterns with rendered regression coverage through PR #252.
- VT-301 Batch 7b: Performance by Rating uses the production criteria, disclosure, and analytical-table patterns with rendered accessibility regression coverage through PR #269.

## Active rollout

- VT-301 Batch 1 / draft PR #196 migrates `/progress` and `/progress/accounts/:accountId` to the production token and shared fact-grid system; repository CI passed and browser review remains pending.
- VT-301 Batch 7c / draft PR #277 migrates Tactical Detections through the existing Lab page header, `app-panel`, typed shell actions/stats, `app-select-menu`, production tokens, semantic table structure, and rendered component tests; CI and browser disposition remain pending.

## Accepted feature debt

- `apps/web/src/styles.css` and feature styles still contain amber-era short tokens such as `--accent`. They are an explicit compatibility layer for routes awaiting their recorded visual-transformation task, not the source for new styling.
- Remaining Progress routes still need integration or explicit disposition under VT-301. Tactical Detections is active in draft PR #277; Settings and the other Lab rollout families are integrated.
- Opening Analysis retains a feature-scoped compatibility bridge because several shared analytical widgets still consume legacy short role names. Migrate those widgets only when their full consumer set is reviewed; do not redefine the legacy names globally.
- Some legacy global `.library-*` CSS remains because `LineTrainingSessionComponent` and other shared training surfaces still consume those classes. A later styling pass can split those remaining globals once the training session UI has its own component stylesheet.
- Games evidence cards, Study workflow-step/launcher/training-plan composition, and analysis-workbench evidence slots remain feature-owned. Their current contracts are domain-specific and were intentionally not generalized during VT-204.
- Direct mobile browser feedback for Study, Opening Analysis, the shared-primitives regression, and approved VT-301 batches remains deferred evidence rather than an observed pass.

## Migration order

Prioritize by responsibility count and user-facing risk:

1. Complete or disposition the active Progress and Tactical Detections VT-301 branches.
2. Reconcile any remaining authenticated route inventory before VT-302 onboarding/accessibility/responsive polish begins.

## Per-component completion criteria

- Lives under the owning feature where practical.
- Route page is a composition shell.
- Uses OnPush and built-in template control flow.
- Has external template/styles when non-trivial.
- Has no direct HTTP workflow in a presentational component.
- Uses signals/computed state and lifecycle-safe observable interop.
- Uses immutable updates and stable repeated-item tracking.
- Uses production `--ui-*` tokens when the component is in transformed scope.
- Relevant validation has been run and reported.

## Accepted tooling debt

- Web linting is currently Angular/TypeScript template compilation through `ngc`; there is no dedicated ESLint or CSS lint stage.
- The Karma/Chrome Angular test suite is active and remains part of repository CI.

Address tooling separately from feature migrations. Do not block documentation or narrow legacy cleanup on broad lint-tool adoption.
