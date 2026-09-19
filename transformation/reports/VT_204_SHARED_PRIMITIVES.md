# VT-204 Proven Shared UI Primitives

Date: 2026-07-29

Issue: #130

Branch: `visual-transformation/vt-204-shared-primitives`

Target: `main`

Pull request: draft PR #188

Disposition: implementation and implementation-head automated validation complete; direct browser regression review pending

## Objective

Compare the completed Games, Study, and Opening Analysis workflows and promote only repeated, stable, feature-agnostic presentation contracts into the existing `shared/ui` architecture.

VT-204 does not redesign the representative workflows. It reduces proven duplication while preserving every route, store, API, command, selection model, board/engine workflow, training workflow, imported-game workflow, and feature-owned responsive composition.

## Comparison method

The comparison inspected each candidate in both its implementation and its owning report:

- Games supplied dense filtering, responsive evidence cards, result-panel states, and compact analytical facts.
- Study supplied numbered workflow headers, derived selection context, analytical line facts, training-plan composition, and the mobile launcher.
- Opening Analysis supplied shared workbench slots, derived position context, evidence-stack hierarchy, header-owned toggles, and a feature-scoped legacy-role bridge.

A candidate graduated only when at least two implemented consumers had the same presentational responsibility and could use a typed contract without feature names, feature imports, workflow commands, HTTP, router ownership, or store ownership.

## Extracted primitives

### `app-context-strip`

Path: `apps/web/src/app/shared/ui/context-strip/`

Consumers:

- Study selection context;
- Opening Analysis position context.

Contract:

```ts
interface UiContextItem {
  id: string;
  label: string;
  value: string | number;
  marker?: string;
  mono?: boolean;
}
```

The component renders a semantic `dl` and supports two presentation variants:

- `cards` for separated selection steps;
- `segments` for a continuous analytical summary.

Features compute the items from their existing signals. The component does not know what a repertoire, section, chess line, perspective, filter, or analytical tool is.

### `app-fact-grid`

Path: `apps/web/src/app/shared/ui/fact-grid/`

Consumers:

- Games responsive-card evidence;
- Study line-health evidence.

Contract:

```ts
interface UiFactItem {
  id: string;
  label: string;
  value: string | number;
  mono?: boolean;
}
```

The component renders semantic `dl`/`dt`/`dd` facts and accepts presentation-only column counts plus an optional highlighted surface. Features retain every formatter and domain rule.

## Migrated consumers

### Study page

`LibraryBrowserPageComponent` now computes typed context items from the existing selected-course, selected-chapter, and selected-lines labels. The previous local markup and duplicated card/marker CSS were removed.

No catalog loading, selection, filtering, training scope, eligibility, mobile-launcher, or navigation behavior changed.

### Opening Analysis page

`OpeningAnalysisPageComponent` now computes typed context items from the existing line, perspective, game-filter summary, and visible-tool signals. The previous segmented markup and duplicated responsive CSS were removed.

No route, position, filter, workbench, board, engine, widget, stale-response, or navigation behavior changed. The feature-scoped compatibility bridge remains feature-owned.

### Study line list

`StudyLineListComponent` maps existing line-health data into typed fact items. The shared grid replaces only the local label/value layout.

Line selection, marathon checkbox selection, status derivation, Train/Edit destinations, and emitted intents are unchanged.

### Games responsive cards

`GamesTableComponent` maps existing display helpers and job status into typed fact items. The shared grid replaces only the responsive card's local fact markup.

The semantic desktop table, responsive card hierarchy, actions, durable job state, pagination, and review navigation remain feature-owned and unchanged.

## Explicitly not extracted

The following candidates remain feature-local:

1. **Games filter presentation mode** — shared behavior has many consumers, but the `explorer` visual contract remains specific to the Games workflow.
2. **Games responsive evidence card** — facts are reusable; the player/opening/result/action hierarchy is not.
3. **Result loading/error/empty/pagination composition** — current state hierarchies are not yet sufficiently compatible across features.
4. **Study numbered section headers** — they express a linear training workflow and do not match Opening Analysis or Games hierarchy.
5. **Study training-plan and scope-versus-mode controls** — they encode training-specific eligibility and command semantics.
6. **Study mobile launcher** — it remains a feature-owned continuation workflow and is evidence for VT-205 rather than a generic overlay.
7. **Opening Analysis workbench slots and evidence stacks** — `AnalysisWorkbenchComponent` is already the correct shared board shell; feature evidence ordering remains domain-specific.
8. **Header-owned analytical toggles** — `app-page-header` and shell actions already provide the generic toggle contract; visibility state remains in the feature store.
9. **Opening Analysis legacy-role bridge** — it is a temporary feature-scoped migration boundary, not a reusable primitive.
10. **Training basket facts** — its asymmetric primary fact and responsive 2-to-5-column layout do not match the simple shared fact-grid contract.

## Architecture boundary

Both new shared components:

- are standalone and OnPush;
- use signal inputs and built-in control flow;
- consume production `--ui-*` roles;
- contain no feature imports;
- contain no router, HTTP, store, state transition, or output command;
- use typed feature-agnostic item models;
- preserve semantic label/value markup;
- own presentation and responsive layout only.

The owning feature remains responsible for source state, derived meaning, formatting, status, selection, commands, navigation, and accessibility labels describing the domain context.

## Duplication reduction

Removed feature-local duplication includes:

- Study's three selection-context cards and marker/value styling;
- Opening Analysis's four segmented context cells and 980px/640px border logic;
- Study line-health fact markup and tile styling;
- Games mobile-card fact markup and tile styling.

No shared page, panel, action, route, state, or data-access implementation was replaced because the existing `app-page-header`, `app-panel`, and shell-action contracts already cover those responsibilities.

## Focused tests

Added:

- `context-strip.component.spec.ts` for semantic labels/values, optional marker, mono presentation, ARIA label, and presentation switching;
- `fact-grid.component.spec.ts` for semantic labels/values, presentation column inputs, mono values, ARIA label, and highlighted state.

Updated:

- Study line-list coverage now inspects the shared semantic fact elements.

Existing Games and Opening Analysis tests continue to verify retained evidence, commands, toggle order, and derived context.

## Automated validation

Implementation-head CI #1425 passed the complete repository workflow:

- dependency installation;
- lint;
- full repository build and Angular template/type compilation;
- opening classification audit;
- architecture guardrails;
- database migrations;
- imported-game opening classification audit;
- complete repository test suite, including the new shared-component and affected consumer tests.

The exact documentation head must pass the same complete workflow before review readiness is represented.

## Browser regression review required

Review the shared primitives in their real consumers:

### Games

- desktop table remains unchanged;
- responsive cards retain Control, Accuracy, Analysis, and Index facts;
- two-column tablet cards and one-column compact cards;
- long control/status values and active job states;
- keyboard focus and reduced motion.

### Study

- selection context retains repertoire, section, and selected-lines values;
- long labels truncate on desktop and remain readable at compact widths;
- line facts retain Coverage, Mastery, Weak, and Untrained values;
- selected-line highlighting and two-column compact fact layout;
- checkbox, line selection, Train, and Edit intents remain independent.

### Opening Analysis

- segmented line, perspective, evidence, and tool context;
- 980px two-column and 640px single-column stacking;
- long line/filter values wrap correctly on compact widths;
- White/Black perspective and widget-toggle updates remain reactive;
- workbench/board/engine composition remains unchanged.

Unavailable states must be recorded explicitly rather than represented as observed passes.

## Files inspected

- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-patterns.md`
- `docs/frontend/angular-migration.md`
- `docs/frontend/design-tokens.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/reports/VT_201_GAMES_MODERNIZATION.md`
- `transformation/reports/VT_202_STUDY_MODERNIZATION.md`
- `transformation/reports/VT_203_OPENING_ANALYSIS_MODERNIZATION.md`
- `apps/web/src/design-system.css`
- `apps/web/src/app/shared/ui/page-header/page-header.component.ts`
- `apps/web/src/app/shared/ui/panel/panel.component.ts`
- `apps/web/src/app/shared/ui/panel/panel.component.html`
- `apps/web/src/app/shared/ui/panel/panel.component.css`
- `apps/web/src/app/shared/ui/shell-actions/shell-actions.component.ts`
- `apps/web/src/app/shared/ui/ui-shell.model.ts`
- `apps/web/src/app/shared/analysis/workbench/analysis-workbench.component.spec.ts`
- `apps/web/src/app/features/games/pages/games-explorer-page.component.html`
- `apps/web/src/app/features/games/pages/games-explorer-page.component.scss`
- `apps/web/src/app/features/games/components/games-table.component.ts`
- `apps/web/src/app/features/games/components/games-table.component.html`
- `apps/web/src/app/features/games/components/games-table.component.css`
- `apps/web/src/app/features/games/components/games-table.component.spec.ts`
- `apps/web/src/app/features/library/pages/library-browser-page.component.ts`
- `apps/web/src/app/features/library/pages/library-browser-page.component.html`
- `apps/web/src/app/features/library/pages/library-browser-page.component.css`
- `apps/web/src/app/features/library/components/study-line-list/study-line-list.component.ts`
- `apps/web/src/app/features/library/components/study-line-list/study-line-list.component.html`
- `apps/web/src/app/features/library/components/study-line-list/study-line-list.component.css`
- `apps/web/src/app/features/library/components/study-line-list/study-line-list.component.spec.ts`
- `apps/web/src/app/features/library/components/training-basket-panel/training-basket-panel.component.ts`
- `apps/web/src/app/features/library/components/training-basket-panel/training-basket-panel.component.html`
- `apps/web/src/app/features/library/components/training-basket-panel/training-basket-panel.component.css`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.ts`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.html`
- `apps/web/src/app/features/opening-analysis/pages/opening-analysis-page.component.css`
