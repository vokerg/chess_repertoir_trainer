# ONB-019 destructive lifecycle foundation implementation report

Date: 2026-08-16

Issue: #259

Pull request: #386

Branch: `onb-019/issue-259-destructive-lifecycle-foundation`

Base after refresh: `cce48d7f69183420ae108a9ea769317cd1083d90`

Initial implementation head: `8d0466a7741c92abb965fac17e870faa4959470d`

## Outcome

ONB-019 now has a concrete PostgreSQL-backed foundation for destructive data lifecycle work without implementing destructive execution itself. The implementation persists bounded ownership-scoped previews and execution state, serializes and retains lifecycle fences, exposes claim/checkpoint/verification and atomic destructive-transaction primitives, blocks normal writes at commit time, records narrow pseudonymous audit evidence, distinguishes opening provenance, and prevents deleted external identities from being silently reprovisioned.

## Delivered implementation

### Lifecycle contracts and operation persistence

- shared Zod contracts for action, operation status, resource type, stop request, terminal result, error code, opening provenance, bounded preview counts, and USER/ACCOUNT/GAME scopes;
- GAME preview scope capped at 100 explicit game ids;
- canonical action/resource pairing is durably constrained: game reset actions use GAME scope, account purge/delete use ACCOUNT scope, and whole-user deletion uses USER scope;
- durable preview expiry, immutable scope/count/hash binding, idempotency key, receipt-token hash, worker claim/heartbeat, checkpoint, first destructive commit, verification result, terminal result, and error code;
- ownership validation at preview persistence plus ownership revalidation immediately before fence creation;
- target-user-scoped execute idempotency bound to the same operation and preview token/hash proof;
- stale-claim recovery that clears only claim ownership, not durable fences;
- pre-mutation cancellation/failure releases fences; post-mutation stop/failure remains forward-only and fenced as `NEEDS_ATTENTION`;
- explicit internal `NEEDS_ATTENTION` recovery preserves checkpoint/first-commit evidence/fence while returning the operation to `WAITING_FOR_DRAIN`;
- database constraints reject `CANCELLED` after the first destructive commit.

### Resource fences and writer admission

- durable `DataLifecycleResourceFence` rows for USER, ACCOUNT, and GAME resources;
- one-active-destructive-operation-per-user serialization through a shared transaction-scoped PostgreSQL advisory lock;
- hierarchical writer overlap: USER writers overlap all descendant fences, ACCOUNT writers overlap child GAME fences, and GAME writers overlap USER/ACCOUNT ancestors;
- exact live-resource partial uniqueness as a second database invariant;
- shared import/preparation admission guards replacing the existing ONB-019 no-op seams;
- `JobTask` claim selection excludes lifecycle-fenced work so blocked tasks do not appear runnable or preempt unrelated work;
- database commit-side triggers cover `ImportedGame`, `ExternalAccount`, `AppUser`, `DataPreparationTarget`, `JobTask`, tactical-run admission, OAuth login state, imported-game ply/index/analysis/AI/tactical/scenario child records, and scenario attempts;
- triggers and normal application guards use the same short user lock, closing the writer-before-fence race without holding lifecycle locks across provider, Stockfish, LLM, or PGN work;
- indirect ownership writers use read → lifecycle lock → re-read and reject a changed snapshot with `DATA_LIFECYCLE_OWNERSHIP_CHANGED` rather than relying on parent row locks;
- redundant user/account/game identifiers are checked for ownership consistency at the database boundary;
- update guards validate both old and new lifecycle scopes so reparenting cannot bypass a fence;
- transaction-local lifecycle operation binding is scope-authorized: the bound operation must own an active containing fence or the write fails with `DATA_LIFECYCLE_SCOPE_VIOLATION`;
- destructive batches use `DataLifecycleRepository.runDestructiveTransaction(...)`, which atomically records first-commit/checkpoint evidence, binds the operation transaction-locally for trigger authorization, and commits or rolls back that evidence with the destructive callback;
- retained scenario snapshots remain compatible with tactical cleanup and whole-user/account FK cascades while ordinary scenario writes stay strictly scope-checked;
- the raw operation-binding primitive is repository-private rather than a general writer API.

### Audit, identity tombstones, and receipt lookup

- append-only lifecycle audit rows with no target-row foreign key and no raw personal payload fields;
- versioned HMAC helper/keyring with separate identity and audit domains plus previous-key rotation support;
- previous HMAC keys require an explicit current key and must have strictly lower versions, keeping them verification-only;
- provisioning fails closed if persisted deleted-identity tombstones require a historical key version no longer present in the keyring;
- deleted-auth tombstones store provider, HMAC version/digest, operation id, and timestamp only;
- `CurrentAppUserService` checks tombstones before ordinary dev/Clerk provisioning and uses the same identity-then-user lock order required by final user deletion;
- `AppUser` INSERT and FK-less `OAuthLoginState` writes participate in USER fencing so whole-user cleanup cannot be raced by direct recreation/auth-state persistence;
- whole-user destructive transactions support an identity-first `beforeUserLock` phase so tombstone creation precedes the lifecycle user lock while remaining atomic with first-commit evidence and final AppUser deletion;
- final lifecycle-bound AppUser deletion is database-guarded to require a tombstone belonging to a `DELETE_APP_USER` operation targeting that exact user;
- identity- and receipt-based lifecycle status lookup does not perform ordinary AppUser provisioning;
- generic terminal-operation cleanup retains operations referenced by deleted-identity tombstones and operations that still own an active resource fence.

### Opening provenance and retention

- `ImportedGame.openingProvenance` added with `PROVIDER`, `LOCAL_BOOK`, `UNKNOWN`, and `NONE` values;
- historical rows with opening data backfill to `UNKNOWN` rather than being guessed as provider/local;
- newly inserted provider opening values become `PROVIDER`;
- local opening assignment changes only a previously empty `NONE` record to `LOCAL_BOOK`; partial provider/unknown values retain their provenance;
- configurable lifecycle audit and terminal-operation retention helpers default to 365 and 90 days respectively.

## Scope intentionally not implemented

- no destructive game/account/user row executor;
- no public lifecycle command/status routes;
- no Angular lifecycle UI;
- no provider or preparation state machine duplication;
- no shared Position cleanup;
- no administrator mutation policy or support/recovery policy.

Those remain downstream ONB-020/021/024/026 responsibilities.

## Self-review

The implementation received three adversarial self-review passes recorded separately:

- `ONB-019-2026-08-16-self-review-addendum.md` — hierarchical fencing, advisory-lock typing, and resumable `NEEDS_ATTENTION`;
- `ONB-019-2026-08-16-second-self-review-addendum.md` — preview ownership, idempotency proof binding, forward-only transitions, atomic first-destructive-commit handling, Prisma transaction hardening, identity-first whole-user lock ordering, and canonical action/scope pairing;
- `ONB-019-2026-08-17-third-self-review-addendum.md` — indirect-scope race revalidation, ownership consistency, old/new transition fencing, bound-operation scope authorization, AppUser/OAuth admission, tactical/scenario coverage, cascade-safe scenario deletion, HMAC rotation fail-closed behavior, and retention hardening.

Earlier implementation corrections also included tombstone immutability, exact-target AppUser delete defense, job-worker starvation prevention, and reconciliation onto refreshed `main` after RH-003 / PR #380 merged.

## Validation added

- shared contract test for lifecycle enums, counts, and bounded scopes;
- PostgreSQL action/scope test proving all five canonical pairings and rejecting mismatches;
- PostgreSQL lifecycle repository integration coverage for ownership-scoped preview creation, execute idempotency/proof binding, cross-resource conflict, direct-write rejection, forward-only execution, cancellation before mutation, atomic destructive rollback/commit evidence, post-mutation `NEEDS_ATTENTION`/fence retention, stale-claim recovery, writer-before-fence ordering, HMAC tombstone reprovision rejection, identity-first whole-user deletion, post-delete identity/receipt lookup, and audit survival;
- adversarial PostgreSQL coverage for indirect-scope concurrency/revalidation, ownership mismatch rejection, old/new scope transitions, bound-scope authorization, HMAC key rotation, tactical-run admission, AppUser/OAuth USER fencing, retained scenario cleanup, and whole-user cascade through retained scenario snapshots;
- opening assignment regression coverage for local/provider provenance and partial-provider fill behavior;
- existing account-import and preparation admission seam tests continue to exercise the same interfaces with the real guard implementations;
- `JobTask` database trigger remains the commit-side race backstop in addition to claim filtering.

## Validation environment

A local repository checkout could not be established in the execution environment because GitHub DNS resolution failed with:

`fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com`

No local build/test result is therefore claimed. GitHub Actions on PR #386 is the authoritative executable validation for this implementation and must be green on the exact reviewed head before merge readiness.

## Migration coordination

ONB-019 was claimed after rechecking active Prisma work. ONB-018 / PR #385 owns a preparation-reconciliation behavior change and an additive migration timestamped `20260815210000`; it does not modify `schema.prisma`. ONB-019 begins with `20260816080000_data_lifecycle_foundation` and subsequent additive lifecycle-hardening migrations preserve timestamp order.

## Review state

PR #386 remains open and non-draft while final exact-head GitHub Actions validation is completed. The task remains `REVIEW`, not `DONE`; destructive execution and user-facing lifecycle capability must not be inferred from this foundation.
