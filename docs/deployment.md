# Hobby deployment guide

This repo is prepared for a split hobby deployment:

- Neon Postgres for the database
- Render Web Service for the Fastify API
- Vercel for the Angular web app
- GitHub Actions for CI only

No Docker, Kubernetes, Helm, Terraform, or deployment-from-CI is required.

## Prerequisites

Use Node 22 and npm 10+ locally and in hosted build environments.

```bash
npm ci
npm run build
npm test
```

## Neon Postgres

1. Create a new Neon project.
2. Create or use the default database.
3. Copy the pooled connection string.
4. Use it as `DATABASE_URL` in Render.
5. For local development, set `DATABASE_URL` to any local Postgres database URL, for example:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chess_trainer_dev"
```

The Prisma datasource is Postgres-only. Local SQLite is no longer supported after this deployment prep.

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

Environment variables:

```bash
DATABASE_URL=<your Neon pooled Postgres URL>
PORT=3000
CORS_ORIGIN=<your Vercel web URL>
NODE_ENV=production
```

Notes:

- Render injects its own port at runtime; keeping `PORT=3000` documented is fine, but Render may override it.
- `CORS_ORIGIN` must match the Vercel frontend origin, such as `https://your-app.vercel.app`.
- The API exposes a simple health check at:

```text
/health
```

Expected response:

```json
{ "ok": true }
```

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

```bash
WEB_API_BASE_URL=<your Render API URL>/api
```

Example:

```bash
WEB_API_BASE_URL=https://your-api.onrender.com/api
```

The web app generates `apps/web/src/app/app-config.ts` before build. In local development it defaults to `/api`, which works with the Angular proxy. In production, set `WEB_API_BASE_URL` to the Render API URL plus `/api`.

## GitHub Actions CI

The CI workflow lives at `.github/workflows/ci.yml`.

It runs on:

- pull requests
- pushes to `main`

It uses Node 22 and runs:

```bash
npm ci
npm run build
npm test
```

CI does not deploy. Render and Vercel deployments should be configured directly in those platforms.

## Local development with Postgres

1. Start a local Postgres database.
2. Export `DATABASE_URL`.
3. Install dependencies.
4. Apply migrations.
5. Start dev servers.

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chess_trainer_dev"
npm ci
npm run db:migrate
npm run dev
```

To reset local data:

```bash
npm run db:reset --workspace=apps/api
```

## Useful build checks

API build:

```bash
npm run build:domain && npm run build:contracts && npm run build:api
```

API start:

```bash
npm run start --workspace=apps/api
```

Vercel-equivalent web build:

```bash
npm ci && npm run build:domain && npm run build:contracts && npm run build:web
```
