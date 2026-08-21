# ONB-015 — Cut over account sync and preparation handoff

Status: IN_PROGRESS

Priority: P1

Order: 150

Delivery class: Implementation

Planning maturity: Researched; ONB-013/014 provider adapters and ONB-017/018 preparation execution/control are complete

GitHub issue: [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203)

Claimed by: ChatGPT

Claim branch: `account-import/onb-015-account-cutover`

Claimed at: 2026-08-21

Claim scope: durable normal account-refresh cutover over the existing account-import lifecycle, persisted Angular import-run status/control and reload restoration, provider-neutral rating/activity and preparation handoff, compatibility/rollout documentation, and focused regression coverage; no provider-adapter internals, lifecycle-fence persistence, destructive execution, ONB-009/010 onboarding commands/UI, broker, or new deployable service

Promoted at: 2026-08-17 through ONB-018 completion reconciliation

## Outcome

Move normal account sync/UI to durable import runs and connect import progress to server-side preparation candidate selection without ID arrays or raw cursor reset.

## Dependencies

- ONB-013.
- ONB-014.
- ONB-003 handoff contract and ONB-017/018 preparation persistence/control.
- Consume accepted ONB-004 lifecycle semantics.
- Coordinate lifecycle guards with ONB-019 and final destructive route/action cutover with ONB-020.
- Coordinate ONB-009, ONB-010, and Activity Feed import reconciliation.

## In scope

- Legacy normal-sync command compatibility wrapper/cutover to `202 Accepted` durable import creation.
- Account Angular persisted background status, pause/cancel/retry, reload restoration, and recovery.
- Remove/deprecate raw cursor-reset UX in favor of explicit bounded historical backfill.
- One provider-neutral coalesced rating-stat refresh policy.
- Provider-neutral played-game activity reconciliation using actual game dates.
- Rating/activity writes use the ONB-019 short guarded-commit rule or an equivalent restart-safe reconciler that revalidates scope immediately before mutation.
- Database-based bounded eligible-unindexed selection for preparation; no response ID arrays.
- Preserve account URLs and ownership semantics where practical.
- Deployment ordering, compatibility, rollback, API/store/browser, and no-ID-array tests.

Normal background refresh may cut over before ONB-020 only if destructive controls remain explicitly limited or disabled. ONB-015 must not implement or claim final safe account purge/delete/reset behavior; lifecycle operation/fence persistence belongs to ONB-019 and destructive execution/legacy-route cutover belongs to ONB-020.

## Out of scope

- Provider adapter internals.
- Index/analysis wave implementation.
- Lifecycle-operation/fence persistence.
- Destructive row phases and final account-delete coordinator.
- Final visual/accessibility polish.

## Acceptance criteria

- Account sync returns after durable acceptance.
- Active import restores after navigation/reload/session changes.
- Refresh-all does not serially await provider traversal in the browser.
- No response returns all imported/eligible IDs.
- Preparation selects candidates server-side and bounded.
- Forward sync and historical backfill are distinct; raw cursor reset is removed from normal UX.
- Rating stats and played-game activity are provider-neutral, idempotent, not duplicated, and cannot commit stale writes after a lifecycle fence.
- No provider or large aggregation work runs while holding the lifecycle guard.
- Destructive controls delegate to ONB-020 or remain explicitly limited/disabled without false success claims.
- Legacy migration/rollback and worker-required deployment ordering are explicit.
- Synchronous provider traversal is removed from account HTTP routes.

## Required validation

- Route compatibility, ownership, and OpenAPI tests.
- Angular store/component tests for queued/running/paused/terminal/failure/cancel/retry/reload states.
- Browser reload/navigation/multi-account/failure/retry review.
- No-ID-array and bounded preparation handoff tests.
- Rating/activity idempotency and lifecycle-fence-race tests.
- Tests proving destructive controls do not bypass or duplicate ONB-020.
- Architecture and full web/API/contracts gates.

## Completion

Report: none

Completed at: none
