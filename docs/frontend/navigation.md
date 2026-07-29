# Frontend Navigation

This document describes the current web navigation structure and ownership.

## Component Ownership

`AppComponent` is only the outer application shell. It renders:

- `app-main-navigation`
- the primary `router-outlet`
- the global confirm dialog
- the imported-game job panel

`apps/web/src/app/core/layout/main-navigation/main-navigation.component.*` owns the app-specific navigation model, desktop rail rendering, mobile-primary rendering, complete mobile destination dialog, active-route matching, and authentication navigation display. Keep this component app-specific; do not move it to `shared/ui` unless it becomes route-agnostic.

Desktop and mobile navigation must be driven from the same hierarchical `mainNavItems` model. Do not add a second mobile-only route list.

## Desktop Model

The signed-in desktop experience uses the existing expandable/collapsible rail:

- expanded parent groups disclose inline child navigation;
- collapsed parent groups use anchored popup-menu flyouts;
- one parent may be open at a time;
- rail collapse remains local and session-only;
- account placement remains at the bottom of the rail.

VT-205 does not change this contract.

## Final Mobile-Primary Model

Below `VIEWPORT_BREAKPOINTS.mobileMaxPx` (`760px`), render a persistent five-slot bottom navigation:

1. `Home` -> `/home`
2. `Study` -> `/library`
3. `Games` -> `/games`
4. `Openings` -> `/opening-analysis`
5. `More` -> complete grouped destination dialog

The four route destinations are filtered by stable ids from `MainNavigationComponent.mainNavItems`. They are not independently declared links.

The selection is evidence-based:

- Home is the signed-in default and product-wide next-action entry;
- Study is the representative training workflow and first Home workspace shortcut;
- Games is the representative imported-game evidence workflow and second Home shortcut;
- Openings is the representative board/workbench workflow and third Home shortcut.

Courses, Builder, Progress, Tools, Settings, account access, and every child destination remain available through `More`. The complete dialog renders the same hierarchical model as desktop, including descriptions, quiet state, icons, links, and active prefixes.

Secondary routes make `More` active. Primary routes keep their corresponding persistent item active. Child routes inherit their parent activity through the existing `activePrefixes` contract.

The mobile destination dialog uses native modal-dialog behavior for focus containment and Escape handling. Closing through the close control, backdrop, or Escape restores focus to `More`; route navigation closes the dialog without moving focus back to a control on the previous page.

The bottom navigation respects `env(safe-area-inset-bottom)`. The application content and fixed imported-game job panel reserve clearance above it. Feature-owned mobile launchers, boards, filters, pagination, and training controls remain unchanged.

## Top-Level Groups

- `Home` -> `/home`
- `Study` links by default to `/library`.
  - `Repertoire library` -> `/library`
  - `Lichess puzzles` -> `/puzzles`
  - `Missed shots` -> `/scenario-training/tactical-missed-shot`
  - `Avoid blunders` -> `/scenario-training/tactical-blunder`
- `Courses` -> `/courses`
- `Games` -> `/games`
- `Openings` links by default to `/opening-analysis`.
  - `Opening analysis` -> `/opening-analysis`
  - `Opening struggles` -> `/opening-struggles`
- `Builder` -> `/builder`
- `Progress` -> `/progress`
  - `Account performance` -> `/progress`
  - `Chess profile` -> `/progress/profile`
- `Tools` links by default to `/analysis`.
  - `Analysis board` -> `/analysis`
  - `Lab` -> `/lab`
- `Settings` links by default to `/settings/accounts`.
  - `Import accounts` -> `/settings/accounts`
  - `Lichess integration` -> `/settings/lichess`
  - `Appearance` -> `/settings/appearance`

Parent group links navigate to the first/default child.

## Route Ownership

- `/settings/accounts` owns tracked import accounts, sync controls, and default progress account selection.
- `/settings/lichess` owns Lichess OAuth connect, reconnect, and disconnect.
- `/settings/appearance` is a placeholder for future display preferences.
- `/accounts` temporarily redirects to `/settings/accounts`.
- `/accounts/:accountId` temporarily redirects to `/progress/accounts/:accountId`.
- `/progress` chooses the default progress account first, then an active account, then the first account.
- `/progress/accounts/:accountId` owns the account progress dashboard.
- `/opening-struggles` is owned by the standalone `features/opening-struggles` feature and is backed by `/api/opening-struggles`.
- `/lab` owns the Lab experiment catalog and does not mount an active experiment.
- `/lab/top-opponents`, `/lab/monthly-games`, `/lab/performance-by-rating`, `/lab/tactical-detections`, and `/lab/training-log` each own one independently routable experiment page.

## Active-State Rules

- `Study` is active for `/library`, `/chapters`, `/lines`, `/puzzles`, and both tactical scenario-training routes.
- `Openings` is active for `/opening-analysis` and `/opening-struggles`.
- `Progress` is active for `/progress`, `/progress/profile`, and `/progress/accounts/...`.
- Settings routes do not make Progress active.
- `Tools` remains the home for Analysis and Lab. Do not move Analysis or Lab into Settings.
- On mobile, `More` is active only when an active top-level destination is not one of Home, Study, Games, or Openings.
