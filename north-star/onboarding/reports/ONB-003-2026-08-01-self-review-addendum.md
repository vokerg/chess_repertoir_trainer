# ONB-003 — Self-review addendum

Date: 2026-08-01

Task: [ONB-003](../tasks/ONB-003-progressive-preparation-orchestration.md)

Pull request: [#256](https://github.com/vokerg/chess_repertoir_trainer/pull/256)

## Purpose

This addendum records the final self-review performed before squash merge. It supplements the main ONB-003 report without replacing its accepted parent/batch/reconciler design.

## Finding 1 — Global admission required cross-parent serialization

Severity: high.

The main report required hard global limits for non-terminal onboarding batches and queued onboarding tasks, but its batch-creation transaction locked only one `DataPreparationRun`. Two reconcilers handling different parents could therefore both observe available global capacity and admit work concurrently, exceeding the configured cap.

### Correction

ONB-017 must serialize the **global admission decision** inside the same short transaction that counts capacity and creates a batch/job/tasks. Use one of these repository-approved PostgreSQL mechanisms:

- a dedicated singleton admission row locked with `SELECT ... FOR UPDATE`; or
- a transaction-scoped PostgreSQL advisory lock with a stable preparation-admission key.

After acquiring that lock, the transaction must re-count global non-terminal onboarding batches and queued onboarding tasks, reject/defer admission when either cap is reached, and create the batch plus child job/tasks before releasing the lock at commit.

The lock is admission-only. It must never cover provider I/O, PGN processing, Stockfish execution, polling waits, or general parent reconciliation.

Required validation now includes two reconcilers admitting work for different users/parents at the boundary and proving the configured global cap cannot be exceeded.

## Finding 2 — Multi-account fairness needed stage-specific ordering

Severity: medium.

The main report described account-round-robin ordering using the lowest completed batch count, but did not state whether index and analysis batches shared one count. A shared count could let analysis activity distort later index selection, or vice versa.

### Correction

Round-robin admission is **stage-specific**:

- index admission compares prior admitted/settled `INDEX` batches per target;
- analysis admission compares prior admitted/settled `ANALYSIS` batches per target;
- immutable target ordinal is the deterministic tie-break;
- retry batches do not advance the normal stage fairness cursor unless the implementation explicitly records them as replacing the failed normal slot.

This preserves one active index and one active analysis batch per run while preventing one account or one stage from distorting the other stage's fairness.

## Additional checks

The self-review also rechecked:

- current worker priority, slice, same-game fencing, cancellation acknowledgement, stale recovery, and retention behavior;
- evidence-only reconciliation after child dismissal/deletion;
- progressive import commits and exact-coverage completion gating;
- first-analysis dependency and direct-user preemption;
- pause, cancel, retry, restart, and expansion semantics;
- issue/task ownership boundaries for ONB-004, ONB-007, ONB-008, ONB-009, ONB-011 through ONB-015, ONB-017, and ONB-018.

No additional production architecture problem was found after the two corrections above.

## Validation

PR CI run `30711672997` passed lint, build, architecture guardrails, migrations, audits, and tests on the pre-correction head. The correction commit is documentation-only and receives a fresh PR CI run before merge.
