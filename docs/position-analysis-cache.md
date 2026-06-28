# Position Analysis Cache

Position analysis stores reusable engine results for a normalized chess position. It is shared by browser free analysis, browser imported-game analysis, and backend local Stockfish batch analysis.

## Stored Data

`Position` is the canonical position row. Its `normalizedFen` ignores halfmove and fullmove counters, and its unique `positionKey` dedupes equivalent positions.

`PositionAnalysis` is one cached engine result per position. `PositionAnalysis.positionId` is unique, so each `Position` has at most one current reusable analysis row. It stores the best move, best white-relative score or mate, and up to three engine lines.

`ImportedGamePly` stores per-game analysis fields: `scoreLossCp` and `classificationCode`. These fields belong to the game ply because classification depends on the played move and game context, even when the reusable engine result comes from `PositionAnalysis`.

`GameAnalysisRun` stores run status, progress, and final accuracy/classification summary for one imported game analysis run.

## Frontend Flow

Browser imported-game analysis first bulk-lookups known cached positions with `POST /api/position-analysis/bulk-lookup`.

Missing positions are analyzed with browser Stockfish. Results are placed into the in-memory cache immediately so classification can continue without waiting for persistence.

Position-analysis saves are deferred and deduped by normalized FEN, then persisted in chunks through `POST /api/position-analysis/bulk-store`.

Per-game ply score loss and classification are stored separately with the existing batched `PATCH /api/imported-games/:gameId/plies/analysis` request. The game analysis run is created only after pending position-analysis saves have been flushed.

## Backend Batch Flow

Backend local Stockfish batch analysis first checks the database cache through `PositionAnalysisService.getStoredPositionSearch`.

If no stored row exists, it analyzes the position with local Stockfish and creates a transient in-memory analysis object. Classification uses that transient result immediately; real database ids are not required for classification.

New position-analysis inputs are buffered per game and persisted in bulk chunks through `PositionAnalysisService.storePositionSearches`.

Ply score loss and classification updates are buffered separately and flushed in chunks through `updateImportedGamePlyAnalysis`, which uses set-based SQL.

Before `completeRun`, pending position saves and pending ply updates are fully flushed. The final summary is computed from the persisted ply-analysis fields and stored position-analysis rows.

## Endpoints

- `GET /api/position-analysis`: returns one cached analysis row for a FEN, or null. It never runs an engine.
- `POST /api/position-analysis/bulk-lookup`: returns stored rows for a set of FENs. Missing positions are omitted.
- `POST /api/position-analysis/store`: stores one client-computed position analysis. This remains for compatibility.
- `POST /api/position-analysis/bulk-store`: stores up to 500 client-computed position analyses and returns `{ positionAnalyses }`.

## Invariants

- Normalized FEN ignores halfmove and fullmove counters.
- `Position.positionKey` dedupes positions and maps to `ImportedGamePosition`.
- `PositionAnalysis.positionId` is unique, so there is one reusable engine result per position.
- Engine output can be used for classification before persistence finishes.
- Bulk persistence must not change classification behavior; it only reduces HTTP and database round trips.
