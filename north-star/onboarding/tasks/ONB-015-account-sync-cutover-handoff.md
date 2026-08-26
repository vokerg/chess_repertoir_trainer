# ONB-015 — Cut over account sync and preparation handoff

Status: DONE

Priority: P1

Order: 150

Delivery class: Implementation

Planning maturity: Delivered through PR #400 after repeated adversarial self-review; runtime head `5a2b6348ee516c477c9353020fd90f365f2cc25a` passed CI #3155 and final PR head `fc2aa0d08afebbc952cf5a55693ee99f77b7d29c` passed CI #3156 before squash merge

GitHub issue: [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203)

Claimed by: ChatGPT

Claim branch: `account-import/onb-015-account-cutover`

Claimed at: 2026-08-21

Claim scope: durable normal account-refresh cutover over the existing account-import lifecycle, persisted Angular import-run status/control and reload restoration, provider-neutral rating/activity and preparation handoff, compatibility/rollout documentation, and focused regression coverage; no provider-adapter internals, lifecycle-fence persistence, destructive execution, ONB-009/010 onboarding commands/UI, broker, or new deployable service

Promoted at: 2026-08-17 through ONB-018 completion reconciliation

Review promoted at: 2026-08-22; runtime re-reviewed and hardened through 2026-08-24

## Outcome

Move normal account sync/UI to durable import runs and connect import progress to server-side preparation candidate selection without ID arrays or raw cursor-reset UX.

## Dependencies

- ONB-013.
- ONB-014.
- ONB-003 handoff contract and ONB-017/018 preparation persistence/control.
- Consume accepted ONB-004 lifecycle semantics and delivered ONB-019 lifecycle guard primitives without taking persistence ownership.
- Coordinate final destructive route/action cutover with ONB-020.
- Coordinate ONB-009, ONB-010, ONB-025, and Activity Feed import reconciliation.

## In scope

- Legacy normal-sync command compatibility wrapper/cutover to `202 Accepted` durable import creation.
- Account Angular persisted background status, pause/cancel/retry, reload restoration, and recovery.
- Remove raw cursor-reset UX in favor of explicit bounded historical backfill while retaining the deprecated compatibility field-reset route until ONB-020 final cutover.
- One provider-neutral coalesced rating-stat refresh policy.
- Provider-neutral played-game activity reconciliation using actual game dates.
- Rating/activity writes use the ONB-019 short guarded-commit rule and database-clock snapshot fencing.
- Database-based bounded eligible-unindexed selection for preparation; no response ID arrays.
- Preserve account URLs and ownership semantics where practical.
- Deployment ordering, compatibility, rollback, API/store/browser, and no-ID-array tests.

Normal background refresh may cut over before ONB-020 only while destructive controls remain explicitly limited or disabled. ONB-015 does not implement or claim final safe account purge/delete/reset behavior; destructive execution/final legacy-route cutover belongs to ONB-020.

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
- Failed/cancelled initial refresh cannot be silently abandoned while its surviving exact coverage proves an incomplete accepted range; explicit Retry preserves the immutable range.
- Retained terminal history cannot resurrect preparation, sync-frontier, or rating derived state after a future purge removes durable coverage.
- Destructive controls delegate to ONB-020 or remain explicitly limited/disabled without false success claims.
- Legacy migration/rollback and worker-required deployment ordering are explicit.
- Synchronous provider traversal is removed from account HTTP routes.

## Required validation

- Route compatibility, ownership, nullable derived-state boundary, and OpenAPI tests.
- Angular store/component tests for queued/running/paused/terminal/failure/cancel/retry/reload states, including active-run disappearance settlement.
- Browser reload/navigation/multi-account/failure/retry review.
- No-ID-array and bounded preparation handoff tests.
- Rating/activity idempotency, purge-epoch, and lifecycle-fence-race tests.
- Refresh admission/retry/partial-coverage recovery integration tests.
- Tests proving destructive controls do not bypass or duplicate ONB-020.
- Architecture and full web/API/contracts/mobile gates.

## Review evidence

- Runtime-bearing head: `5a2b6348ee516c477c9353020fd90f365f2cc25a`.
- CI #3155 / run `32692461730` passed dependency audit, lint, full domain/contracts/API/web/mobile build, opening audits, architecture and repository-hygiene guardrails, empty-database migrations, imported-game audits, and the complete repository test suite.
- Final PR head: `fc2aa0d08afebbc952cf5a55693ee99f77b7d29c`.
- CI #3156 / run `32692956344` passed end to end on that exact final head after documentation/status reconciliation.
- GitHub's synthetic merge ref used current `main`; no unresolved PR review threads remained before merge.
- Detailed hardening evidence is in [ONB-015 thorough self-review addendum](../reports/ONB-015-2026-08-24-thorough-self-review-addendum.md).

## Completion

Primary report: [ONB-015 account sync cutover and preparation handoff](../reports/ONB-015-2026-08-22-account-sync-cutover-handoff.md)

Final self-review addendum: [ONB-015 thorough self-review addendum](../reports/ONB-015-2026-08-24-thorough-self-review-addendum.md)

Completion reconciliation: [ONB-015 completion reconciliation](../reports/ONB-015-2026-08-26-completion-reconciliation.md)

Runtime pull request: [#400](https://github.com/vokerg/chess_repertoir_trainer/pull/400)

Runtime squash commit: `c89442fbe8945854f0d6d7545e947beb7bebccfe`

Issue #203 closed completed automatically with the accepted runtime merge on 2026-08-25.

Residual ownership: ONB-020 still owns destructive account/game execution and final legacy DELETE/reset compatibility cutover; ONB-025 owns authenticated stale-account refresh triggering.

Completed at: 2026-08-26
