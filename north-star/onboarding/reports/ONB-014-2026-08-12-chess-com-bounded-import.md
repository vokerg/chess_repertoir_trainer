# ONB-014 implementation evidence — bounded Chess.com import adapter

Date: 2026-08-12

Task: ONB-014 / #202

Branch: `account-import/onb-014-chess-com-adapter`

State: implementation in progress; runtime pull request pending at the time of this snapshot

## Implemented boundary

- deterministic half-open UTC calendar-month planning;
- newest-first initial/backfill order and oldest-first forward order;
- one successful archive-index traversal as the authority for listed versus absent months;
- listed monthly archives fetched serially with `AbortSignal`, configured recognizable User-Agent, bounded 408/5xx retry/backoff, explicit durable 429 retry timing, and conservative 404/410 failure;
- bounded in-memory validator metadata with `ETag`/`Last-Modified`; conditional requests are sent only while the cached body is still usable, so `304` never becomes coverage authority by itself;
- one shared Chess.com normalization path reused by the transitional synchronous service and the durable executor;
- exact requested range, standard-variant, speed, and rated/unrated filtering;
- provider-neutral guarded batch commits that atomically persist up to 100 games with exact batch counters;
- provider-neutral guarded window commits that atomically persist checkpoint/window progress and advance exact contiguous coverage only after the complete month succeeds;
- duplicate-safe replay through the existing `(accountId, providerGameId)` uniqueness contract;
- progressively committed rows remain visible and Activity Feed reconciliation runs after each committed matching batch;
- durable worker registration for `CHESS_COM` without changing the legacy account HTTP cutover owned by ONB-015.

## Review corrections made before commit

1. Replaced split coverage/checkpoint settlement with one transaction so a crash cannot prove a month covered while losing its window checkpoint.
2. Moved provider seen/skipped/failed counters into the same guarded bounded transaction as each batch write.
3. Treat malformed archive-index/month payloads as failures rather than silently interpreting missing arrays as empty coverage.
4. Bound validator metadata and use weak response-body references so monthly payload caching cannot grow without limit.
5. Cap in-process retry sleeps while preserving provider `Retry-After`; HTTP 429 leaves the executor quickly through durable `RETRY_AT` instead of sleeping inside the worker.
6. Kept Activity Feed reconciliation after persisted batches and before window proof; failure therefore cannot advance coverage.
7. Removed duplicate object keys found during the second compile-oriented review.

## Focused validation executed in the available shell

- strict TypeScript no-emit check for the provider, executor, provider-neutral commit repository, account repository, executor contract, and transitional Chess.com service using isolated stubs matching the live interfaces;
- compiled provider/executor fixture tests passed;
- syntax checks passed for provider, executor, provider-commit repository, canary, and PostgreSQL integration test files;
- provider tests cover month order/boundaries, scope filtering, validators/304, bounded cache metadata, bounded 5xx retry, 404/410, 429 retry timing, User-Agent, and cancellation-aware retry delay;
- executor tests cover absent month proof, listed-month bounded writes, exact out-of-range filtering, listed archive failure, restart from proved coverage, rate limit, cancellation, malformed archive index, and malformed game failure counters;
- PostgreSQL integration coverage was added for bounded duplicate-safe provider commits, exact counters, atomic window checkpoint+coverage, stale work-key rejection, lifecycle-fence rollback, and coverage-gap rollback.

## Validation still required before ONB-014 can move to REVIEW/DONE

- exact-head repository CI/full API build, lint, architecture, migration, and complete test gates after the branch commit;
- one real low-volume Chess.com canary. The current execution shell cannot resolve external hosts, so the included opt-in canary harness has not been executed here. No provider load test is permitted.

## Residual boundary

ONB-019 / #259 still owns persisted destructive lifecycle fences. This implementation reuses the existing `AccountImportAdmissionGuard` immediately inside each bounded game/window write transaction; the current allow-all implementation does not constitute destructive-safety completion.

ONB-015 / #203 still owns removal of synchronous provider traversal from account HTTP routes. The legacy Chess.com service remains transitional and now reuses the durable adapter's authoritative normalization path instead of maintaining a second normalizer.
