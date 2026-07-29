# Lichess puzzles

## Purpose

The application lets a connected player solve Lichess puzzles without leaving the product while preserving Lichess puzzle-rating behavior and maintaining application-owned round and repeat state.

This feature is separate from imported-game scenario training. Scenario training evaluates one candidate move from an analysed user game. Lichess puzzles use a provider-owned, exact, multi-ply solution and have an upstream rating and replay lifecycle.

## API ownership

The API owns all Lichess puzzle communication and the complete solution. Angular never receives an OAuth access token or solution moves.

The feature lives under `apps/api/src/modules/lichess-puzzles` with explicit boundaries:

- `lichess-puzzles.client.ts` owns Lichess HTTP calls, provider payload validation and normalization. Batch selection remains the primary request; when batch move text cannot reconstruct a legal position, the client fetches the selected puzzle by id and uses its authoritative `fen` and `lastMove`.
- `lichess-puzzle-position.ts` reconstructs the challenge position from valid Lichess game move text and `initialPly`.
- `lichess-puzzle.types.ts` contains provider-facing and normalized internal types. These are not public HTTP contracts.
- `lichess-puzzle-access.repository.prisma.ts` owns the narrow Lichess-connection projection needed for puzzle access.
- `lichess-puzzle-access.service.ts` verifies connection state and scopes, checks expiry and decrypts the token server-side. It has no Prisma dependency.
- `lichess-puzzle-round.logic.ts` owns pure persisted-attempt parsing, legal UCI application and current-position last-move derivation. It has no Fastify or Prisma dependency.
- `lichess-puzzles.repository.prisma.ts` owns puzzle, round, review-state and synchronization persistence.
- `lichess-puzzles.mapper.ts` maps and validates persisted rows into the public round DTO. Prisma rows never cross the HTTP boundary directly.
- `lichess-puzzles.errors.ts` maps expected access, provider, concurrency and round-logic failures to stable feature errors. Unexpected exceptions remain available to centralized Fastify logging and `500` handling.
- `lichess-puzzles.service.ts` owns application orchestration: round creation, exact-answer progression, forced replies, abandonment and retryable provider synchronization.
- `lichess-puzzles.routes.ts` owns authentication, validated transport input, documented response selection and expected-error serialization.

Provider payloads remain API-internal. Shared HTTP contracts are exported from `@chess-trainer/contracts/lichess-puzzles`.

## Lichess semantics

The required OAuth scopes are:

- `puzzle:read` for authenticated selection and future activity/replay reads.
- `puzzle:write` for submitting results and updating the connected player's Lichess puzzle rating.

The API always includes both required puzzle scopes in new Lichess authorization requests, even when `LICHESS_OAUTH_SCOPES` is empty or omits them. That environment variable may add optional scopes such as `challenge:write`; duplicate scopes are removed. Existing connections created without both puzzle scopes must reconnect.

`initialPly` is the one-based ply at which the solver moves. When the batch move text is valid, it contains exactly `initialPly - 1` plies and the normalized challenge position is the final FEN after the trigger move. The explicit puzzle `fen` and `lastMove` response is the fallback source of truth when provider move text is not reconstructable.

A first submitted result can affect the Lichess puzzle rating. Later submissions for the same puzzle can update replay/fixed state, but the application persists one immutable upstream outcome for each fresh round and never recalculates it during retry.

## Persistence

Dedicated models keep provider puzzles independent from imported-game scenarios:

- `LichessPuzzle`: provider snapshot, normalized start position, trigger move, themes, rating and server-only solution.
- `LichessPuzzleRound`: one owned visit with source, requested rating mode, progress, first-result outcome, learning completion, upstream synchronization state and rating difference.
- `LichessPuzzleReviewState`: one user/puzzle aggregate for due repeats and future manual bookmarks.

The first wrong move fixes a rated round's upstream outcome as a loss and schedules the puzzle for review on the next day. The player can continue from the original challenge position and complete the exact line for learning. An untouched abandonment remains local and is not submitted to Lichess. Abandoning after a wrong move preserves the already-recorded loss.

Round updates use ownership predicates and optimistic state/version predicates. Synchronization uses an atomic `PENDING` or `FAILED` to `SYNCING` claim before calling Lichess, then records `SYNCED` or `FAILED`.

## HTTP API

Implemented endpoints:

- `POST /api/lichess-puzzles/rounds`
- `GET /api/lichess-puzzles/rounds/:roundId`
- `POST /api/lichess-puzzles/rounds/:roundId/moves`
- `POST /api/lichess-puzzles/rounds/:roundId/abandon`
- `POST /api/lichess-puzzles/rounds/:roundId/retry-sync`

The public puzzle DTO includes the normalized board position, trigger move, orientation, rating, themes and solution length. It does not include solution moves.

Reveal, history, repeat selection and Lichess replay endpoints remain deferred until their consuming workflows are implemented.

## Angular ownership

The authenticated `/puzzles` route lives under Study and follows the feature-local split:

- `pages` reads route state, composes shared UI and delegates commands.
- `state` owns mutable signals, async workflows, stale-load protection, notices and errors.
- `data-access` contains typed HTTP calls only.
- `helpers` maps wire DTOs into a trainer-specific view model.
- `components` receives that view model and emits typed user intents. It does not import HTTP DTOs, call the router or perform API work.

The page uses `app-page-header`, `app-panel`, the shared `ChessgroundBoardComponent`, production `--ui-*` tokens and shared responsive breakpoint values. Round URLs retain `roundId` so persisted rounds survive reloads.

The first release supports:

- fresh mixed puzzles;
- relative difficulty from easiest through hardest;
- explicit rated or practice selection;
- deliberate start action, so visiting the page cannot accidentally create a rated attempt;
- shared Chessground interaction;
- automatic trigger-move animation when a new puzzle appears, with shared board navigation controls and Left/Right Arrow review that do not submit a solution move;
- persistent danger feedback after an incorrect move, matching the course-drill feedback language;
- server-validated user moves and automatic forced replies;
- continued local solving after a rated failure;
- confirmed Lichess rating difference;
- failed synchronization visibility and retry;
- actionable reconnect guidance for missing or expired puzzle scopes.

Repeat/history views and theme/opening selection are not part of the first UI release.

## Validation

Focused coverage includes:

- provider request/response, position fallback and error parsing;
- position reconstruction boundaries;
- access-scope and expiry behavior without Prisma infrastructure;
- pure round-move and persisted-attempt behavior;
- HTTP contract defaults, UCI validation and solution non-disclosure;
- clean solve, first failure, forced reply, one-time rating submission and abandonment semantics;
- Angular store workflows and DTO-to-view-model mapping.

Required validation before merge:

```bash
npm run build
npm test
npm run lint
npm run check:architecture
```

The Prisma migration must also be reviewed against `apps/api/prisma/schema.prisma`, and existing connected users must reconnect Lichess after the OAuth scope change.
