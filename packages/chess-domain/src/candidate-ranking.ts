export type CandidateRankingRole = 'USER_MOVE' | 'OPPONENT_RESPONSE';
export type CandidateRankingSpeedPreset = 'ALL' | 'BLITZ_AND_SLOWER' | 'BLITZ' | 'BULLET';
export type CandidateRankingRiskTolerance = 'LOW' | 'MEDIUM' | 'HIGH';
export type CandidateRankingPersona = 'BALANCED' | 'SOLID' | 'AGGRESSIVE' | 'SURPRISE' | 'CUSTOM';
export type CandidateRankingFit = 'ALIGNED' | 'NEUTRAL' | 'CONFLICT' | 'UNKNOWN';
export type CandidateRankingEvidenceStatus = 'AVAILABLE' | 'STALE' | 'INSUFFICIENT' | 'UNAVAILABLE';
export type CandidateRankingEligibility = 'ELIGIBLE' | 'WARNING' | 'EXCLUDED';

export type CandidateRankingReasonCode =
  | 'ENGINE_BEST'
  | 'ENGINE_CLOSE'
  | 'OBJECTIVE_COST'
  | 'POPULATION_COMMON'
  | 'POPULATION_STRONG_SCORE'
  | 'MASTER_SUPPORTED'
  | 'PERSONALLY_FAMILIAR'
  | 'PERSONAL_RESULTS_POSITIVE'
  | 'TARGET_CHARACTER_MATCH'
  | 'TARGET_THEORY_MATCH'
  | 'TARGET_SOUNDNESS_CONFLICT'
  | 'TARGET_THEORY_EXCEEDED'
  | 'PROFILE_PREFERENCE_MATCH'
  | 'PROFILE_PERFORMANCE_SUPPORT'
  | 'PROFILE_PERFORMANCE_WARNING'
  | 'COURSE_ALREADY_COVERS'
  | 'COURSE_CONFLICT'
  | 'TRANSPOSES_TO_COVERAGE'
  | 'COMMON_AT_TARGET_LEVEL'
  | 'PERSONALLY_ENCOUNTERED'
  | 'DANGEROUS_RESPONSE'
  | 'LOW_EVIDENCE'
  | 'MANUAL_CANDIDATE';

export type CandidateRankingWarningCode =
  | 'FORCED_MATE_AGAINST_TARGET'
  | 'OBJECTIVE_LOSS'
  | 'OBJECTIVE_EVIDENCE_MISSING'
  | 'LOW_ENGINE_DEPTH'
  | 'TARGET_SOUNDNESS_MISMATCH'
  | 'THEORY_BUDGET_EXCEEDED'
  | 'SPARSE_PERSONAL_EVIDENCE'
  | 'COURSE_CONFLICT'
  | 'SOURCE_UNAVAILABLE';

export interface CandidateRankingCorpusInput {
  status: CandidateRankingEvidenceStatus;
  games: number;
  frequencyPercent: number | null;
  scorePercentForTarget: number | null;
  positionBaselineScorePercentForTarget?: number | null;
}

export interface CandidateRankingPersonalInput {
  status: CandidateRankingEvidenceStatus;
  occurrences: number;
  games: number;
  scorePercent: number | null;
}

export interface CandidateRankingInput {
  moveUci: string;
  manuallyRequested: boolean;
  engine: {
    status: CandidateRankingEvidenceStatus;
    depth: number | null;
    mateForTarget: number | null;
    objectiveDeltaCp: number | null;
  };
  population: CandidateRankingCorpusInput;
  masters: CandidateRankingCorpusInput;
  personal: CandidateRankingPersonalInput;
  targetFit: CandidateRankingFit;
  targetReasonCodes: readonly CandidateRankingReasonCode[];
  targetWarningCodes: readonly CandidateRankingWarningCode[];
  profileFit: CandidateRankingFit;
  profileReasonCodes: readonly CandidateRankingReasonCode[];
  course: {
    status: CandidateRankingEvidenceStatus;
    covered: boolean;
    conflict: boolean;
    transposesToCoveredPosition: boolean;
  };
}

export interface CandidateRankingContext {
  role: CandidateRankingRole;
  speedPreset: CandidateRankingSpeedPreset;
  riskTolerance: CandidateRankingRiskTolerance;
  allowDeliberatelyDubious: boolean;
  persona?: CandidateRankingPersona;
}

export interface CandidateRankingComponents {
  objective: number;
  population: number;
  masters: number;
  personal: number;
  targetFit: number;
  profileFit: number;
  course: number;
}

export interface RankedCandidate<T extends CandidateRankingInput = CandidateRankingInput> {
  input: T;
  rank: number;
  eligibility: CandidateRankingEligibility;
  components: CandidateRankingComponents;
  reasonCodes: CandidateRankingReasonCode[];
  warningCodes: CandidateRankingWarningCode[];
  coverageContributionPercent: number | null;
  cumulativeCoveragePercent: number | null;
}

interface Weights {
  objective: number;
  population: number;
  masters: number;
  personal: number;
  targetFit: number;
  profileFit: number;
  course: number;
}

const EMPIRICAL_POPULATION_MIN_GAMES = 20;
const EMPIRICAL_MASTERS_MIN_GAMES = 10;

const LEGACY_USER_WEIGHTS: Record<CandidateRankingSpeedPreset, Weights> = {
  ALL: { objective: 0.35, population: 0.20, masters: 0.15, personal: 0.10, targetFit: 0.12, profileFit: 0.03, course: 0.05 },
  BLITZ_AND_SLOWER: { objective: 0.40, population: 0.18, masters: 0.17, personal: 0.08, targetFit: 0.12, profileFit: 0.02, course: 0.03 },
  BLITZ: { objective: 0.30, population: 0.25, masters: 0.10, personal: 0.12, targetFit: 0.13, profileFit: 0.04, course: 0.06 },
  BULLET: { objective: 0.20, population: 0.35, masters: 0.05, personal: 0.18, targetFit: 0.12, profileFit: 0.05, course: 0.05 },
};

const OPPONENT_WEIGHTS: Weights = {
  objective: 0.20,
  population: 0.45,
  masters: 0.05,
  personal: 0.20,
  targetFit: 0,
  profileFit: 0,
  course: 0.10,
};

export function rankCandidateEvidence<T extends CandidateRankingInput>(
  inputs: readonly T[],
  context: CandidateRankingContext,
): RankedCandidate<T>[] {
  const persona = context.persona ?? 'CUSTOM';
  const ranked = inputs.map((input) => {
    const components = buildComponents(input, context.role, persona);
    const eligibility = resolveEligibility(input, context, persona);
    const reasonCodes = buildReasonCodes(input, context.role, persona);
    const warningCodes = buildWarningCodes(input, context, persona, eligibility);
    const score = context.role === 'USER_MOVE'
      ? userMoveScore(input, components, context, persona)
      : weightedScore(components, OPPONENT_WEIGHTS);
    return { input, eligibility, components, reasonCodes, warningCodes, score };
  });

  ranked.sort((left, right) => (
    eligibilityOrder(left.eligibility) - eligibilityOrder(right.eligibility)
      || right.score - left.score
      || left.input.moveUci.localeCompare(right.input.moveUci)
  ));

  let cumulativeCoverage = 0;
  return ranked.map((entry, index) => {
    const contribution = context.role === 'OPPONENT_RESPONSE'
      && entry.input.population.status !== 'UNAVAILABLE'
      ? entry.input.population.frequencyPercent
      : null;
    if (contribution !== null) cumulativeCoverage = Math.min(100, cumulativeCoverage + contribution);
    return {
      input: entry.input,
      rank: index + 1,
      eligibility: entry.eligibility,
      components: entry.components,
      reasonCodes: entry.reasonCodes,
      warningCodes: entry.warningCodes,
      coverageContributionPercent: contribution === null ? null : roundMetric(contribution),
      cumulativeCoveragePercent: contribution === null ? null : roundMetric(cumulativeCoverage),
    };
  });
}

function buildComponents(
  input: CandidateRankingInput,
  role: CandidateRankingRole,
  persona: CandidateRankingPersona,
): CandidateRankingComponents {
  const empiricalUserMove = role === 'USER_MOVE' && persona !== 'CUSTOM';
  return {
    objective: empiricalUserMove && !hasUsableEngineEvidence(input.engine)
      ? 0
      : objectiveComponent(input.engine, role),
    population: empiricalUserMove
      ? empiricalCorpusComponent(input.population, EMPIRICAL_POPULATION_MIN_GAMES)
      : legacyCorpusComponent(input.population),
    masters: empiricalUserMove
      ? empiricalCorpusComponent(input.masters, EMPIRICAL_MASTERS_MIN_GAMES)
      : legacyCorpusComponent(input.masters),
    personal: personalComponent(input.personal),
    targetFit: fitComponent(input.targetFit, 40, -50),
    profileFit: fitComponent(input.profileFit, 25, -25),
    course: courseComponent(input.course),
  };
}

function userMoveScore(
  input: CandidateRankingInput,
  components: CandidateRankingComponents,
  context: CandidateRankingContext,
  persona: CandidateRankingPersona,
): number {
  if (persona === 'CUSTOM') {
    return weightedScore(components, LEGACY_USER_WEIGHTS[context.speedPreset]);
  }

  const populationFrequency = corpusFrequencySignal(input.population, EMPIRICAL_POPULATION_MIN_GAMES);
  const populationPerformance = corpusPerformanceSignal(input.population, EMPIRICAL_POPULATION_MIN_GAMES);
  const masterSupport = masterSupportSignal(input.masters);
  const objective = components.objective;

  if (persona === 'BALANCED') {
    return Math.round(
      populationFrequency * 0.35
      + populationPerformance * 0.30
      + objective * 0.20
      + masterSupport * 0.15,
    );
  }

  if (persona === 'SOLID') {
    return Math.round(
      populationFrequency * 0.15
      + populationPerformance * 0.10
      + objective * 0.40
      + masterSupport * 0.35,
    );
  }

  if (persona === 'AGGRESSIVE') {
    return Math.round(
      populationFrequency * 0.10
      + populationPerformance * 0.55
      + objective * 0.15
      + masterSupport * 0.20,
    );
  }

  const populationScoreDelta = hasUsableCorpus(input.population, EMPIRICAL_POPULATION_MIN_GAMES)
    ? corpusScoreDelta(input.population)
    : null;
  const surpriseQualified = populationScoreDelta !== null && populationScoreDelta >= 3;
  const populationRarity = surpriseQualified
    ? corpusRaritySignal(input.population, 5, EMPIRICAL_POPULATION_MIN_GAMES)
    : 0;
  const masterRarity = surpriseQualified
    ? corpusRaritySignal(input.masters, 6, EMPIRICAL_MASTERS_MIN_GAMES)
    : 0;
  return Math.round(
    populationRarity * 0.30
    + populationPerformance * 0.35
    + objective * 0.20
    + masterRarity * 0.15,
  );
}

function objectiveComponent(
  engine: CandidateRankingInput['engine'],
  role: CandidateRankingRole,
): number {
  if (engine.status === 'UNAVAILABLE' || engine.objectiveDeltaCp === null) return 0;
  if (engine.mateForTarget !== null && engine.mateForTarget < 0) {
    return role === 'USER_MOVE' ? -100 : 100;
  }
  const delta = Math.max(0, engine.objectiveDeltaCp);
  if (role === 'OPPONENT_RESPONSE') return clamp(Math.round(delta / 3), 0, 100);
  if (delta === 0) return 100;
  if (delta <= 40) return 90;
  if (delta <= 100) return 60;
  if (delta <= 200) return 20;
  if (delta <= 350) return -40;
  return -100;
}

function empiricalCorpusComponent(
  input: CandidateRankingCorpusInput,
  minimumGames: number,
): number {
  if (!hasUsableCorpus(input, minimumGames) || input.frequencyPercent === null) return 0;
  const frequency = corpusFrequencySignal(input, minimumGames);
  const performance = corpusPerformanceSignal(input, minimumGames);
  return clamp(Math.round(frequency * 0.6 + performance * 0.4), -100, 100);
}

function legacyCorpusComponent(input: CandidateRankingCorpusInput): number {
  if (input.status === 'UNAVAILABLE' || input.games <= 0 || input.frequencyPercent === null) return 0;
  const scoreAdjustment = input.scorePercentForTarget === null
    ? 0
    : clamp(Math.round((input.scorePercentForTarget - 50) * 1.5), -30, 30);
  return clamp(Math.round(input.frequencyPercent) + scoreAdjustment, -100, 100);
}

function corpusFrequencySignal(
  input: CandidateRankingCorpusInput,
  minimumGames = 1,
): number {
  if (!hasUsableCorpus(input, minimumGames) || input.frequencyPercent === null) return 0;
  return clamp(Math.round(input.frequencyPercent * 2), 0, 100);
}

function corpusPerformanceSignal(
  input: CandidateRankingCorpusInput,
  minimumGames = 1,
): number {
  const delta = corpusScoreDelta(input);
  if (delta === null || !hasUsableCorpus(input, minimumGames)) return 0;
  const reliability = input.games / (input.games + 30);
  return clamp(Math.round(delta * reliability * 10), -100, 100);
}

function masterSupportSignal(input: CandidateRankingCorpusInput): number {
  if (!hasUsableCorpus(input, EMPIRICAL_MASTERS_MIN_GAMES)) return 0;
  return clamp(Math.round(
    corpusFrequencySignal(input, EMPIRICAL_MASTERS_MIN_GAMES) * 0.75
    + corpusPerformanceSignal(input, EMPIRICAL_MASTERS_MIN_GAMES) * 0.25,
  ), -100, 100);
}

function corpusRaritySignal(
  input: CandidateRankingCorpusInput,
  frequencyScale: number,
  minimumGames = 1,
): number {
  if (!hasUsableCorpus(input, minimumGames) || input.frequencyPercent === null) return 0;
  return clamp(Math.round(100 - input.frequencyPercent * frequencyScale), 0, 100);
}

function corpusScoreDelta(input: CandidateRankingCorpusInput): number | null {
  if (input.scorePercentForTarget === null) return null;
  const baseline = input.positionBaselineScorePercentForTarget;
  if (baseline === undefined || baseline === null) return null;
  return input.scorePercentForTarget - baseline;
}

function hasUsableCorpus(input: CandidateRankingCorpusInput, minimumGames = 1): boolean {
  return (input.status === 'AVAILABLE' || input.status === 'STALE') && input.games >= minimumGames;
}

function hasUsableEngineEvidence(input: CandidateRankingInput['engine']): boolean {
  return (input.status === 'AVAILABLE' || input.status === 'STALE')
    && input.objectiveDeltaCp !== null;
}

function personalComponent(input: CandidateRankingPersonalInput): number {
  if (input.status === 'UNAVAILABLE' || (input.games < 3 && input.occurrences < 3)) return 0;
  const familiarity = clamp(input.games * 4 + input.occurrences * 2, 0, 70);
  const scoreAdjustment = input.scorePercent === null
    ? 0
    : clamp(Math.round((input.scorePercent - 50) * 1.2), -30, 30);
  return clamp(familiarity + scoreAdjustment, -100, 100);
}

function fitComponent(fit: CandidateRankingFit, aligned: number, conflict: number): number {
  if (fit === 'ALIGNED') return aligned;
  if (fit === 'CONFLICT') return conflict;
  return 0;
}

function courseComponent(input: CandidateRankingInput['course']): number {
  if (input.covered) return 40;
  if (input.transposesToCoveredPosition) return 20;
  if (input.conflict) return -30;
  return 0;
}

function resolveEligibility(
  input: CandidateRankingInput,
  context: CandidateRankingContext,
  persona: CandidateRankingPersona,
): CandidateRankingEligibility {
  if (context.role === 'OPPONENT_RESPONSE') return 'ELIGIBLE';
  const empiricalUserMove = persona !== 'CUSTOM';
  if (empiricalUserMove && !hasUsableEngineEvidence(input.engine)) return 'WARNING';
  if (input.engine.mateForTarget !== null && input.engine.mateForTarget < 0) return 'EXCLUDED';

  const delta = input.engine.objectiveDeltaCp;
  if (delta === null) {
    return input.targetFit === 'CONFLICT' || input.course.conflict ? 'WARNING' : 'ELIGIBLE';
  }

  const thresholds = riskThresholds(context, persona);
  if (delta >= thresholds.exclude) return 'EXCLUDED';
  if (delta >= thresholds.warn || input.targetFit === 'CONFLICT' || input.course.conflict) return 'WARNING';
  return 'ELIGIBLE';
}

function riskThresholds(
  context: CandidateRankingContext,
  persona: CandidateRankingPersona,
): { warn: number; exclude: number } {
  if (persona === 'SOLID') return { warn: 80, exclude: 180 };
  if (persona === 'BALANCED') return { warn: 120, exclude: 280 };
  if (persona === 'AGGRESSIVE') return { warn: 180, exclude: 380 };
  if (persona === 'SURPRISE') return { warn: 120, exclude: 260 };
  if (context.allowDeliberatelyDubious) return { warn: 250, exclude: 700 };
  if (context.riskTolerance === 'LOW') return { warn: 80, exclude: 180 };
  if (context.riskTolerance === 'HIGH') return { warn: 220, exclude: 450 };
  return { warn: 140, exclude: 300 };
}

function buildReasonCodes(
  input: CandidateRankingInput,
  role: CandidateRankingRole,
  persona: CandidateRankingPersona,
): CandidateRankingReasonCode[] {
  const reasons = new Set<CandidateRankingReasonCode>();
  const empiricalUserMove = role === 'USER_MOVE' && persona !== 'CUSTOM';
  const delta = empiricalUserMove && !hasUsableEngineEvidence(input.engine)
    ? null
    : input.engine.objectiveDeltaCp;
  if (delta === 0) reasons.add('ENGINE_BEST');
  else if (delta !== null && delta <= 50) reasons.add('ENGINE_CLOSE');
  else if (delta !== null && delta >= 100) reasons.add('OBJECTIVE_COST');

  const usablePopulation = !empiricalUserMove
    || hasUsableCorpus(input.population, EMPIRICAL_POPULATION_MIN_GAMES);
  if (usablePopulation && (input.population.frequencyPercent ?? 0) >= 10 && input.population.games >= 20) {
    reasons.add(role === 'OPPONENT_RESPONSE' ? 'COMMON_AT_TARGET_LEVEL' : 'POPULATION_COMMON');
  }
  const populationStrong = empiricalUserMove
    ? hasUsableCorpus(input.population, EMPIRICAL_POPULATION_MIN_GAMES)
      && (corpusScoreDelta(input.population) ?? Number.NEGATIVE_INFINITY) >= 3
    : (input.population.scorePercentForTarget ?? 0) >= 55;
  if (populationStrong && input.population.games >= 20) {
    reasons.add('POPULATION_STRONG_SCORE');
  }
  const masterSupported = empiricalUserMove
    ? hasUsableCorpus(input.masters, EMPIRICAL_MASTERS_MIN_GAMES)
    : input.masters.games >= 10;
  if (masterSupported) reasons.add('MASTER_SUPPORTED');
  if (input.personal.games >= 3 || input.personal.occurrences >= 3) {
    reasons.add(role === 'OPPONENT_RESPONSE' ? 'PERSONALLY_ENCOUNTERED' : 'PERSONALLY_FAMILIAR');
  }
  if ((input.personal.scorePercent ?? 0) >= 55 && input.personal.games >= 5) {
    reasons.add('PERSONAL_RESULTS_POSITIVE');
  }
  for (const reason of input.targetReasonCodes) reasons.add(reason);
  for (const reason of input.profileReasonCodes) reasons.add(reason);
  if (input.course.covered) reasons.add('COURSE_ALREADY_COVERS');
  if (input.course.conflict) reasons.add('COURSE_CONFLICT');
  if (input.course.transposesToCoveredPosition) reasons.add('TRANSPOSES_TO_COVERAGE');
  if (role === 'OPPONENT_RESPONSE' && (delta ?? 0) >= 100) reasons.add('DANGEROUS_RESPONSE');
  if (input.manuallyRequested) reasons.add('MANUAL_CANDIDATE');

  const sourceCount = [input.engine, input.population, input.masters, input.personal]
    .filter((source) => source.status === 'AVAILABLE' || source.status === 'STALE').length;
  if (sourceCount <= 1) reasons.add('LOW_EVIDENCE');
  return [...reasons];
}

function buildWarningCodes(
  input: CandidateRankingInput,
  context: CandidateRankingContext,
  persona: CandidateRankingPersona,
  eligibility: CandidateRankingEligibility,
): CandidateRankingWarningCode[] {
  const warnings = new Set<CandidateRankingWarningCode>(input.targetWarningCodes);
  const empiricalUserMove = context.role === 'USER_MOVE' && persona !== 'CUSTOM';
  const usableEngine = hasUsableEngineEvidence(input.engine);
  if (input.engine.mateForTarget !== null
    && input.engine.mateForTarget < 0
    && (!empiricalUserMove || usableEngine)) {
    warnings.add('FORCED_MATE_AGAINST_TARGET');
  } else if (context.role === 'USER_MOVE'
    && eligibility !== 'ELIGIBLE'
    && (persona === 'CUSTOM'
      || (usableEngine
        && input.engine.objectiveDeltaCp !== null
        && input.engine.objectiveDeltaCp >= riskThresholds(context, persona).warn))) {
    warnings.add('OBJECTIVE_LOSS');
  }
  if (empiricalUserMove && !usableEngine) {
    warnings.add('OBJECTIVE_EVIDENCE_MISSING');
  }
  if (input.engine.depth !== null && input.engine.depth < 12) warnings.add('LOW_ENGINE_DEPTH');
  if (input.personal.status === 'INSUFFICIENT' && (input.personal.games > 0 || input.personal.occurrences > 0)) {
    warnings.add('SPARSE_PERSONAL_EVIDENCE');
  }
  if (input.course.conflict) warnings.add('COURSE_CONFLICT');
  if ([input.engine, input.population, input.masters].every((source) => source.status === 'UNAVAILABLE')) {
    warnings.add('SOURCE_UNAVAILABLE');
  }
  return [...warnings];
}

function weightedScore(components: CandidateRankingComponents, weights: Weights): number {
  return Math.round(
    components.objective * weights.objective
      + components.population * weights.population
      + components.masters * weights.masters
      + components.personal * weights.personal
      + components.targetFit * weights.targetFit
      + components.profileFit * weights.profileFit
      + components.course * weights.course,
  );
}

function eligibilityOrder(value: CandidateRankingEligibility): number {
  if (value === 'ELIGIBLE') return 0;
  if (value === 'WARNING') return 1;
  return 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value: number): number {
  return Math.round(value * 10) / 10;
}
