# Onboarding readiness projection

`GET /api/me/onboarding` is the server-owned read model for first-run onboarding and Home readiness presentation.

## Persistence boundary

`AppUser` owns only the durable disposition: `PENDING`, `COMPLETED`, or `SKIPPED`, with an optional reason and transition timestamp. The rollout migration adopts every pre-existing user as `COMPLETED` with reason `LEGACY_ADOPTION`; users provisioned afterward inherit `PENDING`.

`DataPreparationRun`, `DataPreparationTarget`, `DataPreparationBatch`, `ImportRun`, and current `ImportedGame` evidence remain authoritative for physical execution and readiness. ONB-008 does not add a second workflow aggregate.

When an `ONBOARDING` preparation run first persists `coreReadyAt`, PostgreSQL converges any pending or skipped disposition to `COMPLETED` with reason `CORE_READY`. Skipping guidance therefore does not cancel already accepted work.

## Projection rules

The endpoint is authenticated and read-only. It returns the latest onboarding run, bounded target detail (maximum 16), bounded latest immutable child batches (maximum 8), aggregate current game evidence, persisted milestones, deterministic attention/action codes, feature readiness, and at most three canonical game/opening/analysis references.

Current `ImportedGame` evidence is the product-readiness authority. Historical batch counts are exposed separately as technical execution evidence and are never treated as proof that a product capability is ready.

The projection intentionally has no weighted overall percentage and no ETA. A percentage is emitted only for a fixed provider-window plan or one immutable child batch. If any provider-window denominator is still unknown, aggregate provider-window `total` and `percentage` are `null` while exact completed/current game counts remain available.

Feature states are `locked`, `partial`, `ready`, or `checked-empty`. Games, openings, analysis, and tactics use their own persisted evidence rather than one global readiness boolean.

## Ownership and query bounds

Every query is scoped by authenticated `userId`. Run-specific aggregates join through the owned preparation run. Potentially large game sets are counted or ranked in PostgreSQL; Node receives only aggregate rows, at most 16 targets, at most eight latest batches, and at most three reveal references.

Lifecycle commands remain outside this module. Action codes such as retry, expansion, finish, and skip are recommendations/destinations consumed by later ONB-009 command surfaces; this endpoint does not mutate preparation state.
