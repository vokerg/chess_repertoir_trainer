# User Activity Feed and Daily Momentum

Last updated: 2026-08-05

Program tracker: [#245 — User Activity Feed and Daily Momentum sub-project](https://github.com/vokerg/chess_repertoir_trainer/issues/245)

This is the canonical planning document for a small cross-cutting foundation that records measurable user activity, exposes a reusable daily feed, and powers a first “Today” checklist on the signed-in Home page.

The sub-project deliberately uses one document and four implementation issues. It does not adopt the full process and document surface used by the larger Onboarding, Visual Transformation, or Repertoire Builder programs.

## Outcome

The application should be able to answer these questions from one authenticated server contract:

- What did this user do today?
- What did they do on previous days?
- How many repertoire lines, puzzles, tactical scenarios, and game analyses did they complete?
- Did they play games on a given day, based on imported provider games rather than the import action?
- Which small daily goals are complete and what remains?

The first visible consumer is a compact `/home` widget. The same activity data may later support streaks, points, badges, reminders, recommendations, or other gamification, but those mechanisms are not part of this sub-project.

## Repository evidence

The plan is based on the current `main` implementation:

- `apps/api/prisma/schema.prisma` already relates imported games, training sessions, puzzle rounds, tactical sessions, and analysis runs to `AppUser`, but has no shared activity model or user time zone.
- `apps/api/src/routes/index.ts` is composition-only and registers feature route modules.
- `docs/api-conventions.md` requires typed contracts, explicit Fastify schemas/OpenAPI metadata, thin handlers, application services, and Prisma repositories.
- `apps/api/src/services/trainingService.ts` centralizes web training finalization.
- `apps/api/src/modules/mobile-sync/mobile-sync.repository.prisma.ts` persists completed offline training attempts transactionally and idempotently by `clientAttemptId`.
- `apps/api/src/modules/lichess-puzzles/lichess-puzzles.service.ts` owns the transition of a puzzle round to `COMPLETED`.
- `apps/api/src/modules/scenario-training/scenario-training.service.ts` owns tactical-scenario completion.
- `apps/api/src/modules/analysis/` owns client and worker game-analysis lifecycle and the materialized latest-analysis snapshot.
- `apps/api/src/services/lichessImportService.ts` and `chessComImportService.ts` use overlap windows and skip already imported provider game IDs, so played-game activity must be reconciled rather than blindly incremented by a sync result.
- `apps/web/src/app/features/home/home-dashboard.store.ts` already loads independent typed sources with signals and partial-failure handling.
- `apps/web/src/app/features/home/home-page.component.html` currently presents Continue, Recommended next, Workspaces, and Recent progress; the Today widget fits after Continue without changing the dominant action hierarchy.

## Stable product decisions

### Server-owned truth

Activity is recorded at authoritative server-side state transitions. Angular and mobile clients do not submit separate “success” events after a workflow completes.

This prevents double counting when a response is retried, a mobile outbox item is replayed, a puzzle result is synchronized upstream, or a background analysis worker retries.

### Explicit activity vocabulary

The initial types are finite and versioned in shared contracts:

| Activity type | Meaning | Aggregation |
| --- | --- | --- |
| `GAMES_PLAYED` | Imported games actually completed on that calendar day | Absolute reconciliation |
| `REPERTOIRE_LINES_TRAINED` | Completed web or mobile repertoire training sessions | Increment on first terminal completion |
| `LICHESS_PUZZLES_COMPLETED` | Lichess puzzle rounds first completed in the app | Increment on first completion |
| `TACTICAL_SCENARIOS_COMPLETED` | Tactical scenario sessions completed after at least one attempt | Increment on first completion |
| `GAME_ANALYSES_COMPLETED` | Imported-game analysis runs first reaching `COMPLETED` | Increment on first completion |

New types require a real authoritative producer, occurrence timestamp, aggregation rule, and duplicate-write rule. Arbitrary client event names are not accepted.

### Daily aggregate, not analytics event stream

The target model is one row per user, activity type, and user calendar day. It stores:

- date-only activity day;
- count;
- first and last occurrence timestamps;
- optional bounded metadata needed for display/provenance;
- normal created/updated timestamps.

A unique `(userId, activityDate, type)` key prevents duplicate daily rows.

The activity service exposes two write modes:

- **increment** for first-time authoritative state transitions;
- **set/reconcile** for facts derived from source data, initially imported games.

A generic append-only analytics pipeline, event bus, queue, or third-party tracker is not required.

### Calendar-day contract

Daily goals must not depend on the API host’s locale. Add an effective IANA time zone to `AppUser`, defaulting safely to `UTC` until a valid browser zone is stored.

The server derives activity dates from occurrence timestamps using that persisted zone and returns the effective zone with activity responses. Invalid IANA values are rejected.

A time-zone change requires an explicit rebuild path for played-game aggregates because they are derived from historical `ImportedGame.endedAt` values. Mixed silent history is not acceptable.

### Static initial goals

The first goal definitions live in versioned server code rather than configurable database rules:

| Goal | Target |
| --- | ---: |
| Play games | 1 |
| Train repertoire lines | 5 |
| Complete Lichess puzzles | 3 |
| Complete a tactical scenario | 1 |
| Complete a game analysis | 1 |

The API returns `current`, `target`, and `completed`. The Home UI does not recreate goal logic.

These defaults can be revised after real usage without introducing a generic rules engine.

## Target backend slice

Use the repository’s normal vertical feature shape:

```text
apps/api/src/modules/activity-feed/
  activity-feed.routes.ts
  activity-feed.service.ts
  activity-feed.repository.prisma.ts
  activity-feed.mappers.ts
  activity-feed.errors.ts
  activity-feed.types.ts
```

Wire schemas and DTOs belong in `packages/contracts`. Register only the route module in `apps/api/src/routes/index.ts`.

The authenticated contract should provide the equivalent of:

- `GET /me/activity?from=YYYY-MM-DD&to=YYYY-MM-DD` — bounded history;
- `GET /me/activity/today` — today’s aggregates and goal progress;
- `PUT /me/activity/preferences` — validate and update the effective time zone.

Exact URL naming may be adjusted to the closest verified `/me/*` convention during ACT-001, but the feature remains one coherent API module.

## Producer integration rules

### Repertoire training

`apps/api/src/services/trainingService.ts` records activity only when a session first moves from `IN_PROGRESS` to a completed pass/fail state. `ABANDONED` does not count.

`apps/api/src/modules/mobile-sync/mobile-sync.repository.prisma.ts` records the same activity in the transaction that creates a completed offline attempt. The activity occurrence is the client session’s verified `completedAt`, not `receivedAt`.

### Lichess puzzles

`apps/api/src/modules/lichess-puzzles/lichess-puzzles.service.ts` records activity only when a round first becomes `COMPLETED`. Abandonment and upstream result-sync retries do not count.

### Tactical scenarios

The scenario completion path records one activity only when the owned session first completes and contains at least one attempt. Repeating the completion request does not count again.

### Game analysis

Use the closest shared analysis-run lifecycle transition so both client-summary and worker/server analysis paths are covered. Failed or cancelled runs and read requests do not count.

Activity records factual completed work. Future gamification may decide how much weight to give batch-generated counts; this foundation does not add points.

### Imported games

After a successful Lichess or Chess.com sync, reconcile each affected user calendar day to the absolute count of distinct `ImportedGame` rows with usable `endedAt` values.

Do not increment by `gamesImported`: both provider services intentionally use overlap windows and skip existing game IDs. Reconciliation must include existing/skipped games in the affected range so repeated syncs repair rather than inflate the activity ledger.

Provide a bounded, idempotent backfill command for existing users. No permanent background worker is required.

## Home experience

Extend the existing Home feature rather than creating a second dashboard architecture.

The section order becomes:

1. greeting/account summary;
2. Continue;
3. Today activity;
4. Recommended next;
5. Workspaces and Recent progress.

The Today widget renders read-only semantic checkbox/progress rows. Each row shows its current and target count and becomes checked only from the server response. Include restrained overall completion and a positive all-done state.

Activity loading is independent. Failure produces a local unavailable state and must not make the rest of Home fatal. Use existing standalone, OnPush, signal, typed data-access, partial-failure, responsive, accessibility, and design-token conventions.

## Issue queue

| Task | Issue | State | Depends on |
| --- | --- | --- | --- |
| ACT-000 Program foundation | [#245](https://github.com/vokerg/chess_repertoir_trainer/issues/245) | IN_PROGRESS | — |
| ACT-001 Activity ledger and daily-goal API | [#246](https://github.com/vokerg/chess_repertoir_trainer/issues/246) | COMPLETE | — |
| ACT-002 In-app activity producers | [#247](https://github.com/vokerg/chess_repertoir_trainer/issues/247) | READY | ACT-001 |
| ACT-003 Imported played-game reconciliation | [#248](https://github.com/vokerg/chess_repertoir_trainer/issues/248) | READY | ACT-001 |
| ACT-004 Home Today checklist | [#249](https://github.com/vokerg/chess_repertoir_trainer/issues/249) | PROPOSED | ACT-001, ACT-002, ACT-003 |

ACT-002 and ACT-003 can proceed in parallel after ACT-001. ACT-004 follows once the initial data is trustworthy.

Recommended task branches:

```text
act-001/issue-246-activity-ledger-api
act-002/issue-247-in-app-producers
act-003/issue-248-played-game-reconciliation
act-004/issue-249-home-today-widget
```

## Validation expectations

Each implementation issue runs the narrowest focused checks plus the normal affected workspace build/test. The complete slice must ultimately cover:

- migration and unique-key behavior;
- time-zone validation and day-boundary cases;
- increment versus absolute reconciliation;
- duplicate completion and retry behavior;
- web/mobile training parity;
- Lichess and Chess.com overlap imports;
- activity API/OpenAPI contracts;
- Home zero, partial, complete, loading, and failure states;
- responsive and keyboard/accessibility review.

## Explicit exclusions

This sub-project does not include:

- points, XP, levels, badges, streaks, rewards, or leaderboards;
- reminders, push/email notifications, or scheduled jobs;
- editable personal goals or a generic rule builder;
- social/activity sharing;
- arbitrary product analytics events;
- a full historical feed page;
- a new global Angular state library;
- an event bus, message broker, or analytics vendor;
- changing existing workflow outcomes merely to create activity.

## Completion boundary

The foundation is complete when:

- ACT-001 through ACT-004 are accepted;
- all initial activities are recorded exactly once or reconciled absolutely;
- played-game history is backfillable and repeatable;
- the API is the only goal-progress source;
- `/home` presents today’s progress without weakening its existing Continue hierarchy;
- residual gamification ideas are left as future product decisions rather than hidden abstractions in this implementation.