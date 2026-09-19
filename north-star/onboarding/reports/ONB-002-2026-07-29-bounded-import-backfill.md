# ONB-002 — Bounded recent-first import and historical backfill

Date: 2026-07-29

Task: [ONB-002](../tasks/ONB-002-bounded-import-backfill.md)

GitHub issue: [#149](https://github.com/vokerg/chess_repertoir_trainer/issues/149)

Branch: `onb-002/issue-149-bounded-import-backfill`

Repository base inspected: `main` after ONB-001 squash commit `e0a56d7399c20f375ff9c3a7095002120d7d1cd5`

## 1. Question and outcome

ONB-002 owns the durable provider-import contract required to turn the ONB-001 fixed recent recipe into resumable background work without corrupting normal forward sync or historical backfill.

The recommended direction is:

1. extend the existing user/account-owned `ImportRun` instead of adding a second generic request/workflow platform;
2. add one exact `AccountImportCoverage` record per account and canonical import scope;
3. represent coverage as a proved contiguous half-open UTC interval `[coveredFrom, coveredThrough)` rather than as the latest observed game timestamp;
4. use distinct modes `BOUNDED_INITIAL`, `INCREMENTAL_FORWARD`, and `HISTORICAL_BACKFILL`;
5. preserve one non-terminal import run per external account and initially execute one account import globally at a time;
6. run provider import in a separate PostgreSQL claim loop inside the existing worker deployment, not inside HTTP and not through imported-game `JobTask` rows;
7. use provider-neutral window/checkpoint semantics with provider-specific adapters;
8. process the initial and historical ranges newest-window-first, while forward sync advances oldest missing time first;
9. mark a window complete only after provider traversal and every bounded database write for that window succeed;
10. treat a successful empty provider window as exact coverage;
11. fail and replay an incomplete window instead of advancing coverage past parse, normalization, or persistence failures;
12. replace per-game existence checks with bounded duplicate-safe bulk insert plus one bounded read;
13. expose imported rows progressively but hand preparation a database selection boundary, never unbounded imported-game ID arrays;
14. recompute account rating statistics once through a coalesced post-import boundary, not in both service and route;
15. deprecate raw cursor reset in favor of explicit backfill and ONB-004-approved reset operations.

This report allocates five bounded implementation tasks:

- ONB-011 / [#199](https://github.com/vokerg/chess_repertoir_trainer/issues/199) — durable import persistence and scope coverage;
- ONB-012 / [#200](https://github.com/vokerg/chess_repertoir_trainer/issues/200) — provider-neutral worker and API lifecycle;
- ONB-013 / [#201](https://github.com/vokerg/chess_repertoir_trainer/issues/201) — bounded Lichess adapter;
- ONB-014 / [#202](https://github.com/vokerg/chess_repertoir_trainer/issues/202) — bounded Chess.com adapter;
- ONB-015 / [#203](https://github.com/vokerg/chess_repertoir_trainer/issues/203) — account-sync cutover and preparation handoff.

## 2. Files, issues, and external contracts inspected

Repository files actually opened/read:

- `AGENTS.md`
- `apps/api/package.json`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/0002_imported_games/migration.sql`
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/services/externalAccountService.ts`
- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-candidates.service.ts`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `apps/api/src/worker.ts`
- `apps/api/test/run-all.mjs`
- `apps/api/test/services/lichess-import.test.mjs`
- `apps/web/src/app/features/accounts/data-access/accounts-api.service.ts`
- `apps/web/src/app/features/accounts/data-access/accounts.models.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.ts`
- `apps/web/src/app/features/accounts/state/accounts.store.ts`
- `apps/web/src/app/features/accounts/state/accounts.store.spec.ts`
- `docs/imported-game-job-processing.md`
- `north-star/onboarding/AGENTS.md`
- `north-star/onboarding/MASTER_PLAN.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/GITHUB_ISSUES.md`
- `north-star/onboarding/reports/ONB-001-2026-07-29-lifecycle-default-recipe.md`
- `north-star/onboarding/tasks/ONB-002-bounded-import-backfill.md`
- `north-star/onboarding/tasks/ONB-003-progressive-preparation-orchestration.md`
- `north-star/onboarding/tasks/ONB-004-destructive-lifecycle-invariants.md`
- `north-star/onboarding/tasks/ONB-007-throughput-progress-benchmark.md`

Issue and pull-request records actually opened/read:

- #147 — Onboarding and Data Lifecycle program;
- #148 — ONB-001 lifecycle/default recipe;
- #149 — ONB-002 bounded import/backfill;
- PR #197 — ONB-001 delivery and merge state.

External primary sources inspected:

- [Lichess official user-game export OpenAPI](https://raw.githubusercontent.com/lichess-org/api/master/doc/specs/tags/games/api-games-user-username.yaml);
- [Chess.com official Published-Data API documentation](https://www.chess.com/news/view/published-data-api), updated 2026-04-22;
- [Prisma Client official reference for `createMany` and `createManyAndReturn`](https://docs.prisma.io/docs/orm/reference/prisma-client-reference).

## 3. Verified current repository state

### 3.1 Current account sync is synchronous HTTP work

`POST /api/me/accounts/:id/sync`:

1. ownership-checks the account;
2. awaits the complete provider import service;
3. recomputes account rating statistics;
4. returns only after provider traversal and database writes complete.

The API request therefore owns provider latency and cannot truthfully acknowledge durable background acceptance.

### 3.2 Existing `ImportRun` is a summary, not a durable work record

The current model stores:

- user/account/provider ownership;
- a free-form status string;
- `syncSince` and `syncUntil`;
- aggregate game counters;
- one error;
- start/completion timestamps.

It does not store:

- import mode or source;
- immutable recipe/scope;
- requested range independent from observed games;
- provider/window checkpoint;
- queue/claim/heartbeat state;
- pause/cancel requests;
- retry lineage;
- exact coverage;
- fixed progress denominator.

### 3.3 `syncCursorTime` is only a latest-observed-game high-water mark

Both provider services initialize `maxEndedAt` from the account cursor and update it from observed game rows.

That value cannot prove continuous provider coverage because:

- a no-game interval has no game timestamp;
- per-game failures are caught and counted while the run may still complete;
- unsupported variants can advance it;
- it says nothing about the requested speed/rated scope;
- it cannot represent an older-history frontier independently from forward sync.

Resetting the field to null causes the next current implementation to rescan all provider history. It is not a safe backfill command.

### 3.4 Lichess currently scans full history on first sync

When `syncCursorTime` is null, no `since` parameter is sent.

The service:

- requests finished games in ascending date order;
- streams NDJSON;
- includes PGN and opening data;
- filters non-standard variants after download;
- performs one `findUnique` and usually one `create` per game;
- accumulates all imported and eligible IDs in arrays;
- advances the account cursor after the full stream.

The official endpoint supports both `since` and `until`, speed/variant `perfType` filters, rated filtering, and streaming NDJSON. A fixed onboarding range can therefore be bounded provider-side.

### 3.5 Chess.com currently scans all archive months on first sync

When `syncCursorTime` is null, every archive URL is selected.

The service:

- fetches the archive index;
- fetches selected archive months serially;
- retries selected HTTP failures;
- filters the exact timestamp only after downloading a month;
- filters non-standard variants after download;
- performs one `findUnique` and usually one `create` per game;
- accumulates all imported and eligible IDs in arrays;
- advances the account cursor after all selected months.

Chess.com publishes an ascending list of monthly archives and complete monthly endpoints keyed by game-end month. Its documentation states that a period with no games returns an empty games array and advises serial access because parallel requests may receive `429`.

### 3.6 Both services can create silent coverage gaps

Each provider catches an individual game normalization or persistence exception, increments `gamesFailed`, continues, and can still mark the run `COMPLETED` and advance `syncCursorTime` beyond that game.

A retry based on the new high-water can therefore omit the failed record permanently.

This is the most important correctness defect the durable design must remove.

### 3.7 Current writes are N+1 and responses can grow without bound

Each provider performs an existence query per game and then an insert for new games.

Both return arrays containing every newly imported/eligible ID. The account UI uses those arrays to decide what to index next.

The design does not remain bounded for large imports and makes the browser a handoff coordinator.

### 3.8 Rating statistics are recomputed twice

Each provider service recomputes account rating statistics after new imports. The route then recomputes them again unconditionally.

The durable path needs one explicit post-import refresh policy.

### 3.9 Imported-game jobs cannot represent provider fetches

`JobTask` requires an imported-game reference. Provider work starts before any imported game exists.

The existing job worker provides useful claim, heartbeat, stale recovery, cancellation, and shutdown patterns, but its physical task model must not be stretched into account-provider work.

### 3.10 Existing tests do not cover durable provider traversal

The inspected Lichess import test validates two result-normalization cases only.

No inspected test covers:

- bounded provider requests;
- cursor/coverage movement;
- retries and duplicate overlap;
- provider empty ranges;
- interruption/restart;
- cancellation;
- per-game persistence failure;
- account deletion races;
- Chess.com archive planning.

## 4. Requirements inherited from ONB-001

ONB-002 consumes these locked decisions:

- first-run import begins only after explicit acceptance;
- the default range is a fixed inclusive UTC date-only range from three calendar months before the accepted start date through that start date;
- default scope is standard blitz and rapid, rated and unrated;
- the first run uses one selected active account;
- import may expose value progressively;
- `NO_RECENT_GAMES` is deterministic and must not be confused with a failed or unattempted import;
- exact persisted counts are allowed, but ETA is not;
- pause/cancel/retry are server commands;
- the browser does not advance the workflow.

The date-only recipe should be converted once at command acceptance into a half-open timestamp range:

```text
requestedFrom = fromDate at 00:00:00.000 UTC
requestedTo   = day after toDate at 00:00:00.000 UTC
coverage      = [requestedFrom, requestedTo)
```

All internal comparisons and provider adapters should consume that immutable range.

## 5. Alternatives considered

### 5.1 Extend `ImportRun` plus exact coverage — recommended

Advantages:

- evolves the existing account/user-owned audit record;
- preserves current cascades and terminology;
- avoids duplicate request/run concepts;
- supports retry lineage and worker claims;
- permits typed migration from current rows;
- adds only one new coverage boundary.

Cost:

- the existing model receives a substantial migration;
- legacy rows need explicit adoption semantics.

### 5.2 Add `AccountImportRequest` plus separate attempt/run rows — rejected for now

This gives a clean request/attempt split but adds another aggregate before the product needs multiple attempts under one user-visible command.

A retry can instead create a new `ImportRun` linked through `retryOfImportRunId`. Reopen this alternative only if one request must later own several parallel provider partitions or retained attempt records that cannot be represented by run lineage.

### 5.3 Reuse `JobRun`/`JobTask` — rejected

Provider import is account/range keyed, while `JobTask` is imported-game keyed. Making the game reference nullable for unrelated task types would weaken the existing worker model and mix provider I/O lifecycle with game execution semantics.

### 5.4 Keep synchronous sync and add client batching — rejected

This would retain request-lifetime coupling, browser authority, no restart recovery, ambiguous cursor semantics, and unbounded handoff arrays.

### 5.5 Add Redis or an external workflow platform — rejected

PostgreSQL already provides the required durable claim/fencing boundary. No demonstrated capacity or topology need justifies another broker or platform.

## 6. Recommended persistence model

### 6.1 Extend `ImportRun`

Recommended conceptual fields:

```text
ImportRun
- id
- userId
- accountId
- provider
- mode: BOUNDED_INITIAL | INCREMENTAL_FORWARD | HISTORICAL_BACKFILL
- source: ONBOARDING | USER_ACTION | SYSTEM
- status:
    QUEUED
    RUNNING
    PAUSE_REQUESTED
    PAUSED
    CANCEL_REQUESTED
    CANCELLED
    COMPLETED
    FAILED
- scopeVersion
- scopeHash
- scopeJson
- requestedFrom
- requestedTo
- retryOfImportRunId?
- priority
- checkpointJson?
- windowsTotal
- windowsCompleted
- gamesSeen
- gamesMatchedScope
- gamesImported
- gamesDuplicate
- gamesSkippedOutOfScope
- gamesFailed
- lastProgressAt?
- workKey?
- claimedAt?
- heartbeatAt?
- pauseRequestedAt?
- cancelRequestedAt?
- startedAt?
- completedAt?
- errorCode?
- error?
- createdAt
- updatedAt
```

The immutable scope snapshot should contain canonical versioned facts, not arbitrary UI filters:

```json
{
  "variant": "STANDARD",
  "speeds": ["BLITZ", "RAPID"],
  "rated": "BOTH"
}
```

Additional approved scopes such as standard bullet receive a different exact scope hash. Initial implementation should not infer subset/superset coverage between different hashes.

### 6.2 Add `AccountImportCoverage`

Recommended conceptual fields:

```text
AccountImportCoverage
- id
- accountId
- scopeVersion
- scopeHash
- scopeJson
- coveredFrom?
- coveredThrough?
- lastCompletedImportRunId?
- createdAt
- updatedAt

unique(accountId, scopeHash)
```

`[coveredFrom, coveredThrough)` means provider traversal for the exact scope is proved complete and gap-free across that interval, including periods containing zero games.

The model deliberately stores one contiguous interval. Initial import and backfill extend `coveredFrom` backward. Forward sync extends `coveredThrough` forward. The service must never jump either boundary across an incomplete window.

### 6.3 One non-terminal import per account

Use a database partial unique index covering all non-terminal states.

This prevents:

- two sync requests racing the same account;
- forward sync and backfill corrupting one another;
- duplicate provider traffic;
- unclear account deletion/cancellation behavior.

A duplicate create command with the same idempotency key/request may return the existing run. A conflicting active request returns a typed conflict and its active run reference.

### 6.4 Retry preserves history

Retry creates a new run with:

- immutable scope/range copied from the failed/cancelled source;
- `retryOfImportRunId` pointing to the source;
- a fresh claim lifecycle;
- work planned from current proved coverage, not from untrusted failed-run counters.

Do not reset a failed row to queued.

## 7. Coverage and mode semantics

### 7.1 `BOUNDED_INITIAL`

Input:

- selected account;
- exact ONB-001 default scope;
- immutable three-calendar-month range.

Execution:

- plan provider windows intersecting the range;
- process newest window first;
- commit rows in bounded batches;
- after a whole newest window succeeds, establish coverage for that window;
- extend `coveredFrom` backward after each next contiguous successful window;
- finish when the entire requested range is proved covered.

Result:

- zero matching games still yields successful provider coverage and `NO_RECENT_GAMES` at preparation level;
- provider failure yields a failed/incomplete import, not no-data.

### 7.2 `INCREMENTAL_FORWARD`

Input:

- exact account/scope;
- fixed `requestedTo` captured at acceptance;
- `requestedFrom` derived from proved `coveredThrough` minus an approved overlap.

Execution:

- process the oldest missing forward window first;
- replay overlap safely through the imported-game unique key;
- advance `coveredThrough` only after every intervening window succeeds;
- do not change historical `coveredFrom` except when the completed interval joins existing coverage.

The overlap is an ingestion-safety policy, not the authoritative cursor.

### 7.3 `HISTORICAL_BACKFILL`

Input:

- exact account/scope;
- bounded target older range ending at current `coveredFrom`.

Execution:

- process the newest missing historical window first;
- extend `coveredFrom` backward one complete contiguous window at a time;
- never move `coveredThrough` backward or replace it with an observed game timestamp.

Backfill is an explicit expansion command. It is not implemented by clearing forward state.

### 7.4 Scope expansion

Older history with the same scope extends the same coverage row.

Bullet or a materially different rated/variant scope uses another coverage row. Additional accounts use their own rows.

Do not claim that standard blitz/rapid coverage proves bullet coverage or that rated-only coverage proves unrated coverage.

## 8. Window and checkpoint contract

### 8.1 Provider-neutral window lifecycle

Each run creates a deterministic ordered plan of half-open UTC windows.

A window has:

```text
- from
- to
- provider checkpoint data
- state: PENDING | RUNNING | COMPLETED
- exact counters
```

The initial schema may store the active checkpoint as versioned JSON on `ImportRun` instead of adding one row per window. Persist the complete plan denominator and current window boundary so restart does not recalculate a different plan.

A window becomes complete only after:

1. the provider response is proved complete or empty;
2. all normalized batches are committed;
3. run counters/checkpoint are fenced and persisted;
4. coverage advances transactionally.

Rows committed before an interruption remain valid. The incomplete window is replayed and duplicate-suppressed.

### 8.2 Lichess adapter

Use official endpoint capabilities:

- `since = window.from` epoch milliseconds;
- `until = window.to - 1 millisecond`;
- `perfType = blitz,rapid` for the default scope;
- omit `rated` to include both rated and casual;
- `finished = true`;
- NDJSON response;
- newest-first ordering for initial/backfill value.

Stream into bounded database batches. Do not buffer the full response.

A successful empty stream proves the window contains no matching games.

Window duration remains configuration reviewed by ONB-007. The coverage/checkpoint contract supports calendar-month or smaller Lichess windows without schema change. Implementation should start conservatively and split large operational windows rather than add pagination state based on latest observed game.

### 8.3 Chess.com adapter

At run start:

1. fetch the archive index serially;
2. generate every calendar month intersecting the requested range;
3. classify a month absent from a successful archive index as an exact empty month;
4. fetch listed months serially;
5. filter rows to `requestedFrom <= end_time < requestedTo` and the immutable scope;
6. commit bounded database batches.

A listed archive returning an unexpected 404/410 or retry-exhausted error is a failed window, not an empty one.

Current-month overlap is expected because Chess.com responses are cached and refreshed periodically. Duplicate-safe replay is therefore required.

The adapter should:

- retain the recognizable configured User-Agent;
- honor `Retry-After` where supplied;
- retry 408/429/retryable 5xx with bounded backoff;
- avoid parallel archive requests;
- accept `AbortSignal`;
- optionally persist ETag/Last-Modified validators as an optimization, never as the source of coverage truth.

## 9. Bounded database writes

For each normalized batch:

1. reject/fail malformed rows before coverage advancement;
2. call `createMany({ skipDuplicates: true })` or `createManyAndReturn` on PostgreSQL;
3. query the bounded provider-game-ID set once to obtain persisted IDs/state where needed;
4. update counters/checkpoint in one short transaction;
5. release memory before reading the next batch.

The repository uses Prisma 6.19.3 and PostgreSQL. The official Prisma contract supports duplicate-skipping bulk writes and `createManyAndReturn`; returned order is not guaranteed, so provider IDs—not array position—must be used for mapping.

Initial migration should preserve current insert-only behavior for already imported games. Provider-metadata refresh/upsert may be introduced later through an explicit bounded policy; do not silently overwrite indexed/analysed state.

No provider network call belongs inside a database transaction.

## 10. Progressive visibility and ONB-003 handoff

Imported rows become visible immediately after each committed batch.

The import response and persisted run must not contain every imported/eligible game ID.

Instead, `DataPreparationRun` references the import run and ONB-003 selects candidates from PostgreSQL using:

- authenticated user/account ownership;
- immutable import scope;
- requested/covered range;
- standard workflow eligibility;
- `plyIndexedAt`/analysis state;
- newest-first ordering;
- a bounded wave limit.

This intentionally includes eligible pre-existing unindexed games in the requested range. It avoids a large `ImportRunGame` association and remains idempotent.

`ImportRun.lastProgressAt` or a monotonic progress version may prompt reconciliation, but the coordinator must remain correct after missed notifications, restart, or retention cleanup by rescanning the bounded database predicate.

Whether indexing begins after a committed batch or only after a completed provider window remains ONB-003 policy. Either choice uses the same database handoff.

## 11. Worker/runtime placement

Add a provider-neutral account-import worker loop beside the existing imported-game worker in `apps/api/src/worker.ts`.

It should reuse patterns, not physical models:

- PostgreSQL `FOR UPDATE ... SKIP LOCKED` claim;
- opaque work-key fencing;
- heartbeat;
- stale recovery;
- `AbortSignal` cancellation;
- graceful shutdown and claim release;
- short claim/checkpoint transactions.

It must not register fake provider tasks in the imported-game executor registry.

Initial deployment policy:

- one global account import at a time;
- at most one non-terminal import per account;
- provider requests serial within a run;
- imported-game worker remains one game task at a time;
- both loops may share the current worker process and shutdown boundary.

This leaves a later option to split account import into another process without changing API or persistence if ONB-007 demonstrates CPU, connection, or provider-isolation pressure.

## 12. API contract outline

Canonical typed routes should live in an account-import feature module with shared contracts.

Suggested surface:

```http
POST /api/me/accounts/:accountId/import-runs
GET  /api/me/accounts/:accountId/import-runs
GET  /api/me/import-runs/:importRunId
POST /api/me/import-runs/:importRunId/pause
POST /api/me/import-runs/:importRunId/resume
POST /api/me/import-runs/:importRunId/cancel
POST /api/me/import-runs/:importRunId/retry
```

Create returns `202 Accepted` with the persisted run/projection.

The command body contains approved typed choices, not provider cursor internals:

```json
{
  "mode": "BOUNDED_INITIAL",
  "scope": "STANDARD_BLITZ_RAPID_V1",
  "from": "2026-04-29",
  "to": "2026-07-29",
  "idempotencyKey": "..."
}
```

Onboarding may call the same application service from ONB-009 rather than expose every field to Angular.

Compatibility:

- preserve `POST /api/me/accounts/:id/sync` temporarily as a wrapper that creates `INCREMENTAL_FORWARD` and returns durable accepted status;
- update the account client in the same cutover;
- deprecate `/reset-cursor` and remove its UI after explicit backfill/reset actions exist;
- preserve ownership/not-found behavior and existing account URLs.

## 13. Progress semantics

Safe facts before ONB-007:

- mode and immutable requested range;
- queued/running/paused/cancelling/terminal state;
- current provider window boundary;
- windows completed and total planned windows;
- games seen, matched, imported, duplicate, skipped, and failed;
- last successful checkpoint time;
- exact covered interval;
- last typed error and allowed actions.

Do not show:

- ETA;
- “almost done”;
- provider-game percentage when total games are unknown;
- a weighted completion percentage based on unequal windows unless ONB-007 validates it.

Chess.com month count and the deterministic Lichess window plan provide a fixed window denominator, but expose the exact fraction first.

## 14. Failure and recovery invariants

### 14.1 Provider/network failure

- current window remains incomplete;
- coverage does not advance over it;
- committed rows remain;
- retry creates a new linked run and replays from proved coverage.

### 14.2 Parse/normalization/persistence failure

Do not catch one game, increment a counter, and complete the window.

Record bounded error context, fail the current window/run, and replay it. This is required to prevent silent gaps.

A deliberate out-of-scope game is not a failure and may coexist with completed coverage for the requested scope.

### 14.3 Worker restart

Heartbeat expiry returns the run to a claimable state. The next worker resumes from the last completed window/checkpoint. Any current-window rows are duplicate-suppressed.

### 14.4 Pause

`PAUSE_REQUESTED` aborts active provider I/O. Only worker acknowledgement clears the claim and marks `PAUSED`. Resume returns it to `QUEUED` with unchanged immutable request.

### 14.5 Cancel

`CANCEL_REQUESTED` aborts work. Only acknowledgement marks `CANCELLED`. Completed coverage and imported rows remain; cancellation is not purge.

### 14.6 Account deactivation

Do not start new claims for inactive accounts. An active run should transition to pause/cancel according to the final command policy and expose an actionable reason.

### 14.7 Account deletion

Current cascade behavior is useful, but deletion cannot report success while a provider worker may still commit.

Import-side requirements:

- all writes require the exact claim and existing account;
- lost claims abort provider work;
- foreign keys prevent post-delete child inserts;
- stale workers cannot mark completion.

ONB-004 owns the final user/admin delete protocol: request cancellation, wait for claim acknowledgement, then delete/audit.

## 15. Legacy migration and backward compatibility

Existing `syncCursorTime` values do not prove exact coverage and must not seed a full historical interval.

Recommended migration:

1. retain the field temporarily for the legacy route;
2. create no historical coverage claim from it;
3. when the first durable forward run is accepted, use a conservative overlap around the legacy cursor as a request-planning hint only;
4. after the new run proves its windows, create/advance exact coverage for only those windows;
5. permit explicit older backfill below `coveredFrom`;
6. remove the legacy field and cursor-reset route only after account UI and scheduled/manual sync are cut over.

Existing imported-game uniqueness prevents duplicate rows during replay.

Existing users remain onboarding-complete under ONB-001; migration of import coverage does not reopen first-run guidance.

## 16. Rating-stat refresh policy

Initial policy:

- provider adapters do not recompute rating stats;
- route handlers do not recompute rating stats;
- one provider-neutral post-run service schedules or performs a single recomputation after a terminal successful run that inserted games;
- failed/cancelled partial runs may request a coalesced refresh if committed rows must be visible immediately, but repeated windows must not trigger duplicate full recomputations.

The simplest first implementation is one recomputation on terminal completion, with the UI explicitly showing import still active.

## 17. Security and privacy

- every command/read remains scoped to `auth.userId` and owned account/run IDs;
- public provider usernames do not authorize cross-user access to persisted games;
- provider errors exposed to clients use typed/sanitized messages rather than raw response bodies;
- do not add raw full-provider payload persistence merely for retry; normalized rows and bounded error context are sufficient;
- Lichess OAuth tokens, when present, are not required for public import and must never be logged;
- Chess.com User-Agent contact configuration must not contain credentials;
- import scope and range are ordinary account metadata but remain private to the owning user/operator boundary;
- cancellation and deletion are server-authoritative.

## 18. Performance and operational impact

Positive changes:

- HTTP requests return after database acceptance;
- provider traversal survives process restart;
- Lichess is bounded provider-side and streamed;
- Chess.com fetches only intersecting months serially;
- bulk writes replace per-game existence N+1;
- no unbounded ID arrays cross API/browser boundaries;
- historical work is lower-priority and bounded;
- exact coverage prevents unnecessary full rescans.

Operational costs:

- one new coverage table and larger `ImportRun` model;
- a second worker loop and its database polling/heartbeat;
- current-month overlap intentionally creates duplicate checks;
- rating-stat refresh remains a potentially expensive terminal operation;
- very active Lichess accounts require ONB-007 window/batch tuning.

No new dependency, broker, storage service, queue product, or deployment is required initially.

## 19. Validation plan

### 19.1 Pure planning tests

- inclusive date-only to half-open UTC conversion;
- default three-calendar-month range;
- initial/newest-first windows;
- forward/oldest-first windows;
- backfill/newest-first windows;
- partial existing coverage and no-op fully covered requests;
- exact scope hashing/canonical ordering.

### 19.2 Persistence integration tests

- one active run per account under concurrent creates;
- coverage check constraints and transactional extension;
- no jump over an incomplete window;
- retry lineage;
- claim/work-key fencing;
- heartbeat/stale recovery;
- pause/cancel acknowledgement;
- account/user ownership;
- account-delete cascade and lost-claim writes;
- legacy migration with no false coverage.

### 19.3 Lichess fixtures

- bounded `since`/`until` and `perfType` request;
- empty stream;
- large streamed response and bounded batches;
- duplicate overlap;
- malformed NDJSON/game;
- network failure after committed rows;
- restart replay;
- cancellation and stale completion rejection;
- provider throttle/error handling.

### 19.4 Chess.com fixtures

- archive index ordering;
- month planning across year boundaries;
- absent month recorded empty;
- listed month returning empty games;
- listed month 404/410 inconsistency;
- 429 with Retry-After;
- retryable 5xx exhaustion;
- exact boundary filtering in epoch seconds;
- current-month overlap;
- restart/cancel/duplicate replay;
- serial request assertion.

### 19.5 Bulk-write tests

- duplicate-safe batch insert;
- mapping by provider game ID rather than returned array order;
- no per-game existence-query path;
- bounded query parameter/batch size;
- imported and duplicate counters;
- rows visible before terminal run completion.

### 19.6 API/frontend compatibility tests

- `202` durable acceptance;
- active-run conflict/idempotency;
- ownership and not-found behavior;
- legacy sync wrapper;
- no ID arrays in response;
- account store restores active import after reload;
- reset-cursor deprecation path;
- one rating-stat refresh.

## 20. Decisions finalized

ONB-002 finalizes:

- extend `ImportRun`;
- add exact account/scope coverage;
- fixed half-open UTC range semantics;
- separate initial/forward/backfill modes;
- one non-terminal run per account;
- separate account-import worker loop in the existing worker deployment;
- provider-window replay and claim fencing;
- no coverage advancement across any failed window;
- successful empty windows count as coverage;
- database-based preparation handoff;
- bounded bulk inserts and no ID arrays;
- conservative legacy cursor migration;
- explicit backfill instead of raw cursor reset.

## 21. Remaining questions and dependency handoff

ONB-003 still owns:

- whether indexing begins per committed batch or completed import window;
- exact parent reconciliation and wave selection cadence;
- source/priority interaction with imported-game jobs;
- parent pause/cancel propagation.

ONB-004 still owns:

- final account/user deletion acknowledgement and audit protocol;
- which destructive operation resets coverage, imported rows, and onboarding disposition;
- retention of terminal import history after purge.

ONB-007 still owns:

- Lichess window duration;
- database batch size;
- worker poll/heartbeat/stale thresholds;
- maximum queued import backlog;
- whether any user-visible percentage or ETA is justified;
- trigger for splitting the account-import loop into another process.

ONB-009/010 still own:

- product command composition and idempotency across preparation/import;
- Angular onboarding presentation and polling.

## 22. Queue impact

ONB-002 is ready for review.

ONB-003 becomes the next deterministic research task by order after ONB-002 enters review.

ONB-011 through ONB-015 are allocated as `PROPOSED`. Do not claim them before:

- ONB-002 is accepted/merged;
- their listed research dependencies are resolved sufficiently;
- implementation branch/file collisions are checked.

## 23. Validation performed for this research slice

Performed:

- direct current-repository inspection through GitHub;
- current issue/branch/PR collision check;
- official Lichess, Chess.com, and Prisma contract verification;
- mode/window/coverage state-machine walkthrough;
- scenarios for empty periods, partial writes, individual game failure, provider outage, restart, duplicate replay, pause, cancel, inactive account, deletion, legacy migration, and expansion;
- bounded implementation decomposition and issue allocation.

Skipped:

- code build, tests, lint, migrations, provider calls, browser validation, worker execution, load test, and deployment validation because this branch is documentation/research only.

## 24. Residual risks

- provider behavior may still change; adapters require fixtures plus current official contract checks at implementation time;
- an archive index can be temporarily inconsistent with a monthly Chess.com endpoint, so coverage must remain conservative;
- extremely active Lichess accounts may make a calendar month too expensive to replay; ONB-007 must set or validate a smaller window policy;
- exact active-work deletion behavior remains blocked on ONB-004;
- throughput and deployment concurrency remain unmeasured until ONB-007;
- progressive indexing handoff cadence remains blocked on ONB-003.
