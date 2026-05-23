# Chess Repertoire Trainer

This repository contains a full‑stack web application for authoring and training your own chess repertoire.  It is inspired by platforms like Chessable but is designed for offline, personal use.  You can create courses and chapters, build move trees for individual lines, and train them with a randomized opponent reply.  All data is stored locally in a SQLite database via Prisma.

## Features

* **Course, chapter and line management** – Organise your repertoire into courses (e.g. “My White Repertoire”), chapters (e.g. “1.e4”), and lines (e.g. “Italian Game”).
* **Tree‑based authoring** – Build lines interactively by clicking legal moves on a chessboard.  Opponent replies can branch; the trained side may only have one correct move per position.  Comments, annotations, and branch labels can be added to nodes via API.
* **Randomised training** – Start a training session on a line.  The server randomly chooses opponent replies from the tree and requires you to play the correct user move.  Feedback is provided immediately and statistics are tracked automatically.
* **Statistics dashboard** – See overall progress, including total courses, lines, training sessions, and your weakest lines based on failure rate.
* **JSON import/export** – Backup and restore your entire repertoire including courses, chapters, lines, move trees and training sessions.
* **Local‑first** – Uses SQLite for storage and runs entirely on your machine.  No authentication or external services are required.

## Project structure

The repository uses an npm workspace/monorepo layout:

```
chess-repertoire-trainer/
├── apps/
│   ├── api/            # Fastify/Prisma backend
│   └── web/            # Angular frontend
├── packages/
│   └── chess-domain/   # Pure TypeScript domain library for chess logic
├── data/               # Empty folder to store SQLite database files (ignored by Git)
├── .env.example        # Sample environment variables
├── .gitignore          # Ignores node_modules, build output, DB files, etc.
├── package.json        # Root workspace configuration and scripts
├── tsconfig.base.json  # Shared TypeScript configuration
├── eslint.config.js    # ESLint configuration
├── prettier.config.js  # Prettier formatting configuration
└── README.md           # This file
```

### Backend (`apps/api`)

The API is built with **Fastify** and **Prisma**.  It exposes REST endpoints for managing courses, chapters, lines and move nodes, as well as training sessions, statistics and import/export.  Validation is performed with **Zod**.  The Prisma schema can be found in `apps/api/prisma/schema.prisma` and migrations live under `apps/api/prisma/migrations/`.

### Frontend (`apps/web`)

The frontend is an **Angular** application that consumes the API.  It is organised with standalone components, lazy routes and a simple service layer for HTTP calls.  The authoring interface displays a chess board (implemented with `chess.js` and custom CSS) and a move tree.  Training runs on a separate route with immediate feedback.

### Domain package (`packages/chess-domain`)

This package contains all pure chess logic (move tree management, training engine, PGN export, etc.) and has its own unit tests written with **Vitest**.  Both the frontend and backend depend on this package but it is completely independent of Angular and Prisma.

## Prerequisites

* **Node.js** >= 18.0 (the repository uses Node 22 during development)
* **npm** >= 9.0 (pnpm can be used but npm is assumed in scripts)

## Installation

Clone this repository (or unzip the provided archive) and install dependencies:

```bash
npm install
```

> The first install will create `node_modules/` inside each workspace.  The `packages/chess-domain` package will be built automatically by the TypeScript compiler on demand.

## Environment configuration

Copy `.env.example` to `.env` and adjust values if necessary.  At minimum set the `DATABASE_URL` for Prisma:

```bash
cp .env.example .env
```

The default `.env.example` points Prisma at `file:./data/dev.db`, which will create a SQLite database in the `data/` folder.  Do not commit your local `.db` files to Git.

## Database migrations and seeding

Before running the API for the first time you should apply the Prisma migrations and seed the database with example data:

```bash
# Apply migrations (creates the database file and tables)
npm run db:migrate

# Insert sample course/chapter/line with a small move tree
npm run db:seed
```

If you need to wipe your local database and start over, you can run:

```bash
npm run db:reset
```

This will delete the `dev.db` file under `data/` and rerun migrations and seed.

## Running the application

To start both backend and frontend during development run:

```bash
npm run dev
```

This command uses `concurrently` to launch the Fastify API (on port `3000` by default) and the Angular dev server (on port `4200`).  The Angular dev server proxies `/api` requests to the backend via `apps/web/proxy.conf.json`.

Alternatively, you can run them individually:

```bash
# Backend only
npm run dev:api

# Frontend only
npm run dev:web
```

Visit `http://localhost:4200` in your browser to use the application.  You should be able to create courses, chapters and lines, build move trees by clicking on the board, and train them.

## Scripts

The root `package.json` defines a number of useful scripts:

| Script | Description |
|-------|-------------|
| `npm run dev` | Run API and web dev servers concurrently |
| `npm run dev:api` | Run only the Fastify API (uses ts-node-dev) |
| `npm run dev:web` | Run only the Angular dev server |
| `npm run build` | Build both API and web for production |
| `npm run test` | Run unit tests in the chess-domain package (and placeholder tests for API/web) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:reset` | Delete the SQLite DB and recreate it with seed data |
| `npm run prisma:studio` | Launch Prisma Studio to inspect the DB |

You can also run scripts scoped to a specific workspace with `--workspace=...`, for example:

```bash
npm run build --workspace=apps/api
npm run dev --workspace=apps/web
```

## SQLite database

The SQLite database file is stored under the `data/` folder.  The file is ignored by Git so that your personal repertoire and training history remain local.  To move the database file elsewhere, modify the `DATABASE_URL` in your `.env` file.

## Export/import

You can export all courses, chapters, lines and move nodes as a JSON backup:

```bash
curl http://localhost:3000/api/export/json -o backup.json
```

To restore from a backup:

```bash
curl -X POST -H "Content-Type: application/json" --data-binary @backup.json http://localhost:3000/api/import/json
```

> Import currently always creates new entities and does not deduplicate by name.  Training sessions are not imported.

## Known limitations and future work

* The authoring UI is functional but basic.  Future improvements could include move annotations, branch labels, drag‑and‑drop piece movement, keyboard shortcuts and improved styling.
* Training sessions are stored in memory while active.  If the server is restarted during a session, progress is lost.
* Statistics dashboards are simple and could be extended to show more insights (e.g. per‑move accuracy).
* JSON import/export does not yet deduplicate or merge existing data and does not include versioning for future schema changes.
* Mobile view is not optimised.  The code has been structured so a future mobile app can share the `chess-domain` package.

## Contributing and feedback

This is a personal project scaffold and is not intended for production use.  Feel free to customise it further, add authentication, cloud sync or advanced spaced repetition algorithms as needed.# chess_repertoir_trainer
