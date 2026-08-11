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

Unexpected execution failures now persist a generic safe message and emit only provider-neutral metadata plus the error type. A focused regression test throws an error containing a private provider URL and token-like value and proves neither value appears in persisted error text or structured logs.

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

## Additional review checks

The review also rechecked:

- one globally active account-import provider execution, serialized by a PostgreSQL transaction advisory lock;
- candidate exclusion of `LEGACY_SYNC` rows and no reuse or mutation of `JobRun`/`JobTask` execution semantics;
- provider execution outside database transactions;
- independent heartbeat/checkpoint fencing and stale-claim recovery;
- explicit `RETRY_AT` / rate-limit deferral distinct from stale-worker recovery;
- pause/cancel acknowledgement only after executor quiescence or stale recovery releases the exact claim;
- graceful process shutdown releasing the exact active claim;
- successful completion requiring proved coverage of the immutable requested range;
- scope hashes including `scopeVersion`, so exact coverage identity remains version-safe;
- the single allow-all ONB-019 admission-guard seam, rechecked inside durable acceptance and provider write transactions without overclaiming destructive safety before ONB-019 lands;
- queue wait, provider, parse, write, checkpoint, heartbeat, retry, control-quiescence, and backlog telemetry without PGN, username, provider URL, or token material;
- ONB-007 defaults of 1-second poll, 15-second heartbeat, 2-minute stale threshold, and 30-second recovery scan in code and deployment examples;
- shared worker-process hosting with no broker, queue service, provider deployment split, or parallel provider execution;
- the intentionally empty executor registry until ONB-013/ONB-014 register provider adapters;
- current `main`; the branch is zero commits behind its `ceed886c7fb413676954b907db8a8c7a31150c05` merge base;
- pull-request review threads; none were present during self-review.

No further production architecture correction was found.

## Validation

CI run `31466840636` / run number `2607` passed lint, full build, opening audits, architecture guardrails, repository hygiene, the complete PostgreSQL migration chain, imported-game opening audits, and the complete monorepo test suite on corrected code-and-test head `fc5d3cca02ae13a0264f70c5ce5fa183632df242`.

The self-review report and review-state metadata are documentation-only follow-ups and receive a fresh PR CI run before review readiness is finalized.

## Result

ONB-012 is suitable for `REVIEW` once the documentation-only follow-up CI is green. This addendum does not mark the task `DONE`, close issue #200, or authorize merging PR #352.
