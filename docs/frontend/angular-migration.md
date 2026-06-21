# Angular migration ledger

This document tracks existing frontend debt while `angular-architecture.md` remains the stable target. Remove entries as components are migrated; do not weaken architecture rules to match legacy code.

Old page-heavy code is intentionally allowed to remain until touched. New features must not copy it. Changes to legacy pages should be narrow, or should explicitly include the relevant feature-local refactor.

## Completed

- Application shell: external template/styles and OnPush.
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
- Study planner refactor: `/library` now uses feature-local presentational components for scope columns, line selection, and the training basket, with selected-line marathon navigation owned by the store.
- Chapter line health table: chapter lines now use feature-local table/status/action components, store-owned expanded row state, selected line ids, selected subline hashes, and typed subline status data access.

## Accepted feature debt

- Some legacy global `.library-*` CSS remains because `LineTrainingSessionComponent` and other shared training surfaces still consume those classes. A later styling pass can split those remaining globals once the training session UI has its own component stylesheet.

## Migration order

Prioritize by responsibility count and user-facing risk:

1. Remaining shared board, engine, PGN, and note components.

## Per-component completion criteria

- Lives under the owning feature where practical.
- Route page is a composition shell.
- Uses OnPush and built-in template control flow.
- Uses external template/styles when non-trivial.
- Has no direct HTTP workflow in a presentational component.
- Uses signals/computed state and lifecycle-safe observable interop.
- Uses immutable updates and stable repeated-item tracking.
- Relevant validation has been run and reported.

## Accepted tooling debt

- `apps/web` has an `ng lint` script but no Angular lint target.
- The web test script is currently a placeholder even though Jasmine/Karma scaffolding exists.

Address tooling separately from feature migrations. Do not block documentation or narrow legacy cleanup on broad test setup.
