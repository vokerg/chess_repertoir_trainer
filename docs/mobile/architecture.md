# Native mobile architecture

`apps/mobile` is the supported React Native / Expo client. Its first production scope remains deliberately narrow: the real Lichess Chessground experience and framework-neutral local training foundations, without prematurely restoring the former broad mobile product.

## Phase 1 status

Phase 1 is complete in code. The repository now provides:

- Expo SDK 54 and Expo Router;
- the actual `@lichess-org/chessground` package inside an Expo DOM component;
- local Chessground and Cburnett assets;
- drag, tap, orientation, promotion, legal destinations, highlights, arrows, and authoritative snapback;
- a fixture-driven board diagnostics route;
- bounded native-side board-event deduplication;
- a pure, versioned, JSON-serializable training reducer under `chess-domain/training`;
- immutable move-attempt and early-finish events with deterministic replay validation;
- counters and local review derived from those events;
- explicit mobile-safe `chess-domain` subpath exports;
- versioned training and mobile-sync schemas under `@chess-trainer/contracts/training` and `@chess-trainer/contracts/mobile-sync`;
- a real local training route that connects Chessground to the shared reducer with no API request;
- a bounded diagnostics logger and application error boundary;
- architecture checks that prevent cross-client imports, root-domain imports from mobile, AsyncStorage course/session storage, and retired handmade-board patterns.

The `/training-lab` route is a proof of the complete Phase 1 boundary. A legal board move is emitted once, evaluated by the shared reducer, recorded as an immutable event, followed by fixed-path opponent auto-play, and returned to Chessground as an authoritative FEN. Wrong moves keep the same reducer position and increment `positionVersion` so the DOM board snaps back. The route also performs a JSON serialize/parse/replay check to demonstrate restart-safe state semantics before durable storage is introduced.

## Serializable training boundary

The reducer owns training authority and has no React Native, Angular, Fastify, Prisma, browser, or storage dependency.

```text
SerializableTrainingSubline
        ↓
createSerializableTrainingSession
        ↓
applySerializableTrainingMove / finishSerializableTrainingEarly
        ↓
SerializableTrainingSession + immutable events
        ↓
restoreSerializableTrainingSession / deriveSerializableTrainingReview
```

Current parity with server training semantics:

- a wrong move does not advance the position;
- every wrong retry counts as a separate expected-move attempt;
- a later correct retry is recorded separately;
- fixed-path opponent moves auto-play after a correct trained-side move;
- completion passes only when no mistake was recorded;
- early finish records the currently expected move as missed;
- review retains FEN, expected move, played move, annotation, comment, and branch label when supplied by the subline snapshot.

The stored counters are validated against deterministic event replay rather than treated as the only source of truth.

## Boundaries

- `apps/mobile` owns React Native routes, native lifecycle, board hosting, future SQLite repositories, and future synchronization orchestration.
- `apps/web` remains an independent Angular client. Neither client imports from the other.
- `packages/chess-domain` owns framework-neutral chess and training behavior. Mobile imports explicit subpaths such as `chess-domain/training` rather than the broad root export.
- `packages/contracts` owns versioned wire schemas. Mobile UI does not duplicate synchronization DTOs.
- Browser-only Chessground imports stay in mobile `.dom.tsx` files.
- The DOM board emits semantic completed-move events only. Pointer and drag traffic never crosses the native boundary.
- The board owns legal interaction and promotion UI; the reducer owns repertoire correctness, progression, attempts, and completion.

## Board state boundary

Chessground owns visual interaction and board-legal movement. Native application state remains authoritative for acceptance or rejection. After emitting one immutable move event, the board locks until native state supplies an authoritative FEN and increments `positionVersion`.

## Deferred to later rollout phases

Phase 1 intentionally does not provide:

- Clerk authentication;
- API integration;
- SQLite initialization or migrations;
- downloadable course bundles;
- durable session persistence;
- attempt outbox persistence or upload;
- foreground, reconnect, or background synchronization.

Those belong to Phases 2–4. The shared reducer and contract subpaths are the foundations they consume; they are not placeholders for a generic synchronization framework.

## Remaining Phase 0/release gates

The Phase 0 spike remains under `spikes/mobile-chessground` as the feasibility and licensing record until the supported adapter completes:

- standalone iOS release-build cold-offline validation;
- physical Android validation;
- final GPL/licensing acceptance for production distribution.
