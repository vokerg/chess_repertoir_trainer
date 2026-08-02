# ONB-004 second self-review addendum — destructive phase safety and source preservation

Date: 2026-08-02

Parent report: `ONB-004-2026-08-02-destructive-lifecycle-invariants.md`

First addendum: `ONB-004-2026-08-02-self-review-addendum.md`

Task: [ONB-004](../tasks/ONB-004-destructive-lifecycle-invariants.md)

## 1. Why this addendum exists

A second adversarial review of PR #263 found four lifecycle details that must be normative before implementation:

1. the parent report still contains the superseded statement that account purge deletes terminal `ImportRun` rows;
2. scenario-training source links can be erased by imported-game/tactical cascades before copied personal snapshots are selected for deletion;
3. cancellation and failure semantics were incomplete after the first destructive mutation;
4. whole-user deletion needs an authenticated receipt/status path that does not recreate the deleted `AppUser`.

This addendum is normative. Where it conflicts with the parent report, this addendum and the first self-review addendum take precedence.

## 2. Consolidated import-history correction

The parent report section 4.3 and lifecycle-matrix `ImportRun` purge cell are superseded.

`PURGE_ACCOUNT_DATA` must:

- cancel and drain the active import attempt;
- retain terminal `ImportRun` rows while the account remains;
- clear/delete exact coverage, current/latest import pointers, resumable provider checkpoints, rating statistics, `lastSyncAt`, `syncCursorTime`, and `lastSyncRunId`;
- ensure retained runs are immutable historical evidence and cannot be resumed or treated as current coverage;
- create subsequent import attempts as new runs.

`DELETE_EXTERNAL_ACCOUNT` performs purge first, snapshots bounded lifecycle audit aggregates, then deletes the account and its account-owned terminal import runs through the normal account cascade.

## 3. Source-preserving deletion order

`ScenarioTrainingSession.importedGameId` and `tacticalDetectionId` use `ON DELETE SET NULL`. If imported games or tactical detections are deleted first, the relational evidence needed to select target-account scenario copies is lost.

Therefore account purge/delete must use this order:

1. resolve and persist the bounded target imported-game IDs for the current phase;
2. delete scenario-training sessions/attempts sourced from those games while their source foreign keys still exist;
3. delete tactical detections/processed rows as required;
4. delete imported games and their cascades;
5. verify no scenario session retaining copied target-game personal data remains.

Do not rely only on `sourceId` after the relational links have been nulled. If future schema work adds immutable account/source provenance to scenario sessions, it may provide an additional verification key but does not remove the ordering requirement for current rows.

## 4. Cancellation, failure, and fence retention

`CANCELLED` is valid only before the first destructive mutation commits.

After destructive execution starts:

- the operation is forward-only;
- a stop request may halt at the next safe checkpoint, but the result is `NEEDS_ATTENTION`, not terminal `CANCELLED`;
- the resource fence remains installed while the operation is partially applied;
- normal writers remain rejected until the operation resumes and verifies completion, or an explicit administrator repair/close procedure proves a safe terminal state;
- a worker claim/lease may be recovered after staleness, but the durable resource fence must never be cleared merely because the worker claim expired;
- a failure before any destructive mutation may release the fence after verifying that no partial state exists;
- a failure after any destructive mutation retains the fence and checkpoint.

This prevents new writes from entering a partially purged scope and invalidating deterministic retry.

## 5. Whole-user auth and receipt handshake

Creating a whole-user fence changes authentication behavior immediately:

- ordinary authenticated API requests for that identity are rejected with a typed deletion-in-progress response;
- the auth resolver must not update/re-upsert the fenced `AppUser` as part of normal request resolution;
- only lifecycle status/receipt retrieval and any explicitly required deletion acknowledgement path remain available;
- those paths resolve the operation through the authenticated external identity HMAC and/or an opaque deletion receipt capability, without calling ordinary `AppUser` upsert;
- the deleted-identity tombstone is written before, or atomically with, final `AppUser` deletion;
- after final deletion, a valid old auth token can retrieve the typed deleted/receipt state but cannot recreate the user;
- mobile outbox upload receives the same typed deletion response before any user provisioning or attempt ingestion and must purge local data.

The initiating client must receive or already possess the opaque receipt/status capability before the final `AppUser` row is removed. Final completion is not allowed to depend on recreating the user merely to poll the operation.

## 6. Canonical-document scope

Roadmap, status, task-queue, and open-question summaries are navigational. They do not supersede the accepted detailed contracts in ONB-001, ONB-002, ONB-003, or ONB-016 reports. Implementers must follow the referenced reports and task files when a condensed summary omits detail.

## 7. Added validation requirements

ONB-019/020/021 must add tests for:

- purge retaining terminal import runs while clearing every authoritative continuation/coverage pointer;
- scenario sessions deleted before game/detection cascades null their source links;
- operation failure before versus after the first destructive commit;
- durable resource-fence retention across worker crash, stale-claim recovery, and `NEEDS_ATTENTION`;
- rejection of terminal `CANCELLED` after partial deletion;
- active whole-user fence blocking ordinary auth-resolution writes;
- tombstone creation ordered before/with final `AppUser` deletion;
- post-deletion status/receipt retrieval without ordinary AppUser upsert;
- stale mobile outbox upload receiving deletion state without user recreation.

## 8. Queue impact

No new task is required.

- ONB-019 owns operation-state constraints, resource-fence retention, auth-resolution guard, receipt lookup foundation, and tombstone ordering.
- ONB-020 owns source-preserving scenario deletion order and consolidated import-history semantics.
- ONB-021 owns deletion-in-progress/deleted auth responses, final receipt retrieval, and mobile next-contact purge.
