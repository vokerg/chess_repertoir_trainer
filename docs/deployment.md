# Hobby deployment guide

This document keeps the existing Neon/Render/Vercel deployment path intact. A manual single-image Docker/Oracle-style VM deployment is available as a parallel alternative in [Manual Docker deployment](docker-manual-deployment.md); it does not replace or automatically deploy this hosted setup.

The hosted web/API stack is prepared for a split hobby deployment:

- Neon Postgres for the API database;
- Render Web Service for the Fastify API;
- Render Background Worker for persistent imported-game jobs and durable account imports;
- Vercel for the Angular web app;
- GitHub Actions for CI only.

The native Expo client is built from `apps/mobile` and connects to the same deployed API, but app-store distribution is not automated by the current repository.

The Render/Vercel path does not require Docker, Kubernetes, Helm, Terraform, or deployment from CI.

## Prerequisites

Use Node 22.13 and npm 10+ locally and in build environments that compile the complete workspace.

```bash
npm ci
npm run build
npm test
```

Hosted API, worker, and web builds should use the focused commands documented below so they do not perform unnecessary native exports.

## Neon Postgres

1. Create a new Neon project.
2. Create or use the default database.
3. Copy the pooled and direct connection strings.
4. Use the pooled URL as `DATABASE_URL` at API and worker runtime.
5. Use the direct URL as `DIRECT_URL` for Prisma migrations.

For local API development, either URL may point to local PostgreSQL, for example:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chess_trainer_dev"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/chess_trainer_dev"
```

The Prisma/API datasource is Postgres-only. The native client separately uses device-local SQLite for downloaded content, offline training, marathon runs, and its synchronization outbox.

## Render API setup

Create a Render **Web Service** for the API.

Settings:

- Root directory: `.`
- Build command:

```bash
npm ci && npm run build:domain && npm run build:contracts && npm run build:api && npm run db:migrate
```

- Start command:

```bash
npm run start --workspace=apps/api
```

Core environment variables:

```text
DATABASE_URL=<Neon pooled Postgres URL>
DIRECT_URL=<Neon direct Postgres URL>
PORT=3000
CORS_ORIGIN=<Vercel web origin>
NODE_ENV=production
AUTH_MODE=clerk
CLERK_JWT_ISSUER=https://<your-clerk-domain>
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
CLERK_AUTHORIZED_PARTIES=<Vercel web origin>
```

Add the provider and OAuth variables used by the enabled product features; `.env.example` is the source list. Stockfish and persistent-worker tuning belong on the worker service rather than the API service.

Notes:

- Render injects its own port at runtime; it may override the documented value.
- `CORS_ORIGIN` must match the deployed Angular origin. Native requests are not browser CORS requests.
- Mobile and web must use the same Clerk application that the API issuer/JWKS values validate.
- The API exposes a health check at `/health` with `{ "ok": true }`.
- The API process does not start persistent worker loops or execute imported-game/account-import work.

## Render persistent-job worker setup

Create a separate Render **Background Worker** from the same repository and commit as the API service. This process is required when the application accepts imported-game indexing, analysis, processing, tag-refresh jobs, or durable account imports.

Settings:

- Root directory: `.`
- Build command:

```bash
npm ci && npm run build:domain && npm run build:contracts && npm run build:api
```

- Start command:

```bash
npm run start:worker --workspace=apps/api
```

The worker needs the same `DATABASE_URL`, `DIRECT_URL`, and `NODE_ENV` values as the API. It does not need `PORT`, CORS, Clerk JWT verification, or browser-origin settings because it does not serve HTTP traffic.

The worker executes all four imported-game job kinds. Analysis and complete-processing jobs require Stockfish configuration in the worker environment:

```text
LOCAL_BATCH_STOCKFISH_ANALYSIS_ENABLED=true
STOCKFISH_ENGINE=local
STOCKFISH_PATH=<path to worker Stockfish binary>
STOCKFISH_ANALYSIS_DEPTH=12
STOCKFISH_ANALYSIS_TIMEOUT_MS=15000
```

`STOCKFISH_ENGINE=wasm` can be used instead when that runtime is preferred. A local-engine deployment must install or otherwise provide the configured Stockfish binary inside the worker environment. `INDEX_GAMES` and `REFRESH_TAGS` themselves are engine-free, but the worker uses one shared executor registry, so disabling local batch analysis causes `ANALYSE_GAMES` and `PROCESS_GAMES` tasks to fail clearly rather than remain silently queued.

Each claimed analysis or processing task creates and disposes one engine instance. Keep the worker as one process initially so analysis remains single-task per process. PostgreSQL locking supports multiple worker processes, but Stockfish CPU/memory sizing must be validated before horizontal scaling.

Imported-game worker timing and retention defaults are listed in `.env.example`:

```text
JOB_WORKER_POLL_INTERVAL_MS=1000
JOB_WORKER_HEARTBEAT_INTERVAL_MS=30000
JOB_WORKER_STALE_AFTER_MS=900000
JOB_WORKER_STALE_RECOVERY_INTERVAL_MS=60000
JOB_WORKER_TERMINAL_RETENTION_DAYS=30
JOB_WORKER_SLICE_SIZE=25
JOB_WORKER_SHUTDOWN_TIMEOUT_MS=30000
```

The stale timeout must remain more than twice the heartbeat interval. The platform shutdown grace period should be at least `JOB_WORKER_SHUTDOWN_TIMEOUT_MS`; that budget covers executor abort, retained cancellation leases, terminal-retention work, and Prisma disconnection. The worker exits unsuccessfully if complete cleanup exceeds the budget.

The account-import loop runs in the same worker process but uses its own PostgreSQL `ImportRun` claim/work-key lifecycle rather than `JobRun`/`JobTask`. Its initial single-executor defaults are:

```text
ACCOUNT_IMPORT_WORKER_POLL_INTERVAL_MS=1000
ACCOUNT_IMPORT_WORKER_HEARTBEAT_INTERVAL_MS=15000
ACCOUNT_IMPORT_WORKER_STALE_AFTER_MS=120000
ACCOUNT_IMPORT_WORKER_STALE_RECOVERY_INTERVAL_MS=30000
ACCOUNT_IMPORT_WORKER_SHUTDOWN_TIMEOUT_MS=30000
ACCOUNT_IMPORT_WORKER_BACKLOG_RUN_THRESHOLD=20
ACCOUNT_IMPORT_WORKER_BACKLOG_AGE_MS=300000
ACCOUNT_IMPORT_WORKER_BACKLOG_SUSTAINED_MS=300000
```

Account-import stale-after must also remain more than twice its heartbeat interval. Backlog telemetry warns when oldest queue age exceeds five minutes, or when more than 20 queued runs persist for five minutes. The worker registers both bounded Lichess and Chess.com account-import executors. It also reconciles persisted account-import/preparation handoff and post-completion account projections; these are restart-safe database scans rather than in-memory completion notifications. A deployment that accepts account refreshes therefore **must** have this worker version running.

### Account-import cutover rollout and rollback

The normal account refresh endpoint now returns `202 Accepted` after persisting a durable import; it no longer performs provider traversal inside the HTTP request. Roll out this cutover in this order:

1. Apply the database migrations and deploy the worker version that understands durable account imports, both provider executors, preparation handoff, and post-completion reconciliation.
2. Verify the worker is healthy and can claim durable import rows before exposing the new API behavior.
3. Deploy the API version whose account refresh/backfill routes persist `AccountImportRun` commands.
4. Deploy the Angular account page that restores persisted import state and uses pause/resume/cancel/retry commands.

Do not deploy the API cutover ahead of the worker. An accepted import is intentionally durable and may remain queued while a worker is unavailable, but production rollout should not create an avoidable backlog of user-visible accepted work.

Compatibility boundaries during this phase:

- `POST /api/me/accounts/:id/sync` is the compatibility refresh URL, but now returns a durable import run with `202` and performs no provider I/O in HTTP.
- `POST /api/me/accounts/:id/backfill` queues the next bounded three-month historical range without rewinding forward coverage.
- deprecated `POST /api/me/accounts/:id/reset-cursor` is a safe alias for the same bounded backfill operation; it no longer mutates the legacy `syncCursorTime` field.
- immediate `DELETE /api/me/accounts/:id` is temporarily disabled with `409` until the ONB-020 destructive lifecycle coordinator replaces the old unfenced cascade.
- `ExternalAccount.lastSyncAt` / `lastSyncRunId` remain compatibility projections of the latest completed forward import; historical backfill does not advance them.

Rollback must preserve already accepted durable work. If durable imports have been accepted, keep the compatible worker running until those imports and linked preparation work are terminal or explicitly paused/cancelled. Do not roll the API back to the former synchronous-provider implementation while durable work for the same accounts is still active. The old Angular account page is also incompatible with the new `202` response shape, so API and web rollback should be coordinated only after durable work is drained. Database migrations are forward-compatible persistence for retained import/preparation history and should not be reverted as an application rollback mechanism.

Operational verification after deploy should include:

- account refresh returns `202` quickly and a persisted run remains visible after reload;
- the worker claims the run and provider progress advances without an open browser session;
- an unlinked user-action import is attached to an `EXPANSION` preparation target, or waits durably while another preparation run for that user is active;
- completed imports eventually refresh rating/account sync projections from persisted state;
- worker backlog warnings remain below the configured count/age thresholds.

Terminal job retention runs at worker startup and hourly. It removes only terminal imported-game jobs whose `completedAt` is older than `JOB_WORKER_TERMINAL_RETENTION_DAYS`; task rows are deleted by cascade. Active jobs and account-import history are never removed by that retention pass.

Run Prisma migrations once per deployment release, normally in the API build command or a dedicated release command. Do not run migrations independently from every worker replica.

## Vercel web setup

Create a Vercel project for the Angular web app.

Settings:

- Root directory: `.`
- Build command:

```bash
npm ci && npm run build:domain && npm run build:contracts && npm run build:web
```

- Output directory:

```text
dist/apps/web
```

Environment variables:

```text
WEB_API_BASE_URL=https://<your-api-host>/api
WEB_CLERK_PUBLISHABLE_KEY=pk_...
```

The web build generates `apps/web/src/app/app-config.ts`. In local development the API base defaults to `/api`, which works with the Angular proxy; production must use the deployed API URL.

## Native mobile configuration and distribution

Create the Expo environment from the workspace example:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

For a deployed API:

```text
EXPO_PUBLIC_API_BASE_URL=https://<your-api-host>
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

The API base may include `/api`; the client normalizes both forms. The Clerk publishable key must belong to the same application configured on the API.

Repository compile/export gate:

```bash
npm run build:mobile
```

This runs Expo exports for iOS and Android into `apps/mobile/dist`. It does not configure signing, EAS, store metadata, review submission, or release promotion. Treat store distribution as incomplete until the manual gates in [Mobile development](mobile/development.md) are completed.

## GitHub Actions CI

The CI workflow lives at `.github/workflows/ci.yml` and runs on pull requests and pushes to `main`.

The root checks include the native workspace:

```bash
npm ci
npm run build
npm test
```

CI does not deploy. Render and Vercel deployments should be configured directly in those platforms, and native distribution remains a separate manual release workflow.

## Local development with Postgres

1. Start a local PostgreSQL database.
2. Configure `apps/api/.env`.
3. Install dependencies.
4. Apply migrations.
5. Start the API and web app.
6. Start the worker in a separate terminal before submitting imported-game jobs or durable account imports.

```bash
npm ci
npm run db:migrate
npm run dev
```

Worker terminal:

```bash
npm run dev:worker
```

To execute analysis-backed jobs locally, enable batch Stockfish and ensure the selected engine is available in the worker terminal environment. Durable Lichess and Chess.com account imports are executed only by this worker process; the API merely persists accepted commands.

Mobile also runs separately:

```bash
npm run dev:mobile
```

For a physical device, `EXPO_PUBLIC_API_BASE_URL` must use a URL reachable from that device rather than the development machine's `localhost`.

To reset API data:

```bash
npm run db:reset --workspace=apps/api
```

This does not clear device-local mobile SQLite. Clearing or reinstalling the native app is a separate destructive local-data action.

## Useful focused checks

```bash
npm run build:domain
npm run build:contracts
npm run build:api
npm run build:web
npm run build:mobile
npm run test:mobile
npm run lint:mobile
npm run expo:check
```
