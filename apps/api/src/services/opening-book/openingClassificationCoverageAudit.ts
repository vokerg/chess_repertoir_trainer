import type {
  OpeningClassificationResult,
  OpeningSideClassification,
} from './openingClassification.types';

export type OpeningClassificationDimension =
  | 'soundness'
  | 'character'
  | 'theoreticalStatus'
  | 'theoryBurden'
  | 'roles';

export interface OpeningClassificationCoverageObservation {
  name: string;
  weight: number;
  classification: OpeningClassificationResult;
}

type DimensionCounts = Record<OpeningClassificationDimension, number>;
type ConfidenceCounts = Record<'HIGH' | 'MEDIUM' | 'LOW', number>;

type MutableSideSummary = {
  complete: number;
  fullySpecifiedHighConfidence: number;
  unknown: DimensionCounts;
  confidence: ConfidenceCounts;
};

const DIMENSIONS: readonly OpeningClassificationDimension[] = [
  'soundness',
  'character',
  'theoreticalStatus',
  'theoryBurden',
  'roles',
];

export function openingCoveragePct(value: number, total: number): number {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

export function validateOpeningCoverageWeight(
  observations: readonly { name: string; weight: number }[],
  totalWeight?: number,
): number {
  let observedWeight = 0;
  for (const observation of observations) {
    if (!observation.name.trim()) {
      throw new Error('Opening coverage observation name must not be empty');
    }
    if (!Number.isInteger(observation.weight) || observation.weight <= 0) {
      throw new Error(`Opening coverage observation weight must be a positive integer: ${observation.weight}`);
    }
    observedWeight += observation.weight;
  }

  const resolved = totalWeight ?? observedWeight;
  if (!Number.isInteger(resolved) || resolved < 0) {
    throw new Error(`Opening coverage total weight must be a non-negative integer: ${resolved}`);
  }
  if (resolved !== observedWeight) {
    throw new Error(`Opening coverage total weight ${resolved} does not match observed weight ${observedWeight}`);
  }
  return resolved;
}

export function openingClassificationKnownDimensions(
  side: OpeningSideClassification,
): Record<OpeningClassificationDimension, boolean> {
  return {
    soundness: side.soundness !== 'UNKNOWN',
    character: side.character.length > 0,
    theoreticalStatus: side.theoreticalStatus !== 'UNKNOWN',
    theoryBurden: side.theoryBurden !== 'UNKNOWN',
    roles: side.roles.length > 0,
  };
}

export function openingClassificationUnknownDimensionCount(
  side: OpeningSideClassification,
): number {
  const known = openingClassificationKnownDimensions(side);
  return DIMENSIONS.reduce((total, dimension) => total + (known[dimension] ? 0 : 1), 0);
}

function emptySideSummary(): MutableSideSummary {
  return {
    complete: 0,
    fullySpecifiedHighConfidence: 0,
    unknown: {
      soundness: 0,
      character: 0,
      theoreticalStatus: 0,
      theoryBurden: 0,
      roles: 0,
    },
    confidence: { HIGH: 0, MEDIUM: 0, LOW: 0 },
  };
}

function addSide(
  target: MutableSideSummary,
  side: OpeningSideClassification,
  weight: number,
): void {
  const known = openingClassificationKnownDimensions(side);
  const complete = DIMENSIONS.every((dimension) => known[dimension]);
  if (complete) target.complete += weight;
  if (complete && side.confidence === 'HIGH') target.fullySpecifiedHighConfidence += weight;
  target.confidence[side.confidence] += weight;
  for (const dimension of DIMENSIONS) {
    if (!known[dimension]) target.unknown[dimension] += weight;
  }
}

function finalizeSide(summary: MutableSideSummary, totalWeight: number) {
  return {
    complete: summary.complete,
    completePct: openingCoveragePct(summary.complete, totalWeight),
    fullySpecifiedHighConfidence: summary.fullySpecifiedHighConfidence,
    fullySpecifiedHighConfidencePct: openingCoveragePct(
      summary.fullySpecifiedHighConfidence,
      totalWeight,
    ),
    unknown: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, {
      weight: summary.unknown[dimension],
      pct: openingCoveragePct(summary.unknown[dimension], totalWeight),
    }])) as Record<OpeningClassificationDimension, { weight: number; pct: number }>,
    confidence: {
      ...summary.confidence,
      highPct: openingCoveragePct(summary.confidence.HIGH, totalWeight),
      mediumPct: openingCoveragePct(summary.confidence.MEDIUM, totalWeight),
      lowPct: openingCoveragePct(summary.confidence.LOW, totalWeight),
    },
  };
}

export function buildOpeningClassificationCoverageAudit(
  observations: readonly OpeningClassificationCoverageObservation[],
  totalWeight?: number,
) {
  const total = validateOpeningCoverageWeight(observations, totalWeight);
  const white = emptySideSummary();
  const black = emptySideSummary();

  for (const observation of observations) {
    addSide(white, observation.classification.white, observation.weight);
    addSide(black, observation.classification.black, observation.weight);
  }

  return {
    totalWeight: total,
    sides: {
      white: finalizeSide(white, total),
      black: finalizeSide(black, total),
    },
  };
}
