import { Chess } from 'chess.js';
import {
  normalizeFenForPosition,
  rankCandidateEvidence,
  type CandidateRankingInput,
  type CandidateRankingReasonCode,
  type CandidateRankingWarningCode,
  type StoredEngineLine,
} from 'chess-domain';
import {
  CANDIDATE_DECISION_CONTRACT_VERSION,
  CANDIDATE_RANKING_POLICY_VERSION,
  candidateDecisionResponseSchema,
  type CandidateCorpusEvidence,
  type CandidateCourseEvidence,
  type CandidateDecisionCandidate,
  type CandidateDecisionRequest,
  type CandidateDecisionResponse,
  type CandidateEvidenceStatus,
  type CandidateFit,
  type CandidateOpeningEvidence,
  type CandidateOpeningKnowledgeEvidence,
  type CandidatePersonalEvidence,
  type CandidatePlayerProfileEvidence,
  type CandidateProfileMatch,
} from '@chess-trainer/contracts/candidate-decision';
import type {
  LichessGamesExplorerQuery,
  OpeningExplorerMove,
  OpeningExplorerResponse,
} from '@chess-trainer/contracts/opening-explorer';
import type {
  PlayerChessProfilePerformanceItem,
  PlayerChessProfilePreferenceItem,
  PlayerChessProfileResponse,
} from '@chess-trainer/contracts/player-chess-profile';
import type { RepertoireTarget } from '@chess-trainer/contracts/repertoire-target';
import { PositionAnalysisService } from '../analysis/position-analysis.service';
import type { StoredPositionAnalysis } from '../analysis/analysis.types';
import { CoursePositionSuggestionService } from '../courses/courses.service';
import {
  OpeningAnalysisService,
  type OpeningAnalysisCoreResponse,
} from '../imported-games/opening-analysis.service';
import {
  createLichessGamesExplorerService,
  LichessGamesExplorerUnavailableError,
  MastersExplorerService,
  MastersExplorerUnavailableError,
} from '../opening-explorer/opening-explorer.service';
import { PlayerChessProfileService } from '../player-chess-profile/player-chess-profile.service';
import { OpeningLookupService } from '../../services/opening-book/openingLookupService';
import type { OpeningBookEntry } from '../../services/opening-book/openingBook.types';
import { OpeningClassificationService } from '../../services/opening-book/openingClassificationService';
import { OpeningKnowledgeService } from '../../services/opening-book/openingKnowledgeService';

const ENGINE_LINE_LIMIT = 3;
const POPULATION_SEED_LIMIT = 8;
const MASTERS_SEED_LIMIT = 5;
const PERSONAL_SEED_LIMIT = 5;
const COURSE_SEED_LIMIT = 8;
const PREVIEW_MOVE_LIMIT = 8;
const COURSE_REFERENCE_LIMIT = 3;
const PROFILE_MATCH_LIMIT = 5;
const OPENING_KNOWLEDGE_PLAN_LIMIT = 3;
const OPENING_KNOWLEDGE_REFERENCE_LIMIT = 12;
const OPENING_KNOWLEDGE_CONDITION_LIMIT = 4;
const MIN_ENGINE_DEPTH = 12;
const MIN_MASTERS_GAMES = 10;
const MIN_PERSONAL_GAMES = 3;
const MIN_PROFILE_GAMES = 5;

type UserColor = 'WHITE' | 'BLACK';

interface CoursePositionSuggestion {
  nodeId: number;
  fenAfter: string;
  moveUci: string;
  isUserMove: boolean;
  isCorrectUserMove: boolean;
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  courseId: number;
  courseName: string;
}

interface CoursePositionSuggestionsResponse {
  normalizedFen: string;
  suggestions: CoursePositionSuggestion[];
}

interface CandidateDecisionDependencies {
  engine?: {
    get(fen: string): Promise<StoredPositionAnalysis | null>;
  };
  masters?: {
    get(fen: string, userId: number): Promise<OpeningExplorerResponse>;
  };
  population?: {
    get(fen: string, userId: number, target: RepertoireTarget): Promise<OpeningExplorerResponse>;
  };
  personal?: {
    get(userId: number, fen: string, target: RepertoireTarget): Promise<OpeningAnalysisCoreResponse>;
  };
  courses?: {
    get(userId: number, fen: string): Promise<CoursePositionSuggestionsResponse>;
  };
  playerProfile?: {
    get(userId: number, target: RepertoireTarget): Promise<PlayerChessProfileResponse>;
  };
  classifyOpening?: typeof resolveCandidateOpeningEvidence;
  clock?: () => Date;
}

interface SettledValue<T> {
  ok: boolean;
  value: T | null;
  error: unknown;
}

interface LegalMove {
  moveUci: string;
  moveSan: string;
  resultingFen: string;
}

interface AssembledCandidate extends CandidateRankingInput {
  moveSan: string;
  resultingFen: string;
  previewUci: string[];
  evidence: CandidateDecisionCandidate['evidence'];
  targetFitEvidence: CandidateFit;
  profileFitEvidence: CandidateFit;
}

export class InvalidCandidateDecisionFenError extends Error {
  readonly code = 'INVALID_FEN' as const;
}

export class CandidateDecisionRoleMismatchError extends Error {
  readonly code = 'DECISION_ROLE_MISMATCH' as const;
}

export class IllegalIncludedCandidateMoveError extends Error {
  readonly code = 'ILLEGAL_INCLUDED_MOVE' as const;
}

const defaultEngineProvider = {
  get: (fen: string) => PositionAnalysisService.getStoredPositionSearch({ fen }),
};

const defaultMastersProvider = {
  get: (fen: string, userId: number) => MastersExplorerService.getPosition(fen, userId),
};

const defaultPopulationProvider = {
  async get(fen: string, userId: number, target: RepertoireTarget): Promise<OpeningExplorerResponse> {
    const peerResolution = target.population.peerResolution;
    const service = createLichessGamesExplorerService(peerResolution === null ? {} : {
      peerResolver: {
        async resolve() {
          return peerResolution;
        },
      },
    });
    return service.getPosition(fen, userId, toExplorerQuery(fen, target));
  },
};

const defaultPersonalProvider = {
  get(userId: number, fen: string, target: RepertoireTarget): Promise<OpeningAnalysisCoreResponse> {
    return OpeningAnalysisService.getPosition(userId, {
      fen,
      accountIds: target.accountIds.length ? [...target.accountIds] : undefined,
      userColor: [target.side],
      rated: true,
      speedCategory: personalSpeeds(target.speedPreset),
      sort: 'endedAtDesc',
      limit: 50,
    });
  },
};

const defaultCoursesProvider = {
  get(userId: number, fen: string): Promise<CoursePositionSuggestionsResponse> {
    return CoursePositionSuggestionService.listForFen(userId, fen);
  },
};

const defaultPlayerProfileProvider = {
  get(userId: number, target: RepertoireTarget): Promise<PlayerChessProfileResponse> {
    return PlayerChessProfileService.get(userId, {
      accountIds: target.accountIds.length ? [...target.accountIds] : undefined,
      speedPreset: target.speedPreset,
      colors: [target.side],
      rated: true,
      supportingGamesLimit: 1,
    });
  },
};

export function createCandidateDecisionService(dependencies: CandidateDecisionDependencies = {}) {
  const engineProvider = dependencies.engine ?? defaultEngineProvider;
  const mastersProvider = dependencies.masters ?? defaultMastersProvider;
  const populationProvider = dependencies.population ?? defaultPopulationProvider;
  const personalProvider = dependencies.personal ?? defaultPersonalProvider;
  const coursesProvider = dependencies.courses ?? defaultCoursesProvider;
  const playerProfileProvider = dependencies.playerProfile ?? defaultPlayerProfileProvider;
  const classifyOpening = dependencies.classifyOpening ?? resolveCandidateOpeningEvidence;
  const clock = dependencies.clock ?? (() => new Date());

  return {
    async get(userId: number, request: CandidateDecisionRequest): Promise<CandidateDecisionResponse> {
      const position = canonicalPosition(request.fen);
      const sideToMove: UserColor = position.chess.turn() === 'w' ? 'WHITE' : 'BLACK';
      const expectedRole = sideToMove === request.target.side ? 'USER_MOVE' : 'OPPONENT_RESPONSE';
      if (request.decisionRole !== expectedRole) {
        throw new CandidateDecisionRoleMismatchError(
          `The position requires ${expectedRole}, not ${request.decisionRole}.`,
        );
      }

      const legalMoves = legalMoveMap(position.chess);
      const includedMove = request.includeMoveUci?.toLowerCase();
      if (includedMove && !legalMoves.has(includedMove)) {
        throw new IllegalIncludedCandidateMoveError('The requested comparison move is not legal.');
      }

      const [engineResult, mastersResult, populationResult, personalResult, coursesResult, profileResult] = await Promise.all([
        settle(() => engineProvider.get(position.fen)),
        settle(() => mastersProvider.get(position.fen, userId)),
        settle(() => populationProvider.get(position.fen, userId, request.target)),
        settle(() => personalProvider.get(userId, position.fen, request.target)),
        settle(() => coursesProvider.get(userId, position.fen)),
        settle(() => playerProfileProvider.get(userId, request.target)),
      ]);

      const engineStatus = engineSourceStatus(engineResult);
      const mastersStatus = explorerSourceStatus(mastersResult, MIN_MASTERS_GAMES);
      const populationStatus = explorerSourceStatus(
        populationResult,
        request.target.coverage.minimumPopulationGames,
      );
      const personalStatus = personalSourceStatus(personalResult);
      const coursesStatus = courseSourceStatus(coursesResult);
      const profileStatus = profileSourceStatus(profileResult);

      const engineLines = engineResult.ok && engineResult.value
        ? engineResult.value.lines.slice(0, ENGINE_LINE_LIMIT)
        : [];
      const masters = mastersResult.ok ? mastersResult.value : null;
      const population = populationResult.ok ? populationResult.value : null;
      const personal = personalResult.ok ? personalResult.value : null;
      const courses = coursesResult.ok ? coursesResult.value : null;
      const playerProfile = profileResult.ok ? profileResult.value : null;

      const mastersByMove = moveMap(masters?.moves ?? []);
      const populationByMove = moveMap(population?.moves ?? []);
      const personalByMove = new Map(
        (personal?.nextMoves ?? []).map((move) => [move.moveUci.toLowerCase(), move]),
      );
      const coursesByMove = groupCoursesByMove(courses?.suggestions ?? []);
      const engineByMove = new Map(
        engineLines.flatMap((line) => {
          const moveUci = lineMove(line);
          return moveUci ? [[moveUci, line] as const] : [];
        }),
      );

      const seeds = new Set<string>();
      addSeeds(seeds, engineLines.map(lineMove), legalMoves, ENGINE_LINE_LIMIT);
      addSeeds(seeds, population?.moves.map((move) => move.uci) ?? [], legalMoves, POPULATION_SEED_LIMIT);
      addSeeds(seeds, masters?.moves.map((move) => move.uci) ?? [], legalMoves, MASTERS_SEED_LIMIT);
      addSeeds(seeds, personal?.nextMoves.map((move) => move.moveUci) ?? [], legalMoves, PERSONAL_SEED_LIMIT);
      addSeeds(seeds, courses?.suggestions.map((move) => move.moveUci) ?? [], legalMoves, COURSE_SEED_LIMIT);
      if (includedMove) seeds.add(includedMove);
      if (!seeds.size) {
        for (const move of [...legalMoves.values()]
          .sort((left, right) => left.moveSan.localeCompare(right.moveSan) || left.moveUci.localeCompare(right.moveUci))
          .slice(0, request.candidateLimit)) {
          seeds.add(move.moveUci);
        }
      }

      const comparableScores = engineLines
        .map((line) => targetComparableScore(line, request.target.side))
        .filter((score): score is number => score !== null);
      const safestTargetScore = comparableScores.length ? Math.max(...comparableScores) : null;

      const assembled: AssembledCandidate[] = [];
      for (const moveUci of seeds) {
        const legalMove = legalMoves.get(moveUci);
        if (!legalMove) continue;
        const engineLine = engineByMove.get(moveUci) ?? null;
        const mastersMove = mastersByMove.get(moveUci) ?? null;
        const populationMove = populationByMove.get(moveUci) ?? null;
        const personalMove = personalByMove.get(moveUci) ?? null;
        const courseMatches = coursesByMove.get(moveUci) ?? [];
        const opening = classifyOpening(
          legalMove.resultingFen,
          populationMove?.opening ?? mastersMove?.opening ?? null,
          request.target.side,
        );
        const course = courseEvidence(
          legalMove,
          courseMatches,
          courses?.suggestions ?? [],
          coursesStatus,
          request.decisionRole,
        );
        const profile = playerProfileEvidence(opening, playerProfile, profileStatus);
        const targetFit = targetFitEvidence(opening, request.target);
        const profileFit = profileFitEvidence(profile);
        const engine = engineEvidence(
          engineLine,
          engineStatus,
          request.target.side,
          safestTargetScore,
        );

        const evidence: CandidateDecisionCandidate['evidence'] = {
          engine,
          masters: corpusEvidence(mastersMove, masters, mastersStatus, request.target.side, MIN_MASTERS_GAMES),
          population: corpusEvidence(
            populationMove,
            population,
            populationStatus,
            request.target.side,
            request.target.coverage.minimumPopulationGames,
          ),
          personal: personalEvidence(personalMove, personalStatus),
          opening,
          course,
          playerProfile: profile,
        };

        assembled.push({
          moveUci,
          moveSan: legalMove.moveSan,
          resultingFen: legalMove.resultingFen,
          previewUci: engine.pvUci.length ? engine.pvUci : [moveUci],
          manuallyRequested: includedMove === moveUci,
          engine: {
            status: engine.status,
            depth: engine.depth,
            mateForTarget: engine.mateForTarget,
            objectiveDeltaCp: engine.objectiveDeltaCp,
          },
          population: {
            status: evidence.population.status,
            games: evidence.population.games,
            frequencyPercent: evidence.population.frequencyPercent,
            scorePercentForTarget: evidence.population.scorePercentForTarget,
          },
          masters: {
            status: evidence.masters.status,
            games: evidence.masters.games,
            frequencyPercent: evidence.masters.frequencyPercent,
            scorePercentForTarget: evidence.masters.scorePercentForTarget,
          },
          personal: {
            status: evidence.personal.status,
            occurrences: evidence.personal.occurrences,
            games: evidence.personal.games,
            scorePercent: evidence.personal.scorePercent,
          },
          targetFit: targetFit.status,
          targetReasonCodes: targetFit.reasonCodes as CandidateRankingReasonCode[],
          targetWarningCodes: targetFitWarningCodes(opening, request.target),
          profileFit: profileFit.status,
          profileReasonCodes: profileFit.reasonCodes as CandidateRankingReasonCode[],
          course: {
            status: course.status,
            covered: course.covered,
            conflict: course.conflict,
            transposesToCoveredPosition: course.transposesToCoveredPosition,
          },
          evidence,
          targetFitEvidence: targetFit,
          profileFitEvidence: profileFit,
        });
      }

      const ranked = rankCandidateEvidence(assembled, {
        role: request.decisionRole,
        speedPreset: request.target.speedPreset,
        riskTolerance: request.target.objective.riskTolerance,
        allowDeliberatelyDubious: request.target.objective.allowDeliberatelyDubious,
      });
      const selected = selectBoundedCandidates(ranked, request.candidateLimit, includedMove);
      const candidates: CandidateDecisionCandidate[] = selected.map((entry, index) => ({
        rank: index + 1,
        moveUci: entry.input.moveUci,
        moveSan: entry.input.moveSan,
        resultingFen: entry.input.resultingFen,
        previewUci: entry.input.previewUci.slice(0, PREVIEW_MOVE_LIMIT),
        manuallyRequested: entry.input.manuallyRequested,
        eligibility: {
          status: entry.eligibility,
          reasonCodes: entry.reasonCodes.slice(0, 8),
          warningCodes: entry.warningCodes.slice(0, 8),
        },
        targetFit: entry.input.targetFitEvidence,
        profileFit: entry.input.profileFitEvidence,
        components: entry.components,
        reasonCodes: entry.reasonCodes.slice(0, 12),
        warningCodes: entry.warningCodes.slice(0, 12),
        coverage: request.decisionRole === 'OPPONENT_RESPONSE' ? {
          contributionPercent: entry.coverageContributionPercent,
          cumulativePercent: entry.cumulativeCoveragePercent,
        } : null,
        evidence: entry.input.evidence,
      }));

      const openingStatus = candidates.some((candidate) => candidate.evidence.opening.status === 'AVAILABLE')
        ? 'AVAILABLE'
        : 'INSUFFICIENT';
      const response: CandidateDecisionResponse = {
        contractVersion: CANDIDATE_DECISION_CONTRACT_VERSION,
        rankingPolicyVersion: CANDIDATE_RANKING_POLICY_VERSION,
        generatedAt: clock().toISOString(),
        targetId: request.target.targetId,
        decisionRole: request.decisionRole,
        fen: position.fen,
        normalizedFen: position.normalizedFen,
        sideToMove,
        legalMoveCount: legalMoves.size,
        returnedCandidateCount: candidates.length,
        omittedLegalMoveCount: Math.max(0, legalMoves.size - candidates.length),
        requestedMoveIncluded: Boolean(includedMove && candidates.some((candidate) => candidate.moveUci === includedMove)),
        sourceSummary: {
          engine: engineStatus,
          masters: mastersStatus,
          population: populationStatus,
          personal: personalStatus,
          opening: openingStatus,
          courses: coursesStatus,
          playerProfile: profileStatus,
        },
        candidates,
      };
      return candidateDecisionResponseSchema.parse(response);
    },
  };
}

function canonicalPosition(inputFen: string): { chess: Chess; fen: string; normalizedFen: string } {
  try {
    const chess = inputFen === 'startpos' ? new Chess() : new Chess(inputFen);
    const fen = chess.fen();
    return { chess, fen, normalizedFen: normalizeFenForPosition(fen) };
  } catch {
    throw new InvalidCandidateDecisionFenError('The supplied FEN is invalid.');
  }
}

function legalMoveMap(chess: Chess): Map<string, LegalMove> {
  const legalMoves = new Map<string, LegalMove>();
  for (const move of chess.moves({ verbose: true })) {
    const moveUci = `${move.from}${move.to}${move.promotion ?? ''}`.toLowerCase();
    const next = new Chess(chess.fen());
    next.move({ from: move.from, to: move.to, promotion: move.promotion });
    legalMoves.set(moveUci, {
      moveUci,
      moveSan: move.san,
      resultingFen: next.fen(),
    });
  }
  return legalMoves;
}

function addSeeds(
  seeds: Set<string>,
  values: readonly (string | null)[],
  legalMoves: ReadonlyMap<string, LegalMove>,
  limit: number,
): void {
  for (const value of values.slice(0, limit)) {
    const moveUci = value?.toLowerCase();
    if (moveUci && legalMoves.has(moveUci)) seeds.add(moveUci);
  }
}

function moveMap(moves: readonly OpeningExplorerMove[]): Map<string, OpeningExplorerMove> {
  return new Map(moves.map((move) => [move.uci.toLowerCase(), move]));
}

function groupCoursesByMove(
  suggestions: readonly CoursePositionSuggestion[],
): Map<string, CoursePositionSuggestion[]> {
  const grouped = new Map<string, CoursePositionSuggestion[]>();
  for (const suggestion of suggestions) {
    const moveUci = suggestion.moveUci.toLowerCase();
    const group = grouped.get(moveUci) ?? [];
    group.push(suggestion);
    grouped.set(moveUci, group);
  }
  return grouped;
}

function lineMove(line: StoredEngineLine): string | null {
  return (line.moveUci ?? line.pvUci[0] ?? '').trim().toLowerCase() || null;
}

function engineEvidence(
  line: StoredEngineLine | null,
  sourceStatus: CandidateEvidenceStatus,
  targetSide: UserColor,
  safestTargetScore: number | null,
): CandidateDecisionCandidate['evidence']['engine'] {
  if (!line) {
    return {
      status: sourceStatus === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'INSUFFICIENT',
      depth: null,
      multipv: null,
      scoreCpForTarget: null,
      mateForTarget: null,
      objectiveDeltaCp: null,
      pvUci: [],
    };
  }
  const scoreCpForTarget = orientForTarget(line.scoreCpWhite, targetSide);
  const mateForTarget = orientForTarget(line.mateWhite, targetSide);
  const comparable = targetComparableScore(line, targetSide);
  const objectiveDeltaCp = comparable === null || safestTargetScore === null
    ? null
    : Math.max(0, Math.min(32_767, Math.round(safestTargetScore - comparable)));
  return {
    status: line.depth !== undefined && line.depth < MIN_ENGINE_DEPTH ? 'INSUFFICIENT' : sourceStatus,
    depth: line.depth ?? null,
    multipv: line.multipv ?? null,
    scoreCpForTarget: scoreCpForTarget ?? null,
    mateForTarget: mateForTarget ?? null,
    objectiveDeltaCp,
    pvUci: line.pvUci.slice(0, PREVIEW_MOVE_LIMIT).map((move) => move.toLowerCase()),
  };
}

function targetComparableScore(line: StoredEngineLine, side: UserColor): number | null {
  const mate = orientForTarget(line.mateWhite, side);
  if (mate !== undefined) return mate >= 0 ? 10_000 - Math.abs(mate) : -10_000 + Math.abs(mate);
  const score = orientForTarget(line.scoreCpWhite, side);
  return score ?? null;
}

function orientForTarget(value: number | undefined, side: UserColor): number | undefined {
  if (value === undefined) return undefined;
  return side === 'WHITE' ? value : -value;
}

function corpusEvidence(
  move: OpeningExplorerMove | null,
  response: OpeningExplorerResponse | null,
  sourceStatus: CandidateEvidenceStatus,
  targetSide: UserColor,
  minimumGames: number,
): CandidateCorpusEvidence {
  if (!response || sourceStatus === 'UNAVAILABLE') return unavailableCorpusEvidence();
  if (!move) return { ...unavailableCorpusEvidence(), status: 'INSUFFICIENT' };
  const games = move.games.total;
  const status = sourceStatus === 'STALE'
    ? 'STALE'
    : games >= minimumGames ? 'AVAILABLE' : 'INSUFFICIENT';
  return {
    status,
    games,
    frequencyPercent: percentage(games, response.games.total),
    scorePercentForTarget: corpusScorePercent(move, targetSide),
    averageRating: move.averageRating,
    datasetVersion: `${response.dataset.source}:${response.dataset.profileVersion}`,
    fetchedAt: response.cache.fetchedAt,
    representativeGameId: move.representativeGame?.id ?? null,
  };
}

function unavailableCorpusEvidence(): CandidateCorpusEvidence {
  return {
    status: 'UNAVAILABLE',
    games: 0,
    frequencyPercent: null,
    scorePercentForTarget: null,
    averageRating: null,
    datasetVersion: null,
    fetchedAt: null,
    representativeGameId: null,
  };
}

function corpusScorePercent(move: OpeningExplorerMove, targetSide: UserColor): number | null {
  if (!move.games.total) return null;
  const wins = targetSide === 'WHITE' ? move.games.whiteWins : move.games.blackWins;
  return roundMetric(((wins + move.games.draws * 0.5) / move.games.total) * 100);
}

function personalEvidence(
  move: OpeningAnalysisCoreResponse['nextMoves'][number] | null,
  sourceStatus: CandidateEvidenceStatus,
): CandidatePersonalEvidence {
  if (sourceStatus === 'UNAVAILABLE') {
    return { status: 'UNAVAILABLE', occurrences: 0, games: 0, scorePercent: null };
  }
  if (!move) return { status: 'INSUFFICIENT', occurrences: 0, games: 0, scorePercent: null };
  return {
    status: move.games.total >= MIN_PERSONAL_GAMES ? 'AVAILABLE' : 'INSUFFICIENT',
    occurrences: move.occurrences,
    games: move.games.total,
    scorePercent: move.games.scorePct,
  };
}

export function resolveCandidateOpeningEvidence(
  resultingFen: string,
  hint: OpeningExplorerMove['opening'],
  side: UserColor,
): CandidateOpeningEvidence {
  const exact = OpeningLookupService.lookupByFen(resultingFen);
  const entry: OpeningBookEntry | null = exact ?? (hint ? {
    eco: hint.eco,
    name: hint.name,
    pgn: '',
    uci: '',
    epd: '',
    ply: 0,
  } : null);
  if (!entry) return unavailableOpeningEvidence(side);
  const classification = OpeningClassificationService.classify(entry);
  if (!classification.matchedRuleIds.length) return unavailableOpeningEvidence(side);
  const selected = side === 'WHITE' ? classification.white : classification.black;
  const knowledge = OpeningKnowledgeService.resolve(entry, classification);
  const selectedKnowledge = side === 'WHITE' ? knowledge.white : knowledge.black;
  return {
    status: 'AVAILABLE',
    opening: { eco: entry.eco || null, name: entry.name },
    classificationVersion: classification.version,
    side,
    soundness: selected.soundness,
    character: [...selected.character],
    theoreticalStatus: selected.theoreticalStatus,
    theoryBurden: selected.theoryBurden,
    roles: [...selected.roles],
    confidence: selected.confidence,
    matchedRuleIds: [...classification.matchedRuleIds],
    knowledge: {
      status: knowledge.status,
      version: knowledge.knowledgeVersion,
      shortDescription: knowledge.shortDescription ? {
        text: knowledge.shortDescription.text,
        confidence: knowledge.shortDescription.confidence,
      } : null,
      strategicSummary: selectedKnowledge.strategicSummary ? {
        text: selectedKnowledge.strategicSummary.text,
        confidence: selectedKnowledge.strategicSummary.confidence,
      } : null,
      plans: selectedKnowledge.plans.slice(0, OPENING_KNOWLEDGE_PLAN_LIMIT).map((plan) => ({
        id: plan.id,
        title: plan.title,
        summary: plan.summary,
        conditions: [...(plan.conditions ?? [])].slice(0, OPENING_KNOWLEDGE_CONDITION_LIMIT),
        caveats: [...(plan.caveats ?? [])].slice(0, OPENING_KNOWLEDGE_CONDITION_LIMIT),
        confidence: plan.confidence,
      })),
      matchedRuleIds: [...knowledge.matchedKnowledgeRuleIds].slice(0, OPENING_KNOWLEDGE_REFERENCE_LIMIT),
      sourceIds: knowledge.sources
        .map((source) => source.id)
        .slice(0, OPENING_KNOWLEDGE_REFERENCE_LIMIT),
    },
  };
}

function unavailableOpeningKnowledge(): CandidateOpeningKnowledgeEvidence {
  return {
    status: 'UNAVAILABLE',
    version: null,
    shortDescription: null,
    strategicSummary: null,
    plans: [],
    matchedRuleIds: [],
    sourceIds: [],
  };
}

function unavailableOpeningEvidence(side: UserColor): CandidateOpeningEvidence {
  return {
    status: 'INSUFFICIENT',
    opening: null,
    classificationVersion: null,
    side,
    soundness: null,
    character: [],
    theoreticalStatus: null,
    theoryBurden: null,
    roles: [],
    confidence: null,
    matchedRuleIds: [],
    knowledge: unavailableOpeningKnowledge(),
  };
}

function courseEvidence(
  move: LegalMove,
  matches: readonly CoursePositionSuggestion[],
  allSuggestions: readonly CoursePositionSuggestion[],
  sourceStatus: CandidateEvidenceStatus,
  role: CandidateDecisionRequest['decisionRole'],
): CandidateCourseEvidence {
  if (sourceStatus === 'UNAVAILABLE') {
    return {
      status: 'UNAVAILABLE',
      covered: false,
      conflict: false,
      transposesToCoveredPosition: false,
      references: [],
    };
  }
  const covered = matches.length > 0;
  const relevantExisting = allSuggestions.filter((suggestion) => (
    role === 'USER_MOVE' ? suggestion.isUserMove && suggestion.isCorrectUserMove : !suggestion.isUserMove
  ));
  const conflict = role === 'USER_MOVE' && relevantExisting.length > 0 && !covered;
  const resultingKey = safeNormalizedFen(move.resultingFen);
  const transposesToCoveredPosition = allSuggestions.some((suggestion) => (
    suggestion.moveUci.toLowerCase() !== move.moveUci
      && resultingKey !== null
      && safeNormalizedFen(suggestion.fenAfter) === resultingKey
  ));
  return {
    status: covered || allSuggestions.length ? 'AVAILABLE' : 'INSUFFICIENT',
    covered,
    conflict,
    transposesToCoveredPosition,
    references: matches.slice(0, COURSE_REFERENCE_LIMIT).map((suggestion) => ({
      nodeId: suggestion.nodeId,
      lineId: suggestion.lineId,
      lineName: suggestion.lineName,
      chapterId: suggestion.chapterId,
      chapterName: suggestion.chapterName,
      courseId: suggestion.courseId,
      courseName: suggestion.courseName,
    })),
  };
}

function playerProfileEvidence(
  opening: CandidateOpeningEvidence,
  profile: PlayerChessProfileResponse | null,
  sourceStatus: CandidateEvidenceStatus,
): CandidatePlayerProfileEvidence {
  if (!profile || sourceStatus === 'UNAVAILABLE') {
    return { status: 'UNAVAILABLE', generatedAt: null, matches: [] };
  }
  if (opening.status !== 'AVAILABLE') {
    return { status: 'INSUFFICIENT', generatedAt: profile.generatedAt, matches: [] };
  }
  const dimensions = openingDimensions(opening);
  const preferenceMatches = profile.preference.items
    .filter((item) => dimensions.has(`${item.dimension}:${item.value}`) && item.games >= MIN_PROFILE_GAMES)
    .map(toPreferenceMatch);
  const performanceMatches = profile.performance.items
    .filter((item) => dimensions.has(`${item.dimension}:${item.value}`) && item.games >= MIN_PROFILE_GAMES)
    .map(toPerformanceMatch);
  const matches = [...performanceMatches, ...preferenceMatches]
    .sort(compareProfileMatches)
    .slice(0, PROFILE_MATCH_LIMIT);
  return {
    status: matches.length ? sourceStatus : 'INSUFFICIENT',
    generatedAt: profile.generatedAt,
    matches,
  };
}

function openingDimensions(opening: CandidateOpeningEvidence): Set<string> {
  const values = new Set<string>();
  for (const character of opening.character) values.add(`CHARACTER:${character}`);
  if (opening.soundness) values.add(`SOUNDNESS:${opening.soundness}`);
  if (opening.theoreticalStatus) values.add(`THEORETICAL_STATUS:${opening.theoreticalStatus}`);
  if (opening.theoryBurden) values.add(`THEORY_BURDEN:${opening.theoryBurden}`);
  for (const role of opening.roles) values.add(`ROLE:${role}`);
  return values;
}

function toPreferenceMatch(item: PlayerChessProfilePreferenceItem): CandidateProfileMatch {
  return {
    kind: 'PREFERENCE',
    dimension: item.dimension,
    value: item.value,
    games: item.games,
    exposurePercent: item.exposurePercent,
    scoreDelta: null,
    evidenceStrength: null,
  };
}

function toPerformanceMatch(item: PlayerChessProfilePerformanceItem): CandidateProfileMatch {
  return {
    kind: 'PERFORMANCE',
    dimension: item.dimension,
    value: item.value,
    games: item.games,
    exposurePercent: null,
    scoreDelta: item.scoreDelta,
    evidenceStrength: item.resultEvidenceStrength,
  };
}

function compareProfileMatches(left: CandidateProfileMatch, right: CandidateProfileMatch): number {
  const leftMagnitude = Math.abs(left.scoreDelta ?? left.exposurePercent ?? 0);
  const rightMagnitude = Math.abs(right.scoreDelta ?? right.exposurePercent ?? 0);
  return rightMagnitude - leftMagnitude
    || right.games - left.games
    || left.dimension.localeCompare(right.dimension)
    || left.value.localeCompare(right.value);
}

function targetFitEvidence(opening: CandidateOpeningEvidence, target: RepertoireTarget): CandidateFit {
  if (opening.status !== 'AVAILABLE') return { status: 'UNKNOWN', reasonCodes: [] };
  const reasons = new Set<CandidateRankingReasonCode>();
  let conflict = false;
  const soundness = soundnessRank(opening.soundness);
  const minimumSoundness = soundnessRank(target.objective.minimumSoundness);
  if (soundness !== null && minimumSoundness !== null && soundness < minimumSoundness) {
    conflict = true;
    reasons.add('TARGET_SOUNDNESS_CONFLICT');
  }
  const theory = theoryRank(opening.theoryBurden);
  const maximumTheory = theoryRank(target.objective.maximumTheoryBurden);
  if (theory !== null && maximumTheory !== null && theory > maximumTheory) {
    conflict = true;
    reasons.add('TARGET_THEORY_EXCEEDED');
  } else if (theory !== null && maximumTheory !== null) {
    reasons.add('TARGET_THEORY_MATCH');
  }
  if (opening.character.some((character) => target.objective.preferredCharacters.includes(character))) {
    reasons.add('TARGET_CHARACTER_MATCH');
  }
  return {
    status: conflict ? 'CONFLICT' : reasons.size ? 'ALIGNED' : 'NEUTRAL',
    reasonCodes: [...reasons],
  };
}

function targetFitWarningCodes(
  opening: CandidateOpeningEvidence,
  target: RepertoireTarget,
): CandidateRankingWarningCode[] {
  if (opening.status !== 'AVAILABLE') return [];
  const warnings: CandidateRankingWarningCode[] = [];
  const soundness = soundnessRank(opening.soundness);
  const minimumSoundness = soundnessRank(target.objective.minimumSoundness);
  if (soundness !== null && minimumSoundness !== null && soundness < minimumSoundness) {
    warnings.push('TARGET_SOUNDNESS_MISMATCH');
  }
  const theory = theoryRank(opening.theoryBurden);
  const maximumTheory = theoryRank(target.objective.maximumTheoryBurden);
  if (theory !== null && maximumTheory !== null && theory > maximumTheory) {
    warnings.push('THEORY_BUDGET_EXCEEDED');
  }
  return warnings;
}

function profileFitEvidence(profile: CandidatePlayerProfileEvidence): CandidateFit {
  if (profile.status === 'UNAVAILABLE') return { status: 'UNKNOWN', reasonCodes: [] };
  if (!profile.matches.length) return { status: 'NEUTRAL', reasonCodes: [] };
  const reasons = new Set<CandidateRankingReasonCode>();
  let positive = false;
  let negative = false;
  for (const match of profile.matches) {
    if (match.kind === 'PREFERENCE' && (match.exposurePercent ?? 0) >= 15) {
      positive = true;
      reasons.add('PROFILE_PREFERENCE_MATCH');
    }
    if (match.kind === 'PERFORMANCE'
      && (match.evidenceStrength === 'MEDIUM' || match.evidenceStrength === 'HIGH')) {
      if ((match.scoreDelta ?? 0) >= 5) {
        positive = true;
        reasons.add('PROFILE_PERFORMANCE_SUPPORT');
      }
      if ((match.scoreDelta ?? 0) <= -5) {
        negative = true;
        reasons.add('PROFILE_PERFORMANCE_WARNING');
      }
    }
  }
  return {
    status: negative && !positive ? 'CONFLICT' : positive ? 'ALIGNED' : 'NEUTRAL',
    reasonCodes: [...reasons],
  };
}

function soundnessRank(value: CandidateOpeningEvidence['soundness'] | RepertoireTarget['objective']['minimumSoundness']): number | null {
  if (value === 'SOUND') return 4;
  if (value === 'PLAYABLE') return 3;
  if (value === 'RISKY') return 2;
  if (value === 'DUBIOUS') return 1;
  return null;
}

function theoryRank(value: CandidateOpeningEvidence['theoryBurden'] | RepertoireTarget['objective']['maximumTheoryBurden']): number | null {
  if (value === 'LOW') return 1;
  if (value === 'MEDIUM') return 2;
  if (value === 'HIGH') return 3;
  return null;
}

function engineSourceStatus(result: SettledValue<StoredPositionAnalysis | null>): CandidateEvidenceStatus {
  if (!result.ok || !result.value) return 'UNAVAILABLE';
  if (!result.value.lines.length) return 'INSUFFICIENT';
  return result.value.lines.some((line) => line.depth !== undefined && line.depth < MIN_ENGINE_DEPTH)
    ? 'INSUFFICIENT'
    : 'AVAILABLE';
}

function explorerSourceStatus(
  result: SettledValue<OpeningExplorerResponse>,
  minimumGames: number,
): CandidateEvidenceStatus {
  if (!result.ok || !result.value) return 'UNAVAILABLE';
  if (result.value.cache.status === 'STALE') return 'STALE';
  return result.value.games.total >= minimumGames ? 'AVAILABLE' : 'INSUFFICIENT';
}

function personalSourceStatus(
  result: SettledValue<OpeningAnalysisCoreResponse>,
): CandidateEvidenceStatus {
  if (!result.ok || !result.value) return 'UNAVAILABLE';
  return result.value.occurrences > 0 ? 'AVAILABLE' : 'INSUFFICIENT';
}

function courseSourceStatus(
  result: SettledValue<CoursePositionSuggestionsResponse>,
): CandidateEvidenceStatus {
  if (!result.ok || !result.value) return 'UNAVAILABLE';
  return result.value.suggestions.length ? 'AVAILABLE' : 'INSUFFICIENT';
}

function profileSourceStatus(
  result: SettledValue<PlayerChessProfileResponse>,
): CandidateEvidenceStatus {
  if (!result.ok || !result.value) return 'UNAVAILABLE';
  return result.value.coverage.totalGames >= MIN_PROFILE_GAMES ? 'AVAILABLE' : 'INSUFFICIENT';
}

function selectBoundedCandidates<T extends AssembledCandidate>(
  ranked: ReturnType<typeof rankCandidateEvidence<T>>,
  limit: number,
  includedMove: string | undefined,
) {
  const selected = ranked.slice(0, limit);
  if (!includedMove || selected.some((entry) => entry.input.moveUci === includedMove)) return selected;
  const manual = ranked.find((entry) => entry.input.moveUci === includedMove);
  if (!manual) return selected;
  if (selected.length < limit) selected.push(manual);
  else selected[selected.length - 1] = manual;
  return selected.sort((left, right) => left.rank - right.rank);
}

async function settle<T>(operation: () => Promise<T>): Promise<SettledValue<T>> {
  try {
    return { ok: true, value: await operation(), error: null };
  } catch (error) {
    if (error instanceof MastersExplorerUnavailableError
      || error instanceof LichessGamesExplorerUnavailableError) {
      return { ok: false, value: null, error };
    }
    return { ok: false, value: null, error };
  }
}

function toExplorerQuery(fen: string, target: RepertoireTarget): LichessGamesExplorerQuery {
  const requested = target.population.requested;
  if (requested.kind === 'ALL_PLAYERS') {
    return { fen, speedPreset: target.speedPreset, ratingTarget: 'ALL' };
  }
  if (requested.kind === 'MY_PEERS') {
    return { fen, speedPreset: target.speedPreset, ratingTarget: 'MY_PEERS' };
  }
  if (requested.kind === 'MY_PEERS_PLUS_ONE') {
    return { fen, speedPreset: target.speedPreset, ratingTarget: 'MY_PEERS_PLUS_ONE' };
  }
  return {
    fen,
    speedPreset: target.speedPreset,
    ratingTarget: 'GROUP',
    ratingGroup: requested.ratingGroup,
  };
}

function personalSpeeds(speedPreset: RepertoireTarget['speedPreset']): string[] {
  if (speedPreset === 'BULLET') return ['bullet'];
  if (speedPreset === 'BLITZ') return ['blitz'];
  if (speedPreset === 'BLITZ_AND_SLOWER') return ['blitz', 'rapid'];
  return ['bullet', 'blitz', 'rapid'];
}

function percentage(value: number, total: number): number | null {
  return total > 0 ? roundMetric((value / total) * 100) : null;
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

function safeNormalizedFen(fen: string): string | null {
  try {
    return normalizeFenForPosition(fen);
  } catch {
    return null;
  }
}

export const CandidateDecisionService = createCandidateDecisionService();
