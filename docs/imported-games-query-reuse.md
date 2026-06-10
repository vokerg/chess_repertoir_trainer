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

Current REST flow:

```text
imported-games.routes.ts
  -> ImportedGamesService
    -> ImportedGameQueryService
      -> imported-games.repository.prisma.ts
```

A future backend consumer can use the same query layer without sharing transport-specific DTOs:

```text
future consumer service
  -> ImportedGameQueryService
    -> imported-games.repository.prisma.ts
```

The query service currently exposes paged search rows, detail rows, PGN lookup, and raw facet results. Each consumer owns its own output mapping. New query operations should remain feature-local and should be added only when a concrete consumer needs them; this is not a global query framework.

MCP tools and MCP-specific types are not implemented here.
