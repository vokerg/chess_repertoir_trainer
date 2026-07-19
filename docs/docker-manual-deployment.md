# Manual Docker deployment

This guide describes the first manual Docker deployment path for the Angular web app, Fastify API, and persistent job worker. It is a parallel alternative to the existing Render/Vercel environment, not a replacement for it. Oracle Cloud infrastructure and automated deployment are intentionally outside this phase.

One multi-platform image contains the compiled web app, compiled API and shared packages, Prisma runtime, Node 22, and Nginx. Compose creates three containers from that image:

- `web` runs Nginx, serves Angular, and proxies HTTP requests to `api`;
- `api` runs the existing Fastify start command on the internal port `3000`;
- `worker` runs the existing persistent-worker command with WASM Stockfish and exposes no port.

Only `web` publishes a host port. Backend secrets are injected from `deploy/docker/stack.env` when Compose creates the API and worker containers. They are not Docker build arguments, image layers, or GHCR package data. The Clerk publishable key is public browser configuration and is embedded in Angular at image build time.

## Prerequisites

- Docker Engine with the Compose and Buildx plugins;
- a reachable PostgreSQL/Neon database with the required schema;
- a public Clerk publishable key for the web build;
- runtime Clerk, database, OAuth, and encryption values for `stack.env`.

Run commands from the repository root unless noted otherwise.

## Local build

Build only the workspaces included in the image:

```bash
npm run build:domain
npm run build:contracts
npm run build:api
npm run build:web
```

Build a local image. Use a valid publishable key from the Clerk application used for testing; never pass a private key or backend secret as a build argument.

```bash
docker build \
  --build-arg WEB_API_BASE_URL=/api \
  --build-arg WEB_CLERK_PUBLISHABLE_KEY=pk_test_replace_me \
  -t chess-repertoir-trainer:test .
```

The build uses the existing API lifecycle, including Prisma client generation. It does not build or export the Expo application and does not install a native Stockfish executable.

## Local Compose startup

Create the uncommitted runtime file and replace all placeholders with values for the selected database and Clerk application:

```bash
cp deploy/docker/stack.env.example deploy/docker/stack.env
```

Validate the resolved Compose model, then select the local image and start the stack:

```bash
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml config --quiet

IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml up -d
```

Compose defaults to `ghcr.io/vokerg/chess-repertoir-trainer:latest`. `IMAGE_REPOSITORY` is needed only for a differently named local image; `IMAGE_TAG` selects a local or published tag. `WEB_PORT` can override the default host port `8080`.

The quiet Compose validation avoids printing the resolved `env_file` values to the terminal. Omit `--quiet` only when you intentionally need to inspect the complete resolved model.

Local service URLs:

- Frontend: `http://localhost:8080/`
- API health through Nginx: `http://localhost:8080/health`
- OpenAPI: `http://localhost:8080/api/docs/openapi.json`
- Angular deep-link check: `http://localhost:8080/games`

The worker has no URL.

Inspect status and logs:

```bash
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml ps
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml logs api worker web
```

The API should become `healthy`. Worker logs should contain `Persistent job worker started`. The `PORTS` column must show a host mapping only for `web`.

Verify environment boundaries without printing any secret value:

```bash
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml exec api \
  node -e "console.log(Boolean(process.env.DATABASE_URL))"
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml exec worker \
  node -e "console.log(Boolean(process.env.DATABASE_URL), process.env.STOCKFISH_ENGINE)"
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml exec web \
  sh -c 'test -z "$DATABASE_URL"'
```

To exercise graceful SIGTERM handling, stop the backend processes and inspect their final logs. Compose allows 45 seconds, which is longer than the default worker shutdown budget.

```bash
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml stop api worker
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml logs --tail=50 api worker
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml up -d api worker
```

Shut down the local stack:

```bash
IMAGE_REPOSITORY=chess-repertoir-trainer IMAGE_TAG=test \
  docker compose -f deploy/docker/compose.yml down
```

## Database migrations

Containers do not run Prisma migrations during normal startup. While Docker and Render share Neon, the existing Render release may continue to own migrations.

If a release requires a manual migration, coordinate ownership first and run the following release operation exactly once from the selected image:

```bash
IMAGE_TAG=<git-commit-sha> \
  docker compose -f deploy/docker/compose.yml run --rm --no-deps --user root api \
  npm run db:migrate --workspace=apps/api
```

The release container uses `root` because the existing migration lifecycle regenerates the Prisma client after applying migrations and therefore writes to its ephemeral `node_modules`. The long-running API and worker containers still run as the non-root `node` user. Do not run this command independently for the API and worker or on every container restart.

## Manual multi-platform publishing to GHCR

Create a GitHub personal access token with permission to write packages, or use another short-lived credential with equivalent access. Keep it outside the repository and pass it through standard input:

```bash
export GHCR_USER=<github-username>
read -s GHCR_TOKEN
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
unset GHCR_TOKEN
```

Create or select a Buildx builder, capture the exact commit, then build and push both immutable and moving tags for `linux/amd64` and `linux/arm64`:

```bash
docker buildx create --name chess-trainer-builder --use 2>/dev/null || \
  docker buildx use chess-trainer-builder
docker buildx inspect --bootstrap

GIT_COMMIT_SHA=$(git rev-parse HEAD)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg WEB_API_BASE_URL=/api \
  --build-arg WEB_CLERK_PUBLISHABLE_KEY=pk_live_replace_me \
  --tag ghcr.io/vokerg/chess-repertoir-trainer:latest \
  --tag "ghcr.io/vokerg/chess-repertoir-trainer:${GIT_COMMIT_SHA}" \
  --push .
```

The image name intentionally uses `chess-repertoir-trainer`, while the OCI source label points to the repository `vokerg/chess_repertoir_trainer`. After the first push, the package owner can change the GHCR package visibility to public in GitHub package settings. Until then, each machine that pulls it must authenticate without storing credentials in this repository.

No GitHub Actions publishing or deployment workflow is part of this manual phase.

## Manual deployment to a remote VM

Install Docker Engine plus the Compose plugin on the VM. Copy `deploy/docker/compose.yml` and `deploy/docker/stack.env.example` to a deployment directory; application source code is not required. If the package is private, authenticate the VM to GHCR using the standard-input login method above.

Create `stack.env` beside `compose.yml`, restrict it to its owner, and replace every placeholder. Production URLs should use the public HTTPS origin that terminates in front of port 80/`WEB_PORT`; database URLs should use the intended Neon pooled and direct endpoints.

```bash
cp stack.env.example stack.env
chmod 600 stack.env
editor stack.env
```

Pull and start an immutable commit-SHA release:

```bash
export IMAGE_TAG=<git-commit-sha>
docker compose -f compose.yml pull
docker compose -f compose.yml up -d
docker compose -f compose.yml ps
docker compose -f compose.yml logs --tail=100 api worker
```

Verify from the VM and from an external client as appropriate:

```bash
curl --fail http://127.0.0.1:${WEB_PORT:-8080}/health
curl --fail http://127.0.0.1:${WEB_PORT:-8080}/api/docs/openapi.json >/dev/null
docker compose -f compose.yml ps api worker
docker compose -f compose.yml logs --tail=100 worker
```

API health is verified by both the Compose `healthy` state and `/health`. Worker health is verified by a running container plus the `Persistent job worker started` log entry; it intentionally has no HTTP health endpoint or published port.

## Manual update and rollback

Publish the new image first. On the VM, select its immutable tag, pull it, and recreate the services:

```bash
export IMAGE_TAG=<new-git-commit-sha>
docker compose -f compose.yml pull
docker compose -f compose.yml up -d
docker compose -f compose.yml ps
docker compose -f compose.yml logs --tail=100 api worker
```

If verification fails, roll back by selecting the previous commit-SHA tag and recreating the stack:

```bash
export IMAGE_TAG=<previous-git-commit-sha>
docker compose -f compose.yml pull
docker compose -f compose.yml up -d
docker compose -f compose.yml ps
```

Rollback changes application containers only. A database migration may not be backward-compatible, so assess migration compatibility before every release and rollback.
