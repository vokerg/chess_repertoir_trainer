# ONB-004 self-review addendum — synchronous writer fencing and import history

Date: 2026-08-02

Parent report: `ONB-004-2026-08-02-destructive-lifecycle-invariants.md`

Task: [ONB-004](../tasks/ONB-004-destructive-lifecycle-invariants.md)

## 1. Why this addendum exists

A pre-PR adversarial review found two places where the main report's direction needed a stronger or more precise contract:

1. persisted admission checks alone do not stop a synchronous HTTP writer that started before the destructive fence was created;
2. account-data purge should reset authoritative import coverage/current pointers without erasing useful terminal `ImportRun` execution history while the account still exists.

The corrections below are normative and must be read with the parent report.

## 2. Correction: synchronous writers require a commit guard

### Problem

AI review generation, tag refresh, tactical detection, scenario creation/attempt writes, and current provider sync can execute in request/service paths rather than through a durable `JobTask` claim.

A request can:

1. pass an initial “no lifecycle fence” check;
2. continue computing while a destructive operation commits a fence;
3. write after the fence unless the mutation boundary revalidates or serializes against fence creation.

Waiting for `JobTask.workKey` cannot drain these non-job writers.

### Corrected contract

Every synchronous writer that can mutate a user/account/game scope covered by lifecycle operations must use one of these equivalent database-enforced patterns:

- acquire a short transaction-scoped shared lifecycle guard and perform the mutation in that guarded transaction, while fence creation acquires the conflicting exclusive guard; or
- lock/revalidate the authoritative user/account/game lifecycle generation/fence row in the same transaction immediately before mutation, so a fence committed first causes the write to abort.

Rules:

- the check is at the commit-side mutation boundary, not only in the route;
- fence creation is serialized per target user through a user-row lock or transaction-scoped advisory lock, then inserts normalized user/account/game fence rows and commits;
- exact-scope uniqueness prevents duplicate fences, while the user-scoped serialization/conflict query enforces user-versus-account-versus-game overlap;
- pre-existing synchronous requests that have not entered their guarded mutation transaction fail after the fence exists;
- a synchronous mutation already holding the conflicting guard completes before fence creation commits, so the destructive operation sees its result before drain/execution;
- no long provider, engine, or LLM call occurs while holding the database guard;
- after expensive work, the service enters a short guarded transaction to persist only if the scope remains unfenced;
- provider import ultimately uses ONB-011/012 durable claims; the legacy synchronous sync route must be removed/cut over before account purge/delete is considered safe.

The drain predicate therefore combines:

- acknowledged durable claims for preparation/import/jobs;
- commit-side fence serialization for synchronous writers.

ONB-019 owns the guard primitive and admission/commit integration. ONB-020/021 verify no writer class bypasses it.

## 3. Correction: account purge retains terminal import-run history

### Problem

The main report's account-purge narrative said both that import history is retained for audit and that target import runs are deleted. Those statements conflict.

### Corrected contract

`PURGE_ACCOUNT_DATA`:

- cancels and drains any active import run;
- retains terminal `ImportRun` rows as historical execution evidence while the account remains;
- deletes/resets authoritative `AccountImportCoverage`, current/latest import pointers, provider checkpoints used for continuation, rating statistics, `lastSyncAt`, `syncCursorTime`, and `lastSyncRunId`;
- ensures retained terminal runs are not treated as current coverage or resumable active work;
- creates all subsequent import work as new runs.

`DELETE_EXTERNAL_ACCOUNT`:

- performs account purge semantics first;
- copies bounded terminal import/preparation/job aggregates into lifecycle audit/result evidence where required;
- deletes the account, allowing account-owned `ImportRun` rows to cascade;
- retains lifecycle audit, while job history follows the existing nullable-game semantics until its independent retention policy removes it.

`DELETE_APP_USER`:

- removes import-run history with the user/account rows after required lifecycle audit snapshots are persisted.

This keeps purge useful as a clean re-import boundary without unnecessarily erasing execution history, while account/user deletion still removes account-owned run rows.

## 4. Additional validation requirements

ONB-019/020/021 must add:

- a synchronous writer that starts before fence creation, performs expensive work, then attempts a guarded commit and is rejected;
- a synchronous writer already inside the guarded transaction, with fence creation blocked until it commits, followed by correct destructive execution;
- user-fence versus account/game-fence concurrent creation tests under the user-scoped serialization lock;
- account purge retaining terminal import runs but clearing coverage/current pointers;
- account deletion removing the retained import runs after audit snapshot;
- proof that retained terminal import rows cannot be resumed or counted as current coverage.

## 5. Queue and decision impact

- ONB-019 scope now includes the commit-side synchronous writer guard and cross-resource conflict serialization.
- ONB-020 scope now explicitly retains terminal import history during purge and removes it during account deletion.
- ONB-021 consumes the same guard for all user-scoped synchronous writes.
- The parent report remains otherwise unchanged.
