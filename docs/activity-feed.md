# Activity Feed architecture

## Current delivery boundary

The current `main` branch contains the ACT-001 Activity Feed foundation:

- a typed activity vocabulary and shared contracts;
- a persisted daily aggregate keyed by user, activity date, and activity type;
- an effective IANA time-zone preference on the user record;
- transaction-aware increment and absolute-reconciliation service operations;
- bounded activity history and static daily-goal projection;
- authenticated Fastify routes with generated OpenAPI coverage;
- migration, repository, service, HTTP, contract, and OpenAPI tests.

This document describes that implemented foundation. The following remain separate follow-up work and must not be described as current runtime:

- ACT-002: authoritative completion producers in training, puzzles, tactical scenarios, and game analysis;
- ACT-003: imported played-game reconciliation and historical backfill;
- ACT-004: the Angular Home Today checklist.

Program scope, issue state, and acceptance criteria live in [`north-star/activity-feed/README.md`](../north-star/activity-feed/README.md).

## Ownership

```text
packages/contracts/src/activity-feed/
  activity-feed.schemas.ts
  index.ts

apps/api/src/modules/activity-feed/
  activity-feed.routes.ts
  activity-feed.service.ts
  activity-feed.repository.prisma.ts
  activity-feed.mappers.ts
  activity-feed.errors.ts
  activity-feed.types.ts
```

`apps/api/src/routes/index.ts` registers the module. Fastify route schemas remain the OpenAPI source. Consumers use the contract package rather than Prisma models.

## Activity vocabulary

The initial finite activity types are:

- `GAMES_PLAYED`;
- `REPERTOIRE_LINES_TRAINED`;
- `LICHESS_PUZZLES_COMPLETED`;
- `TACTICAL_SCENARIOS_COMPLETED`;
- `GAME_ANALYSES_COMPLETED`.

New types require an authoritative producer, occurrence timestamp, aggregation rule, and retry/idempotency rule. Clients do not submit arbitrary activity names.

## Persistence and write semantics

The foundation stores one aggregate for a user, activity type, and user calendar date. Each aggregate carries the count plus first and last occurrence timestamps.

The service exposes two distinct write semantics:

- `recordIncrement`: add a positive amount for an authoritative first-time state transition;
- `reconcileDaily`: set the absolute truth for a date, including zero, for facts derived from source records.

Callers that already own a transaction may pass it through so the domain transition and activity update commit atomically. The service validates types, positive increments, non-negative reconciled counts, timestamp ordering, and date/time-zone consistency.

The foundation does not introduce an event bus, generic analytics stream, external queue, or rules engine.

## Calendar-day behavior

The effective user time zone is an IANA name and defaults safely through the persisted user configuration. Activity dates are derived server-side from occurrence timestamps in that time zone; they do not depend on the API host locale.

A preference update is rejected after activity exists because changing the zone requires an explicit rebuild of derived history. ACT-003 owns the first historical rebuild/reconciliation path.

History requests are bounded to at most 366 inclusive calendar days.

## HTTP contract

All routes require authentication.

```http
GET /api/me/activity?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/me/activity/today
GET /api/me/activity/preferences
PUT /api/me/activity/preferences
```

The history response returns the contract version, effective time zone, requested range, and grouped daily aggregates. The Today response returns all known activity types, including zero values, plus static goal progress.

## Initial daily goals

The current server-owned targets are:

| Goal | Activity type | Target |
| --- | --- | ---: |
| Play a game | `GAMES_PLAYED` | 1 |
| Train repertoire lines | `REPERTOIRE_LINES_TRAINED` | 5 |
| Complete Lichess puzzles | `LICHESS_PUZZLES_COMPLETED` | 3 |
| Complete a tactical scenario | `TACTICAL_SCENARIOS_COMPLETED` | 1 |
| Complete a game analysis | `GAME_ANALYSES_COMPLETED` | 1 |

Clients render `current`, `target`, and `completed`; they do not recreate goal logic.

## Integration rules for follow-up work

Authoritative producers must write only on the first qualifying terminal transition and remain retry-safe:

- completed web/mobile repertoire training counts once; abandonment does not;
- a Lichess puzzle counts on first completion, not on upstream synchronization retry;
- a tactical scenario counts after a qualifying attempted session first completes;
- game analysis counts when the shared run lifecycle first reaches `COMPLETED`;
- played games use absolute reconciliation from distinct imported games, not `gamesImported` increments.

The source workflow and activity write should share a transaction where the existing architecture permits it. Angular and mobile must not emit a second “success” event.

## Validation

Focused coverage lives under:

- `apps/api/test/activity-feed/`;
- `apps/api/test/openapi/activity-feed-openapi.test.mjs`;
- `packages/contracts/test/activity-feed-contract.test.mjs`.

Changes to the vocabulary, wire shapes, persistence key, time-zone rules, write semantics, or goals require corresponding contract, service/repository, HTTP, and OpenAPI coverage.
