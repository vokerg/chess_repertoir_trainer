# ONB-004 — Safe purge, reset, and deletion invariants

Date: 2026-08-02

Task: [ONB-004](../tasks/ONB-004-destructive-lifecycle-invariants.md)

GitHub issue: [#151](https://github.com/vokerg/chess_repertoir_trainer/issues/151)

Branch: `onb-004/issue-151-destructive-lifecycle-invariants`

Repository base inspected: `main` at the branch point visible through GitHub after squash-merged PR #258.

## 1. Question and outcome

ONB-004 defines what destructive lifecycle actions mean, which rows they affect, and how active writers are stopped before data is cleared or deleted.

The accepted direction is:

1. define five separate actions instead of one ambiguous reset:
   - `UNANALYSE_GAMES`;
   - `UNINDEX_GAMES`;
   - `PURGE_ACCOUNT_DATA`;
   - `DELETE_EXTERNAL_ACCOUNT`;
   - `DELETE_APP_USER`;
2. execute every action as a durable, previewed, idempotent, audited domain operation;
3. install a persisted user/account/game write fence before requesting cancellation;
4. stop new import, job, preparation, AI, tactical, tag, and sync admission inside the fenced scope;
5. request cancellation of active preparation, import, and imported-game work;
6. wait for provider/import claims and every relevant `JobTask.workKey` to be released before destructive writes begin;
7. use forward-only, checkpointed, bounded transactions rather than one account- or user-sized transaction;
8. retain shared `Position`, `PositionAnalysis`, and `MastersExplorerCache` rows during account/game/user operations; ONB-006 owns later orphan cleanup;
9. make un-index always include un-analysis first;
10. recompute tags from remaining canonical evidence rather than clearing or trying to classify individual tag codes manually;
11. retain tactical feedback and self-contained scenario-training snapshots for un-analysis/un-index, but delete target-game scenario copies during account purge/delete;
12. add opening provenance so only locally assigned opening values are cleared by un-index;
13. retain job and execution history as historical evidence, while allowing game foreign keys to become null;
14. explicitly remove OAuth login state and locally stored provider tokens during whole-user deletion;
15. persist a deleted-identity HMAC tombstone so a valid external-auth token cannot immediately recreate the deleted `AppUser` through the current upsert resolver;
16. require a mobile deletion receipt/handshake that deletes the device `local_user` row and its cascading offline/outbox data;
17. allocate ONB-019 / #259, ONB-020 / #260, and ONB-021 / #261.

No production destructive endpoint, schema, worker, or UI change is included in this research branch.

## 2. Files and records inspected

Repository files actually opened/read:

- `AGENTS.md`
- `north-star/onboarding/AGENTS.md`
- `north-star/onboarding/README.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/tasks/ONB-004-destructive-lifecycle-invariants.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260524111000_init_postgres/migration.sql`
- `apps/api/prisma/migrations/0002_imported_games/migration.sql`
- `apps/api/prisma/migrations/20260613190000_add_course_ownership/migration.sql`
- `apps/api/prisma/migrations/20260703120000_add_tactical_detections/migration.sql`
- `apps/api/prisma/migrations/20260704130000_add_scenario_training/migration.sql`
- `apps/api/prisma/migrations/20260713120000_add_mobile_offline_sync/migration.sql`
- `apps/api/prisma/migrations/20260716111500_harden_persistent_job_foundation/migration.sql`
- `apps/api/prisma/migrations/20260719210000_add_imported_game_ai_review/migration.sql`
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/services/externalAccountService.ts`
- `apps/api/src/services/lichessConnectionService.ts`
- `apps/api/src/auth/current-app-user.service.ts`
- `apps/api/src/modules/jobs/job-run.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-worker.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `apps/api/src/modules/jobs/job-task-executor.ts`
- `apps/api/src/modules/imported-games/imported-game-processing.service.ts`
- `apps/api/src/modules/imported-games/ply-index.repository.prisma.ts`
- `apps/api/src/modules/imported-games/imported-games.service.ts`
- `apps/api/src/modules/imported-games/game-tagging.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis.service.ts`
- `apps/api/src/modules/analysis/analysis.repository.prisma.ts`
- `apps/api/src/modules/ai/game-review/game-review.repository.prisma.ts`
- `apps/api/src/modules/lab/tactical-detections/tactical-detection.service.ts`
- `apps/api/src/modules/lab/tactical-detections/tactical-detection.repository.prisma.ts`
- `apps/api/src/modules/scenario-training/scenario-training.repository.prisma.ts`
- `apps/api/test/courses/course-ownership.test.mjs`
- `apps/mobile/src/auth/MobileSessionProvider.tsx`
- `apps/mobile/src/db/repositories/local-user.repository.ts`
- `apps/mobile/src/db/migrations/index.ts`
- `apps/mobile/src/db/migrations/0001-offline-content.ts`
- `apps/mobile/src/db/migrations/0002-offline-training.ts`
- `apps/mobile/src/db/migrations/0003-attempt-sync.ts`

GitHub records actually opened/read:

- #147 — onboarding/data lifecycle program;
- #151 — ONB-004 issue and ONB-003 handoff;
- current branch and pull-request searches for ONB-004;
- #259, #260, and #261 created by this task.

The branch was inspected and modified through the connected GitHub API. A local clone attempt failed because the runtime could not resolve `github.com`; no local build or test execution is claimed.

## 3. Verified current repository state

### 3.1 Account deletion is immediate and unfenced

`DELETE /api/me/accounts/:id` calls `ExternalAccountService.deleteForUser`. The service clears the default-progress-account pointer when necessary and deletes `ExternalAccount` in one transaction.

It does not:

- preview affected rows;
- reject or cancel active sync/import/preparation/job work;
- wait for active task claims;
- persist an operation or checkpoint;
- require an idempotency key or typed confirmation;
- create an audit record;
- bound a large cascade.

This route cannot be the final destructive lifecycle implementation.

### 3.2 Current cascades are useful but not a complete contract

Deleting an `ExternalAccount` cascades:

- `ImportedGame`;
- `ImportRun`;
- `AccountRatingStats`.

Deleting each imported game cascades:

- `ImportedGamePly`;
- `GameAnalysisRun`;
- `ImportedGameAiReview`;
- `TacticalDetection`;
- `TacticalDetectionProcessedGame`;
- `TacticalDetectionFeedback`.

It does not delete:

- `JobRun`; each `JobTask.importedGameId` becomes null;
- `ScenarioTrainingSession`; game/detection foreign keys become null while copied personal context remains;
- shared `Position` or `PositionAnalysis`;
- `LichessConnection`; its account link becomes null.

A correct operation therefore cannot be described only as “use Prisma cascade.”

### 3.3 Running game jobs retain a write lease after cancellation request

Current job cancellation changes running tasks to `CANCELLED` but deliberately preserves `JobTask.workKey`. The worker clears that lease only after its executor stops or stale-cancellation recovery runs.

This is the correct active-game fence for normal job cancellation, but it means:

- terminal `JobRun.status` alone is not proof of quiescence;
- deletion must wait until every relevant `workKey` is null;
- a running executor may still perform a final bounded write before observing abort;
- destructive writes must begin only after acknowledgement.

### 3.4 The synchronous provider sync path has no durable claim to drain

The current account sync route performs provider work inside the request. It has no persisted heartbeat/claim token comparable to the job worker.

Therefore the final account purge/delete cutover depends on the durable import lifecycle from ONB-011/012/015. The current direct route cannot prove that no in-flight provider request will write after deletion.

### 3.5 Existing un-index primitive is incomplete

`clearPlyRowsForGame` deletes plies and clears `plyIndexedAt`/`plyIndexError` only.

It leaves:

- game analysis runs and latest-analysis snapshot fields;
- AI review;
- tactical detections/processed markers/feedback;
- analysis-derived tag codes;
- opening values;
- scenario-training rows.

It must remain an internal indexing primitive, not become the public un-index operation.

### 3.6 Analysis data is both game-owned and shared

Per-game analysis evidence includes:

- `GameAnalysisRun`;
- `ImportedGame.latestAnalysis*` fields;
- `ImportedGamePly.scoreLossCp` and `classificationCode`;
- `ImportedGameAiReview`;
- analysis-derived tag codes;
- tactical detections and processed markers.

Shared reusable engine evidence includes:

- `Position`;
- `PositionAnalysis`;
- `MastersExplorerCache`.

Analysis writes shared position results in chunks. Un-analysis must remove per-game evidence but retain shared position analysis.

### 3.7 Tag codes are one mixed projection

`ImportedGame.tagCodes` contains metadata, index state, analysis state, and analysis narrative tags. There is no reliable persisted source flag per tag.

The correct reset rule is:

1. clear canonical analysis/index evidence according to the action;
2. run the existing tagging calculation against remaining evidence;
3. store the recomputed full tag set.

Do not maintain a hardcoded list of “analysis tags to delete.”

### 3.8 Tactical history has three different meanings

- `TacticalDetection` and `TacticalDetectionProcessedGame` are derived current-evidence rows and must be removed for all versions/hashes during un-analysis.
- `TacticalDetectionFeedback` is user preference keyed by game/kind/ply and should survive un-analysis/un-index so regenerated evidence remains disliked.
- `ScenarioTrainingSession` contains a self-contained training snapshot and attempts. It should survive un-analysis/un-index as historical training, but it must be deleted during account purge/delete because it copies personal game data beyond the imported-game cascade.

`TacticalDetectionRun` is retained as historical execution evidence; its historical aggregate counts are not a current-row count.

### 3.9 AI reviews become stale when analysis is cleared

`ImportedGameAiReview.analysisRunId` uses `SetNull`, but the review content and input hash were generated from that analysis. Un-analysis must delete the review, not merely null its analysis-run link.

### 3.10 Opening provenance is absent

Opening values can arrive from the provider or be assigned locally when provider values are missing. The schema does not record which path produced the values.

Un-index should clear a local opening assignment so re-index can reclassify it, but must not erase provider opening metadata. Existing rows are ambiguous, so a provenance migration must treat them conservatively as `UNKNOWN` and retain them.

### 3.11 Whole-user cascade misses OAuth state and external identity recreation

`OAuthLoginState.userId` has no Prisma relation or database foreign key to `AppUser`. Deleting `AppUser` therefore does not remove these rows automatically.

`CurrentAppUserService.resolveExternalUser` upserts by external provider/subject. If the external identity and token remain valid, a request after deletion can create a new `AppUser` immediately.

Whole-user deletion requires:

- explicit OAuth-state deletion;
- local encrypted-token deletion;
- best-effort upstream token revocation;
- a tombstone checked before normal user upsert;
- a deliberate future “start fresh” policy rather than silent recreation.

### 3.12 Server deletion cannot erase offline mobile data by itself

Mobile sign-out currently locks `local_user`; it does not delete it. Downloaded courses, local sessions/attempts, and pending outbox records cascade only when `local_user` is deleted.

The initiating mobile client must receive a terminal deletion receipt and delete its local user before completing sign-out. Other offline devices can only purge at their next authenticated contact; they must not upload stale outbox attempts after the server user is deleted.

## 4. Canonical actions

### 4.1 `UNANALYSE_GAMES`

Target: one or more owned imported games, optionally selected by account/range through a bounded server-side predicate.

Retain:

- raw imported game and provider metadata;
- PGN;
- plies and index timestamps/errors;
- opening metadata;
- shared Position/PositionAnalysis/cache;
- tactical feedback;
- scenario sessions/attempts as historical self-contained training;
- JobRun/JobTask history;
- import and preparation history.

Delete or clear:

- all `GameAnalysisRun` rows;
- `ImportedGameAiReview`;
- every `ImportedGame.latestAnalysis*` field;
- all ply score-loss/classification values;
- all tactical detections for every thresholds hash/version;
- all tactical processed-game markers;
- recompute complete `tagCodes` from remaining evidence.

Effects:

- analysis readiness becomes not-ready;
- indexing readiness and core onboarding completion remain unchanged;
- retained scenario sessions are historical and must not count as current analysis readiness.

### 4.2 `UNINDEX_GAMES`

Target: one or more owned imported games.

Rule: un-index always performs `UNANALYSE_GAMES` first.

Then delete or clear:

- `ImportedGamePly` rows;
- `plyIndexedAt`;
- `plyIndexError`;
- locally assigned opening values only;
- recompute `tagCodes`.

Retain:

- raw imported game/PGN;
- provider or legacy/unknown opening values;
- shared Position/PositionAnalysis/cache;
- tactical feedback and historical scenario sessions;
- job/import/preparation history.

Effects:

- index and analysis readiness become not-ready;
- a preparation projection derives regression from current evidence rather than rewriting historical batch counts.

### 4.3 `PURGE_ACCOUNT_DATA`

Target: one owned `ExternalAccount` while retaining the account record.

Delete:

- scenario-training sessions/attempts copied from target account games;
- all target `ImportedGame` rows and their cascades;
- target import runs and future exact coverage records;
- account rating statistics;
- account-derived preparation target/current-import links according to ONB-017/018 invalidation semantics.

Reset:

- `lastSyncAt`;
- `syncCursorTime`;
- `lastSyncRunId`;
- provider/import coverage frontiers and checkpoints.

Retain:

- `ExternalAccount` identity/metadata and active flag;
- default-progress selection unless the caller explicitly changes it;
- independent `LichessConnection` and token;
- user courses/training/puzzles;
- shared Position/PositionAnalysis/cache;
- job/import/preparation/lifecycle audit history as historical evidence, with nullable/deleted target links as designed.

Effects:

- the account is reusable as a clean import target;
- onboarding disposition is not automatically reset; readiness derives from remaining evidence;
- an explicit separate “restart onboarding” command may create a recovery/expansion run.

### 4.4 `DELETE_EXTERNAL_ACCOUNT`

Target: one owned `ExternalAccount`.

Perform `PURGE_ACCOUNT_DATA`, then:

- clear `AppUser.defaultProgressAccountId` if it references the account;
- delete `ExternalAccount`;
- let an independently managed `LichessConnection.externalAccountId` become null;
- retain the OAuth connection unless the user separately requests disconnect or deletes the whole app user.

Recreating the same provider/username creates or reactivates a new account boundary with no historical imported data or coverage.

### 4.5 `DELETE_APP_USER`

Target: the authenticated application user, or an administrator-authorized target after ONB-005.

Before deletion:

- persist a whole-user fence;
- request cancellation and wait for all preparation/import/job claims;
- reject new writes and normal AppUser reprovisioning;
- attempt bounded upstream provider-token revocation;
- record revocation outcome without retaining token material.

Delete in bounded phases:

- OAuth login states explicitly;
- Lichess connection/local encrypted token;
- accounts/imported games/import/coverage/rating data;
- scenario/tactical/AI data;
- jobs and user-owned preparation state after terminal audit snapshots are copied;
- courses, chapters, lines, move nodes, training sessions/attempts/subline attempts;
- puzzle rounds/review state;
- all remaining AppUser-owned rows;
- final `AppUser` row.

Retain:

- shared Position/PositionAnalysis/cache;
- global tag definitions;
- global Lichess puzzle corpus;
- lifecycle operation/audit records with pseudonymous target/actor keys;
- deleted-auth-identity tombstone.

Client handshake:

- return a terminal deletion receipt before ending the initiating session;
- mobile deletes its `local_user` row, which cascades all downloaded content, local training, and outbox rows;
- other offline devices purge at next contact and cannot upload old outbox data;
- a deliberate later start-fresh flow may remove/replace the tombstone, but ordinary auth resolution cannot.

## 5. Model-by-model lifecycle matrix

Legend:

- `R` — retain unchanged or as historical evidence;
- `D` — delete;
- `C` — clear/recompute selected fields;
- `N/A` — not in scope;
- `S` — shared/global retention.

| Model or state | Un-analyse | Un-index | Purge account | Delete account | Delete user |
| --- | --- | --- | --- | --- | --- |
| `AppUser` | R | R | R | R | D |
| onboarding disposition | R | R | R; readiness rederived | R; readiness rederived | D |
| `ExternalAccount` | R | R | R + C sync fields | D | D |
| `LichessConnection` | R | R | R | R with account link null | D after revoke attempt |
| `OAuthLoginState` | R | R | R | R | D explicitly |
| `AccountRatingStats` | R | R | D | D | D |
| `ImportRun` / future coverage | R | R | D/current links invalidated | D | D |
| preparation run/target/batch | R; evidence rederived | R; evidence rederived | cancel/invalidate target; retain history | cancel/invalidate; retain audit snapshot | D after audit copy |
| `JobRun` | R | R | R historical | R historical | D after audit copy |
| `JobTask` | R | R | R; game FK becomes null | R; game FK becomes null | D with JobRun |
| `ImportedGame` | R | R | D | D | D |
| raw PGN/provider metadata | R | R | D | D | D |
| opening values | R | C local only | D with game | D | D |
| `ImportedGamePly` | C analysis fields | D | D | D | D |
| `GameAnalysisRun` | D | D | D | D | D |
| latest analysis snapshot fields | C null | C null | D | D | D |
| `ImportedGameAiReview` | D | D | D | D | D |
| `tagCodes` | C recompute | C recompute | D | D | D |
| `TacticalDetection` | D all versions | D | D | D | D |
| tactical processed markers | D all hashes | D | D | D | D |
| `TacticalDetectionFeedback` | R | R | D | D | D |
| `TacticalDetectionRun` | R historical | R historical | R historical unless user deletion | R historical | D after audit copy |
| `ScenarioTrainingSession`/attempts | R historical | R historical | D when sourced from target games | D | D |
| `Position` | S | S | S | S | S |
| `PositionAnalysis` | S | S | S | S | S |
| `MastersExplorerCache` | S | S | S | S | S |
| `GameTagDefinition` | S | S | S | S | S |
| `Course`/chapter/line/move nodes | R | R | R | R | D |
| training sessions/subline/attempt moves | R | R | R | R | D |
| `LichessPuzzle` corpus | S | S | S | S | S |
| puzzle rounds/review state | R | R | R | R | D |
| lifecycle operation/audit | R | R | R | R | R pseudonymized |
| deleted identity tombstone | N/A | N/A | N/A | N/A | create/retain |
| mobile `local_user` and cascades | N/A | N/A | N/A | N/A | D through receipt handshake |

## 6. Durable operation and fence model

Exact Prisma names belong to ONB-019, but the semantics are fixed.

### 6.1 Operation lifecycle

```text
PREVIEWED
QUEUED
FENCING
CANCEL_REQUESTED
WAITING_FOR_DRAIN
EXECUTING
VERIFYING
COMPLETED
NEEDS_ATTENTION
FAILED
CANCELLED
EXPIRED
```

Rules:

- `PREVIEWED` stores bounded counts, scope facts, expiry, and a preview hash.
- execution consumes a preview and idempotency key;
- once destructive execution begins, recovery is forward-only;
- `FAILED`/`NEEDS_ATTENTION` retain the checkpoint and can be retried;
- success is set only after postcondition verification and fence release;
- an operation never promises rollback of already deleted rows.

### 6.2 Resource fences

Persist unique fences for:

```text
USER:<userId>
ACCOUNT:<accountId>
GAME:<importedGameId>
```

Conflict rules:

- a user fence conflicts with every account/game owned by that user;
- an account fence conflicts with every game in the account;
- a game fence conflicts with the same game;
- overlapping previews may exist, but overlapping executing fences may not.

Admission checks must cover:

- provider sync/import creation and claims;
- imported-game `JobRun` creation and task claim;
- preparation run/batch admission;
- direct AI review, tag refresh, tactical detection, scenario source creation, and any other writer for fenced games;
- account create/reactivate/update where it would undermine the target operation;
- ordinary AppUser upsert when a deleted-identity tombstone exists.

### 6.3 Drain proof

A scope is quiescent only when:

- target preparation is paused/cancelled and no child batch can admit work;
- target import runs are terminal and no provider claim/fence token remains;
- every relevant `JobTask.workKey` is null;
- no lifecycle operation worker claim other than the current operation is active;
- any legacy synchronous write path is disabled or rejected by cutover.

`JobRun.status` or task status alone is insufficient.

## 7. Preview, confirmation, and API shape

Recommended user routes:

```text
POST /api/me/data-lifecycle/previews
POST /api/me/data-lifecycle/operations
GET  /api/me/data-lifecycle/operations/:id
```

The preview request contains action plus bounded server-resolved scope, never unbounded client game arrays.

Preview response includes:

- preview/operation ID;
- action and normalized scope;
- expiry;
- exact affected-row aggregates by domain;
- retained shared-data statement;
- blockers/active work;
- required typed confirmation phrase;
- warning codes;
- opaque preview hash/token.

Execute request includes:

- preview ID/token;
- idempotency key;
- typed confirmation;
- optional user-safe reason code.

Execution returns `202 Accepted` with operation state. The server revalidates ownership, preview expiry, scope, and conflicts; preview counts are advisory and do not authorize stale scope.

Administrator routes from ONB-005 should call the same service with an explicit actor/target boundary rather than duplicate deletion logic.

## 8. Audit and privacy

Lifecycle audit must survive user/account deletion but must not become a shadow data store.

Retain:

- operation/action/status;
- timestamps;
- pseudonymous versioned actor and target identifiers;
- resource type and internal operation ID;
- aggregate counts;
- bounded reason/error codes;
- confirmation method;
- token-revocation outcome;
- idempotency/result linkage.

Do not retain:

- raw PGN;
- OAuth token/ciphertext/IV/auth tag;
- email, username, display name, provider URL, FEN history, AI content, or scenario JSON;
- raw auth subject.

Use a versioned HMAC for deleted identity and audit correlation. Key rotation/retention policy belongs to ONB-005/019 implementation detail.

## 9. Opening provenance

Add an opening provenance field with semantics equivalent to:

```text
PROVIDER
LOCAL_BOOK
UNKNOWN
NONE
```

Rules:

- provider adapters set `PROVIDER` when provider opening values are stored;
- local assignment sets `LOCAL_BOOK` only when it supplies values;
- absent values use `NONE`;
- migration marks existing non-null values `UNKNOWN` unless provenance can be proved;
- un-index clears opening values only for `LOCAL_BOOK`;
- provider and `UNKNOWN` values are retained;
- reimport may replace `UNKNOWN` with proven provider provenance.

A single provenance field is sufficient because local assignment currently fills missing values and does not overwrite provider values.

## 10. Batching and failure recovery

### 10.1 No account-sized transaction

For account or user operations:

1. fence and drain;
2. select stable IDs in deterministic bounded batches;
3. delete/clear one batch in a short transaction;
4. persist checkpoint/counters;
5. repeat;
6. perform final parent deletion in a small transaction;
7. verify postconditions.

Recommended ordering is ascending primary key, with a persisted last-processed ID or phase-specific cursor. Numeric batch size is tuned by ONB-007/implementation evidence.

### 10.2 Forward-only retry

After the first destructive phase:

- cancellation may stop future phases but cannot restore rows;
- retry resumes from checkpoint;
- already deleted rows count as satisfied postconditions;
- each phase is idempotent;
- operation and audit event uniqueness prevents duplicate terminal records.

### 10.3 Parent cascade as final cleanup, not bulk plan

Use existing cascades as safety/final cleanup after large child sets have been reduced. Do not rely on deleting a populated account/user parent as the only production batching strategy.

## 11. Onboarding and preparation effects

- Un-analysis changes analysis readiness only.
- Un-index changes index and analysis readiness, and may invalidate feature readiness that depends on plies.
- Account purge/delete cancels active preparation targets for that account and invalidates their current-evidence projection.
- Historical preparation batches remain execution evidence unless whole-user deletion removes them after audit copy.
- User onboarding disposition is not automatically reset by account/game operations; the server projection rederives readiness.
- A separate explicit restart/recovery command can create new preparation work.
- Whole-user deletion removes disposition/preparation state entirely.

## 12. User-facing and administrator boundaries

Safe self-service candidates after implementation:

- account-data purge;
- external-account deletion;
- whole-user deletion;
- selected-game or account-level un-analysis/un-index behind an advanced destructive-data surface.

Every self-service action still requires preview, typed confirmation, idempotency, and operation status.

Administrator mutation exposure waits for ONB-005 authorization/audit policy. ONB-005 must not implement separate direct-delete SQL.

The existing immediate account-delete route remains a compatibility risk and should be cut over only after ONB-019/020 plus durable import/preparation cancellation exist.

## 13. Security and abuse controls

- authenticate every preview and execute request;
- resolve target ownership server-side;
- reject arbitrary user/account/game IDs outside the actor's scope;
- rate-limit preview and execute creation;
- use short preview expiry;
- require recent authentication for whole-user deletion and administrator actions;
- never return OAuth/token material in preview/audit/status;
- do not expose row-level personal data in aggregate preview;
- maintain one active destructive operation per user initially;
- block normal writes through persisted fences, not browser state;
- treat typed confirmation as UX friction, not authorization.

## 14. Required implementation validation

### Persistence and API

- operation/idempotency uniqueness;
- preview expiry and stale-scope rejection;
- user/account/game fence conflict matrix;
- ownership and cross-user isolation;
- audit PII-shape/retention;
- opening provenance migration;
- deleted-identity resolver rejection.

### Active writers

- queued and running index job;
- running analysis writing shared and game-owned chunks;
- `PROCESS_GAMES` between index and analysis;
- `REFRESH_TAGS` after analysis clear;
- direct AI review/tactical creation;
- durable import claim and provider retry;
- preparation reconciler/child admission;
- cancellation acknowledgement with retained `workKey`;
- process crash and stale recovery.

### Action matrices

- un-analysis exact deletes/retentions;
- un-index implies un-analysis;
- provider/local/unknown opening behavior;
- tag recomputation;
- feedback/scenario retention;
- account purge copied-scenario deletion;
- job history null-game behavior;
- shared Position/PositionAnalysis/cache retention;
- account recreation after delete.

### Whole-user and mobile

- every AppUser-owned relation;
- OAuth login-state deletion;
- token revocation success/failure/timeout;
- concurrent authenticated request during deletion;
- external identity tombstone;
- local mobile user cascade;
- pending/sending outbox deletion;
- another offline device contacting after deletion;
- large user fixture with bounded transactions.

## 15. Decisions finalized

ONB-004 finalizes:

- five separate destructive actions;
- un-index always includes un-analysis;
- shared position/engine analysis survives all lifecycle actions;
- account purge retains the account and independent OAuth connection;
- external-account deletion retains independent OAuth unless explicitly disconnected;
- whole-user deletion removes local token state and blocks silent identity recreation;
- tags are recomputed from canonical evidence;
- tactical feedback and scenario snapshots survive un-analysis/un-index;
- target-game scenario copies are deleted by account purge/delete;
- opening provenance is required;
- operation success requires acknowledged import/job/preparation drain;
- large actions are checkpointed and forward-only;
- audit history survives target deletion without raw personal payloads;
- mobile local purge requires a client handshake;
- immediate unfenced account deletion is not the target architecture.

## 16. Rejected alternatives

- immediate parent cascade while workers may still write;
- considering terminal job status sufficient without checking active work keys;
- deleting shared Position/PositionAnalysis during account/user purge;
- treating `clearPlyRowsForGame` as complete un-index;
- retaining stale AI review after analysis-run deletion;
- clearing every tag or maintaining a manual analysis-tag delete list;
- deleting tactical feedback during un-analysis;
- retaining copied scenario personal data after account purge;
- clearing all opening values without provenance;
- one giant account/user transaction;
- AppUser delete with no OAuth-state cleanup or identity tombstone;
- claiming server deletion erases offline devices immediately;
- duplicating destructive logic in administrator routes.

## 17. Remaining questions and delegated ownership

ONB-004 no longer owns unresolved lifecycle semantics.

ONB-019 owns implementation-local names and constraints:

- exact operation/fence/audit/tombstone model and field names;
- preview expiry and terminal retention duration;
- HMAC key/version implementation;
- opening-provenance enum naming;
- exact admission-query shapes.

ONB-020 owns implementation-local execution details:

- batch sizes after evidence;
- phase/checkpoint enum names;
- exact tag-recompute transaction split;
- compatibility timetable for account-delete/reset-cursor cutover.

ONB-021 owns implementation-local user/mobile details:

- deletion receipt shape;
- Clerk upstream account-deletion policy;
- multi-device next-contact response/status;
- mobile purge ordering and UI transition.

ONB-005 owns administrator identity, recent-auth, confirmation, audit retention, and operator UI policy. ONB-006 owns shared-position orphan cleanup. ONB-007 may tune batch and worker timing, not lifecycle semantics.

## 18. Queue and task impact

Allocate:

1. ONB-019 / #259 at order 160 — operation/fence/audit/provenance/tombstone persistence.
2. ONB-020 / #260 at order 170 — account/game destructive coordinator and route cutover.
3. ONB-021 / #261 at order 180 — whole-user deletion and mobile purge handshake.

Refine dependencies:

- ONB-005 consumes this lifecycle contract for administrator mutation design;
- ONB-006 consumes the retained shared-position boundary;
- ONB-011/012/015 must expose cancellable/fenced import claims before account cutover;
- ONB-017/018 must expose acknowledged preparation cancellation;
- ONB-009 lifecycle commands must not overlap destructive commands;
- ONB-019 coordinates schema/migrations with ONB-011 and ONB-017.

The next deterministic research task after ONB-004 review/merge becomes ONB-007 by queue order.

## 19. Validation performed and limitations

Performed:

- verified queue, issue, branch, and PR collision state;
- inspected the current Prisma relation/cascade graph and relevant migrations;
- inspected current immediate account delete and raw cursor reset;
- traced job claim, cancellation, heartbeat, stale recovery, and orphan-task behavior;
- traced index, analysis, tag, tactical, AI review, and scenario writes;
- inspected course/training ownership cascades;
- inspected mobile local-user/offline/outbox cascade and sign-out locking;
- modelled running import/job/preparation, partial reset, account purge/delete, whole-user deletion, auth recreation, mobile offline device, restart, and large-data scenarios;
- allocated issues #259–#261.

Not performed:

- production row deletion;
- local build/lint/tests, because the runtime could not resolve `github.com` for cloning;
- migration implementation;
- provider-token revocation calls;
- database load testing or batch-size benchmarking;
- administrator or Angular UI implementation.

This is documentation-only research. Pull-request CI is the repository-level validation available for the branch.
