# Lichess puzzles

## Purpose

The application should let a connected player solve Lichess puzzles without leaving the product while preserving Lichess puzzle-rating behavior and maintaining an application-owned repeat history.

This feature is separate from imported-game scenario training. Scenario training evaluates one candidate move from an analysed user game. Lichess puzzles use a provider-owned, exact, multi-ply solution and have an upstream rating and replay lifecycle.

## Provider boundary

The API owns all Lichess puzzle communication. Angular must never receive an OAuth access token or the complete solution before a round is finished.

The provider integration lives under `apps/api/src/modules/lichess-puzzles`:

- `lichess-puzzles.client.ts` performs authenticated batch selection and batch result submission.
- `lichess-puzzle-position.ts` reconstructs the challenge FEN and trigger move from the Lichess game move text and `initialPly`.
- `lichess-puzzle.types.ts` contains provider-facing and normalized internal types. These are not public HTTP contracts.

The client accepts an access token from a higher-level application service. Token lookup, scope checks, round persistence, ownership, and HTTP mapping do not belong in the provider client.

## Lichess semantics

The required OAuth scopes are:

- `puzzle:read` for authenticated selection and activity/replay reads.
- `puzzle:write` for submitting results and updating the connected player's Lichess puzzle rating.

`initialPly` is the one-based ply at which the solver moves. The game move text supplied by the batch endpoint ends after the preceding trigger move, so it contains exactly `initialPly - 1` plies. The normalized challenge position is the final FEN after that move.

A first submitted result can affect the Lichess puzzle rating. Later submissions for the same puzzle can update replay/fixed state but must not be treated by this application as a second fresh rated attempt.

## Persistence target

Do not expose a puzzle-solving route until the solution can remain server-side in durable storage.

The persistence slice should add dedicated models rather than extend `ScenarioTrainingSession`:

- `LichessPuzzle`: provider snapshot, normalized start position, trigger move, themes, rating, and server-only solution.
- `LichessPuzzleRound`: one owned visit with source, requested rating mode, first-result outcome, learning completion, upstream synchronization state, and rating difference.
- `LichessPuzzleReviewState`: one user/puzzle aggregate for due repeats and manual bookmarks.

The first wrong move or reveal fixes the round's upstream outcome as a loss. The player may still complete the line for learning. A skip before any move is a local abandonment and is not submitted upstream.

## HTTP target

The intended initial endpoints are:

- `POST /api/lichess-puzzles/rounds`
- `GET /api/lichess-puzzles/rounds/:roundId`
- `POST /api/lichess-puzzles/rounds/:roundId/moves`
- `POST /api/lichess-puzzles/rounds/:roundId/reveal`
- `POST /api/lichess-puzzles/rounds/:roundId/abandon`
- `POST /api/lichess-puzzles/rounds/:roundId/retry-sync`
- `GET /api/lichess-puzzles/history`
- `GET /api/lichess-puzzles/repeats/next`

Shared HTTP schemas belong in `packages/contracts` once the real service outputs and Angular consumer exist. Provider payload types remain API-internal.

## Current implementation status

Implemented on the initial feature branch:

- typed Lichess batch-selection and batch-solve client;
- strict upstream payload validation and normalized provider errors;
- challenge-position reconstruction with the official Lichess API example as a regression test;
- development and Docker OAuth examples requesting `challenge:write puzzle:read puzzle:write`;
- Lichess settings UI showing read-puzzle and submit-result scope readiness.

Not implemented yet:

- Prisma models and migration;
- token-loading application service for puzzles;
- public puzzle-round routes and shared contracts;
- Angular puzzle trainer, history, and repeats.

## Validation

The focused validation target for the provider foundation is:

```bash
npm run build:api
npm run test --workspace=apps/api
npm run build:web
```

The full persistence and HTTP slice must additionally run Prisma migration/generation checks, contract tests, API ownership tests, Angular store tests, `npm run lint`, and `npm run check:architecture`.
