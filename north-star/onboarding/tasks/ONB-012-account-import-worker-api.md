# ONB-012 — Build durable account-import worker and API lifecycle

Status: DONE

Priority: P0

Order: 120

Delivery class: Implementation

Planning maturity: Researched; initial operational defaults supplied by ONB-007

GitHub issue: [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200)

Target branch: `main`

Claimed branch: `account-import/onb-012-worker-api`

Pull request: [#352](https://github.com/vokerg/chess_repertoir_trainer/pull/352)

Completion branch: `account-import/onb-012-completion-reconciliation`

Completion pull request: [#354](https://github.com/vokerg/chess_repertoir_trainer/pull/354)

Claimed by: ChatGPT / account-import implementation session

Claimed at: 2026-08-11

Claim scope: provider-neutral account-import command/read API, lifecycle repository, single-executor worker loop, exact work-key fencing/drain, pause/cancel acknowledgement, retry/retry-at recovery, shared admission-guard integration, worker-process hosting, and focused contracts/tests; no provider traversal, Angular, preparation orchestration, destructive lifecycle persistence, or `JobRun`/`JobTask` changes

## Outcome

Accept, claim, execute, observe, pause, cancel, retry, recover, drain, and shut down account-import runs without holding HTTP requests or reusing imported-game task rows.

## Dependencies

- ONB-011.
- ONB-007 throughput/progress report for poll, heartbeat, stale, backlog, telemetry, and scaling defaults.
- Consume accepted ONB-004 fence/drain semantics.
- Coordinate one stable lifecycle-fence admission and exact active-claim/drain seam with ONB-019 and ONB-020.

## In scope

- Typed create/list/detail/control routes and application services.
- `202 Accepted` durable command behavior with a one-second internal p90 acceptance budget.
- PostgreSQL import-run claim/heartbeat/stale-recovery repository.
- One-concurrent-run account-import loop in the existing worker deployment.
- Initial timing defaults: 1-second poll, 15-second heartbeat, 2-minute stale threshold, 30-second recovery scan.
- Work-key fencing and `AbortSignal`.
- Explicit provider rate-limited/retry-at state distinct from worker staleness.
- Pause/resume and cancellation acknowledgement only after safe quiescence and provider claim release.
- Retry as a new linked run.
- Exact repository/service projection proving whether an account import still owns an active claim/work key.
- One provider-neutral lifecycle-fence admission seam that ONB-019 can implement without provider-specific duplication.
- Graceful shutdown and terminal history.
- Aggregate queue-wait, provider, parse, write, checkpoint, retry-at, heartbeat, and cancellation timing without personal payloads.
- Backlog alerting at more than 20 queued runs for five minutes or oldest queue age above five minutes.
- Ownership/restart/concurrency/fence-admission/drain/telemetry tests.

ONB-012 may land before ONB-019 if the fence seam is explicit and its temporary allow-all implementation does not claim destructive safety. ONB-019 later supplies persisted fence enforcement through that seam; ONB-020 consumes exact cancellation acknowledgement and drain proof.

## Out of scope

- Provider adapter behavior.
- Angular UI.
- Imported-game wave orchestration.
- Lifecycle-operation/fence persistence and audit owned by ONB-019.
- Destructive phase execution owned by ONB-020.
- External broker or new deployment.
- Parallel provider execution in the first release.
- Public ETA.

## Acceptance criteria

- Accepted work survives API/worker restart.
- Provider I/O occurs outside transactions and lifecycle guards.
- Exactly one provider execution is active initially.
- Heartbeats continue independently of provider parsing and persistence batches.
- Stale workers cannot checkpoint or settle.
- HTTP 429/retry-at is visible and does not become false stale recovery.
- Pause/cancel become acknowledged only after safe quiescence or stale-claim recovery and claim release.
- Retry preserves history and resumes from proved coverage.
- Terminal or cancellation-requested status alone is not treated as drain proof.
- ONB-020 can verify that no target account-import claim/work key remains before destructive success.
- Exactly one lifecycle-fence admission seam exists for ONB-019 integration.
- Metrics expose queue age and stage timings without PGN, username, provider URL, or token material.
- Shared-worker operation meets reconcile/claim timing; provider deployment split is triggered only by sustained queue age or heartbeat interference.
- `JobRun`/`JobTask` behavior is unchanged.

## Required validation

- API contract and ownership tests.
- Claim concurrency/work-key fencing tests.
- 15-second heartbeat / 2-minute stale recovery tests using controlled clocks.
- Rate-limit retry-at versus stale-worker tests.
- Pause/resume/cancel/retry and claim-release tests.
- Fence-admission interface and exact-drain tests.
- Worker shutdown tests.
- Queue-age/backlog telemetry tests.
- Full API and architecture gates.

## Completion

Runtime review-ready: 2026-08-11.

Final runtime pull-request head: `dc4e9bc40e9da45c03e83904dfe0864a10cef289`.

Runtime validation: final refreshed head CI #2645 (`31505680257`) completed successfully after the implementation branch was reconciled with then-current `main`. Earlier exact ONB-012 review heads also passed CI #2641 and #2643 across lint, full build, architecture/hygiene, migrations, all opening audits, and the complete monorepo test suite.

Runtime integration: PR #352 squash-merged into `main` as `640018e4cd3c5528a94b9d0217e971ab2a2215b7` on 2026-08-11.

Completion evidence:

- [ONB-012 self-review addendum](../reports/ONB-012-2026-08-11-self-review-addendum.md)
- [ONB-012 second self-review addendum](../reports/ONB-012-2026-08-11-second-self-review-addendum.md)
- [ONB-012 third self-review addendum](../reports/ONB-012-2026-08-11-third-self-review-addendum.md)
- [ONB-012 completion reconciliation](../reports/ONB-012-2026-08-11-completion-reconciliation.md)
- completion PR #354 synchronizes this task, `TASKS.md`, `STATUS.md`, and the downstream ONB-013/014 task promotion after the runtime merge.

Residual risks: the provider executor registry remains intentionally empty until ONB-013/014; persisted destructive lifecycle fences remain ONB-019-owned; destructive account/game execution remains ONB-020-owned; no public production ETA or throughput guarantee is implied by CI-local evidence.

Completed at: 2026-08-11
