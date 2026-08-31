# ONB-025 — Daily stale account refresh implementation

Date: 2026-08-31

Issue / runtime pull request: #276

Branch: `onb-025/issue-276-daily-stale-account-refresh-runtime`

Status: review

## Delivered boundary

ONB-025 adds one authenticated bootstrap command that evaluates every active external account owned by the current user and opportunistically accepts stale forward-import work. The command is a thin durable-acceptance boundary: provider traversal stays in the existing account-import worker and no new queue, worker deployment, broker, browser-authoritative timestamp, or authentication-hook side effect is introduced.

The Angular root invokes this command only after the application user has been resolved. Accepted or already-active import projections are restored into a root session store without emitting login success notices.

## Server command

`POST /api/me/account-imports/automatic-refresh`

The bodyless command returns one bounded result per evaluated active owned account:

- `accepted` — a new durable incremental-forward run was accepted;
- `alreadyActive` — an existing database-authoritative non-terminal run remains active;
- `fresh` — the most recent successful normal forward refresh is inside the rolling cooldown;
- `failed` — evaluation was bounded for that account and independent accounts continue.

The route does not call Lichess or Chess.com. It delegates durable acceptance through the delivered `AccountRefreshImportRepository`, preserving ONB-015 recovery policy, the one-non-terminal-run database invariant, and ONB-019 lifecycle admission fences.

## Automatic versus manual work

Automatic attempts remain on the canonical `ACCOUNT_REFRESH` import lifecycle so the existing worker, coverage projection, preparation handoff, and post-completion metadata continue to apply. They are distinguished by persisted priority `10`; existing manual account refresh remains priority `100` and is not cooldown-gated.

Automatic bootstrap refresh requires existing normal account coverage and only accepts `INCREMENTAL_FORWARD`. It deliberately does not create an automatic initial three-month import for an account with no proved recent coverage; that case returns a bounded failure for the explicit account/onboarding flow to resolve.

## Freshness and retry policy

Successful freshness is derived from completed normal `ACCOUNT_REFRESH` forward runs in the current `AccountImportCoverage` epoch, not from request acceptance or browser state. The default rolling cooldown is 24 hours and is configurable with `ACCOUNT_AUTOMATIC_REFRESH_COOLDOWN_MS`.

Failed automatic attempts are identified from persisted incremental-forward `ACCOUNT_REFRESH` runs at automatic priority. Failures after the latest successful refresh are counted and use bounded exponential retry delay:

- base delay: 15 minutes (`ACCOUNT_AUTOMATIC_REFRESH_RETRY_BASE_MS`);
- exponential growth by consecutive persisted failures;
- default cap: 6 hours (`ACCOUNT_AUTOMATIC_REFRESH_RETRY_MAX_MS`).

A failed attempt never advances successful freshness. Reloads therefore cannot create an unbounded automatic retry loop, while explicit manual refresh remains independently available.

## Concurrency and lifecycle safety

- Active work is checked before freshness evaluation and returned directly.
- Concurrent acceptance still goes through `AccountImportRepository.createRun`, which locks the owned account, invokes the delivered lifecycle guard, checks existing non-terminal work, and relies on the PostgreSQL partial unique index as the final duplicate-acceptance authority.
- If another caller wins the race, automatic refresh re-reads and returns that active run as `alreadyActive`.
- Only `ExternalAccount.isActive = true` accounts owned by the authenticated user are enumerated.
- Lifecycle-fenced accounts are rejected by the existing account-import admission guard and returned as bounded failures.
- `apps/api/src/auth/auth.plugin.ts` is unchanged; the command is not attached to protected-request authentication.

## Angular bootstrap

A root `AccountImportSessionStore` follows the existing root job-store initialization pattern:

- it is `providedIn: 'root'`;
- it initializes after `AuthService.appUser()` is available;
- repeated effects for the same authenticated user do not repeat the bootstrap request;
- logout/reset advances a session generation and discards stale in-flight responses;
- a later authenticated session may initialize again;
- accepted and already-active runs are restored without adding automatic success notifications.

This keeps browser state non-authoritative and leaves the page-scoped account settings store/UI unchanged.

## Validation added

Focused coverage includes:

- existing active-run reuse;
- rolling 24-hour freshness and exact cooldown boundary;
- persisted exponential failure retry throttling and exact retry boundary;
- independent evaluation after one account failure;
- owned active-account filtering and inactive/foreign-account exclusion;
- missing-coverage bounded failure;
- concurrent HTTP bootstrap requests producing one accepted run plus authoritative reuse;
- OpenAPI operation registration;
- shared contract parsing for all bounded result variants;
- Angular one-invocation-per-session behavior;
- Angular API failure suppression inside the same session;
- logout generation invalidating an in-flight response and allowing a later session.

Repository CI is the executable validation environment because the local task container could not resolve `github.com`; no local build or test pass is claimed. Browser-state-matrix validation remains a review/acceptance item rather than a fabricated local result.

## Files intentionally not changed

- `apps/api/src/auth/auth.plugin.ts` — no automatic refresh side effect in authentication.
- provider executors/adapters — no Lichess or Chess.com traversal changes.
- Prisma schema/migrations — persisted import-run priority and existing coverage history are sufficient for the automatic-attempt policy.
- manual account refresh route — remains independently available and priority `100`.
