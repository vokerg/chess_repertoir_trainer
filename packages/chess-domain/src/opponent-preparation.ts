import type {
  CandidateRankingInput,
  CandidateRankingReasonCode,
} from './candidate-ranking';

export const OPPONENT_PREPARATION_POLICY_VERSION = '2026-08-opponent-preparation-v1' as const;

const MIN_POPULATION_GAMES = 20;
const MIN_ABSOLUTE_POPULATION_FREQUENCY_PERCENT = 3;
const RELATIVE_POPULATION_FREQUENCY_FACTOR = 0.2;
const MIN_PERSONAL_ENCOUNTERS = 3;
const DANGEROUS_RESPONSE_DELTA_CP = 100;

export type OpponentPreparationRecommendation = 'RECOMMENDED' | 'OPTIONAL';

export interface OpponentPreparationCandidate<T extends CandidateRankingInput = CandidateRankingInput> {
  input: T;
  rank: number;
  recommendation: OpponentPreparationRecommendation;
  reasonCodes: CandidateRankingReasonCode[];
  coverageContributionPercent: number | null;
}

export interface OpponentPreparationResult<T extends CandidateRankingInput = CandidateRankingInput> {
  policyVersion: typeof OPPONENT_PREPARATION_POLICY_VERSION;
  candidates: OpponentPreparationCandidate<T>[];
}

/**
 * Ranks opponent replies by preparation relevance without using persona, target fit,
 * profile fit, opening character, or theory burden.
 *
 * The recommended set is evidence-triggered rather than coverage-target-driven:
 * - meaningful target-population frequency relative to the most common reply;
 * - repeated exact-position personal encounters;
 * - objective danger to the repertoire side.
 *
 * Existing course state remains visible as context and a stable tie-breaker, but it
 * does not by itself make an otherwise irrelevant reply recommended.
 */
export function rankOpponentPreparationCandidates<T extends CandidateRankingInput>(
  inputs: readonly T[],
): OpponentPreparationResult<T> {
  const strongestPopulationFrequency = inputs.reduce((maximum, input) => {
    if (!hasUsablePopulation(input)) return maximum;
    return Math.max(maximum, input.population.frequencyPercent ?? 0);
  }, 0);
  const relativeFrequencyFloor = strongestPopulationFrequency * RELATIVE_POPULATION_FREQUENCY_FACTOR;

  const candidates = inputs.map((input) => {
    const populationRelevant = hasUsablePopulation(input)
      && (input.population.frequencyPercent ?? 0) >= Math.max(
        MIN_ABSOLUTE_POPULATION_FREQUENCY_PERCENT,
        relativeFrequencyFloor,
      );
    const personallyEncountered = hasPersonalEncounterEvidence(input)
      && Math.max(input.personal.games, input.personal.occurrences) >= MIN_PERSONAL_ENCOUNTERS;
    const dangerous = hasUsableEngineEvidence(input)
      && (
        (input.engine.mateForTarget !== null && input.engine.mateForTarget < 0)
        || (input.engine.objectiveDeltaCp ?? 0) >= DANGEROUS_RESPONSE_DELTA_CP
      );

    const reasonCodes: CandidateRankingReasonCode[] = [];
    if (populationRelevant) reasonCodes.push('COMMON_AT_TARGET_LEVEL');
    if (personallyEncountered) reasonCodes.push('PERSONALLY_ENCOUNTERED');
    if (dangerous) reasonCodes.push('DANGEROUS_RESPONSE');
    if (input.course.covered) reasonCodes.push('COURSE_ALREADY_COVERS');
    if (input.course.transposesToCoveredPosition) reasonCodes.push('TRANSPOSES_TO_COVERAGE');
    if (input.course.conflict) reasonCodes.push('COURSE_CONFLICT');
    if (input.manuallyRequested) reasonCodes.push('MANUAL_CANDIDATE');

    const recommendation: OpponentPreparationRecommendation = populationRelevant
      || personallyEncountered
      || dangerous
      ? 'RECOMMENDED'
      : 'OPTIONAL';

    return {
      input,
      recommendation,
      reasonCodes,
      coverageContributionPercent: hasUsablePopulation(input)
        ? roundMetric(input.population.frequencyPercent ?? 0)
        : null,
      score: preparationPriorityScore(input, { populationRelevant, personallyEncountered, dangerous }),
    };
  });

  candidates.sort((left, right) => (
    recommendationOrder(left.recommendation) - recommendationOrder(right.recommendation)
      || right.score - left.score
      || left.input.moveUci.localeCompare(right.input.moveUci)
  ));

  return {
    policyVersion: OPPONENT_PREPARATION_POLICY_VERSION,
    candidates: candidates.map(({ score: _score, ...candidate }, index) => ({
      ...candidate,
      rank: index + 1,
    })),
  };
}

/**
 * Presentation helper for already-ranked API candidates. It intentionally consumes
 * only the domain policy reason codes so clients do not recreate recommendation math.
 */
export function isOpponentPreparationRecommended(
  reasonCodes: readonly CandidateRankingReasonCode[],
): boolean {
  return reasonCodes.includes('COMMON_AT_TARGET_LEVEL')
    || reasonCodes.includes('PERSONALLY_ENCOUNTERED')
    || reasonCodes.includes('DANGEROUS_RESPONSE');
}

/**
 * Computes target-population coverage from the replies the user has actually selected.
 * Missing/unusable population evidence is excluded rather than guessed.
 */
export function selectedOpponentCoveragePercent<T extends CandidateRankingInput>(
  candidates: readonly OpponentPreparationCandidate<T>[],
  selectedMoveUcis: ReadonlySet<string>,
): number | null {
  let hasCoverageEvidence = false;
  let total = 0;

  for (const candidate of candidates) {
    if (!selectedMoveUcis.has(candidate.input.moveUci)) continue;
    if (candidate.coverageContributionPercent === null) continue;
    hasCoverageEvidence = true;
    total += candidate.coverageContributionPercent;
  }

  return hasCoverageEvidence ? roundMetric(Math.min(100, total)) : null;
}

function preparationPriorityScore(
  input: CandidateRankingInput,
  signals: {
    populationRelevant: boolean;
    personallyEncountered: boolean;
    dangerous: boolean;
  },
): number {
  const population = signals.populationRelevant ? input.population.frequencyPercent ?? 0 : 0;
  const personal = signals.personallyEncountered
    ? Math.min(20, Math.max(input.personal.games, input.personal.occurrences))
    : 0;
  const danger = signals.dangerous
    ? input.engine.mateForTarget !== null && input.engine.mateForTarget < 0
      ? 100
      : Math.min(100, Math.max(0, input.engine.objectiveDeltaCp ?? 0) / 3)
    : 0;
  const course = input.course.conflict ? 8 : input.course.covered ? 2 : 0;

  return population * 10 + personal * 4 + danger * 2 + course;
}

function hasUsablePopulation(input: CandidateRankingInput): boolean {
  return (input.population.status === 'AVAILABLE' || input.population.status === 'STALE')
    && input.population.games >= MIN_POPULATION_GAMES
    && input.population.frequencyPercent !== null;
}

function hasPersonalEncounterEvidence(input: CandidateRankingInput): boolean {
  return input.personal.status === 'AVAILABLE'
    || input.personal.status === 'STALE'
    || input.personal.status === 'INSUFFICIENT';
}

function hasUsableEngineEvidence(input: CandidateRankingInput): boolean {
  return (input.engine.status === 'AVAILABLE' || input.engine.status === 'STALE')
    && (input.engine.objectiveDeltaCp !== null || input.engine.mateForTarget !== null);
}

function recommendationOrder(value: OpponentPreparationRecommendation): number {
  return value === 'RECOMMENDED' ? 0 : 1;
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}
