# Frontend Navigation

This document describes the current web navigation structure and ownership.

## Component Ownership

`AppComponent` is only the outer application shell. It renders:

- `app-main-navigation`
- the primary `router-outlet`
- the global confirm dialog

`apps/web/src/app/core/layout/main-navigation/main-navigation.component.*` owns the app-specific navigation model, desktop dropdown rendering, mobile menu rendering, active-route matching, and authentication navigation display. Keep this component app-specific; do not move it to `shared/ui` unless it becomes route-agnostic.

The desktop and mobile menus must be driven from the same hierarchical nav model. Do not add a second mobile-only route list.

## Top-Level Groups

- `Study` links by default to `/library`.
  - `Repertoire library` -> `/library`
  - `Missed shots` -> `/scenario-training/tactical-missed-shot`
- `Courses` -> `/courses`
- `Games` -> `/games`
- `Openings` links by default to `/opening-analysis`.
  - `Opening analysis` -> `/opening-analysis`
  - `Opening struggles` -> `/opening-struggles`
- `Progress` -> `/progress`
- `Tools` links by default to `/analysis`.
  - `Analysis board` -> `/analysis`
  - `Lab` -> `/lab`
- `Settings` links by default to `/settings/accounts`.
  - `Import accounts` -> `/settings/accounts`
  - `Lichess integration` -> `/settings/lichess`
  - `Appearance` -> `/settings/appearance`

Parent group links should navigate to the first/default child.

## Route Ownership

- `/settings/accounts` owns tracked import accounts, sync controls, and default progress account selection.
- `/settings/lichess` owns Lichess OAuth connect, reconnect, and disconnect.
- `/settings/appearance` is a placeholder for future display preferences.
- `/accounts` temporarily redirects to `/settings/accounts`.
- `/accounts/:accountId` temporarily redirects to `/progress/accounts/:accountId`.
- `/progress` chooses the default progress account first, then an active account, then the first account.
- `/progress/accounts/:accountId` owns the account progress dashboard.
- `/opening-struggles` is owned by the standalone `features/opening-struggles` feature and is backed by `/api/opening-struggles`.

## Active-State Rules

- `Study` is active for `/library`, `/chapters`, `/lines`, and tactical missed-shot training.
- `Openings` is active for `/opening-analysis` and `/opening-struggles`.
- `Progress` is active only for `/progress` and `/progress/accounts/...`.
- Settings routes do not make Progress active.
- `Tools` remains the home for Analysis and Lab. Do not move Analysis or Lab into Settings.
