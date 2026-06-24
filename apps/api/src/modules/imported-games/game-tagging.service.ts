import { moveClassificationLabel } from 'chess-domain';
import { GAME_TAG } from './game-tags';
import {
  getGameTagDefinitions,
  getImportedGameForTagging,
  ImportedGameForTagging,
  updateImportedGameTagCodes,
} from './game-tagging.repository.prisma';

const TAG_THRESHOLDS = {
  lowRatedOpponent: 800,
  ratingMismatch: 200,
  shortDecisiveMaxPlies: 30,
  longGrindMinPlies: 100,
  earlyCheckpointPly: 11,
  openingOutcomePly: 21,
  openingPhaseMaxMove: 10,
  midgameMinMove: 11,
  midgameMaxMove: 35,
  endgameMinMove: 36,
  slightEdgeCp: 200,
  openingTroubleCp: 150,
  worsePositionCp: 150,
  comebackWorseCp: 150,
  clearlyBetterCp: 300,
  winningCp: 700,
  decisiveCp: 800,
  equalishCp: 150,
  earlyMistakeCp: 150,
  bigLossCp: 300,
  hugeLossCp: 500,
  opponentBlunderSwingCp: 400,
  practicalDecisiveCp: 400,
  punishMinCp: 300,
  missedKnockoutAfterMaxCp: 200,
  cleanPunishMaxLossCp: 100,
  highAccuracy: 85,
  lowAccuracy: 60,
} as const;

type Side = 'WHITE' | 'BLACK';
type ResultForUser = string | null | undefined;
type TagDefinition = Awaited<ReturnType<typeof getGameTagDefinitions>>[number];

interface AnalysedMoveRecord {
  ply: ImportedGameForTagging['plies'][number];
  moveNumber: number;
  side: Side;
  isUserMove: boolean;
  beforeScoreForUser: number | null;
  afterScoreForUser: number | null;
  beforeBestMoveUci: string | null;
  scoreLossCp: number | null;
  classificationLabel: string | null;
}

function sideForPly(plyNumber: number): Side {
  return plyNumber % 2 === 1 ? 'WHITE' : 'BLACK';
}

function moveNumberFromPly(plyNumber: number): number {
  return Math.ceil(plyNumber / 2);
}

function isUserMove(
  game: Pick<ImportedGameForTagging, 'userColor'>,
  ply: Pick<ImportedGameForTagging['plies'][number], 'plyNumber'>,
) {
  return game.userColor ? sideForPly(ply.plyNumber) === game.userColor : false;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function addTag(tags: Set<number>, code: number) {
  tags.add(code);
}

function isDisplayedGameTag(code: number) {
  const hiddenMetadataTags = new Set<number>([
    GAME_TAG.NO_INCREMENT,
    GAME_TAG.HAS_INCREMENT,
    GAME_TAG.UNKNOWN_TIME_CONTROL,
    GAME_TAG.BULLET_GAME,
    GAME_TAG.BLITZ_GAME,
    GAME_TAG.RAPID_GAME,
    GAME_TAG.CLASSICAL_GAME,
    GAME_TAG.NOT_INDEXED,
    GAME_TAG.INDEXED_ONLY,
    GAME_TAG.ANALYSED,
    GAME_TAG.ANALYSIS_FAILED,
    GAME_TAG.LOW_RATED_OPPONENT,
    GAME_TAG.RATING_MISMATCH_UP,
    GAME_TAG.RATING_MISMATCH_DOWN,
    GAME_TAG.OPENING_FAMILY_KNOWN,
  ]);

  return !hiddenMetadataTags.has(code);
}

function gameResultIsDecisive(resultForUser: ResultForUser) {
  return resultForUser === 'WIN' || resultForUser === 'LOSS';
}

function userRating(game: Pick<ImportedGameForTagging, 'userColor' | 'whiteRating' | 'blackRating'>) {
  if (game.userColor === 'WHITE') return game.whiteRating;
  if (game.userColor === 'BLACK') return game.blackRating;
  return null;
}

function opponentRating(game: Pick<ImportedGameForTagging, 'userColor' | 'whiteRating' | 'blackRating'>) {
  if (game.userColor === 'WHITE') return game.blackRating;
  if (game.userColor === 'BLACK') return game.whiteRating;
  return null;
}

function latestRun(game: Pick<ImportedGameForTagging, 'analysisRuns'>) {
  return game.analysisRuns[0] ?? null;
}

function latestCompletedRun(game: Pick<ImportedGameForTagging, 'analysisRuns'>) {
  return game.analysisRuns.find((run) => run.status === 'COMPLETED') ?? null;
}

function userAccuracy(game: Pick<ImportedGameForTagging, 'analysisRuns' | 'userColor'>) {
  const run = latestCompletedRun(game);
  if (!run) return null;
  if (game.userColor === 'WHITE') return run.whiteAccuracy;
  if (game.userColor === 'BLACK') return run.blackAccuracy;
  return null;
}

function scoreFromAnalysisForUser(
  game: Pick<ImportedGameForTagging, 'userColor'>,
  analysis: {
    bestScoreCpWhite: number | null;
    bestMateWhite: number | null;
  } | null | undefined,
) {
  if (!analysis || !game.userColor) return null;
  if (typeof analysis.bestMateWhite === 'number' && analysis.bestMateWhite !== 0) {
    const mateScoreForWhite = analysis.bestMateWhite > 0 ? 100000 : -100000;
    return game.userColor === 'WHITE' ? mateScoreForWhite : -mateScoreForWhite;
  }
  if (typeof analysis.bestScoreCpWhite !== 'number') return null;
  return game.userColor === 'WHITE' ? analysis.bestScoreCpWhite : -analysis.bestScoreCpWhite;
}

function buildAnalysedMoves(game: ImportedGameForTagging): AnalysedMoveRecord[] {
  return game.plies.map((ply, index) => {
    const beforeAnalysis = ply.position.analysis;
    const afterAnalysis = game.plies[index + 1]?.position.analysis ?? null;

    return {
      ply,
      moveNumber: moveNumberFromPly(ply.plyNumber),
      side: sideForPly(ply.plyNumber),
      isUserMove: isUserMove(game, ply),
      beforeScoreForUser: scoreFromAnalysisForUser(game, beforeAnalysis),
      afterScoreForUser: scoreFromAnalysisForUser(game, afterAnalysis),
      beforeBestMoveUci: beforeAnalysis?.bestMoveUci ?? null,
      scoreLossCp: ply.scoreLossCp ?? null,
      classificationLabel: ply.classificationCode ? moveClassificationLabel(ply.classificationCode) : null,
    };
  });
}

function scoreAtPly(game: ImportedGameForTagging, plyNumber: number) {
  const checkpoint = game.plies.find((ply) => ply.plyNumber === plyNumber);
  return scoreFromAnalysisForUser(game, checkpoint?.position.analysis ?? null);
}

function swingTowardUser(record: AnalysedMoveRecord) {
  if (typeof record.beforeScoreForUser !== 'number' || typeof record.afterScoreForUser !== 'number') return null;
  return record.afterScoreForUser - record.beforeScoreForUser;
}

function swingAgainstUser(record: AnalysedMoveRecord) {
  if (typeof record.beforeScoreForUser !== 'number' || typeof record.afterScoreForUser !== 'number') return null;
  return record.beforeScoreForUser - record.afterScoreForUser;
}

function isOpponentMove(record: AnalysedMoveRecord) {
  return !record.isUserMove;
}

function isUserActualBlunder(record: AnalysedMoveRecord) {
  const classification = record.classificationLabel?.toUpperCase();
  return record.isUserMove && (
    classification === 'BLUNDER' ||
    (record.scoreLossCp ?? 0) >= TAG_THRESHOLDS.hugeLossCp ||
    (swingAgainstUser(record) ?? 0) >= TAG_THRESHOLDS.hugeLossCp
  );
}

function isUserEarlyMistake(record: AnalysedMoveRecord) {
  const classification = record.classificationLabel?.toUpperCase();
  return record.isUserMove &&
    record.moveNumber <= TAG_THRESHOLDS.openingPhaseMaxMove &&
    !isUserActualBlunder(record) &&
    (
      classification === 'MISTAKE' ||
      (record.scoreLossCp ?? 0) >= TAG_THRESHOLDS.earlyMistakeCp
    );
}

function isUserEarlyBlunder(record: AnalysedMoveRecord) {
  const classification = record.classificationLabel?.toUpperCase();
  return record.isUserMove &&
    record.moveNumber <= TAG_THRESHOLDS.openingPhaseMaxMove &&
    (
      classification === 'BLUNDER' ||
      (record.scoreLossCp ?? 0) >= TAG_THRESHOLDS.hugeLossCp ||
      (swingAgainstUser(record) ?? 0) >= TAG_THRESHOLDS.hugeLossCp
    );
}

function hasDecisiveUserOpportunity(record: AnalysedMoveRecord) {
  return (record.beforeScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.decisiveCp;
}

function hasDecisiveOpponentOpportunity(record: AnalysedMoveRecord) {
  return (record.beforeScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.decisiveCp;
}

function isOpponentBlunderForUser(record: AnalysedMoveRecord) {
  if (!isOpponentMove(record)) return false;

  const classification = record.classificationLabel?.toUpperCase();
  const swing = swingTowardUser(record) ?? 0;
  const afterScore = record.afterScoreForUser ?? Number.NEGATIVE_INFINITY;

  if (swing >= TAG_THRESHOLDS.opponentBlunderSwingCp) return true;

  const moveLooksBad = classification === 'BLUNDER' || (record.scoreLossCp ?? 0) >= TAG_THRESHOLDS.bigLossCp;
  return moveLooksBad && (
    swing >= TAG_THRESHOLDS.clearlyBetterCp ||
    afterScore >= TAG_THRESHOLDS.clearlyBetterCp
  );
}

function isPracticalOpponentBlunderToPunish(record: AnalysedMoveRecord) {
  if (!isOpponentMove(record)) return false;

  const classification = record.classificationLabel?.toUpperCase();
  return (
    (swingTowardUser(record) ?? 0) >= TAG_THRESHOLDS.opponentBlunderSwingCp ||
    (record.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.practicalDecisiveCp ||
    classification === 'BLUNDER'
  ) && (record.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.clearlyBetterCp;
}

function lastAvailableAnalysedScore(records: AnalysedMoveRecord[]) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (typeof record.afterScoreForUser === 'number') return record.afterScoreForUser;
    if (typeof record.beforeScoreForUser === 'number') return record.beforeScoreForUser;
  }
  return null;
}

function noLaterLargeUserMistake(records: AnalysedMoveRecord[], startIndex: number) {
  return !records.slice(startIndex + 1).some((record) => record.isUserMove && (record.scoreLossCp ?? 0) >= TAG_THRESHOLDS.bigLossCp);
}

function hasActionableLossTag(tags: Set<number>) {
  return [
    GAME_TAG.EARLY_BLUNDER,
    GAME_TAG.ONE_MOVE_BLUNDER,
    GAME_TAG.MISSED_KNOCKOUT,
    GAME_TAG.MISSED_WIN,
    GAME_TAG.MISSED_DRAW,
    GAME_TAG.LOST_WINNING_POSITION,
    GAME_TAG.LOST_FROM_BETTER_POSITION,
    GAME_TAG.THREW_DRAW,
    GAME_TAG.MIDGAME_TURNAROUND_TO_LOSS,
    GAME_TAG.ENDGAME_THROW,
    GAME_TAG.FAILED_CONVERSION,
    GAME_TAG.SLOW_BLEED_LOSS,
    GAME_TAG.FLAGGED_IN_WINNING_POSITION,
  ].some((tag) => tags.has(tag));
}

function addTerminalTags(game: ImportedGameForTagging, tags: Set<number>) {
  const provider = normalizeText(game.provider);
  const status = normalizeText(game.status);
  const resultForUser = game.resultForUser;
  let hasSpecificDrawTag = false;

  if ((provider === 'lichess' || provider === 'chess_com') && ['outoftime', 'timeout'].includes(status)) {
    if (resultForUser === 'WIN') addTag(tags, GAME_TAG.WON_ON_TIME);
    if (resultForUser === 'LOSS') addTag(tags, GAME_TAG.LOST_ON_TIME);
  }
  if (provider === 'lichess' && status === 'resign') {
    if (resultForUser === 'WIN') addTag(tags, GAME_TAG.WON_BY_RESIGNATION);
    if (resultForUser === 'LOSS') addTag(tags, GAME_TAG.LOST_BY_RESIGNATION);
  }
  if (provider === 'lichess' && status === 'mate') {
    if (resultForUser === 'WIN') addTag(tags, GAME_TAG.WON_BY_CHECKMATE);
    if (resultForUser === 'LOSS') addTag(tags, GAME_TAG.LOST_BY_CHECKMATE);
  }
  if (provider === 'lichess' && status === 'stalemate') {
    addTag(tags, GAME_TAG.DRAW_BY_STALEMATE);
    hasSpecificDrawTag = true;
  }

  if (provider === 'chess_com') {
    if (status.includes('won on time')) {
      if (resultForUser === 'WIN') addTag(tags, GAME_TAG.WON_ON_TIME);
      if (resultForUser === 'LOSS') addTag(tags, GAME_TAG.LOST_ON_TIME);
    }
    if (status.includes('won by resignation')) {
      if (resultForUser === 'WIN') addTag(tags, GAME_TAG.WON_BY_RESIGNATION);
      if (resultForUser === 'LOSS') addTag(tags, GAME_TAG.LOST_BY_RESIGNATION);
    }
    if (status.includes('won by checkmate')) {
      if (resultForUser === 'WIN') addTag(tags, GAME_TAG.WON_BY_CHECKMATE);
      if (resultForUser === 'LOSS') addTag(tags, GAME_TAG.LOST_BY_CHECKMATE);
    }
    if (status.includes('timeout vs insufficient material')) {
      addTag(tags, GAME_TAG.DRAW_TIMEOUT_INSUFFICIENT_MATERIAL);
      hasSpecificDrawTag = true;
    }
    if (status.includes('repetition')) {
      addTag(tags, GAME_TAG.DRAW_BY_REPETITION);
      hasSpecificDrawTag = true;
    }
    if (!status.includes('timeout vs insufficient material') && status.includes('insufficient material')) {
      addTag(tags, GAME_TAG.DRAW_BY_INSUFFICIENT_MATERIAL);
      hasSpecificDrawTag = true;
    }
    if (status.includes('abandoned')) addTag(tags, GAME_TAG.GAME_ABANDONED);
  }

  if (game.resultForUser === 'DRAW') {
    if (status.includes('stalemate')) {
      addTag(tags, GAME_TAG.DRAW_BY_STALEMATE);
      hasSpecificDrawTag = true;
    }
    if (status.includes('repetition')) {
      addTag(tags, GAME_TAG.DRAW_BY_REPETITION);
      hasSpecificDrawTag = true;
    }
    if (status.includes('insufficient material') && !status.includes('timeout vs insufficient material')) {
      addTag(tags, GAME_TAG.DRAW_BY_INSUFFICIENT_MATERIAL);
      hasSpecificDrawTag = true;
    }
    if (!hasSpecificDrawTag) addTag(tags, GAME_TAG.DRAW_OTHER);
  }
}

function addTimeControlTags(game: ImportedGameForTagging, tags: Set<number>) {
  if (game.timeControlInitial == null || game.timeControlIncrement == null) {
    addTag(tags, GAME_TAG.UNKNOWN_TIME_CONTROL);
  }
  if (game.timeControlIncrement === 0) addTag(tags, GAME_TAG.NO_INCREMENT);
  if ((game.timeControlIncrement ?? -1) > 0) addTag(tags, GAME_TAG.HAS_INCREMENT);

  switch (normalizeText(game.speedCategory)) {
    case 'bullet':
      addTag(tags, GAME_TAG.BULLET_GAME);
      break;
    case 'blitz':
      addTag(tags, GAME_TAG.BLITZ_GAME);
      break;
    case 'rapid':
      addTag(tags, GAME_TAG.RAPID_GAME);
      break;
    case 'classical':
      addTag(tags, GAME_TAG.CLASSICAL_GAME);
      break;
    default:
      break;
  }
}

function addIndexAndAnalysisStateTags(game: ImportedGameForTagging, tags: Set<number>) {
  const newestRun = latestRun(game);
  const completedRun = latestCompletedRun(game);

  if (!game.plyIndexedAt && !game.plyIndexError) addTag(tags, GAME_TAG.NOT_INDEXED);
  if (game.plyIndexedAt && !completedRun) addTag(tags, GAME_TAG.INDEXED_ONLY);
  if (completedRun) addTag(tags, GAME_TAG.ANALYSED);
  if (newestRun && newestRun.status !== 'RUNNING' && newestRun.status !== 'COMPLETED') {
    addTag(tags, GAME_TAG.ANALYSIS_FAILED);
  }
}

function addRatingTags(game: ImportedGameForTagging, tags: Set<number>) {
  const ownRating = userRating(game);
  const enemyRating = opponentRating(game);

  if (typeof enemyRating === 'number' && enemyRating < TAG_THRESHOLDS.lowRatedOpponent) {
    addTag(tags, GAME_TAG.LOW_RATED_OPPONENT);
  }
  if (typeof ownRating === 'number' && typeof enemyRating === 'number') {
    if (enemyRating - ownRating >= TAG_THRESHOLDS.ratingMismatch) addTag(tags, GAME_TAG.RATING_MISMATCH_UP);
    if (ownRating - enemyRating >= TAG_THRESHOLDS.ratingMismatch) addTag(tags, GAME_TAG.RATING_MISMATCH_DOWN);
  }
}

function addOpeningAndShapeTags(game: ImportedGameForTagging, tags: Set<number>) {
  if (game.openingEco || game.openingName) addTag(tags, GAME_TAG.OPENING_FAMILY_KNOWN);

  const pliesCount = game.plies.length;
  const decisive = gameResultIsDecisive(game.resultForUser);

  if (decisive && pliesCount <= TAG_THRESHOLDS.shortDecisiveMaxPlies) {
    addTag(tags, GAME_TAG.SHORT_DECISIVE_GAME);
  }
  if (pliesCount >= TAG_THRESHOLDS.longGrindMinPlies) addTag(tags, GAME_TAG.LONG_GRIND);

  if (game.resultForUser === 'WIN' && pliesCount <= TAG_THRESHOLDS.shortDecisiveMaxPlies) {
    addTag(tags, GAME_TAG.QUICK_WIN);
  }
  if (game.resultForUser === 'LOSS' && pliesCount <= TAG_THRESHOLDS.shortDecisiveMaxPlies) {
    addTag(tags, GAME_TAG.QUICK_LOSS);
  }
}

function maxAnalysedScoreForUser(records: AnalysedMoveRecord[], fallback: number | null) {
  return records.reduce<number | null>((max, record) => {
    const candidates = [record.beforeScoreForUser, record.afterScoreForUser].filter((value): value is number => typeof value === 'number');
    if (!candidates.length) return max;
    const localMax = Math.max(...candidates);
    return max === null ? localMax : Math.max(max, localMax);
  }, fallback);
}

function minAnalysedScoreForUser(records: AnalysedMoveRecord[], fallback: number | null) {
  return records.reduce<number | null>((min, record) => {
    const candidates = [record.beforeScoreForUser, record.afterScoreForUser].filter((value): value is number => typeof value === 'number');
    if (!candidates.length) return min;
    const localMin = Math.min(...candidates);
    return min === null ? localMin : Math.min(min, localMin);
  }, fallback);
}

function openingOutcomeScore(records: AnalysedMoveRecord[], game: ImportedGameForTagging) {
  const direct = scoreAtPly(game, TAG_THRESHOLDS.openingOutcomePly);
  if (typeof direct === 'number') return direct;

  let bestAvailable: number | null = null;
  for (const record of records) {
    if (record.moveNumber > TAG_THRESHOLDS.openingPhaseMaxMove) break;
    if (typeof record.beforeScoreForUser === 'number') {
      bestAvailable = record.beforeScoreForUser;
    }
    if (typeof record.afterScoreForUser === 'number') {
      bestAvailable = record.afterScoreForUser;
    }
  }

  return bestAvailable;
}

function scoreTimeline(records: AnalysedMoveRecord[]) {
  return records.flatMap((record, index) => {
    const values: Array<{ score: number; order: number }> = [];
    if (typeof record.beforeScoreForUser === 'number') {
      values.push({ score: record.beforeScoreForUser, order: index * 2 });
    }
    if (typeof record.afterScoreForUser === 'number') {
      values.push({ score: record.afterScoreForUser, order: index * 2 + 1 });
    }
    return values;
  });
}

function addAnalysisTags(game: ImportedGameForTagging, tags: Set<number>) {
  const completedRun = latestCompletedRun(game);
  if (!completedRun) return;

  const records = buildAnalysedMoves(game);
  if (!records.some((record) => typeof record.beforeScoreForUser === 'number' || typeof record.afterScoreForUser === 'number')) {
    return;
  }

  const earlyCheckpointScore = scoreAtPly(game, TAG_THRESHOLDS.earlyCheckpointPly);
  const openingScore = openingOutcomeScore(records, game);
  const enemyRating = opponentRating(game);
  const maxScoreForUser = maxAnalysedScoreForUser(records, earlyCheckpointScore);
  const minScoreForUser = minAnalysedScoreForUser(records, earlyCheckpointScore);
  const userAcc = userAccuracy(game);
  const openingWindow = records.filter((record) => record.moveNumber <= TAG_THRESHOLDS.openingPhaseMaxMove);
  const userEarlyBlunder = openingWindow.some(isUserEarlyBlunder);

  if (typeof enemyRating === 'number' && enemyRating < TAG_THRESHOLDS.lowRatedOpponent) {
    if ((earlyCheckpointScore ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp) {
      addTag(tags, GAME_TAG.LOW_RATED_OPPONENT_EARLY_LOST_POSITION);
    }
    if ((earlyCheckpointScore ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp) {
      addTag(tags, GAME_TAG.LOW_RATED_OPPONENT_EARLY_WINNING_POSITION);
    }
  }

  if (typeof openingScore === 'number') {
    if (
      openingScore <= -TAG_THRESHOLDS.winningCp ||
      (userEarlyBlunder && openingScore <= -TAG_THRESHOLDS.clearlyBetterCp)
    ) {
      addTag(tags, GAME_TAG.OPENING_DISASTER);
    } else if (openingScore <= -TAG_THRESHOLDS.openingTroubleCp) {
      addTag(tags, GAME_TAG.OPENING_TROUBLE);
    } else if (openingScore >= TAG_THRESHOLDS.clearlyBetterCp) {
      addTag(tags, GAME_TAG.OPENING_SUCCESS);
    }
  }

  if (openingWindow.some(isUserEarlyMistake)) addTag(tags, GAME_TAG.EARLY_MISTAKE);
  if (userEarlyBlunder) addTag(tags, GAME_TAG.EARLY_BLUNDER);

  const oneMoveBlunder = records.some((record) => isUserActualBlunder(record));
  if (oneMoveBlunder) addTag(tags, GAME_TAG.ONE_MOVE_BLUNDER);

  // TACTICAL_BLUNDER is reserved until we can distinguish tactical errors from generic large eval losses.

  if (
    records.some((record) => {
      if (!record.isUserMove || !hasDecisiveUserOpportunity(record)) return false;

      const failedToConvert =
        (record.afterScoreForUser ?? Number.POSITIVE_INFINITY) <= TAG_THRESHOLDS.missedKnockoutAfterMaxCp ||
        (record.afterScoreForUser === null && (record.scoreLossCp ?? 0) >= TAG_THRESHOLDS.hugeLossCp);

      if (!failedToConvert) return false;
      if (record.beforeBestMoveUci) return record.ply.moveUci !== record.beforeBestMoveUci;
      return (record.scoreLossCp ?? 0) >= TAG_THRESHOLDS.hugeLossCp;
    })
  ) {
    addTag(tags, GAME_TAG.MISSED_KNOCKOUT);
  }

  if (
    records.some((record) =>
      isOpponentMove(record) &&
      (record.beforeScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.clearlyBetterCp &&
      (
        (record.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= -TAG_THRESHOLDS.equalishCp ||
        (swingTowardUser(record) ?? 0) >= TAG_THRESHOLDS.clearlyBetterCp
      ),
    )
  ) {
    addTag(tags, GAME_TAG.OPPONENT_MISSED_CHANCE);
  }

  if (
    records.some((record) =>
      isOpponentMove(record) &&
      hasDecisiveOpponentOpportunity(record) &&
      (
        (record.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= -TAG_THRESHOLDS.missedKnockoutAfterMaxCp ||
        (swingTowardUser(record) ?? 0) >= TAG_THRESHOLDS.hugeLossCp
      ),
    )
  ) {
    addTag(tags, GAME_TAG.OPPONENT_MISSED_KNOCKOUT);
  }

  if (
    records.some((record) => isOpponentBlunderForUser(record))
  ) {
    addTag(tags, GAME_TAG.OPPONENT_BLUNDERED);
  }

  let foundKnockout = false;
  let punishedOpponentBlunder = false;
  records.forEach((record, index) => {
    if (
      record.isUserMove &&
      (record.beforeScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.practicalDecisiveCp &&
      (record.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.practicalDecisiveCp &&
      (record.scoreLossCp ?? Number.POSITIVE_INFINITY) <= TAG_THRESHOLDS.cleanPunishMaxLossCp
    ) {
      foundKnockout = true;
    }

    if (!isOpponentMove(record)) return;
    const nextRecord = records[index + 1];
    if (!nextRecord?.isUserMove) return;
    if (!isPracticalOpponentBlunderToPunish(record)) return;

    if (
      (nextRecord.beforeScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.punishMinCp &&
      (nextRecord.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.punishMinCp &&
      (nextRecord.scoreLossCp ?? Number.POSITIVE_INFINITY) <= TAG_THRESHOLDS.cleanPunishMaxLossCp
    ) {
      punishedOpponentBlunder = true;
      if ((nextRecord.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.practicalDecisiveCp) {
        foundKnockout = true;
      }
    }
  });

  if (foundKnockout) addTag(tags, GAME_TAG.FOUND_KNOCKOUT);
  if (punishedOpponentBlunder) addTag(tags, GAME_TAG.PUNISHED_OPPONENT_BLUNDER);

  if ((maxScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp && game.resultForUser !== 'WIN') {
    addTag(tags, GAME_TAG.MISSED_WIN);
  }
  if (
    game.resultForUser === 'LOSS' &&
    records.some((record) =>
      record.isUserMove &&
      typeof record.beforeScoreForUser === 'number' &&
      record.beforeScoreForUser >= -TAG_THRESHOLDS.equalishCp &&
      record.beforeScoreForUser <= TAG_THRESHOLDS.equalishCp &&
      (record.afterScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp,
    )
  ) {
    addTag(tags, GAME_TAG.MISSED_DRAW);
  }
  if ((maxScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp && game.resultForUser === 'LOSS') {
    addTag(tags, GAME_TAG.LOST_WINNING_POSITION);
  }
  if ((minScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp && game.resultForUser === 'WIN') {
    addTag(tags, GAME_TAG.WON_LOST_POSITION);
  }
  if ((minScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp && game.resultForUser === 'DRAW') {
    addTag(tags, GAME_TAG.SAVED_LOST_POSITION);
  }
  if (
    game.resultForUser === 'WIN' &&
    (minScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.worsePositionCp &&
    (maxScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.clearlyBetterCp
  ) {
    addTag(tags, GAME_TAG.WON_FROM_WORSE_POSITION);
  }
  if ((maxScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.clearlyBetterCp && game.resultForUser === 'LOSS') {
    addTag(tags, GAME_TAG.LOST_FROM_BETTER_POSITION);
  }
  if (
    game.resultForUser === 'LOSS' &&
    records.some((record) =>
      record.isUserMove &&
      typeof record.beforeScoreForUser === 'number' &&
      record.beforeScoreForUser >= -TAG_THRESHOLDS.equalishCp &&
      record.beforeScoreForUser <= TAG_THRESHOLDS.clearlyBetterCp &&
      (record.afterScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp,
    )
  ) {
    addTag(tags, GAME_TAG.THREW_DRAW);
  }
  if (
    records.some((record) =>
      record.isUserMove &&
      record.moveNumber >= TAG_THRESHOLDS.midgameMinMove &&
      record.moveNumber <= TAG_THRESHOLDS.midgameMaxMove &&
      (swingAgainstUser(record) ?? 0) >= TAG_THRESHOLDS.hugeLossCp &&
      (record.afterScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.clearlyBetterCp,
    )
  ) {
    addTag(tags, GAME_TAG.MIDGAME_TURNAROUND_TO_LOSS);
  }
  if (
    records.some((record) =>
      isOpponentMove(record) &&
      record.moveNumber >= TAG_THRESHOLDS.midgameMinMove &&
      record.moveNumber <= TAG_THRESHOLDS.midgameMaxMove &&
      (swingTowardUser(record) ?? 0) >= TAG_THRESHOLDS.opponentBlunderSwingCp &&
      (record.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.clearlyBetterCp,
    )
  ) {
    addTag(tags, GAME_TAG.MIDGAME_TURNAROUND_TO_WIN);
  }
  if (
    game.resultForUser !== 'WIN' &&
    records.some((record) =>
      record.isUserMove &&
      record.moveNumber >= TAG_THRESHOLDS.endgameMinMove &&
      (record.beforeScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.clearlyBetterCp &&
      (record.afterScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.clearlyBetterCp,
    )
  ) {
    addTag(tags, GAME_TAG.ENDGAME_THROW);
  }
  if (
    (game.resultForUser === 'DRAW' || game.resultForUser === 'WIN') &&
    records.some((record) =>
      record.moveNumber >= TAG_THRESHOLDS.endgameMinMove &&
      (
        (record.beforeScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp ||
        (record.afterScoreForUser ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp
      ),
    )
  ) {
    addTag(tags, GAME_TAG.ENDGAME_SAVE);
  }

  const firstWinningIndex = records.findIndex((record) =>
    (record.beforeScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp ||
    (record.afterScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp,
  );
  if (
    game.resultForUser === 'WIN' &&
    (maxScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp &&
    firstWinningIndex >= 0 &&
    noLaterLargeUserMistake(records, firstWinningIndex)
  ) {
    addTag(tags, GAME_TAG.CLEAN_CONVERSION);
  }
  if ((maxScoreForUser ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp && game.resultForUser !== 'WIN') {
    addTag(tags, GAME_TAG.FAILED_CONVERSION);
  }

  const userLosses = records.filter((record) => record.isUserMove).map((record) => record.scoreLossCp ?? 0);
  if (
    game.resultForUser === 'LOSS' &&
    userLosses.every((loss) => loss < TAG_THRESHOLDS.bigLossCp) &&
    (
      userLosses.filter((loss) => loss >= 100).length >= 3 ||
      userLosses.reduce((sum, loss) => sum + loss, 0) >= 600
    )
  ) {
    addTag(tags, GAME_TAG.SLOW_BLEED_LOSS);
  }

  if (
    game.resultForUser === 'LOSS' &&
    (userAcc ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.highAccuracy &&
    !hasActionableLossTag(tags)
  ) {
    addTag(tags, GAME_TAG.HIGH_ACCURACY_LOSS);
  }
  if (game.resultForUser === 'WIN' && (userAcc ?? Number.POSITIVE_INFINITY) <= TAG_THRESHOLDS.lowAccuracy) {
    addTag(tags, GAME_TAG.LOW_ACCURACY_WIN);
  }

  const majorSwings = records.filter((record) => Math.abs(swingTowardUser(record) ?? 0) >= TAG_THRESHOLDS.hugeLossCp).length;
  if (majorSwings >= 3) {
    addTag(tags, GAME_TAG.CHAOTIC_GAME);
  }

  const timeline = scoreTimeline(records);
  const firstWorsePhase = timeline.find((entry) => entry.score <= -TAG_THRESHOLDS.comebackWorseCp);
  if (
    game.resultForUser === 'WIN' &&
    firstWorsePhase &&
    timeline.some((entry) => entry.order > firstWorsePhase.order && entry.score >= TAG_THRESHOLDS.clearlyBetterCp)
  ) {
    addTag(tags, GAME_TAG.COMEBACK_WIN);
  }
  const firstLostPhase = timeline.find((entry) => entry.score <= -TAG_THRESHOLDS.winningCp);
  if (
    game.resultForUser === 'DRAW' &&
    firstLostPhase &&
    timeline.some((entry) => entry.order > firstLostPhase.order && entry.score >= -TAG_THRESHOLDS.equalishCp)
  ) {
    addTag(tags, GAME_TAG.COMEBACK_DRAW);
  }

  const lastScore = lastAvailableAnalysedScore(records);
  if (tags.has(GAME_TAG.LOST_ON_TIME) && (lastScore ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp) {
    addTag(tags, GAME_TAG.FLAGGED_IN_WINNING_POSITION);
  }
  if (tags.has(GAME_TAG.WON_ON_TIME) && (lastScore ?? Number.POSITIVE_INFINITY) <= -TAG_THRESHOLDS.winningCp) {
    addTag(tags, GAME_TAG.OPPONENT_FLAGGED_IN_WINNING_POSITION);
  }
  if (tags.has(GAME_TAG.WON_ON_TIME) && (lastScore ?? Number.NEGATIVE_INFINITY) >= TAG_THRESHOLDS.winningCp) {
    addTag(tags, GAME_TAG.OPPONENT_FLAGGED_IN_LOST_POSITION);
  }

  // Reserved for future use once ImportedGamePly stores per-move clocks:
  // TIME_SCRAMBLE, MUTUAL_TIME_SCRAMBLE, and PLAYED_TOO_FAST.
}

function resolveTags(tagCodes: number[], definitions: TagDefinition[]) {
  const names = new Map(definitions.map((definition) => [definition.code, definition.name]));
  return tagCodes
    .map((code) => {
      const name = names.get(code);
      return name ? { code, name } : null;
    })
    .filter((tag): tag is { code: number; name: string } => tag !== null);
}

function calculateTagCodes(game: ImportedGameForTagging) {
  const tags = new Set<number>();
  addTerminalTags(game, tags);
  addTimeControlTags(game, tags);
  addIndexAndAnalysisStateTags(game, tags);
  addRatingTags(game, tags);
  addOpeningAndShapeTags(game, tags);
  addAnalysisTags(game, tags);
  return Array.from(tags)
    .filter(isDisplayedGameTag)
    .sort((left, right) => left - right);
}

export const GameTaggingService = {
  refreshOne: async (userId: number, gameId: number) => {
    const [definitions, game] = await Promise.all([
      getGameTagDefinitions(),
      getImportedGameForTagging(userId, gameId),
    ]);
    if (!game) throw new Error('Imported game not found');

    const tagCodes = calculateTagCodes(game);
    await updateImportedGameTagCodes(game.id, tagCodes);

    return {
      importedGameId: game.id,
      tagCodes,
      tags: resolveTags(tagCodes, definitions),
    };
  },

  definitions: async () => {
    const items = await getGameTagDefinitions();
    return { items };
  },
};
