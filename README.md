# Chess Repertoire Trainer

A personal chess improvement platform for building opening repertoires, training them, connecting real games, analysing recurring problems, and turning those findings into focused practice.

The repository contains a broad Angular web application, a Fastify API backed by PostgreSQL, shared chess and HTTP-contract packages, and a supported React Native / Expo companion client for offline repertoire training.

Repository spelling note: this GitHub repo is named `chess_repertoir_trainer`.

Architecture and operational documentation is indexed in [`docs/README.md`](docs/README.md). Repository instructions for coding agents live in [`AGENTS.md`](AGENTS.md).

## Live app

- Web: https://chess-repertoir-trainer-web.vercel.app/
- API docs, when the API is running: `/api/docs`
- OpenAPI JSON, when the API is running: `/api/docs/openapi.json`

The deployed web app expects `WEB_API_BASE_URL` at build time. The native client is currently a repository-supported Expo application rather than an app-store release.

## What the platform does

The main product loop is:

1. **Build a repertoire** as courses, chapters, lines, and branching move trees.
2. **Train active variations** as individual lines or larger marathon scopes.
3. **Connect real games** from Lichess and Chess.com accounts.
4. **Review and analyse** games, openings, tactical moments, and repertoire coverage.
5. **Use the findings** to improve the repertoire and choose focused training.

The API and shared packages support both clients without coupling their UI implementations. PostgreSQL remains the server source of truth; the mobile client additionally keeps downloaded training data and pending attempts in device-local SQLite.

## Web application

The responsive Angular client is the primary and broadest product surface.

### Repertoire authoring

- Create and manage courses, chapters, and lines.
- Build branching move trees from the standard position or a custom starting FEN.
- Choose whether a line is trained as White or Black.
- Edit and delete local move-tree subtrees while preserving the synthetic in-memory root model.
- Inspect the active root-to-leaf sublines derived from each move tree.
- Use next-move evidence from matching imported games while editing a repertoire position.
- Review how imported games overlap with a course and identify trained-side deviations or missing opponent replies.

The main authoring routes are `/courses`, `/courses/:courseId`, `/chapters/:chapterId/lines`, and `/lines/:lineId/edit`.

### Repertoire study and training

- Use `/library` as the Study planner for browsing the repertoire hierarchy and current training summaries.
- Select individual lines into a training basket before starting a focused marathon.
- Train a single line, a whole course, a whole chapter, selected lines, or selected active sublines.
- Choose **All**, **Weak**, **Untrained**, or **Mixed weak/untrained** marathon modes.
- Resume active line sessions, review completed attempts, and finish a line early when needed.
- Inspect line and subline health, coverage, mastery, weak counts, and recent results.
- Keep historical attempts while calculating current statistics only from active subline hashes and the latest five scored attempts per subline.

Web line sessions and prepared marathon runs are intentionally short-lived API state. The shared chess domain owns deterministic move validation, fixed-path opponent auto-play, attempt events, completion, and review semantics.

### Imported games and accounts

- Track multiple Lichess and Chess.com accounts.
- Synchronize finished games from either provider.
- Browse imported games through `/games` with SQL-backed filtering and cursor pagination.
- Filter by account, provider, date, result, user colour, speed, rated/casual status, opponent, opening, rating ranges, analysis status, classification, and accuracy.
- Open a game detail page with replay data, PGN, indexed plies, and analysis context.
- Configure import accounts separately from progress dashboards.
- Connect or disconnect the dedicated Lichess OAuth integration from Settings.

The list API uses compact browser-specific projections; detail, opening reports, course review, Lab reports, and MCP tools reuse the same backend selection semantics without sharing one oversized DTO.

### Analysis and opening review

- Start server-side Stockfish analysis for an imported game and reuse cached position analysis where possible.
- Use `/analysis` as a free analysis board with FEN loading, local variations, move-tree navigation, and interactive Stockfish analysis.
- Explore a position through `/opening-analysis`, including position results, next moves, performance, and representative games under the selected filters.
- Review opening problem areas through `/opening-struggles`.
- Compare imported games with a course through the course review workflow.
- Reuse imported-game move evidence in both opening analysis and the line editor.

Imported-game analysis stores compact reusable position results by default, while interactive analysis can retain richer principal-variation lines.

### Tactical improvement and Lab reports

- Scan analysed games for missed tactical opportunities, punished opponent blunders, and user blunders without rerunning the engine.
- Filter persisted tactical detections by date and kind in the Lab.
- Open the source game and inspect the played move, engine best move, evaluation swing, and surrounding position.
- Turn missed-shot detections into scenario-training sessions that restore the challenge position and evaluate the attempted continuation.
- Use the broader `/lab` area for experimental and lower-level reports that have not yet become first-class product workflows.

### Progress and navigation

- Use `/progress` to open the preferred account dashboard.
- Review rating history, yearly highs, period performance, result summaries, and bounded best-victory and defeat lists.
- Navigate through the product groups **Study**, **Courses**, **Games**, **Openings**, **Progress**, **Tools**, and **Settings**.
- Use the same hierarchical navigation model on desktop and responsive mobile web layouts.
- Authenticate through Clerk-backed sign-up and sign-in routes.

See [Angular architecture](docs/frontend/angular-architecture.md) and [Frontend navigation](docs/frontend/navigation.md) for implementation ownership and route conventions.

## Native mobile companion

`apps/mobile` is a supported Expo client with a narrower offline-first training scope. It can authenticate with Clerk, download owned course revisions, browse them from user-scoped SQLite, run durable single-line and course/chapter marathon training offline, resume after restart, and synchronize completed attempts through an idempotent outbox when connectivity returns.

It uses the real `@lichess-org/chessground` board behind an Expo DOM boundary. Mobile does not currently replace web authoring, imported-game exploration, opening analysis, progress dashboards, or Stockfish workflows. Selected-line and selected-subline mobile marathons are also not implemented yet.

See [Native mobile architecture](docs/mobile/architecture.md) and [Mobile development](docs/mobile/development.md).

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

`dev:api` and `dev:worker` can run together. They reuse the existing Prisma Client rather than regenerating it at process startup. After changing `apps/api/prisma/schema.prisma`, stop both processes and run `npm run db:generate` before starting them again.

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
- [Frontend navigation](docs/frontend/navigation.md)
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
