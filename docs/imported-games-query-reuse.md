# Imported game query reuse

Imported-games query behavior is split into feature-local layers under `apps/api/src/modules/imported-games`:

```text
imported-games.routes.ts
  HTTP validation and response status handling
    -> ImportedGamesService
      REST/browser DTO and facet response mapping
        -> ImportedGameQueryService
          current-user setup, cursor pagination, post-filtering, detail/PGN/facet use cases
            -> imported-games.repository.prisma.ts
              Prisma selects, filters, sorting, cursor predicates, and database calls
```

`imported-game-analysis.helpers.ts` contains pure row-derived analysis and ply-index status calculations plus imported-game post-filter matching. `ImportedGameQueryService` uses those helpers while returning repository rows and query criteria rather than browser response DTOs.

## Reuse rule

Consumers that need imported-game selection semantics should call `ImportedGameQueryService` directly from the backend process. They should not call imported-games REST endpoints over HTTP and should not depend on `ImportedGamesService`, which is intentionally browser-shaped.

Frontend web consumers should reuse the shared `apps/web/src/app/shared/position-game-moves` models, helpers, API service, and panel, and should query `GET /api/opening-analysis`. The opening-analysis page and line editor share this position game-moves UI and must not maintain separate next-move markup.

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
