# ONB-015 completion reconciliation — 2026-08-26

## Outcome

ONB-015 is complete. Runtime PR #400 passed repeated adversarial self-review and was squash-merged into `main` as `c89442fbe8945854f0d6d7545e947beb7bebccfe`. Issue #203 is closed with state reason `completed`.

Normal account refresh now durably accepts account-import work instead of traversing Lichess/Chess.com inside the HTTP request. The account UI restores persisted import state, explicit bounded historical backfill replaces raw cursor-reset UX, preparation handoff is database-bounded with no ID arrays, and provider-neutral rating/activity reconciliation is lifecycle-fenced and restart-safe.

## Final validation

Runtime-bearing reviewed head:

`5a2b6348ee516c477c9353020fd90f365f2cc25a`

CI #3155 / run `32692461730` passed end to end on that runtime head.

Final PR head after documentation/status reconciliation:

`fc2aa0d08afebbc952cf5a55693ee99f77b7d29c`

CI #3156 / run `32692956344` passed end to end on that exact final head. GitHub's synthetic merge ref combined the PR with then-current `main`, and no unresolved review threads remained before merge.

The thorough self-review evidence is preserved in `ONB-015-2026-08-24-thorough-self-review-addendum.md`. It records the final recovery/purge-epoch, retry admission, Activity Feed fencing, lock-order, Angular settlement, rating non-resurrection, nullable-contract, OpenAPI, and rollback corrections.

## Purge/delete boundary confirmation

The final pre-merge review rechecked the suspected rating-projection resurrection scenario. It was not an ONB-015 blocker:

- the current legacy account delete removes the `ExternalAccount`, and account-import coverage is account-owned with cascade deletion, so coverage rows do not survive that delete path;
- future `PURGE_ACCOUNT_DATA` deliberately retains the account, and ONB-020 explicitly owns removal of exact coverage/current-import pointers, rating statistics, sync frontiers, and copied account data before declaring purge complete.

ONB-015 therefore keeps the normal UI destructive control disabled and does not duplicate ONB-020's destructive coordinator.

## Canonical reassessment

- `TASKS.md`: ONB-015 moves from stale `REVIEW` to `DONE`; ONB-025 becomes `READY` because the durable account-refresh cutover is accepted and merged.
- `STATUS.md` / `ROADMAP.md`: account-sync cutover is delivered; ONB-025 is the bounded follow-up for authenticated stale refresh.
- `GITHUB_ISSUES.md`: #203 is recorded completed through PR #400.
- `OPEN_QUESTIONS.md`: ONB-015-owned implementation questions are resolved. Final destructive DELETE/reset compatibility removal timing remains ONB-020-owned.
- `DECISIONS.md`: reassessed with no new program-level architecture decision required.

## Queue impact

ONB-025 / #276 becomes `READY`. ONB-020 / #260 is independently `READY` after ONB-019 completion and owns final destructive account/game lifecycle execution.

## Residual ownership

- ONB-020: destructive account/game execution and final legacy DELETE/reset compatibility cutover.
- ONB-025: authenticated application-bootstrap stale account refresh.
- ONB-009/010: onboarding lifecycle commands and functional onboarding UI.

No ONB-015-owned blocker remains.

## Files inspected for completion reconciliation

- `north-star/onboarding/AGENTS.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/GITHUB_ISSUES.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/tasks/ONB-015-account-sync-cutover-handoff.md`
- `north-star/onboarding/tasks/ONB-020-account-game-destructive-coordinator.md`
- `north-star/onboarding/tasks/ONB-025-daily-stale-account-refresh.md`
- `north-star/onboarding/reports/ONB-015-2026-08-24-thorough-self-review-addendum.md`
- live PR #400, issue #203, and current `main`
