import type {
  CandidateDecisionCandidate,
  CandidateDecisionRequest,
  CandidateDecisionResponse,
  CandidateWarningCode,
} from '@chess-trainer/contracts/candidate-decision';
import {
  rankOpponentPreparationCandidates,
  type CandidateRankingInput,
} from 'chess-domain';
import { CandidateDecisionService } from './candidate-decision.service';

const OPPONENT_IRRELEVANT_WARNING_CODES = new Set<CandidateWarningCode>([
  'TARGET_SOUNDNESS_MISMATCH',
  'THEORY_BUDGET_EXCEEDED',
]);

export const CandidateDecisionOpponentPreparationService = {
  async get(userId: number, request: CandidateDecisionRequest): Promise<CandidateDecisionResponse> {
    const response = await CandidateDecisionService.get(userId, request);
    return applyOpponentPreparationPolicy(response);
  },
};

export function applyOpponentPreparationPolicy(
  response: CandidateDecisionResponse,
): CandidateDecisionResponse {
  if (response.decisionRole !== 'OPPONENT_RESPONSE' || response.candidates.length === 0) {
    return response;
  }

  const byMove = new Map(response.candidates.map((candidate) => [candidate.moveUci, candidate]));
  const preparation = rankOpponentPreparationCandidates(
    response.candidates.map(toOpponentPreparationInput),
  );

  const candidates = preparation.candidates.map((prepared) => {
    const candidate = byMove.get(prepared.input.moveUci);
    if (!candidate) throw new Error(`Missing opponent candidate ${prepared.input.moveUci}.`);

    const warningCodes = candidate.warningCodes.filter(
      (warning) => !OPPONENT_IRRELEVANT_WARNING_CODES.has(warning),
    );

    return {
      ...candidate,
      rank: prepared.rank,
      eligibility: {
        ...candidate.eligibility,
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

  return {
    ...response,
    candidates,
  };
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
