# VT-301 Player Chess Profile Rollout

Date: 2026-07-29

Issue: #132

Batch: 2 — Player Chess Profile

Branch: `visual-transformation/vt-301-player-profile`

Target: `main`

Pull request: draft PR #206

Disposition: behavior-preserving presentation implementation complete; repository CI and direct browser review pending

## Objective

Modernize `/progress/profile` with the validated production visual system without changing Player Chess Profile calculation, route, filter, store, API, evidence-selection, or navigation behavior.

## Verified architecture boundary

The existing implementation already follows the intended Angular ownership model:

- `PlayerChessProfilePageComponent` is a composition-focused, standalone, OnPush route page;
- `PlayerChessProfileStore` owns initialization, filters, loading/error state, recalculation, response-derived views, and evidence selection;
- `PlayerChessProfileApiService` owns typed HTTP access;
- filter, conclusions, breakdown, evidence, and coverage components are presentational signal-input/output components;
- page and child templates use built-in control flow and stable item identities.

VT-301 Batch 2 preserves those boundaries. It introduces no new store, HTTP owner, route state, shared primitive, or feature behavior.

## Implemented presentation

### Page hierarchy and state

- migrated the context summary to a restrained mint-marked production surface;
- migrated partial-analysis warning presentation to production warning roles while retaining its text and `role="status"` semantics;
- retained the existing primary opening-profile/evidence grid and 980px single-column collapse;
- retained shell-owned mobile-navigation clearance.

### Profile filters

- migrated labels, segmented colour controls, secondary pickers, overlays, account checkboxes, rating controls, and custom-date grouping to production surface, border, text, action, focus, radius, and shadow roles;
- kept Period, Speed, Colour, Game status, Accounts, Rating context, custom dates, Clear ratings, and Recalculate profile behavior unchanged;
- retained the existing two-column 980px layout and one-column 640px layout;
- kept account/rating overlays as desktop overlays and inline mobile details content;
- added explicit three-pixel keyboard focus treatments for feature-local interactive controls.

### Evidence-backed findings

- migrated conclusion cards to production panel roles;
- retained positive and negative semantic treatment through `--ui-success-*` and `--ui-danger-*` roles rather than mint;
- strengthened selected-card treatment without relying on colour alone; the existing button label and `aria-pressed` state remain authoritative;
- preserved conclusion ordering and evidence-selection behavior.

### Opening profile breakdown

- migrated preference/performance tabs, dimension control, analytical rows, tracks, deltas, and secondary metrics to production roles;
- applied the mono stack and tabular numerics only to analytical deltas and compact metrics;
- preserved preference exposure, performance delta, dimension switching, evidence inspection, and existing chart-width calculations;
- retained 640px stacked controls and row actions.

### Evidence and coverage

- migrated evidence badge, metric cards, opening/game lists, source links, coverage summary cards, coverage tracks, and quality notes to production roles;
- applied mono/tabular numerics to analytical metric values, game counts, and percentages;
- preserved internal game routes, external source links, empty evidence states, source-link security attributes, coverage notes, and responsive 760px/640px collapse points.

## Behavior preserved

- guarded lazy `/progress/profile` route;
- page initialization and store ownership;
- account loading and error presentation;
- all profile filter defaults and mutations;
- explicit recalculation command;
- no-data, unavailable, loading, error, partial-analysis, and populated states;
- conclusion and breakdown evidence selection;
- preference/performance view and dimension selection;
- recent-game router navigation and provider source links;
- profile calculation, contracts, APIs, and backend behavior.

## Explicit exclusions

- no profile calculation or recommendation change;
- no contract, API, schema, database, route, query, or store change;
- no new profile action or activation of the planned repertoire-start action;
- no account-dashboard, Settings, onboarding, Builder, course, or shared-workbench change;
- no new dependency or shared UI primitive;
- no merge without explicit approval.

## Automated validation

Direct local application validation is not represented as passed. The earlier container checkout attempt failed because GitHub DNS resolution was unavailable, so this session cannot honestly report local `npm run build:web`, web tests, lint, or architecture checks.

Branch comparison before documentation:

- base: current `main` commit `01b36f9503ccfbb3dced55d56589b89cfd163867`;
- branch: six commits ahead, zero commits behind;
- runtime changes: six Player Chess Profile CSS files only;
- no package, route, TypeScript, template, API, schema, migration, or dependency change.

Required before approval:

- repository CI including Angular template/type compilation, lint, architecture checks, migrations, and tests;
- exact final documentation-head CI;
- direct browser review or explicit recorded deferral.

## Browser review required

Review `/progress/profile` at desktop, tablet, compact, and narrow-phone widths with realistic data:

- initial loading and account-loading states;
- account and profile errors;
- no matching games;
- partial-analysis warning;
- populated conclusion, preference, performance, evidence, and coverage states;
- Period, Speed, Colour, Game status, Accounts, Rating context, custom dates, Clear ratings, and Recalculate profile controls;
- open and closed desktop account/rating overlays;
- inline mobile picker content;
- selected conclusion and breakdown evidence;
- long account, opening, conclusion, metric, and game labels;
- internal game links and external source links;
- 980px, 760px, and 640px transitions;
- keyboard focus and mobile-navigation clearance.

Unavailable states must be recorded explicitly rather than represented as observed passes.

## Files inspected

- `TRANSFORMATION.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-migration.md`
- `docs/frontend/design-tokens.md`
- `transformation/MASTER_PLAN.md`
- `transformation/DECISIONS.md`
- `transformation/STATUS.md`
- `transformation/WORKING_RULES.md`
- issue #132 and its existing Batch 1 claim
- open PR inventory including PRs #196, #204, and #205
- merged PR #189 disposition
- `apps/web/src/app/features/player-chess-profile/pages/player-chess-profile-page.component.ts`
- `apps/web/src/app/features/player-chess-profile/pages/player-chess-profile-page.component.html`
- `apps/web/src/app/features/player-chess-profile/pages/player-chess-profile-page.component.css`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-filter-bar.component.ts`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-filter-bar.component.html`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-filter-bar.component.css`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-conclusions.component.ts`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-conclusions.component.html`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-conclusions.component.css`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-breakdown.component.ts`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-breakdown.component.html`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-breakdown.component.css`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-evidence.component.ts`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-evidence.component.html`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-evidence.component.css`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-coverage.component.ts`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-coverage.component.html`
- `apps/web/src/app/features/player-chess-profile/components/player-chess-profile-coverage.component.css`
