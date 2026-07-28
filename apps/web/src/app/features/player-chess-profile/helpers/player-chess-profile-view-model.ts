import type {
  PlayerChessProfileConclusion,
  PlayerChessProfileDimension,
  PlayerChessProfileEvidenceStrength,
  PlayerChessProfileOpeningReference,
  PlayerChessProfilePerformanceItem,
  PlayerChessProfilePreferenceItem,
  PlayerChessProfileResponse,
  PlayerChessProfileSupportingGame,
} from '@chess-trainer/contracts/player-chess-profile';
import type {
  PlayerChessProfileAccountOption,
  PlayerChessProfileEvidenceSelection,
} from '../data-access/player-chess-profile.models';

export interface PlayerChessProfileEvidenceMetric {
  label: string;
  value: string;
}

export interface PlayerChessProfileEvidenceViewModel {
  title: string;
  summary: string;
  evidenceStrength: PlayerChessProfileEvidenceStrength;
  metrics: readonly PlayerChessProfileEvidenceMetric[];
  openings: readonly PlayerChessProfileOpeningReference[];
  games: readonly PlayerChessProfileSupportingGame[];
}

const DIMENSION_LABELS: Record<PlayerChessProfileDimension, string> = {
  CHARACTER: 'Character',
  SOUNDNESS: 'Soundness',
  THEORETICAL_STATUS: 'Theory status',
  THEORY_BURDEN: 'Theory burden',
  ROLE: 'Role',
};

export function playerChessProfileDimensionLabel(dimension: PlayerChessProfileDimension): string {
  return DIMENSION_LABELS[dimension];
}

export function playerChessProfileValueLabel(value: string): string {
  return value
    .toLocaleLowerCase('en-US')
    .split('_')
    .map((part) => part.charAt(0).toLocaleUpperCase('en-US') + part.slice(1))
    .join(' ');
}

export function playerChessProfileEvidenceLabel(strength: PlayerChessProfileEvidenceStrength): string {
  if (strength === 'INSUFFICIENT') return 'Insufficient evidence';
  return `${playerChessProfileValueLabel(strength)} evidence`;
}

export function playerChessProfilePercentLabel(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function playerChessProfileDeltaLabel(value: number | null): string {
  if (value === null) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(value % 1 === 0 ? 0 : 1)} pp`;
}

export function playerChessProfileWdlLabel(item: {
  wdl: { wins: number; draws: number; losses: number };
}): string {
  return `${item.wdl.wins}–${item.wdl.draws}–${item.wdl.losses}`;
}

export function playerChessProfileSpeedLabel(
  speedPreset: PlayerChessProfileResponse['filters']['speedPreset'],
): string {
  if (speedPreset === 'ALL') return 'All speeds';
  if (speedPreset === 'BLITZ') return 'Blitz';
  if (speedPreset === 'BULLET') return 'Bullet';
  return 'Blitz and slower';
}

export function playerChessProfileColorsLabel(
  colors: PlayerChessProfileResponse['filters']['colors'],
): string {
  if (colors.length === 2) return 'White and Black';
  return colors[0] === 'WHITE' ? 'White' : 'Black';
}

export function playerChessProfilePeerGroupLabel(group: number): string {
  if (group === 0) return '<1000';
  if (group === 2500) return '2500+';
  return `${group}–${group + 199}`;
}

export function playerChessProfilePeerLabel(response: PlayerChessProfileResponse): string {
  return response.peerLevel.selectedGroups.map(playerChessProfilePeerGroupLabel).join(' + ');
}

export function playerChessProfileContextLabel(
  response: PlayerChessProfileResponse,
  accounts: readonly PlayerChessProfileAccountOption[],
): string {
  const selectedAccountIds = response.filters.accountIds;
  const accountLabel = selectedAccountIds?.length
    ? selectedAccountIds
      .map((id) => accounts.find((account) => account.id === id))
      .filter((account): account is PlayerChessProfileAccountOption => Boolean(account))
      .map((account) => account.displayName || account.username)
      .join(', ') || `${selectedAccountIds.length} selected account${selectedAccountIds.length === 1 ? '' : 's'}`
    : 'All connected accounts';

  return [
    `${response.coverage.totalGames} game${response.coverage.totalGames === 1 ? '' : 's'}`,
    accountLabel,
    playerChessProfileSpeedLabel(response.filters.speedPreset),
    playerChessProfileColorsLabel(response.filters.colors),
    response.filters.rated ? 'Rated' : 'Casual',
    `${response.filters.range.from} to ${response.filters.range.to}`,
  ].join(' · ');
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

function matchingGames(
  games: readonly PlayerChessProfileSupportingGame[],
  openings: readonly PlayerChessProfileOpeningReference[],
): readonly PlayerChessProfileSupportingGame[] {
  if (openings.length === 0) return games;
  const keys = new Set(openings.map((opening) => `${opening.eco ?? ''}:${opening.name ?? ''}`));
  const related = games.filter(
    (game) => keys.has(`${game.openingEco ?? ''}:${game.openingName ?? ''}`),
  );
  return related.length > 0 ? related : games;
}

function performanceMetrics(item: PlayerChessProfilePerformanceItem): readonly PlayerChessProfileEvidenceMetric[] {
  return [
    { label: 'Games', value: String(item.games) },
    { label: 'W–D–L', value: playerChessProfileWdlLabel(item) },
    { label: 'Score', value: playerChessProfilePercentLabel(item.scorePercent) },
    { label: 'Versus baseline', value: playerChessProfileDeltaLabel(item.scoreDelta) },
    { label: 'Opening positive', value: playerChessProfilePercentLabel(item.openingPositiveRate) },
    { label: 'Opening trouble', value: playerChessProfilePercentLabel(item.openingTroubleRate) },
    { label: 'Early mistakes', value: playerChessProfilePercentLabel(item.earlyMistakeRate) },
    { label: 'Average accuracy', value: playerChessProfilePercentLabel(item.averageAccuracy) },
  ];
}

function preferenceMetrics(item: PlayerChessProfilePreferenceItem): readonly PlayerChessProfileEvidenceMetric[] {
  return [
    { label: 'Games', value: String(item.games) },
    { label: 'Exposure', value: playerChessProfilePercentLabel(item.exposurePercent) },
    { label: 'High-confidence games', value: String(item.confidenceGames.high) },
    { label: 'Medium-confidence games', value: String(item.confidenceGames.medium) },
    { label: 'Low-confidence games', value: String(item.confidenceGames.low) },
  ];
}

function conclusionMetrics(
  conclusion: PlayerChessProfileConclusion,
  item: PlayerChessProfilePreferenceItem | PlayerChessProfilePerformanceItem | null,
): readonly PlayerChessProfileEvidenceMetric[] {
  const base: PlayerChessProfileEvidenceMetric[] = [{ label: 'Sample', value: String(conclusion.sampleSize) }];
  if (conclusion.metricValue !== null) {
    base.push({ label: 'Metric', value: playerChessProfilePercentLabel(conclusion.metricValue) });
  }
  if (conclusion.baselineValue !== null) {
    base.push({ label: 'Baseline', value: playerChessProfilePercentLabel(conclusion.baselineValue) });
  }
  if (conclusion.delta !== null) {
    base.push({ label: 'Difference', value: playerChessProfileDeltaLabel(conclusion.delta) });
  }
  if (item && 'scoreDelta' in item) {
    base.push(...performanceMetrics(item).filter(
      (metric) => !base.some((existing) => existing.label === metric.label),
    ));
  } else if (item) {
    base.push(...preferenceMetrics(item).filter(
      (metric) => !base.some((existing) => existing.label === metric.label),
    ));
  }
  return base;
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
    return {
      title: conclusion.summary,
      summary: conclusion.dimension && conclusion.value
        ? `${playerChessProfileDimensionLabel(conclusion.dimension)} · ${playerChessProfileValueLabel(conclusion.value)}`
        : 'Selected profile context',
      evidenceStrength: conclusion.evidenceStrength,
      metrics: conclusionMetrics(conclusion, item),
      openings,
      games: matchingGames(response.supportingGames, openings),
    };
  }

  if (selection.kind === 'PERFORMANCE') {
    const item = response.performance.items.find(
      (candidate) => candidate.dimension === selection.dimension && candidate.value === selection.value,
    );
    if (!item) return null;
    return {
      title: `${playerChessProfileValueLabel(item.value)} performance`,
      summary: `${playerChessProfileDimensionLabel(item.dimension)} in the selected games.`,
      evidenceStrength: item.resultEvidenceStrength,
      metrics: performanceMetrics(item),
      openings: item.supportingOpenings,
      games: matchingGames(response.supportingGames, item.supportingOpenings),
    };
  }

  const item = response.preference.items.find(
    (candidate) => candidate.dimension === selection.dimension && candidate.value === selection.value,
  );
  if (!item) return null;
  return {
    title: `${playerChessProfileValueLabel(item.value)} preference`,
    summary: `${playerChessProfileDimensionLabel(item.dimension)} exposure in the selected games.`,
    evidenceStrength: item.games < 5
      ? 'INSUFFICIENT'
      : item.games < 15
        ? 'LOW'
        : item.games < 40
          ? 'MEDIUM'
          : 'HIGH',
    metrics: preferenceMetrics(item),
    openings: item.supportingOpenings,
    games: matchingGames(response.supportingGames, item.supportingOpenings),
  };
}
