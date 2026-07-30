# VT-301 Settings Rollout

Date: 2026-07-30

Issue: #132

Batch: 3 — Settings

Branch: `visual-transformation/vt-301-settings`

Target: `main`

Pull request: pending

Disposition: behavior-preserving implementation complete; repository CI and direct browser review pending

## Objective

Modernize `/settings/accounts`, `/settings/lichess`, and `/settings/appearance` with the validated production visual system while preserving account import workflows, OAuth connection behavior, local sound preferences, routes, stores, services, dialogs, and destructive-action safeguards.

## Verified architecture boundary

- `AccountsPageComponent` remains the standalone OnPush route page backed by `AccountsStore` and typed `AccountsApiService` data access;
- confirmation ownership remains in `ConfirmDialogService` for cursor reset, indexing, analysis submission, account deletion, and Lichess disconnect;
- `LichessSettingsPageComponent` retains callback-query interpretation and delegates OAuth actions to `AccountsStore`;
- `AppearanceSettingsPageComponent` retains `ChessSoundService` ownership for pack, volume, persistence, and previews;
- route registration and authentication remain unchanged in `app.routes.ts`;
- `app-page-header`, `app-panel`, and `app-fact-grid` are reused only at their established feature-agnostic boundaries.

## Implemented presentation

### Import accounts

- migrated form labels, account cards, provider/status/default pills, sync results, workflow actions, empty states, links, destructive actions, and responsive composition to production `--ui-*` roles;
- replaced the repeated account date grid with `app-fact-grid` for Last sync, Import cursor, and Created evidence;
- retained per-account action grouping and made Delete account visually distinct without changing the typed-confirmation requirement;
- retained the 980px form/card collapse and added full-width compact actions at 640px;
- added explicit focus treatment for the account progress link.

### Lichess integration

- replaced the repeated connection metadata grid with `app-fact-grid` for connection dates, import linkage, and OAuth capability evidence;
- migrated connected, disconnected, loading, notice, error, missing-scope, reconnect, and disconnect presentation to production roles;
- retained missing-scope text and status semantics;
- retained OAuth callback query handling, reconnect, and confirmation-gated disconnect behavior;
- added 760px stacked and 640px full-width action treatment.

### Appearance

- moved the non-trivial inline template and styles into `appearance-settings-page.component.html` and `.css`;
- migrated sound pack, volume, help text, preview grouping, range accent, analytical percentage typography, disabled state, and responsive layout to production roles;
- retained existing sound pack options, local browser persistence, volume step, silent-pack disabling, and move/capture/error previews;
- added visible keyboard focus for the range control and full-width compact preview actions.

## Behavior preserved

- `/settings/accounts`, `/settings/lichess`, and `/settings/appearance` routes and auth guards;
- account creation and form reset;
- active-account and per-account sync commands;
- index/analyse candidate refresh and background submission;
- sync result counts and newly imported game workflow actions;
- cursor reset confirmation and semantics;
- default progress account toggle;
- account enable/disable and typed-confirmation deletion;
- Lichess connection loading, callback notices, scopes, reconnect, and confirmation-gated disconnect;
- sound pack selection, volume, local persistence, silent behavior, and previews.

## Explicit exclusions

- no API, contract, schema, migration, database, route, store, job, cursor, or import semantics change;
- no onboarding or account lifecycle redesign;
- no OAuth scope, callback, or token handling change;
- no new appearance preference beyond existing board sounds;
- no dependency, global token, shared state, or new shared primitive;
- no merge without explicit approval.

## Automated validation

No working local repository checkout is available in this session, so local build, lint, architecture, tests, and browser validation are not represented as passed.

Required before approval:

- repository CI including Angular template/type compilation, lint, architecture checks, migrations, and tests;
- exact final documentation-head CI;
- direct browser review or explicit recorded deferral.

## Browser review required

Review all three routes at desktop, tablet, compact, and narrow-phone widths:

- account form validation, saving, clear, and responsive grouping;
- no-account, loading, error, notice, and refreshing-all states;
- active/inactive/default provider combinations and long names;
- per-account sync/index/analyse/reset/enable/delete disabled and running states;
- sync results with and without archives and newly imported workflow actions;
- account progress link focus and destructive confirmation entry;
- Lichess loading, callback success/cancel/error notices, disconnected state, connected state, missing scopes, reconnect, and disconnect confirmation;
- Appearance wood/digital/silent packs, volume changes, disabled range, previews, focus, and local persistence;
- 980px, 760px, and 640px transitions plus mobile-navigation clearance.

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
- issue #132 and open pull-request inventory
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/shared/ui/fact-grid/fact-grid.component.ts`
- `apps/web/src/app/features/accounts/data-access/accounts.models.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.html`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.css`
- `apps/web/src/app/features/accounts/pages/lichess-settings-page.component.ts`
- `apps/web/src/app/features/accounts/pages/lichess-settings-page.component.html`
- `apps/web/src/app/features/accounts/pages/lichess-settings-page.component.css`
- `apps/web/src/app/features/settings/pages/appearance-settings-page.component.ts`
