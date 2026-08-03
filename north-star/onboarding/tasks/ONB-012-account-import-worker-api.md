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

Accept, claim, execute, observe, pause, cancel, retry, recover, drain, and shut down account-import runs without holding HTTP requests or reusing imported-game task rows.

## Dependencies

- ONB-011.
- Consume accepted ONB-004 fence/drain semantics.
- Coordinate one stable lifecycle-fence admission and exact active-claim/drain seam with ONB-019 and ONB-020.
- Consume ONB-007 operational defaults before production tuning.

## In scope

- Typed create/list/detail/control routes and application services.
- `202 Accepted` durable command behavior.
- PostgreSQL import-run claim/heartbeat/stale-recovery repository.
- One-concurrent-run account-import loop in the existing worker deployment.
- Work-key fencing and `AbortSignal`.
- Pause/resume and cancellation acknowledgement only after safe quiescence.
- Retry as a new linked run.
- Exact repository/service projection proving whether an account import still owns an active claim/work key.
- One provider-neutral lifecycle-fence admission seam that ONB-019 can implement without provider-specific duplication.
- Graceful shutdown and terminal history.
- Ownership/restart/concurrency/fence-admission/drain tests.

ONB-012 may land before ONB-019 if the fence seam is explicit and its temporary allow-all implementation does not claim destructive safety. ONB-019 later supplies persisted fence enforcement through that seam; ONB-020 consumes exact cancellation acknowledgement and drain proof.

## Out of scope

- Provider adapter behavior.
- Angular UI.
- Imported-game wave orchestration.
- Lifecycle-operation/fence persistence and audit owned by ONB-019.
- Destructive phase execution owned by ONB-020.
- External broker or new deployment.

## Acceptance criteria

- Accepted work survives API/worker restart.
- Provider I/O occurs outside transactions and lifecycle guards.
- Stale workers cannot checkpoint or settle.
- Pause/cancel become acknowledged only after safe quiescence or stale-claim recovery.
- Retry preserves history and resumes from proved coverage.
- Terminal or cancellation-requested status alone is not treated as drain proof.
- ONB-020 can verify that no target account-import claim/work key remains before destructive success.
- Exactly one lifecycle-fence admission seam exists for ONB-019 integration.
- `JobRun`/`JobTask` behavior is unchanged.

## Required validation

- API contract and ownership tests.
- Claim concurrency/work-key fencing tests.
- Heartbeat/stale recovery tests.
- Pause/resume/cancel/retry tests.
- Fence-admission interface and exact-drain tests.
- Worker shutdown tests.
- Full API and architecture gates.

## Completion

Report: none

Completed at: none
