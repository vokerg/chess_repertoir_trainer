---
name: api-contract-change
description: Use when creating or changing an HTTP request/response contract shared by Fastify and Angular.
---

# API contract change

1. Inspect the route, mapper/service output, Angular consumer, and tests.
2. Define the actual wire schema in the owning `packages/contracts/src/<feature>` directory.
3. Make ISO date strings and optional/null semantics explicit; export inferred input/output types.
4. Test the schema against representative output from the real mapper/service.
5. Attach the schema to the Fastify route and verify generated OpenAPI.
6. Replace handwritten Angular DTOs with type-only contract imports; keep view models local.
7. Delete old duplicate definitions only after API and web compile.
8. Update contract/OpenAPI docs and migration ledger.
