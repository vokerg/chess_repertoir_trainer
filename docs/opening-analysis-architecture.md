# Opening Analysis Architecture

Opening analysis is panel-shaped. The opening explorer needs next moves quickly, while performance tags, recent games, course suggestions, and engine seeds are independent panels. The API keeps filtering and aggregation semantics on the backend, but splits the response so first render does not wait for every secondary concern.

## Endpoint Responsibilities

- `GET /api/opening-analysis`: core endpoint for first render. Query params are `fen` plus the imported-game filters from the games explorer. Response includes `fen`, `normalizedFen`, `bookOpening`, `sideToMove`, `fullMoveNumber`, `ratedOnly`, `occurrences`, position `games` WDL, `nextMoves`, and `appliedFilters`.
- `GET /api/opening-analysis/performance`: performance panel endpoint. Query params are `fen` plus the same imported-game filters. Response includes `fen`, `normalizedFen`, `performance`, and `appliedFilters`.
- `GET /api/opening-analysis/top-games`: recent games panel endpoint. Query params are `fen`, the same imported-game filters, and `limit` from 1 to 50. Each top game contains only `id`, `provider`, `endedAt`, `speedCategory`, white/black player summaries, `resultForUser`, opening, `moveNumber`, `nextMoveUci`, and `nextMoveSan`; it does not load tags or full game detail.
- `GET /api/position-analysis`: stored engine-analysis lookup. Query params include `fen`. Response is `{ positionAnalysis }`; it never starts an engine.
- `GET /api/courses/position-suggestions`: course suggestion lookup. Query params include `fen`. Response is `{ normalizedFen, suggestions }`.

## Query Shape

`buildImportedGameWhere` remains the source of truth for imported-game filters. Core, performance, and top-games endpoints all use it, so account, provider, date range, rated, result, color, speed category, variant, opening, tag, opponent rating, analysis status, accuracy, classification, and ply-index filters stay consistent.

SQL/Prisma handles set reduction where it is the right layer:

- core occurrence count for matching plies;
- distinct-game WDL counts for the position;
- next-move occurrence counts;
- next-move distinct-game WDL inputs;
- recent top games ordered by `endedAt DESC, id DESC`;
- performance input as distinct games with `id`, `resultForUser`, and `tagCodes`;
- course suggestions by indexed `MoveNode.fenBeforeNormalized`.

TypeScript still handles DTO shaping, SAN and `fenAfter` formatting, final next-move sorting, and the performance tag bucket taxonomy.

## Frontend Loading

The opening explorer starts the core request first and uses it to render board context, WDL, and next moves. Core, performance, and top games remain separate requests because they serve independent panels and query shapes. Performance and top games load through separate store commands with separate loading/error state and request sequence guards. Stale responses from older positions are ignored.

The engine panel is not seeded from `/api/opening-analysis`; `PositionAnalysisCacheService` performs the stored lookup through `/api/position-analysis` and then starts live local analysis when needed. This avoids duplicate stored-analysis fetches in the opening flow.

Line editor uses the core endpoint for candidate moves. Free analysis uses the top-games endpoint for its "my games" panel. Mobile opening analysis treats `topGames` as optional unless it adds an explicit top-games request.

## Course Suggestions

`MoveNode.fenBeforeNormalized` stores the same normalized FEN semantics used by imported-game positions: halfmove and fullmove counters are ignored. The migration backfills existing rows and adds an index. New manually created, copied, and PGN-imported move nodes must populate the field.

The course suggestions endpoint queries this indexed field and joins through line/chapter/course ownership, so suggestions remain scoped to the authenticated user and do not rely on frontend filtering for correctness.

## Compatibility Notes

The public core endpoint no longer includes `performance`, `topGames`, or `positionAnalysis`. Backend MCP tooling that needs the old all-in-one object uses an internal legacy assembler, not the public default response. New browser code should call the panel endpoints directly.

## Performance Notes

The core endpoint is optimized for first render. Secondary panels are lazy and can run in parallel. Prisma does count/group/distinct reduction before data reaches TypeScript; TypeScript is reserved for chess formatting and business-specific presentation shaping.
