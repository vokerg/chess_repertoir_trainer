# API conventions

## Route convention

Migrated feature routes use one Fastify route schema containing `operationId`, tags, summary, params/query/body schemas, and response schemas. Zod wire schemas come from `packages/contracts`; generated OpenAPI is an output of these route schemas.

Route handlers authenticate, read validated input, call an application service, and select documented HTTP responses. Services do not accept Fastify objects. Prisma stays in feature repositories. `routes/index.ts` remains composition-only.

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
