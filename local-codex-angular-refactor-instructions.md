# Local Codex Instructions: Angular Frontend Refactor

Use this document as the working brief for a local Codex session running inside an already prepared checkout of `vokerg/chess_repertoir_trainer`. Do not handle remote publishing. Focus on making the frontend code changes, validating them locally, and reporting exactly what changed.

## Mission

Perform a practical Angular/frontend refactor of the `apps/web` application. The goal is not a cosmetic cleanup; it is to improve maintainability, state handling, component boundaries, styling organization, and future agent guidance while preserving existing behavior.

The highest-priority functional improvement is the Games explorer flow: analyzing or indexing one imported game should not clear and reload the entire game list when a row-level update is enough.

## Primary Areas to Inspect

Start with these files and nearby feature folders:

- `apps/web/src/main.ts`
- `apps/web/src/app/app.component.ts`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/features/games/pages/games-explorer-page.component.*`
- `apps/web/src/app/features/games/components/games-table.component.ts`
- `apps/web/src/app/features/games/state/games-explorer.store.ts`
- `apps/web/src/app/features/games/data-access/games-api.service.ts`
- `apps/web/src/app/features/games/data-access/imported-game-analysis.service.ts`
- `apps/web/src/app/shared/game-filters/`
- `apps/web/src/styles.css`
- `apps/web/src/workbench.css`
- `agents/skills/`
- `docs/skills/`

Also scan the other frontend feature folders: accounts, courses, library, opening-analysis, lab, and stats.

## Angular Architecture Direction

Keep the application aligned with modern Angular practices:

- Prefer standalone components and route-level lazy loading.
- Prefer `ChangeDetectionStrategy.OnPush` for pages and presentational components.
- Use signals for local/page state and computed signals for derived view state.
- Use immutable signal updates; do not mutate nested objects stored in signals.
- Use `inject()` consistently where the codebase already does.
- Keep data-access services responsible for HTTP only.
- Keep side effects in page stores/facades, not low-level presentational components.
- Avoid introducing a heavy global state library unless there is a strong, proven need.
- Avoid NgModule-first patterns for new code.

## Component Splitting Goals

Reduce oversized page components. Prefer this separation:

- Page/container component: route-level composition and initialization only.
- Feature store/facade: state, async commands, row patching, errors, loading flags.
- Data-access service: API calls and request/response typing only.
- Presentational components: table, row, toolbar, pagination, badges, empty states.
- Pure helpers: formatting, filter normalization, status label mapping.

For the Games feature, create only components that reduce real complexity. Good candidates if the current implementation justifies them:

- `games-table-row.component.ts`
- `games-analysis-status-badge.component.ts`
- `games-ply-index-status-badge.component.ts`
- `games-empty-state.component.ts`
- `games-toolbar.component.ts`
- `games-pagination.component.ts`
- `games-bulk-actions.component.ts`

Do not create tiny files for the sake of architecture. Split where the template or logic becomes easier to understand and test.

## Games Explorer State Refactor

Refactor `GamesExplorerStore` so row-level actions do not default to a full list refresh.

Look for these patterns and replace them where safe:

- Analysis action completes, then calls full refresh.
- Ply indexing action completes, then calls full refresh.
- Bulk indexing mutates `game.plyIndex` directly.
- Filters and pagination are reset after a single row action.

Desired behavior:

- Keep `games` as the source signal for visible rows.
- Add immutable row patch helpers.
- Patch one game by id after analysis or indexing.
- Preserve filters and pagination after row-level actions.
- Keep full refresh for initial load, filter reset, explicit manual reload, or unavoidable API limitations.
- If the analysis API response does not contain enough list-row data, apply a safe partial patch and leave a targeted follow-up note.

Suggested helper shape:

```ts
private patchGameById(
  gameId: number,
  updater: (game: ImportedGameListItem) => ImportedGameListItem,
): void {
  this.games.update((games) =>
    games.map((game) => (game.id === gameId ? updater(game) : game)),
  );
}
```

Use dedicated helpers where useful:

- `markGameAnalysisRunning`
- `markGameAnalysisCompleted`
- `markGameAnalysisFailed`
- `markGamePlyIndexed`
- `markGamePlyIndexFailed`

Avoid this pattern:

```ts
game.plyIndex.status = 'INDEXED';
```

Prefer this pattern:

```ts
this.patchGameById(game.id, (current) => ({
  ...current,
  plyIndex: {
    ...current.plyIndex,
    status: 'INDEXED',
    indexedAt: result.plyIndexedAt ?? current.plyIndex?.indexedAt ?? null,
    error: null,
  },
}));
```

Adjust the exact shape after checking the actual DTO types.

## Signals and Async Flow

Use signals deliberately, not mechanically.

Good signal usage:

- list state
- loading flags
- row action flags such as currently analyzing/indexing id
- filters
- derived counts and labels
- table subtitle and button labels

Avoid:

- redundant state that can be computed
- direct nested mutation inside signal values
- unnecessary full signal replacement when a row patch is enough
- manual subscriptions without lifecycle cleanup
- using `effect()` for ordinary command handling

Where observables remain, use clean lifecycle-safe patterns. Where `async/await` reads better, `firstValueFrom` is acceptable for command-style actions.

## Routing

Inspect `app.routes.ts`.

If feature pages are eagerly imported into the root route file, convert appropriate routes to standalone lazy loading with `loadComponent`. Keep route behavior unchanged.

Target routes include:

- `/library`
- `/accounts`
- `/games`
- `/opening-analysis`
- `/lab`
- `/stats`
- `/courses`

Add route titles if the project already uses or benefits from them. Do not break deep links.

## Styles

Move non-trivial inline styles into component style files. Keep global CSS limited to:

- design tokens and CSS variables
- resets
- layout primitives
- truly reusable utility classes

Keep feature-specific styles colocated with feature components.

Concrete first target:

- If `AppComponent` contains a large inline style block, extract it into `app.component.css` and use `styleUrl`.
- If its template is large enough to hurt readability, extract it into `app.component.html`.

For feature pages, prefer the pattern:

- `*.component.ts`
- `*.component.html`
- `*.component.scss` or `*.component.css`

Avoid moving page-specific selectors into global styles.

## Games Table and Rendering Performance

Ensure table/list rendering is stable:

- Track rows by game id.
- Avoid expensive formatting calls directly in templates.
- Move repeated status markup into badge components if useful.
- Keep row actions as typed outputs from presentational components.
- Avoid passing newly created arrays/objects from templates.
- Make single-row analysis/indexing patch only the affected row.

## Filters

Inspect shared game filters.

Improve where needed:

- typed filter model
- single default-filter factory
- immutable filter updates
- no filter reset after row-level actions
- debounced text filters if currently noisy
- clear separation between local text input state and applied API query state if useful

## Data Access

Keep API services focused:

- no UI state in HTTP services
- typed DTOs
- clean query-param construction
- no duplicated API base URL logic
- no complex API request construction in components

Do not make backend changes for frontend-only refactoring unless the frontend cannot reasonably implement the behavior without a small API contract improvement.

## Tests

Add or improve tests where feasible.

High-value tests:

- Games store initial load.
- Load more appends rows without losing existing rows.
- Ply indexing patches one row without clearing the list.
- Analysis action does not reset the game list.
- Indexing failure records an error without mutating nested state.
- Formatting/filter helper tests if helpers are extracted.

Avoid brittle template snapshots.

## AI Agent Skills and Docs Cleanup

Review `agents/skills` and `docs/skills`.

Keep or rewrite project-specific guidance. Remove, shrink, or replace generic reference dumps that duplicate public Angular docs or promote obsolete patterns.

Question these if present:

- generic Angular CLI reference material
- generic Angular animations references if the app does not use animations meaningfully
- generic e2e testing docs if no maintained e2e setup exists
- generic MCP material if it is not part of the project workflow
- NgModule-first frontend guidance
- stale guidance that encourages large page components or global UI services

Replace with concise project-specific guidance covering:

- standalone Angular
- route-level lazy loading
- feature folder boundaries
- signal-based page stores
- immutable row patching
- OnPush
- external templates/styles for non-trivial components
- data-access/state/components/pages separation
- avoiding full game-list reload after single-row actions
- testing expectations

Keep domain-specific contracts about imported games, analysis runs, ply indexing, API behavior, and repertoire concepts if they are accurate.

Add or update a frontend architecture guide if useful, for example:

- `docs/frontend/angular-refactor-guide.md`
- or another path consistent with the existing docs layout

## Acceptance Criteria

The refactor is successful when:

- The Angular app still builds.
- Existing behavior is preserved.
- Games explorer row-level analysis/indexing no longer clears the whole list unless unavoidable.
- Signal state updates are immutable.
- Direct nested mutation in Games store is removed.
- Oversized templates/components are smaller or have a documented next-step split.
- Presentational components are not responsible for HTTP side effects.
- Styles are better colocated and large inline styles are removed where practical.
- Routes are lazy-loaded where appropriate.
- Tests are added or updated for the highest-risk state changes where feasible.
- Agent skill docs are shorter, more project-specific, and aligned with modern Angular.

## Final Local Codex Report

After making changes, report:

- files changed
- main architecture changes
- Games explorer state changes
- styling changes
- routing changes
- tests added or updated
- AI skill/docs changes
- verification commands run and results
- any known limitations or follow-up work

Do not spend effort on repository publishing or remote workflow. Focus on local code quality, verification, and a clear implementation report.
