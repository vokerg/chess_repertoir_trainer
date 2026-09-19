# Native mobile architecture

`apps/mobile` is the supported React Native / Expo client. Its current product scope is an offline-first repertoire trainer using the real Lichess Chessground board.

For setup and validation commands, see [Mobile development](development.md).

## Current status

Phase 1 established the supported Expo workspace, the Chessground DOM adapter, and the versioned serializable training reducer.

Phase 2 added the authenticated downloadable-content boundary:

- Clerk Expo authentication with secure token caching;
- a small bearer-token API client consuming `@chess-trainer/contracts/mobile-sync`;
- explicit versioned SQLite migrations;
- user-scoped manifest, course-revision, chapter, line, move-node, and subline tables;
- atomic `STAGING` to `ACTIVE` course activation;
- retention of the previous active revision when an update fails;
- foreground and reconnect manifest refresh;
- download/update status and local course/chapter/line browsing;
- offline cold-start access for the last authenticated, unlocked local user.

Phase 3 added offline single-line training:

- local least-trained subline selection from the active downloaded revision;
- durable serializable reducer snapshots;
- one immutable SQLite event row per semantic transition;
- persistence before Chessground is unlocked or advanced;
- restart/resume for in-progress sessions;
- local natural and early completion;
- durable local review data;
- completed attempt rows matching the shared mobile-sync contract;
- a durable `PENDING` attempt outbox;
- per-line local attempt, resume, and pending-sync indicators.

Phase 4 processes the durable attempt outbox:

- one persistent installation/device id per SQLite database;
- batches of at most 100 attempts sent to `POST /api/mobile-sync/training-attempts`;
- `PENDING` to `SENDING` claims inside an exclusive SQLite transaction;
- crash recovery by returning interrupted `SENDING` rows to `PENDING`;
- `ACCEPTED` and `DUPLICATE` responses converged to local `ACCEPTED` state;
- stable server rejections converged to local `REJECTED` state with diagnostics;
- transient failures returned to `PENDING` with bounded exponential retry timing;
- automatic synchronization on authentication, reconnect, foreground, and attempt completion;
- manual forced retry plus visible queued, accepted, rejected, and last-successful-sync status.

Phase 5A added offline course and chapter marathons:

- durable run rows scoped to a downloaded course revision;
- `ALL`, `WEAK_SUBLINES`, `UNTRAINED_SUBLINES`, and `MIXED_WEAK_UNTRAINED` modes;
- the same latest-five attempt window, weakest-30-percent rule, and recent-subline avoidance policy as the server flow;
- persisted current session, completed count, recent sublines, and served-untrained identities;
- exact current-line resume after app restart;
- continuous next-line flow, restart, early finish, and local review;
- actual marathon training mode recorded on synchronized attempts;
- course- and chapter-level marathon entry points from the downloaded course screen.

No board move calls the API. Completed attempts are uploaded only after their local transaction has committed.

## API transport

```text
GET  /api/mobile-sync/manifest
GET  /api/mobile-sync/courses/:courseId
POST /api/mobile-sync/training-attempts
```

The first two endpoints distribute owned course content. The third endpoint receives replayable, idempotent completed attempts in batches.

## Storage boundary

SQLite is the source of truth for downloaded mobile content, active local sessions, completed local attempts, marathon runs, and synchronization state. Every user-owned durable row is scoped by the Clerk subject stored as `app_user_id`.

Course updates never replace active content in place:

```text
validate bundle references
        ↓
insert complete STAGING revision in one exclusive transaction
        ↓
retire previous ACTIVE revision
        ↓
activate new revision and update downloaded_course pointer
        ↓
commit
```

A failed transaction leaves the previous active revision browseable. Retired revisions remain available to resume sessions that started before a content update.

Training transitions use the same durability rule:

```text
Chessground emits one semantic move
        ↓
shared reducer returns the next serializable session
        ↓
SQLite transaction updates session + appends immutable event
        ↓
if complete, create local attempt + PENDING outbox row
        ↓
commit
        ↓
unlock or advance Chessground with authoritative FEN
```

Attempt synchronization is independently retryable:

```text
claim eligible PENDING rows as SENDING
        ↓
POST one batch with persistent deviceId
        ↓
ACCEPTED / DUPLICATE → ACCEPTED
REJECTED             → REJECTED + diagnostic
transport failure    → PENDING + nextAttemptAt
```

A lost response is safe: retrying the same `clientAttemptId` produces a server `DUPLICATE` result and the local row converges to `ACCEPTED`.

Explicit sign-out locks the local user row without deleting downloaded content or pending attempts. Bearer tokens are requested from Clerk when an API call starts and are never stored in SQLite or diagnostics.

## Shared boundaries

- `apps/mobile` owns Expo routes, native lifecycle, authentication orchestration, SQLite repositories, local training persistence, offline marathon persistence, and synchronization orchestration.
- `apps/web` remains an independent Angular client.
- `packages/chess-domain` owns framework-neutral chess and training behavior.
- `packages/contracts` owns versioned wire schemas.
- Browser-only Chessground imports remain in `.dom.tsx` files.

## Next phase

The next mobile slice is selected-scope marathon parity:

- selected-line marathons;
- selected-subline marathons;
- entry points matching the web Study selection workflow;
- continued reuse of the durable Phase 5A run and Phase 4 outbox models.

Do not describe these selected-scope flows as current until their routes, local candidate persistence, and UI entry points exist.

## Release gates

- exercise offline completion followed by reconnect upload;
- exercise lost-response/duplicate recovery and stable rejection handling;
- exercise every course/chapter marathon mode, app-kill resume, and continuous next-line flow;
- run native iOS and Android exports/installations;
- standalone iOS cold-offline validation;
- physical Android validation;
- final GPL/licensing acceptance for production Chessground distribution.
