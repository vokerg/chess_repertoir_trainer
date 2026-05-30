# Imported-game analysis worker

Backend Stockfish analysis is split into two deployable processes:

- `apps/api/src/main.ts` handles HTTP requests and creates/reads analysis runs.
- `apps/api/src/analysis-worker.ts` is a portable queue worker that claims queued runs from PostgreSQL and owns Stockfish execution.

Both processes use the same database and the same `GameAnalysisService` execution path. The API should normally queue work; the worker performs the expensive Stockfish work outside the request/response path.

## API contract

`POST /api/imported-games/:gameId/analysis-runs` accepts:

```json
{
  "depth": 12,
  "multipv": 1,
  "force": false,
  "async": true
}
```

- `async: true` is the default. The API creates a `GameAnalysisRun` with `status = QUEUED`, returns `202 Accepted`, and does not start Stockfish.
- `async: false` keeps the old synchronous API path for local development or emergency fallback. This path still starts Stockfish inside the API process and should not be used on small web-service instances.
- `force: false` reuses matching `QUEUED`, `RUNNING`, or `COMPLETED` runs for the same game/depth/MultiPV/engine settings.
- `force: true` creates a new run. Existing `PositionAnalysis` cache rows are still reused during execution.

Analysis status values are:

```text
NOT_ANALYZED
QUEUED
RUNNING
COMPLETED
FAILED
INTERRUPTED
```

`INTERRUPTED` is used when a worker restarts while a run was still marked `RUNNING`.

## Worker execution model

The worker loop is intentionally simple:

1. Mark stale `RUNNING` rows as `INTERRUPTED` on startup.
2. Claim the oldest `QUEUED` run with a PostgreSQL `FOR UPDATE SKIP LOCKED` query.
3. Start or reuse one `StockfishSession`.
4. Execute the shared game-analysis service.
5. Update `positionsDone` after each ply.
6. Mark the run `COMPLETED` or `FAILED`.
7. Poll again after `ANALYSIS_WORKER_POLL_MS` when no work is available.

The default engine mode is lazy: Stockfish is not started until the first queued job is claimed. This avoids paying Stockfish startup memory on hosts that are running the worker but have no jobs. Set `ANALYSIS_WORKER_ENGINE_MODE=startup` to start Stockfish immediately and keep it alive.

## Local commands

Root dev starts API, worker, and web together:

```bash
npm run dev
```

Run only the worker:

```bash
npm run dev:worker
```

After building, run the worker from the API workspace:

```bash
npm run start:worker --workspace=apps/api
```

## Deployment

The worker has no HTTP listener and is deployable anywhere Node and Stockfish are available:

- local machine
- Render background worker
- VM/VPS
- GitHub Actions batch job
- any Docker/container host

The required runtime contract is only:

- access to the same PostgreSQL database as the API
- a Stockfish executable available through `STOCKFISH_PATH` or `stockfish` on `PATH`
- the same analysis environment values used by the API

The API service can be small and does not need Stockfish for async operation. The worker service should be sized for Stockfish startup/search memory.

## Environment variables

```text
STOCKFISH_PATH=stockfish
STOCKFISH_VERSION=stockfish-local
ANALYSIS_DEFAULT_DEPTH=12
ANALYSIS_MAX_DEPTH=16
ANALYSIS_DEFAULT_MULTIPV=1
ANALYSIS_MAX_MULTIPV=1
ANALYSIS_TIMEOUT_MS=15000
STOCKFISH_THREADS=1
STOCKFISH_HASH_MB=16
ANALYSIS_WORKER_POLL_MS=3000
ANALYSIS_WORKER_ENGINE_MODE=lazy
ANALYSIS_WORKER_RESTART_ENGINE_AFTER_GAMES=0
```

`ANALYSIS_WORKER_RESTART_ENGINE_AFTER_GAMES=0` disables periodic engine restart. Set it to a positive number if the chosen Stockfish build grows memory over time.
