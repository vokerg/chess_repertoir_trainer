import type {
  PlayerChessProfileConclusion,
  PlayerChessProfileEvidenceStrength,
  PlayerChessProfileOpeningReference,
  PlayerChessProfilePerformanceItem,
  PlayerChessProfilePreferenceItem,
  PlayerChessProfileResponse,
  PlayerChessProfileSupportingGame,
} from '@chess-trainer/contracts/player-chess-profile';
import type { PlayerChessProfileEvidenceSelection } from '../state/player-chess-profile.models';
import {
  playerChessProfileDateLabel,
  playerChessProfileDeltaLabel,
  playerChessProfileDimensionLabel,
  playerChessProfileEvidenceLabel,
  playerChessProfilePercentLabel,
  playerChessProfileValueLabel,
  playerChessProfileWdlLabel,
} from './player-chess-profile-labels';

export interface PlayerChessProfileEvidenceMetricViewModel {
  id: string;
  label: string;
  value: string;
}

export interface PlayerChessProfileEvidenceOpeningViewModel {
  id: string;
  title: string;
  meta: string;
  gamesLabel: string;
}

export interface PlayerChessProfileEvidenceGameViewModel {
  id: number;
  title: string;
  meta: string;
  endedAtLabel: string;
  providerUrl: string | null;
}

export interface PlayerChessProfileEvidenceViewModel {
  title: string;
  summary: string;
  evidenceLabel: string;
  metrics: readonly PlayerChessProfileEvidenceMetricViewModel[];
  openings: readonly PlayerChessProfileEvidenceOpeningViewModel[];
  games: readonly PlayerChessProfileEvidenceGameViewModel[];
}

function matchingConclusionItem(
  response: PlayerChessProfileResponse,
  conclusion: PlayerChessProfileConclusion,
): PlayerChessProfilePreferenceItem | PlayerChessProfilePerformanceItem | null {
  const dimension = conclusion.dimension;
  const value = conclusion.value;
  if (!dimension || !value) return null;
  if (conclusion.code === 'PREFERENCE') {
    return response.preference.items.find(
      (item) => item.dimension === dimension && item.value === value,
    ) ?? null;
  }
  return response.performance.items.find(
    (item) => item.dimension === dimension && item.value === value,
  ) ?? response.preference.items.find(
    (item) => item.dimension === dimension && item.value === value,
  ) ?? null;
}

function openingKey(opening: {
  eco: string | null;
  name: string | null;
  userColor: string;
}): string {
  return `${opening.userColor}:${opening.eco ?? ''}:${opening.name ?? ''}`;
}

function matchingGames(
  games: readonly PlayerChessProfileSupportingGame[],
  openings: readonly PlayerChessProfileOpeningReference[],
): readonly PlayerChessProfileSupportingGame[] {
  if (openings.length === 0) return games;
  const keys = new Set(openings.map(openingKey));
  return games.filter((game) => keys.has(openingKey({
    eco: game.openingEco,
    name: game.openingName,
    userColor: game.userColor,
  })));
}

function evidenceMetrics(
  entries: readonly { label: string; value: string }[],
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  return entries.map((entry) => ({ id: entry.label, ...entry }));
}

function performanceMetrics(
  item: PlayerChessProfilePerformanceItem,
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  return evidenceMetrics([
    { label: 'Games', value: String(item.games) },
    { label: 'W–D–L', value: playerChessProfileWdlLabel(item) },
    { label: 'Score', value: playerChessProfilePercentLabel(item.scorePercent) },
    { label: 'Versus baseline', value: playerChessProfileDeltaLabel(item.scoreDelta) },
    { label: 'Opening positive', value: playerChessProfilePercentLabel(item.openingPositiveRate) },
    { label: 'Opening trouble', value: playerChessProfilePercentLabel(item.openingTroubleRate) },
    { label: 'Early mistakes', value: playerChessProfilePercentLabel(item.earlyMistakeRate) },
    { label: 'Average accuracy', value: playerChessProfilePercentLabel(item.averageAccuracy) },
  ]);
}

function preferenceMetrics(
  item: PlayerChessProfilePreferenceItem,
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  return evidenceMetrics([
    { label: 'Games', value: String(item.games) },
    { label: 'Exposure', value: playerChessProfilePercentLabel(item.exposurePercent) },
    { label: 'High-confidence games', value: String(item.confidenceGames.high) },
    { label: 'Medium-confidence games', value: String(item.confidenceGames.medium) },
    { label: 'Low-confidence games', value: String(item.confidenceGames.low) },
  ]);
}

function conclusionMetrics(
  conclusion: PlayerChessProfileConclusion,
  item: PlayerChessProfilePreferenceItem | PlayerChessProfilePerformanceItem | null,
): readonly PlayerChessProfileEvidenceMetricViewModel[] {
  const entries: { label: string; value: string }[] = [
    { label: 'Sample', value: String(conclusion.sampleSize) },
  ];
  if (conclusion.metricValue !== null) {
    entries.push({ label: 'Metric', value: playerChessProfilePercentLabel(conclusion.metricValue) });
  }
  if (conclusion.baselineValue !== null) {
    entries.push({ label: 'Baseline', value: playerChessProfilePercentLabel(conclusion.baselineValue) });
  }
  if (conclusion.delta !== null) {
    entries.push({ label: 'Difference', value: playerChessProfileDeltaLabel(conclusion.delta) });
  }
  const itemMetrics = item && 'scoreDelta' in item
    ? performanceMetrics(item)
    : item
      ? preferenceMetrics(item)
      : [];
  const existing = new Set(entries.map((entry) => entry.label));
  return [
    ...evidenceMetrics(entries),
    ...itemMetrics.filter((metric) => !existing.has(metric.label)),
  ];
}

function evidenceOpeningViewModels(
  openings: readonly PlayerChessProfileOpeningReference[],
): readonly PlayerChessProfileEvidenceOpeningViewModel[] {
  return openings.map((opening) => ({
    id: `${opening.userColor}:${opening.eco ?? 'NONE'}:${opening.name ?? 'NONE'}`,
    title: opening.name || opening.eco || 'Unknown opening',
    meta: `${opening.eco || 'No ECO'} · ${playerChessProfileValueLabel(opening.userColor)}`,
    gamesLabel: `${opening.games} game${opening.games === 1 ? '' : 's'}`,
  }));
}

function evidenceGameViewModels(
  games: readonly PlayerChessProfileSupportingGame[],
): readonly PlayerChessProfileEvidenceGameViewModel[] {
  return games.map((game) => ({
    id: game.id,
    title: game.openingName || game.openingEco || `Game ${game.id}`,
    meta: [
      game.resultForUser ? playerChessProfileValueLabel(game.resultForUser) : 'Unknown result',
      playerChessProfileValueLabel(game.userColor),
      game.speedCategory ? playerChessProfileValueLabel(game.speedCategory) : 'Unknown speed',
    ].join(' · '),
    endedAtLabel: playerChessProfileDateLabel(game.endedAt),
    providerUrl: game.providerUrl,
  }));
}

function evidenceViewModel(
  title: string,
  summary: string,
  evidenceStrength: PlayerChessProfileEvidenceStrength,
  metrics: readonly PlayerChessProfileEvidenceMetricViewModel[],
  openings: readonly PlayerChessProfileOpeningReference[],
  games: readonly PlayerChessProfileSupportingGame[],
): PlayerChessProfileEvidenceViewModel {
  return {
    title,
    summary,
    evidenceLabel: playerChessProfileEvidenceLabel(evidenceStrength),
    metrics,
    openings: evidenceOpeningViewModels(openings),
    games: evidenceGameViewModels(matchingGames(games, openings)),
  };
}

export function buildPlayerChessProfileEvidence(
  response: PlayerChessProfileResponse,
  selection: PlayerChessProfileEvidenceSelection | null,
): PlayerChessProfileEvidenceViewModel | null {
  if (!selection) return null;

  if (selection.kind === 'CONCLUSION') {
    const conclusion = response.conclusions[selection.index];
    if (!conclusion) return null;
    const item = matchingConclusionItem(response, conclusion);
    const openings = item?.supportingOpenings ?? [];
    return evidenceViewModel(
      conclusion.summary,
      conclusion.dimension && conclusion.value
        ? `${playerChessProfileDimensionLabel(conclusion.dimension)} · ${playerChessProfileValueLabel(conclusion.value)}`
        : 'Selected profile context',
      conclusion.evidenceStrength,
      conclusionMetrics(conclusion, item),
      openings,
      response.supportingGames,
    );
  }

  if (selection.kind === 'PERFORMANCE') {
    const item = response.performance.items.find(
      (candidate) => candidate.dimension === selection.dimension && candidate.value === selection.value,
    );
    if (!item) return null;
    return evidenceViewModel(
      `${playerChessProfileValueLabel(item.value)} performance`,
      `${playerChessProfileDimensionLabel(item.dimension)} in the selected games.`,
      item.resultEvidenceStrength,
      performanceMetrics(item),
      item.supportingOpenings,
      response.supportingGames,
    );
  }

  const item = response.preference.items.find(
    (candidate) => candidate.dimension === selection.dimension && candidate.value === selection.value,
  );
  if (!item) return null;
  const evidenceStrength: PlayerChessProfileEvidenceStrength = item.games < 5
    ? 'INSUFFICIENT'
    : item.games < 15
      ? 'LOW'
      : item.games < 40
        ? 'MEDIUM'
        : 'HIGH';
  return evidenceViewModel(
    `${playerChessProfileValueLabel(item.value)} preference`,
    `${playerChessProfileDimensionLabel(item.dimension)} exposure in the selected games.`,
    evidenceStrength,
    preferenceMetrics(item),
    item.supportingOpenings,
    response.supportingGames,
  );
}
