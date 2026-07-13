# Native mobile architecture

`apps/mobile` is the supported React Native / Expo client. Its first product scope is a narrow offline-first repertoire trainer using the real Lichess Chessground board.

## Current status

Phase 1 established the supported Expo workspace, the Chessground DOM adapter, and the versioned serializable training reducer.

Phase 2 added the authenticated downloadable-content boundary:

- Clerk Expo authentication with secure token caching;
- a small bearer-token API client consuming `@chess-trainer/contracts/mobile-sync`;
- explicit versioned SQLite migrations;
- user-scoped manifest, course-revision, chapter, line, move-node, and subline tables;
- atomic `STAGING` → `ACTIVE` course activation;
- retention of the previous active revision when an update fails;
- foreground and reconnect manifest refresh;
- download/update status and local course/chapter/line browsing;
- offline cold-start access for the last authenticated, unlocked local user.

Phase 3 adds the offline single-line training MVP:

- local subline selection from the active downloaded revision;
- durable serializable reducer snapshots;
- one immutable SQLite event row per semantic transition;
- persistence before Chessground is unlocked or advanced;
- restart/resume for in-progress sessions;
- local natural and early completion;
- durable local review data;
- completed attempt rows matching the shared mobile-sync contract;
- a durable `PENDING` attempt outbox without upload processing;
- per-line local attempt, resume, and pending-sync indicators.

No board move calls the API.

## API transport

```text
GET  /api/mobile-sync/manifest
GET  /api/mobile-sync/courses/:courseId
POST /api/mobile-sync/training-attempts
```

Phase 2 consumes the first two endpoints. Phase 3 creates payloads for the third endpoint but deliberately does not upload them. Upload processing belongs to Phase 4.

## Storage boundary

SQLite is the source of truth for downloaded mobile content, active local sessions, completed local attempts, and pending outbox payloads. Every durable row is scoped by the Clerk subject stored as `app_user_id`.

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

Explicit sign-out locks the local user row without deleting downloaded content or pending attempts. Bearer tokens are requested from Clerk when an API call starts and are never stored in SQLite or diagnostics.

## Shared boundaries

- `apps/mobile` owns Expo routes, native lifecycle, authentication orchestration, SQLite repositories, local training persistence, and synchronization orchestration.
- `apps/web` remains an independent Angular client.
- `packages/chess-domain` owns framework-neutral chess and training behavior.
- `packages/contracts` owns versioned wire schemas.
- Browser-only Chessground imports remain in `.dom.tsx` files.

## Deferred work

Phase 4 still needs:

- outbox upload processing;
- retry, duplicate, accepted, and rejected state handling;
- reconnect and foreground upload triggers;
- manual retry and synchronization diagnostics;
- server-progress convergence in the mobile UI.

Broader course/chapter selection modes and product polish remain later phases.

## Release gates

- configure a native Clerk authorized party accepted by the API's existing `azp` validation;
- standalone iOS cold-offline validation;
- physical Android validation;
- final GPL/licensing acceptance for production distribution.
