# Architecture boundaries

This repo stays a monorepo, but code should be grouped by product feature rather than only by technical layer.

## Top-level shape

```text
apps/
  api/    Fastify + Prisma application
  web/    Angular application
packages/
  chess-domain/  pure chess and training logic
  contracts/     shared DTO/schema scaffold, not wired into workspaces yet
```

`packages/contracts` is intentionally scaffold-only in this refactor. It is not added to the root workspaces yet because CI uses `npm ci`, so wiring it in should happen together with a regenerated lockfile.

## API modules

Feature code should live under `apps/api/src/modules`.

Current target modules:

```text
modules/
  courses/       course, chapter, line, move-node authoring
  training/      training sessions and attempts
  games/         linked accounts, imported games, import runs
  importers/     provider-specific importers such as Lichess
  stats/         reporting and aggregated read models
  import-export/ JSON backup/import flows
```

Rules:

- Module routes compose feature endpoints.
- Module services own business orchestration for that feature.
- Module repositories hide Prisma calls for that feature.
- Cross-module access should go through public module exports or explicit ports, not deep imports.
- Infrastructure code may compose modules, but modules should not import HTTP bootstrapping details.

## Course/repertoire boundary

The courses module owns:

- Course
- Chapter
- Line
- MoveNode authoring
- Move-tree persistence and reconstruction

It does not own training sessions, imported games, or external provider sync.

## Games/import boundary

The games module owns normalized imported games and external chess accounts. Provider-specific code belongs under importers, for example `importers/lichess`.

Lichess code should eventually be split into:

- client: HTTP calls and response status handling
- ndjson reader: streaming parse mechanics
- mapper: Lichess payload to normalized ImportedGame data
- sync service: import-run orchestration and persistence

## Frontend modules

Angular code should follow the same product feature boundaries:

```text
features/
  courses/
  line-editor/
  training/
  games/
  lichess-importer/
  stats/
shared/
core/
```

Large page components should become shells. State/navigation/orchestration should move into feature facades or utilities; reusable visual pieces should live in components.
