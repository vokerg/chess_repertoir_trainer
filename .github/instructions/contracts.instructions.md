---
applyTo: "packages/contracts/**/*"
---

# Contract changes

- Inspect the real API route, mapper/service output, Angular consumer, and tests before defining a schema.
- Store only HTTP wire shapes and stable wire literals here. Do not add Prisma, Fastify, UI state, chess behavior, or workflows.
- Export each Zod schema and its inferred input/output type.
- HTTP dates are ISO strings. Model `null` with `.nullable()` and absence with `.optional()` only when each is actually part of the contract.
- Test representative real mapper/service output and rejected invalid output.
- Migrate the API route schema, generated OpenAPI, and Angular type import in the same endpoint slice; then delete the duplicate DTO/schema.
- Validate contracts, API, and web builds for shared-contract changes.
