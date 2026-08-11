# ONB-012 — Second self-review addendum

Date: 2026-08-11

Task: [ONB-012](../tasks/ONB-012-account-import-worker-api.md)

Issue: [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200)

Pull request: [#352](https://github.com/vokerg/chess_repertoir_trainer/pull/352)

## Purpose

This append-only addendum records the second adversarial review performed after ONB-012 first reached `REVIEW`. The pass concentrated on failure containment, non-cooperative provider control, shared-process shutdown, retry lineage, and the ONB-019 fence handoff rather than reopening the already validated API/contract surface.

## Finding 1 — Settlement persistence failure could terminate the shared worker loop

Severity: high / availability.

Executor work can finish while a short terminal persistence operation fails transiently. Letting that repository exception escape the per-claim boundary would terminate the account-import loop and, because the loop shares the existing worker process, could force peer-worker shutdown as well.

### Correction

Settlement persistence failures are caught at the claimed-run boundary. The worker logs only safe error type/code metadata, leaves the exact claim in place for normal stale recovery, and continues scheduling. A dedicated resilience test proves completion is attempted only once for the claim, the worker makes another scheduling pass, and the raw thrown error message is not emitted.

## Finding 2 — Control observation could suppress stale recovery forever

Severity: high / lifecycle.

When a heartbeat observed `PAUSE_REQUESTED` or `CANCEL_REQUESTED`, the worker aborted the provider executor but continued renewing `heartbeatAt`. If a future provider adapter ignored its `AbortSignal`, that renewal would prevent stale recovery from ever releasing the claim and could leave destructive drain blocked indefinitely.

### Correction

After the first heartbeat observes a control request, the worker stops renewing that claim heartbeat. Cooperative executors are acknowledged after quiescence; non-cooperative executors therefore become eligible for the existing stale-recovery path.

Validation now covers both layers:

- a worker-level test keeps a deliberately non-cooperative executor alive and proves only one control-observing heartbeat occurs;
- a PostgreSQL integration test proves stale `PAUSE_REQUESTED` and `CANCEL_REQUESTED` claims settle to `PAUSED` / `CANCELLED`, release their work keys, and fence the pre-recovery worker from later checkpoint/completion.

## Finding 3 — Peer-worker failure cleanup was unbounded

Severity: high / availability.

Signal-triggered shutdown already used the configured timeout, but if either worker loop failed unexpectedly the shared host awaited both worker promises without a bound. A peer executor that ignored abort could therefore hang process teardown indefinitely.

### Correction

The worker host computes one shutdown ceiling from the generic-job and account-import worker configurations and applies it to both signal shutdown and peer-worker failure cleanup. If cooperative cleanup does not settle inside that bound, the process exits unsuccessfully instead of hanging.

## Finding 4 — Repository retry validation did not preserve import mode lineage

Severity: medium / invariant.

The public retry service copies the source mode, but the repository boundary previously validated only canonical scope and requested range. An internal caller could therefore link a retry while silently changing durable semantics from, for example, `BOUNDED_INITIAL` to `HISTORICAL_BACKFILL`.

### Correction

Linked retries must now preserve source mode, canonical scope hash, and immutable requested range. A database-backed regression test intentionally attempts a mode-changing retry and proves `AccountImportInvalidRetryError` is raised.

## Finding 5 — Canonical onboarding metadata lagged the merged prerequisite

Severity: low / coordination.

ONB-011 was already merged through PR #339 while the canonical queue/status text still described durable import persistence as proposed. That made ONB-012's `REVIEW` state inconsistent with its direct prerequisite.

### Correction

The ONB-011 queue/status metadata now records the merged persistence foundation and retains ONB-019 ownership of persisted destructive lifecycle fences. ONB-012 remains `REVIEW`; ONB-013/014/015 remain unpromoted.

## Additional review checks

The second pass also rechecked:

- retry creates a new linked history row while proved account/scope coverage remains in the separate coverage ledger for adapters to resume from;
- provider network work remains outside database transactions and lifecycle guards;
- stale/released workers still cannot checkpoint, persist games, advance coverage, or settle because durable write paths require the exact active `workKey`;
- `RETRY_AT` / provider cooldown remains distinct from stale-worker recovery;
- the current `AccountImportAdmissionGuard` remains the single provider-neutral ONB-019 seam used at durable acceptance, claim admission, and bounded personal-data/coverage commits; no second API-specific fence path was added;
- ONB-019 must make future claim denial starvation-safe when it supplies persisted fences, rather than ONB-012 inventing provisional destructive-lifecycle storage;
- queued-run backlog telemetry remains aligned with ONB-007's accepted-work definition while explicit rate-limit delay is emitted separately;
- no broker, new deployment, generic workflow abstraction, provider adapter, Angular flow, or `JobRun`/`JobTask` mutation was introduced.

## Validation

- initial corrected code/test head `fc5d3cca02ae13a0264f70c5ce5fa183632df242`: CI #2607 (`31466840636`) passed the complete repository gate;
- initial review/docs head `c6d9b8a3e674ee68a3cd008066a36a264d1a75b4`: CI #2610 (`31467634145`) passed the same gate;
- second-pass head `0367d88525762bfd0c89c0b1763600a86735a4d7`, containing settlement resilience, control-heartbeat fallback, bounded peer shutdown, retry-mode validation, and their focused tests: CI #2624 (`31476918345`) passed;
- second-pass code/test head `410579557b34d79266c978d3dc89470a7976aeb2`, additionally containing the database-backed stale pause/cancel recovery regression: CI #2625 (`31477206091`) passed lint, full build, architecture/hygiene, the complete migration chain, all opening audits, and the complete monorepo test suite.

The documentation-only review-evidence commits that follow this report receive their own exact-head CI before final review readiness is reconfirmed.

## Result

No further ONB-012 production correction remained after this second review. ONB-012 stays in `REVIEW`; this addendum does not mark the task `DONE`, close issue #200, or authorize merging PR #352.