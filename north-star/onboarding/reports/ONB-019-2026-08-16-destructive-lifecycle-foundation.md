# ONB-019 destructive lifecycle foundation implementation report

Date: 2026-08-16

Issue: #259

Pull request: #386

Branch: `onb-019/issue-259-destructive-lifecycle-foundation`

Base after refresh: `cce48d7f69183420ae108a9ea769317cd1083d90`

Initial implementation head: `8d0466a7741c92abb965fac17e870faa4959470d`

## Outcome

ONB-019 now has a concrete PostgreSQL-backed foundation for destructive data lifecycle work without implementing destructive execution itself. The implementation persists bounded previews and execution state, serializes and retains lifecycle fences, exposes claim/checkpoint/verification primitives, blocks normal writes at commit time, records narrow pseudonymous audit evidence, distinguishes opening provenance, and prevents deleted external identities from being silently reprovisioned.

## Delivered implementation

### Lifecycle contracts and operation persistence

- shared Zod contracts for action, operation status, resource type, stop request, terminal result, error code, opening provenance, bounded preview counts, and USER/ACCOUNT/GAME scopes;
- GAME preview scope capped at 100 explicit game ids;
- durable preview expiry, immutable scope/count/hash binding, idempotency key, receipt-token hash, worker claim/heartbeat, checkpoint, first destructive commit, verification result, terminal result, and error code;
- ownership revalidation immediately before fence creation;
- target-user-scoped execute idempotency;
- stale-claim recovery that clears only claim ownership, not durable fences;
- pre-mutation cancellation/failure releases fences; post-mutation stop/failure remains forward-only and fenced as `NEEDS_ATTENTION`;
- database constraints reject `CANCELLED` after the first destructive commit.

### Resource fences and writer admission

- durable `DataLifecycleResourceFence` rows for USER, ACCOUNT, and GAME resources;
- one-active-destructive-operation-per-user serialization through a shared transaction-scoped PostgreSQL advisory lock;
- exact live-resource partial uniqueness as a second database invariant;
- shared import/preparation admission guards replacing the existing ONB-019 no-op seams;
- JobTask claim selection excludes lifecycle-fenced work so blocked tasks do not appear runnable or preempt unrelated work;
- database commit-side triggers cover `ImportedGame`, `ExternalAccount`, `AppUser`, `DataPreparationTarget`, `JobTask`, imported-game ply/index/analysis/AI/tactical/scenario child records, and scenario attempts;
- triggers and normal application guards use the same short user lock, closing the writer-before-fence race without holding lifecycle locks across provider, Stockfish, LLM, or PGN work;
- future lifecycle executors can bind their operation id transaction-locally so only their own fence is bypassed during a bounded destructive batch.

### Audit, identity tombstones, and receipt lookup

- append-only lifecycle audit rows with no target-row foreign key and no raw personal payload fields;
- versioned HMAC helper/keyring with separate identity and audit domains plus previous-key rotation support;
- deleted-auth tombstones store provider, HMAC version/digest, operation id, and timestamp only;
- `CurrentAppUserService` checks tombstones before ordinary dev/Clerk provisioning and uses the same identity-then-user lock order required by final user deletion;
- final lifecycle-bound AppUser deletion is database-guarded to require a tombstone belonging to a `DELETE_APP_USER` operation targeting that exact user;
- identity- and receipt-based lifecycle status lookup does not perform ordinary AppUser provisioning;
- generic terminal-operation cleanup retains operations referenced by deleted-identity tombstones.

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

## Self-review corrections made during implementation

1. **Auth provisioning race.** The first draft read `AppUser` before acquiring the deleted-identity lock. Two first-time requests could both observe no user and the second could later hit the unique identity constraint. Provisioning was reordered to acquire/check the identity lock before reading AppUser, then acquire the lifecycle user guard for an existing user. The documented delete path uses the same identity-then-user order.
2. **Tombstone immutability.** Tombstone insertion originally updated the operation id on HMAC conflict. It now uses `DO NOTHING`, retaining the original deletion evidence instead of mutating a tombstone.
3. **Wrong-user lifecycle delete defense.** The AppUser delete trigger now verifies that the bound lifecycle operation is specifically `DELETE_APP_USER` and targets the exact row being deleted, rather than accepting any tombstone with the bound operation id.
4. **Worker starvation.** Commit-side JobTask protection alone would allow lifecycle-fenced queued work to appear runnable. Worker candidate and higher-priority runnable queries now exclude USER/ACCOUNT/GAME-fenced games before claim, with the trigger retained for the final race.
5. **Main refresh.** RH-003 / PR #380 merged while ONB-019 was being implemented. The branch claim was rebuilt onto refreshed `main` (`cce48d7`) before the implementation commit; #380 had no overlapping ONB-019 files.

## Validation added

- shared contract test for lifecycle enums, counts, and bounded scopes;
- PostgreSQL lifecycle repository integration test covering execute idempotency, cross-resource conflict, direct-write rejection, cancellation before mutation, post-mutation `NEEDS_ATTENTION`/fence retention, stale-claim recovery, writer-before-fence ordering, HMAC tombstone reprovision rejection, post-delete identity/receipt lookup, and audit survival;
- opening assignment regression coverage for local/provider provenance and partial-provider fill behavior;
- existing account-import and preparation admission seam tests continue to exercise the same interfaces with the now-real guard implementations;
- JobTask database trigger remains the commit-side race backstop in addition to claim filtering.

## Validation environment

A local repository checkout could not be established in the execution environment because GitHub DNS resolution failed with:

`fatal: unable to access 'https://github.com/vokerg/chess_repertoir_trainer.git/': Could not resolve host: github.com`

No local build/test result is therefore claimed. GitHub Actions on PR #386 is the authoritative executable validation for this implementation and must be green on the exact reviewed head before merge readiness.

## Migration coordination

ONB-019 was claimed after rechecking active Prisma work. ONB-018 / PR #385 owns a later preparation-reconciliation behavior change and an additive migration timestamped `20260815210000`; it does not modify `schema.prisma`. ONB-019 uses `20260816080000_data_lifecycle_foundation`, preserving the established additive order.

## Review state

PR #386 is opened as a draft while exact-head CI and adversarial diff review are completed. The task remains `REVIEW`, not `DONE`; destructive execution and user-facing lifecycle capability must not be inferred from this foundation.
