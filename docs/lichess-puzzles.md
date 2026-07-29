# Lichess puzzles

## Purpose

The application lets a connected player solve Lichess puzzles without leaving the product while preserving Lichess puzzle-rating behavior and maintaining application-owned round and repeat state.

This feature is separate from imported-game scenario training. Scenario training evaluates one candidate move from an analysed user game. Lichess puzzles use a provider-owned, exact, multi-ply solution and have an upstream rating and replay lifecycle.

## Provider boundary

The API owns all Lichess puzzle communication. Angular never receives an OAuth access token or the complete solution.

The provider integration lives under `apps/api/src/modules/lichess-puzzles`:

- `lichess-puzzles.client.ts` performs authenticated batch selection and batch result submission.
- `lichess-puzzle-position.ts` reconstructs the challenge FEN and trigger move from the Lichess game move text and `initialPly`.
- `lichess-puzzle.types.ts` contains provider-facing and normalized internal types. These are not public HTTP contracts.
- `lichess-puzzle-access.service.ts` loads the encrypted user connection, verifies required scopes and decrypts the token server-side.
- `lichess-puzzles.repository.prisma.ts` owns puzzle, round, review-state and synchronization persistence.
- `lichess-puzzles.service.ts` owns the round state machine, exact solution validation, forced replies and immutable upstream-result semantics.
- `lichess-puzzles.routes.ts` exposes authenticated, ownership-scoped HTTP operations.

Provider payloads remain API-internal. Shared HTTP contracts are exported from `@chess-trainer/contracts/lichess-puzzles`.

## Lichess semantics

The required OAuth scopes are:

- `puzzle:read` for authenticated selection and future activity/replay reads.
- `puzzle:write` for submitting results and updating the connected player's Lichess puzzle rating.

`initialPly` is the one-based ply at which the solver moves. The game move text supplied by the batch endpoint ends after the preceding trigger move, so it contains exactly `initialPly - 1` plies. The normalized challenge position is the final FEN after that move.

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

## Angular experience

The authenticated `/puzzles` route lives under Study and uses feature-local page, component, store and data-access boundaries.

The first release supports:

- fresh mixed puzzles;
- relative difficulty from easiest through hardest;
- explicit rated or practice selection;
- deliberate start action, so visiting the page cannot accidentally create a rated attempt;
- shared Chessground interaction;
- server-validated user moves and automatic forced replies;
- continued local solving after a rated failure;
- confirmed Lichess rating difference;
- failed synchronization visibility and retry;
- actionable reconnect guidance for missing or expired puzzle scopes.

Repeat/history views and theme/opening selection are not part of the first UI release.

## Validation

Focused coverage includes:

- provider request/response and error parsing;
- official-fixture and boundary tests for position reconstruction;
- HTTP contract defaults, UCI validation and solution non-disclosure;
- clean solve, first failure, forced reply, one-time rating submission and abandonment semantics;
- Angular store creation, board locking, forced replies and continued play after a rated failure.

Required validation before merge:

```bash
npm run build
npm test
npm run lint
npm run check:architecture
```

The Prisma migration must also be reviewed against `apps/api/prisma/schema.prisma`, and existing connected users must reconnect Lichess after the OAuth scope change.
