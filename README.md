# Chess Repertoire Trainer

A local-first web app for authoring and training personal chess opening repertoires. The app is inspired by Chessable, but the focus is your own course/chapter/line hierarchy and a branching move tree rather than a flat PGN list.

Repository spelling note: this GitHub repo is named `chess_repertoir_trainer`.

## Current scope

This project is in stabilization/prototype stage. The intended v1 stack is:

- Frontend: Angular
- Backend: TypeScript + Fastify
- Database: PostgreSQL on Neon
- ORM: Prisma
- Chess rules: chess.js
- Validation: Zod
- Tests: Vitest
- Package manager: npm workspaces

The current priority is a reliable local authoring/training loop plus experimental imported-game workflows. Do not treat cloud sync, auth, mobile, full PGN import, or advanced spaced repetition as current v1 features.

## Product model

The data hierarchy is:

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

## Project structure

```text
chess-repertoire-trainer/
├── apps/
│   ├── api/            # Fastify/Prisma backend
│   └── web/            # Angular frontend
├── packages/
│   └── chess-domain/   # Pure TypeScript chess/training logic
├── apps/api/prisma/
│   ├── migrations/     # Active PostgreSQL migrations
│   └── legacy-sqlite-migrations/
│                      # Archived SQLite migration history kept for reference
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

Backend imported-game analysis also requires a server-side Stockfish executable. Locally, install Stockfish and set `STOCKFISH_PATH` if the executable is not available as `stockfish` on `PATH`.

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

The API workspace is the source of truth for local database configuration. Prisma CLI commands such as `migrate`, `seed`, and `studio` run from `apps/api`, and the Fastify API also loads its environment from that workspace.

For Neon, configure both connection URLs:

```text
DATABASE_URL="postgresql://USER:PASSWORD@YOUR-POOLED-HOST/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@YOUR-DIRECT-HOST/neondb?sslmode=require&channel_binding=require"
```

- `DATABASE_URL` is the pooled runtime connection used by the app.
- `DIRECT_URL` is the direct connection used by Prisma CLI commands such as `migrate` and `seed`.

If you change database credentials or switch environments, restart the API dev server so it reloads the updated env file.

Backend Stockfish analysis env knobs:

```text
STOCKFISH_PATH=stockfish
STOCKFISH_VERSION=stockfish-local
ANALYSIS_DEFAULT_DEPTH=12
ANALYSIS_MAX_DEPTH=16
ANALYSIS_DEFAULT_MULTIPV=3
ANALYSIS_MAX_MULTIPV=3
ANALYSIS_TIMEOUT_MS=15000
STOCKFISH_THREADS=1
STOCKFISH_HASH_MB=64
```

`STOCKFISH_VERSION` is optional but recommended for deployed environments because it is part of the position-analysis cache identity. Keep it stable until you intentionally want new engine results.

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

## Backend imported-game analysis

The API can analyze one imported game at a time with server-side Stockfish:

```http
POST /api/imported-games/:gameId/analysis-runs
```

Optional body:

```json
{
  "depth": 12,
  "multipv": 3,
  "force": false
}
```

Saved analysis can be read with:

```http
GET /api/imported-games/:gameId/analysis
```

Behavior:

- The analyze endpoint loads the imported game PGN, expands it into plies, analyzes each played move through the shared position-analysis service, and stores the result.
- `PositionAnalysis` stores the heavy reusable Stockfish result for a concrete position, played move, depth, MultiPV, engine, and classification version.
- `GameAnalysisRun` stores the one-game run metadata and summary.
- `GameMoveAnalysis` stores the game-specific move row and points to `PositionAnalysis`.
- If `force` is false or omitted and a `RUNNING` or `COMPLETED` run already exists for the same imported game, depth, MultiPV, engine name, and engine version, the endpoint returns that run and does not re-analyze.
- If `force` is true, the endpoint creates a new `GameAnalysisRun`; existing `PositionAnalysis` cache rows are still reused.
- Analyze and read endpoints return compact game-analysis reports by default. Full engine lines remain stored in `PositionAnalysis` and should be exposed through a dedicated detail endpoint only when needed.
- Cache hits do not update hit counters; reuse can be derived later from `GameMoveAnalysis.positionAnalysisId` references.

Frontend contract for analysis status:

- The source of truth is `GameAnalysisRun`, not a boolean column on `ImportedGame`.
- Future frontend DTOs may expose an `analysis` summary on imported-game list/detail responses, but that status should be derived from analysis runs.
- Suggested frontend-facing status values are `NOT_ANALYZED`, `RUNNING`, `COMPLETED`, and `FAILED`.
- A game with no analysis runs is `NOT_ANALYZED`.
- A game with a latest `RUNNING` run is `RUNNING`.
- A game with a latest `COMPLETED` run is `COMPLETED`.
- A game with only failed runs is `FAILED`.
- If performance later requires denormalized analysis fields on `ImportedGame`, treat them as a read-model/cache optimization, not the source of truth.

Future opening-book support:

- Stockfish-only classification can mislabel playable theory as an inaccuracy, especially in the opening. For example, a known theoretical move can lose a small number of centipawns at shallow depth but still be a normal book move.
- Future analysis should add `BOOK` to the classification vocabulary before `BEST`, `GOOD`, `INACCURACY`, `MISTAKE`, and `BLUNDER`.
- Opening-book detection should happen before score-loss classification: if `fenBefore + playedMoveUci` is found in the book, classify the move as `BOOK` while still storing engine eval, score loss, and best move.
- Preferred source is a local opening-book table generated from public Lichess game data, not live API calls during game analysis.
- A future minimal table could store `normalizedFen`, `moveUci`, `moveSan`, `source`, `games`, and optional popularity/win-rate fields.
- The book lookup should live behind an `OpeningBookService` or analysis-owned repository boundary so the source can change later without touching game-analysis orchestration.

This is a synchronous MVP endpoint. It is intended for one-game analysis and not yet for account-wide or queued batch analysis.

## Running locally

```bash
npm run dev
```

This starts:

- API on port `3000`
- Angular dev server on port `4200`

Visit `http://localhost:4200`.

Individual services:

```bash
npm run dev:api
npm run dev:web
```

## Build and test

```bash
npm run build
npm run test
```

Current testing status:

- `packages/chess-domain` contains Vitest test files, but the workspace test script is not fully wired yet.
- `apps/api` and `apps/web` currently use placeholder test scripts.
- Treat `npm test` as a lightweight repo check, not full behavioral coverage.

Useful scoped commands:

```bash
npm run build:domain
npm run build:api
npm run build:web
npm run test --workspace=packages/chess-domain
```

## Current stabilization acceptance checklist

From a clean clone, the target is:

1. `npm install` succeeds.
2. `npm run db:migrate` succeeds.
3. `npm run db:seed` succeeds.
4. `npm run build` succeeds.
5. `npm run test` succeeds.
6. `npm run dev` starts API and web.
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

## Migration history

- `apps/api/prisma/migrations/` contains the active PostgreSQL migration history used for Neon and other Postgres environments.
- `apps/api/prisma/legacy-sqlite-migrations/` contains the archived SQLite-era migration that should not be applied to Postgres databases.

## Known limitations

- Active training session state is kept in API memory. Restarting the API loses active sessions.
- Imported-game analysis is synchronous, CPU-bound, and limited to one game per request in this MVP.
- The UI is intentionally basic and needs a dedicated authoring UX pass after stabilization.
- JSON import/export exists but needs versioning and merge/deduplication before it should be trusted as a robust backup system.
- The stats model is simple and not yet a spaced repetition scheduler.
- Mobile, auth, cloud sync, account-wide analysis queues, and full PGN import are future work, not current scope.
