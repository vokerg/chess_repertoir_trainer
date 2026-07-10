# OpenAPI

## Source of truth

`@fastify/swagger` generates OpenAPI dynamically from Fastify route schemas. `fastify-type-provider-zod` transforms Zod schemas, including shared wire schemas from `packages/contracts`. Swagger is registered before product routes, and `@fastify/swagger-ui` serves the generated document.

`apps/api/src/app.ts` owns plugin ordering. `apps/api/src/routes/product-route-schema.ts` supplies deterministic operation IDs and domain tags to older direct routes that do not yet declare richer metadata. Feature routes should declare their complete schema explicitly when they own request or response contracts.

Each documented operation has a stable unique lower-camel-case `operationId`, product-domain tag, summary, inputs, and every intentional response schema.

## Rules

- Do not create `*.openapi.ts` files, path registries, merge layers, or custom documentation HTML.
- Define shared wire schemas in `packages/contracts` and attach them directly to the Fastify route schema.
- Do not parse a request again after Fastify has validated it with the same schema.
- Test fresh app-instance isolation, unique operation IDs, route coverage, and representative contract semantics.
- Keep `/api/docs` and `/api/docs/openapi.json` public; product endpoints retain their normal authentication behavior.
