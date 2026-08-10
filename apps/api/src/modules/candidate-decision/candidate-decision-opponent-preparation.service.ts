import { Chess } from 'chess.js';
import {
  candidateDecisionResponseSchema,
  type CandidateCourseEvidence,
  type CandidateDecisionCandidate,
  type CandidateDecisionRequest,
  type CandidateDecisionResponse,
  type CandidateEvidenceStatus,
  type CandidateWarningCode,
} from '@chess-trainer/contracts/candidate-decision';
import type {
  LichessGamesExplorerQuery,
  OpeningExplorerResponse,
} from '@chess-trainer/contracts/opening-explorer';
import type { PlayerChessProfileResponse } from '@chess-trainer/contracts/player-chess-profile';
import type { RepertoireTarget } from '@chess-trainer/contracts/repertoire-target';
import {
  normalizeFenForPosition,
  rankOpponentPreparationCandidates,
  type CandidateRankingInput,
  type OpponentPreparationCandidate,
  type StoredEngineLine,
} from 'chess-domain';
import { PositionAnalysisService } from '../analysis/position-analysis.service';
import type { StoredPositionAnalysis } from '../analysis/analysis.types';
import {
  OpeningAnalysisService,
  type OpeningAnalysisCoreResponse,
} from '../imported-games/opening-analysis.service';
import {
  createLichessGamesExplorerService,
  MastersExplorerService,
} from '../opening-explorer/opening-explorer.service';
import { PlayerChessProfileService } from '../player-chess-profile/player-chess-profile.service';
import { CoursePositionSuggestionService } from '../courses/courses.service';
import {
  CandidateDecisionService,
  createCandidateDecisionService,
} from './candidate-decision.service';

const COURSE_REFERENCE_LIMIT = 3;
const OPPONENT_BASE_CANDIDATE_LIMIT = 8;

const OPPONENT_IRRELEVANT_WARNING_CODES = new Set<CandidateWarningCode>([
  'TARGET_SOUNDNESS_MISMATCH',
  'THEORY_BUDGET_EXCEEDED',
]);

type CoursePositionSuggestionsResponse = Awaited<
  ReturnType<typeof CoursePositionSuggestionService.listForFen>
>;
type CoursePositionSuggestion = CoursePositionSuggestionsResponse['suggestions'][number];

interface OpponentPreparationDependencies {
  engine: {
    get(fen: string): Promise<StoredPositionAnalysis | null>;
  };
  masters: {
    get(fen: string, userId: number): Promise<OpeningExplorerResponse>;
  };
  population: {
    get(fen: string, userId: number, target: RepertoireTarget): Promise<OpeningExplorerResponse>;
  };
  personal: {
    get(userId: number, fen: string, target: RepertoireTarget): Promise<OpeningAnalysisCoreResponse>;
  };
  playerProfile: {
    get(userId: number, target: RepertoireTarget): Promise<PlayerChessProfileResponse>;
  };
  courses: {
    get(userId: number, fen: string): Promise<CoursePositionSuggestionsResponse>;
  };
}

type SourceSnapshot<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

const defaultDependencies: OpponentPreparationDependencies = {
  engine: {
    get: (fen) => PositionAnalysisService.getStoredPositionSearch({ fen }),
  },
  masters: {
    get: (fen, userId) => MastersExplorerService.getPosition(fen, userId),
  },
  population: {
    async get(fen, userId, target) {
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
  },
  personal: {
    get(userId, fen, target) {
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
  },
  playerProfile: {
    get(userId, target) {
      return PlayerChessProfileService.get(userId, {
        accountIds: target.accountIds.length ? [...target.accountIds] : undefined,
        speedPreset: target.speedPreset,
        colors: [target.side],
        rated: true,
        supportingGamesLimit: 1,
      });
    },
  },
  courses: {
    get: (userId, fen) => CoursePositionSuggestionService.listForFen(userId, fen),
  },
};

export function createCandidateDecisionOpponentPreparationService(
  dependencies: Partial<OpponentPreparationDependencies> = {},
) {
  const deps: OpponentPreparationDependencies = {
    ...defaultDependencies,
    ...dependencies,
  };

  return {
    async get(userId: number, request: CandidateDecisionRequest): Promise<CandidateDecisionResponse> {
      if (request.decisionRole !== 'OPPONENT_RESPONSE') {
        return CandidateDecisionService.get(userId, request);
      }

      const canonicalFen = canonicalFenOrInput(request.fen);
      const [engine, masters, population, personal, playerProfile, courses] = await Promise.all([
        capture(() => deps.engine.get(canonicalFen)),
        capture(() => deps.masters.get(canonicalFen, userId)),
        capture(() => deps.population.get(canonicalFen, userId, request.target)),
        capture(() => deps.personal.get(userId, canonicalFen, request.target)),
        capture(() => deps.playerProfile.get(userId, request.target)),
        capture(() => deps.courses.get(userId, canonicalFen)),
      ]);

      const cachedCandidateDecision = createCandidateDecisionService({
        engine: { get: () => replay(engine) },
        masters: { get: () => replay(masters) },
        population: { get: () => replay(population) },
        personal: { get: () => replay(personal) },
        playerProfile: { get: () => replay(playerProfile) },
      });

      const baseResponse = await cachedCandidateDecision.get(userId, {
        ...request,
        candidateLimit: OPPONENT_BASE_CANDIDATE_LIMIT,
      });
      const candidatesByMove = new Map(
        baseResponse.candidates.map((candidate) => [candidate.moveUci, candidate]),
      );

      const discoveryMoves = opponentDiscoveryMoves({
        engine,
        masters,
        population,
        personal,
        courses,
        includeMoveUci: request.includeMoveUci,
      });
      for (const moveUci of discoveryMoves) {
        if (candidatesByMove.has(moveUci)) continue;
        try {
          const expanded = await cachedCandidateDecision.get(userId, {
            ...request,
            candidateLimit: OPPONENT_BASE_CANDIDATE_LIMIT,
            includeMoveUci: moveUci,
          });
          const candidate = expanded.candidates.find((entry) => entry.moveUci === moveUci);
          if (candidate) candidatesByMove.set(moveUci, candidate);
        } catch {
          // Source results can contain stale moves. The underlying service remains the legality authority.
        }
      }

      const courseSuggestions = courses.ok ? courses.value.suggestions : [];
      const courseStatus = opponentCourseSourceStatus(courses);
      const candidatesWithCourse = [...candidatesByMove.values()].map((candidate) => ({
        ...candidate,
        evidence: {
          ...candidate.evidence,
          course: opponentCourseEvidence(candidate, courseSuggestions, courseStatus),
        },
      }));

      return applyOpponentPreparationPolicy(
        {
          ...baseResponse,
          sourceSummary: {
            ...baseResponse.sourceSummary,
            courses: courseStatus,
          },
          candidates: candidatesWithCourse,
        },
        request.candidateLimit,
        request.includeMoveUci?.toLowerCase(),
      );
    },
  };
}

export function applyOpponentPreparationPolicy(
  response: CandidateDecisionResponse,
  candidateLimit = response.candidates.length,
  includedMove?: string,
): CandidateDecisionResponse {
  if (response.decisionRole !== 'OPPONENT_RESPONSE' || response.candidates.length === 0) {
    return response;
  }

  const byMove = new Map(response.candidates.map((candidate) => [candidate.moveUci, candidate]));
  const preparation = rankOpponentPreparationCandidates(
    response.candidates.map(toOpponentPreparationInput),
  );
  const selected = selectBoundedPreparationCandidates(
    preparation.candidates,
    candidateLimit,
    includedMove,
  );

  const candidates = selected.map((prepared) => {
    const candidate = byMove.get(prepared.input.moveUci);
    if (!candidate) throw new Error(`Missing opponent candidate ${prepared.input.moveUci}.`);

    const warningCodes = candidate.warningCodes.filter(
      (warning) => !OPPONENT_IRRELEVANT_WARNING_CODES.has(warning),
    );

    return {
      ...candidate,
      rank: prepared.rank,
      eligibility: {
        status: 'ELIGIBLE' as const,
        reasonCodes: prepared.reasonCodes.slice(0, 8),
        warningCodes: warningCodes.slice(0, 8),
      },
      targetFit: { status: 'UNKNOWN' as const, reasonCodes: [] },
      profileFit: { status: 'UNKNOWN' as const, reasonCodes: [] },
      components: {
        ...candidate.components,
        targetFit: 0,
        profileFit: 0,
      },
      reasonCodes: prepared.reasonCodes.slice(0, 12),
      warningCodes: warningCodes.slice(0, 12),
      coverage: {
        contributionPercent: prepared.coverageContributionPercent,
        cumulativePercent: null,
      },
    } satisfies CandidateDecisionCandidate;
  });

  return candidateDecisionResponseSchema.parse({
    ...response,
    rankingPolicyVersion: preparation.policyVersion,
    returnedCandidateCount: candidates.length,
    omittedLegalMoveCount: Math.max(0, response.legalMoveCount - candidates.length),
    requestedMoveIncluded: Boolean(
      includedMove && candidates.some((candidate) => candidate.moveUci === includedMove),
    ),
    sourceSummary: {
      ...response.sourceSummary,
      opening: candidates.some((candidate) => candidate.evidence.opening.status === 'AVAILABLE')
        ? 'AVAILABLE'
        : 'INSUFFICIENT',
    },
    candidates,
  });
}

function opponentDiscoveryMoves(input: {
  engine: SourceSnapshot<StoredPositionAnalysis | null>;
  masters: SourceSnapshot<OpeningExplorerResponse>;
  population: SourceSnapshot<OpeningExplorerResponse>;
  personal: SourceSnapshot<OpeningAnalysisCoreResponse>;
  courses: SourceSnapshot<CoursePositionSuggestionsResponse>;
  includeMoveUci?: string;
}): string[] {
  const moves = new Set<string>();
  if (input.engine.ok && input.engine.value) {
    for (const line of input.engine.value.lines) addMove(moves, lineMove(line));
  }
  if (input.masters.ok) {
    for (const move of input.masters.value.moves) addMove(moves, move.uci);
  }
  if (input.population.ok) {
    for (const move of input.population.value.moves) addMove(moves, move.uci);
  }
  if (input.personal.ok) {
    for (const move of input.personal.value.nextMoves) addMove(moves, move.moveUci);
  }
  if (input.courses.ok) {
    for (const suggestion of input.courses.value.suggestions) {
      if (!suggestion.isUserMove) addMove(moves, suggestion.moveUci);
    }
  }
  addMove(moves, input.includeMoveUci);
  return [...moves].sort();
}

function opponentCourseEvidence(
  candidate: CandidateDecisionCandidate,
  suggestions: readonly CoursePositionSuggestion[],
  sourceStatus: CandidateEvidenceStatus,
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

  const relevant = suggestions.filter((suggestion) => !suggestion.isUserMove);
  const matches = relevant.filter(
    (suggestion) => suggestion.moveUci.toLowerCase() === candidate.moveUci,
  );
  const resultingKey = safeNormalizedFen(candidate.resultingFen);
  const transposesToCoveredPosition = relevant.some((suggestion) => (
    suggestion.moveUci.toLowerCase() !== candidate.moveUci
      && resultingKey !== null
      && safeNormalizedFen(suggestion.fenAfter) === resultingKey
  ));

  return {
    status: relevant.length ? 'AVAILABLE' : 'INSUFFICIENT',
    covered: matches.length > 0,
    conflict: false,
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

function opponentCourseSourceStatus(
  snapshot: SourceSnapshot<CoursePositionSuggestionsResponse>,
): CandidateEvidenceStatus {
  if (!snapshot.ok) return 'UNAVAILABLE';
  return snapshot.value.suggestions.some((suggestion) => !suggestion.isUserMove)
    ? 'AVAILABLE'
    : 'INSUFFICIENT';
}

function selectBoundedPreparationCandidates<T extends CandidateRankingInput>(
  ranked: readonly OpponentPreparationCandidate<T>[],
  limit: number,
  includedMove: string | undefined,
): OpponentPreparationCandidate<T>[] {
  const selected = ranked.slice(0, limit);
  if (!includedMove || selected.some((entry) => entry.input.moveUci === includedMove)) {
    return selected;
  }
  const manual = ranked.find((entry) => entry.input.moveUci === includedMove);
  if (!manual) return selected;
  if (selected.length < limit) selected.push(manual);
  else selected[selected.length - 1] = manual;
  return selected.sort((left, right) => left.rank - right.rank);
}

function toOpponentPreparationInput(candidate: CandidateDecisionCandidate): CandidateRankingInput {
  return {
    moveUci: candidate.moveUci,
    manuallyRequested: candidate.manuallyRequested,
    engine: {
      status: candidate.evidence.engine.status,
      depth: candidate.evidence.engine.depth,
      mateForTarget: candidate.evidence.engine.mateForTarget,
      objectiveDeltaCp: candidate.evidence.engine.objectiveDeltaCp,
    },
    population: {
      status: candidate.evidence.population.status,
      games: candidate.evidence.population.games,
      frequencyPercent: candidate.evidence.population.frequencyPercent,
      scorePercentForTarget: candidate.evidence.population.scorePercentForTarget,
      positionBaselineScorePercentForTarget:
        candidate.evidence.population.positionBaselineScorePercentForTarget,
    },
    masters: {
      status: candidate.evidence.masters.status,
      games: candidate.evidence.masters.games,
      frequencyPercent: candidate.evidence.masters.frequencyPercent,
      scorePercentForTarget: candidate.evidence.masters.scorePercentForTarget,
      positionBaselineScorePercentForTarget:
        candidate.evidence.masters.positionBaselineScorePercentForTarget,
    },
    personal: {
      status: candidate.evidence.personal.status,
      occurrences: candidate.evidence.personal.occurrences,
      games: candidate.evidence.personal.gameCount,
      scorePercent: candidate.evidence.personal.scorePercent,
    },
    targetFit: 'UNKNOWN',
    targetReasonCodes: [],
    targetWarningCodes: [],
    profileFit: 'UNKNOWN',
    profileReasonCodes: [],
    course: {
      status: candidate.evidence.course.status,
      covered: candidate.evidence.course.covered,
      conflict: candidate.evidence.course.conflict,
      transposesToCoveredPosition: candidate.evidence.course.transposesToCoveredPosition,
    },
  };
}

async function capture<T>(operation: () => Promise<T>): Promise<SourceSnapshot<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    return { ok: false, error };
  }
}

function replay<T>(snapshot: SourceSnapshot<T>): Promise<T> {
  return snapshot.ok ? Promise.resolve(snapshot.value) : Promise.reject(snapshot.error);
}

function addMove(moves: Set<string>, value: string | null | undefined): void {
  const move = value?.trim().toLowerCase();
  if (move) moves.add(move);
}

function lineMove(line: StoredEngineLine): string | null {
  return (line.moveUci ?? line.pvUci[0] ?? '').trim().toLowerCase() || null;
}

function canonicalFenOrInput(inputFen: string): string {
  try {
    return inputFen === 'startpos' ? new Chess().fen() : new Chess(inputFen).fen();
  } catch {
    return inputFen;
  }
}

function safeNormalizedFen(fen: string): string | null {
  try {
    return normalizeFenForPosition(fen);
  } catch {
    return null;
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

export const CandidateDecisionOpponentPreparationService =
  createCandidateDecisionOpponentPreparationService();
