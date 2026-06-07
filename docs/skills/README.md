# Project skills

These skills are small, repeatable playbooks for changing the chess repertoire trainer without eroding the architecture.

They are intentionally project-specific. Use them when adding features, reviewing PRs, or asking an assistant to work in this repository.

## Available skills

- [API feature module](./api-feature-module.md): add or change backend features without returning to global route/service/repository soup.
- [Frontend feature module](./frontend-feature-module.md): keep Angular features separated and prevent large page components from becoming orchestration sinks.
- [Angular frontend guide](../frontend/angular-refactor-guide.md): standalone routing, signal stores, immutable row patching, and verification expectations.
- [Lichess importer](./lichess-importer.md): split provider-specific import logic into client, NDJSON reader, mapper, and sync orchestration.
- [Contracts](./contracts.md): use shared request/response schemas safely without confusing them with domain logic.
- [Architecture review](./architecture-review.md): review changes for boundary violations before merge.

## Project boundary model

```text
app      = deployable/runtime unit
module   = feature/domain boundary inside an app
package  = reusable code shared across apps
```

Current top-level shape:

```text
apps/
  api/    Fastify + Prisma backend app
  web/    Angular frontend app
packages/
  chess-domain/  pure chess and training logic
  contracts/     scaffolded shared DTO/schema package
```

Current API module direction:

```text
apps/api/src/modules/
  courses/       course, chapter, line, move-node authoring
  training/      training sessions and attempts
  games/         linked accounts, imported games, import runs
  importers/     provider-specific imports such as Lichess
  stats/         reporting and aggregated read models
  import-export/ JSON backup/import flows
```

## How to use these skills

Before editing code, choose the skill that matches the feature area. During review, run the architecture review skill regardless of feature area.

When in doubt, prefer a small feature-local file over a new global service.
