# ONB-012 — Build durable account-import worker and API lifecycle

Status: PROPOSED

Priority: P0

Order: 120

Delivery class: Implementation

Planning maturity: Researched; initial operational defaults supplied by ONB-007

GitHub issue: [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Accept, claim, execute, observe, pause, cancel, retry, recover, and shut down account-import runs without holding HTTP requests or reusing imported-game task rows.

## Dependencies

- ONB-011.
- ONB-007 throughput/progress report for poll, heartbeat, stale, backlog, telemetry, and scaling defaults.

## In scope

- Typed create/list/detail/control routes and application services.
- `202 Accepted` durable command behavior with a one-second internal p90 acceptance budget.
- PostgreSQL import-run claim/heartbeat/stale-recovery repository.
- One-concurrent-run account-import loop in the existing worker deployment.
- Initial timing defaults: 1-second poll, 15-second heartbeat, 2-minute stale threshold, 30-second recovery scan.
- Work-key fencing and `AbortSignal`.
- Explicit provider rate-limited/retry-at state distinct from worker staleness.
- Pause/cancel acknowledgement only after provider claim release.
- Retry as a new linked run.
- Graceful shutdown and terminal history.
- Aggregate queue-wait, provider, parse, write, checkpoint, retry-at, heartbeat, and cancellation timing without personal payloads.
- Backlog alerting at more than 20 queued runs for five minutes or oldest queue age above five minutes.
- Ownership/restart/concurrency/telemetry tests.

## Out of scope

- Provider adapter request/window behavior.
- Angular UI.
- Imported-game wave orchestration.
- External broker or new deployment.
- Parallel provider execution in the first release.
- Public ETA.
- Final destructive deletion workflow.

## Acceptance criteria

- Accepted work survives API/worker restart.
- Provider I/O occurs outside transactions.
- Exactly one provider execution is active initially.
- Heartbeats continue independently of provider parsing and persistence batches.
- Stale workers cannot checkpoint or settle.
- HTTP 429/retry-at is visible and does not become false stale recovery.
- Pause/cancel become terminal only after acknowledgement and claim release.
- Retry preserves history and resumes from proved coverage.
- Metrics expose queue age and stage timings without PGN, username, provider URL, or token material.
- Shared-worker operation meets reconcile/claim timing; provider deployment split is triggered only by sustained queue age or heartbeat interference.
- `JobRun`/`JobTask` behavior is unchanged.

## Required validation

- API contract and ownership tests.
- Claim concurrency/fencing tests.
- 15-second heartbeat / 2-minute stale recovery tests using controlled clocks.
- Rate-limit retry-at versus stale-worker tests.
- Pause/cancel/retry and claim-release tests.
- Worker shutdown tests.
- Queue-age/backlog telemetry tests.
- Full API and architecture gates.

## Completion

Report: none

Completed at: none
