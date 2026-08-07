# ONB-025 — Trigger daily stale account refresh on authenticated app bootstrap

Status: PROPOSED

Priority: P1

Order: 155

Delivery class: Implementation

Planning maturity: Researched

GitHub issue: [#276](https://github.com/vokerg/chess_repertoir_trainer/issues/276)

Claimed by: unclaimed

Claim branch: none

Claimed at: none

Claim scope: none

## Outcome

Keep active external accounts opportunistically current by evaluating stale forward-import coverage when an authenticated application session starts, while reusing the durable account-import worker and avoiding duplicate work across reloads, tabs, devices, and API instances.

This is a return-to-app trigger, not a cron guarantee. No provider work is required while the user is inactive.

## Dependencies

- ONB-015 accepted and merged; this task must use the final durable account-refresh command and persisted import projections.
- Transitively consumes ONB-011/012 durable persistence and worker lifecycle plus ONB-013/014 provider adapters.
- Coordinate lifecycle-fence and inactive/deleted-account handling with ONB-019/020.
- Coordinate authenticated root/session bootstrap and non-disruptive status restoration with ONB-010 where their Angular integration surfaces overlap.

Do not implement this task against the current synchronous account-sync route.

## In scope

- One ownership-scoped, idempotent server command that evaluates all active accounts for the authenticated user.
- A configurable rolling automatic-refresh cooldown, initially 24 hours.
- Durable acceptance of `INCREMENTAL_FORWARD` work for stale accounts only.
- Database-enforced reuse of an existing non-terminal run and protection against concurrent duplicate acceptance.
- Bounded per-account results equivalent to `accepted`, `alreadyActive`, `fresh`, and `failed`.
- Persisted, bounded retry cooldown/backoff for failed automatic attempts so application reload cannot create a retry loop.
- Authenticated Angular root/session bootstrap invocation after current-user resolution.
- Restoration through the account-import store without login-time provider traversal or disruptive success notifications.
- Ownership, cooldown-boundary, concurrency, partial-failure, retry-throttling, and bootstrap integration tests.

## Out of scope

- Cron, scheduled maintenance, or a guarantee that inactive users refresh every day.
- Provider traversal in an HTTP request, Angular service, or authentication hook.
- Provider adapter changes owned by ONB-013/014.
- Historical backfill or onboarding recipe acceptance.
- Removal or cooldown restriction of explicit manual refresh.
- Redis, a broker, another worker deployment, or browser-local authoritative timestamps.
- Broad account-page or onboarding visual redesign.

## Acceptance criteria

- The first authenticated bootstrap for a stale active account durably accepts one `INCREMENTAL_FORWARD` run and returns without provider traversal.
- Another bootstrap inside the rolling 24-hour cooldown does not create automatic work.
- Concurrent tabs, devices, and API instances cannot create duplicate non-terminal imports.
- Existing queued, running, or paused work is returned as authoritative rather than duplicated.
- An account becomes eligible again after the persisted cooldown expires.
- A failed automatic import is not treated as a successful refresh and follows bounded retry throttling.
- One account failure does not block independent evaluation of other active accounts.
- Inactive, deleted, or lifecycle-fenced accounts do not receive new automatic work.
- Manual refresh remains independently available.
- The trigger does not run from `apps/api/src/auth/auth.plugin.ts` and does not execute on every protected request.
- The implementation cannot be enabled before ONB-015 removes synchronous provider execution from account HTTP routes.

## Required validation

- API contract, OpenAPI, ownership, and bounded-result tests.
- Repository tests for rolling cooldown boundaries, concurrent acceptance, existing-run reuse, and failed-attempt retry throttling.
- Angular bootstrap/store tests covering one invocation per authenticated application session and non-disruptive state restoration.
- Browser validation for login, reload, multiple tabs, multiple accounts, existing active work, and partial provider failure.
- Architecture checks proving no provider call or import creation is added to the authentication hook.
- Full affected API/web/contracts build, test, lint, and architecture gates.

## Completion

Report: none

Completed at: none
