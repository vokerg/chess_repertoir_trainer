# VT-301 Settings Rollout

Date: 2026-08-05

Issue: #132

Batch: 3 — Settings

Branch: `visual-transformation/vt-301-settings`

Target: `main`

Pull request: #209

Disposition: user-approved after current-main reconciliation and adversarial self-review; final exact-head repository CI is the merge gate

## Objective

Modernize `/settings/accounts`, `/settings/lichess`, and `/settings/appearance` with the validated production visual system while preserving account import workflows, OAuth connection behavior, local sound preferences, routes, stores, services, dialogs, and destructive-action safeguards.

## Current-main reconciliation

PR #209 was originally based on `7ee886383baee19503018365a523effc49959687` and accumulated 57 integrated `main` commits before final review. GitHub correctly rejected the first merge attempt because the branch conflicted with current `main`.

The branch was reconciled against current `main` commit `c0effb465e8e0127a2e7655825f1c4667caef31f` before substantive review. The reconciliation deliberately:

- retained current `main` code, migrations, tests, rollout history, Tactical Detections coordination, and newer canonical records;
- applied only the Settings implementation and its dedicated report from the old branch;
- discarded stale branch versions of `transformation/STATUS.md`, `docs/frontend/angular-migration.md`, and `VT_301_PLAYER_CHESS_PROFILE.md` rather than overwriting newer integrated history;
- then rebuilt the canonical Settings and migration records from current `main`.

## Architecture boundary verified

- `AccountsPageComponent` remains the standalone OnPush route page backed by page-provided `AccountsStore` and typed `AccountsApiService` data access.
- Confirmation ownership remains in `ConfirmDialogService` for cursor reset, indexing, analysis submission, account deletion, and Lichess disconnect.
- `LichessSettingsPageComponent` retains callback-query interpretation and delegates OAuth actions to `AccountsStore`.
- `AppearanceSettingsPageComponent` retains `ChessSoundService` ownership for pack, volume, browser-local persistence, and previews.
- Route registration and authentication remain unchanged.
- `app-page-header`, `app-panel`, and `app-fact-grid` are reused only at their established feature-agnostic boundaries.
- No API, schema, migration, route, store, import, job, OAuth-token, or persistence contract changed.

## Adversarial review findings and corrections

### 1. Expensive work was repeated from the Accounts template

The approved branch repeatedly constructed `Set` instances and filtered potentially large imported-game ID arrays from multiple template bindings during change detection.

Correction:

- added `helpers/account-settings-view.ts` as a pure tested boundary;
- deduplicated imported IDs once per view calculation;
- intersected new imported games with current indexed/unindexed candidates once;
- bound one `@let workflow` result per rendered sync result;
- reused the same helper after candidate refresh before submitting commands.

### 2. Account action hierarchy was fundamentally weak

Each account exposed seven same-level buttons. The default-progress command was an icon-only star, while destructive and maintenance commands competed visually with the primary game workflow.

Correction:

- retained visible primary workflow commands for Sync, Index, and Analyse;
- moved default-progress, cursor reset, enable/disable, and delete into a native `details` Account options disclosure;
- replaced the icon-only default control with explicit text while retaining pressed-state semantics;
- added labelled action groups and responsive full-width behavior;
- preserved every existing command and confirmation boundary.

### 3. Dynamic status semantics were incomplete

Errors, notices, refresh progress, and import results were visually present but not consistently exposed as alerts or polite status updates.

Correction:

- errors now use `role="alert"`;
- notices and asynchronous refresh/import results use `role="status"` and appropriate polite live-region semantics;
- loading and missing-scope states retain explicit status meaning.

### 4. OAuth permission guidance omitted a required capability

The UI displayed `challenge:write`, `puzzle:read`, and `puzzle:write` facts but warned only when puzzle scopes were missing. A user could therefore see Bot challenges = Missing without actionable guidance.

Correction:

- centralised the required scope labels in the tested helper;
- the warning now names every missing required permission in stable order;
- reconnect copy accurately covers bot challenges and puzzle actions.

### 5. Appearance controls had avoidable accessibility ambiguity

Help text was nested inside broad label elements, the volume percentage was not an output, and the preview grouping used an accessible label without a semantic group role.

Correction:

- added explicit `for`/`id` label associations;
- connected help through `aria-describedby`;
- represented the percentage with `<output for="board-sound-volume">`;
- gave previews a labelled/described `role="group"`;
- replaced internal/legalistic copy with product-facing preference copy.

### 6. Canonical frontend guidance contradicted runtime behavior

`docs/frontend/angular-patterns.md` said board sounds were always on, while the established `ChessSoundService` and Appearance route already support browser-local pack, volume, and silent preferences.

Correction:

- documented `ChessSoundService` as the sole shared implementation;
- documented the existing browser-local pack and volume ownership;
- retained the prohibition on feature-specific sound services and per-mode flags.

### 7. Migration tooling records were stale

The migration ledger still described the Angular test script as a placeholder despite the active Karma/Chrome suite and recent full CI runs.

Correction:

- recorded the browser test suite as active CI coverage;
- accurately described current web linting as Angular/TypeScript template compilation without a separate ESLint/CSS lint stage.

## Implemented presentation

### Import accounts

- production `--ui-*` roles for form labels, cards, status pills, sync results, empty states, links, controls, and responsive composition;
- `app-fact-grid` for Last sync, Import cursor, and Created evidence;
- explicit total and active account stats;
- clear primary-workflow versus account-management hierarchy;
- visibly distinct typed-confirmation deletion;
- explicit focus treatment for the account progress link and disclosure summary.

### Lichess integration

- `app-fact-grid` for connection dates, import linkage, and OAuth capability evidence;
- connected, disconnected, loading, notice, error, missing-scope, reconnect, and disconnect presentation through production roles;
- complete missing-permission guidance;
- preserved callback query handling, OAuth redirect, and confirmation-gated disconnect behavior.

### Appearance

- external template and stylesheet for the non-trivial route page;
- production roles for sound pack, volume, help, preview grouping, range control, disabled state, and responsive layout;
- retained wood, digital, and silent packs, browser-local persistence, five-percent volume steps, and move/capture/error previews.

## Focused regression coverage

Added or expanded:

- `account-settings-view.spec.ts` — imported-game deduplication/intersection and required Lichess scope guidance;
- `accounts-page.component.spec.ts` — rendered evidence, action hierarchy, live-region semantics, current workflow eligibility, confirmation boundaries, and header action wiring;
- `lichess-settings-page.component.spec.ts` — rendered capability evidence, complete missing-scope copy, polite notice semantics, and disconnect confirmation;
- `appearance-settings-page.component.spec.ts` — explicit labels/descriptions, output semantics, preview group, pack/volume persistence calls, and preview delegation.

## Validation record

- Original implementation head `e2448cee7620095a239bafb997e7de6cc2b327bb`: repository CI #1573 passed.
- The old successful run does not validate the current-main merge or the self-review corrections.
- This environment could not create a local checkout because DNS resolution for GitHub failed. No local build, lint, test, or browser command is represented as passed.
- The final refreshed PR head must pass the complete repository CI before squash merge. The exact run is recorded on the PR and issue rather than retroactively editing this report and invalidating the exact-head check.

## Browser disposition

The user explicitly approved wrap-up while requesting a deeper code review and correction. Direct authenticated browser review remains deferred. It is not represented as an observed pass.

The later consolidated product-review checklist should still cover:

- account form and all loading/error/empty/populated states;
- long account names and active/inactive/default combinations;
- sync/index/analyse progress and eligibility changes;
- Account options keyboard disclosure and typed deletion;
- Lichess connected/disconnected/missing-scope/callback states;
- Appearance wood/digital/silent packs, volume, previews, and persistence;
- 980px, 760px, 640px, and narrow-phone layouts with mobile-navigation clearance.

## Explicit exclusions

- no API, contract, schema, migration, database, route, store, worker, job, cursor, import, or OAuth-token behavior change;
- no onboarding or destructive account-lifecycle redesign;
- no new appearance preference or sound implementation;
- no dependency, global state, or speculative shared UI primitive;
- no direct commit to `main`.

## Files inspected

- `TRANSFORMATION.md`
- `AGENTS.md`
- `.agents/skills/angular-frontend/SKILL.md`
- `docs/frontend/angular-architecture.md`
- `docs/frontend/angular-patterns.md`
- `docs/frontend/angular-migration.md`
- `docs/frontend/design-tokens.md`
- `apps/web/package.json`
- `apps/web/src/design-system.css`
- `transformation/STATUS.md`
- `transformation/reports/VT_301_SETTINGS.md`
- Visual Transformation issues #122 and #132
- PR #209 metadata, diff, comments, changed-file inventory, base/head comparison, and CI #1573
- `apps/web/src/app/shared/ui/page-header/page-header.component.ts`
- `apps/web/src/app/shared/ui/panel/panel.component.ts`
- `apps/web/src/app/shared/ui/fact-grid/fact-grid.component.ts`
- `apps/web/src/app/shared/ui/confirm-dialog/confirm-dialog.service.ts`
- `apps/web/src/app/shared/chess/services/chess-sound.service.ts`
- `apps/web/src/app/features/accounts/data-access/accounts.models.ts`
- `apps/web/src/app/features/accounts/state/accounts.store.ts`
- `apps/web/src/app/features/accounts/helpers/account-labels.ts`
- `apps/web/src/app/features/accounts/helpers/account-settings-view.ts`
- `apps/web/src/app/features/accounts/helpers/account-settings-view.spec.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.html`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.css`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.spec.ts`
- `apps/web/src/app/features/accounts/pages/lichess-settings-page.component.ts`
- `apps/web/src/app/features/accounts/pages/lichess-settings-page.component.html`
- `apps/web/src/app/features/accounts/pages/lichess-settings-page.component.css`
- `apps/web/src/app/features/accounts/pages/lichess-settings-page.component.spec.ts`
- `apps/web/src/app/features/settings/pages/appearance-settings-page.component.ts`
- `apps/web/src/app/features/settings/pages/appearance-settings-page.component.html`
- `apps/web/src/app/features/settings/pages/appearance-settings-page.component.css`
- `apps/web/src/app/features/settings/pages/appearance-settings-page.component.spec.ts`
- `apps/web/src/app/features/accounts/pages/account-detail-page.component.html`
- `apps/web/src/app/features/lab/experiments/performance-by-rating/performance-by-rating-experiment.component.spec.ts`
- `.env.example`
