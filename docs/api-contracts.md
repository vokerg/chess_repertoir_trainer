# API contracts

## Ownership

`packages/contracts` is an active root workspace consumed by API and client build graphs. Its verified public exports include imported-game browsing, persistent imported-game jobs, board-image endpoints, course read models, serializable training, mobile synchronization, the Lab performance-by-rating report, and opening-struggles queries/responses. Add schemas only after checking the real service output and consumers; unverified provisional exports are not acceptable.

For each cross-workspace endpoint DTO, `packages/contracts` owns the Zod request/response wire schema and inferred TypeScript types. The API imports schemas at runtime for validation/serialization. Angular normally imports DTO types only, while mobile imports the runtime schemas needed to validate downloaded bundles and attempt-sync responses. Feature-local input schemas may stay with the API when no other workspace consumes them.

Contracts may contain HTTP params/query/body/response schemas, stable wire literals, pagination/error schemas, descriptions, and inferred types. They must not contain Prisma models, Fastify handlers, services, authorization, chess behavior, Stockfish behavior, Angular or React Native state, RxJS, SQLite repositories, or formatting helpers.

## Policies

- Verify the real route, mapper/service output, consuming client, and tests before defining a schema.
- HTTP dates are ISO strings, never `Date` objects.
- `.nullable()` means JSON includes `null`; `.optional()` means the property may be absent.
- Distinguish wire input from normalized internal output when transforms are used.
- Test the schema against actual mapper/service output and representative invalid values.
- Delete handwritten duplicates only after every consuming workspace compiles against the shared contract.
- Public position-analysis lines require `pvUci`. Historical persisted JSON is normalized at the API mapping boundary so legacy rows cannot weaken the wire contract.
- Lab performance-by-rating requests and responses are exported from `@chess-trainer/contracts/lab`; requests may filter by minimum opponent rating, the API owns filtering/descending rating-band aggregation order, and Angular owns only report presentation state.
- Opening-struggles requests, successful responses, coverage status literals, and the bounded-scope `422` response are exported from `@chess-trainer/contracts/opening-struggles`. Angular keeps only its UI criteria model because full-move depth is converted into wire-level plies.
- Persistent job kinds, sources, run/task statuses, creation/cancel/retry responses, read summaries, ordered task responses, pagination inputs, and stable errors are exported from `@chess-trainer/contracts/jobs`. A task's `importedGameId` is nullable because persisted task history survives source-game deletion. Task responses include nullable ISO-8601 `startedAt` and `settledAt` fields for the most recent claimed execution attempt; duration is derived from those timestamps and is absent when either is null. Prisma rows and active execution keys remain backend-only. Terminal job dismissal is an ownership-scoped `DELETE` operation; active jobs return `JOB_RUN_NOT_DISMISSIBLE`, while successfully dismissed jobs disappear from all user-facing job reads.

The package exports compiled `dist` files. Focused API and mobile scripts prepare both `chess-domain` and `contracts`; focused web scripts prepare `contracts`. This keeps focused commands valid after `npm ci` without importing unpublished package source.

See [OpenAPI](openapi.md) for route documentation conventions.
