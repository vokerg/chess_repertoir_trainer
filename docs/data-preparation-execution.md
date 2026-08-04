# Data preparation execution boundary

ONB-017 adds the internal PostgreSQL boundary used by onboarding and later preparation flows. It deliberately does not add a public route or a worker loop.

## Ownership

`DataPreparationRun` is the durable user-level parent. It stores the immutable recipe snapshot, lifecycle/control state, attention data, milestones, retry lineage, and reconciliation hint.

`DataPreparationTarget` is the ordered account boundary. It stores the immutable account identity snapshot, scope version/hash/JSON, half-open requested range, optional current `ImportRun` link, and account milestones. Account deletion sets the current account link to `NULL` without deleting historical target evidence.

`DataPreparationBatch` is retained execution evidence for one bounded index or analysis wave. It stores the lane, immutable planned limit and total-task denominator, optional child `JobRun` link, terminal counts, and queue/settlement timestamps. Child-job deletion sets the link to `NULL`; database triggers snapshot child counts before retention can remove the job.

ONB-011 remains the owner of durable provider-import coverage and retry history. ONB-019 remains the owner of destructive lifecycle operations, resource fences, and audit records. Preparation exposes an admission guard that ONB-019 can replace inside the existing transaction.

## Database invariants

The migration adds PostgreSQL partial unique indexes for:

- one non-terminal preparation run per user;
- one non-terminal batch per preparation run and stage.

The database, rather than the reconciler, is the final concurrency authority for these constraints.

## Admission transaction

`createPreparationRepository().admitNextBatch(...)` performs one short transaction:

1. acquire the transaction-scoped global preparation advisory lock;
2. lock the owned parent and target rows;
3. invoke the lifecycle admission guard;
4. reject a duplicate active stage batch;
5. re-count global active preparation batches, queued onboarding tasks, and queued onboarding analysis tasks;
6. calculate the remaining bounded capacity;
7. select eligible games in PostgreSQL from the immutable target account/scope/range, newest first, with `FOR UPDATE ... SKIP LOCKED` and a hard limit;
8. exclude games already present in queued or running child work, plus any cancelled task whose execution `workKey` has not yet been acknowledged;
9. create the retained batch, `JobRun(source = ONBOARDING)`, and ordered `JobTask` rows atomically;
10. link the child and mark a queued parent as running.

The transaction does not execute provider calls, PGN parsing, Stockfish, task polling, or reconciliation. Existing job workers and imported-game executors remain authoritative after commit.

## Defaults and priorities

Environment-backed defaults:

```text
PREPARATION_FIRST_INDEX_BATCH_SIZE=50
PREPARATION_INDEX_CONTINUATION_BATCH_SIZE=50
PREPARATION_FIRST_ANALYSIS_BATCH_SIZE=3
PREPARATION_ANALYSIS_TAIL_BATCH_SIZE=10
PREPARATION_MAX_NON_TERMINAL_BATCHES=4
PREPARATION_MAX_QUEUED_TASKS=200
PREPARATION_MAX_QUEUED_ANALYSIS_TASKS=40
```

Lane priorities:

```text
FIRST_INDEX=200
FIRST_ANALYSIS=190
INDEX_CONTINUATION=180
ANALYSIS_TAIL=100
```

A retry keeps the normal continuation/tail priority for its stage. Existing direct-user priorities remain 250–400, so every user action can preempt preparation.

## Scope snapshot shape

The repository currently understands these immutable `scopeJson` properties:

```json
{
  "rated": "ANY | RATED | UNRATED",
  "speedCategories": ["BLITZ", "RAPID"],
  "variants": ["STANDARD"]
}
```

Missing or empty arrays mean no restriction for that property. Speed and variant comparisons are case-insensitive so recipe vocabulary matches provider-shaped imported values. A standard variant includes the repository's established `null`, `chess`, and `standard` representations. Candidate selection always applies user ownership, target account, `[requestedFrom, requestedTo)`, stage evidence, retry/error policy, active-work exclusion, newest-first ordering, and the computed hard limit.

Normal index admission selects clean unindexed games; index retry selects only unindexed games with a prior index error. Normal analysis admission selects indexed games without an analysis attempt; analysis retry selects only indexed games whose latest analysis status is `FAILED`. `force` remains an explicit analysis override rather than changing retry into general backlog processing.

## Direct-user races

A direct job that commits before preparation candidate selection is excluded from the preparation batch. When preparation commits first and a direct action is accepted immediately afterward, one duplicate may remain queued. This is safe by the existing worker contract: the direct job has higher priority, the active-game `workKey` fence prevents overlapping execution, and the idempotent executor later skips already-current preparation work.

## Integration points

ONB-018 should call this repository from the bounded preparation reconciler and may call `refreshBatchSnapshotForJob` when reconciling a child. ONB-019 should inject its fence-aware admission guard. Public lifecycle commands and readiness projections remain outside this module.
