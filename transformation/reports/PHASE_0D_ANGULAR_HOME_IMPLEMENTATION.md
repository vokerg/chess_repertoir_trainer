# Phase 0D Angular signed-in home implementation

Date: 2026-07-26

## Goal

Implement the approved Phase 0C signed-in `/home` composition as a narrow Angular slice using the current application shell and existing typed APIs, while preserving explicit authentication return URLs and excluding the production navigation rail, new backend aggregation, Lab dependencies, and authenticated workflow redesigns.

## Approved scope

The user approved the Phase 0C direction with these implementation constraints:

- use the current signed-in shell;
- add `/home` as the normal post-auth destination;
- preserve explicit `returnUrl` behavior;
- use existing stable services and contracts;
- do not add a home aggregation endpoint without measured evidence;
- do not use `/lab/*` data as a core home dependency;
- defer Recent signals;
- retain the seven-day stale-sync threshold as a named provisional constant;
- do not implement the future navigation rail in this slice.

## Work completed

### Route and authentication navigation

- Registered guarded `/home` in `apps/web/src/app/app.routes.ts`.
- Kept `/home` inside the existing signed-in application shell.
- Changed the login fallback from `/library` to `/home` only when no explicit `returnUrl` is supplied.
- Changed the sign-up fallback in the same way.
- Left `authGuard` behavior unchanged, so protected-route redirects still pass the requested URL explicitly.

### Existing navigation model

- Added Home as the first item in `MainNavigationComponent.mainNavItems`.
- Added a feature-agnostic home icon to the existing `NavIconComponent` union and switch.
- Did not change navigation layout, grouping mechanics, mobile menu behavior, or the future rail architecture.

### Home feature architecture

Added a feature-local `features/home` slice:

- `home-page.component.ts` — route-page composition and refresh trigger;
- `home-page.component.html` — action-led home hierarchy;
- `home-page.component.css` — responsive Phase 0C visual treatment inside the current shell;
- `home-dashboard.store.ts` — signal-based loading, composition, and partial-failure state;
- `home-dashboard.models.ts` — home action and summary view models;
- `home-dashboard.helpers.ts` — deterministic account, Continue, recommendation, progress, and sync rules;
- `home-dashboard.helpers.spec.ts` — focused rule tests.

The route page provides the existing non-root account and library data-access services. The store injects those services, the existing root Games service, and the existing Auth service. No HTTP call is owned by the component.

### Data composition

The first load uses existing typed services:

- `AccountsApiService.getAccounts()`;
- `LibraryApiService.getCatalog()`;
- `GamesApiService.getFacets()`;
- `GamesApiService.searchGames({ sort: 'endedAtDesc', limit: 6 })`;
- `AccountsApiService.getPerformanceStats()` for the selected account and a 30-day date range.

Account selection reuses the existing Progress convention:

1. default progress account;
2. first active account;
3. first account.

The first four independent sources use `Promise.allSettled`. Successful sections remain available when another source fails. The page presents a warning for partial data and a fatal retry state only when the primary source group is unavailable.

### Deterministic Continue rule

The dominant action selects:

1. course with weak sublines;
2. course with untrained active sublines;
3. latest completed analysed game;
4. Study/library fallback.

Weak and untrained courses are ranked by:

1. relevant count descending;
2. failed attempts descending;
3. stable course id ascending.

Course actions use the existing `/courses/:courseId/marathon` route with the existing `WEAK_SUBLINES` or `UNTRAINED_SUBLINES` mode. Game actions use the existing `/games/:gameId` review route.

### Recommended next rule

The store builds candidate actions from:

- no connected account;
- no imported games;
- no course;
- games with `NOT_ANALYZED` status;
- weak repertoire work;
- untrained repertoire work;
- latest completed analysis;
- account with no sync or a sync older than `HOME_SYNC_STALE_DAYS`;
- existing Progress destination when recent performance data exists.

It removes the action already used by Continue and returns at most three recommendations.

### Visual composition

The implemented hierarchy is:

1. greeting and compact selected-account/sync summary;
2. one dominant graphite Continue surface;
3. up to three explained recommendation surfaces;
4. six existing workspace shortcuts;
5. a restrained recent-progress block.

Recent signals is intentionally omitted. The page does not attempt to reproduce the future rail shown directionally in the Phase 0C prototype.

## Files changed

Runtime and test files:

- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/layout/main-navigation/main-navigation.component.ts`
- `apps/web/src/app/features/auth/login-page.component.ts`
- `apps/web/src/app/features/auth/signup-page.component.ts`
- `apps/web/src/app/shared/ui/nav-icon/nav-icon.component.ts`
- `apps/web/src/app/features/home/home-page.component.ts`
- `apps/web/src/app/features/home/home-page.component.html`
- `apps/web/src/app/features/home/home-page.component.css`
- `apps/web/src/app/features/home/home-dashboard.store.ts`
- `apps/web/src/app/features/home/home-dashboard.models.ts`
- `apps/web/src/app/features/home/home-dashboard.helpers.ts`
- `apps/web/src/app/features/home/home-dashboard.helpers.spec.ts`

Transformation documentation:

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/reports/PHASE_0D_ANGULAR_HOME_IMPLEMENTATION.md`

`transformation/MASTER_PLAN.md` is unchanged because this implementation follows the existing approved phase sequence and target architecture.

## Validation performed

### Repository inspection

Inspected the current branch implementation for:

- route registration and guard conventions;
- application shell ownership;
- navigation data and icon conventions;
- login and sign-up return URL handling;
- current Auth display-name state;
- Progress account-selection behavior;
- library catalog and marathon route modes;
- imported-game facets, search response, query serialization, and game review routes;
- account performance data and 30-day query support;
- Angular standalone, OnPush, signals, provider, and test patterns.

### Automated checks

GitHub Actions CI run #885 completed successfully on the implementation head before the final validation-document update.

The successful workflow ran:

```text
npm ci
npm run lint
npm run build
npm run check:architecture
npm run db:migrate --workspace=apps/api
npm test
```

Results:

- lint passed;
- the full monorepo build passed, including Angular template and type compilation;
- architecture guardrails passed;
- database migrations applied successfully against the CI database;
- the complete monorepo test suite passed, including the new home helper tests.

The final documentation-only head must also complete CI before PR #87 is marked ready for review.

### Focused tests added

The helper spec verifies:

- default, active, then first account selection;
- weak course priority over other Continue options;
- analysed-game fallback;
- setup recommendations and Continue de-duplication;
- inclusive seven-day stale-sync threshold.

## Browser review required

Review `/home` with:

- representative populated data;
- no account;
- account with no imported games;
- no course;
- weak and untrained course combinations;
- recent completed analysis;
- partial API failures;
- desktop, tablet, and mobile widths;
- keyboard navigation and visible focus;
- manual refresh;
- current mobile navigation menu.

Authentication review must cover:

- normal sign-in to `/home`;
- normal sign-up to `/home`;
- protected route redirect preserving its explicit `returnUrl`;
- configured Clerk mode;
- local development-auth mode.

## Warnings and residual risks

- Browser and responsive review is not available through the GitHub connector.
- Authentication browser/Clerk validation remains open under D-306.
- The store currently performs multiple existing requests; request timing must be observed before considering any aggregation boundary.
- The seven-day stale-sync threshold is provisional.
- Recent progress uses performance statistics and aggregate catalog attempts; it intentionally omits unverified repertoire coverage and rating delta claims.
- The current navigation shell remains visually legacy relative to the home surface; rail work is deliberately separate.
- Recommendation ranking is deterministic and testable but may require tuning after real-data use.
- Partial failures are surfaced as combined warnings rather than per-card errors to keep the first implementation narrow.
- PR #77 from `visual_transformation` to `main` remains outside scope.

## Review instructions

Review in this order:

1. this report;
2. PR #87 CI and changed files;
3. `/home` populated and empty states;
4. login/sign-up and explicit return URL behavior;
5. desktop/mobile layout and keyboard focus;
6. `transformation/DECISIONS.md` D-015, D-105, D-305, and D-308.

Confirm that the implementation remains inside the approved scope and does not pull forward the production rail, global token migration, brand extraction, backend aggregation, Lab promotion, or representative workflow redesigns.

## Next gate

Approve, revise, or reject the Phase 0D Angular home implementation.

Do not merge PR #87 without explicit approval. If approved, squash merge it into `visual_transformation`. The following transformation slice must be selected explicitly after that merge; neither the production navigation rail nor a Phase 2 workflow is implicitly approved by completing `/home`.
