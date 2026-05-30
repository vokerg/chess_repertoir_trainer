# Chess Repertoire Trainer

A local-first web app for authoring and training personal chess opening repertoires. The app is inspired by Chessable, but the focus is your own course/chapter/line hierarchy, a branching move tree, imported-game review, and Stockfish-assisted analysis rather than a flat PGN list.

Repository spelling note: this GitHub repo is named `chess_repertoir_trainer`.

## Live app

- Web: https://chess-repertoir-trainer-web.vercel.app/
- API docs, when the API is running: `/api/docs`
- OpenAPI JSON, when the API is running: `/api/docs/openapi.json`

The deployed web app expects a configured backend API through `WEB_API_BASE_URL` at build time. Locally, the Angular app defaults to `/api`.

## Current scope

This project is in stabilization/prototype stage. The intended v1 stack is:

- Frontend: Angular
- Backend: TypeScript + Fastify
- Worker: portable Node process for queued Stockfish analysis
- Database: PostgreSQL on Neon
- ORM: Prisma
- Chess rules: chess.js
- Validation: Zod
- Tests: Vitest
- Package manager: npm workspaces

Current priorities:

- Reliable repertoire authoring and training.
- Imported game sync from Lichess and Chess.com accounts.
- A filterable imported-games explorer.
- Queued one-game-at-a-time Stockfish analysis for imported games.

Do not treat auth, mobile, cloud multi-user sync, full PGN import, or advanced spaced repetition as current v1 features.

## Product capabilities

### Repertoire authoring and training

The core data hierarchy is:

```text
Course
  Chapter
    Line
      Move tree
```

The move tree is the core model:

- The database stores only real moves.
- Each line has a `startingFen`.
- The in-memory move tree always has a synthetic root at the line starting position.
- First real moves are stored with `parentId: null` and are children of the synthetic root.
- At trained-side positions, exactly one correct move should exist.
- At opponent positions, multiple branches may exist.

During training, opponent branches are auto-played randomly and the trained side must play the single correct continuation.

### Imported games and analysis

The app supports external chess accounts for both `LICHESS` and `CHESS_COM`. A user can add multiple accounts, sync finished games from either provider, browse imported games, open a game replay/detail page, and queue Stockfish analysis for an imported game.

The Games explorer UI is available from the main `Games` navigation item and supports filtering by account, provider, result, colour, time-control class, rated/casual, opponent, opening, analysis status, accuracy range, and date range. Rows show provider, result, players, time control, opening, analysis accuracy, and actions such as Analyse, Force re-analysis, ply indexing, and provider-link navigation.

Backend analysis stores the heavy reusable position result separately from per-game move analysis. Latest game-analysis summaries expose status and accuracy signals to the imported-games list/detail DTOs.

The API no longer needs to run Stockfish inside the request path. By default, analysis requests create `QUEUED` runs that are picked up by the portable analysis worker. The old synchronous execution mode remains available with `async=false` for local development or fallback debugging.

## Project structure

```text
chess-repertoire-trainer/
├── apps/
│   ├── api/                         # Fastify/Prisma backend
│   │   └── src/analysis-worker.ts   # Portable queued Stockfish worker entrypoint
│   └── web/                         # Angular frontend
├── packages/
│   └── chess-domain/                # Pure TypeScript chess/training logic
├── apps/api/prisma/
│   ├── migrations/                  # Active PostgreSQL migrations
│   └── legacy-sqlite-migrations/    # Archived SQLite migration history kept for reference
├── .env.example
├── .gitignore
├── .nvmrc
├── package.json
├── tsconfig.base.json
└── README.md
```

## Prerequisites

Use Node 22. The repo includes `.nvmrc`:

```bash
nvm use
```

Recommended versions:

- Node.js >= 22.12
- npm >= 10

Angular 21 requires a modern Node/TypeScript toolchain, so Node 18 is not the target for this repo.

Stockfish analysis requires a server-side Stockfish executable in whichever process runs the analysis worker. Locally, install Stockfish and set `STOCKFISH_PATH` if the executable is not available as `stockfish` on `PATH`.

## Installation

```bash
npm install
```

The root workspace scripts build `packages/chess-domain` before API/web builds so workspace imports resolve from `dist/`.

## Environment configuration

Copy the example environment file into the API workspace:

```bash
cp .env.example apps/api/.env
```

The API workspace is the source of truth for local database configuration. Prisma CLI commands such as `migrate`, `seed`, and `studio` run from `apps/api`, and the Fastify API plus analysis worker also load their environment from that workspace.

For Neon, configure both connection URLs:

```text
DATABASE_URL="postgresql://USER:PASSWORD@YOUR-POOLED-HOST/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@YOUR-DIRECT-HOST/neondb?sslmode=require&channel_binding=require"
```

- `DATABASE_URL` is the pooled runtime connection used by the API and worker.
- `DIRECT_URL` is the direct connection used by Prisma CLI commands such as `migrate` and `seed`.

Additional backend env knobs:

```text
PORT=3000
CORS_ORIGIN=http://localhost:4200
CHESS_COM_USER_AGENT="chess-repertoire-trainer/0.1 (+https://github.com/vokerg/chess_repertoir_trainer)"
```

Chess.com public API import requests should use a recognizable user agent with a project URL or contact email when deployed.

Backend Stockfish analysis env knobs:

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
```

`STOCKFISH_VERSION` is optional but recommended for deployed environments because it is part of the position-analysis cache identity. Keep it stable until you intentionally want new engine results.

Portable analysis worker env knobs:

```text
ANALYSIS_WORKER_POLL_MS=3000
ANALYSIS_WORKER_ENGINE_MODE=lazy
ANALYSIS_WORKER_RESTART_ENGINE_AFTER_GAMES=0
```

`ANALYSIS_WORKER_ENGINE_MODE=lazy` starts Stockfish only after a queued job is claimed, then keeps that engine session alive for later jobs. `startup` starts Stockfish when the worker process boots, which is useful when you want a deployment to fail fast if Stockfish cannot initialize. Set `ANALYSIS_WORKER_RESTART_ENGINE_AFTER_GAMES` to a positive number to recycle the engine after a fixed number of completed game analyses.

Frontend build-time API configuration:

```text
WEB_API_BASE_URL=/api
```

`apps/web` writes this into `src/app/app-config.ts` during `npm run dev` and `npm run build`.

## Database setup

```bash
npm run db:migrate
npm run db:seed
```

Reset the target database:

```bash
npm run db:reset
```

`db:reset` is destructive. On Neon it resets the configured remote database, not a local SQLite file.

The seed creates:

- Course: `My White Repertoire`
- Chapter: `1.e4`
- Line: `Italian Game sample`
- Main line: `1. e4 e5 2. Nf3 Nc6 3. Bc4`
- Branches after `1. e4`: `1...c5 2.Nf3` and `1...e6 2.d4`

The seed stores real move nodes only; it does not create a fake blank root node.

## Main API surfaces

### Current user and external accounts

```http
GET /api/me
GET /api/me/accounts
POST /api/me/accounts
GET /api/me/accounts/:id
PATCH /api/me/accounts/:id
POST /api/me/accounts/:id/sync
GET /api/me/accounts/:id/games
```

Accounts support `provider: "LICHESS"` and `provider: "CHESS_COM"`. Sync is currently synchronous. Lichess uses the public user games stream; Chess.com uses public monthly archives.

### Imported games browser API

The imported-games browser should use the dedicated search API rather than the account-scoped legacy list:

```http
GET /api/imported-games
GET /api/imported-games/:gameId
GET /api/imported-games/:gameId/pgn
GET /api/imported-games/facets
```

`GET /api/imported-games` returns compact list DTOs for the games browser. PGN, raw provider JSON, and full engine lines are intentionally excluded from list rows.

Supported query parameters include:

- `accountIds`, `providers`, `speedCategory`, `variant`, `openingEco` as comma-separated lists.
- `from` and `to` for `endedAt` date filtering.
- `resultForUser`, `userColor`, `rated`, `openingName`, `opponent`.
- rating ranges: `minUserRating`, `maxUserRating`, `minOpponentRating`, `maxOpponentRating`.
- latest-analysis filters: `analysisStatus`, `classification`, `minAccuracy`, `maxAccuracy`.
- cursor pagination: `limit`, `cursor`, and `sort=endedAtDesc|endedAtAsc`.

List and detail DTOs expose an `analysis` summary derived from the latest `GameAnalysisRun` with status values `NOT_ANALYZED`, `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, and `INTERRUPTED`.

`GET /api/me/accounts/:id/games` remains available as an account-scoped compatibility route, but it is backed by the same imported-games search service.

## Imported game ply indexing

The API can parse one imported game PGN into lightweight move-by-move ply rows:

```http
POST /api/imported-games/:gameId/ply-index
```

Optional body:

```json
{
  "force": false
}
```

This stores move facts only. It does not run Stockfish and does not build an explorer tree yet.

## Backend imported-game analysis

The API creates or reuses an imported-game analysis run:

```http
POST /api/imported-games/:gameId/analysis-runs
```

Optional body:

```json
{
  "depth": 12,
  "multipv": 1,
  "force": false,
  "async": true
}
```

Saved analysis can be read with:

```http
GET /api/imported-games/:gameId/analysis
```

Behavior:

- With `async=true` or omitted, the endpoint validates the game, creates a `GameAnalysisRun` with status `QUEUED`, and returns `202 Accepted` quickly. The analysis worker later claims and executes the run.
- With `async=false`, the API uses the same execution code path synchronously. This is intended for local fallback/debugging, not for small production web services.
- `PositionAnalysis` stores the heavy reusable Stockfish result for a concrete position, played move, depth, MultiPV, engine, and classification version.
- `GameAnalysisRun` stores the one-game run metadata, queue state, progress, errors, and summary.
- `GameMoveAnalysis` stores the game-specific move row and points to `PositionAnalysis`.
- If `force` is false or omitted and a `QUEUED`, `RUNNING`, or `COMPLETED` run already exists for the same imported game, depth, MultiPV, engine name, and engine version, the endpoint returns that run and does not create a duplicate.
- If `force` is true, the endpoint creates a new `GameAnalysisRun`; existing `PositionAnalysis` cache rows are still reused.
- Analyze and read endpoints return compact game-analysis reports by default. Full engine lines remain stored in `PositionAnalysis` and should be exposed through a dedicated detail endpoint only when needed.

### Analysis worker

The analysis worker is a portable Node process. It uses the same database as the API, polls for `QUEUED` runs, claims one run at a time, runs Stockfish, and writes progress/results back to PostgreSQL.

Local command:

```bash
npm run dev:worker
```

Production command after build:

```bash
npm run start:worker --workspace=apps/api
```

The worker is deployable as a Render background worker, a local process, a VM/systemd service, a container, or any environment that can run Node, connect to `DATABASE_URL`, and access a Stockfish executable. The API and worker communicate through the database; the worker does not need a public HTTP endpoint.

Recommended deployment shape:

```text
API web service
  - handles HTTP
  - creates QUEUED runs
  - does not run Stockfish in normal async mode

Analysis worker
  - no public URL required
  - runs Stockfish
  - processes one queued run at a time
  - can be hosted/sized independently from the API
```

Frontend contract for analysis status:

- The source of truth is `GameAnalysisRun`, not a boolean column on `ImportedGame`.
- A game with no analysis runs is `NOT_ANALYZED`.
- A game with a latest `QUEUED` run is waiting for the worker.
- A game with a latest `RUNNING` run is being processed by the worker or sync fallback.
- A game with a latest `COMPLETED` run has saved analysis and accuracy.
- A game with a latest `FAILED` or `INTERRUPTED` run can be retried by creating a new run.
- If performance later requires denormalized analysis fields on `ImportedGame`, treat them as a read-model/cache optimization, not the source of truth.

Future opening-book and classification support:

- Stockfish-only classification can mislabel playable theory as an inaccuracy, especially in the opening.
- Future analysis should add `BOOK` to the classification vocabulary before `BEST`, `GOOD`, `INACCURACY`, `MISTAKE`, and `BLUNDER`.
- Opening-book detection should happen before score-loss classification: if `fenBefore + playedMoveUci` is found in the book, classify the move as `BOOK` while still storing engine eval, score loss, and best move.
- Preferred source is a local opening-book table generated from public Lichess game data, not live API calls during game analysis.
- Future analysis should consider a `MISS` classification for missed tactical or winning opportunities.
- Adding `BOOK`, `MISS`, or other human-facing classification changes should bump `classificationVersion` so old cached `PositionAnalysis` rows do not silently change meaning.

### API documentation

```http
GET /api/docs
GET /api/docs/openapi.json
```

Swagger UI is served by the API itself. The generated OpenAPI document combines legacy route metadata with module-level generated schemas and paths.

## Running locally

```bash
npm run dev
```

This starts:

- API on port `3000`
- Analysis worker polling the same database
- Angular dev server on port `4200`

Visit `http://localhost:4200`.

Individual services:

```bash
npm run dev:api
npm run dev:worker
npm run dev:web
```

## Build and test

```bash
npm run build
npm run test
```

Current testing status:

- `packages/chess-domain` contains Vitest test files.
- `apps/api` and `apps/web` currently use placeholder test scripts.
- Treat `npm test` as a lightweight repo check, not full behavioral coverage.

Useful scoped commands:

```bash
npm run build:domain
npm run build:api
npm run build:web
npm run start:worker --workspace=apps/api
npm run test --workspace=packages/chess-domain
npm run lint
npm run format
npm run prisma:studio
```

## Deployment notes

- The web app is deployed at https://chess-repertoir-trainer-web.vercel.app/.
- The web build writes `WEB_API_BASE_URL` into the Angular app config. Set it to the deployed API base URL for production.
- The API is designed for a Node host such as Render and should be configured with `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGIN`, and `CHESS_COM_USER_AGENT`.
- `CORS_ORIGIN` should include the deployed Vercel web origin.
- The analysis worker should be deployed as a separate process/service with the same `DATABASE_URL` and Stockfish-related variables.
- Ensure Stockfish is available to the worker and that `STOCKFISH_PATH` points to it.
- Keep normal web UI analysis requests async so the API does not spawn Stockfish in the request path.

## Current stabilization acceptance checklist

From a clean clone, the target is:

1. `npm install` succeeds.
2. `npm run db:migrate` succeeds.
3. `npm run db:seed` succeeds.
4. `npm run build` succeeds.
5. `npm run test` succeeds.
6. `npm run dev` starts API, worker, and web.
7. Opening the web app shows the seeded course.
8. The seeded line editor shows a synthetic start/root and real moves below it.
9. Creating a new line and adding `e2e4` stores `e2e4` as a real first move with `parentId: null`.
10. Training a new White line from the initial position asks for `e4` first.
11. Adding multiple Black replies after `e4` is allowed.
12. Adding two different White moves from the same White-to-move position is rejected.
13. Completing a line updates stats once.
14. Wrong moves do not advance the line.
15. Correct moves advance the line.
16. Opponent moves are auto-played randomly from available branches.
17. Data persists in PostgreSQL after restart.
18. Adding a Lichess or Chess.com account and syncing it imports finished games.
19. The Games explorer loads imported games and filters them through `/api/imported-games`.
20. Starting analysis from a game row creates or reuses a `QUEUED` `GameAnalysisRun`; the worker later updates progress and accuracy.

## Migration history

- `apps/api/prisma/migrations/` contains the active PostgreSQL migration history used for Neon and other Postgres environments.
- `apps/api/prisma/legacy-sqlite-migrations/` contains the archived SQLite-era migration that should not be applied to Postgres databases.

## Known limitations

- Active training session state is kept in API memory. Restarting the API loses active sessions.
- Imported-game sync remains synchronous.
- The analysis worker processes one game at a time by design; run more workers only after queue claiming and resource limits are understood.
- Stockfish still requires enough memory in the process where the worker runs. The worker isolates API availability but does not make Stockfish lighter.
- Imported-game search analysis filters are derived from latest run summaries at request time. If this becomes slow with large libraries, move those fields into a denormalized read model.
- The UI is improving but still needs a dedicated authoring UX pass after stabilization.
- JSON import/export exists but needs versioning and merge/deduplication before it should be trusted as a robust backup system.
- The stats model is simple and not yet a spaced repetition scheduler.
- Mobile, auth, cloud multi-user sync, and full PGN import are future work, not current scope.
