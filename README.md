# Chess Repertoire Trainer

A personal chess-improvement platform for building and training opening repertoires, connecting real games, analysing recurring problems, and turning the evidence into focused practice.

The repository is an npm-workspace TypeScript modular monolith with:

- an Angular web application in `apps/web`;
- a Fastify API and workers backed by Prisma/PostgreSQL in `apps/api`;
- a supported React Native / Expo offline-training companion in `apps/mobile`;
- framework-neutral chess/training behavior in `packages/chess-domain`;
- shared Zod HTTP contracts in `packages/contracts`.

Repository spelling note: the GitHub repository is named `chess_repertoir_trainer`.

Start with the [documentation index](docs/README.md). Repository-wide agent instructions and command entry points live in [AGENTS.md](AGENTS.md).

## Live app

- Web: https://chess-repertoir-trainer-web.vercel.app/
- API documentation when the API is running: `/api/docs`
- OpenAPI JSON when the API is running: `/api/docs/openapi.json`

The deployed web build expects `WEB_API_BASE_URL`. The Expo client is repository-supported but is not described here as an app-store release.

## Product loop

1. **Build or evolve a repertoire** as courses, chapters, lines, and branching move trees.
2. **Train the repertoire** through focused line sessions or larger marathon scopes.
3. **Connect real games** from Lichess and Chess.com.
4. **Analyse evidence** from games, openings, tactics, ratings, and repertoire coverage.
5. **Use the evidence** in course review, Player Chess Profile, Repertoire Builder, and focused training.
6. **Track daily work** through the server-owned Activity Feed foundation as its producers and Home consumer are completed.

PostgreSQL is the server source of truth. The mobile client additionally keeps downloaded training content, sessions, attempts, and an upload outbox in user-scoped SQLite.

## Current web capabilities

### Home, navigation, and settings

- Signed-in `/home` with continue, recommendation, workspace, and recent-progress surfaces.
- Hierarchical desktop and responsive navigation across Home, Study, Courses, Games, Openings, Progress, Tools, and Settings.
- Clerk-backed login and signup.
- Import-account management, dedicated Lichess OAuth settings, appearance controls, sound packs, and persisted preferences.

### Repertoire authoring and Builder

- Create and manage courses, chapters, lines, and branching move trees from the standard position or a custom FEN.
- Edit and delete local move-tree subtrees while preserving the synthetic in-memory root model.
- Review active root-to-leaf sublines and matching imported-game move evidence.
- Use `/builder` for the authenticated, board-first Repertoire Builder.
- Resolve player level and population targets, use Player Chess Profile defaults, inspect deterministic candidate evidence and ranking, work through a bounded builder session, preview the resulting course change, and apply it explicitly.
- Enter Builder from exact existing-course review findings.
- Present reviewed side-aware opening knowledge as explanatory evidence without making it the ranking or write authority.
- Use optional generated interpretations only through their explicit disabled-by-default feature boundaries.

The canonical current state and residual evidence gate are documented in [Repertoire Builder status](north-star/repertoire-builder/STATUS.md).

### Study and training

- Browse the repertoire hierarchy from `/library`.
- Select individual lines into a training basket.
- Train one line, a course, a chapter, selected lines, or selected active sublines.
- Run All, Weak, Untrained, or Mixed weak/untrained marathon modes.
- Resume active sessions, review attempts, and inspect line/subline health, coverage, mastery, weak counts, and recent results.
- Preserve historical attempts while calculating current statistics from active subline hashes and the latest five scored attempts per subline.

The shared chess domain owns deterministic move validation, fixed-path opponent auto-play, completion, review, and attempt semantics used by web and mobile.

### Imported games and accounts

- Track multiple Lichess and Chess.com accounts.
- Synchronize finished games from either provider.
- Browse `/games` with SQL-backed filtering, cursor pagination, deep-linkable filter state, responsive evidence cards, and durable processing status.
- Filter by account, provider, period/custom dates, result, colour, speed, rated status, opponent, opening, rating, analysis status, classification, tags, and accuracy.
- Open a game review with replay, PGN, indexed plies, analysis context, tactical findings, and optional AI review.
- Run durable imported-game indexing, analysis, tagging, opening assignment, and related post-processing through the persistent worker model.

Compact list projections and richer detail/report projections share selection semantics without using one oversized DTO.

### Analysis, openings, profile, and progress

- Use `/analysis` for free analysis with FEN/PGN input, local variations, move-tree navigation, board controls, and interactive Stockfish.
- Use `/opening-analysis` for position results, next moves, performance evidence, representative games, Masters data, and rated Lichess population evidence.
- Use `/opening-struggles` for poor results, repeated mistakes, and bad-position reporting.
- Use course review to inspect deviations, opponent gaps, and course endings, and continue exact findings into Builder.
- Use `/progress` for account performance, rating history, yearly highs, result summaries, and bounded best-victory/defeat evidence.
- Use `/progress/profile` for the deterministic Player Chess Profile and its evidence/coverage states.

### Tactics, puzzles, and Lab

- Detect missed tactical opportunities, punished opponent blunders, and user blunders from stored analysis.
- Inspect tactical findings in game review and the Tactical Detections Lab.
- Train missed-shot and blunder scenarios from the source position with persisted attempts and evaluation.
- Use `/puzzles` for the persisted Lichess puzzle trainer with server-owned solutions and rated-result synchronization.
- Use `/lab` for experimental or lower-level reports including performance by rating, top opponents, monthly games, training log, and tactical detections.

### Activity Feed foundation

The API currently provides the authenticated Activity Feed ledger, bounded history, today-goal projection, and IANA time-zone preference endpoints. In-app completion producers, imported played-game reconciliation/backfill, and the Home Today checklist remain separately tracked follow-up work.

See [Activity Feed architecture](docs/activity-feed.md) and the [program tracker](north-star/activity-feed/README.md).

## Native mobile companion

`apps/mobile` is a supported Expo client with a narrower offline-first training scope. It can authenticate with Clerk, download owned course revisions, browse user-scoped SQLite content, run durable single-line and course/chapter marathon training offline, resume after restart, and synchronize completed attempts through an idempotent outbox.

It uses `@lichess-org/chessground` behind an Expo DOM boundary. Mobile does not replace web authoring, imported-game exploration, opening analysis, progress dashboards, Repertoire Builder, puzzles, or Stockfish workflows. Selected-line and selected-subline mobile marathons remain outside the current mobile scope.

See [Native mobile architecture](docs/mobile/architecture.md) and [Mobile development](docs/mobile/development.md).

## Core model

```text
Course
  Chapter
    Line
      Move tree
```

The database stores real move nodes only. Each line has a `startingFen`; applications derive a synthetic root in memory. Active sublines are current root-to-leaf variations identified by a semantic canonical key.

## Repository structure

```text
chess-repertoire-trainer/
├── apps/
│   ├── api/             # Fastify API, workers, Prisma/PostgreSQL
│   ├── web/             # Angular product client
│   └── mobile/          # Expo offline-training client
├── packages/
│   ├── chess-domain/    # Framework-neutral chess/training behavior
│   └── contracts/       # Verified HTTP wire schemas and DTOs
├── docs/                # Canonical current-state architecture and operations
├── north-star/          # Active bounded product/program workspaces
├── transformation/      # Visual Transformation records
├── .agents/             # Agent commands and focused skills
├── .github/             # Path instructions, reusable skills, workflows
├── AGENTS.md            # Repository-wide agent entry point
├── CHANGELOG.md         # Daily development snapshots
└── TRANSFORMATION.md    # Stable Visual Transformation entry point
```

## Setup

Use Node 22.12 or newer and npm 10 or newer:

```bash
nvm use
npm install
```

Copy the root environment example for the API:

```bash
cp .env.example apps/api/.env
```

At minimum configure PostgreSQL:

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

Apply and optionally seed the database:

```bash
npm run db:migrate
npm run db:seed
```

`db:reset` is destructive.

## Run API and web

```bash
npm run dev
```

This starts the API on `http://localhost:3000` and Angular on `http://localhost:4200`.

Focused processes:

```bash
npm run dev:api
npm run dev:worker
npm run dev:web
```

After changing `apps/api/prisma/schema.prisma`, stop API/worker processes and run the workspace Prisma-generation command before restarting them.

## Run mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Configure a device-reachable API URL and Clerk publishable key:

```text
EXPO_PUBLIC_API_BASE_URL=http://<development-machine-LAN-IP>:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Then run API and Metro separately:

```bash
npm run dev:api
npm run dev:mobile
```

A physical device cannot reach the development machine through its own `localhost`.

## Build and validation

```bash
npm run build
npm test
npm run lint
npm run check:architecture
```

Useful focused checks:

```bash
npm run build:api
npm run build:web
npm run build:mobile
npm run test:contracts
npm run test:mobile
npm run lint:mobile
npm run expo:check
npm run test --workspace=packages/chess-domain
```

API integration tests require the configured PostgreSQL database. Native board interaction, cold-offline behavior, reconnect synchronization, and standalone device behavior still require appropriate device validation.

## Documentation and active programs

- [Documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Angular architecture](docs/frontend/angular-architecture.md)
- [API conventions](docs/api-conventions.md)
- [Deployment](docs/deployment.md)
- [Repertoire Builder](north-star/repertoire-builder/README.md)
- [Onboarding and data lifecycle](north-star/onboarding/README.md)
- [Activity Feed and Daily Momentum](north-star/activity-feed/README.md)
- [Visual Transformation](TRANSFORMATION.md)
- [Daily changelog](CHANGELOG.md)

## Current limitations

- Activity producers, played-game reconciliation/backfill, and the Home Today checklist are not complete beyond the ACT-001 ledger/API foundation.
- Onboarding and data-lifecycle implementation is in progress; planning and accepted contracts are ahead of the complete first-use runtime.
- Repertoire Builder outcome evaluation remains blocked on sufficient real usage and follow-up-game evidence.
- Visual Transformation route-family rollout and inventory are complete; final onboarding, empty-state, accessibility, and responsive polish remain in VT-302.
- Mobile remains an offline repertoire-training companion rather than a replacement for the full web product.
- Active web training sessions and prepared web marathon runs are API-memory state and do not survive API restarts.
- Training statistics use active subline hashes and the latest five scored attempts per active subline; this is not yet a spaced-repetition scheduler.
