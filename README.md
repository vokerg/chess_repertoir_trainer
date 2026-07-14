# Chess Repertoire Trainer

A local-first chess repertoire platform for authoring, training, and reviewing personal opening repertoires. The repository contains a broad Angular web client, a supported React Native / Expo mobile client focused on offline training, a Fastify API, and shared chess/domain contracts.

Repository spelling note: this GitHub repo is named `chess_repertoir_trainer`.

Architecture and operational documentation is indexed in [`docs/README.md`](docs/README.md). Repository instructions for coding agents live in [`AGENTS.md`](AGENTS.md).

## Live app

- Web: https://chess-repertoir-trainer-web.vercel.app/
- API docs, when the API is running: `/api/docs`
- OpenAPI JSON, when the API is running: `/api/docs/openapi.json`

The deployed web app expects `WEB_API_BASE_URL` at build time. The native client is currently a repository-supported Expo application rather than an app-store release.

## Supported clients

### Angular web

The Angular client is the broad product surface. It supports:

- course, chapter, line, and branching move-tree authoring;
- single-line and marathon repertoire training;
- Lichess and Chess.com account import;
- imported-game browsing, filtering, replay, and Stockfish analysis;
- opening analysis, course coverage review, progress dashboards, and tactical missed-shot training;
- Clerk-backed authentication and settings workflows.

### Native mobile

`apps/mobile` is a supported Expo client with a deliberately narrower offline-first scope. The current implementation includes:

- Clerk sign-in with secure token caching;
- authenticated course manifests and downloadable course bundles;
- user-scoped, versioned SQLite storage with atomic course revision activation;
- offline cold-start access to previously downloaded content for the last unlocked user;
- durable single-line training, restart/resume, local review, and early finish;
- a durable attempt outbox with idempotent synchronization to the API;
- course and chapter marathons in All, Weak, Untrained, and Mixed modes;
- durable marathon resume and continuous next-line flow;
- the real `@lichess-org/chessground` board hosted behind an Expo DOM boundary.

Selected-line and selected-subline mobile marathons are not implemented yet. See [Native mobile architecture](docs/mobile/architecture.md) and [Mobile development](docs/mobile/development.md).

## Core model

```text
Course
  Chapter
    Line
      Move tree
```

The database stores real move nodes only. Each line has a `startingFen`; the application derives a synthetic root in memory. Active sublines are current root-to-leaf variations derived from the move tree and identified by a semantic canonical key. Web and mobile training both use the shared serializable training domain for deterministic move validation, opponent auto-play, attempts, completion, and review.

## Project structure

```text
chess-repertoire-trainer/
├── apps/
│   ├── api/             # Fastify API and Prisma/PostgreSQL persistence
│   ├── web/             # Angular product client
│   └── mobile/          # React Native / Expo offline-training client
├── packages/
│   ├── chess-domain/    # Framework-neutral chess and training behavior
│   └── contracts/       # Verified cross-workspace HTTP schemas and DTOs
├── docs/                # Canonical architecture and operational guides
├── spikes/              # Isolated historical/feasibility work
├── .env.example
├── package.json
└── README.md
```

## Prerequisites

Use Node 22.13 or newer for the complete workspace, including Expo. The repo includes `.nvmrc`:

```bash
nvm use
npm install
```

The root is an npm workspace. Focused API, web, and mobile scripts prepare the shared packages they consume.

## API and web configuration

Copy the root example into the API workspace:

```bash
cp .env.example apps/api/.env
```

At minimum, configure PostgreSQL:

```text
DATABASE_URL="postgresql://USER:PASSWORD@YOUR-POOLED-HOST/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@YOUR-DIRECT-HOST/neondb?sslmode=require"
```

For Clerk-backed web and mobile authentication, configure the API and web build with the same Clerk application:

```text
AUTH_MODE=clerk
CLERK_JWT_ISSUER=https://<your-clerk-domain>
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
CLERK_AUTHORIZED_PARTIES=http://localhost:4200
WEB_CLERK_PUBLISHABLE_KEY=pk_test_...
```

The API validates bearer tokens; neither web nor mobile requires a Clerk secret key in client code.

Apply and optionally seed the database:

```bash
npm run db:migrate
npm run db:seed
```

`db:reset` is destructive and resets the configured PostgreSQL database.

## Run API and web

```bash
npm run dev
```

This starts:

- API on `http://localhost:3000`;
- Angular on `http://localhost:4200`.

Focused commands:

```bash
npm run dev:api
npm run dev:web
```

## Run mobile

Create the mobile environment file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Configure:

```text
EXPO_PUBLIC_API_BASE_URL=http://<development-machine-LAN-IP>:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

A physical device cannot use the development machine's `localhost`; the API URL must be reachable from the device. Start the API and Metro separately:

```bash
npm run dev:api
npm run dev:mobile
```

Additional Expo targets:

```bash
npm run ios --workspace=apps/mobile
npm run android --workspace=apps/mobile
npm run web --workspace=apps/mobile
```

The mobile client needs an online Clerk session to download or update courses. Downloaded content, in-progress sessions, completed attempts, marathon runs, and the synchronization outbox are stored in user-scoped SQLite for offline use.

## Mobile synchronization API

```http
GET  /api/mobile-sync/manifest
GET  /api/mobile-sync/courses/:courseId
POST /api/mobile-sync/training-attempts
```

Course content uses monotonic revisions. Completed attempts are uploaded in idempotent batches after the local transaction commits; retries with the same `clientAttemptId` converge safely.

## Build, test, and validation

```bash
npm run build
npm test
npm run lint
npm run check:architecture
```

The root build includes API, Angular, shared packages, and Expo exports for iOS and Android. Useful focused checks:

```bash
npm run build:api
npm run build:web
npm run build:mobile
npm run test:mobile
npm run lint:mobile
npm run expo:check
npm run test:contracts
npm run test --workspace=packages/chess-domain
```

API integration tests require the configured PostgreSQL database. Board interaction, cold-offline behavior, reconnect synchronization, and standalone native behavior still require manual device validation.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Angular architecture](docs/frontend/angular-architecture.md)
- [Native mobile architecture](docs/mobile/architecture.md)
- [Mobile development](docs/mobile/development.md)
- [API conventions](docs/api-conventions.md)
- [API contracts](docs/api-contracts.md)
- [OpenAPI](docs/openapi.md)
- [Deployment](docs/deployment.md)

## Current limitations

- Mobile is an offline repertoire-training client, not a mobile replacement for web authoring, imported games, opening analysis, or Stockfish workflows.
- Selected-line and selected-subline marathons remain a mobile follow-up after the current course/chapter marathon slice.
- Native store distribution, standalone cold-offline validation, physical Android validation, reconnect/lost-response testing, and final Chessground licensing acceptance remain release gates.
- Active web training sessions and prepared web marathon runs are API-memory state and do not survive API restarts.
- Imported-game sync and one-game Stockfish analysis are synchronous MVP workflows rather than queued background jobs.
- Training statistics use active subline hashes and the latest five scored attempts per active subline; this is not yet a spaced-repetition scheduler.
