# Imported game query reuse direction

The imported-games browser API introduced on `feature/imported-games-api` follows the current route → service → Prisma repository layering, but the browser service should not become the shared dependency for every future feature.

## Current shape

```text
imported-games.routes.ts
  API layer: validates HTTP query params and calls the service

imported-games.service.ts
  Browser/use-case layer: cursor pagination, list/detail DTOs, facets, latest-analysis summary mapping

imported-games.repository.prisma.ts
  Persistence layer: Prisma selects, filters, sorting, cursor predicates
```

This is fine for the games browser, but it mixes reusable game selection with browser response concerns.

## Next refactor before opening explorer or batch jobs

Extract a neutral query/criteria layer before another feature depends on `ImportedGamesService.search(...)` directly:

```text
ImportedGameQueryService
  criteria -> matching game ids / minimal rows / counts

ImportedGamesService
  browser API only: maps query rows to list/detail DTOs, pageInfo, facets

PersonalOpeningExplorerService
  explorer API only: reuses ImportedGameQueryService criteria, builds explorer-specific output

BatchAnalysisService
  batch API/workers only: reuses ImportedGameQueryService criteria, queues matching ids
```

## Rule of thumb

Reuse the same **criteria semantics** everywhere, but do not reuse browser DTOs for non-browser features.

Good:

```text
OpeningExplorerService -> ImportedGameQueryService.findIds(criteria)
BatchAnalysisService    -> ImportedGameQueryService.iterateIds(criteria)
ImportedGamesService    -> ImportedGameQueryService.findPage(criteria)
```

Avoid:

```text
OpeningExplorerService -> ImportedGamesService.search(...)
BatchAnalysisService    -> ImportedGamesService.search(...)
```

`ImportedGamesService.search(...)` is intentionally browser-shaped: it returns `items`, `pageInfo`, display DTOs, facets-related behavior, and API-compatible response fields. Opening explorer and batch processing should receive minimal internal rows or ids and produce their own output.

## Why this matters

The same filters should mean the same thing across features:

- `speedCategory=blitz`
- `rated=true`
- `userColor=WHITE`
- `providers=LICHESS,CHESS_COM`
- `minUserRating=1600`
- `analysisStatus=COMPLETED`

A user should not get one set of games in the browser and a subtly different set in opening explorer or batch analysis.

## Suggested first extraction

Move these concepts out of the browser service/repository pair into reusable module-level pieces:

```text
ImportedGameCriteria
ImportedGameCursor
buildImportedGameWhere(criteria)
findImportedGamePage(criteria, cursor, projection)
findImportedGameIds(criteria, cursor)
countImportedGames(criteria)
```

Keep only one mapping boundary per consumer:

```text
Prisma row -> browser DTO
Prisma row/id -> explorer aggregate
Prisma id -> batch queue item
```

Do not introduce a large DTO hierarchy until the second consumer exists. The opening explorer is likely that second consumer.
