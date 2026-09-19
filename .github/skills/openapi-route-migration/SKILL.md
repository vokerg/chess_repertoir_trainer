---
name: openapi-route-migration
description: Use when adding or changing a Fastify endpoint and its generated OpenAPI contract.
---

# OpenAPI route change

1. Inspect the route, request schemas, response mapper, Angular consumer, and tests.
2. Use shared Zod contracts in one Fastify route schema with stable `operationId`, product tag, summary, inputs, and every intentional response.
3. Let Fastify validate the request once; remove redundant handler parsing.
4. Test response serialization, required/null fields, dates, documented errors, and generated OpenAPI.
5. Update canonical API, contract, or feature documentation when behavior changes.
6. Confirm operation IDs are unique and fresh app instances produce identical documents.
7. Confirm the strict product-route assertion accepts the explicit metadata; never rely on it to generate missing operation IDs, tags, summaries, or responses.
