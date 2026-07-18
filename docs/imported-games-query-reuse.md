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

`imported-games.repository.prisma.ts` owns imported-game selection semantics. Filters must be expressed in the Prisma/SQL predicate built by `buildImportedGameWhere`, including analysis status, accuracy, classification, ply-index status, and tag filters. Do not add Node-side post-filtering for search, summary, opening analysis, course review, Lab reports, or MCP tools; it breaks pagination and forces the API to scan candidate pages that Postgres could reject directly.

`ImportedGame` materializes the latest analysis-run fields used for filtering and list display (`latestAnalysisStatus`, latest accuracy values, and latest run timestamps). Analysis write paths update those fields in the same transaction as `GameAnalysisRun` creation/completion/failure. Search and facet reads use these snapshots and must not load `analysisRuns` merely to rediscover the latest status or accuracy.

`imported-game-analysis.helpers.ts` contains pure row-derived display helpers for analysis and ply-index status. It is not a filtering layer.

## Reuse rule

Consumers that need imported-game selection semantics should call `ImportedGameQueryService` directly from the backend process. They should not call imported-games REST endpoints over HTTP and should not depend on `ImportedGamesService`, which is intentionally browser-shaped.

Frontend web consumers should reuse the shared `apps/web/src/app/shared/games/position-moves` models, helpers, API service, and panel. Core move consumers should query `GET /api/opening-analysis`; top-game consumers should query `GET /api/opening-analysis/top-games`; performance consumers should query `GET /api/opening-analysis/performance`. The opening-analysis page and line editor share this position game-moves UI and must not maintain separate next-move markup.

Backend-process consumers should continue to use `ImportedGameQueryService` directly and must not call REST over HTTP.

## Games explorer URL contract

The Angular Games explorer treats `/games` query parameters as validated, applied search state. The contract schema `importedGameSearchQuerySchema` from `@chess-trainer/contracts/imported-games` is the source of truth; the web client does not forward arbitrary URL parameters to `GET /api/imported-games`.

A plain `/games` URL uses the current `defaultGameFilters()` behavior: the default three-month date range and the `blitz,rapid` speed selection, plus the contract defaults `sort=endedAtDesc` and `limit=50`. A URL with `filterMode=explicit` has different omission semantics: every omitted optional filter is unfiltered. This makes an explicit no-filter search representable as:

```text
/games?filterMode=explicit&sort=endedAtDesc&limit=50
```

The durable supported parameters are:

- `accountIds`
- `providers`
- `from`
- `to`
- `resultForUser`
- `userColor`
- `rated`
- `speedCategory`
- `variant`
- `openingEco`
- `openingName`
- `opponent`
- `timeControl`
- `minUserRating`
- `maxUserRating`
- `minOpponentRating`
- `maxOpponentRating`
- `analysisStatus`
- `plyIndexStatus`
- `tagFilter`
- `tagCodes`
- `classification`
- `minAccuracy`
- `maxAccuracy`
- `sort`
- `limit`

Array-valued parameters use one comma-separated value. This applies to `accountIds`, `providers`, `resultForUser`, `userColor`, `speedCategory`, `variant`, `openingEco`, `analysisStatus`, `plyIndexStatus`, `tagCodes`, and `classification`. For example:

```text
/games?filterMode=explicit&providers=CHESS_COM,LICHESS&resultForUser=DRAW,WIN&variant=chess960,standard&sort=endedAtDesc&limit=50
```

`rated` uses `true` or `false`. Rating bounds and `limit` are integers; accuracy bounds accept numbers from 0 through 100. `from` and `to` accept either `YYYY-MM-DD` dates or ISO timestamps with an offset, as defined by the shared schema. `sort` accepts `endedAtDesc` or `endedAtAsc`, and `limit` is from 1 through 200.

Unknown parameters are ignored. Recognized values are validated independently: an invalid value is ignored while other valid parameters remain applied. In default mode, the ignored field therefore retains the Games default when that field has one; in `filterMode=explicit`, it remains unfiltered. Stable canonical serialization sorts and deduplicates array values.

`cursor` is intentionally not durable route state. A cursor found in a `/games` URL is ignored, and route serialization removes it. `GamesApiService` adds the current in-memory `pageInfo.nextCursor` only for a Load more request. `openingNameExact` is also not part of this endpoint contract: it belongs to opening-analysis queries and is never serialized for `GET /api/imported-games`.

Other Angular features must build Games explorer links through the typed shared helper instead of hand-assembling query parameters:

```ts
import { gamesExplorerLinkQueryParams } from '../shared/games/navigation/games-explorer-link.helper';

const queryParams = gamesExplorerLinkQueryParams({
  providers: ['LICHESS'],
  variant: ['standard'],
  minUserRating: 1400,
});

// <a routerLink="/games" [queryParams]="queryParams">View games</a>
```

The helper always includes `filterMode=explicit`, includes the contract `sort` and `limit` defaults when omitted, uses CSV for arrays, and returns Angular-compatible string query parameters.

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

The query service exposes paged search rows, summary aggregates, detail rows, PGN lookup, and raw facet results. Each consumer owns its own output mapping. New query operations should remain feature-local and should be added only when a concrete consumer needs them; this is not a global query framework.

## Use-case projections

Imported games do not have one universal response model. Each use case has a DTO and matching Prisma selection:

- Browser search returns compact explorer fields, `tagCount`, scalar ply-index status, and snapshot-based analysis status/accuracy. It omits PGN, plies, tag arrays, raw provider fields, analysis-run metadata, summaries, and timestamps that the table does not render.
- Detail returns replay metadata, PGN, indexed plies, and compact per-ply position-analysis scalars. Stored multipv lines are not embedded; interactive rich lines are fetched through the position-analysis APIs.
- Opening top games return only identity, provider/date, players, result/opening, and the move needed for display and navigation.
- Opening struggles first counts matching games with the shared SQL predicate, rejects scopes above its hard candidate-game limit, then selects only early plies, per-move score loss, and compact position-evaluation scalars. It loads all user-owned course lines in one separate course-content query, builds one repertoire graph per course and trained side, and annotates returned prefixes without per-row database calls. Prefix aggregation remains an explicitly bounded in-memory operation; see [Opening struggles](opening-struggles.md).
- MCP search and detail use MCP-owned mappers. They share repository query semantics, not browser DTOs.

List response DTOs must match the consumer rather than contain detail-only fields. Prisma selects must in turn match those DTOs: avoid loading relations solely to derive values already represented by snapshot columns, and never add a generic `fields` or `include` transport parameter.

## Summary aggregation

`ImportedGameQueryService.summarize` reuses `buildImportedGameWhere` and delegates database aggregation to `summarizeImportedGames`. PostgreSQL computes the total, result/provider/speed/color/opening groups, and rating averages/counts. Node receives only bounded aggregate groups, then applies output sorting, score calculation, and weighted rating combination.

Loading every matching imported-game row for a general summary, facet, count, or average is forbidden. Bounded post-processing of distinct aggregate groups is allowed. A feature-specific row aggregation must have an explicit safety bound, must not silently truncate, and must document why database aggregation is not yet used; opening struggles is the current example of that transitional boundary.

The analysis-status facet groups `ImportedGame.latestAnalysisStatus`. Account performance uses database result counts, opponent-rating averages, and time-control groups, plus separate bounded top-five victory and defeat queries. Aggregate endpoints may shape bounded groups in Node, but must not load the complete matching game or analysis-run set without a documented feature limit.

MCP-specific input schemas and output mappers remain under `apps/api/src/modules/mcp`; imported-games query semantics remain owned by the imported-games module.

Opening-analysis repository functions reuse `buildImportedGameWhere` for account/provider/date/rated/result/color/speed/variant/opening/tag/rating/analysis-status filters. The core endpoint uses SQL/Prisma count, group, and distinct queries for position WDL and next-move reduction; it does not load full matching ply rows to build secondary panels.
