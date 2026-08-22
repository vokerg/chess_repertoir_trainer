# Onboarding readiness projection

`GET /api/me/onboarding` is the server-owned read model for first-run onboarding and Home readiness presentation.

## Persistence boundary

`AppUser` owns only the durable disposition: `PENDING`, `COMPLETED`, or `SKIPPED`, with an optional reason and transition timestamp. The rollout migration adopts every pre-existing user as `COMPLETED` with reason `LEGACY_ADOPTION`; users provisioned afterward inherit `PENDING`.

`DataPreparationRun`, `DataPreparationTarget`, `DataPreparationBatch`, `ImportRun`, and current `ImportedGame` evidence remain authoritative for physical execution and readiness. ONB-008 does not add a second workflow aggregate.

When the initial `ONBOARDING` preparation or a linked `RECOVERY` descendant first persists `coreReadyAt`, PostgreSQL converges any pending or skipped disposition to `COMPLETED` with reason `CORE_READY`. A recovery descended only from `EXPANSION` does not alter onboarding disposition, and an `EXPANSION` run itself is never disposition-completing even if malformed data attaches it to an onboarding retry lineage. Skipping guidance therefore does not cancel already accepted first-run work.

## Projection rules

The endpoint is authenticated and read-only. It returns the latest user preparation across the existing `ONBOARDING`, `RECOVERY`, and `EXPANSION` purposes, bounded target detail (maximum 16), bounded latest immutable child batches (maximum 8), aggregate current game evidence, persisted milestones, deterministic attention/action codes, feature readiness, and at most three canonical game/opening/analysis references.

Current `ImportedGame` evidence is the product-readiness authority. Historical batch counts are exposed separately as technical execution evidence and are never treated as proof that a product capability is ready. Tactical readiness has its own policy/version-aware evidence query; the general product aggregate does not maintain a second tactical-detection count.

The projection intentionally has no weighted overall percentage and no ETA. A percentage is emitted only for a fixed provider-window plan or one immutable child batch. If any provider-window denominator is still unknown, aggregate provider-window `total` and `percentage` are `null` while exact completed/current game counts remain available.

Feature states are `locked`, `partial`, `ready`, or `checked-empty`. Games, openings, analysis, and tactics use their own persisted evidence rather than one global readiness boolean.

Allowed actions are derived from both durable disposition and the current preparation lifecycle. `VIEW_ONBOARDING` means navigation to the progress/recovery surface and never mutates work. `RESUME_PREPARATION` means the public resume intent and is never used merely for navigation: ONB-009 must coordinate either a quiescent `PAUSED` preparation or a `NEEDS_ATTENTION` preparation whose linked import is `PAUSED`, then let normal preparation reconciliation recover execution. Active work exposes pause/cancel controls, paused work exposes resume/cancel, acknowledgement states do not advertise another conflicting work control, and terminal failure/cancellation exposes restart. While first-run disposition is still `PENDING`, skip remains available independently of those work controls and does not cancel accepted work. Completed expansion runs never receive onboarding-only finish/skip actions.

Core readiness changes the Home treatment, not the execution truth. A `COMPLETED` disposition with deeper analysis, recovery, or expansion still in progress may present `CORE_READY` or another current operational state while the `preparation`, `attention`, and `actions` fields continue to expose valid pause/resume/cancel/restart controls. ONB-010 can therefore use durable disposition/core readiness for the compact Home treatment without reconstructing execution permissions in Angular.

`SKIPPED` dismisses first-run guidance but does not make an already active preparation disappear: a skipped user with accepted background work receives valid controls for that run and is never told to start a second concurrent preparation. `SKIPPED` also outranks milestones belonging only to later expansion/recovery work; those milestones remain visible inside the preparation projection but cannot silently reinterpret the durable first-run decision. Skipped recovery/attention states expose operational recovery choices, not another finish/skip decision. A skipped user with no accepted preparation history may start onboarding; a terminal historical run is handled according to its restart/re-entry state.

## Ownership and query bounds

Every query is scoped by authenticated `userId`, including run-level target, batch-activity, and game aggregates. Run-specific aggregates join through or explicitly existence-check the owned preparation run. Potentially large game sets are counted or ranked in PostgreSQL; Node receives only aggregate rows, at most 16 targets, at most eight latest batches, and at most three reveal references.

Lifecycle commands remain outside this module. Action codes such as resume, pause, cancel, retry, restart, expansion, finish, and skip are user intents consumed by later ONB-009 command surfaces; this endpoint does not mutate preparation state.
