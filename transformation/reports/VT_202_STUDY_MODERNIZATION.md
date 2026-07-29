# VT-202 Study Modernization

Date: 2026-07-29

Issue: #128

Branch: `visual-transformation/vt-202-study-modernization`

Target: `main`

Pull request: draft PR #178

Disposition: implementation and focused coverage complete; automated validation and direct browser review pending

## Objective

Modernize Study as the representative training-selection workflow for the production visual system without changing route contracts, catalog loading, selected course/chapter/line state, selected-line basket behavior, marathon destinations, training modes, API ownership, or course ownership rules.

## Verified architecture boundary

The current Study feature already follows the intended Angular split:

- `LibraryBrowserPageComponent` is the lazy `/library` route composition layer;
- `LibraryBrowserStore` owns catalog loading, search/review filters, selected course/chapter/line state, multi-line selection, training scope, eligibility, fallback behavior, and marathon navigation;
- `LibraryApiService` owns typed Study/course/chapter/line HTTP calls only;
- `StudyScopeListComponent`, `StudyLineListComponent`, `TrainingBasketPanelComponent`, and `StudyMobileLauncherComponent` remain presentational and event-emitting;
- `/library/marathon`, course marathon, chapter marathon, and direct line training/edit routes remain the existing workflow destinations.

VT-202 preserves this boundary. It does not introduce a second store, duplicate selection model, new router owner, new HTTP path, or alternate training algorithm.

## Implemented presentation

### Desktop training-selection progression

The existing desktop surface exposed four capable columns but gave each similar visual weight. VT-202 makes the intended workflow explicit:

1. choose a repertoire;
2. narrow to a section;
3. review or select lines;
4. choose the training scope and training mode.

The page header now exposes restrained repertoire, section, and selected-line context. The search workspace includes a compact summary of the current repertoire, section, and multi-line selection without storing any duplicate state.

### Scope lists

Repertoire and section lists now provide:

- numbered workflow headers with short guidance;
- production surface, border, selected, hover, and focus roles;
- explicit loading, error, and empty states;
- `aria-pressed` selected-state semantics;
- long-label wrapping without changing selection events.

The list components still receive typed view items and emit only an item id.

### Line selection and health evidence

The line list retains:

- direct line selection;
- independent marathon-basket checkbox selection;
- status, side-to-train, active subline count, coverage, mastery, weak, and untrained evidence;
- direct Train and Edit destinations.

The previous clickable article has been replaced by a keyboard-focusable selection button inside the row. Checkbox and direct-action intents remain separate. Analytical facts use the production monospaced role and semantic status tokens.

### Training plan

The basket now separates two decisions that were previously visually compressed:

- **Training scope** — repertoire, section, or selected lines;
- **Training mode** — all, weak, or untrained.

The source label, health summary, counts, disabled-state rules, and emitted `{ mode, scope }` command are unchanged. No navigation was moved into the presentational component.

### Mobile launcher

The existing mobile contract is preserved: `/library` shows the repertoire chooser, then selecting a repertoire opens the feature-local training launcher.

The launcher now provides:

- production overlay, surface, border, selected, and focus roles;
- explicit Repertoire, Section, and Line scope controls with `aria-pressed` state;
- clearer choice-list and selected-training hierarchy;
- retained section and line selection outputs;
- retained course, chapter, and single-line start commands;
- retained All, Weak, and Untrained eligibility rules;
- compact one-column training actions at the shared 640px threshold.

## Behavior preserved

- `/library` remains guarded and lazy-loaded.
- `/library/marathon` remains the selected-lines marathon route.
- Initial catalog loading and default course/chapter/line selection are unchanged.
- Stale course/chapter responses remain ignored through selected-id checks.
- Selecting a course clears chapter, line, and selected-line state and restores course scope.
- Selecting a chapter clears line and selected-line state and retains the existing scope fallback.
- Direct line selection and selected-line basket selection remain separate.
- Selecting visible lines still switches to selected-lines scope when any visible line exists.
- Clearing selected lines still falls back from selected-lines scope to course scope.
- Course, chapter, selected-lines, and single-line marathon navigation remain store-owned.
- Review-only filtering and search matching are unchanged.
- Training modes and their weak/untrained eligibility rules are unchanged.
- Direct line Train and Edit routes are unchanged.
- `LibraryApiService` remains the typed HTTP boundary.

## Focused tests

Added focused component coverage for:

- line selection evidence, selected count, status/health facts, direct actions, keyboard selection, and separate checkbox intent;
- basket source/health/count presentation, active scope semantics, mode eligibility, and emitted scope/start commands;
- mobile course-first scope, selected state, mode eligibility, and single-line marathon command shape.

The existing store remains the owner of loading, selection, fallback, and navigation behavior; VT-202 does not duplicate those transitions in component tests.

## Candidate patterns for VT-204

These remain feature-local until Opening Analysis is implemented and all representative workflows can be compared:

1. **Numbered workflow section header** — compact step identity plus title and guidance for a linear selection workflow.
2. **Selection-context strip** — derived current-state summary above a dense multi-pane workspace.
3. **Selectable analytical row** — separate primary selection, multi-select checkbox, facts, and direct actions within one domain row.
4. **Scope-versus-mode launch panel** — explicitly separates what is trained from how candidates are filtered.
5. **Feature-local mobile launcher** — preserves desktop state ownership while giving small screens a focused continuation workflow.

Do not extract these into global shared UI during VT-202.

## Explicit exclusions

- no backend, API, contract, schema, or database change;
- no course ownership change;
- no training algorithm or evaluation change;
- no new training mode;
- no route or deep-link change;
- no Games or Opening Analysis redesign;
- no global shared primitive extraction;
- no dependency addition;
- no final mobile-primary navigation decision.

## Automated validation

CI #1366 is running on the focused-test implementation head. The required workflow includes:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite.

This section must be updated with the final result before review readiness is represented.

## Browser review required

Review `/library` with realistic course data at desktop, tablet, and narrow-phone widths:

- repertoire → section → line → training-plan hierarchy;
- search and review-only filtering;
- select-visible and individual selected-line behavior;
- course, section, and selected-lines scope switching;
- All, Weak, and Untrained eligibility and navigation;
- long repertoire, section, and line labels;
- empty catalog, empty section, empty line, loading, and error states where reproducible;
- basket wrapping at the feature-owned 1100px threshold;
- line facts and direct actions at narrower desktop/tablet widths;
- course-first mobile entry and launcher open/close/focus return;
- Repertoire, Section, and Line launcher scopes;
- single-line marathon launch;
- keyboard focus, Escape/backdrop closure, and reduced motion.

Unavailable states must be recorded explicitly rather than represented as observed passes.

## Files inspected

- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-patterns.md`
- `docs/frontend/angular-migration.md`
- `docs/frontend/design-tokens.md`
- `docs/frontend/responsive-layout.md`
- `docs/skills/frontend-feature-module.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/shared/ui/page-header/page-header.component.ts`
- `apps/web/src/app/shared/ui/panel/panel.component.ts`
- `apps/web/src/app/shared/ui/ui-shell.model.ts`
- `apps/web/src/app/shared/ui/responsive/breakpoints.ts`
- `apps/web/src/app/features/library/library-breakpoints.ts`
- `apps/web/src/app/features/library/pages/library-browser-page.component.ts`
- `apps/web/src/app/features/library/pages/library-browser-page.component.html`
- `apps/web/src/app/features/library/pages/library-browser-page.component.css`
- `apps/web/src/app/features/library/state/library-browser.store.ts`
- `apps/web/src/app/features/library/data-access/library-api.service.ts`
- `apps/web/src/app/features/library/data-access/library.models.ts`
- `apps/web/src/app/features/library/helpers/library-line.helpers.ts`
- `apps/web/src/app/features/library/helpers/training-summary.helpers.ts`
- `apps/web/src/app/features/library/components/study-scope-list/study-scope-list.component.ts`
- `apps/web/src/app/features/library/components/study-scope-list/study-scope-list.component.html`
- `apps/web/src/app/features/library/components/study-scope-list/study-scope-list.component.css`
- `apps/web/src/app/features/library/components/study-line-list/study-line-list.component.ts`
- `apps/web/src/app/features/library/components/study-line-list/study-line-list.component.html`
- `apps/web/src/app/features/library/components/study-line-list/study-line-list.component.css`
- `apps/web/src/app/features/library/components/training-basket-panel/training-basket-panel.component.ts`
- `apps/web/src/app/features/library/components/training-basket-panel/training-basket-panel.component.html`
- `apps/web/src/app/features/library/components/training-basket-panel/training-basket-panel.component.css`
- `apps/web/src/app/features/library/components/study-mobile-launcher/study-mobile-launcher.component.ts`
- `apps/web/src/app/features/library/components/study-mobile-launcher/study-mobile-launcher.component.html`
- `apps/web/src/app/features/library/components/study-mobile-launcher/study-mobile-launcher.component.css`
- `apps/web/src/app/features/library/components/study-mobile-launcher/study-mobile-launcher.models.ts`
