import type {
  PlayerChessProfileBaseline,
  PlayerChessProfileConclusion,
  PlayerChessProfileDimension,
  PlayerChessProfileEvidenceStrength,
  PlayerChessProfileOpeningClassification,
  PlayerChessProfileOpeningGroup,
  PlayerChessProfileOpeningReference,
  PlayerChessProfilePerformanceItem,
  PlayerChessProfilePreferenceItem,
  PlayerChessProfileQuery,
  PlayerChessProfileWdl,
} from '@chess-trainer/contracts/player-chess-profile';
import type {
  PlayerChessProfileAggregateRow,
  PlayerChessProfileOpeningGroupRow,
} from './player-chess-profile.repository.prisma';

const DIMENSION_ORDER: Record<PlayerChessProfileDimension, number> = {
  CHARACTER: 0,
  SOUNDNESS: 1,
  THEORETICAL_STATUS: 2,
  THEORY_BURDEN: 3,
  ROLE: 4,
};

const EVIDENCE_ORDER: Record<PlayerChessProfileEvidenceStrength, number> = {
  INSUFFICIENT: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

interface DimensionAccumulator {
  dimension: PlayerChessProfileDimension;
  value: string;
  games: number;
  analysedGames: number;
  accuracyGames: number;
  wins: number;
  draws: number;
  losses: number;
  openingPositiveGames: number;
  openingTroubleGames: number;
  earlyMistakeGames: number;
  accuracyWeightedTotal: number;
  confidenceGames: { high: number; medium: number; low: number };
  supportingOpenings: Map<string, PlayerChessProfileOpeningReference>;
}

export interface PlayerChessProfileRange {
  from: string;
  to: string;
  fromDate: Date;
  toExclusive: Date;
}

export interface PlayerChessProfileMetricResult {
  baseline: PlayerChessProfileBaseline;
  preference: PlayerChessProfilePreferenceItem[];
  performance: PlayerChessProfilePerformanceItem[];
  openingGroups: PlayerChessProfileOpeningGroup[];
  conclusions: PlayerChessProfileConclusion[];
  classifiedOpeningGames: number;
  lowConfidenceOpeningGames: number;
  unknownDimensionOpeningGames: number;
}

export class InvalidPlayerChessProfileRangeError extends Error {
  readonly code = 'INVALID_RANGE' as const;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function subtractUtcMonths(value: Date, months: number): Date {
  const originalDay = value.getUTCDate();
  const target = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(originalDay, lastDay));
  return target;
}

export function resolvePlayerChessProfileRange(
  query: Pick<PlayerChessProfileQuery, 'from' | 'to'>,
  now = new Date(),
): PlayerChessProfileRange {
  const to = query.to ?? dateOnly(now);
  const toDate = parseDateOnly(to);
  const from = query.from ?? dateOnly(subtractUtcMonths(toDate, 3));
  const fromDate = parseDateOnly(from);
  if (fromDate > toDate) {
    throw new InvalidPlayerChessProfileRangeError('From date must not be after to date');
  }
  return { from, to, fromDate, toExclusive: addUtcDays(toDate, 1) };
}

export function playerChessProfileEvidenceStrength(sampleSize: number): PlayerChessProfileEvidenceStrength {
  if (sampleSize < 5) return 'INSUFFICIENT';
  if (sampleSize < 15) return 'LOW';
  if (sampleSize < 40) return 'MEDIUM';
  return 'HIGH';
}

export function playerChessProfileAnalysisEvidenceStrength(
  games: number,
  analysedGames: number,
): PlayerChessProfileEvidenceStrength {
  if (games <= 0 || analysedGames < 5 || analysedGames / games < 0.5) return 'INSUFFICIENT';
  return playerChessProfileEvidenceStrength(analysedGames);
}

export function roundProfileMetric(value: number): number {
  return Math.round(value * 10) / 10;
}

export function profilePercentage(numerator: number, denominator: number): number | null {
  return denominator > 0 ? roundProfileMetric((numerator / denominator) * 100) : null;
}

function scorePercent(wdl: PlayerChessProfileWdl): number | null {
  const games = wdl.wins + wdl.draws + wdl.losses;
  return profilePercentage(wdl.wins + wdl.draws * 0.5, games);
}

function delta(value: number | null, baseline: number | null): number | null {
  return value === null || baseline === null ? null : roundProfileMetric(value - baseline);
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

export function playerChessProfileOpeningGroupKey(
  row: Pick<PlayerChessProfileOpeningGroupRow, 'openingEco' | 'openingName' | 'userColor'>,
): string {
  return `${normalize(row.openingEco)}\u0000${normalize(row.openingName)}\u0000${row.userColor}`;
}

function dimensionValues(classification: PlayerChessProfileOpeningClassification) {
  return [
    { dimension: 'SOUNDNESS' as const, value: classification.soundness },
    { dimension: 'THEORETICAL_STATUS' as const, value: classification.theoreticalStatus },
    { dimension: 'THEORY_BURDEN' as const, value: classification.theoryBurden },
    ...(classification.character.length
      ? classification.character.map((value) => ({ dimension: 'CHARACTER' as const, value }))
      : [{ dimension: 'CHARACTER' as const, value: 'UNKNOWN' }]),
    ...(classification.roles.length
      ? classification.roles.map((value) => ({ dimension: 'ROLE' as const, value }))
      : [{ dimension: 'ROLE' as const, value: 'UNKNOWN' }]),
  ];
}

function hasUnknownCoreDimension(classification: PlayerChessProfileOpeningClassification): boolean {
  return classification.soundness === 'UNKNOWN'
    || classification.theoreticalStatus === 'UNKNOWN'
    || classification.theoryBurden === 'UNKNOWN'
    || classification.character.length === 0;
}

function openingReference(row: PlayerChessProfileOpeningGroupRow): PlayerChessProfileOpeningReference {
  return { eco: row.openingEco, name: row.openingName, userColor: row.userColor, games: row.games };
}

function addRow(
  accumulator: DimensionAccumulator,
  row: PlayerChessProfileOpeningGroupRow,
  classification: PlayerChessProfileOpeningClassification,
): void {
  accumulator.games += row.games;
  accumulator.analysedGames += row.analysedGames;
  accumulator.accuracyGames += row.accuracyGames;
  accumulator.wins += row.wins;
  accumulator.draws += row.draws;
  accumulator.losses += row.losses;
  accumulator.openingPositiveGames += row.openingPositiveGames;
  accumulator.openingTroubleGames += row.openingTroubleGames;
  accumulator.earlyMistakeGames += row.earlyMistakeGames;
  if (row.averageAccuracy !== null && row.accuracyGames > 0) {
    accumulator.accuracyWeightedTotal += row.averageAccuracy * row.accuracyGames;
  }
  const confidenceKey = classification.confidence.toLocaleLowerCase('en-US') as 'high' | 'medium' | 'low';
  accumulator.confidenceGames[confidenceKey] += row.games;
  const reference = openingReference(row);
  const key = playerChessProfileOpeningGroupKey(row);
  const existing = accumulator.supportingOpenings.get(key);
  accumulator.supportingOpenings.set(key, { ...reference, games: (existing?.games ?? 0) + row.games });
}

function accumulators(
  rows: readonly PlayerChessProfileOpeningGroupRow[],
  classifications: ReadonlyMap<string, PlayerChessProfileOpeningClassification>,
): DimensionAccumulator[] {
  const result = new Map<string, DimensionAccumulator>();
  for (const row of rows) {
    const classification = classifications.get(playerChessProfileOpeningGroupKey(row));
    if (!classification) continue;
    for (const item of dimensionValues(classification)) {
      const key = `${item.dimension}\u0000${item.value}`;
      const current = result.get(key) ?? {
        dimension: item.dimension,
        value: item.value,
        games: 0,
        analysedGames: 0,
        accuracyGames: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        openingPositiveGames: 0,
        openingTroubleGames: 0,
        earlyMistakeGames: 0,
        accuracyWeightedTotal: 0,
        confidenceGames: { high: 0, medium: 0, low: 0 },
        supportingOpenings: new Map<string, PlayerChessProfileOpeningReference>(),
      };
      addRow(current, row, classification);
      result.set(key, current);
    }
  }
  return [...result.values()].sort((left, right) => (
    DIMENSION_ORDER[left.dimension] - DIMENSION_ORDER[right.dimension]
    || right.games - left.games
    || left.value.localeCompare(right.value)
  ));
}

function support(accumulator: DimensionAccumulator): PlayerChessProfileOpeningReference[] {
  return [...accumulator.supportingOpenings.values()]
    .sort((left, right) => right.games - left.games || (left.name ?? '').localeCompare(right.name ?? ''))
    .slice(0, 3);
}

function preferenceItems(
  items: readonly DimensionAccumulator[],
  classifiedOpeningGames: number,
): PlayerChessProfilePreferenceItem[] {
  return items.map((item) => ({
    dimension: item.dimension,
    value: item.value,
    games: item.games,
    exposurePercent: profilePercentage(item.games, classifiedOpeningGames) ?? 0,
    confidenceGames: item.confidenceGames,
    supportingOpenings: support(item),
  }));
}

function performanceItems(
  items: readonly DimensionAccumulator[],
  baselineScorePercent: number | null,
): PlayerChessProfilePerformanceItem[] {
  return items.map((item) => {
    const wdl = { wins: item.wins, draws: item.draws, losses: item.losses };
    const itemScore = scorePercent(wdl);
    return {
      dimension: item.dimension,
      value: item.value,
      games: item.games,
      analysedGames: item.analysedGames,
      accuracyGames: item.accuracyGames,
      wdl,
      scorePercent: itemScore,
      baselineScorePercent,
      scoreDelta: delta(itemScore, baselineScorePercent),
      openingPositiveRate: profilePercentage(item.openingPositiveGames, item.analysedGames),
      openingTroubleRate: profilePercentage(item.openingTroubleGames, item.analysedGames),
      earlyMistakeRate: profilePercentage(item.earlyMistakeGames, item.analysedGames),
      averageAccuracy: item.accuracyGames
        ? roundProfileMetric(item.accuracyWeightedTotal / item.accuracyGames)
        : null,
      resultEvidenceStrength: playerChessProfileEvidenceStrength(item.games),
      analysisEvidenceStrength: playerChessProfileAnalysisEvidenceStrength(item.games, item.analysedGames),
      supportingOpenings: support(item),
    };
  });
}

function openingGroups(
  rows: readonly PlayerChessProfileOpeningGroupRow[],
  classifications: ReadonlyMap<string, PlayerChessProfileOpeningClassification>,
): PlayerChessProfileOpeningGroup[] {
  return rows.map((row) => ({
    eco: row.openingEco,
    name: row.openingName,
    userColor: row.userColor,
    games: row.games,
    analysedGames: row.analysedGames,
    accuracyGames: row.accuracyGames,
    wdl: { wins: row.wins, draws: row.draws, losses: row.losses },
    scorePercent: scorePercent({ wins: row.wins, draws: row.draws, losses: row.losses }),
    openingPositiveRate: profilePercentage(row.openingPositiveGames, row.analysedGames),
    openingTroubleRate: profilePercentage(row.openingTroubleGames, row.analysedGames),
    earlyMistakeRate: profilePercentage(row.earlyMistakeGames, row.analysedGames),
    averageAccuracy: row.averageAccuracy === null ? null : roundProfileMetric(row.averageAccuracy),
    classification: classifications.get(playerChessProfileOpeningGroupKey(row)) ?? null,
  }));
}

function conclusions(
  totalGames: number,
  classifiedOpeningGames: number,
  baselineOpeningTroubleRate: number | null,
  preference: readonly PlayerChessProfilePreferenceItem[],
  performance: readonly PlayerChessProfilePerformanceItem[],
): PlayerChessProfileConclusion[] {
  if (totalGames < 10 || classifiedOpeningGames < 5) {
    return [{
      code: 'INSUFFICIENT_DATA',
      dimension: null,
      value: null,
      metric: 'NONE',
      sampleSize: totalGames,
      metricValue: null,
      baselineValue: null,
      delta: null,
      evidenceStrength: playerChessProfileEvidenceStrength(totalGames),
      summary: 'There are not yet enough selected, classified games for a stable Player Chess Profile conclusion.',
    }];
  }

  const result: PlayerChessProfileConclusion[] = [];
  const preferred = preference
    .filter((item) => item.dimension === 'CHARACTER' && item.value !== 'UNKNOWN' && item.games >= 5)
    .sort((left, right) => right.games - left.games || left.value.localeCompare(right.value))[0];
  if (preferred) {
    result.push({
      code: 'PREFERENCE',
      dimension: preferred.dimension,
      value: preferred.value,
      metric: 'EXPOSURE_PERCENT',
      sampleSize: preferred.games,
      metricValue: preferred.exposurePercent,
      baselineValue: null,
      delta: null,
      evidenceStrength: playerChessProfileEvidenceStrength(preferred.games),
      summary: `${preferred.value} positions appear in ${preferred.exposurePercent}% of the selected classified games.`,
    });
  }

  const eligible = performance.filter((item) => (
    item.dimension === 'CHARACTER'
    && item.value !== 'UNKNOWN'
    && item.games >= 10
    && EVIDENCE_ORDER[item.resultEvidenceStrength] >= EVIDENCE_ORDER.LOW
    && item.scoreDelta !== null
  ));
  const best = [...eligible]
    .filter((item) => (item.scoreDelta ?? 0) >= 5)
    .sort((left, right) => (right.scoreDelta ?? 0) - (left.scoreDelta ?? 0) || right.games - left.games)[0];
  const worst = [...eligible]
    .filter((item) => (item.scoreDelta ?? 0) <= -5)
    .sort((left, right) => (left.scoreDelta ?? 0) - (right.scoreDelta ?? 0) || right.games - left.games)[0];
  for (const [code, item] of [['PERFORMS_BETTER', best], ['PERFORMS_WORSE', worst]] as const) {
    if (!item) continue;
    const magnitude = code === 'PERFORMS_WORSE' ? Math.abs(item.scoreDelta ?? 0) : item.scoreDelta;
    result.push({
      code,
      dimension: item.dimension,
      value: item.value,
      metric: 'SCORE_PERCENT',
      sampleSize: item.games,
      metricValue: item.scorePercent,
      baselineValue: item.baselineScorePercent,
      delta: item.scoreDelta,
      evidenceStrength: item.resultEvidenceStrength,
      summary: `In the selected games, ${item.value} positions scored ${magnitude} percentage points ${code === 'PERFORMS_BETTER' ? 'above' : 'below'} the selected-game baseline.`,
    });
  }

  const trouble = performance
    .filter((item) => (
      item.dimension === 'CHARACTER'
      && item.value !== 'UNKNOWN'
      && item.openingTroubleRate !== null
      && baselineOpeningTroubleRate !== null
      && item.openingTroubleRate - baselineOpeningTroubleRate >= 5
      && EVIDENCE_ORDER[item.analysisEvidenceStrength] >= EVIDENCE_ORDER.LOW
    ))
    .sort((left, right) => (
      ((right.openingTroubleRate ?? 0) - (baselineOpeningTroubleRate ?? 0))
      - ((left.openingTroubleRate ?? 0) - (baselineOpeningTroubleRate ?? 0))
    ))[0];
  if (trouble && trouble.openingTroubleRate !== null && baselineOpeningTroubleRate !== null) {
    const troubleDelta = roundProfileMetric(trouble.openingTroubleRate - baselineOpeningTroubleRate);
    result.push({
      code: 'OPENING_TROUBLE',
      dimension: trouble.dimension,
      value: trouble.value,
      metric: 'OPENING_TROUBLE_RATE',
      sampleSize: trouble.analysedGames,
      metricValue: trouble.openingTroubleRate,
      baselineValue: baselineOpeningTroubleRate,
      delta: troubleDelta,
      evidenceStrength: trouble.analysisEvidenceStrength,
      summary: `${trouble.value} positions reached opening trouble ${troubleDelta} percentage points more often than the selected analysed-game baseline.`,
    });
  }
  return result;
}

export function buildPlayerChessProfileMetrics(
  aggregate: PlayerChessProfileAggregateRow,
  rows: readonly PlayerChessProfileOpeningGroupRow[],
  classifications: ReadonlyMap<string, PlayerChessProfileOpeningClassification>,
): PlayerChessProfileMetricResult {
  let classifiedOpeningGames = 0;
  let lowConfidenceOpeningGames = 0;
  let unknownDimensionOpeningGames = 0;
  for (const row of rows) {
    const classification = classifications.get(playerChessProfileOpeningGroupKey(row));
    if (!classification) continue;
    classifiedOpeningGames += row.games;
    if (classification.confidence === 'LOW') lowConfidenceOpeningGames += row.games;
    if (hasUnknownCoreDimension(classification)) unknownDimensionOpeningGames += row.games;
  }

  const wdl = { wins: aggregate.wins, draws: aggregate.draws, losses: aggregate.losses };
  const baselineScorePercent = scorePercent(wdl);
  const baselineOpeningTroubleRate = profilePercentage(aggregate.openingTroubleGames, aggregate.analysedGames);
  const accumulated = accumulators(rows, classifications);
  const preference = preferenceItems(accumulated, classifiedOpeningGames);
  const performance = performanceItems(accumulated, baselineScorePercent);
  const baseline: PlayerChessProfileBaseline = {
    games: aggregate.totalGames,
    analysedGames: aggregate.analysedGames,
    accuracyGames: aggregate.accuracyGames,
    wdl,
    scorePercent: baselineScorePercent,
    openingPositiveRate: profilePercentage(aggregate.openingPositiveGames, aggregate.analysedGames),
    openingTroubleRate: baselineOpeningTroubleRate,
    earlyMistakeRate: profilePercentage(aggregate.earlyMistakeGames, aggregate.analysedGames),
    averageAccuracy: aggregate.averageAccuracy === null ? null : roundProfileMetric(aggregate.averageAccuracy),
  };

  return {
    baseline,
    preference,
    performance,
    openingGroups: openingGroups(rows, classifications),
    conclusions: conclusions(
      aggregate.totalGames,
      classifiedOpeningGames,
      baselineOpeningTroubleRate,
      preference,
      performance,
    ),
    classifiedOpeningGames,
    lowConfidenceOpeningGames,
    unknownDimensionOpeningGames,
  };
}
