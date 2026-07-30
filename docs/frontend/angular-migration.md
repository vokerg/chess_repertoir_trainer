# Angular migration ledger

This document tracks existing frontend debt while `angular-architecture.md` remains the stable target. Remove entries as components are migrated; do not weaken architecture rules to match legacy code.

Old page-heavy code is intentionally allowed to remain until touched. New features must not copy it. Changes to legacy pages should be narrow, or should explicitly include the relevant feature-local refactor.

## Completed

- Application shell: external template/styles, OnPush, and app-specific navigation extracted to `core/layout/main-navigation`.
- Production token foundation: `design-system.css` owns namespaced `--ui-*` roles; the shared page header, panel, shell actions, global controls, and application canvas consume the production layer.
- Games, Study, and Opening Analysis representative workflows retain feature ownership while consuming production presentation roles.
- Proven shared presentation primitives: `shared/ui/context-strip` serves derived context and `shared/ui/fact-grid` serves semantic label/value evidence.
- Mobile-primary navigation derives Home, Study, Games, Openings, and More from the existing hierarchical model without changing routes or feature ownership.
- Existing feature architecture migrations remain complete for Accounts, Library, Courses, Lines, Lab, Opening Struggles, Free Analysis, and Game Detail.
- VT-301 Batch 2 / squash-merged PR #206 migrated `/progress/profile` to production `--ui-*` roles while preserving its store, API, filters, recalculation, evidence selection, and component boundaries. CI #1521 passed; direct browser review was explicitly deferred.

## Active rollout

- VT-301 Batch 1 / draft PR #196 migrates `/progress` and `/progress/accounts/:accountId`; repository CI passed and browser review remains pending.
- VT-301 Batch 3 / draft PR #209 migrates `/settings/accounts`, `/settings/lichess`, and `/settings/appearance`, reuses `app-fact-grid` for account/connection evidence, and externalizes the Appearance template/styles while preserving account, OAuth, and sound-preference behavior.

## Accepted feature debt

- `apps/web/src/styles.css` and untransformed feature styles still contain amber-era short tokens as an explicit compatibility layer.
- Remaining routes and Labs need deliberate migration to the production `--ui-*` contract.
- Opening Analysis retains a feature-scoped compatibility bridge until all shared analytical-widget consumers are reviewed.
- Some legacy global `.library-*` CSS remains because shared training surfaces still consume those classes.
- Games evidence cards, Study workflow composition, and analysis-workbench evidence slots remain feature-owned.
- Direct browser feedback for several approved transformation batches, including VT-301 Player Chess Profile, remains deferred evidence rather than observed validation.

## Migration order

1. Remaining shared board, engine, PGN, note, and analytical-widget token migration.
2. Remaining pages and Labs, followed by onboarding, accessibility, and responsive polish.

## Per-component completion criteria

- Lives under the owning feature where practical.
- Route page is a composition shell.
- Uses OnPush, built-in template control flow, stable tracking, and external template/styles when non-trivial.
- Keeps HTTP and workflow ownership out of presentational components.
- Uses production `--ui-*` tokens when in transformed scope.
- Relevant validation is run and reported.

## Accepted tooling debt

- `apps/web` has an `ng lint` script but no Angular lint target.
- The web test script is currently a placeholder even though Jasmine/Karma scaffolding exists.
