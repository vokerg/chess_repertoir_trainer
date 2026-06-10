# Architecture

This monorepo contains the Fastify API, Angular web app, and shared chess-domain code.

```text
apps/
  api/    Fastify + Prisma
  web/    Angular
packages/
  chess-domain/  pure chess and training logic
  contracts/     scaffolded API contracts; not wired into the workspace
```

## Current API structure

`apps/api/src/routes/index.ts` is the route composition source of truth. It currently registers these feature modules:

```text
apps/api/src/modules/
  analysis/              engine and imported-game analysis
  courses/               courses, chapters, lines, and move nodes
  imported-games/        game browsing, facets, PGN, and opening data
  lab/                   exploratory game reports
  repertoire-coverage/   course review against imported games
  stats/                 summary, line, and course statistics
  training/              line training sessions
  training-marathons/    marathon next-item workflow
```

The API is only partly migrated to feature modules. These registered routes remain global:

- `routes/externalAccounts.ts` owns current-user accounts and provider sync endpoints.
- `routes/importExport.ts` owns JSON import/export endpoints.
- `routes/swagger.ts` serves API documentation.

Several modules also still call services under `apps/api/src/services`. This is accepted legacy debt, not the preferred structure for new features. Do not invent `games` or `importers` modules in documentation until those boundaries exist in code.

The imported-games module has a feature-local query service that shares filtering and pagination semantics across backend consumers while keeping REST response mapping in `ImportedGamesService`.

MCP is a backend transport under `apps/api`; its read-only tools call feature/application services directly rather than calling REST endpoints.

For new backend work, extend the owning directory under `apps/api/src/modules` when one exists. Keep routes thin and place feature orchestration and Prisma access next to the owning module where practical. Make narrow changes to legacy global code when that is safer than an unrelated migration; do not copy the global layout into new features.

## Boundaries

- `apps/web` owns Angular UI, feature state, and frontend data access.
- `apps/api` owns HTTP routes, application workflows, provider integration, and Prisma access.
- `packages/chess-domain` stays framework- and infrastructure-free.
- `packages/contracts` is scaffolded future work and must not be treated as an active shared dependency.

Frontend conventions and accepted debt are documented under `docs/frontend`.
