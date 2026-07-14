# Repository instructions

Chess Repertoire Trainer is a TypeScript modular monolith with an Angular web client, a React Native / Expo mobile client, a Fastify/Prisma API, and shared packages.

## Workspaces

- `apps/web`: Angular UI, feature state, and typed data access.
- `apps/mobile`: Expo routes, native lifecycle, Chessground DOM hosting, Clerk authentication, user-scoped SQLite content/training persistence, offline marathons, and attempt synchronization.
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
- Keep `packages/chess-domain` independent of Angular, React Native, Fastify, Prisma, browser APIs, and Node infrastructure.
- Use database `count`, `aggregate`, or `groupBy` for summaries and facets. Never load an unbounded matching row set for Node-side reduction.
- Keep `apps/web` and `apps/mobile` independent. Share behavior and verified wire contracts through packages, never through cross-app imports.
- Browser-only Chessground imports in mobile belong in `.dom.tsx` files.
- Update canonical docs in the same change as architecture behavior.
- Schema-backed handlers consume Fastify-validated `params`, `query`, and `body` values directly. Malformed requests use the centralized `{ "error": "Validation failed" }` response.
- Tests that construct the full API inject a deterministic `authConfig`; production startup omits it and loads auth from the environment.

## Validation

From the repository root:

- `npm run build`
- `npm test`
- `npm run lint`
- `npm run check:architecture`
- API: `npm run build:api` and `npm run test --workspace=apps/api`
- Web: `npm run build:web` and `npm run test --workspace=apps/web`
- Mobile: `npm run build:mobile`, `npm run test:mobile`, `npm run lint:mobile`, and `npm run expo:check`
- Domain: `npm run build:domain` and `npm run test --workspace=packages/chess-domain`
- Contracts: `npm run build:contracts` and `npm run test:contracts`

Focused API build/dev/lint commands build `chess-domain` and `contracts` first; focused web build/dev/test/lint commands build `contracts` first; focused mobile commands build `chess-domain` and `contracts` first. Do not remove those workspace pre-scripts or assume a root build already ran.

Report exactly what ran, what was skipped, and any warnings or residual risk.
