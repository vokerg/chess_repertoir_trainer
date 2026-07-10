---
name: api-feature-change
description: Use for a bounded Fastify API feature change that may touch routes, services, repositories, schemas, auth, or tests.
---

# API feature change

1. Trace request flow from route through service to repository/domain logic.
2. Inspect authorization, ownership predicates, response mapping, and relevant tests.
3. Keep the route transport-only and the service independent of Fastify.
4. Keep Prisma queries explicit in the owning feature repository.
5. Reuse existing chess-domain behavior and feature predicates.
6. Preserve the public contract unless a breaking change is explicit.
7. Update the owning canonical document and run focused API tests plus the API build.

For contract or route-schema migration, also use `api-contract-change` and `openapi-route-migration`.
