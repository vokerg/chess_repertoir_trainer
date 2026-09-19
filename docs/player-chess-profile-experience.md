# Player Chess Profile experience

The authenticated `/progress/profile` route presents a recalculable Player Chess Profile based on the deterministic `/api/player-chess-profile` contract.

## Entry points

- `/progress` preserves the existing behavior and redirects to the default, active, or first connected account dashboard.
- `/progress/accounts/:accountId` remains the single-account rating and performance dashboard.
- `/progress/profile` opens the combined Player Chess Profile.
- The main Progress navigation contains separate `Account performance` and `Chess profile` submenu entries.

## Filters

The page supports:

- last month, last three months, last year, all time, and custom dates;
- all connected accounts or a selected account subset;
- `ALL`, `BLITZ_AND_SLOWER`, `BLITZ`, and `BULLET` speed presets;
- White, Black, or both colours;
- rated or casual games;
- optional player-rating and opponent-rating ranges.

Filters are edited locally and applied only when the user recalculates. A request identifier prevents an older response from replacing a newer recalculation.

## Presentation

The page keeps two concepts separate:

- **What you choose** shows classified opening exposure.
- **What works** shows result and analysis metrics relative to the selected-game baseline.

Both can be inspected by character, soundness, theoretical status, theory burden, and role.

Deterministic conclusions show their sample and evidence strength. Selecting a conclusion or breakdown row reveals contributing openings, metrics, and bounded recent supporting games.

## Repertoire Builder starting points

When one side has at least five classified opening-group games, the page exposes a side-specific **Build White repertoire** or **Build Black repertoire** action.

The action derives one transparent starting point from the current response:

- speed comes from the applied profile filter;
- the strongest side-specific classified opening character maps to the existing Balanced, Solid, Aggressive, or Surprise Builder preset;
- theory burden uses the dominant classified burden for that side;
- coverage uses the visible preset default;
- rating population remains an independent factual **My peers** resolution in Builder.

The route snapshot includes the profile contract version, generation time, classification version, selected side, suggested values, and classified-game count. It expires after 24 hours and rejects malformed or unsupported values.

Inside Builder:

- the profile source is shown before setup;
- every target control remains editable;
- profile-derived speed, objective, and coverage are recorded as `PLAYER_PROFILE` defaults;
- manual changes become exact RB-006 `overriddenFields`;
- changing side drops profile provenance;
- **Use standard Builder defaults** removes the suggestion entirely;
- neither action changes the factual profile, candidate ranking policy, session reducer, course preview/apply, or course content.

The v1 is route-local. It does not persist a player persona or attach target intent to a course or line.

## Opening-related tags

The first UI consumes the existing composite RB-004 metrics without changing the calculation contract:

- opening positive: `OPENING_SUCCESS` or `OPENING_ADVANTAGE`;
- opening trouble: `OPENING_DISASTER` or `OPENING_TROUBLE`;
- early mistakes: `EARLY_BLUNDER` or `EARLY_MISTAKE`.

The page does not yet split those composites into severity distributions. That extension should be justified by hands-on use rather than added pre-emptively.

## Evidence and uncertainty

The page exposes:

- total, indexed, analysed, named-opening, profiled, and classified counts;
- analysis percentage;
- low-confidence classification count;
- unknown-dimension count;
- omitted long-tail opening count and truncation boundary;
- personal result baseline and factual peer-band context.

Below 50% analysis coverage, the UI warns that result evidence remains usable while analysis-derived opening conclusions may be insufficient.

## Architecture

Feature code lives under `apps/web/src/app/features/player-chess-profile/`:

```text
components/   presentational filters, findings, breakdown, evidence, coverage
data-access/  typed HTTP service and transport DTOs
helpers/      period and pure DTO-to-view-model transformations
pages/        lazy route-level composition
state/        page-scoped signal store, UI models, and async workflow
```

The feature follows the repository Angular boundaries:

- the route is lazy-loaded through the feature public boundary;
- the page is a composition shell and delegates commands to a page-provided store;
- writable signals remain private and are exposed as readonly state or computed view models;
- the store owns filters, request ordering, loading, errors, selection, and recalculation;
- data access owns typed HTTP calls only;
- presentational components receive feature-local display models and emit typed user intents rather than consuming backend DTOs directly;
- pure helpers map the wire response into conclusion, breakdown, evidence, account, and coverage view models;
- the profile-to-Builder route protocol is an explicit root-level Repertoire Builder boundary consumed by both route pages;
- all components are standalone and OnPush and use built-in control flow with stable tracking;
- route-level shells use `app-page-header` and `app-panel`;
- responsive media queries use the shared 640, 760, and 980 pixel breakpoints with explicit synchronization comments.

## Deliberate boundaries

The experience does not persist profile snapshots or user corrections, write courses, change RB-004 formulas, add an LLM dependency, create a permanent player archetype, or make profile-derived defaults authoritative.

Persisted course intent, reusable saved personas, automatic course duplication, and library presentation require separate evidence and explicit tasks rather than being implied by the route-local starting point.
