# ONB-001 — Onboarding lifecycle and default preparation recipe

Date: 2026-07-29

Task: [ONB-001](../tasks/ONB-001-lifecycle-default-recipe.md)

GitHub issue: [#148](https://github.com/vokerg/chess_repertoir_trainer/issues/148)

Branch: `onb-001/issue-148-lifecycle-default-recipe`

Repository base inspected: `main` at `5407ab551dfedcb878752342fce80f262b3937da`

## 1. Question and outcome

ONB-001 owns the product and lifecycle contract that future import, preparation, API, Angular, Home, and readiness work must consume.

The approved direction is:

1. persist a small user-level onboarding disposition independently from operational jobs;
2. represent accepted work as repeatable user-owned `DataPreparationRun` records;
3. permit at most one non-terminal preparation run per user;
4. define onboarding as first-run guidance plus a core-readiness milestone, not as completion of all Stockfish analysis;
5. use one selected account and a fixed three-calendar-month standard blitz-and-rapid recipe by default;
6. include rated and unrated games in preparation, while individual product views may continue to apply their own rated defaults;
7. unlock value through explicit milestones and feature-specific readiness rather than one global “insights ready” boolean;
8. keep `/home` as the default signed-in destination and add a resumable `/onboarding` route without globally trapping protected navigation;
9. keep the global imported-game job panel as the technical child-job surface and add a separate onboarding/preparation projection;
10. show persisted counts and stage facts, never an ETA before ONB-007 approves one.

This report resolves the lifecycle/default-recipe questions and allocates three bounded implementation tasks:

- ONB-008 / [#193](https://github.com/vokerg/chess_repertoir_trainer/issues/193) — persisted disposition and readiness projection;
- ONB-009 / [#194](https://github.com/vokerg/chess_repertoir_trainer/issues/194) — lifecycle commands;
- ONB-010 / [#195](https://github.com/vokerg/chess_repertoir_trainer/issues/195) — Angular onboarding and Home re-entry.

## 2. Files and issue records inspected

Repository files actually opened/read on current `main`:

- `AGENTS.md`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/auth/current-app-user.service.ts`
- `apps/api/src/routes/externalAccounts.ts`
- `apps/api/src/modules/imported-games/imported-game-workflow-candidates.service.ts`
- `apps/api/src/modules/imported-games/opening-analysis.repository.prisma.ts`
- `apps/api/src/modules/player-chess-profile/player-chess-profile.service.ts`
- `apps/api/src/modules/player-chess-profile/player-chess-profile.metrics.ts`
- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/core/auth/auth.guard.ts`
- `apps/web/src/app/core/jobs/imported-game-job.store.ts`
- `apps/web/src/app/features/auth/login-page.component.ts`
- `apps/web/src/app/features/accounts/data-access/accounts-api.service.ts`
- `apps/web/src/app/features/accounts/pages/accounts-page.component.ts`
- `apps/web/src/app/features/accounts/pages/progress-entry-page.component.ts`
- `apps/web/src/app/features/home/home-page.component.ts`
- `apps/web/src/app/features/home/home-dashboard.store.ts`
- `apps/web/src/app/features/home/home-dashboard.helpers.ts`
- `apps/web/src/app/features/player-chess-profile/pages/player-chess-profile-page.component.ts`
- `apps/web/src/app/shared/games/filters/game-filter-period.ts`
- `docs/imported-game-job-processing.md`
- `docs/opening-struggles.md`
- `docs/player-chess-profile.md`
- `north-star/onboarding/AGENTS.md`
- `north-star/onboarding/MASTER_PLAN.md`
- `north-star/onboarding/ROADMAP.md`
- `north-star/onboarding/TASKS.md`
- `north-star/onboarding/STATUS.md`
- `north-star/onboarding/DECISIONS.md`
- `north-star/onboarding/OPEN_QUESTIONS.md`
- `north-star/onboarding/GITHUB_ISSUES.md`
- `north-star/onboarding/tasks/ONB-001-lifecycle-default-recipe.md`
- `north-star/onboarding/tasks/ONB-002-bounded-import-backfill.md`

Issue records actually opened/read:

- #105 — Repertoire Builder North Star program;
- #133 — Visual Transformation onboarding/accessibility task;
- #147 — Onboarding and Data Lifecycle program;
- #148 — ONB-001.

Repository access note: direct container clone of `https://github.com/vokerg/chess_repertoir_trainer.git` failed because the container could not resolve `github.com`; direct GitHub Connector file access succeeded and was used for all inspection and writes.

## 3. Verified current-state facts

### 3.1 Authentication and persistence

- `CurrentAppUserService` upserts `AppUser` for dev and external identities.
- `AppUser` has no onboarding state or preparation relation.
- `ExternalAccount`, `ImportedGame`, `ImportRun`, and `JobRun` are user-owned and cascade or retain history according to their existing relations.
- Terminal `JobRun` history is intentionally retained for a bounded period and may be dismissed or later deleted, so onboarding disposition cannot depend only on job-history existence.

### 3.2 Routing and signed-in entry

- `/` is a public landing page.
- `/home` is the current default login destination.
- `authGuard` verifies sign-in only; it does not inspect accounts, games, or onboarding state.
- login preserves an explicit `returnUrl` and otherwise navigates to `/home`.
- protected routes already exist for accounts, games, progress, profile, openings, builder, courses, analysis, and training.

### 3.3 Account setup and preparation are manual

- account creation and synchronous provider sync are separate actions.
- account UI then loads all workflow-candidate IDs and asks the user to submit indexing and analysis separately.
- workflow candidates currently include standard blitz and rapid games without a rated-only restriction.
- candidate arrays are newest-first but unbounded by date.

### 3.4 Durable child jobs already exist

- `JobRun`/`JobTask` survives navigation, reload, API restart, and worker restart.
- supported imported-game job kinds are indexing, analysis, combined processing, and tag refresh.
- indexing creates plies/positions and assigns a missing opening.
- analysis requires indexed games, records engine results, refreshes tags, and refreshes tactical detections.
- the Angular job store restores active/recent runs and polls every 1.5 seconds only while active work exists.
- the job panel is a technical execution surface, not a first-run or readiness model.

### 3.5 Existing value arrives at different evidence depths

Import-only facts can power:

- Games list and basic game metadata;
- account performance/rating views;
- basic Home account and recent-game context;
- raw game review when PGN is present.

Indexed facts can power:

- position/move navigation;
- locally assigned missing openings;
- personal opening occurrence and continuation evidence;
- opening analysis;
- poor-results opening struggles;
- broader deterministic opening/profile evidence.

Analysed facts can power:

- accuracy and engine evaluation summaries;
- analysis-derived opening tags;
- repeated-mistake and bad-position opening struggles;
- tactical detections and associated scenario training;
- richer game review;
- analysis-backed Player Chess Profile evidence.

The Player Chess Profile already defines deterministic evidence boundaries:

- fewer than 5 games is insufficient result evidence;
- 5–14 is low, 15–39 medium, and 40+ high;
- analysis evidence is insufficient below 5 analysed games or below 50% coverage;
- stable profile conclusions require at least 10 selected games and at least 5 classified opening games.

### 3.6 Home already contains heuristics

Home currently builds setup and continue actions from account existence, imported-game facets, recent games, courses, and analysis backlog. This is useful established-product behavior, but it is not a durable onboarding lifecycle. The onboarding integration must provide one authoritative server projection and must not add another browser-owned ranking system.

## 4. Recommended persistence boundary

### 4.1 User-level onboarding disposition

Persist a one-to-one user-owned record, conceptually `UserOnboardingState`, whose durable disposition is:

- `PENDING` — first-run guidance has neither completed nor been explicitly skipped;
- `COMPLETED` — the core-readiness completion gate was reached;
- `SKIPPED` — the user explicitly dismissed first-run guidance before core completion.

The record also needs durable timestamps/references sufficient for audit and re-entry:

- `completedAt`;
- `skippedAt`;
- `resetAt`;
- `lastPreparationRunId` or equivalent relation;
- contract/version field.

Do not persist `NEW`, `ACTIVE`, `RETURNING`, or `RESET` as competing mutable statuses:

- `NEW` is a server-derived presentation when disposition is `PENDING` and no first-run preparation exists;
- `ACTIVE` is derived from a non-terminal first-run `DataPreparationRun`;
- `RETURNING` is a presentation mode for completed/skipped users;
- `RESET` is an explicit domain command/event that returns disposition to `PENDING`.

This keeps one durable source for the user decision while avoiding redundant state that can disagree with child work.

### 4.2 Repeatable preparation aggregate

Use a repeatable user-owned `DataPreparationRun` aggregate rather than a one-off `OnboardingRun`.

Required semantics:

- purposes: `ONBOARDING`, `EXPANSION`, and reset/recovery work;
- immutable recipe snapshot and version;
- selected account scope;
- requested date, speed, variant, rated, and analysis policy;
- references to durable import work and imported-game `JobRun` waves;
- stage/milestone timestamps;
- terminal warning/failure summaries;
- one non-terminal run per user enforced by database constraint or transactionally equivalent invariant;
- historical runs remain queryable even after child technical job retention expires.

The physical Prisma shape and child-run reconciliation belong to ONB-003, but the lifecycle contract above is fixed by ONB-001.

### 4.3 Run creation event

Creating or connecting an account does not create a run.

A run is created only when the authenticated user accepts a concrete recipe through the start command. This prevents abandoned account forms or navigation from creating phantom background work.

## 5. User lifecycle definitions

| User-visible state | Deterministic server meaning | Primary presentation |
| --- | --- | --- |
| New | disposition `PENDING`, no non-terminal onboarding run | full start experience |
| Active | non-terminal onboarding run exists | full progress/recovery before core readiness; compact after it |
| Complete | disposition `COMPLETED` | normal Home plus compact preparation/readiness card when work remains |
| Skipped | disposition `SKIPPED` and core completion has not subsequently occurred | normal Home with unobtrusive restart entry |
| Returning | derived presentation for complete/skipped users with no full first-run flow required | normal application navigation |
| Reset | explicit audited transition that sets disposition back to `PENDING`; not a steady state | full start experience after reset |

Rules:

- onboarding is per user, not per account;
- preparation runs are repeatable;
- the first accepted run guides one selected account;
- additional accounts and larger scopes are expansion runs;
- deleting/purging data must not silently infer a reset from row counts; ONB-004 domain operations must explicitly reconcile onboarding disposition;
- skipping guidance does not cancel accepted preparation;
- if skipped preparation later reaches the core completion gate, disposition becomes `COMPLETED`.

## 6. Default preparation recipe

The default recipe is a fixed snapshot created at start time:

| Field | Default |
| --- | --- |
| Account scope | one selected active account |
| Date range | inclusive UTC date-only range from three calendar months before the start date through the start date |
| Speeds | blitz and rapid |
| Variant | standard chess (`null`, `chess`, or `standard` compatibility) |
| Rated policy | include rated and unrated games |
| Ordering | newest games first |
| Indexing | enabled for every eligible imported game |
| Engine analysis | enabled by default for successfully indexed eligible games, but non-blocking for onboarding completion |
| AI review | disabled/not requested |
| Course/repertoire generation | excluded |

Why calendar months rather than rolling 90 days:

- the existing `3M` game-filter preset subtracts three calendar months;
- the Player Chess Profile default does the same in UTC date-only semantics;
- a fixed date-only snapshot is explainable and does not move while a durable run is in progress.

Why rated and unrated:

- the current standard workflow candidate contract already includes both;
- the original product request specified standard blitz and rapid, not rated-only;
- retaining both avoids silently omitting casual games and lets each feature keep its own rated filter/default.

Expansion is explicit and separate from completion:

- older-history presets or custom range;
- bullet games;
- another account;
- analysis catch-up/retry;
- later provider-specific options approved by ONB-002.

## 7. Milestones and completion gates

There is no single global “insights ready” threshold.

### 7.1 First value

`FIRST_GAME_IMPORTED` occurs when the first eligible imported game is durably persisted.

It can unlock Games and account/progress surfaces without waiting for indexing or analysis.

### 7.2 First indexed value

`FIRST_GAME_INDEXED` occurs when the first eligible game has a successful index and opening-assignment result.

It can unlock position/opening navigation. It is not sufficient by itself to claim that every opening/profile insight is reliable.

### 7.3 Core readiness and onboarding completion

Onboarding becomes `COMPLETED` when:

1. the bounded initial import scope is terminal;
2. every eligible imported game in that scope has a terminal indexing outcome;
3. at least one eligible game indexed successfully; and
4. no required import or indexing work remains queued/running.

Index failures may remain as explicit warnings when at least one game succeeded. If all eligible games fail indexing, onboarding remains active and needs attention.

If the bounded import produces no eligible games, do not silently complete. Present a deterministic `NO_RECENT_GAMES` outcome with actions to expand the range, choose another account, or explicitly finish/skip without prepared games.

### 7.4 Preparation completion

A `DataPreparationRun` reaches its own terminal result only when every requested stage is terminal according to ONB-002/003 semantics.

Engine analysis is intentionally not part of the user-level onboarding completion gate. Analysis can continue after Home and the normal product become primary.

## 8. Stage and status contract

User-visible stages:

1. `ACCOUNT` — select or connect one account; foreground prerequisite;
2. `IMPORT` — bounded recent provider import; background after acceptance;
3. `INDEX` — prepare move/position/opening evidence; background and required for core completion;
4. `ANALYSE` — deeper engine/tag/tactical evidence; background and non-blocking for onboarding completion.

Each stage projection uses the same small status vocabulary:

- `NOT_STARTED`;
- `QUEUED`;
- `RUNNING`;
- `PAUSED`;
- `FAILED`;
- `COMPLETE`;
- `CANCELLED`;
- `NOT_APPLICABLE`.

The API may additionally expose an attention code such as:

- `ACCOUNT_REQUIRED`;
- `PROVIDER_AUTH_REQUIRED`;
- `NO_RECENT_GAMES`;
- `IMPORT_RETRY_AVAILABLE`;
- `INDEX_RETRY_AVAILABLE`;
- `ANALYSIS_UNAVAILABLE`;
- `ALL_INDEXING_FAILED`.

Do not make the UI infer these codes from error strings.

## 9. Insight-readiness matrix

Readiness is a server-derived capability projection with states such as `LOCKED`, `PARTIAL`, `READY`, and `CHECKED_EMPTY`.

| Capability | Minimum deterministic evidence | Notes |
| --- | --- | --- |
| Games list | at least one imported eligible game | import-only |
| Account progress/performance | imported games with relevant result/rating fields | feature may show partial/missing metrics |
| Raw game review | imported game with PGN | analysis enhancements remain locked per game |
| Opening analysis/navigation | at least one indexed game | expose indexed count; quality grows with sample |
| Opening struggles: poor results | indexed games meeting that feature’s current filters/minimum | reuse feature-owned threshold; do not duplicate it in onboarding |
| Player Profile preference/result | classified opening evidence | partial below 5 games; low evidence at 5–14; stable conclusions require 10 total and 5 classified |
| Player Profile analysis evidence | at least 5 analysed games and at least 50% analysis coverage for the relevant group | reuse existing profile rule |
| Rich analysed game review | that game has completed current analysis | per-game capability |
| Opening struggles: repeated mistakes/bad positions | analysed ply/evaluation evidence meeting feature thresholds | analysis-run count alone is insufficient |
| Tactical insights | tactical detection processing checked analysed games | distinguish no findings from not processed |
| Scenario training from detections | at least one eligible detection | do not claim readiness merely because analysis ran |
| Repertoire Builder data-informed defaults | sufficient approved profile/opening evidence | builder remains downstream; not an onboarding completion gate |

The readiness response must include evidence counts/coverage so UI wording remains factual.

## 10. Routing and re-entry

Approved route behavior:

- keep `/` public;
- keep login defaulting to `/home` and preserve explicit `returnUrl` behavior;
- add protected `/onboarding` as the resumable full first-run/recovery surface;
- `/home` consumes the server onboarding projection;
- before core readiness, Home provides a prominent Start/Resume action and may host equivalent full treatment, but no global auth guard redirects every protected route;
- after core readiness, Home is the normal dashboard and shows only compact preparation/readiness state while analysis continues;
- skipped users land on normal Home and receive an unobtrusive restart action;
- direct links to Games, Study, Courses, Analysis, Settings, and other protected pages remain usable;
- Settings/Accounts remains the account-management and manual advanced control surface;
- the global job panel remains visible for child imported-game jobs;
- mobile consumes the same future server contract, but native onboarding UI is not in the first implementation slice.

This avoids two failure modes: trapping established users behind a wizard and losing progress when the onboarding page is closed.

## 11. Deterministic actions while preparation continues

The server projection should emit action codes and destinations; Angular should render them, not rank or invent them.

Examples:

- `VIEW_IMPORTED_GAMES` when import-only value exists;
- `VIEW_ACCOUNT_PROGRESS` when account evidence exists;
- `EXPLORE_OPENINGS` when indexed evidence exists;
- `VIEW_PLAYER_PROFILE` with partial/ready evidence label;
- `REVIEW_ANALYSED_GAME` for a concrete completed game when supplied by the server/read model;
- `RETRY_IMPORT`, `RETRY_INDEX`, or `RETRY_ANALYSIS` when allowed;
- `EXPAND_HISTORY`, `ADD_ACCOUNT`, or `INCLUDE_BULLET` after core readiness or no-data outcome;
- `PAUSE_PREPARATION`, `RESUME_PREPARATION`, or `CANCEL_PREPARATION` when valid.

Study, Courses, free Analysis, and other account-independent destinations remain ordinary navigation and do not need to be represented as inferred onboarding recommendations.

## 12. API and Angular contract outline

### 12.1 Shared contracts

Add a dedicated `packages/contracts/src/onboarding` package boundary containing:

- lifecycle/disposition enums;
- recipe schema;
- stage/milestone/count schemas;
- readiness capability schema;
- allowed-action schema;
- status and command response schemas.

### 12.2 Read endpoint

Conceptual route:

```http
GET /api/me/onboarding
```

Response shape should include:

- durable disposition and derived presentation state;
- active/latest preparation summary;
- immutable recipe snapshot;
- stage statuses;
- exact persisted counts;
- milestones;
- readiness capabilities and evidence;
- warnings/attention codes;
- server-allowed actions.

### 12.3 Commands

Conceptual routes:

```http
POST /api/me/onboarding/start
POST /api/me/onboarding/skip
POST /api/data-preparation-runs/:id/pause
POST /api/data-preparation-runs/:id/resume
POST /api/data-preparation-runs/:id/cancel
POST /api/data-preparation-runs/:id/retry
POST /api/data-preparation-runs/:id/expand
```

Exact route grouping may be adjusted by implementation, but commands must remain thin Fastify boundaries over typed application services and must be idempotent/ownership-scoped.

### 12.4 Angular boundary

Recommended feature ownership:

- `apps/web/src/app/features/onboarding/` for page, store, components, and data access;
- HTTP-only API service;
- store owns effects and polling/refresh integration;
- server response owns lifecycle and allowed-action decisions;
- Home consumes the same projection rather than re-deriving lifecycle from accounts/jobs;
- the existing root imported-game job store remains unchanged as the child-job execution source.

## 13. Truthful progress semantics before ONB-007

Allowed now:

- stage status;
- imported games seen/imported/skipped/failed where provider work can report them;
- selected eligible count once the bounded scope is fixed;
- queued/running/completed/failed/cancelled index and analysis counts;
- exact percentages only when a fixed denominator exists;
- first-value/core-ready timestamps;
- last activity and structured failure/attention code;
- current wave number only if ONB-003 persists an actual wave contract.

Not allowed now:

- ETA;
- “almost done” wording;
- throughput promises;
- percentage for an import whose provider denominator is unknown;
- using worker slice size as visible progress;
- claiming that analysis completion guarantees tactical/profile findings.

## 14. Skip, pause, cancel, retry, failure, and reset

### Skip

- changes first-run guidance disposition to `SKIPPED`;
- does not cancel accepted preparation;
- normal navigation becomes primary;
- the user can restart guidance or start preparation later;
- successful core readiness later changes disposition to `COMPLETED`.

### Pause

- stops creation/advancement of future orchestration work;
- already claimed child tasks are allowed to settle under ONB-003 fencing rules;
- completed data remains available;
- resume continues from persisted state without duplicating successful work.

### Cancel

- is separate from skip;
- stops future work and waits for active child work to acknowledge cancellation before terminal success;
- retains already imported/indexed/analysed data;
- a later start creates a new run from remaining candidates rather than reopening mutable historical state.

### Retry

- retries only failed/cancelled eligible work;
- never duplicates successful imported games or completed child tasks;
- preserves the original terminal run for audit/history where applicable.

### Failure

- provider authentication failure exposes re-authentication/retry;
- partial import retains successfully imported games;
- per-game index/analysis failure does not block unrelated games;
- all-indexing-failed blocks core completion;
- analysis-disabled/unavailable does not revoke core completion;
- structured attention codes and exact counts are required.

### Reset

- is an explicit audited domain operation coordinated with ONB-004;
- sets user disposition to `PENDING` and records `resetAt`;
- does not silently delete data;
- destructive reset/purge must preview scope and reconcile active workers before success.

## 15. Migration and backward compatibility

### Existing users

All `AppUser` rows that exist when the onboarding persistence migration is applied should be created as `COMPLETED` with a legacy-adoption reason/timestamp.

Rationale:

- established users must not be retroactively trapped in first-run guidance;
- actual data readiness remains independently visible through the readiness projection;
- users with incomplete preparation can still start an expansion/preparation run from Home or Settings;
- dev/test users can exercise first-run through explicit reset fixtures/commands.

New users created after rollout receive `PENDING` disposition.

### Existing routes and APIs

- preserve current URLs;
- preserve login `returnUrl` behavior;
- existing manual account sync/index/analyse controls remain available during staged rollout;
- no current provider/import/job JSON contract is changed by ONB-001 itself;
- implementation may later deprecate redundant manual controls only through a separate approved compatibility task.

## 16. Security and privacy

- every onboarding/readiness query is scoped by authenticated `userId`;
- account IDs in start/expansion commands must be ownership-validated;
- rejected/non-owned IDs must not reveal cross-user existence;
- recipe snapshots contain account/range/filter metadata, not provider access tokens;
- errors returned to clients use structured safe codes plus bounded messages, not raw provider secrets;
- reset/purge remains server-authorized and audited;
- no onboarding logic belongs in the public landing page or unauthenticated route.

## 17. Performance and operational impact

- readiness counts must use bounded database aggregates, not load the user’s full game corpus into Node;
- the read endpoint may combine a small number of account/run/job/game aggregates but must avoid N+1 per account/game/wave;
- active projection polling should occur only while work is active and should use a slower product-status cadence than per-task engine polling unless evidence justifies otherwise;
- Home should not independently refetch all readiness inputs after the onboarding read model exists;
- no ETA or wave-size promise is approved before ONB-007;
- no new broker, external queue, or generic workflow engine is justified.

## 18. Alternatives considered

### A. Browser-local checklist

Rejected. It cannot survive browser closure, coordinate background work, express partial failures, or support another device.

### B. One `AppUser.onboardingComplete` boolean

Rejected. It cannot represent skip, reset, active preparation, repeated expansion, no-data outcomes, or ongoing analysis after core readiness.

### C. One permanent `OnboardingRun` per user

Rejected. Account additions, older-history expansion, retry after cancellation, and post-purge preparation are repeatable operations.

### D. Make full analysis the completion gate

Rejected. It would delay completion behind the most expensive optional stage and conflict with progressive first value.

### E. Complete after the first indexed game

Rejected. It would mark the bounded recipe complete while import/index work remains unknown or incomplete.

### F. Rated-only preparation

Rejected as the default. It changes existing standard workflow eligibility and was not part of the requested default scope.

### G. Global route guard forces onboarding

Rejected. It breaks direct protected links, established-user behavior, and explicit login return URLs.

### H. Put onboarding narrative into the generic job panel

Rejected. The panel correctly represents technical child jobs; it should not become the owner of provider import, recipe, milestones, and product readiness.

### I. Client-side ranked recommendations during preparation

Rejected. Fixed server-derived capability/action codes are sufficient and avoid inventing another recommendation engine.

## 19. Validation plan

ONB-001 is documentation/research only. No production code or migration was changed.

Required implementation coverage:

### Persistence/migration

- new-user `PENDING` creation;
- existing-user legacy adoption as `COMPLETED`;
- one-active-run database/concurrency invariant;
- job-history retention does not erase onboarding disposition;
- reset transition preserves audit timestamps.

### Lifecycle service

- new/start/active/core-ready/complete;
- skip before start;
- skip while work continues;
- no recent games;
- partial import;
- partial indexing success with warnings;
- all indexing failed;
- analysis disabled/failing after core completion;
- pause/resume/cancel/retry;
- account deletion/purge reconciliation after ONB-004.

### Readiness

- import-only capabilities;
- indexed capabilities;
- profile thresholds at 4/5/10/15/40 games;
- analysis coverage at below/at 5 games and below/at 50%;
- tactical checked-empty versus not processed;
- ownership isolation and bounded aggregate queries.

### Angular

- `/home` new, active, core-ready, complete, skipped, and failed states;
- `/onboarding` cross-session re-entry;
- direct protected routes remain accessible;
- login `returnUrl` is preserved;
- skip and cancel are distinct;
- job panel and preparation card coexist;
- responsive/keyboard/basic screen-reader checks, with final polish coordinated with #133.

### Paper state-machine scenarios completed in this research

The recommended states were checked against:

- leave browser during import;
- worker/API restart;
- provider failure after partial import;
- one failed game among successful indexing;
- all indexing failed;
- analysis unavailable;
- skip while a run is active;
- cancel after partial completion;
- no games in recent range;
- account deletion after completion;
- existing user at rollout;
- expansion after completion.

No scenario requires browser-local authority or full analysis for first value/core completion.

## 20. Decisions changed

`DECISIONS.md` is updated to lock:

- calendar-month date semantics;
- rated-and-unrated default;
- one selected first-run account;
- `DataPreparationRun` as repeatable aggregate;
- separate user disposition;
- core completion independent of analysis;
- feature-specific readiness;
- `/home` plus resumable `/onboarding` behavior;
- skip versus cancel semantics;
- legacy adoption;
- no ETA before ONB-007.

The previous provisional decisions D-020, D-022, D-026, and D-027 are resolved/replaced by the locked decision set.

## 21. Open questions remaining

ONB-001 leaves no owned product-contract question open.

Dependencies intentionally delegated:

- ONB-002: provider request/checkpoint model and exact import progress facts;
- ONB-003: physical Prisma model, stage/run status reconciliation, wave references, pause/cancel mechanics, source/priority;
- ONB-007: measured wave size, throughput budgets, and any future ETA policy;
- ONB-004: destructive reset/purge/account-delete transaction semantics;
- #133: final visual/accessibility/responsive treatment;
- #105 and its tasks: when/how builder consumes profile evidence and materializes courses;
- native mobile onboarding remains a later consumer of the server contract.

## 22. Bounded implementation tasks

### ONB-008 / #193

Persist onboarding disposition and readiness projection.

Bounded to contracts, migration/model, legacy adoption, read service/route, aggregates, and tests. No lifecycle commands, provider worker, orchestration, or Angular.

### ONB-009 / #194

Implement onboarding lifecycle commands.

Bounded to start/skip/pause/resume/cancel/retry/expand command services and integration with approved import/preparation implementations. No Angular and no provider/orchestrator internals owned elsewhere.

### ONB-010 / #195

Build functional onboarding and Home re-entry.

Bounded to Angular route/store/components, Home/Settings integration, server-provided actions, and focused browser validation. No backend lifecycle logic, native mobile, or final product-wide polish.

## 23. Queue impact

- ONB-001 moves to `REVIEW`.
- ONB-002 becomes the next deterministic READY task.
- ONB-003 and ONB-007 consume this report’s fixed recipe/readiness/completion decisions.
- ONB-008 through ONB-010 remain `PROPOSED` until their research and implementation dependencies are integrated.
- Visual Transformation #133 remains blocked on #132 and should consume, not redefine, the functional lifecycle.

## 24. Acceptance criteria assessment

- Every user-visible state has a deterministic server-derived meaning: satisfied.
- Initial value does not require full-history import or full analysis: satisfied.
- Defaults and expansion options are explicit and revisable: satisfied.
- Onboarding can resume across navigation/session/device: satisfied by persisted disposition/run/read model.
- Dependencies on ONB-002, ONB-003, and ONB-007 are identified: satisfied.
- Follow-up implementation tasks are bounded for one-task-per-branch execution: satisfied through ONB-008–ONB-010.

## 25. Validation performed and skipped

Performed:

- direct repository and issue inspection through GitHub Connector;
- branch/main comparison and stale-claim branch reconciliation;
- paper lifecycle/failure/re-entry scenario analysis;
- task/issue allocation for ONB-008–ONB-010;
- canonical decision/open-question/queue/status reconciliation.

Skipped:

- no code build, test, lint, migration, browser, provider, worker, Stockfish, or deployment validation because this task changes documentation only.

Residual risk:

- exact schema/run-status mechanics remain dependent on ONB-002/003;
- throughput and visible wave sizing remain unmeasured until ONB-007;
- final route/layout implementation must be based on the then-current Visual Transformation state.