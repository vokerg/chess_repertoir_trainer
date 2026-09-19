# ONB-020 account/game destructive lifecycle delivery — 2026-09-01

## Outcome

ONB-020 implements restart-safe destructive lifecycle execution for owned imported-game and external-account scopes on top of the ONB-019 operation/fence/audit foundation.

The delivered actions are:

- `UNANALYSE_GAMES`;
- `UNINDEX_GAMES`;
- `PURGE_ACCOUNT_DATA`;
- `DELETE_EXTERNAL_ACCOUNT`.

Authenticated callers use durable preview, execute/resume, status, and stop routes under `/api/me/data-lifecycle`. Execution is asynchronous through the existing persistent worker process. The legacy immediate account-delete cascade and raw cursor-reset compatibility URLs no longer perform destructive mutations.

## Execution model

Preview revalidates ownership and records bounded affected-row aggregates, an immutable scope/hash, a short-lived opaque preview token, warning codes, and the required typed confirmation phrase. Execute re-counts the live target while holding the same lifecycle user lock that immediately precedes fence insertion; a changed affected-row snapshot is rejected as `DATA_LIFECYCLE_PREVIEW_INVALID` before any fence is persisted. This closes the writer-between-recount-and-fence race rather than relying on an unlocked preflight check.

The worker advances forward-only through `FENCING`, `WAITING_FOR_DRAIN`, `EXECUTING`, and `VERIFYING`. While the operation remains in `FENCING`, it requests cancellation of target durable imports, preparation work, and only the affected imported-game `JobTask` rows; once cancellation targeting is exhausted it advances directly to `WAITING_FOR_DRAIN`. `CANCEL_REQUESTED` remains reserved for cancellation of the lifecycle operation itself. The worker does not call the public whole-`JobRun` cancel command, so unrelated games in a mixed run are not terminated.

Drain requires target import activity/claims, preparation work, active target job tasks, and residual target `JobTask.workKey` leases to clear. Legacy synchronous import work is treated as an explicit blocker rather than silently racing destructive execution.

Destructive batches are deterministic by imported-game id. The configurable worker batch size defaults to 25 and is hard-bounded to 100. Checkpoint updates and `firstDestructiveCommitAt` are persisted in the same `runDestructiveTransaction(...)` transaction as the destructive batch.

Before each destructive batch, the worker rechecks the durable stop state while holding the lifecycle user advisory lock in the same database transaction that will perform the mutation. If a pre-mutation cancel request or post-mutation `STOP_AFTER_BATCH` request has won that lock boundary, the next destructive batch is not admitted. Before the first destructive commit, cancellation/failure may settle terminally and releases the fence. After the first commit, stop/failure becomes `NEEDS_ATTENTION`, retains the fence/checkpoint, and can only resume with the original idempotency key. Verified completion is the only post-mutation path that releases the fence.

## Per-action semantics

### Un-analysis

For the selected owned games the executor removes per-game analysis runs, AI review, tactical detections and processed markers, clears materialized latest-analysis fields and ply classification/score-loss fields, then recomputes the complete game tag set.

Shared `Position` / `PositionAnalysis` evidence is retained. Tactical feedback and self-contained scenario-training sessions are retained; tactical-detection foreign keys may become null through the existing cascade-safe ONB-019 rules.

### Un-index

Un-index executes the un-analysis phase first, then removes per-game ply/index rows and clears index timestamps/errors. Opening metadata is cleared only when `openingProvenance = LOCAL_BOOK`; provider and legacy/unknown opening evidence is retained. Tags are recomputed after the index state changes.

### Account purge

Account purge deletes copied scenario sessions while their target game/detection source identity is still available, verifies zero matching copies inside that transaction, then deletes the bounded imported-game batch. After all games are gone it deletes exact account import coverage and rating statistics, clears current preparation-import pointers, and resets `lastSyncAt`, `syncCursorTime`, and `lastSyncRunId`.

The `ExternalAccount` remains reusable. Terminal `ImportRun` history remains historical evidence, while current coverage/pointers are removed. Independent `LichessConnection` OAuth state remains attached to the retained account.

### Account deletion

Account deletion performs account purge first, then clears `AppUser.defaultProgressAccountId` if necessary and deletes the `ExternalAccount`. Account-owned `ImportRun` history cascades with the account. An independent `LichessConnection` is retained and its `externalAccountId` becomes null through the database relation.

The ONB-019 bound-operation guard continues to require exact fence containment for normal writes. A narrow database authorization rule permits only the `defaultProgressAccountId -> null` pointer clear (plus `updatedAt`) when the transaction is bound to a `DELETE_EXTERNAL_ACCOUNT` operation whose active ACCOUNT fence exactly matches that pointer. It does not turn an ACCOUNT fence into general USER-scope authorization.

A bounded `ACCOUNT_DELETE_AGGREGATE_SNAPSHOT` audit event is persisted before final deletion. The worker checks for that event before appending it, so a failure/crash after the audit write but before the delete transaction can resume without duplicating the snapshot in the sequential restart path.

## Compatibility cutover

`DELETE /api/me/accounts/:id` is retained only as a deprecated compatibility URL. Authenticated calls return `409 DATA_LIFECYCLE_INVALID_STATE` and do not mutate the account or default-account reference. OpenAPI advertises the 409 lifecycle cutover rather than the old 200 delete response.

`POST /api/me/accounts/:id/reset-cursor` is also deprecated and returns 410 without mutating the legacy cursor or durable coverage. Historical import remains the supported non-destructive way to request older games; `PURGE_ACCOUNT_DATA` is the destructive reset primitive.

No new Angular destructive-account interaction is added by this task; the normal account page remains conservative while the canonical destructive API/worker boundary is established.

## Deployment configuration

The existing worker process now hosts the account/game lifecycle worker alongside imported-game, account-import, and preparation workers. Environment templates expose:

- lifecycle audit/identity HMAC keys and versions;
- poll/heartbeat/stale-recovery/shutdown timing;
- bounded destructive game batch size.

The audit HMAC key is required for public lifecycle preview/audit execution. Identity HMAC configuration remains the shared ONB-019/ONB-021 deleted-identity foundation.

## Validation and self-review corrections

The implementation was repeatedly reviewed adversarially while the PR was in draft. Material defects found and corrected included:

1. mixed `JobRun` drain logic that could over-block unrelated work;
2. whole-run cancellation targeting that could cancel unrelated games/accounts;
3. account purge/delete preview counts that under-counted affected plies;
4. cancellation paging/batching and target-task settlement details;
5. worker configuration that was defined but not applied to destructive batches;
6. copied scenario provenance matching during purge;
7. stale-preview error classification;
8. legacy account DELETE/reset runtime and OpenAPI contract drift;
9. a stale external-account contract test that still asserted the removed unsafe behavior;
10. final account-delete audit snapshot duplication after a restart between audit and delete;
11. missing deployment-template lifecycle HMAC configuration;
12. an execute-time stale-preview race where a guarded writer could commit after an unlocked re-count but before fence creation. Execute-time affected-row validation now runs under the lifecycle user lock immediately before fence insertion, with a two-client regression proving the stale preview is rejected and no fence is created;
13. normal dependency cancellation incorrectly attempted the lifecycle transition `FENCING -> CANCEL_REQUESTED -> WAITING_FOR_DRAIN`, violating the ONB-019 forward-state contract. Dependency cancellation now occurs while remaining `FENCING`, followed by the valid direct transition to `WAITING_FOR_DRAIN`;
14. a stop-boundary race where a durable `STOP_AFTER_BATCH` request could win after an `EXECUTING` claim but before the worker opened its next destructive transaction. The worker now rechecks stop state under the lifecycle user lock in the same transaction as batch admission; a PostgreSQL race test proves the next game remains untouched and the operation settles fenced in `NEEDS_ATTENTION`;
15. final account deletion attempted to clear `AppUser.defaultProgressAccountId` under an ACCOUNT fence and was correctly rejected by the ONB-019 scope guard. A narrow migration now authorizes only that exact pointer clear for the matching bound `DELETE_EXTERNAL_ACCOUNT` operation while preserving USER-scope rejection for unrelated AppUser writes.

Focused PostgreSQL coverage exercises affected-row matrices, scoped job cancellation/drain including residual worker leases, un-analysis/un-index retention and opening provenance, stale previews including the writer-versus-fence race, a 101-game bounded purge, checkpointed restart/stop/resume, a stop-request-versus-next-batch race, scenario delete-before-cascade ordering, terminal import-history retention/current-coverage separation, account deletion/default-reference/import cascade, independent OAuth retention, and audit-snapshot idempotency.

Adjacent ONB-019 tests continue to provide the resource-fence concurrency matrix, guarded synchronous-writer races, stale-claim/fence recovery, exact bound-scope authorization, and pre-/post-mutation failure semantics. Existing durable account-import worker tests prove cancellation is acknowledged only after provider execution has quiesced.

## Residual ownership

- ONB-021 owns whole-user deletion and device-local purge.
- ONB-024 owns administrator mutation exposure.
- ONB-026 owns shared Position cleanup.
- A future product/UI task may expose the destructive lifecycle through the Angular account-management experience; ONB-020 does not bypass the typed confirmation/preview protocol with a direct UI delete.
