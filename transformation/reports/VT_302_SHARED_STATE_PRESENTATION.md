# VT-302 shared async-state presentation

Date: 2026-08-09  
Issue: #133  
Pull request: #313  
Branch: `visual-transformation/vt-302-shared-state-presentation`  
Review base: `main` `57a864a6b7424174aac538f29ee793ce8754992e`  
Initial claim base: `main` `fe0a5ada0205e1d2cf0e27017886d8e907ef4ff7`

## Scope

This is a bounded VT-302 state-consistency slice. It establishes one feature-agnostic presentation contract for common loading, empty, and error messages and migrates two proven route consumers: Courses and Accounts.

It is not the complete cross-route state review and does not complete VT-302.

## Evidence and ownership boundary

The inspected review base had no shared loading/empty/error component under `apps/web/src/app/shared/ui`. Courses and Accounts independently rendered the same three state categories with local `status-note`, `status-error`, and `empty-state` markup.

That duplication is sufficient evidence for a shared presentational primitive while keeping feature workflow ownership unchanged:

- `CoursesStore` still decides when courses are loading, failed, empty, or populated.
- `AccountsStore` still owns account loading, failure, population, and workflow state.
- The shared component performs no HTTP, routing, store access, retry behavior, persistence, or lifecycle orchestration.
- Account notices, account refresh progress, import results, and all workflow actions remain feature-owned because they are not generic page async states.

The dedicated Onboarding and data-lifecycle program remains the authority for functional onboarding behavior. This slice does not implement ONB-010 or change import/preparation lifecycle behavior.

## Shared contract

`app-state-message` accepts only a required text message and one bounded tone:

- `loading` — neutral/mint progress presentation, `role="status"`, and `aria-live="polite"`;
- `empty` — static dashed neutral presentation with no live-region role, avoiding unsolicited announcement of ordinary empty content;
- `error` — danger presentation, `role="alert"`, and `aria-live="assertive"`.

The loading live region deliberately does not set `aria-busy="true"` on itself. `aria-busy` is intended to defer exposure of changes until a busy region becomes complete; this transient status message is removed when loading ends rather than toggled to `false`, so marking it busy could suppress the loading announcement it exists to provide.

The component is standalone, OnPush, store-free, router-free, HTTP-free, and styled only with the production `--ui-*` visual roles plus the established shared spacing scale.

The loading affordance is deliberately static rather than animated, so it creates no additional reduced-motion obligation.

## Migrated consumers

### Courses

The existing conditions are preserved:

- loading remains `store.loading()`;
- error remains store-owned and is narrowed with `@if (...; as error)`;
- empty still requires no loading, no error, and zero courses;
- populated-course rendering and all create/delete/navigation behavior are unchanged.

Only the three state-message renderings move to `app-state-message`.

### Accounts

The store-owned workflow conditions remain unchanged, with one presentation correction found during self-review:

- initial loading still requires `store.loading()` with zero accounts;
- error remains store-owned;
- empty requires no loading, no error, and zero accounts, preventing a failed initial account request from simultaneously claiming that no accounts are configured;
- notices, all-account refresh status, sync results, import/index/analysis actions, default-account behavior, cursor reset, activation, and deletion remain unchanged.

The now-unused Accounts-local empty and error styles are removed. Feature-specific `status-note` styling remains because notices and workflow progress still consume it.

## Self-review corrections

The first exact-head CI pass exposed no compiler/test failures, but manual review found two semantic defects before merge:

1. The loading message set `aria-busy="true"` on the same live region used for the loading announcement. Because the component disappears instead of later setting busy to false, assistive technology could defer the announcement indefinitely. The busy binding and computed state were removed, and the focused test plus static accessibility guard now require the loading live region to remain unblocked.
2. Accounts could render its load error and its empty-account message together after an initial request failure because `loadAccounts()` leaves the collection empty and clears `loading` in `finally`. The empty condition now also requires `!store.error()`, matching Courses and avoiding contradictory state messaging.

Neither correction changes APIs, stores, routes, persistence, or account workflow commands.

During self-review, `main` advanced through the disjoint ONB-023 completion-record reconciliation commit `57a864a6b7424174aac538f29ee793ce8754992e`. The branch was rebuilt on that exact current base while preserving the four onboarding files from the new main commit, leaving only this slice's 13-file diff.

## Regression coverage

Focused Angular tests cover the shared component contract:

- empty content is static and non-live;
- loading is a polite status without `aria-busy` suppression;
- errors are assertive alerts.

`check-web-accessibility-contract.mjs` additionally guards:

- the bounded `loading | empty | error` component contract;
- role/live bindings and absence of self-suppressing `aria-busy` on the shared message;
- continued use of all three shared state tones by Courses and Accounts;
- no loading/error overlap with the migrated empty-state conditions;
- no regression of those two migrated consumers to local `empty-state` markup.

Angular build/template compilation remains responsible for validating the standalone imports at both consumers.

## Explicit exclusions

This slice does not change:

- API contracts, backend routes, schemas, persistence, or migrations;
- Angular stores or data-access services;
- route definitions or navigation;
- import, indexing, analysis, preparation, or onboarding lifecycle behavior;
- Repertoire Builder / RB-026 files;
- Home aliases or global `.library-*` compatibility debt;
- feature-specific partial-data, stale-cache, retry, or recovery workflows outside the two migrated generic state messages;
- the remaining route inventory.

The stale historical branch `visual-transformation/vt-302-onboarding-accessibility-polish` is not reused or merged into this slice.

## Validation

GitHub Actions CI is the executable validation source for this branch. The local runner cannot resolve `github.com`, so no local checkout, build, lint, or test result is claimed.

Direct authenticated browser or assistive-technology review is not claimed by this source-only slice unless separately recorded on the pull request after direct observation.

## Residual VT-302 work

After this slice, VT-302 still owns:

- broader cross-route empty/loading/error/partial/recovery/retry consistency review;
- coordination with the Onboarding program for the eventual coherent first-run product path;
- remaining keyboard/screen-reader, contrast, focus, reduced-motion, zoom, and representative responsive evidence;
- evidence-based disposition of remaining accepted compatibility debt;
- final program reconciliation and completion assessment.

Issue #133 therefore remains open after this partial slice.
