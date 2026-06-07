# Angular frontend guide

The web app uses standalone Angular components, route-level lazy loading, OnPush change detection, and feature-local signal stores.

## Feature boundaries

Use `pages` for route composition, `components` for presentational UI, `state` for signals and commands, and `data-access` for HTTP and DTOs. Shared code must be feature-agnostic.

## State updates

Treat values held by signals as immutable. For list workflows, patch a row by stable id and copy every changed nested object. Do not mutate DTOs received from an API.

In the Games explorer, analysing or indexing one game must preserve:

- loaded rows
- active filters
- current pagination cursor
- scroll and table context

Full refreshes are appropriate for initial load, applying or resetting filters, and explicit user refresh. Batch APIs may require a refresh only when their response cannot identify affected rows.

## Components and styles

Use typed signal inputs and outputs for presentational components. Keep HTTP and workflow side effects in stores or facades. Track repeated rows by id. Move non-trivial markup and styles into colocated `.html` and `.css`/`.scss` files.

## Verification

Add focused tests around store transitions and pure helpers. At minimum, build the web app with `npm run build:web` and verify that row-level commands do not issue a list search request.
