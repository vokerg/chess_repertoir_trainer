# Chess Repertoire Trainer

This repository is a TypeScript modular monolith: Angular in `apps/web`, Fastify/Prisma in `apps/api`, pure chess logic in `packages/chess-domain`, and incrementally activated HTTP schemas in `packages/contracts`.

Before editing, inspect the owning feature, its nearest tests, `AGENTS.md`, the applicable path instruction, and the relevant `.github/skills/*/SKILL.md`. Do not work directly on `main`.

Use existing feature boundaries. Keep Fastify routes thin, application services transport-independent, and Prisma access in repositories. Keep Angular HTTP calls in typed feature data-access services and mutable page workflows in feature stores/facades.

For shared endpoint DTOs, `packages/contracts` owns the Zod wire schema and inferred type; Fastify route schemas generate OpenAPI. Do not add `*.openapi.ts`, an OpenAPI registry or merge layer, duplicate shared DTOs in Angular, expose Prisma models as contracts, or parse an already schema-validated request again.

Use database aggregation for counts, summaries, facets, and averages. Apply the existing repository `where` predicate before grouping and only post-process bounded aggregate rows in Node.

The native Expo client has been removed. Do not recreate native-client code or remove responsive Angular behavior merely because it uses the word “mobile.”

Run the narrowest relevant checks while developing and the acceptance checks before finalizing. Update canonical docs whenever architecture state changes.
