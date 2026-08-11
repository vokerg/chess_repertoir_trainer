# ONB-012 — Self-review addendum

Date: 2026-08-11

Task: [ONB-012](../tasks/ONB-012-account-import-worker-api.md)

Issue: [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200)

Pull request: [#352](https://github.com/vokerg/chess_repertoir_trainer/pull/352)

## Purpose

This addendum records the adversarial implementation review performed before moving ONB-012 to review. The review rechecked the full PR against ONB-002 durable import semantics, ONB-004 lifecycle drain/fence requirements, ONB-007 operational defaults, ONB-011 persistence/coverage, the existing imported-game worker conventions, current Prisma constraints, OpenAPI convergence rules, and current `main`.

## Finding 1 — Coverage advancement was not fenced by the exact worker claim

Severity: high.

The first implementation fenced imported-game persistence with the active account-import `workKey`, but exact coverage advancement did not require the same key. A stale provider execution could therefore have attempted to extend durable coverage after recovery had released its claim.

### Correction

- require the exact active `workKey` for both `persistGames` and `extendCoverage`;
- reject stale or mismatched keys before either durable write can commit;
- re-run the shared lifecycle admission guard inside the same bounded write transaction for both game persistence and coverage advancement;
- add regression coverage proving stale keys and lifecycle fences block both write paths.

## Finding 2 — A persistence rewrite drifted from the ImportedGame schema and duplicate semantics

Severity: high.

During integration the bounded game-write path was rewritten to raw SQL. That version omitted required non-null `ImportedGame.userId` and `ImportedGame.provider` fields and could report incorrect inserted/duplicate counts when the same provider game id appeared more than once in a batch.

### Correction

The implementation returned to the existing project pattern: Prisma `createMany(..., skipDuplicates: true)` inside the bounded transaction, with `userId` and `provider` populated from the owned account/import context. Counters derive from the actual insert count, and replay tests prove duplicate-safe exact accounting.

## Finding 3 — PostgreSQL advisory locking used a row-decoding Prisma API

Severity: medium.

The single-executor claim path initially invoked `SELECT pg_advisory_xact_lock(...)` through `$queryRaw`. PostgreSQL returns `void` for this function, which Prisma 6.19.3 cannot deserialize. CI failed before the claim-concurrency assertions with `P2010`.

### Correction

The account-import claim transaction now follows the existing preparation scheduler pattern and executes the advisory lock with `$executeRaw`. The blocking transaction-scoped advisory lock, global active-claim check, priority ordering, `FOR UPDATE SKIP LOCKED`, and opaque `ACCOUNT_IMPORT:<uuid>` work key are otherwise unchanged.

## Finding 4 — Unexpected executor errors could leak provider payloads

Severity: medium / security.

A future provider adapter may throw an error containing a provider URL, response body, username, token material, or other personal payload. Passing raw thrown errors through structured worker telemetry would violate ONB-012's payload-exclusion requirement.

### Correction

Unexpected execution failures now persist a generic safe message and emit only provider-neutral metadata plus the error type/code. A focused regression test throws an error containing a private provider URL and token-like value and proves neither value appears in persisted error text or structured logs.

## Finding 5 — Backlog validation covered age but not sustained count

Severity: medium / validation.

The initial worker test exercised the oldest-queued-age threshold but did not prove the independent `>20 queued for five minutes` condition.

### Correction

A controlled-clock worker test now holds the queue at 21 runs across the sustained interval, disables the age branch, and proves `countSustained=true` produces the backlog warning.

## Finding 6 — Standalone worker tests exposed timer and fixture-order assumptions

Severity: medium / validation.

Two test-harness defects obscured worker behavior:

- a shared `const` logger fixture was declared after top-level test execution, causing an ESM temporal-dead-zone failure;
- the cancellation test waited only on the intentionally `unref()`'d heartbeat interval, so Node could exit with an unsettled top-level await even though production timer semantics matched the generic worker.

### Correction

The shared fixture is initialized before the top-level cases, and the heartbeat-driven cancellation test uses a referenced watchdog that fails the test if cooperative cancellation does not arrive. Production heartbeat/poll timer behavior remains unchanged.

## Finding 7 — The account-import HTTP test leaked the shared dev auth identity

Severity: medium / integration.

The account-import HTTP test may create `(authProvider='dev', authSubject='dev-single-user')`. It originally left that row behind, and the next Activity Feed HTTP test failed on the unique auth identity constraint.

### Correction

The test records whether it created the dev user itself and deletes only that self-created identity during cleanup. A pre-existing seeded/local dev identity remains untouched. The full API suite now progresses cleanly across both test modules.

## Finding 8 — Bodyless lifecycle commands were not registered with OpenAPI convergence

Severity: medium / contract.

The account-import pause/resume/cancel/retry endpoints are intentionally bodyless because the owned import-run id selects persisted immutable state. The feature OpenAPI test covered their operation ids, but the repository-wide convergence test requires every bodyless POST command to carry an explanatory description and appear in an exact allowlist.

### Correction

All four account-import lifecycle commands now document why no request body is required, and the exact bodyless-action convergence allowlist includes those four paths. This follows the existing `JobRun` cancel/retry convention rather than inventing empty request schemas.

## Finding 9 — Debug-only test-runner instrumentation had leaked into the branch

Severity: low / scope hygiene.

A temporary change to `apps/api/test/run-all.mjs` added richer GitHub error annotations while diagnosing CI failures. It did not belong to ONB-012 runtime scope.

### Correction

The test runner was restored exactly to `main`, leaving the PR diff limited to account-import runtime/contracts/tests, required worker/deployment integration, OpenAPI convergence, and task metadata.

## Finding 10 — Settlement persistence failure could terminate the shared worker loop

Severity: high / availability.

Executor completion can succeed while the short terminal persistence step fails transiently. Letting that persistence exception escape `executeClaimedRun` would terminate the account-import loop and, because ONB-012 shares the existing worker process, could also force peer-worker shutdown.

### Correction

Settlement persistence errors are now caught at the claimed-run boundary, logged with only safe error type/code metadata, and leave the exact claim intact for normal stale recovery. A dedicated resilience test proves the worker loop remains alive, the raw database/provider error message is not logged, and completion is attempted only once for that claim.

## Finding 11 — Control observation needed a stale-recovery fallback if an executor ignores abort

Severity: high / lifecycle.

A pause/cancel request is not acknowledged until provider execution quiesces. If a provider executor ignores its `AbortSignal`, continuing to renew the heartbeat forever would prevent the stale-claim recovery path from ever releasing the claim, turning a control request into a permanent drain blocker.

### Correction

Once heartbeat observation sees `PAUSE_REQUESTED` or `CANCEL_REQUESTED`, the worker aborts the executor and deliberately stops renewing that claim heartbeat. Cooperative executors are acknowledged immediately after quiescence; non-cooperative executors become eligible for the existing stale-recovery release path. A focused test proves the heartbeat is not renewed again while the executor remains stuck.

## Finding 12 — Peer-worker failure shutdown was not bounded

Severity: high / availability.

Signal-triggered shutdown used the configured worker timeout, but the new shared-process failure path originally awaited `Promise.allSettled` for both worker loops without a bound. If one loop failed while the peer executor ignored abort, the process could hang indefinitely and bypass both configured shutdown budgets.

### Correction

The shared worker process now computes one shutdown ceiling from the two worker configurations and uses it for both signal cleanup and peer-worker failure cleanup. After requesting both loops to stop, the failure path uses the existing `settlesWithin` helper and exits unsuccessfully if the peer cannot quiesce inside that bound.

## Finding 13 — Retry lineage no longer enforced the source import mode at the repository boundary

Severity: medium / invariant.

The public retry service copies the original run mode, but the repository-level retry validation had been relaxed to scope hash and requested range only. An internal caller could therefore create a linked retry with a different durable import mode while still presenting it as retry history.

### Correction

Repository validation again requires retry mode, canonical scope hash, and immutable requested range to match the source failed/cancelled run. A PostgreSQL integration test intentionally attempts a `BOUNDED_INITIAL` → `HISTORICAL_BACKFILL` linked retry and proves it is rejected with `AccountImportInvalidRetryError`.

## Finding 14 — Canonical queue metadata still described merged ONB-011 as proposed

Severity: low / coordination.

ONB-012 depends directly on ONB-011, and ONB-011 runtime was merged through PR #339. The queue row and deterministic-next paragraph were stale, leaving ONB-012 in `REVIEW` while its merged prerequisite was still described as `PROPOSED`.

### Correction

The ONB-011 queue entry is reconciled to `DONE` with PR #339 evidence, and deterministic queue text no longer lists ONB-011 among proposed work. Program status also records the merged durable-import persistence foundation and ONB-012 review state.

## Additional review checks

The review also rechecked:

- one globally active durable account-import provider execution, serialized by a PostgreSQL transaction advisory lock;
- candidate exclusion of `LEGACY_SYNC` rows and no reuse or mutation of `JobRun`/`JobTask` execution semantics;
- provider execution outside database transactions;
- independent heartbeat/checkpoint fencing and stale-claim recovery;
- explicit `RETRY_AT` / rate-limit deferral distinct from stale-worker recovery;
- pause/cancel acknowledgement only after executor quiescence or stale recovery releases the exact claim;
- graceful signal shutdown and bounded peer-failure shutdown;
- successful completion requiring proved coverage of the immutable requested range;
- scope hashes including `scopeVersion`, so exact coverage identity remains version-safe;
- the single allow-all ONB-019 admission-guard seam, rechecked inside durable acceptance and provider write transactions without overclaiming destructive safety before ONB-019 lands;
- queue wait, provider, parse, write, checkpoint, heartbeat, retry, control-quiescence, and backlog telemetry without PGN, username, provider URL, or token material;
- ONB-007 defaults of 1-second poll, 15-second heartbeat, 2-minute stale threshold, and 30-second recovery scan in code and deployment examples;
- shared worker-process hosting with no broker, queue service, provider deployment split, or parallel provider execution;
- the intentionally empty executor registry until ONB-013/ONB-014 register provider adapters;
- current `main`; the branch remains based directly on the current onboarding base unless GitHub reports otherwise at final validation;
- pull-request review threads; none were present during the review passes recorded here.

### ONB-019 handoff retained intentionally

The current admission guard is deliberately allow-all until ONB-019 persists lifecycle fences. When ONB-019 replaces it, claim selection must remain denial-aware: a fenced high-priority queued import must not permanently starve otherwise runnable lower-priority accounts. ONB-019 owns the persisted fence query/serialization needed to implement that without inventing provisional lifecycle storage in ONB-012. This is an integration requirement, not a claim of destructive safety in the current PR.

No additional ONB-012 production correction remained after the second review pass.

## Validation

Earlier corrected code/test head `fc5d3cca02ae13a0264f70c5ce5fa183632df242` passed CI run #2607 (`31466840636`) across lint, full build, opening audits, architecture guardrails, repository hygiene, the complete PostgreSQL migration chain, imported-game opening audits, and the complete monorepo test suite.

Earlier review/docs head `c6d9b8a3e674ee68a3cd008066a36a264d1a75b4` passed the same complete gate in CI run #2610 (`31467634145`).

The second review added settlement resilience, control stale fallback, bounded peer-worker shutdown, retry-mode lineage validation, and canonical metadata reconciliation. Review readiness is finalized only after a fresh exact-head CI run passes the same complete gate.

## Result

ONB-012 remains suitable for `REVIEW` once the final exact-head CI is green. This addendum does not mark the task `DONE`, close issue #200, or authorize merging PR #352.
