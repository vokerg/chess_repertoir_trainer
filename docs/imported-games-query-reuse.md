# Imported game query reuse

Imported-games query behavior is split into feature-local layers under `apps/api/src/modules/imported-games`:

```text
imported-games.routes.ts
  HTTP validation and response status handling
    -> ImportedGamesService
      REST/browser DTO and facet response mapping
        -> ImportedGameQueryService
          current-user setup, cursor pagination, detail/PGN/facet use cases
            -> imported-games.repository.prisma.ts
              Prisma selects, SQL-side filters, sorting, cursor predicates, and database calls
```

`imported-games.repository.prisma.ts` owns imported-game selection semantics. Filters must be expressed in the Prisma/SQL predicate built by `buildImportedGameWhere`, including analysis status, accuracy, classification, ply-index status, and tag filters. Do not add Node-side post-filtering for search, summary, opening analysis, course review, lab reports, or MCP tools; it breaks pagination and forces the API to scan candidate pages that Postgres could reject directly.

`ImportedGame` materializes the latest analysis-run fields used for filtering (`latestAnalysisStatus`, latest accuracy values, and latest run timestamps). Analysis write paths update those fields in the same transaction as `GameAnalysisRun` creation/completion/failure, and the migration backfills existing games from the newest run. Browser response mapping can still load the latest `analysisRuns` relation for detailed display fields such as summary and run id.

`imported-game-analysis.helpers.ts` contains pure row-derived display helpers for analysis and ply-index status. It is not a filtering layer.

## Reuse rule

Consumers that need imported-game selection semantics should call `ImportedGameQueryService` directly from the backend process. They should not call imported-games REST endpoints over HTTP and should not depend on `ImportedGamesService`, which is intentionally browser-shaped.

Frontend web consumers should reuse the shared `apps/web/src/app/shared/games/position-moves` models, helpers, API service, and panel. Core move consumers should query `GET /api/opening-analysis`; top-game consumers should query `GET /api/opening-analysis/top-games`; performance consumers should query `GET /api/opening-analysis/performance`. The opening-analysis page and line editor share this position game-moves UI and must not maintain separate next-move markup.

Backend-process consumers should continue to use `ImportedGameQueryService` directly and must not call REST over HTTP.

Current REST flow:

```text
imported-games.routes.ts
  -> ImportedGamesService
    -> ImportedGameQueryService
      -> imported-games.repository.prisma.ts
```

The MCP backend transport uses the same query layer without sharing REST DTOs:

```text
MCP tool handler
  -> ImportedGameQueryService
    -> imported-games.repository.prisma.ts
```

The query service currently exposes paged search rows, detail rows, PGN lookup, and raw facet results. Each consumer owns its own output mapping. New query operations should remain feature-local and should be added only when a concrete consumer needs them; this is not a global query framework.

MCP-specific input schemas and output mappers remain under `apps/api/src/modules/mcp`; imported-games query semantics remain owned by the imported-games module.

Opening-analysis repository functions reuse `buildImportedGameWhere` for account/provider/date/rated/result/color/speed/variant/opening/tag/rating/analysis-status filters. The core endpoint uses SQL/Prisma count, group, and distinct queries for position WDL and next-move reduction; it does not load full matching ply rows to build secondary panels.
