# Onboarding and Data Lifecycle Master Plan

Last updated: 2026-07-28

Program tracker: [#147 — Onboarding and Data Lifecycle Program](https://github.com/vokerg/chess_repertoir_trainer/issues/147)

## 1. Executive summary

The remaining product gap is not merely “an onboarding page.” It is the absence of a coherent **first-use data-preparation lifecycle**.

The application already contains most of the valuable destinations a player should eventually discover:

- imported games and account performance;
- opening analysis and opening struggles;
- game review with engine-derived information;
- tactical detections and scenario training;
- courses and course review;
- Player Chess Profile;
- the Repertoire Builder North Star;
- a durable database-backed imported-game worker.

What is missing is the system that turns a new authenticated user and a public provider username into those capabilities progressively, safely, and understandably.

Today, the first provider sync is a synchronous HTTP operation. A new Lichess account is scanned without a lower date bound when no cursor exists. A new Chess.com account fetches all available archive months when no cursor exists. Only after import finishes does the account UI manually offer indexing and analysis, each with all currently eligible IDs. The durable worker is strong, but the user-facing process around it remains an operator workflow rather than an onboarding product.

The recommended target is:

1. persist an onboarding/preparation run on the server;
2. accept a bounded recent-first import, initially the last three months of standard blitz and rapid games;
3. make provider import durable and resumable;
4. submit the newest games to indexing in bounded waves;
5. expose the first indexed results before all selected games are processed;
6. start analysis only for indexed games, also progressively;
7. continuously expose readiness, exact progress, failures, and available actions;
8. let the user navigate normally while preparation continues;
9. provide optional expansion into older history or additional accounts;
10. support operator-grade inspection, reset, deletion, and cleanup through a separate administrator boundary.

The existing `JobRun`/`JobTask` worker should remain the imported-game execution engine. The program should add only the missing orchestration around it. Provider import needs its own account-level durable work model because imported-game tasks cannot exist before games are imported.

The phrase “batches of 50” should be treated as a provisional user-value policy, not as a rewrite of the worker. The worker's current slice size of 25 controls fairness between job runs; it does not create visible preparation waves. The target orchestration may create separate bounded JobRuns of approximately 50 games, but ONB-003 and ONB-007 must validate the exact shape and size.

The administration work is necessary, but it is not part of the normal onboarding screen. It is the support and lifecycle control plane that allows the onboarding system to be tested, reset, repaired, and operated without manual SQL.

## 2. Product outcome

### 2.1 User promise

A first-time user should experience this sequence:

> Connect your games. We will prepare a useful recent sample first. You can start exploring as soon as the first results are ready, and the rest will continue in the background.

The experience should be calm and concrete. It should not confront the user with internal terms such as cursor reset, ply indexing, JobRun, Stockfish configuration, or imported-game workflow candidates.

### 2.2 System promise

The system should guarantee:

- accepted work survives route changes, browser closure, API restart, and worker restart;
- progress is derived from persisted database state;
- every selected game has an explainable preparation state;
- analysis never starts for a game that has not been indexed successfully;
- a failed game does not block all other games;
- expanding the time range does not repeat or corrupt prior work;
- explicit user jobs remain responsive while onboarding work exists;
- destructive operations cannot report success while workers can still mutate the target data;
- shared position analysis is retained or deleted according to an explicit lifecycle policy.

### 2.3 Operator promise

An authorized operator should be able to:

- list and find application users;
- inspect their external accounts;
- see import and preparation state;
- see counts by provider, speed, variant, indexed state, analysis state, and failure state;
- inspect courses and other high-level owned artifacts;
- preview destructive operations;
- purge account-owned imported data;
- reset indexing or analysis under defined invariants;
- delete an account or whole user with exact scope;
- run or schedule bounded orphan-position cleanup;
- see an audit trail of every administrator mutation.

## 3. Verified current repository state

This section records facts inspected on `main` at commit `07299fd3d29f49b245de31a40de8492d13c4ef0b`. Every implementation task must re-inspect the relevant files because the repository is in active development.

### 3.1 Authentication and entry

- The API supports Clerk authentication and a dev-single-user mode.
- Protected requests resolve or upsert an `AppUser`.
- The Angular `authGuard` checks only whether the user is signed in.
- `AppUser` has no onboarding lifecycle fields or relation.
- The current `main` root route redirects to `/library`.
- The Visual Transformation plan targets a public root and signed-in `/home`, and issue #133 includes eventual onboarding/empty-state/accessibility polish.

Implication: onboarding routing must coordinate with the Visual Transformation branch. It should not embed a permanent redirect policy based only on `main`'s current route structure.

### 3.2 External account import

Current account settings provide:

- account creation/upsert for Lichess or Chess.com;
- per-account synchronous sync;
- cursor reset;
- active/inactive state;
- default progress account;
- account deletion;
- workflow-candidate loading.

Lichess behavior:

- if `syncCursorTime` is absent, no `since` parameter is sent;
- the provider response is streamed as NDJSON;
- standard variants are retained;
- each game is checked for existence and inserted individually;
- the forward cursor is updated to the maximum observed game end time.

Chess.com behavior:

- if `syncCursorTime` is absent, all archive months are considered;
- archive months are fetched sequentially;
- standard variants are retained;
- games are checked and inserted individually;
- the forward cursor is updated to the maximum observed game end time.

Implications:

- first sync is not bounded to the onboarding default;
- HTTP lifetime and provider work are coupled;
- a large first history can delay all downstream value;
- normal incremental cursor semantics are not enough for recent-first import plus older-history backfill;
- import progress is not integrated into the durable job panel.

### 3.3 Imported-game eligibility

The current standard imported-game workflow accepts:

- speed category `blitz`;
- speed category `rapid`;
- variant null, `chess`, or `standard`.

This already matches the user's intended initial speed scope. Date scope is missing from the workflow-candidate service, and the service currently returns arrays of all eligible IDs for an account.

### 3.4 Durable imported-game jobs

The repository already has a strong PostgreSQL-backed worker:

- job kinds: `INDEX_GAMES`, `ANALYSE_GAMES`, `PROCESS_GAMES`, and `REFRESH_TAGS`;
- one task per imported game;
- user ownership filtering at job creation;
- newest-game-first task order;
- priority scheduling;
- `FOR UPDATE ... SKIP LOCKED` claims;
- a per-game active-work fence through `workKey`;
- heartbeat and stale recovery;
- cancellation and retry;
- worker-shutdown release;
- orphaned-task skipping after an imported game is deleted;
- separate API and worker processes;
- a global Angular polling store and job panel.

The default worker scheduling slice is 25 tasks. A slice is not a batch boundary visible to the user. It lets the worker periodically yield between runs and respond to higher-priority work.

The existing user-action priorities are:

- INDEX: 400;
- PROCESS: 350;
- ANALYSE: 300;
- REFRESH_TAGS: 250.

Implication: onboarding-origin jobs need an explicit lower or policy-driven priority and must not masquerade as direct user actions.

### 3.5 Processing semantics

Indexing currently:

1. creates or refreshes `ImportedGamePly` rows;
2. links plies to shared `Position` rows;
3. records `plyIndexedAt` or error state;
4. assigns a missing opening through the local opening assignment service.

Analysis currently:

- uses a Stockfish engine;
- skips a game whose latest analysis is current unless forced;
- records analysis runs and latest summary fields;
- refreshes tags;
- refreshes tactical detections;
- supports cancellation cleanup.

Combined processing calls indexing and then analysis for one game.

Implication: the onboarding pipeline can unlock opening-aware and aggregate value after indexing, before paying the full analysis cost. Separate stages provide clearer readiness and failure semantics than treating every game as an opaque `PROCESS_GAMES` unit.

### 3.6 Frontend job visibility

The root imported-game job store:

- restores active and recent jobs;
- polls every 1.5 seconds while active work exists;
- tracks task status by game;
- emits settled and terminal batches;
- exposes cancel, retry, and dismiss.

The job panel displays:

- job kind;
- game count;
- run status;
- progress;
- cancel/retry/dismiss.

It does not display:

- onboarding stage;
- provider import progress;
- overall preparation recipe;
- wave number;
- readiness milestones;
- which insights are newly available;
- what the user can do while work continues.

Implication: keep the job panel as the technical global execution surface, but add an onboarding/preparation projection. Do not overload the generic panel with all product storytelling.

### 3.7 Existing value surfaces

The current product can provide different levels of value at different evidence depths.

Import-only value can include:

- recent game list;
- results, ratings, opponents, dates, colors, provider opening metadata when supplied;
- rating and account performance aggregates that use imported games.

Indexed/opening-aware value can include:

- move/position navigation;
- locally assigned missing openings;
- personal opening occurrence and continuation evidence;
- broader opening analysis inputs;
- deterministic profile preference/exposure where named/classified opening coverage exists.

Analysed value can include:

- accuracy and evaluation summaries;
- opening success/trouble and early-mistake signals;
- tactical detections;
- richer game review;
- analysis-backed Player Chess Profile performance evidence.

Not every page has been audited for its exact minimum data contract. ONB-001 must produce the formal readiness matrix.

### 3.8 Data lifecycle

Deleting an `ExternalAccount` currently:

- clears the user's default progress account if necessary;
- deletes the account;
- relies on Prisma cascades for imported games, import runs, account statistics, imported-game plies, game analysis runs, tactical and AI-related owned rows, and other account-owned data.

`JobTask.importedGameId` uses `onDelete: SetNull`, so job history can survive while queued orphan tasks are skipped by worker maintenance.

Shared `Position` rows are not owned by an account. They may remain after all referencing imported-game plies are deleted. `PositionAnalysis` and explorer-cache rows belong to a shared Position and cascade if the Position itself is later removed.

Course `MoveNode` is a different model. It is not a shared position cache and must not be included in “unused move cleanup.”

Implications:

- full account purge already has a useful cascade foundation;
- partial un-index and un-analyse are much more difficult than full account deletion;
- shared-position cleanup must be separately defined and bounded;
- active-worker races must be handled before destructive operations become admin buttons.

### 3.9 Courses and user inspection

Courses are owned by `AppUser` and current course routes scope every operation to the authenticated user.

An administrator read model can query courses by target user directly in a new admin module. It should not bypass ownership by calling user-facing routes with an impersonated `auth.userId`.

Course inspection is useful operator context but is not on the critical path for progressive onboarding. Ship it as read-only metadata after the core user/account/job read model.

### 3.10 Deployment and capacity

The documented hosted topology is:

- Neon Postgres;
- Render Fastify API;
- Render background worker;
- Vercel Angular web.

The worker starts separately and initially runs as one process. Each analysis or processing task creates and disposes one engine instance. Horizontal scaling is technically possible at the database-claim level, but CPU and memory sizing has not been validated for the onboarding workload.

Implication: the product must not promise completion times or choose wave size from intuition. ONB-007 is a P0 research dependency.

## 4. Principal architecture conclusions

### 4.1 Onboarding needs a persisted domain aggregate

A client-side checklist cannot express:

- work accepted but not started;
- import running after the user leaves;
- multiple provider accounts;
- incremental arrival of imported games;
- multiple index/analysis waves;
- pause, retry, skip, cancel, or expansion;
- readiness milestones;
- reset/re-onboarding;
- cross-device re-entry.

Recommended direction: a user-owned **OnboardingRun** or more general **DataPreparationRun** aggregate.

The final name is delegated to ONB-001 and ONB-003. The model should be general enough to represent first-run preparation and later expansion, but not so generic that it becomes a platform for arbitrary workflows.

Provisional aggregate responsibilities:

- user and selected account scope;
- recipe snapshot;
- lifecycle state;
- requested date/speed/variant scope;
- current stage;
- import request references;
- preparation wave references;
- exact selected/imported/indexed/analysed/failed counts;
- readiness milestones;
- skip/completion/reset timestamps;
- last error and recovery action;
- created/updated/completed timestamps.

Do not store mutable derived counts redundantly unless they are maintained transactionally or clearly treated as snapshots. The service can aggregate from import and job records for detail responses while retaining milestone timestamps for product analytics.

### 4.2 Provider import needs durable account-level work

The existing `ImportRun` records outcomes, but current provider calls are executed inside HTTP handlers.

Recommended direction:

- define an import command/request persisted before provider work starts;
- process it in a worker runtime;
- update progress and continuation state in the database;
- insert games idempotently;
- expose imported IDs or a database selection boundary to downstream orchestration;
- let onboarding react to newly available games while the import continues.

Three import modes are required:

#### `BOUNDED_INITIAL`

Purpose: fetch the recent onboarding window.

Characteristics:

- explicit requested-from/requested-to;
- does not imply that older history has been imported;
- establishes the current forward high-water safely;
- records provider coverage and gaps.

#### `INCREMENTAL_FORWARD`

Purpose: normal refresh after the initial import.

Characteristics:

- uses the recent high-water cursor and overlap policy;
- preserves existing duplicate suppression;
- remains compatible with current account refresh behavior.

#### `HISTORICAL_BACKFILL`

Purpose: expand older history.

Characteristics:

- has a separate lower-bound/continuation cursor;
- never rewinds or overwrites the forward high-water;
- can run in bounded windows;
- can stop when provider history is exhausted or user scope is satisfied.

ONB-002 must decide whether to extend `ImportRun`, add `AccountImportRequest`, or create a small account-level task model. The preferred shape is the smallest schema that provides durable claims, retries, cancellation, continuation, and status without forcing account fetches into `JobTask(importedGameId)`.

### 4.3 Reuse the existing imported-game worker

Do not rebuild:

- imported-game ownership checks;
- task claims;
- work fences;
- task progress;
- cancellation;
- stale recovery;
- job retry;
- executor registry.

The orchestration layer should create existing JobRuns for eligible game IDs and observe their settlement.

Provisional origin/priority extension:

- add a job source such as `ONBOARDING` or `SYSTEM_PREPARATION`;
- assign it below explicit user-action work;
- retain per-kind relative ordering where needed;
- allow a direct user request on one game to preempt queued onboarding work;
- use the existing active-game fence to prevent duplicate execution.

The exact priority numbers belong to ONB-003. The policy must be tested rather than inferred from current user-action constants.

### 4.4 Add waves only where they create product or operational value

A JobRun with 2,000 tasks already produces individual task progress. Splitting it into 40 runs of 50 is not automatically better.

Waves are justified if they provide:

- a first-value gate;
- controlled analysis backlog;
- fair account distribution;
- a natural pause/cancel boundary;
- bounded database transactions at job creation;
- explicit progressive expansion;
- simpler readiness milestones.

Recommended provisional strategy:

1. import recent games;
2. select newest eligible games not already active/prepared;
3. create INDEX wave 1, target approximately 50;
4. when enough tasks settle, make indexed insight available;
5. create INDEX wave 2 while ANALYSE wave 1 begins only for successfully indexed games;
6. keep a bounded number of queued waves;
7. continue until the recipe is complete;
8. stop and surface failures without blocking unrelated games.

Do not enqueue thousands of analysis tasks immediately if the single worker cannot consume them soon and if doing so makes cancellation/expansion semantics harder. Keep orchestration responsive and bounded.

ONB-007 may recommend a size other than 50. Treat 50 as a configuration/policy default, not a magic constant spread through routes, services, and UI.

### 4.5 Index and analysis should remain separate stages

Reasons:

- indexing is engine-free;
- indexing unlocks opening assignment and position-level capabilities;
- analysis has materially higher resource cost;
- analysis may be disabled or misconfigured while indexing remains useful;
- separate progress is easier to explain;
- a failed analysis should not imply that the game was never prepared at all;
- stage-specific retry is safer;
- the user may later choose a different analysis scope.

`PROCESS_GAMES` remains valid for explicit workflows but should not hide the onboarding lifecycle.

### 4.6 Readiness needs a server projection

The UI should not infer readiness by independently calling several pages and counting data.

Recommended endpoint family, names provisional:

```http
GET  /api/me/onboarding
POST /api/me/onboarding/runs
GET  /api/me/onboarding/runs/:id
POST /api/me/onboarding/runs/:id/pause
POST /api/me/onboarding/runs/:id/resume
POST /api/me/onboarding/runs/:id/cancel
POST /api/me/onboarding/runs/:id/expand
POST /api/me/onboarding/runs/:id/skip
```

A detail response should include:

- lifecycle state;
- selected recipe;
- accounts;
- import stage;
- indexing stage;
- analysis stage;
- exact counts;
- active import and JobRun references;
- failed/retryable counts;
- readiness milestones;
- suggested available actions;
- blocking and non-blocking errors;
- expansion options.

“Suggested actions” should be deterministic capabilities, not a speculative recommendation engine. Examples:

- review recently imported games;
- open account progress;
- explore indexed openings;
- inspect the Player Chess Profile when evidence exists;
- train an existing course;
- continue free analysis;
- add another account;
- expand preparation scope.

The response should carry stable action codes and route parameters; Angular maps them to presentation.

### 4.7 The frontend needs a functional onboarding feature, not a modal maze

Recommended Angular structure, names provisional:

```text
apps/web/src/app/features/onboarding/
  data-access/
    onboarding-api.service.ts
    onboarding.models.ts
  state/
    onboarding.store.ts
  pages/
    onboarding-page.component.*
  ui/
    onboarding-introduction.component.*
    onboarding-account-step.component.*
    onboarding-recipe.component.*
    onboarding-progress.component.*
    onboarding-ready-actions.component.*
    onboarding-recovery.component.*
```

Rules:

- standalone components;
- page-scoped writable state where practical;
- API service owns HTTP only;
- store owns orchestration of calls and polling integration;
- no client-side chess processing;
- no duplicate imported-game job state machine;
- consume shared UI primitives proven by Visual Transformation;
- derive display view models in feature-local pure helpers;
- persist user decisions through API before navigation;
- support reload and deep link.

The onboarding page can be the focused entry for incomplete onboarding, while `/home` displays a compact preparation card and actions. Exact routing is delegated to ONB-001 because the Visual Transformation branch is changing layouts and entry behavior.

### 4.8 Keep the generic job panel

The job panel remains useful globally for technical jobs initiated anywhere in the product.

Recommended integration:

- onboarding progress references and summarizes underlying runs;
- the job panel continues to list specific imported-game JobRuns;
- the onboarding card can link to expanded technical progress;
- cancellation semantics are coordinated so cancelling a child run does not leave the parent in an impossible state;
- terminal jobs may still be dismissed without erasing onboarding history.

Do not turn the job panel into the sole onboarding experience. It lacks account import, lifecycle, milestones, and product guidance.

## 5. Target user journey

### 5.1 Welcome

The first screen should establish:

- what the application turns games into;
- that recent games are prepared first;
- that deeper analysis takes longer but runs in the background;
- that the user can use the product while it runs;
- that the initial scope can be changed or expanded later.

Avoid a long feature tour. The first meaningful action is account connection.

Suggested content principles:

- one promise;
- one concise three-stage explanation: import, organize, analyse;
- one primary action;
- privacy/data-control link;
- optional skip only if the product has a useful no-import route.

### 5.2 Connect an account

Reuse current account concepts but simplify presentation:

- provider;
- public username or existing OAuth connection where supported;
- server-side validation that the account can be resolved;
- visible ownership/privacy explanation;
- support one account first;
- allow more accounts later.

Creating an `ExternalAccount` should not automatically start an unbounded full-history scan.

### 5.3 Preview the preparation recipe

Show a plain-language summary before durable start:

- account;
- standard games;
- blitz and rapid;
- last three months;
- indexing first;
- deeper engine analysis in the background;
- ability to expand later.

This is where rated/unrated and date interpretation must eventually be explicit.

Advanced settings should not dominate first use. A user who accepts defaults should proceed in one action.

### 5.4 Durable start

After Start:

- persist the run and recipe;
- persist/schedule bounded import;
- return immediately with a run ID and state;
- redirect to onboarding progress or `/home`;
- show exact accepted scope;
- never depend on the start request remaining open.

### 5.5 Recent import

During provider import:

- show account and date scope;
- show exact imported count as it grows when available;
- show provider activity as indeterminate if total is unknown;
- explain that first games will be organized next;
- expose recoverable provider errors;
- let the user navigate.

As soon as enough eligible games exist, downstream indexing may begin; import does not necessarily have to finish first if ONB-002 and ONB-003 confirm a safe handoff contract.

### 5.6 First index wave

Index the newest eligible games first.

Why newest first:

- aligns with recent-first promise;
- likely reflects current rating and repertoire;
- matches existing job task ordering;
- gives immediately recognizable games;
- supports current three-month profile defaults.

Potential improvement after MVP: deterministic account-balanced or representative selection for multi-account users. Do not introduce sampling complexity before need is proven.

### 5.7 First-value milestone

After a small indexed sample or the first wave completes, the experience should change from “setting up” to “your first insights are ready.”

Candidate early content:

- number of recent games;
- white/black split;
- wins/draws/losses;
- top openings by occurrence;
- recent rating/account summary;
- common opponents;
- direct links to Games, Progress, and Opening Analysis;
- Player Chess Profile preference/exposure when its evidence requirements are met.

Do not wait for full analysis to show all early content.

### 5.8 Progressive analysis

Analysis begins for indexed games under the chosen recipe.

The experience should show:

- analysed count and coverage;
- current/queued/failed;
- which deeper capabilities are now available;
- a clear distinction between early imported/indexed observations and engine-backed conclusions;
- retry or reduced-scope recovery if analysis is disabled or repeatedly failing.

Candidate deeper actions:

- review an analysed recent game;
- inspect opening trouble;
- inspect tactical missed shots;
- open analysis-backed Player Chess Profile performance;
- start a relevant training scenario;
- later enter Repertoire Builder with prepared context.

### 5.9 Default completion

Completion means the selected recipe is complete, not that the user's entire chess history is permanently finished.

Completion summary:

- selected/imported/indexed/analysed counts;
- excluded games and reasons;
- failures requiring attention;
- capabilities unlocked;
- expansion choices.

Suggested expansion choices:

- six or twelve months;
- all available history through bounded backfill;
- another account;
- reprocess failed games;
- later analysis-depth options only if the product exposes them safely.

### 5.10 Returning and interrupted users

On every authenticated entry:

- load onboarding/preparation summary;
- if active, show a non-blocking continue/status card;
- if failed, show recovery;
- if incomplete but not active, show resume;
- if skipped, do not repeatedly force the full flow;
- if account data was purged, allow a new run;
- if a second account is added, treat it as expansion rather than resetting completed onboarding.

The user should be able to open the full onboarding route from the home card or settings.

## 6. Insight readiness matrix

ONB-001 must verify each capability against current services. The following is the recommended planning matrix, not a final contract.

| Capability | Imported rows | Indexed plies | Opening assignment/classification | Engine analysis | Minimum evidence note |
| --- | ---: | ---: | ---: | ---: | --- |
| Recent games list | Required | No | No | No | Immediate |
| Account rating/history/performance | Required | No | No | No | Depends on rating fields/sample |
| WDL, color, speed, opponent summaries | Required | No | No | No | Immediate |
| Provider opening display | Required | No | Provider-dependent | No | Coverage may be partial |
| Local opening assignment | Required | Required | Required | No | Per indexed game |
| Position/personal continuation evidence | Required | Required | Helpful | No | Needs position links |
| Opening-analysis personal context | Required | Required | Helpful | No | Verify exact widgets |
| Player profile preference/exposure | Required | Usually opening data | Required | No | Evidence grades apply |
| Accuracy/evaluation summaries | Required | Required | No | Required | Partial coverage visible |
| Opening success/trouble and early mistakes | Required | Required | Helpful | Required | Analysis-backed tags |
| Tactical detections | Required | Required | No | Required | Refreshed after analysis |
| Analysis-backed profile performance | Required | Helpful | Required | Required | Coverage threshold applies |
| Repertoire Builder defaults | Required | Helpful | Required | Helpful/required by evidence | Owned by #105 |

Each response should expose coverage rather than merely a Boolean. For example:

```json
{
  "code": "PLAYER_PROFILE_PERFORMANCE",
  "state": "PARTIAL",
  "selectedGames": 84,
  "indexedGames": 84,
  "analysedGames": 27,
  "requiredAnalysedGames": 5,
  "analysisCoveragePercent": 32.1,
  "evidenceStrength": "LOW"
}
```

The exact shared contract should avoid copying every downstream feature's schema. It needs enough data to explain readiness and navigate.

## 7. Proposed domain model

Names and fields below are architectural sketches for research, not migration instructions.

### 7.1 Preparation run

```text
DataPreparationRun
- id
- userId
- purpose: ONBOARDING | EXPANSION | REPAIR
- status
- recipeVersion
- recipeJson or normalized policy fields
- startedAt
- pausedAt
- completedAt
- cancelledAt
- skippedAt
- lastErrorCode
- lastErrorMessage
- createdAt
- updatedAt
```

Prefer normalized searchable fields for important policy dimensions and a versioned snapshot for future compatibility. Do not use opaque JSON as the only source of executable policy.

Potential related tables:

```text
DataPreparationAccount
- runId
- accountId
- requestedFrom
- requestedTo
- speedPreset/speeds
- variant policy
- inclusion policy
- status

DataPreparationWave
- runId
- accountId
- sequence
- stage: INDEX | ANALYSE
- jobRunId
- targetCount
- status
- createdAt
- completedAt

DataPreparationMilestone
- runId
- code
- reachedAt
- evidence snapshot
```

A milestone table may be unnecessary if fixed timestamps fit on the run. Avoid schema proliferation before ONB-001/003 proves the needed queries.

### 7.2 Import request

Possible shape:

```text
AccountImportRequest
- id
- userId
- accountId
- preparationRunId?
- mode
- status
- requestedFrom
- requestedTo
- forwardCursorStart
- backfillCursor/continuation
- gamesSeen
- gamesImported
- gamesSkipped
- gamesFailed
- providerProgress
- claimKey
- heartbeatAt
- startedAt
- completedAt
- error
- createdAt
- updatedAt
```

`ImportRun` may be extended instead. The decision should consider current import history semantics and migration compatibility.

### 7.3 Admin audit

Possible shape:

```text
AdminAction
- id
- actorProvider
- actorSubject
- actorAppUserId?
- actionCode
- targetUserId?
- targetAccountId?
- targetPreparationRunId?
- previewSnapshot
- requestId/idempotencyKey
- status
- resultSnapshot
- error
- createdAt
- startedAt
- completedAt
```

Credentials and authorization grants do not belong in this table. It records who did what and what happened.

## 8. Import architecture in detail

### 8.1 Command/status separation

The web request should create a command and return. A status endpoint reports progress.

Avoid:

```text
POST sync
  -> fetch thousands of remote games
  -> write thousands of rows
  -> recompute aggregates
  -> return after completion
```

Target:

```text
POST preparation/import
  -> validate account and scope
  -> persist queued import
  -> return 202 + status reference

worker
  -> claim import request
  -> fetch bounded provider data
  -> upsert/insert idempotently
  -> checkpoint continuation and counts
  -> publish database-visible availability
  -> settle/retry/fail

onboarding orchestrator
  -> select newly eligible imported games
  -> create bounded index wave
```

### 8.2 Provider-specific handling

Lichess:

- use explicit time bounds for initial and backfill modes;
- retain overlap for forward sync;
- stream response;
- checkpoint enough state to safely retry;
- verify how cancellation interacts with stream termination.

Chess.com:

- choose archive months intersecting the requested range;
- checkpoint archive-month progress;
- filter individual games to exact date bounds;
- retry provider/transient failures without repeating committed work;
- preserve current user-agent and retry behavior.

### 8.3 Database write behavior

The current per-game `findUnique` then `create` pattern is simple but may be inefficient for large history.

Research options:

- `createMany({ skipDuplicates: true })` after normalization;
- chunked provider-page transactions;
- batched lookup of existing provider IDs;
- provider-specific streaming buffer;
- post-insert query to obtain new IDs;
- avoid holding a transaction during network I/O.

Constraints:

- preserve account/provider unique identity;
- preserve failure observability;
- do not load an unbounded corpus into memory;
- keep rating-stat recomputation bounded or deferred;
- ensure downstream waves do not miss rows inserted before a retry.

### 8.4 Cursor invariants

The model needs at least two conceptual frontiers:

- **forward high-water**: latest successfully observed/imported time used for normal refresh;
- **historical coverage frontier**: oldest interval known to have been fetched for backfill.

Do not represent both with one nullable `syncCursorTime`.

Coverage should distinguish:

- requested and complete;
- requested but partial;
- provider had no games;
- not requested;
- unknown due to failure.

This matters when the UI says “last three months prepared” or offers “import older history.”

## 9. Preparation orchestration in detail

### 9.1 Orchestrator responsibilities

The orchestration service should:

- observe import availability;
- select eligible games from the database by run recipe;
- exclude games already prepared or active;
- create the next bounded JobRun;
- observe child run/task settlement;
- create dependent analysis waves;
- update/reconcile parent lifecycle;
- expose progress/readiness;
- recover after restart;
- stop creating new work when paused/cancelled;
- attach expansion work without erasing prior milestones.

The service must not execute chess processing itself.

### 9.2 Database selection, not client ID lists

Current account UI fetches candidate arrays and sends explicit IDs. For onboarding scale, selection should be server-side.

Potential command:

```http
POST /api/me/onboarding/runs/:id/advance
```

But normal operation should not depend on the client repeatedly calling advance. A worker or reconciler should progress the run.

Server selection query should filter by:

- user/account ownership;
- requested date bounds;
- standard variant;
- blitz/rapid speeds;
- index/analysis state;
- absence of active work;
- stable ordering;
- limit.

This avoids returning thousands of IDs to Angular.

### 9.3 Wave lifecycle

Provisional state:

```text
PENDING -> QUEUED -> RUNNING -> COMPLETED
                         \-> PARTIAL
                         \-> FAILED
                         \-> CANCELLED
```

Parent stage state must distinguish:

- no eligible games;
- work active;
- partial success with retryable failures;
- complete for the selected recipe;
- blocked by configuration, such as analysis disabled.

A parent can become useful before complete.

### 9.4 Pipelining

Safe pipeline example:

```text
Importing recent games
      |
      +--> Index wave 1 (newest)
      |        |
      |        +--> Analyse successful games from wave 1
      |
      +--> Index wave 2
               |
               +--> Analyse successful games from wave 2
```

Bound the number of active/queued child runs. Avoid creating every future analysis task immediately.

### 9.5 Multi-account policy

MVP recommendation:

- onboard one selected account first;
- allow additional accounts as expansion;
- if multiple accounts are selected, use deterministic round-robin or recency ordering only after ONB-003 evaluates fairness;
- progress and exclusions remain account-segmented;
- downstream profile aggregation can combine accounts according to its own contract.

Do not attempt cross-provider game deduplication without a stable identity. Existing Player Chess Profile documentation explicitly treats each owned imported game row as evidence and does not deduplicate across providers.

## 10. Job priority and fairness

Onboarding is user-requested but usually not interactive at the individual-task level. It should not monopolize the worker.

Recommended policy principles:

1. direct single-game or explicitly selected user action outranks background onboarding;
2. indexing can outrank onboarding analysis because it unlocks cheaper first value;
3. retry/repair initiated by the user receives deliberate priority;
4. background historical expansion is lower than initial recent preparation;
5. active-game fencing prevents overlap regardless of origin;
6. a large run yields through existing slices;
7. the parent orchestrator limits queued backlog.

Possible source/priority matrix, illustrative only:

| Source | Index | Process | Analyse | Tags |
| --- | ---: | ---: | ---: | ---: |
| Direct user action | 400 | 350 | 300 | 250 |
| Initial onboarding | 220 | n/a | 180 | included |
| User-requested expansion | 200 | n/a | 160 | included |
| Automatic maintenance | lower | n/a | lower | lower |

Do not adopt these numbers without ONB-003 tests.

## 11. Progress, milestones, and ETA

### 11.1 Exact progress

Always available:

- import request state;
- games seen/imported/eligible;
- selected games;
- index task counts;
- analysis task counts;
- failed/skipped/cancelled;
- milestone timestamps.

### 11.2 Indeterminate progress

Provider APIs may not expose a reliable total before traversal. The UI may show:

- “Fetching recent Chess.com archives… 2 months checked”;
- “Importing recent Lichess games… 37 added”;
- no fabricated percentage.

### 11.3 ETA policy

Default: no ETA.

An ETA may be enabled only when:

- enough recent task durations exist for the same operation/configuration;
- current worker is healthy;
- remaining work is known;
- estimate uncertainty is displayed;
- provider work with unknown total is excluded or separately estimated.

ONB-007 must define the sample and confidence rules. “About N minutes” without data is not acceptable.

### 11.4 Milestones

Recommended stable milestone codes:

- `ACCOUNT_CONNECTED`;
- `IMPORT_STARTED`;
- `FIRST_GAME_IMPORTED`;
- `FIRST_GAME_INDEXED`;
- `FIRST_INSIGHTS_READY`;
- `FIRST_GAME_ANALYSED`;
- `DEFAULT_INDEXING_COMPLETE`;
- `DEFAULT_ANALYSIS_COMPLETE`;
- `DEFAULT_RECIPE_COMPLETE`.

The exact first-insights gate belongs to ONB-001. It should be deterministic and not require all 50 games if useful value exists sooner.

## 12. Failure and recovery model

### 12.1 Account validation failure

Examples:

- username not found;
- provider unavailable;
- private/inaccessible data;
- unsupported account state.

Behavior:

- do not create an active run that can never progress;
- preserve user input;
- provide correction;
- log provider-safe diagnostics without leaking secrets.

### 12.2 Import partial failure

Behavior:

- checkpoint committed progress;
- mark request retryable when appropriate;
- retain imported games;
- allow indexing of safely imported rows;
- do not claim full date coverage;
- retry from checkpoint with overlap/idempotency.

### 12.3 Index failure

Behavior:

- fail only the game task;
- continue other games;
- surface count and sample error;
- offer retry;
- exclude failed games from analysis;
- parent can be partial rather than globally failed.

### 12.4 Analysis disabled/misconfigured

Current analysis executor fails clearly when local batch analysis is disabled.

Onboarding behavior:

- do not erase indexed value;
- mark analysis stage blocked;
- explain that game organization is ready but deeper engine insights are unavailable;
- operator diagnostics should expose worker configuration state without exposing secrets;
- allow later resume.

### 12.5 Worker restart

Existing stale recovery and shutdown release are reused. Parent reconciliation must derive child state after restart and continue creating waves only when safe.

### 12.6 User cancellation

Differentiate:

- pause: stop creating new waves; active work policy defined;
- cancel current run: cancel queued child work, abort active claims through existing cancellation, retain completed data;
- purge: destructive operation under ONB-004, not synonymous with cancel;
- skip onboarding: stop first-run prompting but do not necessarily cancel already accepted work unless user chooses it.

### 12.7 Account deletion during work

The existing cascade plus `JobTask.importedGameId = null` is not sufficient by itself for a polished destructive operation because an active executor may still be running.

Required protocol:

1. acquire a lifecycle/maintenance fence or mark target deleting;
2. prevent new import/preparation work;
3. cancel queued and running relevant jobs;
4. wait for active work-key acknowledgement or enforce a reviewed timeout/recovery rule;
5. delete account-owned rows;
6. settle parent/admin action;
7. let orphan task maintenance reconcile residual history.

Exact transaction and wait semantics belong to ONB-004.

## 13. Data lifecycle specification direction

### 13.1 Terms

- **Delete account**: remove the `ExternalAccount` and all account-owned imported data/history by cascade.
- **Purge imported data**: remove imported games and dependent account/game artifacts while optionally retaining the account configuration for a clean resync.
- **Un-index**: remove imported-game ply index and reset indexing state while keeping raw imported games.
- **Un-analyse**: remove game-specific analysis state and derived analysis artifacts while retaining raw games and usually the index.
- **Delete user**: remove `AppUser` and all owned accounts, games, courses, training, settings, and other owned data.
- **Clean shared positions**: remove unreferenced shared `Position` rows and dependent shared caches/analysis under a separate maintenance policy.

These definitions are provisional until ONB-004 completes its model matrix.

### 13.2 Full account deletion

Current cascades appear close to the desired semantics. The service still needs:

- active-work coordination;
- preview counts;
- audit;
- idempotency;
- admin/user authorization paths;
- exact return summary;
- large-delete operational validation.

### 13.3 Purge while retaining account

Potential sequence:

- stop work;
- delete imported games for account;
- delete/reset import and rating history according to policy;
- clear `lastSyncAt`, cursor, and last run references;
- retain provider/username/display name/active preference;
- allow a new bounded onboarding/import run.

Need decide whether import history is retained for audit or deleted as account data. Administrator audit should retain action evidence even if target rows are removed.

### 13.4 Un-index

Likely affected data:

- `ImportedGamePly`;
- `plyIndexedAt`;
- `plyIndexError`;
- local opening assignment, but provenance is currently missing;
- analysis and derived artifacts that depend on plies, unless un-index is forbidden while analysis exists.

Recommended invariant: un-index either requires prior un-analyse or performs a combined reset. Do not leave GameAnalysisRun claiming complete analysis for a game with no indexed plies.

Opening provenance problem:

- provider may supply opening name/ECO;
- local assignment fills missing values;
- current fields do not record source.

Before clearing opening fields, add provenance or define a conservative policy that preserves existing values. ONB-004 owns the decision.

### 13.5 Un-analyse

Likely affected data:

- `GameAnalysisRun`;
- latest analysis snapshot fields on `ImportedGame`;
- analysis-derived accuracy/evaluation data;
- `ImportedGamePly.scoreLossCp`;
- `ImportedGamePly.classificationCode`;
- tags whose source is analysis;
- tactical detections and related feedback/session implications;
- AI review records tied to analysis version;
- caches/aggregates that depend on analysis.

This is not safely implemented as “delete GameAnalysisRun.”

ONB-004 must classify each field/model as delete, clear, recompute, preserve, or block.

### 13.6 Delete user

This is broader than onboarding support:

- external accounts and imported data;
- courses, chapters, lines, move nodes;
- training progress, sessions, marathons;
- preferences/settings;
- tactical and scenario data;
- mobile sync/device data;
- AI reviews and other owned records;
- onboarding/preparation runs;
- job runs;
- AppUser identity mapping.

It requires the strongest confirmation and audit. Read-only inspection should ship before this mutation.

## 14. Administrator architecture

### 14.1 Authorization recommendation

Preferred first production design:

- user authenticates normally through Clerk;
- API resolves Clerk subject as today;
- a new `requireAdmin` server guard checks the verified subject against an environment allowlist, for example `ADMIN_CLERK_SUBJECTS`;
- optional future transition to a Clerk role/custom claim is isolated inside the guard;
- dev-single-user admin is allowed only through explicit dev configuration;
- no administrator secret is embedded in Angular or committed to source.

Why not hardcoded credentials:

- source history retains them;
- every deployment shares them;
- browser code or logs may expose them;
- rotation and attribution are poor;
- they create a second weak identity system just before a production user lifecycle is introduced.

If ONB-005 selects a temporary separate secret, it must be:

- environment-only;
- hash/constant-time verified;
- HTTPS-only;
- never stored persistently in browser storage;
- rate-limited or protected;
- explicitly temporary with a removal task.

### 14.2 API module

New code should follow current module conventions:

```text
apps/api/src/modules/admin/
  admin.routes.ts
  admin.schemas.ts
  admin.service.ts
  admin.repository.prisma.ts
  admin-auth.ts
  admin-action.service.ts
```

Routes remain thin. Read models and mutations are separated.

Possible endpoints:

```http
GET  /api/admin/users
GET  /api/admin/users/:userId
GET  /api/admin/users/:userId/accounts
GET  /api/admin/users/:userId/courses
GET  /api/admin/accounts/:accountId/data-summary
GET  /api/admin/actions
POST /api/admin/actions/preview
POST /api/admin/actions
GET  /api/admin/actions/:actionId
POST /api/admin/maintenance/orphan-positions/preview
POST /api/admin/maintenance/orphan-positions
```

Exact endpoint names wait for ONB-005 and ONB-004.

### 14.3 Read model

User list columns:

- user ID;
- display/email identifier;
- auth provider;
- created/last updated;
- account count;
- imported-game count;
- active preparation/job count;
- course count;
- last activity proxy.

User detail:

- accounts and sync/import status;
- counts by provider/speed/variant;
- indexed/unindexed;
- analysed/current/partial/failed;
- import runs;
- active/recent job runs;
- onboarding/preparation runs;
- courses with chapter/line/node counts;
- tactical/training summary;
- approximate database footprint only if a reliable query is designed.

All collections are paginated. Counts should use database aggregation. Do not load every game into Node to compute an admin card.

### 14.4 Angular boundary

Recommended first implementation:

- lazy `/admin` route in the existing web app;
- route guarded by a server-confirmed admin-capability call;
- excluded from normal navigation for non-admin users;
- shared transformed UI primitives;
- no credential form if normal Clerk identity is reused;
- read-only overview first;
- destructive actions added later behind preview and typed confirmation.

A separate deployable admin app is not justified yet. Revisit only if exposure, deployment, or operator workflow becomes materially different.

### 14.5 Audit and idempotency

Every admin mutation should persist:

- actor;
- action code;
- target;
- requested parameters;
- preview basis/version;
- idempotency key;
- status;
- counts/result;
- error;
- timestamps.

Repeated request with the same idempotency key returns the existing action.

Preview should return a short-lived action token or version tied to the current target state so execution can reject stale previews.

## 15. Orphan shared-position cleanup

### 15.1 Exact boundary

A shared `Position` is eligible only if no `ImportedGamePly` references it at deletion time.

Course `MoveNode` is unrelated and excluded.

Deleting a Position will cascade its shared:

- `PositionAnalysis`;
- explorer cache;
- other Position-owned relations defined in the current schema.

ONB-006 must re-inspect all relations before implementation.

### 15.2 Safe query pattern

Conceptual SQL:

```sql
DELETE FROM "Position" p
WHERE p.id IN (
  SELECT candidate.id
  FROM "Position" candidate
  WHERE NOT EXISTS (
    SELECT 1
    FROM "ImportedGamePly" ply
    WHERE ply."positionId" = candidate.id
  )
  AND candidate."updatedAt" < $grace_before
  ORDER BY candidate.id
  FOR UPDATE SKIP LOCKED
  LIMIT $batch_size
)
RETURNING p.id;
```

The exact SQL must ensure that a concurrent indexer cannot create a new reference after eligibility is checked but before deletion in a way that causes failure or data loss. Foreign keys protect integrity, but transaction/lock order and retry behavior need explicit testing.

### 15.3 Operation behavior

Initial release:

- admin-only;
- preview count;
- grace period;
- manual execution;
- bounded batches;
- progress and cancellation;
- audit;
- no automatic schedule.

Later:

- scheduled maintenance only after operational evidence;
- configurable retention;
- dashboard trend for orphan growth.

### 15.4 Why retain shared analysis initially

Retaining shared position analysis after account purge can:

- reduce repeated Stockfish work;
- benefit another imported game reaching the same position;
- keep account deletion cheaper;
- decouple user-owned raw data from reusable chess computation.

Cleanup still matters because unique or rare positions can accumulate indefinitely.

## 16. Observability and operations

### 16.1 Required counters

Per preparation run:

- import requests by status;
- games seen/imported/excluded/failed;
- eligible selected;
- indexed/failed;
- analysed/failed;
- waves created/completed;
- retries;
- paused/cancelled;
- milestone durations.

Worker:

- claim latency;
- task duration by kind;
- heartbeat/stale recovery;
- cancellation acknowledgement;
- engine startup/disposal failures;
- queue depth by source/priority;
- oldest queued task;
- throughput.

Admin/lifecycle:

- previews;
- actions by type/status;
- rows affected;
- active-work wait duration;
- orphan cleanup candidate/deleted counts.

### 16.2 Logs

Use structured context:

- userId where permitted;
- accountId;
- preparationRunId;
- importRequestId;
- jobRunId/jobTaskId;
- provider;
- stage;
- actionId;
- error code.

Do not log:

- auth tokens;
- admin secrets;
- full PGNs by default;
- private provider payloads;
- unnecessary email/username in high-volume worker logs.

### 16.3 Stalled-work detection

Admin diagnostics should flag:

- running import without heartbeat;
- running task beyond stale threshold;
- queued work with no worker progress;
- preparation run whose child state is terminal but parent not reconciled;
- analysis blocked by disabled engine;
- repeated provider failure;
- cleanup action stalled.

Notifications/alerts are later operational work; first expose deterministic diagnostics.

## 17. Product analytics and success criteria

The program should measure product outcomes through lifecycle timestamps and aggregate counters rather than introduce an analytics platform immediately.

Primary metrics:

- account-connect completion;
- preparation-start rate;
- time to first imported game;
- time to first indexed game;
- time to first insights;
- time to first analysed game;
- default recipe completion;
- failure/retry/recovery rate;
- percentage of users who navigate to a useful surface while preparation runs;
- expansion adoption;
- purge/reset frequency;
- support/admin intervention rate.

Quality guardrails:

- no misleading “complete” state with partial date coverage;
- no user stuck because analysis is disabled;
- no loss of completed data on retry;
- no destructive operation without audit;
- no client-side bulk processing;
- no worker starvation from onboarding backlog.

Do not optimize for the number of onboarding steps completed. Optimize for prepared evidence and meaningful product use.

## 18. Privacy, consent, and deletion

The introduction should state:

- which public provider account will be accessed;
- what game data is stored;
- that engine analysis creates derived data;
- that preparation continues in the background;
- where account data can be removed;
- which shared anonymous chess computation may be retained until maintenance cleanup, subject to final policy.

The last point needs careful product/legal wording. Shared Position rows should not contain account identity, but the program must verify whether FEN/analysis can be treated as reusable non-user-owned computation under the intended privacy policy.

Whole-user deletion should provide a clear completion record to the operator without retaining unnecessary personal target snapshots in audit.

## 19. Security and abuse controls

Risks:

- users connect arbitrary public usernames and cause large imports;
- repeated purge/reimport consumes provider/database/engine resources;
- historical expansion creates unbounded backlog;
- admin destructive operations target the wrong ID;
- normal users discover admin endpoints;
- provider usernames or errors leak across users;
- stale worker writes race with deletion.

Controls:

- ownership on every normal run;
- bounded default scope;
- one active import/preparation operation per account/policy;
- idempotency;
- expansion quotas or confirmation;
- server-side selection limits;
- administrator subject allowlist;
- preview/version/typed confirmation;
- audit;
- active-work fences;
- database foreign keys;
- rate limiting only where demonstrated and consistent with existing dependencies.

## 20. Performance and capacity plan

ONB-007 must establish:

- representative 3-month game counts;
- import duration by provider;
- index duration by game length;
- analysis duration by game length/depth/engine;
- engine startup overhead per task;
- database query/write load;
- time to first value under one worker;
- wave-size impact;
- memory/CPU;
- p50/p90/p99 task and milestone durations;
- behavior during direct-user job preemption.

Potential optimizations only after measurement:

- reuse one Stockfish process across multiple tasks while preserving cancellation isolation;
- batch provider writes;
- tune wave size;
- run separate index-only and analysis workers;
- add worker replicas;
- defer noncritical derived refresh;
- cache readiness projections.

Do not start with infrastructure expansion.

## 21. Delivery roadmap

### Phase 0 — foundation and research

Tasks:

- ONB-001 lifecycle/default recipe;
- ONB-002 bounded import/backfill;
- ONB-003 progressive orchestration;
- ONB-004 lifecycle invariants;
- ONB-005 admin architecture;
- ONB-006 cleanup architecture;
- ONB-007 benchmark/progress semantics.

Exit:

- decisions are explicit;
- schemas and APIs can be decomposed safely;
- destructive model matrix is approved;
- benchmark budgets exist;
- visual-program boundary is reconciled.

### Phase 1 — durable recent-first import

Likely implementation slices after ONB-002:

1. shared contracts and schema;
2. account-import repository/service;
3. provider bounded modes;
4. worker claim/retry/cancel;
5. command/status routes;
6. migration/backward compatibility;
7. tests and operational docs.

Exit:

- three-month import can be accepted and resumed without long HTTP;
- normal forward sync remains correct;
- historical backfill is represented safely.

### Phase 2 — progressive preparation core

Likely slices after ONB-003/007:

1. preparation run schema/contracts;
2. server-side game selection;
3. job source/priority extension;
4. index-wave reconciliation;
5. analysis-wave reconciliation;
6. readiness projection;
7. recovery/restart tests;
8. generic job-panel integration.

Exit:

- imported games progress through bounded index/analysis stages;
- first value appears before default completion;
- explicit user jobs remain responsive.

### Phase 3 — functional onboarding experience

Likely slices after ONB-001 and Visual Transformation coordination:

1. onboarding API/store;
2. welcome/account/recipe start;
3. progress and readiness;
4. `/home` compact status and continue action;
5. failure/retry/pause/cancel/skip;
6. expansion;
7. responsive/accessibility review with #133.

Exit:

- a new user completes the default functional flow;
- navigation and re-entry are verified;
- no client-side processing;
- final visual polish follows the shared transformed system.

### Phase 4 — read-only administration

After ONB-005:

1. admin guard/capability;
2. paginated user list;
3. user/account/job/import/preparation detail;
4. course metadata;
5. audit read model;
6. operator diagnostics.

Exit:

- operators can understand system/user state without direct SQL.

### Phase 5 — lifecycle mutations

After ONB-004 and Phase 4:

1. action audit/idempotency;
2. preview framework;
3. account purge;
4. account deletion;
5. un-analyse;
6. un-index/combined reset;
7. whole-user deletion;
8. race/cascade/load validation.

Exit:

- every mutation is previewed, audited, worker-safe, and recoverable.

### Phase 6 — shared-position maintenance

After ONB-006 and lifecycle controls:

1. dry-run query;
2. bounded delete worker/action;
3. admin progress;
4. concurrency/performance tests;
5. optional scheduling decision.

### Phase 7 — release hardening

- end-to-end first-user scenarios;
- multi-account scenarios;
- provider failures;
- worker restarts;
- analysis disabled;
- large account;
- purge/re-onboard;
- user deletion;
- accessibility and mobile web;
- observability and runbook;
- privacy wording;
- final coordination with #133 and #105.

## 22. Proposed implementation task families

Do not open these as concrete issues until research reports approve their boundaries.

Potential IDs:

- ONB-010 — Persist preparation-run lifecycle and contracts.
- ONB-011 — Deliver durable bounded account import.
- ONB-012 — Deliver historical backfill and forward-sync coexistence.
- ONB-013 — Add preparation wave reconciliation over JobRun.
- ONB-014 — Expose readiness and progress projection.
- ONB-015 — Deliver functional onboarding route and store.
- ONB-016 — Integrate preparation state into Home and global status.
- ONB-017 — Deliver onboarding recovery and expansion.
- ONB-020 — Add administrator authorization and audit foundation.
- ONB-021 — Deliver admin user/account diagnostics.
- ONB-022 — Deliver admin job/import/course inspection.
- ONB-023 — Deliver account purge/delete actions.
- ONB-024 — Deliver analysis/index reset actions.
- ONB-025 — Deliver whole-user deletion.
- ONB-030 — Deliver orphan-position cleanup.
- ONB-031 — Decide and implement scheduled maintenance.
- ONB-040 — Release hardening and visual/accessibility integration.

IDs are placeholders until added to `TASKS.md` and mapped to issues in one coordination change.

## 23. Decisions recommended now

These are recorded as locked or provisional in `DECISIONS.md`.

1. Treat onboarding as persisted progressive preparation, not a blocking wizard.
2. Default initial scope is standard blitz+rapid for the recent three-month window, subject to exact policy research.
3. Import first, index second, analyse third.
4. Reuse `JobRun`/`JobTask` for imported-game work.
5. Add no external queue or generic workflow engine.
6. Provider import becomes durable account-level work.
7. Historical backfill has a separate frontier from forward sync.
8. Show exact count progress; no ETA until benchmarked.
9. Administrator credentials are not hardcoded.
10. Read-only admin diagnostics precede destructive actions.
11. Destructive actions require preview, audit, idempotency, and active-worker safety.
12. Shared-position cleanup is database-only and separate from account purge.
13. Course viewing is useful admin context but not onboarding critical path.
14. Visual Transformation #133 consumes stable functional onboarding states.
15. Repertoire Builder #105 consumes prepared evidence but remains a separate product workflow.

## 24. Rejected approaches

### One synchronous “Import and analyse everything” request

Rejected because it couples provider, database, engine, and browser lifetime and delays all value.

### Full-history first by default

Rejected because it maximizes cost and wait before the product demonstrates value.

### Client-side batching or chess processing

Rejected because state is lost across navigation/session, creates trust and capacity problems, and violates the database/server processing direction.

### Replacing the existing worker

Rejected because the repository already has strong durable per-game execution.

### Treating worker slice size as onboarding batch size

Rejected because it is a scheduler fairness parameter with a different responsibility.

### Hardcoded admin username/password in source

Rejected because it is insecure, hard to rotate, unattributable, and unnecessary with existing Clerk identity.

### Raw delete buttons against arbitrary tables

Rejected because derived state, cascades, active workers, and shared analysis require domain-level invariants.

### Deleting every shared Position during account purge

Rejected as the default because positions and analysis are reusable and not account-owned. Cleanup is separate.

### Building final visual onboarding before lifecycle research

Rejected because it would freeze guesses into UI and collide with #133.

## 25. Major risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Cursor design loses older or newer games | Data gaps | Separate import modes/frontiers; overlap/idempotency tests |
| Onboarding floods worker | Slow direct actions | lower source priority, bounded waves, queue-depth policy |
| Analysis takes hours for large samples | Bad first use | index-first milestones, bounded recent scope, no false ETA |
| Visual branch and onboarding branch conflict | Rework | functional contract owned here; final polish in #133 |
| Partial reset leaves inconsistent derived data | Incorrect insights | ONB-004 model matrix and transactional service |
| Deletion races active executor | Writes after purge | lifecycle fence, cancel/acknowledge protocol |
| Admin auth is weak | Severe security risk | Clerk subject allowlist/role, no bundle secret, audit |
| Cleanup deletes referenced position | Integrity loss | FK, transactional eligibility, concurrency tests |
| Too many new models | Maintenance burden | research compares extending ImportRun vs minimal new aggregates |
| User is overwhelmed by progress detail | Poor UX | milestone narrative, compact default, technical drill-down |
| User cannot use app without games | Forced onboarding | skip path/free analysis/existing course paths where valid |
| Cross-provider duplicates distort insights | Evidence bias | segment by account; do not claim deduplication |
| Provider limits/outages | Stalled setup | durable retry/checkpoint and partial usefulness |
| Engine disabled | Analysis blocked | preserve indexed value, explicit blocked state, operator diagnostic |
| Audit retains personal data too long | Privacy risk | minimal snapshots and retention policy |

## 26. Validation strategy

Research tasks:

- repository inspection;
- schema/flow diagrams;
- adversarial lifecycle cases;
- provider fixture tests;
- benchmark harness;
- decision reports.

Implementation tasks:

- focused unit tests;
- route/contract tests;
- Prisma integration tests;
- migration tests;
- worker restart/cancel/stale tests;
- concurrency tests;
- account ownership/admin authorization tests;
- browser tests for reload/navigation/recovery;
- large-account boundedness checks;
- complete build/test gates before integration.

Critical end-to-end scenarios:

1. new Lichess user with 40 recent games;
2. new Chess.com user with 2,000 total games but 120 recent;
3. no recent blitz/rapid games;
4. provider partially fails;
5. API restarts after start;
6. worker restarts during index and analysis;
7. user navigates to Games while work runs;
8. user closes and returns next day;
9. direct game analysis preempts onboarding;
10. analysis is disabled;
11. user expands to all history;
12. account is deleted during queued work;
13. purge and re-onboard;
14. un-analyse and re-analyse;
15. orphan cleanup during normal indexing;
16. administrator lacks authorization;
17. whole-user deletion with courses/training.

## 27. Copilot instructions

```text
Copilot instructions

Work only on the claimed ONB task and branch recorded in north-star/onboarding/tasks and its mapped GitHub issue.

Before proposing or editing implementation:
1. Re-inspect AGENTS.md and north-star/onboarding/AGENTS.md.
2. Re-inspect the current task file, dependencies, decisions, and open questions.
3. Re-inspect the closest current implementation pattern:
   - import: apps/api/src/routes/externalAccounts.ts and provider import services;
   - jobs: apps/api/src/modules/jobs;
   - processing: apps/api/src/modules/imported-games and modules/analysis;
   - schema: apps/api/prisma/schema.prisma and latest migrations;
   - web: app.routes.ts, core/jobs, accounts feature, transformed shared UI on the actual base branch;
   - auth/admin: apps/api/src/auth and current Angular auth service/guards;
   - courses: apps/api/src/modules/courses.
4. Keep Fastify routes thin, orchestration in services, and Prisma access explicit.
5. Use typed contracts for new API shapes.
6. Keep bulk selection and processing server/database-side.
7. Reuse JobRun/JobTask for imported-game execution; do not add Redis, a generic queue, or a second task engine.
8. Do not combine forward sync and historical backfill into one ambiguous cursor.
9. Do not hardcode administrator credentials or expose admin authority in the web bundle.
10. Do not implement destructive actions without the approved ONB-004 lifecycle matrix, active-worker protocol, preview, audit, and idempotency.
11. Do not delete course MoveNode data as part of orphan shared-position cleanup.
12. Coordinate UI changes with Visual Transformation #133 and preserve stable routes/contracts.
13. Add focused tests for ownership, retries, cancellation, restart, cascades, and concurrency.
14. Update the task file, report, STATUS, ROADMAP, DECISIONS, OPEN_QUESTIONS, TASKS, and GitHub issue as required.
15. Do not commit to main and do not merge without explicit user instruction.
```

## 28. Files inspected

Only files actually opened and read during creation of this plan are listed.

### Program and repository guidance

- `AGENTS.md`
- `.agents/skills/api-feature/SKILL.md`
- `north-star/repertoire-builder/README.md`
- `north-star/repertoire-builder/AGENTS.md`
- `north-star/repertoire-builder/FOUNDATION.md`
- `north-star/repertoire-builder/TASKS.md`
- `north-star/repertoire-builder/GITHUB_ISSUES.md`
- `north-star/repertoire-builder/tasks/_TEMPLATE.md`
- `transformation/MASTER_PLAN.md` on branch `visual_transformation`

### API, authentication, routing, and deployment

- `apps/api/src/app.ts`
- `apps/api/src/routes/index.ts`
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/auth/auth.config.ts`
- `apps/api/src/auth/auth.plugin.ts`
- `apps/api/src/auth/current-app-user.service.ts`
- `docs/deployment.md`
- `docs/imported-game-job-processing.md`
- `docs/player-chess-profile.md`

### Prisma and data lifecycle

- `apps/api/prisma/schema.prisma`
- `apps/api/src/services/externalAccountService.ts`

### Provider import and workflow candidates

- `apps/api/src/services/lichessImportService.ts`
- `apps/api/src/services/chessComImportService.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-eligibility.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-candidates.service.ts`

### Durable jobs and processing

- `apps/api/src/modules/jobs/job-run.routes.ts`
- `apps/api/src/modules/jobs/job-run.service.ts`
- `apps/api/src/modules/jobs/job-run.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-worker.repository.prisma.ts`
- `apps/api/src/modules/jobs/job-worker.service.ts`
- `apps/api/src/modules/jobs/job-worker.config.ts`
- `apps/api/src/modules/jobs/job-task-executor.ts`
- `apps/api/src/modules/jobs/imported-game-job-executors.ts`
- `apps/api/src/modules/imported-games/imported-game-processing.service.ts`
- `apps/api/src/modules/analysis/imported-game-analysis-execution.service.ts`

### Angular

- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/auth/auth.guard.ts`
- `apps/web/src/app/core/auth/auth.service.ts`
- `apps/web/src/app/core/jobs/imported-game-job.store.ts`
- `apps/web/src/app/core/jobs/imported-game-job-panel.component.html`
- `apps/web/src/app/features/accounts/data-access/accounts-api.service.ts`
- `apps/web/src/app/features/accounts/state/accounts.store.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.html`

### Courses

- `apps/api/src/modules/courses/courses.routes.ts`

## 29. Immediate next action

The deterministic first research task is ONB-001 / #148 because it establishes the lifecycle and product contract consumed by every UI and orchestration decision.

ONB-002 / #149, ONB-003 / #150, ONB-004 / #151, and ONB-007 / #154 can run in parallel if agents confirm file/decision boundaries and avoid writing competing schema conclusions. ONB-005 / #152 and ONB-006 / #153 are important but can follow the first critical-path findings.
