# Destructive data lifecycle foundation

This document describes the current persistence and write-admission foundation for destructive data lifecycle work. It is infrastructure only: no public destructive lifecycle API or row-deletion executor is implemented here.

## Durable records

`DataLifecycleOperation` is the durable lifecycle state machine. A preview stores the action, target user, immutable scope snapshot, bounded aggregate counts, preview hash/token hash, expiry, warning codes, and confirmation phrase. Execution binds the preview to a target-user-scoped idempotency key and may additionally store an opaque receipt-token hash.

Execution state carries a worker claim, heartbeat, checkpoint, first-destructive-commit timestamp, verification result, terminal result, and machine-readable error code. A stale worker claim may be cleared without clearing the lifecycle resource fence.

`DataLifecycleResourceFence` is the durable write fence. Initial delivery uses a conservative one-active-destructive-operation-per-user policy while retaining exact `USER`, `ACCOUNT`, and `GAME` resource rows for admission and later execution semantics. Live exact resources also have a PostgreSQL partial unique index.

`DataLifecycleAuditEvent` is append-only apart from explicit retention deletion. It has no foreign key to target users/accounts so evidence survives target deletion. Audit payloads are deliberately narrow: pseudonymous actor/target HMAC identifiers, machine-readable lifecycle fields, aggregate counts, and reason/error/confirmation codes only.

`DeletedAuthIdentityTombstone` stores only a provider, HMAC key version, HMAC digest, lifecycle operation id, and timestamp. Raw external auth subjects are not persisted in tombstones.

## Transactional write fencing

Normal writers and lifecycle fence creation use the same short PostgreSQL transaction-scoped advisory lock keyed by application user id (`17000259`, `userId`). The invariant is:

1. a normal writer acquires the user guard inside the transaction that will persist its mutation;
2. it checks the currently active persisted lifecycle fences for its user/account/game scope;
3. lifecycle fence creation acquires the same user guard before conflict checking and inserting fences;
4. a writer that already held the guard may commit before a competing fence creator; after the fence commits, later writers are rejected.

The guard is intentionally commit-side. Provider requests, Stockfish analysis, LLM calls, PGN processing, and other long work must happen outside it. Their persistence step must revalidate the authoritative lifecycle scope before writing.

Database triggers are the final race-safe guard for imported games and their index/analysis/AI/tactical/scenario children, external accounts, `AppUser`, preparation target admission, `JobTask`, tactical-detection run admission, and OAuth login-state writes. Account-import and preparation repositories also use the shared application guard. Job workers exclude lifecycle-fenced games while choosing runnable candidates; the trigger remains the commit-side race check.

Writers whose scope is derived through another row use **read → lifecycle user lock → re-read** rather than holding parent-row locks. The second read must match the first; otherwise the write fails with `DATA_LIFECYCLE_OWNERSHIP_CHANGED` and the short transaction can retry from current ownership. Redundant user/account/game identifiers are checked for consistency so a direct writer cannot manufacture a contradictory ownership tuple and bypass the intended fence.

Scope transitions validate both the old and new scope. This prevents reparenting an account/game/child out of a fenced scope or into one without crossing the same lifecycle serialization boundary.

A transaction-local lifecycle operation id is not a blanket trigger bypass. A destructive writer must have an active fence belonging to that operation which **contains the resource being mutated**. Out-of-scope writes fail with `DATA_LIFECYCLE_SCOPE_VIOLATION`.

Destructive code must use `DataLifecycleRepository.runDestructiveTransaction(...)` for each short destructive batch. The repository may first run a narrowly scoped `beforeUserLock` callback inside the same database transaction when a prerequisite has a stricter lock order, then acquires the user lock, atomically sets `firstDestructiveCommitAt`/checkpoint evidence, installs the transaction-local operation id used by database triggers, and invokes the destructive mutation callback. If any part fails, prerequisite changes, destructive writes, and first-commit evidence roll back together. The raw operation binding is intentionally not exported as a general writer primitive.

### Cascade-safe retained scenario snapshots

Scenario-training sessions can intentionally outlive tactical derivations during un-analysis. Their lifecycle scope is resolved from the persisted game snapshot and, when present, the tactical detection; inconsistent dual references are rejected.

Ordinary scenario INSERT/UPDATE/direct DELETE paths resolve and revalidate scope under the lifecycle lock. PostgreSQL FK actions need two narrowly bounded exceptions because a referenced parent may already be gone when the child trigger runs. A parent CASCADE can reach a `ScenarioTrainingSession` DELETE after its game/detection disappeared; and `ImportedGame`/`TacticalDetection` use `ON DELETE SET NULL`, so PostgreSQL can issue an internal session UPDATE that changes exactly one parent reference from its old id to `NULL` after deleting that parent. Those child actions are allowed only when the owning user and other lifecycle parent reference are unchanged and the removed OLD parent is already absent. Immediate foreign keys prevent that dangling OLD reference outside the parent deletion statement, whose parent mutation has already crossed its own lifecycle guard. All ordinary application updates remain strict.

## Cancellation and crash semantics

`CANCELLED` is valid only before the first destructive commit. The repository and database constraint both enforce that boundary.

Claimed execution advances only forward through the supported worker states: `FENCING` → `WAITING_FOR_DRAIN` → `EXECUTING` → `VERIFYING` (same-state retries are idempotent). `CANCEL_REQUESTED` is a stop state handled by the cancellation path rather than a route back into execution.

After `firstDestructiveCommitAt` is set, a stop request becomes `STOP_AFTER_BATCH`. Failure becomes `NEEDS_ATTENTION`, keeps the checkpoint, and retains the durable fence. Stale worker recovery clears only claim ownership/heartbeat state; it does not release fences.

Fences are released only for verified completion or a pre-mutation cancellation/failure path. Downstream executors remain responsible for verification before declaring completion.

## Preview, idempotency, and receipt semantics

GAME preview scopes are bounded to at most 100 explicit game ids. Every preview has an expiry and immutable scope/hash binding. Preview creation acquires the user lifecycle lock and verifies the target USER/ACCOUNT/GAME ownership before persisting the preview; execution revalidates ownership again immediately before fencing.

The durable action/resource boundary is fixed by the canonical lifecycle action: `UNANALYSE_GAMES` and `UNINDEX_GAMES` require GAME scope; `PURGE_ACCOUNT_DATA` and `DELETE_EXTERNAL_ACCOUNT` require ACCOUNT scope; `DELETE_APP_USER` requires USER scope. A database check constraint prevents semantically mismatched operation rows even before public preview routes exist.

Execute idempotency is unique per target user. Repeating the same idempotency key returns the already-bound operation only when the request names the same operation and presents the same preview token/hash proof. Reusing that key for another preview is rejected rather than silently returning an unrelated operation.

Opaque receipt tokens are stored only as SHA-256 hashes. Deleted identities may resolve lifecycle status through their versioned HMAC tombstone or a valid unexpired receipt token without ordinary `AppUser` provisioning.

## Deleted identity protection

Auth provisioning and final user deletion share the lock order **identity, then user**. Identity serialization uses a separate advisory lock derived from the provider/subject pair.

Before normal `AppUser` provisioning, `CurrentAppUserService` checks deleted-identity HMAC tombstones. A matching tombstone rejects provisioning. `AppUser` INSERT is also USER-fence guarded, so another direct creation path cannot recreate the same numeric target while deletion is fenced. `OAuthLoginState` has no `AppUser` foreign key, so its writes have an explicit USER-scope lifecycle guard rather than relying on cascade cleanup.

A future `DELETE_APP_USER` executor must create the tombstone in `runDestructiveTransaction(...)`'s `beforeUserLock` callback so the identity lock is acquired first; the main destructive callback then deletes the AppUser after the repository acquires the user lock and internally binds the lifecycle operation. The database trigger verifies that the bound operation targets that user and is a `DELETE_APP_USER` operation. Both steps remain part of one database transaction.

HMAC configuration is versioned for rotation:

- `DATA_LIFECYCLE_IDENTITY_HMAC_KEY`
- `DATA_LIFECYCLE_IDENTITY_HMAC_KEY_VERSION`
- `DATA_LIFECYCLE_IDENTITY_HMAC_PREVIOUS_KEYS` — JSON object keyed by version
- `DATA_LIFECYCLE_AUDIT_HMAC_KEY`
- `DATA_LIFECYCLE_AUDIT_HMAC_KEY_VERSION`
- `DATA_LIFECYCLE_AUDIT_HMAC_PREVIOUS_KEYS`

The current key must be explicitly configured before previous keys are accepted. Previous-key versions must be strictly lower than the current version; they are verification-only and cannot silently become the signing key. For deleted identities, every persisted tombstone key version for a provider must remain present in the configured keyring while that tombstone is authoritative. Missing historical versions fail provisioning closed rather than silently recreating an identity that can no longer be verified.

## Opening provenance

`ImportedGame.openingProvenance` distinguishes:

- `PROVIDER`: opening metadata arrived with a newly imported provider game;
- `LOCAL_BOOK`: the local opening book assigned the opening to a previously empty game;
- `UNKNOWN`: historical opening data that predates provenance tracking;
- `NONE`: no opening metadata is present.

The migration backfills historical non-empty openings as `UNKNOWN`. Local opening assignment changes provenance to `LOCAL_BOOK` only when the game was previously `NONE`; filling a missing field on provider/unknown data preserves its existing provenance. This allows downstream un-index execution to clear only locally assigned opening values without erasing provider or legacy evidence.

## Retention

Preview expiry is an explicit state transition. Terminal operation cleanup defaults to 90 days and audit cleanup defaults to 365 days; both are configurable through `DATA_LIFECYCLE_OPERATION_RETENTION_DAYS` and `DATA_LIFECYCLE_AUDIT_RETENTION_DAYS`.

Operations referenced by a deleted-identity tombstone are excluded from generic terminal cleanup so post-deletion identity/status lookup remains available for the tombstone horizon. Terminal operation cleanup also refuses to remove an operation that still owns an active resource fence. Audit retention is independent of target-row lifetime.

## Scope not implemented yet

This foundation does not perform destructive row mutation. Public lifecycle routes, Angular UI, destructive batch execution, verification policy, shared Position cleanup, and administrator authorization remain downstream work. Consumers must not infer that account/game/user deletion is available merely because the persistence and fence infrastructure exists.
