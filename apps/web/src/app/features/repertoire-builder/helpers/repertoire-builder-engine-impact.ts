import type { CandidateDecisionCandidate } from '@chess-trainer/contracts/candidate-decision';
import type { PositionAnalysisCache } from '../../../shared/chess/engine/position-analysis-cache.service';
import type {
  RepertoireBuilderEngineImpact,
  RepertoireBuilderPositionEvaluation,
} from '../state/repertoire-builder.models';

export function storedCandidateEngineImpact(
  candidate: CandidateDecisionCandidate,
  targetSide: 'WHITE' | 'BLACK',
): RepertoireBuilderEngineImpact | null {
  const engine = candidate.evidence.engine;
  if (
    engine.status !== 'AVAILABLE' ||
    (engine.scoreCpForTarget === null && engine.mateForTarget === null)
  ) {
    return null;
  }

  return {
    moveUci: candidate.moveUci,
    status: 'AVAILABLE',
    source: 'STORED',
    persistence: 'STORED',
    depth: engine.depth,
    scoreCpForTarget: engine.scoreCpForTarget,
    mateForTarget: engine.mateForTarget,
    scoreCpWhite: orientTargetScoreToWhite(engine.scoreCpForTarget, targetSide),
    mateWhite: orientTargetScoreToWhite(engine.mateForTarget, targetSide),
    objectiveDeltaCp: engine.objectiveDeltaCp,
    error: null,
  };
}

export function positionEvaluation(
  position: PositionAnalysisCache,
  targetSide: 'WHITE' | 'BLACK',
  browserPersisted = false,
): RepertoireBuilderPositionEvaluation | null {
  const scoreCpWhite = finiteOrNull(position.bestScoreCpWhite);
  const mateWhite = finiteOrNull(position.bestMateWhite);
  if (scoreCpWhite === null && mateWhite === null) return null;

  return {
    source: position.fromCache ? 'STORED' : 'BROWSER',
    persistence: position.fromCache ? 'STORED' : browserPersisted ? 'SAVED' : 'PENDING',
    depth: finiteOrNull(position.lines[0]?.depth),
    scoreCpForTarget: orientWhiteScoreToTarget(scoreCpWhite, targetSide),
    mateForTarget: orientWhiteScoreToTarget(mateWhite, targetSide),
    scoreCpWhite,
    mateWhite,
  };
}

export function candidateImpactFromPosition(
  moveUci: string,
  position: PositionAnalysisCache,
  targetSide: 'WHITE' | 'BLACK',
  browserPersisted = false,
): RepertoireBuilderEngineImpact | null {
  const evaluation = positionEvaluation(position, targetSide, browserPersisted);
  if (!evaluation) return null;
  return {
    moveUci,
    status: 'AVAILABLE',
    ...evaluation,
    objectiveDeltaCp: null,
    error: null,
  };
}

export function withBrowserObjectiveDeltas(
  impacts: Readonly<Record<string, RepertoireBuilderEngineImpact>>,
): Readonly<Record<string, RepertoireBuilderEngineImpact>> {
  const available = Object.values(impacts).filter(
    (impact) => impact.status === 'AVAILABLE' && comparableTargetScore(impact) !== null,
  );
  const comparable = available
    .map(comparableTargetScore)
    .filter((score): score is number => score !== null);
  const safestScore = comparable.length ? Math.max(...comparable) : null;
  if (safestScore === null) return impacts;

  return Object.fromEntries(
    Object.entries(impacts).map(([moveUci, impact]) => {
      if (impact.status !== 'AVAILABLE' || impact.source !== 'BROWSER') return [moveUci, impact];
      const score = comparableTargetScore(impact);
      return [
        moveUci,
        {
          ...impact,
          objectiveDeltaCp:
            score === null ? null : Math.max(0, Math.min(32_767, Math.round(safestScore - score))),
        },
      ];
    }),
  );
}

export function failedCandidateEngineImpact(
  moveUci: string,
  error: string,
): RepertoireBuilderEngineImpact {
  return {
    moveUci,
    status: 'FAILED',
    source: null,
    persistence: null,
    depth: null,
    scoreCpForTarget: null,
    mateForTarget: null,
    scoreCpWhite: null,
    mateWhite: null,
    objectiveDeltaCp: null,
    error,
  };
}

export function pendingCandidateEngineImpact(
  moveUci: string,
  status: 'QUEUED' | 'ANALYZING' = 'QUEUED',
): RepertoireBuilderEngineImpact {
  return {
    moveUci,
    status,
    source: null,
    persistence: null,
    depth: null,
    scoreCpForTarget: null,
    mateForTarget: null,
    scoreCpWhite: null,
    mateWhite: null,
    objectiveDeltaCp: null,
    error: null,
  };
}

function comparableTargetScore(impact: RepertoireBuilderEngineImpact): number | null {
  if (impact.mateForTarget !== null) {
    return impact.mateForTarget >= 0
      ? 10_000 - Math.abs(impact.mateForTarget)
      : -10_000 + Math.abs(impact.mateForTarget);
  }
  return impact.scoreCpForTarget;
}

function orientTargetScoreToWhite(
  value: number | null,
  targetSide: 'WHITE' | 'BLACK',
): number | null {
  return value === null ? null : targetSide === 'WHITE' ? value : -value;
}

function orientWhiteScoreToTarget(
  value: number | null,
  targetSide: 'WHITE' | 'BLACK',
): number | null {
  return orientTargetScoreToWhite(value, targetSide);
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
