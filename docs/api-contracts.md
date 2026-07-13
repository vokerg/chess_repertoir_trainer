# API contracts

## Ownership

`packages/contracts` is an active root workspace consumed by API and client build graphs. Its verified public exports include imported-game browsing, board-image endpoints, course read models, serializable training, and mobile synchronization. Add schemas only after checking the real service output and consumers; unverified provisional exports are not acceptable.

For each cross-workspace endpoint DTO, `packages/contracts` owns the Zod request/response wire schema and inferred TypeScript types. The API imports schemas at runtime for validation/serialization and Angular normally imports DTO types only. Feature-local input schemas may stay with the API when no other workspace consumes them.

Contracts may contain HTTP params/query/body/response schemas, stable wire literals, pagination/error schemas, descriptions, and inferred types. They must not contain Prisma models, Fastify handlers, services, authorization, chess behavior, Stockfish behavior, Angular state, RxJS, or formatting helpers.

## Policies

- Verify the real route, mapper/service output, Angular consumer, and tests before defining a schema.
- HTTP dates are ISO strings, never `Date` objects.
- `.nullable()` means JSON includes `null`; `.optional()` means the property may be absent.
- Distinguish wire input from normalized internal output when transforms are used.
- Test the schema against actual mapper/service output and representative invalid values.
- Delete handwritten duplicates only after API and web compile against the shared contract.
- Public position-analysis lines require `pvUci`. Historical persisted JSON is normalized at the API mapping boundary so legacy rows cannot weaken the wire contract.

The package exports compiled `dist` files. Focused API scripts prepare both `chess-domain` and `contracts`; focused web scripts prepare `contracts`. This keeps focused commands valid after `npm ci` without importing unpublished package source.

See [OpenAPI](openapi.md) for route documentation conventions.
