# ONB-012 — Third self-review addendum

Date: 2026-08-11

Task: [ONB-012](../tasks/ONB-012-account-import-worker-api.md)

Issue: [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200)

Pull request: [#352](https://github.com/vokerg/chess_repertoir_trainer/pull/352)

## Purpose

This append-only addendum records a third adversarial review after ONB-012 had already passed two review-ready passes. The review focused on the future ONB-019 lifecycle-fence handoff, provider-adapter readiness for ONB-013/014, and integrity of durable progress evidence rather than reopening previously validated worker/control behavior.

## Finding 1 — A fenced top-priority queue entry could starve otherwise runnable imports

Severity: high / coordination.

The worker claim transaction selected the highest-priority runnable queue entry and only then called the lifecycle admission guard. The temporary allow-all guard made that harmless in ONB-012 itself, but once ONB-019 supplies persisted lifecycle fences, a fenced high-priority run could repeatedly win selection, be rejected after selection, and prevent an allowed lower-priority account from being claimed.

### Correction

The single provider-neutral `AccountImportAdmissionGuard` now exposes both parts of admission through the same seam:

- `claimCandidatePredicate(...)` supplies a database predicate applied before priority ordering and `LIMIT 1`, so denied queue entries do not starve allowed work;
- `assertAllowed(...)` remains the transactional race-safe recheck immediately before claim mutation and before existing acceptance/write mutations.

The temporary ONB-012 implementation still returns an allow-all SQL predicate and performs no destructive-safety claim. A PostgreSQL regression places a fenced high-priority run ahead of an allowed lower-priority run and proves the allowed run is claimed while the fenced run stays queued. A deny-all predicate also returns no claim without invoking the post-selection assertion.

## Finding 2 — Lifecycle-fence admission denial lacked a stable API contract

Severity: medium / API integration.

Once ONB-019 replaces the allow-all guard, create, resume, or retry may be rejected by an active lifecycle fence. Without a typed provider-neutral error, that rejection would have no stable account-import API mapping and could surface as an internal server error.

### Correction

ONB-012 now defines `AccountImportAdmissionBlockedError` with shared code `ACCOUNT_IMPORT_ADMISSION_BLOCKED`. Account-import create/resume/retry map that error to HTTP `409 Conflict`, and the shared contract test fixes the public code. The message remains generic and contains no lifecycle payload or personal data.

## Finding 3 — Durable completed-window progress could move backwards

Severity: high / durability.

`checkpointRun` required the exact active work key and bounded completed windows by the known total, but it did not require `windowsCompleted` to be non-decreasing. A buggy provider adapter holding the valid active claim could therefore overwrite authoritative restart/progress evidence with a lower completed-window count.

### Correction

The fenced checkpoint update now rejects a supplied `windowsCompleted` lower than the value already persisted. The lifecycle integration test advances the run to one completed window, attempts to rewind it to zero, and proves both the update failure and the retained durable value.

## Finding 4 — Provider adapters had no durable path to establish an initially unknown window denominator

Severity: medium / provider contract.

User-action account imports are accepted before provider traversal and may therefore start with `windowsTotal = null`. The executor checkpoint contract previously had no mutation path for ONB-013/014 to persist the fixed provider-window denominator after planning it, even though the public progress model includes that denominator.

### Correction

The exact-work-key `RUNNING` checkpoint operation can now initialize `windowsTotal` when it is still unknown. Once established, the denominator is immutable through checkpoints. The update also requires the total not to fall below already-completed progress and requires completed progress to stay within the effective fixed denominator.

A PostgreSQL regression starts a claimed run with `windowsTotal = null`, establishes total `3` with one completed window, rejects a later attempt to change the total to `4`, rejects a completed-window rewind, and proves the retained `3 / 1` progress snapshot.

## Additional review checks

The third pass also rechecked that:

- durable acceptance, claim filtering, claim-time race recheck, imported-game persistence, and coverage advancement continue to use the same exported `AccountImportAdmissionGuard` implementation seam;
- a fence appearing between candidate filtering and transactional `assertAllowed` is already contained by the worker's per-poll claim `try/catch`; it produces a safe failed claim attempt and does not terminate the worker loop;
- ONB-019 still owns persisted lifecycle-operation/fence state and must implement both the SQL candidate predicate and transactional assertion through this seam;
- provider network work remains outside database transactions and lifecycle guards;
- exact `workKey` fencing remains required for checkpoints, game persistence, coverage advancement, settlement, control acknowledgement, and release;
- retry mode/scope/range lineage remains unchanged; this pass does not invent new retry-window semantics;
- no provider adapter, Angular flow, Prisma schema/migration, broker, new deployment, parallel provider execution, or generic `JobRun`/`JobTask` change was introduced.

## Validation

- prior final review/evidence head `27eb0906743a83b70d2e0835c330ddd95ed56cb3`: CI #2631 (`31477936190`) passed the complete repository gate;
- third-pass intermediate head `7f97e6794dd32f3690123d9a8d3473b51918e5b6`, containing starvation-safe admission, typed conflict handling, and monotonic completed-window progress: CI #2639 (`31480057638`) passed lint, full build, architecture/hygiene, the complete migration chain, all opening audits, and the complete monorepo test suite;
- third-pass code/test head `f0c29cbddd89c6d658ec3c03cff26e3bac8e5fa7`, additionally containing fixed window-denominator initialization and its PostgreSQL regression: CI #2641 (`31480536544`) passed the same complete gate.

The documentation-only evidence commits following this report receive a fresh exact-head CI run before review readiness is reconfirmed.

## Result

No additional ONB-012 production correction remained after the third review pass. ONB-012 stays in `REVIEW`; this addendum does not mark the task `DONE`, close issue #200, or authorize merging PR #352.
