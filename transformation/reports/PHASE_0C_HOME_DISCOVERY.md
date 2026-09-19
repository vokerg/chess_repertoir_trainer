# Phase 0C signed-in home discovery and visualization

Date: 2026-07-26

## Goal

Determine a concrete, repository-grounded first signed-in `/home` composition and produce a responsive visual proof without implementing the Angular route, changing authentication navigation, or introducing a new backend aggregation API.

## Work completed

- Squash-merged the completed Phase 0B checkpoint-closure PR #85 into `visual_transformation` after CI passed.
- Created `visual-transformation/phase-0c-home-discovery` from the updated integration branch.
- Inspected current Angular routes, root shell, navigation, account selection, data-access services, shared contracts, and transformation rules.
- Identified a first-home data composition that can be built from existing stable endpoints.
- Defined deterministic setup, continue, recommendation, and progress rules.
- Produced a responsive static HTML/CSS home prototype.
- Produced a GitHub-renderable desktop/mobile review sheet.
- Added prototype review and reproduction instructions.
- Updated transformation status, decisions, entry point, and stop condition.

## Repository evidence and data composition

### Account and synchronization state

Existing source:

- `GET /me/accounts` through `AccountsApiService.getAccounts()`.

Available fields include account provider, username, active/default-progress status, and `lastSyncAt`. The existing Progress entry route already selects an account in this order:

1. default progress account;
2. first active account;
3. first account.

The first home should reuse this rule rather than create another account-selection convention.

### Repertoire and training state

Existing source:

- `GET /library/catalog` through `LibraryApiService.getCatalog()`.

The catalog returns courses, chapters, lines, and course/line training statistics, including:

- active subline count;
- trained and untrained subline counts;
- weak subline count;
- total, passed, and failed attempts;
- pass rate and status.

One request can support the dominant Continue action, repertoire recommendations, and a restrained training summary. No per-course request fan-out is required.

### Imported-game state

Existing sources:

- `GET /imported-games/facets` through `GamesApiService.getFacets()`;
- `GET /imported-games` through `GamesApiService.searchGames()`.

Facets expose account game counts and counts by provider, result, speed, opening, and analysis status. Recent-game search exposes the latest games, result, opening, analysis status, and user accuracy.

The search response does not include a filtered total count. Period-specific game totals should therefore come from account performance stats rather than from paging through game search results.

### Recent progress

Existing sources:

- `GET /me/accounts/:accountId/performance-stats`;
- `GET /me/accounts/:accountId/rating-history` or `/rating-stats`.

Performance stats provide period games, W/D/L, average opponent ratings, time-control performance, and game highlights. Rating history/stats provide current and historical rating evidence. The prototype uses a compact 30-day progress block rather than a dashboard wall of charts.

### Explicitly excluded data dependencies

The first home should not depend on `/lab/*` endpoints. Training-log and tactical-detection Lab data may be useful later, but the transformation working rules prohibit presenting experimental Labs as established core product behavior without an explicit promotion decision.

No unified activity-feed API is required for the first slice. The prototype's Recent signals can be derived from the latest game, account `lastSyncAt`, and current catalog state, or omitted from the first implementation if the composition becomes too busy.

## Proposed home hierarchy

### 1. Header

- Time-appropriate greeting using the authenticated display name.
- One sentence answering what changed and what to do next.
- No decorative dashboard summary row before the primary action.

### 2. Continue

One dominant action, selected deterministically:

1. course with weak sublines;
2. otherwise course with untrained active sublines;
3. otherwise latest completed analysed game;
4. otherwise Study/library.

For weak/untrained courses, rank by relevant count descending, then failed attempts descending, then stable course id. The action links into the existing Study/course workflow; it does not create a new training orchestration API.

### 3. Recommended next

Build candidate actions from existing state, remove the action already used by Continue, and show at most three:

1. setup blocker: no account, no imported games, or no course;
2. imported games awaiting analysis;
3. weak repertoire sublines;
4. untrained active sublines;
5. latest completed analysed game ready for review;
6. account never synced or not synced for seven days;
7. progress dashboard when the selected account has period games.

The seven-day refresh threshold is provisional and should remain a named client constant if implementation is approved.

### 4. Workspace shortcuts

Use existing destinations only:

- Study `/library`;
- Games `/games`;
- Openings `/opening-analysis`;
- Courses `/courses`;
- Analysis `/analysis`;
- Progress `/progress`.

### 5. Recent progress

For the existing selected progress account:

- current or latest period rating plus delta when available;
- 30-day game count and score derived from performance stats;
- aggregate recent repertoire attempts from the library catalog.

Do not show repertoire coverage until a verified coverage definition and source are chosen.

## Design rationale

The page is action-led rather than metric-led. The dominant Continue surface answers the immediate workflow question; recommendations explain why they exist; progress is secondary evidence rather than the main purpose of the page.

The desktop proof places the home inside the locked left-rail direction, but does not finalize rail implementation details. The mobile proof uses a compact top header and workspace shortcuts rather than prematurely locking the still-open bottom-navigation model.

The composition uses the existing graphite/mint identity, light analytical canvas, restrained surfaces, compact numerical typography, and fewer nested cards than the current application style.

## Scope intentionally excluded

- Angular `/home` route or components;
- post-login fallback change from `/library` to `/home`;
- production navigation rail implementation;
- final mobile navigation structure;
- production SVG/brand-component extraction;
- global design-token migration;
- new backend endpoints or database changes;
- a recommendation engine, persistence, queue, or background job;
- use of Lab endpoints as core home dependencies;
- authenticated workflow redesigns.

## Files changed

- `TRANSFORMATION.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `transformation/prototypes/phase-0c-home/index.html`
- `transformation/prototypes/phase-0c-home/styles.css`
- `transformation/prototypes/phase-0c-home/node-branch-badge.svg`
- `transformation/prototypes/phase-0c-home/review-sheet.svg`
- `transformation/prototypes/phase-0c-home/README.md`
- `transformation/reports/PHASE_0C_HOME_DISCOVERY.md`

`transformation/MASTER_PLAN.md` is unchanged because the established plan already requires a signed-in home visualization before implementation; this slice does not change program scope, architecture, sequence, or target outcomes.

## Validation performed

- Inspected repository files directly from `visual_transformation` and the Phase 0C branch.
- Confirmed PR #85 CI succeeded and squash-merged it before branching.
- Verified current `/home` route absence and `/library` post-auth fallback.
- Verified current route and navigation destinations.
- Verified account-selection behavior used by the existing Progress entry page.
- Verified stable account, library, game, performance, and rating data shapes.
- Parsed the prototype HTML with Python's HTML parser.
- Verified CSS brace balance.
- Parsed both prototype SVG files as XML.
- Rendered `review-sheet.svg` to PNG with ImageMagick and visually inspected the desktop/mobile composition.
- Re-read every changed file after writing it.
- Compared the branch with `visual_transformation` to verify the change remains documentation and static prototype only.

## Commands skipped or unsuccessful

The following repository commands were not run because this checkpoint changes only Markdown, static HTML/CSS, and review SVGs:

```text
npm run build:web
npm run test --workspace=apps/web
npm run lint
npm run check:architecture
npm test
```

A headless Chromium screenshot attempt for the HTML prototype did not complete in the available container environment and was terminated by timeout. Browser rendering of the responsive HTML therefore remains a required review step. The SVG review sheet was rendered and inspected successfully, but it is not a substitute for interactive browser review.

## Warnings, residual risks, and open decisions

- The example values and names are illustrative, not user data.
- The home proof has not been reviewed in a real browser at the target responsive widths.
- The desktop rail framing is directional; exact rail grouping, collapse behavior, and production component boundaries remain a later shell checkpoint.
- Exact mobile navigation remains open under D-304.
- The seven-day sync recommendation threshold is provisional.
- Rating delta calculation needs an explicit implementation rule using existing rating history/stats.
- The Recent signals block may be omitted from the first implementation if it adds request or visual complexity without enough value.
- Multiple existing requests are acceptable for the proof, but implementation should measure loading behavior before deciding whether a dedicated home aggregation endpoint is justified.
- Authentication browser/Clerk validation remains open under D-306 and is not resolved by this slice.
- PR #77 from `visual_transformation` to `main` remains outside scope and must not be merged as part of this checkpoint.

## Review and reproduction instructions

Review in this order:

1. `transformation/reports/PHASE_0C_HOME_DISCOVERY.md`;
2. `transformation/prototypes/phase-0c-home/review-sheet.svg`;
3. the responsive HTML prototype;
4. `transformation/DECISIONS.md` and `transformation/STATUS.md`.

From the repository root:

```bash
python3 -m http.server 4173 --directory transformation/prototypes/phase-0c-home
```

Open `http://localhost:4173/` and review at 1440px, 1024px, 768px, and 390px. Focus on:

- whether Continue is clearly dominant;
- whether recommendation reasons are understandable;
- whether progress remains secondary;
- whether the desktop composition is dense but calm;
- whether mobile preserves the action hierarchy;
- whether Recent signals earns its space;
- whether the proposed data/rule set is acceptable without a new backend API.

## Next gate

Approve, revise, or reject the Phase 0C home hierarchy, deterministic rules, and visual composition.

Do not implement `/home`, change post-login navigation, or begin the navigation-rail production slice until that decision is explicit. If approved, the next implementation should be a narrow Angular `/home` slice using existing data-access services or feature-local home adapters, with any new backend aggregation justified only by measured request/UX constraints.
