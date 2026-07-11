# API conventions

## Route convention

Every product route uses one Fastify route schema containing an explicit `operationId`, tags, summary, params/query/body schemas where applicable, and intentional response schemas. Zod wire schemas come from `packages/contracts`; generated OpenAPI is an output of these route schemas. Registration fails when required product-route metadata is missing.

Route handlers authenticate, read validated input, call an application service, and select documented HTTP responses. Services do not accept Fastify objects. Prisma stays in feature repositories. `routes/index.ts` remains composition-only.

Fastify request-validation failures are centralized in `buildApp()` and return status `400` with exactly `{ "error": "Validation failed" }`. The handler is not entered for malformed schema-backed input. Expected service and domain failures keep their route-specific status and response semantics.

## Rules

- Change an endpoint as a vertical slice: contract, route schema, handler typing, response verification, Angular type, tests, OpenAPI, and docs.
- Do not add `*.openapi.ts`, a route registry, or hand-maintained OpenAPI path objects.
- Do not call `parse`/`safeParse` after the same schema is attached to the route.
- Preserve URLs, status codes, wire fields, nullability, date strings, sorting, filters, auth, and ownership.
- Map known errors explicitly with stable codes. Do not convert every exception to `400`.
- Never return Prisma rows as public DTOs without verified mapping.

## Feature layout

Use only the files a feature needs:

```text
apps/api/src/modules/<feature>/
  <feature>.routes.ts
  <feature>.service.ts
  <feature>.repository.prisma.ts
  <feature>.mappers.ts
  <feature>.errors.ts
  <feature>.types.ts
```

Validate API changes with `npm run build:api` and the focused API test or `npm run test --workspace=apps/api`.

`buildApp({ authConfig })` accepts deterministic test auth without mutating process-global environment state. When `authConfig` is omitted, the auth plugin calls `loadAuthConfig()` exactly as production startup requires.
