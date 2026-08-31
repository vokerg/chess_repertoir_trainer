# ONB-025 — Daily stale account refresh implementation

Date: 2026-08-31

Issue / runtime pull request: #276

Branch: `onb-025/issue-276-daily-stale-account-refresh-runtime`

Status: review

## Delivered boundary

ONB-025 adds one authenticated bootstrap command that evaluates every active external account owned by the current user and opportunistically accepts stale forward-import work. The command is a thin durable-acceptance boundary: provider traversal stays in the existing account-import worker and no new queue, worker deployment, broker, browser-authoritative timestamp, or authentication-hook side effect is introduced.

The Angular root invokes this command only after the current application user and Clerk/dev authentication session have been resolved. Accepted or already-active import projections are restored into a root session store without emitting login success notices.

## Server command

`POST /api/me/account-imports/automatic-refresh`

The bodyless command returns one bounded result per evaluated active owned account:

- `accepted` — a new durable incremental-forward run was accepted;
- `alreadyActive` — an existing database-authoritative non-terminal run remains active;
- `fresh` — the most recent successful normal forward refresh is inside the rolling cooldown;
- `failed` — evaluation was bounded for that account and independent accounts continue.

The route does not call Lichess or Chess.com. Automatic evaluation and acceptance are serialized by locking the owned `ExternalAccount`, then re-checking `isActive`, existing non-terminal work, exact canonical normal-refresh coverage, successful-refresh freshness, and automatic retry state inside that transaction. New forward work applies the delivered ONB-015 `accountImportRefreshAdmissionGuard` and then uses `admitAccountImportRunInTransaction`, which preserves ONB-019 lifecycle admission, retry validation, and the existing durable `ImportRun` insertion boundary. The PostgreSQL one-non-terminal-import-per-account invariant remains the final duplicate-work authority.

## Automatic versus manual work

Automatic attempts remain on the canonical `ACCOUNT_REFRESH` import lifecycle so the existing worker, coverage projection, preparation handoff, and post-completion metadata continue to apply. They are distinguished by persisted priority `10`; existing manual account refresh remains priority `100` and is not cooldown-gated.

Automatic bootstrap refresh requires existing normal account coverage and only accepts `INCREMENTAL_FORWARD`. It deliberately does not create an automatic initial three-month import for an account with no proved recent coverage; that case returns a bounded failure for the explicit account/onboarding flow to resolve.

## Freshness and retry policy

Successful freshness is derived from completed normal `ACCOUNT_REFRESH` forward runs for the exact canonical normal-refresh `scopeHash` in the current `AccountImportCoverage` epoch, not from request acceptance or browser state. The default rolling cooldown is 24 hours and is configurable with `ACCOUNT_AUTOMATIC_REFRESH_COOLDOWN_MS`.

Failed automatic attempts are identified from persisted incremental-forward `ACCOUNT_REFRESH` runs at automatic priority. Failures after the latest successful refresh are counted and use bounded exponential retry delay:

- base delay: 15 minutes (`ACCOUNT_AUTOMATIC_REFRESH_RETRY_BASE_MS`);
- exponential growth by consecutive persisted automatic failures;
- default cap: 6 hours (`ACCOUNT_AUTOMATIC_REFRESH_RETRY_MAX_MS`).

After backoff, an unsuperseded failed automatic leaf is retried through the existing immutable `retryOfImportRunId` lineage at automatic priority. Once any retry child exists, the older automatic parent is no longer an automatic retry authority; this prevents automatic bootstrap from forking a second retry branch after a manual retry has superseded that parent. Preparation recovery continues to follow the delivered account-import preparation handoff.

A failed attempt never advances successful freshness. Reloads therefore cannot create an unbounded automatic retry loop, while explicit manual refresh remains independently available.

## Concurrency and lifecycle safety

- Account activity, active-run reuse, coverage/freshness, retry state, and durable acceptance are evaluated under the same owned-account row lock.
- A deactivation that commits before automatic admission prevents new automatic work.
- A competing refresh that completes before automatic admission is re-observed as fresh and suppresses redundant work.
- Existing queued, running, pause-requested, paused, or cancel-requested work is returned as authoritative.
- The PostgreSQL partial unique index remains the final duplicate-acceptance authority across tabs, devices, and API instances.
- Only owned accounts are considered; lifecycle-fenced accounts are rejected by the delivered admission guards and returned as bounded failures.
- Per-account evaluation exceptions are converted to bounded failures so independent accounts continue.
- `apps/api/src/auth/auth.plugin.ts` remains free of import creation/provider traversal, with an executable architecture guard protecting that boundary.

## Angular bootstrap

A root `AccountImportSessionStore` follows the existing root job-store initialization pattern while keying automatic refresh to the resolved authentication session rather than only the application user id:

- it is `providedIn: 'root'`;
- `AuthService` exposes a resolved app-session generation after `/me` succeeds for the currently active Clerk/dev session;
- repeated effects for the same `(userId, sessionGeneration)` do not repeat the bootstrap request;
- direct user replacement and a new Clerk session for the same application user create a new bootstrap generation;
- stale overlapping `/me` responses cannot overwrite a newer Clerk session;
- a Clerk session-id change clears the previously resolved app session immediately, so old account-import state is reset even if resolution of the new session fails;
- logout/reset and session replacement invalidate stale in-flight automatic-refresh responses;
- accepted and already-active runs are restored without adding automatic success notifications.

This keeps browser state non-authoritative and leaves the page-scoped account settings store/UI unchanged.

## Validation added

Focused executable coverage includes:

- existing active-run reuse;
- rolling 24-hour freshness and exact cooldown boundary;
- persisted exponential failure retry throttling and exact retry boundary;
- immutable automatic retry lineage and preparation-target handoff;
- superseded automatic-parent protection after a manual retry child exists;
- independent evaluation after one account failure;
- owned active-account filtering and inactive/foreign-account exclusion;
- deactivation-versus-admission and completion-versus-admission database races;
- missing-coverage bounded failure;
- explicit manual refresh remaining available during the automatic cooldown;
- concurrent HTTP bootstrap requests producing one accepted run plus authoritative reuse;
- OpenAPI bodyless-action convergence and shared contract parsing for all bounded result variants;
- an architecture guard proving `auth.plugin.ts` does not create account-import work or traverse provider adapters;
- Angular once-per-resolved-auth-session behavior, same-user new-session behavior, direct user replacement, stale in-flight response fencing, and request-failure suppression inside one session;
- stale overlapping `/me` resolution fencing and immediate resolved-state clearing on Clerk session replacement.

Repository CI is the executable validation environment because the local task container could not resolve `github.com`; no local build or test pass is claimed. The task's literal browser-state matrix remains separate review/completion evidence rather than a fabricated local result.

## Files intentionally not changed

- `apps/api/src/auth/auth.plugin.ts` — no automatic refresh side effect in authentication.
- provider executors/adapters — no Lichess or Chess.com traversal changes.
- Prisma schema/migrations — persisted import-run priority, retry lineage, and existing coverage history are sufficient for the automatic-attempt policy.
- manual account refresh route — remains independently available and priority `100`.
