# VT-201 Games Modernization

Date: 2026-07-29

Issue: #127

Branch: `visual-transformation/vt-201-games-modernization`

Target: `main`

Pull request: draft PR #167

Disposition: implementation in progress; automated and browser validation pending

## Objective

Modernize Games as the representative data-exploration workflow for the production visual system without changing route contracts, filter semantics, cursor pagination, durable job ownership, HTTP ownership, or game-review entry points.

## Verified architecture boundary

The existing feature already follows the intended Angular split:

- `GamesExplorerPageComponent` is the lazy route composition layer and synchronizes canonical URL query state;
- `GamesExplorerStore` owns applied versus draft criteria, loading/error state, cursor pagination, derived counts, job commands, and terminal-job refresh;
- `GamesApiService` owns typed imported-game HTTP calls only;
- `ImportedGameJobStore` remains the application-wide durable job owner;
- `GamesTableComponent`, `GameActionMenuComponent`, and `GameFilterPanelComponent` remain presentational/event-emitting UI.

VT-201 preserves this boundary. It does not introduce a second store, new HTTP path, optimistic job state, duplicate filter model, or new selection model.

## Implemented presentation

### Route composition

The Games page now introduces the filter area as an evidence-set decision rather than an undifferentiated card stack:

- the page header describes exploration, review, and durable processing;
- a restrained page-local heading explains the common-versus-advanced filter hierarchy;
- the shared page header, filter component, and games panel remain the composition primitives;
- URL-only criteria remain visible in an information-status summary.

### Scoped filter migration

`GameFilterPanelComponent` is shared by Games, analysis, opening, course-review, and Labs surfaces. A global restyle would therefore exceed VT-201 scope.

The component now accepts:

```ts
presentation: 'default' | 'explorer'
```

The default is unchanged. Only `/games` opts into `explorer`, which applies production `--ui-*` roles for:

- quiet filter-group surface;
- compact labels and controls;
- tag overlay and focus treatment;
- advanced-filter separator;
- apply/reset action region;
- compact responsive behavior.

Filter values, emissions, period/date synchronization, tag behavior, locked color behavior, and action semantics are unchanged.

### Dense desktop exploration

The desktop result view remains a semantic table and retains:

- provider and date;
- result and user color;
- players and external profile links;
- speed and time control;
- ECO and opening name;
- user/white/black accuracy;
- analysis and ply-index state;
- review link and row action menu.

Presentation now uses production surfaces, restrained row emphasis, semantic status colors, monospaced analytical percentages, compact metadata, and reduced card-like elevation.

### Responsive evidence cards

The previous narrow representation exposed only result/provider, players, date, and actions. That made the mobile route materially less useful than desktop.

Below the shared 980px single-column threshold, VT-201 uses feature-local evidence cards that retain:

- result and provider;
- players and date;
- ECO and opening name;
- speed and time control;
- user accuracy;
- analysis status;
- ply-index status;
- review navigation and row actions.

Cards use two columns at tablet widths and one column at the shared 640px compact threshold. This is a presentational transformation only; both desktop and responsive views consume the same game DTOs and emit the same intents.

### Loading, error, empty, and pagination states

The panel now provides explicit visual hierarchy for:

- initial loading skeleton and live text;
- error alert with retained API message;
- actionable empty-filter guidance;
- loaded count plus cursor-pagination action.

The existing cursor behavior and `hasMore` semantics are unchanged. An existing malformed replacement character in the table subtitle was corrected to ` · more available`.

### Row action overlay

The existing menu actions are unchanged. Its presentation now uses production overlay, border, focus, and interaction roles rather than amber-era cream surfaces.

## Behavior preserved

- `/games` remains lazy-loaded and guarded.
- Query parsing and canonical URL serialization are unchanged.
- Applied and draft criteria remain separate.
- Reapplying a matching canonical URL still refreshes once.
- Reset still navigates to plain `/games`.
- Period selection still updates date fields; manual date edits still resolve to custom.
- Account, provider, result, color, control, rated, analysis, tags, and advanced filters retain their models.
- Facet loading remains owned by `GamesApiService` through `GamesExplorerStore`.
- Search requests still ignore stale responses through request ids.
- Cursor pagination still appends results using the applied query.
- Bulk index, analysis, and tag actions still submit through `ImportedGameJobStore`.
- Individual analyze, force-reanalyze, and ply-index actions retain eligibility checks.
- Terminal/settled jobs still refresh only when they affect visible games.
- Game review and provider/profile links retain their destinations.

## Focused tests

Added `games-table.component.spec.ts` to verify that the responsive card representation retains:

- players;
- ECO/opening;
- speed/time control;
- user accuracy;
- analysis state;
- ply-index state;
- loaded-result pagination context.

Existing page/store tests continue to own route synchronization, canonical apply behavior, reset, job-settle refresh, bulk eligibility, durable command submission, rejected-game handling, URL-only criteria, and cursor append behavior.

## Candidate patterns for VT-204

These remain feature-local until Study and Opening Analysis provide comparison evidence:

1. **Dense filter presentation mode** — an explicit presentation input can migrate a shared behavioral component without changing all consumers. Do not extract a generic filter-shell abstraction yet.
2. **Responsive evidence card** — a data table can switch to a feature-specific semantic card while preserving the same DTO and intent outputs. The exact facts and hierarchy remain Games-specific.
3. **Result panel state hierarchy** — loading/error/empty/populated/pagination states may become a proven panel-body pattern after representative workflows are compared.
4. **Analytical fact grid** — compact `dt`/`dd` facts may be reusable, but extraction is premature until Study and Opening Analysis demonstrate compatible semantics.

## Explicit exclusions

- no imported-game API or schema change;
- no search/filter contract change;
- no new pagination model;
- no new selection behavior;
- no job scheduling or processing change;
- no game-analysis algorithm change;
- no Game Detail redesign;
- no Study or Opening Analysis change;
- no global shared primitive extraction;
- no dependency addition.

## Browser review required

Review `/games` with realistic data at desktop, tablet, and narrow-phone widths:

- common and advanced filters, including tags and custom dates;
- apply/reset and URL persistence;
- table readability with long player/opening names;
- tablet two-column evidence cards and compact one-column cards;
- opening/control/accuracy/status visibility on responsive cards;
- row action menu placement and focus;
- loading, error, and empty-filter states where reproducible;
- cursor load-more behavior;
- active job states and imported-game job-panel overlap;
- keyboard focus and reduced motion.

Do not approve based only on static code or automated tests. Record any unavailable state explicitly rather than representing it as observed.

## Files inspected

- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-patterns.md`
- `docs/frontend/design-tokens.md`
- `transformation/MASTER_PLAN.md`
- `apps/web/src/design-system.css`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/shared/ui/responsive/breakpoints.ts`
- `apps/web/src/app/shared/ui/page-header/page-header.component.ts`
- `apps/web/src/app/shared/ui/panel/panel.component.ts`
- `apps/web/src/app/shared/ui/panel/panel.component.html`
- `apps/web/src/app/shared/ui/panel/panel.component.css`
- `apps/web/src/app/shared/games/filters/game-filter-panel.component.ts`
- `apps/web/src/app/shared/games/filters/game-filter-panel.component.html`
- `apps/web/src/app/shared/games/filters/game-filter-panel.component.css`
- `apps/web/src/app/features/games/pages/games-explorer-page.component.ts`
- `apps/web/src/app/features/games/pages/games-explorer-page.component.html`
- `apps/web/src/app/features/games/pages/games-explorer-page.component.scss`
- `apps/web/src/app/features/games/pages/games-explorer-page.component.spec.ts`
- `apps/web/src/app/features/games/state/games-explorer.store.ts`
- `apps/web/src/app/features/games/state/games-explorer.store.spec.ts`
- `apps/web/src/app/features/games/data-access/games-api.service.ts`
- `apps/web/src/app/features/games/components/games-table.component.ts`
- `apps/web/src/app/features/games/components/games-table.component.html`
- `apps/web/src/app/features/games/components/games-table.component.css`
- `apps/web/src/app/features/games/components/game-action-menu.component.ts`
- `apps/web/src/app/features/games/components/game-action-menu.component.html`
- `apps/web/src/app/features/games/components/game-action-menu.component.css`
- `apps/web/src/app/features/games/helpers/games-table-display.ts`
