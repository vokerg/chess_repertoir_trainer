# Position Analysis Cache

Position analysis stores reusable engine results for a normalized chess position. It is shared by browser free analysis, browser imported-game analysis, and backend local Stockfish batch analysis.

## Stored Data

`Position` is the canonical position row. Its `normalizedFen` ignores halfmove and fullmove counters, and its unique `positionKey` dedupes equivalent positions.

`PositionAnalysis` is one cached analysis row per position. It can be compact or rich:

- Compact rows store scalar best move/eval only: `bestMoveUci`, `bestScoreCpWhite`, and `bestMateWhite`. Their database `lines` value is SQL `NULL`. Imported-game analysis uses compact depth 12, MultiPV 1, and one PV move for classification.
- Rich rows store scalar best move/eval and up to three engine lines/PVs. Interactive/free/opening board analysis requests rich depth 18 and MultiPV 3. Persisted rich lines at depth 17 or deeper are considered reusable for interactive navigation.

API responses keep a stable shape: `PositionAnalysis.lines` is always an array. Compact rows are exposed as `lines: []`.

`ImportedGamePly` stores per-game analysis fields: `scoreLossCp` and `classificationCode`. These fields belong to the game ply because classification depends on the played move and game context, even when reusable eval data comes from `PositionAnalysis`.

`GameAnalysisRun` stores run status, progress, and final accuracy/classification summary for one imported game analysis run.

## Frontend Flow

Browser imported-game analysis first bulk-lookups known cached positions with `POST /api/position-analysis/bulk-lookup`. It uses compact persistence and a `best-eval` cache requirement, so compact rows are reusable when they have a legal best move and a usable eval.

Missing positions are analyzed with browser Stockfish. Results are placed into the in-memory cache immediately so classification can continue with full transient lines. Position-analysis saves are deferred and deduped by normalized FEN, then compact-persisted in chunks through `POST /api/position-analysis/bulk-store`.

Browser free/interactive analysis uses rich persistence and a `lines` cache requirement. A compact row is not sufficient for free analysis that requested engine lines; the browser re-runs the engine and rich-saves the resulting lines. Rich cache reuse is depth-aware: the cache must have at least the requested MultiPV count, and every required line must have depth 17 or deeper for the current depth-18 interactive setting.

Per-game ply score loss and classification are stored separately with the existing batched `PATCH /api/imported-games/:gameId/plies/analysis` request. The game analysis run is created only after pending position-analysis saves have been flushed.

## Backend Batch Flow

Backend local Stockfish batch analysis first checks the database cache through `PositionAnalysisService.getStoredPositionSearch`.

If no stored row exists, it analyzes the position with local Stockfish and creates a transient in-memory analysis object. Classification can use transient full lines immediately; real database ids are not required for classification.

New position-analysis inputs are buffered per game and persisted in bulk chunks through `PositionAnalysisService.storePositionSearches`. Backend batch persists compact rows, so full local-engine PVs are not written to `PositionAnalysis.lines` for imported-game analysis.

Ply score loss and classification updates are buffered separately and flushed in chunks through `updateImportedGamePlyAnalysis`, which uses set-based SQL.

Before `completeRun`, pending position saves and pending ply updates are fully flushed. The final summary is computed from the persisted ply-analysis fields and stored position-analysis rows.

## Endpoints

- `GET /api/position-analysis`: returns one cached analysis row for a FEN, or null. It never runs an engine.
- `POST /api/position-analysis/bulk-lookup`: returns stored rows for a set of FENs. Missing positions are omitted.
- `POST /api/position-analysis/store`: stores one client/local-engine position analysis. Use `persistenceMode: "compact"` for imported-game analysis and `persistenceMode: "rich"` for free/interactive analysis.
- `POST /api/position-analysis/bulk-store`: stores up to 500 client/local-engine position analyses and returns `{ positionAnalyses }`.

## Invariants

- Normalized FEN ignores halfmove and fullmove counters.
- `Position.positionKey` dedupes positions and maps to `ImportedGamePosition`.
- `PositionAnalysis.positionId` is unique, so there is one reusable analysis row per position.
- Compact writes do not downgrade rich rows or erase existing rich lines.
- Rich writes can upgrade compact rows and can replace older rich rows when the incoming analysis is at least as deep.
- Depth 12 rich rows do not satisfy depth 18 interactive requests; the browser reruns Stockfish and rich-saves upgraded depth 18 lines. Depth 17 and depth 18 rich rows are reused.
- `bestMoveUci` is always one legal UCI move such as `e2e4` or `e7e8q`.
- Empty/null persisted lines must not break imported-game analysis; compact rows expose `lines: []`.
- Engine output can be used for classification before persistence finishes.
- Bulk persistence must not change classification behavior; it only reduces HTTP and database round trips.
