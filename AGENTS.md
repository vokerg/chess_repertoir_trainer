# Repository instructions

Chess Repertoire Trainer is a TypeScript modular monolith with an Angular web client, a Fastify/Prisma API, and shared packages.

## Workspaces

- `apps/web`: Angular UI, feature state, and typed data access.
- `apps/api`: Fastify routes, application services, provider integration, and Prisma repositories.
- `packages/chess-domain`: pure chess and training behavior.
- `packages/contracts`: active package for verified HTTP wire schemas and inferred DTO types.

## Before changing code

- Inspect the owning route/module, its data flow, and relevant tests first.
- Read the closest `.github/instructions/*.instructions.md` and `.github/skills/*/SKILL.md`.
- Prefer small feature-local changes. Do not create cross-feature deep imports or new global abstractions.
- Preserve URLs, JSON fields, nullability, status codes, filtering, sorting, and ownership behavior unless a change is explicit.
- Do not work directly on `main`.

## Sources of truth

- Runtime behavior: code and tests.
- Shared HTTP wire shapes: Zod schemas in `packages/contracts`.
- OpenAPI operations: Fastify route schemas.
- Imported-game filters: repository predicates, especially `buildImportedGameWhere`.
- Architecture: `docs/architecture.md` and topic documents indexed by `docs/README.md`.
- Agent workflows: `.github/skills/*/SKILL.md`.

Do not add `*.openapi.ts`, a separate OpenAPI registry, or hand-maintained path objects. Product endpoints use Fastify route schemas; shared request and response DTOs belong in `packages/contracts` when consumed across workspace boundaries.

## Boundaries

- Keep route handlers thin; authentication and transport decisions belong at the route boundary.
- Keep Fastify types out of application services and Prisma out of route handlers.
- Keep `packages/contracts` limited to HTTP wire schemas and inferred types. Dates are ISO strings on the wire; optional and nullable are distinct.
- Keep `packages/chess-domain` independent of Angular, Fastify, Prisma, browser APIs, and Node infrastructure.
- Use database `count`, `aggregate`, or `groupBy` for summaries and facets. Never load an unbounded matching row set for Node-side reduction.
- The only supported client is responsive Angular web. There is no native mobile workspace; do not confuse responsive-web “mobile” behavior with a native client.
- Update canonical docs in the same change as architecture behavior.

## Validation

From the repository root:

- `npm run build`
- `npm test`
- `npm run lint`
- API: `npm run build:api` and `npm run test --workspace=apps/api`
- Web: `npm run build:web` and `npm run test --workspace=apps/web`
- Domain: `npm run build:domain` and `npm run test --workspace=packages/chess-domain`
- Contracts, once active: `npm run build:contracts` and `npm run test:contracts`

Report exactly what ran, what was skipped, and any warnings or residual risk.
