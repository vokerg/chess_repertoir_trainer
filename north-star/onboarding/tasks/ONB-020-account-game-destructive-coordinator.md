# ONB-020 — Implement account and imported-game destructive lifecycle coordinator

Status: PROPOSED

Priority: P0

Order: 170

Delivery class: Implementation

Planning maturity: Allocated by ONB-004; blocked on lifecycle, durable import, and preparation foundations

GitHub issue: [#260](https://github.com/vokerg/chess_repertoir_trainer/issues/260)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Implement restart-safe un-analysis, un-indexing, account-data purge, and external-account deletion over the ONB-004 contract and ONB-019 operation/fence/audit foundation.

## Dependencies

- ONB-004 / #151 accepted.
- ONB-019 / #259 operation, fence, audit, provenance foundation.
- ONB-011/012 durable import lifecycle and ONB-015 sync cutover.
- ONB-017/018 preparation persistence/control for parent and child cancellation acknowledgement.
- ONB-005 before administrator mutation exposure.
- Consumed by ONB-021 / #261.

## In scope

- Bounded preview counts and execute services for `UNANALYSE_GAMES`, `UNINDEX_GAMES`, `PURGE_ACCOUNT_DATA`, and `DELETE_EXTERNAL_ACCOUNT`.
- Persisted scope fences before cancellation or destructive writes.
- Preparation/import/job cancellation requests and drain checks, including zero target `JobTask.workKey` claims before execution.
- Forward-only checkpointed phases with deterministic game-id batching and idempotent retry.
- Un-analysis deletion/clearing rules for runs, snapshots, AI review, ply classifications, all tactical versions/processed markers, and tag recomputation.
- Retention of shared Position/PositionAnalysis, tactical feedback, and self-contained scenario-training snapshots during un-analysis.
- Un-index as un-analysis followed by ply/index removal and provenance-aware local opening reset.
- Account purge of imported games, copied scenario data, import/coverage state, rating statistics, and sync frontiers while retaining the account and independent OAuth connection.
- Account deletion as purge plus final account removal and default-account cleanup.
- Thin authenticated preview/execute/status routes.
- Deprecation/cutover of immediate `DELETE /api/me/accounts/:id` and raw cursor reset.
- Canonical documentation and focused large-fixture/race/restart tests.

## Out of scope

- Whole-user deletion and device-local purge.
- Shared Position cleanup.
- Administrator authorization/UI.
- Provider adapter redesign.

## Acceptance criteria

- No operation reports success while a target import claim or game-task work key remains active.
- Active fences reject new target sync/import/job/preparation work.
- Failed operations resume without restoring deleted rows or duplicating audit events.
- Un-analysis retains shared engine analysis and non-analysis tags.
- Un-index cannot leave current per-game analysis evidence.
- Account purge leaves a reusable account with no imported games, copied scenario data, exact coverage, rating stats, or sync frontier.
- Account deletion no longer performs one immediate unfenced cascade.
- Bounded transactions and memory hold for large-account fixtures.

## Required validation

- Per-action row matrix integration tests.
- Running index/analysis/process/tag job cancellation races.
- Durable import and preparation cancellation acknowledgement tests.
- Cross-request idempotency and stale-preview tests.
- Operation crash/restart after every phase boundary.
- Shared Position/PositionAnalysis retention tests.
- Tactical feedback/scenario retention tests for un-analysis and deletion tests for purge.
- Opening provenance reset tests.
- Large-account batch and database-pressure tests.

## Completion

Report: none

Pull request: none

Completed at: none
