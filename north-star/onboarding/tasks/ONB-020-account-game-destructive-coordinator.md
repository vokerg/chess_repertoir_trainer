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

- ONB-004 / #151 accepted, including both self-review addenda.
- ONB-019 / #259 operation, fence, synchronous commit guard, failure-state, audit, and provenance foundation.
- ONB-011/012 durable import lifecycle and ONB-015 sync cutover.
- ONB-017/018 preparation persistence/control for parent and child cancellation acknowledgement.
- ONB-005 before administrator mutation exposure.
- Consumed by ONB-021 / #261.

## In scope

- Bounded preview counts and execute services for `UNANALYSE_GAMES`, `UNINDEX_GAMES`, `PURGE_ACCOUNT_DATA`, and `DELETE_EXTERNAL_ACCOUNT`.
- Persisted scope fences before cancellation or destructive writes.
- Preparation/import/job cancellation requests and drain checks, including zero target `JobTask.workKey` claims before execution.
- Verification that every direct synchronous writer uses the ONB-019 guarded commit boundary; no AI/tag/tactical/scenario/provider write may commit after a fence.
- Forward-only checkpointed phases with deterministic game-id batching and idempotent retry.
- Stop/failure handling that permits terminal cancellation only before the first destructive mutation and retains the fence/checkpoint afterward.
- Un-analysis deletion/clearing rules for runs, snapshots, AI review, ply classifications, all tactical versions/processed markers, and tag recomputation.
- Retention of shared Position/PositionAnalysis, tactical feedback, and self-contained scenario-training snapshots during un-analysis.
- Un-index as un-analysis followed by ply/index removal and provenance-aware local opening reset.
- Account purge of imported games, copied scenario data, exact coverage/current import pointers, rating statistics, and sync frontiers while retaining the account, terminal `ImportRun` history, and independent OAuth connection.
- Source-preserving purge order: select target game IDs and delete scenario sessions/attempts while `importedGameId`/`tacticalDetectionId` still identify the source, before game/detection cascades can set those links null.
- Postcondition verification that no copied target-game scenario personal data remains.
- Verification that retained terminal import runs cannot be resumed or counted as current coverage.
- Account deletion as purge plus bounded audit snapshot, final account removal, default-account cleanup, and cascade removal of account-owned import history.
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
- A direct synchronous writer started before fence creation cannot commit afterward unless it already held the conflicting short guard before fence creation committed.
- Failed/paused partial operations retain their resource fence and resume from deterministic checkpoints; they cannot become terminal `CANCELLED` after destructive execution begins.
- Un-analysis retains shared engine analysis and non-analysis tags.
- Un-index cannot leave current per-game analysis evidence.
- Scenario sessions sourced from target games are deleted before relational source links can be nulled by game/detection cascade.
- Account purge leaves a reusable account with no imported games, copied scenario data, exact coverage/current pointer, rating stats, or sync frontier, while retaining terminal import execution history.
- Account deletion removes the account and account-owned terminal import history after lifecycle audit snapshot.
- Account deletion no longer performs one immediate unfenced cascade.
- Bounded transactions and memory hold for large-account fixtures.

## Required validation

- Per-action row matrix integration tests.
- Running index/analysis/process/tag job cancellation races.
- Direct AI/tag/tactical/scenario writer guarded-commit races.
- Durable import and preparation cancellation acknowledgement tests.
- Cross-request idempotency and stale-preview tests.
- Failure before/after first destructive mutation and durable fence-retention tests.
- Operation crash/restart after every phase boundary.
- Shared Position/PositionAnalysis retention tests.
- Tactical feedback/scenario retention tests for un-analysis.
- Scenario-source deletion-before-SetNull race/order test for account purge.
- Post-purge copied-personal-scenario verification test.
- Opening provenance reset tests.
- Account purge retained-terminal-run/current-coverage separation test.
- Account delete terminal-run cascade plus audit-snapshot test.
- Large-account batch and database-pressure tests.

## Completion

Report: none

Pull request: none

Completed at: none
