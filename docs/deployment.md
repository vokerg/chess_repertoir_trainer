# Hobby deployment guide

The hosted web/API stack is prepared for a split hobby deployment:

- Neon Postgres for the API database;
- Render Web Service for the Fastify API;
- Render Background Worker for persistent imported-game jobs;
- Vercel for the Angular web app;
- GitHub Actions for CI only.

The native Expo client is built from `apps/mobile` and connects to the same deployed API, but app-store distribution is not automated by the current repository.

No Docker, Kubernetes, Helm, Terraform, or deployment-from-CI is required.

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

Add the provider, OAuth, and Stockfish variables used by the enabled product features; `.env.example` is the source list.

Notes:

- Render injects its own port at runtime; it may override the documented value.
- `CORS_ORIGIN` must match the deployed Angular origin. Native requests are not browser CORS requests.
- Mobile and web must use the same Clerk application that the API issuer/JWKS values validate.
- The API exposes a health check at `/health` with `{ "ok": true }`.
- The API process does not start the persistent-job worker loop.

## Render persistent-job worker setup

Create a separate Render **Background Worker** from the same repository and commit as the API service.

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

The worker now executes all four imported-game job kinds. Analysis and complete-processing jobs require Stockfish configuration in the worker environment:

```text
LOCAL_BATCH_STOCKFISH_ANALYSIS_ENABLED=true
STOCKFISH_ENGINE=local
STOCKFISH_PATH=<path to worker Stockfish binary>
STOCKFISH_ANALYSIS_DEPTH=12
STOCKFISH_ANALYSIS_TIMEOUT_MS=15000
```

`STOCKFISH_ENGINE=wasm` can be used instead when that runtime is preferred. A local-engine deployment must install or otherwise provide the configured Stockfish binary inside the worker environment. `INDEX_GAMES` and `REFRESH_TAGS` themselves are engine-free, but the worker uses one shared executor registry, so disabling local batch analysis causes `ANALYSE_GAMES` and `PROCESS_GAMES` tasks to fail clearly rather than remain silently queued.

Each claimed analysis or processing task creates and disposes one engine instance. Keep the worker as one process initially so analysis remains single-task per process. PostgreSQL locking supports multiple worker processes, but Stockfish CPU/memory sizing must be validated before horizontal scaling.

Worker timing defaults are listed in `.env.example`:

```text
JOB_WORKER_POLL_INTERVAL_MS=1000
JOB_WORKER_HEARTBEAT_INTERVAL_MS=30000
JOB_WORKER_STALE_AFTER_MS=900000
JOB_WORKER_STALE_RECOVERY_INTERVAL_MS=60000
JOB_WORKER_SLICE_SIZE=25
JOB_WORKER_SHUTDOWN_TIMEOUT_MS=30000
```

The stale timeout must remain more than twice the heartbeat interval. The platform shutdown grace period should be at least `JOB_WORKER_SHUTDOWN_TIMEOUT_MS`; shutdown aborts the active executor, disposes its engine, and releases the fenced task claim when possible.

Run Prisma migrations once per deployment release, normally in the API build command or a dedicated release command. Do not run migrations independently from every worker replica.

The API-process batch-analysis queue remains temporarily for compatibility, but it delegates to the same processing and analysis services as the persistent worker. It is removed only after the remaining API/frontend flows submit persisted jobs.

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
5. Start API/web and, when needed, the worker and Expo.

```bash
npm ci
npm run db:migrate
npm run dev
```

Run the worker in another terminal:

```bash
npm run dev:worker
```

To execute analysis-backed jobs locally, enable batch Stockfish and ensure the selected engine is available in the worker terminal environment.

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
