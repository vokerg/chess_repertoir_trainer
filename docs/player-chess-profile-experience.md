# Player Chess Profile experience

The authenticated `/progress` route presents a recalculable Player Chess Profile based on the deterministic `/api/player-chess-profile` contract.

## Entry points

- `/progress` opens the combined Player Chess Profile.
- `/progress/accounts/:accountId` keeps the existing single-account rating and performance dashboard.

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
data-access/  typed HTTP service and UI models
helpers/      period and view-model transformations
pages/        route-level composition
state/        page-scoped signal store and async workflow
```

The feature uses standalone OnPush components, immutable signal updates, built-in template control flow, `app-page-header`, and `app-panel`.

## Deliberate boundaries

The experience does not persist profile snapshots or user corrections, write courses, implement repertoire target setup, change RB-004 formulas, add an LLM dependency, or create a permanent player archetype.

`Use as repertoire starting point` remains a disabled planned affordance until the target workflow exists.
