# ONB-019 second self-review addendum — transactional lifecycle hardening

Date: 2026-08-16

Issue: #259

Pull request: #386

Parent implementation report: `ONB-019-2026-08-16-destructive-lifecycle-foundation.md`

Previous review: `ONB-019-2026-08-16-self-review-addendum.md`

## Review scope

This round re-read the ONB-004 destructive lifecycle invariants against the live ONB-019 implementation and investigated the repeated PostgreSQL/Prisma integration failure in `startExecution` rather than treating CI as a flaky test.

## Findings corrected

### 1. Preview ownership was checked too late

The first implementation validated the preview scope shape at creation, but USER/ACCOUNT/GAME ownership was not checked until execution started. That allowed a durable preview record to describe a target that was never owned by the target user.

Preview creation now acquires the user lifecycle advisory lock, verifies the exact authoritative scope ownership inside that transaction, and only then persists the preview. Execution still repeats the ownership check immediately before fencing so the preview cannot become stale authority.

### 2. Execute idempotency could return an unrelated operation

The first implementation looked up a duplicate by `(targetUserId, idempotencyKeyHash)` and immediately returned it. A caller could reuse the key while naming another preview or presenting different preview proof and receive the previously bound operation.

A duplicate is now accepted only when the operation id, preview token hash, and preview hash all match the original binding. Rebinding the key to another operation is rejected as invalid state; changing the preview proof is rejected as invalid preview proof.

### 3. Claimed state advancement was not forward-only

`advanceClaimed` originally accepted any current claimable status and any target claimable status. That contradicted ONB-004's forward-only recovery requirement and could move an executing operation back to a pre-execution state.

Worker advancement now permits only same-state retries or the forward path:

- `FENCING` -> `WAITING_FOR_DRAIN`;
- `WAITING_FOR_DRAIN` -> `EXECUTING`;
- `EXECUTING` -> `VERIFYING`.

`CANCEL_REQUESTED` remains a stop state handled by the cancellation path. `NEEDS_ATTENTION` recovery remains the separate explicit recovery primitive established by the first self-review.

### 4. First-destructive-commit evidence was separable from the destructive write

The original `markFirstDestructiveCommit` repository method could commit the marker independently and the exported `bindDataLifecycleOperation` helper could be used directly by a later mutation transaction. That left the architecture vulnerable to both directions of inconsistency: mutation without first-commit evidence, or first-commit evidence without the intended mutation.

The standalone marker was replaced by `runDestructiveTransaction(...)`. It owns the short Prisma transaction, verifies the claimed operation is `EXECUTING`, sets `firstDestructiveCommitAt` and the checkpoint, installs the transaction-local operation id for trigger bypass, and then invokes the destructive mutation callback. A callback failure rolls back the marker, checkpoint change, trigger binding, and mutation together.

The raw trigger-bypass helper is no longer exported from the shared lifecycle guard, so downstream destructive code has one supported transactional entrypoint.

### 5. Mutating `UPDATE ... RETURNING` through `$queryRaw` caused a real self-blocking transaction failure

Exact-head GitHub Actions repeatedly showed `startExecution` timing out with Prisma `P2028`. PostgreSQL activity established that the transaction holding the operation row/fence work and the final `UPDATE ... RETURNING` were on different backends, with the latter waiting on the former's transaction id.

The lifecycle repository no longer uses mutating `UPDATE ... RETURNING` statements through `$queryRaw` for the affected interactive transaction paths. Mutations use `$executeRaw` (or Prisma model mutation where appropriate), followed by a read through `$queryRaw` when the updated operation snapshot is needed. Claim and stop/advance paths were normalized to the same mutation/read separation rather than fixing only the one statement that happened to fail first.

The temporary transaction diagnostic test used to isolate the CI behavior was removed after the root cause was addressed.

### 6. Whole-user destructive setup initially inverted the identity/user lock order

The first `runDestructiveTransaction(...)` draft acquired the lifecycle user lock before invoking the destructive callback. `DeletedIdentityGuard.createTombstone(...)` acquires the deleted-identity advisory lock itself, so creating the tombstone inside that callback would produce the order **user -> identity**. Normal auth provisioning uses the established **identity -> user** order. Those opposing orders could deadlock under concurrent provisioning and whole-user deletion.

The destructive transaction API now accepts a narrowly scoped `beforeUserLock` callback that executes inside the same database transaction before the lifecycle user lock. Whole-user deletion uses that callback to create the tombstone and acquire the identity lock first. The repository then acquires the user lock, records first-destructive-commit/checkpoint evidence, installs the transaction-local lifecycle binding, and invokes the main callback that deletes the AppUser. Any failure still rolls back tombstone creation, lifecycle evidence, and deletion together.

This preserves the accepted identity-first lock order without re-exposing the raw trigger-bypass primitive.

## Regression coverage added

The PostgreSQL lifecycle integration test now additionally verifies:

- foreign-account and missing-game preview scopes are rejected before a preview row is persisted;
- an execute idempotency key cannot be rebound to another preview;
- an idempotent retry with different preview proof is rejected;
- backward claimed-state advancement is rejected;
- a destructive callback failure rolls back both target mutation and `firstDestructiveCommitAt`/checkpoint evidence;
- a successful destructive callback commits target mutation and first-commit/checkpoint evidence together;
- whole-user tombstone creation runs in the identity-first pre-user-lock phase while AppUser deletion remains in the same atomic destructive transaction;
- the writer-before-fence race is cleaned up so later global lifecycle claims remain deterministic inside the suite.

## Validation status

Local checkout remains unavailable in this execution environment because direct GitHub cloning previously failed with `Could not resolve host: github.com`. GitHub Actions is therefore the authoritative executable validation source for the final PR head. This addendum should not be interpreted as merge-readiness until that exact-head CI run is green.
