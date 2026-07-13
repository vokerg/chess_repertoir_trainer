# Native mobile architecture

`apps/mobile` is the supported React Native / Expo client. Its first product scope is a narrow offline-first repertoire trainer using the real Lichess Chessground board.

## Current status

Phase 1 established the supported Expo workspace, the Chessground DOM adapter, and the versioned serializable training reducer.

Phase 2 adds the authenticated downloadable-content boundary:

- Clerk Expo authentication with secure token caching;
- a small bearer-token API client consuming `@chess-trainer/contracts/mobile-sync`;
- an explicit versioned SQLite migration;
- user-scoped manifest, course-revision, chapter, line, move-node, and subline tables;
- atomic `STAGING` → `ACTIVE` course activation;
- retention of the previous active revision when an update fails;
- foreground and reconnect manifest refresh;
- download/update status and local course/chapter/line browsing;
- offline cold-start access for the last authenticated, unlocked local user.

The API transport is:

```text
GET  /api/mobile-sync/manifest
GET  /api/mobile-sync/courses/:courseId
POST /api/mobile-sync/training-attempts
```

Only the first two endpoints are consumed during Phase 2. Attempt persistence and outbox upload remain Phase 3/4 work.

## Storage boundary

SQLite is the source of truth for downloaded mobile content. Every durable row is scoped by the Clerk subject stored as `app_user_id`.

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

A failed transaction leaves the previous active revision browseable. Explicit sign-out locks the local user row without deleting downloaded content.

Bearer tokens are requested from Clerk when an API call starts. Tokens are never stored in SQLite or diagnostics.

## Shared boundaries

- `apps/mobile` owns Expo routes, native lifecycle, authentication orchestration, SQLite repositories, and download orchestration.
- `apps/web` remains an independent Angular client.
- `packages/chess-domain` owns framework-neutral chess and training behavior.
- `packages/contracts` owns versioned wire schemas.
- Browser-only Chessground imports remain in `.dom.tsx` files.

## Deferred work

Phase 2 does not yet persist active training sessions or completed attempts. The following remain later phases:

- durable local training-session transitions and resume;
- immutable attempt/event tables and outbox creation;
- attempt upload, retry, duplicate, and rejection handling;
- background synchronization;
- broader training selection modes.

## Release gates

- configure a native Clerk authorized party accepted by the API's existing `azp` validation;
- standalone iOS cold-offline validation;
- physical Android validation;
- final GPL/licensing acceptance for production distribution.
