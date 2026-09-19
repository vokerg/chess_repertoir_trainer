# VT-301 Shared Filter Select Menu

Date: 2026-07-30

Issue: #132

Branch: `main` (direct local commit authorized by the user)

Target: `main`

Pull request: not applicable for this direct local commit

Disposition: implementation and automated validation complete; direct authenticated browser review remains pending

## Objective

Translate the useful compact dropdown hierarchy from the isolated Games Sites prototype and the user-provided ChessAtlas reference into the production Angular application without importing either product's colour scheme, runtime, or source structure.

The slice creates one reusable single-choice control and adopts it in Games and Player Chess Profile. It does not merge or deploy the isolated prototype.

## Evidence and boundary

The previous Sites work is an isolated React prototype in open PR #174 under `prototypes/chess-games-prototype`. Its current filters are native selects and its More-filters interaction is a prototype-owned drawer. The production Games route already owns the accepted common-versus-advanced filter hierarchy through `GameFilterPanelComponent`.

Two production consumers now demonstrate the compatible shared contract:

1. the shared game-filter panel used by Games and several analytical workflows;
2. the Player Chess Profile filter bar.

Only the single-choice presentation is shared. Games and Profile retain all filter option meaning, state, outputs, dates, multi-selects, actions, stores, queries, and workflow composition.

## Implemented shared primitive

`app-select-menu` is a controlled, OnPush component with:

- typed string options;
- optional captions and tokenized markers;
- a compact trigger and production-token overlay;
- an explicit selected-state check;
- click-outside close;
- Escape and Tab close behavior;
- Arrow, Home, End, Enter, Space, and single-character keyboard navigation;
- disabled options and visible keyboard focus;
- no router, store, HTTP, forms, feature, or workflow dependency.

The visual result borrows the useful interaction hierarchy of the reference—a small trigger, clear floating panel, quiet option rows, markers, and a selected check—while using the Chess Repertoire Trainer graphite/mint token contract, system typography, radii, focus ring, and overlay shadow.

## Consumer adoption

### Games filter panel

All single-choice filters now use `app-select-menu`:

- account;
- provider;
- result;
- colour;
- control;
- rated/casual;
- analysis status;
- period;
- advanced ply-index status.

Tags remain the existing multi-select. Date, text, accuracy, rating, opening, opponent, and time-control inputs remain unchanged. Selecting Custom period still opens More filters without applying a new date range.

### Player Chess Profile

Period, Speed, and Game status use the shared control. Colour toggles, account multi-select, rating context, custom dates, recalculation, and all typed feature outputs remain feature-owned.

## Behavior preserved

- Games and Profile routes and stores are unchanged.
- No URL, query, API, contract, schema, database, pagination, job, or analysis behavior changed.
- Games applied versus draft filter behavior is unchanged.
- Apply and Reset remain owned by the game-filter consumer.
- Locked user colour remains disabled and cannot emit a change.
- Dynamic account and custom speed facets remain supported.
- Profile period, speed, and rated values still emit the same typed intents.
- Native selects remain available for ordinary forms; no global replacement was attempted.

## Focused tests

Added coverage for:

- current-value trigger rendering and marker presentation;
- listbox/option semantics and selected state;
- value emission and close behavior;
- Arrow and Enter keyboard selection;
- Games use of the shared menu for every visible single-choice filter;
- preserved Games provider emission;
- Custom-period handoff to advanced dates;
- Profile shared-menu inventory and typed period/speed/rated outputs.

## Validation

Passed:

- `npm run lint --workspace=apps/web`;
- `npm test --workspace=apps/web -- --include=apps/web/src/app/shared/ui/select-menu/select-menu.component.spec.ts --include=apps/web/src/app/shared/games/filters/game-filter-panel.component.spec.ts --include=apps/web/src/app/features/player-chess-profile/components/player-chess-profile-filter-bar.component.spec.ts` — 7 specs;
- `npm test --workspace=apps/web` — 316 specs;
- `npm run build:web`;
- `npm run check:architecture`;
- `npm run lint:mobile`;
- `.\node_modules\.bin\tsc.cmd -p apps/api/tsconfig.json --noEmit`;
- `git diff --check`.

The first focused test attempt used paths relative to `apps/web` and discovered zero specs; it returned a non-zero lifecycle result. The corrected repository-relative include paths executed the intended seven specs successfully.

The web production build completed with the repository's four existing CommonJS dependency warnings:

- `repertoire-builder-target.ts` via `@chess-trainer/contracts/repertoire-target`;
- `repertoire-builder-course.store.ts` via `@chess-trainer/contracts/courses`;
- `position-analysis-cache.service.ts` via `chess-domain`;
- `imported-game-search-query.codec.ts` via `@chess-trainer/contracts/imported-games`.

The first root `npm run lint` attempt could not reach Prisma's binary checksum endpoint inside the restricted network sandbox. The approved retry reached Prisma, then stopped before workspace linting because the running local API process held `node_modules/.prisma/client/query_engine-windows.dll.node`; Prisma returned `EPERM` while replacing it. The running development stack was left intact. The same API TypeScript lint command was run directly and passed, and web plus mobile lint passed separately.

Formatting note: the repository does not install Prettier. `npx prettier --write ...` was skipped after npm reported that no cached package was available and network cache-only mode prevented retrieval.

## Browser review status

The local development app was available on port 4200, but `/games` redirected to `/login?returnUrl=%2Fgames`. The selected in-app browser did not have an authenticated application session, so the production route was not visually signed off. The isolated Sites prototype was restored in the user's existing tab after this check.

Direct browser review therefore remains pending; use the checklist below after signing in.

## Browser review checklist

Review `/games` and `/progress/profile` at desktop, 980px, 760px, and 640px:

- trigger density, truncation, marker alignment, and visual hierarchy;
- overlay position at left and right grid edges;
- long account labels, dynamic speed facets, and option captions;
- selected check, hover, click-outside close, Escape, Tab, and complete keyboard navigation;
- Provider, Result, Colour, Control, Rated, Analysis, Period, and Indexed emissions;
- locked colour behavior;
- Custom period and More-filters interaction;
- Tags multi-select visual compatibility;
- Profile Period, Speed, Game status, custom dates, and recalculation;
- mobile-primary navigation clearance;
- reduced motion and visible focus.

## Collision and documentation disposition

Open PR #196 touches Progress account-dashboard files and the Angular migration ledger. Open PR #209 touches Settings files, the migration ledger, and transformation status. This slice therefore updates the architecture source, token-role documentation, D-027, a new report, and issue #132 coordination without editing the two colliding rollout documents. Migration-ledger and status reconciliation remain required after integration.

## Explicit exclusions

- no Sites deployment or prototype merge;
- no More-filters drawer redesign;
- no multi-select replacement;
- no autocomplete or remote option loading;
- no global native-select migration;
- no new dependency;
- no merge without explicit approval.
