# VT-203 Opening Analysis Modernization

Date: 2026-07-29

Issue: #129

Branch: `visual-transformation/vt-203-opening-analysis-modernization`

Target: `main`

Pull request: draft PR #183

Disposition: implementation, focused coverage, and implementation-head automated validation complete; direct browser review pending

## Objective

Modernize Opening Analysis as the representative board/workbench workflow without changing route contracts, imported-game filters, position navigation, board orientation, engine behavior, explorer behavior, API ownership, or store ownership.

## Verified architecture boundary

The current feature uses the intended Angular ownership layers:

- `OpeningAnalysisPageComponent` is the guarded lazy `/opening-analysis` route composition layer;
- `OpeningAnalysisStore` owns current position state, played-move history, perspective derived from filters, widget visibility, async loading/error state, stale-request protection, engine lifecycle, filter transitions, and all position navigation;
- `PositionGameMovesApiService` owns typed `/opening-analysis`, performance, top-games, breakdown, and imported-game facet HTTP calls;
- `AnalysisWorkbenchComponent` owns the shared board/workbench composition and content slots;
- `AnalysisBoardComponent` owns shared board, evaluation bar, toolbar, engine arrow, and Stockfish-panel composition;
- course, masters, peer, performance, next-move, opening-breakdown, and top-game components remain presentational and event-emitting.

VT-203 preserves those boundaries. It adds no second store, no alternate board implementation, no new workbench, no router owner, and no HTTP path.

## Architectural correction

Before VT-203, Opening Analysis imported `AnalysisBoardComponent` directly and recreated a feature-local two-column board/side grid. Free Analysis and other board workflows already composed through `AnalysisWorkbenchComponent`.

VT-203 removes that duplicate page-level layout and composes Opening Analysis through the shared workbench:

- the shared workbench renders the board panel and responsive two-column/single-column layout;
- Opening Analysis projects its current-line, course, and performance evidence into `analysisWorkbenchLeftExtra`;
- next moves and filters occupy `analysisWorkbenchSideBeforeTree`;
- masters, peer games, opening breakdown, and recent games occupy `analysisWorkbenchSideExtra`;
- the move tree remains disabled because Opening Analysis has position history rather than a variation-tree model.

This keeps board, engine, toolbar, and workbench responsive behavior on one shared implementation.

## Implemented presentation

### Position context

A compact context strip now exposes derived state above the workbench:

- current line;
- white or black perspective;
- active imported-game filter summary;
- visible analytical-tool count.

All values are computed from existing store signals. No duplicate context state is stored.

### Board and engine

The shared `AnalysisWorkbenchComponent` now provides the page composition. Existing `AnalysisBoardComponent` behavior remains unchanged:

- current FEN and side;
- black perspective;
- last move;
- board position version;
- interactive board moves;
- engine evaluation, arrow, and Stockfish panel;
- start/previous navigation;
- Left-arrow and Home keyboard shortcuts.

Opening Analysis still hides next/end navigation, does not expose board flip, and uses the filter-derived perspective.

### Game evidence

The next-move panel remains the primary side evidence. It retains:

- collapsed filter entry;
- complete `GameFilters` and facets;
- apply, reset, and refresh commands;
- loading, error, placeholder, empty, and progressive-list behavior;
- exact-position next-move selection;
- WDL and score evidence.

The panel uses its existing compact presentation with six initially visible moves to better fit the dense workbench.

### Optional tools

Header toggles remain in the existing order and keep their store-owned visibility state:

1. Tags;
2. Masters;
3. Peers;
4. Last games;
5. Engine;
6. Lichess bot challenge.

Tags render position performance below the board. Masters and Peers render in the side evidence stack. Last games render in the existing shared `app-panel`. Engine remains inside the shared board composition.

### Production-token boundary

The Opening Analysis page uses production `--ui-*` roles directly for its context strip and feature-local surfaces.

Several existing shared analytical widgets still consume the repository's explicit compatibility variable names internally. VT-203 does not globally redefine those names or alter unrelated consumers. Instead, the Opening Analysis page provides a feature-scoped compatibility bridge that maps the existing widget roles to production surface, text, border, action, radius, shadow, and semantic values only within this route.

This makes the rendered Opening Analysis workflow use production roles while preserving shared-component APIs and avoiding a repository-wide token migration. VT-204 can compare whether those shared analytical widgets should adopt production roles globally after Games, Study, and Opening Analysis evidence is available.

## Behavior preserved

- guarded lazy `/opening-analysis` route and title;
- initial facet and position-analysis loading;
- default filters and filter summary behavior;
- user-colour-derived board perspective;
- reset-on-perspective-change behavior;
- selected opening and tag filters;
- stale request rejection for analysis, performance, top games, and breakdowns;
- position history, FEN, SAN/uci line label, last move, and board version;
- board move, next-move, course suggestion, masters, and peer move commands;
- previous/start navigation and keyboard shortcuts;
- engine start, stop, visibility, evaluation, and best-move arrow behavior;
- tags, masters, peers, last-games, and engine visibility defaults;
- lazy top-game/performance loading rules;
- free-analysis deep link for the current line;
- Lichess bot challenge command;
- `OpeningAnalysisStore` workflow ownership;
- `PositionGameMovesApiService` HTTP ownership.

## Focused tests

The existing header-action-order coverage remains.

VT-203 adds coverage that verifies:

- perspective text is derived from `blackPerspective`;
- visible-tool count is derived from existing widget signals;
- filter context is derived from the existing `GameFilters` signal;
- changing those source signals updates the context without a duplicate state model.

CI exposed two focused-test issues only:

- a read-only computed store signal was mutated through its public type instead of through the writable test stub;
- the expected filter summary did not reflect the existing `blitz,rapid` Opening Analysis default.

Both corrections were confined to the focused spec. No production code changed.

Angular template/type compilation remains the primary check that the real Opening Analysis template satisfies every shared workbench and widget input/output contract.

## Candidate patterns for VT-204

These remain candidates rather than newly extracted primitives:

1. **Shared workbench slot composition** — a board/engine shell with feature-owned evidence projected into established left and side slots.
2. **Position-context strip** — a compact derived summary for line, perspective, evidence filters, and visible tools.
3. **Primary versus secondary evidence stacks** — next moves remain dominant while optional external/internal evidence follows the same workbench column.
4. **Feature-scoped legacy-role bridge** — a temporary migration boundary for existing shared widgets when global conversion would affect unreviewed consumers.
5. **Header-owned analytical toggles** — visibility remains page/store state while widgets retain presentational ownership.

VT-204 should compare these against the Games and Study candidates before promoting anything globally.

## Explicit exclusions

- no backend, API, contract, schema, or database change;
- no engine algorithm, depth, cache, or worker change;
- no imported-game filter model or query change;
- no board library, animation, or dependency change;
- no Games or Study redesign;
- no new shared state or global UI abstraction;
- no final mobile-navigation decision.

## Automated validation

Implementation-head CI #1392 passed:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the Opening Analysis page coverage.

Earlier CI #1389 and #1391 exposed the focused-test typing and expected-default issues documented above. All production gates passed on those heads, and both corrections were test-only.

The exact final documentation head must pass the same repository workflow before review readiness is represented.

## Browser review required

Review `/opening-analysis` with realistic indexed-game data at desktop, tablet, compact, and narrow-phone widths:

- shared board/workbench hierarchy and board width;
- engine shown and hidden, evaluation bar, arrow, and Stockfish panel;
- white and black filter perspectives;
- Left-arrow and Home shortcuts outside form controls;
- next-move selection and resulting FEN/history/context updates;
- collapsed and expanded filters, apply, reset, and refresh;
- Tags, Masters, Peers, Last games, and Engine toggles independently and in dense combinations;
- course move selection, opening breakdown selection, performance tag selection, and external explorer moves;
- long line, opening, player, and filter-summary labels;
- loading, error, empty, placeholder, and long-list states where reproducible;
- 980px workbench stacking and 640px compact context stacking;
- keyboard focus and reduced motion.

Unavailable states must be recorded explicitly rather than represented as observed passes.

## Files inspected

- `TRANSFORMATION.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/design-tokens.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/shared/ui/responsive/breakpoints.ts`
- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.ts`
- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.html`
- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.css`
- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.spec.ts`
- `apps/web/src/app/shared/analysis/board/analysis-board.component.ts`
- `apps/web/src/app/shared/analysis/board/analysis-board.component.html`
- `apps/web/src/app/shared/analysis/board/analysis-board.component.css`
- `apps/web/src/app/features/analysis/pages/free-analysis-page.component.ts`
- `apps/web/src/app/features/analysis/pages/free-analysis-page.component.html`
- `apps/web/src/app/features/analysis/components/free-analysis-workbench.component.ts`
- `apps/web/src/app/features/analysis/components/free-analysis-workbench.component.html`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.ts`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.html`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.css`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.spec.ts`
- `apps/web/src/app/features/opening-analysis/state/opening-analysis.store.ts`
- `apps/web/src/app/shared/games/position-moves/position-game-moves-api.service.ts`
- `apps/web/src/app/shared/games/position-moves/position-game-moves-panel.component.ts`
- `apps/web/src/app/shared/games/position-moves/position-game-moves-panel.component.html`
- `apps/web/src/app/shared/games/position-moves/position-game-moves-panel.component.css`
- `apps/web/src/app/shared/games/position-moves/position-top-games.component.html`
- `apps/web/src/app/shared/games/position-moves/position-top-games.component.css`
- `apps/web/src/app/shared/games/filter-breakdown/game-filter-breakdown-panel.component.css`
- `apps/web/src/app/shared/games/position-performance/position-performance-panel.component.html`
- `apps/web/src/app/shared/games/position-performance/position-performance-panel.component.css`
- `apps/web/src/app/shared/courses/position-suggestions/course-position-suggestions-widget.component.css`
- `apps/web/src/app/shared/masters-explorer/masters-explorer-widget.component.css`
- `apps/web/src/app/shared/lichess-games-explorer/lichess-games-explorer-widget.component.css`
- `apps/web/src/workbench.css`
