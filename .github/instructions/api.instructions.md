---
applyTo: "apps/api/**/*.ts,apps/api/test/**/*"
---

# API changes

- Inspect the route, service, repository, schemas, auth/ownership behavior, and relevant tests.
- Product routes use Fastify route schemas. Do not add `*.openapi.ts`, an OpenAPI registry, or a document merge layer.
- Import migrated request/response schemas from `@chess-trainer/contracts`; do not duplicate validation or response definitions.
- Let Fastify validate schema-backed requests. Normalize wire inputs separately when internal types differ.
- Malformed schema-backed inputs use the centralized `400` response `{ "error": "Validation failed" }`; do not recreate per-handler Zod issue responses.
- Full-app tests inject deterministic auth configuration. Omit injection only when explicitly testing production environment validation.
- Keep Fastify request/reply objects out of services and Prisma out of handlers.
- Put Prisma queries in feature repositories and reuse existing ownership/filter predicates.
- Implement summaries with database `count`, `aggregate`, or `groupBy`; Node may combine only bounded aggregate groups.
- Preserve explicit status/error behavior and use stable error codes for migrated routes.
- Validate with `npm run build:api` and the narrow API test or `npm run test --workspace=apps/api`.
