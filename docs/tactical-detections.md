# Tactical Detections

Tactical detections are a persisted report over already analysed imported games. Detection does not run an engine; it reads cached `PositionAnalysis` rows and `ImportedGamePly` rows from games whose `ImportedGame.latestAnalysisStatus` is `COMPLETED`.

## Detection Kinds

All eval math is user-centric:

- White user: `userEvalCp = bestScoreCpWhite`
- Black user: `userEvalCp = -bestScoreCpWhite`
- Mate scores are mapped to the configured `mateAsCp` value.

`MISSED_SHOT` is triggered by the opponent move. The opponent move must improve the user's eval by at least `opponentGiftMinCp`, and the user's immediate reply must give back at least `missedShotDropMinCp`. The reply must also recover close to the pre-blunder state through `recoveryToleranceCp`, so this bucket means the opponent gave the user a shot and the user did not keep it.

`PUNISHED_OPPONENT_BLUNDER` is also triggered by the opponent move. The opponent move must give the same minimum eval gift, and the user's immediate reply must preserve the gained advantage within `recoveryToleranceCp`. This bucket is the complement of missed shots: the opponent blundered and the user found a good enough reply.

`USER_BLUNDER` is triggered by the user's own move. The user eval before the move must drop by at least `userBlunderDropMinCp`. User replies already represented as `MISSED_SHOT` are excluded so the same move does not appear in both lists.

## Persistence

The feature stores three tables:

- `TacticalDetectionRun`: one run record with date range, force flag, thresholds JSON, threshold hash, counts, timestamps, and error state.
- `TacticalDetection`: one persisted detection keyed uniquely by user, imported game, kind, and trigger ply.
- `TacticalDetectionProcessedGame`: one processed marker per user, imported game, and threshold hash, including games with zero detections.

Normal runs skip games already present in `TacticalDetectionProcessedGame` for the current threshold hash. Force runs delete old detections and processed markers for matching games before rescanning.

The threshold hash includes `detectionVersion` from `apps/api/src/modules/lab/tactical-detections/tactical-detection.constants.ts`. Bump this version when detection semantics change and existing processed markers should not suppress a new scan.

## API

Routes live in `apps/api/src/modules/lab/lab.routes.ts`.

- `POST /api/lab/tactical-detections/run`
  - Body: `from?: date`, `to?: date`, `force?: boolean`
  - Defaults to the current calendar month.
  - Scans analysed, indexed imported games in the date range and returns run counts.

- `GET /api/lab/tactical-detections`
  - Query: `from?: date`, `to?: date`, `kind?: MISSED_SHOT | PUNISHED_OPPONENT_BLUNDER | USER_BLUNDER`, `limit?: number`
  - Returns persisted detections joined with imported-game metadata for display.

The scan is SQL-heavy in `tactical-detection.repository.prisma.ts`. `ImportedGamePly.positionId` is the position before that ply; after-move eval comes from the next ply's position, and after-reply eval comes from the second next ply's position.

## Frontend

The Lab experiment lives under `apps/web/src/app/features/lab/experiments/tactical-detections`.

The UI exposes:

- Date range controls, defaulted to the current month.
- Force recheck.
- Kind filter.
- Persisted rows with game link, move number, played move, best move, swing, and eval snapshots.

The table intentionally shows move number rather than raw ply number and omits opening metadata to keep the report focused on tactical moments.

## Scenario Training

`MISSED_SHOT` detections can be used as source material for scenario training. The detection still represents a persisted tactical moment from an analysed imported game: `triggerPlyNumber` is the opponent move that created the opportunity, `userReplyPlyNumber` is the original user reply, and `bestMoveUci` is the engine best move from the challenge position.

Starting a missed-shot scenario creates a `ScenarioTrainingSession` row sourced from the tactical detection. Each submitted move creates a `ScenarioTrainingAttempt` row. These records are separate from the line-training `TrainingSession` and `TrainingAttemptMove` tables.

The trainer shows context from the original imported game. The user can review earlier moves, return to the challenge position, and play any legal move from that position. Browser Stockfish evaluates whether the played move preserved the opportunity compared with the baseline evaluation. These low-depth trainer evaluations are submitted with the attempt, but they must not be written back to the shared `PositionAnalysis` cache.

Scenario training API endpoints live under `apps/api/src/modules/scenario-training`:

- `POST /api/scenario-training/tactical-missed-shot/start`
- `GET /api/scenario-training/:sessionId`
- `POST /api/scenario-training/:sessionId/attempt`
- `POST /api/scenario-training/:sessionId/complete`
- `GET /api/scenario-training/history`
