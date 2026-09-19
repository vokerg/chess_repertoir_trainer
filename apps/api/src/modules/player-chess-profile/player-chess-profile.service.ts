import type {
  PlayerChessProfileOpeningClassification,
  PlayerChessProfileQuery,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import type {
  LichessGamesPeerResolution,
  LichessGamesSpeedPreset,
} from '@chess-trainer/contracts/opening-explorer';
import type { ImportedGameSummaryQuery } from '../imported-games/imported-games.schemas';
import { PeerRatingBandResolver } from '../opening-explorer/peer-rating-band.service';
import { OPENING_BOOK } from '../../services/opening-book/openingBook.generated';
import type { OpeningBookEntry } from '../../services/opening-book/openingBook.types';
import {
  OPENING_CLASSIFICATION_VERSION,
  OpeningClassificationService,
} from '../../services/opening-book/openingClassificationService';
import {
  PLAYER_CHESS_PROFILE_OPENING_GROUP_LIMIT,
  PlayerChessProfileRepository,
  type PlayerChessProfileOpeningGroupRow,
  type PlayerChessProfileRepositoryInput,
  type PlayerChessProfileRepositoryResult,
} from './player-chess-profile.repository.prisma';
import {
  buildPlayerChessProfileMetrics,
  InvalidPlayerChessProfileRangeError,
  playerChessProfileAnalysisEvidenceStrength,
  playerChessProfileEvidenceStrength,
  playerChessProfileOpeningGroupKey,
  profilePercentage,
  resolvePlayerChessProfileRange,
  roundProfileMetric,
} from './player-chess-profile.metrics';

export {
  InvalidPlayerChessProfileRangeError,
  playerChessProfileAnalysisEvidenceStrength,
  playerChessProfileEvidenceStrength,
  resolvePlayerChessProfileRange,
} from './player-chess-profile.metrics';

type PlayerChessProfileSpeed = 'bullet' | 'blitz' | 'rapid';
const SPEEDS_BY_PRESET: Record<LichessGamesSpeedPreset, readonly PlayerChessProfileSpeed[]> = {
  ALL: ['bullet', 'blitz', 'rapid'],
  BLITZ_AND_SLOWER: ['blitz', 'rapid'],
  BLITZ: ['blitz'],
  BULLET: ['bullet'],
};

interface RepositoryBoundary {
  load(input: PlayerChessProfileRepositoryInput): Promise<PlayerChessProfileRepositoryResult>;
}

interface PeerResolverBoundary {
  resolve(userId: number, speedPreset: LichessGamesSpeedPreset): Promise<LichessGamesPeerResolution>;
}

export type PlayerChessProfileOpeningClassifier = (
  row: PlayerChessProfileOpeningGroupRow,
) => PlayerChessProfileOpeningClassification | null;

interface Dependencies {
  repository?: RepositoryBoundary;
  peerResolver?: PeerResolverBoundary;
  classifyOpening?: PlayerChessProfileOpeningClassifier;
  clock?: () => Date;
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

function openingIdentity(eco: string | null | undefined, name: string | null | undefined): string {
  return `${normalize(eco)}\u0000${normalize(name)}`;
}

const openingEntryByIdentity = new Map<string, OpeningBookEntry>();
const openingEntryByName = new Map<string, OpeningBookEntry>();
for (const entry of OPENING_BOOK) {
  const identity = openingIdentity(entry.eco, entry.name);
  if (!openingEntryByIdentity.has(identity)) openingEntryByIdentity.set(identity, entry);
  const name = normalize(entry.name);
  if (!openingEntryByName.has(name)) openingEntryByName.set(name, entry);
}

function defaultOpeningClassifier(
  row: PlayerChessProfileOpeningGroupRow,
): PlayerChessProfileOpeningClassification | null {
  if (!row.openingName?.trim()) return null;
  const exact = openingEntryByIdentity.get(openingIdentity(row.openingEco, row.openingName));
  const named = openingEntryByName.get(normalize(row.openingName));
  const entry = exact ?? named ?? {
    eco: row.openingEco?.trim() ?? '',
    name: row.openingName.trim(),
    pgn: '',
    uci: '',
    epd: '',
    ply: 0,
  };
  const classification = OpeningClassificationService.classify(entry);
  if (!classification.matchedRuleIds.length) return null;
  const side = row.userColor === 'WHITE' ? classification.white : classification.black;
  return {
    version: classification.version,
    source: exact || named ? 'GENERATED_BOOK' : 'STORED_NAME_ECO',
    side: row.userColor,
    soundness: side.soundness,
    character: [...side.character],
    theoreticalStatus: side.theoreticalStatus,
    theoryBurden: side.theoryBurden,
    roles: [...side.roles],
    confidence: side.confidence,
    matchedRuleIds: [...classification.matchedRuleIds],
  };
}

function uniqueSortedIntegers(values: readonly number[] | undefined): number[] | undefined {
  return values?.length ? [...new Set(values)].sort((left, right) => left - right) : undefined;
}

function repositoryQuery(
  query: PlayerChessProfileQuery,
  fromDate: Date,
  toExclusive: Date,
): ImportedGameSummaryQuery {
  return {
    accountIds: uniqueSortedIntegers(query.accountIds),
    from: fromDate,
    to: new Date(toExclusive.getTime() - 1),
    userColor: [...query.colors],
    rated: query.rated,
    speedCategory: [...SPEEDS_BY_PRESET[query.speedPreset]],
    minUserRating: query.minUserRating,
    maxUserRating: query.maxUserRating,
    minOpponentRating: query.minOpponentRating,
    maxOpponentRating: query.maxOpponentRating,
  };
}

export function createPlayerChessProfileService(dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? PlayerChessProfileRepository;
  const peerResolver = dependencies.peerResolver ?? PeerRatingBandResolver;
  const classifyOpening = dependencies.classifyOpening ?? defaultOpeningClassifier;
  const clock = dependencies.clock ?? (() => new Date());

  return {
    async get(userId: number, query: PlayerChessProfileQuery): Promise<PlayerChessProfileResponse> {
      const now = clock();
      const range = resolvePlayerChessProfileRange(query, now);
      const speeds = [...SPEEDS_BY_PRESET[query.speedPreset]];
      const [data, peerLevel] = await Promise.all([
        repository.load({
          userId,
          query: repositoryQuery(query, range.fromDate, range.toExclusive),
          supportingGamesLimit: query.supportingGamesLimit,
        }),
        peerResolver.resolve(userId, query.speedPreset),
      ]);

      const classifications = new Map<string, PlayerChessProfileOpeningClassification>();
      for (const row of data.openingGroups) {
        const classification = classifyOpening(row);
        if (classification) classifications.set(playerChessProfileOpeningGroupKey(row), classification);
      }
      const metrics = buildPlayerChessProfileMetrics(data.aggregate, data.openingGroups, classifications);
      const profiledOpeningGames = data.openingGroups.reduce((total, row) => total + row.games, 0);

      return {
        generatedAt: now.toISOString(),
        filters: {
          accountIds: uniqueSortedIntegers(query.accountIds),
          range: { from: range.from, to: range.to },
          speedPreset: query.speedPreset,
          speeds,
          colors: [...query.colors],
          rated: query.rated,
          minUserRating: query.minUserRating,
          maxUserRating: query.maxUserRating,
          minOpponentRating: query.minOpponentRating,
          maxOpponentRating: query.maxOpponentRating,
        },
        peerLevel,
        classificationVersion: OPENING_CLASSIFICATION_VERSION,
        coverage: {
          totalGames: data.aggregate.totalGames,
          indexedGames: data.aggregate.indexedGames,
          analysedGames: data.aggregate.analysedGames,
          analysisPercent: profilePercentage(data.aggregate.analysedGames, data.aggregate.totalGames),
          namedOpeningGames: data.aggregate.namedOpeningGames,
          profiledOpeningGames,
          omittedOpeningGames: Math.max(0, data.aggregate.namedOpeningGames - profiledOpeningGames),
          classifiedOpeningGames: metrics.classifiedOpeningGames,
          lowConfidenceOpeningGames: metrics.lowConfidenceOpeningGames,
          unknownDimensionOpeningGames: metrics.unknownDimensionOpeningGames,
          openingGroupLimit: PLAYER_CHESS_PROFILE_OPENING_GROUP_LIMIT,
          openingGroupsTruncated: data.openingGroupsTruncated,
        },
        baseline: metrics.baseline,
        preference: { items: metrics.preference },
        performance: { items: metrics.performance },
        openingGroups: metrics.openingGroups,
        conclusions: metrics.conclusions,
        supportingGames: data.supportingGames.map((game) => ({
          id: game.id,
          provider: game.provider,
          providerUrl: game.providerUrl,
          endedAt: game.endedAt?.toISOString() ?? null,
          speedCategory: game.speedCategory,
          userColor: game.userColor,
          resultForUser: game.resultForUser === 'WIN'
            || game.resultForUser === 'DRAW'
            || game.resultForUser === 'LOSS'
            ? game.resultForUser
            : null,
          openingEco: game.openingEco,
          openingName: game.openingName,
          userRating: game.userRating,
          opponentRating: game.opponentRating,
          analysisStatus: game.analysisStatus,
          accuracy: game.accuracy === null ? null : roundProfileMetric(game.accuracy),
        })),
      };
    },
  };
}

export const PlayerChessProfileService = createPlayerChessProfileService();
