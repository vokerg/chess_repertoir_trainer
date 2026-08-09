# Angular migration ledger

This document tracks existing frontend debt while `angular-architecture.md` remains the stable target. Remove entries as components are migrated; do not weaken architecture rules to match legacy code.

Old page-heavy code is intentionally allowed to remain until touched. New features must not copy it. Changes to legacy components should be narrow or explicitly include the relevant feature-local refactor.

## Completed

- Application shell: external template/styles, OnPush, and app-specific navigation extracted to `core/layout/main-navigation`.
- Production token foundation: `design-system.css` owns namespaced `--ui-*` colour, typography, radius, shadow, focus, and semantic-status roles; shared page headers, panels, shell actions, global controls, and the application canvas consume the production layer.
- Games explorer and Game Detail: feature-local route pages, signal stores, typed data access, immutable updates, pure helpers, presentational composition, responsive evidence, and built-in control flow.
- Study/library: feature-local route page, signal store, typed data access, computed filtering/selection, stale-request guards, presentational scope/line/basket components, and responsive training launch flow.
- Opening Analysis and Free Analysis: feature-owned route/query/store workflows composed through the shared analytical workbench without moving persistence, engine, board, filter, or navigation ownership into shared UI.
- Courses, Course Review, chapter lines, line editor, marathon, focused line training, Lichess puzzles, and tactical scenarios: feature-local OnPush pages/stores, typed data access, lifecycle-safe route handling, and shared presentational training/board boundaries.
- Accounts, Progress, Player Chess Profile, Lichess integration, and Appearance: feature-local routes, stores/data access where applicable, computed view state, immutable commands, external templates/styles, and rendered accessibility regression coverage.
- Lab: composition-only discovery shell and thin OnPush experiment route wrappers with isolated experiment stores/components and typed data access.
- Opening Struggles and repertoire Builder: feature-local state/data access/query ownership with shared workbench presentation and no Lab or cross-feature implementation dependency.
- Proven shared presentation primitives: `shared/ui/context-strip`, `shared/ui/fact-grid`, and `shared/ui/select-menu` remain typed, OnPush, semantic, feature-agnostic, store-free, and HTTP-free.
- Mobile-primary navigation: Home, Study, Games, Openings, and More are derived from the existing hierarchical model while preserving complete grouped route/account access.
- VT-302 workbench compatibility cleanup: global `workbench.css` plus Repertoire Builder workbench, setup, and explanation presentation use production `--ui-*` visual-semantic roles; an architecture guard prevents those bounded files from regressing to the legacy amber-era visual names.
- VT-302 shared async-state foundation: `shared/ui/state-message` provides a bounded store-free loading/empty/error presentation contract; Courses and Accounts are the first proven consumers, with focused semantic tests and an accessibility-contract guard preventing those migrated boundaries from regressing to local empty-state presentation.
- VT-302 training/Library compatibility cleanup: Lines no longer consumes Library-owned `.library-*` presentation. The three affected training links reuse the existing `compact-action secondary` contract, and architecture guardrails reject `.library-*` classes anywhere in Lines HTML/CSS.

## Visual-transformation route disposition

VT-301 route-family rollout is complete at the implementation level.

The exact current route registry contains 34 guarded authenticated URL entries and 29 unique guarded route components after shared session routes are collapsed. Every route component maps to an integrated Phase 1, Phase 2, or VT-301 batch. No authenticated route family remains unclassified.

See [`../../transformation/reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md`](../../transformation/reports/VT_301_ROUTE_INVENTORY_AND_COMPLETION.md) for the route/component table, redirects, integration evidence, and residual-debt boundary.

Integrated VT-301 slices:

- Batch 1: Progress account dashboard — PR #196.
- Batch 2: Player Chess Profile — PR #206.
- Batch 3: `/settings/accounts`, `/settings/lichess`, and `/settings/appearance` — PR #209.
- Batch 4a: marathon and focused line training — PR #211.
- Batch 4b: Courses and Course Review — PR #215.
- Batches 4c/4d: repertoire authoring, line editing, Lichess puzzles, and tactical scenarios — PR #221.
- Batch 5: shared single-choice filter menu — commit `a30303ffb9e59de4f4a99e1be936e4624ba13b63`.
- Batch 6: shared analytical workbench consumers, Game Review, Free Analysis, Opening Analysis evidence, and Opening Struggles — PR #235.
- Batch 7a: Lab discovery, Top Opponents, Monthly Games, and Training Log — PR #252.
- Batch 7b: Performance by Rating — PR #269.
- Batch 7c: Tactical Detections — PR #277.

## Accepted compatibility debt

A transformed route may still compose a bounded legacy-compatible shared widget. Route-family completion does not authorize a global token rewrite.

- `apps/web/src/styles.css` remains the explicit amber-era compatibility layer for known remaining consumers and the shared `--space-*` scale. New transformed UI must not add dependencies on its short visual role names.
- Home retains calibrated local `--home-*` aliases whose values match the approved graphite/mint direction but predate the production `--ui-*` namespace.
- Global `.library-*` presentation remains for the Study/library feature itself, but Lines no longer consumes it. Removing or relocating the remaining Library-owned global block requires its own complete Library consumer inspection; it is not implied by the training cleanup.
- Games evidence cards, Study workflow/launcher composition, Lab experiment internals, and workbench evidence slots remain feature-owned because their hierarchy and commands are domain-specific. Feature ownership is not visual-token compatibility debt.
- Deferred authenticated browser checks remain deferred evidence, not observed passes.

The former `workbench.css` visual-semantic debt is no longer an accepted boundary: VT-302 migrated the complete bounded global workbench and Repertoire Builder workbench/setup/explanation presentation to `--ui-*` roles and added a regression guard. This does not remove the legacy spacing scale or authorize deletion/redefinition of `styles.css`.

## VT-302-owned polish

VT-302 may address:

- coherent first-run/onboarding guidance;
- consistent empty, loading, partial-data, error, recovery, and retry states;
- keyboard and screen-reader review;
- contrast, focus, reduced motion, zoom, and representative responsive widths;
- evidence-based cleanup of accepted compatibility roles where the complete consumer boundary is known;
- restrained appearance and motion refinement without creating another visual identity.

The shared state-message slice establishes only the first loading/empty/error presentation contract and migrates Courses plus Accounts. Broader route adoption, partial-data/recovery/retry behavior, and functional onboarding remain separate evidence-driven work; the shared primitive does not move feature workflow ownership into `shared/ui`.

VT-302 must not reopen route-family rollout merely because a transformed route retains accepted compatibility debt.

## Per-component completion criteria

- Lives under the owning feature where practical.
- Route page is a composition shell.
- Uses OnPush and built-in template control flow.
- Has external template/styles when non-trivial.
- Has no direct HTTP workflow in a presentational component.
- Uses signals/computed state and lifecycle-safe observable interop.
- Uses immutable updates and stable repeated-item tracking.
- Uses production `--ui-*` visual roles when the component is in transformed scope, except for an explicitly documented compatibility boundary.
- Relevant validation has been run and reported.

## Accepted tooling debt

- Web linting is currently Angular/TypeScript template compilation through `ngc`; there is no dedicated ESLint or CSS lint stage.
- The Karma/Chrome Angular test suite is active and remains part of repository CI.

Address tooling separately from feature migrations. Do not block documentation or narrow compatibility cleanup on broad lint-tool adoption.
