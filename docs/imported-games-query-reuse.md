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

- `liked`
- `libraryId`
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

## Liked games and named libraries

The Games navigation keeps `/games` as its default destination and adds `/games/liked` and `/games/libraries`. Both reuse `GamesExplorerPageComponent`, its page-scoped signal store, typed data access, filter codec, and cursor-paginated game table. Collection actions are presentational components with typed outputs; only the store performs writes. Desktop rows and responsive web cards expose a heart and a multiple-library chooser. Native Expo does not yet expose these controls.

`/games/liked` always applies `liked=true`. `/games/libraries?libraryId=<id>` shows a named library. These routes default to explicit, unrestricted search criteria so old, casual, and non-blitz/rapid saved games remain visible. Applying filters preserves the collection route; resetting filters preserves the selected collection. The ordinary `/games` defaults remain unchanged. Library links and filter state survive refresh/back navigation. Library management supports create, rename, and confirmed delete; deleting a library retains games and likes.

The shared imported-game search contract adds optional `liked` and `libraryId` predicates, combined with existing filters in `buildImportedGameWhere`. Search rows emit `liked` and `libraryIds` without loading PGN. These row fields remain optional in the wire schema for older consumers/fixtures; the current API supplies both. A library predicate includes library ownership as well as the existing game ownership predicate. Unknown or foreign library filters return no games. Library counts use database relation counts, not loaded game rows.

Likes live on the already user-owned `ImportedGame` row, defaulting to false for existing imports. `GameLibrary` belongs to an `AppUser`; `GameLibraryEntry` is a many-to-many membership with a composite primary key. The repository locks and checks both owned parent rows inside one transaction before changing membership, making retries idempotent and preventing delete/write races. Deleting a game/account/user cascades memberships; deleting a library only cascades its memberships. Reimporting an existing game does not reset its like or memberships.

Routes are owned by `game-libraries.routes.ts` inside the imported-games module, with orchestration in `GameLibrariesService` and persistence in `game-libraries.repository.prisma.ts`. Shared schemas and inferred types are exported from `@chess-trainer/contracts/imported-games` and directly attached to Fastify route schemas:

| Method | URL | Behavior |
| --- | --- | --- |
| GET | `/api/game-libraries` | Current user's libraries with database game counts |
| POST | `/api/game-libraries` | Create with `{ name }`; returns 201 |
| PATCH | `/api/game-libraries/:libraryId` | Rename with `{ name }` |
| DELETE | `/api/game-libraries/:libraryId` | Delete only the owned library |
| PUT | `/api/imported-games/:gameId/like` | Set `{ liked: boolean }` idempotently |
| PUT / DELETE | `/api/game-libraries/:libraryId/games/:gameId` | Add/remove owned-game membership idempotently |

Names are trimmed, required, and limited to 100 characters. Duplicate names are allowed; IDs identify libraries. All routes require authentication. Resource writes return 404 for missing or foreign resources and `{ success: true }` on success. Invalid requests use the centralized 400 `{ "error": "Validation failed" }` response. OpenAPI is generated from these route schemas.

Apply `20261003120000_game_libraries` with `npm run db:migrate` before deploying the API. It adds the default-false like column, a partial liked-game index, and the two library tables; no game backfill is needed. Saved-game metadata follows imported-game lifetime and is not an archive of deleted accounts. Concurrent changes in another tab become visible on refresh.

Focused verification: `apps/api/test/imported-games/game-libraries.test.mjs` exercises actual HTTP responses, ownership, pagination, idempotence, persistence, and cascades; `apps/api/test/openapi/imported-games-openapi.test.mjs` covers generated operation metadata. Games store/page/API, collection presentation, and navigation specs cover web behavior. Database tests require a migrated test database.
