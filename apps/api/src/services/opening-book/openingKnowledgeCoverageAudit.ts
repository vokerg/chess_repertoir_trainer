import {
  buildOpeningClassificationCoverageAudit,
  openingClassificationUnknownDimensionCount,
  openingCoveragePct,
  validateOpeningCoverageWeight,
  type OpeningClassificationCoverageObservation,
} from './openingClassificationCoverageAudit';
import { openingRootFamily } from './openingClassificationAudit';
import type { OpeningKnowledgeResult, OpeningSideKnowledge } from './openingKnowledge.types';

export const OPENING_KNOWLEDGE_PRIORITY_POLICY = {
  version: '2026-08-rb-025-v1',
  weights: {
    unavailableKnowledge: 100,
    partialKnowledge: 40,
    missingKnowledgeField: 12,
    unknownClassificationDimension: 4,
    lowConfidenceSide: 2,
    uniqueNameBreadth: 1,
  },
} as const;

export type OpeningSideKnowledgeStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';

export interface OpeningKnowledgeCoverageObservation
  extends OpeningClassificationCoverageObservation {
  knowledge: OpeningKnowledgeResult;
}

type StatusCounts = Record<OpeningSideKnowledgeStatus, number>;

type MutableSideSummary = {
  status: StatusCounts;
  missingStrategicSummary: number;
  missingPlans: number;
};

type MutableFamily = {
  corpusWeight: number;
  names: Set<string>;
  unavailableKnowledgeWeight: number;
  partialKnowledgeWeight: number;
  sideGapWeight: number;
  missingKnowledgeFieldWeight: number;
  unknownClassificationDimensionWeight: number;
  lowConfidenceSideWeight: number;
};

function emptyStatusCounts(): StatusCounts {
  return { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0 };
}

function emptySideSummary(): MutableSideSummary {
  return {
    status: emptyStatusCounts(),
    missingStrategicSummary: 0,
    missingPlans: 0,
  };
}

export function openingSideKnowledgeStatus(
  side: OpeningSideKnowledge,
): OpeningSideKnowledgeStatus {
  const hasSummary = side.strategicSummary !== null;
  const hasPlans = side.plans.length > 0;
  if (hasSummary && hasPlans) return 'AVAILABLE';
  if (hasSummary || hasPlans) return 'PARTIAL';
  return 'UNAVAILABLE';
}

function addSide(target: MutableSideSummary, side: OpeningSideKnowledge, weight: number): void {
  target.status[openingSideKnowledgeStatus(side)] += weight;
  if (!side.strategicSummary) target.missingStrategicSummary += weight;
  if (!side.plans.length) target.missingPlans += weight;
}

function finalizeStatus(counts: StatusCounts, totalWeight: number) {
  return {
    ...counts,
    availablePct: openingCoveragePct(counts.AVAILABLE, totalWeight),
    partialPct: openingCoveragePct(counts.PARTIAL, totalWeight),
    unavailablePct: openingCoveragePct(counts.UNAVAILABLE, totalWeight),
  };
}

function finalizeSide(summary: MutableSideSummary, totalWeight: number) {
  return {
    ...finalizeStatus(summary.status, totalWeight),
    missingStrategicSummary: summary.missingStrategicSummary,
    missingStrategicSummaryPct: openingCoveragePct(
      summary.missingStrategicSummary,
      totalWeight,
    ),
    missingPlans: summary.missingPlans,
    missingPlansPct: openingCoveragePct(summary.missingPlans, totalWeight),
  };
}

function missingKnowledgeFieldCount(knowledge: OpeningKnowledgeResult): number {
  return [
    knowledge.shortDescription,
    knowledge.description,
    knowledge.white.strategicSummary,
    knowledge.white.plans.length ? knowledge.white.plans : null,
    knowledge.black.strategicSummary,
    knowledge.black.plans.length ? knowledge.black.plans : null,
  ].filter((value) => !value).length;
}

function priorityScore(group: MutableFamily): number {
  const weights = OPENING_KNOWLEDGE_PRIORITY_POLICY.weights;
  return group.unavailableKnowledgeWeight * weights.unavailableKnowledge
    + group.partialKnowledgeWeight * weights.partialKnowledge
    + group.missingKnowledgeFieldWeight * weights.missingKnowledgeField
    + group.unknownClassificationDimensionWeight * weights.unknownClassificationDimension
    + group.lowConfidenceSideWeight * weights.lowConfidenceSide
    + group.names.size * weights.uniqueNameBreadth;
}

export function buildOpeningKnowledgeCoverageAudit(
  observations: readonly OpeningKnowledgeCoverageObservation[],
  totalWeight?: number,
  exampleLimit = 8,
) {
  const total = validateOpeningCoverageWeight(observations, totalWeight);
  const overall = emptyStatusCounts();
  const white = emptySideSummary();
  const black = emptySideSummary();
  const families = new Map<string, MutableFamily>();
  let shortDescriptionAvailable = 0;
  let descriptionAvailable = 0;

  for (const observation of observations) {
    const { knowledge, classification, weight } = observation;
    overall[knowledge.status] += weight;
    if (knowledge.shortDescription) shortDescriptionAvailable += weight;
    if (knowledge.description) descriptionAvailable += weight;
    addSide(white, knowledge.white, weight);
    addSide(black, knowledge.black, weight);

    const family = openingRootFamily(observation.name);
    const group = families.get(family) ?? {
      corpusWeight: 0,
      names: new Set<string>(),
      unavailableKnowledgeWeight: 0,
      partialKnowledgeWeight: 0,
      sideGapWeight: 0,
      missingKnowledgeFieldWeight: 0,
      unknownClassificationDimensionWeight: 0,
      lowConfidenceSideWeight: 0,
    };
    group.corpusWeight += weight;
    group.names.add(observation.name);
    if (knowledge.status === 'UNAVAILABLE') group.unavailableKnowledgeWeight += weight;
    if (knowledge.status === 'PARTIAL') group.partialKnowledgeWeight += weight;
    group.sideGapWeight += [knowledge.white, knowledge.black]
      .filter((side) => openingSideKnowledgeStatus(side) !== 'AVAILABLE').length * weight;
    group.missingKnowledgeFieldWeight += missingKnowledgeFieldCount(knowledge) * weight;
    group.unknownClassificationDimensionWeight += (
      openingClassificationUnknownDimensionCount(classification.white)
      + openingClassificationUnknownDimensionCount(classification.black)
    ) * weight;
    group.lowConfidenceSideWeight += [classification.white, classification.black]
      .filter((side) => side.confidence === 'LOW').length * weight;
    families.set(family, group);
  }

  const classificationObservations = observations.map(({ name, weight, classification }) => ({
    name,
    weight,
    classification,
  }));

  const priorityBacklog = Array.from(families.entries())
    .map(([family, group]) => ({
      family,
      priorityScore: priorityScore(group),
      corpusWeight: group.corpusWeight,
      corpusPct: openingCoveragePct(group.corpusWeight, total),
      uniqueNames: group.names.size,
      factors: {
        unavailableKnowledgeWeight: group.unavailableKnowledgeWeight,
        partialKnowledgeWeight: group.partialKnowledgeWeight,
        sideGapWeight: group.sideGapWeight,
        missingKnowledgeFieldWeight: group.missingKnowledgeFieldWeight,
        unknownClassificationDimensionWeight: group.unknownClassificationDimensionWeight,
        lowConfidenceSideWeight: group.lowConfidenceSideWeight,
      },
      examples: Array.from(group.names).sort().slice(0, exampleLimit),
    }))
    .filter((item) => item.factors.missingKnowledgeFieldWeight > 0
      || item.factors.unknownClassificationDimensionWeight > 0
      || item.factors.lowConfidenceSideWeight > 0)
    .sort((left, right) => right.priorityScore - left.priorityScore
      || right.corpusWeight - left.corpusWeight
      || right.uniqueNames - left.uniqueNames
      || left.family.localeCompare(right.family));

  return {
    totalWeight: total,
    knowledge: {
      overall: finalizeStatus(overall, total),
      descriptions: {
        shortDescriptionAvailable,
        shortDescriptionAvailablePct: openingCoveragePct(shortDescriptionAvailable, total),
        shortDescriptionMissing: total - shortDescriptionAvailable,
        shortDescriptionMissingPct: openingCoveragePct(total - shortDescriptionAvailable, total),
        descriptionAvailable,
        descriptionAvailablePct: openingCoveragePct(descriptionAvailable, total),
        descriptionMissing: total - descriptionAvailable,
        descriptionMissingPct: openingCoveragePct(total - descriptionAvailable, total),
      },
      sides: {
        white: finalizeSide(white, total),
        black: finalizeSide(black, total),
      },
    },
    classification: buildOpeningClassificationCoverageAudit(classificationObservations, total),
    priorityPolicy: OPENING_KNOWLEDGE_PRIORITY_POLICY,
    priorityBacklog,
  };
}
