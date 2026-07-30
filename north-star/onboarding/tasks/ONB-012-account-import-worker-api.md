# ONB-012 — Build durable account-import worker and API lifecycle

Status: PROPOSED

Priority: P0

Order: 120

Delivery class: Implementation

Planning maturity: Researched

GitHub issue: [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Accept, claim, execute, observe, pause, cancel, retry, recover, and shut down account-import runs without holding HTTP requests or reusing imported-game task rows.

## Dependencies

- ONB-011.
- Consume ONB-007 operational defaults before production tuning.

## In scope

- Typed create/list/detail/control routes and application services.
- `202 Accepted` durable command behavior.
- PostgreSQL import-run claim/heartbeat/stale-recovery repository.
- One-concurrent-run account-import loop in the existing worker deployment.
- Work-key fencing and `AbortSignal`.
- Pause/cancel acknowledgement.
- Retry as a new linked run.
- Graceful shutdown and terminal history.
- Ownership/restart/concurrency tests.

## Out of scope

- Provider adapter behavior.
- Angular UI.
- Imported-game wave orchestration.
- External broker or new deployment.
- Final destructive deletion workflow.

## Acceptance criteria

- Accepted work survives API/worker restart.
- Provider I/O occurs outside transactions.
- Stale workers cannot checkpoint or settle.
- Pause/cancel become terminal only after acknowledgement.
- Retry preserves history and resumes from proved coverage.
- `JobRun`/`JobTask` behavior is unchanged.

## Required validation

- API contract and ownership tests.
- Claim concurrency/fencing tests.
- Heartbeat/stale recovery tests.
- Pause/cancel/retry tests.
- Worker shutdown tests.
- Full API and architecture gates.

## Completion

Report: none

Completed at: none
