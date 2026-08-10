export const PERSONAL_MOVE_EVIDENCE_POLICY_VERSION = '2026-08-personal-move-v1' as const;

const MIN_FAMILIAR_GAMES = 5;
const COMMON_MOVE_SHARE_PERCENT = 20;
const MIN_RESULT_CONTEXT_GAMES = 10;
const RESULT_CONTEXT_DELTA_PERCENT = 5;

export type PersonalMoveFamiliarity = 'COMMON' | 'RARE' | 'NEW';
export type PersonalMoveResultContext = 'ABOVE_BASELINE' | 'BELOW_BASELINE' | 'NEUTRAL' | 'INSUFFICIENT';

export interface PersonalMoveEvidenceClassificationInput {
  games: number;
  resultGames: number;
  moveSharePercent: number | null;
  scoreDeltaVsPositionPercent: number | null;
}

export interface PersonalMoveEvidenceClassification {
  policyVersion: typeof PERSONAL_MOVE_EVIDENCE_POLICY_VERSION;
  familiarity: PersonalMoveFamiliarity;
  resultContext: PersonalMoveResultContext;
  resultSampleQualified: boolean;
}

/**
 * Classifies factual exact-position personal evidence for presentation only.
 *
 * Familiarity requires the same five-game minimum already used by Player Chess
 * Profile evidence before a high share can be called established. A 20% share
 * of the user's move choices from the exact position means no more than five
 * moves can simultaneously qualify as common, while smaller or sparse samples
 * remain factual `RARE` rather than being promoted by percentage alone.
 *
 * Result context deliberately reuses the existing Player Chess Profile
 * conclusion boundary: at least ten games with known results and a +/-5
 * percentage-point delta versus the relevant baseline. It has no
 * candidate-ranking authority.
 */
export function classifyPersonalMoveEvidence(
  input: PersonalMoveEvidenceClassificationInput,
): PersonalMoveEvidenceClassification {
  const games = Math.max(0, Math.trunc(input.games));
  const resultGames = Math.min(games, Math.max(0, Math.trunc(input.resultGames)));
  const moveSharePercent = finiteMetric(input.moveSharePercent);
  const scoreDelta = finiteMetric(input.scoreDeltaVsPositionPercent);

  const familiarity: PersonalMoveFamiliarity = games === 0
    ? 'NEW'
    : games >= MIN_FAMILIAR_GAMES
      && moveSharePercent !== null
      && moveSharePercent >= COMMON_MOVE_SHARE_PERCENT
      ? 'COMMON'
      : 'RARE';

  const resultSampleQualified = resultGames >= MIN_RESULT_CONTEXT_GAMES && scoreDelta !== null;
  let resultContext: PersonalMoveResultContext = 'INSUFFICIENT';
  if (resultSampleQualified) {
    if (scoreDelta >= RESULT_CONTEXT_DELTA_PERCENT) resultContext = 'ABOVE_BASELINE';
    else if (scoreDelta <= -RESULT_CONTEXT_DELTA_PERCENT) resultContext = 'BELOW_BASELINE';
    else resultContext = 'NEUTRAL';
  }

  return {
    policyVersion: PERSONAL_MOVE_EVIDENCE_POLICY_VERSION,
    familiarity,
    resultContext,
    resultSampleQualified,
  };
}

function finiteMetric(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}
